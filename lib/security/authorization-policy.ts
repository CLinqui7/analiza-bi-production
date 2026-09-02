import { navigationItems } from "../navigation.ts";
import type { RoleKey } from "../tenant/demo-context";
import {
  canAccessRecord,
  canAssignBranchToArea,
  canCreateBranch,
  canCreateOperationalArea,
  canInviteUser,
  isSuperAdministrator,
  type DelegationActor,
  type ScopeBoundary,
} from "../tenant/delegation-policy.ts";

export type AuthorizationActorSource = "demo" | "local" | "supabase";

export type AuthorizationActor = {
  allowDemoRoleSwitch: boolean;
  canInviteOperationalUsers?: boolean;
  email: string;
  requiresPasswordChange?: boolean;
  roleKey: RoleKey;
  scope: ScopeBoundary;
  source: AuthorizationActorSource;
  userId: string;
};

export type AuthorizationAction =
  | "bonuses.adjust"
  | "bonuses.approve"
  | "bonuses.reject"
  | "branches.assign_area"
  | "branches.create"
  | "connectors.manage"
  | "connectors.run"
  | "imports.publish"
  | "imports.rollback"
  | "imports.upload"
  | "operational_areas.create"
  | "record.read"
  | "route.access"
  | "users.activate"
  | "users.change_role"
  | "users.change_scope"
  | "users.deactivate"
  | "users.invite";

export type AuthorizationTarget = {
  areaScope?: ScopeBoundary;
  branchScope?: ScopeBoundary;
  pathname?: string;
  roleKey?: RoleKey;
  scope?: ScopeBoundary;
  targetUserId?: string;
};

const protectedBasePaths = new Set(["/protected", "/protected/context"]);
const importMutationRoles: RoleKey[] = [
  "super_admin",
  "webmaster_admin",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
];
const connectorMutationRoles: RoleKey[] = [
  "super_admin",
  "webmaster_admin",
];
const routeAccessAliases = new Map<string, string>([
  ["/protected/cierres/nuevo", "/protected/importaciones"],
]);

function normalizePathname(pathname: string) {
  const [pathOnly = "/"] = pathname.split("?");
  const trimmedPath = pathOnly.replace(/\/+$/, "");

  return trimmedPath || "/";
}

function toDelegationActor(actor: AuthorizationActor): DelegationActor {
  return {
    canInviteOperationalUsers:
      actor.canInviteOperationalUsers ?? actor.roleKey === "gerente_sucursal",
    roleKey: actor.roleKey,
    scope: actor.scope,
    userId: actor.userId,
  };
}

export function findNavigationItemForPath(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  return navigationItems.find(
    (item) =>
      normalizedPathname === item.href ||
      normalizedPathname.startsWith(`${item.href}/`),
  );
}

export function canAccessProtectedPath(
  actor: AuthorizationActor,
  pathname: string,
) {
  const normalizedPathname = normalizePathname(pathname);
  const accessPathname =
    routeAccessAliases.get(normalizedPathname) ?? normalizedPathname;

  if (protectedBasePaths.has(accessPathname)) {
    return true;
  }

  if (
    normalizedPathname === "/protected/cierres/nuevo" &&
    actor.roleKey === "gerente_area"
  ) {
    return false;
  }

  if (isSuperAdministrator(actor.roleKey)) {
    return accessPathname.startsWith("/protected");
  }

  const navigationItem = findNavigationItemForPath(accessPathname);

  if (!navigationItem) {
    return false;
  }

  return navigationItem.allowedRoles.includes(actor.roleKey);
}

export function canPerformAction(
  actor: AuthorizationActor,
  action: AuthorizationAction,
  target: AuthorizationTarget = {},
) {
  if (action === "route.access") {
    return target.pathname
      ? canAccessProtectedPath(actor, target.pathname)
      : false;
  }

  if (action === "record.read") {
    return target.scope
      ? canAccessRecord(toDelegationActor(actor), target.scope)
      : false;
  }

  if (
    action === "imports.upload" ||
    action === "imports.publish" ||
    action === "imports.rollback"
  ) {
    return Boolean(
      target.scope &&
        importMutationRoles.includes(actor.roleKey) &&
        canAccessRecord(toDelegationActor(actor), target.scope),
    );
  }

  if (action === "connectors.manage" || action === "connectors.run") {
    return Boolean(
      target.scope &&
        connectorMutationRoles.includes(actor.roleKey) &&
        canAccessRecord(toDelegationActor(actor), target.scope),
    );
  }

  if (
    action === "bonuses.approve" ||
    action === "bonuses.reject" ||
    action === "bonuses.adjust"
  ) {
    if (
      !target.scope ||
      !target.roleKey ||
      !canAccessRecord(toDelegationActor(actor), target.scope)
    ) {
      return false;
    }

    if (target.targetUserId && target.targetUserId === actor.userId) {
      return false;
    }

    if (isSuperAdministrator(actor.roleKey)) {
      return true;
    }

    if (actor.roleKey === "gerente_operaciones") {
      return target.roleKey === "gerente_area" || target.roleKey === "gerente_sucursal";
    }

    if (actor.roleKey === "gerente_area") {
      return target.roleKey === "gerente_sucursal";
    }

    return false;
  }

  if (action === "users.invite") {
    return Boolean(
      target.roleKey &&
        target.scope &&
        canInviteUser(toDelegationActor(actor), {
          roleKey: target.roleKey,
          scope: target.scope,
        }),
    );
  }

  if (
    action === "users.change_role" ||
    action === "users.change_scope" ||
    action === "users.activate" ||
    action === "users.deactivate"
  ) {
    return Boolean(
      target.roleKey &&
        target.scope &&
        canInviteUser(toDelegationActor(actor), {
          roleKey: target.roleKey,
          scope: target.scope,
        }),
    );
  }

  if (action === "branches.create") {
    return target.scope
      ? canCreateBranch(toDelegationActor(actor), target.scope)
      : false;
  }

  if (action === "operational_areas.create") {
    return target.scope
      ? canCreateOperationalArea(toDelegationActor(actor), target.scope)
      : false;
  }

  if (action === "branches.assign_area") {
    return Boolean(
      target.branchScope &&
        target.areaScope &&
        canAssignBranchToArea(
          toDelegationActor(actor),
          target.branchScope,
          target.areaScope,
        ),
    );
  }

  return false;
}

export function getForbiddenRedirectPath(pathname: string) {
  return `/forbidden?from=${encodeURIComponent(normalizePathname(pathname))}`;
}
