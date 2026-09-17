export type OfficialMetricKey =
  | "revenue"
  | "margin"
  | "volume"
  | "occupancy"
  | "sla"
  | "score";

export type MetricScale =
  | "absolute"
  | "fraction"
  | "percentage_points"
  | "percentage_point_difference";

export type MetricAggregation =
  | "average"
  | "sum"
  | "weighted_ratio";

export type OfficialKpiContract = {
  aggregation: MetricAggregation;
  code: string;
  key: OfficialMetricKey;
  lines?: readonly string[];
  scale: MetricScale;
  unit: string;
};

export type ContractKpiRow = {
  closing_version_id: string;
  data_status: string | null;
  denominator: number | string | null;
  formula_version: string | null;
  kpi_code: string;
  kpi_name: string;
  numerator: number | string | null;
  unit: string;
  value: number | string | null;
};

export type ContractMetric = {
  aggregation: MetricAggregation;
  code: string;
  coverage: "complete" | "not_calculable" | "partial";
  denominator: number | null;
  formulaVersion: string | null;
  key: OfficialMetricKey;
  label: string;
  numerator: number | null;
  scale: MetricScale;
  sourceVersionIds: string[];
  unit: string;
  value: number;
};

export type OfficialVersionIdentity = {
  branch_id: string;
  business_line_id: string | null;
  id: string;
  period_end: string | null;
  period_start: string | null;
  published_at: string | null;
  version_number: number;
};

const contracts: readonly OfficialKpiContract[] = [
  { aggregation: "sum", code: "reported_revenue", key: "revenue", scale: "absolute", unit: "USD" },
  { aggregation: "sum", code: "net_revenue", key: "revenue", scale: "absolute", unit: "USD" },
  { aggregation: "sum", code: "lab_total_sales", key: "revenue", lines: ["LABORATORY"], scale: "absolute", unit: "USD" },
  { aggregation: "sum", code: "physio_sale_dd", key: "revenue", lines: ["PHYSIOTHERAPY"], scale: "absolute", unit: "USD" },
  { aggregation: "sum", code: "imaging_sale_dd", key: "revenue", lines: ["IMAGING"], scale: "absolute", unit: "USD" },
  { aggregation: "weighted_ratio", code: "estimated_contribution_margin_pct", key: "margin", scale: "percentage_points", unit: "%" },
  { aggregation: "weighted_ratio", code: "gross_margin_pct", key: "margin", scale: "percentage_points", unit: "%" },
  { aggregation: "weighted_ratio", code: "operating_margin_pct", key: "margin", scale: "percentage_points", unit: "%" },
  { aggregation: "sum", code: "lab_total_orders", key: "volume", lines: ["LABORATORY"], scale: "absolute", unit: "ordenes" },
  { aggregation: "sum", code: "physio_therapy_sessions", key: "volume", lines: ["PHYSIOTHERAPY"], scale: "absolute", unit: "sesiones" },
  { aggregation: "sum", code: "physio_total_orders", key: "volume", lines: ["PHYSIOTHERAPY"], scale: "absolute", unit: "ordenes" },
  { aggregation: "sum", code: "imaging_rx_count", key: "volume", lines: ["IMAGING"], scale: "absolute", unit: "estudios" },
  { aggregation: "sum", code: "imaging_total_clients", key: "volume", lines: ["IMAGING"], scale: "absolute", unit: "clientes" },
  { aggregation: "weighted_ratio", code: "effective_occupancy", key: "occupancy", scale: "percentage_points", unit: "%" },
  { aggregation: "weighted_ratio", code: "scheduled_occupancy", key: "occupancy", scale: "percentage_points", unit: "%" },
  { aggregation: "average", code: "average_turnaround_time_hours", key: "sla", scale: "absolute", unit: "horas" },
  { aggregation: "average", code: "average_report_tat_hours", key: "sla", scale: "absolute", unit: "horas" },
  { aggregation: "average", code: "performance_score", key: "score", scale: "absolute", unit: "puntos" },
];

const contractByCode = new Map(contracts.map((contract) => [contract.code, contract]));

const preferenceByMetric: Readonly<Record<OfficialMetricKey, readonly string[]>> = {
  revenue: ["reported_revenue", "net_revenue", "lab_total_sales", "physio_sale_dd", "imaging_sale_dd"],
  margin: ["estimated_contribution_margin_pct", "gross_margin_pct", "operating_margin_pct"],
  volume: ["lab_total_orders", "physio_therapy_sessions", "physio_total_orders", "imaging_rx_count", "imaging_total_clients"],
  occupancy: ["effective_occupancy", "scheduled_occupancy"],
  sla: ["average_report_tat_hours", "average_turnaround_time_hours"],
  score: ["performance_score"],
};

/** Null and blank source values are missing data, never numeric zero. */
export function finiteMetricNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function contractApplies(contract: OfficialKpiContract, lineCode: string | null) {
  return !contract.lines || Boolean(lineCode && contract.lines.includes(lineCode));
}

function rowIsCalculable(row: ContractKpiRow) {
  return row.data_status?.toUpperCase() !== "NOT_CALCULABLE"
    && finiteMetricNumber(row.value) !== null;
}

export function contractForKpiCode(code: string) {
  return contractByCode.get(code) ?? null;
}

/**
 * Selects one KPI per semantic metric by code and documented precedence.
 * Duplicate rows for the chosen code are ambiguous and remain unavailable.
 */
export function selectContractMetrics(
  rows: readonly ContractKpiRow[],
  lineCode: string | null,
) {
  const selected: Partial<Record<OfficialMetricKey, ContractMetric>> = {};
  const ambiguousCodes: string[] = [];

  for (const key of Object.keys(preferenceByMetric) as OfficialMetricKey[]) {
    for (const code of preferenceByMetric[key]) {
      const contract = contractByCode.get(code);
      if (!contract || !contractApplies(contract, lineCode)) continue;
      const candidates = rows.filter((row) => row.kpi_code === code && rowIsCalculable(row));
      if (candidates.length > 1) {
        ambiguousCodes.push(code);
        break;
      }
      const row = candidates[0];
      if (!row) continue;
      const value = finiteMetricNumber(row.value);
      if (value === null) continue;
      selected[key] = {
        aggregation: contract.aggregation,
        code,
        coverage: "complete",
        denominator: finiteMetricNumber(row.denominator),
        formulaVersion: row.formula_version,
        key,
        label: row.kpi_name || code,
        numerator: finiteMetricNumber(row.numerator),
        scale: contract.scale,
        sourceVersionIds: [row.closing_version_id],
        unit: row.unit || contract.unit,
        value,
      };
      break;
    }
  }

  // Closings published before reported_revenue was persisted still retain the
  // exact revenue base in the approved contribution-margin formula. This is a
  // contract-backed derivation, not a name match or a guessed replacement.
  if (!selected.revenue) {
    const revenueBases = rows.filter((row) =>
      row.kpi_code === "estimated_contribution_margin_pct"
      && row.formula_version === "(reported_revenue-direct_costs)/reported_revenue:v1"
      && rowIsCalculable(row)
      && finiteMetricNumber(row.denominator) !== null
    );
    if (revenueBases.length === 1) {
      const source = revenueBases[0];
      selected.revenue = {
        aggregation: "sum",
        code: "reported_revenue_from_margin_base",
        coverage: "complete",
        denominator: null,
        formulaVersion: source.formula_version,
        key: "revenue",
        label: "Facturación neta reportada",
        numerator: finiteMetricNumber(source.denominator),
        scale: "absolute",
        sourceVersionIds: [source.closing_version_id],
        unit: "USD",
        value: finiteMetricNumber(source.denominator)!,
      };
    } else if (revenueBases.length > 1) {
      ambiguousCodes.push("reported_revenue_from_margin_base");
    }
  }

  return { ambiguousCodes, metrics: selected };
}

function compatibleUnit(metrics: readonly ContractMetric[]) {
  const units = new Set(metrics.map((metric) => metric.unit.trim().toLowerCase()));
  return units.size === 1;
}

export function aggregateContractMetric(
  metrics: readonly (ContractMetric | undefined)[],
  expectedContributors: number,
): ContractMetric | null {
  const present = metrics.filter((metric): metric is ContractMetric => Boolean(metric));
  if (present.length === 0) return null;
  const template = present[0];
  if (!compatibleUnit(present) || present.some((metric) =>
    metric.key !== template.key
    || metric.aggregation !== template.aggregation
    || metric.scale !== template.scale
  )) return null;

  const coverage = present.length === expectedContributors ? "complete" : "partial";
  const sourceVersionIds = Array.from(new Set(present.flatMap((metric) => metric.sourceVersionIds)));
  if (template.aggregation === "weighted_ratio") {
    if (coverage !== "complete" || present.some((metric) =>
      metric.numerator === null || metric.denominator === null || metric.denominator <= 0
    )) return null;
    const numerator = present.reduce((total, metric) => total + (metric.numerator ?? 0), 0);
    const denominator = present.reduce((total, metric) => total + (metric.denominator ?? 0), 0);
    if (denominator <= 0) return null;
    return {
      ...template,
      code: template.code,
      coverage,
      denominator,
      numerator,
      sourceVersionIds,
      value: template.scale === "fraction" ? numerator / denominator : (numerator / denominator) * 100,
    };
  }

  const value = template.aggregation === "sum"
    ? present.reduce((total, metric) => total + metric.value, 0)
    : present.reduce((total, metric) => total + metric.value, 0) / present.length;
  return { ...template, coverage, sourceVersionIds, value };
}

export function aggregateContractMetrics(
  selections: readonly Partial<Record<OfficialMetricKey, ContractMetric>>[],
) {
  const output: Partial<Record<OfficialMetricKey, ContractMetric>> = {};
  for (const key of Object.keys(preferenceByMetric) as OfficialMetricKey[]) {
    const aggregate = aggregateContractMetric(
      selections.map((selection) => selection[key]),
      selections.length,
    );
    if (aggregate) output[key] = aggregate;
  }
  return output;
}

export function isRevenueTargetCode(code: string) {
  return ["reported_revenue", "net_revenue", "lab_total_sales", "physio_sale_dd", "imaging_sale_dd"].includes(code);
}

function officialPeriod(row: OfficialVersionIdentity) {
  return row.period_end ?? row.period_start ?? row.published_at ?? "";
}

export function compareOfficialVersions(
  left: OfficialVersionIdentity,
  right: OfficialVersionIdentity,
) {
  return (
    officialPeriod(left).localeCompare(officialPeriod(right)) ||
    left.version_number - right.version_number ||
    (left.published_at ?? "").localeCompare(right.published_at ?? "") ||
    left.id.localeCompare(right.id)
  );
}

export function selectOfficialVersions<T extends OfficialVersionIdentity>(
  rows: readonly T[],
) {
  const byGrain = new Map<string, T>();
  for (const row of [...rows].sort(compareOfficialVersions)) {
    const grain = [
      row.branch_id,
      row.business_line_id ?? "unassigned",
      row.period_start ?? "",
      row.period_end ?? "",
    ].join(":");
    byGrain.set(grain, row);
  }
  return Array.from(byGrain.values()).sort(compareOfficialVersions);
}
