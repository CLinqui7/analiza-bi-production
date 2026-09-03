import { NextResponse } from "next/server";
import { z } from "zod";

import {
  resolveFormBusinessLine,
  validateMonthlyFormContract,
} from "@/lib/monthly-form-contract";
import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { validateMonthlyResponses } from "@/lib/server/monthly-validation";
import { createAdminClient } from "@/lib/v7/server/admin-client";
import { hasSupabaseAdminConfiguration } from "@/lib/v7/server/env";
import { createClient } from "@/lib/supabase/server";

const saveSchema = z.object({
  countryId: z.string().uuid(),
  companyId: z.string().uuid(),
  operationalAreaId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid(),
  businessLineId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  responses: z.record(z.string(), z.unknown()),
  changeReason: z.string().max(500).optional(),
});

type SubmissionRow = { id: string; current_version_number: number };
type SubmissionScopeRow = { organization_id: string; country_id: string; company_id: string; operational_area_id: string | null; branch_id: string; business_line_id: string; period_start: string; period_end: string; status: string; is_demo: boolean };
type BranchRow = {
  id: string;
  organization_id: string;
  country_id: string;
  company_id: string;
  operational_area_id: string | null;
  name: string;
  city: string | null;
  is_demo: boolean;
};
type BusinessLineRow = {
  id: string;
  organization_id: string;
  company_id: string | null;
  code: string;
  name: string;
  is_demo: boolean;
};
type AreaRow = { manager_profile_id: string | null };
type ProfileRow = { display_name: string | null };

function loadDeadline(periodStart: string) {
  const match = /^(\d{4})-(\d{2})-01$/.exec(periodStart);
  if (!match) return "";
  return new Date(Date.UTC(Number(match[1]), Number(match[2]), 5)).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const actorOrResponse = await actorForApi("monthly_submission.read");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ items: [], demo: true });

  const url = new URL(request.url);
  const submissionId = url.searchParams.get("submissionId");
  const branchId = url.searchParams.get("branchId");
  const businessLineId = url.searchParams.get("businessLineId");
  const supabase = await createClient();

  if (submissionId) {
    const { data: submissionData, error: submissionError } = await supabase
      .from("manual_monthly_submissions")
      .select("id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,period_start,period_end,status,current_version_number,is_demo")
      .eq("id", submissionId)
      .maybeSingle();
    if (submissionError || !submissionData) return NextResponse.json({ error: "SUBMISSION_NOT_FOUND" }, { status: 404 });
    const submission = submissionData as SubmissionRow & SubmissionScopeRow;
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
    const { data: version, error: versionError } = await supabase
      .from("manual_monthly_submission_versions")
      .select("id,version_number,responses,validation_summary,status,change_reason,created_at,published_at")
      .eq("submission_id", submission.id)
      .eq("version_number", submission.current_version_number)
      .maybeSingle();
    if (versionError) return NextResponse.json({ error: versionError.message }, { status: 400 });
    return NextResponse.json({ submission, version });
  }

  let query = supabase
    .from("manual_monthly_submissions")
    .select("id,branch_id,business_line_id,period_start,period_end,status,current_version_number,updated_at,branches(name,code),business_lines(name,code)")
    .eq("organization_id", actor.scope.organizationId)
    .eq("is_demo", false)
    .order("period_start", { ascending: false })
    .limit(30);
  if (branchId) query = query.eq("branch_id", branchId);
  if (businessLineId) query = query.eq("business_line_id", businessLineId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const actorOrResponse = await actorForApi("monthly_submission.write");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  if (input.periodEnd < input.periodStart) return NextResponse.json({ error: "INVALID_PERIOD" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: branchData, error: branchError }, { data: businessLineData, error: businessLineError }] = await Promise.all([
    supabase
      .from("branches")
      .select("id,organization_id,country_id,company_id,operational_area_id,name,city,is_demo")
      .eq("id", input.branchId)
      .maybeSingle(),
    supabase
      .from("business_lines")
      .select("id,organization_id,company_id,code,name,is_demo")
      .eq("id", input.businessLineId)
      .maybeSingle(),
  ]);
  if (branchError || !branchData) return NextResponse.json({ error: "BRANCH_NOT_FOUND" }, { status: 404 });
  if (businessLineError || !businessLineData) return NextResponse.json({ error: "BUSINESS_LINE_NOT_FOUND" }, { status: 404 });
  const branch = branchData as BranchRow;
  const businessLine = businessLineData as BusinessLineRow;

  try {
    assertRecordAccess(actor, {
      organizationId: branch.organization_id,
      countryId: branch.country_id,
      companyId: branch.company_id,
      operationalAreaId: branch.operational_area_id,
      branchId: branch.id,
      businessLineId: businessLine.id,
    });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }

  if (
    branch.organization_id !== actor.scope.organizationId
    || branch.country_id !== input.countryId
    || branch.company_id !== input.companyId
    || branch.is_demo
  ) {
    return NextResponse.json({ error: "SCOPE_MISMATCH" }, { status: 400 });
  }
  if (input.operationalAreaId && input.operationalAreaId !== branch.operational_area_id) {
    return NextResponse.json({ error: "AREA_SCOPE_MISMATCH" }, { status: 409 });
  }
  if (
    businessLine.organization_id !== actor.scope.organizationId
    || (businessLine.company_id && businessLine.company_id !== branch.company_id)
    || businessLine.is_demo
  ) {
    return NextResponse.json({ error: "BUSINESS_LINE_SCOPE_MISMATCH" }, { status: 409 });
  }

  const formLine = resolveFormBusinessLine(businessLine);
  if (!formLine) return NextResponse.json({ error: "UNSUPPORTED_BUSINESS_LINE" }, { status: 422 });

  const catalogClient = hasSupabaseAdminConfiguration() ? createAdminClient() : supabase;
  const [actorProfileResult, areaResult] = await Promise.all([
    catalogClient
      .from("profiles")
      .select("display_name")
      .eq("id", actor.userId)
      .maybeSingle(),
    branch.operational_area_id
      ? catalogClient.from("operational_areas").select("manager_profile_id").eq("id", branch.operational_area_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const actorProfile = (actorProfileResult.data ?? null) as ProfileRow | null;
  const areaRow = (areaResult.data ?? null) as AreaRow | null;
  const areaManagerResult = areaRow?.manager_profile_id
    ? await catalogClient.from("profiles").select("display_name").eq("id", areaRow.manager_profile_id).maybeSingle()
    : { data: null, error: null };
  const areaManager = (areaManagerResult.data ?? null) as ProfileRow | null;

  const resolvedBranchManager = actorProfile?.display_name ?? actor.displayName;
  const resolvedAreaManager = areaManager?.display_name ?? "";

  // Scope, managers, zone and dates are always rewritten from trusted catalogs.
  const responseWithServerContext: Record<string, unknown> = {
    ...input.responses,
    period: input.periodStart.slice(0, 7),
    branch_reported: branch.name,
    manager_name: resolvedBranchManager,
    area_manager_name: resolvedAreaManager,
    area_zone: branch.city ?? "",
    data_cutoff_date: input.periodEnd,
    load_deadline_date: loadDeadline(input.periodStart),
  };
  const contract = validateMonthlyFormContract({
    line: formLine,
    responses: responseWithServerContext,
    requireComplete: false,
  });
  if (contract.invalid.length > 0) {
    return NextResponse.json({
      error: "FORM_FIELD_INVALID",
      invalid: contract.invalid,
      message: "Hay campos con formato o rango inválido. Corrígelos antes de guardar.",
    }, { status: 422 });
  }

  const validation = validateMonthlyResponses(contract.normalized);
  if (validation.blockers.length > 0) {
    return NextResponse.json({ error: "VALIDATION_BLOCKED", validation }, { status: 422 });
  }

  const { data: existingSubmission, error: submissionError } = await supabase
    .from("manual_monthly_submissions")
    .select("id,current_version_number")
    .eq("organization_id", actor.scope.organizationId)
    .eq("branch_id", input.branchId)
    .eq("business_line_id", input.businessLineId)
    .eq("period_start", input.periodStart)
    .eq("period_end", input.periodEnd)
    .maybeSingle();

  if (submissionError) return NextResponse.json({ error: submissionError.message }, { status: 400 });

  let submissionData = existingSubmission;

  if (!submissionData) {
    const inserted = await supabase
      .from("manual_monthly_submissions")
      .insert({
        organization_id: actor.scope.organizationId,
        country_id: input.countryId,
        company_id: input.companyId,
        operational_area_id: branch.operational_area_id,
        branch_id: input.branchId,
        business_line_id: input.businessLineId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        status: "draft",
        current_version_number: 0,
        created_by: actor.userId,
        is_demo: false,
      })
      .select("id,current_version_number")
      .single();
    if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });
    submissionData = inserted.data;
  }

  const submission = submissionData as SubmissionRow;
  const nextVersion = submission.current_version_number + 1;
  const { data: version, error: versionError } = await supabase
    .from("manual_monthly_submission_versions")
    .insert({
      submission_id: submission.id,
      version_number: nextVersion,
      responses: validation.normalized,
      validation_summary: {
        blockers: validation.blockers,
        warnings: validation.warnings,
        form_contract_invalid: contract.invalid,
      },
      quality_score: null,
      status: "draft",
      change_reason: input.changeReason ?? null,
      submitted_by: actor.userId,
    })
    .select("id,version_number,status,created_at")
    .single();
  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 409 });

  await supabase
    .from("manual_monthly_submissions")
    .update({ current_version_number: nextVersion, status: "draft" })
    .eq("id", submission.id);
  await supabase.from("manual_monthly_submission_events").insert({
    submission_id: submission.id,
    submission_version_id: version.id,
    event_type: nextVersion === 1 ? "created" : "saved",
    actor_id: actor.userId,
    details: { warnings: validation.warnings, form_line: formLine },
  });
  await supabase.from("audit_logs").insert({
    organization_id: actor.scope.organizationId,
    actor_user_id: actor.userId,
    action: "monthly_submission.saved",
    entity_table: "manual_monthly_submissions",
    entity_id: submission.id,
    country_id: input.countryId,
    company_id: input.companyId,
    branch_id: input.branchId,
    metadata: { version: nextVersion, form_line: formLine },
  });

  return NextResponse.json({
    submissionId: submission.id,
    version,
    validation,
    formLine,
  }, { status: 201 });
}
