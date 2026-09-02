import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const currentAccess = read("lib/tenant/current-user-access.ts");
const sessionRoute = read("app/api/auth/session/route.ts");
const supabaseAccess = read("lib/server/supabase-user-access.ts");
const tenantHeader = read("components/tenant-context-header.tsx");
const branchDashboard = read("components/branch-network-dashboard.tsx");

assert.ok(
  currentAccess.includes('fetch("/api/auth/session"'),
  "Current user access must use the canonical Supabase/session endpoint.",
);
assert.ok(
  currentAccess.includes("isBranchManagerScopedAccess") &&
    currentAccess.includes("branchName"),
  "Current user access must expose branch-scoped access.",
);

for (const expected of [
  "getCurrentAuthorizationActor",
  "branchId: actor.scope.branchId",
  "branchName: actor.scope.branchName",
  "companyId: actor.scope.companyId",
  "countryId: actor.scope.countryId",
  "operationalAreaId: actor.scope.operationalAreaId",
]) {
  assert.ok(
    sessionRoute.includes(expected),
    `Session route is missing scoped field: ${expected}`,
  );
}

for (const expected of [
  '.from("profiles")',
  '.from("user_roles")',
  '.from("roles")',
  '.from("branches")',
  "default_branch_id",
  "branch_id",
  "operational_area_id",
]) {
  assert.ok(
    supabaseAccess.includes(expected),
    `Supabase directory access is missing: ${expected}`,
  );
}

for (const expected of [
  "fetchCurrentUserAccess",
  "/api/context/options",
  "isBranchManagerScopedAccess",
  "branchOptions",
  "operationalAreaOptions",
  "effectiveCompanyId",
  "effectiveCountryId",
]) {
  assert.ok(
    tenantHeader.includes(expected),
    `Tenant context header is missing scoped behavior: ${expected}`,
  );
}

for (const expected of [
  "contextScopedBranches",
  "allowedBranchOptions",
  "recordMatchesBranchOption",
  "recordMatchesContextBranch",
  "context?.countryId",
  "context?.companyId",
  "context?.businessLineCode",
]) {
  assert.ok(
    branchDashboard.includes(expected),
    `Branch dashboard is missing scoped-filter safeguard: ${expected}`,
  );
}

assert.ok(
  !branchDashboard.includes("screen.records.slice(0, 1)"),
  "Branch dashboard must not fabricate branch scope by slicing the full network.",
);

const { filterBranchesByScope } = await import(
  "../lib/tenant/scope-intersection.ts"
);

const branches = [
  {
    id: "sv-img-1",
    countryId: "sv",
    companyId: "img",
    businessLineCode: "IMAGING",
  },
  {
    id: "hn-img-1",
    countryId: "hn",
    companyId: "img",
    businessLineCode: "IMAGING",
  },
];

assert.deepEqual(
  filterBranchesByScope(branches, {
    countryId: "sv",
    companyId: "img",
    businessLineCode: "IMAGING",
  }).map((branch) => branch.id),
  ["sv-img-1"],
  "El Salvador scope leaked a Honduras branch.",
);

console.log("Supabase branch-scope checks passed.");
