import type { RoleKey } from "@/lib/tenant/demo-context";

export type ScopeBoundary = {
  organizationId: string;
  countryId?: string | null;
  countryName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  operationalAreaId?: string | null;
  operationalAreaName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
};

export type DelegationActor = {
  userId: string;
  roleKey: RoleKey;
  scope: ScopeBoundary;
  canInviteOperationalUsers?: boolean;
};

export type DelegationTarget = {
  roleKey: RoleKey;
  scope: ScopeBoundary;
};

export type BranchLifecycleStatus =
  | "draft"
  | "pending_manager"
  | "active"
  | "temporarily_closed"
  | "inactive";

export type SoftDeactivationPlan = {
  canDeactivate: boolean;
  requiresReassignment: boolean;
  auditAction: string;
  reason: string;
};

export type RoleHierarchyEntry = {
  roleKey: RoleKey;
  hierarchyLevel: number;
  canCreateUsers: boolean;
  canCreateBranches: boolean;
  canCreateOperationalAreas: boolean;
  canManageGlobalPermissions: boolean;
};

export const branchLifecycleStatuses: BranchLifecycleStatus[] = [
  "draft",
  "pending_manager",
  "active",
  "temporarily_closed",
  "inactive",
];

export const roleHierarchy: RoleHierarchyEntry[] = [
  {
    roleKey: "super_admin",
    hierarchyLevel: 100,
    canCreateUsers: true,
    canCreateBranches: true,
    canCreateOperationalAreas: true,
    canManageGlobalPermissions: true,
  },
  {
    roleKey: "webmaster_admin",
    hierarchyLevel: 100,
    canCreateUsers: true,
    canCreateBranches: true,
    canCreateOperationalAreas: true,
    canManageGlobalPermissions: true,
  },
  {
    roleKey: "ceo",
    hierarchyLevel: 90,
    canCreateUsers: false,
    canCreateBranches: false,
    canCreateOperationalAreas: false,
    canManageGlobalPermissions: false,
  },
  {
    roleKey: "gerente_operaciones",
    hierarchyLevel: 80,
    canCreateUsers: true,
    canCreateBranches: true,
    canCreateOperationalAreas: true,
    canManageGlobalPermissions: false,
  },
  {
    roleKey: "gerente_area",
    hierarchyLevel: 60,
    canCreateUsers: false,
    canCreateBranches: false,
    canCreateOperationalAreas: false,
    canManageGlobalPermissions: false,
  },
  {
    roleKey: "gerente_sucursal",
    hierarchyLevel: 40,
    canCreateUsers: false,
    canCreateBranches: false,
    canCreateOperationalAreas: false,
    canManageGlobalPermissions: false,
  },
  {
    roleKey: "usuario_operativo",
    hierarchyLevel: 20,
    canCreateUsers: false,
    canCreateBranches: false,
    canCreateOperationalAreas: false,
    canManageGlobalPermissions: false,
  },
  {
    roleKey: "viewer",
    hierarchyLevel: 10,
    canCreateUsers: false,
    canCreateBranches: false,
    canCreateOperationalAreas: false,
    canManageGlobalPermissions: false,
  },
];

const hierarchyByRole = new Map(
  roleHierarchy.map((entry) => [entry.roleKey, entry]),
);

const standardRoleCreation: Record<RoleKey, RoleKey[]> = {
  super_admin: [
    "ceo",
    "gerente_operaciones",
    "gerente_area",
    "gerente_sucursal",
    "usuario_operativo",
    "viewer",
  ],
  webmaster_admin: [
    "ceo",
    "gerente_operaciones",
    "gerente_area",
    "gerente_sucursal",
    "usuario_operativo",
    "viewer",
  ],
  ceo: [],
  gerente_operaciones: ["gerente_area", "gerente_sucursal", "usuario_operativo", "viewer"],
  gerente_area: [],
  gerente_sucursal: [],
  usuario_operativo: [],
  viewer: [],
};

export function getRoleHierarchyLevel(roleKey: RoleKey) {
  return hierarchyByRole.get(roleKey)?.hierarchyLevel ?? 0;
}

export function isSuperAdministrator(roleKey: RoleKey) {
  return roleKey === "super_admin" || roleKey === "webmaster_admin";
}

export function isLowerRole(actorRole: RoleKey, targetRole: RoleKey) {
  return getRoleHierarchyLevel(actorRole) > getRoleHierarchyLevel(targetRole);
}

export function canCreateRole(
  actorRole: RoleKey,
  targetRole: RoleKey,
  options: { canInviteOperationalUsers?: boolean } = {},
) {
  if (!isLowerRole(actorRole, targetRole)) {
    return false;
  }

  if (
    actorRole === "gerente_sucursal" &&
    targetRole === "usuario_operativo" &&
    !options.canInviteOperationalUsers
  ) {
    return false;
  }

  if (
    targetRole === "gerente_area" &&
    !isSuperAdministrator(actorRole) &&
    actorRole !== "gerente_operaciones"
  ) {
    return false;
  }

  if (
    targetRole === "gerente_sucursal" &&
    !isSuperAdministrator(actorRole) &&
    actorRole !== "gerente_operaciones" &&
    actorRole !== "gerente_area"
  ) {
    return false;
  }

  return standardRoleCreation[actorRole]?.includes(targetRole) ?? false;
}

export function getCreatableRoles(
  actorRole: RoleKey,
  options: { canInviteOperationalUsers?: boolean } = {},
) {
  return roleHierarchy
    .map((entry) => entry.roleKey)
    .filter((targetRole) => canCreateRole(actorRole, targetRole, options));
}

export function isWithinScope(actorScope: ScopeBoundary, targetScope: ScopeBoundary) {
  if (actorScope.organizationId !== targetScope.organizationId) {
    return false;
  }

  const scopedDimensions: Array<keyof ScopeBoundary> = [
    "countryId",
    "companyId",
    "operationalAreaId",
    "branchId",
  ];

  return scopedDimensions.every((dimension) => {
    const actorValue = actorScope[dimension];
    const targetValue = targetScope[dimension];

    return !actorValue || actorValue === targetValue;
  });
}

export function canCreateBranch(actor: DelegationActor, targetScope: ScopeBoundary) {
  if (!isWithinScope(actor.scope, targetScope)) {
    return false;
  }

  return (
    isSuperAdministrator(actor.roleKey) ||
    actor.roleKey === "gerente_operaciones"
  );
}

export function canCreateOperationalArea(
  actor: DelegationActor,
  targetScope: ScopeBoundary,
) {
  if (!isWithinScope(actor.scope, targetScope)) {
    return false;
  }

  return (
    isSuperAdministrator(actor.roleKey) ||
    actor.roleKey === "gerente_operaciones"
  );
}

export function canInviteUser(actor: DelegationActor, target: DelegationTarget) {
  if (!isWithinScope(actor.scope, target.scope)) {
    return false;
  }

  return canCreateRole(actor.roleKey, target.roleKey, {
    canInviteOperationalUsers: actor.canInviteOperationalUsers,
  });
}

export function canAssignBranchToArea(
  actor: DelegationActor,
  branchScope: ScopeBoundary,
  areaScope: ScopeBoundary,
) {
  return (
    canCreateBranch(actor, branchScope) &&
    canCreateOperationalArea(actor, areaScope) &&
    branchScope.organizationId === areaScope.organizationId &&
    branchScope.countryId === areaScope.countryId &&
    branchScope.companyId === areaScope.companyId
  );
}

export function canAccessRecord(actor: DelegationActor, targetScope: ScopeBoundary) {
  if (isSuperAdministrator(actor.roleKey) || actor.roleKey === "ceo") {
    return actor.scope.organizationId === targetScope.organizationId;
  }

  return isWithinScope(actor.scope, targetScope);
}

export function getInitialBranchStatus(): BranchLifecycleStatus {
  return "pending_manager";
}

export function canActivateBranch({
  configurationComplete,
  managerAssigned,
}: {
  configurationComplete: boolean;
  managerAssigned: boolean;
}) {
  return configurationComplete && managerAssigned;
}

export function buildSoftDeactivationPlan({
  actor,
  subordinateCount,
  target,
  targetBranchCount,
}: {
  actor: DelegationActor;
  subordinateCount: number;
  target: DelegationTarget;
  targetBranchCount: number;
}): SoftDeactivationPlan {
  const canDeactivate =
    canInviteUser(actor, target) || isSuperAdministrator(actor.roleKey);
  const requiresReassignment =
    canDeactivate && (subordinateCount > 0 || targetBranchCount > 0);

  return {
    auditAction: "manager.soft_deactivate",
    canDeactivate,
    reason: requiresReassignment
      ? "Debe reasignar sucursales o subordinados antes de finalizar la baja."
      : "Puede desactivar con historial y auditoria sin borrar el usuario.",
    requiresReassignment,
  };
}
