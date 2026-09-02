import { Pool, type PoolClient, type PoolConfig } from "pg";

import type { AuthorizationActor } from "../security/authorization-policy.ts";
import { isDemoRuntimeEnvironment } from "../security/environment.ts";

const databaseUrlEnvNames = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;
const discreteDatabaseEnvNames = [
  "PGHOST",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
] as const;

declare global {
  var analizaPgPool: Pool | undefined;
}

export function getDatabaseUrl() {
  for (const envName of databaseUrlEnvNames) {
    const value = process.env[envName]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function getMissingDatabaseConfig() {
  const missingConfig: string[] = [];

  if (getDatabaseUrl()) {
    return missingConfig;
  }

  const missingDiscreteConfig = discreteDatabaseEnvNames.filter(
    (envName) => !process.env[envName]?.trim(),
  );

  if (missingDiscreteConfig.length > 0) {
    missingConfig.push("DATABASE_URL", ...missingDiscreteConfig);
  }

  return missingConfig;
}

function readDiscreteDatabaseConfig(): PoolConfig | null {
  const host = process.env.PGHOST?.trim();
  const user = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD?.trim();
  const database = process.env.PGDATABASE?.trim();

  if (!host || !user || !password || !database) {
    return null;
  }

  const port = Number(process.env.PGPORT ?? "5432");

  return {
    database,
    host,
    password,
    port: Number.isInteger(port) && port > 0 ? port : 5432,
    user,
  };
}

export function getPostgresPool() {
  const connectionString = getDatabaseUrl();
  const discreteConfig = readDiscreteDatabaseConfig();

  if (!connectionString && !discreteConfig) {
    throw new Error("PostgreSQL is not configured.");
  }

  if (!globalThis.analizaPgPool) {
    const shouldUseSsl =
      process.env.POSTGRES_SSL === "true" ||
      process.env.DATABASE_SSL === "true" ||
      Boolean(connectionString?.includes("sslmode=require"));

    globalThis.analizaPgPool = new Pool({
      ...(connectionString ? { connectionString } : discreteConfig),
      max: 5,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return globalThis.analizaPgPool;
}

type PostgresRoleSecurity = {
  current_user: string;
  rolbypassrls: boolean;
  rolsuper: boolean;
};

function quotePostgresIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function assertSafePostgresRuntimeRole(role: PostgresRoleSecurity) {
  if (role.rolsuper || role.rolbypassrls) {
    throw new Error(
      `PostgreSQL role ${role.current_user} is not allowed for staging/production runtime because it can bypass RLS.`,
    );
  }
}

export async function verifyPostgresRlsRuntime(client: PoolClient) {
  if (isDemoRuntimeEnvironment()) {
    return;
  }

  const result = await client.query<PostgresRoleSecurity>(
    `
      select
        current_user,
        rolsuper,
        rolbypassrls
      from pg_roles
      where rolname = current_user
    `,
  );
  const role = result.rows[0];

  if (!role) {
    throw new Error("PostgreSQL runtime role could not be verified.");
  }

  assertSafePostgresRuntimeRole(role);
}

export async function resetPostgresRuntimeRole(client: PoolClient) {
  if (isDemoRuntimeEnvironment()) {
    return;
  }

  await client.query("reset role");
}

export async function withPostgresRlsContext<T>(
  client: PoolClient,
  actor: AuthorizationActor,
  work: () => Promise<T>,
) {
  if (isDemoRuntimeEnvironment()) {
    return work();
  }

  const authenticatedRole =
    process.env.ANALIZA_POSTGRES_AUTHENTICATED_ROLE?.trim() || "authenticated";

  await verifyPostgresRlsRuntime(client);
  await client.query("begin");

  try {
    await client.query(
      `set local role ${quotePostgresIdentifier(authenticatedRole)}`,
    );
    await client.query(
      `
        select
          set_config('request.jwt.claim.sub', $1, true),
          set_config('request.jwt.claim.role', $2, true)
      `,
      [actor.userId, authenticatedRole],
    );

    const result = await work();

    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
  }
}
