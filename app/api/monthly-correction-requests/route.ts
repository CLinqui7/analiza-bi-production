import { NextResponse } from "next/server";

import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { createAdminClient } from "@/lib/v7/server/admin-client";
import { hasSupabaseAdminConfiguration } from "@/lib/v7/server/env";

export async function GET() {
  const actorOrResponse = await actorForApi("monthly_submission.read");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.roleKey !== "gerente_area") return NextResponse.json({ error: "AREA_MANAGER_REQUIRED" }, { status: 403 });
  if (!hasSupabaseAdminConfiguration()) return NextResponse.json({ error: "SUPABASE_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("monthly_closing_correction_requests")
    .select("id,submission_id,branch_id,business_line_id,period_start,period_end,request_reason,status,requester_id,approver_profile_id,requested_at,branches(name,code),business_lines(name,code)")
    .eq("approver_profile_id", actor.userId)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}
