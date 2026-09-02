import assert from "node:assert/strict";

import {
  decideBonus,
  getBonusWorkflowView,
  resetBonusWorkflowStoreForTests,
} from "../lib/server/bonus-workflow.ts";

const organizationId = "10000000-0000-4000-8000-000000000001";
const countryId = "30000000-0000-4000-8000-000000000003";
const companyId = "40000000-0000-4000-8000-000000000002";
const operationalAreaId = "area-centro";
const branchId = "branch-lab-001";

function actor(roleKey, scope, userId = `${roleKey}-user`) {
  return {
    allowDemoRoleSwitch: false,
    email: `${userId}@analiza.local`,
    roleKey,
    scope: {
      organizationId,
      ...scope,
    },
    source: "demo",
    userId,
  };
}

function recommendation(overrides = {}) {
  return {
    bonusRecommendationId: "bonus-rec-lab-001",
    breakdown: [
      {
        id: "finanzas",
        insight: "Cumplimiento financiero dentro de meta.",
        label: "Finanzas",
        points: 25,
        score: 84,
        weight: 30,
      },
      {
        id: "operacion",
        insight: "Productividad estable.",
        label: "Operacion",
        points: 22,
        score: 88,
        weight: 25,
      },
    ],
    businessLine: "Laboratorio",
    businessLineSlug: "laboratorio",
    baseBonusAmount: 400,
    managementLevel: "senior",
    manager: "Gerente Laboratorio Centro",
    managerRoleKey: "gerente_sucursal",
    managerRoleLabel: "Gerente de Sucursal",
    managerUserId: "manager-lab-centro",
    period: "Julio 2026",
    recommendedAmount: 320,
    scope: {
      branchId,
      companyId,
      countryId,
      operationalAreaId,
      organizationId,
    },
    score: 86,
    targetCompletionRate: 0.8,
    ...overrides,
  };
}

function assertDecisionError(expectedMessage, run) {
  assert.throws(run, {
    message: expectedMessage,
  });
}

const operationsManager = actor("gerente_operaciones", {
  companyId,
  countryId,
});
const areaManager = actor("gerente_area", {
  companyId,
  countryId,
  operationalAreaId,
});
const ceo = actor("ceo", { companyId, countryId });
const viewer = actor("viewer", { companyId, countryId });
const branchManager = actor(
  "gerente_sucursal",
  {
    branchId,
    companyId,
    countryId,
    operationalAreaId,
  },
  "manager-lab-centro",
);

resetBonusWorkflowStoreForTests();

const recommendedView = getBonusWorkflowView(operationsManager, recommendation());
assert.equal(recommendedView.status, "SYSTEM_RECOMMENDED");
assert.equal(recommendedView.recommendedAmount, 320);
assert.equal(recommendedView.finalAmount, 320);
assert.equal(recommendedView.baseBonusAmount, 400);
assert.equal(recommendedView.managementLevel, "senior");
assert.equal(recommendedView.targetCompletionRate, 0.8);
assert.equal(recommendedView.scoreOriginal, 86);
assert.equal(recommendedView.breakdownOriginal[0]?.label, "Finanzas");
assert.equal(recommendedView.canApprove, true);
assert.equal(recommendedView.canAdjust, true);
assert.equal(recommendedView.canReject, true);

const ceoView = getBonusWorkflowView(ceo, recommendation());
assert.equal(ceoView.canApprove, false, "CEO must stay read-only for bonuses.");
assert.equal(ceoView.canAdjust, false, "CEO must not adjust bonuses.");
assert.equal(ceoView.canReject, false, "CEO must not reject bonuses.");

resetBonusWorkflowStoreForTests();

const approved = decideBonus(operationsManager, recommendation(), {
  action: "approve",
});
assert.equal(approved.status, "APPROVED");
assert.equal(approved.recommendedAmount, 320);
assert.equal(approved.finalAmount, 320);
assert.equal(approved.scoreOriginal, 86);
assert.equal(approved.auditEvents.length, 1);
assert.equal(approved.auditEvents[0]?.action, "approve");

const persistedApproval = getBonusWorkflowView(operationsManager, recommendation());
assert.equal(persistedApproval.status, "APPROVED");
assert.equal(persistedApproval.finalAmount, 320);
assert.equal(persistedApproval.recommendedAmount, 320);

assertDecisionError("BONUS_DECISION_ALREADY_RECORDED", () =>
  decideBonus(operationsManager, recommendation(), {
    action: "reject",
    reason: "Cambio duplicado no permitido.",
  }),
);

resetBonusWorkflowStoreForTests();

assertDecisionError("BONUS_DECISION_REASON_REQUIRED", () =>
  decideBonus(operationsManager, recommendation(), {
    action: "reject",
  }),
);

const rejected = decideBonus(operationsManager, recommendation(), {
  action: "reject",
  reason: "Cierre con inconsistencia de calidad pendiente.",
});
assert.equal(rejected.status, "REJECTED");
assert.equal(rejected.recommendedAmount, 320);
assert.equal(rejected.finalAmount, 0);
assert.equal(rejected.reason, "Cierre con inconsistencia de calidad pendiente.");
assert.equal(rejected.auditEvents[0]?.reason, rejected.reason);

resetBonusWorkflowStoreForTests();

assertDecisionError("BONUS_DECISION_REASON_REQUIRED", () =>
  decideBonus(operationsManager, recommendation(), {
    action: "adjust",
    finalAmount: 350,
  }),
);

assertDecisionError("BONUS_DECISION_INVALID_AMOUNT", () =>
  decideBonus(operationsManager, recommendation(), {
    action: "adjust",
    finalAmount: 401,
    reason: "No debe superar el bono base autorizado.",
  }),
);

const adjusted = decideBonus(operationsManager, recommendation(), {
  action: "adjust",
  finalAmount: 350,
  reason: "Evidencia de SLA validada por operaciones.",
});
assert.equal(adjusted.status, "ADJUSTED");
assert.equal(adjusted.recommendedAmount, 320);
assert.equal(adjusted.finalAmount, 350);
assert.equal(adjusted.scoreOriginal, 86);
assert.equal(adjusted.breakdownOriginal[1]?.label, "Operacion");

const persistedAdjustment = getBonusWorkflowView(operationsManager, recommendation());
assert.equal(persistedAdjustment.finalAmount, 350);
assert.equal(persistedAdjustment.auditEvents.length, 1);

resetBonusWorkflowStoreForTests();

assertDecisionError("BONUS_DECISION_FORBIDDEN", () =>
  decideBonus(viewer, recommendation(), {
    action: "approve",
  }),
);

assertDecisionError("BONUS_DECISION_FORBIDDEN", () =>
  decideBonus(branchManager, recommendation(), {
    action: "approve",
  }),
);

const areaApproved = decideBonus(areaManager, recommendation(), {
  action: "approve",
});
assert.equal(areaApproved.status, "APPROVED");

resetBonusWorkflowStoreForTests();

const areaRecommendation = recommendation({
  bonusRecommendationId: "bonus-rec-area-001",
  managerRoleKey: "gerente_area",
  managerRoleLabel: "Gerente de Area",
  managerUserId: "area-manager-centro",
  scope: {
    companyId,
    countryId,
    operationalAreaId,
    organizationId,
  },
});

assertDecisionError("BONUS_DECISION_FORBIDDEN", () =>
  decideBonus(areaManager, areaRecommendation, {
    action: "approve",
  }),
);

const outOfScopeOperations = actor("gerente_operaciones", {
  companyId: "40000000-0000-4000-8000-000000000003",
  countryId,
});

assertDecisionError("BONUS_DECISION_FORBIDDEN", () =>
  decideBonus(outOfScopeOperations, recommendation(), {
    action: "approve",
  }),
);

console.log("Bonus workflow checks passed.");
