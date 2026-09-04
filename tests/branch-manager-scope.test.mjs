import { readFileSync, statSync } from "node:fs";

const protectedLayoutPath = "app/protected/layout.tsx";
const authorizationPath = "lib/server/authorization.ts";
const sidebarPath = "components/app-sidebar.tsx";
const headerPath = "components/tenant-context-header.tsx";
const branchDashboardPath = "components/branch-network-dashboard.tsx";
const currentAccessPath = "lib/tenant/current-user-access.ts";
const contextPagePath = "app/protected/context/page.tsx";
const contextOptionsRoutePath = "app/api/context/options/route.ts";
const officialContextOptionsPath = "lib/server/official-context-options.ts";
const sessionRoutePath = "app/api/auth/local-session/route.ts";
const localAuthPath = "lib/server/local-auth.ts";

for (const file of [
  protectedLayoutPath,
  authorizationPath,
  sidebarPath,
  headerPath,
  branchDashboardPath,
  contextPagePath,
  contextOptionsRoutePath,
  currentAccessPath,
  officialContextOptionsPath,
  sessionRoutePath,
  localAuthPath,
]) {
  statSync(file);
}

const protectedLayout = readFileSync(protectedLayoutPath, "utf8");
const authorization = readFileSync(authorizationPath, "utf8");
const sidebar = readFileSync(sidebarPath, "utf8");
const header = readFileSync(headerPath, "utf8");
const branchDashboard = readFileSync(branchDashboardPath, "utf8");
const contextPage = readFileSync(contextPagePath, "utf8");
const contextOptionsRoute = readFileSync(contextOptionsRoutePath, "utf8");
const currentAccess = readFileSync(currentAccessPath, "utf8");
const officialContextOptions = readFileSync(officialContextOptionsPath, "utf8");
const sessionRoute = readFileSync(sessionRoutePath, "utf8");
const localAuth = readFileSync(localAuthPath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  protectedLayout.includes("requireProtectedAccess") &&
    authorization.includes("allowDemoRoleSwitch: false") &&
    authorization.includes("readLocalSession"),
  "Protected access must disable demo role switching for real local sessions.",
);

assert(
  sidebar.includes("!allowDemoRoleSwitch") &&
    sidebar.includes("window.localStorage.setItem(roleStorageKey, roleKey)") &&
    sidebar.includes("Rol DEMO"),
  "Sidebar must pin the real role and only expose the DEMO role selector when allowed.",
);

assert(
  currentAccess.includes("isBranchManagerScopedAccess") &&
    currentAccess.includes("branchName") &&
    currentAccess.includes("/api/auth/local-session"),
  "Current user access helper must expose branch-scoped session data.",
);

assert(
  sessionRoute.includes("getAuthenticatedLocalUserAccess") &&
    sessionRoute.includes("readLocalSession"),
  "Local session API must return current user role and scope from PostgreSQL.",
);

for (const requiredLocalAuthText of [
  "coalesce(ur.branch_id, p.default_branch_id)",
  "public.operational_areas",
  "branch_name",
  "company_name",
]) {
  assert(
    localAuth.includes(requiredLocalAuthText),
    `Local auth access query is missing: ${requiredLocalAuthText}`,
  );
}

assert(
  header.includes("/api/context/options") &&
    header.includes("payload.actor") &&
    header.includes("isBranchManagerScopedAccess") &&
    header.includes("scopedCompanyAccess") &&
    header.includes("branchOptions") &&
    header.includes("operationalAreaOptions") &&
    header.includes("managerFilterOptions") &&
    header.includes("isSecondaryFilterDisabled") &&
    header.includes("Todas mis sucursales") &&
    header.includes("effectiveCompanyId") &&
    header.includes("effectiveCountryId") &&
    header.includes("officialContextOptions === null") &&
    header.includes("isLineLocked") &&
    header.includes("Acceso de sucursal") &&
    header.includes("Linea asignada") &&
    header.includes("setAdvancedFiltersOpen(false)"),
  "Tenant header must lock real scoped users to their assigned business line and branch when applicable.",
);

assert(
  branchDashboard.includes("isBranchManagerScopedAccess") &&
    branchDashboard.includes("/api/context/options") &&
    branchDashboard.includes("allowedBranchOptions") &&
    branchDashboard.includes("recordMatchesBranchOption") &&
    branchDashboard.includes("recordMatchesContextBranch") &&
    branchDashboard.includes("No hay filtros para cambiar de sucursal") &&
    branchDashboard.includes("Sin cierre cargado para esta sucursal") &&
    !branchDashboard.includes("screen.records.slice(0, 1)") &&
    !branchDashboard.includes("??\n    screen.records[0]"),
  "Branch dashboard must not fall back to full-network data for branch managers.",
);

assert(
  contextPage.includes("getOfficialContextOptions") &&
    contextOptionsRoute.includes("getOfficialContextOptions") &&
    contextOptionsRoute.includes("requiresPasswordChange") &&
    officialContextOptions.includes("buildOfficialBranchAccessPredicate") &&
    officialContextOptions.includes("public.manager_assignments") &&
    officialContextOptions.includes("public.user_branch_access") &&
    officialContextOptions.includes("r.key = 'gerente_area'") &&
    officialContextOptions.includes("ma.operational_area_id = b.operational_area_id") &&
    officialContextOptions.includes("b.status = 'active'") &&
    officialContextOptions.includes("b.deleted_at is null") &&
    officialContextOptions.includes("c.id = any($1::uuid[])") &&
    officialContextOptions.includes("co.id = any($1::uuid[])"),
  "Official context options must be scoped to active assigned branches before countries and companies are built.",
);
