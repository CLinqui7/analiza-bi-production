import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/protected";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (!tokenHash || !type) {
    redirect("/auth/error?error=Enlace%20de%20autenticaci%C3%B3n%20incompleto");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    redirect("/auth/error?error=El%20enlace%20no%20es%20v%C3%A1lido%20o%20ya%20venci%C3%B3");
  }

  if (type === "invite") {
    const { data, error: provisionError } = await supabase.rpc("accept_current_user_invitation");
    const result = data as { accepted?: boolean } | null;
    if (provisionError || !result?.accepted) {
      await supabase.auth.signOut();
      redirect("/auth/error?error=No%20se%20pudo%20activar%20la%20invitaci%C3%B3n");
    }
  }

  redirect(next);
}
