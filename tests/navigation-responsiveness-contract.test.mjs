import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authorization = readFileSync("lib/server/authorization.ts", "utf8");
const directory = readFileSync("lib/server/supabase-user-access.ts", "utf8");
const apiAuth = readFileSync("lib/v7/server/api-auth.ts", "utf8");
const tenantContext = readFileSync("lib/v7/server/tenant-context.ts", "utf8");
const navigation = readFileSync("components/protected-navigation.tsx", "utf8");
const monthlyForm = readFileSync(
  "components/production/monthly-submission-center.tsx",
  "utf8",
);

assert.match(
  directory,
  /roleId: assignment\?\.role_id \?\? null/,
  "The role ID must originate in the server-side active assignment.",
);
assert.match(
  authorization,
  /roleId: directoryUser\.roleId/,
  "The server actor must carry the directory role ID within its request.",
);
assert.match(
  authorization,
  /scopeGrants: directoryUser\.scopeGrants \?\? undefined/,
  "The server actor must carry the complete request-resolved grant set.",
);
assert.match(
  directory,
  /const \[profile, assignments, managerAssignments\] = await Promise\.all/,
  "Directory authorization must batch profile, role and manager-grant reads.",
);
assert.match(
  apiAuth,
  /if \(actor\.scopeGrants && actor\.scopeGrants\.length > 0\) \{\s*return base;/,
  "Protected snapshots must reuse grants resolved by directory authorization.",
);
assert.match(
  apiAuth,
  /let roleId = base\.roleId/,
  "Grant resolution must reuse the request-resolved role ID.",
);
assert.match(
  apiAuth,
  /if \(!roleId\) \{[\s\S]*grant_role_catalog/,
  "Compatibility actors without a directory role must retain a fail-closed lookup.",
);
assert.match(
  directory,
  /role:roles\(id,key\)[\s\S]*branch:branches\(/,
  "Directory authorization must resolve the active role and branch hierarchy in one request.",
);
assert.match(
  directory,
  /assignments\.some\([\s\S]*admin\.from\("roles"\)/,
  "Directory authorization must retain a role-catalog fallback for older schemas.",
);
assert.match(
  tenantContext,
  /hasOnlyConcreteBranchGrants[\s\S]*country:countries\(id,name,iso2\)[\s\S]*company:companies\(id,name,key\)[\s\S]*operational_area:operational_areas\(/,
  "Concrete branch scopes must load parent catalogs through verified branch relationships.",
);
assert.match(
  tenantContext,
  /hasOnlyConcreteBranchGrants[\s\S]*Promise\.resolve\(\{ data: \[\] as RoleRow\[\] \}\)/,
  "Concrete branch scopes must not issue a redundant standalone role-catalog request.",
);
assert.match(
  navigation,
  /data-navigation-feedback=\{isIntentPending \? "accepted" : "idle"\}/,
  "Accepted navigation must expose an immediate feedback state.",
);
assert.match(
  navigation,
  /cursor-progress opacity-70 saturate-50/,
  "Accepted navigation needs visible feedback, not only an internal flag.",
);
assert.match(
  navigation,
  /onPointerDown=\{handlePointerDown\}/,
  "Pointer navigation must expose feedback before the click event completes.",
);
assert.match(
  navigation,
  /active:opacity-70 active:saturate-50/,
  "Pointer navigation must have an immediate pressed visual state.",
);
assert.match(
  monthlyForm,
  /onProgress: \(bytesUploaded, bytesTotal\)/,
  "Evidence uploads must report progress to the user.",
);
assert.match(
  monthlyForm,
  /disabled=\{busy !== null\}/,
  "A pending upload must reject a conflicting second file selection.",
);

console.log("navigation-responsiveness-contract: PASS");
