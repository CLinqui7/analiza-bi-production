import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const navigation = readFileSync("lib/navigation.ts", "utf8");
const v7Policy = readFileSync("lib/v7/security/authorization-policy.ts", "utf8");
const tenantContext = readFileSync("lib/v7/server/tenant-context.ts", "utf8");
const legacyPolicy = readFileSync("lib/tenant/delegation-policy.ts", "utf8");
const bonusPolicy = readFileSync("lib/security/authorization-policy.ts", "utf8");
const bonusRoute = readFileSync("app/api/users/manager-incentives/route.ts", "utf8");

assert.match(navigation, /const ceoFocusedRoles: RoleKey\[\] = \["ceo", "gerente_operaciones"\]/, "GO must receive the executive navigation set.");
assert.match(navigation, /const executiveLineReadRoles: RoleKey\[\] = ceoFocusedRoles/, "GO must receive each CEO business-line view.");
assert.match(v7Policy, /hasOrganizationWideExecutiveAccess[\s\S]*roleKey === "gerente_operaciones"/, "V7 must give GO the same organization boundary as CEO.");
assert.match(v7Policy, /"roles\.read": \["super_admin", "webmaster_admin", "ceo", "gerente_operaciones"\]/, "GO must read the executive role directory.");
assert.match(tenantContext, /hasGlobalCatalogAccess[\s\S]*hasOrganizationWideExecutiveAccess/, "Catalog filtering must match record authorization.");
assert.match(legacyPolicy, /actor\.roleKey === "ceo" \|\|[\s\S]*actor\.roleKey === "gerente_operaciones"/, "Legacy protected APIs must preserve executive scope parity.");
assert.match(bonusPolicy, /actor\.roleKey === "ceo" \|\|[\s\S]*actor\.roleKey === "gerente_operaciones"/, "GO must have the same bonus-decision authority as CEO.");
assert.match(bonusRoute, /"ceo",\s*\n\s*"gerente_operaciones"/, "GO must be able to load the executive manager directory.");
assert.doesNotMatch(v7Policy, /"imports\.write"[^\n]*"gerente_operaciones"/, "GO must not inherit administrator-only imports.");
assert.doesNotMatch(v7Policy, /"audit\.read"[^\n]*"gerente_operaciones"/, "GO must not inherit administrator-only audit access.");

console.log("executive-role-parity: PASS");
