import type { MetricScale } from "./official-kpi-contracts.ts";

export function formatPercentage(
  value: number | null,
  scale: Extract<MetricScale, "fraction" | "percentage_points" | "percentage_point_difference"> = "percentage_points",
  locale = "es-SV",
) {
  if (value === null || !Number.isFinite(value)) return "Sin dato";
  const displayValue = scale === "fraction" ? value * 100 : value;
  const suffix = scale === "percentage_point_difference" ? " pp" : "%";
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(displayValue)}${suffix}`;
}

export function formatMetricValue(metric: {
  scale?: MetricScale;
  unit: string;
  value: number;
} | null | undefined, locale = "es-SV") {
  if (!metric || !Number.isFinite(metric.value)) return "Sin dato";
  if (metric.scale === "fraction" || metric.scale === "percentage_points" || metric.scale === "percentage_point_difference") {
    return formatPercentage(metric.value, metric.scale, locale);
  }
  if (["currency", "usd"].includes(metric.unit.trim().toLowerCase())) {
    return new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(metric.value);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(metric.value);
}
