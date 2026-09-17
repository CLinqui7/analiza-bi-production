import { NextResponse } from "next/server";
import { z } from "zod";

import { correctionDecisionError } from "@/lib/analytics/closing-correction-state";
import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { createAdminClient } from "@/lib/v7/server/admin-client";
import { hasSupabaseAdminConfiguration } from "@/lib/v7/server/env";

const schema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().min(5).max(1000),
});

type Correction = {
  id: string; submission_id: string; organization_id: string; country_id: string; company_id: string;
  operational_area_id: string | null; branch_id: string; business_line_id: string;
  requester_id: string; responsible_profile_id: string; approver_profile_id: string;
  base_submission_version_id: string; base_closing_version_id: string; status: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ submissionId: string; requestId: string }> },
) {
  const actorOrResponse = await actorForApi("monthly_submission.read");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });
  if (!hasSupabaseAdminConfiguration()) return NextResponse.json({ error: "SUPABASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CORRECTION_DECISION" }, { status: 400 });
  const { submissionId, requestId } = await context.params;
  const supabase = createAdminClient();
  const { data } = await supabase.from("monthly_closing_correction_requests")
    .select("id,submission_id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,requester_id,responsible_profile_id,approver_profile_id,base_submission_version_id,base_closing_version_id,status")
    .eq("id", requestId)
    .eq("submission_id", submissionId)
    .maybeSingle();
  const correction = data as Correction | null;
  if (!correction) return NextResponse.json({ error: "CORRECTION_REQUEST_NOT_FOUND" }, { status: 404 });
  try {
    assertRecordAccess(actor, {
      organizationId: correction.organization_id, countryId: correction.country_id,
      companyId: correction.company_id, operationalAreaId: correction.operational_area_id,
      branchId: correction.branch_id, businessLineId: correction.business_line_id,
    });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }
  const { data: baseClosing } = await supabase.from("closing_versions")
    .select("id,status,manual_submission_version_id")
    .eq("id", correction.base_closing_version_id)
    .maybeSingle();
  const decisionError = correctionDecisionError({
    status: correction.status,
    requesterId: correction.requester_id,
    approverId: correction.approver_profile_id,
    actorId: actor.userId,
    actorRole: actor.roleKey,
    baseStillOfficial: Boolean(
      baseClosing
      && baseClosing.status === "published"
      && baseClosing.manual_submission_version_id === correction.base_submission_version_id
    ),
  });
  if (decisionError) {
    const forbidden = decisionError === "AREA_MANAGER_APPROVAL_REQUIRED" || decisionError === "INDEPENDENT_ASSIGNED_APPROVER_REQUIRED";
    return NextResponse.json({ error: decisionError }, { status: forbidden ? 403 : 409 });
  }

  const decidedAt = new Date().toISOString();
  const updated = await supabase.from("monthly_closing_correction_requests")
    .update({
      status: parsed.data.decision,
      decision_reason: parsed.data.reason,
      decided_at: decidedAt,
      decided_by: actor.userId,
      updated_at: decidedAt,
    })
    .eq("id", correction.id)
    .eq("status", "pending")
    .select("id,status,decision_reason,decided_at")
    .maybeSingle();
  if (updated.error || !updated.data) {
    return NextResponse.json({ error: "CORRECTION_DECISION_CONFLICT" }, { status: 409 });
  }
  await supabase.from("audit_logs").insert({
    organization_id: correction.organization_id, actor_user_id: actor.userId,
    action: `monthly_submission.correction_${parsed.data.decision}`,
    entity_table: "monthly_closing_correction_requests", entity_id: correction.id,
    country_id: correction.country_id, company_id: correction.company_id, branch_id: correction.branch_id,
    metadata: { submission_id: correction.submission_id, base_closing_version_id: correction.base_closing_version_id },
  });
  return NextResponse.json({ request: updated.data });
}
