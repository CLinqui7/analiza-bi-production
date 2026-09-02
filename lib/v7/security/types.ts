export const roleKeys = [
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
  "viewer",
] as const;

export type RoleKey = (typeof roleKeys)[number];

export type ScopeBoundary = {
  organizationId: string;
  countryId?: string | null;
  companyId?: string | null;
  operationalAreaId?: string | null;
  branchId?: string | null;
};

export type Actor = {
  userId: string;
  email: string | null;
  displayName: string;
  roleKey: RoleKey;
  roleId: string | null;
  scope: ScopeBoundary;
  /**
   * Every active grant for the actor's effective role. A GO can therefore have
   * more than one country/company pair, a GA more than one area, etc. `scope`
   * remains the preferred/default grant for display purposes; authorization
   * evaluates this complete list.
   */
  scopeGrants?: ScopeBoundary[];
  isDemo: boolean;
  permissions: string[];
};

export type ActionKey =
  | "dashboard.read"
  | "finance.read"
  | "operation.read"
  | "monthly_submission.read"
  | "monthly_submission.write"
  | "monthly_submission.publish"
  | "imports.read"
  | "imports.write"
  | "connectors.read"
  | "connectors.manage"
  | "goals.read"
  | "goals.manage"
  | "users.read"
  | "users.invite"
  | "roles.read"
  | "audit.read"
  | "exports.create"
  | "structure.manage"
  | "assignments.manage";
