import assert from "node:assert/strict";

import {
  isApprovedYellowCell,
  monthFromSourceLabel,
  parseMonthlyWorkbookSheet,
} from "../lib/monthly-workbook-import.ts";

const themeYellow = { s: { fill: { patternType: "solid", fgColor: { theme: 7 } } } };
const rgbYellow = { s: { patternType: "solid", fgColor: { rgb: "FFFFC000" } } };

assert.equal(isApprovedYellowCell(themeYellow), true, "Theme 7 must resolve as the approved yellow source fill.");
assert.equal(isApprovedYellowCell(rgbYellow), true, "Explicit FFC000 must resolve as the approved yellow source fill.");
assert.equal(isApprovedYellowCell({ s: { fill: { fgColor: { rgb: "FFFFFFFF" } } } }), false, "A non-yellow label must fail closed.");
assert.equal(monthFromSourceLabel("Agosto 2026"), "2026-08");

const physiotherapySheet = {
  B4: { v: 45 },
  B5: { v: "Agosto 2026" },
  B6: { v: "Fisioterapia Santa Ana" },
  J15: { v: 45 },
  A17: { v: "Meta", ...themeYellow },
  J17: { v: 0, f: "1-1" },
  A19: { v: "VENTA D.D", ...themeYellow },
  A92: { v: "Pasantias", ...themeYellow },
  J92: { v: 3 },
  "!merges": [{ s: { r: 16, c: 0 }, e: { r: 16, c: 1 } }],
};

const physiotherapy = parseMonthlyWorkbookSheet({
  line: "Fisioterapia",
  sheet: physiotherapySheet,
  period: "2026-08",
  branchName: "Fisioterapia Santa Ana",
});
assert.equal(physiotherapy.status, "ready");
assert.equal(physiotherapy.values.physio_target, 0, "A source zero must remain an explicit value.");
assert.equal(physiotherapy.values.physio_internship_staff_count, 3, "The non-zero Pasantias alias must import exactly.");
assert.ok(physiotherapy.formulaFieldIds.includes("physio_target"), "Cached formula results must be disclosed without executing formulas.");
assert.ok(physiotherapy.blankFieldIds.length > 0, "Blank source values must remain absent rather than becoming zero.");

const wrongPeriod = parseMonthlyWorkbookSheet({
  line: "Fisioterapia",
  sheet: physiotherapySheet,
  period: "2026-09",
  branchName: "Fisioterapia Santa Ana",
});
assert.equal(wrongPeriod.status, "blocked", "A workbook from another period must not be applied.");
assert.ok(wrongPeriod.conflicts.includes("PERIOD_MISMATCH"));

const imagingSheet = {
  B4: { v: 67 },
  B5: { v: "Julio 2026" },
  B6: { v: "SS-ANALIZA IMÁGENES ESCALON 2 - L006" },
  H17: { v: 67 },
  H18: { v: "Julio 2026" },
  A19: { v: "Meta", ...rgbYellow },
  H19: { v: 10 },
};
const imaging = parseMonthlyWorkbookSheet({
  line: "Imagenes",
  sheet: imagingSheet,
  period: "2026-07",
  branchName: "Analiza Imágenes Escalón 2",
  branchCode: "L006",
});
assert.equal(imaging.status, "ready", "The authorized branch code may reconcile a longer source branch label.");
assert.equal(imaging.values.imaging_target, 10);

console.log("monthly-workbook-import: PASS");
