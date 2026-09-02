"use client";

import { type PointerEvent, useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TrendTone = "positive" | "warning" | "negative" | "neutral";

export type TrendSeries = {
  label: string;
  value: string;
  color: "blue" | "orange" | "teal" | "green" | "rose" | "slate";
  points: number[];
  marker?: "circle" | "square" | "diamond";
};

export type TrendInsight = {
  label: string;
  value: string;
  note: string;
  tone: TrendTone;
};

export type TrendChartOption = {
  id: string;
  label: string;
  description: string;
  yLabel: string;
  series: TrendSeries[];
  insights: TrendInsight[];
};

type AnalyticsComparisonChartProps = {
  title: string;
  description: string;
  xLabels: string[];
  yLabel: string;
  series: TrendSeries[];
  insights: TrendInsight[];
  enableSeriesSelection?: boolean;
  maxSelectableSeries?: number;
  metricOptions?: TrendChartOption[];
  seriesSelectionHint?: string;
  seriesSelectorLabel?: string;
};

const seriesColors: Record<TrendSeries["color"], string> = {
  blue: "#2878ff",
  green: "#16a34a",
  orange: "#d97706",
  rose: "#dc2626",
  slate: "#64748b",
  teal: "#0891b2",
};

const markerClasses: Record<TrendSeries["color"], string> = {
  blue: "bg-blue-600",
  green: "bg-emerald-600",
  orange: "bg-orange-500",
  rose: "bg-rose-600",
  slate: "bg-slate-600",
  teal: "bg-cyan-600",
};

function isBenchmarkSeries(label: string) {
  return /meta|presupuesto|presupuestado|proyeccion|proyectad/i.test(label);
}

function insightClass(tone: TrendTone) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tone === "negative") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-border bg-muted text-muted-foreground";
}

function shiftYear(dateValue: string, delta: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

  if (!match) {
    return dateValue;
  }

  return `${Number(match[1]) + delta}-${match[2]}-${match[3]}`;
}

function getPreviousPeriodRange(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return { from, to };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / dayMs) + 1);
  const previousTo = new Date(fromDate.getTime() - dayMs);
  const previousFrom = new Date(previousTo.getTime() - (days - 1) * dayMs);

  return {
    from: previousFrom.toISOString().slice(0, 10),
    to: previousTo.toISOString().slice(0, 10),
  };
}

function buildPolyline(points: number[], maxValue: number, width: number, height: number) {
  if (points.length === 0) {
    return "";
  }

  const xStep = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = index * xStep;
      const y = height - (point / maxValue) * height;
      return `${x.toFixed(2)},${Math.max(0, Math.min(height, y)).toFixed(2)}`;
    })
    .join(" ");
}

function getLastPoint(points: number[], maxValue: number, width: number, height: number) {
  if (points.length === 0) {
    return { x: 0, y: height };
  }

  const xStep = points.length > 1 ? width / (points.length - 1) : width;
  const point = points[points.length - 1] ?? 0;

  return {
    x: (points.length - 1) * xStep,
    y: Math.max(0, Math.min(height, height - (point / maxValue) * height)),
  };
}

function formatAxisValue(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absoluteValue >= 10_000) {
    return `${Math.round(value / 1_000)}K`;
  }

  if (absoluteValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return Math.round(value).toLocaleString("en-US");
}

export function AnalyticsComparisonChart({
  title,
  description,
  enableSeriesSelection = false,
  maxSelectableSeries = 5,
  metricOptions = [],
  seriesSelectionHint = "Selecciona las lineas que quieres comparar.",
  seriesSelectorLabel = "Lineas a comparar",
  xLabels,
  yLabel,
  series,
  insights,
}: AnalyticsComparisonChartProps) {
  const [selectedMetricId, setSelectedMetricId] = useState(
    metricOptions[0]?.id ?? "__default__",
  );
  const [primaryFrom, setPrimaryFrom] = useState("2026-07-01");
  const [primaryTo, setPrimaryTo] = useState("2026-07-31");
  const [comparisonMode, setComparisonMode] = useState("same-period-last-year");
  const [comparisonFrom, setComparisonFrom] = useState("2025-07-01");
  const [comparisonTo, setComparisonTo] = useState("2025-07-31");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 760;
  const height = 220;
  const selectedMetric = useMemo(
    () =>
      metricOptions.find((option) => option.id === selectedMetricId) ??
      metricOptions[0] ??
      null,
    [metricOptions, selectedMetricId],
  );
  const activeYLabel = selectedMetric?.yLabel ?? yLabel;
  const activeSeries = selectedMetric?.series ?? series;
  const activeInsights = selectedMetric?.insights ?? insights;
  const activeDescription = selectedMetric?.description ?? description;
  const selectableSeries = useMemo(
    () =>
      activeSeries.filter(
        (item) => !isBenchmarkSeries(item.label),
      ),
    [activeSeries],
  );
  const [selectedSeriesLabels, setSelectedSeriesLabels] = useState<string[]>([]);
  const visibleSeries = useMemo(() => {
    if (enableSeriesSelection) {
      const selectedSeries = selectableSeries.filter((item) =>
        selectedSeriesLabels.includes(item.label),
      );
      const targetSeries =
        comparisonMode === "target"
          ? activeSeries.filter((item) => isBenchmarkSeries(item.label))
          : [];
      const fallbackSeries =
        selectedSeries.length > 0
          ? selectedSeries
          : selectableSeries.slice(0, maxSelectableSeries);

      return [...fallbackSeries, ...targetSeries];
    }

    const [primarySeries, ...comparisonSeries] = activeSeries;

    if (!primarySeries) {
      return [];
    }

    const targetSeries = comparisonSeries.filter((item) =>
      isBenchmarkSeries(item.label),
    );
    const historicalSeries =
      comparisonSeries.find((item) => /2025|anterior/i.test(item.label)) ??
      comparisonSeries[0];

    if (comparisonMode === "target") {
      return targetSeries.length > 0
        ? [primarySeries, ...targetSeries]
        : [primarySeries];
    }

    if (comparisonMode === "previous-period") {
      return historicalSeries
        ? [
            primarySeries,
            { ...historicalSeries, label: "Periodo anterior" },
          ]
        : [primarySeries];
    }

    if (comparisonMode === "custom") {
      return historicalSeries
        ? [
            primarySeries,
            { ...historicalSeries, label: "Rango personalizado" },
          ]
        : [primarySeries];
    }

    return historicalSeries ? [primarySeries, historicalSeries] : [primarySeries];
  }, [
    activeSeries,
    comparisonMode,
    enableSeriesSelection,
    maxSelectableSeries,
    selectableSeries,
    selectedSeriesLabels,
  ]);
  const allValues = visibleSeries.flatMap((item) => item.points);
  const maxValue = Math.max(...allValues, 1);
  const yTicks = [1, 0.66, 0.33, 0];
  const hoveredLabel = hoverIndex === null ? null : xLabels[hoverIndex];
  const hoveredX =
    hoverIndex === null
      ? 0
      : hoverIndex * (xLabels.length > 1 ? width / (xLabels.length - 1) : width);
  const tooltipX = Math.max(0, Math.min(width - 210, hoveredX + 14));

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (xLabels.length === 0) {
      return;
    }

    const viewBoxWidth = 842;
    const viewBoxMinX = -42;
    const bounds = event.currentTarget.getBoundingClientRect();
    const xInViewBox =
      ((event.clientX - bounds.left) / bounds.width) * viewBoxWidth + viewBoxMinX;
    const xStep = xLabels.length > 1 ? width / (xLabels.length - 1) : width;
    const nextIndex = Math.max(
      0,
      Math.min(xLabels.length - 1, Math.round(xInViewBox / xStep)),
    );

    setHoverIndex(nextIndex);
  }

  function toggleSeries(label: string) {
    setSelectedSeriesLabels((currentLabels) => {
      if (currentLabels.includes(label)) {
        return currentLabels.filter((currentLabel) => currentLabel !== label);
      }

      if (currentLabels.length >= maxSelectableSeries) {
        return currentLabels;
      }

      return [...currentLabels, label];
    });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const to = params.get("to");

    if (from) {
      setPrimaryFrom(from);
      setComparisonFrom(from.replace(/^2026/, "2025"));
    }

    if (to) {
      setPrimaryTo(to);
      setComparisonTo(to.replace(/^2026/, "2025"));
    }
  }, []);

  useEffect(() => {
    if (metricOptions.length === 0) {
      setSelectedMetricId("__default__");
      return;
    }

    if (!metricOptions.some((option) => option.id === selectedMetricId)) {
      setSelectedMetricId(metricOptions[0]?.id ?? "__default__");
    }
  }, [metricOptions, selectedMetricId]);

  useEffect(() => {
    if (!enableSeriesSelection) {
      setSelectedSeriesLabels([]);
      return;
    }

    setSelectedSeriesLabels((currentLabels) => {
      const validLabels = currentLabels.filter((label) =>
        selectableSeries.some((item) => item.label === label),
      );

      if (validLabels.length > 0) {
        return validLabels.slice(0, maxSelectableSeries);
      }

      return selectableSeries
        .slice(0, maxSelectableSeries)
        .map((item) => item.label);
    });
  }, [enableSeriesSelection, maxSelectableSeries, selectableSeries]);

  useEffect(() => {
    if (comparisonMode === "same-period-last-year") {
      setComparisonFrom(shiftYear(primaryFrom, -1));
      setComparisonTo(shiftYear(primaryTo, -1));
      return;
    }

    if (comparisonMode === "previous-period") {
      const previousPeriod = getPreviousPeriodRange(primaryFrom, primaryTo);
      setComparisonFrom(previousPeriod.from);
      setComparisonTo(previousPeriod.to);
    }
  }, [comparisonMode, primaryFrom, primaryTo]);

  return (
    <section className="executive-panel min-w-0 rounded-lg border p-4">
      <div className="mb-4 grid gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {activeDescription}
            </p>
          </div>
          <Badge variant="outline">{activeYLabel}</Badge>
        </div>

        <div className="grid gap-2 rounded-lg border bg-background/75 p-3 shadow-inner xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">
              KPI a comparar
            </span>
            <select
              className="h-9 rounded-lg border bg-card px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setSelectedMetricId(event.target.value)}
              value={selectedMetricId}
            >
              {metricOptions.length > 0 ? (
                metricOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))
              ) : (
                <option value="__default__">KPI principal</option>
              )}
            </select>
          </label>

          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">
              Fecha desde
            </span>
            <input
              className="h-9 rounded-lg border bg-card px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setPrimaryFrom(event.target.value)}
              type="date"
              value={primaryFrom}
            />
          </label>

          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">
              Fecha hasta
            </span>
            <input
              className="h-9 rounded-lg border bg-card px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setPrimaryTo(event.target.value)}
              type="date"
              value={primaryTo}
            />
          </label>

          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">
              Comparar contra
            </span>
            <select
              className="h-9 rounded-lg border bg-card px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setComparisonMode(event.target.value)}
              value={comparisonMode}
            >
              <option value="same-period-last-year">Mismo periodo 2025</option>
              <option value="previous-period">Periodo anterior</option>
              <option value="target">Meta / presupuesto</option>
              <option value="custom">Rango personalizado</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">
              Rango comparativo
            </span>
            <div className="grid grid-cols-2 gap-1">
              <input
                className="h-9 rounded-lg border bg-card px-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                disabled={comparisonMode !== "custom"}
                onChange={(event) => setComparisonFrom(event.target.value)}
                type="date"
                value={comparisonFrom}
              />
              <input
                className="h-9 rounded-lg border bg-card px-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                disabled={comparisonMode !== "custom"}
                onChange={(event) => setComparisonTo(event.target.value)}
                type="date"
                value={comparisonTo}
              />
            </div>
          </label>
        </div>

        {enableSeriesSelection ? (
          <div className="grid gap-3 rounded-lg border bg-background/75 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  {seriesSelectorLabel}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {seriesSelectionHint}
                </p>
              </div>
              <Badge variant="outline">
                {selectedSeriesLabels.length} de {maxSelectableSeries}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectableSeries.map((item) => {
                const isChecked = selectedSeriesLabels.includes(item.label);
                const isDisabled =
                  !isChecked &&
                  selectedSeriesLabels.length >= maxSelectableSeries;

                return (
                  <label
                    className={cn(
                      "flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-xs transition hover:bg-muted",
                      isChecked ? "border-primary ring-1 ring-primary" : "",
                      isDisabled ? "cursor-not-allowed opacity-50" : "",
                    )}
                    key={item.label}
                  >
                    <input
                      checked={isChecked}
                      className="size-3 accent-primary"
                      disabled={isDisabled}
                      onChange={() => toggleSeries(item.label)}
                      type="checkbox"
                    />
                    <span
                      className={cn("size-2.5 rounded-full", markerClasses[item.color])}
                    />
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <div className="flex h-8 items-center rounded-full border bg-primary px-3 text-xs font-semibold text-primary-foreground">
            Comparaciones activas
          </div>
          {visibleSeries.map((item) => (
            <div
              className={cn(
                "flex h-8 items-center gap-2 rounded-full border bg-background px-3 text-xs",
                isBenchmarkSeries(item.label) ? "border-dashed" : "",
              )}
              key={item.label}
            >
              <span
                className={cn("size-2.5 rounded-full", markerClasses[item.color])}
              />
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground">{item.value}</span>
            </div>
          ))}
          <div className="flex h-8 items-center rounded-full border border-dashed px-3 text-xs text-muted-foreground">
            {primaryFrom} a {primaryTo}
          </div>
          <div className="flex h-8 items-center rounded-full border border-dashed px-3 text-xs text-muted-foreground">
            {comparisonMode === "target"
              ? "Contra meta / presupuesto"
              : `Contra ${comparisonFrom} a ${comparisonTo}`}
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
          <div className="font-medium text-foreground sm:col-span-2">
            Como leer esta grafica
          </div>
          <div>
            <span className="font-medium text-foreground">Eje X: </span>
            fechas exactas del periodo seleccionado.
          </div>
          <div>
            <span className="font-medium text-foreground">Eje Y: </span>
            {activeYLabel}.
          </div>
          <div>
            <span className="font-medium text-foreground">Lineas de color: </span>
            cada color representa una comparacion activa, gerente o sucursal; las
            metas, presupuesto y proyeccion aparecen con trazo punteado.
          </div>
          <div>
            <span className="font-medium text-foreground">Pasa encima: </span>
            muestra la fecha exacta y el valor de cada linea.
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="max-w-full overflow-hidden">
          <svg
            aria-label={`${title}: ${selectedMetric?.label ?? "KPI principal"}`}
            className="h-72 w-full min-w-0 overflow-visible rounded-lg bg-white"
            onPointerLeave={() => setHoverIndex(null)}
            onPointerMove={handlePointerMove}
            role="img"
            viewBox="-42 -20 842 284"
          >
            {yTicks.map((tick) => {
              const y = (1 - tick) * height;
              return (
                <g key={tick}>
                  <line
                  stroke="#e5ebf2"
                    strokeDasharray={tick === 0 ? "0" : "4 4"}
                    x1={0}
                    x2={width}
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill="#64748b"
                    fontSize="11"
                    textAnchor="end"
                    x={-12}
                    y={y + 4}
                  >
                    {formatAxisValue(maxValue * tick)}
                  </text>
                </g>
              );
            })}

            {visibleSeries.map((item) => {
              const polyline = buildPolyline(item.points, maxValue, width, height);
              const lastPoint = getLastPoint(item.points, maxValue, width, height);
              const benchmarkSeries = isBenchmarkSeries(item.label);
              return (
                <g key={item.label}>
                  <polyline
                    fill="none"
                    points={polyline}
                    stroke={seriesColors[item.color]}
                    strokeDasharray={benchmarkSeries ? "8 6" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={benchmarkSeries ? "2.4" : "3.2"}
                  />
                  <circle
                    cx={lastPoint.x}
                    cy={lastPoint.y}
                    fill={seriesColors[item.color]}
                    r="5"
                  />
                  {hoverIndex !== null && item.points[hoverIndex] !== undefined ? (
                    <circle
                      cx={hoveredX}
                      cy={Math.max(
                        0,
                        Math.min(
                          height,
                          height - ((item.points[hoverIndex] ?? 0) / maxValue) * height,
                        ),
                      )}
                      fill="#ffffff"
                      r="5"
                      stroke={seriesColors[item.color]}
                      strokeWidth="3"
                    />
                  ) : null}
                </g>
              );
            })}

            {hoverIndex !== null && hoveredLabel ? (
              <g>
                <line
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  x1={hoveredX}
                  x2={hoveredX}
                  y1={0}
                  y2={height}
                />
                <rect
                  fill="#ffffff"
                  height={46 + visibleSeries.length * 18}
                  rx="8"
                  stroke="#cbd5e1"
                  width="210"
                  x={tooltipX}
                  y="6"
                />
                <text fill="#0f172a" fontSize="12" fontWeight="600" x={tooltipX + 10} y="24">
                  Fecha exacta: {hoveredLabel}
                </text>
                {visibleSeries.map((item, index) => (
                  <g key={`${item.label}-tooltip-${hoveredLabel}`}>
                    <circle
                      cx={tooltipX + 14}
                      cy={44 + index * 18}
                      fill={seriesColors[item.color]}
                      r="4"
                    />
                    <text fill="#334155" fontSize="11" x={tooltipX + 24} y={48 + index * 18}>
                      {item.label}:{" "}
                      {Number(item.points[hoverIndex] ?? 0).toLocaleString("en-US")}
                    </text>
                  </g>
                ))}
              </g>
            ) : null}

            {xLabels.map((label, index) => {
              const xStep = xLabels.length > 1 ? width / (xLabels.length - 1) : width;
              return (
                <text
                  fill="#64748b"
                  fontSize="11"
                  key={label}
                  textAnchor="middle"
                  x={index * xStep}
                  y={height + 28}
                >
                  {label}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="grid gap-3">
          {activeInsights.map((insight) => {
            const TrendIcon =
              insight.tone === "negative" || insight.tone === "warning"
                ? TrendingDown
                : TrendingUp;

            return (
              <article
                className={cn("rounded-lg border p-3", insightClass(insight.tone))}
                key={insight.label}
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                  <TrendIcon className="size-4" />
                  {insight.label}
                </div>
                <div className="text-xl font-semibold tracking-normal">
                  {insight.value}
                </div>
                <p className="mt-1 text-xs leading-5 opacity-90">{insight.note}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
