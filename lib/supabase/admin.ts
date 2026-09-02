import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

type LooseRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: LooseRelationship[];
};

type LooseView = {
  Row: Record<string, unknown>;
  Relationships: LooseRelationship[];
};

type LooseFunction = {
  Args: Record<string, unknown>;
  Returns: unknown;
};

type LooseDatabase = {
  public: {
    Tables: Record<string, LooseTable>;
    Views: Record<string, LooseView>;
    Functions: Record<string, LooseFunction>;
  };
};

type SupabaseAdminClient = SupabaseClient<LooseDatabase>;

let cachedAdminClient: SupabaseAdminClient | null | undefined;

export function getSupabaseAdminClient(): SupabaseAdminClient | null {
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    cachedAdminClient = null;
    return cachedAdminClient;
  }

  cachedAdminClient = createSupabaseClient<LooseDatabase>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}

export function hasSupabaseAdminConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}
