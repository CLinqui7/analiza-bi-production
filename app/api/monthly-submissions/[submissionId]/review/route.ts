import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { calculateOfficialKpis, type AttachmentKpiSource } from "@/lib/analytics/official-kpi-engine";
import {
  isSupportedMonthlyFormContractVersion,
  resolveFormBusinessLine,
  savedMonthlyFormContractVersion,
  validateMonthlyFormContract,
} from "@/lib/monthly-form-contract";
import {
  buildMonthlyPublicationReview,
  MONTHLY_PUBLICATION_CONFIRMATION,
} from "@/lib/server/monthly-publication-review";
import { reconcileMonthlyEvidence } from "@/lib/server/monthly-evidence-reconciliation";
import { validateMonthlyResponses } from "@/lib/server/monthly-validation";
import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { createAdminClient } from "@/lib/v7/server/admin-client";
import { hasSupabaseAdminConfiguration } from "@/lib/v7/server/env";

const schema = z.object({
  versionId: z.string().uuid(),
  action: z.enum(["prepare", "confirm"]),
  confirmationText: z.string().optional(),
});

type Submission = {
  id: string; organization_id: string; country_id: string; company_id: string;
  operational_area_id: string | null; branch_id: string; business_line_id: string;
  period_start: string; period_end: string; current_version_number: number; is_demo: boolean;
};
type Version = {
  id: string; submission_id: string; version_number: number; responses: Record<string, unknown>;
  status: string; correction_request_id: string | null; base_submission_version_id: string | null;
  validation_summary: Record<string, unknown> | null;
};
type Attachment = {
  id: string; original_file_name: string; byte_size: number; sha256: string;
  storage_bucket: string; storage_path: string;
  parser_kind: string; parser_status: string; extracted_summary: Record<string, unknown>;
  warning_codes: string[] | null;
};
type Named = { id: string; name: string; code: string };

function attachmentSource(attachments: Attachment[]): AttachmentKpiSource | null {
  const report = attachments.find((item) =>
    item.parser_kind === "medical_exam_sales_report"
    && ["parsed", "warning"].includes(item.parser_status),
  );
  if (!report) return null;
  const matched = report.extracted_summary.matchedBranch;
  return {
    attachmentId: report.id,
    warningCodes: report.warning_codes ?? [],
    matchedBranch: matched && typeof matched === "object" && !Array.isArray(matched)
      ? matched as AttachmentKpiSource["matchedBranch"]
      : null,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  const actorOrResponse = await actorForApi("monthly_submission.publish");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });
  if (!hasSupabaseAdminConfiguration()) {
    return NextResponse.json({ error: "SUPABASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REVIEW_REQUEST" }, { status: 400 });
  if (parsed.data.action === "confirm" && parsed.data.confirmationText !== MONTHLY_PUBLICATION_CONFIRMATION) {
    return NextResponse.json({ error: "EXACT_CONFIRMATION_REQUIRED" }, { status: 422 });
  }

  const { submissionId } = await context.params;
  const supabase = createAdminClient();
  const [{ data: submissionData }, { data: versionData }] = await Promise.all([
    supabase.from("manual_monthly_submissions")
      .select("id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,period_start,period_end,current_version_number,is_demo")
      .eq("id", submissionId).maybeSingle(),
    supabase.from("manual_monthly_submission_versions")
      .select("id,submission_id,version_number,responses,status,correction_request_id,base_submission_version_id,validation_summary")
      .eq("id", parsed.data.versionId).maybeSingle(),
  ]);
  if (!submissionData || !versionData) return NextResponse.json({ error: "SUBMISSION_VERSION_NOT_FOUND" }, { status: 404 });
  const submission = submissionData as Submission;
  const version = versionData as Version;
  if (
    submission.is_demo
    || version.submission_id !== submission.id
    || version.version_number !== submission.current_version_number
    || version.status === "published"
  ) {
    return NextResponse.json({ error: "REVIEW_REQUIRES_CURRENT_DRAFT" }, { status: 409 });
  }

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

  const [branchResult, lineResult, attachmentResult] = await Promise.all([
    supabase.from("branches").select("id,name,code").eq("id", submission.branch_id).maybeSingle(),
    supabase.from("business_lines").select("id,name,code").eq("id", submission.business_line_id).maybeSingle(),
    supabase.from("manual_monthly_submission_attachments")
      .select("id,original_file_name,byte_size,sha256,storage_bucket,storage_path,parser_kind,parser_status,extracted_summary,warning_codes")
      .eq("submission_id", submission.id)
      .eq("submission_version_id", version.id),
  ]);
  if (!branchResult.data || !lineResult.data || attachmentResult.error) {
    return NextResponse.json({ error: "REVIEW_CONTEXT_NOT_FOUND" }, { status: 409 });
  }
  const branch = branchResult.data as Named;
  const businessLine = lineResult.data as Named;
  const attachments = (attachmentResult.data ?? []) as Attachment[];
  for (const attachment of attachments) {
    const downloaded = await supabase.storage.from(attachment.storage_bucket).download(attachment.storage_path);
    if (downloaded.error || !downloaded.data) {
      return NextResponse.json({ error: "REVIEW_EVIDENCE_UNAVAILABLE", attachmentId: attachment.id }, { status: 409 });
    }
    const currentHash = createHash("sha256")
      .update(Buffer.from(await downloaded.data.arrayBuffer()))
      .digest("hex");
    if (currentHash !== attachment.sha256) {
      return NextResponse.json({ error: "REVIEW_EVIDENCE_HASH_MISMATCH", attachmentId: attachment.id }, { status: 409 });
    }
  }
  const formLine = resolveFormBusinessLine(businessLine);
  if (!formLine) return NextResponse.json({ error: "UNSUPPORTED_BUSINESS_LINE" }, { status: 422 });
  const formContractVersion = savedMonthlyFormContractVersion(formLine, version.responses);
  if (!isSupportedMonthlyFormContractVersion(formLine, formContractVersion)) {
    return NextResponse.json({ error: "UNSUPPORTED_FORM_CONTRACT_VERSION" }, { status: 409 });
  }
  const contract = validateMonthlyFormContract({
    line: formLine,
    responses: version.responses,
    requireComplete: true,
    contractVersion: formContractVersion,
  });
  const validation = validateMonthlyResponses(contract.normalized);
  const validAttachments = attachments.filter((item) => !["blocked", "failed"].includes(item.parser_status));
  const blockers = [
    ...contract.missing.map((field) => `REQUIRED_FIELD_MISSING:${field}`),
    ...contract.invalid.map((field) => `INVALID_FIELD:${field}`),
    ...validation.blockers,
  ];
  if (validAttachments.length < 1 || validAttachments.length > 2) blockers.push("MONTHLY_ATTACHMENT_REQUIRED");
  if (attachments.some((item) => item.parser_status === "blocked")) blockers.push("BLOCKED_ATTACHMENT_PRESENT");
  const importSourceValue = version.validation_summary?.import_source;
  const importSource = importSourceValue && typeof importSourceValue === "object" && !Array.isArray(importSourceValue)
    ? importSourceValue as Record<string, unknown>
    : null;
  const reconciliation = reconcileMonthlyEvidence({
    attachments: validAttachments,
    formLine,
    importSource,
    periodEnd: submission.period_end,
    periodStart: submission.period_start,
    responses: contract.normalized,
  });
  blockers.push(...reconciliation.blockers);
  const calculated = calculateOfficialKpis(
    contract.normalized,
    formLine === "Laboratorio" ? attachmentSource(validAttachments) : null,
  );
  if (calculated.length === 0) blockers.push("NO_SUPPORTED_KPIS");
  const warnings = [
    ...validation.warnings,
    ...attachments.flatMap((item) => item.warning_codes ?? []),
    ...reconciliation.warnings,
  ];
  const review = buildMonthlyPublicationReview({
    submission,
    version,
    branch,
    businessLine,
    attachments,
    kpis: calculated,
    blockers,
    warnings,
    reconciliation,
  });

  if (parsed.data.action === "prepare") {
    return NextResponse.json({
      summary: review.summary,
      digest: review.digest,
      confirmationText: MONTHLY_PUBLICATION_CONFIRMATION,
      publishable: blockers.length === 0,
    });
  }
  if (blockers.length > 0) {
    return NextResponse.json({ error: "REVIEW_BLOCKED", blockers, summary: review.summary }, { status: 422 });
  }

  const { data: existingReview } = await supabase
    .from("monthly_submission_publication_reviews")
    .select("id,status,confirmed_at")
    .eq("submission_version_id", version.id)
    .eq("content_digest", review.digest)
    .eq("reviewer_id", actor.userId)
    .maybeSingle();
  if (existingReview?.status === "confirmed") {
    return NextResponse.json({ reviewId: existingReview.id, digest: review.digest, summary: review.summary });
  }
  if (existingReview) {
    return NextResponse.json({ error: "PUBLICATION_REVIEW_ALREADY_USED" }, { status: 409 });
  }

  const inserted = await supabase.from("monthly_submission_publication_reviews").insert({
    organization_id: submission.organization_id,
    submission_id: submission.id,
    submission_version_id: version.id,
    reviewer_id: actor.userId,
    confirmation_text: MONTHLY_PUBLICATION_CONFIRMATION,
    content_digest: review.digest,
    summary: review.summary,
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
    consumed_at: null,
  })
    .select("id,status,confirmed_at").single();
  if (inserted.error || !inserted.data) {
    return NextResponse.json({ error: inserted.error?.message ?? "REVIEW_CONFIRMATION_FAILED" }, { status: 409 });
  }
  await supabase.from("audit_logs").insert({
    organization_id: submission.organization_id,
    actor_user_id: actor.userId,
    action: "monthly_submission.publication_review_confirmed",
    entity_table: "manual_monthly_submission_versions",
    entity_id: version.id,
    country_id: submission.country_id,
    company_id: submission.company_id,
    branch_id: submission.branch_id,
    metadata: { submission_id: submission.id, digest: review.digest },
  });
  return NextResponse.json({ reviewId: inserted.data.id, digest: review.digest, summary: review.summary });
}
