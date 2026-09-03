import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import {
  getMissingDatabaseConfig,
  getPostgresPool,
  resetPostgresRuntimeRole,
} from "@/lib/server/database";
import { canPerformAction } from "@/lib/security/authorization-policy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";
import {
  isManagementLevel,
  normalizeBaseBonusAmount,
} from "@/lib/tenant/manager-incentives";

type ManagerIncentiveRow = {
  assignment_id: string;
  base_bonus_amount: number | string | null;
  branch_id: string | null;
  branch_name: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  display_name: string | null;
  email: string | null;
  management_level: string | null;
  operational_area_id: string | null;
  operational_area_name: string | null;
  profile_id: string;
  role_key: string;
  role_name: string;
};

type SupabaseManagerIncentiveRow = {
  id: string;
  base_amount: number | string | null;
  branch_id: string | null;
  branch_name: string | null;
  category: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  display_name: string | null;
  email: string | null;
  operational_area_id: string | null;
  operational_area_name: string | null;
  organization_id: string;
  profile_id: string;
  role_key: string;
  role_name: string;
  status: string;
};

function categoryToManagementLevel(category: string | null) {
  if (category === "SENIOR") return "senior" as const;
  if (category === "MEDIO") return "middle" as const;
  if (category === "JUNIOR") return "junior" as const;
  return null;
}

function managementLevelToCategory(level: "senior" | "middle" | "junior") {
  if (level === "senior") return "SENIOR";
  if (level === "middle") return "MEDIO";
  return "JUNIOR";
}

function supabaseRowToManagerRow(row: SupabaseManagerIncentiveRow): ManagerIncentiveRow {
  return {
    assignment_id: row.id,
    base_bonus_amount: row.base_amount,
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    company_id: row.company_id,
    company_name: row.company_name,
    country_id: row.country_id,
    country_name: row.country_name,
    display_name: row.display_name,
    email: row.email,
    management_level: categoryToManagementLevel(row.category),
    operational_area_id: row.operational_area_id,
    operational_area_name: row.operational_area_name,
    profile_id: row.profile_id,
    role_key: row.role_key,
    role_name: row.role_name,
  };
}

async function loadManagerIncentiveRowsFromSupabase(organizationId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { error: "SUPABASE_SERVICE_ROLE_KEY_REQUIRED", rows: [] as ManagerIncentiveRow[] };

  const { data, error } = await admin
    .from("v_manager_bonus_directory")
    .select(
      "id,organization_id,profile_id,display_name,email,role_key,role_name,country_id,country_name,company_id,company_name,operational_area_id,operational_area_name,branch_id,branch_name,base_amount,category,status",
    )
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("role_key", ["gerente_area", "gerente_sucursal"])
    .order("display_name");

  if (error) return { error: error.message, rows: [] as ManagerIncentiveRow[] };
  return {
    error: null,
    rows: ((data ?? []) as SupabaseManagerIncentiveRow[]).map(supabaseRowToManagerRow),
  };
}

type ManagerIncentiveRequest = {
  assignmentId?: unknown;
  baseBonusAmount?: unknown;
  managementLevel?: unknown;
};

const editableManagerRoles = new Set<RoleKey>([
  "gerente_area",
  "gerente_sucursal",
]);

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

function isRoleKey(value: string): value is RoleKey {
  return roleKeys.includes(value as RoleKey);
}

function readNumberLike(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

function toScope(row: ManagerIncentiveRow): ScopeBoundary {
  return {
    branchId: row.branch_id,
    companyId: row.company_id,
    countryId: row.country_id,
    operationalAreaId: row.operational_area_id,
    organizationId: "",
  };
}

function canEditRow(
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentAuthorizationActor>>>,
  row: ManagerIncentiveRow,
  organizationId: string,
) {
  if (!isRoleKey(row.role_key) || !editableManagerRoles.has(row.role_key)) {
    return false;
  }

  return canPerformAction(actor, "bonuses.adjust", {
    roleKey: row.role_key,
    scope: {
      ...toScope(row),
      organizationId,
    },
    targetUserId: row.profile_id,
  });
}

async function loadManagerIncentiveRows(organizationId: string) {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);

    const result = await client.query<ManagerIncentiveRow>(
      `
        select
          ma.id as assignment_id,
          ma.profile_id,
          r.key as role_key,
          r.name as role_name,
          p.display_name,
          p.email,
          ma.management_level,
          ma.base_bonus_amount,
          ma.country_id,
          c.name as country_name,
          ma.company_id,
          co.name as company_name,
          ma.operational_area_id,
          oa.name as operational_area_name,
          ma.branch_id,
          b.name as branch_name
        from public.manager_assignments ma
        join public.roles r on r.id = ma.role_id
        join public.profiles p on p.id = ma.profile_id
        left join public.countries c on c.id = ma.country_id
        left join public.companies co on co.id = ma.company_id
        left join public.operational_areas oa on oa.id = ma.operational_area_id
        left join public.branches b on b.id = ma.branch_id
        where ma.organization_id = $1
          and ma.status = 'active'
          and ma.deactivated_at is null
          and r.key in ('gerente_area', 'gerente_sucursal')
          and p.status = 'active'
          and p.deleted_at is null
          and p.deactivated_at is null
        order by r.key, p.display_name, b.name nulls first, oa.name nulls first
      `,
      [organizationId],
    );

    return result.rows;
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para consultar bonos.", 401);
  }

  // A branch manager must never infer their own compensation from an empty
  // directory response. Keep this server-side even if navigation is hidden.
  if (actor.roleKey === "gerente_sucursal") {
    return jsonError("No tienes acceso a bonos ni niveles gerenciales.", 403);
  }

  const missingConfig = getMissingDatabaseConfig();

  const organizationId = actor.scope.organizationId;

  if (!organizationId) {
    return jsonError("El alcance de organizacion no esta completo.", 403);
  }

  const rowsResult = missingConfig.length > 0
    ? await loadManagerIncentiveRowsFromSupabase(organizationId)
    : { error: null, rows: await loadManagerIncentiveRows(organizationId) };

  if (rowsResult.error) {
    return jsonError(
      `No se pudo consultar el directorio de bonos en Supabase: ${rowsResult.error}`,
      503,
      ["SUPABASE_DIRECTORY"],
    );
  }

  const rows = rowsResult.rows;

  return NextResponse.json({
    managerIncentives: rows
      .filter((row) =>
        canPerformAction(actor, "record.read", {
          scope: {
            ...toScope(row),
            organizationId,
          },
        }),
      )
      .map((row) => ({
        assignmentId: row.assignment_id,
        baseBonusAmount: readNumberLike(row.base_bonus_amount),
        branchId: row.branch_id,
        branchName: row.branch_name,
        businessId: row.company_id,
        businessName: row.company_name,
        canEdit: canEditRow(actor, row, organizationId),
        countryId: row.country_id,
        countryName: row.country_name,
        email: row.email,
        fullName: row.display_name ?? row.email ?? "Gerente",
        id: row.profile_id,
        managementLevel: isManagementLevel(row.management_level)
          ? row.management_level
          : null,
        operationalAreaId: row.operational_area_id,
        operationalAreaName: row.operational_area_name,
        roleKey: isRoleKey(row.role_key) ? row.role_key : "viewer",
        roleName: row.role_name,
      })),
    ok: true,
  });
}

export async function PATCH(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para editar bonos.", 401);
  }

  if (actor.roleKey === "gerente_sucursal") {
    return jsonError("No tienes acceso a bonos ni niveles gerenciales.", 403);
  }

  const missingConfig = getMissingDatabaseConfig();

  const payload = (await request.json().catch(() => null)) as
    | ManagerIncentiveRequest
    | null;
  const assignmentId =
    typeof payload?.assignmentId === "string" ? payload.assignmentId : "";
  const rawBaseBonusAmount =
    typeof payload?.baseBonusAmount === "number"
      ? payload.baseBonusAmount
      : typeof payload?.baseBonusAmount === "string"
        ? Number(payload.baseBonusAmount)
        : Number.NaN;
  const baseBonusAmount = normalizeBaseBonusAmount(rawBaseBonusAmount);

  if (!assignmentId) {
    return jsonError("Selecciona el gerente que quieres editar.", 400);
  }

  const managementLevel = isManagementLevel(payload?.managementLevel)
    ? payload.managementLevel
    : null;

  if (!managementLevel) {
    return jsonError("Selecciona nivel senior, middle o junior.", 400);
  }

  if (!baseBonusAmount) {
    return jsonError("Ingresa un bono base mayor a 0 y menor o igual a 10000.", 400);
  }

  const organizationId = actor.scope.organizationId;

  if (!organizationId) {
    return jsonError("El alcance de organizacion no esta completo.", 403);
  }

  if (missingConfig.length > 0) {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return jsonError(
        "Supabase de servidor no esta configurado para editar bonos.",
        503,
        ["SUPABASE_SERVICE_ROLE_KEY"],
      );
    }

    const { data, error } = await admin
      .from("v_manager_bonus_directory")
      .select(
        "id,organization_id,profile_id,display_name,email,role_key,role_name,country_id,country_name,company_id,company_name,operational_area_id,operational_area_name,branch_id,branch_name,base_amount,category,status",
      )
      .eq("id", assignmentId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) {
      return jsonError("No encontre ese gerente activo.", 404);
    }

    const row = supabaseRowToManagerRow(data as SupabaseManagerIncentiveRow);

    if (!canEditRow(actor, row, organizationId)) {
      return jsonError(
        "Tu rol solo puede editar bonos de gerentes bajo tu jerarquia y alcance.",
        403,
      );
    }

    const { error: updateError } = await admin
      .from("manager_bonus_plans")
      .update({
        base_amount: baseBonusAmount,
        category: managementLevelToCategory(managementLevel),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("organization_id", organizationId)
      .eq("status", "active");

    if (updateError) {
      return jsonError(`No se pudo actualizar el bono: ${updateError.message}`, 500);
    }

    await admin.from("audit_logs").insert({
      organization_id: organizationId,
      actor_user_id: actor.userId,
      action: "manager_bonus_plan.updated",
      entity_table: "manager_bonus_plans",
      entity_id: assignmentId,
      country_id: row.country_id,
      company_id: row.company_id,
      branch_id: row.branch_id,
      metadata: {
        base_amount: baseBonusAmount,
        category: managementLevelToCategory(managementLevel),
        source: "usuarios-permisos-supabase",
      },
    });

    return NextResponse.json({
      managerIncentive: {
        assignmentId,
        baseBonusAmount,
        managementLevel,
      },
      ok: true,
      source: "supabase",
      status: "updated",
    });
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    await client.query("begin");

    const result = await client.query<ManagerIncentiveRow>(
      `
        select
          ma.id as assignment_id,
          ma.profile_id,
          r.key as role_key,
          r.name as role_name,
          p.display_name,
          p.email,
          ma.management_level,
          ma.base_bonus_amount,
          ma.country_id,
          c.name as country_name,
          ma.company_id,
          co.name as company_name,
          ma.operational_area_id,
          oa.name as operational_area_name,
          ma.branch_id,
          b.name as branch_name
        from public.manager_assignments ma
        join public.roles r on r.id = ma.role_id
        join public.profiles p on p.id = ma.profile_id
        left join public.countries c on c.id = ma.country_id
        left join public.companies co on co.id = ma.company_id
        left join public.operational_areas oa on oa.id = ma.operational_area_id
        left join public.branches b on b.id = ma.branch_id
        where ma.id = $1
          and ma.organization_id = $2
          and ma.status = 'active'
          and ma.deactivated_at is null
        for update of ma
      `,
      [assignmentId, organizationId],
    );
    const row = result.rows[0];

    if (!row) {
      await client.query("rollback");
      return jsonError("No encontre ese gerente activo.", 404);
    }

    if (!canEditRow(actor, row, organizationId)) {
      await client.query("rollback");
      return jsonError(
        "Tu rol solo puede editar bonos de gerentes bajo tu jerarquia y alcance.",
        403,
      );
    }

    const previousScope = {
      base_bonus_amount: readNumberLike(row.base_bonus_amount),
      management_level: row.management_level,
    };
    const nextScope = {
      base_bonus_amount: baseBonusAmount,
      management_level: managementLevel,
    };

    await client.query(
      `
        select set_config('request.jwt.claim.sub', '', true)
      `,
    );

    await client.query(
      `
        update public.manager_assignments
        set
          base_bonus_amount = $1,
          management_level = $2,
          metadata = metadata || $3::jsonb,
          updated_at = now()
        where id = $4
      `,
      [
        baseBonusAmount,
        managementLevel,
        JSON.stringify({
          bonus_previous: previousScope,
          bonus_updated_at: new Date().toISOString(),
          bonus_updated_by: actor.userId,
          bonus_updated_to: nextScope,
        }),
        assignmentId,
      ],
    );

    await client.query("commit");

    return NextResponse.json({
      managerIncentive: {
        assignmentId,
        baseBonusAmount,
        managementLevel,
      },
      ok: true,
      status: "updated",
    });
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    console.error("Failed to update manager incentive", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonError("No se pudo actualizar el bono del gerente.", 500);
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}
