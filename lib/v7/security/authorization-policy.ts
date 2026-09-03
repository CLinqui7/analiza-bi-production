import { canCreateRole } from "@/lib/tenant/delegation-policy";
import type { ActionKey, Actor, RoleKey, ScopeBoundary } from "@/lib/v7/security/types";

const hierarchy: Record<RoleKey, number> = {
  super_admin: 100,
  webmaster_admin: 100,
  ceo: 90,
  gerente_operaciones: 80,
  gerente_area: 60,
  gerente_sucursal: 40,
  usuario_operativo: 20,
  viewer: 10,
};

const actionRoles: Record<ActionKey, RoleKey[]> = {
  "dashboard.read": [
    "super_admin",
    "webmaster_admin",
    "ceo",
    "gerente_operaciones",
    "gerente_area",
    "gerente_sucursal",
    "usuario_operativo",
    "viewer",
  ],
  "finance.read": ["super_admin", "webmaster_admin", "ceo", "gerente_operaciones", "gerente_area"],
  "operation.read": ["super_admin", "webmaster_admin", "ceo", "gerente_operaciones", "gerente_area", "gerente_sucursal", "viewer"],
  "monthly_submission.read": ["super_admin", "webmaster_admin", "ceo", "gerente_operaciones", "gerente_area", "gerente_sucursal", "usuario_operativo", "viewer"],
  "monthly_submission.write": ["gerente_sucursal"],
  "monthly_submission.publish": ["gerente_sucursal"],
  "imports.read": ["super_admin", "webmaster_admin"],
  "imports.write": ["super_admin", "webmaster_admin"],
  "connectors.read": ["super_admin", "webmaster_admin"],
  "connectors.manage": ["super_admin", "webmaster_admin"],
  "goals.read": ["super_admin", "webmaster_admin", "ceo", "gerente_operaciones", "gerente_area", "gerente_sucursal", "viewer"],
  "goals.manage": ["super_admin", "webmaster_admin", "ceo", "gerente_operaciones"],
  "users.read": ["super_admin", "webmaster_admin", "ceo", "gerente_operaciones", "gerente_area"],
  "users.invite": ["super_admin", "webmaster_admin", "ceo", "gerente_operaciones", "gerente_area"],
  "roles.read": ["super_admin", "webmaster_admin", "ceo"],
  "audit.read": ["super_admin", "webmaster_admin"],
  "exports.create": ["super_admin", "webmaster_admin", "ceo", "gerente_operaciones", "gerente_area", "gerente_sucursal", "viewer"],
  "structure.manage": ["super_admin", "webmaster_admin", "gerente_operaciones"],
  "assignments.manage": ["super_admin", "webmaster_admin", "gerente_operaciones", "gerente_area"],
};

export function isSuperAdministrator(roleKey: RoleKey) {
  return roleKey === "super_admin" || roleKey === "webmaster_admin";
}

export function roleLevel(roleKey: RoleKey) {
  return hierarchy[roleKey];
}

export function canPerformAction(actor: Actor, action: ActionKey) {
  return actionRoles[action].includes(actor.roleKey) || actor.permissions.includes(action);
}

export function canAccessRecord(actor: Actor, target: ScopeBoundary) {
  if (actor.scope.organizationId !== target.organizationId) {
    return false;
  }

  if (isSuperAdministrator(actor.roleKey)) {
    return true;
  }

  const grants = actor.scopeGrants && actor.scopeGrants.length > 0
    ? actor.scopeGrants
    : [actor.scope];
  const dimensions: Array<keyof Omit<ScopeBoundary, "organizationId">> = [
    "countryId",
    "companyId",
    "operationalAreaId",
    "branchId",
    "businessLineId",
  ];

  return grants.some((grant) => (
    grant.organizationId === target.organizationId
    && dimensions.every((dimension) => {
      const grantValue = grant[dimension];
      const targetValue = target[dimension];
      return !grantValue || !targetValue || grantValue === targetValue;
    })
  ));
}

export function canDelegateRole(actorRole: RoleKey, targetRole: RoleKey) {
  return canCreateRole(actorRole, targetRole);
}

export function assertAction(actor: Actor, action: ActionKey) {
  if (!canPerformAction(actor, action)) {
    throw new AuthorizationError(`Action not allowed: ${action}`);
  }
}

export function assertRecordAccess(actor: Actor, target: ScopeBoundary) {
  if (!canAccessRecord(actor, target)) {
    throw new AuthorizationError("Requested record is outside the actor scope.");
  }
}

export class AuthorizationError extends Error {
  status = 403;
}
