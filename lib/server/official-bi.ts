import { getBranchBiSnapshot } from "@/lib/v7/server/branch-bi-snapshot";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import type { AuthorizationActor } from "@/lib/security/authorization-policy";

export type OfficialBusinessLineCode =
  | "PHYSIOTHERAPY"
  | "LABORATORY"
  | "IMAGING";

export type OfficialDashboardFilter = {
  areaId?: string;
  branchId?: string;
  businessLineId?: string;
  companyId?: string;
  countryId?: string;
  managerId?: string;
  periodEnd?: string;
  periodStart?: string;
};

export type OfficialLineSummary = {
  branchCount: number;
  businessLine: OfficialBusinessLineCode;
  lineName: string;
  publishedClosings: number;
  qualityScore: number | null;
  revenueActual: number | null;
  revenueTarget: number | null;
  revenueCompliance: number | null;
  status: "cumplido" | "vigilar" | "critico" | "sin_meta";
};

export type OfficialTargetComparison = {
  actualValue: number | null;
  branchName: string;
  businessLine: OfficialBusinessLineCode;
  kpiId: string;
  kpiLabel: string;
  lineName: string;
  period: string;
  status: "cumplido" | "vigilar" | "critico" | "sin_resultado";
  targetValue: number;
  unit: "currency" | "count" | "ratio";
  variance: number | null;
  compliance: number | null;
};

export type OfficialInsight = {
  branchName: string;
  businessLine: OfficialBusinessLineCode;
  impact: string;
  kpiId: string;
  lineName: string;
  message: string;
  period: string;
  recommendedAction: string;
  severity: "critica" | "alta" | "media" | "positiva";
  title: string;
};

export type OfficialExecutiveSnapshot = {
  dataStatus: "available" | "no_data" | "configuration_error";
  errorMessage?: string;
  generatedAt: string;
  insights: OfficialInsight[];
  lineSummaries: OfficialLineSummary[];
  period: string | null;
  sourceTables: string[];
  targetComparisons: OfficialTargetComparison[];
  totals: {
    approvedTargets: number;
    officialInsights: number;
    publishedClosings: number;
    revenueActual: number | null;
    revenueTarget: number | null;
    revenueCompliance: number | null;
  };
};

const lineNames: Record<OfficialBusinessLineCode, string> = {
  IMAGING: "Imagenes",
  LABORATORY: "Laboratorio",
  PHYSIOTHERAPY: "Fisioterapia",
};

function asOfficialLine(value: string | null) {
  return value && Object.hasOwn(lineNames, value)
    ? (value as OfficialBusinessLineCode)
    : null;
}

function isWildcard(value?: string) {
  return !value || value.startsWith("__");
}

function lineFilterMatches(
  record: { businessLineCode: string | null; businessLineId: string | null },
  filter?: string,
) {
  if (isWildcard(filter)) return true;
  const normalized = filter
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return (
    record.businessLineId === filter ||
    record.businessLineCode?.toLowerCase() === normalized ||
    (normalized === "laboratorio" && record.businessLineCode === "LABORATORY") ||
    (normalized === "fisioterapia" &&
      record.businessLineCode === "PHYSIOTHERAPY") ||
    ((normalized === "imagen" || normalized === "imagenes") &&
      record.businessLineCode === "IMAGING")
  );
}

function sum(values: readonly (number | null)[]) {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return present.length > 0
    ? present.reduce((total, value) => total + value, 0)
    : null;
}

function average(values: readonly (number | null)[]) {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return present.length > 0
    ? present.reduce((total, value) => total + value, 0) / present.length
    : null;
}

type TargetRow = Record<string, unknown>;

function text(row: TargetRow, ...keys: string[]) {
  const value = keys.map((key) => row[key]).find((candidate) => typeof candidate === "string");
  return typeof value === "string" ? value : null;
}

function number(row: TargetRow, ...keys: string[]) {
  const value = keys.map((key) => row[key]).find((candidate) => typeof candidate === "number" || typeof candidate === "string");
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function targetMetricKey(kpi: string) {
  const normalized = kpi.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/(venta|revenue|facturacion|ingreso)/.test(normalized)) return "revenue" as const;
  if (/(margen|margin)/.test(normalized)) return "margin" as const;
  if (/(ocupacion|occupancy|utilizacion)/.test(normalized)) return "occupancy" as const;
  if (/(sla|tat|turnaround)/.test(normalized)) return "sla" as const;
  if (/(puntaje|score|performance)/.test(normalized)) return "score" as const;
  if (/(orden|paciente|sesion|estudio|volumen|volume)/.test(normalized)) return "volume" as const;
  return null;
}

/** Converts both date and month target representations to the one BI period grain. */
function normalizedMonth(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/.exec(value.trim());
  return match ? `${match[1]}-${match[2]}` : null;
}

function targetPeriodMatches(row: TargetRow, filter: OfficialDashboardFilter) {
  const targetMonth = normalizedMonth(text(row, "period_start", "period_month"));
  if (!targetMonth) return false;
  const fromMonth = normalizedMonth(filter.periodStart);
  const toMonth = normalizedMonth(filter.periodEnd);
  return (!fromMonth || targetMonth >= fromMonth) && (!toMonth || targetMonth <= toMonth);
}

function isApprovedTarget(row: TargetRow, filter: OfficialDashboardFilter) {
  const status = text(row, "status")?.toLowerCase();
  const approvedAt = text(row, "approved_at");
  return row.is_demo !== true
    && (status === "active" || status === "approved")
    && Boolean(approvedAt || status === "approved")
    && targetPeriodMatches(row, filter);
}

/**
 * Production executive BI reads the V7 Supabase schema only. There is no
 * PostgreSQL compatibility fallback: an unavailable source stays unavailable
 * instead of being replaced by seeded or legacy-shaped records.
 */
export async function getOfficialExecutiveSnapshot(
  actor: AuthorizationActor,
  filter: OfficialDashboardFilter = {},
): Promise<OfficialExecutiveSnapshot> {
  const branchSnapshot = await getBranchBiSnapshot(actor, filter);
  const scopedRecords = branchSnapshot.records.filter(
    (record) =>
      (isWildcard(filter.countryId) || record.countryId === filter.countryId) &&
      (isWildcard(filter.companyId) || record.companyId === filter.companyId) &&
      (isWildcard(filter.areaId) || record.operationalAreaId === filter.areaId) &&
      (isWildcard(filter.branchId) || record.branchId === filter.branchId) &&
      (isWildcard(filter.managerId) || record.branchManagerId === filter.managerId || record.areaManagerId === filter.managerId) &&
      lineFilterMatches(record, filter.businessLineId),
  );
  const publishedRecords = scopedRecords.filter(
    (record) => record.hasPublishedClosing,
  );
  const period =
    publishedRecords
      .map((record) => record.latestPeriod?.slice(0, 7) ?? "")
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
  const admin = getSupabaseAdminClient();
  const targetResult = admin && scopedRecords.length > 0
    ? await admin.from("kpi_targets").select("*").eq("organization_id", actor.scope.organizationId).in("branch_id", Array.from(new Set(scopedRecords.map((record) => record.branchId))))
    : { data: [] as TargetRow[] };
  const targets = ((targetResult.data ?? []) as TargetRow[]).filter((target) => isApprovedTarget(target, filter));
  const targetComparisons = targets.flatMap<OfficialTargetComparison>((target) => {
    const branchId = text(target, "branch_id");
    const lineId = text(target, "business_line_id");
    const lineCode = text(target, "business_line");
    const record = scopedRecords.find((candidate) => candidate.branchId === branchId && (!lineId || candidate.businessLineId === lineId) && (!lineCode || candidate.businessLineCode === lineCode));
    const kpiId = text(target, "kpi_code", "kpi_id") ?? "unknown";
    const targetValue = number(target, "target_value");
    const key = targetMetricKey(kpiId);
    const officialLine = asOfficialLine(record?.businessLineCode ?? null);
    if (!record || !officialLine || targetValue === null) return [];
    const actualValue = key ? record.metrics[key]?.value ?? null : null;
    const direction = text(target, "direction") ?? "HIGHER_IS_BETTER";
    const compliance = actualValue === null || !Number.isFinite(actualValue) || targetValue <= 0
      ? null
      : direction === "LOWER_IS_BETTER"
        ? actualValue > 0 ? targetValue / actualValue : null
        : actualValue / targetValue;
    return [{
      actualValue,
      branchName: record.branchName,
      businessLine: officialLine,
      compliance,
      kpiId,
      kpiLabel: text(target, "kpi_name", "label") ?? kpiId,
      lineName: lineNames[officialLine],
      period: normalizedMonth(text(target, "period_start", "period_month")) ?? normalizedMonth(record.latestPeriod) ?? "Sin periodo",
      status: compliance === null ? "sin_resultado" : compliance >= 1 ? "cumplido" : compliance >= 0.9 ? "vigilar" : "critico",
      targetValue,
      unit: text(target, "unit") === "ratio" ? "ratio" : text(target, "unit") === "count" ? "count" : "currency",
      variance: actualValue === null ? null : actualValue - targetValue,
    }];
  });
  const lineSummaries = (
    Object.keys(lineNames) as OfficialBusinessLineCode[]
  ).flatMap((businessLine) => {
    const records = publishedRecords.filter(
      (record) => record.businessLineCode === businessLine,
    );
    if (records.length === 0) return [];

    const countries = new Set(
      records.map((record) => record.countryId).filter(Boolean),
    );
    const revenueActual =
      countries.size === 1
        ? sum(records.map((record) => record.metrics.revenue?.value ?? null))
        : null;

    return [
      {
        branchCount: records.length,
        businessLine,
        lineName: lineNames[businessLine],
        publishedClosings: records.length,
        qualityScore: average(records.map((record) => record.dataQuality)),
        revenueActual,
        revenueCompliance: (() => { const values = targetComparisons.filter((target) => target.businessLine === businessLine && targetMetricKey(target.kpiId) === "revenue").map((target) => target.compliance); return average(values); })(),
        revenueTarget: sum(targetComparisons.filter((target) => target.businessLine === businessLine && targetMetricKey(target.kpiId) === "revenue").map((target) => target.targetValue)),
        status: (() => { const compliance = average(targetComparisons.filter((target) => target.businessLine === businessLine && targetMetricKey(target.kpiId) === "revenue").map((target) => target.compliance)); if (compliance === null) return "sin_meta" as const; return compliance >= 1 ? "cumplido" as const : compliance >= .9 ? "vigilar" as const : "critico" as const; })(),
      },
    ];
  });
  const recordsByBranchId = new Map(
    scopedRecords.map((record) => [record.branchId, record]),
  );
  const insights = branchSnapshot.insights.flatMap<OfficialInsight>((insight) => {
    const record = insight.branchId
      ? recordsByBranchId.get(insight.branchId)
      : null;
    const businessLine = asOfficialLine(record?.businessLineCode ?? null);
    if (!record || !businessLine) return [];

    return [
      {
        branchName: record.branchName,
        businessLine,
        impact: "Sin dato",
        kpiId: "sin-kpi-especifico",
        lineName: lineNames[businessLine],
        message: insight.message,
        period: record.latestPeriod?.slice(0, 7) ?? "Sin periodo",
        recommendedAction: insight.recommendedAction ?? "Sin acción recomendada",
        severity:
          insight.severity === "critica" ||
          insight.severity === "alta" ||
          insight.severity === "positiva"
            ? insight.severity
            : "media",
        title: insight.title,
      },
    ];
  });
  const countries = new Set(
    publishedRecords.map((record) => record.countryId).filter(Boolean),
  );
  const revenueActual =
    countries.size === 1
      ? sum(lineSummaries.map((summary) => summary.revenueActual))
      : null;

  return {
    dataStatus: publishedRecords.length > 0 ? "available" : "no_data",
    generatedAt: branchSnapshot.generatedAt,
    insights,
    lineSummaries,
    period,
    sourceTables: branchSnapshot.sourceTables,
    targetComparisons,
    totals: {
      approvedTargets: targetComparisons.length,
      officialInsights: insights.length,
      publishedClosings: publishedRecords.length,
      revenueActual,
      revenueCompliance: average(targetComparisons.filter((target) => targetMetricKey(target.kpiId) === "revenue").map((target) => target.compliance)),
      revenueTarget: sum(targetComparisons.filter((target) => targetMetricKey(target.kpiId) === "revenue").map((target) => target.targetValue)),
    },
  };
}
