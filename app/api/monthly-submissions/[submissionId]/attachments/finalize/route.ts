import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseMedicalExamSalesReport } from "@/lib/data-ingestion/medical-exam-report";
import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { createClient } from "@/lib/supabase/server";

const maxBytes = 15 * 1024 * 1024;
const structuredExtensions = new Set(["xlsx", "xls", "csv"]);
const acceptedExtensions = new Set(["xlsx", "xls", "csv", "pdf", "doc", "docx", "ppt", "pptx", "txt", "png", "jpg", "jpeg"]);
const mimeByExtension: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};
const schema = z.object({
  versionId: z.string().uuid(),
  storagePath: z.string().min(10).max(700),
  originalFileName: z.string().trim().min(1).max(240),
  mimeType: z.string().max(200).optional(),
});

type Submission = { id: string; organization_id: string; country_id: string; company_id: string; operational_area_id: string | null; branch_id: string; business_line_id: string; is_demo: boolean };
type Version = { id: string; submission_id: string; status: string };
type Branch = { id: string; name: string; code: string };
type BusinessLine = { id: string; code: string; name: string };

function sanitizedName(value: string) {
  const name = value.split(/[\\/]/).pop() ?? "evidence";
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 180) || "evidence";
}

export async function POST(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  const actorOrResponse = await actorForApi("monthly_submission.write");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FINALIZE_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  const { submissionId } = await context.params;
  const supabase = await createClient();
  const [{ data: submissionData }, { data: versionData }] = await Promise.all([
    supabase.from("manual_monthly_submissions").select("id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,is_demo").eq("id", submissionId).maybeSingle(),
    supabase.from("manual_monthly_submission_versions").select("id,submission_id,status").eq("id", parsed.data.versionId).maybeSingle(),
  ]);
  if (!submissionData || !versionData) return NextResponse.json({ error: "SUBMISSION_VERSION_NOT_FOUND" }, { status: 404 });
  const submission = submissionData as Submission;
  const version = versionData as Version;
  if (version.submission_id !== submission.id || submission.is_demo || version.status === "published") return NextResponse.json({ error: "VERSION_NOT_EDITABLE" }, { status: 409 });

  try {
    assertRecordAccess(actor, { organizationId: submission.organization_id, countryId: submission.country_id, companyId: submission.company_id, operationalAreaId: submission.operational_area_id, branchId: submission.branch_id, businessLineId: submission.business_line_id });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }

  const expectedPrefix = `${submission.organization_id}/${submission.branch_id}/${submission.id}/${version.id}/`;
  if (!parsed.data.storagePath.startsWith(expectedPrefix) || parsed.data.storagePath.includes("..")) {
    return NextResponse.json({ error: "INVALID_STORAGE_PATH" }, { status: 400 });
  }

  const cleanName = sanitizedName(parsed.data.originalFileName);
  const extension = cleanName.includes(".") ? cleanName.split(".").pop()!.toLowerCase() : "";
  if (!acceptedExtensions.has(extension)) {
    await supabase.storage.from("monthly-evidence").remove([parsed.data.storagePath]);
    return NextResponse.json({ error: "UNSUPPORTED_FILE_TYPE" }, { status: 415 });
  }

  const { count, error: countError } = await supabase.from("manual_monthly_submission_attachments").select("id", { head: true, count: "exact" }).eq("submission_version_id", version.id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });
  if ((count ?? 0) >= 2) {
    await supabase.storage.from("monthly-evidence").remove([parsed.data.storagePath]);
    return NextResponse.json({ error: "MAX_TWO_FILES", message: "Esta versión ya tiene el máximo de 2 archivos." }, { status: 422 });
  }

  const downloaded = await supabase.storage.from("monthly-evidence").download(parsed.data.storagePath);
  if (downloaded.error || !downloaded.data) return NextResponse.json({ error: `STORAGE_DOWNLOAD_FAILED:${downloaded.error?.message ?? "UNKNOWN"}` }, { status: 400 });
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  if (buffer.byteLength <= 0 || buffer.byteLength > maxBytes) {
    await supabase.storage.from("monthly-evidence").remove([parsed.data.storagePath]);
    return NextResponse.json({ error: "INVALID_FILE_SIZE" }, { status: 413 });
  }

  const [{ data: branchData }, { data: lineData }] = await Promise.all([
    supabase.from("branches").select("id,name,code").eq("id", submission.branch_id).maybeSingle(),
    supabase.from("business_lines").select("id,code,name").eq("id", submission.business_line_id).maybeSingle(),
  ]);
  const branch = branchData as Branch | null;
  const businessLine = lineData as BusinessLine | null;
  if (!branch || !businessLine) return NextResponse.json({ error: "CONTEXT_CATALOG_NOT_FOUND" }, { status: 409 });

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  let parserKind: "evidence" | "medical_exam_sales_report" | "generic_spreadsheet" = "evidence";
  let parserStatus: "parsed" | "evidence_only" | "warning" | "blocked" = "evidence_only";
  let extractedSummary: Record<string, unknown> = {};
  let warningCodes: string[] = [];

  if (structuredExtensions.has(extension)) {
    parserKind = "generic_spreadsheet";
    try {
      const parsedReport = parseMedicalExamSalesReport(buffer, { name: branch.name, code: branch.code });
      if (parsedReport.piiHeaders.length > 0) {
        await supabase.storage.from("monthly-evidence").remove([parsed.data.storagePath]);
        return NextResponse.json({ error: "PII_COLUMNS_BLOCKED", message: "El archivo contiene columnas con datos personales de pacientes. Elimínalas antes de subirlo.", columns: parsedReport.piiHeaders }, { status: 422 });
      }
      if (parsedReport.recognized && businessLine.code === "LABORATORY") {
        parserKind = "medical_exam_sales_report";
        parserStatus = parsedReport.formulaCellCount > 0 ? "blocked" : parsedReport.warnings.length > 0 ? "warning" : "parsed";
        warningCodes = parsedReport.warnings;
        extractedSummary = {
          reportType: "medical_exam_sales_report",
          headerRowNumber: parsedReport.headerRowNumber,
          rowCount: parsedReport.rowCount,
          totalSales: parsedReport.totalSales,
          uniqueBranches: parsedReport.uniqueBranches,
          uniqueDoctors: parsedReport.uniqueDoctors,
          uniqueExams: parsedReport.uniqueExams,
          uniqueSpecialties: parsedReport.uniqueSpecialties,
          uniqueAreas: parsedReport.uniqueAreas,
          uniqueVisitadores: parsedReport.uniqueVisitadores,
          minDate: parsedReport.minDate,
          maxDate: parsedReport.maxDate,
          matchedBranch: parsedReport.matchedBranch,
          sheetName: parsedReport.sheetName,
        };
      } else {
        warningCodes = parsedReport.recognized ? ["REPORT_ONLY_USED_FOR_LABORATORY"] : ["SPREADSHEET_STORED_AS_EVIDENCE_ONLY"];
        parserStatus = "evidence_only";
      }
    } catch {
      parserStatus = "warning";
      warningCodes = ["SPREADSHEET_PARSE_FAILED_STORED_AS_EVIDENCE"];
    }
  }

  const contentType = parsed.data.mimeType || mimeByExtension[extension] || "application/octet-stream";
  const inserted = await supabase.from("manual_monthly_submission_attachments").insert({
    organization_id: submission.organization_id,
    country_id: submission.country_id,
    company_id: submission.company_id,
    operational_area_id: submission.operational_area_id,
    branch_id: submission.branch_id,
    business_line_id: submission.business_line_id,
    submission_id: submission.id,
    submission_version_id: version.id,
    uploaded_by: actor.userId,
    original_file_name: parsed.data.originalFileName,
    sanitized_file_name: cleanName,
    file_extension: extension,
    mime_type: contentType,
    byte_size: buffer.byteLength,
    sha256,
    storage_bucket: "monthly-evidence",
    storage_path: parsed.data.storagePath,
    parser_kind: parserKind,
    parser_status: parserStatus,
    contains_personal_data: false,
    extracted_summary: extractedSummary,
    warning_codes: warningCodes,
  }).select("id,original_file_name,sanitized_file_name,file_extension,byte_size,parser_kind,parser_status,extracted_summary,warning_codes,created_at").single();

  if (inserted.error || !inserted.data) {
    await supabase.storage.from("monthly-evidence").remove([parsed.data.storagePath]);
    return NextResponse.json({ error: inserted.error?.message ?? "ATTACHMENT_RECORD_FAILED" }, { status: 409 });
  }

  await supabase.from("manual_monthly_submission_events").insert({ submission_id: submission.id, submission_version_id: version.id, event_type: "saved", actor_id: actor.userId, details: { attachment_ids: [inserted.data.id], attachment_count: 1 } });
  await supabase.from("audit_logs").insert({ organization_id: submission.organization_id, actor_user_id: actor.userId, action: "monthly_submission.attachment_finalized", entity_table: "manual_monthly_submissions", entity_id: submission.id, country_id: submission.country_id, company_id: submission.company_id, branch_id: submission.branch_id, metadata: { version_id: version.id, parser_status: parserStatus } });

  return NextResponse.json({ item: inserted.data }, { status: 201 });
}
