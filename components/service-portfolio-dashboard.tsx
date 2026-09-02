"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Filter,
  GitBranch,
  PackageSearch,
  Scale,
  ShieldCheck,
  Target,
} from "lucide-react";

import { AnalyticsComparisonChart } from "@/components/analytics-comparison-chart";
import { ReadableTabs } from "@/components/readable-tabs";
import { Badge } from "@/components/ui/badge";
import {
  resolveBusinessLineSlug,
  type BusinessLineSlug,
} from "@/lib/analytics/business-line-operations";
import {
  buildServiceMetrics,
  buildServiceTrendChart,
  getServiceScreen,
  type ServiceMetric,
  type ServiceRecord,
  type ServiceStatus,
} from "@/lib/analytics/services";
import { formatCurrency } from "@/lib/analytics/el-salvador-result-templates";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const allOption = "Todos";

type StoredContext = {
  branchName?: string;
  businessLineId?: string;
  businessLineName?: string;
  companyName?: string;
  countryName?: string;
  isDemo?: boolean;
  period?: string;
  periodEnd?: string;
  periodStart?: string;
};

type ServiceFilters = {
  branch: string;
  category: string;
  channel: string;
  family: string;
  incident: string;
  ownership: string;
  packageFlag: string;
  payer: string;
  service: string;
  state: string;
  status: string;
};

type ServiceSortKey =
  | "capacityUtilization"
  | "completed"
  | "demandGrowth"
  | "marginRate"
  | "netSales"
  | "patients"
  | "requests"
  | "score"
  | "slaRate";

type BubbleMetric = {
  description: string;
  explanation: { color?: string; label: string; text: string }[];
  quadrantLabels: {
    bottomLeft: string;
    bottomRight: string;
    topLeft: string;
    topRight: string;
  };
  thresholds: { x: number; y: number };
  title: string;
  x: (record: ServiceRecord) => number;
  xDomain: [number, number];
  xLabel: string;
  y: (record: ServiceRecord) => number;
  yDomain: [number, number];
  yLabel: string;
  size: (record: ServiceRecord) => number;
  sizeLabel: string;
};

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

function createDefaultFilters(): ServiceFilters {
  return {
    branch: allOption,
    category: allOption,
    channel: allOption,
    family: allOption,
    incident: allOption,
    ownership: allOption,
    packageFlag: allOption,
    payer: allOption,
    service: allOption,
    state: allOption,
    status: allOption,
  };
}

function uniqueOptions(values: string[]) {
  return [allOption, ...Array.from(new Set(values)).sort()];
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function metricToneClass(tone: ServiceMetric["tone"]) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (tone === "negative") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  return "border-border bg-card text-foreground";
}

function statusClass(status: ServiceStatus) {
  if (status === "Estrategico" || status === "Saludable") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "En observacion") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  if (status === "Requiere intervencion") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function ProgressBar({
  color = "bg-primary",
  value,
}: {
  color?: string;
  value: number;
}) {
  return (
    <div className="h-2 rounded-full bg-muted">
      <div
        className={cn("h-2 rounded-full", color)}
        style={{ width: `${Math.max(4, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function ChartExplanation({
  items,
}: {
  items: { color?: string; label: string; text: string }[];
}) {
  return (
    <div className="mt-4 grid gap-2 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
      <div className="font-medium text-foreground sm:col-span-2">
        Como leer esta grafica
      </div>
      {items.map((item) => (
        <div className="flex items-start gap-2" key={item.label}>
          <span
            className={cn(
              "mt-1 size-2.5 shrink-0 rounded-full bg-slate-500",
              item.color,
            )}
          />
          <span>
            <span className="font-medium text-foreground">{item.label}: </span>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScopeCard({
  context,
  lineSlug,
}: {
  context: StoredContext | null;
  lineSlug: BusinessLineSlug;
}) {
  return (
    <aside className="rounded-md border bg-card p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Portafolio activo
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.businessLineName ?? context?.companyName ?? "Consolidado"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>Linea: {lineSlug}</span>
        <span>Periodo: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

function ServiceFiltersPanel({
  filters,
  onChange,
  records,
}: {
  filters: ServiceFilters;
  onChange: (filters: ServiceFilters) => void;
  records: ServiceRecord[];
}) {
  function updateField(key: keyof ServiceFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const fields: {
    key: keyof ServiceFilters;
    label: string;
    options: string[];
  }[] = [
    {
      key: "service",
      label: "Servicio",
      options: uniqueOptions(records.map((record) => record.name)),
    },
    {
      key: "branch",
      label: "Sucursal",
      options: uniqueOptions(records.flatMap((record) => record.enabledBranches)),
    },
    {
      key: "category",
      label: "Categoria",
      options: uniqueOptions(records.map((record) => record.category)),
    },
    {
      key: "family",
      label: "Familia",
      options: uniqueOptions(records.map((record) => record.family)),
    },
    {
      key: "state",
      label: "Estado del servicio",
      options: uniqueOptions(records.map((record) => record.state)),
    },
    {
      key: "channel",
      label: "Canal",
      options: uniqueOptions(records.map((record) => record.channel)),
    },
    {
      key: "payer",
      label: "Pagador / convenio",
      options: uniqueOptions(records.map((record) => record.payer)),
    },
    {
      key: "ownership",
      label: "Propio / tercerizado",
      options: uniqueOptions(records.map((record) => record.ownership)),
    },
    {
      key: "packageFlag",
      label: "Paquete",
      options: [allOption, "Incluido en paquete", "No incluido"],
    },
    {
      key: "incident",
      label: "Incidencias",
      options: [allOption, "Con incidencias", "Sin incidencias"],
    },
    {
      key: "status",
      label: "Estado score",
      options: uniqueOptions(records.map((record) => record.status)),
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de servicios
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) => (
          <label className="grid gap-1 text-xs" key={field.key}>
            <span className="font-medium text-muted-foreground">
              {field.label}
            </span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => updateField(field.key, event.target.value)}
              value={filters[field.key]}
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function GroupedMetrics({ metrics }: { metrics: ServiceMetric[] }) {
  const groups: ServiceMetric["group"][] = [
    "Portafolio",
    "Demanda",
    "Produccion",
    "Valor",
    "Calidad",
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {groups.map((group) => (
        <section className="rounded-md border bg-card p-4" key={group}>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            {group === "Portafolio" ? (
              <PackageSearch className="size-4 text-primary" />
            ) : group === "Demanda" ? (
              <Target className="size-4 text-primary" />
            ) : group === "Produccion" ? (
              <BarChart3 className="size-4 text-primary" />
            ) : group === "Valor" ? (
              <BadgeDollarSign className="size-4 text-primary" />
            ) : (
              <ShieldCheck className="size-4 text-primary" />
            )}
            {group}
          </div>
          <div className="grid gap-3">
            {metrics
              .filter((metric) => metric.group === group)
              .slice(0, 5)
              .map((metric) => (
                <article
                  className={cn("grid min-h-24 gap-2 rounded-md border p-3", metricToneClass(metric.tone))}
                  key={`${metric.group}-${metric.label}`}
                >
                  <div className="text-xs font-medium opacity-90">
                    {metric.label}
                  </div>
                  <div className="text-xl font-semibold tracking-normal">
                    {metric.value}
                  </div>
                  <p className="text-xs leading-5 opacity-90">{metric.note}</p>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function WeightModel({
  weights,
}: {
  weights: { dimension: string; weight: number }[];
}) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Scale className="size-4 text-primary" />
        Ponderacion del puntaje del servicio
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {weights.map((weight) => (
          <article className="rounded-md border bg-background p-3" key={weight.dimension}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{weight.dimension}</span>
              <span className="text-muted-foreground">{weight.weight}%</span>
            </div>
            <ProgressBar value={weight.weight * 3.4} />
          </article>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-blue-600",
            label: "Barra",
            text: "peso de cada dimension dentro del puntaje integral.",
          },
          {
            color: "bg-slate-500",
            label: "Linea",
            text: "los pesos cambian entre laboratorio, fisioterapia e imagenes.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "explica que impulsa o reduce el puntaje antes de actuar.",
          },
        ]}
      />
    </section>
  );
}

function ServiceBubbleMatrix({
  metric,
  onSelect,
  records,
}: {
  metric: BubbleMetric;
  onSelect: (id: string) => void;
  records: ServiceRecord[];
}) {
  const chartRecords = records.slice(0, 12);
  const width = 760;
  const height = 360;
  const padding = { bottom: 66, left: 72, right: 46, top: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const [xMin, xMax] = metric.xDomain;
  const [yMin, yMax] = metric.yDomain;

  function xScale(value: number) {
    return (
      padding.left +
      ((clamp(value, xMin, xMax) - xMin) / Math.max(xMax - xMin, 1)) * plotWidth
    );
  }

  function yScale(value: number) {
    return (
      padding.top +
      (1 - (clamp(value, yMin, yMax) - yMin) / Math.max(yMax - yMin, 1)) *
        plotHeight
    );
  }

  function serviceColor(record: ServiceRecord) {
    if (record.status === "Requiere intervencion") {
      return "#dc2626";
    }

    if (record.status === "En observacion") {
      return "#f59e0b";
    }

    if (record.lineSlug === "laboratorio") {
      return "#2563eb";
    }

    if (record.lineSlug === "fisioterapia") {
      return "#16a34a";
    }

    return "#0891b2";
  }

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4 text-primary" />
          {metric.title}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {metric.description}
        </p>
      </div>
      <div className="overflow-hidden rounded-md border bg-background p-2">
        <svg
          aria-label={metric.title}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect fill="#f8fafc" height={plotHeight} width={plotWidth} x={padding.left} y={padding.top} />
          <rect fill="#ecfdf5" height={yScale(metric.thresholds.y) - padding.top} opacity="0.75" width={width - padding.right - xScale(metric.thresholds.x)} x={xScale(metric.thresholds.x)} y={padding.top} />
          <rect fill="#fff7ed" height={plotHeight - (yScale(metric.thresholds.y) - padding.top)} opacity="0.66" width={width - padding.right - xScale(metric.thresholds.x)} x={xScale(metric.thresholds.x)} y={yScale(metric.thresholds.y)} />
          <rect fill="#eff6ff" height={yScale(metric.thresholds.y) - padding.top} opacity="0.58" width={xScale(metric.thresholds.x) - padding.left} x={padding.left} y={padding.top} />
          <rect fill="#fef2f2" height={plotHeight - (yScale(metric.thresholds.y) - padding.top)} opacity="0.58" width={xScale(metric.thresholds.x) - padding.left} x={padding.left} y={yScale(metric.thresholds.y)} />

          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
            const xTick = xMin + (xMax - xMin) * step;
            const yTick = yMin + (yMax - yMin) * step;
            return (
              <g key={`${xTick}-${yTick}`}>
                <line stroke="#cbd5e1" strokeDasharray="4 4" x1={xScale(xTick)} x2={xScale(xTick)} y1={padding.top} y2={height - padding.bottom} />
                <line stroke="#cbd5e1" strokeDasharray="4 4" x1={padding.left} x2={width - padding.right} y1={yScale(yTick)} y2={yScale(yTick)} />
                <text fill="#64748b" fontSize="10" textAnchor="middle" x={xScale(xTick)} y={height - 28}>
                  {Math.round(xTick).toLocaleString("en-US")}
                </text>
                <text fill="#64748b" fontSize="10" textAnchor="end" x={padding.left - 10} y={yScale(yTick) + 4}>
                  {Math.round(yTick)}
                </text>
              </g>
            );
          })}

          <line stroke="#0f172a" strokeDasharray="5 5" x1={xScale(metric.thresholds.x)} x2={xScale(metric.thresholds.x)} y1={padding.top} y2={height - padding.bottom} />
          <line stroke="#0f172a" strokeDasharray="5 5" x1={padding.left} x2={width - padding.right} y1={yScale(metric.thresholds.y)} y2={yScale(metric.thresholds.y)} />
          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} />
          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} />

          <text fill="#166534" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={padding.top + 20}>
            {metric.quadrantLabels.topRight}
          </text>
          <text fill="#92400e" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={height - padding.bottom - 18}>
            {metric.quadrantLabels.bottomRight}
          </text>
          <text fill="#1e40af" fontSize="11" fontWeight="600" x={padding.left + 12} y={padding.top + 20}>
            {metric.quadrantLabels.topLeft}
          </text>
          <text fill="#991b1b" fontSize="11" fontWeight="600" x={padding.left + 12} y={height - padding.bottom - 18}>
            {metric.quadrantLabels.bottomLeft}
          </text>

          {chartRecords.map((record) => {
            const radius = Math.max(10, Math.min(28, metric.size(record) / 3200));
            const x = xScale(metric.x(record));
            const y = yScale(metric.y(record));

            return (
              <g className="cursor-pointer" key={record.id} onClick={() => onSelect(record.id)}>
                <circle cx={x} cy={y} fill={serviceColor(record)} opacity="0.86" r={radius} stroke="#ffffff" strokeWidth="3" />
                <text fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle" x={x} y={y + 3}>
                  {record.name.slice(0, 2)}
                </text>
                <title>{`${record.name}
Linea: ${record.line}
${metric.xLabel}: ${Math.round(metric.x(record)).toLocaleString("en-US")}
${metric.yLabel}: ${Math.round(metric.y(record)).toLocaleString("en-US")}
${metric.sizeLabel}: ${metric.size(record).toLocaleString("en-US")}
Estado: ${record.status}`}</title>
              </g>
            );
          })}

          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 18}>
            {metric.xLabel}
          </text>
          <text
            fill="#334155"
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            transform={`rotate(-90 ${24} ${padding.top + plotHeight / 2})`}
            x="24"
            y={padding.top + plotHeight / 2}
          >
            {metric.yLabel}
          </text>
        </svg>
      </div>
      <ChartExplanation items={metric.explanation} />
    </section>
  );
}

function ServiceRankingTable({
  onSelect,
  records,
  selectedId,
}: {
  onSelect: (id: string) => void;
  records: ServiceRecord[];
  selectedId: string | null;
}) {
  const [sortKey, setSortKey] = useState<ServiceSortKey>("score");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const delta = Number(a[sortKey]) - Number(b[sortKey]);
      return direction === "asc" ? delta : -delta;
    });
  }, [direction, records, sortKey]);

  function sortBy(nextKey: ServiceSortKey) {
    if (nextKey === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setDirection("desc");
  }

  const columns: { key: ServiceSortKey; label: string; render: (record: ServiceRecord) => string }[] = [
    { key: "score", label: "Puntaje", render: (record) => `${record.score}` },
    { key: "requests", label: "Demanda", render: (record) => record.requests.toLocaleString("en-US") },
    { key: "completed", label: "Volumen", render: (record) => record.completed.toLocaleString("en-US") },
    { key: "patients", label: "Pacientes", render: (record) => record.patients.toLocaleString("en-US") },
    { key: "netSales", label: "Venta", render: (record) => formatCurrency(record.netSales) },
    { key: "marginRate", label: "Margen", render: (record) => `${record.marginRate}%` },
    { key: "capacityUtilization", label: "Ocupacion", render: (record) => `${record.capacityUtilization}%` },
    { key: "slaRate", label: "SLA", render: (record) => `${record.slaRate}%` },
    { key: "demandGrowth", label: "Crecimiento", render: (record) => `${record.demandGrowth >= 0 ? "+" : ""}${record.demandGrowth}%` },
  ];

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-primary" />
          Tabla ejecutiva del portafolio
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Ordenable por score, demanda, venta, margen, ocupacion, SLA y crecimiento.
        </p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Servicio</th>
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Categoria</th>
              {columns.map((column) => (
                <th className="py-2 pr-4 font-medium" key={column.key}>
                  <button
                    className="rounded-md px-1 py-0.5 hover:bg-muted"
                    onClick={() => sortBy(column.key)}
                    type="button"
                  >
                    {column.label}
                  </button>
                </th>
              ))}
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Accion sugerida</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <tr
                className={cn(
                  "cursor-pointer border-b last:border-b-0 hover:bg-muted/50",
                  selectedId === record.id ? "bg-muted" : "",
                )}
                key={record.id}
                onClick={() => onSelect(record.id)}
              >
                <td className="py-3 pr-4 font-medium">
                  <div>{record.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {record.code} / {record.family}
                  </div>
                </td>
                <td className="py-3 pr-4">{record.line}</td>
                <td className="py-3 pr-4">{record.category}</td>
                {columns.map((column) => (
                  <td className="py-3 pr-4" key={`${record.id}-${column.key}`}>
                    {column.render(record)}
                  </td>
                ))}
                <td className="py-3 pr-4">
                  <Badge className={statusClass(record.status)}>
                    {record.status}
                  </Badge>
                </td>
                <td className="max-w-[320px] py-3 pr-4 text-muted-foreground">
                  {record.recommendation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ServicePareto({ records }: { records: ServiceRecord[] }) {
  const [metricKey, setMetricKey] = useState<
    | "complaints"
    | "completed"
    | "margin"
    | "patients"
    | "profit"
    | "repeats"
    | "sales"
  >("sales");
  const options = [
    { key: "sales", label: "Venta" },
    { key: "patients", label: "Pacientes" },
    { key: "completed", label: "Volumen" },
    { key: "margin", label: "Margen" },
    { key: "profit", label: "Utilidad" },
    { key: "complaints", label: "Reclamos" },
    { key: "repeats", label: "Repeticiones" },
  ] as const;
  const values = useMemo(() => {
    return records
      .map((record) => {
        const value =
          metricKey === "sales"
            ? record.netSales
            : metricKey === "patients"
              ? record.patients
              : metricKey === "completed"
                ? record.completed
                : metricKey === "margin"
                  ? record.marginRate
                  : metricKey === "profit"
                    ? record.profit
                    : metricKey === "complaints"
                      ? record.complaints
                      : record.repeats;

        return { record, value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [metricKey, records]);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...values.map((item) => item.value), 1);
  let cumulative = 0;

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4 text-primary" />
            Pareto de servicios
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Alterna entre venta, pacientes, volumen, margen, utilidad, reclamos o repeticiones.
          </p>
        </div>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setMetricKey(event.target.value as typeof metricKey)}
          value={metricKey}
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3">
        {values.map((item) => {
          cumulative += item.value;
          const cumulativeRate = (cumulative / Math.max(total, 1)) * 100;
          const valueLabel =
            metricKey === "sales" || metricKey === "profit"
              ? formatCurrency(item.value)
              : metricKey === "margin"
                ? `${Math.round(item.value)}%`
                : item.value.toLocaleString("en-US");

          return (
            <div className="grid gap-1" key={item.record.id}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium">{item.record.name}</span>
                <span className="text-muted-foreground">
                  {valueLabel} / acumulado {Math.round(cumulativeRate)}%
                </span>
              </div>
              <ProgressBar
                color={cumulativeRate <= 80 ? "bg-blue-600" : "bg-slate-400"}
                value={(item.value / maxValue) * 100}
              />
            </div>
          );
        })}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "servicios que explican la mayor parte del indicador seleccionado.",
          },
          {
            color: "bg-slate-400",
            label: "Gris",
            text: "cola del portafolio; puede ser oportunidad o ruido operativo.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "prioriza revision donde el volumen tambien concentra incidencias.",
          },
        ]}
      />
    </section>
  );
}

function BranchServiceHeatmap({ records }: { records: ServiceRecord[] }) {
  const [metricKey, setMetricKey] = useState<
    "demand" | "growth" | "margin" | "sla" | "utilization" | "volume"
  >("demand");
  const branches = Array.from(
    new Set(records.flatMap((record) => record.branchPerformance.map((item) => item.branch))),
  ).slice(0, 6);
  const services = records.slice(0, 6);

  function getValue(record: ServiceRecord, branch: string) {
    const branchData = record.branchPerformance.find((item) => item.branch === branch);

    if (!branchData) {
      return 0;
    }

    if (metricKey === "demand") {
      return branchData.demand;
    }

    if (metricKey === "volume") {
      return branchData.volume;
    }

    if (metricKey === "margin") {
      return branchData.marginRate;
    }

    if (metricKey === "sla") {
      return branchData.slaRate;
    }

    if (metricKey === "growth") {
      return record.demandGrowth;
    }

    return branchData.utilizationRate;
  }

  const maxValue = Math.max(
    ...services.flatMap((record) => branches.map((branch) => getValue(record, branch))),
    1,
  );

  function heatClass(value: number) {
    const normalized = metricKey === "growth" ? clamp(value + 20, 0, 50) / 50 : value / maxValue;

    if (normalized >= 0.75) {
      return "bg-blue-700 text-white";
    }

    if (normalized >= 0.5) {
      return "bg-cyan-100 text-cyan-900";
    }

    if (normalized >= 0.25) {
      return "bg-amber-100 text-amber-900";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="size-4 text-primary" />
            Heatmap por sucursal y servicio
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Detecta servicios fuertes, ausentes, saturados o desaprovechados por sede.
          </p>
        </div>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setMetricKey(event.target.value as typeof metricKey)}
          value={metricKey}
        >
          <option value="demand">Demanda</option>
          <option value="volume">Volumen</option>
          <option value="margin">Margen</option>
          <option value="utilization">Ocupacion</option>
          <option value="sla">SLA</option>
          <option value="growth">Crecimiento</option>
        </select>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">Sucursal</th>
              {services.map((record) => (
                <th className="py-2 pr-3 font-medium" key={record.id}>
                  {record.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr className="border-b last:border-b-0" key={branch}>
                <td className="py-2 pr-3 font-medium">{branch}</td>
                {services.map((record) => {
                  const value = getValue(record, branch);
                  const label =
                    metricKey === "margin" || metricKey === "sla" || metricKey === "utilization" || metricKey === "growth"
                      ? `${Math.round(value)}%`
                      : Math.round(value).toLocaleString("en-US");

                  return (
                    <td className="py-2 pr-3" key={`${branch}-${record.id}`}>
                      <span
                        className={cn(
                          "inline-flex min-w-20 justify-center rounded-md px-2 py-1 font-medium",
                          heatClass(value),
                        )}
                        title={`${branch} / ${record.name}: ${label}`}
                      >
                        {value ? label : "No habilitado"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AffinityNetwork({ record }: { record: ServiceRecord }) {
  const maxValue = Math.max(...record.relatedServices.map((item) => item.value), 1);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="size-4 text-primary" />
          Combinacion de servicios
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Servicio inicial hacia siguiente servicio utilizado por el paciente.
        </p>
      </div>
      <div className="grid gap-3">
        {record.relatedServices.map((related) => (
          <div className="grid gap-2" key={`${record.id}-${related.service}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border bg-background px-2 py-1 font-medium">
                {record.name}
              </span>
              <span className="text-muted-foreground">hacia</span>
              <span className="rounded-md border bg-background px-2 py-1 font-medium">
                {related.service}
              </span>
              <span className="ml-auto text-muted-foreground">
                {related.value}% afinidad
              </span>
            </div>
            <ProgressBar color="bg-cyan-600" value={(related.value / maxValue) * 100} />
          </div>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-cyan-600",
            label: "Barra",
            text: "proporcion de pacientes que usan el siguiente servicio.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "identifica venta cruzada, continuidad y paquetes relacionados.",
          },
        ]}
      />
    </section>
  );
}

function NewVsRecurrentChart({ records }: { records: ServiceRecord[] }) {
  const chartRecords = records.slice(0, 8);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-primary" />
          Nuevos versus recurrentes por servicio
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Muestra si el servicio captura pacientes nuevos, sostiene recurrencia o reactiva demanda.
        </p>
      </div>
      <div className="grid gap-4">
        {chartRecords.map((record) => {
          const total =
            record.newPatients + record.recurrentPatients + record.reactivatedPatients;
          const newWidth = (record.newPatients / Math.max(total, 1)) * 100;
          const recurrentWidth =
            (record.recurrentPatients / Math.max(total, 1)) * 100;
          const reactivatedWidth =
            (record.reactivatedPatients / Math.max(total, 1)) * 100;

          return (
            <div className="grid gap-2" key={record.id}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium">{record.name}</span>
                <span className="text-muted-foreground">
                  {total.toLocaleString("en-US")} pacientes
                </span>
              </div>
              <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                <div className="bg-blue-600" style={{ width: `${newWidth}%` }} title="Pacientes nuevos" />
                <div className="bg-emerald-600" style={{ width: `${recurrentWidth}%` }} title="Pacientes recurrentes" />
                <div className="bg-amber-500" style={{ width: `${reactivatedWidth}%` }} title="Pacientes reactivados" />
              </div>
            </div>
          );
        })}
      </div>
      <ChartExplanation
        items={[
          { color: "bg-blue-600", label: "Azul", text: "pacientes nuevos." },
          { color: "bg-emerald-600", label: "Verde", text: "pacientes recurrentes." },
          { color: "bg-amber-500", label: "Amarillo", text: "pacientes reactivados." },
        ]}
      />
    </section>
  );
}

function LossPareto({ records }: { records: ServiceRecord[] }) {
  const causes = useMemo(() => {
    const totals = new Map<string, number>();

    records.forEach((record) => {
      record.lossCauses.forEach((cause) => {
        totals.set(cause.cause, (totals.get(cause.cause) ?? 0) + cause.value);
      });
    });

    return Array.from(totals, ([cause, value]) => ({ cause, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [records]);
  const maxValue = Math.max(...causes.map((cause) => cause.value), 1);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 text-primary" />
          Perdida por servicio
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Pareto de no-show, cancelacion, repeticion, equipo detenido, descuento, tercerizacion y SLA.
        </p>
      </div>
      <div className="grid gap-3">
        {causes.map((cause) => (
          <div className="grid gap-1" key={cause.cause}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{cause.cause}</span>
              <span className="text-muted-foreground">{formatCurrency(cause.value)}</span>
            </div>
            <ProgressBar color="bg-rose-600" value={(cause.value / maxValue) * 100} />
          </div>
        ))}
      </div>
    </section>
  );
}

function BranchComparisonTable({ record }: { record: ServiceRecord }) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="size-4 text-primary" />
          Comparacion entre sucursales
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Donde tiene exito, donde falta capacidad o donde precio/costo necesitan revision.
        </p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Demanda</th>
              <th className="py-2 pr-4 font-medium">Volumen</th>
              <th className="py-2 pr-4 font-medium">Conversion</th>
              <th className="py-2 pr-4 font-medium">SLA</th>
              <th className="py-2 pr-4 font-medium">Ocupacion</th>
              <th className="py-2 pr-4 font-medium">Margen</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {record.branchPerformance.map((branch) => (
              <tr className="border-b last:border-b-0" key={branch.branch}>
                <td className="py-3 pr-4 font-medium">{branch.branch}</td>
                <td className="py-3 pr-4">{branch.demand.toLocaleString("en-US")}</td>
                <td className="py-3 pr-4">{branch.volume.toLocaleString("en-US")}</td>
                <td className="py-3 pr-4">{branch.conversionRate}%</td>
                <td className="py-3 pr-4">{branch.slaRate}%</td>
                <td className="py-3 pr-4">{branch.utilizationRate}%</td>
                <td className="py-3 pr-4">{branch.marginRate}%</td>
                <td className="py-3 pr-4">{branch.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoreDimensionBars({ record }: { record: ServiceRecord }) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="size-4 text-primary" />
          Puntaje integral del servicio
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {record.name} se evalua dentro de {record.line} / {record.category}.
        </p>
      </div>
      <div className="grid gap-3">
        {record.dimensions.map((dimension) => (
          <div className="grid gap-1" key={dimension.id}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{dimension.label}</span>
              <span className="text-muted-foreground">
                {dimension.score} / peso {dimension.weight}% / {dimension.points} pts
              </span>
            </div>
            <ProgressBar
              color={
                dimension.score >= 85
                  ? "bg-emerald-600"
                  : dimension.score >= 72
                    ? "bg-amber-500"
                    : "bg-red-600"
              }
              value={dimension.score}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {dimension.insight}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceProfile({ record }: { record: ServiceRecord }) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold tracking-normal">
            Perfil individual del servicio
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {record.code} / {record.name} / {record.line} / {record.family}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusClass(record.status)}>{record.status}</Badge>
          <Badge variant="outline">{record.state}</Badge>
          <Badge variant="outline">{record.ownership}</Badge>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Puntaje integral", value: `${record.score}`, note: `${record.scoreDelta >= 0 ? "+" : ""}${record.scoreDelta} pts vs periodo anterior` },
          { label: "Solicitudes", value: record.requests.toLocaleString("en-US"), note: "demanda registrada" },
          { label: "Servicios realizados", value: record.completed.toLocaleString("en-US"), note: `${record.conversionRate}% conversion` },
          { label: "Pacientes", value: record.patients.toLocaleString("en-US"), note: `${record.newPatients} nuevos` },
          { label: "Venta neta", value: formatCurrency(record.netSales), note: `${record.portfolioShare}% participacion` },
          { label: "Margen", value: `${record.marginRate}%`, note: `minimo ${record.minimumMarginRate}%` },
          { label: "SLA", value: `${record.slaRate}%`, note: `${record.pending} pendientes` },
          { label: "Ocupacion", value: `${record.capacityUtilization}%`, note: `${record.waitlist} en espera` },
        ].map((item) => (
          <article className="rounded-md border bg-background p-3" key={item.label}>
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-lg font-semibold tracking-normal">{item.value}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
        <article className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Lectura ejecutiva</div>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p>
              Impulsa el score:{" "}
              <span className="font-medium text-foreground">
                {record.mainDriver}
              </span>
            </p>
            <p>
              Reduce el score:{" "}
              <span className="font-medium text-foreground">
                {record.mainDrag}
              </span>
            </p>
            <p>{record.recommendation}</p>
          </div>
        </article>
        <article className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Ficha operativa</div>
          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <span>Duracion estandar: {record.standardDurationMinutes} min</span>
            <span>Duracion real: {record.averageDurationMinutes} min</span>
            <span>Precio base: {formatCurrency(record.price)}</span>
            <span>Costo estandar: {formatCurrency(record.standardCost)}</span>
            <span>Costo directo: {formatCurrency(record.directCost)}</span>
            <span>Ingreso/hora: {formatCurrency(record.revenuePerHour)}</span>
            <span>Unidad: {record.unit}</span>
            <span>Responsable: {record.owner}</span>
            <span>Vigente desde: {record.validSince}</span>
            <span>Actualizado: {record.updatedAt}</span>
          </div>
        </article>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
        <article className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Requisitos y preparacion</div>
          <div className="grid gap-2 text-xs text-muted-foreground">
            {record.patientRequirements.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <span>{record.preparation}</span>
          </div>
        </article>
        <article className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Equipos e insumos</div>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <span>{record.requiredEquipment.join(", ")}</span>
            <span>{record.requiredSupplies.join(", ")}</span>
          </div>
        </article>
        <article className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Profesionales habilitados</div>
          <div className="grid gap-2 text-xs text-muted-foreground">
            {record.authorizedProfessionals.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function CatalogMaster({ records }: { records: ServiceRecord[] }) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="size-4 text-primary" />
          Catalogo maestro de servicios
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Base administrativa para codigos, precio, costo, margen minimo, SLA, vigencia y responsables.
        </p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Codigo</th>
              <th className="py-2 pr-4 font-medium">Servicio</th>
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Unidad</th>
              <th className="py-2 pr-4 font-medium">Precio</th>
              <th className="py-2 pr-4 font-medium">Costo</th>
              <th className="py-2 pr-4 font-medium">Margen min.</th>
              <th className="py-2 pr-4 font-medium">SLA</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Responsable</th>
              <th className="py-2 pr-4 font-medium">Actualizacion</th>
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 10).map((record) => (
              <tr className="border-b last:border-b-0" key={record.id}>
                <td className="py-3 pr-4 font-medium">
                  <div>{record.code}</div>
                  <div className="text-xs text-muted-foreground">{record.fiscalCode}</div>
                </td>
                <td className="py-3 pr-4">{record.name}</td>
                <td className="py-3 pr-4">{record.line}</td>
                <td className="py-3 pr-4">{record.unit}</td>
                <td className="py-3 pr-4">{formatCurrency(record.price)}</td>
                <td className="py-3 pr-4">{formatCurrency(record.standardCost)}</td>
                <td className="py-3 pr-4">{record.minimumMarginRate}%</td>
                <td className="py-3 pr-4">{record.slaRate}%</td>
                <td className="py-3 pr-4">{record.state}</td>
                <td className="py-3 pr-4">{record.owner}</td>
                <td className="py-3 pr-4">{record.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getBubbleMetrics(): BubbleMetric[] {
  return [
    {
      description:
        "Grafico central para saber que servicios tienen demanda y dejan valor.",
      explanation: [
        { color: "bg-slate-500", label: "Eje X", text: "volumen o demanda del servicio." },
        { color: "bg-slate-500", label: "Eje Y", text: "margen operativo del servicio." },
        { color: "bg-blue-600", label: "Azul", text: "servicios de laboratorio." },
        { color: "bg-emerald-600", label: "Verde", text: "servicios de fisioterapia." },
        { color: "bg-cyan-600", label: "Cian", text: "servicios de imagenes." },
        { color: "bg-slate-500", label: "Tamano", text: "venta neta del servicio." },
      ],
      quadrantLabels: {
        bottomLeft: "Revisar continuidad",
        bottomRight: "Mucho volumen, poco valor",
        topLeft: "Especializado con potencial",
        topRight: "Servicio estrella",
      },
      size: (record) => record.netSales,
      sizeLabel: "Venta neta",
      thresholds: { x: 850, y: 42 },
      title: "Matriz demanda versus rentabilidad",
      x: (record) => record.completed,
      xDomain: [0, 2200],
      xLabel: "Volumen",
      y: (record) => record.marginRate,
      yDomain: [0, 70],
      yLabel: "Margen",
    },
    {
      description:
        "Permite detectar servicios con alto volumen pero errores, reclamos o repeticiones.",
      explanation: [
        { color: "bg-slate-500", label: "Eje X", text: "servicios realizados." },
        { color: "bg-slate-500", label: "Eje Y", text: "tasa de exito combinada: SLA, protocolo y satisfaccion." },
        { color: "bg-slate-500", label: "Tamano", text: "pacientes atendidos." },
        { color: "bg-red-600", label: "Rojo", text: "requiere intervencion." },
      ],
      quadrantLabels: {
        bottomLeft: "Bajo volumen y baja calidad",
        bottomRight: "Volumen con riesgo",
        topLeft: "Calidad con espacio",
        topRight: "Volumen saludable",
      },
      size: (record) => record.patients,
      sizeLabel: "Pacientes",
      thresholds: { x: 850, y: 85 },
      title: "Volumen versus calidad",
      x: (record) => record.completed,
      xDomain: [0, 2200],
      xLabel: "Volumen",
      y: (record) =>
        Math.round((record.slaRate + record.protocolRate + record.satisfaction) / 3),
      yDomain: [50, 100],
      yLabel: "Servicio exitoso",
    },
    {
      description:
        "Matriz tipo portafolio para distinguir estrellas, maduros, emergentes y servicios en caida.",
      explanation: [
        { color: "bg-slate-500", label: "Eje X", text: "participacion del servicio en la venta o volumen." },
        { color: "bg-slate-500", label: "Eje Y", text: "crecimiento de demanda contra periodo anterior." },
        { color: "bg-slate-500", label: "Tamano", text: "margen operativo." },
      ],
      quadrantLabels: {
        bottomLeft: "En caida",
        bottomRight: "Maduro con alerta",
        topLeft: "Emergente",
        topRight: "Estrella",
      },
      size: (record) => record.marginRate * 1000,
      sizeLabel: "Margen",
      thresholds: { x: 14, y: 8 },
      title: "Crecimiento versus participacion",
      x: (record) => record.portfolioShare,
      xDomain: [0, 26],
      xLabel: "Participacion",
      y: (record) => record.demandGrowth,
      yDomain: [-20, 30],
      yLabel: "Crecimiento",
    },
    {
      description:
        "Distingue servicios saturados rentables de servicios con capacidad libre y potencial.",
      explanation: [
        { color: "bg-slate-500", label: "Eje X", text: "utilizacion de capacidad o equipo." },
        { color: "bg-slate-500", label: "Eje Y", text: "margen del servicio." },
        { color: "bg-slate-500", label: "Tamano", text: "volumen realizado." },
      ],
      quadrantLabels: {
        bottomLeft: "Baja utilidad y baja ocupacion",
        bottomRight: "Saturado con poco margen",
        topLeft: "Rentable con espacio",
        topRight: "Rentable y ocupado",
      },
      size: (record) => record.completed,
      sizeLabel: "Volumen",
      thresholds: { x: 78, y: 42 },
      title: "Utilizacion versus rentabilidad",
      x: (record) => record.capacityUtilization,
      xDomain: [30, 100],
      xLabel: "Utilizacion",
      y: (record) => record.marginRate,
      yDomain: [0, 70],
      yLabel: "Margen",
    },
  ];
}

export function ServicePortfolioDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const [filters, setFilters] = useState(createDefaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const lineSlug = useMemo(() => resolveContextLine(context), [context]);
  const screen = useMemo(() => getServiceScreen(lineSlug), [lineSlug]);
  const contextRecords = useMemo(() => {
    const branchName = context?.branchName;

    if (!branchName || /^Todas/i.test(branchName)) {
      return screen.records;
    }

    const narrowed = screen.records.filter((record) =>
      record.enabledBranches.includes(branchName),
    );
    return narrowed.length > 0 ? narrowed : screen.records;
  }, [context?.branchName, screen.records]);
  const filteredRecords = useMemo(
    () =>
      contextRecords.filter(
        (record) =>
          (filters.branch === allOption || record.enabledBranches.includes(filters.branch)) &&
          (filters.category === allOption || record.category === filters.category) &&
          (filters.channel === allOption || record.channel === filters.channel) &&
          (filters.family === allOption || record.family === filters.family) &&
          (filters.incident === allOption ||
            (filters.incident === "Con incidencias" ? record.hasIncidents : !record.hasIncidents)) &&
          (filters.ownership === allOption || record.ownership === filters.ownership) &&
          (filters.packageFlag === allOption ||
            (filters.packageFlag === "Incluido en paquete"
              ? record.includedInPackage
              : !record.includedInPackage)) &&
          (filters.payer === allOption || record.payer === filters.payer) &&
          (filters.service === allOption || record.name === filters.service) &&
          (filters.state === allOption || record.state === filters.state) &&
          (filters.status === allOption || record.status === filters.status),
      ),
    [contextRecords, filters],
  );

  useEffect(() => {
    if (filteredRecords.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredRecords.some((record) => record.id === selectedId)) {
      setSelectedId(filteredRecords[0]?.id ?? null);
    }
  }, [filteredRecords, selectedId]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ??
    filteredRecords[0] ??
    null;
  const filteredMetrics = useMemo(
    () => buildServiceMetrics(filteredRecords),
    [filteredRecords],
  );
  const chart = useMemo(
    () => buildServiceTrendChart(filteredRecords),
    [filteredRecords],
  );
  const bubbleMetrics = useMemo(getBubbleMetrics, []);

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
            Entorno DEMO
          </Badge>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <PackageSearch className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                {screen.title}
              </h1>
              <p className="text-sm text-muted-foreground">{screen.subtitle}</p>
            </div>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            {screen.description}
          </p>
        </div>
        <ScopeCard context={context} lineSlug={lineSlug} />
      </div>

      <ServiceFiltersPanel
        filters={filters}
        onChange={setFilters}
        records={contextRecords}
      />

      <ReadableTabs
        tabs={[
          {
            id: "lectura-servicios",
            label: "Lectura rapida",
            description: "KPIs, pesos e insights clave.",
            children: (
              <>
                <GroupedMetrics metrics={filteredMetrics} />
                <div className="grid min-w-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <WeightModel weights={screen.weights} />
                  <section className="min-w-0 rounded-md border bg-card p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                      <ClipboardList className="size-4 text-primary" />
                      Insights ejecutivos
                    </div>
                    <div className="grid gap-3 text-sm text-muted-foreground">
                      {screen.insights.map((insight) => (
                        <div
                          className="rounded-md border bg-background p-3"
                          key={insight}
                        >
                          {insight}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            ),
          },
          {
            id: "portafolio-servicios",
            label: "Portafolio",
            description: "Ranking, matrices y calor por sucursal.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <ServiceRankingTable
                    onSelect={setSelectedId}
                    records={filteredRecords}
                    selectedId={selectedRecord.id}
                  />
                  <ServiceBubbleMatrix
                    metric={bubbleMetrics[0]}
                    onSelect={setSelectedId}
                    records={filteredRecords}
                  />
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <ServiceBubbleMatrix
                      metric={bubbleMetrics[1]}
                      onSelect={setSelectedId}
                      records={filteredRecords}
                    />
                    <ServiceBubbleMatrix
                      metric={bubbleMetrics[2]}
                      onSelect={setSelectedId}
                      records={filteredRecords}
                    />
                  </div>
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <ServicePareto records={filteredRecords} />
                    <BranchServiceHeatmap records={filteredRecords} />
                  </div>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay servicios para los filtros seleccionados.
                </section>
              ),
          },
          {
            id: "comparacion-servicios",
            label: "Comparacion",
            description: "Tendencias, recurrencia y perdidas.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <AnalyticsComparisonChart
                    description={chart.description}
                    enableSeriesSelection
                    insights={chart.insights}
                    maxSelectableSeries={5}
                    metricOptions={chart.metricOptions}
                    series={chart.series}
                    seriesSelectionHint="Elige hasta cinco servicios para comparar demanda, venta, margen, SLA o score."
                    seriesSelectorLabel="Servicios a comparar"
                    title={chart.title}
                    xLabels={chart.xLabels}
                    yLabel={chart.yLabel}
                  />
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <NewVsRecurrentChart records={filteredRecords} />
                    <ServiceBubbleMatrix
                      metric={bubbleMetrics[3]}
                      onSelect={setSelectedId}
                      records={filteredRecords}
                    />
                  </div>
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <LossPareto records={filteredRecords} />
                    <AffinityNetwork record={selectedRecord} />
                  </div>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay servicios para los filtros seleccionados.
                </section>
              ),
          },
          {
            id: "detalle-servicio",
            label: "Detalle",
            description: "Servicio seleccionado y catalogo maestro.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <ScoreDimensionBars record={selectedRecord} />
                    <BranchComparisonTable record={selectedRecord} />
                  </div>
                  <ServiceProfile record={selectedRecord} />
                  <CatalogMaster records={filteredRecords} />
                  <section className="rounded-md border bg-muted p-4 text-sm leading-6 text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                      <GitBranch className="size-4 text-primary" />
                      {screen.rule}
                    </div>
                    <p>
                      La pregunta correcta no es solo cual vende mas, sino cual
                      deja valor, sostiene pacientes, usa bien la capacidad y
                      merece impulso, optimizacion o revision.
                    </p>
                  </section>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay servicios para los filtros seleccionados.
                </section>
              ),
          },
        ]}
      />
    </section>
  );
}
