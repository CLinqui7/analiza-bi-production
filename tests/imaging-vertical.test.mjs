import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

import {
  getImagingBranches,
  getImagingWorkspace,
  publishImagingClosure,
  resetImagingClosureStoreForTests,
  saveImagingClosureDraft,
  upsertImagingTarget,
  validateImagingClosureDraft,
} from "../lib/analytics/imaging-closures.ts";
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
const imagingCompanyId = "40000000-0000-4000-8000-000000000003";
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
    userId: `${roleKey}-img-user`,
  };
}

function assertValidKpis(closure) {
  assert.ok(
    closure.kpiResults.length >= 18,
    "Imagenes must calculate the MVP KPI set after validation.",
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
    "perfiles_total",
    "pruebas_procesadas",
    "sesiones_total",
  ]) {
    assert.ok(
      !closure.kpiResults.some((kpi) => kpi.id === forbiddenKpi),
      `${forbiddenKpi} must not be reused by Imagenes.`,
    );
  }
}

const imagingBranches = getImagingBranches();
const branch = imagingBranches.find((candidate) => candidate.operationalAreaId);

assert.ok(branch, "Imagenes must have a managed demo branch for tests.");
assert.equal(
  branch.companyId,
  imagingCompanyId,
  "The selected branch must belong to Analiza Imagenes.",
);

assert.equal(
  getDemoScopeForRole("gerente_sucursal", "IMAGING").companyId,
  imagingCompanyId,
  "Local DEMO login must support a server-side Imagenes branch manager scope.",
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
    averageOrderToStudyHours: 4,
    averageReportTatHours: 30,
    caafRevenue: 2400,
    caafStudies: 42,
    cancelledStudies: 62,
    clientsTotal: 2100,
    closureObservations: "Cierre DEMO Imagenes sin datos personales.",
    cleaningStaffCount: 1,
    costOfSales: 43000,
    ctRevenue: 23000,
    ctStudies: 84,
    customerServiceCount: 4,
    deliveryStaffCount: 2,
    doctorStaffCount: 6,
    dopplerRevenue: 4200,
    dopplerStudies: 130,
    equipmentAvailableHours: 560,
    equipmentDowntimeHours: 18,
    equipmentUsedHours: 420,
    extraPlatesCount: 180,
    extraPlatesRevenue: 2400,
    licensedStaffCount: 5,
    newClients: 380,
    noShowStudies: 45,
    ordersTotal: 2500,
    pendingReports: 42,
    reportReadingCount: 2500,
    referredOrders: 340,
    referredRevenue: 22000,
    revenueTotal: 87000,
    scheduledStudies: 2810,
    telemedicinePatients: 900,
    telemedicineRevenue: 30000,
    ultrasoundRevenue: 28000,
    ultrasoundStudies: 920,
    xrayRevenue: 27000,
    xrayStudies: 1420,
  },
  period: currentPeriod,
});

resetImagingClosureStoreForTests();

const branchManager = actor("gerente_sucursal", branchScope);
const areaManager = actor("gerente_area", areaScope);
const operationsManager = actor("gerente_operaciones", operationsScope);
const ceo = actor("ceo", { organizationId });
const viewer = actor("viewer", operationsScope);

const initialBranchWorkspace = await getImagingWorkspace(branchManager);
assert.equal(
  initialBranchWorkspace.branches.length,
  1,
  "Branch manager must only see its own imaging branch.",
);
assert.equal(
  initialBranchWorkspace.canCreateClosure,
  true,
  "Branch manager must be able to create a imaging monthly closure.",
);

const viewerWorkspace = await getImagingWorkspace(viewer);
assert.equal(
  viewerWorkspace.canCreateClosure,
  false,
  "Viewer must not create imaging monthly closures.",
);
await assert.rejects(
  () => saveImagingClosureDraft(viewer, validPayload(branch.id)),
  /no puede crear ni publicar/,
  "Viewer must be blocked server-side from creating imaging closures.",
);
assert.equal(
  canAccessProtectedPath(viewer, "/protected/cierres/nuevo"),
  false,
  "Viewer must not open the new closure route by direct URL.",
);

await upsertImagingTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "facturacion_neta",
  period: currentPeriod,
  targetValue: 90000,
});
await upsertImagingTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "estudios_realizados",
  period: currentPeriod,
  targetValue: 3000,
});
await upsertImagingTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "margen_contribucion",
  period: currentPeriod,
  targetValue: 47000,
});
await upsertImagingTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "tat_informe",
  period: currentPeriod,
  targetValue: 24,
});
await upsertImagingTarget(operationsManager, {
  branchId: branch.id,
  kpiId: "informes_pendientes",
  period: currentPeriod,
  targetValue: 30,
});

const missingReportsDraft = await saveImagingClosureDraft(branchManager, {
  ...validPayload(branch.id),
  inputs: {
    ...validPayload(branch.id).inputs,
    pendingReports: "",
  },
});
const missingReportsValidation =
  await validateImagingClosureDraft(branchManager, missingReportsDraft.id);
assert.equal(
  missingReportsValidation.validation.errors.length,
  0,
  "Missing proposed pending reports must not block the MVP closure.",
);
assert.ok(
  missingReportsValidation.validation.warnings.some(
    (issue) => issue.code === "proposed.pending_reports_missing",
  ),
  "Missing pending reports must be visible as a proposed-source warning.",
);
assert.equal(
  missingReportsValidation.kpiResults.find(
    (kpi) => kpi.id === "informes_pendientes",
  )?.status,
  "NOT_CALCULABLE",
  "Missing pending reports must keep dependent KPIs not calculable.",
);

const draft = await saveImagingClosureDraft(
  branchManager,
  validPayload(branch.id),
);
assert.equal(draft.status, "draft", "First save must persist a draft.");

const validated = await validateImagingClosureDraft(branchManager, draft.id);
assert.equal(
  validated.validation.errors.length,
  0,
  "Valid imaging closure must pass server-side validation.",
);
assertValidKpis(validated);

const published = await publishImagingClosure(branchManager, draft.id);
assert.equal(published.status, "published", "Validated closure must publish.");
assert.equal(
  published.isDemo,
  true,
  "Imaging demo flow must remain explicitly DEMO in demo runtime.",
);
assertValidKpis(published);
assert.ok(
  published.targetComparisons.some(
    (comparison) => comparison.kpiId === "facturacion_neta",
  ),
  "Published imaging closure must include target vs actual comparisons.",
);
assert.ok(
  published.auditEvents.some((event) => event.action === "published"),
  "Published imaging closure must keep an audit event.",
);

const afterPublishWorkspace = await getImagingWorkspace(branchManager, {
  period: currentPeriod,
});
assert.equal(
  afterPublishWorkspace.currentPeriodStatus,
  "publicado",
  "Branch manager workspace must show current imaging closure as published.",
);
assert.ok(
  afterPublishWorkspace.insights.length > 0,
  "Published imaging closure must produce deterministic insights.",
);
assert.ok(
  afterPublishWorkspace.branchSummaries.every(
    (summary) => summary.branchId === branch.id,
  ),
  "Branch dashboard summaries must stay scoped to the branch.",
);

const duplicateDraft = await saveImagingClosureDraft(
  branchManager,
  validPayload(branch.id),
);
const duplicateValidation = await validateImagingClosureDraft(
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
  () => publishImagingClosure(branchManager, duplicateDraft.id),
  /cierre bloqueado/,
  "Duplicate period publish must be blocked unless it is a versioned correction.",
);

const correctionDraft = await saveImagingClosureDraft(branchManager, {
  ...validPayload(branch.id),
  inputs: {
    ...validPayload(branch.id).inputs,
    closureObservations: "Correccion DEMO Imagenes autorizada.",
    revenueTotal: 92000,
  },
  replacesClosureId: published.id,
});
const correction = await publishImagingClosure(branchManager, correctionDraft.id);
assert.equal(correction.status, "published", "Versioned correction must publish.");
assert.equal(
  correction.replacesClosureId,
  published.id,
  "Correction must preserve lineage to the replaced closure.",
);

const correctedWorkspace = await getImagingWorkspace(branchManager, {
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

const areaWorkspace = await getImagingWorkspace(areaManager, {
  period: currentPeriod,
});
assert.ok(
  areaWorkspace.branches.every(
    (visibleBranch) =>
      visibleBranch.operationalAreaId === areaManager.scope.operationalAreaId,
  ),
  "Area manager must only consolidate imaging branches from the assigned area.",
);

const operationsWorkspace = await getImagingWorkspace(operationsManager, {
  period: currentPeriod,
});
assert.ok(
  operationsWorkspace.branches.every(
    (visibleBranch) => visibleBranch.companyId === imagingCompanyId,
  ),
  "Operations manager must consolidate Analiza Imagenes only.",
);
assert.equal(
  operationsWorkspace.canManageTargets,
  true,
  "Operations manager must be allowed to configure imaging targets.",
);

const ceoWorkspace = await getImagingWorkspace(ceo, { period: currentPeriod });
assert.equal(
  ceoWorkspace.canCreateClosure,
  false,
  "CEO must consume consolidated imaging results without creating branch closures.",
);
assert.equal(
  ceoWorkspace.canManageTargets,
  true,
  "CEO must be able to govern imaging targets.",
);

for (const path of [
  "app/api/imaging/closures/route.ts",
  "app/api/imaging/closures/[closureId]/validate/route.ts",
  "app/api/imaging/closures/[closureId]/publish/route.ts",
  "app/api/imaging/targets/route.ts",
]) {
  statSync(`${root}/${path}`);
}

for (const apiRoute of [
  "app/api/imaging/closures/route.ts",
  "app/api/imaging/closures/[closureId]/validate/route.ts",
  "app/api/imaging/closures/[closureId]/publish/route.ts",
  "app/api/imaging/targets/route.ts",
]) {
  assert.ok(
    readWorkspaceFile(apiRoute).includes("requireProtectedAccess"),
    `${apiRoute} must resolve the authenticated server-side actor.`,
  );
}

const router = readWorkspaceFile("components/monthly-closure-router.tsx");
assert.ok(
  router.includes("ImagingVerticalDashboard") &&
    router.includes("PhysiotherapyVerticalDashboard"),
  "Monthly closure router must preserve Fisioterapia and add Imagenes.",
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
    "redirect(`/protected/plantillas",
  ),
  "The legacy new closure page must redirect to the scoped monthly form.",
);

for (const dashboard of [
  "components/goals-advances-dashboard.tsx",
  "components/insights-intelligence-dashboard.tsx",
  "components/executive-operation-dashboard.tsx",
  "components/executive-dashboard.tsx",
]) {
  assert.ok(
    readWorkspaceFile(dashboard).includes("ImagingVerticalDashboard") ||
      readWorkspaceFile(dashboard).includes("ImagingExecutiveSummary"),
    `${dashboard} must expose Imaging results from the same published closure flow.`,
  );
}
