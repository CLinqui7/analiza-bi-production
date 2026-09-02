import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

import {
  getLaboratoryBranches,
  getLaboratoryWorkspace,
  publishLaboratoryClosure,
  resetLaboratoryClosureStoreForTests,
  saveLaboratoryClosureDraft,
  upsertLaboratoryTarget,
  validateLaboratoryClosureDraft,
} from "../lib/analytics/laboratory-closures.ts";
import { getDemoScopeForRole } from "../lib/auth/demo-scope.ts";
import { canAccessProtectedPath } from "../lib/security/authorization-policy.ts";

const originalAppEnv = process.env.APP_ENV;
process.env.APP_ENV = "demo";
process.on("exit", () => {
  if (originalAppEnv === undefined) {
    delete process.env.APP_ENV;
  } else {
    process.env.APP_ENV = originalAppEnv;
  }
});

const root = process.cwd();
const organizationId = "10000000-0000-4000-8000-000000000001";
const laboratoryCompanyId = "40000000-0000-4000-8000-000000000002";
const currentPeriod = "2026-08";

function readWorkspaceFile(path) {
  return readFileSync(`${root}/${path}`, "utf8");
}

function actor(roleKey, scope) {
  return {
    allowDemoRoleSwitch: false,
    email: `${roleKey}@analiza.local`,
    roleKey,
    scope: {
      organizationId,
      ...scope,
    },
    source: "demo",
    userId: `${roleKey}-lab-user`,
  };
}

function assertValidKpis(closure) {
  assert.ok(
    closure.kpiResults.length >= 17,
    "Laboratorio must calculate the non-duplicated MVP KPI set after validation.",
  );

  for (const kpi of closure.kpiResults) {
    assert.ok(
      kpi.status === "NOT_CALCULABLE" ||
        (typeof kpi.value === "number" && Number.isFinite(kpi.value)),
      `KPI ${kpi.id} must never expose NaN or Infinity.`,
    );
  }

  for (const forbiddenKpi of [
    "ocupacion_efectiva",
    "tasa_no_show",
    "sesiones_total",
    "throughput",
  ]) {
    assert.ok(
      !closure.kpiResults.some((kpi) => kpi.id === forbiddenKpi),
      `${forbiddenKpi} must not be reused by Laboratorio.`,
    );
  }
}

const laboratoryBranches = getLaboratoryBranches();
const branch = laboratoryBranches.find((candidate) => candidate.operationalAreaId);

assert.ok(branch, "Laboratorio must have a managed demo branch for tests.");
assert.equal(
  branch.companyId,
  laboratoryCompanyId,
  "The selected branch must belong to Analiza Laboratorio.",
);

assert.equal(
  getDemoScopeForRole("gerente_sucursal", "LABORATORY").companyId,
  laboratoryCompanyId,
  "Local DEMO login must support a server-side Laboratorio branch manager scope.",
);

const branchScope = {
  branchId: branch.id,
  companyId: branch.companyId,
  countryId: branch.countryId,
  operationalAreaId: branch.operationalAreaId,
};
const areaScope = {
  companyId: branch.companyId,
  countryId: branch.countryId,
  operationalAreaId: branch.operationalAreaId,
};
const operationsScope = {
  companyId: branch.companyId,
  countryId: branch.countryId,
};

const validPayload = (branchId) => ({
  branchId,
  inputs: {
    analizaOrders: 510,
    analizaRevenue: 36500,
    averageTurnaroundTimeHours: 26,
    cardRevenue: 35000,
    cashRevenue: 22000,
    clientsTotal: 890,
    closureObservations: "Cierre DEMO Laboratorio sin datos personales.",
    costOfSales: 43000,
    creditRevenue: 18000,
    customerServiceCount: 4,
    drsvClients: 180,
    drsvOrders: 220,
    drsvRevenue: 19500,
    homeServiceOrders: 85,
    homeServiceRevenue: 9000,
    mixedPaymentRevenue: 12000,
    nurseCount: 2,
    ordersTotal: 1350,
    phlebotomistCount: 6,
    processedTests: 3950,
    profilesTotal: 3280,
    referredOrders: 340,
    referredRevenue: 22000,
    rejectedTests: 72,
    reprocessedTests: 55,
    revenueTotal: 87000,
    technicalCapacityTests: 4600,
    technicalStaffCount: 7,
  },
  period: currentPeriod,
});

resetLaboratoryClosureStoreForTests();

const branchManager = actor("gerente_sucursal", branchScope);
const areaManager = actor("gerente_area", areaScope);
const operationsManager = actor("gerente_operaciones", operationsScope);
const ceo = actor("ceo", { organizationId });
const viewer = actor("viewer", operationsScope);

const initialBranchWorkspace = await getLaboratoryWorkspace(branchManager);
assert.equal(
  initialBranchWorkspace.branches.length,
  1,
  "Branch manager must only see its own laboratory branch.",
);
assert.equal(
  initialBranchWorkspace.canCreateClosure,
  true,
  "Branch manager must be able to create a laboratory monthly closure.",
);

const viewerWorkspace = await getLaboratoryWorkspace(viewer);
assert.equal(
  viewerWorkspace.canCreateClosure,
  false,
  "Viewer must not create laboratory monthly closures.",
);
await assert.rejects(
  () => saveLaboratoryClosureDraft(viewer, validPayload(branch.id)),
  /no puede crear ni publicar/,
  "Viewer must be blocked server-side from creating laboratory closures.",
);
assert.equal(
  canAccessProtectedPath(viewer, "/protected/cierres/nuevo"),
  false,
  "Viewer must not open the new closure route by direct URL.",
);

await upsertLaboratoryTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "facturacion_neta",
  period: currentPeriod,
  targetValue: 90000,
});
await upsertLaboratoryTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "perfiles_total",
  period: currentPeriod,
  targetValue: 3400,
});
await upsertLaboratoryTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "margen_contribucion",
  period: currentPeriod,
  targetValue: 47000,
});
await upsertLaboratoryTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "tat_promedio",
  period: currentPeriod,
  targetValue: 24,
});
await upsertLaboratoryTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "tasa_rechazo",
  period: currentPeriod,
  targetValue: 0.015,
});

const missingProcessedDraft = await saveLaboratoryClosureDraft(branchManager, {
  ...validPayload(branch.id),
  inputs: {
    ...validPayload(branch.id).inputs,
    processedTests: "",
  },
});
const missingProcessedValidation =
  await validateLaboratoryClosureDraft(branchManager, missingProcessedDraft.id);
assert.equal(
  missingProcessedValidation.validation.errors.length,
  0,
  "Missing proposed processed tests must not block the MVP closure.",
);
assert.ok(
  missingProcessedValidation.validation.warnings.some(
    (issue) => issue.code === "proposed.processed_tests_missing",
  ),
  "Missing processed tests must be visible as a proposed-source warning.",
);
assert.equal(
  missingProcessedValidation.kpiResults.find(
    (kpi) => kpi.id === "pruebas_procesadas",
  )?.status,
  "NOT_CALCULABLE",
  "Missing processed tests must keep dependent KPIs not calculable.",
);

const draft = await saveLaboratoryClosureDraft(
  branchManager,
  validPayload(branch.id),
);
assert.equal(draft.status, "draft", "First save must persist a draft.");

const validated = await validateLaboratoryClosureDraft(branchManager, draft.id);
assert.equal(
  validated.validation.errors.length,
  0,
  "Valid laboratory closure must pass server-side validation.",
);
assertValidKpis(validated);

const published = await publishLaboratoryClosure(branchManager, draft.id);
assert.equal(published.status, "published", "Validated closure must publish.");
assert.equal(
  published.isDemo,
  true,
  "Laboratory demo flow must remain explicitly DEMO in demo runtime.",
);
assertValidKpis(published);
assert.ok(
  published.targetComparisons.some(
    (comparison) => comparison.kpiId === "facturacion_neta",
  ),
  "Published laboratory closure must include target vs actual comparisons.",
);
assert.ok(
  published.auditEvents.some((event) => event.action === "published"),
  "Published laboratory closure must keep an audit event.",
);

const afterPublishWorkspace = await getLaboratoryWorkspace(branchManager, {
  period: currentPeriod,
});
assert.equal(
  afterPublishWorkspace.currentPeriodStatus,
  "publicado",
  "Branch manager workspace must show current laboratory closure as published.",
);
assert.ok(
  afterPublishWorkspace.insights.length > 0,
  "Published laboratory closure must produce deterministic insights.",
);
assert.ok(
  afterPublishWorkspace.branchSummaries.every(
    (summary) => summary.branchId === branch.id,
  ),
  "Branch dashboard summaries must stay scoped to the branch.",
);

const duplicateDraft = await saveLaboratoryClosureDraft(
  branchManager,
  validPayload(branch.id),
);
const duplicateValidation = await validateLaboratoryClosureDraft(
  branchManager,
  duplicateDraft.id,
);
assert.ok(
  duplicateValidation.validation.errors.some(
    (issue) => issue.code === "closure.duplicate_published",
  ),
  "Duplicate period draft must receive a validation error before publish.",
);
await assert.rejects(
  () => publishLaboratoryClosure(branchManager, duplicateDraft.id),
  /cierre bloqueado/,
  "Duplicate period publish must be blocked unless it is a versioned correction.",
);

const correctionDraft = await saveLaboratoryClosureDraft(branchManager, {
  ...validPayload(branch.id),
  inputs: {
    ...validPayload(branch.id).inputs,
    closureObservations: "Correccion DEMO Laboratorio autorizada.",
    revenueTotal: 92000,
  },
  replacesClosureId: published.id,
});
const correction = await publishLaboratoryClosure(branchManager, correctionDraft.id);
assert.equal(correction.status, "published", "Versioned correction must publish.");
assert.equal(
  correction.replacesClosureId,
  published.id,
  "Correction must preserve lineage to the replaced closure.",
);

const correctedWorkspace = await getLaboratoryWorkspace(branchManager, {
  period: currentPeriod,
});
const replacedOriginal = correctedWorkspace.closures.find(
  (closure) => closure.id === published.id,
);
assert.equal(
  replacedOriginal?.status,
  "replaced",
  "Original published closure must be marked as replaced.",
);

const areaWorkspace = await getLaboratoryWorkspace(areaManager, {
  period: currentPeriod,
});
assert.ok(
  areaWorkspace.branches.every(
    (visibleBranch) =>
      visibleBranch.operationalAreaId === areaManager.scope.operationalAreaId,
  ),
  "Area manager must only consolidate laboratory branches from the assigned area.",
);

const operationsWorkspace = await getLaboratoryWorkspace(operationsManager, {
  period: currentPeriod,
});
assert.ok(
  operationsWorkspace.branches.every(
    (visibleBranch) => visibleBranch.companyId === laboratoryCompanyId,
  ),
  "Operations manager must consolidate Analiza Laboratorio only.",
);
assert.equal(
  operationsWorkspace.canManageTargets,
  true,
  "Operations manager must be allowed to configure laboratory targets.",
);

const ceoWorkspace = await getLaboratoryWorkspace(ceo, { period: currentPeriod });
assert.equal(
  ceoWorkspace.canCreateClosure,
  false,
  "CEO must consume consolidated laboratory results without creating branch closures.",
);
assert.equal(
  ceoWorkspace.canManageTargets,
  true,
  "CEO must be able to govern laboratory targets.",
);

for (const path of [
  "app/api/laboratory/closures/route.ts",
  "app/api/laboratory/closures/[closureId]/validate/route.ts",
  "app/api/laboratory/closures/[closureId]/publish/route.ts",
  "app/api/laboratory/targets/route.ts",
]) {
  statSync(`${root}/${path}`);
}

for (const apiRoute of [
  "app/api/laboratory/closures/route.ts",
  "app/api/laboratory/closures/[closureId]/validate/route.ts",
  "app/api/laboratory/closures/[closureId]/publish/route.ts",
  "app/api/laboratory/targets/route.ts",
]) {
  assert.ok(
    readWorkspaceFile(apiRoute).includes("requireProtectedAccess"),
    `${apiRoute} must resolve the authenticated server-side actor.`,
  );
}

const router = readWorkspaceFile("components/monthly-closure-router.tsx");
assert.ok(
  router.includes("LaboratoryVerticalDashboard") &&
    router.includes("PhysiotherapyVerticalDashboard"),
  "Monthly closure router must preserve Fisioterapia and add Laboratorio.",
);
assert.ok(
  router.includes("requestedLine(line) ?? scopedCompanyUnit(actor)") &&
    router.includes("getBusinessLineForCompany(actor.scope.companyId"),
  "Monthly closure router must infer Laboratory from the user's scoped company.",
);

for (const route of [
  "app/protected/mi-sucursal/page.tsx",
  "app/protected/cierres/page.tsx",
  "app/protected/resultados/page.tsx",
]) {
  assert.ok(
    readWorkspaceFile(route).includes("MonthlyClosureRouter"),
    `${route} must resolve the active monthly closing vertical.`,
  );
}
assert.ok(
  readWorkspaceFile("app/protected/cierres/nuevo/page.tsx").includes(
    "redirect(`/protected/importaciones",
  ),
  "The legacy new closure page must redirect to Importaciones.",
);

for (const dashboard of [
  "components/goals-advances-dashboard.tsx",
  "components/insights-intelligence-dashboard.tsx",
  "components/executive-operation-dashboard.tsx",
  "components/executive-dashboard.tsx",
]) {
  assert.ok(
    readWorkspaceFile(dashboard).includes("LaboratoryVerticalDashboard") ||
      readWorkspaceFile(dashboard).includes("LaboratoryExecutiveSummary"),
    `${dashboard} must expose Laboratory results from the same published closure flow.`,
  );
}
