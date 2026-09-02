import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
import { readLocalSession } from "@/lib/auth/local-session";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { getAuthenticatedLocalUserAccess } from "@/lib/server/local-auth";
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

async function readLocalAuthorizationActor(
  cookieSource: CookieSource,
): Promise<AuthorizationActor | null> {
  const localSession = (() => {
    try {
      return readLocalSession(cookieSource);
    } catch {
      return null;
    }
  })();

  if (!localSession) {
    return null;
  }

  if (getMissingDatabaseConfig().length > 0) {
    return null;
  }

  const user = await getAuthenticatedLocalUserAccess(localSession.userId).catch(
    () => null,
  );
  const scope = user?.scope ? toScopeBoundary(user.scope) : null;

  if (!user || !scope) {
    return null;
  }

  return {
    allowDemoRoleSwitch: false,
    email: user.email,
    requiresPasswordChange: user.requiresPasswordChange,
    roleKey: user.roleKey,
    scope,
    source: "local",
    userId: user.userId,
  };
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

  // Production bridge: the previous Analiza backend stores the real role and
  // organizational scope in PostgreSQL tables. When the same Supabase database
  // is configured through DATABASE_URL/POSTGRES_URL, prefer that authoritative
  // scope instead of relying on optional JWT metadata. This preserves the
  // existing production users, branches and permissions without re-importing
  // them into a second authentication system.
  if (getMissingDatabaseConfig().length === 0) {
    const databaseUser = await getAuthenticatedLocalUserAccess(userId).catch(
      () => null,
    );
    const databaseScope = databaseUser?.scope
      ? toScopeBoundary(databaseUser.scope)
      : null;

    if (databaseUser && databaseScope) {
      return {
        allowDemoRoleSwitch: false,
        email: databaseUser.email,
        requiresPasswordChange: databaseUser.requiresPasswordChange,
        roleKey: databaseUser.roleKey,
        scope: databaseScope,
        source: "supabase",
        userId,
      };
    }
  }

  // The previous production backend already contains the user directory in
  // Supabase. If direct PostgreSQL is not configured yet, resolve role and
  // scope with the server-only service-role client instead of downgrading every
  // existing user to viewer.
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
  // configured. This keeps login operational while DATABASE_URL is being wired.
  return {
    allowDemoRoleSwitch: false,
    email: readString(claims.email) ?? "supabase-user",
    roleKey: readRoleKeyFromClaims(claims),
    scope: readScopeFromClaims(claims),
    source: "supabase",
    userId,
  };
}

export async function getCurrentAuthorizationActor(
  cookieSource?: CookieSource,
) {
  const resolvedCookieSource = await getCookieSource(cookieSource);
  const localActor = await readLocalAuthorizationActor(resolvedCookieSource);

  if (localActor) {
    return localActor;
  }

  const demoActor = readDemoAuthorizationActor(resolvedCookieSource);

  if (demoActor) {
    return demoActor;
  }

  return readSupabaseAuthorizationActor();
}

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
