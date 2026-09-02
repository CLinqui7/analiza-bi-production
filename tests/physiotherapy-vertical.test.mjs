import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

import { getDemoScopeForRole } from "../lib/auth/demo-scope.ts";
import {
  getPhysiotherapyWorkspace,
  publishPhysiotherapyClosure,
  resetPhysiotherapyClosureStoreForTests,
  savePhysiotherapyClosureDraft,
  upsertPhysiotherapyTarget,
  validatePhysiotherapyClosureDraft,
} from "../lib/analytics/physiotherapy-closures.ts";
import { getNavigationForRole } from "../lib/navigation.ts";
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
const physiotherapyCompanyId = "40000000-0000-4000-8000-000000000001";
const currentPeriod = "2026-08";

function actor(roleKey, scope = getDemoScopeForRole(roleKey)) {
  return {
    allowDemoRoleSwitch: false,
    email: `${roleKey}@analiza.local`,
    roleKey,
    scope: {
      organizationId,
      ...scope,
    },
    source: "demo",
    userId: `${roleKey}-user`,
  };
}

function readWorkspaceFile(path) {
  return readFileSync(`${root}/${path}`, "utf8");
}

function assertValidKpis(closure) {
  assert.ok(
    closure.kpiResults.length >= 15,
    "Fisioterapia must calculate the MVP KPI set after validation.",
  );

  for (const kpi of closure.kpiResults) {
    assert.ok(
      kpi.status === "NOT_CALCULABLE" ||
        (typeof kpi.value === "number" && Number.isFinite(kpi.value)),
      `KPI ${kpi.id} must never expose NaN or Infinity.`,
    );
  }
}

const validPayload = (branchId) => ({
  branchId,
  inputs: {
    appointmentsCancelled: 22,
    appointmentsCompleted: 438,
    appointmentsScheduled: 500,
    attendedHours: 338,
    availableHours: 460,
    closureObservations: "Cierre DEMO sin datos personales.",
    directCosts: 28500,
    noShowAppointments: 40,
    ordersTotal: 310,
    patientsAttended: 255,
    physiotherapistsActive: 9,
    revenueTotal: 84600,
    scheduledHours: 385,
    sessionsTotal: 438,
  },
  period: currentPeriod,
});

resetPhysiotherapyClosureStoreForTests();

const branchManager = actor("gerente_sucursal");
const areaManager = actor("gerente_area");
const operationsManager = actor("gerente_operaciones");
const ceo = actor("ceo");
const viewer = actor("viewer");

assert.equal(
  branchManager.scope.companyId,
  physiotherapyCompanyId,
  "Demo branch manager scope must default to Analiza Fisioterapia.",
);
assert.ok(
  branchManager.scope.branchId,
  "Demo branch manager must receive one scoped physiotherapy branch.",
);

const initialBranchWorkspace = await getPhysiotherapyWorkspace(branchManager);
assert.equal(
  initialBranchWorkspace.branches.length,
  1,
  "Branch manager must only see its own physiotherapy branch.",
);
assert.equal(
  initialBranchWorkspace.canCreateClosure,
  true,
  "Branch manager must be able to create a monthly physiotherapy closure.",
);
assert.equal(
  initialBranchWorkspace.currentPeriod,
  currentPeriod,
  "Fisioterapia vertical must use the demo current period.",
);

const viewerWorkspace = await getPhysiotherapyWorkspace(viewer);
assert.equal(
  viewerWorkspace.canCreateClosure,
  false,
  "Viewer must not create monthly closures.",
);
await assert.rejects(
  () => savePhysiotherapyClosureDraft(viewer, validPayload(branchManager.scope.branchId)),
  /no puede crear ni publicar/,
  "Viewer must be blocked server-side from creating closures.",
);

assert.equal(
  canAccessProtectedPath(viewer, "/protected/cierres/nuevo"),
  false,
  "Viewer must not open the new closure route by direct URL.",
);
assert.equal(
  canAccessProtectedPath(viewer, "/protected/resultados"),
  true,
  "Viewer may inspect authorized results.",
);

await upsertPhysiotherapyTarget(operationsManager, {
  branchId: branchManager.scope.branchId,
  kpiId: "facturacion_neta",
  period: currentPeriod,
  targetValue: 80000,
});
await upsertPhysiotherapyTarget(operationsManager, {
  branchId: branchManager.scope.branchId,
  kpiId: "ocupacion_efectiva",
  period: currentPeriod,
  targetValue: 0.75,
});
await upsertPhysiotherapyTarget(operationsManager, {
  branchId: branchManager.scope.branchId,
  direction: "LOWER_IS_BETTER",
  kpiId: "tasa_no_show",
  period: currentPeriod,
  targetValue: 0.08,
});
const inactiveSessionsTarget = await upsertPhysiotherapyTarget(operationsManager, {
  branchId: branchManager.scope.branchId,
  kpiId: "sesiones_total",
  period: currentPeriod,
  status: "inactive",
  targetValue: 460,
});
assert.equal(
  inactiveSessionsTarget.status,
  "inactive",
  "Targets must support active/inactive lifecycle state.",
);
await assert.rejects(
  () =>
    upsertPhysiotherapyTarget(operationsManager, {
      branchId: branchManager.scope.branchId,
      kpiId: "facturacion_neta",
      period: currentPeriod,
      targetValue: "",
    }),
  /meta es obligatoria/,
  "Empty targets must not be silently converted to zero.",
);

const missingRevenueDraft = await savePhysiotherapyClosureDraft(branchManager, {
  ...validPayload(branchManager.scope.branchId),
  inputs: {
    ...validPayload(branchManager.scope.branchId).inputs,
    revenueTotal: "",
  },
});
const missingRevenueValidation =
  await validatePhysiotherapyClosureDraft(branchManager, missingRevenueDraft.id);
assert.ok(
  missingRevenueValidation.validation.errors.some(
    (issue) => issue.code === "number.missing_required",
  ),
  "Missing source inputs must block validation instead of becoming zero.",
);
assert.equal(
  missingRevenueValidation.kpiResults.find(
    (kpi) => kpi.id === "facturacion_neta",
  )?.status,
  "NOT_CALCULABLE",
  "Missing revenue must make facturacion_neta not calculable.",
);

const warningDraft = await savePhysiotherapyClosureDraft(branchManager, {
  ...validPayload(branchManager.scope.branchId),
  inputs: {
    ...validPayload(branchManager.scope.branchId).inputs,
    appointmentsCompleted: 490,
    attendedHours: 470,
  },
});
const warningValidation = await validatePhysiotherapyClosureDraft(
  branchManager,
  warningDraft.id,
);
assert.equal(
  warningValidation.validation.errors.length,
  0,
  "Agenda/capacity consistency issues requested as warnings must not block by themselves.",
);
assert.equal(
  warningValidation.validation.state,
  "ADVERTENCIA",
  "Consistency issues should surface as ADVERTENCIA.",
);
assert.ok(
  warningValidation.validation.warnings.some(
    (issue) => issue.code === "appointments.outcomes_exceed_scheduled",
  ),
  "Appointments outcomes greater than scheduled must warn.",
);
assert.ok(
  warningValidation.validation.warnings.some(
    (issue) => issue.code === "hours.attended_exceed_available",
  ),
  "Attended hours greater than available hours must warn.",
);

const draft = await savePhysiotherapyClosureDraft(
  branchManager,
  validPayload(branchManager.scope.branchId),
);
assert.equal(draft.status, "draft", "First save must persist a draft.");

const validated = await validatePhysiotherapyClosureDraft(branchManager, draft.id);
assert.equal(
  validated.validation.errors.length,
  0,
  "Valid physiotherapy closure must pass server-side validation.",
);
assertValidKpis(validated);

const published = await publishPhysiotherapyClosure(branchManager, draft.id);
assert.equal(published.status, "published", "Validated closure must publish.");
assert.equal(
  published.isDemo,
  true,
  "Vertical 1 data must remain explicitly DEMO in this phase.",
);
assertValidKpis(published);
assert.ok(
  published.targetComparisons.some(
    (comparison) => comparison.kpiId === "facturacion_neta",
  ),
  "Published closure must include target vs actual comparisons.",
);
assert.equal(
  published.targetComparisons.find(
    (comparison) => comparison.kpiId === "sesiones_total",
  )?.status,
  "sin_meta",
  "Latest inactive target must stop feeding the comparison.",
);
assert.ok(
  published.auditEvents.some((event) => event.action === "published"),
  "Published closure must keep an audit event.",
);

const afterPublishWorkspace = await getPhysiotherapyWorkspace(branchManager, {
  period: currentPeriod,
});
assert.equal(
  afterPublishWorkspace.currentPeriodStatus,
  "publicado",
  "Branch manager workspace must show current closure as published.",
);
assert.ok(
  afterPublishWorkspace.insights.length > 0,
  "Published closure must produce deterministic insights.",
);
assert.ok(
  afterPublishWorkspace.branchSummaries.every(
    (summary) => summary.branchId === branchManager.scope.branchId,
  ),
  "Branch dashboard summaries must stay scoped to the branch.",
);

const duplicateDraft = await savePhysiotherapyClosureDraft(
  branchManager,
  validPayload(branchManager.scope.branchId),
);
const duplicateValidation = await validatePhysiotherapyClosureDraft(
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
  () => publishPhysiotherapyClosure(branchManager, duplicateDraft.id),
  /cierre bloqueado/,
  "Duplicate period publish must be blocked unless it is a versioned correction.",
);

const correctionDraft = await savePhysiotherapyClosureDraft(branchManager, {
  ...validPayload(branchManager.scope.branchId),
  inputs: {
    ...validPayload(branchManager.scope.branchId).inputs,
    closureObservations: "Correccion DEMO autorizada.",
    revenueTotal: 86500,
  },
  replacesClosureId: published.id,
});
const correction = await publishPhysiotherapyClosure(branchManager, correctionDraft.id);
assert.equal(correction.status, "published", "Versioned correction must publish.");
assert.equal(
  correction.replacesClosureId,
  published.id,
  "Correction must preserve lineage to the replaced closure.",
);

const correctedWorkspace = await getPhysiotherapyWorkspace(branchManager, {
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

const areaWorkspace = await getPhysiotherapyWorkspace(areaManager, {
  period: currentPeriod,
});
assert.ok(
  areaWorkspace.branches.every(
    (branch) => branch.operationalAreaId === areaManager.scope.operationalAreaId,
  ),
  "Area manager must only consolidate branches from the assigned area.",
);

const operationsWorkspace = await getPhysiotherapyWorkspace(operationsManager, {
  period: currentPeriod,
});
assert.ok(
  operationsWorkspace.branches.every(
    (branch) => branch.companyId === physiotherapyCompanyId,
  ),
  "Operations manager must consolidate Analiza Fisioterapia only.",
);
assert.equal(
  operationsWorkspace.canManageTargets,
  true,
  "Operations manager must be allowed to configure targets.",
);

const ceoWorkspace = await getPhysiotherapyWorkspace(ceo, { period: currentPeriod });
assert.equal(
  ceoWorkspace.canCreateClosure,
  false,
  "CEO must consume consolidated results without creating branch closures.",
);
assert.equal(
  ceoWorkspace.canManageTargets,
  true,
  "CEO must be able to govern targets.",
);

for (const path of [
  "app/api/physiotherapy/closures/route.ts",
  "app/api/physiotherapy/closures/[closureId]/validate/route.ts",
  "app/api/physiotherapy/closures/[closureId]/publish/route.ts",
  "app/api/physiotherapy/targets/route.ts",
  "docs/forms/fisioterapia-implemented-flow.md",
]) {
  statSync(`${root}/${path}`);
}

for (const apiRoute of [
  "app/api/physiotherapy/closures/route.ts",
  "app/api/physiotherapy/closures/[closureId]/validate/route.ts",
  "app/api/physiotherapy/closures/[closureId]/publish/route.ts",
  "app/api/physiotherapy/targets/route.ts",
]) {
  assert.ok(
    readWorkspaceFile(apiRoute).includes("requireProtectedAccess"),
    `${apiRoute} must resolve the authenticated server-side actor.`,
  );
}

const navigation = readWorkspaceFile("lib/navigation.ts");
for (const href of [
  "/protected/mi-sucursal",
  "/protected/importaciones",
  "/protected/cierres",
  "/protected/resultados",
]) {
  assert.ok(navigation.includes(href), `Navigation must expose ${href}.`);
}

const branchNavigation = getNavigationForRole("gerente_sucursal").map(
  (item) => item.href,
);
assert.deepEqual(
  branchNavigation,
  [
    "/protected/mi-sucursal",
    "/protected/importaciones",
    "/protected/cierres",
    "/protected/resultados",
    "/protected/configuracion",
  ],
  "Branch manager navigation must keep one branch report and avoid duplicated goals/insights tabs.",
);

for (const verticalDashboard of [
  readWorkspaceFile("components/physiotherapy-vertical-dashboard.tsx"),
  readWorkspaceFile("components/laboratory-vertical-dashboard.tsx"),
  readWorkspaceFile("components/imaging-vertical-dashboard.tsx"),
]) {
  assert.ok(
    verticalDashboard.includes('const showTargets = mode === "targets";'),
    "Branch home must not render the full targets block as a duplicated section.",
  );
  assert.ok(
    verticalDashboard.includes(
      'const showInsights = mode === "insights" || mode === "overview";',
    ),
    "Branch home must not render the full insights block as a duplicated section.",
  );
}

const loginForm = readWorkspaceFile("components/login-form.tsx");
const sidebar = readWorkspaceFile("components/app-sidebar.tsx");
assert.ok(
  loginForm.includes("window.localStorage.setItem(roleStorageKey, activeDemoRole)"),
  "Demo login must synchronize the selected server-side role to browser state.",
);
assert.ok(
  !sidebar.includes("const storedRole") &&
    sidebar.includes("setActiveRole(roleKey)") &&
    sidebar.includes("window.localStorage.setItem(roleStorageKey, roleKey)"),
  "Sidebar must treat the server-side role as source of truth after demo login.",
);
