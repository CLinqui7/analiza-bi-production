import {
  canPerformAction,
  type AuthorizationActor,
} from "../security/authorization-policy.ts";
import type { RoleKey } from "../tenant/demo-context.ts";
import type { ScopeBoundary } from "../tenant/delegation-policy.ts";
import type { ManagementLevel } from "../tenant/manager-incentives.ts";

export type BonusWorkflowStatus =
  | "SYSTEM_RECOMMENDED"
  | "APPROVED"
  | "REJECTED"
  | "ADJUSTED";

export type BonusWorkflowAction = "approve" | "reject" | "adjust";

export type BonusBreakdownSnapshot = {
  id: string;
  insight: string;
  label: string;
  points: number;
  score: number;
  weight: number;
};

export type BonusRecommendationSnapshot = {
  bonusRecommendationId: string;
  businessLine: string;
  businessLineSlug: string;
  breakdown: BonusBreakdownSnapshot[];
  baseBonusAmount: number;
  managementLevel: ManagementLevel;
  manager: string;
  managerRoleKey: RoleKey;
  managerRoleLabel: string;
  managerUserId: string;
  period: string;
  recommendedAmount: number;
  scope: ScopeBoundary;
  score: number;
  targetCompletionRate: number;
};

export type BonusAuditEvent = {
  action: BonusWorkflowAction;
  bonusRecommendationId: string;
  businessLine: string;
  decidedAt: string;
  finalAmount: number;
  baseBonusAmount: number;
  managementLevel: ManagementLevel;
  manager: string;
  period: string;
  reason: string | null;
  recommendedAmount: number;
  targetCompletionRate: number;
  status: BonusWorkflowStatus;
  userEmail: string;
  userId: string;
};

export type BonusDecisionRecord = {
  bonusRecommendationId: string;
  breakdownOriginal: BonusBreakdownSnapshot[];
  businessLine: string;
  decidedAt: string;
  finalAmount: number;
  baseBonusAmount: number;
  managementLevel: ManagementLevel;
  manager: string;
  managerUserId: string;
  period: string;
  reason: string | null;
  recommendedAmount: number;
  scoreOriginal: number;
  targetCompletionRate: number;
  status: BonusWorkflowStatus;
  userEmail: string;
  userId: string;
};

export type BonusWorkflowPermissions = {
  canAdjust: boolean;
  canApprove: boolean;
  canReject: boolean;
};

export type BonusWorkflowView = BonusDecisionRecord &
  BonusWorkflowPermissions & {
    auditEvents: BonusAuditEvent[];
  };

export type BonusDecisionInput = {
  action: BonusWorkflowAction;
  finalAmount?: number;
  reason?: string;
};

const decisionStore = new Map<string, BonusDecisionRecord>();
const auditStore: BonusAuditEvent[] = [];

function normalizeReason(reason: string | undefined) {
  const trimmedReason = reason?.trim() ?? "";
  return trimmedReason.length > 0 ? trimmedReason : null;
}

function readFinalAmount(
  recommendation: BonusRecommendationSnapshot,
  input: BonusDecisionInput,
) {
  if (input.action === "approve") {
    return recommendation.recommendedAmount;
  }

  if (input.action === "reject") {
    return 0;
  }

  return Number(input.finalAmount);
}

function toStatus(action: BonusWorkflowAction): BonusWorkflowStatus {
  if (action === "approve") {
    return "APPROVED";
  }

  if (action === "reject") {
    return "REJECTED";
  }

  return "ADJUSTED";
}

export function resetBonusWorkflowStoreForTests() {
  decisionStore.clear();
  auditStore.length = 0;
}

export function getBonusWorkflowPermissions(
  actor: AuthorizationActor,
  recommendation: BonusRecommendationSnapshot,
): BonusWorkflowPermissions {
  const target = {
    roleKey: recommendation.managerRoleKey,
    scope: recommendation.scope,
    targetUserId: recommendation.managerUserId,
  };

  return {
    canAdjust: canPerformAction(actor, "bonuses.adjust", target),
    canApprove: canPerformAction(actor, "bonuses.approve", target),
    canReject: canPerformAction(actor, "bonuses.reject", target),
  };
}

export function getBonusWorkflowView(
  actor: AuthorizationActor,
  recommendation: BonusRecommendationSnapshot,
): BonusWorkflowView {
  const decision = decisionStore.get(recommendation.bonusRecommendationId);
  const permissions = getBonusWorkflowPermissions(actor, recommendation);
  const baseDecision: BonusDecisionRecord = decision ?? {
    bonusRecommendationId: recommendation.bonusRecommendationId,
    breakdownOriginal: recommendation.breakdown,
    businessLine: recommendation.businessLine,
    decidedAt: "",
    finalAmount: recommendation.recommendedAmount,
    baseBonusAmount: recommendation.baseBonusAmount,
    managementLevel: recommendation.managementLevel,
    manager: recommendation.manager,
    managerUserId: recommendation.managerUserId,
    period: recommendation.period,
    reason: null,
    recommendedAmount: recommendation.recommendedAmount,
    scoreOriginal: recommendation.score,
    targetCompletionRate: recommendation.targetCompletionRate,
    status: "SYSTEM_RECOMMENDED",
    userEmail: "",
    userId: "",
  };

  return {
    ...baseDecision,
    ...permissions,
    auditEvents: auditStore.filter(
      (event) =>
        event.bonusRecommendationId === recommendation.bonusRecommendationId,
    ),
  };
}

export function decideBonus(
  actor: AuthorizationActor,
  recommendation: BonusRecommendationSnapshot,
  input: BonusDecisionInput,
) {
  const permissions = getBonusWorkflowPermissions(actor, recommendation);

  if (
    (input.action === "approve" && !permissions.canApprove) ||
    (input.action === "reject" && !permissions.canReject) ||
    (input.action === "adjust" && !permissions.canAdjust)
  ) {
    throw new Error("BONUS_DECISION_FORBIDDEN");
  }

  if (decisionStore.has(recommendation.bonusRecommendationId)) {
    throw new Error("BONUS_DECISION_ALREADY_RECORDED");
  }

  const reason = normalizeReason(input.reason);

  if ((input.action === "reject" || input.action === "adjust") && !reason) {
    throw new Error("BONUS_DECISION_REASON_REQUIRED");
  }

  const finalAmount = readFinalAmount(recommendation, input);

  if (
    !Number.isFinite(finalAmount) ||
    finalAmount < 0 ||
    finalAmount > recommendation.baseBonusAmount
  ) {
    throw new Error("BONUS_DECISION_INVALID_AMOUNT");
  }

  if (input.action === "adjust" && finalAmount === recommendation.recommendedAmount) {
    throw new Error("BONUS_DECISION_ADJUSTMENT_UNCHANGED");
  }

  const now = new Date().toISOString();
  const status = toStatus(input.action);
  const decision: BonusDecisionRecord = {
    bonusRecommendationId: recommendation.bonusRecommendationId,
    breakdownOriginal: recommendation.breakdown,
    businessLine: recommendation.businessLine,
    decidedAt: now,
    finalAmount,
    baseBonusAmount: recommendation.baseBonusAmount,
    managementLevel: recommendation.managementLevel,
    manager: recommendation.manager,
    managerUserId: recommendation.managerUserId,
    period: recommendation.period,
    reason,
    recommendedAmount: recommendation.recommendedAmount,
    scoreOriginal: recommendation.score,
    targetCompletionRate: recommendation.targetCompletionRate,
    status,
    userEmail: actor.email,
    userId: actor.userId,
  };
  const auditEvent: BonusAuditEvent = {
    action: input.action,
    bonusRecommendationId: recommendation.bonusRecommendationId,
    businessLine: recommendation.businessLine,
    decidedAt: now,
    finalAmount,
    baseBonusAmount: recommendation.baseBonusAmount,
    managementLevel: recommendation.managementLevel,
    manager: recommendation.manager,
    period: recommendation.period,
    reason,
    recommendedAmount: recommendation.recommendedAmount,
    targetCompletionRate: recommendation.targetCompletionRate,
    status,
    userEmail: actor.email,
    userId: actor.userId,
  };

  decisionStore.set(recommendation.bonusRecommendationId, decision);
  auditStore.push(auditEvent);

  return getBonusWorkflowView(actor, recommendation);
}
