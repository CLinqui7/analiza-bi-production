import { NextResponse } from "next/server";

import { getMonthlyFormSteps, resolveFormBusinessLine } from "@/lib/monthly-form-contract";
import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { buildCsv, buildPdf, buildXlsx, type ExportRow } from "@/lib/server/export-builder";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ submissionId: string }> };
type SubmissionRow = {
  id: string;
  organization_id: string;
  country_id: string;
  company_id: string;
  operational_area_id: string | null;
  branch_id: string;
  business_line_id: string;
  period_start: string;
  period_end: string;
  status: string;
  current_version_number: number;
};
type VersionRow = {
  id: string;
  version_number: number;
  responses: Record<string, unknown>;
  status: string;
  created_at: string;
  published_at: string | null;
};
type NamedRow = { id: string; name: string; code?: string | null; city?: string | null };
type LineRow = NamedRow & { company_id: string | null };
type AttachmentRow = { original_file_name: string; parser_status: string; created_at: string };

function relationValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export async function GET(request: Request, context: RouteContext) {
  const actorOrResponse = await actorForApi("monthly_submission.read");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });

  const { submissionId } = await context.params;
  const format = new URL(request.url).searchParams.get("format") ?? "xlsx";
  if (!/^[0-9a-f-]{36}$/i.test(submissionId) || !["xlsx", "csv", "pdf"].includes(format)) {
    return NextResponse.json({ error: "INVALID_REPORT_REQUEST" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: submissionData, error: submissionError } = await supabase
    .from("manual_monthly_submissions")
    .select("id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,period_start,period_end,status,current_version_number")
    .eq("id", submissionId)
    .maybeSingle();
  if (submissionError || !submissionData) {
    return NextResponse.json({ error: "SUBMISSION_NOT_FOUND" }, { status: 404 });
  }
  const submission = submissionData as SubmissionRow;

  try {
    assertRecordAccess(actor, {
      organizationId: submission.organization_id,
      countryId: submission.country_id,
      companyId: submission.company_id,
      operationalAreaId: submission.operational_area_id,
      branchId: submission.branch_id,
    });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }

  const { data: versionData, error: versionError } = await supabase
    .from("manual_monthly_submission_versions")
    .select("id,version_number,responses,status,created_at,published_at")
    .eq("submission_id", submission.id)
    .eq("version_number", submission.current_version_number)
    .maybeSingle();
  if (versionError || !versionData) {
    return NextResponse.json({ error: "REPORT_VERSION_NOT_FOUND" }, { status: 404 });
  }
  const version = versionData as VersionRow;

  const [branchResult, lineResult, countryResult, companyResult, areaResult, attachmentResult] = await Promise.all([
    supabase.from("branches").select("id,name,code,city").eq("id", submission.branch_id).maybeSingle(),
    supabase.from("business_lines").select("id,name,code,company_id").eq("id", submission.business_line_id).maybeSingle(),
    supabase.from("countries").select("id,name").eq("id", submission.country_id).maybeSingle(),
    supabase.from("companies").select("id,name").eq("id", submission.company_id).maybeSingle(),
    submission.operational_area_id
      ? supabase.from("operational_areas").select("id,name,code").eq("id", submission.operational_area_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("manual_monthly_submission_attachments")
      .select("original_file_name,parser_status,created_at")
      .eq("submission_id", submission.id)
      .eq("submission_version_id", version.id)
      .order("created_at"),
  ]);

  if (lineResult.error || !lineResult.data) {
    return NextResponse.json({ error: "BUSINESS_LINE_NOT_FOUND" }, { status: 404 });
  }

  const branch = (branchResult.data ?? { id: submission.branch_id, name: "Sucursal", code: "" }) as NamedRow;
  const line = lineResult.data as LineRow;
  const country = (countryResult.data ?? { id: submission.country_id, name: "" }) as NamedRow;
  const company = (companyResult.data ?? { id: submission.company_id, name: "" }) as NamedRow;
  const area = (areaResult.data ?? { id: submission.operational_area_id ?? "", name: "" }) as NamedRow;
  const attachments = (attachmentResult.data ?? []) as AttachmentRow[];
  const formLine = resolveFormBusinessLine(line);
  if (!formLine) return NextResponse.json({ error: "UNSUPPORTED_BUSINESS_LINE" }, { status: 422 });

  const rows: ExportRow[] = [
    { seccion: "Identificación", campo: "Línea", valor: line.name, unidad: "", obligatorio: "Sí" },
    { seccion: "Identificación", campo: "País", valor: country.name, unidad: "", obligatorio: "Sí" },
    { seccion: "Identificación", campo: "Empresa", valor: company.name, unidad: "", obligatorio: "Sí" },
    { seccion: "Identificación", campo: "Área operativa", valor: area.name, unidad: "", obligatorio: "Sí" },
    { seccion: "Identificación", campo: "Sucursal", valor: branch.name, unidad: "", obligatorio: "Sí" },
    { seccion: "Identificación", campo: "Periodo", valor: submission.period_start.slice(0, 7), unidad: "mes", obligatorio: "Sí" },
    { seccion: "Identificación", campo: "Estado", valor: submission.status, unidad: "", obligatorio: "Sí" },
    { seccion: "Identificación", campo: "Versión", valor: version.version_number, unidad: "", obligatorio: "Sí" },
  ];

  for (const step of getMonthlyFormSteps(formLine)) {
    for (const field of step.fields) {
      if (field.inputType === "file") continue;
      rows.push({
        seccion: step.title,
        campo: field.label,
        valor: relationValue(version.responses[field.id]),
        unidad: field.unit ?? "",
        obligatorio: field.required ? "Sí" : "No",
      });
    }
  }

  attachments.forEach((item, index) => {
    rows.push({
      seccion: "Archivos y publicación",
      campo: `Archivo ${index + 1}`,
      valor: item.original_file_name,
      unidad: item.parser_status,
      obligatorio: index === 0 ? "Sí" : "No",
    });
  });

  const title = `Analiza Intelligence · ${line.name} · ${branch.name} · ${submission.period_start.slice(0, 7)}`;
  const buffer = format === "csv"
    ? buildCsv(rows)
    : format === "pdf"
      ? await buildPdf(rows, title)
      : buildXlsx(rows);
  const contentType = format === "csv"
    ? "text/csv; charset=utf-8"
    : format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const fileName = safeName(`analiza-${line.code}-${branch.code ?? branch.name}-${submission.period_start.slice(0, 7)}-v${version.version_number}.${format}`);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
