import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";


function findTextReferences(needle, roots) {
  const matches = [];
  const visit = (path) => {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
        visit(join(path, entry.name));
      }
      return;
    }

    if (!/\.(?:[cm]?[jt]sx?|json|md|css|html)$/i.test(path)) return;
    const content = readFileSync(path, "utf8");
    if (content.includes(needle)) matches.push(path);
  };

  for (const root of roots) visit(root);
  return matches;
}

const migrationPath = "supabase/migrations/20260720000100_phase1_core.sql";
const seedPath = "supabase/seed.sql";

statSync(migrationPath);
statSync(seedPath);

const migration = readFileSync(migrationPath, "utf8");
const seed = readFileSync(seedPath, "utf8");

const requiredTables = [
  "organizations",
  "countries",
  "currencies",
  "companies",
  "branches",
  "profiles",
  "roles",
  "permissions",
  "user_roles",
  "user_country_access",
  "user_company_access",
  "user_branch_access",
  "branch_managers",
  "services",
  "data_sources",
  "audit_logs",
];

for (const table of requiredTables) {
  if (!migration.includes(`create table public.${table}`)) {
    throw new Error(`Missing table in migration: ${table}`);
  }
  if (!migration.includes(`alter table public.${table} enable row level security`)) {
    throw new Error(`Missing RLS enablement for table: ${table}`);
  }
}

const requiredFunctions = [
  "current_user_is_super_admin",
  "current_user_has_role",
  "current_user_can_access_org",
  "current_user_can_access_country",
  "current_user_can_access_company",
  "current_user_can_access_branch",
];

for (const fn of requiredFunctions) {
  if (!migration.includes(`function public.${fn}`)) {
    throw new Error(`Missing RLS helper function: ${fn}`);
  }
}

const roleKeys = [
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
  "viewer",
];

for (const roleKey of roleKeys) {
  if (!seed.includes(roleKey)) {
    throw new Error(`Missing seed role: ${roleKey}`);
  }
}

const countries = [
  "Guatemala",
  "Belice",
  "El Salvador",
  "Honduras",
  "Nicaragua",
  "Costa Rica",
  "Panama",
];

for (const country of countries) {
  if (!seed.includes(country)) {
    throw new Error(`Missing seed country: ${country}`);
  }
}

const signUpPage = readFileSync("app/auth/sign-up/page.tsx", "utf8");
const loginForm = readFileSync("components/login-form.tsx", "utf8");
const demoAdminRoute = readFileSync("app/auth/demo-admin/route.ts", "utf8");
const demoAdminHelper = readFileSync("lib/auth/demo-admin.ts", "utf8");
const removedSignUpFormExists = (() => {
  try {
    statSync("components/sign-up-form.tsx");
    return true;
  } catch {
    return false;
  }
})();

if (!signUpPage.includes("Crear cuenta")) {
  throw new Error("Controlled account creation page should say Crear cuenta.");
}

for (const requiredRoleText of [
  "Superadministrador",
  "CEO",
  "Gerente de operaciones",
  "Gerente de area",
  "Gerente de sucursal",
  "Usuario operativo",
  "Viewer",
]) {
  if (!signUpPage.includes(requiredRoleText) && !seed.includes(requiredRoleText)) {
    throw new Error(`Missing four-role model text: ${requiredRoleText}`);
  }
}

if (!loginForm.includes("Crear cuenta")) {
  throw new Error("Login form should link to controlled account creation.");
}

if (
  !loginForm.includes("enableLocalDemoLogin") ||
  !loginForm.includes("Entorno DEMO local") ||
  !loginForm.includes("/api/auth/demo-session")
) {
  throw new Error("Login form should expose controlled local DEMO access only behind the server flag.");
}

if (!demoAdminRoute.includes("getDemoAdminPassword")) {
  throw new Error("DEMO admin route should require configured credentials.");
}

if (!demoAdminRoute.includes("demoAdminCookieName")) {
  throw new Error("DEMO admin route should set a local demo session cookie.");
}

if (!demoAdminHelper.includes("VERCEL_ENV !== \"production\"")) {
  throw new Error("DEMO admin helper must disable demo access in production.");
}

if (removedSignUpFormExists) {
  throw new Error("Public self-registration form must not exist.");
}

const signUpCalls = findTextReferences("auth.signUp", ["app", "components", "lib"]);

if (signUpCalls.length > 0) {
  throw new Error(`Unexpected public self-registration behavior:\n${signUpCalls.join("\n")}`);
}

if (!signUpPage.includes("AcceptInvitationForm")) {
  throw new Error(
    "Invitation-based account activation must render the password setup form.",
  );
}

console.log("Phase 1 core checks passed.");
