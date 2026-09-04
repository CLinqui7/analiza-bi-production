import "server-only";

import { cache } from "react";

import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveV7ActorFromCurrent } from "@/lib/v7/server/api-auth";
import { actorCanSee, getTenantContextOptions } from "@/lib/v7/server/tenant-context";

export type BranchBiMetricKey =
  | "revenue"
  | "margin"
  | "volume"
  | "occupancy"
  | "sla"
  | "score";

export type BranchBiMetric = {
  label: string;
  unit: string;
  value: number;
};

export type BranchBiTrendPoint = {
  period: string;
  revenue: BranchBiMetric | null;
};

export type BranchBiRecord = {
  branchId: string;
  branchName: string;
  branchCode: string;
  areaManagerName: string | null;
  branchManagerName: string | null;
  businessLineCode: string | null;
  businessLineId: string | null;
  businessLineName: string | null;
  city: string | null;
  companyId: string | null;
  countryId: string | null;
  countryName: string | null;
  dataQuality: number | null;
  hasPublishedClosing: boolean;
  latestPeriod: string | null;
  metrics: Partial<Record<BranchBiMetricKey, BranchBiMetric>>;
  operationalAreaId: string | null;
  operationalAreaName: string | null;
  status: "published" | "quality_review" | "no_published_closing";
  trend: BranchBiTrendPoint[];
};

export type BranchBiInsight = {
  branchId: string | null;
  branchName: string | null;
  message: string;
  recommendedAction: string | null;
  severity: string | null;
  title: string;
};

export type BranchBiSnapshot = {
  generatedAt: string;
  history: BranchBiHistoryEntry[];
  historyStatus: "available" | "no_data" | "scope_empty" | "source_error";
  insights: BranchBiInsight[];
  records: BranchBiRecord[];
  sourceAvailable: boolean;
  sourceTables: string[];
};

export type BranchBiHistoryEntry = {
  attachmentCount: number;
  authorName: string | null;
  branchId: string;
  branchName: string;
  businessLineId: string;
  businessLineName: string;
  createdAt: string;
  periodStart: string;
  publishedAt: string | null;
  status: string;
  submissionId: string;
  validationSummary: Record<string, unknown>;
  versionId: string;
  versionNumber: number;
};

type ClosingVersionRow = {
  branch_id: string;
  business_line_id: string | null;
  company_id: string;
  country_id: string;
  id: string;
  operational_area_id: string | null;
  period_end: string | null;
  period_start: string | null;
  published_at: string | null;
  quality_score: number | string | null;
};

type ClosingKpiRow = {
  category: string | null;
  closing_version_id: string;
  data_status: string | null;
  kpi_code: string;
  kpi_name: string;
  unit: string;
  value: number | string | null;
};

type InsightRow = {
  branch_id: string | null;
  recommended_action: string | null;
  severity: string | null;
  summary: string;
  title: string;
};
type ManualSubmissionRow = {
  id: string;
  branch_id: string;
  business_line_id: string;
  company_id: string;
  country_id: string;
  operational_area_id: string | null;
  period_start: string;
};
type ManualVersionRow = {
  id: string;
  submission_id: string;
  version_number: number;
  status: string;
  validation_summary: Record<string, unknown> | null;
  created_at: string;
  published_at: string | null;
  submitted_by: string | null;
};
type AttachmentCountRow = { submission_version_id: string };

function asFiniteNumber(value: number | string | null) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function periodFor(version: ClosingVersionRow) {
  return version.period_end ?? version.period_start ?? version.published_at ?? "";
}

function isCalculable(row: ClosingKpiRow) {
  const status = row.data_status?.toUpperCase() ?? "";
  return status !== "NOT_CALCULABLE" && asFiniteNumber(row.value) !== null;
}

function metricKeyFor(row: ClosingKpiRow): BranchBiMetricKey | null {
  const signature = `${row.kpi_code} ${row.kpi_name} ${row.category ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/(venta|revenue|facturacion|ingreso)/.test(signature)) return "revenue";
  if (/(margen|margin)/.test(signature)) return "margin";
  if (/(ocupacion|occupancy|utilizacion|utilization)/.test(signature)) return "occupancy";
  if (/(sla|tat|turnaround)/.test(signature)) return "sla";
  if (/(puntaje|score|performance)/.test(signature)) return "score";
  if (/(orden|order|paciente|patient|cliente|client|sesion|session|estudio|study|volumen|volume)/.test(signature)) return "volume";
  return null;
}

function metricFrom(row: ClosingKpiRow): BranchBiMetric | null {
  const value = asFiniteNumber(row.value);
  if (!isCalculable(row) || value === null) return null;

  return {
    label: row.kpi_name || row.kpi_code,
    unit: row.unit,
    value,
  };
}

function latestByBranch(
  versions: readonly ClosingVersionRow[],
  branchId: string,
) {
  return versions
    .filter((version) => version.branch_id === branchId)
    .sort((left, right) => periodFor(right).localeCompare(periodFor(left)))[0] ?? null;
}

async function getBranchBiSnapshotUncached(
  actor: AuthorizationActor,
): Promise<BranchBiSnapshot> {
  const admin = getSupabaseAdminClient();
  const generatedAt = new Date().toISOString();
  const sourceTables = [
    "branches",
    "operational_areas",
    "business_lines",
    "manager_assignments",
    "closing_versions",
    "closing_kpi_results",
    "insights",
  ];

  if (!admin) {
    return { generatedAt, history: [], historyStatus: "source_error", insights: [], records: [], sourceAvailable: false, sourceTables };
  }

  const v7Actor = await resolveV7ActorFromCurrent(actor);
  const context = await getTenantContextOptions(v7Actor);
  const visibleBranchIds = context.branches.map((branch) => branch.id);

  if (visibleBranchIds.length === 0) {
    return { generatedAt, history: [], historyStatus: "scope_empty", insights: [], records: [], sourceAvailable: true, sourceTables };
  }

  const versionsResult = await admin
    .from("closing_versions")
    .select("id,country_id,company_id,operational_area_id,branch_id,business_line_id,period_start,period_end,published_at,quality_score")
    .eq("organization_id", actor.scope.organizationId)
    .in("branch_id", visibleBranchIds)
    .eq("is_demo", false)
    .in("status", ["PUBLISHED", "published"]);

  const versions = ((versionsResult.data ?? []) as ClosingVersionRow[]).filter((version) =>
    actorCanSee(v7Actor, {
      organizationId: actor.scope.organizationId,
      branchId: version.branch_id,
      businessLineId: version.business_line_id,
      companyId: version.company_id,
      countryId: version.country_id,
      operationalAreaId: version.operational_area_id,
    }),
  );
  const versionIds = versions.map((version) => version.id);
  const [kpisResult, insightsResult, submissionsResult] = await Promise.all([
    versionIds.length > 0
      ? admin
          .from("closing_kpi_results")
          .select("closing_version_id,kpi_code,kpi_name,category,value,unit,data_status")
          .in("closing_version_id", versionIds)
          .eq("is_demo", false)
      : Promise.resolve({ data: [] as ClosingKpiRow[] }),
    admin
      .from("insights")
      .select("branch_id,title,summary,severity,recommended_action")
      .eq("organization_id", actor.scope.organizationId)
      .in("branch_id", visibleBranchIds)
      .eq("is_demo", false)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("manual_monthly_submissions")
      .select("id,country_id,company_id,operational_area_id,branch_id,business_line_id,period_start")
      .eq("organization_id", actor.scope.organizationId)
      .in("branch_id", visibleBranchIds)
      .eq("is_demo", false),
  ]);
  const kpis = (kpisResult.data ?? []) as ClosingKpiRow[];
  const areasById = new Map(context.operationalAreas.map((area) => [area.id, area]));
  const countriesById = new Map(context.countries.map((country) => [country.id, country]));
  const branchManagersByBranchId = new Map(
    context.branchManagers.map((manager) => [manager.branchId, manager.name]),
  );
  const areaManagersByAreaId = new Map(
    context.areaManagers.map((manager) => [manager.operationalAreaId, manager.name]),
  );
  const linesById = new Map(context.businessLines.map((line) => [line.id, line]));
  const manualSubmissions = ((submissionsResult.data ?? []) as ManualSubmissionRow[]).filter((submission) =>
    actorCanSee(v7Actor, {
      organizationId: actor.scope.organizationId,
      branchId: submission.branch_id,
      businessLineId: submission.business_line_id,
      companyId: submission.company_id,
      countryId: submission.country_id,
      operationalAreaId: submission.operational_area_id,
    }),
  );
  const historyVersionsResult = manualSubmissions.length > 0
    ? await admin
      .from("manual_monthly_submission_versions")
      .select("id,submission_id,version_number,status,validation_summary,created_at,published_at,submitted_by")
      .in("submission_id", manualSubmissions.map((submission) => submission.id))
      .order("created_at", { ascending: false })
      .limit(100)
    : { data: [] as ManualVersionRow[], error: null };
  const historyVersions = (historyVersionsResult.data ?? []) as ManualVersionRow[];
  const historyAuthorIds = Array.from(new Set(historyVersions.map((version) => version.submitted_by).filter((id): id is string => Boolean(id))));
  const [historyProfilesResult, historyAttachmentsResult] = await Promise.all([
    historyAuthorIds.length > 0
      ? admin.from("profiles").select("id,display_name").in("id", historyAuthorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null }> }),
    historyVersions.length > 0
      ? admin.from("manual_monthly_submission_attachments").select("submission_version_id").in("submission_version_id", historyVersions.map((version) => version.id))
      : Promise.resolve({ data: [] as AttachmentCountRow[] }),
  ]);
  const manualSubmissionById = new Map(manualSubmissions.map((submission) => [submission.id, submission]));
  const profileNameById = new Map(
    ((historyProfilesResult.data ?? []) as Array<{ id: string; display_name: string | null }>).map((profile) => [profile.id, profile.display_name]),
  );
  const attachmentCountByVersionId = new Map<string, number>();
  for (const attachment of (historyAttachmentsResult.data ?? []) as AttachmentCountRow[]) {
    attachmentCountByVersionId.set(attachment.submission_version_id, (attachmentCountByVersionId.get(attachment.submission_version_id) ?? 0) + 1);
  }
  const history = historyVersions.flatMap((version): BranchBiHistoryEntry[] => {
    const submission = manualSubmissionById.get(version.submission_id);
    if (!submission) return [];
    const branch = context.branches.find((item) => item.id === submission.branch_id);
    const line = linesById.get(submission.business_line_id);
    if (!branch || !line) return [];
    return [{
      attachmentCount: attachmentCountByVersionId.get(version.id) ?? 0,
      authorName: version.submitted_by ? profileNameById.get(version.submitted_by) ?? null : null,
      branchId: branch.id,
      branchName: branch.name,
      businessLineId: line.id,
      businessLineName: line.name,
      createdAt: version.created_at,
      periodStart: submission.period_start,
      publishedAt: version.published_at,
      status: version.status,
      submissionId: submission.id,
      validationSummary: version.validation_summary ?? {},
      versionId: version.id,
      versionNumber: version.version_number,
    }];
  });
  const historyStatus: BranchBiSnapshot["historyStatus"] = submissionsResult.error || historyVersionsResult.error
    ? "source_error"
    : history.length > 0
      ? "available"
      : "no_data";
  const kpisByVersion = new Map<string, ClosingKpiRow[]>();

  for (const kpi of kpis) {
    const rows = kpisByVersion.get(kpi.closing_version_id) ?? [];
    rows.push(kpi);
    kpisByVersion.set(kpi.closing_version_id, rows);
  }

  const records = context.branches
    .map((branch): BranchBiRecord => {
      const latestVersion = latestByBranch(versions, branch.id);
      const area = branch.operationalAreaId
        ? areasById.get(branch.operationalAreaId)
        : null;
      const country = branch.countryId ? countriesById.get(branch.countryId) : null;
      const line = latestVersion?.business_line_id
        ? linesById.get(latestVersion.business_line_id)
        : context.businessLines.find((item) => item.parentId === branch.parentId) ?? null;
      const latestMetrics: Partial<Record<BranchBiMetricKey, BranchBiMetric>> = {};

      for (const kpi of latestVersion ? kpisByVersion.get(latestVersion.id) ?? [] : []) {
        const key = metricKeyFor(kpi);
        const metric = metricFrom(kpi);
        if (key && metric && !latestMetrics[key]) latestMetrics[key] = metric;
      }

      const trend = versions
        .filter((version) => version.branch_id === branch.id)
        .sort((left, right) => periodFor(left).localeCompare(periodFor(right)))
        .map((version) => {
          const revenue = (kpisByVersion.get(version.id) ?? [])
            .map((kpi) => ({ key: metricKeyFor(kpi), metric: metricFrom(kpi) }))
            .find((item) => item.key === "revenue")?.metric ?? null;
          return { period: periodFor(version), revenue };
        });
      const dataQuality = latestVersion
        ? asFiniteNumber(latestVersion.quality_score)
        : null;

      return {
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code ?? branch.id,
        areaManagerName: branch.operationalAreaId
          ? areaManagersByAreaId.get(branch.operationalAreaId) ?? null
          : null,
        branchManagerName: branchManagersByBranchId.get(branch.id) ?? null,
        businessLineCode: line?.code ?? null,
        businessLineId: line?.id ?? null,
        businessLineName: line?.name ?? null,
        city: branch.city ?? null,
        companyId: branch.parentId ?? null,
        countryId: branch.countryId ?? null,
        countryName: country?.name ?? null,
        dataQuality,
        hasPublishedClosing: Boolean(latestVersion),
        latestPeriod: latestVersion ? periodFor(latestVersion) : null,
        metrics: latestMetrics,
        operationalAreaId: area?.id ?? branch.operationalAreaId ?? null,
        operationalAreaName: area?.name ?? null,
        status: !latestVersion
          ? "no_published_closing"
          : dataQuality !== null && dataQuality < 75
            ? "quality_review"
            : "published",
        trend,
      };
    })
    .sort((left, right) => left.branchName.localeCompare(right.branchName, "es"));
  const namesByBranchId = new Map(records.map((record) => [record.branchId, record.branchName]));
  const insights = ((insightsResult.data ?? []) as InsightRow[]).map((insight) => ({
    branchId: insight.branch_id,
    branchName: insight.branch_id ? namesByBranchId.get(insight.branch_id) ?? null : null,
    message: insight.summary,
    recommendedAction: insight.recommended_action,
    severity: insight.severity,
    title: insight.title,
  }));

  const kpiSourceAvailable = !("error" in kpisResult) || !kpisResult.error;
  return { generatedAt, history, historyStatus, insights, records, sourceAvailable: !versionsResult.error && kpiSourceAvailable, sourceTables };
}

/** React cache is request scoped here; no tenant data is shared between actors. */
export const getBranchBiSnapshot = cache(getBranchBiSnapshotUncached);
