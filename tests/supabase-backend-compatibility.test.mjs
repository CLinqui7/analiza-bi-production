import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));

const requiredMonthlyRoutes = [
  "app/api/monthly-submissions/route.ts",
  "app/api/monthly-submissions/publish/route.ts",
  "app/api/monthly-submissions/[submissionId]/attachments/route.ts",
  "app/api/monthly-submissions/[submissionId]/attachments/upload-ticket/route.ts",
  "app/api/monthly-submissions/[submissionId]/attachments/finalize/route.ts",
  "app/api/monthly-submissions/[submissionId]/report/route.ts",
];

for (const route of requiredMonthlyRoutes) {
  assert.equal(exists(route), true, `Missing V7 monthly route: ${route}`);
}

const router = read("components/monthly-closure-router.tsx");
assert.match(router, /MonthlySubmissionCenter/);
assert.match(router, /resolveV7ActorFromCurrent/);
assert.match(router, /if \(!isDemoRuntimeEnvironment\(\)\)/);
assert.match(router, /lockedBusinessLineCode/);

const form = read("components/production/monthly-submission-center.tsx");
assert.match(form, /\/api\/monthly-submissions/);
assert.match(form, /tus-js-client/);
assert.match(form, /monthly-evidence/);
assert.match(form, /maxFileBytes = 15 \* 1024 \* 1024/);

const publish = read("app/api/monthly-submissions/publish/route.ts");
assert.match(publish, /calculateOfficialKpis/);
assert.match(publish, /finalize_manual_closing_publication/);
assert.match(publish, /manual_monthly_submission_attachments/);

const adminClient = read("lib/supabase/admin.ts");
assert.match(adminClient, /type LooseDatabase/);
assert.match(adminClient, /SupabaseClient<LooseDatabase>/);
assert.match(adminClient, /createSupabaseClient<LooseDatabase>/);

const account = read("app/api/account/profile/route.ts");
assert.match(account, /readProfileFromSupabase/);
assert.match(account, /getSupabaseAdminClient/);

const branchManagers = read("app/api/users/branch-managers/route.ts");
assert.match(branchManagers, /v_manager_bonus_directory/);
assert.match(branchManagers, /source: "supabase"/);

const incentives = read("app/api/users/manager-incentives/route.ts");
assert.match(incentives, /manager_bonus_plans/);
assert.match(incentives, /v_manager_bonus_directory/);
assert.match(incentives, /managerIncentive:\s*\{[\s\S]*managementLevel,/);
assert.match(incentives, /management_level: managementLevel/);

const branchCreate = read("app/api/branches/route.ts");
assert.match(branchCreate, /getSupabaseAdminClient/);
assert.match(branchCreate, /area_branch_assignments/);

const invite = read("app/api/users/invite/route.ts");
assert.match(invite, /useSupabaseDirectory/);
assert.match(invite, /admin\.auth\.admin\.createUser/);
assert.match(invite, /admin\.auth\.admin\.inviteUserByEmail/);
assert.match(invite, /manager_bonus_plans/);
assert.match(invite, /reporting_lines/);

const confirm = read("app/auth/confirm/route.ts");
assert.match(confirm, /accept_current_user_invitation/);

const modulePage = read("app/protected/[module]/page.tsx");
assert.match(modulePage, /module === "operacion"[\s\S]*!isDemoRuntimeEnvironment\(\)[\s\S]*renderOfficialDataModule/);

const dataQuality = read("components/data-quality-analia-dashboard.tsx");
assert.match(dataQuality, /visibleFindings\.map\(\(finding, index\)/);
assert.match(dataQuality, /finding\.source}-\$\{index/);

const officialQuality = read("components/official-data-quality-dashboard.tsx");
assert.match(officialQuality, /OfficialExecutiveSnapshot/);
assert.doesNotMatch(officialQuality, /Math\.random/);
assert.match(modulePage, /module === "calidad-datos"[\s\S]*!isDemoRuntimeEnvironment\(\)[\s\S]*OfficialDataQualityDashboard/);

const officialBi = read("lib/server/official-bi.ts");
assert.match(officialBi, /getOfficialExecutiveSnapshotFromSupabase/);
assert.match(officialBi, /if \(missingConfig\.length > 0\)/);

const officialContext = read("lib/server/official-context-options.ts");
assert.match(officialContext, /getOfficialContextOptionsFromSupabase/);
assert.match(officialContext, /if \(getMissingDatabaseConfig\(\)\.length > 0\)/);

for (const api of [
  "app/api/account/profile/route.ts",
  "app/api/users/branch-managers/route.ts",
  "app/api/users/manager-incentives/route.ts",
  "app/api/users/invite/route.ts",
  "app/api/branches/route.ts",
]) {
  const source = read(api);
  assert.match(source, /getMissingDatabaseConfig/);
  assert.match(source, /getSupabaseAdminClient|useSupabaseDirectory/);
}

const pkg = JSON.parse(read("package.json"));
for (const dep of ["zod", "pdf-lib", "tus-js-client", "xlsx", "server-only"]) {
  assert.ok(pkg.dependencies?.[dep], `Missing dependency ${dep}`);
}

const lock = JSON.parse(read("package-lock.json"));
for (const modulePath of [
  "node_modules/zod",
  "node_modules/pdf-lib",
  "node_modules/tus-js-client",
  "node_modules/xlsx",
  "node_modules/server-only",
]) {
  assert.ok(lock.packages?.[modulePath], `Lockfile missing ${modulePath}`);
}

console.log("supabase-backend-compatibility: PASS");
