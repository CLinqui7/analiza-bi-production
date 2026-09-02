import { readFileSync, statSync } from "node:fs";
import {
  calculateAppointmentRates,
  calculateOccupancy,
  formatPercent,
  formatPercentagePoints,
  safeRatio,
} from "../lib/analytics/operations.ts";
import {
  getKpisForBusinessLine,
  safeDivide,
} from "../lib/analytics/kpi-registry.ts";

const migrationPath = "supabase/migrations/20260720000200_phase3_operations.sql";
const semanticMigrationPath =
  "supabase/migrations/20260721000100_semantic_ecosystem.sql";
const operationsComponentPath = "components/operations-modules.tsx";
const businessLineOperationsPath = "lib/analytics/business-line-operations.ts";

statSync(migrationPath);
statSync(semanticMigrationPath);
statSync(operationsComponentPath);
statSync(businessLineOperationsPath);

const migration = readFileSync(migrationPath, "utf8");
const semanticMigration = readFileSync(semanticMigrationPath, "utf8");
const operationsComponent = readFileSync(operationsComponentPath, "utf8");
const businessLineOperations = readFileSync(businessLineOperationsPath, "utf8");

for (const table of [
  "appointment_status_catalog",
  "professionals",
  "professional_schedules",
  "anonymous_patients",
  "appointments",
  "appointment_status_history",
  "capacity_records",
  "service_events",
]) {
  if (!migration.includes(`create table public.${table}`)) {
    throw new Error(`Missing Phase 3 table: ${table}`);
  }

  if (!migration.includes(`alter table public.${table} enable row level security`)) {
    throw new Error(`Missing Phase 3 RLS enablement: ${table}`);
  }
}

for (const status of [
  "scheduled",
  "confirmed",
  "arrived",
  "in_progress",
  "completed",
  "cancelled_by_patient",
  "cancelled_by_branch",
  "no_show",
  "rescheduled",
  "failed",
  "pending",
  "unknown",
]) {
  if (!migration.includes(`('${status}'`)) {
    throw new Error(`Missing normalized appointment status: ${status}`);
  }
}

const occupancy = calculateOccupancy({
  availableMinutes: 100,
  scheduledMinutes: 80,
  attendedMinutes: 65,
});

if (occupancy.scheduledOccupancy !== 0.8) {
  throw new Error("Scheduled occupancy formula is incorrect.");
}

if (occupancy.effectiveOccupancy !== 0.65) {
  throw new Error("Effective occupancy formula is incorrect.");
}

if (occupancy.attendanceGap !== 0.15000000000000002) {
  throw new Error("Attendance gap formula is incorrect.");
}

const emptyOccupancy = calculateOccupancy({
  availableMinutes: 0,
  scheduledMinutes: 80,
  attendedMinutes: 65,
});

if (emptyOccupancy.scheduledOccupancy !== null) {
  throw new Error("Capacity gaps must return null when capacity is missing.");
}

const rates = calculateAppointmentRates({
  scheduledApplicable: 10,
  completed: 7,
  cancelled: 1,
  noShow: 1,
  rescheduled: 1,
});

if (
  rates.completionRate !== 0.7 ||
  rates.cancellationRate !== 0.1 ||
  rates.noShowRate !== 0.1 ||
  rates.rescheduleRate !== 0.1
) {
  throw new Error("Appointment rate formulas are incorrect.");
}

if (safeRatio(1, 0) !== null) {
  throw new Error("safeRatio must return null for zero denominator.");
}

if (safeDivide(1, 0) !== null) {
  throw new Error("safeDivide must return null for zero denominator.");
}

if (safeDivide(Number.NaN, 10) !== null) {
  throw new Error("safeDivide must reject non-finite numerators.");
}

if (formatPercent(0.875) !== "88%") {
  throw new Error("formatPercent should round to whole percentages by default.");
}

if (formatPercentagePoints(0.09) !== "9 pp") {
  throw new Error("formatPercentagePoints should format percentage points.");
}

for (const requiredText of [
  "Rendimiento de Gerentes",
  "Pendiente de cargar capacidad disponible",
  "Estados normalizados",
  "Ocupacion agendada",
  "orden_creada",
  "resultado_validado",
  "Datos pendientes de conexion; no se interpreta como cero operativo",
  "KPI Registry conectado",
]) {
  if (!operationsComponent.includes(requiredText)) {
    throw new Error(`Missing Phase 3 UI text: ${requiredText}`);
  }
}

for (const requiredBusinessLineText of [
  "Ordenes y pacientes",
  "Utilizacion de capacidad tecnica",
  "Laboratorio no muestra no-show salvo que exista un proceso especifico de reserva.",
  "utilizacion_analizador = pruebas_procesadas / capacidad_tecnica_disponible",
]) {
  if (!businessLineOperations.includes(requiredBusinessLineText)) {
    throw new Error(
      `Missing business-line operation text: ${requiredBusinessLineText}`,
    );
  }
}

const labOperationalKpis = getKpisForBusinessLine("LABORATORY", "operation");

if (!labOperationalKpis.some((kpi) => kpi.code === "LAB_ORDERS_TOTAL")) {
  throw new Error("Laboratory operation KPIs must be based on orders.");
}

if (
  labOperationalKpis.some((kpi) =>
    kpi.name.toLowerCase().includes("no-show"),
  )
) {
  throw new Error("Laboratory KPI registry should not model no-show by default.");
}

for (const table of [
  "business_lines",
  "managers",
  "channels",
  "payers",
  "date_dimension",
  "kpi_definitions",
  "import_jobs",
  "data_quality_issues",
  "insights",
  "goals",
  "fact_financial",
  "fact_lab_orders",
  "fact_lab_order_tests",
  "fact_lab_samples",
  "fact_lab_results",
  "fact_physio_appointments",
  "fact_physio_sessions",
  "fact_imaging_appointments",
  "fact_imaging_studies",
  "fact_equipment_usage",
]) {
  if (!semanticMigration.includes(`create table public.${table}`)) {
    throw new Error(`Missing semantic ecosystem table: ${table}`);
  }

  const hasDirectRls = semanticMigration.includes(
    `alter table public.${table} enable row level security`,
  );
  const hasDynamicRls =
    semanticMigration.includes(`'${table}'`) &&
    semanticMigration.includes("alter table public.%I enable row level security");

  if (!hasDirectRls && !hasDynamicRls) {
    throw new Error(`Missing semantic ecosystem RLS enablement: ${table}`);
  }
}

for (const requiredSemanticText of [
  "current_user_can_access_semantic_context",
  "row_number integer",
  "column_name text",
  "reason text not null",
  "currency_code char(3) not null",
  "tax_amount numeric",
  "exchange_rate numeric",
  "unique_patient_key",
  "'read assigned ' || fact_table",
  "'operations manage ' || fact_table",
]) {
  if (!semanticMigration.includes(requiredSemanticText)) {
    throw new Error(`Semantic ecosystem is missing: ${requiredSemanticText}`);
  }
}

console.log("Phase 3 operations checks passed.");
