export type ScopeSelection = {
  countryId?: string | null;
  companyId?: string | null;
  businessLineCode?: string | null;
  branchId?: string | null;
};

export type ScopedBranch = {
  id: string;
  countryId: string;
  companyId: string;
  businessLineCode?: string | null;
};

const ALL_VALUES = new Set([
  "",
  "all",
  "todos",
  "todas",
  "regional",
  "consolidated",
  "vista-regional",
  "vista-consolidada",
]);

export function isAllScopeValue(value?: string | null) {
  return !value || ALL_VALUES.has(value.trim().toLowerCase());
}

export function branchMatchesScope(
  branch: ScopedBranch,
  scope: ScopeSelection,
) {
  if (!isAllScopeValue(scope.countryId) && branch.countryId !== scope.countryId) {
    return false;
  }

  if (!isAllScopeValue(scope.companyId) && branch.companyId !== scope.companyId) {
    return false;
  }

  if (
    !isAllScopeValue(scope.businessLineCode) &&
    branch.businessLineCode &&
    branch.businessLineCode !== scope.businessLineCode
  ) {
    return false;
  }

  if (!isAllScopeValue(scope.branchId) && branch.id !== scope.branchId) {
    return false;
  }

  return true;
}

export function filterBranchesByScope<T extends ScopedBranch>(
  branches: T[],
  scope: ScopeSelection,
) {
  return branches.filter((branch) => branchMatchesScope(branch, scope));
}
