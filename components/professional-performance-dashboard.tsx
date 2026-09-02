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
  LineChart,
  Scale,
  ShieldCheck,
  Stethoscope,
  Target,
  UsersRound,
} from "lucide-react";

import { AnalyticsComparisonChart } from "@/components/analytics-comparison-chart";
import { ReadableTabs } from "@/components/readable-tabs";
import { Badge } from "@/components/ui/badge";
import {
  resolveBusinessLineSlug,
  type BusinessLineSlug,
} from "@/lib/analytics/business-line-operations";
import {
  buildProfessionalMetrics,
  buildProfessionalTrendChart,
  getProfessionalScreen,
  type ProfessionalMetric,
  type ProfessionalRecord,
  type ProfessionalStatus,
  type SkillState,
} from "@/lib/analytics/professionals";
import {
  formatCurrency,
} from "@/lib/analytics/el-salvador-result-templates";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const allOption = "Todos";

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

type ProfessionalFilters = {
  branch: string;
  experienceLevel: string;
  professional: string;
  role: string;
  scheduleType: string;
  specialty: string;
  service: string;
  shift: string;
  state: string;
  status: string;
};

type SortKey =
  | "score"
  | "productivityAdjusted"
  | "qualityScore"
  | "utilizationRate"
  | "slaRate"
  | "revenuePerHour"
  | "services"
  | "patients";

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

function createDefaultFilters(): ProfessionalFilters {
  return {
    branch: allOption,
    experienceLevel: allOption,
    professional: allOption,
    role: allOption,
    scheduleType: allOption,
    service: allOption,
    shift: allOption,
    specialty: allOption,
    state: allOption,
    status: allOption,
  };
}

function uniqueOptions(records: string[]) {
  return [allOption, ...Array.from(new Set(records)).sort()];
}

function metricToneClass(tone: ProfessionalMetric["tone"]) {
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

function statusClass(status: ProfessionalStatus) {
  if (status === "Sobresaliente" || status === "Saludable") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Precaucion") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  if (status === "Requiere revision") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function skillClass(state: SkillState) {
  if (state === "Autorizado" || state === "Capacitado") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (state === "En entrenamiento" || state === "Certificacion por vencer") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
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
        Pantalla de profesionales activa
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

function ProfessionalFiltersPanel({
  filters,
  onChange,
  records,
}: {
  filters: ProfessionalFilters;
  onChange: (filters: ProfessionalFilters) => void;
  records: ProfessionalRecord[];
}) {
  function updateField(key: keyof ProfessionalFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const fields: {
    key: keyof ProfessionalFilters;
    label: string;
    options: string[];
  }[] = [
    {
      key: "professional",
      label: "Profesional",
      options: uniqueOptions(records.map((record) => record.name)),
    },
    {
      key: "branch",
      label: "Sucursal",
      options: uniqueOptions(records.map((record) => record.branch)),
    },
    {
      key: "role",
      label: "Rol",
      options: uniqueOptions(records.map((record) => record.role)),
    },
    {
      key: "specialty",
      label: "Especialidad",
      options: uniqueOptions(records.map((record) => record.specialty)),
    },
    {
      key: "service",
      label: "Servicio",
      options: uniqueOptions(records.map((record) => record.service)),
    },
    {
      key: "shift",
      label: "Turno",
      options: uniqueOptions(records.map((record) => record.shift)),
    },
    {
      key: "scheduleType",
      label: "Jornada / contrato",
      options: uniqueOptions(records.map((record) => record.scheduleType)),
    },
    {
      key: "experienceLevel",
      label: "Experiencia",
      options: uniqueOptions(records.map((record) => record.experienceLevel)),
    },
    {
      key: "state",
      label: "Estado laboral",
      options: uniqueOptions(records.map((record) => record.state)),
    },
    {
      key: "status",
      label: "Estado score",
      options: uniqueOptions(records.map((record) => record.status)),
    },
  ];

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de profesionales
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

function GroupedMetrics({ metrics }: { metrics: ProfessionalMetric[] }) {
  const groups: ProfessionalMetric["group"][] = [
    "Dotacion",
    "Productividad",
    "Calidad",
    "Valor operativo",
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {groups.map((group) => (
        <section className="rounded-md border bg-card p-4" key={group}>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            {group === "Dotacion" ? (
              <UsersRound className="size-4 text-primary" />
            ) : group === "Productividad" ? (
              <Target className="size-4 text-primary" />
            ) : group === "Calidad" ? (
              <ShieldCheck className="size-4 text-primary" />
            ) : (
              <BadgeDollarSign className="size-4 text-primary" />
            )}
            {group}
          </div>
          <div className="grid gap-3">
            {metrics
              .filter((metric) => metric.group === group)
              .slice(0, 6)
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
        Ponderacion del puntaje por rol
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            text: "peso de esa dimension dentro del puntaje integral.",
          },
          {
            color: "bg-slate-500",
            label: "Comparacion justa",
            text: "los pesos cambian por linea y deben ajustarse por rol.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "evita premiar solo volumen sin revisar calidad, continuidad y capacidad.",
          },
        ]}
      />
    </section>
  );
}

function ProductivityQualityMatrix({
  onSelect,
  records,
}: {
  onSelect: (id: string) => void;
  records: ProfessionalRecord[];
}) {
  const chartRecords = records.slice(0, 12);
  const width = 720;
  const height = 360;
  const padding = { bottom: 66, left: 70, right: 48, top: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xThreshold = 80;
  const yThreshold = 82;

  function xScale(value: number) {
    return padding.left + (clamp(value, 50, 100) - 50) / 50 * plotWidth;
  }

  function yScale(value: number) {
    return padding.top + (1 - (clamp(value, 50, 100) - 50) / 50) * plotHeight;
  }

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4 text-primary" />
          Productividad versus calidad
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Evalua si la produccion esta acompanada de calidad, no solo volumen.
        </p>
      </div>
      <div className="overflow-hidden rounded-md border bg-background p-2">
        <svg
          aria-label="Productividad versus calidad por profesional"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect fill="#f8fafc" height={plotHeight} width={plotWidth} x={padding.left} y={padding.top} />
          <rect fill="#ecfdf5" height={yScale(yThreshold) - padding.top} opacity="0.7" width={width - padding.right - xScale(xThreshold)} x={xScale(xThreshold)} y={padding.top} />
          <rect fill="#fff7ed" height={plotHeight - (yScale(yThreshold) - padding.top)} opacity="0.62" width={width - padding.right - xScale(xThreshold)} x={xScale(xThreshold)} y={yScale(yThreshold)} />
          <rect fill="#eff6ff" height={yScale(yThreshold) - padding.top} opacity="0.58" width={xScale(xThreshold) - padding.left} x={padding.left} y={padding.top} />
          <rect fill="#fef2f2" height={plotHeight - (yScale(yThreshold) - padding.top)} opacity="0.58" width={xScale(xThreshold) - padding.left} x={padding.left} y={yScale(yThreshold)} />

          {[50, 60, 70, 80, 90, 100].map((tick) => (
            <g key={`tick-${tick}`}>
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={xScale(tick)} x2={xScale(tick)} y1={padding.top} y2={height - padding.bottom} />
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={padding.left} x2={width - padding.right} y1={yScale(tick)} y2={yScale(tick)} />
              <text fill="#64748b" fontSize="11" textAnchor="middle" x={xScale(tick)} y={height - 28}>
                {tick}
              </text>
              <text fill="#64748b" fontSize="11" textAnchor="end" x={padding.left - 10} y={yScale(tick) + 4}>
                {tick}
              </text>
            </g>
          ))}

          <line stroke="#0f172a" strokeDasharray="5 5" x1={xScale(xThreshold)} x2={xScale(xThreshold)} y1={padding.top} y2={height - padding.bottom} />
          <line stroke="#0f172a" strokeDasharray="5 5" x1={padding.left} x2={width - padding.right} y1={yScale(yThreshold)} y2={yScale(yThreshold)} />
          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} />
          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} />

          <text fill="#166534" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={padding.top + 20}>
            Profesional referente
          </text>
          <text fill="#92400e" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={height - padding.bottom - 18}>
            Volumen con riesgo
          </text>
          <text fill="#1e40af" fontSize="11" fontWeight="600" x={padding.left + 12} y={padding.top + 20}>
            Calidad con capacidad
          </text>
          <text fill="#991b1b" fontSize="11" fontWeight="600" x={padding.left + 12} y={height - padding.bottom - 18}>
            Requiere acompanamiento
          </text>

          {chartRecords.map((record) => {
            const radius = Math.max(9, Math.min(26, (record.patients || record.services) / 90));
            const fill =
              record.status === "Requiere revision"
                ? "#dc2626"
                : record.status === "Precaucion"
                  ? "#f59e0b"
                  : "#2563eb";
            const x = xScale(record.productivityAdjusted);
            const y = yScale(record.qualityScore);

            return (
              <g className="cursor-pointer" key={record.id} onClick={() => onSelect(record.id)}>
                <circle cx={x} cy={y} fill={fill} opacity="0.84" r={radius} stroke="#ffffff" strokeWidth="3" />
                <text fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle" x={x} y={y + 3}>
                  {record.name.slice(0, 2)}
                </text>
                <title>{`${record.name}
Rol: ${record.role}
Productividad: ${record.productivityAdjusted}
Calidad: ${record.qualityScore}
Pacientes/servicios: ${(record.patients || record.services).toLocaleString("en-US")}
Estado: ${record.status}`}</title>
              </g>
            );
          })}

          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 18}>
            Productividad ajustada
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
            Calidad
          </text>
        </svg>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje X",
            text: "productividad ajustada por horas, complejidad y rol.",
          },
          {
            color: "bg-slate-500",
            label: "Eje Y",
            text: "puntaje de calidad, seguridad, protocolos y reclamos.",
          },
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "profesional saludable o sobresaliente.",
          },
          {
            color: "bg-amber-500",
            label: "Naranja",
            text: "precaucion: revisar causa antes de aumentar carga.",
          },
          {
            color: "bg-red-600",
            label: "Rojo",
            text: "requiere revision o acompanamiento.",
          },
          {
            color: "bg-slate-500",
            label: "Tamano",
            text: "pacientes o servicios ejecutados.",
          },
        ]}
      />
    </section>
  );
}

function WorkloadCapacityChart({ records }: { records: ProfessionalRecord[] }) {
  const chartRecords = records.slice(0, 8);
  const maxHours = Math.max(...chartRecords.map((record) => record.availableHours + record.overtimeHours), 1);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-primary" />
          Carga de trabajo versus capacidad
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Compara horas disponibles, usadas, ociosas y extraordinarias por profesional.
        </p>
      </div>
      <div className="grid gap-4">
        {chartRecords.map((record) => {
          const usedWidth = (record.usedHours / maxHours) * 100;
          const idleWidth = (record.idleHours / maxHours) * 100;
          const overtimeWidth = (record.overtimeHours / maxHours) * 100;
          return (
            <div className="grid gap-2" key={record.id}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-medium">{record.name}</span>
                  <span className="text-muted-foreground"> / {record.role}</span>
                </div>
                <span className="text-muted-foreground">
                  {record.usedHours} h usadas / {record.availableHours} h disponibles
                </span>
              </div>
              <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                <div className="bg-blue-600" style={{ width: `${usedWidth}%` }} title="Horas utilizadas" />
                <div className="bg-slate-300" style={{ width: `${idleWidth}%` }} title="Horas ociosas" />
                <div className="bg-rose-500" style={{ width: `${overtimeWidth}%` }} title="Horas extraordinarias" />
              </div>
            </div>
          );
        })}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "horas utilizadas efectivamente.",
          },
          {
            color: "bg-slate-300",
            label: "Gris",
            text: "capacidad disponible no utilizada.",
          },
          {
            color: "bg-rose-500",
            label: "Rojo",
            text: "horas extraordinarias; posible sobrecarga.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "redistribuir carga antes de contratar o abrir mas agenda.",
          },
        ]}
      />
    </section>
  );
}

function SuccessUtilizationChart({ records }: { records: ProfessionalRecord[] }) {
  const chartRecords = records.slice(0, 8);
  const width = 760;
  const height = 260;
  const padding = { bottom: 54, left: 48, right: 34, top: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const yMax = 110;

  function yScale(value: number) {
    return padding.top + (1 - value / yMax) * plotHeight;
  }

  const linePoints = chartRecords
    .map((record, index) => {
      const x = padding.left + (index + 0.5) * (plotWidth / Math.max(chartRecords.length, 1));
      return `${x.toFixed(2)},${yScale(record.successRate).toFixed(2)}`;
    })
    .join(" ");

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LineChart className="size-4 text-primary" />
          Servicios exitosos versus utilizacion
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Distingue estar ocupado de completar servicios con calidad.
        </p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <svg
          aria-label="Servicios exitosos versus utilizacion"
          className="h-80 min-w-[760px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 50, 85, 100].map((tick) => (
            <g key={tick}>
              <line
                stroke="#e2e8f0"
                strokeDasharray={tick === 85 ? "5 5" : "4 4"}
                x1={padding.left}
                x2={width - padding.right}
                y1={yScale(tick)}
                y2={yScale(tick)}
              />
              <text fill="#64748b" fontSize="11" textAnchor="end" x={padding.left - 8} y={yScale(tick) + 4}>
                {tick}%
              </text>
            </g>
          ))}
          {chartRecords.map((record, index) => {
            const band = plotWidth / Math.max(chartRecords.length, 1);
            const barWidth = Math.max(28, band * 0.5);
            const x = padding.left + index * band + (band - barWidth) / 2;
            return (
              <g key={record.id}>
                <rect
                  fill={record.utilizationRate >= 92 ? "#f97316" : "#2563eb"}
                  height={yScale(0) - yScale(record.utilizationRate)}
                  rx="4"
                  width={barWidth}
                  x={x}
                  y={yScale(record.utilizationRate)}
                >
                  <title>{`${record.name}
Utilizacion: ${record.utilizationRate}%
Servicios exitosos: ${record.successRate}%
Meta rol: 85%`}</title>
                </rect>
                <text fill="#64748b" fontSize="10" textAnchor="middle" x={x + barWidth / 2} y={height - 18}>
                  {record.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
          <polyline
            fill="none"
            points={linePoints}
            stroke="#16a34a"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {chartRecords.map((record, index) => {
            const x = padding.left + (index + 0.5) * (plotWidth / Math.max(chartRecords.length, 1));
            return (
              <circle cx={x} cy={yScale(record.successRate)} fill="#16a34a" key={`${record.id}-success`} r="5" />
            );
          })}
          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 2}>
            Profesionales
          </text>
        </svg>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-blue-600",
            label: "Barras azules",
            text: "utilizacion normal de capacidad profesional.",
          },
          {
            color: "bg-orange-500",
            label: "Barras naranjas",
            text: "utilizacion muy alta; revisar riesgo de sobrecarga.",
          },
          {
            color: "bg-emerald-600",
            label: "Linea verde",
            text: "porcentaje de servicios completados exitosamente.",
          },
          {
            color: "bg-slate-400",
            label: "Linea punteada",
            text: "meta de calidad o exito del rol.",
          },
        ]}
      />
    </section>
  );
}

function ProfessionalRankingTable({
  onSelect,
  records,
  selectedId,
}: {
  onSelect: (id: string) => void;
  records: ProfessionalRecord[];
  selectedId: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const delta = Number(a[sortKey]) - Number(b[sortKey]);
      return direction === "asc" ? delta : -delta;
    });
  }, [direction, records, sortKey]);

  function sortBy(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setDirection("desc");
  }

  const columns: { key: SortKey; label: string; render: (record: ProfessionalRecord) => string }[] = [
    { key: "score", label: "Puntaje", render: (record) => `${record.score}` },
    { key: "productivityAdjusted", label: "Productividad", render: (record) => `${record.productivityAdjusted}` },
    { key: "qualityScore", label: "Calidad", render: (record) => `${record.qualityScore}` },
    { key: "utilizationRate", label: "Utilizacion", render: (record) => `${record.utilizationRate}%` },
    { key: "slaRate", label: "SLA", render: (record) => `${record.slaRate}%` },
    { key: "revenuePerHour", label: "Ingreso/h", render: (record) => formatCurrency(record.revenuePerHour) },
    { key: "services", label: "Servicios", render: (record) => record.services.toLocaleString("en-US") },
    { key: "patients", label: "Pacientes", render: (record) => record.patients.toLocaleString("en-US") },
  ];

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-primary" />
          Ranking normalizado por rol
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Ordenable, pero el puntaje se interpreta dentro del rol y grupo comparable.
        </p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Profesional</th>
              <th className="py-2 pr-4 font-medium">Rol</th>
              <th className="py-2 pr-4 font-medium">Sucursal</th>
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
              <th className="py-2 pr-4 font-medium">Recomendacion</th>
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
                <td className="py-3 pr-4 font-medium">{record.name}</td>
                <td className="py-3 pr-4">
                  <div>{record.role}</div>
                  <div className="text-xs text-muted-foreground">
                    {record.comparableGroup}
                  </div>
                </td>
                <td className="py-3 pr-4">{record.branch}</td>
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
                <td className="max-w-[300px] py-3 pr-4 text-muted-foreground">
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

function ScoreDimensionBars({ record }: { record: ProfessionalRecord }) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="size-4 text-primary" />
          Puntaje integral del profesional
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {record.name} se evalua contra {record.comparableGroup}.
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

function WorkloadHeatmap({ records }: { records: ProfessionalRecord[] }) {
  const chartRecords = records.slice(0, 7);
  const columns = ["Lun AM", "Lun PM", "Mie AM", "Mie PM"];

  function heatClass(value: number) {
    if (value >= 90) {
      return "bg-red-600 text-white";
    }

    if (value >= 72) {
      return "bg-amber-100 text-amber-900";
    }

    if (value >= 45) {
      return "bg-emerald-100 text-emerald-900";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="size-4 text-primary" />
          Heatmap de carga efectiva
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Intensidad por profesional, dia y franja horaria.
        </p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">Profesional</th>
              {columns.map((column) => (
                <th className="py-2 pr-3 font-medium" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartRecords.map((record) => (
              <tr className="border-b last:border-b-0" key={record.id}>
                <td className="py-2 pr-3 font-medium">
                  <div>{record.name}</div>
                  <div className="text-muted-foreground">{record.role}</div>
                </td>
                {record.heatmap[0]?.map((value, index) => (
                  <td className="py-2 pr-3" key={`${record.id}-${columns[index]}`}>
                    <span
                      className={cn(
                        "inline-flex min-w-20 justify-center rounded-md px-2 py-1 font-medium",
                        heatClass(value),
                      )}
                      title={`${record.name}: ${value}% de carga en ${columns[index]}`}
                    >
                      {value}%
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-red-600",
            label: "Rojo",
            text: "sobrecarga o riesgo de saturacion.",
          },
          {
            color: "bg-amber-500",
            label: "Amarillo",
            text: "carga alta que debe vigilarse.",
          },
          {
            color: "bg-emerald-600",
            label: "Verde",
            text: "carga equilibrada o disponible.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "redistribuir agenda por dia, turno o profesional equivalente.",
          },
        ]}
      />
    </section>
  );
}

function WorkloadDistribution({ records }: { records: ProfessionalRecord[] }) {
  const groups = useMemo(() => {
    return Array.from(
      records.reduce((map, record) => {
        const group = map.get(record.role) ?? [];
        group.push(record.utilizationRate);
        map.set(record.role, group);
        return map;
      }, new Map<string, number[]>()),
    ).map(([role, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const min = sorted[0] ?? 0;
      const max = sorted[sorted.length - 1] ?? 0;
      const average =
        sorted.reduce((sum, value) => sum + value, 0) / Math.max(sorted.length, 1);

      return { average, max, min, role };
    });
  }, [records]);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UsersRound className="size-4 text-primary" />
          Distribucion de carga del equipo
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Rango minimo, promedio y maximo de utilizacion por rol.
        </p>
      </div>
      <div className="grid gap-4">
        {groups.map((group) => (
          <div className="grid gap-2" key={group.role}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{group.role}</span>
              <span className="text-muted-foreground">
                min {Math.round(group.min)}% / prom {Math.round(group.average)}% / max {Math.round(group.max)}%
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted">
              <div
                className="absolute top-0 h-3 rounded-full bg-blue-200"
                style={{
                  left: `${Math.min(group.min, 100)}%`,
                  width: `${Math.max(3, Math.min(group.max - group.min, 100))}%`,
                }}
              />
              <div
                className="absolute top-[-3px] h-5 w-1 rounded-full bg-blue-700"
                style={{ left: `${Math.min(group.average, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-blue-200",
            label: "Banda",
            text: "rango entre menor y mayor utilizacion dentro del rol.",
          },
          {
            color: "bg-blue-700",
            label: "Marca azul",
            text: "promedio del rol.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "detecta desigualdad de carga sin mezclar roles distintos.",
          },
        ]}
      />
    </section>
  );
}

function LossPareto({ records }: { records: ProfessionalRecord[] }) {
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
          Causas de perdida de productividad
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Pareto de perdida por ausencias, cancelaciones, agenda, reprocesos y datos.
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

function SkillMatrix({ records }: { records: ProfessionalRecord[] }) {
  const chartRecords = records.slice(0, 7);
  const skillNames = Array.from(
    new Set(chartRecords.flatMap((record) => record.skills.map((skill) => skill.skill))),
  ).slice(0, 5);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-primary" />
          Matriz de habilidades y servicios
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Muestra autorizaciones, capacitaciones y certificaciones por vencer.
        </p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">Profesional</th>
              {skillNames.map((skill) => (
                <th className="py-2 pr-3 font-medium" key={skill}>
                  {skill}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartRecords.map((record) => (
              <tr className="border-b last:border-b-0" key={record.id}>
                <td className="py-2 pr-3 font-medium">{record.name}</td>
                {skillNames.map((skillName) => {
                  const state =
                    record.skills.find((skill) => skill.skill === skillName)?.state ??
                    "No disponible";

                  return (
                    <td className="py-2 pr-3" key={`${record.id}-${skillName}`}>
                      <Badge className={skillClass(state)}>{state}</Badge>
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

function FutureAvailability({ record }: { record: ProfessionalRecord }) {
  const maxValue = Math.max(
    ...record.futureAvailability.flatMap((week) => [week.available, week.demand]),
    1,
  );

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LineChart className="size-4 text-primary" />
          Disponibilidad futura
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Proyeccion de cuatro semanas para prevenir saturacion.
        </p>
      </div>
      <div className="grid gap-3">
        {record.futureAvailability.map((week) => (
          <div className="grid gap-2" key={week.week}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{week.week}</span>
              <span className="text-muted-foreground">
                demanda {week.demand} h / disponible {week.available} h / riesgo {week.risk}
              </span>
            </div>
            <div className="grid gap-1">
              <ProgressBar color="bg-blue-600" value={(week.available / maxValue) * 100} />
              <ProgressBar color={week.risk === "Alto" ? "bg-red-600" : week.risk === "Medio" ? "bg-amber-500" : "bg-emerald-600"} value={(week.demand / maxValue) * 100} />
            </div>
            <p className="text-xs text-muted-foreground">{week.note}</p>
          </div>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "horas profesionales disponibles.",
          },
          {
            color: "bg-emerald-600",
            label: "Verde/amarillo/rojo",
            text: "demanda proyectada y su nivel de riesgo.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "planificar refuerzo, vacaciones, permisos o redistribucion.",
          },
        ]}
      />
    </section>
  );
}

function ProfessionalProfile({ record }: { record: ProfessionalRecord }) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold tracking-normal">
            Perfil individual del profesional
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {record.name} / {record.role} / {record.branch}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusClass(record.status)}>{record.status}</Badge>
          <Badge variant="outline">{record.state}</Badge>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Puntaje integral", value: `${record.score}`, note: `${record.scoreDelta >= 0 ? "+" : ""}${record.scoreDelta} pts vs periodo anterior` },
          { label: "Productividad", value: `${record.productivityAdjusted}`, note: "ajustada por rol y horas" },
          { label: "Calidad", value: `${record.qualityScore}`, note: "protocolos, errores y reclamos" },
          { label: "Utilizacion", value: `${record.utilizationRate}%`, note: `${record.usedHours} h usadas` },
          { label: "SLA", value: `${record.slaRate}%`, note: "cumplimiento operativo" },
          { label: "Pacientes", value: record.patients.toLocaleString("en-US"), note: `${record.recurrentPatients} recurrentes` },
          { label: "Ingreso por hora", value: formatCurrency(record.revenuePerHour), note: "valor operativo" },
          { label: "Servicios sin facturar", value: `${record.unbilledServices}`, note: "fuga a corregir" },
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
              Fortaleza principal:{" "}
              <span className="font-medium text-foreground">
                {record.mainStrength}
              </span>
            </p>
            <p>
              Brecha principal:{" "}
              <span className="font-medium text-foreground">
                {record.mainGap}
              </span>
            </p>
            <p>{record.recommendation}</p>
          </div>
        </article>
        <article className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Factores de justicia</div>
          <div className="grid gap-2 text-xs text-muted-foreground">
            {record.fairnessFactors.length > 0 ? (
              record.fairnessFactors.map((factor) => (
                <div className="rounded-md border bg-card p-2" key={factor}>
                  {factor}
                </div>
              ))
            ) : (
              <div className="rounded-md border bg-card p-2">
                Comparar por rol, jornada, complejidad, sucursal y disponibilidad.
              </div>
            )}
          </div>
        </article>
      </div>
      {record.alerts.length > 0 ? (
        <div className="mt-4 grid gap-2 rounded-md border bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-medium">Alertas automaticas</div>
          {record.alerts.map((alert) => (
            <span key={alert}>{alert}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ProfessionalPerformanceDashboard() {
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
  const screen = useMemo(() => getProfessionalScreen(lineSlug), [lineSlug]);
  const contextRecords = useMemo(() => {
    const branchName = context?.branchName;

    if (!branchName || /^Todas/i.test(branchName)) {
      return screen.records;
    }

    const narrowed = screen.records.filter((record) => record.branch === branchName);
    return narrowed.length > 0 ? narrowed : screen.records;
  }, [context?.branchName, screen.records]);
  const filteredRecords = useMemo(
    () =>
      contextRecords.filter(
        (record) =>
          (filters.branch === allOption || record.branch === filters.branch) &&
          (filters.experienceLevel === allOption ||
            record.experienceLevel === filters.experienceLevel) &&
          (filters.professional === allOption || record.name === filters.professional) &&
          (filters.role === allOption || record.role === filters.role) &&
          (filters.scheduleType === allOption ||
            record.scheduleType === filters.scheduleType) &&
          (filters.specialty === allOption || record.specialty === filters.specialty) &&
          (filters.service === allOption || record.service === filters.service) &&
          (filters.shift === allOption || record.shift === filters.shift) &&
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
  const chart = useMemo(
    () => buildProfessionalTrendChart(filteredRecords),
    [filteredRecords],
  );
  const filteredMetrics = useMemo(
    () => buildProfessionalMetrics(filteredRecords),
    [filteredRecords],
  );

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
            Entorno DEMO
          </Badge>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <Stethoscope className="size-5 text-primary" />
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

      <ProfessionalFiltersPanel
        filters={filters}
        onChange={setFilters}
        records={contextRecords}
      />

      <ReadableTabs
        tabs={[
          {
            id: "lectura-profesionales",
            label: "Lectura rapida",
            description: "KPIs e insights antes del detalle.",
            children: (
              <>
                <GroupedMetrics metrics={filteredMetrics} />
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <WeightModel weights={screen.weights} />
                  <section className="rounded-md border bg-card p-4">
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
            id: "comparacion-profesionales",
            label: "Comparacion",
            description: "Ranking, matrices y tendencias.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <ProfessionalRankingTable
                    onSelect={setSelectedId}
                    records={filteredRecords}
                    selectedId={selectedRecord.id}
                  />
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <ProductivityQualityMatrix
                      onSelect={setSelectedId}
                      records={filteredRecords}
                    />
                    <WorkloadCapacityChart records={filteredRecords} />
                  </div>
                  <SuccessUtilizationChart records={filteredRecords} />
                  <AnalyticsComparisonChart
                    description={chart.description}
                    enableSeriesSelection
                    insights={chart.insights}
                    maxSelectableSeries={5}
                    metricOptions={chart.metricOptions}
                    series={chart.series}
                    seriesSelectionHint="Elige hasta cinco profesionales, idealmente del mismo rol o grupo comparable."
                    seriesSelectorLabel="Profesionales a comparar"
                    title={chart.title}
                    xLabels={chart.xLabels}
                    yLabel={chart.yLabel}
                  />
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay profesionales para los filtros seleccionados.
                </section>
              ),
          },
          {
            id: "detalle-profesional",
            label: "Detalle",
            description: "Causas, carga y perfil seleccionado.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <ScoreDimensionBars record={selectedRecord} />
                    <WorkloadHeatmap records={filteredRecords} />
                  </div>
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <WorkloadDistribution records={filteredRecords} />
                    <LossPareto records={filteredRecords} />
                  </div>
                  <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <SkillMatrix records={filteredRecords} />
                    <FutureAvailability record={selectedRecord} />
                  </div>
                  <ProfessionalProfile record={selectedRecord} />
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay profesionales para los filtros seleccionados.
                </section>
              ),
          },
          {
            id: "regla-profesionales",
            label: "Regla",
            description: "Como leer sin castigar roles no comparables.",
            children: (
              <section className="rounded-md border bg-muted p-4 text-sm leading-6 text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <GitBranch className="size-4 text-primary" />
                  {screen.rule}
                </div>
                <p>
                  La pregunta correcta no es quien hizo mas, sino quien produjo
                  bien, con que recursos, bajo que condiciones y que necesita
                  para mejorar.
                </p>
              </section>
            ),
          },
        ]}
      />
    </section>
  );
}
