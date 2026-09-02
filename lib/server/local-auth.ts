import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import {
  getPostgresPool,
  resetPostgresRuntimeRole,
} from "@/lib/server/database";
import {
  getPasswordPolicyError,
  hashPassword,
  verifyPassword,
} from "@/lib/server/passwords";
import type { CurrentUserScope } from "@/lib/tenant/current-user-access";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";
import {
  isManagementLevel,
  managerIncentiveFormulaVersion,
  normalizeBaseBonusAmount,
  type ManagerIncentiveInput,
} from "@/lib/tenant/manager-incentives";

type InvitationActivationRow = {
  branch_id: string | null;
  company_id: string | null;
  country_id: string | null;
  email: string;
  id: string;
  invited_by: string | null;
  invited_role_id: string;
  base_bonus_amount: number | string | null;
  management_level: string | null;
  metadata: Record<string, unknown> | string | null;
  operational_area_id: string | null;
  organization_id: string;
  role_key: string;
};

type LocalAuthUserRow = {
  email: string;
  encrypted_password: string | null;
  id: string;
  profile_status: string | null;
  requires_password_change: boolean | null;
  role_key: string | null;
};

type LocalUserScopeRow = {
  branch_city: string | null;
  branch_code: string | null;
  branch_id: string | null;
  branch_name: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  email: string;
  id: string;
  operational_area_id: string | null;
  operational_area_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  requires_password_change: boolean | null;
  role_key: string | null;
};

export type AuthenticatedLocalUser = {
  email: string;
  requiresPasswordChange: boolean;
  roleKey: RoleKey;
  scope?: CurrentUserScope;
  userId: string;
};

export class LocalAuthRequestError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export type AcceptInvitationInput = {
  email: string;
  password: string;
  token: string;
};

export type CreateLocalUserWithTemporaryPasswordInput = {
  actorUserId: string;
  email: string;
  fullName: string;
  managedBranchManagerIds?: string[];
  managerIncentive?: ManagerIncentiveInput;
  password: string;
  roleKey: RoleKey;
  scope: {
    branchId?: string | null;
    companyId?: string | null;
    countryId?: string | null;
    operationalAreaId?: string | null;
    organizationId: string;
  };
};

export type ResetLocalUserTemporaryPasswordInput = {
  actorUserId: string;
  email: string;
  password: string;
};

export type LocalUserPasswordTarget = {
  email: string;
  roleKey: RoleKey;
  scope: {
    branchId?: string | null;
    companyId?: string | null;
    countryId?: string | null;
    operationalAreaId?: string | null;
    organizationId: string;
  };
  userId: string;
};

type ChangeAuthenticatedLocalUserPasswordInput = {
  currentPassword: string;
  newPassword: string;
  userId: string;
};

type LocalPasswordChangeUserRow = {
  branch_id: string | null;
  company_id: string | null;
  country_id: string | null;
  email: string;
  encrypted_password: string | null;
  id: string;
  organization_id: string | null;
  profile_status: string | null;
};

type ManagerAssignmentRow = {
  id: string;
  status: string | null;
};

type ReportingManagerRow = {
  manager_profile_id: string | null;
};

type ScopedBranchManagerRow = {
  profile_id: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const managerAssignmentRoleKeys = new Set<RoleKey>([
  "gerente_area",
  "gerente_sucursal",
]);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseMetadata(metadata: InvitationActivationRow["metadata"]) {
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return metadata ?? {};
}

function readNumberLike(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return Number.NaN;
}

function readInvitationManagerIncentive(
  invitation: InvitationActivationRow,
): ManagerIncentiveInput | null {
  if (isManagementLevel(invitation.management_level)) {
    const baseBonusAmount = normalizeBaseBonusAmount(
      readNumberLike(invitation.base_bonus_amount),
    );

    if (baseBonusAmount) {
      return {
        baseBonusAmount,
        managementLevel: invitation.management_level,
      };
    }
  }

  const metadata = parseMetadata(invitation.metadata);
  const metadataIncentive =
    typeof metadata.manager_incentive === "object" &&
    metadata.manager_incentive !== null
      ? (metadata.manager_incentive as Record<string, unknown>)
      : null;

  if (!metadataIncentive || !isManagementLevel(metadataIncentive.management_level)) {
    return null;
  }

  const baseBonusAmount = normalizeBaseBonusAmount(
    readNumberLike(metadataIncentive.base_bonus_amount),
  );

  if (!baseBonusAmount) {
    return null;
  }

  return {
    baseBonusAmount,
    managementLevel: metadataIncentive.management_level,
  };
}

function readManagedBranchManagerIds(invitation: InvitationActivationRow) {
  const metadata = parseMetadata(invitation.metadata);
  const ids = Array.isArray(metadata.managed_branch_manager_ids)
    ? metadata.managed_branch_manager_ids
    : [];
  const normalizedIds: string[] = [];

  for (const id of ids) {
    if (typeof id === "string" && uuidPattern.test(id) && !normalizedIds.includes(id)) {
      normalizedIds.push(id);
    }
  }

  return normalizedIds;
}

function getDisplayName(invitation: InvitationActivationRow) {
  const metadata = parseMetadata(invitation.metadata);
  const invitedName = metadata.invited_name;

  if (typeof invitedName === "string" && invitedName.trim()) {
    return invitedName.trim();
  }

  return invitation.email.split("@")[0] ?? "Usuario Analiza";
}

function coerceRoleKey(value: string | null | undefined): RoleKey {
  return roleKeys.includes(value as RoleKey)
    ? (value as RoleKey)
    : "viewer";
}

function nullableUuid(value: string | null | undefined) {
  if (!value || !uuidPattern.test(value)) {
    return null;
  }

  return value;
}

function requiredUuid(value: string | null | undefined, fieldName: string) {
  const uuid = nullableUuid(value);

  if (!uuid) {
    throw new Error(`Falta ${fieldName} valido para crear el usuario.`);
  }

  return uuid;
}

function buildVirtualInvitation({
  actorUserId,
  email,
  fullName,
  managedBranchManagerIds = [],
  managerIncentive,
  roleId,
  roleKey,
  scope,
}: CreateLocalUserWithTemporaryPasswordInput & { roleId: string }) {
  return {
    base_bonus_amount: managerIncentive?.baseBonusAmount ?? null,
    branch_id: nullableUuid(scope.branchId),
    company_id: nullableUuid(scope.companyId),
    country_id: nullableUuid(scope.countryId),
    email: normalizeEmail(email),
    id: randomUUID(),
    invited_by: nullableUuid(actorUserId),
    invited_role_id: roleId,
    management_level: managerIncentive?.managementLevel ?? null,
    metadata: {
      delivery_provider: "manual-temporary-password",
      invited_name: fullName,
      manager_incentive: managerIncentive
        ? {
            base_bonus_amount: managerIncentive.baseBonusAmount,
            formula_version: managerIncentiveFormulaVersion,
            management_level: managerIncentive.managementLevel,
          }
        : undefined,
      managed_branch_manager_count: managedBranchManagerIds.length,
      managed_branch_manager_ids: managedBranchManagerIds,
      source: "usuarios-permisos",
    },
    operational_area_id: nullableUuid(scope.operationalAreaId),
    organization_id: requiredUuid(scope.organizationId, "organizationId"),
    role_key: roleKey,
  } satisfies InvitationActivationRow;
}

async function assignOperationalAreaManager(
  client: PoolClient,
  managerProfileId: string,
  invitation: InvitationActivationRow,
) {
  if (coerceRoleKey(invitation.role_key) !== "gerente_area") {
    return;
  }

  if (!invitation.operational_area_id) {
    return;
  }

  const previousResult = await client.query<{
    manager_profile_id: string | null;
  }>(
    `
      select manager_profile_id
      from public.operational_areas
      where id = $1
        and organization_id = $2
        and ($3::uuid is null or country_id = $3::uuid)
        and ($4::uuid is null or company_id = $4::uuid)
      for update
    `,
    [
      invitation.operational_area_id,
      invitation.organization_id,
      invitation.country_id,
      invitation.company_id,
    ],
  );
  const previousManagerId = previousResult.rows[0]?.manager_profile_id ?? null;

  await client.query(
    `
      update public.operational_areas
      set manager_profile_id = $1,
          updated_at = now()
      where id = $2
        and organization_id = $3
        and ($4::uuid is null or country_id = $4::uuid)
        and ($5::uuid is null or company_id = $5::uuid)
    `,
    [
      managerProfileId,
      invitation.operational_area_id,
      invitation.organization_id,
      invitation.country_id,
      invitation.company_id,
    ],
  );

  if (previousManagerId === managerProfileId) {
    return;
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
      values ($1, $2, 'operational_areas', $3, 'operational_area.manager_assigned', $4::jsonb, $5::jsonb, $6)
    `,
    [
      invitation.organization_id,
      invitation.invited_by,
      invitation.operational_area_id,
      JSON.stringify({ previous_manager_profile_id: previousManagerId }),
      JSON.stringify({
        manager_profile_id: managerProfileId,
        source: "invitation-activation",
      }),
      "Asignacion de gerente de area al aceptar invitacion segura.",
    ],
  );
}

async function getScopedActiveBranchManagerIds(
  client: PoolClient,
  candidateProfileIds: string[],
  invitation: InvitationActivationRow,
) {
  if (candidateProfileIds.length === 0 || !invitation.operational_area_id) {
    return [];
  }

  const result = await client.query<ScopedBranchManagerRow>(
    `
      select distinct ma.profile_id
      from public.manager_assignments ma
      join public.roles r on r.id = ma.role_id
      join public.profiles p on p.id = ma.profile_id
      where ma.profile_id = any($1::uuid[])
        and ma.organization_id = $2
        and ($3::uuid is null or ma.country_id = $3::uuid)
        and ($4::uuid is null or ma.company_id = $4::uuid)
        and ma.operational_area_id = $5
        and ma.branch_id is not null
        and ma.status = 'active'
        and ma.deactivated_at is null
        and r.key = 'gerente_sucursal'
        and p.status = 'active'
        and p.deactivated_at is null
        and p.deleted_at is null
    `,
    [
      candidateProfileIds,
      invitation.organization_id,
      invitation.country_id,
      invitation.company_id,
      invitation.operational_area_id,
    ],
  );

  return result.rows.map((row) => row.profile_id);
}

async function replaceActiveReportingLines({
  client,
  invitation,
  managerProfileId,
  reason,
  subordinateProfileIds,
}: {
  client: PoolClient;
  invitation: InvitationActivationRow;
  managerProfileId: string;
  reason: string;
  subordinateProfileIds: string[];
}) {
  if (subordinateProfileIds.length === 0) {
    return;
  }

  await client.query(
    `
      update public.reporting_lines
      set status = 'inactive',
          ends_at = coalesce(ends_at, now())
      where subordinate_profile_id = any($1::uuid[])
        and manager_profile_id is distinct from $2
        and status = 'active'
    `,
    [subordinateProfileIds, managerProfileId],
  );

  const insertedResult = await client.query<{ subordinate_profile_id: string }>(
    `
      insert into public.reporting_lines (
        organization_id,
        manager_profile_id,
        subordinate_profile_id,
        status,
        starts_at,
        created_by
      )
      select $2, $3, selected.subordinate_profile_id, 'active', now(), $4
      from unnest($1::uuid[]) as selected(subordinate_profile_id)
      where not exists (
        select 1
        from public.reporting_lines rl
        where rl.manager_profile_id = $3
          and rl.subordinate_profile_id = selected.subordinate_profile_id
          and rl.status = 'active'
      )
      returning subordinate_profile_id
    `,
    [
      subordinateProfileIds,
      invitation.organization_id,
      managerProfileId,
      invitation.invited_by,
    ],
  );
  const insertedProfileIds = insertedResult.rows.map(
    (row) => row.subordinate_profile_id,
  );

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
      values ($1, $2, 'reporting_lines', $3, 'reporting_lines.assigned', '{}'::jsonb, $4::jsonb, $5)
    `,
    [
      invitation.organization_id,
      invitation.invited_by,
      managerProfileId,
      JSON.stringify({
        inserted_subordinate_profile_ids: insertedProfileIds,
        manager_profile_id: managerProfileId,
        source: "invitation-activation",
        subordinate_profile_ids: subordinateProfileIds,
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
      values ($1, $2, 'reporting_lines.assigned', 'reporting_lines', $3, $4, $5, $6, $7::jsonb)
    `,
    [
      invitation.organization_id,
      invitation.invited_by,
      managerProfileId,
      invitation.country_id,
      invitation.company_id,
      invitation.branch_id,
      JSON.stringify({
        inserted_subordinate_profile_ids: insertedProfileIds,
        manager_profile_id: managerProfileId,
        source: "invitation-activation",
        subordinate_profile_ids: subordinateProfileIds,
      }),
    ],
  );
}

async function activateBranchAfterBranchManagerAcceptance(
  client: PoolClient,
  userId: string,
  invitation: InvitationActivationRow,
) {
  if (!invitation.branch_id) {
    return;
  }

  const previousResult = await client.query<{ status: string }>(
    `
      select status
      from public.branches
      where id = $1
        and organization_id = $2
        and ($3::uuid is null or country_id = $3::uuid)
        and ($4::uuid is null or company_id = $4::uuid)
        and ($5::uuid is null or operational_area_id = $5::uuid)
        and deleted_at is null
      for update
    `,
    [
      invitation.branch_id,
      invitation.organization_id,
      invitation.country_id,
      invitation.company_id,
      invitation.operational_area_id,
    ],
  );
  const previousStatus = previousResult.rows[0]?.status;

  if (!previousStatus || previousStatus === "active") {
    return;
  }

  await client.query(
    `
      update public.branches
      set status = 'active',
          updated_at = now()
      where id = $1
        and organization_id = $2
    `,
    [invitation.branch_id, invitation.organization_id],
  );

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
      values ($1, $2, 'branches', $3, 'branch.activated_by_manager', $4::jsonb, $5::jsonb, $6)
    `,
    [
      invitation.organization_id,
      invitation.invited_by,
      invitation.branch_id,
      JSON.stringify({ status: previousStatus }),
      JSON.stringify({
        branch_id: invitation.branch_id,
        branch_manager_profile_id: userId,
        status: "active",
      }),
      "Sucursal activada al aceptar invitacion el gerente de sucursal asignado.",
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
      values ($1, $2, 'branch.activated_by_manager', 'branches', $3, $4, $5, $3, $6::jsonb)
    `,
    [
      invitation.organization_id,
      invitation.invited_by,
      invitation.branch_id,
      invitation.country_id,
      invitation.company_id,
      JSON.stringify({
        branch_manager_profile_id: userId,
        previous_status: previousStatus,
        source: "invitation-activation",
      }),
    ],
  );
}

async function findReportingManagerForBranchManager(
  client: PoolClient,
  invitation: InvitationActivationRow,
) {
  if (!invitation.operational_area_id) {
    return null;
  }

  const result = await client.query<ReportingManagerRow>(
    `
      with candidate_managers as (
        select p.id as manager_profile_id, 1 as priority
        from public.profiles p
        join public.user_roles ur on ur.user_id = p.id
        join public.roles r on r.id = ur.role_id
        where p.id = $1
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null
          and r.key = 'gerente_area'
          and ur.status = 'active'
          and ur.deactivated_at is null
          and ur.organization_id = $2
          and ($3::uuid is null or ur.country_id is null or ur.country_id = $3::uuid)
          and ($4::uuid is null or ur.company_id is null or ur.company_id = $4::uuid)
          and (
            ur.operational_area_id is null
            or ur.operational_area_id = $5
          )

        union all

        select oa.manager_profile_id, 2 as priority
        from public.operational_areas oa
        join public.profiles p on p.id = oa.manager_profile_id
        where oa.id = $5
          and oa.organization_id = $2
          and ($3::uuid is null or oa.country_id = $3::uuid)
          and ($4::uuid is null or oa.company_id = $4::uuid)
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null

        union all

        select ma.profile_id as manager_profile_id, 3 as priority
        from public.manager_assignments ma
        join public.roles r on r.id = ma.role_id
        join public.profiles p on p.id = ma.profile_id
        where ma.organization_id = $2
          and ($3::uuid is null or ma.country_id = $3::uuid)
          and ($4::uuid is null or ma.company_id = $4::uuid)
          and ma.operational_area_id = $5
          and ma.branch_id is null
          and ma.status = 'active'
          and ma.deactivated_at is null
          and r.key = 'gerente_area'
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null
      )
      select manager_profile_id
      from candidate_managers
      where manager_profile_id is not null
      order by priority
      limit 1
    `,
    [
      invitation.invited_by,
      invitation.organization_id,
      invitation.country_id,
      invitation.company_id,
      invitation.operational_area_id,
    ],
  );

  return result.rows[0]?.manager_profile_id ?? null;
}

async function activateReportingLines(
  client: PoolClient,
  userId: string,
  invitation: InvitationActivationRow,
) {
  const roleKey = coerceRoleKey(invitation.role_key);

  if (roleKey === "gerente_area") {
    await assignOperationalAreaManager(client, userId, invitation);

    const managedBranchManagerIds = await getScopedActiveBranchManagerIds(
      client,
      readManagedBranchManagerIds(invitation),
      invitation,
    );

    await replaceActiveReportingLines({
      client,
      invitation,
      managerProfileId: userId,
      reason:
        "Asignacion de gerentes de sucursal bajo gerente de area al aceptar invitacion segura.",
      subordinateProfileIds: managedBranchManagerIds,
    });
    return;
  }

  if (roleKey !== "gerente_sucursal") {
    return;
  }

  await activateBranchAfterBranchManagerAcceptance(client, userId, invitation);

  const managerProfileId = await findReportingManagerForBranchManager(
    client,
    invitation,
  );

  if (!managerProfileId) {
    return;
  }

  const managedBranchManagerIds = await getScopedActiveBranchManagerIds(
    client,
    [userId],
    invitation,
  );

  await replaceActiveReportingLines({
    client,
    invitation,
    managerProfileId,
    reason:
      "Asignacion automatica de gerente de sucursal bajo su gerente de area.",
    subordinateProfileIds: managedBranchManagerIds,
  });
}

async function ensureActiveUserRole(
  client: PoolClient,
  userId: string,
  invitation: InvitationActivationRow,
) {
  const roleScopeValues = [
    userId,
    invitation.invited_role_id,
    invitation.organization_id,
    invitation.country_id,
    invitation.company_id,
    invitation.operational_area_id,
    invitation.branch_id,
  ];

  const existingRole = await client.query<{ id: string }>(
    `
      select id
      from public.user_roles
      where user_id = $1
        and role_id = $2
        and organization_id = $3
        and country_id is not distinct from $4
        and company_id is not distinct from $5
        and operational_area_id is not distinct from $6
        and branch_id is not distinct from $7
      limit 1
    `,
    roleScopeValues,
  );
  const existingRoleId = existingRole.rows[0]?.id;

  if (existingRoleId) {
    await client.query(
      `
        update public.user_roles
        set status = 'active',
            deactivated_at = null
        where id = $1
      `,
      [existingRoleId],
    );
    return;
  }

  await client.query(
    `
      insert into public.user_roles (
        user_id,
        role_id,
        organization_id,
        country_id,
        company_id,
        operational_area_id,
        branch_id,
        status
      )
      values ($1, $2, $3, $4, $5, $6, $7, 'active')
    `,
    roleScopeValues,
  );
}

async function grantScopedAccess(
  client: PoolClient,
  userId: string,
  invitation: InvitationActivationRow,
) {
  if (invitation.country_id) {
    await client.query(
      `
        insert into public.user_country_access (user_id, country_id)
        values ($1, $2)
        on conflict (user_id, country_id) do nothing
      `,
      [userId, invitation.country_id],
    );
  }

  if (invitation.company_id) {
    await client.query(
      `
        insert into public.user_company_access (user_id, company_id)
        values ($1, $2)
        on conflict (user_id, company_id) do nothing
      `,
      [userId, invitation.company_id],
    );
  }

  if (invitation.branch_id) {
    await client.query(
      `
        insert into public.user_branch_access (user_id, branch_id)
        values ($1, $2)
        on conflict (user_id, branch_id) do nothing
      `,
      [userId, invitation.branch_id],
    );
  }
}

async function activateManagerAssignment(
  client: PoolClient,
  userId: string,
  invitation: InvitationActivationRow,
) {
  const roleKey = coerceRoleKey(invitation.role_key);

  if (!managerAssignmentRoleKeys.has(roleKey)) {
    return;
  }

  const assignmentValues = [
    userId,
    invitation.invited_role_id,
    invitation.organization_id,
    invitation.country_id,
    invitation.company_id,
    invitation.operational_area_id,
    invitation.branch_id,
  ];
  const existingAssignmentResult = await client.query<ManagerAssignmentRow>(
    `
      select id, status
      from public.manager_assignments
      where profile_id = $1
        and role_id = $2
        and organization_id = $3
        and country_id is not distinct from $4
        and company_id is not distinct from $5
        and operational_area_id is not distinct from $6
        and branch_id is not distinct from $7
        and deactivated_at is null
      order by created_at desc
      limit 1
    `,
    assignmentValues,
  );
  const existingAssignment = existingAssignmentResult.rows[0];
  const managerIncentive = readInvitationManagerIncentive(invitation);
  const assignmentMetadata = JSON.stringify({
    manager_incentive: managerIncentive
      ? {
          base_bonus_amount: managerIncentive.baseBonusAmount,
          formula_version: managerIncentiveFormulaVersion,
          management_level: managerIncentive.managementLevel,
        }
      : undefined,
    invitation_id: invitation.id,
    source: "invitation-activation",
  });
  const nextScope = {
    branch_id: invitation.branch_id,
    base_bonus_amount: managerIncentive?.baseBonusAmount ?? null,
    bonus_formula: managerIncentiveFormulaVersion,
    company_id: invitation.company_id,
    country_id: invitation.country_id,
    management_level: managerIncentive?.managementLevel ?? null,
    operational_area_id: invitation.operational_area_id,
    profile_id: userId,
    role_key: roleKey,
    status: "active",
  };
  const assignmentId = existingAssignment
    ? existingAssignment.id
    : (
        await client.query<{ id: string }>(
          `
            insert into public.manager_assignments (
              organization_id,
              profile_id,
              role_id,
              country_id,
              company_id,
              operational_area_id,
              branch_id,
              management_level,
              base_bonus_amount,
              assigned_by,
              status,
              starts_at,
              metadata
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', now(), $11::jsonb)
            returning id
          `,
          [
            invitation.organization_id,
            userId,
            invitation.invited_role_id,
            invitation.country_id,
            invitation.company_id,
            invitation.operational_area_id,
            invitation.branch_id,
            managerIncentive?.managementLevel ?? null,
            managerIncentive?.baseBonusAmount ?? null,
            invitation.invited_by,
            assignmentMetadata,
          ],
        )
      ).rows[0]?.id;

  if (!assignmentId) {
    throw new Error("No se pudo activar la asignacion del gerente.");
  }

  if (existingAssignment) {
    await client.query(
      `
        update public.manager_assignments
        set status = 'active',
            starts_at = coalesce(starts_at, now()),
            ends_at = null,
            assigned_by = coalesce(assigned_by, $2),
            metadata = metadata || $3::jsonb,
            management_level = coalesce($4, management_level),
            base_bonus_amount = coalesce($5, base_bonus_amount)
        where id = $1
      `,
      [
        assignmentId,
        invitation.invited_by,
        assignmentMetadata,
        managerIncentive?.managementLevel ?? null,
        managerIncentive?.baseBonusAmount ?? null,
      ],
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
      values ($1, $2, 'manager_assignments', $3, $4, $5::jsonb, $6::jsonb, $7)
    `,
    [
      invitation.organization_id,
      invitation.invited_by,
      assignmentId,
      existingAssignment?.status === "active"
        ? "manager_assignment.reconfirmed"
        : "manager_assignment.activated",
      JSON.stringify({
        invitation_id: invitation.id,
        status: existingAssignment?.status ?? "pending_invitation",
      }),
      JSON.stringify(nextScope),
      "Activacion de gerente al aceptar invitacion segura.",
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
      values ($1, $2, $3, 'manager_assignments', $4, $5, $6, $7, $8::jsonb)
    `,
    [
      invitation.organization_id,
      invitation.invited_by,
      existingAssignment?.status === "active"
        ? "manager_assignment.reconfirmed"
        : "manager_assignment.activated",
      assignmentId,
      invitation.country_id,
      invitation.company_id,
      invitation.branch_id,
      JSON.stringify(nextScope),
    ],
  );
}

export async function acceptUserInvitation({
  email,
  password,
  token,
}: AcceptInvitationInput): Promise<AuthenticatedLocalUser> {
  const normalizedEmail = normalizeEmail(email);
  const passwordPolicyError = getPasswordPolicyError(password);

  if (passwordPolicyError) {
    throw new Error(passwordPolicyError);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    await client.query("begin");

    const invitationResult = await client.query<InvitationActivationRow>(
      `
        select
          ui.id,
          ui.organization_id,
          ui.email,
          ui.invited_role_id,
          ui.invited_by,
          ui.country_id,
          ui.company_id,
          ui.operational_area_id,
          ui.branch_id,
          ui.management_level,
          ui.base_bonus_amount,
          ui.metadata,
          r.key as role_key
        from public.user_invitations ui
        join public.roles r on r.id = ui.invited_role_id
        where lower(ui.email) = $1
          and ui.invitation_token_hash = $2
          and ui.status = 'pending'
          and ui.expires_at > now()
        for update
        limit 1
      `,
      [normalizedEmail, hashInvitationToken(token)],
    );
    const invitation = invitationResult.rows[0];

    if (!invitation) {
      throw new Error("La invitacion no existe, vencio o ya fue usada.");
    }

    const encryptedPassword = await hashPassword(password);
    const userResult = await client.query<{ email: string; id: string }>(
      `
        insert into auth.users (
          email,
          encrypted_password,
          email_confirmed_at
        )
        values ($1, $2, now())
        on conflict (email) do update
        set encrypted_password = excluded.encrypted_password,
            email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
            updated_at = now()
        returning id, email
      `,
      [normalizedEmail, encryptedPassword],
    );
    const user = userResult.rows[0];

    if (!user) {
      throw new Error("No se pudo activar el usuario.");
    }

    await client.query(
      `
        insert into public.profiles (
          id,
          organization_id,
          email,
          display_name,
          status,
          default_country_id,
          default_company_id,
          default_branch_id,
          invited_by
        )
        values ($1, $2, $3, $4, 'active', $5, $6, $7, $8)
        on conflict (id) do update
        set organization_id = excluded.organization_id,
            email = excluded.email,
            display_name = excluded.display_name,
            status = 'active',
            default_country_id = excluded.default_country_id,
            default_company_id = excluded.default_company_id,
            default_branch_id = excluded.default_branch_id,
            invited_by = coalesce(public.profiles.invited_by, excluded.invited_by),
            deactivated_at = null,
            deleted_at = null,
            updated_at = now()
      `,
      [
        user.id,
        invitation.organization_id,
        normalizedEmail,
        getDisplayName(invitation),
        invitation.country_id,
        invitation.company_id,
        invitation.branch_id,
        invitation.invited_by,
      ],
    );

    await ensureActiveUserRole(client, user.id, invitation);
    await grantScopedAccess(client, user.id, invitation);
    await activateManagerAssignment(client, user.id, invitation);
    await activateReportingLines(client, user.id, invitation);

    await client.query(
      `
        update public.user_invitations
        set status = 'accepted',
            accepted_at = now(),
            invitation_token_hash = null
        where id = $1
      `,
      [invitation.id],
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
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        invitation.organization_id,
        user.id,
        "user_invitation.accepted",
        "user_invitations",
        invitation.id,
        invitation.country_id,
        invitation.company_id,
        invitation.branch_id,
        JSON.stringify({
          accepted_email_domain: normalizedEmail.split("@")[1] ?? "unknown",
          role_key: invitation.role_key,
          source: "invitation-activation",
        }),
      ],
    );

    await client.query("commit");

    return {
      email: user.email,
      requiresPasswordChange: false,
      roleKey: coerceRoleKey(invitation.role_key),
      userId: user.id,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}

export async function createLocalUserWithTemporaryPassword({
  actorUserId,
  email,
  fullName,
  managedBranchManagerIds = [],
  managerIncentive,
  password,
  roleKey,
  scope,
}: CreateLocalUserWithTemporaryPasswordInput): Promise<AuthenticatedLocalUser> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedFullName = fullName.trim();
  const passwordPolicyError = getPasswordPolicyError(password);

  if (!normalizedFullName) {
    throw new LocalAuthRequestError("Completa nombre del usuario.");
  }

  if (passwordPolicyError) {
    throw new LocalAuthRequestError(passwordPolicyError);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    await client.query("begin");

    const existingProfileResult = await client.query<{ id: string }>(
      `
        select p.id
        from public.profiles p
        where lower(p.email) = $1
          and p.deleted_at is null
        limit 1
      `,
      [normalizedEmail],
    );

    if (existingProfileResult.rows[0]) {
      throw new LocalAuthRequestError(
        "Este correo ya esta registrado. Utiliza Recuperar acceso o resetea la contrasena del usuario existente.",
        409,
      );
    }

    const roleResult = await client.query<{ id: string }>(
      "select id from public.roles where key = $1 limit 1",
      [roleKey],
    );
    const roleId = roleResult.rows[0]?.id;

    if (!roleId) {
      throw new Error("No se encontro el rol seleccionado.");
    }

    const invitation = buildVirtualInvitation({
      actorUserId,
      email: normalizedEmail,
      fullName: normalizedFullName,
      managedBranchManagerIds,
      managerIncentive,
      password,
      roleId,
      roleKey,
      scope,
    });
    const encryptedPassword = await hashPassword(password);
    const userResult = await client.query<{ email: string; id: string }>(
      `
        insert into auth.users (
          email,
          encrypted_password,
          email_confirmed_at
        )
        values ($1, $2, now())
        on conflict (email) do update
        set encrypted_password = excluded.encrypted_password,
            email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
            updated_at = now()
        returning id, email
      `,
      [normalizedEmail, encryptedPassword],
    );
    const user = userResult.rows[0];

    if (!user) {
      throw new Error("No se pudo crear el usuario.");
    }

    await client.query(
      `
        insert into public.profiles (
          id,
          organization_id,
          email,
          display_name,
          status,
          default_country_id,
          default_company_id,
          default_branch_id,
          invited_by,
          requires_password_change
        )
        values ($1, $2, $3, $4, 'active', $5, $6, $7, $8, true)
        on conflict (id) do update
        set organization_id = excluded.organization_id,
            email = excluded.email,
            display_name = excluded.display_name,
            status = 'active',
            default_country_id = excluded.default_country_id,
            default_company_id = excluded.default_company_id,
            default_branch_id = excluded.default_branch_id,
            invited_by = coalesce(public.profiles.invited_by, excluded.invited_by),
            requires_password_change = true,
            deactivated_at = null,
            deleted_at = null,
            updated_at = now()
      `,
      [
        user.id,
        invitation.organization_id,
        normalizedEmail,
        normalizedFullName,
        invitation.country_id,
        invitation.company_id,
        invitation.branch_id,
        invitation.invited_by,
      ],
    );

    await ensureActiveUserRole(client, user.id, invitation);
    await grantScopedAccess(client, user.id, invitation);
    await activateManagerAssignment(client, user.id, invitation);
    await activateReportingLines(client, user.id, invitation);

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
        values ($1, $2, 'local_user.created_with_temporary_password', 'profiles', $3, $4, $5, $6, $7::jsonb)
      `,
      [
        invitation.organization_id,
        invitation.invited_by,
        user.id,
        invitation.country_id,
        invitation.company_id,
        invitation.branch_id,
        JSON.stringify({
          invited_email_domain: normalizedEmail.split("@")[1] ?? "unknown",
          requires_password_change: true,
          role_key: roleKey,
          source: "usuarios-permisos",
        }),
      ],
    );

    await client.query("commit");

    return {
      email: user.email,
      requiresPasswordChange: true,
      roleKey,
      userId: user.id,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}

export async function getLocalUserPasswordTargetByEmail(
  email: string,
): Promise<LocalUserPasswordTarget | null> {
  const normalizedEmail = normalizeEmail(email);
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    const result = await client.query<{
      branch_id: string | null;
      company_id: string | null;
      country_id: string | null;
      email: string;
      id: string;
      operational_area_id: string | null;
      organization_id: string;
      role_key: string | null;
    }>(
      `
        select
          p.id,
          p.email,
          coalesce(ur.organization_id, p.organization_id) as organization_id,
          coalesce(ur.country_id, p.default_country_id) as country_id,
          coalesce(ur.company_id, p.default_company_id) as company_id,
          coalesce(ur.operational_area_id, b.operational_area_id) as operational_area_id,
          coalesce(ur.branch_id, p.default_branch_id) as branch_id,
          r.key as role_key
        from public.profiles p
        join auth.users u on u.id = p.id
        left join public.user_roles ur
          on ur.user_id = p.id
          and coalesce(ur.status, 'active') = 'active'
          and ur.deactivated_at is null
        left join public.roles r on r.id = ur.role_id
        left join public.branches b
          on b.id = coalesce(ur.branch_id, p.default_branch_id)
        where lower(coalesce(p.email, u.email)) = $1
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null
        order by
          case r.key
            when 'super_admin' then 1
            when 'webmaster_admin' then 2
            when 'ceo' then 3
            when 'gerente_operaciones' then 4
            when 'gerente_area' then 5
            when 'gerente_sucursal' then 6
            when 'usuario_operativo' then 7
            else 8
          end
        limit 1
      `,
      [normalizedEmail],
    );
    const user = result.rows[0];

    if (!user) {
      return null;
    }

    return {
      email: user.email,
      roleKey: coerceRoleKey(user.role_key),
      scope: {
        branchId: user.branch_id,
        companyId: user.company_id,
        countryId: user.country_id,
        operationalAreaId: user.operational_area_id,
        organizationId: user.organization_id,
      },
      userId: user.id,
    };
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}

export async function resetLocalUserTemporaryPassword({
  actorUserId,
  email,
  password,
}: ResetLocalUserTemporaryPasswordInput): Promise<LocalUserPasswordTarget> {
  const normalizedEmail = normalizeEmail(email);
  const passwordPolicyError = getPasswordPolicyError(password);

  if (passwordPolicyError) {
    throw new Error(passwordPolicyError);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    await client.query("begin");

    const result = await client.query<{
      branch_id: string | null;
      company_id: string | null;
      country_id: string | null;
      email: string;
      id: string;
      operational_area_id: string | null;
      organization_id: string;
      role_key: string | null;
    }>(
      `
        select
          p.id,
          coalesce(p.email, u.email) as email,
          coalesce(ur.organization_id, p.organization_id) as organization_id,
          coalesce(ur.country_id, p.default_country_id) as country_id,
          coalesce(ur.company_id, p.default_company_id) as company_id,
          coalesce(ur.operational_area_id, b.operational_area_id) as operational_area_id,
          coalesce(ur.branch_id, p.default_branch_id) as branch_id,
          r.key as role_key
        from auth.users u
        join public.profiles p on p.id = u.id
        left join public.user_roles ur
          on ur.user_id = p.id
          and coalesce(ur.status, 'active') = 'active'
          and ur.deactivated_at is null
        left join public.roles r on r.id = ur.role_id
        left join public.branches b
          on b.id = coalesce(ur.branch_id, p.default_branch_id)
        where lower(coalesce(p.email, u.email)) = $1
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null
        order by
          case r.key
            when 'super_admin' then 1
            when 'webmaster_admin' then 2
            when 'ceo' then 3
            when 'gerente_operaciones' then 4
            when 'gerente_area' then 5
            when 'gerente_sucursal' then 6
            when 'usuario_operativo' then 7
            else 8
          end
        limit 1
        for update of u, p
      `,
      [normalizedEmail],
    );
    const user = result.rows[0];

    if (!user) {
      throw new Error("No encontre un usuario activo con ese correo.");
    }

    const encryptedPassword = await hashPassword(password);

    await client.query(
      `
        update auth.users
        set encrypted_password = $1,
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            updated_at = now()
        where id = $2
      `,
      [encryptedPassword, user.id],
    );

    await client.query(
      `
        update public.profiles
        set requires_password_change = true,
            updated_at = now()
        where id = $1
      `,
      [user.id],
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
        values ($1, $2, 'local_password.temporary_reset', 'profiles', $3, $4, $5, $6, $7::jsonb)
      `,
      [
        user.organization_id,
        nullableUuid(actorUserId),
        user.id,
        user.country_id,
        user.company_id,
        user.branch_id,
        JSON.stringify({
          email_domain: normalizedEmail.split("@")[1] ?? "unknown",
          requires_password_change: true,
          role_key: user.role_key,
          source: "usuarios-permisos",
        }),
      ],
    );

    await client.query("commit");

    return {
      email: user.email,
      roleKey: coerceRoleKey(user.role_key),
      scope: {
        branchId: user.branch_id,
        companyId: user.company_id,
        countryId: user.country_id,
        operationalAreaId: user.operational_area_id,
        organizationId: user.organization_id,
      },
      userId: user.id,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}

export async function authenticateLocalUser({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthenticatedLocalUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    const result = await client.query<LocalAuthUserRow>(
      `
        select
          u.id,
          u.email,
          u.encrypted_password,
          p.status as profile_status,
          coalesce(p.requires_password_change, false) as requires_password_change,
          r.key as role_key
        from auth.users u
        join public.profiles p on p.id = u.id
        left join public.user_roles ur
          on ur.user_id = p.id
          and coalesce(ur.status, 'active') = 'active'
          and ur.deactivated_at is null
        left join public.roles r on r.id = ur.role_id
        where lower(u.email) = $1
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null
        order by
          case r.key
            when 'super_admin' then 1
            when 'webmaster_admin' then 2
            when 'ceo' then 3
            when 'gerente_operaciones' then 4
            when 'gerente_area' then 5
            when 'gerente_sucursal' then 6
            when 'usuario_operativo' then 7
            else 8
          end
        limit 1
      `,
      [normalizedEmail],
    );
    const user = result.rows[0];

    if (
      !user?.encrypted_password ||
      user.profile_status !== "active" ||
      !(await verifyPassword(password, user.encrypted_password))
    ) {
      return null;
    }

    return {
      email: user.email,
      requiresPasswordChange: user.requires_password_change === true,
      roleKey: coerceRoleKey(user.role_key),
      userId: user.id,
    };
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}

export async function changeAuthenticatedLocalUserPassword({
  currentPassword,
  newPassword,
  userId,
}: ChangeAuthenticatedLocalUserPasswordInput): Promise<AuthenticatedLocalUser> {
  if (!currentPassword) {
    throw new Error("Ingresa la contrasena temporal o actual.");
  }

  if (currentPassword === newPassword) {
    throw new Error("La nueva contrasena debe ser diferente.");
  }

  const passwordPolicyError = getPasswordPolicyError(newPassword);

  if (passwordPolicyError) {
    throw new Error(passwordPolicyError);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    await client.query("begin");

    const result = await client.query<LocalPasswordChangeUserRow>(
      `
        select
          u.id,
          u.email,
          u.encrypted_password,
          p.status as profile_status,
          p.organization_id,
          p.default_country_id as country_id,
          p.default_company_id as company_id,
          p.default_branch_id as branch_id
        from auth.users u
        join public.profiles p on p.id = u.id
        where u.id = $1
          and p.deactivated_at is null
          and p.deleted_at is null
        for update
        limit 1
      `,
      [userId],
    );
    const user = result.rows[0];

    if (
      !user?.encrypted_password ||
      user.profile_status !== "active" ||
      !(await verifyPassword(currentPassword, user.encrypted_password))
    ) {
      throw new Error("La contrasena actual no es correcta.");
    }

    const encryptedPassword = await hashPassword(newPassword);

    await client.query(
      `
        update auth.users
        set encrypted_password = $1,
            updated_at = now()
        where id = $2
      `,
      [encryptedPassword, user.id],
    );

    await client.query(
      `
        update public.profiles
        set requires_password_change = false,
            updated_at = now()
        where id = $1
      `,
      [user.id],
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
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        user.organization_id,
        user.id,
        "local_password.changed",
        "profiles",
        user.id,
        user.country_id,
        user.company_id,
        user.branch_id,
        JSON.stringify({ source: "required-local-password-change" }),
      ],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }

  const updatedUser = await getAuthenticatedLocalUserAccess(userId);

  if (!updatedUser) {
    throw new Error("No se pudo cargar la sesion actualizada.");
  }

  return updatedUser;
}

function buildCurrentUserScope(row: LocalUserScopeRow): CurrentUserScope {
  return {
    branchCity: row.branch_city,
    branchCode: row.branch_code,
    branchId: row.branch_id,
    branchName: row.branch_name,
    companyId: row.company_id,
    companyName: row.company_name,
    countryId: row.country_id,
    countryName: row.country_name,
    operationalAreaId: row.operational_area_id,
    operationalAreaName: row.operational_area_name,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
  };
}

export async function getAuthenticatedLocalUserAccess(userId: string) {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);
    const result = await client.query<LocalUserScopeRow>(
      `
        select
          u.id,
          u.email,
          r.key as role_key,
          coalesce(p.requires_password_change, false) as requires_password_change,
          coalesce(ur.organization_id, p.organization_id) as organization_id,
          o.name as organization_name,
          coalesce(ur.country_id, p.default_country_id, b.country_id) as country_id,
          c.name as country_name,
          coalesce(ur.company_id, p.default_company_id, b.company_id) as company_id,
          co.name as company_name,
          coalesce(ur.operational_area_id, b.operational_area_id) as operational_area_id,
          oa.name as operational_area_name,
          coalesce(ur.branch_id, p.default_branch_id) as branch_id,
          b.name as branch_name,
          b.code as branch_code,
          b.city as branch_city
        from auth.users u
        join public.profiles p on p.id = u.id
        left join public.user_roles ur
          on ur.user_id = p.id
          and coalesce(ur.status, 'active') = 'active'
          and ur.deactivated_at is null
        left join public.roles r on r.id = ur.role_id
        left join public.branches b
          on b.id = coalesce(ur.branch_id, p.default_branch_id)
        left join public.organizations o
          on o.id = coalesce(ur.organization_id, p.organization_id)
        left join public.countries c
          on c.id = coalesce(ur.country_id, p.default_country_id, b.country_id)
        left join public.companies co
          on co.id = coalesce(ur.company_id, p.default_company_id, b.company_id)
        left join public.operational_areas oa
          on oa.id = coalesce(ur.operational_area_id, b.operational_area_id)
        where u.id = $1
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null
        order by
          case r.key
            when 'super_admin' then 1
            when 'webmaster_admin' then 2
            when 'ceo' then 3
            when 'gerente_operaciones' then 4
            when 'gerente_area' then 5
            when 'gerente_sucursal' then 6
            when 'usuario_operativo' then 7
            else 8
          end
        limit 1
      `,
      [userId],
    );
    const user = result.rows[0];

    if (!user) {
      return null;
    }

    return {
      email: user.email,
      requiresPasswordChange: user.requires_password_change === true,
      roleKey: coerceRoleKey(user.role_key),
      scope: buildCurrentUserScope(user),
      userId: user.id,
    } satisfies AuthenticatedLocalUser;
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}
