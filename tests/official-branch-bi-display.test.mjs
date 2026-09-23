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
assert.match(
  source,
  /Venta en archivos[\s\S]*metrics\.documentSales/,
  "Document-derived sales must remain visible as a separate metric instead of replacing official revenue.",
);
assert.match(
  source,
  /slice\(0, 8\)/,
  "The six authorized laboratory branches must fit in the trend instead of silently dropping the sixth series.",
);

console.log("official-branch-bi-display: PASS");
