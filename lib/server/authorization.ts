import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import {
  demoAdminCookieName,
  demoBusinessLineCookieName,
  demoRoleCookieName,
  getDemoAdminEmail,
  getDemoBusinessLineFromCookie,
  getDemoRoleFromCookie,
  hasDemoAdminCookie,
  isDemoRoleSwitchEnabled,
} from "@/lib/auth/demo-admin";
import { getDemoScopeForRole } from "@/lib/auth/demo-scope";
import { getSupabaseDirectoryUserAccess } from "@/lib/server/supabase-user-access";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUserScope } from "@/lib/tenant/current-user-access";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";
import { hasEnvVars } from "@/lib/utils";
import {
  canAccessProtectedPath,
  getForbiddenRedirectPath,
  type AuthorizationActor,
} from "@/lib/security/authorization-policy";

type CookieSource = {
  get(name: string): { value: string } | undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function coerceRoleKey(value: unknown): RoleKey | null {
  return roleKeys.includes(value as RoleKey) ? (value as RoleKey) : null;
}

function readClaimString(claims: Record<string, unknown>, key: string) {
  const directValue = readString(claims[key]);

  if (directValue) {
    return directValue;
  }

  const appMetadata = claims.app_metadata;

  if (isRecord(appMetadata)) {
    return readString(appMetadata[key]);
  }

  return null;
}

function readRoleKeyFromClaims(claims: Record<string, unknown>) {
  return (
    coerceRoleKey(readClaimString(claims, "roleKey")) ??
    coerceRoleKey(readClaimString(claims, "role_key")) ??
    coerceRoleKey(readClaimString(claims, "role")) ??
    "viewer"
  );
}

function readScopeFromClaims(claims: Record<string, unknown>): ScopeBoundary {
  return {
    branchId: readClaimString(claims, "branch_id"),
    companyId: readClaimString(claims, "company_id"),
    countryId: readClaimString(claims, "country_id"),
    operationalAreaId: readClaimString(claims, "operational_area_id"),
    organizationId:
      readClaimString(claims, "organization_id") ?? "__unscoped_supabase__",
  };
}

function toScopeBoundary(scope: CurrentUserScope): ScopeBoundary | null {
  if (!scope.organizationId) {
    return null;
  }

  return {
    branchId: scope.branchId,
    branchName: scope.branchName,
    companyId: scope.companyId,
    companyName: scope.companyName,
    countryId: scope.countryId,
    countryName: scope.countryName,
    operationalAreaId: scope.operationalAreaId,
    operationalAreaName: scope.operationalAreaName,
    organizationId: scope.organizationId,
  };
}

async function getCookieSource(cookieSource?: CookieSource) {
  return cookieSource ?? (await cookies());
}

function readDemoAuthorizationActor(
  cookieSource: CookieSource,
): AuthorizationActor | null {
  if (
    !hasDemoAdminCookie(cookieSource.get(demoAdminCookieName)?.value)
  ) {
    return null;
  }

  const roleKey =
    getDemoRoleFromCookie(cookieSource.get(demoRoleCookieName)?.value) ??
    "super_admin";
  const businessLineCode =
    getDemoBusinessLineFromCookie(
      cookieSource.get(demoBusinessLineCookieName)?.value,
    ) ?? "PHYSIOTHERAPY";

  return {
    allowDemoRoleSwitch: isDemoRoleSwitchEnabled(),
    email: getDemoAdminEmail(),
    roleKey,
    scope: getDemoScopeForRole(roleKey, businessLineCode),
    source: "demo",
    userId: "demo-admin",
  };
}

async function readSupabaseAuthorizationActor(): Promise<AuthorizationActor | null> {
  if (!hasEnvVars) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims().catch(() => ({
    data: null,
    error: new Error("Supabase claims unavailable"),
  }));
  const claims = data?.claims;

  if (error || !isRecord(claims)) {
    return null;
  }

  const userId = readString(claims.sub);

  if (!userId) {
    return null;
  }

  // Resolve roles and organizational scope from the existing Supabase
  // directory. Authorization never depends on a second PostgreSQL connection.
  const directoryUser = await getSupabaseDirectoryUserAccess(
    userId,
    readString(claims.email) ?? "supabase-user",
  ).catch(() => null);
  const directoryScope = directoryUser?.scope
    ? toScopeBoundary(directoryUser.scope)
    : null;

  if (directoryUser && directoryScope) {
    return {
      allowDemoRoleSwitch: false,
      email: directoryUser.email,
      requiresPasswordChange: directoryUser.requiresPasswordChange,
      roleKey: directoryUser.roleKey,
      scope: directoryScope,
      source: "supabase",
      userId,
    };
  }

  // Compatibility fallback for environments that only have Supabase Auth
  // configured. Scoped server data always takes precedence when available.
  return {
    allowDemoRoleSwitch: false,
    email: readString(claims.email) ?? "supabase-user",
    roleKey: readRoleKeyFromClaims(claims),
    scope: readScopeFromClaims(claims),
    source: "supabase",
    userId,
  };
}

async function getCurrentAuthorizationActorUncached(
  cookieSource?: CookieSource,
) {
  const resolvedCookieSource = await getCookieSource(cookieSource);
  const demoActor = readDemoAuthorizationActor(resolvedCookieSource);

  if (demoActor) {
    return demoActor;
  }

  return readSupabaseAuthorizationActor();
}

/**
 * React's server cache is scoped to the current render/request. It dedupes
 * repeated layout, page, and server-component reads without retaining a
 * session or authorization decision beyond that request.
 */
export const getCurrentAuthorizationActor = cache(getCurrentAuthorizationActorUncached);

export async function requireProtectedAccess() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    redirect("/auth/login");
  }

  if (actor.source === "local" && actor.requiresPasswordChange) {
    redirect("/auth/update-password");
  }

  return actor;
}

export async function requireProtectedPath(pathname: string) {
  const actor = await requireProtectedAccess();

  if (!canAccessProtectedPath(actor, pathname)) {
    redirect(getForbiddenRedirectPath(pathname));
  }

  return actor;
}
