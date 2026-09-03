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

const report = { mode: apply ? "apply" : "dry-run", source: basename(sourcePath), ...metrics, inserted: 0, updated: 0, unresolved: 0 };

if (apply) {
  const environment = envFile(".env.local");
  if (!environment.NEXT_PUBLIC_SUPABASE_URL || !environment.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  }
  const supabase = createClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const [{ data: organizations, error: organizationError }, { data: countries, error: countryError }, { data: lines, error: lineError }, { data: roles, error: roleError }] = await Promise.all([
    supabase.from("organizations").select("id,slug").eq("slug", environment.BOOTSTRAP_ORG_SLUG).limit(1),
    supabase.from("countries").select("id,name,organization_id"),
    supabase.from("business_lines").select("id,code,company_id,organization_id"),
    supabase.from("roles").select("id,key"),
  ]);
  if (organizationError || countryError || lineError || roleError || !organizations?.[0]) throw new Error("DIRECTORY_CATALOG_UNAVAILABLE");
  const organization = organizations[0];
  const roleByKey = new Map(roles.map((role) => [role.key, role.id]));

  for (const item of normalizedRows) {
    const country = countries.find((entry) => entry.organization_id === organization.id && entry.name === item.country);
    const businessLine = lines.find((entry) => entry.organization_id === organization.id && entry.code === item.lineCode);
    if (!country || !businessLine) { report.unresolved += 1; continue; }
    const { data: branch } = await supabase.from("branches").select("id,operational_area_id").eq("organization_id", organization.id).eq("country_id", country.id).eq("company_id", businessLine.company_id).eq("name", item.branch).maybeSingle();
    if (!branch) { report.unresolved += 1; continue; }
    const slot = { organization_id: organization.id, country_id: country.id, company_id: businessLine.company_id, operational_area_id: branch.operational_area_id, branch_id: branch.id, business_line_id: businessLine.id, role_key: "gerente_sucursal", status: isVacancy(item.branchManager) ? "vacant" : "filled", source_file: basename(sourcePath), source_row: item.row, updated_at: new Date().toISOString() };
    const { error: slotError } = await supabase.from("directory_assignment_slots").upsert(slot, { onConflict: "organization_id,country_id,company_id,branch_id,business_line_id,role_key" });
    if (slotError) throw new Error("DIRECTORY_SLOT_UPSERT_FAILED");
    if (isVacancy(item.branchManager)) { report.updated += 1; continue; }
    const email = emailsByName.get(normal(item.branchManager));
    if (!email || !roleByKey.get("gerente_sucursal")) { report.unresolved += 1; continue; }
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!profile) { report.unresolved += 1; continue; }
    const assignment = { organization_id: organization.id, profile_id: profile.id, role_id: roleByKey.get("gerente_sucursal"), country_id: country.id, company_id: businessLine.company_id, operational_area_id: branch.operational_area_id, branch_id: branch.id, business_line_id: businessLine.id, business_line_code: item.lineCode, status: "active", starts_at: new Date().toISOString(), metadata: { source: "ddddd2", source_row: item.row } };
    const { data: existing } = await supabase.from("manager_assignments").select("id").eq("profile_id", profile.id).eq("role_id", assignment.role_id).eq("branch_id", branch.id).eq("business_line_id", businessLine.id).maybeSingle();
    const result = existing ? await supabase.from("manager_assignments").update(assignment).eq("id", existing.id) : await supabase.from("manager_assignments").insert(assignment);
    if (result.error) throw new Error("DIRECTORY_ASSIGNMENT_UPSERT_FAILED");
    report[existing ? "updated" : "inserted"] += 1;
  }
}

mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/ddddd2-import-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ mode: report.mode, assignments: report.assignments, countries: report.countries, lines: report.lines, vacancies: report.vacancies, areaManagers: report.areaManagers, branchManagers: report.branchManagers, inserted: report.inserted, updated: report.updated, unresolved: report.unresolved }));
