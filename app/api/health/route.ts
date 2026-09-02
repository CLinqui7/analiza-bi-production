import { NextResponse } from "next/server";

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const databaseConfigured = Boolean(
    process.env.DATABASE_URL || process.env.POSTGRES_URL,
  );

  return NextResponse.json(
    {
      ok: supabaseConfigured,
      service: "analiza-bi",
      supabaseConfigured,
      databaseConfigured,
      timestamp: new Date().toISOString(),
    },
    {
      status: supabaseConfigured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
