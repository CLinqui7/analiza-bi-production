import type { RoleKey } from "@/lib/tenant/demo-context";

export const managementLevels = ["senior", "middle", "junior"] as const;

export type ManagementLevel = (typeof managementLevels)[number];

export type ManagerIncentiveInput = {
  baseBonusAmount: number;
  managementLevel: ManagementLevel;
};

export const managementLevelLabels: Record<ManagementLevel, string> = {
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

export const defaultBaseBonusByManagementLevel: Record<
  ManagementLevel,
  number
> = {
  junior: 200,
  middle: 300,
  senior: 400,
};

export const managerIncentiveFormulaVersion =
  "manager-bonus-v2-base-x-goal-completion";

export function isManagementLevel(value: unknown): value is ManagementLevel {
  return (
    typeof value === "string" &&
    managementLevels.includes(value as ManagementLevel)
  );
}

export function isManagerIncentiveRole(roleKey: RoleKey) {
  return roleKey === "gerente_area" || roleKey === "gerente_sucursal";
}

export function getDefaultBaseBonusAmount(level: ManagementLevel) {
  return defaultBaseBonusByManagementLevel[level];
}

export function normalizeBaseBonusAmount(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const normalizedAmount = Math.round(value * 100) / 100;

  if (normalizedAmount <= 0 || normalizedAmount > 10000) {
    return null;
  }

  return normalizedAmount;
}

export function getGoalCompletionFactor(targetCompletionRate: number) {
  if (!Number.isFinite(targetCompletionRate)) {
    return 0;
  }

  return Math.min(Math.max(targetCompletionRate, 0), 1);
}

export function calculateRecommendedManagerBonus({
  baseBonusAmount,
  isEligible = true,
  targetCompletionRate,
}: {
  baseBonusAmount: number;
  isEligible?: boolean;
  targetCompletionRate: number;
}) {
  const normalizedBaseBonus = normalizeBaseBonusAmount(baseBonusAmount);

  if (!normalizedBaseBonus || !isEligible) {
    return 0;
  }

  return Math.round(
    normalizedBaseBonus * getGoalCompletionFactor(targetCompletionRate),
  );
}
