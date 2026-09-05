import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";
import { createAdminClient } from "@/lib/v7/server/admin-client";

const maxFileBytes = 1024 * 1024;
const requiredColumns = [
  "country_id",
  "company_id",
  "operational_area_id",
  "branch_id",
  "business_line_id",
  "period",
  "kpi_code",
  "kpi_name",
  "target_value",
  "unit",
  "direction",
  "approval_status",
] as const;
const allowedExtensions = new Set(["csv", "xlsx"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedUnits = new Set(["currency", "count", "ratio"]);
const allowedDirections = new Set(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"]);
const allowedStatuses = new Set(["active", "approved"]);

type ImportedRow = {
  row: number;
  countryId: string;
  companyId: string;
  operationalAreaId: string | null;
  branchId: string;
  businessLineId: string;
  periodStart: string;
  periodEnd: string;
  kpiCode: string;
  kpiName: string;
  targetValue: number;
  unit: "currency" | "count" | "ratio";
  direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  status: "active" | "approved";
};
type BranchCatalogRow = {
  id: string;
  organization_id: string;
  country_id: string;
  company_id: string;
  operational_area_id: string | null;
};
type LineCatalogRow = { id: string; organization_id: string; company_id: string | null };
type ExistingTargetRow = { id: string };

function cell(value: unknown) {
  return String(value ?? "").trim();
}

function monthBounds(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) return null;
  const [year, month] = period.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { periodEnd: `${period}-${String(lastDay).padStart(2, "0")}`, periodStart: `${period}-01` };
}

function parseRows(fileName: string, bytes: Uint8Array) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension)) throw new Error("UNSUPPORTED_FILE_TYPE");
  const workbook = XLSX.read(bytes, { cellFormula: true, type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("EMPTY_WORKBOOK");
  if (Object.values(sheet).some((item) => typeof item === "object" && item !== null && "f" in item)) {
    throw new Error("FORMULAS_NOT_ALLOWED");
  }
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headers = (grid[0] ?? []).map((value) => cell(value).toLowerCase());
  if (requiredColumns.some((column) => !headers.includes(column))) throw new Error("TARGET_TEMPLATE_COLUMNS_INVALID");
  const positions = new Map(headers.map((header, index) => [header, index]));
  return grid.slice(1).flatMap((sourceRow, index) => {
    if (sourceRow.every((value) => cell(value) === "")) return [];
    const value = (column: typeof requiredColumns[number]) => cell(sourceRow[positions.get(column) ?? -1]);
    const raw = Object.fromEntries(requiredColumns.map((column) => [column, value(column)]));
    if (Object.values(raw).some((item) => /^[=+@-]/.test(item))) throw new Error(`FORMULA_LIKE_VALUE_AT_ROW_${index + 2}`);
    const bounds = monthBounds(raw.period);
    const targetValue = Number(raw.target_value);
    if (
      !uuidPattern.test(raw.country_id)
      || !uuidPattern.test(raw.company_id)
      || (raw.operational_area_id !== "" && !uuidPattern.test(raw.operational_area_id))
      || !uuidPattern.test(raw.branch_id)
      || !uuidPattern.test(raw.business_line_id)
      || !bounds
      || !raw.kpi_code
      || !raw.kpi_name
      || !Number.isFinite(targetValue)
      || targetValue < 0
      || !allowedUnits.has(raw.unit)
      || !allowedDirections.has(raw.direction)
      || !allowedStatuses.has(raw.approval_status)
    ) throw new Error(`INVALID_TARGET_ROW_${index + 2}`);
    return [{
      row: index + 2,
      countryId: raw.country_id,
      companyId: raw.company_id,
      operationalAreaId: raw.operational_area_id || null,
      branchId: raw.branch_id,
      businessLineId: raw.business_line_id,
      periodStart: bounds.periodStart,
      periodEnd: bounds.periodEnd,
      kpiCode: raw.kpi_code,
      kpiName: raw.kpi_name,
      targetValue,
      unit: raw.unit as ImportedRow["unit"],
      direction: raw.direction as ImportedRow["direction"],
      status: raw.approval_status as ImportedRow["status"],
    }];
  });
}

export async function POST(request: Request) {
  const actorOrResponse = await actorForApi("goals.manage");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (!["ceo", "super_admin", "webmaster_admin"].includes(actor.roleKey)) {
    return NextResponse.json({ error: "TARGET_IMPORT_ADMIN_ONLY" }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const dryRun = form?.get("dryRun") !== "false";
  if (!(file instanceof File) || file.size === 0 || file.size > maxFileBytes) {
    return NextResponse.json({ error: "INVALID_TARGET_IMPORT_FILE" }, { status: 400 });
  }

  let rows: ImportedRow[];
  try {
    rows = parseRows(file.name, new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "TARGET_IMPORT_PARSE_FAILED" }, { status: 422 });
  }
  if (rows.length === 0) return NextResponse.json({ error: "TARGET_IMPORT_EMPTY" }, { status: 422 });

  const admin = createAdminClient();
  const branchIds = [...new Set(rows.map((row) => row.branchId))];
  const lineIds = [...new Set(rows.map((row) => row.businessLineId))];
  const [{ data: branches, error: branchError }, { data: lines, error: lineError }] = await Promise.all([
    admin.from("branches").select("id,organization_id,country_id,company_id,operational_area_id").in("id", branchIds),
    admin.from("business_lines").select("id,organization_id,company_id").in("id", lineIds),
  ]);
  if (branchError || lineError) return NextResponse.json({ error: "TARGET_IMPORT_SCOPE_LOOKUP_FAILED" }, { status: 400 });
  const branchById = new Map<string, BranchCatalogRow>(((branches ?? []) as BranchCatalogRow[]).map((branch) => [branch.id, branch]));
  const lineById = new Map<string, LineCatalogRow>(((lines ?? []) as LineCatalogRow[]).map((line) => [line.id, line]));
  for (const row of rows) {
    const branch = branchById.get(row.branchId);
    const line = lineById.get(row.businessLineId);
    if (!branch || !line || branch.organization_id !== actor.scope.organizationId || line.organization_id !== actor.scope.organizationId) {
      return NextResponse.json({ error: "TARGET_IMPORT_SCOPE_MISMATCH", row: row.row }, { status: 403 });
    }
    try {
      assertRecordAccess(actor, {
        organizationId: actor.scope.organizationId,
        countryId: branch.country_id,
        companyId: branch.company_id,
        operationalAreaId: branch.operational_area_id,
        branchId: branch.id,
        businessLineId: line.id,
      });
    } catch {
      return NextResponse.json({ error: "TARGET_IMPORT_SCOPE_MISMATCH", row: row.row }, { status: 403 });
    }
    if (branch.country_id !== row.countryId || branch.company_id !== row.companyId || branch.operational_area_id !== row.operationalAreaId || (line.company_id && line.company_id !== branch.company_id)) {
      return NextResponse.json({ error: "TARGET_IMPORT_CATALOG_MISMATCH", row: row.row }, { status: 422 });
    }
  }
  if (dryRun) return NextResponse.json({ dryRun: true, rowsValid: rows.length, rowsRejected: 0 });

  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const existing = await admin.from("kpi_targets").select("id").eq("organization_id", actor.scope.organizationId).eq("branch_id", row.branchId).eq("business_line_id", row.businessLineId).eq("period_start", row.periodStart).eq("kpi_code", row.kpiCode).eq("is_demo", false).maybeSingle();
    if (existing.error) return NextResponse.json({ error: "TARGET_IMPORT_UPSERT_LOOKUP_FAILED", row: row.row }, { status: 400 });
    const value = {
      approved_at: row.status === "approved" ? new Date().toISOString() : null,
      branch_id: row.branchId,
      business_line_id: row.businessLineId,
      company_id: row.companyId,
      country_id: row.countryId,
      direction: row.direction,
      is_demo: false,
      kpi_code: row.kpiCode,
      kpi_name: row.kpiName,
      operational_area_id: row.operationalAreaId,
      organization_id: actor.scope.organizationId,
      period_end: row.periodEnd,
      period_start: row.periodStart,
      status: row.status,
      target_value: row.targetValue,
      unit: row.unit,
    };
    const existingTarget = existing.data as ExistingTargetRow | null;
    const write = existingTarget
      ? await admin.from("kpi_targets").update(value).eq("id", existingTarget.id)
      : await admin.from("kpi_targets").insert(value);
    if (write.error) return NextResponse.json({ error: "TARGET_IMPORT_WRITE_FAILED", row: row.row }, { status: 400 });
    if (existingTarget) updated += 1;
    else inserted += 1;
    await admin.from("audit_logs").insert({
      action: "kpi_target.imported",
      actor_user_id: actor.userId,
      branch_id: row.branchId,
      company_id: row.companyId,
      country_id: row.countryId,
      entity_id: existingTarget?.id ?? null,
      entity_table: "kpi_targets",
      metadata: { import_source: "csv_xlsx", kpi_code: row.kpiCode, period: row.periodStart, upsert: existingTarget ? "update" : "insert" },
      organization_id: actor.scope.organizationId,
    });
  }
  return NextResponse.json({ dryRun: false, inserted, rowsValid: rows.length, updated });
}
