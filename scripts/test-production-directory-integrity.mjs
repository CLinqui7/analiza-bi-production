import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

function environment() {
  const path = ".env.local";
  if (!existsSync(path)) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  return Object.fromEntries(readFileSync(path, "utf8").split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf("=");
    if (separator < 1 || line.trimStart().startsWith("#")) return [];
    return [[line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^(?:\"|')|(?:\"|')$/g, "")]];
  }));
}

const env = environment();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.BOOTSTRAP_ORG_SLUG) {
  throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: organization, error: organizationError } = await supabase.from("organizations").select("id").eq("slug", env.BOOTSTRAP_ORG_SLUG).maybeSingle();
if (organizationError || !organization) throw new Error("DIRECTORY_ORGANIZATION_NOT_FOUND");

const { data: slots, error } = await supabase
  .from("directory_assignment_slots")
  .select("country_id,company_id,operational_area_id,branch_id,business_line_id,status")
  .eq("organization_id", organization.id);
if (error) throw new Error("DIRECTORY_READ_FAILED");

const rows = slots ?? [];
const count = (predicate) => rows.filter(predicate).length;
const countryIds = [...new Set(rows.map((row) => row.country_id))];
const lineIds = [...new Set(rows.map((row) => row.business_line_id))];
const branchIds = [...new Set(rows.map((row) => row.branch_id))];
const [{ data: countries }, { data: lines }, { data: managers }, { data: branches }, { data: roles }, { data: branchManagers }] = await Promise.all([
  supabase.from("countries").select("id,iso2").in("id", countryIds),
  supabase.from("business_lines").select("id,code").in("id", lineIds),
  supabase.from("manager_assignments").select("profile_id,role_id,operational_area_id,branch_id,status,metadata").eq("organization_id", organization.id).eq("status", "active"),
  supabase.from("branches").select("id,country_id").in("id", branchIds),
  supabase.from("roles").select("id,key"),
  supabase.from("branch_managers").select("profile_id,branch_id").eq("organization_id", organization.id).eq("is_demo", false).in("branch_id", branchIds),
]);
const countryById = new Map((countries ?? []).map((country) => [country.id, country.iso2]));
const lineById = new Map((lines ?? []).map((line) => [line.id, line.code]));
const branchCountryById = new Map((branches ?? []).map((branch) => [branch.id, branch.country_id]));
const roleById = new Map((roles ?? []).map((role) => [role.id, role.key]));
const directoryAreaIds = new Set(rows.map((row) => row.operational_area_id).filter(Boolean));
const isDirectoryAssignment = (manager) => manager.metadata && typeof manager.metadata === "object" && manager.metadata.source === "ddddd2";
const metrics = {
  assignmentSlots: rows.length,
  es: count((row) => countryById.get(row.country_id) === "SV" || countryById.get(row.country_id) === "ES"),
  hn: count((row) => countryById.get(row.country_id) === "HN"),
  laboratory: count((row) => lineById.get(row.business_line_id) === "LABORATORY"),
  imaging: count((row) => lineById.get(row.business_line_id) === "IMAGING"),
  physiotherapy: count((row) => lineById.get(row.business_line_id) === "PHYSIOTHERAPY"),
  vacancies: count((row) => row.status === "vacant"),
  duplicateBranchLine: rows.length - new Set(rows.map((row) => `${row.branch_id}:${row.business_line_id}`)).size,
  crossCountry: count((row) => branchCountryById.get(row.branch_id) !== row.country_id),
  areaManagers: new Set((managers ?? []).filter((manager) => isDirectoryAssignment(manager) && roleById.get(manager.role_id) === "gerente_area" && directoryAreaIds.has(manager.operational_area_id)).map((manager) => manager.profile_id)).size,
  branchManagers: new Set((branchManagers ?? []).filter((manager) => rows.some((row) => row.branch_id === manager.branch_id && row.status === "filled") && manager.profile_id).map((manager) => manager.profile_id)).size,
};

assert.equal(metrics.assignmentSlots, 95, "DIRECTORY_ASSIGNMENT_SLOTS_INVALID");
assert.equal(metrics.es, 60, "DIRECTORY_ES_INVALID");
assert.equal(metrics.hn, 35, "DIRECTORY_HN_INVALID");
assert.equal(metrics.laboratory, 76, "DIRECTORY_LAB_INVALID");
assert.equal(metrics.imaging, 12, "DIRECTORY_IMG_INVALID");
assert.equal(metrics.physiotherapy, 7, "DIRECTORY_FISIO_INVALID");
assert.equal(metrics.areaManagers, 13, "DIRECTORY_GA_INVALID");
assert.equal(metrics.branchManagers, 72, "DIRECTORY_GS_INVALID");
assert.equal(metrics.vacancies, 11, "DIRECTORY_VACANCIES_INVALID");
assert.equal(metrics.duplicateBranchLine, 0, "DIRECTORY_DUPLICATE_BRANCH_LINE");
assert.equal(metrics.crossCountry, 0, "DIRECTORY_CROSS_COUNTRY");
console.log(JSON.stringify({ mode: "read-only", ...metrics }));
