import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const mustExist = (path) =>
  assert.ok(existsSync(resolve(root, path)), `Missing required file: ${path}`);

for (const path of [
  "package.json",
  "lib/server/passwords.ts",
  "lib/tenant/scope-intersection.ts",
  "lib/analytics/safe-kpi.ts",
  "components/branch-network-dashboard.tsx",
  "app/api/context/options/route.ts",
  ".env.example",
]) {
  mustExist(path);
}

const passwords = read("lib/server/passwords.ts");
for (const expected of ["scrypt", "timingSafeEqual", "hashPassword", "verifyPassword"]) {
  assert.ok(passwords.includes(expected), `Password helper missing ${expected}`);
}

const branchDashboard = read("components/branch-network-dashboard.tsx");
for (const expected of [
  "contextScopedBranches",
  "recordMatchesBranchOption",
  "recordMatchesContextBranch",
  "countryId",
  "companyId",
]) {
  assert.ok(
    branchDashboard.includes(expected),
    `Branch dashboard missing scoped-filter safeguard: ${expected}`,
  );
}

const { filterBranchesByScope } = await import(
  "../lib/tenant/scope-intersection.ts"
);
const branches = [
  {
    id: "sv-1",
    countryId: "sv",
    companyId: "img",
    businessLineCode: "IMAGING",
  },
  {
    id: "hn-1",
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
  ["sv-1"],
  "El Salvador scope leaked a Honduras branch.",
);

const {
  safeDivide,
  calculateAbsoluteMargin,
  calculateMarginRate,
  displayKpi,
} = await import("../lib/analytics/safe-kpi.ts");

assert.deepEqual(safeDivide(100, 0).status, "NOT_CALCULABLE");
assert.equal(displayKpi(safeDivide(100, 0), String), "No calculable");
assert.deepEqual(calculateAbsoluteMargin(100, 40), {
  status: "CALCULABLE",
  value: 60,
});
assert.equal(calculateMarginRate(100, 40).value, 0.6);
assert.equal(calculateMarginRate(0, 0).status, "NOT_CALCULABLE");

const envExample = read(".env.example");
assert.ok(envExample.includes("NEXT_PUBLIC_SUPABASE_URL"));
assert.ok(envExample.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
assert.ok(
  !/^NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=/m.test(envExample),
  "Service role key must never be browser-exposed.",
);

for (const path of [
  "app/api/auth/local-login/route.ts",
  "app/api/auth/session/route.ts",
  "app/api/health/route.ts",
]) {
  if (!existsSync(resolve(root, path))) continue;
  const source = read(path);
  assert.ok(!source.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"));
}

const clientFiles = [...[
  "components",
  "app",
  "hooks",
  "lib",
].flatMap(() => [])];
void clientFiles;

const packageJson = JSON.parse(read("package.json"));
assert.ok(packageJson.scripts?.typecheck, "Missing typecheck script.");
assert.ok(packageJson.scripts?.lint, "Missing lint script.");
assert.ok(packageJson.scripts?.build, "Missing build script.");

console.log("Production hardening checks passed.");
