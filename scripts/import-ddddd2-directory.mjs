import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const sourcePath = fileIndex >= 0 ? args[fileIndex + 1] : null;
const apply = args.includes("--apply");
const dryRun = args.includes("--dry-run");

if (!sourcePath || (!apply && !dryRun) || (apply && dryRun)) {
  throw new Error("Usage: node scripts/import-ddddd2-directory.mjs --file RUTA.xlsx --dry-run|--apply");
}

function envFile(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8").split(/\r?\n/).flatMap((line) => {
      const separator = line.indexOf("=");
      if (separator < 1 || line.trimStart().startsWith("#")) return [];
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^(?:"|')|(?:"|')$/g, "");
      return key ? [[key, value]] : [];
    }),
  );
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normal(value) {
  return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isVacancy(value) {
  return normal(value) === "no hay";
}

function countryName(value) {
  const normalized = normal(value);
  if (normalized === "el salvador") return "El Salvador";
  if (normalized === "honduras") return "Honduras";
  throw new Error("COUNTRY_NOT_SUPPORTED");
}

function lineCode(value) {
  const normalized = normal(value);
  if (normalized === "laboratorio") return "LABORATORY";
  if (normalized === "fisioterapia") return "PHYSIOTHERAPY";
  if (normalized === "imagenes") return "IMAGING";
  throw new Error("BUSINESS_LINE_NOT_SUPPORTED");
}

function rowsFor(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

// SheetJS' ESM file helper does not normalize Windows separators consistently;
// Node's filesystem loader does, so feed it the private workbook buffer.
const workbook = XLSX.read(readFileSync(resolve(sourcePath)), { type: "buffer", cellDates: false });
const directoryRows = rowsFor(workbook.Sheets["info general"]);
const branchManagerRows = rowsFor(workbook.Sheets["gerentes de sucursal"]);
const areaManagerRows = rowsFor(workbook.Sheets["gerentes de área"]);

if (directoryRows.length !== 95) throw new Error("DIRECTORY_ROW_COUNT_INVALID");

const emailsByName = new Map();
for (const row of [...branchManagerRows, ...areaManagerRows]) {
  const name = row["Gerente de sucursal"] ?? row["Gerente de area"];
  const email = row.correo ?? row.Correo;
  if (text(name) && text(email)) emailsByName.set(normal(name), text(email).toLowerCase());
}

const normalizedRows = directoryRows.map((row, index) => ({
  row: index + 2,
  branch: text(row.sucursal),
  branchManager: text(row["gerente de sucursal"]),
  areaManager: text(row["Gerente de área"]),
  country: countryName(row["País"]),
  area: text(row["zona/dep/municipio"]),
  lineCode: lineCode(row["Línea"]),
}));

const metrics = {
  assignments: normalizedRows.length,
  countries: Object.fromEntries([...new Set(normalizedRows.map((row) => row.country))].map((country) => [country, normalizedRows.filter((row) => row.country === country).length])),
  lines: Object.fromEntries([...new Set(normalizedRows.map((row) => row.lineCode))].map((line) => [line, normalizedRows.filter((row) => row.lineCode === line).length])),
  areaManagers: new Set(normalizedRows.map((row) => normal(row.areaManager))).size,
  branchManagers: new Set(normalizedRows.filter((row) => !isVacancy(row.branchManager)).map((row) => normal(row.branchManager))).size,
  vacancies: normalizedRows.filter((row) => isVacancy(row.branchManager)).length,
};

const assignmentKeys = normalizedRows.map((row) => `${normal(row.country)}|${normal(row.branch)}|${row.lineCode}`);
const duplicateAssignmentCount = assignmentKeys.length - new Set(assignmentKeys).size;
if (duplicateAssignmentCount !== 0) throw new Error("DIRECTORY_DUPLICATE_BRANCH_LINE_ASSIGNMENTS");

const report = { mode: apply ? "apply" : "dry-run", source: basename(sourcePath), ...metrics, duplicates: duplicateAssignmentCount, inserted: 0, updated: 0, unresolved: 0, doubtfulRows: [] };

if (apply) {
  const environment = envFile(".env.local");
  if (!environment.NEXT_PUBLIC_SUPABASE_URL || !environment.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  }
  const supabase = createClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const [{ data: organizations, error: organizationError }, { data: countries, error: countryError }, { data: lines, error: lineError }, { data: roles, error: roleError }, { data: areas, error: areaError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.from("organizations").select("id,slug").eq("slug", environment.BOOTSTRAP_ORG_SLUG).limit(1),
    supabase.from("countries").select("id,name,organization_id"),
    supabase.from("business_lines").select("id,code,company_id,organization_id"),
    supabase.from("roles").select("id,key"),
    supabase.from("operational_areas").select("id,name,country_id,company_id,manager_profile_id,organization_id"),
    supabase.from("profiles").select("id,email,display_name,organization_id"),
  ]);
  if (organizationError || countryError || lineError || roleError || areaError || profileError || !organizations?.[0]) throw new Error("DIRECTORY_CATALOG_UNAVAILABLE");
  const organization = organizations[0];
  const roleByKey = new Map(roles.map((role) => [role.key, role.id]));
  if (!roleByKey.get("gerente_area") || !roleByKey.get("gerente_sucursal")) throw new Error("DIRECTORY_ROLE_CATALOG_INCOMPLETE");
  const profilesForOrganization = profiles.filter((profile) => profile.organization_id === organization.id);
  const profileByEmail = new Map(profilesForOrganization.filter((profile) => text(profile.email)).map((profile) => [text(profile.email).toLowerCase(), profile]));
  const profileByName = new Map(profilesForOrganization.filter((profile) => text(profile.display_name)).map((profile) => [normal(profile.display_name), profile]));
  const appliedAreaManagers = new Set();
  const appliedAreaBranches = new Set();

  const applyRow = async (item) => {
    const country = countries.find((entry) => entry.organization_id === organization.id && entry.name === item.country);
    const businessLine = lines.find((entry) => entry.organization_id === organization.id && entry.code === item.lineCode);
    if (!country || !businessLine) { report.unresolved += 1; return; }
    const { data: branch } = await supabase.from("branches").select("id,operational_area_id").eq("organization_id", organization.id).eq("country_id", country.id).eq("company_id", businessLine.company_id).eq("name", item.branch).maybeSingle();
    if (!branch) { report.unresolved += 1; return; }
    // The existing branch → area relationship is canonical. Workbook area
    // labels are display text and can differ in punctuation or abbreviations.
    const area = areas.find((entry) => entry.organization_id === organization.id && entry.id === branch.operational_area_id);
    if (!area) { report.unresolved += 1; return; }
    const areaManagerKey = `${area.id}|${normal(item.areaManager)}`;
    if (!appliedAreaManagers.has(areaManagerKey)) {
      appliedAreaManagers.add(areaManagerKey);
      const areaEmail = emailsByName.get(normal(item.areaManager));
      const areaProfile = (areaEmail ? profileByEmail.get(areaEmail) : null) ?? profileByName.get(normal(item.areaManager)) ?? null;
      if (!areaProfile) { report.doubtfulRows.push({ row: item.row, role: "gerente_area" }); return; }
      const areaAssignment = { organization_id: organization.id, profile_id: areaProfile.id, role_id: roleByKey.get("gerente_area"), country_id: country.id, company_id: businessLine.company_id, operational_area_id: area.id, branch_id: null, business_line_id: null, business_line_code: null, status: "active", starts_at: new Date().toISOString(), metadata: { source: "ddddd2", source_row: item.row } };
      const { data: existingAreaAssignment } = await supabase.from("manager_assignments").select("id").eq("profile_id", areaProfile.id).eq("role_id", areaAssignment.role_id).eq("operational_area_id", area.id).eq("status", "active").maybeSingle();
      const areaAssignmentResult = existingAreaAssignment ? await supabase.from("manager_assignments").update(areaAssignment).eq("id", existingAreaAssignment.id) : await supabase.from("manager_assignments").insert(areaAssignment);
      if (areaAssignmentResult.error) throw new Error("DIRECTORY_AREA_ASSIGNMENT_UPSERT_FAILED");
      const { error: areaManagerError } = await supabase.from("operational_areas").update({ manager_profile_id: areaProfile.id }).eq("id", area.id);
      if (areaManagerError) throw new Error("DIRECTORY_AREA_MANAGER_UPDATE_FAILED");
    }
    if (!appliedAreaBranches.has(branch.id)) {
      appliedAreaBranches.add(branch.id);
      const { data: activeAreaBranch } = await supabase.from("area_branch_assignments").select("id").eq("branch_id", branch.id).is("ends_at", null).maybeSingle();
      if (!activeAreaBranch) {
        const { error: areaBranchError } = await supabase.from("area_branch_assignments").insert({ organization_id: organization.id, operational_area_id: area.id, branch_id: branch.id });
        if (areaBranchError) throw new Error("DIRECTORY_AREA_BRANCH_ASSIGNMENT_FAILED");
      }
    }
    const slot = { organization_id: organization.id, country_id: country.id, company_id: businessLine.company_id, operational_area_id: area.id, branch_id: branch.id, business_line_id: businessLine.id, role_key: "gerente_sucursal", status: isVacancy(item.branchManager) ? "vacant" : "filled", source_file: basename(sourcePath), source_row: item.row, updated_at: new Date().toISOString() };
    const { error: slotError } = await supabase.from("directory_assignment_slots").upsert(slot, { onConflict: "organization_id,country_id,company_id,branch_id,business_line_id,role_key" });
    if (slotError) throw new Error("DIRECTORY_SLOT_UPSERT_FAILED");
    if (isVacancy(item.branchManager)) { report.updated += 1; return; }
    const email = emailsByName.get(normal(item.branchManager));
    const profile = profileByEmail.get(email) ?? profileByName.get(normal(item.branchManager)) ?? null;
    if (!profile || !roleByKey.get("gerente_sucursal")) { report.doubtfulRows.push({ row: item.row, role: "gerente_sucursal" }); return; }
    const assignment = { organization_id: organization.id, profile_id: profile.id, role_id: roleByKey.get("gerente_sucursal"), country_id: country.id, company_id: businessLine.company_id, operational_area_id: area.id, branch_id: branch.id, business_line_id: businessLine.id, business_line_code: item.lineCode, status: "active", starts_at: new Date().toISOString(), metadata: { source: "ddddd2", source_row: item.row } };
    const { data: existing } = await supabase.from("manager_assignments").select("id").eq("profile_id", profile.id).eq("role_id", assignment.role_id).eq("branch_id", branch.id).eq("business_line_id", businessLine.id).maybeSingle();
    const result = existing ? await supabase.from("manager_assignments").update(assignment).eq("id", existing.id) : await supabase.from("manager_assignments").insert(assignment);
    if (result.error) throw new Error("DIRECTORY_ASSIGNMENT_UPSERT_FAILED");
    report[existing ? "updated" : "inserted"] += 1;
  };
  for (let start = 0; start < normalizedRows.length; start += 8) {
    await Promise.all(normalizedRows.slice(start, start + 8).map(applyRow));
  }
  if (report.unresolved !== 0) throw new Error(`DIRECTORY_UNRESOLVED:${report.unresolved}`);
  if (report.assignments !== 95 || report.countries["El Salvador"] !== 60 || report.countries.Honduras !== 35 || report.lines.LABORATORY !== 76 || report.lines.IMAGING !== 12 || report.lines.PHYSIOTHERAPY !== 7 || report.areaManagers !== 13 || report.branchManagers !== 72 || report.vacancies !== 11 || report.duplicates !== 0) throw new Error("DIRECTORY_METRICS_INVALID");
}

mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/ddddd2-import-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ mode: report.mode, assignments: report.assignments, countries: report.countries, lines: report.lines, vacancies: report.vacancies, areaManagers: report.areaManagers, branchManagers: report.branchManagers, duplicates: report.duplicates, inserted: report.inserted, updated: report.updated, unresolved: report.unresolved, doubtful: report.doubtfulRows.length }));
