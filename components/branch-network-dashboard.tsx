"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle2,
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
  globalContextChangeEvent as contextChangeEvent,
  globalContextStorageKey as storageKey,
  isAllFilterValue,
} from "@/lib/analytics/global-filters";
import {
  consolidatedCompanyId,
  regionalCountryId,
  roleKeys,
  type RoleKey,
} from "@/lib/tenant/demo-context";
import {
  fetchCurrentUserAccess,
  isBranchManagerScopedAccess,
  type CurrentUserAccess,
} from "@/lib/tenant/current-user-access";
import {
  branchScoreWeights,
  buildBranchTrendChart,
  getBranchNetworkScreen,
  type BranchNetworkMetric,
  type BranchNetworkRecord,
  type BranchStatus,
} from "@/lib/analytics/branch-network";
import { formatCurrency, formatRate } from "@/lib/analytics/el-salvador-result-templates";
import { cn } from "@/lib/utils";

const roleStorageKey = "analiza:demo-role";
const roleChangeEvent = "analiza:role-change";
const allOption = "Todos";

type AllowedBranchOption = {
  businessLineCode?: string;
  code?: string;
  companyId?: string;
  countryId?: string;
  id: string;
  name: string;
};

type ContextOptionsResponse = {
  ok?: boolean;
  options?: {
    branches?: AllowedBranchOption[];
  };
};

type StoredContext = {
  branchId?: string;
  countryId?: string;
  countryName?: string;
  companyId?: string;
  companyName?: string;
  businessLineCode?: string;
  businessLineId?: string;
  businessLineName?: string;
  branchName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo?: boolean;
};

type BranchFilters = {
  branch: string;
  region: string;
  manager: string;
  branchType: string;
  size: string;
  status: string;
  serviceMix: string;
  comparableGroup: string;
};

type SortKey =
  | "normalizedPerformanceScore"
  | "score"
  | "netSales"
  | "marginRate"
  | "patients"
  | "occupancyRate"
  | "slaRate"
  | "dataQuality";

const heatmapColumns: {
  key: SortKey | "growthRate" | "recurrenceRate";
  label: string;
  formatter: (record: BranchNetworkRecord) => string;
  value: (record: BranchNetworkRecord) => number;
}[] = [
  {
    key: "normalizedPerformanceScore",
    label: "Puntaje comp.",
    formatter: (record) => `${record.normalizedPerformanceScore}`,
    value: (record) => record.normalizedPerformanceScore,
  },
  {
    key: "netSales",
    label: "Venta",
    formatter: (record) => formatCurrency(record.netSales),
    value: (record) => Math.min(100, (record.netSales / 52000) * 100),
  },
  {
    key: "growthRate",
    label: "Crecimiento",
    formatter: (record) => formatRate(record.growthRate),
    value: (record) => Math.max(0, Math.min(100, 50 + record.growthRate * 250)),
  },
  {
    key: "marginRate",
    label: "Margen",
    formatter: (record) => formatRate(record.marginRate),
    value: (record) => record.marginRate * 100,
  },
  {
    key: "patients",
    label: "Pacientes",
    formatter: (record) => record.patients.toLocaleString("en-US"),
    value: (record) => Math.min(100, (record.patients / 22000) * 100),
  },
  {
    key: "recurrenceRate",
    label: "Recurrencia",
    formatter: (record) => formatRate(record.recurrenceRate),
    value: (record) => record.recurrenceRate * 100,
  },
  {
    key: "occupancyRate",
    label: "Ocupacion",
    formatter: (record) => formatRate(record.occupancyRate),
    value: (record) => record.occupancyRate * 100,
  },
  {
    key: "slaRate",
    label: "SLA",
    formatter: (record) => formatRate(record.slaRate),
    value: (record) => record.slaRate * 100,
  },
  {
    key: "dataQuality",
    label: "Datos",
    formatter: (record) => `${record.dataQuality}`,
    value: (record) => record.dataQuality,
  },
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

function readActiveDemoRole(): RoleKey {
  if (typeof window === "undefined") {
    return "super_admin";
  }

  const storedRole = window.localStorage.getItem(roleStorageKey);

  if (roleKeys.includes(storedRole as RoleKey)) {
    return storedRole as RoleKey;
  }

  return "super_admin";
}

function normalizeBranchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function branchNamesMatch(left: string, right: string) {
  const normalizedLeft = normalizeBranchText(left);
  const normalizedRight = normalizeBranchText(right);

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function recordMatchesBranchOption(
  record: BranchNetworkRecord,
  branch: AllowedBranchOption,
) {
  const branchValues = [branch.id, branch.name, branch.code ?? ""].filter(
    (value) => value.length > 0,
  );
  const recordValues = [record.id, record.branch, record.city].filter(
    (value) => value.length > 0,
  );

  return branchValues.some((branchValue) =>
    recordValues.some(
      (recordValue) =>
        normalizeBranchText(recordValue) === normalizeBranchText(branchValue) ||
        branchNamesMatch(recordValue, branchValue),
    ),
  );
}

function recordMatchesContextBranch(
  record: BranchNetworkRecord,
  context: StoredContext | null,
) {
  if (
    isAllFilterValue(context?.branchId) &&
    isAllFilterValue(context?.branchName)
  ) {
    return true;
  }

  const branchValues = [context?.branchId ?? "", context?.branchName ?? ""].filter(
    (value) => value.length > 0,
  );

  if (branchValues.length === 0) {
    return true;
  }

  return branchValues.some(
    (branchValue) =>
      normalizeBranchText(record.id) === normalizeBranchText(branchValue) ||
      branchNamesMatch(record.branch, branchValue) ||
      branchNamesMatch(record.city, branchValue),
  );
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

function getStatusClass(status: BranchStatus) {
  if (status === "Sobresaliente" || status === "Saludable") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Precaucion") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function metricToneClass(tone: string) {
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

function getMetricToneFromStatus(status: BranchStatus): BranchNetworkMetric["tone"] {
  if (status === "Critica") {
    return "negative";
  }

  if (status === "Precaucion") {
    return "warning";
  }

  return "positive";
}

function buildBranchManagerMetrics(
  record: BranchNetworkRecord | null,
  branchName: string,
): BranchNetworkMetric[] {
  if (!record) {
    return [
      {
        label: "Mi sucursal",
        note: "No se muestran datos de otras sucursales.",
        tone: "warning",
        value: branchName,
      },
      {
        label: "Cierre cargado",
        note: "Pendiente de cargar o validar para el periodo seleccionado.",
        tone: "warning",
        value: "Pendiente",
      },
      {
        label: "Datos visibles",
        note: "El tablero queda vacio hasta tener datos propios.",
        tone: "neutral",
        value: "0",
      },
      {
        label: "Accion",
        note: "Completar el formulario mensual de la sucursal.",
        tone: "warning",
        value: "Cargar cierre",
      },
    ];
  }

  return [
    {
      label: "Mi sucursal",
      note: record.branch,
      tone: getMetricToneFromStatus(record.status),
      value: record.city,
    },
    {
      label: "Estado operativo",
      note: record.priorityAction,
      tone: getMetricToneFromStatus(record.status),
      value: record.status,
    },
    {
      label: "Venta neta",
      note: "periodo seleccionado",
      tone: record.netSales >= record.projectedClose ? "positive" : "warning",
      value: formatCurrency(record.netSales),
    },
    {
      label: "Pacientes",
      note: "solo esta sucursal",
      tone: "neutral",
      value: record.patients.toLocaleString("en-US"),
    },
    {
      label: "Puntaje",
      note: `${record.scoreDelta >= 0 ? "+" : ""}${record.scoreDelta} pts vs periodo previo`,
      tone: record.score >= 80 ? "positive" : "warning",
      value: `${record.score}`,
    },
    {
      label: "Margen",
      note: "salud financiera local",
      tone: record.marginRate >= 0.4 ? "positive" : "warning",
      value: formatRate(record.marginRate),
    },
    {
      label: "Ocupacion",
      note: "uso efectivo de capacidad",
      tone: record.occupancyRate >= 0.7 ? "positive" : "warning",
      value: formatRate(record.occupancyRate),
    },
    {
      label: "Calidad de datos",
      note: "base para bono y trazabilidad",
      tone: record.dataQuality >= 80 ? "positive" : "warning",
      value: `${record.dataQuality}`,
    },
  ];
}

function BranchManagerEmptyState({
  branchName,
}: {
  branchName: string;
}) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4" />
        Sin cierre cargado para esta sucursal
      </div>
      <p>
        {branchName} no tiene datos de resultados para el periodo seleccionado.
        Por seguridad, el sistema no muestra la red completa ni usa otra
        sucursal como reemplazo.
      </p>
      <p className="mt-2">
        Siguiente paso: entrar a Formulario mensual y completar el cierre de la
        sucursal asignada.
      </p>
    </section>
  );
}

function heatClass(value: number) {
  if (value >= 88) {
    return "bg-emerald-600 text-white";
  }

  if (value >= 78) {
    return "bg-emerald-100 text-emerald-900";
  }

  if (value >= 66) {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-red-100 text-red-900";
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
        Pantalla de sucursales activa
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

function createDefaultFilters(): BranchFilters {
  return {
    branch: allOption,
    branchType: allOption,
    comparableGroup: allOption,
    manager: allOption,
    region: allOption,
    serviceMix: allOption,
    size: allOption,
    status: allOption,
  };
}

function uniqueOptions(records: BranchNetworkRecord[], key: keyof BranchNetworkRecord) {
  return [allOption, ...Array.from(new Set(records.map((record) => String(record[key])))).sort()];
}

function BranchFiltersPanel({
  filters,
  onChange,
  records,
}: {
  filters: BranchFilters;
  onChange: (filters: BranchFilters) => void;
  records: BranchNetworkRecord[];
}) {
  function updateField(key: keyof BranchFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const filterFields: {
    key: keyof BranchFilters;
    label: string;
    options: string[];
  }[] = [
    { key: "branch", label: "Sucursal", options: uniqueOptions(records, "branch") },
    { key: "region", label: "Region", options: uniqueOptions(records, "region") },
    { key: "manager", label: "Gerente", options: uniqueOptions(records, "manager") },
    { key: "branchType", label: "Tipo de sucursal", options: uniqueOptions(records, "branchType") },
    { key: "size", label: "Tamano", options: uniqueOptions(records, "size") },
    { key: "status", label: "Estado", options: uniqueOptions(records, "status") },
    { key: "serviceMix", label: "Mezcla de servicios", options: uniqueOptions(records, "serviceMix") },
    { key: "comparableGroup", label: "Grupo comparable", options: uniqueOptions(records, "comparableGroup") },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de sucursal
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {filterFields.map((field) => (
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

function BranchMetricGrid({
  metrics,
}: {
  metrics: BranchNetworkMetric[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          className={cn("grid min-h-28 gap-2 rounded-md border p-4", metricToneClass(metric.tone))}
          key={metric.label}
        >
          <div className="text-sm font-medium">{metric.label}</div>
          <div className="text-2xl font-semibold tracking-normal">{metric.value}</div>
          <p className="text-xs leading-5 opacity-90">{metric.note}</p>
        </article>
      ))}
    </div>
  );
}

function BranchRankingTable({
  onSelect,
  records,
  selectedId,
}: {
  onSelect: (id: string) => void;
  records: BranchNetworkRecord[];
  selectedId: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("normalizedPerformanceScore");
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

  const columns: { key: SortKey; label: string; render: (record: BranchNetworkRecord) => string }[] = [
    {
      key: "normalizedPerformanceScore",
      label: "Puntaje comparable",
      render: (record) => `${record.normalizedPerformanceScore}`,
    },
    { key: "score", label: "Puntaje operativo", render: (record) => `${record.score}` },
    { key: "netSales", label: "Venta", render: (record) => formatCurrency(record.netSales) },
    { key: "marginRate", label: "Margen", render: (record) => formatRate(record.marginRate) },
    { key: "patients", label: "Pacientes", render: (record) => record.patients.toLocaleString("en-US") },
    { key: "occupancyRate", label: "Ocupacion", render: (record) => formatRate(record.occupancyRate) },
    { key: "slaRate", label: "SLA", render: (record) => formatRate(record.slaRate) },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Target className="size-4 text-primary" />
        Ranking integral de sucursales
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              {columns.map((column) => (
                <th className="py-2 pr-4 font-medium" key={column.key}>
                  <button
                    className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted"
                    onClick={() => sortBy(column.key)}
                    type="button"
                  >
                    {column.label}
                    <ArrowUpDown className="size-3" />
                  </button>
                </th>
              ))}
              <th className="py-2 pr-4 font-medium">Base comparable</th>
              <th className="py-2 pr-4 font-medium">Atipicos</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Accion recomendada</th>
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
                <td className="py-3 pr-4">
                  <div className="font-medium">{record.city}</div>
                  <div className="text-xs text-muted-foreground">
                    {record.line} / {record.comparableGroup}
                  </div>
                </td>
                {columns.map((column) => (
                  <td className="py-3 pr-4" key={`${record.id}-${column.key}`}>
                    {column.render(record)}
                  </td>
                ))}
                <td className="max-w-[220px] py-3 pr-4 text-xs text-muted-foreground">
                  {record.comparisonBasis}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {record.outlierFlags.length > 0 ? (
                      record.outlierFlags.slice(0, 2).map((flag) => (
                        <Badge
                          className={
                            flag.severity === "critical"
                              ? "bg-rose-100 text-rose-800 hover:bg-rose-100"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                          }
                          key={`${record.id}-${flag.metric}`}
                        >
                          {flag.metric}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin alerta</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Badge className={getStatusClass(record.status)}>
                    {record.status}
                  </Badge>
                </td>
                <td className="max-w-[280px] py-3 pr-4 text-muted-foreground">
                  {record.priorityAction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BranchMapPanel({
  onSelect,
  records,
  selectedId,
}: {
  onSelect: (id: string) => void;
  records: BranchNetworkRecord[];
  selectedId: string | null;
}) {
  const groupedRecords = useMemo(() => {
    return Array.from(
      records.reduce((groups, record) => {
        const group = groups.get(record.region) ?? [];
        group.push(record);
        groups.set(record.region, group);
        return groups;
      }, new Map<string, BranchNetworkRecord[]>()),
    )
      .map(([region, groupRecords]) => ({
        records: groupRecords.sort(
          (a, b) => b.normalizedPerformanceScore - a.normalizedPerformanceScore,
        ),
        region,
      }))
      .sort((a, b) => a.region.localeCompare(b.region));
  }, [records]);

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="size-4 text-primary" />
          Mapa operativo de sucursales
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Agrupado por region para comparar sedes similares. Pasa encima de una
          tarjeta para ver venta, pacientes, margen, ocupacion y alerta.
        </p>
      </div>

      <div className="grid gap-3">
        {groupedRecords.map((group) => (
          <div
            className="rounded-md border bg-background p-3"
            key={`${group.region}-${group.records.length}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{group.region}</div>
              <Badge variant="outline">{group.records.length} sedes</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.records.map((record) => (
                <button
                  className={cn(
                    "group grid gap-3 rounded-md border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm",
                    selectedId === record.id ? "border-primary ring-1 ring-primary" : "",
                  )}
                  key={record.id}
                  onClick={() => onSelect(record.id)}
                  title={`${record.branch}
Estado: ${record.status}
Venta: ${formatCurrency(record.netSales)}
Pacientes: ${record.patients.toLocaleString("en-US")}
Margen: ${formatRate(record.marginRate)}
Ocupacion: ${formatRate(record.occupancyRate)}
Puntaje comparable: ${record.normalizedPerformanceScore}
Linea: ${record.line}
Alerta: ${record.alerts[0] ?? "Sin alerta critica"}`}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{record.city}</div>
                      <div className="text-xs text-muted-foreground">
                        {record.line} / {record.size}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold">
                        {record.normalizedPerformanceScore}
                      </div>
                      <Badge className={getStatusClass(record.status)}>
                        {record.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {[
                      { label: "Puntaje", value: record.normalizedPerformanceScore, display: `${record.normalizedPerformanceScore}`, color: "bg-slate-700" },
                      { label: "Venta", value: Math.min(100, (record.netSales / 52000) * 100), display: formatCurrency(record.netSales), color: "bg-blue-600" },
                      { label: "Margen", value: record.marginRate * 100, display: formatRate(record.marginRate), color: "bg-emerald-600" },
                      { label: "Ocupacion", value: record.occupancyRate * 100, display: formatRate(record.occupancyRate), color: "bg-amber-500" },
                    ].map((item) => (
                      <div className="grid gap-1" key={item.label}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.display}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={cn("h-2 rounded-full", item.color)}
                            style={{ width: `${Math.max(5, Math.min(item.value, 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {record.alerts[0] ?? record.priorityAction}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BubbleMatrix({
  onSelect,
  records,
}: {
  onSelect: (id: string) => void;
  records: BranchNetworkRecord[];
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredRecord = records.find((record) => record.id === hoveredId);
  const width = 720;
  const height = 360;
  const padding = { bottom: 66, left: 72, right: 56, top: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xMin = 50;
  const xMax = 100;
  const yMin = 20;
  const yMax = 90;
  const xThreshold = 80;
  const yThreshold = 40;

  function xScale(value: number) {
    return padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  }

  function yScale(value: number) {
    return padding.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  }

  const xTicks = [50, 60, 70, 80, 90, 100];
  const yTicks = [20, 35, 50, 65, 80, 90];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="text-sm font-medium">Matriz rentabilidad versus operacion</div>
        <p className="text-xs leading-5 text-muted-foreground">
          Eje X: puntaje comparable. Eje Y: margen. Tamano: pacientes. Pasa
          encima de cada burbuja para ver los datos exactos.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-md border bg-background p-2">
        <svg
          aria-label="Matriz de rentabilidad versus operacion por sucursal"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect fill="#f8fafc" height={plotHeight} width={plotWidth} x={padding.left} y={padding.top} />
          <rect
            fill="#ecfdf5"
            height={yScale(yThreshold) - padding.top}
            opacity="0.65"
            width={width - padding.right - xScale(xThreshold)}
            x={xScale(xThreshold)}
            y={padding.top}
          />
          <rect
            fill="#fff7ed"
            height={plotHeight - (yScale(yThreshold) - padding.top)}
            opacity="0.6"
            width={width - padding.right - xScale(xThreshold)}
            x={xScale(xThreshold)}
            y={yScale(yThreshold)}
          />
          <rect
            fill="#fef2f2"
            height={plotHeight - (yScale(yThreshold) - padding.top)}
            opacity="0.55"
            width={xScale(xThreshold) - padding.left}
            x={padding.left}
            y={yScale(yThreshold)}
          />
          <rect
            fill="#eff6ff"
            height={yScale(yThreshold) - padding.top}
            opacity="0.5"
            width={xScale(xThreshold) - padding.left}
            x={padding.left}
            y={padding.top}
          />

          {xTicks.map((tick) => {
            const x = xScale(tick);
            return (
              <g key={`x-${tick}`}>
                <line stroke="#cbd5e1" strokeDasharray="4 4" x1={x} x2={x} y1={padding.top} y2={height - padding.bottom} />
                <text fill="#64748b" fontSize="11" textAnchor="middle" x={x} y={height - 24}>
                  {tick}
                </text>
              </g>
            );
          })}
          {yTicks.map((tick) => {
            const y = yScale(tick);
            return (
              <g key={`y-${tick}`}>
                <line stroke="#cbd5e1" strokeDasharray="4 4" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                <text fill="#64748b" fontSize="11" textAnchor="end" x={padding.left - 10} y={y + 4}>
                  {tick}%
                </text>
              </g>
            );
          })}

          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} />
          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} />
          <line stroke="#0f172a" strokeDasharray="5 5" x1={xScale(xThreshold)} x2={xScale(xThreshold)} y1={padding.top} y2={height - padding.bottom} />
          <line stroke="#0f172a" strokeDasharray="5 5" x1={padding.left} x2={width - padding.right} y1={yScale(yThreshold)} y2={yScale(yThreshold)} />

          <text fill="#475569" fontSize="11" fontWeight="600" x={padding.left + 12} y={padding.top + 20}>
            Rentable con riesgo operativo
          </text>
          <text fill="#166534" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={padding.top + 20}>
            Sucursal modelo
          </text>
          <text fill="#991b1b" fontSize="11" fontWeight="600" x={padding.left + 12} y={height - padding.bottom - 18}>
            Intervencion prioritaria
          </text>
          <text fill="#92400e" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={height - padding.bottom - 24}>
            <tspan x={width - padding.right - 12}>Opera bien</tspan>
            <tspan x={width - padding.right - 12} dy="13">
              revisar finanzas
            </tspan>
          </text>

          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 18}>
            Puntaje comparable
          </text>
          <text
            fill="#334155"
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            transform={`rotate(-90 ${26} ${padding.top + plotHeight / 2})`}
            x="26"
            y={padding.top + plotHeight / 2}
          >
            Margen
          </text>

          {records.map((record) => {
            const x = xScale(record.normalizedPerformanceScore);
            const y = yScale(record.marginRate * 100);
            const radius = Math.max(10, Math.min(28, record.patients / 820));
            return (
              <g
                className="cursor-pointer"
                key={record.id}
                onClick={() => onSelect(record.id)}
                onMouseEnter={() => setHoveredId(record.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  fill={record.status === "Critica" ? "#dc2626" : record.status === "Precaucion" ? "#f59e0b" : "#2563eb"}
                  opacity="0.82"
                  r={radius}
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <text fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle" x={x} y={y + 4}>
                  {record.city.slice(0, 2)}
                </text>
                <title>{`${record.branch}
Puntaje comparable: ${record.normalizedPerformanceScore}
Margen: ${formatRate(record.marginRate)}
Pacientes: ${record.patients.toLocaleString("en-US")}
Venta: ${formatCurrency(record.netSales)}
Estado: ${record.status}`}</title>
              </g>
            );
          })}
        </svg>

        {hoveredRecord ? (
          <div className="pointer-events-none absolute right-4 top-4 w-72 rounded-md border bg-white p-3 text-xs shadow-lg">
            <div className="mb-2 font-semibold text-foreground">
              {hoveredRecord.branch}
            </div>
            <div className="grid gap-1 text-muted-foreground">
              <span>Puntaje comparable: {hoveredRecord.normalizedPerformanceScore}</span>
              <span>Margen: {formatRate(hoveredRecord.marginRate)}</span>
              <span>Pacientes: {hoveredRecord.patients.toLocaleString("en-US")}</span>
              <span>Venta: {formatCurrency(hoveredRecord.netSales)}</span>
              <span>Estado: {hoveredRecord.status}</span>
              <span>Base: {hoveredRecord.comparisonBasis}</span>
              <span>Accion: {hoveredRecord.priorityAction}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HeatmapSection({ records }: { records: BranchNetworkRecord[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Building2 className="size-4 text-primary" />
        Heatmap de sucursales por KPI
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-3 font-medium">Sucursal</th>
              {heatmapColumns.map((column) => (
                <th className="py-2 pr-3 font-medium" key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr className="border-b last:border-b-0" key={record.id}>
                <td className="py-2 pr-3 font-medium">{record.city}</td>
                {heatmapColumns.map((column) => (
                  <td className="py-2 pr-3" key={`${record.id}-${column.key}`}>
                    <span
                      className={cn(
                        "inline-flex min-w-20 justify-center rounded-md px-2 py-1 font-medium",
                        heatClass(column.value(record)),
                      )}
                    >
                      {column.formatter(record)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TrendBranchSelector({
  records,
  selectedIds,
  onChange,
}: {
  records: BranchNetworkRecord[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }

    if (selectedIds.length < 5) {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 text-sm font-medium">
        Sucursales para tendencia
      </div>
      <div className="flex flex-wrap gap-2">
        {records.map((record) => {
          const selected = selectedIds.includes(record.id);
          const disabled = !selected && selectedIds.length >= 5;
          return (
            <button
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-medium",
                selected ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                disabled ? "opacity-45" : "",
              )}
              disabled={disabled}
              key={record.id}
              onClick={() => toggle(record.id)}
              type="button"
            >
              {record.city}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BranchProfile({ record }: { record: BranchNetworkRecord }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={getStatusClass(record.status)}>{record.status}</Badge>
          <Badge variant="outline">
            Puntaje comparable {record.normalizedPerformanceScore}
          </Badge>
          <Badge variant="outline">Base {record.comparisonBasis}</Badge>
          <Badge variant="outline">
            {record.scoreDelta >= 0 ? "+" : ""}
            {record.scoreDelta} pts
          </Badge>
        </div>
        <h2 className="text-xl font-semibold tracking-normal">{record.branch}</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          La sucursal obtuvo {record.normalizedPerformanceScore} puntos comparables.
          Sus fortalezas son {record.strengths.join(", ")}; pierde puntuacion por{" "}
          {record.reducers.join(", ")}. La venta absoluta queda como contexto,
          no como criterio unico.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Principal fortaleza</div>
          <div className="mt-1 text-sm font-medium">{record.strengths[0]}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Principal problema</div>
          <div className="mt-1 text-sm font-medium">{record.reducers[0]}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Accion prioritaria</div>
          <div className="mt-1 text-sm font-medium">{record.priorityAction}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <span>Venta: {formatCurrency(record.netSales)}</span>
        <span>Margen: {formatRate(record.marginRate)}</span>
        <span>Pacientes: {record.patients.toLocaleString("en-US")}</span>
        <span>Ocupacion: {formatRate(record.occupancyRate)}</span>
        <span>SLA: {formatRate(record.slaRate)}</span>
        <span>Meta: {record.targetGap >= 0 ? "+" : ""}{record.targetGap} pts</span>
        <span>
          Brecha capacidad: {record.capacityGapPoints >= 0 ? "+" : ""}
          {record.capacityGapPoints} pts vs pares
        </span>
        <span>Productividad proxy: {record.productivityIndex}</span>
      </div>
      {record.outlierFlags.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {record.outlierFlags.map((flag) => (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
              key={`${record.id}-${flag.metric}-${flag.value}`}
            >
              <span className="font-semibold">{flag.metric}: </span>
              {flag.value} vs {flag.benchmark}. {flag.explanation}
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        {record.recommendation}
      </div>
    </section>
  );
}

function ContributionAndLoss({ records }: { records: BranchNetworkRecord[] }) {
  const totalRevenue = records.reduce((sum, record) => sum + record.revenueShare, 0);
  const maxLoss = Math.max(
    ...records.flatMap((record) => record.lossCauses.map((cause) => cause.value)),
    1,
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 text-sm font-medium">
          Contribucion de cada sucursal a la red
        </div>
        <div className="grid gap-3">
          {records
            .slice()
            .sort((a, b) => b.revenueShare - a.revenueShare)
            .map((record) => {
              const share = (record.revenueShare / Math.max(totalRevenue, 1)) * 100;
              return (
                <div className="grid gap-1" key={record.id}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium">{record.city}</span>
                    <span className="text-muted-foreground">
                      {share.toFixed(1)}% venta / {record.incidenceShare}% incidencias
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 text-sm font-medium">
          Causas de perdida por sucursal
        </div>
        <div className="grid gap-3">
          {records.slice(0, 5).map((record) => {
            const topCause = record.lossCauses
              .slice()
              .sort((a, b) => b.value - a.value)[0];
            return (
              <div className="grid gap-1" key={record.id}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium">{record.city}</span>
                  <span className="text-muted-foreground">
                    {topCause.cause} / {Math.round(topCause.value)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-rose-600"
                    style={{ width: `${(topCause.value / maxLoss) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ExecutiveActions({ actions }: { actions: string[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <GitBranch className="size-4 text-primary" />
        Comparacion justa y acciones automaticas
      </div>
      <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
        {actions.map((action) => (
          <div className="rounded-md border p-3" key={action}>
            {action}
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreWeightsPanel() {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 text-sm font-medium">Pesos del puntaje integral</div>
      <div className="grid gap-2 text-sm md:grid-cols-4">
        {branchScoreWeights.map((item) => (
          <div className="rounded-md border p-3" key={item.dimension}>
            <div className="text-xs text-muted-foreground">{item.dimension}</div>
            <div className="mt-1 text-lg font-semibold">{item.weight}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BranchNetworkDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const [currentUserAccess, setCurrentUserAccess] =
    useState<CurrentUserAccess | null>(null);
  const [allowedBranchOptions, setAllowedBranchOptions] = useState<
    AllowedBranchOption[] | null
  >(null);
  const [activeRole, setActiveRole] = useState<RoleKey>("super_admin");
  const [filters, setFilters] = useState<BranchFilters>(() => createDefaultFilters());
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [trendBranchIds, setTrendBranchIds] = useState<string[]>([]);
  const scopedBranchAccess = isBranchManagerScopedAccess(currentUserAccess)
    ? currentUserAccess
    : null;
  const effectiveRole = scopedBranchAccess?.roleKey ?? activeRole;
  const isBranchManagerView = effectiveRole === "gerente_sucursal";
  const lineSlug = useMemo(() => {
    if (!scopedBranchAccess) {
      return resolveContextLine(context);
    }

    return resolveBusinessLineSlug({
      companyName: scopedBranchAccess.scope.companyName ?? undefined,
    });
  }, [context, scopedBranchAccess]);
  const screen = useMemo(() => getBranchNetworkScreen(lineSlug), [lineSlug]);
  const allowedRecords = useMemo(() => {
    if (!currentUserAccess || context?.isDemo === true) {
      return screen.records;
    }

    if (!allowedBranchOptions) {
      return [];
    }

    if (allowedBranchOptions.length === 0) {
      return [];
    }

    const contextScopedBranches = allowedBranchOptions.filter((branch) => {
      const countryMatches =
        !context?.countryId ||
        context.countryId === regionalCountryId ||
        branch.countryId === context.countryId;
      const companyMatches =
        !context?.companyId ||
        context.companyId === consolidatedCompanyId ||
        branch.companyId === context.companyId;
      const lineMatches =
        !context?.businessLineCode ||
        context.businessLineCode === "CONSOLIDATED" ||
        branch.businessLineCode === context.businessLineCode;

      return countryMatches && companyMatches && lineMatches;
    });

    return screen.records.filter((record) =>
      contextScopedBranches.some((branch) =>
        recordMatchesBranchOption(record, branch),
      ),
    );
  }, [
    allowedBranchOptions,
    context?.businessLineCode,
    context?.companyId,
    context?.countryId,
    context?.isDemo,
    currentUserAccess,
    screen.records,
  ]);
  const branchScopedRecords = useMemo(() => {
    const records = allowedRecords;

    const scopedBranchId = scopedBranchAccess?.scope.branchId ?? context?.branchId;
    const contextBranchName =
      context?.branchName && !isAllFilterValue(context.branchName)
        ? context.branchName
        : "";
    const scopedBranchName =
      scopedBranchAccess?.scope.branchName ?? contextBranchName;

    if (isBranchManagerView) {
      if (!scopedBranchId && !scopedBranchName) {
        return [];
      }

      return records.filter((record) => {
        return (
          (scopedBranchId ? record.id === scopedBranchId : false) ||
          (scopedBranchName
            ? branchNamesMatch(record.branch, scopedBranchName) ||
              branchNamesMatch(record.city, scopedBranchName)
            : false)
        );
      });
    }

    return records.filter((record) => recordMatchesContextBranch(record, context));
  }, [
    allowedRecords,
    context,
    isBranchManagerView,
    scopedBranchAccess?.scope.branchId,
    scopedBranchAccess?.scope.branchName,
  ]);
  const filteredRecords = useMemo(() => {
    if (isBranchManagerView) {
      return branchScopedRecords;
    }

    return branchScopedRecords.filter((record) => {
      return (
        (filters.branch === allOption || record.branch === filters.branch) &&
        (filters.region === allOption || record.region === filters.region) &&
        (filters.manager === allOption || record.manager === filters.manager) &&
        (filters.branchType === allOption || record.branchType === filters.branchType) &&
        (filters.size === allOption || record.size === filters.size) &&
        (filters.status === allOption || record.status === filters.status) &&
        (filters.serviceMix === allOption || record.serviceMix === filters.serviceMix) &&
        (filters.comparableGroup === allOption ||
          record.comparableGroup === filters.comparableGroup)
      );
    });
  }, [branchScopedRecords, filters, isBranchManagerView]);
  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedBranchId) ??
    filteredRecords[0] ??
    null;
  const trendRecords = useMemo(() => {
    const selected = filteredRecords.filter((record) =>
      trendBranchIds.includes(record.id),
    );
    return selected.length > 0 ? selected : filteredRecords.slice(0, 5);
  }, [filteredRecords, trendBranchIds]);
  const trendChart = useMemo(
    () => (trendRecords.length > 0 ? buildBranchTrendChart(trendRecords) : null),
    [trendRecords],
  );
  const scopedBranchName =
    scopedBranchAccess?.scope.branchName ??
    context?.branchName ??
    "Mi sucursal";
  const visibleMetrics = isBranchManagerView
    ? buildBranchManagerMetrics(selectedRecord, scopedBranchName)
    : screen.metrics;

  useEffect(() => {
    function refreshContext() {
      setContext(readStoredContext());
    }

    function refreshRole() {
      if (currentUserAccess) {
        setActiveRole(currentUserAccess.roleKey);
        return;
      }

      setActiveRole(readActiveDemoRole());
    }

    refreshContext();
    refreshRole();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);
    window.addEventListener("storage", refreshRole);
    window.addEventListener(roleChangeEvent, refreshRole);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
      window.removeEventListener("storage", refreshRole);
      window.removeEventListener(roleChangeEvent, refreshRole);
    };
  }, [currentUserAccess]);

  useEffect(() => {
    let isMounted = true;

    fetchCurrentUserAccess().then((access) => {
      if (!isMounted) {
        return;
      }

      setCurrentUserAccess(access);

      if (access) {
        setActiveRole(access.roleKey);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserAccess || context?.isDemo === true) {
      setAllowedBranchOptions(null);
      return;
    }

    let isMounted = true;

    fetch("/api/context/options", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json().catch(() => null)) as
          | ContextOptionsResponse
          | null;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setAllowedBranchOptions(
          payload?.ok === true && payload.options?.branches
            ? payload.options.branches
            : [],
        );
      })
      .catch(() => {
        if (isMounted) {
          setAllowedBranchOptions([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [context?.isDemo, currentUserAccess]);

  useEffect(() => {
    setFilters(createDefaultFilters());
    setSelectedBranchId(null);
    setTrendBranchIds(branchScopedRecords.slice(0, 5).map((record) => record.id));
  }, [branchScopedRecords]);

  useEffect(() => {
    if (
      selectedBranchId &&
      !filteredRecords.some((record) => record.id === selectedBranchId)
    ) {
      setSelectedBranchId(filteredRecords[0]?.id ?? null);
    }
  }, [filteredRecords, selectedBranchId]);

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              {context?.isDemo === false ? "Datos oficiales" : "Entorno DEMO"}
            </Badge>
            <Badge variant="outline">Sucursales</Badge>
            <Badge variant="outline">{screen.subtitle}</Badge>
            {isBranchManagerView ? (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Solo mi sucursal
              </Badge>
            ) : null}
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md border bg-card">
                <Building2 className="size-5 text-primary" />
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
        <ScopeCard context={context} lineSlug={lineSlug} />
      </div>

      {isBranchManagerView ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          Vista restringida por rol: este usuario solo consulta y carga datos
          de {scopedBranchName}. No hay filtros para cambiar de sucursal.
        </section>
      ) : (
        <BranchFiltersPanel
          filters={filters}
          onChange={setFilters}
          records={branchScopedRecords}
        />
      )}

      <BranchMetricGrid metrics={visibleMetrics} />

      {isBranchManagerView ? (
        <>
          {filteredRecords.length === 0 ? (
            <BranchManagerEmptyState branchName={scopedBranchName} />
          ) : (
            <>
              {trendChart ? <AnalyticsComparisonChart {...trendChart} /> : null}
              {selectedRecord ? <BranchProfile record={selectedRecord} /> : null}
              <HeatmapSection records={filteredRecords} />
            </>
          )}
        </>
      ) : (
        <>
          <BranchRankingTable
            onSelect={setSelectedBranchId}
            records={filteredRecords}
            selectedId={selectedRecord?.id ?? null}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <BranchMapPanel
              onSelect={setSelectedBranchId}
              records={filteredRecords}
              selectedId={selectedRecord?.id ?? null}
            />
            <BubbleMatrix onSelect={setSelectedBranchId} records={filteredRecords} />
          </div>

          <HeatmapSection records={filteredRecords} />

          <TrendBranchSelector
            onChange={setTrendBranchIds}
            records={filteredRecords}
            selectedIds={trendBranchIds}
          />
          {trendChart ? <AnalyticsComparisonChart {...trendChart} /> : null}

          {selectedRecord ? <BranchProfile record={selectedRecord} /> : null}

          <ContributionAndLoss records={filteredRecords} />

          <ScoreWeightsPanel />

          <ExecutiveActions actions={screen.executiveActions} />
        </>
      )}


      <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Regla: Sucursales responde cual sede funciona mejor y cual necesita
            intervencion. Operacion explica el proceso, Salud financiera el
            dinero, Capacidad el recurso disponible y Gerentes el desempeno de
            la persona responsable.
          </span>
        </div>
      </section>
    </section>
  );
}
