import assert from "node:assert/strict";

import { reconcileMonthlyEvidence } from "../lib/server/monthly-evidence-reconciliation.ts";

function attachment(overrides = {}) {
  return {
    id: "attachment-a",
    parser_kind: "medical_exam_sales_report",
    parser_status: "parsed",
    sha256: "abc123",
    extracted_summary: {},
    warning_codes: [],
    ...overrides,
  };
}

const period = { periodStart: "2026-08-01", periodEnd: "2026-08-31" };
const partialLab = reconcileMonthlyEvidence({
  attachments: [attachment({
    extracted_summary: { matchedBranch: { totalSales: 400, minDate: "2026-08-01", maxDate: "2026-08-31" } },
  })],
  formLine: "Laboratorio",
  ...period,
  responses: { lab_total_sales: 1000 },
});
assert.equal(partialLab.items[0]?.status, "partial", "Un reporte documental parcial se informa sin reemplazar la venta oficial.");
assert.equal(partialLab.items[0]?.coveragePct, 40);
assert.deepEqual(partialLab.blockers, []);
assert.ok(partialLab.warnings.includes("LAB_DOCUMENT_PARTIAL_COVERAGE"));

const excessiveLab = reconcileMonthlyEvidence({
  attachments: [attachment({
    extracted_summary: { matchedBranch: { totalSales: 1100, minDate: "2026-08-01", maxDate: "2026-08-31" } },
  })],
  formLine: "Laboratorio",
  ...period,
  responses: { lab_total_sales: 1000 },
});
assert.ok(excessiveLab.blockers.includes("DOCUMENT_SALES_EXCEED_FORM_TOTAL"));
assert.equal(excessiveLab.items[0]?.status, "mismatch");

const wrongPeriod = reconcileMonthlyEvidence({
  attachments: [attachment({
    extracted_summary: { matchedBranch: { totalSales: 100, minDate: "2026-09-01", maxDate: "2026-09-30" } },
  })],
  formLine: "Laboratorio",
  ...period,
  responses: { lab_total_sales: 100 },
});
assert.ok(wrongPeriod.blockers.includes("DOCUMENT_PERIOD_MISMATCH"));

const physioMatch = reconcileMonthlyEvidence({
  attachments: [attachment({
    parser_kind: "monthly_form_workbook",
    extracted_summary: { values: { physio_sale_dd: 250, physio_target: 300 }, detectedPeriod: "2026-08" },
  })],
  formLine: "Fisioterapia",
  ...period,
  responses: { physio_sale_dd: 250, physio_target: 300 },
});
assert.equal(physioMatch.items[0]?.status, "matched");
assert.equal(physioMatch.items[0]?.matchedFieldCount, 2);

const physioMismatch = reconcileMonthlyEvidence({
  attachments: [attachment({
    parser_kind: "monthly_form_workbook",
    extracted_summary: { values: { physio_sale_dd: 275 }, detectedPeriod: "2026-08" },
  })],
  formLine: "Fisioterapia",
  ...period,
  responses: { physio_sale_dd: 250 },
});
assert.ok(physioMismatch.blockers.includes("DOCUMENT_FORM_VALUE_MISMATCH"));
assert.deepEqual(physioMismatch.items[0]?.mismatchedFields, ["physio_sale_dd"]);

const importedHashMismatch = reconcileMonthlyEvidence({
  attachments: [attachment()],
  formLine: "Laboratorio",
  importSource: { sourceFileSha256: "different", formulaFieldCount: 2 },
  ...period,
  responses: { lab_total_sales: 100 },
});
assert.ok(importedHashMismatch.blockers.includes("IMPORTED_WORKBOOK_ATTACHMENT_MISMATCH"));
assert.ok(importedHashMismatch.warnings.includes("IMPORTED_WORKBOOK_HAS_FORMULAS:2"));

const genericOnly = reconcileMonthlyEvidence({
  attachments: [attachment({ parser_kind: "generic_spreadsheet", parser_status: "evidence_only" })],
  formLine: "Imagenes",
  ...period,
  responses: { imaging_sale_dd: 100 },
});
assert.ok(genericOnly.blockers.includes("MONTHLY_FORM_WORKBOOK_REQUIRED"), "Un respaldo genérico no sustituye la plantilla estructurada de la línea.");
assert.equal(genericOnly.items[0]?.status, "unverified");

console.log("monthly-evidence-reconciliation: PASS");
