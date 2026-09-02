import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

import {
  allBranchesValue,
  allChannelsValue,
  allManagersValue,
  allOperationalAreasValue,
  allPayersValue,
  allProfessionalsValue,
  allServicesValue,
  createGlobalFilterContextFromSearchParams,
  toGlobalFilterSearchParams,
} from "../lib/analytics/global-filters.ts";
import {
  areFinanceInvariantsPassing,
  getExecutiveBiSnapshot,
  semanticKpiContracts,
  semanticMessages,
} from "../lib/analytics/semantic-bi.ts";
import {
  createDemoAiResponse,
  demoInsights,
  getDefaultInsightFilters,
} from "../lib/analytics/insights.ts";

const countryElSalvador = "30000000-0000-4000-8000-000000000003";
const labCompany = "40000000-0000-4000-8000-000000000002";
const labLine = "business-line-laboratorio";

for (const file of [
  "lib/analytics/global-filters.ts",
  "lib/analytics/analytics-intelligence.ts",
  "lib/analytics/semantic-bi.ts",
  "lib/analytics/branch-network.ts",
  "components/executive-dashboard.tsx",
  "components/branch-network-dashboard.tsx",
  "components/analytics-comparison-chart.tsx",
  "components/financial-health-dashboard.tsx",
  "components/capacity-occupancy-dashboard.tsx",
  "components/data-quality-analia-dashboard.tsx",
  "lib/analytics/insights.ts",
]) {
  statSync(file);
}

const deepLinkContext = createGlobalFilterContextFromSearchParams(
  new URLSearchParams({
    branch: "sv-aguilares-l033",
    channel: allChannelsValue,
    company: labCompany,
    country: countryElSalvador,
    from: "2026-07-01",
    line: labLine,
    manager: allManagersValue,
    area: allOperationalAreasValue,
    payer: allPayersValue,
    professional: allProfessionalsValue,
    service: allServicesValue,
    to: "2026-07-15",
  }),
);

assert.equal(deepLinkContext.countryId, countryElSalvador);
assert.equal(deepLinkContext.companyId, labCompany);
assert.equal(deepLinkContext.businessLineId, labLine);
assert.equal(deepLinkContext.branchId, "sv-aguilares-l033");
assert.equal(deepLinkContext.operationalAreaId, allOperationalAreasValue);
assert.equal(deepLinkContext.periodStart, "2026-07-01");
assert.equal(deepLinkContext.periodEnd, "2026-07-15");

const roundTripParams = toGlobalFilterSearchParams(deepLinkContext);
assert.equal(roundTripParams.get("branch"), "sv-aguilares-l033");
assert.equal(roundTripParams.get("from"), "2026-07-01");
assert.equal(roundTripParams.get("to"), "2026-07-15");
assert.equal(roundTripParams.get("area"), allOperationalAreasValue);
assert.equal(roundTripParams.get("professional"), allProfessionalsValue);
assert.equal(roundTripParams.get("service"), allServicesValue);
assert.equal(roundTripParams.get("payer"), allPayersValue);

for (const contract of semanticKpiContracts) {
  for (const requiredField of [
    "id",
    "version",
    "name",
    "executiveDefinition",
    "formula",
    "numerator",
    "denominator",
    "grain",
    "unit",
    "source",
    "comparisonPeriod",
    "target",
    "missingDataBehavior",
  ]) {
    assert.ok(contract[requiredField], `${contract.id} missing ${requiredField}`);
  }

  assert.ok(contract.supportedDimensions.includes("branch"));
  assert.ok(contract.supportedFilters.includes("date_from"));
  assert.ok(contract.supportedFilters.includes("date_to"));
}

const labAll = getExecutiveBiSnapshot({
  branchId: allBranchesValue,
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  periodEnd: "2026-07-31",
  periodStart: "2026-07-01",
});
const labBranch = getExecutiveBiSnapshot({
  branchId: "sv-aguilares-l033",
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  periodEnd: "2026-07-31",
  periodStart: "2026-07-01",
});
const labBranchHalfMonth = getExecutiveBiSnapshot({
  branchId: "sv-aguilares-l033",
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  periodEnd: "2026-07-15",
  periodStart: "2026-07-01",
});
const labAllHalfMonth = getExecutiveBiSnapshot({
  branchId: allBranchesValue,
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  periodEnd: "2026-07-15",
  periodStart: "2026-07-01",
});
const managedBranchWithLoadedResults = getExecutiveBiSnapshot({
  branchId: "managed-sv-laboratory-ss-santa-tecla-l011",
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  periodEnd: "2026-07-31",
  periodStart: "2026-07-01",
});
const loadedLaboratoryArea = getExecutiveBiSnapshot({
  branchId: allBranchesValue,
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  operationalAreaId:
    "managed-area-sv-laboratory-centro-ana-maria-rivera-monroy",
  periodEnd: "2026-07-31",
  periodStart: "2026-07-01",
});
const escalonWithoutLoadedResults = getExecutiveBiSnapshot({
  branchId: "managed-sv-laboratory-ss-escalon-l001",
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  periodEnd: "2026-07-31",
  periodStart: "2026-07-01",
});

assert.equal(labAll.lines.length, 1);
assert.equal(labBranch.lines.length, 1);
assert.equal(labBranch.lines[0].branchName, "SS - Aguilares - L033");
assert.ok(labBranch.lines[0].finance.netBilling < labAll.lines[0].finance.netBilling);
assert.ok(
  labBranchHalfMonth.lines[0].finance.netBilling <
    labBranch.lines[0].finance.netBilling,
  "Date range must recalculate BI facts.",
);
assert.ok(
  labAllHalfMonth.branchRows[0].revenue < labAll.branchRows[0].revenue,
  "Date range must recalculate executive branch rows.",
);
assert.equal(managedBranchWithLoadedResults.lines.length, 1);
assert.equal(
  managedBranchWithLoadedResults.lines[0].branchName,
  "SS - Santa Tecla - L011",
);
assert.ok(
  managedBranchWithLoadedResults.lines[0].finance.netBilling <
    labAll.lines[0].finance.netBilling,
  "Managed branch filters must resolve loaded laboratory templates.",
);
assert.equal(loadedLaboratoryArea.lines.length, 1);
assert.equal(
  loadedLaboratoryArea.lines[0].scopeName,
  "Centro - Ana Maria Rivera Monroy",
);
assert.ok(
  loadedLaboratoryArea.branchRows.length > 0 &&
    loadedLaboratoryArea.branchRows.length <= labAll.branchRows.length,
  "Loaded area filters must keep only matching laboratory branch rows.",
);
assert.equal(escalonWithoutLoadedResults.lines.length, 0);
assert.equal(escalonWithoutLoadedResults.noDataReason, semanticMessages.noData);
assert.ok(
  labAll.branchRows.every(
    (row) =>
      typeof row.normalizedPerformanceScore === "number" &&
      row.normalizedPerformanceScore >= 0 &&
      row.normalizedPerformanceScore <= 100,
  ),
  "Executive branch rows must expose a normalized comparable score.",
);
assert.ok(
  labAll.branchRows.some((row) => (row.outlierFlags ?? []).length > 0),
  "Executive branch rows must mark outliers instead of removing them.",
);
assert.ok(
  labAll.managerRows.every(
    (row) =>
      typeof row.normalizedPerformanceScore === "number" &&
      row.comparisonBasis?.includes("no suma por volumen"),
  ),
  "Executive manager rows must summarize normalized performance by assigned branches.",
);

for (const line of labAll.lines) {
  assert.equal(areFinanceInvariantsPassing(line.finance), true);
  assert.equal(
    line.finance.channelRevenue.reduce((sum, item) => sum + item.amount, 0),
    line.finance.netBilling,
  );
  assert.equal(
    line.finance.paymentCollections.reduce((sum, item) => sum + item.amount, 0),
    line.finance.collections,
  );
  assert.notEqual(line.finance.contributionMarginRate, null);
  assert.ok(Number.isFinite(line.finance.contributionMarginRate));
}

const consolidated = getExecutiveBiSnapshot({
  branchId: allBranchesValue,
  companyId: "__consolidated__",
  countryId: countryElSalvador,
  periodEnd: "2026-07-31",
  periodStart: "2026-07-01",
});
const labCapacity = consolidated.lines.find((line) => line.key === "laboratorio");
const physioCapacity = consolidated.lines.find((line) => line.key === "fisioterapia");
const imagingCapacity = consolidated.lines.find((line) => line.key === "imagenes");

assert.ok(labCapacity);
assert.equal(labCapacity.capacity.noShowRate, null);
assert.match(labCapacity.capacity.pendingMessage ?? "", /utilizacion tecnica/i);
assert.ok(physioCapacity?.capacity.noShowRate);
assert.ok(physioCapacity.capacity.conversionGapPoints);
assert.ok(imagingCapacity?.capacity.pendingMessage === undefined);

const unsupportedGranularFilter = getExecutiveBiSnapshot({
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  periodEnd: "2026-07-31",
  periodStart: "2026-07-01",
  professionalId: "prof-lab-flebotomia-sv",
});

assert.equal(unsupportedGranularFilter.lines.length, 0);
assert.match(unsupportedGranularFilter.noDataReason ?? "", /profesional/i);
assert.equal(
  unsupportedGranularFilter.kpis.some((kpi) => kpi.status === "blocked"),
  true,
);

const qualityBranch = getExecutiveBiSnapshot({
  branchId: "sv-constitucion-l009",
  businessLineId: labLine,
  companyId: labCompany,
  countryId: countryElSalvador,
  periodEnd: "2026-07-31",
  periodStart: "2026-07-01",
});

assert.equal(qualityBranch.lines[0].qualityLevel, "Revisar");
assert.equal(
  qualityBranch.lines[0].qualityRules.some(
    (rule) => rule.dimension === "consistency" && !rule.passed,
  ),
  true,
);

const blockedInsightResponse = createDemoAiResponse({
  filters: getDefaultInsightFilters(),
  mode: "Consultar",
  question: "Que paso con la hoja de evaluacion?",
  roleLabel: "CEO",
  scopedInsights: demoInsights,
});

assert.match(
  blockedInsightResponse.directAnswer,
  /Datos insuficientes para conclusion ejecutiva/,
);
assert.ok(blockedInsightResponse.confidence <= 64);
assert.equal(
  blockedInsightResponse.limitations.some((limitation) =>
    limitation.includes("Datos insuficientes"),
  ),
  true,
);

const executiveDashboard = readFileSync("components/executive-dashboard.tsx", "utf8");
const financialDashboard = readFileSync(
  "components/financial-health-dashboard.tsx",
  "utf8",
);
const capacityDashboard = readFileSync(
  "components/capacity-occupancy-dashboard.tsx",
  "utf8",
);
const dataQualityDashboard = readFileSync(
  "components/data-quality-analia-dashboard.tsx",
  "utf8",
);
const branchNetworkDashboard = readFileSync(
  "components/branch-network-dashboard.tsx",
  "utf8",
);
const branchNetworkAnalytics = readFileSync(
  "lib/analytics/branch-network.ts",
  "utf8",
);
const comparisonChart = readFileSync(
  "components/analytics-comparison-chart.tsx",
  "utf8",
);
const analyticsReview = readFileSync(
  "docs/analytics-review/data-science-bi-review.md",
  "utf8",
);

for (const requiredText of [
  "Tabla ejecutiva por sucursal",
  "Tabla ejecutiva por gerente",
  "Sin datos disponibles para este filtro",
  "Puntaje comparable",
  "Base",
  "Atipicos",
]) {
  assert.ok(executiveDashboard.includes(requiredText));
}

assert.ok(financialDashboard.includes("Margen contribucion"));
assert.ok(capacityDashboard.includes("CapacityNoDataState"));
assert.ok(dataQualityDashboard.includes("Datos que el sistema sugiere revisar"));
assert.ok(dataQualityDashboard.includes("Datos que podríamos recopilar"));
assert.ok(branchNetworkDashboard.includes('useState<SortKey>("normalizedPerformanceScore")'));
assert.ok(branchNetworkDashboard.includes("Puntaje comparable"));
assert.ok(branchNetworkDashboard.includes("Base comparable"));
assert.ok(branchNetworkAnalytics.includes("normalizedPerformanceScore"));
assert.ok(branchNetworkAnalytics.includes("outlierFlags"));
assert.ok(comparisonChart.includes("isBenchmarkSeries"));
assert.ok(comparisonChart.includes("strokeDasharray={benchmarkSeries"));
assert.ok(analyticsReview.includes("No comparar solo facturacion"));
assert.ok(analyticsReview.includes("Score Comparable"));

console.log("Macro Sprint 2 BI integrity checks passed.");
