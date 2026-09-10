import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "components/official-branch-bi-dashboard.tsx",
  "utf8",
);

assert.match(
  source,
  /function unitLabel\([\s\S]*businessLineName/,
  "A BI unit must remain explicit as branch plus business line.",
);
assert.match(
  source,
  /id: record\.recordId,[\s\S]*name: unitLabel\(record\)/,
  "Trend and matrix entries must retain the stable branch-line record ID.",
);
assert.match(
  source,
  /data-record-id=\{record\.recordId\}[\s\S]*key=\{record\.recordId\}[\s\S]*setSelectedBranchId\(record\.recordId\)/,
  "The operational map must select its exact branch-line unit.",
);
assert.doesNotMatch(
  source,
  /key=\{record\.branchId\}|setSelectedBranchId\(record\.branchId\)/,
  "A branch ID alone is not unique when more than one business line is visible.",
);

console.log("official-branch-bi-display: PASS");
