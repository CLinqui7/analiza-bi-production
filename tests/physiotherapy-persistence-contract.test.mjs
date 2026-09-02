import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const root = process.cwd();

function read(path) {
  return readFileSync(`${root}/${path}`, "utf8");
}

const migrationPath =
  "supabase/migrations/20260810000100_physiotherapy_closing_persistence.sql";
const analyticsPath = "lib/analytics/physiotherapy-closures.ts";
const packagePath = "package.json";

statSync(`${root}/${migrationPath}`);

const migration = read(migrationPath);
const analytics = read(analyticsPath);
const packageJson = read(packagePath);

for (const tableName of [
  "monthly_closings",
  "physiotherapy_closing_inputs",
  "closing_versions",
  "closing_validation_results",
  "closing_kpi_results",
  "kpi_targets",
  "generated_insights",
  "closing_audit_events",
]) {
  assert.ok(
    migration.includes(`public.${tableName}`),
    `Persistence migration must define ${tableName}.`,
  );
}

for (const status of [
  "DRAFT",
  "VALIDATED",
  "WARNING",
  "BLOCKED",
  "PUBLISHED",
  "SUPERSEDED",
]) {
  assert.ok(
    migration.includes(`'${status}'`),
    `Monthly closing lifecycle must include ${status}.`,
  );
}

assert.ok(
  migration.includes("monthly_closing_one_active_published_version_idx"),
  "Published closures must have a uniqueness guard per branch, line and period.",
);
assert.ok(
  migration.includes("supersedes_version_id") &&
    migration.includes("superseded_by_version_id"),
  "Corrections must preserve closing version lineage.",
);
assert.ok(
  migration.includes("enable row level security"),
  "New persistence tables must enable RLS.",
);
assert.ok(
  migration.includes("current_user_can_access_branch(branch_id)"),
  "RLS policies must keep branch scope as the core access boundary.",
);

const inputsTable = migration.slice(
  migration.indexOf("create table public.physiotherapy_closing_inputs"),
  migration.indexOf("create table public.closing_validation_results"),
);

for (const calculatedColumn of [
  "occupancy",
  "occupacion",
  "compliance",
  "cumplimiento",
  "margin_rate",
  "margen_pct",
  "insight",
]) {
  assert.ok(
    !inputsTable.toLowerCase().includes(calculatedColumn),
    `${calculatedColumn} must not be stored as a manual physiotherapy input.`,
  );
}

for (const insightField of [
  "rule_key",
  "severity",
  "kpi_id",
  "context",
  "message",
  "recommended_action",
]) {
  assert.ok(
    migration.includes(insightField),
    `Generated insights must persist ${insightField}.`,
  );
}

assert.ok(
  analytics.includes("function shouldUsePostgresPersistence()") &&
    analytics.includes("!isDemoRuntimeEnvironment()"),
  "PostgreSQL persistence must be the default outside APP_ENV=demo.",
);
assert.ok(
  analytics.includes("getPostgresPool"),
  "Physiotherapy persistence must use the server-side PostgreSQL pool.",
);
assert.ok(
  analytics.includes("saveDemoPhysiotherapyClosureDraft") &&
    analytics.includes("savePostgresPhysiotherapyClosureDraft"),
  "Demo fallback and PostgreSQL persistence must stay explicitly separated.",
);

for (const exportedFunction of [
  "getPhysiotherapyWorkspace",
  "savePhysiotherapyClosureDraft",
  "validatePhysiotherapyClosureDraft",
  "publishPhysiotherapyClosure",
  "upsertPhysiotherapyTarget",
]) {
  assert.ok(
    analytics.includes(`export async function ${exportedFunction}`),
    `${exportedFunction} must support async persistence.`,
  );
}

for (const routePath of [
  "app/api/physiotherapy/closures/route.ts",
  "app/api/physiotherapy/closures/[closureId]/validate/route.ts",
  "app/api/physiotherapy/closures/[closureId]/publish/route.ts",
  "app/api/physiotherapy/targets/route.ts",
]) {
  const route = read(routePath);

  assert.ok(
    route.includes("requireProtectedAccess"),
    `${routePath} must keep server-side auth.`,
  );
  assert.ok(
    route.includes("await getPhysiotherapyWorkspace") ||
      route.includes("await savePhysiotherapyClosureDraft") ||
      route.includes("await validatePhysiotherapyClosureDraft") ||
      route.includes("await publishPhysiotherapyClosure") ||
      route.includes("await upsertPhysiotherapyTarget"),
    `${routePath} must await persistent physiotherapy operations.`,
  );
}

assert.ok(
  packageJson.includes("physiotherapy-persistence-contract.test.mjs"),
  "The persistence contract test must be part of npm test.",
);
