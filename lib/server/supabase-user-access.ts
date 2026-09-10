import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CurrentUserScope } from "@/lib/tenant/current-user-access";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

type RelatedRow<T> = T | T[] | null;

type NamedRow = {
  id: string;
  name: string | null;
};

type RoleRow = {
  id: string;
  key: string;
};

type BranchRow = {
  city: string | null;
  code: string | null;
  company?: RelatedRow<NamedRow>;
  company_id: string | null;
  country?: RelatedRow<NamedRow>;
  country_id: string | null;
  id: string;
  name: string | null;
  operational_area?: RelatedRow<NamedRow>;
  operational_area_id?: string | null;
};

type ProfileRow = {
  default_branch?: RelatedRow<BranchRow>;
  default_branch_id: string | null;
  default_company?: RelatedRow<NamedRow>;
  default_company_id: string | null;
  default_country?: RelatedRow<NamedRow>;
  default_country_id: string | null;
  email: string | null;
  id: string;
  organization?: RelatedRow<NamedRow>;
  organization_id: string | null;
  status: string | null;
};

type UserRoleRow = {
  branch?: RelatedRow<BranchRow>;
  branch_id: string | null;
  company?: RelatedRow<NamedRow>;
  company_id: string | null;
  country?: RelatedRow<NamedRow>;
  country_id: string | null;
  operational_area?: RelatedRow<NamedRow>;
  operational_area_id?: string | null;
  organization_id: string | null;
  role?: RelatedRow<RoleRow>;
  role_id: string;
  status?: string | null;
};

export type SupabaseDirectoryUserAccess = {
  email: string;
  requiresPasswordChange: boolean;
  roleId: string | null;
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

function relatedRow<T>(value: RelatedRow<T> | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function relatedName(value: RelatedRow<NamedRow> | undefined, id: string | null) {
  const related = relatedRow(value);
  return related?.id === id ? related.name : null;
}

function pickRole(assignments: UserRoleRow[], rolesById: Map<string, RoleKey>) {
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
        rolePriority.indexOf(left.roleKey) -
        rolePriority.indexOf(right.roleKey),
    );

  return ranked[0] ?? null;
}

async function readUserRoles(userId: string) {
  const admin = getSupabaseAdminClient();

  if (!admin) return [] as UserRoleRow[];

  const extended = await admin
    .from("user_roles")
    .select(
      "role_id, organization_id, country_id, company_id, branch_id, operational_area_id, status, role:roles(id,key), country:countries(id,name), company:companies(id,name), operational_area:operational_areas(id,name), branch:branches(id,name,code,city,country_id,company_id,operational_area_id,country:countries(id,name),company:companies(id,name),operational_area:operational_areas(id,name))",
    )
    .eq("user_id", userId);

  if (!extended.error) {
    // The generated Database type predates these verified PostgREST embedded
    // relationships, so narrow the runtime response through unknown.
    return (extended.data ?? []) as unknown as UserRoleRow[];
  }

  const core = await admin
    .from("user_roles")
    .select("role_id, organization_id, country_id, company_id, branch_id")
    .eq("user_id", userId);

  return core.error ? [] : ((core.data ?? []) as UserRoleRow[]);
}

async function readProfile(userId: string) {
  const admin = getSupabaseAdminClient();

  if (!admin) return null;

  const extended = await admin
    .from("profiles")
    .select(
      "id,email,status,organization_id,default_country_id,default_company_id,default_branch_id,organization:organizations!profiles_organization_id_fkey(id,name),default_country:countries!profiles_default_country_id_fkey(id,name),default_company:companies!profiles_default_company_id_fkey(id,name),default_branch:branches!profiles_default_branch_id_fkey(id,name,code,city,country_id,company_id,operational_area_id,country:countries(id,name),company:companies(id,name),operational_area:operational_areas(id,name))",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!extended.error) {
    return extended.data as ProfileRow | null;
  }

  const core = await admin
    .from("profiles")
    .select(
      "id,email,status,organization_id,default_country_id,default_company_id,default_branch_id",
    )
    .eq("id", userId)
    .maybeSingle();

  return core.error ? null : (core.data as ProfileRow | null);
}

async function readBranch(branchId: string | null) {
  const admin = getSupabaseAdminClient();

  if (!admin || !branchId) return null;

  const extended = await admin
    .from("branches")
    .select(
      "id,name,code,city,country_id,company_id,operational_area_id,country:countries(id,name),company:companies(id,name),operational_area:operational_areas(id,name)",
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

  const [profile, assignments] = await Promise.all([
    readProfile(userId),
    readUserRoles(userId),
  ]);

  if (!profile) {
    return null;
  }

  if (profile.status === "suspended") {
    return null;
  }

  const rolesById = new Map(
    assignments.flatMap((assignment) => {
      const role = relatedRow(assignment.role);
      return role ? [[role.id, coerceRoleKey(role.key)] as const] : [];
    }),
  );
  if (assignments.some((assignment) => !rolesById.has(assignment.role_id))) {
    // Compatibility for older schemas where embedded relationships are not
    // exposed. Current production resolves roles in the joined request above.
    const rolesResult = await admin.from("roles").select("id,key");
    for (const role of (rolesResult.data ?? []) as RoleRow[]) {
      rolesById.set(role.id, coerceRoleKey(role.key));
    }
  }
  const selected = pickRole(assignments, rolesById);
  const assignment = selected?.assignment ?? null;
  const roleKey = selected?.roleKey ?? "viewer";

  const branchId = assignment?.branch_id ?? profile.default_branch_id ?? null;
  const assignedBranch = relatedRow(assignment?.branch);
  const defaultBranch = relatedRow(profile.default_branch);
  const branch =
    (assignedBranch?.id === branchId ? assignedBranch : null) ??
    (defaultBranch?.id === branchId ? defaultBranch : null) ??
    (await readBranch(branchId));
  const organizationId =
    assignment?.organization_id ?? profile.organization_id ?? null;
  const countryId =
    assignment?.country_id ??
    profile.default_country_id ??
    branch?.country_id ??
    null;
  const companyId =
    assignment?.company_id ??
    profile.default_company_id ??
    branch?.company_id ??
    null;
  const operationalAreaId =
    assignment?.operational_area_id ?? branch?.operational_area_id ?? null;

  const embeddedOrganizationName = relatedName(
    profile.organization,
    organizationId,
  );
  const embeddedCountryName =
    relatedName(assignment?.country, countryId) ??
    relatedName(profile.default_country, countryId) ??
    relatedName(branch?.country, countryId);
  const embeddedCompanyName =
    relatedName(assignment?.company, companyId) ??
    relatedName(profile.default_company, companyId) ??
    relatedName(branch?.company, companyId);
  const embeddedOperationalAreaName =
    relatedName(assignment?.operational_area, operationalAreaId) ??
    relatedName(branch?.operational_area, operationalAreaId);
  const [organizationName, countryName, companyName, operationalAreaName] =
    await Promise.all([
      embeddedOrganizationName ?? readName("organizations", organizationId),
      embeddedCountryName ?? readName("countries", countryId),
      embeddedCompanyName ?? readName("companies", companyId),
      embeddedOperationalAreaName ??
        readName("operational_areas", operationalAreaId),
    ]);

  return {
    email: profile.email?.trim() || emailFallback,
    requiresPasswordChange: false,
    // The role was read from the server-side assignment in this request.
    // Passing only its opaque ID downstream avoids an otherwise redundant
    // roles catalog request; every request still resolves the assignment, so
    // deactivation and role changes take effect immediately.
    roleId: assignment?.role_id ?? null,
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
