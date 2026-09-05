import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getMonthlyFormFields } from "@/lib/monthly-form-contract";
import type { ImportBusinessLine } from "@/lib/analytics/import-operations";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";

const lines = {
  laboratory: { fileName: "laboratory-monthly-close-template", formLine: "Laboratorio" },
  imaging: { fileName: "imaging-monthly-close-template", formLine: "Imagenes" },
  physiotherapy: { fileName: "physiotherapy-monthly-close-template", formLine: "Fisioterapia" },
} as const satisfies Record<string, { fileName: string; formLine: ImportBusinessLine }>;

function exampleFor(inputType: string) {
  if (inputType === "currency") return 1000;
  if (inputType === "number") return 1;
  if (inputType === "percent") return 0.1;
  if (inputType === "date") return "2026-09-30";
  if (inputType === "month") return "2026-09";
  if (inputType === "file") return "evidencia-no-productiva.csv";
  return "Ejemplo no productivo";
}

function rulesFor(field: ReturnType<typeof getMonthlyFormFields>[number]) {
  const rules = [];
  if (field.required) rules.push("Obligatorio para publicar");
  if (field.min !== undefined) rules.push(`Mínimo: ${field.min}`);
  if (field.max !== undefined) rules.push(`Máximo: ${field.max}`);
  if (field.inputType === "file") rules.push("Evidencia permitida, sin datos personales");
  if (field.inputType === "date") rules.push("Formato YYYY-MM-DD");
  if (field.inputType === "month") rules.push("Formato YYYY-MM");
  if (["number", "currency", "percent"].includes(field.inputType)) rules.push("Valor numérico finito; no use NaN ni infinito");
  rules.push("No incluya identificadores de pacientes ni personas");
  return rules.join(". ");
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

export async function GET(request: Request, { params }: { params: Promise<{ line: string }> }) {
  const actorOrResponse = await actorForApi("monthly_submission.read");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const { line } = await params;
  const template = lines[line as keyof typeof lines];
  if (!template) return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });

  const headers = ["Nombre de campo", "Campo técnico", "Descripción", "Obligatorio", "Tipo de dato", "Unidad", "Ejemplo no productivo", "Reglas de validación"];
  const rows = getMonthlyFormFields(template.formLine).map((field) => [
    field.label,
    field.id,
    field.description,
    field.required ? "Sí" : "No",
    field.inputType,
    field.unit,
    exampleFor(field.inputType),
    rulesFor(field),
  ]);
  const format = new URL(request.url).searchParams.get("format") ?? "xlsx";
  if (format === "csv") {
    const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    return new Response(`${content}\n`, {
      headers: {
        "Content-Disposition": `attachment; filename="${template.fileName}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (format !== "xlsx") return NextResponse.json({ error: "UNSUPPORTED_FORMAT" }, { status: 400 });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Campos");
  const contents = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Response(contents, {
    headers: {
      "Content-Disposition": `attachment; filename="${template.fileName}.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
