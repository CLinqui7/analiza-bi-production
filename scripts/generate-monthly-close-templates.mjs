import fs from "node:fs/promises";

import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

import { getManualMonthlyFormStepsForLine } from "../lib/analytics/import-operations.ts";

const outputDirectory = "artifacts/monthly-close-templates";
const templates = [
  { code: "LABORATORY", formLine: "Laboratorio", fileStem: "laboratory-monthly-close-template", title: "Plantilla de cierre mensual — Laboratorio" },
  { code: "IMAGING", formLine: "Imagenes", fileStem: "imaging-monthly-close-template", title: "Plantilla de cierre mensual — Imágenes" },
  { code: "PHYSIOTHERAPY", formLine: "Fisioterapia", fileStem: "physiotherapy-monthly-close-template", title: "Plantilla de cierre mensual — Fisioterapia" },
];

function exampleFor(field) {
  if (field.inputType === "currency") return 1000;
  if (field.inputType === "number") return 1;
  if (field.inputType === "percent") return 0.1;
  if (field.inputType === "date") return "2026-09-30";
  if (field.inputType === "month") return "2026-09";
  if (field.inputType === "file") return "evidencia-no-productiva.csv";
  return "Ejemplo no productivo";
}

function rulesFor(field) {
  const rules = [];
  if (field.required) rules.push("Obligatorio para publicar");
  if (field.min !== undefined) rules.push(`Mínimo: ${field.min}`);
  if (field.max !== undefined) rules.push(`Máximo: ${field.max}`);
  if (field.inputType === "file") rules.push("Adjunte evidencia permitida, sin datos personales");
  if (field.inputType === "date") rules.push("Formato YYYY-MM-DD");
  if (field.inputType === "month") rules.push("Formato YYYY-MM");
  if (["number", "currency", "percent"].includes(field.inputType)) rules.push("Valor numérico finito; no use NaN ni infinito");
  rules.push("No incluya identificadores de pacientes ni personas");
  return rules.join(". ");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

await fs.mkdir(outputDirectory, { recursive: true });
for (const template of templates) {
  const rows = getManualMonthlyFormStepsForLine(template.formLine).flatMap((step) => step.fields).map((field) => [
    field.label,
    field.id,
    field.description,
    field.required ? "Sí" : "No",
    field.inputType,
    field.unit,
    exampleFor(field),
    rulesFor(field),
  ]);
  const headers = ["Nombre de campo", "Campo técnico", "Descripción", "Obligatorio", "Tipo de dato", "Unidad", "Ejemplo no productivo", "Reglas de validación"];
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("Campos");
  sheet.showGridLines = false;
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [[template.title]];
  sheet.getRange("A2:H2").merge();
  sheet.getRange("A2").values = [["Complete valores agregados por sucursal y período. No incluya nombres, correos ni identificadores de pacientes."]];
  sheet.getRange("A4:H4").values = [headers];
  if (rows.length > 0) sheet.getRange(`A5:H${rows.length + 4}`).values = rows;
  sheet.getRange("A1:H1").format = { fill: "#17324D", font: { name: "Arial", size: 14, bold: true, color: "#FFFFFF" }, verticalAlignment: "center" };
  sheet.getRange("A2:H2").format = { font: { name: "Arial", italic: true, color: "#334155" }, wrapText: true, verticalAlignment: "center" };
  sheet.getRange("A4:H4").format = { fill: "#284E6D", font: { name: "Arial", bold: true, color: "#FFFFFF" }, wrapText: true, verticalAlignment: "center", horizontalAlignment: "center" };
  if (rows.length > 0) {
    sheet.getRange(`A5:H${rows.length + 4}`).format = { font: { name: "Arial", size: 10, color: "#1F2937" }, wrapText: true, verticalAlignment: "top" };
    sheet.getRange(`A4:H${rows.length + 4}`).format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
  }
  sheet.getRange("A:A").format.columnWidth = 26;
  sheet.getRange("B:B").format.columnWidth = 26;
  sheet.getRange("C:C").format.columnWidth = 42;
  sheet.getRange("D:D").format.columnWidth = 14;
  sheet.getRange("E:E").format.columnWidth = 16;
  sheet.getRange("F:F").format.columnWidth = 15;
  sheet.getRange("G:G").format.columnWidth = 25;
  sheet.getRange("H:H").format.columnWidth = 58;
  sheet.getRange("1:1").format.rowHeight = 28;
  sheet.getRange("2:2").format.rowHeight = 36;
  sheet.freezePanes.freezeRows(4);

  const inspection = await workbook.inspect({ kind: "table", range: `Campos!A1:H${Math.min(rows.length + 4, 12)}`, include: "values", tableMaxRows: 12, tableMaxCols: 8 });
  if (!inspection.ndjson.includes(template.title)) throw new Error(`TEMPLATE_INSPECTION_FAILED:${template.code}`);
  const preview = await workbook.render({ sheetName: "Campos", range: `A1:H${Math.min(rows.length + 4, 16)}`, scale: 1, format: "png" });
  await fs.writeFile(`${outputDirectory}/${template.fileStem}.png`, new Uint8Array(await preview.arrayBuffer()));
  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(`${outputDirectory}/${template.fileStem}.xlsx`);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  await fs.writeFile(`${outputDirectory}/${template.fileStem}.csv`, `${csv}\n`);
}

console.log(JSON.stringify({ templates: templates.map((template) => template.code), outputDirectory }));
