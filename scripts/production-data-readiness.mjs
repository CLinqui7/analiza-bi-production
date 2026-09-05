import { mkdir, readFile, writeFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const outputDirectory = "artifacts";

async function environment() {
  return Object.fromEntries(
    (await readFile(".env.local", "utf8"))
      .split(/\r?\n/)
      .flatMap((line) => {
        const separator = line.indexOf("=");
        if (separator < 1 || line.trimStart().startsWith("#")) return [];
        return [[line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^(?:\"|')|(?:\"|')$/g, "")]];
      }),
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

const env = await environment();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.BOOTSTRAP_ORG_SLUG) {
  throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: organization, error: organizationError } = await supabase
  .from("organizations")
  .select("id")
  .eq("slug", env.BOOTSTRAP_ORG_SLUG)
  .maybeSingle();
if (organizationError || !organization) throw new Error("DIRECTORY_ORGANIZATION_NOT_FOUND");

const organizationId = organization.id;
const [slotsResult, branchesResult, linesResult, countriesResult, areasResult, closingsResult, targetsResult, branchManagersResult] = await Promise.all([
  supabase.from("directory_assignment_slots").select("country_id,company_id,operational_area_id,branch_id,business_line_id,status").eq("organization_id", organizationId),
  supabase.from("branches").select("id,code,name,country_id,company_id,operational_area_id,status").eq("organization_id", organizationId).eq("is_demo", false),
  supabase.from("business_lines").select("id,code,name,company_id,is_enabled").eq("organization_id", organizationId).eq("is_demo", false),
  supabase.from("countries").select("id,iso2,name").eq("organization_id", organizationId),
  supabase.from("operational_areas").select("id,code,name,manager_profile_id").eq("organization_id", organizationId).eq("status", "active"),
  supabase.from("closing_versions").select("id,branch_id,business_line_id,status,is_demo").eq("organization_id", organizationId).eq("status", "published").eq("is_demo", false),
  supabase.from("kpi_targets").select("branch_id,business_line_id,status,is_demo").eq("organization_id", organizationId).in("status", ["active", "approved"]).eq("is_demo", false),
  supabase.from("branch_managers").select("branch_id,profile_id,is_demo").eq("organization_id", organizationId).eq("is_demo", false),
]);

for (const [name, result] of Object.entries({ slotsResult, branchesResult, linesResult, countriesResult, areasResult, closingsResult, targetsResult, branchManagersResult })) {
  if (result.error) throw new Error(`READINESS_${name.toUpperCase()}_READ_FAILED`);
}

const closings = closingsResult.data ?? [];
const closingIds = closings.map((closing) => closing.id);
const kpisResult = closingIds.length === 0
  ? { data: [], error: null }
  : await supabase
    .from("closing_kpi_results")
    .select("closing_version_id,data_status,value,is_demo")
    .in("closing_version_id", closingIds)
    .eq("is_demo", false);
if (kpisResult.error) throw new Error("READINESS_KPIS_READ_FAILED");

const countries = new Map((countriesResult.data ?? []).map((country) => [country.id, country]));
const branches = new Map((branchesResult.data ?? []).map((branch) => [branch.id, branch]));
const lines = new Map((linesResult.data ?? []).map((line) => [line.id, line]));
const areas = new Map((areasResult.data ?? []).map((area) => [area.id, area]));
const areaReferences = new Map(
  Array.from(areas.keys()).sort().map((areaId, index) => [areaId, `AREA_${String(index + 1).padStart(3, "0")}`]),
);
const branchManagers = new Set((branchManagersResult.data ?? []).filter((manager) => manager.profile_id).map((manager) => manager.branch_id));
const targets = new Set((targetsResult.data ?? []).map((target) => `${target.branch_id}:${target.business_line_id}`));
const kpisByClosing = new Map();
for (const kpi of kpisResult.data ?? []) {
  if (kpi.data_status !== "CALCULATED" || kpi.value === null) continue;
  kpisByClosing.set(kpi.closing_version_id, true);
}
const calculableClosings = new Set(closings.filter((closing) => kpisByClosing.has(closing.id)).map((closing) => `${closing.branch_id}:${closing.business_line_id}`));

const rows = (slotsResult.data ?? []).map((slot) => {
  const branch = branches.get(slot.branch_id);
  const line = lines.get(slot.business_line_id);
  const area = slot.operational_area_id ? areas.get(slot.operational_area_id) : null;
  const country = countries.get(slot.country_id);
  const key = `${slot.branch_id}:${slot.business_line_id}`;
  const statuses = [];
  if (!branch || !line || !country || !area || branch.company_id !== slot.company_id || line.company_id !== slot.company_id) {
    statuses.push("MISSING_REQUIRED_CONFIGURATION");
  }
  if (!calculableClosings.has(key)) statuses.push("NO_CLOSING");
  if (!targets.has(key)) statuses.push("MISSING_TARGET");
  if (slot.status === "vacant") statuses.push("VACANT_MANAGER");
  else if (!branchManagers.has(slot.branch_id) || !area?.manager_profile_id) statuses.push("MISSING_MANAGER");
  if (statuses.length === 0) statuses.push("READY");
  return {
    country: country?.iso2 ?? "UNCONFIGURED",
    businessLine: line?.code ?? "UNCONFIGURED",
    area: slot.operational_area_id ? areaReferences.get(slot.operational_area_id) ?? "UNCONFIGURED" : "UNCONFIGURED",
    branchCode: branch?.code ?? "UNCONFIGURED",
    branchName: branch?.name ?? "UNCONFIGURED",
    statuses,
  };
}).sort((left, right) =>
  left.country.localeCompare(right.country)
  || left.businessLine.localeCompare(right.businessLine)
  || left.area.localeCompare(right.area)
  || left.branchCode.localeCompare(right.branchCode),
);

const summary = Object.fromEntries(
  ["READY", "NO_CLOSING", "MISSING_TARGET", "MISSING_MANAGER", "VACANT_MANAGER", "MISSING_REQUIRED_CONFIGURATION"]
    .map((status) => [status, rows.filter((row) => row.statuses.includes(status)).length]),
);
const report = {
  generatedAt: new Date().toISOString(),
  mode: "read-only",
  organizationScope: "production",
  summary,
  slots: rows,
};
const csv = [
  ["country", "business_line", "area", "branch_code", "branch_name", "statuses"],
  ...rows.map((row) => [row.country, row.businessLine, row.area, row.branchCode, row.branchName, row.statuses.join("|")]),
].map((row) => row.map(csvCell).join(",")).join("\n");

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(`${outputDirectory}/production-data-readiness.json`, `${JSON.stringify(report, null, 2)}\n`),
  writeFile(`${outputDirectory}/production-data-readiness.csv`, `${csv}\n`),
]);
console.log(JSON.stringify({ mode: report.mode, slots: rows.length, summary }));
