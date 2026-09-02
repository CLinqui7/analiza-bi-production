import "server-only";

import * as XLSX from "xlsx";

import { summarizeMedicalExamMatrix, type MedicalExamReportSummary } from "./medical-exam-report-core";

export type ParsedMedicalExamReport = MedicalExamReportSummary & {
  formulaCellCount: number;
  sheetName: string | null;
  piiHeaders: string[];
};


const piiHeaderPattern = /(patient|paciente|nombre[_ -]?paciente|email|correo|phone|telefono|teléfono|dui|documento|document_number|birth|nacimiento|address|direccion|dirección)/i;

function detectPiiHeaders(matrix: unknown[][], headerRowNumber: number | null) {
  if (!headerRowNumber) return [];
  const row = matrix[headerRowNumber - 1] ?? [];
  return row.map((value) => String(value ?? "").trim()).filter((value) => value && piiHeaderPattern.test(value));
}

function formulaCellCount(sheet: XLSX.WorkSheet) {
  let count = 0;
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith("!")) continue;
    if (cell && typeof cell === "object" && "f" in cell && typeof (cell as XLSX.CellObject).f === "string") count += 1;
  }
  return count;
}

export function parseMedicalExamSalesReport(
  buffer: Buffer,
  targetBranch?: { name?: string | null; code?: string | null },
): ParsedMedicalExamReport {
  const workbook = XLSX.read(buffer, { type: "buffer", cellFormula: true, cellDates: true, raw: true });
  const sheetName = workbook.SheetNames[0] ?? null;
  if (!sheetName) {
    return { ...summarizeMedicalExamMatrix([], targetBranch), formulaCellCount: 0, sheetName: null, piiHeaders: [], warnings: ["EMPTY_WORKBOOK"] };
  }
  const sheet = workbook.Sheets[sheetName];
  const formulas = formulaCellCount(sheet);
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true, blankrows: false });
  const summary = summarizeMedicalExamMatrix(matrix, targetBranch);
  const piiHeaders = detectPiiHeaders(matrix, summary.headerRowNumber);
  const warnings = [...summary.warnings, ...piiHeaders.map((header) => `PII_COLUMN_BLOCKED:${header}`)];
  if (workbook.SheetNames.length > 1) warnings.push("ONLY_FIRST_SHEET_PARSED");
  if (formulas > 0) warnings.push(`FORMULA_CELLS_BLOCKED:${formulas}`);
  return { ...summary, formulaCellCount: formulas, sheetName, piiHeaders, warnings: [...new Set(warnings)] };
}
