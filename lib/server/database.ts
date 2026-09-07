import type { AuthorizationActor } from "@/lib/security/authorization-policy";

/**
 * Compatibility boundary for retired local-auth modules.  Analiza BI's
 * productive data plane is Supabase; this module deliberately has no driver,
 * connection string, environment-variable, or socket fallback.
 */
export type RetiredDatabaseClient = {
  query<T>(statement: string, parameters?: readonly unknown[]): Promise<{ rows: T[] }>;
  release(): void;
};
export type RetiredDatabasePool = {
  connect(): Promise<RetiredDatabaseClient>;
  query<T>(statement: string, parameters?: readonly unknown[]): Promise<{ rows: T[] }>;
};

export function getMissingDatabaseConfig() {
  return ["SUPABASE_BACKEND_REQUIRED"];
}

export function getPostgresPool(): RetiredDatabasePool {
  throw new Error("La persistencia PostgreSQL directa fue retirada. Usa Supabase.");
}

export async function resetPostgresRuntimeRole(...args: unknown[]): Promise<void> {
  void args;
  throw new Error("La persistencia PostgreSQL directa fue retirada. Usa Supabase.");
}

export async function withPostgresRlsContext<T>(
  _client: RetiredDatabaseClient,
  _actor: AuthorizationActor,
  _work: () => Promise<T>,
): Promise<T> {
  void _client;
  void _actor;
  void _work;
  throw new Error("La persistencia PostgreSQL directa fue retirada. Usa Supabase.");
}
