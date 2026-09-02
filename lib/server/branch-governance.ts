import {
  getPostgresPool,
  resetPostgresRuntimeRole,
} from "./database.ts";
import {
  canPerformAction,
  type AuthorizationActor,
} from "../security/authorization-policy.ts";
import type { ScopeBoundary } from "../tenant/delegation-policy.ts";
import type { PoolClient } from "pg";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BranchRow = {
  code: string;
  id: string;
  name: string;
  status: string;
};

type BranchStatusRow = {
  company_id: string | null;
  country_id: string | null;
  name: string;
  operational_area_id: string | null;
  organization_id: string;
  status: string;
};

export type CreateGovernedBranchInput = {
  actor: AuthorizationActor;
  city?: string | null;
  code: string;
  name: string;
  reason: string;
  scope: ScopeBoundary;
};

export type CreatedGovernedBranch = {
  code: string;
  id: string;
  name: string;
  status: string;
};

export class BranchGovernanceError extends Error {}

function nullableUuid(value: string | null | undefined) {
  return value && uuidPattern.test(value) ? value : null;
}

function requiredUuid(value: string | null | undefined, fieldName: string) {
  const uuid = nullableUuid(value);

  if (!uuid) {
    throw new BranchGovernanceError(`${fieldName} debe ser un UUID valido.`);
  }

  return uuid;
}

function normalizeBranchCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "-");
}

function getActorUuid(actor: AuthorizationActor) {
  return nullableUuid(actor.userId);
}

export async function assertBranchReadyForOperationalData({
  actor,
  branchId,
  client,
  operationLabel,
}: {
  actor: AuthorizationActor;
  branchId: string | null | undefined;
  client: PoolClient;
  operationLabel: string;
}) {
  const normalizedBranchId = nullableUuid(branchId);

  if (!normalizedBranchId) {
    throw new BranchGovernanceError(
      `Selecciona una sucursal activa antes de ${operationLabel}.`,
    );
  }

  const result = await client.query<BranchStatusRow>(
    `
      select
        organization_id,
        country_id,
        company_id,
        operational_area_id,
        name,
        status
      from public.branches
      where id = $1
        and is_enabled = true
        and deleted_at is null
      limit 1
    `,
    [normalizedBranchId],
  );
  const branch = result.rows[0];

  if (!branch) {
    throw new BranchGovernanceError(
      `La sucursal no existe o no esta disponible para ${operationLabel}.`,
    );
  }

  if (branch.status !== "active") {
    throw new BranchGovernanceError(
      `${branch.name} esta pendiente de gerente. Asigna primero un gerente de sucursal antes de ${operationLabel}.`,
    );
  }

  if (
    !canPerformAction(actor, "record.read", {
      scope: {
        branchId: normalizedBranchId,
        companyId: branch.company_id,
        countryId: branch.country_id,
        operationalAreaId: branch.operational_area_id,
        organizationId: branch.organization_id,
      },
    })
  ) {
    throw new BranchGovernanceError(
      `Tu rol no puede usar esta sucursal para ${operationLabel}.`,
    );
  }
}

export async function assertScopedBranchReadyForOperationalData({
  actor,
  branchId,
  operationLabel,
}: {
  actor: AuthorizationActor;
  branchId: string | null | undefined;
  operationLabel: string;
}) {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    await assertBranchReadyForOperationalData({
      actor,
      branchId,
      client,
      operationLabel,
    });
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}

export async function createGovernedBranch({
  actor,
  city,
  code,
  name,
  reason,
  scope,
}: CreateGovernedBranchInput): Promise<CreatedGovernedBranch> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  const organizationId = requiredUuid(scope.organizationId, "organizationId");
  const countryId = requiredUuid(scope.countryId, "countryId");
  const companyId = requiredUuid(scope.companyId, "companyId");
  const operationalAreaId = nullableUuid(scope.operationalAreaId);
  const actorUserId = getActorUuid(actor);
  const normalizedCode = normalizeBranchCode(code);
  const normalizedCity = city?.trim() || null;
  const normalizedName = name.trim();

  try {
    await resetPostgresRuntimeRole(client);
    await client.query("begin");

    if (operationalAreaId) {
      const areaResult = await client.query<{ id: string }>(
        `
          select id
          from public.operational_areas
          where id = $1
            and organization_id = $2
            and country_id = $3
            and company_id = $4
            and status = 'active'
            and deleted_at is null
          limit 1
        `,
        [operationalAreaId, organizationId, countryId, companyId],
      );

      if (!areaResult.rows[0]) {
        throw new BranchGovernanceError(
          "La gerencia de area no pertenece al pais y linea seleccionados.",
        );
      }
    }

    const branchResult = await client.query<BranchRow>(
      `
        insert into public.branches (
          organization_id,
          country_id,
          company_id,
          operational_area_id,
          code,
          name,
          city,
          status,
          is_demo,
          created_by
        )
        values ($1, $2, $3, $4, $5, $6, $7, 'pending_manager', false, $8)
        returning id, code, name, status
      `,
      [
        organizationId,
        countryId,
        companyId,
        operationalAreaId,
        normalizedCode,
        normalizedName,
        normalizedCity,
        actorUserId,
      ],
    );
    const branch = branchResult.rows[0];

    if (!branch) {
      throw new BranchGovernanceError("No se pudo crear la sucursal.");
    }

    if (operationalAreaId) {
      await client.query(
        `
          insert into public.area_branch_assignments (
            organization_id,
            operational_area_id,
            branch_id,
            assigned_by
          )
          values ($1, $2, $3, $4)
        `,
        [organizationId, operationalAreaId, branch.id, actorUserId],
      );
    }

    await client.query(
      `
        insert into public.assignment_history (
          organization_id,
          actor_user_id,
          entity_table,
          entity_id,
          action,
          previous_scope,
          next_scope,
          reason
        )
        values ($1, $2, 'branches', $3, 'branch.created', '{}'::jsonb, $4::jsonb, $5)
      `,
      [
        organizationId,
        actorUserId,
        branch.id,
        JSON.stringify({
          branch_id: branch.id,
          code: branch.code,
          company_id: companyId,
          country_id: countryId,
          name: branch.name,
          operational_area_id: operationalAreaId,
          status: branch.status,
        }),
        reason,
      ],
    );

    await client.query(
      `
        insert into public.audit_logs (
          organization_id,
          actor_user_id,
          action,
          entity_table,
          entity_id,
          country_id,
          company_id,
          branch_id,
          metadata
        )
        values ($1, $2, 'branch.created', 'branches', $3, $4, $5, $3, $6::jsonb)
      `,
      [
        organizationId,
        actorUserId,
        branch.id,
        countryId,
        companyId,
        JSON.stringify({
          created_status: branch.status,
          has_operational_area: Boolean(operationalAreaId),
          source: "usuarios-permisos",
        }),
      ],
    );

    await client.query("commit");

    return {
      code: branch.code,
      id: branch.id,
      name: branch.name,
      status: branch.status,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new BranchGovernanceError(
        "Ya existe una sucursal con ese codigo en el pais y linea seleccionados.",
      );
    }

    throw error;
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}
