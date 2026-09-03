import { NextResponse } from "next/server";
import { z } from "zod";

import {
  calculateOfficialKpis,
  type AttachmentKpiSource,
} from "@/lib/analytics/official-kpi-engine";
import {
  resolveFormBusinessLine,
  validateMonthlyFormContract,
} from "@/lib/monthly-form-contract";
import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { validateMonthlyResponses } from "@/lib/server/monthly-validation";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ submissionId: z.string().uuid(), versionId: z.string().uuid() });

type Submission = {
  id: string;
  organization_id: string;
  country_id: string;
  company_id: string;
  operational_area_id: string | null;
  branch_id: string;
  business_line_id: string;
  period_start: string;
  period_end: string;
  is_demo: boolean;
};
type Version = { id: string; submission_id: string; version_number: number; responses: Record<string, unknown>; status: string };
type BusinessLine = { id: string; code: string; name: string };
type KpiDefinition = { id: string; code: string };
type KpiResult = { id: string; kpi_code: string };
type Attachment = {
  id: string;
  parser_kind: string;
  parser_status: string;
  extracted_summary: Record<string, unknown>;
  warning_codes: string[];
};

type ParsedBranchSummary = {
  rowCount?: number | null;
  totalSales?: number | null;
  uniqueDoctors?: number | null;
  uniqueExams?: number | null;
  minDate?: string | null;
  maxDate?: string | null;
};

function isParsedBranchSummary(value: unknown): value is ParsedBranchSummary {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function attachmentKpiSource(attachments: Attachment[]): AttachmentKpiSource | null {
  const report = attachments.find((item) =>
    item.parser_kind === "medical_exam_sales_report"
    && ["parsed", "warning"].includes(item.parser_status),
  );
  if (!report) return null;
  const matchedBranch = report.extracted_summary.matchedBranch;
  return {
    attachmentId: report.id,
    warningCodes: report.warning_codes ?? [],
    matchedBranch: isParsedBranchSummary(matchedBranch) ? matchedBranch : null,
  };
}

export async function POST(request: Request) {
  const actorOrResponse = await actorForApi("monthly_submission.publish");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  const supabase = await createClient();

  const [{ data: submissionData }, { data: versionData }] = await Promise.all([
    supabase
      .from("manual_monthly_submissions")
      .select("id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,period_start,period_end,is_demo")
      .eq("id", parsed.data.submissionId)
      .maybeSingle(),
    supabase
      .from("manual_monthly_submission_versions")
      .select("id,submission_id,version_number,responses,status")
      .eq("id", parsed.data.versionId)
      .maybeSingle(),
  ]);
  if (!submissionData || !versionData) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const submission = submissionData as Submission;
  const version = versionData as Version;
  if (version.submission_id !== submission.id || submission.is_demo) return NextResponse.json({ error: "INVALID_VERSION" }, { status: 400 });
  if (version.status === "published") return NextResponse.json({ error: "VERSION_ALREADY_PUBLISHED" }, { status: 409 });

  try {
    assertRecordAccess(actor, {
      organizationId: submission.organization_id,
      countryId: submission.country_id,
      companyId: submission.company_id,
      operationalAreaId: submission.operational_area_id,
      branchId: submission.branch_id,
      businessLineId: submission.business_line_id,
    });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }

  const { data: lineData } = await supabase
    .from("business_lines")
    .select("id,code,name")
    .eq("id", submission.business_line_id)
    .maybeSingle();
  if (!lineData) return NextResponse.json({ error: "BUSINESS_LINE_NOT_FOUND" }, { status: 409 });
  const line = lineData as BusinessLine;
  const formLine = resolveFormBusinessLine(line);
  if (!formLine) return NextResponse.json({ error: "UNSUPPORTED_BUSINESS_LINE" }, { status: 422 });

  if (!String(version.responses.area_manager_name ?? "").trim()) {
    return NextResponse.json({
      error: "AREA_MANAGER_ASSIGNMENT_REQUIRED",
      message: "No se puede publicar hasta que la sucursal tenga un Gerente de Área asignado.",
    }, { status: 409 });
  }

  const contract = validateMonthlyFormContract({ line: formLine, responses: version.responses, requireComplete: true });
  if (contract.missing.length > 0 || contract.invalid.length > 0) {
    return NextResponse.json({
      error: "INCOMPLETE_MONTHLY_FORM",
      missing: contract.missing,
      invalid: contract.invalid,
      message: "Completa todos los campos obligatorios válidos antes de publicar.",
    }, { status: 422 });
  }
  const responseValidation = validateMonthlyResponses(contract.normalized);
  if (responseValidation.blockers.length > 0) {
    return NextResponse.json({ error: "VALIDATION_BLOCKED", validation: responseValidation }, { status: 422 });
  }

  const { data: attachmentData, error: attachmentError } = await supabase
    .from("manual_monthly_submission_attachments")
    .select("id,parser_kind,parser_status,extracted_summary,warning_codes")
    .eq("submission_id", submission.id)
    .eq("submission_version_id", version.id)
    .order("created_at", { ascending: true });
  if (attachmentError) return NextResponse.json({ error: attachmentError.message }, { status: 400 });
  const attachments = (attachmentData ?? []) as Attachment[];
  const validAttachments = attachments.filter((item) => !["blocked", "failed"].includes(item.parser_status));
  if (validAttachments.length < 1 || validAttachments.length > 2) {
    return NextResponse.json({
      error: "MONTHLY_ATTACHMENT_REQUIRED",
      message: "Cada versión necesita entre 1 y 2 archivos válidos antes de publicarse.",
      attachmentCount: validAttachments.length,
    }, { status: 422 });
  }
  if (attachments.some((item) => item.parser_status === "blocked")) {
    return NextResponse.json({
      error: "BLOCKED_ATTACHMENT_PRESENT",
      message: "Hay un archivo bloqueado por calidad. Elimínalo y adjunta una versión válida antes de publicar.",
    }, { status: 422 });
  }

  const reportSource = formLine === "Laboratorio" ? attachmentKpiSource(validAttachments) : null;
  const calculated = calculateOfficialKpis(contract.normalized, reportSource);
  if (calculated.length === 0) {
    return NextResponse.json({
      error: "NO_SUPPORTED_KPIS",
      message: "La fuente no contiene campos suficientes para calcular un KPI oficial aprobado.",
    }, { status: 422 });
  }

  const { data: existingClosings } = await supabase
    .from("closing_versions")
    .select("id,version_number,status")
    .eq("organization_id", submission.organization_id)
    .eq("branch_id", submission.branch_id)
    .eq("business_line_id", submission.business_line_id)
    .eq("period_start", submission.period_start)
    .eq("period_end", submission.period_end)
    .order("version_number", { ascending: false });
  const nextClosingVersion = Math.max(0, ...((existingClosings ?? []) as Array<{ version_number: number }>).map((item) => item.version_number)) + 1;

  // A non-official validated closing is built first. Promotion is atomic through
  // finalize_manual_closing_publication() after KPI rows and lineage exist.
  const { data: closing, error: closingError } = await supabase.from("closing_versions").insert({
    organization_id: submission.organization_id,
    country_id: submission.country_id,
    company_id: submission.company_id,
    operational_area_id: submission.operational_area_id,
    branch_id: submission.branch_id,
    business_line_id: submission.business_line_id,
    period_start: submission.period_start,
    period_end: submission.period_end,
    version_number: nextClosingVersion,
    status: "validated",
    source_kind: "manual",
    manual_submission_version_id: version.id,
    quality_score: null,
    is_demo: false,
  }).select("id").single();
  if (closingError || !closing) return NextResponse.json({ error: closingError?.message ?? "CLOSING_CREATE_FAILED" }, { status: 400 });

  const codes = calculated.map((item) => item.code);
  const { data: definitions } = await supabase.from("kpi_definitions").select("id,code").in("code", codes);
  const byCode = new Map(((definitions ?? []) as KpiDefinition[]).map((item) => [item.code, item.id]));

  const { data: kpiRows, error: kpiError } = await supabase
    .from("closing_kpi_results")
    .insert(calculated.map((item) => ({
      closing_version_id: closing.id,
      kpi_definition_id: byCode.get(item.code) ?? null,
      kpi_code: item.code,
      kpi_name: item.name,
      category: item.category,
      value: item.value,
      numerator: item.numerator,
      denominator: item.denominator,
      unit: item.unit,
      formula_version: item.formulaVersion,
      data_status: item.dataStatus,
      source_note: item.sourceNote,
      is_demo: false,
    })))
    .select("id,kpi_code");
  if (kpiError || !kpiRows) {
    return NextResponse.json({ error: `KPI_WRITE_FAILED:${kpiError?.message ?? "UNKNOWN"}`, draftClosingId: closing.id }, { status: 400 });
  }

  const resultByCode = new Map((kpiRows as KpiResult[]).map((item) => [item.kpi_code, item.id]));
  const lineageRows = calculated.flatMap((item) => {
    const resultId = resultByCode.get(item.code);
    if (!resultId) return [];
    return [{
      closing_kpi_result_id: resultId,
      source_attachment_id: item.sourceAttachmentId,
      formula_version: item.formulaVersion,
      transformation_steps: item.transformationSteps,
      validation_codes: item.validationCodes,
      data_quality_score: null,
      evidence_payload: {
        manual_submission_id: submission.id,
        manual_submission_version_id: version.id,
        source_kind: item.sourceAttachmentId ? "monthly_attachment_aggregate" : "monthly_form",
      },
    }];
  });
  if (lineageRows.length > 0) {
    const { error: lineageError } = await supabase.from("kpi_result_lineage").insert(lineageRows);
    if (lineageError) {
      return NextResponse.json({ error: `LINEAGE_WRITE_FAILED:${lineageError.message}`, draftClosingId: closing.id }, { status: 400 });
    }
  }

  const finalized = await supabase.rpc("finalize_manual_closing_publication", { p_closing_id: closing.id });
  if (finalized.error) {
    return NextResponse.json({ error: `PUBLICATION_FINALIZE_FAILED:${finalized.error.message}`, draftClosingId: closing.id }, { status: 400 });
  }

  const eventDetails = {
    closing_version_id: closing.id,
    calculated_kpis: calculated.map((item) => item.code),
    attachment_ids: validAttachments.map((item) => item.id),
  };
  await supabase.from("manual_monthly_submission_events").insert({
    submission_id: submission.id,
    submission_version_id: version.id,
    event_type: "published",
    actor_id: actor.userId,
    details: eventDetails,
  });
  await supabase.from("audit_logs").insert({
    organization_id: submission.organization_id,
    actor_user_id: actor.userId,
    action: "monthly_submission.published",
    entity_table: "closing_versions",
    entity_id: closing.id,
    country_id: submission.country_id,
    company_id: submission.company_id,
    branch_id: submission.branch_id,
    metadata: {
      source_submission_id: submission.id,
      source_version_id: version.id,
      kpi_count: calculated.length,
      attachment_count: validAttachments.length,
    },
  });

  return NextResponse.json({
    closingVersionId: closing.id,
    kpiCount: calculated.length,
    kpis: calculated,
    attachmentCount: validAttachments.length,
  });
}
