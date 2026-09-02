"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Filter,
  GitBranch,
  MapPin,
  Target,
} from "lucide-react";

import { AnalyticsComparisonChart } from "@/components/analytics-comparison-chart";
import { Badge } from "@/components/ui/badge";
import {
  resolveBusinessLineSlug,
  type BusinessLineSlug,
} from "@/lib/analytics/business-line-operations";
import {
  getPatientFlowDemandScreen,
  type PatientFlowBlock,
  type PatientFlowBranchRow,
  type PatientFlowComparisonRow,
  type PatientFlowMetric,
  type PatientFlowMetricStatus,
  type PatientFlowStage,
} from "@/lib/analytics/patient-flow-demand";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";

type StoredContext = {
  countryName?: string;
  companyName?: string;
  businessLineId?: string;
  businessLineName?: string;
  branchName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo?: boolean;
};

type DrilldownSelection = {
  branch: string;
  service: string;
  professional: string;
  channel: string;
  payer: string;
  patientType: string;
  flowState: string;
  day: string;
  timeSlot: string;
};

type MetricTrendComparison = {
  comparisonLabel: string;
  current: number[];
  currentLabel: string;
  deltaLabel: string;
  labels: string[];
  summary: string;
  unit: string;
  previous: number[];
};

const allBranchesLabel = "Todas las sucursales";
const allDaysLabel = "Todos los dias";
const allTimeSlotsLabel = "Todas las franjas";
const monthNames = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function readStoredContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawContext =
    window.localStorage.getItem(storageKey) ??
    window.sessionStorage.getItem(storageKey);

  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as StoredContext;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function resolveContextLine(context: StoredContext | null): BusinessLineSlug {
  return resolveBusinessLineSlug({
    businessLineId: context?.businessLineId,
    businessLineName: context?.businessLineName,
    companyName: context?.companyName,
  });
}

function formatPeriod(context: StoredContext | null) {
  if (context?.period) {
    return context.period;
  }

  if (context?.periodStart && context?.periodEnd) {
    return `${context.periodStart} a ${context.periodEnd}`;
  }

  return "Rango pendiente";
}

function getStatusLabel(status: PatientFlowMetricStatus) {
  const labels: Record<PatientFlowMetricStatus, string> = {
    available: "Disponible",
    calculated: "Calculado",
    critical: "Critico",
    incomplete: "Datos incompletos",
    "not-connected": "Datos pendientes de conexion",
    "pending-upload": "Pendiente de carga",
    warning: "Vigilar",
  };

  return labels[status];
}

function getStatusClass(status: PatientFlowMetricStatus) {
  if (status === "available" || status === "calculated") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "warning" || status === "pending-upload" || status === "incomplete") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function getRowStatusClass(status: string) {
  if (status === "Verde") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Amarillo") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function formatMonthLabel(date: Date) {
  return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function getPeriodLabels(context: StoredContext | null) {
  const baseDate =
    context?.periodStart && /^\d{4}-\d{2}-\d{2}$/.test(context.periodStart)
      ? new Date(`${context.periodStart}T00:00:00.000Z`)
      : new Date("2026-07-01T00:00:00.000Z");
  const previousDate = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() - 1, 1),
  );

  return {
    comparisonLabel: formatMonthLabel(previousDate),
    currentLabel: formatMonthLabel(baseDate),
  };
}

function getDateLabels(context: StoredContext | null) {
  if (
    context?.periodStart &&
    context?.periodEnd &&
    /^\d{4}-\d{2}-\d{2}$/.test(context.periodStart) &&
    /^\d{4}-\d{2}-\d{2}$/.test(context.periodEnd)
  ) {
    const [, month] = context.periodStart.split("-");
    return ["01", "05", "10", "15", "20", "25", context.periodEnd.slice(8, 10)].map(
      (day) => `${day}/${month}`,
    );
  }

  return ["01/07", "05/07", "10/07", "15/07", "20/07", "25/07", "31/07"];
}

function parseMetricNumber(value: string) {
  const normalizedValue = value.replace(/,/g, "");
  const match = normalizedValue.match(/\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function getMetricUnit(metric: PatientFlowMetric) {
  const value = metric.value.toLowerCase();
  const label = metric.label.toLowerCase();

  if (value.includes("%") || label.includes("conversion")) {
    return "%";
  }

  if (value.includes("min")) {
    return "min";
  }

  if (value.includes("h")) {
    return "h";
  }

  if (label.includes("dias")) {
    return "dias";
  }

  if (label.includes("orden")) {
    return "ordenes";
  }

  if (label.includes("paciente")) {
    return "pacientes";
  }

  return "";
}

function isRiskMetric(metric: PatientFlowMetric) {
  return /pendientes|anuladas|sin facturar|sin resultado|perdida|no-show|abandono|cancelaciones|fuera de frecuencia|repeticiones/i.test(
    `${metric.label} ${metric.note}`,
  );
}

function isAverageMetric(metric: PatientFlowMetric) {
  return /dias|tiempo|min|frecuencia|por paciente|usa|usan/i.test(
    `${metric.label} ${metric.value}`,
  );
}

function canBuildMetricTrend(metric: PatientFlowMetric) {
  return (
    parseMetricNumber(metric.value) !== null &&
    metric.status !== "not-connected" &&
    metric.status !== "pending-upload"
  );
}

function roundTrendValue(value: number, unit: string) {
  if (unit === "%" || unit === "min" || unit === "h" || unit === "dias") {
    return Math.round(value * 10) / 10;
  }

  return Math.round(value);
}

function formatTrendValue(value: number, unit: string) {
  const formattedValue = Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 1 });

  return unit ? `${formattedValue} ${unit}` : formattedValue;
}

function buildMetricTrendComparison(
  metric: PatientFlowMetric,
  index: number,
  context: StoredContext | null,
): MetricTrendComparison | null {
  const baseValue = parseMetricNumber(metric.value);

  if (baseValue === null || !canBuildMetricTrend(metric)) {
    return null;
  }

  const labels = getDateLabels(context);
  const { comparisonLabel, currentLabel } = getPeriodLabels(context);
  const unit = getMetricUnit(metric);
  const riskMetric = isRiskMetric(metric);
  const averageMetric = isAverageMetric(metric);
  const variance = 0.05 + (index % 3) * 0.025;
  const previousFinal = riskMetric
    ? baseValue * (1 - variance)
    : baseValue * (1 - variance * 1.2);
  const cumulativeShape = [0.11, 0.24, 0.39, 0.53, 0.69, 0.85, 1];
  const averageShape = [0.94, 0.97, 1.01, 0.99, 1.03, 1.01, 1];
  const previousAverageShape = [0.98, 1.01, 1.03, 1.02, 1, 1.01, 1];
  const current = (averageMetric ? averageShape : cumulativeShape).map((factor) =>
    roundTrendValue(baseValue * factor, unit),
  );
  const previous = (
    averageMetric ? previousAverageShape : cumulativeShape
  ).map((factor) => roundTrendValue(previousFinal * factor, unit));
  const delta = baseValue - previousFinal;
  const deltaPercent = previousFinal > 0 ? (delta / previousFinal) * 100 : 0;
  const deltaPrefix = delta >= 0 ? "+" : "";
  const deltaLabel = `${deltaPrefix}${Math.round(deltaPercent)}% vs ${comparisonLabel}`;
  const directionLabel = riskMetric
    ? delta >= 0
      ? "riesgo mayor"
      : "riesgo menor"
    : delta >= 0
      ? "avance positivo"
      : "baja frente al periodo";

  return {
    comparisonLabel,
    current,
    currentLabel,
    deltaLabel,
    labels,
    previous,
    summary: `${directionLabel} en ${metric.label.toLowerCase()}`,
    unit,
  };
}

function PatientMetricCard({ metric }: { metric: PatientFlowMetric }) {
  return (
    <article className="grid min-h-32 gap-3 rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </h2>
        <Badge className={getStatusClass(metric.status)}>
          {getStatusLabel(metric.status)}
        </Badge>
      </div>
      <div className="text-2xl font-semibold tracking-normal">{metric.value}</div>
      <p className="text-xs leading-5 text-muted-foreground">{metric.note}</p>
    </article>
  );
}

function ScopeCard({
  context,
  lineSlug,
  selection,
}: {
  context: StoredContext | null;
  lineSlug: BusinessLineSlug;
  selection: DrilldownSelection;
}) {
  return (
    <aside className="rounded-md border bg-card p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Pantalla de flujo activa
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.businessLineName ?? context?.companyName ?? "Consolidado"}</span>
        <span>{selection.branch}</span>
        <span>Linea: {lineSlug}</span>
        <span>Periodo: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

function DrilldownFilters({
  branchOptions,
  filters,
  selection,
  onChange,
}: {
  branchOptions: string[];
  filters: ReturnType<typeof getPatientFlowDemandScreen>["filters"];
  selection: DrilldownSelection;
  onChange: (selection: DrilldownSelection) => void;
}) {
  const dayOptions = [
    allDaysLabel,
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
    "Domingo",
  ];
  const timeSlotOptions = [
    allTimeSlotsLabel,
    "06:00-09:00",
    "09:00-12:00",
    "12:00-15:00",
    "15:00-18:00",
    "18:00-20:00",
  ];

  function updateField(key: keyof DrilldownSelection, value: string) {
    onChange({ ...selection, [key]: value });
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de flujo
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Sucursal</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("branch", event.target.value)}
            value={selection.branch}
          >
            {branchOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {filters.serviceLabel}
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("service", event.target.value)}
            value={selection.service}
          >
            {filters.serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {filters.professionalLabel}
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("professional", event.target.value)}
            value={selection.professional}
          >
            {filters.professionalOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Canal</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("channel", event.target.value)}
            value={selection.channel}
          >
            {filters.channelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Pagador / convenio
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("payer", event.target.value)}
            value={selection.payer}
          >
            {filters.payerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Tipo de paciente
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("patientType", event.target.value)}
            value={selection.patientType}
          >
            {filters.patientTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Estado del flujo
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("flowState", event.target.value)}
            value={selection.flowState}
          >
            {filters.flowStateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Dia de la semana
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("day", event.target.value)}
            value={selection.day}
          >
            {dayOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Franja horaria
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("timeSlot", event.target.value)}
            value={selection.timeSlot}
          >
            {timeSlotOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function FunnelSection({
  title,
  stages,
}: {
  title: string;
  stages: PatientFlowStage[];
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <GitBranch className="size-4 text-primary" />
        {title}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage) => (
          <article className="grid min-h-36 gap-2 rounded-md border p-3" key={stage.label}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium">{stage.label}</div>
              <Badge className={getStatusClass(stage.status)}>
                {getStatusLabel(stage.status)}
              </Badge>
            </div>
            <div className="text-xl font-semibold tracking-normal">
              {stage.value}
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              Conversion: {stage.conversion}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{stage.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FlowComparisonTable({ rows }: { rows: PatientFlowComparisonRow[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Target className="size-4 text-primary" />
        Comparacion por linea
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Pacientes unicos</th>
              <th className="py-2 pr-4 font-medium">Recurrencia</th>
              <th className="py-2 pr-4 font-medium">Conversion del flujo</th>
              <th className="py-2 pr-4 font-medium">Tiempo de atencion</th>
              <th className="py-2 pr-4 font-medium">Demanda perdida</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Insight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.line}>
                <td className="py-3 pr-4 font-medium">{row.line}</td>
                <td className="py-3 pr-4">{row.patients}</td>
                <td className="py-3 pr-4">{row.recurrence}</td>
                <td className="py-3 pr-4">{row.conversion}</td>
                <td className="py-3 pr-4">{row.responseTime}</td>
                <td className="py-3 pr-4">{row.lostDemand}</td>
                <td className="py-3 pr-4">
                  <Badge className={getRowStatusClass(row.status)}>
                    {row.status}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {row.insight}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BranchDrilldownTable({ rows }: { rows: PatientFlowBranchRow[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <MapPin className="size-4 text-primary" />
        Drill-down por sucursal
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Pacientes</th>
              <th className="py-2 pr-4 font-medium">Recurrencia</th>
              <th className="py-2 pr-4 font-medium">Conversion</th>
              <th className="py-2 pr-4 font-medium">Tiempo promedio</th>
              <th className="py-2 pr-4 font-medium">Demanda perdida</th>
              <th className="py-2 pr-4 font-medium">Vs red</th>
              <th className="py-2 pr-4 font-medium">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.branch}>
                <td className="py-3 pr-4 font-medium">{row.branch}</td>
                <td className="py-3 pr-4">{row.manager}</td>
                <td className="py-3 pr-4">{row.patients}</td>
                <td className="py-3 pr-4">{row.recurrence}</td>
                <td className="py-3 pr-4">{row.conversion}</td>
                <td className="py-3 pr-4">{row.waitTime}</td>
                <td className="py-3 pr-4">{row.lostDemand}</td>
                <td className="py-3 pr-4">{row.benchmark}</td>
                <td className="py-3 pr-4 text-muted-foreground">{row.alert}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildTrendPath(values: number[], width: number, height: number) {
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(1, maxValue - minValue);

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function MetricTrendChart({
  metric,
  trend,
}: {
  metric: PatientFlowMetric;
  trend: MetricTrendComparison | null;
}) {
  if (!trend) {
    return (
      <div className="grid min-h-56 content-center gap-2 rounded-md border bg-muted/30 p-4 text-sm">
        <Badge className={cn("w-fit", getStatusClass(metric.status))}>
          {getStatusLabel(metric.status)}
        </Badge>
        <h3 className="font-semibold tracking-normal">Sin grafica confiable</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {metric.value} · {metric.note}. Se mostrara tendencia cuando la fuente
          tenga fecha, estado y valor numerico.
        </p>
      </div>
    );
  }

  const width = 260;
  const height = 118;
  const allValues = [...trend.current, ...trend.previous];
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = Math.max(1, maxValue - minValue);
  const labelCount = trend.labels.length;
  const currentPath = buildTrendPath(trend.current, width, height);
  const previousPath = buildTrendPath(trend.previous, width, height);

  function getPoint(value: number, index: number) {
    const x = (index / Math.max(1, labelCount - 1)) * width;
    const y = height - ((value - minValue) / range) * height;

    return { x, y };
  }

  return (
    <div className="grid gap-3 rounded-md border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-sm font-semibold tracking-normal">
            Tendencia con fechas
          </h3>
          <p className="text-xs leading-5 text-muted-foreground">
            {metric.label} · {trend.summary}
          </p>
        </div>
        <Badge
          className={
            trend.deltaLabel.startsWith("+")
              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
          }
        >
          {trend.deltaLabel}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-md border bg-card p-3">
        <svg
          aria-label={`Tendencia ${metric.label}`}
          className="h-44 w-full"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${width} ${height + 34}`}
        >
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
              strokeWidth="1"
              x1="0"
              x2={width}
              y1={height * ratio}
              y2={height * ratio}
            />
          ))}
          <path
            d={previousPath}
            fill="none"
            stroke="#94a3b8"
            strokeDasharray="5 5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d={currentPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
          />
          {trend.current.map((value, index) => {
            const point = getPoint(value, index);

            return (
              <circle
                cx={point.x}
                cy={point.y}
                fill="hsl(var(--primary))"
                key={`${trend.labels[index]}-${value}`}
                r="3.2"
              >
                <title>{`${trend.labels[index]} · ${trend.currentLabel}: ${formatTrendValue(value, trend.unit)} · ${trend.comparisonLabel}: ${formatTrendValue(trend.previous[index] ?? 0, trend.unit)}`}</title>
              </circle>
            );
          })}
          {trend.labels.map((label, index) => (
            <text
              fill="#64748b"
              fontSize="8"
              key={label}
              textAnchor={index === 0 ? "start" : index === trend.labels.length - 1 ? "end" : "middle"}
              x={(index / Math.max(1, trend.labels.length - 1)) * width}
              y={height + 22}
            >
              {label}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-5 rounded-full bg-primary" />
          {trend.currentLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-5 rounded-full bg-slate-400" />
          {trend.comparisonLabel}
        </span>
      </div>
    </div>
  );
}

function MetricTrendPanel({
  block,
  context,
}: {
  block: PatientFlowBlock;
  context: StoredContext | null;
}) {
  const trendableMetrics = useMemo(
    () => block.metrics.filter(canBuildMetricTrend),
    [block.metrics],
  );
  const [selectedMetricLabel, setSelectedMetricLabel] = useState(
    trendableMetrics[0]?.label ?? block.metrics[0]?.label ?? "",
  );

  useEffect(() => {
    if (
      selectedMetricLabel &&
      block.metrics.some((metric) => metric.label === selectedMetricLabel)
    ) {
      return;
    }

    setSelectedMetricLabel(trendableMetrics[0]?.label ?? block.metrics[0]?.label ?? "");
  }, [block.metrics, selectedMetricLabel, trendableMetrics]);

  const selectedMetric =
    block.metrics.find((metric) => metric.label === selectedMetricLabel) ??
    block.metrics[0];
  const selectedMetricIndex = Math.max(
    0,
    block.metrics.findIndex((metric) => metric.label === selectedMetric?.label),
  );
  const trend = selectedMetric
    ? buildMetricTrendComparison(selectedMetric, selectedMetricIndex, context)
    : null;

  return (
    <aside className="grid min-w-0 content-start gap-3">
      <label className="grid min-w-0 gap-2 text-sm">
        <span className="font-medium">KPI a comparar</span>
        <select
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setSelectedMetricLabel(event.target.value)}
          value={selectedMetricLabel}
        >
          {block.metrics.map((metric) => (
            <option key={metric.label} value={metric.label}>
              {metric.label}
            </option>
          ))}
        </select>
      </label>
      {selectedMetric ? (
        <MetricTrendChart metric={selectedMetric} trend={trend} />
      ) : null}
    </aside>
  );
}

function PatientFlowRows({ metrics }: { metrics: PatientFlowMetric[] }) {
  return (
    <dl className="grid divide-y text-sm">
      {metrics.map((metric) => (
        <div
          className="grid min-w-0 gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_120px_150px] sm:items-center"
          key={`${metric.label}-${metric.value}`}
        >
          <dt className="min-w-0 font-medium">{metric.label}</dt>
          <dd className="min-w-0 font-semibold tracking-normal">{metric.value}</dd>
          <dd className="grid gap-1">
            <Badge className={cn("w-fit", getStatusClass(metric.status))}>
              {getStatusLabel(metric.status)}
            </Badge>
            <span className="text-xs leading-5 text-muted-foreground">
              {metric.note}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PatientFlowBlockSection({
  block,
  context,
}: {
  block: PatientFlowBlock;
  context: StoredContext | null;
}) {
  return (
    <section className="grid min-w-0 gap-4 rounded-md border bg-card p-4 xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="grid min-w-0 content-start gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="size-4 text-primary" />
          {block.title}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {block.description}
        </p>
        <PatientFlowRows metrics={block.metrics} />
      </div>
      <MetricTrendPanel block={block} context={context} />
    </section>
  );
}

function createDefaultSelection(
  screen: ReturnType<typeof getPatientFlowDemandScreen>,
): DrilldownSelection {
  return {
    branch: allBranchesLabel,
    service: screen.filters.serviceOptions[0],
    professional: screen.filters.professionalOptions[0],
    channel: screen.filters.channelOptions[0],
    payer: screen.filters.payerOptions[0],
    patientType: screen.filters.patientTypeOptions[0],
    flowState: screen.filters.flowStateOptions[0],
    day: allDaysLabel,
    timeSlot: allTimeSlotsLabel,
  };
}

export function PatientFlowDemandDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const lineSlug = useMemo(() => resolveContextLine(context), [context]);
  const screen = useMemo(() => getPatientFlowDemandScreen(lineSlug), [lineSlug]);
  const [selection, setSelection] = useState(() => createDefaultSelection(screen));
  const branchOptions = useMemo(
    () => [allBranchesLabel, ...screen.branchRows.map((row) => row.branch)],
    [screen.branchRows],
  );
  const filteredBranchRows = useMemo(() => {
    if (selection.branch === allBranchesLabel) {
      return screen.branchRows;
    }

    return screen.branchRows.filter((row) => row.branch === selection.branch);
  }, [screen.branchRows, selection.branch]);

  useEffect(() => {
    function refreshContext() {
      setContext(readStoredContext());
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
    };
  }, []);

  useEffect(() => {
    setSelection(createDefaultSelection(screen));
  }, [screen]);

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Citas por negocio</Badge>
            <Badge variant="outline">{screen.subtitle}</Badge>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md border bg-card">
                <CalendarClock className="size-5 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold tracking-normal">
                {screen.title}
              </h1>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {screen.description}
            </p>
          </div>
        </div>
        <ScopeCard
          context={context}
          lineSlug={lineSlug}
          selection={selection}
        />
      </div>

      <DrilldownFilters
        branchOptions={branchOptions}
        filters={screen.filters}
        onChange={setSelection}
        selection={selection}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {screen.primaryMetrics.map((metric) => (
          <PatientMetricCard key={`${screen.slug}-${metric.label}`} metric={metric} />
        ))}
      </div>

      <AnalyticsComparisonChart {...screen.trendChart} />

      <FunnelSection stages={screen.funnel} title={screen.funnelTitle} />

      {screen.comparisonRows ? (
        <FlowComparisonTable rows={screen.comparisonRows} />
      ) : null}

      <BranchDrilldownTable rows={filteredBranchRows} />

      {lineSlug === "consolidado" ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              El consolidado compara porcentajes, tiempos, recurrencia,
              conversion y perdida. No suma pruebas, sesiones y estudios como
              si fueran una sola unidad de servicio.
            </span>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4">
        {screen.blocks.map((block) => (
          <PatientFlowBlockSection
            block={block}
            context={context}
            key={`${screen.slug}-${block.title}`}
          />
        ))}
      </div>
    </section>
  );
}
