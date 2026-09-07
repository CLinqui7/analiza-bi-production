import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "LOCAL_INVITATION_RETIRED", ok: false, provider: "supabase" }, { status: 410 });
}
