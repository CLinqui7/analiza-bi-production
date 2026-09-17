export type MultilineScope = {
  branchId?: string | null;
  businessLineId?: string | null;
  companyId?: string | null;
  countryId?: string | null;
  operationalAreaId?: string | null;
  organizationId: string;
};

const dimensions: Array<keyof Omit<MultilineScope, "organizationId">> = [
  "countryId",
  "companyId",
  "operationalAreaId",
  "branchId",
  "businessLineId",
];

/** A missing target dimension is allowed for catalogue reads, never a mismatch. */
export function scopeGrantAllows(grant: MultilineScope, target: MultilineScope) {
  return grant.organizationId === target.organizationId
    && dimensions.every((dimension) => {
      const grantValue = grant[dimension];
      const targetValue = target[dimension];
      return !grantValue || !targetValue || grantValue === targetValue;
    });
}

export function anyScopeGrantAllows(
  grants: readonly MultilineScope[],
  target: MultilineScope,
) {
  return grants.some((grant) => scopeGrantAllows(grant, target));
}

export function distinctBranchLineUnits(grants: readonly MultilineScope[]) {
  return Array.from(new Map(
    grants
      .filter((grant) => grant.branchId && grant.businessLineId)
      .map((grant) => [
        `${grant.branchId}:${grant.businessLineId}`,
        { branchId: grant.branchId!, businessLineId: grant.businessLineId! },
      ]),
  ).values());
}
