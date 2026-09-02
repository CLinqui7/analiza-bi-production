import "server-only";

import { PDFDocument, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";

export type ExportRow = Record<string, string | number | null>;

function safeCell(value: string | number | null) {
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvEscape(value: string | number | null) {
  const safe = safeCell(value);
  const text = safe === null ? "" : String(safe);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(rows: ExportRow[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : ["message"];
  const data = rows.length ? rows : [{ message: "No hay registros para exportar" }];
  return Buffer.from([headers.map(csvEscape).join(","), ...data.map((row) => headers.map((header) => csvEscape(row[header] ?? null)).join(","))].join("\n"), "utf8");
}

export function buildXlsx(rows: ExportRow[]) {
  const sanitized = (rows.length ? rows : [{ message: "No hay registros para exportar" }]).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeCell(value)])));
  const sheet = XLSX.utils.json_to_sheet(sanitized);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Analiza BI");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

export async function buildPdf(rows: ExportRow[], title: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const safeRows = rows.length ? rows : [{ message: "No hay registros para exportar" }];
  const lines = safeRows.slice(0, 300).map((row) => Object.entries(row).map(([key, value]) => `${key}: ${safeCell(value) ?? ""}`).join(" | "));
  let page = pdf.addPage([842, 595]);
  let y = 560;
  page.drawText(title.slice(0, 90), { x: 36, y, size: 14, font: bold });
  y -= 28;
  for (const line of lines) {
    if (y < 36) { page = pdf.addPage([842, 595]); y = 560; }
    page.drawText(line.replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ%$.,:;()/_ -]/g, "").slice(0, 150), { x: 36, y, size: 7, font });
    y -= 11;
  }
  return Buffer.from(await pdf.save());
}
