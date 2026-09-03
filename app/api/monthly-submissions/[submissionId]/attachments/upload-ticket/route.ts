import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { createClient } from "@/lib/supabase/server";

const maxBytes = 15 * 1024 * 1024;
const acceptedExtensions = new Set(["xlsx", "xls", "csv", "pdf", "doc", "docx", "ppt", "pptx", "txt", "png", "jpg", "jpeg"]);
const schema = z.object({
  versionId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(240),
  byteSize: z.number().int().positive().max(maxBytes),
  mimeType: z.string().max(200).optional(),
});

type Submission = { id: string; organization_id: string; country_id: string; company_id: string; operational_area_id: string | null; branch_id: string; business_line_id: string; is_demo: boolean };
type Version = { id: string; submission_id: string; status: string };

function sanitizedName(value: string) {
  const name = value.split(/[\\/]/).pop() ?? "evidence";
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 180) || "evidence";
}

function extensionOf(name: string) {
  const clean = sanitizedName(name);
  const extension = clean.includes(".") ? clean.split(".").pop()!.toLowerCase() : "";
  return { clean, extension };
}

export async function POST(request: Request, context: { params: Promise<{ submissionId: string }> }) {
  const actorOrResponse = await actorForApi("monthly_submission.write");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_UPLOAD_TICKET_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  const { submissionId } = await context.params;
  const supabase = await createClient();
  const [{ data: submissionData }, { data: versionData }] = await Promise.all([
    supabase.from("manual_monthly_submissions").select("id,organization_id,country_id,company_id,operational_area_id,branch_id,business_line_id,is_demo").eq("id", submissionId).maybeSingle(),
    supabase.from("manual_monthly_submission_versions").select("id,submission_id,status").eq("id", parsed.data.versionId).maybeSingle(),
  ]);
  if (!submissionData || !versionData) return NextResponse.json({ error: "SUBMISSION_VERSION_NOT_FOUND" }, { status: 404 });
  const submission = submissionData as Submission;
  const version = versionData as Version;
  if (version.submission_id !== submission.id || submission.is_demo) return NextResponse.json({ error: "INVALID_VERSION" }, { status: 409 });
  if (version.status === "published") return NextResponse.json({ error: "PUBLISHED_VERSION_IMMUTABLE" }, { status: 409 });

  try {
    assertRecordAccess(actor, { organizationId: submission.organization_id, countryId: submission.country_id, companyId: submission.company_id, operationalAreaId: submission.operational_area_id, branchId: submission.branch_id, businessLineId: submission.business_line_id });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }

  const { count, error: countError } = await supabase.from("manual_monthly_submission_attachments").select("id", { head: true, count: "exact" }).eq("submission_version_id", version.id);
  if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });
  if ((count ?? 0) >= 2) return NextResponse.json({ error: "MAX_TWO_FILES", message: "Esta versión ya tiene el máximo de 2 archivos." }, { status: 422 });

  const { clean, extension } = extensionOf(parsed.data.fileName);
  if (!acceptedExtensions.has(extension)) return NextResponse.json({ error: "UNSUPPORTED_FILE_TYPE", message: `Formato .${extension || "sin extensión"} no permitido.` }, { status: 415 });
  const storagePath = `${submission.organization_id}/${submission.branch_id}/${submission.id}/${version.id}/${randomUUID()}-${clean}`;

  // The file itself is uploaded browser → Supabase Storage (TUS). This API only
  // issues the authorized object path, so a 15 MB document never crosses a
  // Netlify Function request body.
  return NextResponse.json({
    storageBucket: "monthly-evidence",
    storagePath,
    maxBytes,
    acceptedExtension: extension,
  });
}
