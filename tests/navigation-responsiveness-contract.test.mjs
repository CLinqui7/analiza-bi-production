import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authorization = readFileSync("lib/server/authorization.ts", "utf8");
const directory = readFileSync("lib/server/supabase-user-access.ts", "utf8");
const apiAuth = readFileSync("lib/v7/server/api-auth.ts", "utf8");
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
