import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import {
  branchLifecycleStatuses,
  buildSoftDeactivationPlan,
  canAccessRecord,
  canActivateBranch,
  canCreateBranch,
  canCreateRole,
  canInviteUser,
  getCreatableRoles,
  getInitialBranchStatus,
  getRoleHierarchyLevel,
  roleHierarchy,
} from "../lib/tenant/delegation-policy.ts";

const migrationPath =
  "supabase/migrations/20260729000200_delegated_user_hierarchy.sql";
const ceoBranchGovernanceMigrationPath =
  "supabase/migrations/20260825000100_ceo_branch_governance.sql";
const ceoUserDelegationMigrationPath =
  "supabase/migrations/20260825000200_ceo_user_delegation.sql";
const managerIncentiveMigrationPath =
  "supabase/migrations/20260826000100_manager_incentive_policy.sql";
const areaManagerBranchDelegationMigrationPath =
  "supabase/migrations/20260826000200_area_manager_branch_delegation.sql";
const seedPath = "supabase/seed.sql";
const contextDataPath = "lib/tenant/demo-context.ts";
const usersComponentPath = "components/business-module-dashboard.tsx";

for (const file of [
  migrationPath,
  ceoBranchGovernanceMigrationPath,
  ceoUserDelegationMigrationPath,
  managerIncentiveMigrationPath,
  areaManagerBranchDelegationMigrationPath,
  seedPath,
  contextDataPath,
  usersComponentPath,
]) {
  statSync(file);
}

const migration = readFileSync(migrationPath, "utf8");
const ceoBranchGovernanceMigration = readFileSync(
  ceoBranchGovernanceMigrationPath,
  "utf8",
);
const ceoUserDelegationMigration = readFileSync(
  ceoUserDelegationMigrationPath,
  "utf8",
);
const managerIncentiveMigration = readFileSync(
  managerIncentiveMigrationPath,
  "utf8",
);
const areaManagerBranchDelegationMigration = readFileSync(
  areaManagerBranchDelegationMigrationPath,
  "utf8",
);
const seed = readFileSync(seedPath, "utf8");
const contextData = readFileSync(contextDataPath, "utf8");
const usersComponent = readFileSync(usersComponentPath, "utf8");

const organizationId = "org-demo";
const countryId = "sv";
const companyId = "lab";
const operationalAreaId = "area-centro";
const branchId = "branch-aguilares";

const operationsActor = {
  roleKey: "gerente_operaciones",
  scope: {
    organizationId,
    countryId,
    companyId,
  },
  userId: "ops-user",
};

const ceoActor = {
  roleKey: "ceo",
  scope: {
    organizationId,
    countryId,
    companyId,
  },
  userId: "ceo-user",
};

const areaActor = {
  roleKey: "gerente_area",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
  },
  userId: "area-user",
};

const branchActor = {
  canInviteOperationalUsers: true,
  roleKey: "gerente_sucursal",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
    branchId,
  },
  userId: "branch-user",
};

const areaTarget = {
  roleKey: "gerente_area",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
  },
};

const branchManagerTarget = {
  roleKey: "gerente_sucursal",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
    branchId,
  },
};

const operationalUserTarget = {
  roleKey: "usuario_operativo",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
    branchId,
  },
};

assert.equal(
  canInviteUser(operationsActor, areaTarget),
  true,
  "Operations manager should create area managers in scope.",
);

assert.equal(
  canCreateBranch(operationsActor, areaTarget.scope),
  true,
  "Operations manager should create branches in scope.",
);

assert.equal(
  canCreateBranch(ceoActor, {
    companyId,
    countryId,
    organizationId,
  }),
  true,
  "CEO should create branches inside its business line scope.",
);

assert.equal(
  canInviteUser(ceoActor, areaTarget),
  false,
  "CEO should not create area managers in the controlled operations flow.",
);

assert.deepEqual(
  getCreatableRoles("ceo"),
  [
    "gerente_operaciones",
    "usuario_operativo",
    "viewer",
  ],
  "CEO must keep non-manager lower roles available without bypassing operations manager creation.",
);

assert.deepEqual(
  getCreatableRoles("gerente_area"),
  ["gerente_sucursal", "usuario_operativo", "viewer"],
  "Area manager must create branch managers and lower operational users in scope.",
);

assert.equal(
  canInviteUser(areaActor, branchManagerTarget),
  true,
  "Area manager should create branch managers inside its operational area.",
);

assert.equal(
  canCreateBranch(areaActor, branchManagerTarget.scope),
  false,
  "Area manager must not create branches.",
);

assert.equal(
  canInviteUser(branchActor, branchManagerTarget),
  false,
  "Branch manager must not create branch managers.",
);

assert.equal(
  canInviteUser(branchActor, operationalUserTarget),
  true,
  "Branch manager may create operational users when explicitly delegated.",
);

for (const actorRole of roleHierarchy.map((entry) => entry.roleKey)) {
  for (const targetRole of roleHierarchy.map((entry) => entry.roleKey)) {
    if (getRoleHierarchyLevel(targetRole) >= getRoleHierarchyLevel(actorRole)) {
      assert.equal(
        canCreateRole(actorRole, targetRole, {
          canInviteOperationalUsers: true,
        }),
        false,
        `${actorRole} must not create equal or higher role ${targetRole}.`,
      );
    }
  }
}

assert.equal(
  canAccessRecord(areaActor, {
    organizationId,
    countryId,
    companyId,
    operationalAreaId: "area-oriente",
    branchId: "branch-other",
  }),
  false,
  "Managers must not access records outside their operational area.",
);

const deactivationPlan = buildSoftDeactivationPlan({
  actor: operationsActor,
  subordinateCount: 0,
  target: branchManagerTarget,
  targetBranchCount: 1,
});

assert.equal(deactivationPlan.canDeactivate, true);
assert.equal(deactivationPlan.requiresReassignment, true);
assert.equal(deactivationPlan.auditAction, "manager.soft_deactivate");

assert.equal(getInitialBranchStatus(), "pending_manager");
assert.equal(canActivateBranch({ configurationComplete: true, managerAssigned: true }), true);
assert.equal(canActivateBranch({ configurationComplete: true, managerAssigned: false }), false);
assert.deepEqual(branchLifecycleStatuses, [
  "draft",
  "pending_manager",
  "active",
  "temporarily_closed",
  "inactive",
]);

for (const table of [
  "operational_areas",
  "area_branch_assignments",
  "manager_assignments",
  "reporting_lines",
  "user_invitations",
  "role_hierarchy",
  "permission_delegations",
  "assignment_history",
]) {
  if (!migration.includes(`create table if not exists public.${table}`)) {
    throw new Error(`Missing delegated hierarchy table: ${table}`);
  }

  if (!migration.includes(`alter table public.${table} enable row level security`)) {
    throw new Error(`Missing delegated hierarchy RLS: ${table}`);
  }
}

for (const requiredSqlText of [
  "organization_id",
  "country_id",
  "company_id",
  "operational_area_id",
  "branch_id",
  "role_id",
  "current_user_can_delegate_role",
  "current_user_can_access_operational_area",
  "current_user_can_manage_delegated_scope",
  "invitation_token_hash",
  "pending_invitation",
  "alter column status set default 'pending_manager'",
  "deleted_at",
  "audit_logs",
  "assignment_history",
]) {
  if (!migration.includes(requiredSqlText)) {
    throw new Error(`Delegated hierarchy migration is missing: ${requiredSqlText}`);
  }
}

for (const requiredCeoBranchSql of [
  "where r.key = 'ceo'",
  "p.key = 'branches.manage'",
  "array['ceo', 'gerente_operaciones']",
]) {
  if (!ceoBranchGovernanceMigration.includes(requiredCeoBranchSql)) {
    throw new Error(
      `CEO branch governance migration is missing: ${requiredCeoBranchSql}`,
    );
  }
}

for (const requiredCeoDelegationSql of [
  "where r.key = 'ceo'",
  "hierarchy_level = excluded.hierarchy_level",
  "can_invite = excluded.can_invite",
]) {
  if (!ceoUserDelegationMigration.includes(requiredCeoDelegationSql)) {
    throw new Error(
      `CEO user delegation migration is missing: ${requiredCeoDelegationSql}`,
    );
  }
}

for (const requiredManagerIncentiveSql of [
  "management_level",
  "base_bonus_amount",
  "user_invitations_management_level_check",
  "manager_assignments_management_level_check",
  "manager_assignments_base_bonus_amount_check",
  "current_user_can_delegate_role",
]) {
  if (!managerIncentiveMigration.includes(requiredManagerIncentiveSql)) {
    throw new Error(
      `Manager incentive migration is missing: ${requiredManagerIncentiveSql}`,
    );
  }
}

for (const requiredAreaDelegationSql of [
  "target_hierarchy.role_key not in ('gerente_area', 'gerente_sucursal')",
  "actor_hierarchy.role_key = 'gerente_operaciones'",
  "target_hierarchy.role_key = 'gerente_sucursal'",
  "actor_hierarchy.role_key in ('gerente_operaciones', 'gerente_area')",
]) {
  if (!areaManagerBranchDelegationMigration.includes(requiredAreaDelegationSql)) {
    throw new Error(
      `Area manager delegation migration is missing: ${requiredAreaDelegationSql}`,
    );
  }
}

for (const hierarchyText of [
  "('super_admin', 100, true)",
  "('gerente_operaciones', 80, true)",
  "('gerente_area', 60, true)",
  "('gerente_sucursal', 40, true)",
  "('usuario_operativo', 20, false)",
  "('viewer', 10, false)",
]) {
  if (!migration.includes(hierarchyText) || !seed.includes(hierarchyText)) {
    throw new Error(`Missing hierarchy seed or migration row: ${hierarchyText}`);
  }
}

for (const requiredContextText of [
  "demoOperationalAreas",
  "operationalAreaId",
  "areaManagerName",
  "sourceTrace: branch.sourceTrace",
]) {
  if (!contextData.includes(requiredContextText)) {
    throw new Error(`Context hierarchy data is missing: ${requiredContextText}`);
  }
}

for (const requiredUserUiText of [
  "Alta de sucursal",
  "/api/branches",
  "pendiente de gerente",
  "governanceStatus",
  "Ahora crea o asigna su gerente de sucursal para activarla",
  "Crear usuario",
  "Contrasena temporal",
  "Resetear contrasena temporal",
  "Nivel de gerencia",
  "Bono base mensual",
  "Gerentes de sucursal a cargo",
  "managedBranchManagerIds",
  "Recomendado = bono base x cumplimiento de meta",
  "Selecciona la gerencia de area",
  "Selecciona la sucursal",
  "Pendiente invitacion",
  "Reasignacion requerida",
  "Desactivar",
]) {
  if (!usersComponent.includes(requiredUserUiText)) {
    throw new Error(`Delegated user UI is missing: ${requiredUserUiText}`);
  }
}

console.log("Delegation policy checks passed.");
