import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "LOCAL_AUTH_RETIRED", ok: false, provider: "supabase" }, { status: 410 });
}
