import assert from "node:assert/strict";

import { summarizeMedicalExamMatrix } from "../lib/data-ingestion/medical-exam-report-core.ts";

const header = ["Fecha", "Sucursal", "Doctor", "Examen", "Especialidad", "Area", "Total", "Visitador"];
const matrix = [
  header,
  ["01/08/2026", "SS - Escalon - L001", "Dra. A", "Perfil A", "Medicina", "Lab", 100, "V1"],
  ["31/08/2026", "SS - Escalon - L001", "Dra. B", "Perfil B", "Medicina", "Lab", 50, "V1"],
  ["01/09/2026", "SS - Escalon - L001", "Dra. C", "Perfil C", "Medicina", "Lab", 900, "V2"],
  ["15/08/2026", "SS - Merliot - L003", "Dra. D", "Perfil D", "Medicina", "Lab", 700, "V3"],
];

const august = summarizeMedicalExamMatrix(
  matrix,
  { code: "L001", name: "Escalon" },
  { start: "2026-08-01", end: "2026-08-31" },
);
assert.equal(august.recognized, true);
assert.equal(august.matchedBranch?.rowCount, 2, "Solo las filas del período del cierre deben alimentar la evidencia.");
assert.equal(august.matchedBranch?.totalSales, 150);
assert.equal(august.matchedBranch?.allPeriodsTotalSales, 1050, "El total completo queda trazable sin contaminar agosto.");
assert.equal(august.matchedBranch?.excludedOutsidePeriodRows, 1);
assert.deepEqual(august.matchedBranch && [august.matchedBranch.minDate, august.matchedBranch.maxDate], ["2026-08-01", "2026-08-31"]);
assert.ok(august.warnings.includes("REPORT_ROWS_OUTSIDE_SUBMISSION_PERIOD:1"));
assert.ok(!august.warnings.includes("REPORT_PERIOD_MISMATCH"));

const july = summarizeMedicalExamMatrix(
  matrix,
  { code: "L001", name: "Escalon" },
  { start: "2026-07-01", end: "2026-07-31" },
);
assert.equal(july.matchedBranch?.rowCount, 0);
assert.equal(july.matchedBranch?.totalSales, 0);
assert.ok(july.warnings.includes("REPORT_PERIOD_MISMATCH"), "Un archivo de otro mes debe fallar cerrado.");

console.log("medical-exam-report-core: PASS");
