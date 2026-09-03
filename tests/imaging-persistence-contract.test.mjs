import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/20260810000300_imaging_closing_persistence.sql";
const servicePath = "lib/analytics/imaging-closures.ts";
const dashboardPath = "components/imaging-vertical-dashboard.tsx";

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
    `Imaging migration must reuse or extend ${sharedTable}.`,
  );
}

assert.ok(
  migration.includes("create table public.imaging_closing_inputs"),
  "Imaging migration must add only the line-specific source input table.",
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
      migration.includes("'IMAGING'"),
    `${table} must allow IMAGING business_line values.`,
  );
}

assert.ok(
  migration.includes("enable row level security") &&
    migration.includes("current_user_can_access_branch") &&
    migration.includes("current_user_has_role"),
  "Imaging source inputs must keep RLS and branch-scoped authorization.",
);

for (const inputColumn of [
  "revenue_total",
  "cost_of_sales",
  "orders_total",
  "clients_total",
  "xray_studies",
  "xray_revenue",
  "ct_studies",
  "ct_revenue",
  "ultrasound_studies",
  "ultrasound_revenue",
  "doppler_studies",
  "doppler_revenue",
  "caaf_studies",
  "caaf_revenue",
  "extra_plates_count",
  "report_reading_count",
  "pending_reports",
  "average_report_tat_hours",
  "equipment_available_hours",
  "equipment_used_hours",
  "equipment_downtime_hours",
]) {
  assert.ok(
    migration.includes(inputColumn),
    `Imaging inputs must persist ${inputColumn}.`,
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
    migration.indexOf("create table public.imaging_closing_inputs"),
    migration.indexOf("create index imaging_closing_inputs_version_idx"),
  );

  assert.ok(
    !tableBlock.includes(calculatedColumn),
    `${calculatedColumn} must not be stored as a manual imaging input.`,
  );
}

assert.ok(
  service.includes("business_line = 'IMAGING'") &&
    service.includes("co.unit_type = 'imagenes'") &&
    service.includes("getMissingDatabaseConfig().length === 0") &&
    service.includes("isDemoRuntimeEnvironment"),
  "Imaging service must avoid direct PostgreSQL when only Supabase V7 is configured.",
);

for (const clinicalKpi of [
  "ocupacion_efectiva",
  "sesiones_total",
  "pruebas_procesadas",
  "perfiles_total",
]) {
  assert.ok(
    !service.includes(clinicalKpi) && !dashboard.includes(clinicalKpi),
    `${clinicalKpi} must not appear in the Imaging vertical.`,
  );
}

for (const imagingKpi of [
  "facturacion_neta",
  "cumplimiento_facturacion",
  "estudios_realizados",
  "estudios_por_paciente",
  "tasa_finalizacion",
  "tasa_cancelacion",
  "tasa_no_show",
  "ingreso_por_estudio",
  "costo_por_estudio",
  "margen_contribucion",
  "porcentaje_margen",
  "productividad",
  "estudios_por_modalidad",
  "mix_modalidades",
  "informes_pendientes",
  "utilizacion_equipo",
  "utilizacion_modalidad",
  "downtime_rate",
  "tat_realizacion",
  "tat_informe",
]) {
  assert.ok(
    service.includes(imagingKpi),
    `Imaging service must define KPI ${imagingKpi}.`,
  );
}

for (const routePath of [
  "app/api/imaging/closures/route.ts",
  "app/api/imaging/closures/[closureId]/validate/route.ts",
  "app/api/imaging/closures/[closureId]/publish/route.ts",
  "app/api/imaging/targets/route.ts",
]) {
  const route = read(routePath);

  assert.ok(
    route.includes("requireProtectedAccess"),
    `${routePath} must enforce authenticated server-side access.`,
  );
  assert.ok(
    route.includes("Imaging"),
    `${routePath} must call the Imaging service contract.`,
  );
}

assert.ok(
  packageJson.includes("imaging-vertical.test.mjs") &&
    packageJson.includes("imaging-persistence-contract.test.mjs"),
  "npm test must include the Imaging vertical and persistence contract tests.",
);
