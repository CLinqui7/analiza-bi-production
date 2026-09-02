import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CurrentUserScope } from "@/lib/tenant/current-user-access";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

type ProfileRow = {
  default_branch_id: string | null;
  default_company_id: string | null;
  default_country_id: string | null;
  email: string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
};

type UserRoleRow = {
  branch_id: string | null;
  company_id: string | null;
  country_id: string | null;
  operational_area_id?: string | null;
  organization_id: string | null;
  role_id: string;
  status?: string | null;
};

type RoleRow = {
  id: string;
  key: string;
};

type BranchRow = {
  city: string | null;
  code: string | null;
  company_id: string | null;
  country_id: string | null;
  id: string;
  name: string | null;
  operational_area_id?: string | null;
};

type NamedRow = {
  id: string;
  name: string | null;
};

export type SupabaseDirectoryUserAccess = {
  email: string;
  requiresPasswordChange: boolean;
  roleKey: RoleKey;
  scope: CurrentUserScope;
  userId: string;
};

const rolePriority: RoleKey[] = [
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
  "viewer",
];

function coerceRoleKey(value: string | null | undefined): RoleKey {
  return roleKeys.includes(value as RoleKey) ? (value as RoleKey) : "viewer";
}

function pickRole(
  assignments: UserRoleRow[],
  rolesById: Map<string, RoleKey>,
) {
  const activeAssignments = assignments.filter(
    (assignment) => !assignment.status || assignment.status === "active",
  );
  const ranked = activeAssignments
    .map((assignment) => ({
      assignment,
      roleKey: rolesById.get(assignment.role_id) ?? "viewer",
    }))
    .sort(
      (left, right) =>
        rolePriority.indexOf(left.roleKey) - rolePriority.indexOf(right.roleKey),
    );

  return ranked[0] ?? null;
}

async function readUserRoles(userId: string) {
  const admin = getSupabaseAdminClient();

  if (!admin) return [] as UserRoleRow[];

  const extended = await admin
    .from("user_roles")
    .select(
      "role_id, organization_id, country_id, company_id, branch_id, operational_area_id, status",
    )
    .eq("user_id", userId);

  if (!extended.error) {
    return (extended.data ?? []) as UserRoleRow[];
  }

  const core = await admin
    .from("user_roles")
    .select("role_id, organization_id, country_id, company_id, branch_id")
    .eq("user_id", userId);

  return core.error ? [] : ((core.data ?? []) as UserRoleRow[]);
}

async function readBranch(branchId: string | null) {
  const admin = getSupabaseAdminClient();

  if (!admin || !branchId) return null;

  const extended = await admin
    .from("branches")
    .select(
      "id, name, code, city, country_id, company_id, operational_area_id",
    )
    .eq("id", branchId)
    .maybeSingle();

  if (!extended.error) {
    return extended.data as BranchRow | null;
  }

  const core = await admin
    .from("branches")
    .select("id, name, code, city, country_id, company_id")
    .eq("id", branchId)
    .maybeSingle();

  return core.error ? null : (core.data as BranchRow | null);
}

async function readName(table: string, id: string | null) {
  const admin = getSupabaseAdminClient();

  if (!admin || !id) return null;

  const result = await admin
    .from(table)
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (result.error) return null;

  return (result.data as NamedRow | null)?.name ?? null;
}

export async function getSupabaseDirectoryUserAccess(
  userId: string,
  emailFallback = "supabase-user",
): Promise<SupabaseDirectoryUserAccess | null> {
  const admin = getSupabaseAdminClient();

  if (!admin) return null;

  const profileResult = await admin
    .from("profiles")
    .select(
      "id, email, status, organization_id, default_country_id, default_company_id, default_branch_id",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  const profile = profileResult.data as ProfileRow;

  if (profile.status === "suspended") {
    return null;
  }

  const assignments = await readUserRoles(userId);
  const roleIds = Array.from(new Set(assignments.map((item) => item.role_id)));
  const rolesResult = roleIds.length
    ? await admin.from("roles").select("id, key").in("id", roleIds)
    : { data: [] as RoleRow[], error: null };
  const rolesById = new Map<string, RoleKey>(
    ((rolesResult.data ?? []) as RoleRow[]).map((role) => [
      role.id,
      coerceRoleKey(role.key),
    ]),
  );
  const selected = pickRole(assignments, rolesById);
  const assignment = selected?.assignment ?? null;
  const roleKey = selected?.roleKey ?? "viewer";

  const branchId = assignment?.branch_id ?? profile.default_branch_id ?? null;
  const branch = await readBranch(branchId);
  const organizationId = assignment?.organization_id ?? profile.organization_id ?? null;
  const countryId =
    assignment?.country_id ?? profile.default_country_id ?? branch?.country_id ?? null;
  const companyId =
    assignment?.company_id ?? profile.default_company_id ?? branch?.company_id ?? null;
  const operationalAreaId =
    assignment?.operational_area_id ?? branch?.operational_area_id ?? null;

  const [organizationName, countryName, companyName, operationalAreaName] =
    await Promise.all([
      readName("organizations", organizationId),
      readName("countries", countryId),
      readName("companies", companyId),
      readName("operational_areas", operationalAreaId),
    ]);

  return {
    email: profile.email?.trim() || emailFallback,
    requiresPasswordChange: false,
    roleKey,
    scope: {
      branchCity: branch?.city ?? null,
      branchCode: branch?.code ?? null,
      branchId,
      branchName: branch?.name ?? null,
      companyId,
      companyName,
      countryId,
      countryName,
      operationalAreaId,
      operationalAreaName,
      organizationId,
      organizationName,
    },
    userId,
  };
}
