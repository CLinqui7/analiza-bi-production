import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

function readEnvironmentFile(path) {
  const entries = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .flatMap((line) => {
      const trimmed = line.trim();
      const separator = trimmed.indexOf("=");

      if (!trimmed || trimmed.startsWith("#") || separator <= 0) {
        return [];
      }

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^(?:"|')|(?:"|')$/g, "");

      return [[key, value]];
    });

  return Object.fromEntries(entries);
}

const environment = readEnvironmentFile(".env.local");
const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing required Supabase configuration.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
const tables = [
  "profiles",
  "branches",
  "operational_areas",
  "countries",
  "companies",
  "user_roles",
  "monthly_closings",
  "closing_versions",
];
const counts = {};

for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`Cannot read ${table}: ${error.code ?? "unknown error"}.`);
  }

  counts[table] = count;
}

const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (authError) {
  throw new Error("Cannot read Supabase Auth user count.");
}

const { data: countries, error: countriesError } = await supabase
  .from("countries")
  .select("name")
  .order("name");

if (countriesError) {
  throw new Error("Cannot read country names.");
}

const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

if (bucketsError) {
  throw new Error("Cannot read Storage bucket count.");
}

console.log(
  JSON.stringify(
    {
      authUsers: authData.users.length,
      bucketCount: buckets.length,
      countries: countries.map(({ name }) => name),
      counts,
    },
    null,
    2,
  ),
);
