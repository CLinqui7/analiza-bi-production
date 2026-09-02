import { NextResponse } from "next/server";

import { assertRecordAccess, canPerformAction } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { createClient } from "@/lib/supabase/server";

type Submission = {
  id: string;
  organization_id: string;
  country_id: string;
  company_id: string;
  operational_area_id: string | null;
  branch_id: string;
  business_line_id: string;
  is_demo: boolean;
};
type Version = { id: string; submission_id: string; status: string };

async function loadContext(submissionId: string, versionId: string) {
  const supabase = await createClient();
  const [{ data: submissionData }, { data: versionData }] = await Promise.all([
    supabase.from("manual_monthly_submissions").select("id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,is_demo").eq("id", submissionId).maybeSingle(),
    supabase.from("manual_monthly_submission_versions").select("id,submission_id,status").eq("id", versionId).maybeSingle(),
  ]);
  if (!submissionData || !versionData) return null;
  const submission = submissionData as Submission;
  const version = versionData as Version;
  if (version.submission_id !== submission.id) return null;
  return { supabase, submission, version };
}

export async function GET(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  const actorOrResponse = await actorForApi("monthly_submission.read");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ items: [], demo: true });
  const { submissionId } = await context.params;
  const versionId = new URL(request.url).searchParams.get("versionId");
  if (!versionId) return NextResponse.json({ error: "VERSION_ID_REQUIRED" }, { status: 400 });
  const loaded = await loadContext(submissionId, versionId);
  if (!loaded) return NextResponse.json({ error: "SUBMISSION_VERSION_NOT_FOUND" }, { status: 404 });
  const { supabase, submission } = loaded;
  try {
    assertRecordAccess(actor, { organizationId: submission.organization_id, countryId: submission.country_id, companyId: submission.company_id, operationalAreaId: submission.operational_area_id, branchId: submission.branch_id });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }
  const { data, error } = await supabase
    .from("manual_monthly_submission_attachments")
    .select("id,original_file_name,sanitized_file_name,file_extension,byte_size,parser_kind,parser_status,extracted_summary,warning_codes,created_at")
    .eq("submission_id", submissionId)
    .eq("submission_version_id", versionId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

// File bytes intentionally do not cross this Next/Netlify route. The client
// obtains a server-validated path at /upload-ticket, uploads directly to private
// Supabase Storage, then calls /finalize for parsing and metadata persistence.
export async function POST() {
  return NextResponse.json({
    error: "DIRECT_STORAGE_UPLOAD_REQUIRED",
    message: "Usa upload-ticket → Supabase Storage → finalize.",
  }, { status: 409 });
}

export async function DELETE(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  const actorOrResponse = await actorForApi("monthly_submission.write");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });
  const { submissionId } = await context.params;
  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");
  const versionId = url.searchParams.get("versionId");
  if (!attachmentId || !versionId) return NextResponse.json({ error: "ATTACHMENT_AND_VERSION_REQUIRED" }, { status: 400 });

  const loaded = await loadContext(submissionId, versionId);
  if (!loaded) return NextResponse.json({ error: "SUBMISSION_VERSION_NOT_FOUND" }, { status: 404 });
  const { supabase, submission, version } = loaded;
  if (version.status === "published") return NextResponse.json({ error: "PUBLISHED_VERSION_IMMUTABLE" }, { status: 409 });
  try {
    assertRecordAccess(actor, { organizationId: submission.organization_id, countryId: submission.country_id, companyId: submission.company_id, operationalAreaId: submission.operational_area_id, branchId: submission.branch_id });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }

  const { data } = await supabase.from("manual_monthly_submission_attachments").select("id,storage_path,uploaded_by").eq("id", attachmentId).eq("submission_id", submission.id).eq("submission_version_id", version.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "ATTACHMENT_NOT_FOUND" }, { status: 404 });
  const canModerateEvidence = canPerformAction(actor, "monthly_submission.publish");
  if (data.uploaded_by !== actor.userId && !canModerateEvidence) {
    return NextResponse.json({ error: "ONLY_UPLOADER_OR_PUBLISHER_CAN_DELETE_DRAFT_ATTACHMENT" }, { status: 403 });
  }
  const removed = await supabase.storage.from("monthly-evidence").remove([data.storage_path]);
  if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 400 });
  const deleted = await supabase.from("manual_monthly_submission_attachments").delete().eq("id", attachmentId);
  if (deleted.error) return NextResponse.json({ error: deleted.error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
