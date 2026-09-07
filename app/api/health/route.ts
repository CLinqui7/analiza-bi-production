import { NextResponse } from "next/server";

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return NextResponse.json(
    {
      ok: supabaseConfigured,
      service: "analiza-bi",
      supabaseConfigured,
      timestamp: new Date().toISOString(),
    },
    {
      status: supabaseConfigured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
