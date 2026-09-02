import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = "supabase/migrations";
const migrationFile = readdirSync(migrationsDir).find((fileName) =>
  fileName.endsWith("_project_handoff_operational_backbone.sql"),
);

if (!migrationFile) {
  throw new Error("Project handoff migration was not found.");
}

const migrationPath = join(migrationsDir, migrationFile);
statSync(migrationPath);
const migration = readFileSync(migrationPath, "utf8");

const requiredTables = [
  "ingestion_template_definitions",
  "ingestion_template_versions",
  "connector_credentials_metadata",
  "connector_mappings",
  "sync_jobs",
  "sync_job_runs",
  "sync_errors",
  "webhook_subscriptions",
  "raw_ingestion_records",
  "kpi_result_lineage",
  "export_requests",
];

for (const table of requiredTables) {
  if (!migration.includes(`create table if not exists public.${table}`)) {
    throw new Error(`Project handoff migration is missing table: ${table}`);
  }

  if (!migration.includes(`alter table public.${table} enable row level security`)) {
    throw new Error(`Project handoff migration must enable RLS for: ${table}`);
  }
}

for (const requiredSql of [
  "grant select, insert, update, delete on table",
  "to authenticated",
  "current_user_can_access_org",
  "current_user_can_access_country",
  "current_user_can_access_company",
  "current_user_can_access_operational_area",
  "current_user_can_access_branch",
  "current_user_is_super_admin()",
  "jsonb_typeof(schema_fields) = 'array'",
  "jsonb_typeof(field_mappings) = 'object'",
  "contains_personal_data boolean not null default false",
  "check (contains_personal_data = false)",
  "pii_policy text not null default 'blocked'",
  "kpi_result_lineage",
]) {
  if (!migration.includes(requiredSql)) {
    throw new Error(`Project handoff migration is missing: ${requiredSql}`);
  }
}

for (const forbiddenSql of [
  "secret_value",
  "access_token",
  "refresh_token",
  "password_hash",
  "plain_password",
]) {
  if (migration.toLowerCase().includes(forbiddenSql)) {
    throw new Error(`Project handoff migration must not store: ${forbiddenSql}`);
  }
}

console.log("Project handoff migration checks passed.");
