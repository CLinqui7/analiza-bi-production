"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  GitBranch,
  LineChart,
  PackageSearch,
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
  buildLaboratoryMetrics,
  buildLaboratorySlides,
  buildLaboratoryTrendChart,
  laboratoryBranchRecords,
  type LaboratoryBranchRecord,
  type LaboratoryMetric,
  type LaboratoryMetricGroup,
  type LaboratorySlideStatus,
  type LaboratoryValidationStatus,
} from "@/lib/analytics/laboratory";
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

type LaboratoryFilters = {
  branch: string;
  manager: string;
  validation: string;
};

const metricGroups: LaboratoryMetricGroup[] = [
  "Validacion",
  "Resultado",
  "Finanzas",
  "Volumen",
  "Canales",
  "Riesgo",
];

const metricGroupLabels: Record<LaboratoryMetricGroup, string> = {
  Canales: "Canales y medicos",
  Finanzas: "Costos, margen y utilidad",
  Resultado: "Resultado ejecutivo",
  Riesgo: "Riesgos operativos",
  Validacion: "Estado de plantilla",
  Volumen: "Ordenes, clientes y ticket",
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

function createDefaultFilters(): LaboratoryFilters {
  return {
    branch: allOption,
    manager: allOption,
    validation: allOption,
  };
}

function uniqueOptions(values: string[]) {
  return [allOption, ...Array.from(new Set(values)).sort()];
}

function metricToneClass(tone: LaboratoryMetric["tone"]) {
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

function validationClass(status: LaboratoryValidationStatus) {
  if (status === "Validado") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Bloqueado") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function slideStatusClass(status: LaboratorySlideStatus) {
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
        Vista activa de Laboratorio
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

function LaboratoryFiltersPanel({
  filters,
  onChange,
  records,
}: {
  filters: LaboratoryFilters;
  onChange: (filters: LaboratoryFilters) => void;
  records: LaboratoryBranchRecord[];
}) {
  function updateFilter(key: keyof LaboratoryFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de la pantalla
      </div>
      <div className="grid gap-3 md:grid-cols-3">
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
      </div>
    </section>
  );
}

function GroupedMetrics({ metrics }: { metrics: LaboratoryMetric[] }) {
  return (
    <div className="grid gap-4">
      {metricGroups.map((group) => {
        const groupMetrics = metrics.filter((metric) => metric.group === group);

        return (
          <section className="grid gap-3" key={group}>
            <div className="text-sm font-semibold tracking-normal">
              {metricGroupLabels[group]}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

function ExecutiveStory({ record }: { record: LaboratoryBranchRecord }) {
  const story = [
    {
      icon: UsersRound,
      label: "Pacientes y canales",
      note: "Analiza, DRSV y ordenes medicas",
      value: record.clients.toLocaleString("en-US"),
    },
    {
      icon: ClipboardList,
      label: "Ordenes",
      note: `${formatRate(record.orderGrowthRate)} vs mes anterior`,
      value: record.orders.toLocaleString("en-US"),
    },
    {
      icon: BadgeDollarSign,
      label: "Venta",
      note: `${formatRate(record.revenueCompletionTotalRate)} de meta total`,
      value: formatCurrency(record.actualRevenue),
    },
    {
      icon: DatabaseZap,
      label: "Costos",
      note: "costo de venta",
      value: formatCurrency(record.costOfSale),
    },
    {
      icon: BarChart3,
      label: "Margen",
      note: "antes de gastos",
      value: formatRate(record.marginRate),
    },
    {
      icon: PackageSearch,
      label: "Inventario",
      note: `${formatRate(record.reactiveGrowthRate)} reactivos`,
      value: formatCurrency(record.inventoryTotalAmount),
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <GitBranch className="size-4 text-primary" />
            Narrativa ejecutiva de Laboratorio
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Laboratorio debe contar pacientes y canales, ordenes, venta, costos,
            margen, medicos, demanda horaria, inventario y acciones gerenciales.
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

function ValidationPanel({ record }: { record: LaboratoryBranchRecord }) {
  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-primary" />
            Validacion antes de presentar
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Si Evaluacion, YTD y datos fuente no cuadran, la version oficial
            queda bloqueada o requiere confirmacion.
          </p>
        </div>
        <Badge className={validationClass(record.validationStatus)}>
          {record.validationStatus}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Archivo y periodo
          </div>
          <div className="mt-2 text-sm font-medium">{record.fileName}</div>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
            <span>Archivo: {record.filePeriod}</span>
            <span>Hoja Evaluacion: {record.workbookPeriod}</span>
            <span>Ventas: {record.salesPeriod}</span>
            <span>Version: {record.presentationVersion}</span>
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
                : record.dataQualityScore >= 74
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
        {record.validationFindings.slice(0, 5).map((finding) => (
          <div
            className="flex items-start gap-2 rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground"
            key={finding}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>{finding}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinancialWaterfall({ record }: { record: LaboratoryBranchRecord }) {
  const bars = [
    { color: "bg-blue-600", label: "Venta", value: record.actualRevenue },
    { color: "bg-amber-500", label: "Costo", value: record.costOfSale },
    { color: "bg-orange-500", label: "Gastos", value: record.operatingExpenses },
    { color: "bg-emerald-600", label: "Utilidad", value: Math.max(record.operatingProfit, 0) },
  ];
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <BadgeDollarSign className="size-4 text-primary" />
        Resultado financiero resumido
      </div>
      <div className="grid gap-3">
        {bars.map((bar) => (
          <div className="grid gap-2" key={bar.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{bar.label}</span>
              <span className="font-semibold">{formatCurrency(bar.value)}</span>
            </div>
            <ProgressBar color={bar.color} value={(bar.value / maxValue) * 100} />
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
        Salud financiera conserva el detalle completo. Aqui solo se muestra la
        lectura ejecutiva necesaria para explicar resultado de sucursal.
      </div>
    </section>
  );
}

function ChannelMix({ record }: { record: LaboratoryBranchRecord }) {
  const saleTotal = Math.max(record.analyzeRevenue + record.drsvRevenue, 1);
  const orderTotal = Math.max(record.analyzeOrders + record.drsvOrders, 1);
  const channels = [
    {
      color: "bg-blue-600",
      label: "Analiza",
      orders: record.analyzeOrders,
      revenue: record.analyzeRevenue,
    },
    {
      color: "bg-emerald-600",
      label: "Doctor SV / DRSV",
      orders: record.drsvOrders,
      revenue: record.drsvRevenue,
    },
  ];

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <RadioTower className="size-4 text-primary" />
        Mezcla de canales
      </div>
      <div className="grid gap-4">
        {channels.map((channel) => (
          <article className="grid gap-3 rounded-md border bg-background p-3" key={channel.label}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-medium">{channel.label}</div>
                <div className="text-xs text-muted-foreground">
                  {channel.orders.toLocaleString("en-US")} ordenes
                </div>
              </div>
              <div className="text-sm font-semibold">
                {formatCurrency(channel.revenue)}
              </div>
            </div>
            <div className="grid gap-2">
              <div className="grid gap-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Participacion venta</span>
                  <span>{formatRate(channel.revenue / saleTotal)}</span>
                </div>
                <ProgressBar
                  color={channel.color}
                  value={(channel.revenue / saleTotal) * 100}
                />
              </div>
              <div className="grid gap-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Participacion ordenes</span>
                  <span>{formatRate(channel.orders / orderTotal)}</span>
                </div>
                <ProgressBar
                  color="bg-amber-500"
                  value={(channel.orders / orderTotal) * 100}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 rounded-md border bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        La palabra ocupacion en Doctor SV debe cambiarse por participacion del
        canal, porque no mide capacidad utilizada.
      </div>
    </section>
  );
}

function DoctorsAndVisitors({ record }: { record: LaboratoryBranchRecord }) {
  const maxDoctorRevenue = Math.max(...record.doctors.map((item) => item.revenue), 1);
  const maxVisitorRevenue = Math.max(...record.visitors.map((item) => item.revenue), 1);

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="min-w-0 rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Stethoscope className="size-4 text-primary" />
          Canal medico
        </div>
        <div className="grid gap-3">
          {record.doctors.map((doctor) => (
            <article className="grid gap-2 rounded-md border bg-background p-3" key={doctor.name}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{doctor.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {doctor.specialty}, {doctor.municipality}
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold">
                  {formatCurrency(doctor.revenue)}
                </div>
              </div>
              <ProgressBar
                color="bg-cyan-600"
                value={(doctor.revenue / maxDoctorRevenue) * 100}
              />
              <div className="text-xs text-muted-foreground">
                {doctor.orders} ordenes, ticket {formatCurrency(doctor.ticket)}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="min-w-0 rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <UsersRound className="size-4 text-primary" />
          Visitadores medicos
        </div>
        <div className="grid gap-3">
          {record.visitors.map((visitor) => (
            <article className="grid gap-2 rounded-md border bg-background p-3" key={visitor.name}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-medium">{visitor.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {visitor.activeDoctors} medicos activos, {visitor.orders} ordenes
                  </div>
                </div>
                <Badge
                  className={
                    visitor.status === "Reactivar cartera"
                      ? "bg-red-100 text-red-800 hover:bg-red-100"
                      : visitor.status === "Cartera concentrada"
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  }
                >
                  {visitor.status}
                </Badge>
              </div>
              <ProgressBar
                color="bg-orange-500"
                value={(visitor.revenue / maxVisitorRevenue) * 100}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(visitor.revenue)}</span>
                <span>{formatRate(visitor.growthRate)} crecimiento</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function heatmapStyle(value: number) {
  if (value >= 88) {
    return { backgroundColor: "#dcfce7", color: "#166534" };
  }

  if (value >= 74) {
    return { backgroundColor: "#dbeafe", color: "#1e3a8a" };
  }

  if (value >= 58) {
    return { backgroundColor: "#fef3c7", color: "#92400e" };
  }

  return { backgroundColor: "#fee2e2", color: "#991b1b" };
}

function DemandAndInventory({ record }: { record: LaboratoryBranchRecord }) {
  const days = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
  const slots = ["6-7", "7-8", "8-9", "9-11", "11-13"];
  const inventory = [
    {
      color: "bg-blue-600",
      label: "Consumibles",
      qty: record.inventoryConsumablesQty,
      value: record.inventoryConsumablesAmount,
    },
    {
      color: "bg-emerald-600",
      label: "Insumos",
      qty: record.inventorySuppliesQty,
      value: record.inventorySuppliesAmount,
    },
    {
      color: "bg-amber-500",
      label: "Reactivos",
      qty: record.inventoryReactivesQty,
      value: record.inventoryReactivesAmount,
    },
  ];
  const maxInventory = Math.max(...inventory.map((item) => item.value), 1);

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="min-w-0 rounded-md border bg-card p-4">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="size-4 text-primary" />
              Demanda por dia y hora
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Cada celda muestra concentracion relativa de ordenes por franja.
            </p>
          </div>
          <Badge variant="outline">{record.peakHoursLabel}</Badge>
        </div>
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[560px] rounded-md border bg-background p-3">
            <div
              className="grid gap-2 text-xs"
              style={{
                gridTemplateColumns: `104px repeat(${slots.length}, minmax(72px, 1fr))`,
              }}
            >
              <div />
              {slots.map((slot) => (
                <div
                  className="text-center font-medium text-muted-foreground"
                  key={slot}
                >
                  {slot}
                </div>
              ))}
              {record.demandHeatmap.map((row, rowIndex) => (
                <div className="contents" key={days[rowIndex]}>
                  <div className="flex items-center font-medium">{days[rowIndex]}</div>
                  {row.map((value, columnIndex) => (
                    <div
                      className="flex h-12 items-center justify-center rounded-md border text-sm font-semibold"
                      key={`${days[rowIndex]}-${slots[columnIndex]}`}
                      style={heatmapStyle(value)}
                      title={`${days[rowIndex]} ${slots[columnIndex]}: ${value}% concentracion`}
                    >
                      {value}%
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <PackageSearch className="size-4 text-primary" />
          Inventario e insumos
        </div>
        <div className="grid gap-3">
          {inventory.map((item) => (
            <article className="grid gap-2 rounded-md border bg-background p-3" key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="font-semibold">{formatCurrency(item.value)}</span>
              </div>
              <ProgressBar color={item.color} value={(item.value / maxInventory) * 100} />
              <div className="text-xs text-muted-foreground">
                {item.qty.toLocaleString("en-US")} unidades
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-md border bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          No se afirma sobreinventario hasta tener consumo, rotacion,
          vencimientos, rendimiento teorico y compras urgentes.
        </div>
      </div>
    </section>
  );
}

function PendingSources({ record }: { record: LaboratoryBranchRecord }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-amber-600" />
        Indicadores pendientes de fuente
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {record.pendingSources.map((source) => (
          <article className="rounded-md border border-dashed bg-muted/40 p-3" key={source}>
            <div className="text-sm font-medium">Pendiente de fuente de datos</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {source}
            </p>
          </article>
        ))}
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
  records: LaboratoryBranchRecord[];
  selectedId: string | null;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <ClipboardList className="size-4 text-primary" />
        Sucursales de Laboratorio
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead className="text-xs uppercase tracking-normal text-muted-foreground">
            <tr className="border-b">
              <th className="py-3 pr-3 font-medium">Sucursal</th>
              <th className="px-3 py-3 font-medium">Gerente</th>
              <th className="px-3 py-3 text-right font-medium">Venta</th>
              <th className="px-3 py-3 text-right font-medium">Meta</th>
              <th className="px-3 py-3 text-right font-medium">Sin IVA</th>
              <th className="px-3 py-3 text-right font-medium">Ordenes</th>
              <th className="px-3 py-3 text-right font-medium">Ticket</th>
              <th className="px-3 py-3 text-right font-medium">Margen</th>
              <th className="px-3 py-3 text-right font-medium">Inventario</th>
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
                    {record.city}
                  </button>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {record.manager}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.actualRevenue)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.revenueTarget)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.netRevenue)}
                </td>
                <td className="px-3 py-3 text-right">
                  {record.orders.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.ticketAverage)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatRate(record.marginRate)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(record.inventoryTotalAmount)}
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

function SlideDeck({ record }: { record: LaboratoryBranchRecord }) {
  const slides = buildLaboratorySlides(record);

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileSpreadsheet className="size-4 text-primary" />
            Estructura de presentacion mensual
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Las quince slides nacen de la plantilla de resultados de sucursal,
            con validacion, narrativa, explicaciones, acciones y decisiones.
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

function ActionPlanAndDecisions({ record }: { record: LaboratoryBranchRecord }) {
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
      No hay datos de Laboratorio para los filtros seleccionados.
    </section>
  );
}

export function LaboratoryPresentationDashboard() {
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
      return laboratoryBranchRecords;
    }

    const narrowed = laboratoryBranchRecords.filter(
      (record) =>
        record.branch === branchName ||
        record.branch.includes(branchName) ||
        branchName.includes(record.city),
    );

    return narrowed.length > 0 ? narrowed : laboratoryBranchRecords;
  }, [context?.branchName]);
  const filteredRecords = useMemo(
    () =>
      contextRecords.filter(
        (record) =>
          (filters.branch === allOption || record.branch === filters.branch) &&
          (filters.manager === allOption || record.manager === filters.manager) &&
          (filters.validation === allOption ||
            record.validationStatus === filters.validation),
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
    () => buildLaboratoryMetrics(filteredRecords),
    [filteredRecords],
  );
  const trendChart = useMemo(
    () => buildLaboratoryTrendChart(filteredRecords),
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
              <FlaskConical className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Laboratorio
              </h1>
              <p className="text-sm text-muted-foreground">
                Presentacion ejecutiva mensual desde plantillas de sucursal.
              </p>
            </div>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            Esta es la estructura correcta para Laboratorio: resultado
            financiero, canales, medicos, visitadores, demanda horaria,
            inventario, validacion de datos, plan de accion y decisiones.
          </p>
        </div>
        <ScopeCard context={context} lineSlug={lineSlug} />
      </div>

      <LaboratoryFiltersPanel
        filters={filters}
        onChange={setFilters}
        records={contextRecords}
      />

      <section className="grid gap-3 rounded-md border bg-card p-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-normal">
            Lectura tecnica de Laboratorio
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Ordenes, pruebas, flujo de procesamiento, utilizacion, TAT, rechazo, reproceso,
            ingreso/prueba, costo/prueba y margen se muestran separados para no
            usar la semantica clinica de citas.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Ordenes", selectedRecord?.orders.toLocaleString("en-US") ?? "Sin datos"],
            ["Pruebas", "Pendiente LIS/API"],
            ["Throughput", selectedRecord ? `${selectedRecord.peakHoursLabel}` : "Sin datos"],
            ["Utilizacion", "Pendiente capacidad tecnica"],
            ["TAT", "Pendiente LIS/API"],
            ["Rechazo", "Pendiente control de muestra"],
            ["Reproceso", "Pendiente control de muestra"],
            [
              "Ingreso/prueba",
              selectedRecord ? formatCurrency(selectedRecord.ticketAverage) : "Sin datos",
            ],
            ["Costo/prueba", "Pendiente costo por prueba"],
            [
              "Margen",
              selectedRecord ? formatRate(selectedRecord.marginRate) : "Sin datos",
            ],
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
            id: "resumen-laboratorio",
            label: "Resumen",
            description: "KPIs y historia ejecutiva.",
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
            id: "finanzas-laboratorio",
            label: "Finanzas y datos",
            description: "Validacion, margen y tendencia.",
            children: selectedRecord ? (
              <>
                <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_1fr]">
                  <ValidationPanel record={selectedRecord} />
                  <FinancialWaterfall record={selectedRecord} />
                </div>
                <AnalyticsComparisonChart
                  description={trendChart.description}
                  enableSeriesSelection
                  insights={trendChart.insights}
                  maxSelectableSeries={5}
                  metricOptions={trendChart.metricOptions}
                  series={trendChart.series}
                  seriesSelectionHint="Elige hasta cinco sucursales para comparar venta, ordenes, clientes, ticket, canal medico, inventario o margen."
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
            id: "operacion-laboratorio",
            label: "Operacion",
            description: "Canales, demanda, inventario y fuentes.",
            children: selectedRecord ? (
              <>
                <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                  <ChannelMix record={selectedRecord} />
                  <DemandAndInventory record={selectedRecord} />
                </div>
                <DoctorsAndVisitors record={selectedRecord} />
                <PendingSources record={selectedRecord} />
              </>
            ) : (
              <NoData />
            ),
          },
          {
            id: "plan-laboratorio",
            label: "Sucursales y plan",
            description: "Comparativo, planillas y decisiones.",
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
                    Esta correccion deja Laboratorio con la presentacion que
                    nacia de las plantillas. Fisioterapia no debe usar esta
                    narrativa; su foco real queda en continuidad terapeutica,
                    citas, planes, abandono y resultados del paciente.
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
