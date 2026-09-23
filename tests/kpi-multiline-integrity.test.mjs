import assert from "node:assert/strict";

import { calculateOfficialKpis } from "../lib/analytics/official-kpi-engine.ts";
import {
  aggregateContractMetric,
  finiteMetricNumber,
  selectContractMetrics,
  selectOfficialVersions,
} from "../lib/analytics/official-kpi-contracts.ts";
import { formatPercentage } from "../lib/analytics/metric-format.ts";
import { anyScopeGrantAllows, distinctBranchLineUnits } from "../lib/tenant/multiline-scope.ts";

function row(overrides) {
  return {
    closing_version_id: "version-a",
    data_status: "CALCULATED",
    denominator: null,
    formula_version: "fixture:v1",
    kpi_code: "reported_revenue",
    kpi_name: "Facturación neta reportada",
    numerator: null,
    unit: "USD",
    value: 0,
    ...overrides,
  };
}

const calculated = calculateOfficialKpis({ net_revenue: 390, direct_costs: 74.5, revenue_target: 500 });
assert.equal(calculated.find((item) => item.code === "reported_revenue")?.value, 390);
assert.equal(calculated.find((item) => item.code === "estimated_contribution_margin")?.unit, "USD");
assert.equal(calculated.find((item) => item.code === "estimated_contribution_margin_pct")?.unit, "%");

const ambiguousOrder = [
  row({ kpi_code: "revenue_target_achievement", kpi_name: "Cumplimiento", unit: "%", value: 78 }),
  row({ kpi_code: "estimated_contribution_margin", kpi_name: "Margen monetario", value: 315.5 }),
  row({ kpi_code: "estimated_contribution_margin_pct", kpi_name: "Margen %", unit: "%", value: 80.8926, numerator: 315.5, denominator: 390 }),
  row({ kpi_code: "reported_revenue", value: 390 }),
];
for (const rows of [ambiguousOrder, [...ambiguousOrder].reverse()]) {
  const selected = selectContractMetrics(rows, "LABORATORY").metrics;
  assert.equal(selected.revenue?.code, "reported_revenue", "Cumplimiento no debe convertirse en facturación.");
  assert.equal(selected.revenue?.value, 390);
  assert.equal(selected.margin?.code, "estimated_contribution_margin_pct", "El importe de margen no debe mostrarse como porcentaje.");
  assert.equal(selected.margin?.value, 80.8926);
}

const historicalSelection = selectContractMetrics([
  row({ kpi_code: "revenue_target_achievement", kpi_name: "Cumplimiento", unit: "%", value: 78 }),
  row({ kpi_code: "estimated_contribution_margin_pct", kpi_name: "Margen %", unit: "%", value: 80.8926, numerator: 315.5, denominator: 390, formula_version: "(reported_revenue-direct_costs)/reported_revenue:v1" }),
], "LABORATORY").metrics;
assert.equal(historicalSelection.revenue?.value, 390, "El cierre histórico conserva su facturación en la base contractual del margen.");

const documentSelection = selectContractMetrics([
  row({
    kpi_code: "lab_medical_exam_report_sales",
    kpi_name: "Venta en reporte de exámenes médicos",
    unit: "USD",
    value: 245.75,
  }),
], "LABORATORY").metrics;
assert.equal(documentSelection.documentSales?.value, 245.75, "La venta extraída del Excel se conserva como métrica separada.");
assert.equal(documentSelection.revenue, undefined, "Una venta documental parcial no sustituye la facturación oficial.");
assert.equal(
  selectContractMetrics([row({ kpi_code: "lab_medical_exam_report_sales", value: 245.75 })], "PHYSIOTHERAPY").metrics.documentSales,
  undefined,
  "El contrato documental de laboratorio no cruza líneas de negocio.",
);
const warnedDocumentSelection = selectContractMetrics([
  row({
    kpi_code: "lab_medical_exam_report_sales",
    lineage: [{ validation_codes: ["ROW_LIMIT_50000_APPLIED"] }],
    value: 567113.61,
  }),
], "LABORATORY").metrics.documentSales;
assert.equal(warnedDocumentSelection?.coverage, "partial", "Una advertencia del parser impide declarar cobertura documental completa.");
assert.deepEqual(warnedDocumentSelection?.validationCodes, ["ROW_LIMIT_50000_APPLIED"]);

const marginA = selectContractMetrics([
  row({ closing_version_id: "a", kpi_code: "estimated_contribution_margin_pct", kpi_name: "Margen %", numerator: 400, denominator: 1000, unit: "%", value: 40 }),
], "LABORATORY").metrics.margin;
const marginB = selectContractMetrics([
  row({ closing_version_id: "b", kpi_code: "estimated_contribution_margin_pct", kpi_name: "Margen %", numerator: 1800, denominator: 9000, unit: "%", value: 20 }),
], "LABORATORY").metrics.margin;
const consolidatedMargin = aggregateContractMetric([marginA, marginB], 2);
assert.equal(consolidatedMargin?.numerator, 2200);
assert.equal(consolidatedMargin?.denominator, 10000);
assert.equal(consolidatedMargin?.value, 22, "El margen consolidado debe ponderarse por ingresos, no promediar porcentajes.");
assert.equal(aggregateContractMetric([marginA, undefined], 2), null, "Una línea sin base impide presentar un margen consolidado parcial.");

const partialRevenue = aggregateContractMetric([
  selectContractMetrics([row({ closing_version_id: "a", kpi_code: "reported_revenue", value: 1100 })], "PHYSIOTHERAPY").metrics.revenue,
  selectContractMetrics([row({ closing_version_id: "b", kpi_code: "reported_revenue", value: 3100 })], "PHYSIOTHERAPY").metrics.revenue,
  undefined,
], 3);
assert.equal(partialRevenue?.value, 4200, "Las sumas conservan los datos oficiales disponibles.");
assert.equal(partialRevenue?.coverage, "partial", "Las sumas incompletas deben declarar cobertura parcial.");

const nestedPartialDocumentSales = aggregateContractMetric([
  aggregateContractMetric([documentSelection.documentSales, undefined], 2),
], 1);
assert.equal(nestedPartialDocumentSales?.coverage, "partial", "La agregación superior no debe ocultar cobertura documental parcial.");

const labVolume = selectContractMetrics([
  row({ kpi_code: "lab_total_orders", kpi_name: "Órdenes", unit: "ordenes", value: 10 }),
], "LABORATORY").metrics.volume;
const physioVolume = selectContractMetrics([
  row({ kpi_code: "physio_therapy_sessions", kpi_name: "Sesiones", unit: "sesiones", value: 20 }),
], "PHYSIOTHERAPY").metrics.volume;
assert.equal(aggregateContractMetric([labVolume, physioVolume], 2), null, "Órdenes y sesiones no son un volumen sumable.");

assert.equal(finiteMetricNumber(0), 0, "El cero real se conserva.");
assert.equal(finiteMetricNumber(null), null);
assert.equal(finiteMetricNumber(""), null);
assert.equal(finiteMetricNumber("   "), null);

const official = selectOfficialVersions([
  { id: "old", branch_id: "branch", business_line_id: "line", period_start: "2026-08-01", period_end: "2026-08-31", published_at: "2026-09-01T00:00:00Z", version_number: 1 },
  { id: "new", branch_id: "branch", business_line_id: "line", period_start: "2026-08-01", period_end: "2026-08-31", published_at: "2026-09-02T00:00:00Z", version_number: 2 },
  { id: "other-line", branch_id: "branch", business_line_id: "line-b", period_start: "2026-08-01", period_end: "2026-08-31", published_at: "2026-09-01T00:00:00Z", version_number: 1 },
]);
assert.deepEqual(official.map((item) => item.id).sort(), ["new", "other-line"]);

assert.equal(formatPercentage(22, "percentage_points"), "22.0%");
assert.equal(formatPercentage(0.5, "percentage_points"), "0.5%");
assert.equal(formatPercentage(1, "fraction"), "100.0%");
assert.equal(formatPercentage(0.5, "fraction"), "50.0%");

const grants = [
  { organizationId: "org", branchId: "branch-a", businessLineId: "line-a" },
  { organizationId: "org", branchId: "branch-b", businessLineId: "line-b" },
];
assert.equal(distinctBranchLineUnits(grants).length, 2, "La preferencia inicial no debe colapsar dos grants legítimos.");
assert.equal(anyScopeGrantAllows(grants, { organizationId: "org", branchId: "branch-a", businessLineId: "line-a" }), true);
assert.equal(anyScopeGrantAllows(grants, { organizationId: "org", branchId: "branch-b", businessLineId: "line-b" }), true);
assert.equal(anyScopeGrantAllows(grants, { organizationId: "org", branchId: "branch-a", businessLineId: "line-b" }), false, "Una combinación cruzada no autorizada debe fallar cerrada.");
assert.equal(anyScopeGrantAllows(grants, { organizationId: "org", branchId: "branch-c", businessLineId: "line-c" }), false, "El acceso directo a C debe denegarse.");

console.log("kpi-multiline-integrity: PASS");
