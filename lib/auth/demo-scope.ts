import {
  demoBranches,
  demoOperationalAreas,
  type RoleKey,
} from "../tenant/demo-context.ts";
import type { ScopeBoundary } from "../tenant/delegation-policy.ts";
import type { DemoBusinessLineCode } from "./demo-admin.ts";

const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const fallbackCountryId = "30000000-0000-4000-8000-000000000003";
const fallbackCompanyIds: Record<DemoBusinessLineCode, string> = {
  IMAGING: "40000000-0000-4000-8000-000000000003",
  LABORATORY: "40000000-0000-4000-8000-000000000002",
  PHYSIOTHERAPY: "40000000-0000-4000-8000-000000000001",
};

function getScopedDemoBranch(
  businessLineCode: DemoBusinessLineCode = "PHYSIOTHERAPY",
) {
  return (
    demoBranches.find(
      (branch) =>
        branch.businessLineCode === businessLineCode &&
        branch.operationalAreaId &&
        branch.isActive !== false,
    ) ??
    demoBranches.find((branch) => branch.operationalAreaId && branch.isActive !== false) ??
    demoBranches.find((branch) => branch.isActive !== false) ??
    demoBranches[0] ??
    null
  );
}

function getScopedDemoArea(
  branch: ReturnType<typeof getScopedDemoBranch>,
  businessLineCode: DemoBusinessLineCode = "PHYSIOTHERAPY",
) {
  return (
    demoOperationalAreas.find((area) => area.id === branch?.operationalAreaId) ??
    demoOperationalAreas.find((area) => area.businessLineCode === businessLineCode) ??
    demoOperationalAreas[0] ??
    null
  );
}

export function getDemoScopeForRole(
  roleKey: RoleKey,
  businessLineCode: DemoBusinessLineCode = "PHYSIOTHERAPY",
): ScopeBoundary {
  const branch = getScopedDemoBranch(businessLineCode);
  const area = getScopedDemoArea(branch, businessLineCode);
  const countryId = branch?.countryId ?? area?.countryId ?? fallbackCountryId;
  const companyId =
    branch?.companyId ?? area?.companyId ?? fallbackCompanyIds[businessLineCode];
  const operationalAreaId = branch?.operationalAreaId ?? area?.id ?? null;
  const baseScope = {
    organizationId: demoOrganizationId,
  };

  if (roleKey === "gerente_sucursal" || roleKey === "usuario_operativo") {
    return {
      ...baseScope,
      branchId: branch?.id ?? null,
      companyId,
      countryId,
      operationalAreaId,
    };
  }

  if (roleKey === "gerente_area") {
    return {
      ...baseScope,
      companyId,
      countryId,
      operationalAreaId,
    };
  }

  if (roleKey === "gerente_operaciones" || roleKey === "viewer") {
    return {
      ...baseScope,
      companyId,
      countryId,
    };
  }

  return baseScope;
}
