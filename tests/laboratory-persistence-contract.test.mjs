import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/20260810000200_laboratory_closing_persistence.sql";
const servicePath = "lib/analytics/laboratory-closures.ts";
const dashboardPath = "components/laboratory-vertical-dashboard.tsx";

function read(path) {
  return readFileSync(`${root}/${path}`, "utf8");
}

const migration = read(migrationPath);
const service = read(servicePath);
const dashboard = read(dashboardPath);
const packageJson = read("package.json");

for (const sharedTable of [
  "monthly_closings",
  "closing_versions",
  "closing_validation_results",
  "closing_kpi_results",
  "kpi_targets",
  "generated_insights",
  "closing_audit_events",
]) {
  assert.ok(
    `${migration}\n${service}`.includes(sharedTable),
    `Laboratory migration must reuse or extend ${sharedTable}.`,
  );
}

assert.ok(
  migration.includes("create table public.laboratory_closing_inputs"),
  "Laboratory migration must add only the line-specific source input table.",
);

for (const table of [
  "monthly_closings",
  "closing_versions",
  "kpi_targets",
  "generated_insights",
  "closing_audit_events",
]) {
  assert.ok(
    migration.includes(`alter table public.${table}`) &&
      migration.includes("'LABORATORY'"),
    `${table} must allow LABORATORY business_line values.`,
  );
}

assert.ok(
  migration.includes("enable row level security") &&
    migration.includes("current_user_can_access_branch") &&
    migration.includes("current_user_has_role"),
  "Laboratory source inputs must keep RLS and branch-scoped authorization.",
);

for (const inputColumn of [
  "revenue_total",
  "cost_of_sales",
  "orders_total",
  "clients_total",
  "profiles_total",
  "processed_tests",
  "average_turnaround_time_hours",
  "rejected_tests",
  "reprocessed_tests",
  "technical_capacity_tests",
]) {
  assert.ok(
    migration.includes(inputColumn),
    `Laboratory inputs must persist ${inputColumn}.`,
  );
}

for (const calculatedColumn of [
  "occupancy",
  "compliance",
  "margin_rate",
  "insight",
  "target_value",
]) {
  const tableBlock = migration.slice(
    migration.indexOf("create table public.laboratory_closing_inputs"),
    migration.indexOf("create index laboratory_closing_inputs_version_idx"),
  );

  assert.ok(
    !tableBlock.includes(calculatedColumn),
    `${calculatedColumn} must not be stored as a manual laboratory input.`,
  );
}

assert.ok(
  service.includes("business_line = 'LABORATORY'") &&
    service.includes("co.unit_type = 'laboratorio'") &&
    service.includes("getPostgresPool") &&
    service.includes("isDemoRuntimeEnvironment"),
  "Laboratory service must use the common persistence engine outside demo.",
);

for (const clinicalKpi of [
  "ocupacion_efectiva",
  "tasa_no_show",
  "sesiones_total",
]) {
  assert.ok(
    !service.includes(clinicalKpi) && !dashboard.includes(clinicalKpi),
    `${clinicalKpi} must not appear in the Laboratory vertical.`,
  );
}

for (const laboratoryKpi of [
  "facturacion_neta",
  "cumplimiento_facturacion",
  "pruebas_procesadas",
  "pruebas_por_paciente",
  "ingreso_por_prueba",
  "costo_por_prueba",
  "margen_contribucion",
  "porcentaje_margen",
  "productividad_personal",
  "throughput",
  "cumplimiento_meta_produccion",
  "tat_promedio",
  "tasa_rechazo",
  "tasa_reproceso",
  "utilizacion_tecnica",
]) {
  assert.ok(
    service.includes(laboratoryKpi),
    `Laboratory service must define KPI ${laboratoryKpi}.`,
  );
}

for (const routePath of [
  "app/api/laboratory/closures/route.ts",
  "app/api/laboratory/closures/[closureId]/validate/route.ts",
  "app/api/laboratory/closures/[closureId]/publish/route.ts",
  "app/api/laboratory/targets/route.ts",
]) {
  const route = read(routePath);

  assert.ok(
    route.includes("requireProtectedAccess"),
    `${routePath} must enforce authenticated server-side access.`,
  );
  assert.ok(
    route.includes("Laboratory"),
    `${routePath} must call the Laboratory service contract.`,
  );
}

assert.ok(
  packageJson.includes("laboratory-vertical.test.mjs") &&
    packageJson.includes("laboratory-persistence-contract.test.mjs"),
  "npm test must include the Laboratory vertical and persistence contract tests.",
);
