"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Filter,
  GitBranch,
  ImagePlus,
  LineChart,
  MonitorUp,
  PieChart,
  RadioTower,
  ShieldCheck,
  Stethoscope,
  Target,
  TrendingUp,
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
  buildImagingMetrics,
  buildImagingSlides,
  buildImagingTrendChart,
  imagingBranchRecords,
  type ImagingBranchRecord,
  type ImagingMetric,
  type ImagingMetricGroup,
  type ImagingSlideStatus,
  type ImagingSourceStatus,
  type ImagingValidationStatus,
} from "@/lib/analytics/imaging";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
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

type ImagingFilters = {
  branch: string;
  manager: string;
  source: string;
  validation: string;
};

const metricGroups: ImagingMetricGroup[] = [
  "Validacion",
  "Resultado",
  "Volumen",
  "Telemedicina",
  "Modalidades",
  "Riesgo",
];

const metricGroupLabels: Record<ImagingMetricGroup, string> = {
  Modalidades: "Modalidades y portafolio",
  Resultado: "Resultado ejecutivo",
  Riesgo: "Fuentes pendientes",
  Telemedicina: "Telemedicina y canales",
  Validacion: "Estado de plantilla",
  Volumen: "Pacientes, ordenes y estudios",
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

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function createDefaultFilters(): ImagingFilters {
  return {
    branch: allOption,
    manager: allOption,
    source: allOption,
    validation: allOption,
  };
}

function uniqueOptions(values: string[]) {
  return [allOption, ...Array.from(new Set(values)).sort()];
}

function metricToneClass(tone: ImagingMetric["tone"]) {
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

function validationClass(status: ImagingValidationStatus) {
  if (status === "Listo para presentar") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Bloqueado por plantilla") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function sourceClass(status: ImagingSourceStatus) {
  if (status === "Disponible") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function slideStatusClass(status: ImagingSlideStatus) {
  if (status === "Listo") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Decision CEO") {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  }

  if (status === "Bloqueado") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (status === "Pendiente de fuente") {
    return "bg-slate-100 text-slate-700 hover:bg-slate-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
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
        Vista activa de Imagenes
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.businessLineName ?? context?.companyName ?? "Consolidado"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>Selector global: {lineSlug}</span>
        <span>Periodo global: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

function FieldSelect({
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
    <label className="grid gap-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <select
        className="h-10 min-w-0 rounded-md border bg-card px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
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

function ImagingFiltersPanel({
  filters,
  onChange,
  records,
}: {
  filters: ImagingFilters;
  onChange: (filters: ImagingFilters) => void;
  records: ImagingBranchRecord[];
}) {
  function updateFilter(key: keyof ImagingFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de la pantalla
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FieldSelect
          label="Sucursal"
          onChange={(value) => updateFilter("branch", value)}
          options={uniqueOptions(records.map((record) => record.branch))}
          value={filters.branch}
        />
        <FieldSelect
          label="Gerente"
          onChange={(value) => updateFilter("manager", value)}
          options={uniqueOptions(records.map((record) => record.manager))}
          value={filters.manager}
        />
        <FieldSelect
          label="Estado de validacion"
          onChange={(value) => updateFilter("validation", value)}
          options={uniqueOptions(records.map((record) => record.validationStatus))}
          value={filters.validation}
        />
        <FieldSelect
          label="Fuente critica"
          onChange={(value) => updateFilter("source", value)}
          options={uniqueOptions(
            records.flatMap((record) => [
              record.capacityStatus,
              record.reportsStatus,
              record.qualityStatus,
            ]),
          )}
          value={filters.source}
        />
      </div>
    </section>
  );
}

function GroupedMetrics({ metrics }: { metrics: ImagingMetric[] }) {
  return (
    <div className="grid gap-4">
      {metricGroups.map((group) => {
        const groupMetrics = metrics.filter((metric) => metric.group === group);

        return (
          <section className="grid gap-3" key={group}>
            <div className="text-sm font-semibold tracking-normal">
              {metricGroupLabels[group]}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {groupMetrics.map((metric) => (
                <article
                  className={cn("rounded-md border p-4", metricToneClass(metric.tone))}
                  key={`${metric.group}-${metric.label}`}
                >
                  <div className="text-xs font-medium uppercase tracking-normal opacity-80">
                    {metric.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-normal">
                    {metric.value}
                  </div>
                  <p className="mt-1 text-xs leading-5 opacity-85">
                    {metric.note}
                  </p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ExecutiveStory({ record }: { record: ImagingBranchRecord }) {
  const story = [
    {
      icon: BadgeDollarSign,
      label: "Resultado",
      note: `${formatRate(record.revenueCompletionRate)} de meta`,
      value: formatCurrency(record.revenue),
    },
    {
      icon: UsersRound,
      label: "Clientes",
      note: "unidad comercial de plantilla",
      value: record.clients.toLocaleString("en-US"),
    },
    {
      icon: ClipboardList,
      label: "Ordenes",
      note: `${record.ordersPerClient.toFixed(2)} por cliente`,
      value: record.orders.toLocaleString("en-US"),
    },
    {
      icon: ImagePlus,
      label: "Estudios",
      note: `${record.studiesPerOrder.toFixed(2)} por orden`,
      value: record.studies.toLocaleString("en-US"),
    },
    {
      icon: MonitorUp,
      label: "Telemedicina",
      note: `${formatRate(record.telemedicineRevenueGrowthRate)} crecimiento`,
      value: formatCurrency(record.telemedicineRevenue),
    },
    {
      icon: RadioTower,
      label: "Canal medico",
      note: `${formatRate(record.medicalTicketChangeRate)} ticket`,
      value: formatCurrency(record.medicalRevenue),
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <GitBranch className="size-4 text-primary" />
            Narrativa ejecutiva de Imagenes
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            La historia correcta es resultado del mes, volumen real, Telemedicina,
            modalidades, canal medico, informes, capacidad, calidad y decisiones.
          </p>
        </div>
        <Badge className={validationClass(record.validationStatus)}>
          {record.validationStatus}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {story.map((item) => {
          const Icon = item.icon;

          return (
            <article className="rounded-md border bg-background p-3" key={item.label}>
              <div className="mb-3 flex size-9 items-center justify-center rounded-md border bg-card">
                <Icon className="size-4 text-primary" />
              </div>
              <div className="text-xl font-semibold tracking-normal">
                {item.value}
              </div>
              <div className="mt-1 text-sm font-medium">{item.label}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {item.note}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ValidationPanel({ record }: { record: ImagingBranchRecord }) {
  const sourceItems = [
    { label: "Capacidad y equipos", value: record.capacityStatus },
    { label: "Informes y SLA", value: record.reportsStatus },
    { label: "Calidad tecnica", value: record.qualityStatus },
    { label: "Pacientes unicos", value: record.patientIdentityStatus },
    { label: "Margen Telemedicina", value: record.telemedicineMarginStatus },
  ];

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-primary" />
            Validacion antes de presentar
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            La presentacion oficial se bloquea si hay formulas rotas, utilidad
            no conciliada o fuentes criticas pendientes.
          </p>
        </div>
        <Badge className={validationClass(record.validationStatus)}>
          {record.validationStatus}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Archivo fuente
          </div>
          <div className="mt-2 text-sm font-medium">{record.fileName}</div>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
            <span>Periodo detectado: {record.detectedPeriod}</span>
            <span>Periodo seleccionado: {record.selectedPeriod}</span>
            <span>Carga: {record.uploadDate}</span>
            <span>Cierre: {record.closeDate}</span>
          </div>
        </article>
        <article className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Calidad de datos
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold tracking-normal">
              {record.dataQualityScore}
            </span>
            <span className="pb-1 text-xs text-muted-foreground">/ 100</span>
          </div>
          <ProgressBar
            color={
              record.dataQualityScore >= 84
                ? "bg-emerald-600"
                : record.dataQualityScore >= 72
                  ? "bg-amber-500"
                  : "bg-red-600"
            }
            value={record.dataQualityScore}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {record.formulaErrors.map((error) => (
              <Badge
                className="bg-red-100 text-red-800 hover:bg-red-100"
                key={error}
              >
                {error}
              </Badge>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-3">
        {record.validationFindings.map((finding) => (
          <div
            className="flex items-start gap-2 rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground"
            key={finding}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>{finding}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {sourceItems.map((item) => (
          <div className="rounded-md border bg-background p-3" key={item.label}>
            <div className="text-xs font-medium text-muted-foreground">
              {item.label}
            </div>
            <Badge className={cn("mt-2", sourceClass(item.value))}>
              {item.value}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConceptDefinitions() {
  const concepts = [
    {
      label: "Clientes",
      text: "unidad visible en la plantilla; no siempre equivale a paciente unico.",
    },
    {
      label: "Ordenes",
      text: "solicitudes o documentos que agrupan uno o varios estudios.",
    },
    {
      label: "Estudios",
      text: "procedimientos realizados; pueden ser mas que las ordenes.",
    },
    {
      label: "Telemedicina",
      text: "pendiente de definicion formal: procedencia, canal, lectura remota o venta de terceros.",
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <FileSpreadsheet className="size-4 text-primary" />
        Diccionario obligatorio de unidades
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {concepts.map((concept) => (
          <article className="rounded-md border bg-background p-3" key={concept.label}>
            <div className="text-sm font-medium">{concept.label}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {concept.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SegmentComparison({ record }: { record: ImagingBranchRecord }) {
  const total = Math.max(record.revenue, 1);
  const segments = [
    {
      color: "bg-blue-600",
      growth: record.telemedicineRevenueGrowthRate,
      label: "Telemedicina",
      note: "procedencia o modelo de atencion",
      value: record.telemedicineRevenue,
    },
    {
      color: "bg-emerald-600",
      growth: record.directGrowthRate,
      label: "No Telemedicina",
      note: "atencion directa",
      value: record.directRevenue,
    },
  ];

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <MonitorUp className="size-4 text-primary" />
        Telemedicina versus atencion directa
      </div>
      <div className="grid gap-4">
        <div className="flex h-8 overflow-hidden rounded-md bg-muted">
          {segments.map((segment) => (
            <div
              className={cn("h-8", segment.color)}
              key={segment.label}
              style={{ width: `${Math.max(4, (segment.value / total) * 100)}%` }}
              title={`${segment.label}: ${formatCurrency(segment.value)}`}
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {segments.map((segment) => (
            <article className="rounded-md border bg-background p-3" key={segment.label}>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className={cn("size-2.5 rounded-full", segment.color)} />
                {segment.label}
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-normal">
                {formatCurrency(segment.value)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatRate(segment.growth)} crecimiento mensual
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {segment.note}
              </p>
            </article>
          ))}
        </div>
        <div className="rounded-md border bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Telemedicina no debe ser tratada como modalidad. Primero debe quedar
          definida como procedencia, canal comercial, lectura remota o venta
          atribuida a terceros.
        </div>
      </div>
    </section>
  );
}

function ModalityMix({ record }: { record: ImagingBranchRecord }) {
  const maxRevenue = Math.max(...record.modalityRecords.map((item) => item.revenue), 1);
  const maxQuantity = Math.max(...record.modalityRecords.map((item) => item.quantity), 1);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <PieChart className="size-4 text-primary" />
        Mezcla de modalidades
      </div>
      <div className="grid gap-4">
        {record.modalityRecords.map((item) => (
          <article className="grid gap-3 rounded-md border bg-background p-3" key={item.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.quantity.toLocaleString("en-US")} estudios, ticket{" "}
                  {formatCurrency(item.ticket)}
                </div>
              </div>
              <Badge variant="outline">{formatPercent(item.revenueShare)} venta</Badge>
            </div>
            <div className="grid gap-2">
              <div className="grid gap-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Venta</span>
                  <span>{formatCurrency(item.revenue)}</span>
                </div>
                <ProgressBar
                  color="bg-blue-600"
                  value={(item.revenue / maxRevenue) * 100}
                />
              </div>
              <div className="grid gap-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Cantidad</span>
                  <span>{item.quantity.toLocaleString("en-US")}</span>
                </div>
                <ProgressBar
                  color="bg-emerald-600"
                  value={(item.quantity / maxQuantity) * 100}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PortfolioPareto({ record }: { record: ImagingBranchRecord }) {
  const totalRevenue = Math.max(
    record.topStudies.reduce((sum, item) => sum + item.revenue, 0),
    1,
  );
  let cumulativeRevenue = 0;

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4 text-primary" />
            Portafolio 80/20 por estudio
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Los diez estudios principales explican{" "}
            {formatPercent(record.top10RevenueConcentration)} de la facturacion.
          </p>
        </div>
        <Badge variant="outline">Pasa encima para ver venta exacta</Badge>
      </div>

      <div className="grid gap-3">
        {record.topStudies.map((study) => {
          cumulativeRevenue += study.revenue;
          const share = (study.revenue / totalRevenue) * 100;
          const cumulativeShare = (cumulativeRevenue / totalRevenue) * 100;

          return (
            <article
              className="grid gap-2 rounded-md border bg-background p-3"
              key={study.name}
              title={`${study.name}: ${formatCurrency(study.revenue)}, ${study.quantity} estudios`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-medium">{study.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {study.modality} - {study.category}
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(study.revenue)}
                </div>
              </div>
              <div className="grid gap-1">
                <ProgressBar color="bg-primary" value={share} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{share.toFixed(1)}% del top</span>
                  <span>{cumulativeShare.toFixed(1)}% acumulado</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MedicalChannel({ record }: { record: ImagingBranchRecord }) {
  const maxSpecialtyRevenue = Math.max(
    ...record.specialties.map((item) => item.revenue),
    1,
  );
  const maxVisitorRevenue = Math.max(...record.visitors.map((item) => item.revenue), 1);

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="min-w-0 rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Stethoscope className="size-4 text-primary" />
          Especialidades medicas
        </div>
        <div className="grid gap-3">
          {record.specialties.map((item) => (
            <article className="grid gap-2 rounded-md border bg-background p-3" key={item.name}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.orders} ordenes, {item.activeDoctors} medicos activos
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold">
                  {formatCurrency(item.revenue)}
                </div>
              </div>
              <ProgressBar
                color="bg-cyan-600"
                value={(item.revenue / maxSpecialtyRevenue) * 100}
              />
              <div className="text-xs text-muted-foreground">
                Estudio clave: {item.keyStudy}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="min-w-0 rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <RadioTower className="size-4 text-primary" />
          Visitadores medicos
        </div>
        <div className="grid gap-3">
          {record.visitors.map((item) => (
            <article className="grid gap-2 rounded-md border bg-background p-3" key={item.name}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.medicalOrders} ordenes, {item.activeDoctors} medicos
                  </div>
                </div>
                <Badge
                  className={
                    item.status === "Concentrado"
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                      : item.status === "Reactivar cartera"
                        ? "bg-red-100 text-red-800 hover:bg-red-100"
                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  }
                >
                  {item.status}
                </Badge>
              </div>
              <ProgressBar
                color="bg-orange-500"
                value={(item.revenue / maxVisitorRevenue) * 100}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(item.revenue)}</span>
                <span>{formatPercent(item.portfolioShare)} cartera</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PendingOperationalSources({ record }: { record: ImagingBranchRecord }) {
  const pendingBlocks = [
    {
      icon: CalendarClock,
      label: "Demanda temporal",
      text: "Estudios por dia, hora, no-show, cancelaciones, lista de espera y proxima cita.",
    },
    {
      icon: ImagePlus,
      label: "Capacidad y equipos",
      text: "Equipos activos, horas disponibles, utilizacion, tiempo detenido y mantenimiento.",
    },
    {
      icon: LineChart,
      label: "Informes y SLA",
      text: "Estudio -> informe -> entrega, antiguedad de pendientes y tiempo de lectura.",
    },
    {
      icon: ShieldCheck,
      label: "Calidad tecnica",
      text: "Repeticiones, protocolos, incidentes, contraste, reclamos y satisfaccion.",
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-amber-600" />
            Indicadores que quedan pendientes de fuente
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Estos bloques no muestran numeros inventados. Se activan cuando haya
            agenda, PACS/RIS, mantenimiento y registros de calidad.
          </p>
        </div>
        <Badge variant="outline">{record.pendingSources.length} fuentes</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {pendingBlocks.map((item) => {
          const Icon = item.icon;

          return (
            <article className="rounded-md border border-dashed bg-muted/40 p-4" key={item.label}>
              <div className="mb-3 flex size-9 items-center justify-center rounded-md border bg-card">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">{item.label}</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {item.text}
              </p>
              <Badge className="mt-3 bg-slate-100 text-slate-700 hover:bg-slate-100">
                Pendiente de conexion
              </Badge>
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2">
        {record.pendingSources.map((source) => (
          <div
            className="rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground"
            key={source}
          >
            {source}
          </div>
        ))}
      </div>
    </section>
  );
}

function StaffingAndFinance({ record }: { record: ImagingBranchRecord }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <UsersRound className="size-4 text-primary" />
          Personal y cobertura
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Total calculado
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {record.staffingDetail.calculatedTotal}
            </div>
          </article>
          <article className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Total hoja principal
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {record.staffingDetail.mainSheetTotal}
            </div>
          </article>
          <article className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Licenciados
            </div>
            <div className="mt-2 text-xl font-semibold">
              {record.staffingDetail.licensees}
            </div>
          </article>
          <article className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Medicos
            </div>
            <div className="mt-2 text-xl font-semibold">
              {record.staffingDetail.doctors}
            </div>
          </article>
        </div>
        <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
          No se debe usar solo cantidad de personas para productividad. Faltan
          horas contratadas, cobertura por turno, tecnicos por modalidad y
          capacidad de lectura.
        </div>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <BadgeDollarSign className="size-4 text-primary" />
          Resumen financiero operativo
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">Venta</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatCurrency(record.revenue)}
            </div>
          </article>
          <article className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">Meta</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatCurrency(record.revenueTarget)}
            </div>
          </article>
          <article className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Utilidad
            </div>
            <div className="mt-2 text-xl font-semibold">Pendiente</div>
          </article>
          <article className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Conciliacion
            </div>
            <div className="mt-2 text-sm font-semibold">
              {record.financeConciliationStatus}
            </div>
          </article>
        </div>
        <div className="mt-3 rounded-md border bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          La utilidad queda pendiente porque faltan gastos importantes como
          personal, ISSS/AFP y otros gastos. Ver detalle en Salud financiera.
        </div>
      </div>
    </section>
  );
}

function BranchComparisonTable({
  onSelect,
  records,
  selectedId,
}: {
  onSelect: (id: string) => void;
  records: ImagingBranchRecord[];
  selectedId: string | null;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <ClipboardList className="size-4 text-primary" />
        Sucursales de Imagenes
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <thead className="text-xs uppercase tracking-normal text-muted-foreground">
            <tr className="border-b">
              <th className="py-3 pr-3 font-medium">Sucursal</th>
              <th className="px-3 py-3 font-medium">Gerente</th>
              <th className="px-3 py-3 text-right font-medium">Venta</th>
              <th className="px-3 py-3 text-right font-medium">Meta</th>
              <th className="px-3 py-3 text-right font-medium">Ordenes</th>
              <th className="px-3 py-3 text-right font-medium">Estudios</th>
              <th className="px-3 py-3 text-right font-medium">Ticket</th>
              <th className="px-3 py-3 text-right font-medium">Telemedicina</th>
              <th className="px-3 py-3 text-right font-medium">Canal medico</th>
              <th className="px-3 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                className={cn(
                  "border-b last:border-0",
                  selectedId === record.id ? "bg-muted/60" : "",
                )}
                key={record.id}
              >
                <td className="py-3 pr-3">
                  <button
                    className="text-left font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => onSelect(record.id)}
                    type="button"
                  >
                    {record.branch}
                  </button>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {record.manager}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.revenue)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.revenueTarget)}
                </td>
                <td className="px-3 py-3 text-right">
                  {record.orders.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-3 text-right">
                  {record.studies.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.ticketPerOrder)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.telemedicineRevenue)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.medicalRevenue)}
                </td>
                <td className="px-3 py-3">
                  <Badge className={validationClass(record.validationStatus)}>
                    {record.validationStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SlideDeck({ record }: { record: ImagingBranchRecord }) {
  const slides = buildImagingSlides(record);

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileSpreadsheet className="size-4 text-primary" />
            Estructura de presentacion mensual
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Las veinte slides conectan resultado, estudios, Telemedicina, canal
            medico, capacidad, informes, calidad, explicaciones y decisiones.
          </p>
        </div>
        <Badge variant="outline">{slides.length} slides</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {slides.map((slide) => (
          <article className="rounded-md border bg-background p-4" key={slide.id}>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="text-sm font-semibold tracking-normal">
                {slide.title}
              </h3>
              <Badge className={slideStatusClass(slide.status)}>
                {slide.status}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {slide.narrative}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {slide.kpis.map((kpi) => (
                <div className="rounded-md border bg-card p-2" key={kpi.label}>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {kpi.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{kpi.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-foreground">Evidencia: </span>
              {slide.evidence}
            </div>
            <div className="mt-2 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              <span className="font-medium text-foreground">Siguiente paso: </span>
              {slide.action}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActionPlanAndDecisions({ record }: { record: ImagingBranchRecord }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Target className="size-4 text-primary" />
          Plan de accion obligatorio
        </div>
        <div className="grid gap-3">
          {record.actionPlan.map((item) => (
            <article className="rounded-md border bg-background p-3" key={item.action}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-medium">{item.action}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.expectedImpact}
                  </p>
                </div>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span>Responsable: {item.owner}</span>
                <span>Fecha: {item.dueDate}</span>
                <span>KPI: {item.kpi}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="size-4 text-primary" />
            Decisiones requeridas al CEO
          </div>
          <div className="grid gap-3">
            {record.requiredDecisions.map((item) => (
              <article
                className="rounded-md border bg-background p-3"
                key={item.decision}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="text-sm font-medium">{item.decision}</div>
                  <Badge
                    className={
                      item.urgency === "Alta"
                        ? "bg-red-100 text-red-800 hover:bg-red-100"
                        : item.urgency === "Media"
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                    }
                  >
                    {item.urgency}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
                  <span>Problema: {item.problem}</span>
                  <span>Evidencia: {item.evidence}</span>
                  <span>Costo: {item.cost}</span>
                  <span>Beneficio: {item.benefit}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-amber-600" />
            Explicaciones de la gerente
          </div>
          <div className="grid gap-2">
            {record.managerExplanationRequired.map((item) => (
              <div
                className="rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NoData() {
  return (
    <section className="rounded-md border bg-card p-6 text-sm leading-6 text-muted-foreground">
      No hay datos de Imagenes para los filtros seleccionados.
    </section>
  );
}

export function ImagingPresentationDashboard() {
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
  const contextRecords = useMemo(() => {
    const branchName = context?.branchName;

    if (!branchName || /^Todas/i.test(branchName)) {
      return imagingBranchRecords;
    }

    const narrowed = imagingBranchRecords.filter(
      (record) =>
        record.branch === branchName ||
        record.branch.includes(branchName) ||
        branchName.includes(record.branch),
    );

    return narrowed.length > 0 ? narrowed : imagingBranchRecords;
  }, [context?.branchName]);
  const filteredRecords = useMemo(
    () =>
      contextRecords.filter(
        (record) =>
          (filters.branch === allOption || record.branch === filters.branch) &&
          (filters.manager === allOption || record.manager === filters.manager) &&
          (filters.validation === allOption ||
            record.validationStatus === filters.validation) &&
          (filters.source === allOption ||
            record.capacityStatus === filters.source ||
            record.reportsStatus === filters.source ||
            record.qualityStatus === filters.source),
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
  const metrics = useMemo(
    () => buildImagingMetrics(filteredRecords),
    [filteredRecords],
  );
  const trendChart = useMemo(
    () => buildImagingTrendChart(filteredRecords),
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
              <ImagePlus className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Imagenes
              </h1>
              <p className="text-sm text-muted-foreground">
                Presentacion gerencial mensual por estudios, modalidades,
                Telemedicina y canal medico.
              </p>
            </div>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            Esta seccion explica que estudios movieron el negocio, quien genero
            demanda, que portafolio concentra la venta, que fuentes faltan y que
            decisiones debe tomar direccion. Los indicadores sin fuente quedan
            como pendientes, no como numeros simulados.
          </p>
        </div>
        <ScopeCard context={context} lineSlug={lineSlug} />
      </div>

      <ImagingFiltersPanel
        filters={filters}
        onChange={setFilters}
        records={contextRecords}
      />

      <section className="grid gap-3 rounded-md border bg-card p-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-normal">
            Lectura tecnica de Imagenes
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Estudios, modalidad, utilizacion de equipo, tiempos, informes
            pendientes, downtime, ingresos, margen y productividad se tratan
            como operacion tecnica; los campos sin RIS/PACS quedan pendientes.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Estudios", selectedRecord?.studies.toLocaleString("en-US") ?? "Sin datos"],
            ["Modalidad", selectedRecord?.topModality ?? "Sin datos"],
            ["Utilizacion equipo", selectedRecord?.capacityStatus ?? "Pendiente"],
            ["Tiempos", selectedRecord?.reportsStatus ?? "Pendiente RIS/PACS"],
            ["Informes pendientes", selectedRecord?.reportsStatus ?? "Pendiente RIS/PACS"],
            ["Downtime", selectedRecord?.capacityStatus ?? "Pendiente equipos"],
            [
              "Ingresos",
              selectedRecord ? formatCurrency(selectedRecord.revenue) : "Sin datos",
            ],
            [
              "Margen",
              selectedRecord?.financeConciliationStatus ?? "Pendiente conciliacion",
            ],
            [
              "Productividad",
              selectedRecord?.staffingStatus ?? "Pendiente horas y turnos",
            ],
            ["Calidad", selectedRecord ? `${selectedRecord.dataQualityScore}%` : "Sin datos"],
          ].map(([label, value]) => (
            <article className="rounded-md border bg-background p-3" key={label}>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 text-base font-semibold">{value}</div>
            </article>
          ))}
        </div>
      </section>

      <ReadableTabs
        tabs={[
          {
            id: "resumen-imagenes",
            label: "Resumen",
            description: "KPIs e historia ejecutiva.",
            children: selectedRecord ? (
              <>
                <GroupedMetrics metrics={metrics} />
                <ExecutiveStory record={selectedRecord} />
              </>
            ) : (
              <NoData />
            ),
          },
          {
            id: "validacion-imagenes",
            label: "Validacion y tendencia",
            description: "Fuentes, segmentos y comparacion.",
            children: selectedRecord ? (
              <>
                <div className="grid min-w-0 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <ValidationPanel record={selectedRecord} />
                  <SegmentComparison record={selectedRecord} />
                </div>
                <ConceptDefinitions />
                <AnalyticsComparisonChart
                  description={trendChart.description}
                  enableSeriesSelection
                  insights={trendChart.insights}
                  maxSelectableSeries={5}
                  metricOptions={trendChart.metricOptions}
                  series={trendChart.series}
                  seriesSelectionHint="Elige hasta cinco sucursales para comparar venta, ordenes, estudios, Telemedicina, canal medico o ticket."
                  seriesSelectorLabel="Sucursales a comparar"
                  title={trendChart.title}
                  xLabels={trendChart.xLabels}
                  yLabel={trendChart.yLabel}
                />
              </>
            ) : (
              <NoData />
            ),
          },
          {
            id: "operacion-imagenes",
            label: "Operacion",
            description: "Modalidades, canal medico y fuentes.",
            children: selectedRecord ? (
              <>
                <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                  <ModalityMix record={selectedRecord} />
                  <PortfolioPareto record={selectedRecord} />
                </div>
                <MedicalChannel record={selectedRecord} />
                <PendingOperationalSources record={selectedRecord} />
                <StaffingAndFinance record={selectedRecord} />
              </>
            ) : (
              <NoData />
            ),
          },
          {
            id: "decisiones-imagenes",
            label: "Sucursales y decisiones",
            description: "Comparativo, planillas y accion.",
            children: selectedRecord ? (
              <>
                <BranchComparisonTable
                  onSelect={setSelectedId}
                  records={filteredRecords}
                  selectedId={selectedRecord.id}
                />
                <SlideDeck record={selectedRecord} />
                <ActionPlanAndDecisions record={selectedRecord} />
                <section className="rounded-md border bg-muted p-4 text-sm leading-6 text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <LineChart className="size-4 text-primary" />
                    Regla de lectura
                  </div>
                  <p>
                    Imagenes no debe reciclar las graficas de Laboratorio o
                    Fisioterapia. Su historia ejecutiva conecta resultado,
                    ordenes, estudios, Telemedicina, modalidades, canal medico,
                    informes, equipos, calidad y decisiones de direccion.
                  </p>
                </section>
              </>
            ) : (
              <NoData />
            ),
          },
        ]}
      />
    </section>
  );
}
