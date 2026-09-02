export type MedicalExamReportSummary = {
  recognized: boolean;
  headerRowNumber: number | null;
  headers: string[];
  rowCount: number;
  totalSales: number;
  uniqueBranches: number;
  uniqueDoctors: number;
  uniqueExams: number;
  uniqueSpecialties: number;
  uniqueAreas: number;
  uniqueVisitadores: number;
  minDate: string | null;
  maxDate: string | null;
  matchedBranch: {
    label: string;
    rowCount: number;
    totalSales: number;
    uniqueDoctors: number;
    uniqueExams: number;
    minDate: string | null;
    maxDate: string | null;
  } | null;
  warnings: string[];
};

type Matrix = unknown[][];
type ColumnKey = "fecha" | "sucursal" | "doctor" | "examen" | "especialidad" | "area" | "total" | "visitador";

const requiredColumns: ColumnKey[] = ["fecha", "sucursal", "doctor", "examen", "especialidad", "area", "total", "visitador"];

export function normalizeReportText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function headerKey(value: unknown): ColumnKey | null {
  const normalized = normalizeReportText(value).replace(/ /g, "");
  if (normalized === "fecha") return "fecha";
  if (normalized === "sucursal") return "sucursal";
  if (normalized === "doctor" || normalized === "medico") return "doctor";
  if (normalized === "examen" || normalized === "prueba") return "examen";
  if (normalized === "especialidad") return "especialidad";
  if (normalized === "area") return "area";
  if (normalized === "total" || normalized === "monto" || normalized === "montovendido") return "total";
  if (normalized === "visitador" || normalized === "visitadormedico") return "visitador";
  return null;
}

export function detectMedicalExamHeader(matrix: Matrix) {
  const scanLimit = Math.min(matrix.length, 25);
  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const indexByKey = new Map<ColumnKey, number>();
    row.forEach((cell, columnIndex) => {
      const key = headerKey(cell);
      if (key && !indexByKey.has(key)) indexByKey.set(key, columnIndex);
    });
    if (requiredColumns.every((key) => indexByKey.has(key))) {
      return { rowIndex, indexByKey };
    }
  }
  return null;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[$\s]/g, "").replace(/,(?=\d{3}(?:\D|$))/g, "");
  const parsed = Number(cleaned.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86_400_000));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (slash) return `${slash[3]}-${slash[2]!.padStart(2, "0")}-${slash[1]!.padStart(2, "0")}`;
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function pick(row: unknown[], map: Map<ColumnKey, number>, key: ColumnKey) {
  const index = map.get(key);
  return index === undefined ? null : row[index] ?? null;
}

function asNonEmpty(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function minDate(values: string[]) {
  return values.length ? [...values].sort()[0]! : null;
}

function maxDate(values: string[]) {
  return values.length ? [...values].sort().at(-1)! : null;
}

function branchCodeFromLabel(label: string) {
  const match = label.toUpperCase().match(/(?:^|[-\s])([A-Z]{1,4}\d{2,6})\s*$/);
  return match?.[1] ?? null;
}

function branchMatches(reportLabel: string, target?: { name?: string | null; code?: string | null }) {
  if (!target) return false;
  const report = normalizeReportText(reportLabel);
  const name = normalizeReportText(target.name ?? "");
  const code = String(target.code ?? "").trim().toUpperCase();
  const reportCode = branchCodeFromLabel(reportLabel);
  if (code && reportCode && code === reportCode) return true;
  if (name && (report === name || report.includes(name) || name.includes(report))) return true;
  if (code && report.includes(normalizeReportText(code))) return true;
  return false;
}

export function summarizeMedicalExamMatrix(matrix: Matrix, targetBranch?: { name?: string | null; code?: string | null }): MedicalExamReportSummary {
  const detected = detectMedicalExamHeader(matrix);
  if (!detected) {
    return {
      recognized: false,
      headerRowNumber: null,
      headers: [],
      rowCount: 0,
      totalSales: 0,
      uniqueBranches: 0,
      uniqueDoctors: 0,
      uniqueExams: 0,
      uniqueSpecialties: 0,
      uniqueAreas: 0,
      uniqueVisitadores: 0,
      minDate: null,
      maxDate: null,
      matchedBranch: null,
      warnings: ["MEDICAL_EXAM_HEADER_NOT_FOUND"],
    };
  }

  const headers = [...detected.indexByKey.entries()].sort((a, b) => a[1] - b[1]).map(([key]) => key);
  const branches = new Set<string>();
  const doctors = new Set<string>();
  const exams = new Set<string>();
  const specialties = new Set<string>();
  const areas = new Set<string>();
  const visitadores = new Set<string>();
  const dates: string[] = [];
  const branchStats = new Map<string, { rows: number; sales: number; doctors: Set<string>; exams: Set<string>; dates: string[] }>();
  let rowCount = 0;
  let totalSales = 0;
  let invalidTotalRows = 0;

  const maxRows = Math.min(matrix.length, detected.rowIndex + 1 + 50_000);
  for (let rowIndex = detected.rowIndex + 1; rowIndex < maxRows; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const branch = asNonEmpty(pick(row, detected.indexByKey, "sucursal"));
    const doctor = asNonEmpty(pick(row, detected.indexByKey, "doctor"));
    const exam = asNonEmpty(pick(row, detected.indexByKey, "examen"));
    const specialty = asNonEmpty(pick(row, detected.indexByKey, "especialidad"));
    const area = asNonEmpty(pick(row, detected.indexByKey, "area"));
    const visitador = asNonEmpty(pick(row, detected.indexByKey, "visitador"));
    const date = isoDate(pick(row, detected.indexByKey, "fecha"));
    const total = numericValue(pick(row, detected.indexByKey, "total"));
    const anyData = branch || doctor || exam || specialty || area || visitador || date || total !== null;
    if (!anyData) continue;
    if (total === null) {
      invalidTotalRows += 1;
      continue;
    }

    rowCount += 1;
    totalSales += total;
    if (branch) branches.add(branch);
    if (doctor) doctors.add(doctor);
    if (exam) exams.add(exam);
    if (specialty) specialties.add(specialty);
    if (area) areas.add(area);
    if (visitador) visitadores.add(visitador);
    if (date) dates.push(date);

    if (branch) {
      const stats = branchStats.get(branch) ?? { rows: 0, sales: 0, doctors: new Set<string>(), exams: new Set<string>(), dates: [] };
      stats.rows += 1;
      stats.sales += total;
      if (doctor) stats.doctors.add(doctor);
      if (exam) stats.exams.add(exam);
      if (date) stats.dates.push(date);
      branchStats.set(branch, stats);
    }
  }

  const warnings: string[] = [];
  if (matrix.length > maxRows) warnings.push("ROW_LIMIT_50000_APPLIED");
  if (invalidTotalRows > 0) warnings.push(`INVALID_TOTAL_ROWS:${invalidTotalRows}`);

  let match: [string, { rows: number; sales: number; doctors: Set<string>; exams: Set<string>; dates: string[] }] | undefined;
  if (targetBranch) match = [...branchStats.entries()].find(([label]) => branchMatches(label, targetBranch));
  if (!match && branchStats.size === 1) match = [...branchStats.entries()][0];
  if (!match && targetBranch && branchStats.size > 1) warnings.push("SELECTED_BRANCH_NOT_FOUND_IN_REPORT");

  const matchedBranch = match ? {
    label: match[0],
    rowCount: match[1].rows,
    totalSales: Number(match[1].sales.toFixed(2)),
    uniqueDoctors: match[1].doctors.size,
    uniqueExams: match[1].exams.size,
    minDate: minDate(match[1].dates),
    maxDate: maxDate(match[1].dates),
  } : null;

  return {
    recognized: true,
    headerRowNumber: detected.rowIndex + 1,
    headers,
    rowCount,
    totalSales: Number(totalSales.toFixed(2)),
    uniqueBranches: branches.size,
    uniqueDoctors: doctors.size,
    uniqueExams: exams.size,
    uniqueSpecialties: specialties.size,
    uniqueAreas: areas.size,
    uniqueVisitadores: visitadores.size,
    minDate: minDate(dates),
    maxDate: maxDate(dates),
    matchedBranch,
    warnings,
  };
}
