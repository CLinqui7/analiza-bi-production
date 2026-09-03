import { getBranchBiSnapshot } from "@/lib/v7/server/branch-bi-snapshot";

import type { AuthorizationActor } from "@/lib/security/authorization-policy";

export type OfficialBusinessLineCode =
  | "PHYSIOTHERAPY"
  | "LABORATORY"
  | "IMAGING";

export type OfficialDashboardFilter = {
  branchId?: string;
  businessLineId?: string;
  companyId?: string;
  countryId?: string;
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
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0
    ? present.reduce((total, value) => total + value, 0)
    : null;
}

function average(values: readonly (number | null)[]) {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0
    ? present.reduce((total, value) => total + value, 0) / present.length
    : null;
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
  const branchSnapshot = await getBranchBiSnapshot(actor);
  const scopedRecords = branchSnapshot.records.filter(
    (record) =>
      (isWildcard(filter.countryId) || record.countryId === filter.countryId) &&
      (isWildcard(filter.companyId) || record.companyId === filter.companyId) &&
      (isWildcard(filter.branchId) || record.branchId === filter.branchId) &&
      lineFilterMatches(record, filter.businessLineId) &&
      (!filter.periodStart ||
        record.latestPeriod?.slice(0, 7) === filter.periodStart.slice(0, 7)),
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
        revenueCompliance: null,
        revenueTarget: null,
        status: "sin_meta" as const,
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
    targetComparisons: [],
    totals: {
      approvedTargets: 0,
      officialInsights: insights.length,
      publishedClosings: publishedRecords.length,
      revenueActual,
      revenueCompliance: null,
      revenueTarget: null,
    },
  };
}
