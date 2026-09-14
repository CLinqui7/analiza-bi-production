import { createHash } from "node:crypto";

import type { ManualMonthlyFormField } from "@/lib/analytics/import-operations";
import { getManualMonthlyFormStepsForLine } from "./analytics/import-operations.ts";
import { monthlyFormSourceContracts } from "./monthly-form-source-contracts.ts";

type ImportableLine = "Fisioterapia" | "Imagenes";

type WorkbookColor = { rgb?: string; theme?: number };
type WorkbookFill = { fgColor?: WorkbookColor; patternType?: string };
type WorkbookStyle = WorkbookFill & { fill?: WorkbookFill };
export type WorkbookCell = {
  v?: unknown;
  w?: string;
  f?: string;
  t?: string;
  s?: WorkbookStyle;
};
export type WorkbookSheet = Record<string, WorkbookCell | unknown>;

export type MonthlyWorkbookImportResult = {
  status: "ready" | "blocked";
  line: ImportableLine;
  contractVersion: string;
  sourceFileSha256: string;
  sourceSheet: string;
  detectedPeriod: string | null;
  detectedBranch: string | null;
  matchedColumn: string | null;
  values: Record<string, string | number>;
  recognizedCount: number;
  blankFieldIds: string[];
  conflicts: string[];
  formulaFieldIds: string[];
  unresolvedSourceLabels: string[];
};

function cell(sheet: WorkbookSheet, address: string) {
  const value = sheet[address];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as WorkbookCell
    : undefined;
}

function textValue(value: WorkbookCell | undefined) {
  if (!value) return "";
  if (typeof value.w === "string" && value.w.trim()) return value.w.trim();
  if (value.v instanceof Date) return value.v.toISOString();
  if (["string", "number", "boolean"].includes(typeof value.v)) return String(value.v).trim();
  return "";
}

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

export function isApprovedYellowCell(value: WorkbookCell | undefined) {
  const style = value?.s;
  const fill = style?.fill ?? style;
  const color = fill?.fgColor;
  const rgb = color?.rgb?.replace(/^#/, "").toUpperCase();
  return color?.theme === 7 || rgb === "FFC000" || rgb === "FFFFC000";
}

const spanishMonths = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

export function monthFromSourceLabel(value: string) {
  const normalized = normalizedText(value);
  const yearMatch = /\b(20\d{2})\b/.exec(normalized);
  const monthIndex = spanishMonths.findIndex((month) => normalized.includes(month));
  if (!yearMatch || monthIndex < 0) return null;
  return `${yearMatch[1]}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function columnName(index: number) {
  let value = index;
  let output = "";
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}

function rowNumber(address: string) {
  const match = /^(?:[A-Z]+)(\d+)$/.exec(address.toUpperCase());
  return match ? Number(match[1]) : null;
}

function parseNumericText(value: string) {
  const compact = value.replace(/[$%\s]/g, "");
  if (!compact) return null;
  let normalized = compact;
  if (compact.includes(",") && compact.includes(".")) {
    normalized = compact.lastIndexOf(",") > compact.lastIndexOf(".")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "");
  } else if (compact.includes(",")) {
    const trailing = compact.length - compact.lastIndexOf(",") - 1;
    normalized = trailing > 0 && trailing <= 2 ? compact.replace(",", ".") : compact.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function importedValue(value: WorkbookCell | undefined, field: ManualMonthlyFormField) {
  if (!value || value.v === null || value.v === undefined || textValue(value) === "") return null;
  if (value.t === "e" || /^#(?:REF|N\/A|VALUE|DIV\/0|NAME|NUM|NULL)!?$/i.test(textValue(value))) return null;
  if (["number", "currency", "percent"].includes(field.inputType)) {
    if (typeof value.v === "number" && Number.isFinite(value.v)) return value.v;
    return parseNumericText(textValue(value));
  }
  const raw = textValue(value).slice(0, 2000);
  if (!raw || /^[=+\-@]/.test(raw)) return null;
  return raw;
}

function branchMatches(sourceBranch: string, branchName: string, branchCode?: string | null) {
  const source = normalizedText(sourceBranch);
  const name = normalizedText(branchName);
  const code = normalizedText(branchCode ?? "");
  return source === name || (code.length >= 3 && source.split(" ").includes(code));
}

function lineConfig(line: ImportableLine) {
  return line === "Fisioterapia"
    ? { headerRow: 15, monthRow: 16, firstColumn: 3, lastColumn: 20 }
    : { headerRow: 17, monthRow: 18, firstColumn: 3, lastColumn: 20 };
}

export function parseMonthlyWorkbookSheet({
  line,
  sheet,
  period,
  branchName,
  branchCode,
}: {
  line: ImportableLine;
  sheet: WorkbookSheet;
  period: string;
  branchName: string;
  branchCode?: string | null;
}): Omit<MonthlyWorkbookImportResult, "sourceFileSha256"> {
  const contract = monthlyFormSourceContracts[line];
  const config = lineConfig(line);
  const detectedPeriod = monthFromSourceLabel(textValue(cell(sheet, "B5")));
  const detectedBranch = textValue(cell(sheet, "B6")) || null;
  const sequence = textValue(cell(sheet, "B4"));
  const conflicts: string[] = [];

  if (detectedPeriod !== period) conflicts.push("PERIOD_MISMATCH");
  if (!detectedBranch || !branchMatches(detectedBranch, branchName, branchCode)) conflicts.push("BRANCH_MISMATCH");

  let matchedColumn: string | null = null;
  for (let index = config.firstColumn; index <= config.lastColumn; index += 1) {
    const column = columnName(index);
    const header = textValue(cell(sheet, `${column}${config.headerRow}`));
    const month = monthFromSourceLabel(textValue(cell(sheet, `${column}${config.monthRow}`)));
    if ((sequence && header === sequence) || month === period) {
      matchedColumn = column;
      if (month === period) break;
    }
  }
  if (!matchedColumn) conflicts.push("PERIOD_COLUMN_NOT_FOUND");

  const values: Record<string, string | number> = {};
  const blankFieldIds: string[] = [];
  const formulaFieldIds: string[] = [];
  const fields = getManualMonthlyFormStepsForLine(line).flatMap((step) => step.fields)
    .filter((field) => field.source?.classification !== "CONTEXT_YELLOW");

  if (matchedColumn) {
    for (const field of fields) {
      const source = field.source;
      if (!source) continue;
      const labelAddress = source.labelCell;
      const labelCell = cell(sheet, labelAddress);
      const allowedLabels = [source.sourceLabel, ...(source.aliases ?? [])].map(normalizedText);
      if (!allowedLabels.includes(normalizedText(textValue(labelCell)))) {
        conflicts.push(`LABEL_MISMATCH:${field.id}`);
        continue;
      }
      if (!isApprovedYellowCell(labelCell)) {
        conflicts.push(`NON_YELLOW_SOURCE:${field.id}`);
        continue;
      }
      const row = rowNumber(labelAddress);
      if (!row) {
        conflicts.push(`INVALID_SOURCE_ADDRESS:${field.id}`);
        continue;
      }
      const sourceValue = cell(sheet, `${matchedColumn}${row}`);
      if (sourceValue?.f) formulaFieldIds.push(field.id);
      const parsed = importedValue(sourceValue, field);
      if (parsed === null) blankFieldIds.push(field.id);
      else values[field.id] = parsed;
    }
  }

  const blockingCodes = new Set(["PERIOD_MISMATCH", "BRANCH_MISMATCH", "PERIOD_COLUMN_NOT_FOUND"]);
  const status = conflicts.some((item) => blockingCodes.has(item)) ? "blocked" : "ready";
  return {
    status,
    line,
    contractVersion: contract.version,
    sourceSheet: contract.sheet,
    detectedPeriod,
    detectedBranch,
    matchedColumn,
    values,
    recognizedCount: Object.keys(values).length,
    blankFieldIds,
    conflicts,
    formulaFieldIds,
    unresolvedSourceLabels: line === "Fisioterapia" ? ["A99:A112 · 14 etiquetas #REF! pendientes"] : [],
  };
}

export async function parseMonthlyWorkbookBuffer({
  line,
  buffer,
  period,
  branchName,
  branchCode,
}: {
  line: ImportableLine;
  buffer: ArrayBuffer;
  period: string;
  branchName: string;
  branchCode?: string | null;
}): Promise<MonthlyWorkbookImportResult> {
  // The parser is loaded only for an explicit import request, keeping xlsx out
  // of the form's browser bundle and out of normal page navigation.
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    cellDates: true,
    cellFormula: true,
    cellStyles: true,
  });
  const expectedSheet = monthlyFormSourceContracts[line].sheet;
  const sheet = workbook.Sheets[expectedSheet];
  if (!sheet) throw new Error("EXPECTED_SOURCE_SHEET_NOT_FOUND");
  const result = parseMonthlyWorkbookSheet({
    line,
    sheet: sheet as WorkbookSheet,
    period,
    branchName,
    branchCode,
  });
  return {
    ...result,
    sourceFileSha256: createHash("sha256").update(new Uint8Array(buffer)).digest("hex").toUpperCase(),
  };
}
