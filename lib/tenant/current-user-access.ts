import type { RoleKey } from "@/lib/tenant/demo-context";

export type CurrentUserScope = {
  branchCity: string | null;
  branchCode: string | null;
  branchId: string | null;
  branchName: string | null;
  companyId: string | null;
  companyName: string | null;
  countryId: string | null;
  countryName: string | null;
  operationalAreaId: string | null;
  operationalAreaName: string | null;
  organizationId: string | null;
  organizationName: string | null;
};

export type CurrentUserAccess = {
  email: string;
  requiresPasswordChange?: boolean;
  roleKey: RoleKey;
  scope: CurrentUserScope;
  userId: string;
};

type CurrentUserAccessResponse = {
  ok?: boolean;
  user?: CurrentUserAccess;
};

export function isBranchManagerScopedAccess(
  access: CurrentUserAccess | null,
): access is CurrentUserAccess & {
  roleKey: "gerente_sucursal";
  scope: CurrentUserScope & { branchName: string };
} {
  return (
    access?.roleKey === "gerente_sucursal" &&
    typeof access.scope.branchName === "string" &&
    access.scope.branchName.trim().length > 0
  );
}

export async function fetchCurrentUserAccess() {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | CurrentUserAccessResponse
    | null;

  return payload?.ok === true && payload.user ? payload.user : null;
}
