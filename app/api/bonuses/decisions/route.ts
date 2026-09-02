import { NextResponse } from "next/server";

import {
  decideBonus,
  getBonusWorkflowView,
  type BonusDecisionInput,
  type BonusWorkflowAction,
} from "@/lib/server/bonus-workflow";
import {
  findAuthorizedBonusRecommendation,
  getAuthorizedBonusRecommendations,
} from "@/lib/server/bonus-recommendations";
import { requireProtectedAccess } from "@/lib/server/authorization";
import { canPerformAction } from "@/lib/security/authorization-policy";

type BonusDecisionRequest = {
  action?: unknown;
  bonusRecommendationId?: unknown;
  finalAmount?: unknown;
  reason?: unknown;
};

const workflowActions: BonusWorkflowAction[] = ["approve", "reject", "adjust"];

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

function isWorkflowAction(value: unknown): value is BonusWorkflowAction {
  return typeof value === "string" && workflowActions.includes(value as BonusWorkflowAction);
}

function readNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return undefined;
}

function toDecisionInput(payload: BonusDecisionRequest): BonusDecisionInput | null {
  if (!isWorkflowAction(payload.action)) {
    return null;
  }

  return {
    action: payload.action,
    finalAmount: readNumber(payload.finalAmount),
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
  };
}

function errorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";

  if (message === "BONUS_DECISION_FORBIDDEN") {
    return { message: "No tienes permisos para decidir este bono.", status: 403 };
  }

  if (message === "BONUS_DECISION_ALREADY_RECORDED") {
    return { message: "Este bono ya tiene una decision registrada.", status: 409 };
  }

  if (message === "BONUS_DECISION_REASON_REQUIRED") {
    return { message: "El motivo es obligatorio para rechazar o ajustar.", status: 400 };
  }

  if (message === "BONUS_DECISION_INVALID_AMOUNT") {
    return { message: "El monto final debe estar entre USD 0 y el bono base autorizado.", status: 400 };
  }

  if (message === "BONUS_DECISION_ADJUSTMENT_UNCHANGED") {
    return { message: "El monto ajustado debe ser distinto al recomendado.", status: 400 };
  }

  return { message: "No se pudo registrar la decision del bono.", status: 400 };
}

export async function GET() {
  const actor = await requireProtectedAccess();

  if (
    !canPerformAction(actor, "route.access", {
      pathname: "/protected/gerentes",
    })
  ) {
    return jsonError("No tienes acceso a bonos.", 403);
  }

  const recommendations = getAuthorizedBonusRecommendations(actor);

  return NextResponse.json({
    items: recommendations.map((recommendation) =>
      getBonusWorkflowView(actor, recommendation),
    ),
    ok: true,
    roleKey: actor.roleKey,
  });
}

export async function POST(request: Request) {
  const actor = await requireProtectedAccess();

  if (
    !canPerformAction(actor, "route.access", {
      pathname: "/protected/gerentes",
    })
  ) {
    return jsonError("No tienes acceso a bonos.", 403);
  }

  const payload = (await request.json().catch(() => null)) as
    | BonusDecisionRequest
    | null;
  const bonusRecommendationId =
    typeof payload?.bonusRecommendationId === "string"
      ? payload.bonusRecommendationId
      : "";
  const decisionInput = payload ? toDecisionInput(payload) : null;

  if (!bonusRecommendationId || !decisionInput) {
    return jsonError("La decision de bono no esta completa.", 400);
  }

  const recommendation = findAuthorizedBonusRecommendation(
    actor,
    bonusRecommendationId,
  );

  if (!recommendation) {
    return jsonError("Recomendacion de bono no encontrada en tu alcance.", 404);
  }

  try {
    return NextResponse.json({
      item: decideBonus(actor, recommendation, decisionInput),
      ok: true,
    });
  } catch (error) {
    const response = errorStatus(error);

    return jsonError(response.message, response.status);
  }
}
