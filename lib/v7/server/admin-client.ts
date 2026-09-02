import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export function createAdminClient() {
  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  }

  return client;
}
