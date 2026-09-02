"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  Download,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  Fullscreen,
  GitCompare,
  History,
  LayoutDashboard,
  Link2,
  ListChecks,
  LockKeyhole,
  MonitorPlay,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Table2,
  Upload,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildPhysioPresentationSlides,
  canClosePhysioPresentation,
  formatPhysioValue,
  getPhysioBlockingIssues,
  getPhysioQualityStatus,
  getPhysioReferenceMetrics,
  physioActionItems,
  physioAdapterId,
  physioAgreements,
  physioComparisonRows,
  physioDataQualityDimensions,
  physioDecisionRequests,
  physioFixtureLabel,
  physioHistoryVersions,
  physioMissingSource,
  physioPaymentReconciliation,
  physioPresentationFilters,
  physioReferenceRecord,
  physioSheetMappings,
  physioValidationIssues,
  physioVariationExplanations,
  type PhysioActionItem,
  type PhysioActionStatus,
  type PhysioAgreement,
  type PhysioComparisonRow,
  type PhysioHistoryVersion,
  type PhysioPresentationSlide,
  type PhysioPresentationStatus,
  type PhysioSheetMapping,
  type PhysioSlideChart,
  type PhysioSlideDataStatus,
  type PhysioTemplateLoadStatus,
  type PhysioValidationIssue,
  type PhysioValidationSeverity,
  type PhysioValidationStatus,
} from "@/lib/analytics/physiotherapy-presentation";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const allBranches = "Todas las sucursales";

type StoredContext = {
  branchName?: string;
  businessLineName?: string;
  companyName?: string;
  countryName?: string;
  period?: string;
  periodEnd?: string;
  periodStart?: string;
};

type TabId =
  | "presentation"
  | "template"
  | "comparison"
  | "actions"
  | "agreements"
  | "history"
  | "config";

type UiFilters = {
  areaManager: string;
  branch: string;
  branchManager: string;
  company: string;
  country: string;
  customFrom: string;
  customTo: string;
  period: string;
  presentationStatus: PhysioPresentationStatus | "Todos";
  region: string;
  validationStatus: PhysioValidationStatus | "Todos";
  version: string;
};

type NoticeTone = "neutral" | "positive" | "warning" | "negative";

type Notice = {
  tone: NoticeTone;
  text: string;
};

const tabs: { id: TabId; icon: typeof LayoutDashboard; label: string }[] = [
  { id: "presentation", icon: LayoutDashboard, label: "Presentacion ejecutiva" },
  { id: "template", icon: FileSpreadsheet, label: "Plantilla de resultados" },
  { id: "comparison", icon: GitCompare, label: "Comparacion de sucursales" },
  { id: "actions", icon: ListChecks, label: "Planes de accion" },
  { id: "agreements", icon: ClipboardCheck, label: "Seguimiento de acuerdos" },
  { id: "history", icon: History, label: "Historial" },
  { id: "config", icon: SlidersHorizontal, label: "Configuracion de presentacion" },
];

const loadStatusSteps: PhysioTemplateLoadStatus[] = [
  "Archivo seleccionado",
  "Procesando",
  "Pendiente de validacion",
  "Con advertencias",
  "Con errores",
  "Validado",
  "Importado",
  "Reemplazado",
  "Reprocesado",
  "Revertido",
];

const actionStatuses: PhysioActionStatus[] = [
  "Pendiente",
  "Aceptada",
  "En curso",
  "Bloqueada",
  "Completada",
  "Vencida",
  "Cancelada",
  "Reabierta",
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

function createDefaultFilters(context?: StoredContext | null): UiFilters {
  return {
    areaManager: physioReferenceRecord.areaManager,
    branch:
      context?.branchName && !/^Todas/i.test(context.branchName)
        ? context.branchName
        : physioReferenceRecord.branch,
    branchManager: physioReferenceRecord.branchManager,
    company: physioPresentationFilters.companies[0],
    country: physioPresentationFilters.countries[0],
    customFrom: context?.periodStart ?? "2026-06-01",
    customTo: context?.periodEnd ?? "2026-06-30",
    period: context?.period ?? "Mes anterior",
    presentationStatus: "Todos",
    region: physioReferenceRecord.region,
    validationStatus: "Todos",
    version: physioReferenceRecord.version,
  };
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function noticeClass(tone: NoticeTone) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (tone === "negative") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  return "border-border bg-muted text-muted-foreground";
}

function severityClass(severity: PhysioValidationSeverity) {
  if (severity === "Bloqueante") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (severity === "Advertencia") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function slideStatusClass(status: PhysioSlideDataStatus) {
  if (status === "Listo") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Decision CEO") {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  }

  if (status === "Pendiente de fuente") {
    return "bg-slate-100 text-slate-700 hover:bg-slate-100";
  }

  if (status === "Bloqueado") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function statusTone(status: PhysioTemplateLoadStatus | PhysioPresentationStatus) {
  if (status === "Importado" || status === "Validado" || status === "Aprobada") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (
    status === "Con errores" ||
    status === "Datos con errores"
  ) {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function numberLabel(value: number) {
  return value.toLocaleString("en-US");
}

function buildPolyline(points: number[], width: number, height: number) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = index * step;
      const y = height - ((point - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function buildDeckExport(slides: PhysioPresentationSlide[], hiddenSlideIds: string[]) {
  const visibleSlides = slides.filter((slide) => !hiddenSlideIds.includes(slide.id));
  const body = visibleSlides
    .map(
      (slide) => `
        <section>
          <h1>${slide.title}</h1>
          <p>${slide.narrative}</p>
          <ul>${slide.kpis
            .map((kpi) => `<li><strong>${kpi.label}:</strong> ${kpi.value}</li>`)
            .join("")}</ul>
          <p><strong>Fuente:</strong> ${slide.source}</p>
        </section>
      `,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Fisioterapia</title><style>body{font-family:Arial,sans-serif;color:#0f172a}section{page-break-after:always;padding:40px}h1{font-size:30px}li{margin:8px 0}</style></head><body>${body}</body></html>`;
}

function addHistoryEvent(
  history: PhysioHistoryVersion[],
  event: string,
  status: PhysioHistoryVersion["status"],
) {
  const now = new Date();
  const timestamp = Number.isNaN(now.getTime())
    ? "2026-07-23 00:00"
    : now.toISOString().slice(0, 16).replace("T", " ");

  return [
    {
      actor: "Usuario demo",
      date: timestamp,
      event,
      id: `fisio-history-${history.length + 1}-${Date.now()}`,
      status,
      version: `v0.${history.length + 1}`,
    },
    ...history,
  ];
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  return (
    <div
      aria-live="polite"
      className={cn("rounded-md border px-4 py-3 text-sm", noticeClass(notice.tone))}
    >
      {notice.text}
    </div>
  );
}

function KpiTile({ kpi }: { kpi: { label: string; note?: string; value: string } }) {
  return (
    <div
      className="min-w-0 rounded-md border bg-card p-3"
      title={kpi.note ?? `${kpi.label}: ${kpi.value}`}
    >
      <div className="truncate text-xs font-medium text-muted-foreground">
        {kpi.label}
      </div>
      <div className="mt-1 break-words text-xl font-semibold text-foreground">
        {kpi.value}
      </div>
      {kpi.note ? (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {kpi.note}
        </p>
      ) : null}
    </div>
  );
}

function Bar({
  label,
  max,
  previous,
  target,
  unit,
  value,
}: {
  label: string;
  max: number;
  previous?: number;
  target?: number;
  unit: string;
  value: number;
}) {
  const valueWidth = clamp((Math.abs(value) / max) * 100);
  const previousWidth = previous ? clamp((Math.abs(previous) / max) * 100) : null;
  const targetLeft = target ? clamp((Math.abs(target) / max) * 100) : null;

  return (
    <div className="grid gap-1" title={`${label}: ${numberLabel(value)} ${unit}`}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-medium text-foreground">
          {unit === "$" ? formatCurrency(value) : `${numberLabel(value)} ${unit}`}
        </span>
      </div>
      <div className="relative h-4 rounded-full bg-muted">
        {previousWidth !== null ? (
          <div
            className="absolute inset-y-1 left-0 rounded-full bg-slate-300"
            style={{ width: `${Math.max(3, previousWidth)}%` }}
          />
        ) : null}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            value < 0 ? "bg-red-500" : "bg-blue-600",
          )}
          style={{ width: `${Math.max(3, valueWidth)}%` }}
        />
        {targetLeft !== null ? (
          <div
            className="absolute -top-1 h-6 w-0.5 bg-slate-950"
            style={{ left: `${targetLeft}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

function ChartCard({ chart }: { chart: PhysioSlideChart }) {
  if (chart.type === "line") {
    const width = 520;
    const height = 172;
    const combined = [...chart.current, ...chart.previous];
    const max = Math.max(...combined, 1);
    const min = Math.min(...combined, 0);
    const range = Math.max(max - min, 1);
    const step = chart.current.length > 1 ? width / (chart.current.length - 1) : width;

    return (
      <div className="rounded-md border bg-background p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{chart.title}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-600" />
              Actual
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-orange-500" />
              Comparativo
            </span>
          </div>
        </div>
        <svg
          aria-label={chart.title}
          className="h-56 w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.5, 1].map((ratio) => (
            <line
              className="stroke-border"
              key={ratio}
              strokeDasharray="5 5"
              x1="0"
              x2={width}
              y1={height * ratio}
              y2={height * ratio}
            />
          ))}
          <polyline
            fill="none"
            points={buildPolyline(chart.previous, width, height)}
            stroke="#f97316"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <polyline
            fill="none"
            points={buildPolyline(chart.current, width, height)}
            stroke="#2563eb"
            strokeLinecap="round"
            strokeWidth="4"
          />
          {chart.current.map((point, index) => {
            const x = index * step;
            const y = height - ((point - min) / range) * height;
            return (
              <circle fill="#2563eb" key={`${chart.title}-${index}`} r="5" cx={x} cy={y}>
                <title>{`${chart.labels[index]}: ${
                  chart.unit === "$"
                    ? formatCurrency(point)
                    : chart.unit === "%"
                      ? formatRate(point)
                      : numberLabel(point)
                }`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground md:grid-cols-6">
          {chart.labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    );
  }

  if (chart.type === "waterfall") {
    const max = Math.max(
      ...chart.points.map((point) => Math.abs(point.value)),
      1,
    );

    return (
      <div className="rounded-md border bg-background p-4">
        <h3 className="mb-4 text-sm font-semibold">{chart.title}</h3>
        <div className="grid grid-cols-3 items-end gap-4">
          {chart.points.map((point) => {
            const height = clamp((Math.abs(point.value) / max) * 100, 8, 100);
            return (
              <div
                className="grid h-52 content-end gap-2 text-center text-xs"
                key={point.label}
                title={`${point.label}: ${formatCurrency(point.value)}`}
              >
                <div
                  className={cn(
                    "mx-auto w-full max-w-28 rounded-t-md",
                    point.tone === "negative"
                      ? "bg-red-500"
                      : point.tone === "positive"
                        ? "bg-emerald-600"
                        : "bg-blue-600",
                  )}
                  style={{ height: `${height}%` }}
                />
                <div className="font-medium">{point.label}</div>
                <div className="text-muted-foreground">
                  {formatCurrency(Math.abs(point.value))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (chart.type === "distribution") {
    const total = chart.points.reduce((sum, point) => sum + point.value, 0);
    const max = Math.max(...chart.points.map((point) => Math.abs(point.value)), 1);

    return (
      <div className="rounded-md border bg-background p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{chart.title}</h3>
          <div className="text-xs text-muted-foreground">
            Pasa encima de cada barra para ver el dato exacto.
          </div>
        </div>
        <div className="grid gap-3">
          {chart.points.map((point) => (
            <div
              className="grid gap-1"
              key={point.label}
              title={`${point.label}: ${numberLabel(point.value)} ${chart.unit}`}
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">
                  {point.label}
                </span>
                <span className="shrink-0 font-medium text-foreground">
                  {chart.unit === "$"
                    ? formatCurrency(point.value)
                    : `${numberLabel(point.value)} ${chart.unit}`}
                  {" / "}
                  {total > 0 ? formatRate(point.value / total) : "0.0%"}
                </span>
              </div>
              <div className="h-4 rounded-full bg-muted">
                <div
                  className="h-4 rounded-full bg-teal-600"
                  style={{ width: `${Math.max(3, (Math.abs(point.value) / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const max = Math.max(
    ...chart.points.flatMap((point) => [
      Math.abs(point.value),
      Math.abs(point.previous ?? 0),
      Math.abs(point.target ?? 0),
    ]),
    1,
  );

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{chart.title}</h3>
        <div className="text-xs text-muted-foreground">
          Pasa encima de cada barra para ver el dato exacto.
        </div>
      </div>
      <div className="grid gap-3">
        {chart.points.map((point) => (
          <Bar
            key={point.label}
            label={point.label}
            max={max}
            previous={point.previous}
            target={point.target}
            unit={chart.unit}
            value={point.value}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  onChange,
}: {
  filters: UiFilters;
  onChange: (next: UiFilters) => void;
}) {
  function setField<Key extends keyof UiFilters>(key: Key, value: UiFilters[Key]) {
    onChange({ ...filters, [key]: value });
  }

  function applyQuickPeriod(period: string) {
    const ranges: Record<string, { from: string; to: string }> = {
      "Acumulado del ano": { from: "2026-01-01", to: "2026-06-30" },
      "Mes actual": { from: "2026-07-01", to: "2026-07-31" },
      "Mes anterior": { from: "2026-06-01", to: "2026-06-30" },
      "Mismo periodo del ano anterior": { from: "2025-06-01", to: "2025-06-30" },
      "Rango personalizado": { from: filters.customFrom, to: filters.customTo },
      Trimestre: { from: "2026-04-01", to: "2026-06-30" },
    };

    const range = ranges[period] ?? ranges["Mes anterior"];
    onChange({
      ...filters,
      customFrom: range.from,
      customTo: range.to,
      period,
    });
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Filtros de comite</h2>
        </div>
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Todos afectan presentacion, plantilla, acciones, historial y acuerdos
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SelectField
          label="Pais"
          onChange={(value) => setField("country", value)}
          options={physioPresentationFilters.countries}
          value={filters.country}
        />
        <SelectField
          label="Empresa"
          onChange={(value) => setField("company", value)}
          options={physioPresentationFilters.companies}
          value={filters.company}
        />
        <SelectField
          label="Sucursal"
          onChange={(value) => setField("branch", value)}
          options={[allBranches, ...physioPresentationFilters.branches]}
          value={filters.branch}
        />
        <SelectField
          label="Region"
          onChange={(value) => setField("region", value)}
          options={physioPresentationFilters.regions}
          value={filters.region}
        />
        <SelectField
          label="Gerente de sucursal"
          onChange={(value) => setField("branchManager", value)}
          options={physioPresentationFilters.branchManagers}
          value={filters.branchManager}
        />
        <SelectField
          label="Gerente de area"
          onChange={(value) => setField("areaManager", value)}
          options={physioPresentationFilters.areaManagers}
          value={filters.areaManager}
        />
        <SelectField
          label="Periodo"
          onChange={applyQuickPeriod}
          options={physioPresentationFilters.periods}
          value={filters.period}
        />
        <SelectField
          label="Estado presentacion"
          onChange={(value) =>
            setField("presentationStatus", value as UiFilters["presentationStatus"])
          }
          options={["Todos", ...physioPresentationFilters.presentationStatuses]}
          value={filters.presentationStatus}
        />
        <SelectField
          label="Estado validacion"
          onChange={(value) =>
            setField("validationStatus", value as UiFilters["validationStatus"])
          }
          options={["Todos", ...physioPresentationFilters.validationStatuses]}
          value={filters.validationStatus}
        />
        <SelectField
          label="Version"
          onChange={(value) => setField("version", value)}
          options={physioPresentationFilters.versions}
          value={filters.version}
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Desde
          <Input
            onChange={(event) => setField("customFrom", event.target.value)}
            type="date"
            value={filters.customFrom}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Hasta
          <Input
            onChange={(event) => setField("customTo", event.target.value)}
            type="date"
            value={filters.customTo}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          {physioPresentationFilters.periods.slice(0, 5).map((period) => (
            <Button
              key={period}
              onClick={() => applyQuickPeriod(period)}
              size="sm"
              type="button"
              variant={filters.period === period ? "default" : "outline"}
            >
              <CalendarDays className="size-4" />
              {period}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExecutiveGuard() {
  const blockingIssues = getPhysioBlockingIssues();
  const qualityStatus = getPhysioQualityStatus(physioReferenceRecord.dataQualityScore);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-red-600" />
              <h2 className="text-lg font-semibold">Control antes de enviar al CEO</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              La presentacion existe como borrador, pero no puede cerrarse como
              oficial mientras existan errores bloqueantes.
            </p>
          </div>
          <Badge className={statusTone(physioReferenceRecord.presentationStatus)}>
            {physioReferenceRecord.presentationStatus}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <KpiTile
            kpi={{
              label: "Puntaje de calidad",
              note: qualityStatus,
              value: `${physioReferenceRecord.dataQualityScore}/100`,
            }}
          />
          <KpiTile
            kpi={{
              label: "Errores bloqueantes",
              note: "Impiden cierre oficial.",
              value: `${blockingIssues.length}`,
            }}
          />
          <KpiTile
            kpi={{
              label: "Fuente",
              note: "No es dato global del sistema.",
              value: physioFixtureLabel,
            }}
          />
        </div>
      </div>
      <div className="rounded-md border bg-red-50 p-4 text-sm text-red-900">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <LockKeyhole className="size-4" />
          Cierre oficial bloqueado
        </div>
        <p className="leading-6">
          El sistema no permitira marcar esta presentacion como aprobada o
          cerrada hasta corregir formulas, pagos, acumulados, periodo y
          aseguradoras.
        </p>
      </div>
    </section>
  );
}

function SlideThumbnail({
  hidden,
  index,
  isActive,
  onClick,
  slide,
}: {
  hidden: boolean;
  index: number;
  isActive: boolean;
  onClick: () => void;
  slide: PhysioPresentationSlide;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-md border p-3 text-left text-sm transition",
        isActive ? "border-primary bg-primary/5" : "bg-background hover:bg-muted",
        hidden && "opacity-50",
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{index + 1}</span>
        <Badge className={slideStatusClass(slide.dataStatus)}>{slide.dataStatus}</Badge>
      </div>
      <div className="mt-2 line-clamp-2 font-medium">{slide.title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{slide.kind}</div>
    </button>
  );
}

function SlideCanvas({
  directorComment,
  evidence,
  managerNote,
  onDirectorComment,
  onEvidence,
  onManagerNote,
  onOpenModule,
  slide,
}: {
  directorComment: string;
  evidence: string;
  managerNote: string;
  onDirectorComment: (value: string) => void;
  onEvidence: (value: string) => void;
  onManagerNote: (value: string) => void;
  onOpenModule: (module: string) => void;
  slide: PhysioPresentationSlide;
}) {
  const linkActions: Record<string, { label: string; module: string }> = {
    "capacidad-ocupacion": {
      label: "Ver Capacidad y ocupacion",
      module: "capacidad",
    },
    "distribucion-fisioterapeuta": {
      label: "Ver Profesionales",
      module: "profesionales",
    },
    "resultado-financiero": {
      label: "Ver Salud financiera",
      module: "finanzas",
    },
  };
  const linkAction = linkActions[slide.id];

  return (
    <article className="min-w-0 rounded-md border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{slide.kind}</Badge>
            <Badge className={slideStatusClass(slide.dataStatus)}>
              {slide.dataStatus}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              {physioFixtureLabel}
            </Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal">
            {slide.title}
          </h2>
        </div>
        <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
          <div>Periodo: {physioReferenceRecord.period}</div>
          <div>Sucursal: {physioReferenceRecord.branch}</div>
          <div>Corte: {physioReferenceRecord.closeDate}</div>
          <div>Fuente: {slide.source}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {slide.kpis.slice(0, 8).map((kpi) => (
          <KpiTile key={`${slide.id}-${kpi.label}`} kpi={kpi} />
        ))}
      </div>

      <div className="mt-5 rounded-md border bg-muted/40 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <PencilLine className="size-4 text-primary" />
          Narrativa editable de la gerente
        </div>
        <textarea
          className="min-h-28 w-full resize-y rounded-md border bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(event) => onManagerNote(event.target.value)}
          value={managerNote || slide.narrative}
        />
      </div>

      {slide.charts.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {slide.charts.map((chart) => (
            <ChartCard key={`${slide.id}-${chart.title}`} chart={chart} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed bg-background p-6 text-sm text-muted-foreground">
          {slide.dataStatus === "Pendiente de fuente"
            ? physioMissingSource
            : "Esta slide no requiere grafico para evitar saturacion."}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Comentarios de direccion
          <textarea
            className="min-h-24 resize-y rounded-md border bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(event) => onDirectorComment(event.target.value)}
            placeholder="Agregar observacion, solicitud de cambio o aprobacion parcial."
            value={directorComment}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Evidencia adjunta o enlace
          <textarea
            className="min-h-24 resize-y rounded-md border bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(event) => onEvidence(event.target.value)}
            placeholder="Archivo corregido, acta, captura, comentario de finanzas u operaciones."
            value={evidence}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {linkAction ? (
          <Button
            onClick={() => onOpenModule(linkAction.module)}
            type="button"
            variant="outline"
          >
            <Link2 className="size-4" />
            {linkAction.label}
          </Button>
        ) : null}
        <Button type="button" variant="outline">
          <BadgeCheck className="size-4" />
          Slide revisada
        </Button>
        {slide.requiredDecision ? (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Decision requerida: {slide.requiredDecision}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}

function PresentationTab({
  directorComments,
  evidence,
  hiddenSlideIds,
  managerNotes,
  onAddManualSlide,
  onDirectorComment,
  onEvidence,
  onExport,
  onFullscreen,
  onGenerateReadOnlyLink,
  onHideSlide,
  onManagerNote,
  onMoveSlide,
  onOpenModule,
  onSaveVersion,
  selectedSlideId,
  setSelectedSlideId,
  slides,
}: {
  directorComments: Record<string, string>;
  evidence: Record<string, string>;
  hiddenSlideIds: string[];
  managerNotes: Record<string, string>;
  onAddManualSlide: () => void;
  onDirectorComment: (slideId: string, value: string) => void;
  onEvidence: (slideId: string, value: string) => void;
  onExport: (format: "ppt" | "pdf") => void;
  onFullscreen: () => void;
  onGenerateReadOnlyLink: () => void;
  onHideSlide: (slideId: string) => void;
  onManagerNote: (slideId: string, value: string) => void;
  onMoveSlide: (slideId: string, direction: "up" | "down") => void;
  onOpenModule: (module: string) => void;
  onSaveVersion: () => void;
  selectedSlideId: string;
  setSelectedSlideId: (slideId: string) => void;
  slides: PhysioPresentationSlide[];
}) {
  const visibleSlides = slides.filter((slide) => !hiddenSlideIds.includes(slide.id));
  const selectedSlide =
    slides.find((slide) => slide.id === selectedSlideId) ?? visibleSlides[0] ?? slides[0];
  const selectedIndex = slides.findIndex((slide) => slide.id === selectedSlide.id);
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex < slides.length - 1;

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
      <aside className="rounded-md border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MonitorPlay className="size-4 text-primary" />
            Slides
          </div>
          <Badge variant="outline">{visibleSlides.length} visibles</Badge>
        </div>
        <div className="grid max-h-[760px] gap-2 overflow-auto pr-1">
          {slides.map((slide, index) => (
            <SlideThumbnail
              hidden={hiddenSlideIds.includes(slide.id)}
              index={index}
              isActive={slide.id === selectedSlide.id}
              key={slide.id}
              onClick={() => setSelectedSlideId(slide.id)}
              slide={slide}
            />
          ))}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 rounded-md border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!canGoPrevious}
              onClick={() => setSelectedSlideId(slides[selectedIndex - 1].id)}
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowLeft className="size-4" />
              Anterior
            </Button>
            <Button
              disabled={!canGoNext}
              onClick={() => setSelectedSlideId(slides[selectedIndex + 1].id)}
              size="sm"
              type="button"
              variant="outline"
            >
              Siguiente
              <ArrowRight className="size-4" />
            </Button>
            <Button onClick={onFullscreen} size="sm" type="button" variant="outline">
              <Fullscreen className="size-4" />
              Pantalla completa
            </Button>
            <Button onClick={() => onExport("ppt")} size="sm" type="button" variant="outline">
              <Download className="size-4" />
              PowerPoint
            </Button>
            <Button onClick={() => onExport("pdf")} size="sm" type="button" variant="outline">
              <FileText className="size-4" />
              PDF
            </Button>
            <Button onClick={onGenerateReadOnlyLink} size="sm" type="button" variant="outline">
              <Link2 className="size-4" />
              Enlace lectura
            </Button>
            <Button onClick={onSaveVersion} size="sm" type="button" variant="outline">
              <Save className="size-4" />
              Guardar version
            </Button>
            <Button onClick={onAddManualSlide} size="sm" type="button" variant="outline">
              <Plus className="size-4" />
              Slide manual
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => onHideSlide(selectedSlide.id)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <EyeOff className="size-4" />
              {hiddenSlideIds.includes(selectedSlide.id) ? "Mostrar slide" : "Ocultar slide"}
            </Button>
            <Button
              disabled={selectedIndex === 0}
              onClick={() => onMoveSlide(selectedSlide.id, "up")}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ChevronUp className="size-4" />
              Subir
            </Button>
            <Button
              disabled={selectedIndex === slides.length - 1}
              onClick={() => onMoveSlide(selectedSlide.id, "down")}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ChevronDown className="size-4" />
              Bajar
            </Button>
            <select
              aria-label="Selector de slide"
              className="h-8 rounded-md border bg-background px-2 text-xs"
              onChange={(event) => setSelectedSlideId(event.target.value)}
              value={selectedSlide.id}
            >
              {slides.map((slide) => (
                <option key={slide.id} value={slide.id}>
                  {slide.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <SlideCanvas
          directorComment={directorComments[selectedSlide.id] ?? ""}
          evidence={evidence[selectedSlide.id] ?? ""}
          managerNote={managerNotes[selectedSlide.id] ?? ""}
          onDirectorComment={(value) => onDirectorComment(selectedSlide.id, value)}
          onEvidence={(value) => onEvidence(selectedSlide.id, value)}
          onManagerNote={(value) => onManagerNote(selectedSlide.id, value)}
          onOpenModule={onOpenModule}
          slide={selectedSlide}
        />
      </div>
    </div>
  );
}

function ImportFlow({
  status,
}: {
  status: PhysioTemplateLoadStatus;
}) {
  const currentIndex = loadStatusSteps.indexOf(status);

  return (
    <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
      {loadStatusSteps.map((step, index) => (
        <div
          className={cn(
            "rounded-md border p-3 text-xs",
            index <= currentIndex ? "bg-primary/5" : "bg-background",
            step === status && "border-primary",
          )}
          key={step}
        >
          <div className="flex items-center gap-2 font-medium">
            {index <= currentIndex ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <div className="size-4 rounded-full border" />
            )}
            {step}
          </div>
        </div>
      ))}
    </div>
  );
}

function SheetMappingTable({ mappings }: { mappings: PhysioSheetMapping[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Hoja</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Uso</th>
            <th className="p-3">Campos detectados</th>
            <th className="p-3">Regla</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((mapping) => (
            <tr className="border-t" key={mapping.sheetName}>
              <td className="p-3 font-medium">{mapping.sheetName}</td>
              <td className="p-3">
                <Badge variant="outline">{mapping.role}</Badge>
              </td>
              <td className="p-3 text-muted-foreground">{mapping.purpose}</td>
              <td className="p-3 text-muted-foreground">{mapping.fields.join(", ")}</td>
              <td className="p-3 text-muted-foreground">{mapping.trustNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidationTable({ issues }: { issues: PhysioValidationIssue[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[940px] text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Tipo</th>
            <th className="p-3">Area</th>
            <th className="p-3">Detalle</th>
            <th className="p-3">Esperado</th>
            <th className="p-3">Encontrado</th>
            <th className="p-3">Regla</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr className="border-t align-top" key={issue.id}>
              <td className="p-3">
                <Badge className={severityClass(issue.severity)}>{issue.severity}</Badge>
              </td>
              <td className="p-3 font-medium">{issue.area}</td>
              <td className="p-3 text-muted-foreground">{issue.detail}</td>
              <td className="p-3 text-muted-foreground">{issue.expected}</td>
              <td className="p-3 text-muted-foreground">{issue.found}</td>
              <td className="p-3 text-muted-foreground">{issue.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualityPanel() {
  const qualityStatus = getPhysioQualityStatus(physioReferenceRecord.dataQualityScore);

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h3 className="font-semibold">Puntaje de calidad del archivo</h3>
        </div>
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          {qualityStatus}
        </Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
        <div className="grid place-items-center rounded-md border bg-background p-5">
          <div className="text-5xl font-semibold text-red-700">
            {physioReferenceRecord.dataQualityScore}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">de 100</div>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
            Menor a 70 queda bloqueado para cierre oficial.
          </p>
        </div>
        <div className="grid gap-3">
          {physioDataQualityDimensions.map((dimension) => (
            <div className="grid gap-1" key={dimension.dimension}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{dimension.dimension}</span>
                <span className="text-muted-foreground">{dimension.score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    dimension.score < 70
                      ? "bg-red-500"
                      : dimension.score < 85
                        ? "bg-amber-500"
                        : "bg-emerald-600",
                  )}
                  style={{ width: `${dimension.score}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{dimension.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TemplateTab({
  fileName,
  onConfirmImport,
  onDownloadTemplate,
  onFileSelected,
  onGeneratePresentation,
  onProcessTemplate,
  onRollback,
  status,
}: {
  fileName: string;
  onConfirmImport: () => void;
  onDownloadTemplate: () => void;
  onFileSelected: (fileName: string) => void;
  onGeneratePresentation: () => void;
  onProcessTemplate: () => void;
  onRollback: () => void;
  status: PhysioTemplateLoadStatus;
}) {
  const metrics = getPhysioReferenceMetrics();

  return (
    <div className="grid gap-4">
      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="size-4 text-primary" />
              <h2 className="text-lg font-semibold">Carga y validacion de plantilla</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Flujo: plantilla cargada, validacion, conciliacion, presentacion,
              explicacion, plan, revision, acuerdos y cierre.
            </p>
          </div>
          <Badge className={statusTone(status)}>{status}</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Archivo Excel
            <Input
              accept=".xlsx,.xls"
              onChange={(event) =>
                onFileSelected(event.target.files?.[0]?.name ?? fileName)
              }
              type="file"
            />
          </label>
          <Button onClick={onDownloadTemplate} type="button" variant="outline">
            <Download className="size-4" />
            Descargar plantilla vigente
          </Button>
          <Button onClick={onProcessTemplate} type="button">
            <RefreshCw className="size-4" />
            Ejecutar validaciones
          </Button>
          <Button onClick={onRollback} type="button" variant="outline">
            <RotateCcw className="size-4" />
            Revertir importacion
          </Button>
        </div>

        <div className="mt-4 rounded-md border bg-background p-3 text-sm">
          <div className="font-medium">Archivo seleccionado</div>
          <div className="mt-1 text-muted-foreground">{fileName}</div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <div>
              <span className="text-xs text-muted-foreground">Sucursal detectada</span>
              <div className="font-medium">{physioReferenceRecord.branch}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Periodo detectado</span>
              <div className="font-medium">{physioReferenceRecord.period}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Gerente</span>
              <div className="font-medium">{physioReferenceRecord.branchManager}</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Version</span>
              <div className="font-medium">{physioReferenceRecord.version}</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ImportFlow status={status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={!canClosePhysioPresentation()}
            onClick={onConfirmImport}
            type="button"
          >
            <ClipboardCheck className="size-4" />
            Confirmar importacion
          </Button>
          <Button onClick={onGeneratePresentation} type="button" variant="outline">
            <MonitorPlay className="size-4" />
            Generar presentacion
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <h3 className="font-semibold">Vista previa del resultado detectado</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <KpiTile kpi={{ label: "Meta", value: formatCurrency(physioReferenceRecord.target) }} />
            <KpiTile kpi={{ label: "Venta", value: formatCurrency(metrics.revenue) }} />
            <KpiTile kpi={{ label: "Cumplimiento", value: formatRate(metrics.revenue / physioReferenceRecord.target) }} />
            <KpiTile kpi={{ label: "Ordenes", value: `${physioReferenceRecord.orders}` }} />
            <KpiTile kpi={{ label: "Clientes", value: `${physioReferenceRecord.clients}` }} />
            <KpiTile kpi={{ label: "Sesiones", value: `${physioReferenceRecord.sessions}` }} />
            <KpiTile kpi={{ label: "Cancelaciones", value: `${physioReferenceRecord.reportedCancellations}` }} />
            <KpiTile kpi={{ label: "Margen", value: formatRate(physioReferenceRecord.marginRate) }} />
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <WalletCards className="size-4 text-primary" />
            <h3 className="font-semibold">Conciliacion financiera critica</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <KpiTile kpi={{ label: "Venta junio", value: formatCurrency(physioPaymentReconciliation.sale) }} />
            <KpiTile kpi={{ label: "Pagos detectados", value: formatCurrency(physioPaymentReconciliation.paymentTotal) }} />
            <KpiTile kpi={{ label: "Cobertura pagos", value: formatRate(physioPaymentReconciliation.paymentTotal / physioPaymentReconciliation.sale) }} />
            <KpiTile kpi={{ label: "Posible periodo", value: physioPaymentReconciliation.shiftedFormulaPeriod }} />
          </div>
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            Venta total debe igualar formas de pago. La diferencia impide el
            cierre oficial.
          </div>
        </div>
      </section>

      <QualityPanel />

      <section className="rounded-md border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Table2 className="size-4 text-primary" />
          <h3 className="font-semibold">Mapeo de hojas y columnas</h3>
        </div>
        <SheetMappingTable mappings={physioSheetMappings} />
      </section>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <h3 className="font-semibold">Errores, advertencias e informativos</h3>
          </div>
          <Badge variant="outline">{physioAdapterId}</Badge>
        </div>
        <ValidationTable issues={physioValidationIssues} />
      </section>
    </div>
  );
}

function ComparisonTable({
  rows,
  selected,
  onToggle,
}: {
  onToggle: (branch: string) => void;
  rows: PhysioComparisonRow[];
  selected: string[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Visible</th>
            <th className="p-3">Sucursal</th>
            <th className="p-3">Venta</th>
            <th className="p-3">Pacientes</th>
            <th className="p-3">Ordenes</th>
            <th className="p-3">Sesiones</th>
            <th className="p-3">Ticket</th>
            <th className="p-3">Canal medico</th>
            <th className="p-3">Ocupacion</th>
            <th className="p-3">Margen</th>
            <th className="p-3">Calidad</th>
            <th className="p-3">Fuente</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-t align-top" key={row.branch}>
              <td className="p-3">
                <input
                  checked={selected.includes(row.branch)}
                  className="size-4"
                  onChange={() => onToggle(row.branch)}
                  type="checkbox"
                />
              </td>
              <td className="p-3 font-medium">{row.branch}</td>
              <td className="p-3">{formatPhysioValue(row.revenue, "currency")}</td>
              <td className="p-3">{formatPhysioValue(row.clients, "number")}</td>
              <td className="p-3">{formatPhysioValue(row.orders, "number")}</td>
              <td className="p-3">{formatPhysioValue(row.sessions, "number")}</td>
              <td className="p-3">{formatPhysioValue(row.ticket, "currency")}</td>
              <td className="p-3">{formatPhysioValue(row.medicalShareRate, "rate")}</td>
              <td className="p-3">{formatPhysioValue(row.occupancyRate, "rate")}</td>
              <td className="p-3">{formatPhysioValue(row.marginRate, "rate")}</td>
              <td className="p-3">{formatPhysioValue(row.dataQuality, "number")}</td>
              <td className="p-3 text-muted-foreground">{row.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonTab({
  onToggle,
  selected,
}: {
  onToggle: (branch: string) => void;
  selected: string[];
}) {
  const visibleRows = physioComparisonRows.filter((row) => selected.includes(row.branch));

  return (
    <div className="grid gap-4">
      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GitCompare className="size-4 text-primary" />
              <h2 className="text-lg font-semibold">Comparacion de sucursales</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona hasta cinco sucursales para que direccion compare sin
              abrir cinco presentaciones separadas.
            </p>
          </div>
          <Badge variant="outline">{selected.length}/5 visibles</Badge>
        </div>
        <ComparisonTable
          onToggle={onToggle}
          rows={physioComparisonRows}
          selected={selected}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border bg-card p-4">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <BarChart3 className="size-4 text-primary" />
            Heatmap ejecutivo
          </h3>
          <div className="grid gap-3">
            {visibleRows.map((row) => {
              const quality = row.dataQuality ?? 0;
              const revenue = row.revenue ?? 0;
              return (
                <div className="rounded-md border bg-background p-3" key={row.branch}>
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{row.branch}</span>
                    <span className="text-muted-foreground">
                      {row.source === physioMissingSource
                        ? physioMissingSource
                        : `${formatCurrency(revenue)} / calidad ${quality}`}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          quality < 70 ? "bg-red-500" : "bg-emerald-600",
                        )}
                        style={{ width: `${quality}%` }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${clamp((revenue / 20000) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-md border bg-emerald-50 p-4 text-sm text-emerald-900">
            <h3 className="mb-2 font-semibold">Fortalezas</h3>
            {visibleRows.map((row) => (
              <p className="mb-2 leading-6" key={`${row.branch}-strength`}>
                <strong>{row.branch}:</strong> {row.strength}
              </p>
            ))}
          </div>
          <div className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900">
            <h3 className="mb-2 font-semibold">Alertas y acciones</h3>
            {visibleRows.map((row) => (
              <p className="mb-2 leading-6" key={`${row.branch}-alert`}>
                <strong>{row.branch}:</strong> {row.alert} Accion: {row.action}
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionsTab({
  actions,
  onAdd,
  onStatusChange,
}: {
  actions: PhysioActionItem[];
  onAdd: () => void;
  onStatusChange: (id: string, status: PhysioActionStatus) => void;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">Planes de accion</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada accion queda ligada a problema, KPI, responsable, fechas,
            evidencia, comentario e impacto.
          </p>
        </div>
        <Button onClick={onAdd} type="button">
          <Plus className="size-4" />
          Agregar accion
        </Button>
      </div>
      <div className="grid gap-3">
        {actions.map((action) => (
          <article className="rounded-md border bg-background p-4" key={action.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{action.action}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{action.problem}</p>
              </div>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                onChange={(event) =>
                  onStatusChange(action.id, event.target.value as PhysioActionStatus)
                }
                value={action.status}
              >
                {actionStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <KpiTile kpi={{ label: "KPI", value: action.kpi }} />
              <KpiTile kpi={{ label: "Responsable", value: action.owner }} />
              <KpiTile kpi={{ label: "Fecha limite", value: action.dueDate }} />
              <KpiTile kpi={{ label: "Impacto esperado", value: action.expectedImpact }} />
              <KpiTile kpi={{ label: "Evidencia", value: action.evidence }} />
              <KpiTile kpi={{ label: "Resultado real", value: action.realResult }} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{action.comment}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AgreementsTab({
  agreements,
  onAdd,
  onCloseAgreement,
}: {
  agreements: PhysioAgreement[];
  onAdd: () => void;
  onCloseAgreement: (id: string) => void;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">Seguimiento de acuerdos</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            El siguiente periodo muestra acuerdos cumplidos, parciales, vencidos
            o sin iniciar con impacto obtenido.
          </p>
        </div>
        <Button onClick={onAdd} type="button">
          <Plus className="size-4" />
          Agregar acuerdo
        </Button>
      </div>
      {agreements.length === 0 ? (
        <div className="rounded-md border border-dashed bg-background p-6 text-sm text-muted-foreground">
          No existen acuerdos para este periodo.
        </div>
      ) : (
        <div className="grid gap-3">
          {agreements.map((agreement) => (
            <article className="rounded-md border bg-background p-4" key={agreement.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{agreement.agreement}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {agreement.comments}
                  </p>
                </div>
                <Badge
                  className={
                    agreement.status === "Cumplido"
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                  }
                >
                  {agreement.status}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <KpiTile kpi={{ label: "Participantes", value: agreement.participants }} />
                <KpiTile kpi={{ label: "Responsable", value: agreement.responsible }} />
                <KpiTile kpi={{ label: "Fecha limite", value: agreement.dueDate }} />
                <KpiTile kpi={{ label: "Impacto", value: agreement.impact }} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Evidencia: {agreement.evidence} Resultado: {agreement.result}
              </p>
              {agreement.status !== "Cumplido" ? (
                <Button
                  className="mt-3"
                  onClick={() => onCloseAgreement(agreement.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <CheckCircle2 className="size-4" />
                  Marcar cumplido
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryTab({ history }: { history: PhysioHistoryVersion[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <History className="size-4 text-primary" />
        <h2 className="text-lg font-semibold">Historial y versiones</h2>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Version</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Evento</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {history.map((event) => (
              <tr className="border-t" key={event.id}>
                <td className="p-3 font-medium">{event.version}</td>
                <td className="p-3">{event.date}</td>
                <td className="p-3">{event.actor}</td>
                <td className="p-3 text-muted-foreground">{event.event}</td>
                <td className="p-3">
                  <Badge className={statusTone(event.status)}>{event.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function VariationTable() {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <PencilLine className="size-4 text-primary" />
        <h3 className="font-semibold">Explicacion de variaciones</h3>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Indicador</th>
              <th className="p-3">Resultado</th>
              <th className="p-3">Meta o referencia</th>
              <th className="p-3">Variacion</th>
              <th className="p-3">Causa</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Control sucursal</th>
              <th className="p-3">Evidencia</th>
              <th className="p-3">Comentario</th>
            </tr>
          </thead>
          <tbody>
            {physioVariationExplanations.map((row) => (
              <tr className="border-t align-top" key={row.indicator}>
                <td className="p-3 font-medium">{row.indicator}</td>
                <td className="p-3">{row.result}</td>
                <td className="p-3 text-muted-foreground">{row.reference}</td>
                <td className="p-3">{row.variation}</td>
                <td className="p-3 text-muted-foreground">{row.cause}</td>
                <td className="p-3">
                  <Badge variant="outline">{row.causeType}</Badge>
                </td>
                <td className="p-3">{row.underBranchControl ? "Si" : "No"}</td>
                <td className="p-3 text-muted-foreground">{row.evidence}</td>
                <td className="p-3 text-muted-foreground">{row.managerComment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConfigTab({
  hiddenSlideIds,
  onHideSlide,
  onMoveSlide,
  slides,
}: {
  hiddenSlideIds: string[];
  onHideSlide: (slideId: string) => void;
  onMoveSlide: (slideId: string, direction: "up" | "down") => void;
  slides: PhysioPresentationSlide[];
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="text-lg font-semibold">Configuracion de presentacion</h2>
        </div>
        <div className="grid gap-2">
          {slides.map((slide, index) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3"
              key={slide.id}
            >
              <div className="min-w-0">
                <div className="font-medium">
                  {index + 1}. {slide.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {slide.kind} / {slide.dataStatus} / {slide.source}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={index === 0}
                  onClick={() => onMoveSlide(slide.id, "up")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  disabled={index === slides.length - 1}
                  onClick={() => onMoveSlide(slide.id, "down")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  onClick={() => onHideSlide(slide.id)}
                  size="sm"
                  type="button"
                  variant={hiddenSlideIds.includes(slide.id) ? "default" : "outline"}
                >
                  <EyeOff className="size-4" />
                  {hiddenSlideIds.includes(slide.id) ? "Oculta" : "Visible"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <FileSpreadsheet className="size-4 text-primary" />
            Adapter
          </h3>
          <div className="text-sm leading-6 text-muted-foreground">
            <div className="font-medium text-foreground">{physioAdapterId}</div>
            Identifica sucursal, periodo, gerentes, metas, ventas, ordenes,
            sesiones, pacientes, canales, medicos, especialidades, visitadores,
            terapias, equipos, aseguradoras, cancelaciones, gastos, utilidad,
            personal y capacidad.
          </div>
        </div>
        <div className="rounded-md border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <UsersRound className="size-4 text-primary" />
            Permisos
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Gerente de sucursal carga, explica y envia. Gerente de area revisa
            y comenta. CEO aprueba, decide y crea acuerdos. Finanzas valida
            venta, gastos, utilidad y margen. Operaciones valida sesiones,
            capacidad y cancelaciones. Auditoria consulta trazabilidad.
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Stethoscope className="size-4 text-primary" />
            Fuentes pendientes
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Agenda y expediente clinico habilitaran continuidad terapeutica,
            abandono, pacientes sin proxima cita y resultados clinicos. Hasta
            entonces se muestra: {physioMissingSource}.
          </p>
        </div>
      </section>
    </div>
  );
}

function DecisionsPanel({
  decisions,
  onUpdate,
}: {
  decisions: typeof physioDecisionRequests;
  onUpdate: (id: string, status: "Pendiente" | "Aprobada" | "Rechazada" | "Solicita ajustes") => void;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <BadgeCheck className="size-4 text-primary" />
        <h3 className="font-semibold">Decisiones requeridas del CEO</h3>
      </div>
      <div className="grid gap-3">
        {decisions.map((decision) => (
          <article className="rounded-md border bg-background p-4" key={decision.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold">{decision.decision}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{decision.problem}</p>
              </div>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                onChange={(event) =>
                  onUpdate(
                    decision.id,
                    event.target.value as
                      | "Pendiente"
                      | "Aprobada"
                      | "Rechazada"
                      | "Solicita ajustes",
                  )
                }
                value={decision.status}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
                <option value="Solicita ajustes">Solicita ajustes</option>
              </select>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <KpiTile kpi={{ label: "Impacto", value: decision.impact }} />
              <KpiTile kpi={{ label: "Costo", value: decision.cost }} />
              <KpiTile kpi={{ label: "Beneficio", value: decision.benefit }} />
              <KpiTile kpi={{ label: "Urgencia", value: decision.urgency }} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Evidencia: {decision.evidence}. Respuesta CEO: {decision.ceoResponse}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DataModelSummary() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-md border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <FileSpreadsheet className="size-4 text-primary" />
          Modelo de importacion
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Archivo, sucursal, periodo, gerente, version, mapeo de hojas,
          validaciones, conciliaciones, puntaje de calidad, auditoria y reversion.
        </p>
      </div>
      <div className="rounded-md border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <MonitorPlay className="size-4 text-primary" />
          Modelo de presentacion
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Slides principales, opcionales, pendientes de fuente y anexos con KPI,
          graficos, notas, evidencia, comentarios y estado de aprobacion.
        </p>
      </div>
      <div className="rounded-md border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <ClipboardCheck className="size-4 text-primary" />
          Modelo de seguimiento
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Explicaciones, acciones, decisiones CEO, acuerdos, historial,
          aprobaciones y trazabilidad por periodo.
        </p>
      </div>
    </section>
  );
}

export function PhysiotherapyPresentationDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("presentation");
  const [context, setContext] = useState<StoredContext | null>(null);
  const [filters, setFilters] = useState<UiFilters>(() => createDefaultFilters());
  const [slides, setSlides] = useState<PhysioPresentationSlide[]>(() =>
    buildPhysioPresentationSlides(),
  );
  const [selectedSlideId, setSelectedSlideId] = useState("portada");
  const [hiddenSlideIds, setHiddenSlideIds] = useState<string[]>([]);
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({});
  const [directorComments, setDirectorComments] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] =
    useState<PhysioTemplateLoadStatus>("Con errores");
  const [uploadedFileName, setUploadedFileName] = useState(physioReferenceRecord.fileName);
  const [history, setHistory] = useState<PhysioHistoryVersion[]>(physioHistoryVersions);
  const [actions, setActions] = useState<PhysioActionItem[]>(physioActionItems);
  const [agreements, setAgreements] = useState<PhysioAgreement[]>(physioAgreements);
  const [decisions, setDecisions] = useState(physioDecisionRequests);
  const [selectedComparison, setSelectedComparison] = useState<string[]>([
    physioReferenceRecord.branch,
  ]);
  const [notice, setNotice] = useState<Notice>({
    text: "Modulo preparado para comite mensual. La fuente actual esta marcada como datos de plantilla de prueba.",
    tone: "neutral",
  });
  const deckRef = useRef<HTMLDivElement | null>(null);
  const metrics = getPhysioReferenceMetrics();
  const blockingCount = getPhysioBlockingIssues().length;

  useEffect(() => {
    function refreshContext() {
      const nextContext = readStoredContext();
      setContext(nextContext);
      setFilters((current) => ({
        ...current,
        ...createDefaultFilters(nextContext),
      }));
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
    };
  }, []);

  const contextLabel = useMemo(() => {
    const country = context?.countryName ?? filters.country;
    const company = context?.companyName ?? filters.company;
    return `${country} / ${company} / ${filters.branch}`;
  }, [context?.companyName, context?.countryName, filters.branch, filters.company, filters.country]);

  function openModule(module: string) {
    const params = new URLSearchParams({
      branch: filters.branch,
      company: "40000000-0000-4000-8000-000000000001",
      country: "__regional__",
      from: filters.customFrom,
      line: "business-line-fisioterapia",
      manager: filters.branchManager,
      to: filters.customTo,
    });

    window.location.href = `/protected/${module}?${params.toString()}`;
  }

  function handleDownloadTemplate() {
    const rows = [
      ["adapter", physioAdapterId],
      ["periodo", physioReferenceRecord.period],
      ["sucursal", physioReferenceRecord.branch],
      ["hojas requeridas", physioSheetMappings.map((sheet) => sheet.sheetName).join(" | ")],
    ];
    const content = rows.map((row) => row.join(",")).join("\n");
    downloadTextFile(
      "FISIO_RESULTADOS_MENSUALES_V1_estructura.csv",
      content,
      "text/csv;charset=utf-8",
    );
    setNotice({
      text: "Descargue una estructura de plantilla vigente para el adapter de Fisioterapia.",
      tone: "positive",
    });
  }

  function handleFileSelected(fileName: string) {
    setUploadedFileName(fileName || physioReferenceRecord.fileName);
    setUploadStatus("Archivo seleccionado");
    setHistory((current) =>
      addHistoryEvent(current, "Archivo seleccionado para validar", "Archivo seleccionado"),
    );
    setNotice({
      text: "Archivo seleccionado. Ejecuta validaciones para detectar periodo, sucursal, formulas y conciliaciones.",
      tone: "neutral",
    });
  }

  function handleProcessTemplate() {
    setUploadStatus("Con errores");
    setHistory((current) =>
      addHistoryEvent(
        current,
        "Validaciones ejecutadas: errores bloqueantes detectados",
        "Con errores",
      ),
    );
    setNotice({
      text: `Validaciones ejecutadas. Hay ${blockingCount} errores bloqueantes; la presentacion no puede cerrarse como oficial.`,
      tone: "negative",
    });
  }

  function handleConfirmImport() {
    if (!canClosePhysioPresentation()) {
      setUploadStatus("Con errores");
      setNotice({
        text: "La importacion oficial esta bloqueada: corrige formulas, pagos, acumulados, periodo y aseguradoras, luego vuelve a cargar el archivo.",
        tone: "negative",
      });
      return;
    }

    setUploadStatus("Importado");
    setHistory((current) =>
      addHistoryEvent(current, "Plantilla importada oficialmente", "Importado"),
    );
    setNotice({
      text: "Plantilla importada oficialmente.",
      tone: "positive",
    });
  }

  function handleGeneratePresentation() {
    setActiveTab("presentation");
    setHistory((current) =>
      addHistoryEvent(
        current,
        "Deck ejecutivo regenerado como borrador no oficial",
        "Borrador",
      ),
    );
    setNotice({
      text: "Deck generado como borrador. No puede enviarse como oficial hasta resolver errores bloqueantes.",
      tone: "warning",
    });
  }

  function handleRollback() {
    setUploadStatus("Revertido");
    setHistory((current) =>
      addHistoryEvent(current, "Reversion ejecutada sobre la ultima importacion", "Revertido"),
    );
    setNotice({
      text: "Reversion registrada. La version anterior queda visible en historial.",
      tone: "warning",
    });
  }

  function handleExport(format: "ppt" | "pdf") {
    if (format === "pdf") {
      setNotice({
        text: "Se abrio la impresion del navegador para guardar como PDF.",
        tone: "neutral",
      });
      window.print();
      return;
    }

    downloadTextFile(
      "comite-fisioterapia-junio-2026.ppt",
      buildDeckExport(slides, hiddenSlideIds),
      "application/vnd.ms-powerpoint;charset=utf-8",
    );
    setNotice({
      text: "Se genero una version PowerPoint compatible con el contenido visible del deck.",
      tone: "positive",
    });
  }

  function handleFullscreen() {
    if (!deckRef.current) {
      return;
    }

    void deckRef.current.requestFullscreen?.();
    setNotice({
      text: "Modo presentacion activado.",
      tone: "neutral",
    });
  }

  function handleGenerateReadOnlyLink() {
    const readonlyUrl = `${window.location.origin}${window.location.pathname}?readonly=true&from=${filters.customFrom}&to=${filters.customTo}&branch=${encodeURIComponent(filters.branch)}`;

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(readonlyUrl);
    }

    setNotice({
      text: `Enlace de solo lectura generado: ${readonlyUrl}`,
      tone: "positive",
    });
  }

  function handleSaveVersion() {
    setHistory((current) =>
      addHistoryEvent(current, "Version de presentacion guardada", "Borrador"),
    );
    setNotice({
      text: "Version guardada con comentarios, evidencias, orden de slides y filtros activos.",
      tone: "positive",
    });
  }

  function handleAddManualSlide() {
    const nextIndex = slides.length + 1;
    const newSlide: PhysioPresentationSlide = {
      action: "Completar contenido manual y evidencia antes de presentar.",
      charts: [],
      dataStatus: "Requiere explicacion",
      id: `manual-${Date.now()}`,
      kind: "Anexo",
      kpis: [
        { label: "Tipo", value: "Slide manual" },
        { label: "Estado", value: "Borrador" },
      ],
      narrative: "Nueva slide manual agregada por la gerente.",
      source: "Comentario gerencial",
      title: `${nextIndex}. Slide manual`,
    };
    setSlides((current) => [...current, newSlide]);
    setSelectedSlideId(newSlide.id);
    setNotice({
      text: "Slide manual agregada al final de la presentacion.",
      tone: "positive",
    });
  }

  function handleHideSlide(slideId: string) {
    setHiddenSlideIds((current) =>
      current.includes(slideId)
        ? current.filter((id) => id !== slideId)
        : [...current, slideId],
    );
  }

  function handleMoveSlide(slideId: string, direction: "up" | "down") {
    setSlides((current) => {
      const index = current.findIndex((slide) => slide.id === slideId);

      if (index < 0) {
        return current;
      }

      const target = direction === "up" ? index - 1 : index + 1;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      const [slide] = next.splice(index, 1);
      next.splice(target, 0, slide);
      return next;
    });
  }

  function handleToggleComparison(branch: string) {
    setSelectedComparison((current) => {
      if (current.includes(branch)) {
        return current.filter((item) => item !== branch);
      }

      if (current.length >= 5) {
        setNotice({
          text: "Puedes comparar hasta cinco sucursales visibles.",
          tone: "warning",
        });
        return current;
      }

      return [...current, branch];
    });
  }

  function handleActionStatus(id: string, status: PhysioActionStatus) {
    setActions((current) =>
      current.map((action) => (action.id === id ? { ...action, status } : action)),
    );
  }

  function handleAddAction() {
    setActions((current) => [
      ...current,
      {
        action: "Aumentar uso de equipos subutilizados",
        comment: "Nueva accion creada desde el comite.",
        dueDate: "2026-08-05",
        evidence: "Revisar agenda y disponibilidad por equipo.",
        expectedImpact: "Mayor venta por sesion sin saturar cubiculos.",
        id: `fisio-action-${Date.now()}`,
        kpi: "Uso de equipos",
        owner: filters.branchManager,
        problem: "Capacidad parcial sin utilizar",
        realResult: "Pendiente",
        startDate: "2026-07-23",
        status: "Pendiente",
      },
    ]);
  }

  function handleAddAgreement() {
    setAgreements((current) => [
      ...current,
      {
        agreement: "Revisar archivo corregido antes del proximo comite.",
        closeDate: "Pendiente",
        comments: "Acuerdo creado durante revision.",
        dueDate: "2026-07-30",
        evidence: "Nueva version de plantilla.",
        id: `fisio-agreement-${Date.now()}`,
        impact: "Trazabilidad de cierre.",
        meetingDate: "2026-07-23",
        participants: "CEO, gerente de area, gerente de sucursal",
        responsible: filters.branchManager,
        result: "Pendiente",
        status: "Sin iniciar",
      },
    ]);
  }

  function handleCloseAgreement(id: string) {
    setAgreements((current) =>
      current.map((agreement) =>
        agreement.id === id
          ? {
              ...agreement,
              closeDate: "2026-07-23",
              impact: "Acuerdo cerrado en comite.",
              result: "Cumplido",
              status: "Cumplido",
            }
          : agreement,
      ),
    );
  }

  function handleDecisionStatus(
    id: string,
    status: "Pendiente" | "Aprobada" | "Rechazada" | "Solicita ajustes",
  ) {
    setDecisions((current) =>
      current.map((decision) =>
        decision.id === id ? { ...decision, status } : decision,
      ),
    );
  }

  return (
    <section className="flex w-full max-w-full min-w-0 flex-col gap-6 overflow-hidden px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Badge className="mb-3 w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
            Entorno DEMO
          </Badge>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-card">
              <Stethoscope className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-normal">
                Comite de resultados de Fisioterapia
              </h1>
              <p className="text-sm text-muted-foreground">
                Presentacion ejecutiva, explicacion de resultados y seguimiento
                de acuerdos por sucursal.
              </p>
            </div>
          </div>
        </div>
        <aside className="rounded-md border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-primary" />
            Alcance activo
          </div>
          <div className="grid gap-1 text-muted-foreground">
            <span>{contextLabel}</span>
            <span>{filters.customFrom} a {filters.customTo}</span>
            <span>{physioAdapterId}</span>
          </div>
        </aside>
      </div>

      <FilterPanel filters={filters} onChange={setFilters} />
      <NoticeBanner notice={notice} />
      <ExecutiveGuard />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile kpi={{ label: "Venta", note: physioFixtureLabel, value: formatCurrency(metrics.revenue) }} />
        <KpiTile kpi={{ label: "Cumplimiento", note: "Venta vs meta mensual.", value: formatRate(metrics.revenue / physioReferenceRecord.target) }} />
        <KpiTile kpi={{ label: "Pacientes / ordenes / sesiones", note: "Unidades separadas.", value: `${physioReferenceRecord.clients} / ${physioReferenceRecord.orders} / ${physioReferenceRecord.sessions}` }} />
        <KpiTile kpi={{ label: "Cierre oficial", note: "Bloqueado por conciliacion.", value: canClosePhysioPresentation() ? "Permitido" : "Bloqueado" }} />
      </section>

      <section className="grid gap-3 rounded-md border bg-card p-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-normal">
            Lectura clinica de Fisioterapia
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Horas disponibles, horas agendadas, horas atendidas, ocupacion,
            sesiones, no-show, cancelacion, productividad, ingreso/hora y
            utilizacion por fisioterapeuta no se mezclan con ordenes o cobros.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Horas disponibles", "Pendiente fuente horaria"],
            ["Horas agendadas", "Pendiente agenda"],
            ["Horas atendidas", "Pendiente agenda"],
            [
              "Ocupacion",
              `${Math.round((physioReferenceRecord.sessions / Math.max(physioReferenceRecord.capacityByProfessionals, 1)) * 100)}%`,
            ],
            ["Sesiones", physioReferenceRecord.sessions.toLocaleString("en-US")],
            ["No-show", "Pendiente estado agenda"],
            ["Cancelacion", physioReferenceRecord.reportedCancellations.toLocaleString("en-US")],
            ["Productividad", "Pendiente horas por profesional"],
            ["Ingreso/hora", "No calculable sin horas atendidas"],
            ["Utilizacion por fisioterapeuta", "Pendiente normalizacion"],
          ].map(([label, value]) => (
            <article className="rounded-md border bg-background p-3" key={label}>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 text-base font-semibold">{value}</div>
            </article>
          ))}
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-md border bg-card p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              className="shrink-0"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              size="sm"
              type="button"
              variant={activeTab === tab.id ? "default" : "ghost"}
            >
              <Icon className="size-4" />
              {tab.label}
            </Button>
          );
        })}
      </nav>

      <div ref={deckRef}>
        {activeTab === "presentation" ? (
          <div className="grid gap-4">
            <PresentationTab
              directorComments={directorComments}
              evidence={evidence}
              hiddenSlideIds={hiddenSlideIds}
              managerNotes={managerNotes}
              onAddManualSlide={handleAddManualSlide}
              onDirectorComment={(slideId, value) =>
                setDirectorComments((current) => ({ ...current, [slideId]: value }))
              }
              onEvidence={(slideId, value) =>
                setEvidence((current) => ({ ...current, [slideId]: value }))
              }
              onExport={handleExport}
              onFullscreen={handleFullscreen}
              onGenerateReadOnlyLink={handleGenerateReadOnlyLink}
              onHideSlide={handleHideSlide}
              onManagerNote={(slideId, value) =>
                setManagerNotes((current) => ({ ...current, [slideId]: value }))
              }
              onMoveSlide={handleMoveSlide}
              onOpenModule={openModule}
              onSaveVersion={handleSaveVersion}
              selectedSlideId={selectedSlideId}
              setSelectedSlideId={setSelectedSlideId}
              slides={slides}
            />
            <VariationTable />
            <DecisionsPanel decisions={decisions} onUpdate={handleDecisionStatus} />
          </div>
        ) : null}

        {activeTab === "template" ? (
          <TemplateTab
            fileName={uploadedFileName}
            onConfirmImport={handleConfirmImport}
            onDownloadTemplate={handleDownloadTemplate}
            onFileSelected={handleFileSelected}
            onGeneratePresentation={handleGeneratePresentation}
            onProcessTemplate={handleProcessTemplate}
            onRollback={handleRollback}
            status={uploadStatus}
          />
        ) : null}

        {activeTab === "comparison" ? (
          <ComparisonTab
            onToggle={handleToggleComparison}
            selected={selectedComparison}
          />
        ) : null}

        {activeTab === "actions" ? (
          <ActionsTab
            actions={actions}
            onAdd={handleAddAction}
            onStatusChange={handleActionStatus}
          />
        ) : null}

        {activeTab === "agreements" ? (
          <AgreementsTab
            agreements={agreements}
            onAdd={handleAddAgreement}
            onCloseAgreement={handleCloseAgreement}
          />
        ) : null}

        {activeTab === "history" ? <HistoryTab history={history} /> : null}

        {activeTab === "config" ? (
          <ConfigTab
            hiddenSlideIds={hiddenSlideIds}
            onHideSlide={handleHideSlide}
            onMoveSlide={handleMoveSlide}
            slides={slides}
          />
        ) : null}
      </div>

      <DataModelSummary />

      <section className="rounded-md border bg-muted p-4 text-sm leading-6 text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <XCircle className="size-4 text-red-600" />
          Regla antiredundancia
        </div>
        Fisioterapia responde como presenta la gerente el resultado mensual,
        que explica, que propone y que necesita decidir direccion. Los analisis
        completos de finanzas, capacidad, profesionales, servicios, sucursales y
        gerentes siguen en sus modulos dedicados.
      </section>
    </section>
  );
}
