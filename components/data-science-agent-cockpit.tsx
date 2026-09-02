"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  DatabaseZap,
  FileSpreadsheet,
  GitCompare,
  LineChart,
  Radar,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  dataScienceMonthLabels,
  getDataScienceCockpit,
  getPrimaryDataScienceRiskTone,
  type DataScienceChartKind,
  type DataScienceCockpit,
  type DataScienceKpi,
  type DataScienceRiskTone,
  type DataScienceUnit,
} from "@/lib/analytics/data-science-agent";
import {
  businessLineThemes,
  resolveBusinessLineThemeSlug,
} from "@/lib/tenant/business-line-theme";
import { useActiveBusinessLine } from "@/hooks/use-active-business-line";
import { cn } from "@/lib/utils";

function formatMetricValue(value: number, unit: DataScienceUnit) {
  if (unit === "currency") {
    return new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: value >= 1000 ? 0 : 1,
      style: "currency",
    }).format(value);
  }

  if (unit === "percent") {
    return `${Math.round(value * 10) / 10}%`;
  }

  if (unit === "score") {
    return `${Math.round(value)}/100`;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactMetric(value: number, unit: DataScienceUnit) {
  if (unit === "currency") {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }

    if (Math.abs(value) >= 1_000) {
      return `$${Math.round(value / 1_000)}K`;
    }

    return `$${Math.round(value)}`;
  }

  if (unit === "percent") {
    return `${Math.round(value)}%`;
  }

  if (unit === "score") {
    return `${Math.round(value)}`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return `${Math.round(value)}`;
}

function getDeltaLabel(kpi: DataScienceKpi) {
  const delta =
    kpi.lastYearValue === 0
      ? 0
      : ((kpi.currentValue - kpi.lastYearValue) / Math.abs(kpi.lastYearValue)) *
        100;
  const sign = delta >= 0 ? "+" : "";

  if (kpi.unit === "percent" || kpi.unit === "score") {
    return `${sign}${Math.round((kpi.currentValue - kpi.lastYearValue) * 10) / 10} pts vs 2025`;
  }

  return `${sign}${Math.round(delta * 10) / 10}% vs 2025`;
}

function riskToneClass(tone: DataScienceRiskTone) {
  if (tone === "critical") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  if (tone === "watch") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (tone === "healthy") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-800";
}

function chartKindLabel(kind: DataScienceChartKind) {
  if (kind === "bar-comparison") {
    return "Barras meta";
  }

  if (kind === "donut-mix") {
    return "Dona mix";
  }

  if (kind === "risk-scatter") {
    return "Matriz riesgo";
  }

  if (kind === "waterfall-cost") {
    return "Cascada costo";
  }

  return "Linea anual";
}

function getChartIcon(kind: DataScienceChartKind) {
  if (kind === "risk-scatter") {
    return Radar;
  }

  if (kind === "bar-comparison" || kind === "waterfall-cost") {
    return BarChart3;
  }

  if (kind === "donut-mix") {
    return Activity;
  }

  return LineChart;
}

function getChartScale(values: number[]) {
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(maxValue - minValue, 1);

  return {
    max: maxValue + range * 0.12,
    min: Math.min(0, minValue - range * 0.08),
  };
}

function makePath(
  values: number[],
  width: number,
  height: number,
  padding: number,
  min: number,
  max: number,
) {
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const range = Math.max(max - min, 1);
  const xStep = values.length > 1 ? usableWidth / (values.length - 1) : 0;

  return values.map((value, index) => {
    const x = padding + xStep * index;
    const y = padding + usableHeight - ((value - min) / range) * usableHeight;

    return {
      label: dataScienceMonthLabels[index] ?? `${index + 1}`,
      value,
      x,
      y,
    };
  });
}

function SvgGrid({
  height,
  padding,
  width,
}: {
  height: number;
  padding: number;
  width: number;
}) {
  const rows = [0.2, 0.5, 0.8];

  return (
    <>
      {rows.map((row) => (
        <line
          className="stroke-slate-200"
          key={row}
          strokeDasharray="8 8"
          x1={padding}
          x2={width - padding}
          y1={padding + (height - padding * 2) * row}
          y2={padding + (height - padding * 2) * row}
        />
      ))}
    </>
  );
}

function MiniSparkline({
  color,
  kpi,
}: {
  color: string;
  kpi: DataScienceKpi;
}) {
  const width = 160;
  const height = 56;
  const padding = 6;
  const scale = getChartScale(kpi.monthlyCurrent);
  const points = makePath(
    kpi.monthlyCurrent,
    width,
    height,
    padding,
    scale.min,
    scale.max,
  );
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg
      aria-label={`Tendencia ${kpi.label}`}
      className="h-14 w-full"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        points={path}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      {points.slice(-1).map((point) => (
        <circle fill={color} key={point.label} r="4" cx={point.x} cy={point.y}>
          <title>{`${point.label}: ${formatMetricValue(point.value, kpi.unit)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function LineYearChart({
  accent,
  kpi,
}: {
  accent: string;
  kpi: DataScienceKpi;
}) {
  const width = 860;
  const height = 320;
  const padding = 48;
  const targetValues =
    kpi.targetValue === null
      ? []
      : Array.from({ length: kpi.monthlyCurrent.length }, () => kpi.targetValue ?? 0);
  const scale = getChartScale([
    ...kpi.monthlyCurrent,
    ...kpi.monthlyLastYear,
    ...targetValues,
  ]);
  const currentPoints = makePath(
    kpi.monthlyCurrent,
    width,
    height,
    padding,
    scale.min,
    scale.max,
  );
  const lastYearPoints = makePath(
    kpi.monthlyLastYear,
    width,
    height,
    padding,
    scale.min,
    scale.max,
  );
  const targetPoints = makePath(
    targetValues,
    width,
    height,
    padding,
    scale.min,
    scale.max,
  );

  return (
    <svg
      aria-label={`Comparacion anual de ${kpi.label}`}
      className="h-[320px] w-full"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <SvgGrid height={height} padding={padding} width={width} />
      {targetPoints.length > 0 ? (
        <polyline
          fill="none"
          points={targetPoints.map((point) => `${point.x},${point.y}`).join(" ")}
          stroke="#cbd5e1"
          strokeDasharray="10 8"
          strokeLinecap="round"
          strokeWidth="4"
        >
          <title>{`Meta: ${formatMetricValue(kpi.targetValue ?? 0, kpi.unit)}`}</title>
        </polyline>
      ) : null}
      <polyline
        fill="none"
        points={lastYearPoints.map((point) => `${point.x},${point.y}`).join(" ")}
        stroke="#94a3b8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <polyline
        fill="none"
        points={currentPoints.map((point) => `${point.x},${point.y}`).join(" ")}
        stroke={accent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      {currentPoints.map((point, index) => (
        <circle fill={accent} key={point.label} r="5" cx={point.x} cy={point.y}>
          <title>{`${point.label} 2026: ${formatMetricValue(point.value, kpi.unit)} / 2025: ${formatMetricValue(kpi.monthlyLastYear[index] ?? 0, kpi.unit)}`}</title>
        </circle>
      ))}
      {currentPoints.map((point, index) =>
        index % 2 === 0 || index === currentPoints.length - 1 ? (
          <text
            className="fill-slate-500 text-[18px]"
            key={`label-${point.label}`}
            textAnchor="middle"
            x={point.x}
            y={height - 12}
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function BarComparisonChart({
  accent,
  kpi,
}: {
  accent: string;
  kpi: DataScienceKpi;
}) {
  const width = 760;
  const height = 300;
  const padding = 42;
  const bars = [
    { color: accent, label: "Actual", value: kpi.currentValue },
    { color: "#94a3b8", label: "2025", value: kpi.lastYearValue },
    ...(kpi.targetValue === null
      ? []
      : [{ color: "#f59e0b", label: "Meta", value: kpi.targetValue }]),
  ];
  const scale = getChartScale(bars.map((bar) => bar.value));
  const usableHeight = height - padding * 2;
  const barWidth = 92;
  const gap = 72;

  return (
    <svg
      aria-label={`Barras comparativas de ${kpi.label}`}
      className="h-[300px] w-full"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <SvgGrid height={height} padding={padding} width={width} />
      {bars.map((bar, index) => {
        const barHeight =
          ((bar.value - scale.min) / Math.max(scale.max - scale.min, 1)) * usableHeight;
        const x = padding + 110 + index * (barWidth + gap);
        const y = height - padding - barHeight;

        return (
          <g key={bar.label}>
            <rect
              fill={bar.color}
              height={Math.max(8, barHeight)}
              rx="10"
              width={barWidth}
              x={x}
              y={y}
            >
              <title>{`${bar.label}: ${formatMetricValue(bar.value, kpi.unit)}`}</title>
            </rect>
            <text
              className="fill-slate-700 text-[20px] font-semibold"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={y - 14}
            >
              {formatCompactMetric(bar.value, kpi.unit)}
            </text>
            <text
              className="fill-slate-500 text-[18px]"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={height - 12}
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutMixChart({
  kpi,
}: {
  kpi: DataScienceKpi;
}) {
  const size = 300;
  const center = size / 2;
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const total = kpi.mix.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <svg
        aria-label={`Mix de demanda ${kpi.label}`}
        className="mx-auto h-[300px] w-[300px]"
        role="img"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="stroke-slate-100"
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          strokeWidth="28"
        />
        {kpi.mix.map((segment) => {
          const dash = total > 0 ? (segment.value / total) * circumference : 0;
          const strokeDashoffset = -offset;

          offset += dash;

          return (
            <circle
              cx={center}
              cy={center}
              fill="none"
              key={segment.label}
              r={radius}
              stroke={segment.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeWidth="28"
              transform={`rotate(-90 ${center} ${center})`}
            >
              <title>{`${segment.label}: ${formatMetricValue(segment.value, kpi.unit)}`}</title>
            </circle>
          );
        })}
        <text
          className="fill-slate-900 text-[26px] font-bold"
          textAnchor="middle"
          x={center}
          y={center - 4}
        >
          {formatCompactMetric(total, kpi.unit)}
        </text>
        <text
          className="fill-slate-500 text-[15px]"
          textAnchor="middle"
          x={center}
          y={center + 24}
        >
          DEMO mix
        </text>
      </svg>
      <div className="grid content-center gap-3">
        {kpi.mix.map((segment) => (
          <div
            className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
            key={segment.label}
          >
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="font-medium">{segment.label}</span>
            <span className="text-muted-foreground">
              {formatMetricValue(segment.value, kpi.unit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WaterfallCostChart({
  accent,
  cockpit,
}: {
  accent: string;
  cockpit: DataScienceCockpit;
}) {
  const revenue =
    cockpit.comparisons.find((comparison) => comparison.id === "revenue-vs-cost")
      ?.leftValue ?? 0;
  const cost =
    cockpit.comparisons.find((comparison) => comparison.id === "revenue-vs-cost")
      ?.rightValue ?? 0;
  const expenses = revenue * 0.18;
  const contribution = revenue - cost - expenses;
  const bars = [
    { color: accent, label: "Venta", tone: "positive", value: revenue },
    { color: "#ef4444", label: "Costo venta", tone: "negative", value: -cost },
    { color: "#f59e0b", label: "Gastos", tone: "negative", value: -expenses },
    {
      color: contribution >= 0 ? "#0f766e" : "#b91c1c",
      label: "Contribucion",
      tone: contribution >= 0 ? "positive" : "negative",
      value: contribution,
    },
  ] as const;
  const width = 820;
  const height = 300;
  const padding = 42;
  const maxAbs = Math.max(...bars.map((bar) => Math.abs(bar.value)), 1);
  const baseY = height / 2;
  const barWidth = 92;
  const gap = 84;

  return (
    <svg
      aria-label="Cascada financiera de venta, costo y contribucion"
      className="h-[300px] w-full"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <line
        className="stroke-slate-200"
        strokeDasharray="8 8"
        x1={padding}
        x2={width - padding}
        y1={baseY}
        y2={baseY}
      />
      {bars.map((bar, index) => {
        const barHeight = Math.max(12, (Math.abs(bar.value) / maxAbs) * 108);
        const x = padding + 78 + index * (barWidth + gap);
        const y = bar.value >= 0 ? baseY - barHeight : baseY;

        return (
          <g key={bar.label}>
            <rect
              fill={bar.color}
              height={barHeight}
              rx="10"
              width={barWidth}
              x={x}
              y={y}
            >
              <title>{`${bar.label}: ${formatMetricValue(bar.value, "currency")}`}</title>
            </rect>
            <text
              className="fill-slate-700 text-[19px] font-semibold"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={bar.value >= 0 ? y - 12 : y + barHeight + 24}
            >
              {formatCompactMetric(bar.value, "currency")}
            </text>
            <text
              className="fill-slate-500 text-[17px]"
              textAnchor="middle"
              x={x + barWidth / 2}
              y={height - 14}
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RiskScatterChart({ kpi }: { kpi: DataScienceKpi }) {
  const width = 760;
  const height = 300;
  const padding = 44;

  return (
    <svg
      aria-label="Matriz de calidad y riesgo por sucursal"
      className="h-[300px] w-full"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect
        className="fill-emerald-50"
        height={(height - padding * 2) / 2}
        width={(width - padding * 2) / 2}
        x={width / 2}
        y={padding}
      />
      <rect
        className="fill-red-50"
        height={(height - padding * 2) / 2}
        width={(width - padding * 2) / 2}
        x={padding}
        y={height / 2}
      />
      <line
        className="stroke-slate-300"
        x1={padding}
        x2={width - padding}
        y1={height / 2}
        y2={height / 2}
      />
      <line
        className="stroke-slate-300"
        x1={width / 2}
        x2={width / 2}
        y1={padding}
        y2={height - padding}
      />
      <text className="fill-slate-500 text-[16px]" x={padding} y={padding - 12}>
        Margen alto / riesgo bajo
      </text>
      <text
        className="fill-red-700 text-[16px] font-semibold"
        x={padding}
        y={height - 14}
      >
        Intervencion prioritaria
      </text>
      {kpi.scatter.map((point) => {
        const x = padding + (point.risk / 100) * (width - padding * 2);
        const y =
          height - padding - (point.margin / 60) * (height - padding * 2);

        return (
          <g key={`${point.branch}-${point.label}`}>
            <circle
              className="fill-primary stroke-white"
              cx={x}
              cy={y}
              r={Math.max(16, Math.min(point.size / 2.4, 32))}
              strokeWidth="5"
            >
              <title>{`${point.branch}: margen ${point.margin}%, riesgo ${point.risk}/100, venta ${formatMetricValue(point.value, "currency")}`}</title>
            </circle>
            <text
              className="fill-white text-[14px] font-bold"
              textAnchor="middle"
              x={x}
              y={y + 5}
            >
              {point.label}
            </text>
          </g>
        );
      })}
      <text
        className="fill-slate-600 text-[16px] font-semibold"
        textAnchor="middle"
        x={width / 2}
        y={height - 8}
      >
        Riesgo de datos
      </text>
      <text
        className="fill-slate-600 text-[16px] font-semibold"
        textAnchor="middle"
        transform={`rotate(-90 ${16} ${height / 2})`}
        x={16}
        y={height / 2}
      >
        Margen
      </text>
    </svg>
  );
}

function SmartChart({
  accent,
  cockpit,
  kpi,
}: {
  accent: string;
  cockpit: DataScienceCockpit;
  kpi: DataScienceKpi;
}) {
  if (kpi.chartKind === "bar-comparison") {
    return <BarComparisonChart accent={accent} kpi={kpi} />;
  }

  if (kpi.chartKind === "donut-mix") {
    return <DonutMixChart kpi={kpi} />;
  }

  if (kpi.chartKind === "risk-scatter") {
    return <RiskScatterChart kpi={kpi} />;
  }

  if (kpi.chartKind === "waterfall-cost") {
    return <WaterfallCostChart accent={accent} cockpit={cockpit} />;
  }

  return <LineYearChart accent={accent} kpi={kpi} />;
}

export function DataScienceAgentCockpit() {
  const activeBusinessLine = useActiveBusinessLine();
  const cockpit = useMemo(
    () => getDataScienceCockpit(activeBusinessLine.line),
    [activeBusinessLine.line],
  );
  const themeSlug = resolveBusinessLineThemeSlug({
    businessLineName: cockpit.businessLine,
  });
  const theme = businessLineThemes[themeSlug];
  const [selectedKpiId, setSelectedKpiId] = useState(
    cockpit.kpis[0]?.id ?? "total_revenue",
  );
  const selectedKpi =
    cockpit.kpis.find((kpi) => kpi.id === selectedKpiId) ??
    cockpit.kpis[0];
  const primaryRiskTone = getPrimaryDataScienceRiskTone(cockpit);
  const ChartIcon = getChartIcon(selectedKpi.chartKind);

  return (
    <div className="grid gap-5">
      <section
        className="overflow-hidden rounded-md border bg-card shadow-sm"
        style={{ borderColor: `${theme.primaryHex}33` }}
      >
        <div className="grid gap-5 border-b bg-slate-50 p-5 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                DEMO predictivo
              </Badge>
              <Badge variant="outline">Exploratorio + Descriptivo + Predictivo</Badge>
              <Badge variant="outline">Linea activa: {cockpit.businessLine}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 items-center justify-center rounded-md border bg-white"
                style={{ color: theme.primaryHex }}
              >
                <BrainCircuit className="size-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  {cockpit.headline}
                </h2>
                <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                  {cockpit.subtitle}
                </p>
              </div>
            </div>
          </div>
          <aside className={cn("rounded-md border p-4 text-sm", riskToneClass(primaryRiskTone))}>
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <ShieldAlert className="size-4" />
              Regla de lectura AnaliA
            </div>
            <p className="leading-6">{cockpit.qualityGate}</p>
            <div className="mt-3 text-xs">
              Periodo actual {cockpit.currentPeriod} vs {cockpit.lastYearPeriod}.
            </div>
          </aside>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {cockpit.kpis.slice(0, 4).map((kpi) => {
            const isSelected = kpi.id === selectedKpi.id;

            return (
              <button
                className={cn(
                  "rounded-md border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected ? "ring-2 ring-primary" : "",
                )}
                key={kpi.id}
                onClick={() => setSelectedKpiId(kpi.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                      {kpi.domain}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{kpi.label}</div>
                  </div>
                  <Badge variant="outline">{chartKindLabel(kpi.chartKind)}</Badge>
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-normal">
                  {formatMetricValue(kpi.currentValue, kpi.unit)}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {kpi.currentValue >= kpi.lastYearValue ? (
                    <TrendingUp className="size-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="size-3 text-red-600" />
                  )}
                  {getDeltaLabel(kpi)}
                </div>
                <MiniSparkline color={theme.primaryHex} kpi={kpi} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="rounded-md border bg-card p-5">
          <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_280px] xl:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <ChartIcon className="size-5 text-primary" />
                <h3 className="text-xl font-semibold tracking-normal">
                  {selectedKpi.label}
                </h3>
                <Badge variant="outline">{chartKindLabel(selectedKpi.chartKind)}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {selectedKpi.chartReason}
              </p>
            </div>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              KPI a comparar
              <select
                className="h-11 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setSelectedKpiId(event.target.value)}
                value={selectedKpi.id}
              >
                {cockpit.kpis.map((kpi) => (
                  <option key={kpi.id} value={kpi.id}>
                    {kpi.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <SmartChart accent={theme.primaryHex} cockpit={cockpit} kpi={selectedKpi} />

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-xs text-muted-foreground">Actual</div>
              <div className="mt-1 text-lg font-semibold">
                {formatMetricValue(selectedKpi.currentValue, selectedKpi.unit)}
              </div>
            </div>
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-xs text-muted-foreground">Mismo periodo 2025</div>
              <div className="mt-1 text-lg font-semibold">
                {formatMetricValue(selectedKpi.lastYearValue, selectedKpi.unit)}
              </div>
            </div>
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-xs text-muted-foreground">Meta o umbral</div>
              <div className="mt-1 text-lg font-semibold">
                {selectedKpi.targetValue === null
                  ? "No aplica"
                  : formatMetricValue(selectedKpi.targetValue, selectedKpi.unit)}
              </div>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-primary" />
              Lectura del KPI
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {selectedKpi.insight}
            </p>
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              {selectedKpi.warning}
            </div>
          </div>

          <div className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Target className="size-4 text-primary" />
              Predicciones cautelosas
            </div>
            <div className="grid gap-3">
              {cockpit.predictions.map((prediction) => (
                <div className="rounded-md border bg-background p-3" key={prediction.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold">{prediction.title}</div>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      {prediction.confidence}
                    </Badge>
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {prediction.id === "forecast-next-month"
                      ? formatMetricValue(Number(prediction.value), "currency")
                      : prediction.value}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {prediction.driver}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-foreground">
                    {prediction.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <GitCompare className="size-4 text-primary" />
            Comparacion entre KPIs
          </div>
          <div className="grid gap-3">
            {cockpit.comparisons.map((comparison) => (
              <div
                className={cn("rounded-md border p-3", riskToneClass(comparison.tone))}
                key={comparison.id}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{comparison.leftLabel}</span>
                  <span className="font-semibold">{comparison.ratio}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/70">
                  <div
                    className="h-2 rounded-full bg-current"
                    style={{ width: `${Math.max(8, Math.min(comparison.ratio, 100))}%` }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <span>
                    {comparison.leftLabel}:{" "}
                    {formatMetricValue(comparison.leftValue, comparison.unit)}
                  </span>
                  <span>
                    {comparison.rightLabel}:{" "}
                    {formatMetricValue(comparison.rightValue, comparison.unit)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 opacity-80">{comparison.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <DatabaseZap className="size-4 text-primary" />
            Motor de graficas
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {cockpit.chartRecommendationSummary}
          </p>
          <div className="mt-4 grid gap-2">
            {cockpit.kpis.map((kpi) => (
              <button
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted",
                  selectedKpi.id === kpi.id ? "border-primary bg-primary/5" : "",
                )}
                key={kpi.id}
                onClick={() => setSelectedKpiId(kpi.id)}
                type="button"
              >
                <span>{kpi.label}</span>
                <Badge variant="outline">{chartKindLabel(kpi.chartKind)}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <FileSpreadsheet className="size-4 text-primary" />
            Datos que alimentan el cockpit
          </div>
          <div className="grid gap-3">
            {cockpit.sourceReadiness.map((source) => (
              <div className="rounded-md border bg-background p-3" key={source.label}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{source.label}</div>
                  <Badge
                    className={
                      source.status === "Pendiente"
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    }
                  >
                    {source.status}
                  </Badge>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.max(6, Math.min(source.readiness, 100))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {source.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
