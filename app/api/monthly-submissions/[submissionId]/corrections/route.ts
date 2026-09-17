import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { createAdminClient } from "@/lib/v7/server/admin-client";
import { hasSupabaseAdminConfiguration } from "@/lib/v7/server/env";

const requestSchema = z.object({ reason: z.string().trim().min(10).max(1000) });

type Submission = {
  id: string; organization_id: string; country_id: string; company_id: string;
  operational_area_id: string | null; branch_id: string; business_line_id: string;
  period_start: string; period_end: string; current_version_number: number; status: string; is_demo: boolean;
};
type Version = { id: string; status: string; submitted_by: string };

async function loadSubmission(submissionId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("manual_monthly_submissions")
    .select("id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,period_start,period_end,current_version_number,status,is_demo")
    .eq("id", submissionId).maybeSingle();
  return { supabase, submission: data as Submission | null };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  const actorOrResponse = await actorForApi("monthly_submission.read");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  if (!hasSupabaseAdminConfiguration()) return NextResponse.json({ error: "SUPABASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  const actor = actorOrResponse;
  const { submissionId } = await context.params;
  const { supabase, submission } = await loadSubmission(submissionId);
  if (!submission) return NextResponse.json({ error: "SUBMISSION_NOT_FOUND" }, { status: 404 });
  try {
    assertRecordAccess(actor, {
      organizationId: submission.organization_id, countryId: submission.country_id,
      companyId: submission.company_id, operationalAreaId: submission.operational_area_id,
      branchId: submission.branch_id, businessLineId: submission.business_line_id,
    });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }
  const { data, error } = await supabase.from("monthly_closing_correction_requests")
    .select("id,request_reason,decision_reason,status,requester_id,responsible_profile_id,approver_profile_id,requested_at,decided_at,base_submission_version_id,base_closing_version_id")
    .eq("submission_id", submission.id)
    .or(`requester_id.eq.${actor.userId},approver_profile_id.eq.${actor.userId}`)
    .order("requested_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ submissionId: string }> },
) {
  const actorOrResponse = await actorForApi("monthly_submission.write");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });
  if (!hasSupabaseAdminConfiguration()) return NextResponse.json({ error: "SUPABASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "CORRECTION_REASON_REQUIRED" }, { status: 400 });
  const { submissionId } = await context.params;
  const { supabase, submission } = await loadSubmission(submissionId);
  if (!submission) return NextResponse.json({ error: "SUBMISSION_NOT_FOUND" }, { status: 404 });
  try {
    assertRecordAccess(actor, {
      organizationId: submission.organization_id, countryId: submission.country_id,
      companyId: submission.company_id, operationalAreaId: submission.operational_area_id,
      branchId: submission.branch_id, businessLineId: submission.business_line_id,
    });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }
  if (submission.is_demo || submission.status !== "published" || !submission.operational_area_id) {
    return NextResponse.json({ error: "PUBLISHED_CLOSING_AND_AREA_REQUIRED" }, { status: 409 });
  }

  const [{ data: versionData }, { data: areaData }, { data: areaRole }] = await Promise.all([
    supabase.from("manual_monthly_submission_versions")
      .select("id,status,submitted_by")
      .eq("submission_id", submission.id)
      .eq("version_number", submission.current_version_number)
      .maybeSingle(),
    supabase.from("operational_areas")
      .select("manager_profile_id")
      .eq("id", submission.operational_area_id)
      .maybeSingle(),
    supabase.from("roles").select("id").eq("key", "gerente_area").maybeSingle(),
  ]);
  const version = versionData as Version | null;
  const approverId = areaData?.manager_profile_id as string | null | undefined;
  if (!version || version.status !== "published" || !approverId || !areaRole?.id || approverId === actor.userId) {
    return NextResponse.json({ error: "INDEPENDENT_AREA_MANAGER_REQUIRED" }, { status: 409 });
  }
  const { data: assignment } = await supabase.from("manager_assignments")
    .select("id")
    .eq("profile_id", approverId)
    .eq("role_id", areaRole.id)
    .eq("organization_id", submission.organization_id)
    .eq("operational_area_id", submission.operational_area_id)
    .eq("status", "active")
    .maybeSingle();
  if (!assignment) return NextResponse.json({ error: "ACTIVE_AREA_MANAGER_ASSIGNMENT_REQUIRED" }, { status: 409 });

  const { data: baseClosing } = await supabase.from("closing_versions")
    .select("id")
    .eq("manual_submission_version_id", version.id)
    .eq("status", "published")
    .maybeSingle();
  if (!baseClosing) return NextResponse.json({ error: "OFFICIAL_BASE_CLOSING_NOT_FOUND" }, { status: 409 });

  const inserted = await supabase.from("monthly_closing_correction_requests").insert({
    organization_id: submission.organization_id,
    country_id: submission.country_id,
    company_id: submission.company_id,
    operational_area_id: submission.operational_area_id,
    branch_id: submission.branch_id,
    business_line_id: submission.business_line_id,
    period_start: submission.period_start,
    period_end: submission.period_end,
    submission_id: submission.id,
    base_submission_version_id: version.id,
    base_closing_version_id: baseClosing.id,
    requester_id: actor.userId,
    responsible_profile_id: actor.userId,
    approver_profile_id: approverId,
    request_reason: parsed.data.reason,
  }).select("id,status,approver_profile_id,requested_at").single();
  if (inserted.error || !inserted.data) {
    const conflict = inserted.error?.code === "23505";
    return NextResponse.json({ error: conflict ? "CORRECTION_REQUEST_ALREADY_OPEN" : inserted.error?.message }, { status: 409 });
  }
  await supabase.from("audit_logs").insert({
    organization_id: submission.organization_id, actor_user_id: actor.userId,
    action: "monthly_submission.correction_requested", entity_table: "monthly_closing_correction_requests",
    entity_id: inserted.data.id, country_id: submission.country_id, company_id: submission.company_id,
    branch_id: submission.branch_id, metadata: { submission_id: submission.id, base_closing_version_id: baseClosing.id },
  });
  return NextResponse.json({ request: inserted.data }, { status: 201 });
}
