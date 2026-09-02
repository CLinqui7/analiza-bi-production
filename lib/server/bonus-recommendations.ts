import {
  allManagerBonusRecords,
  type ManagerBonusRecord,
} from "../analytics/manager-bonuses.ts";
import { demoOrganizationId } from "../auth/demo-admin.ts";
import {
  canPerformAction,
  type AuthorizationActor,
} from "../security/authorization-policy.ts";
import {
  demoBranches,
  demoOperationalAreas,
  type RoleKey,
} from "../tenant/demo-context.ts";
import type { ScopeBoundary } from "../tenant/delegation-policy.ts";
import type { BonusRecommendationSnapshot } from "./bonus-workflow.ts";

const elSalvadorCountryId = "30000000-0000-4000-8000-000000000003";
const companyIdsByLineSlug = {
  consolidado: null,
  fisioterapia: "40000000-0000-4000-8000-000000000001",
  imagenes: "40000000-0000-4000-8000-000000000003",
  laboratorio: "40000000-0000-4000-8000-000000000002",
} as const;
const businessLineCodesBySlug = {
  consolidado: "CONSOLIDATED",
  fisioterapia: "PHYSIOTHERAPY",
  imagenes: "IMAGING",
  laboratorio: "LABORATORY",
} as const;

function toManagerRoleKey(record: ManagerBonusRecord): RoleKey {
  return record.managerRole === "Gerente de Area"
    ? "gerente_area"
    : "gerente_sucursal";
}

function toManagerUserId(record: ManagerBonusRecord) {
  return `bonus-manager:${record.id}`;
}

function findRecordBranch(record: ManagerBonusRecord) {
  return demoBranches.find(
    (branch) => branch.id === record.branchCode || branch.name === record.branch,
  );
}

function findRecordArea(record: ManagerBonusRecord) {
  const code = businessLineCodesBySlug[record.lineSlug];

  return demoOperationalAreas.find(
    (area) =>
      area.managerName === record.manager &&
      (code === "CONSOLIDATED" || area.businessLineCode === code),
  );
}

export function getBonusRecommendationScope(
  record: ManagerBonusRecord,
): ScopeBoundary {
  const branch = findRecordBranch(record);
  const area =
    record.managerRole === "Gerente de Area"
      ? findRecordArea(record)
      : demoOperationalAreas.find((item) => item.id === branch?.operationalAreaId);
  const companyId =
    branch?.companyId ??
    area?.companyId ??
    companyIdsByLineSlug[record.lineSlug] ??
    undefined;

  return {
    branchId:
      record.managerRole === "Gerente de Sucursal"
        ? (branch?.id ?? record.branchCode)
        : undefined,
    companyId,
    countryId: branch?.countryId ?? area?.countryId ?? elSalvadorCountryId,
    operationalAreaId: area?.id,
    organizationId: demoOrganizationId,
  };
}

export function toBonusRecommendationSnapshot(
  record: ManagerBonusRecord,
): BonusRecommendationSnapshot {
  return {
    bonusRecommendationId: record.id,
    baseBonusAmount: record.baseBonusAmount,
    breakdown: record.dimensions.map((dimension) => ({
      id: dimension.id,
      insight: dimension.insight,
      label: dimension.label,
      points: dimension.points,
      score: dimension.score,
      weight: dimension.weight,
    })),
    businessLine: record.line,
    businessLineSlug: record.lineSlug,
    managementLevel: record.managementLevel,
    manager: record.manager,
    managerRoleKey: toManagerRoleKey(record),
    managerRoleLabel: record.managerRole,
    managerUserId: toManagerUserId(record),
    period: record.period,
    recommendedAmount: record.bonusRecommended,
    scope: getBonusRecommendationScope(record),
    score: record.score,
    targetCompletionRate: record.targetCompletionRate,
  };
}

export function getAuthorizedBonusRecommendations(actor: AuthorizationActor) {
  return allManagerBonusRecords
    .map(toBonusRecommendationSnapshot)
    .filter((recommendation) =>
      canPerformAction(actor, "record.read", {
        scope: recommendation.scope,
      }),
    );
}

export function findAuthorizedBonusRecommendation(
  actor: AuthorizationActor,
  bonusRecommendationId: string,
) {
  return (
    getAuthorizedBonusRecommendations(actor).find(
      (recommendation) =>
        recommendation.bonusRecommendationId === bonusRecommendationId,
    ) ?? null
  );
}
