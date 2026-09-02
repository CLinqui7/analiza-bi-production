"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Filter,
  GitBranch,
  LineChart,
  Loader2,
  Pencil,
  Scale,
  Target,
  TrendingUp,
  UsersRound,
  XCircle,
} from "lucide-react";

import { AnalyticsComparisonChart } from "@/components/analytics-comparison-chart";
import { ReadableTabs } from "@/components/readable-tabs";
import { Badge } from "@/components/ui/badge";
import {
  resolveBusinessLineSlug,
  type BusinessLineSlug,
} from "@/lib/analytics/business-line-operations";
import {
  buildManagerBonusTrendChart,
  getManagerBonusBacktest,
  getManagerBonusScreen,
  type BonusState,
  type BonusBacktestSummary,
  type ManagerBonusMetric,
  type ManagerBonusRecord,
  type ManagerBonusStatus,
} from "@/lib/analytics/manager-bonuses";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
import {
  calculateRecommendedManagerBonus,
  getGoalCompletionFactor,
  managementLevelLabels,
} from "@/lib/tenant/manager-incentives";
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
  managerName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo?: boolean;
};

type ManagerFilters = {
  bonusState: string;
  goalType: string;
  managerRole: string;
  managerType: string;
  status: string;
};

type BonusWorkflowStatus =
  | "SYSTEM_RECOMMENDED"
  | "APPROVED"
  | "REJECTED"
  | "ADJUSTED";

type BonusWorkflowItem = {
  auditEvents: {
    action: "approve" | "reject" | "adjust";
    decidedAt: string;
    finalAmount: number;
    reason: string | null;
    status: BonusWorkflowStatus;
    userEmail: string;
  }[];
  bonusRecommendationId: string;
  businessLine: string;
  canAdjust: boolean;
  canApprove: boolean;
  canReject: boolean;
  decidedAt: string;
  finalAmount: number;
  manager: string;
  baseBonusAmount: number;
  managementLevel: string;
  period: string;
  reason: string | null;
  recommendedAmount: number;
  targetCompletionRate: number;
  scoreOriginal: number;
  status: BonusWorkflowStatus;
  userEmail: string;
};

type BonusWorkflowResponse = {
  items?: BonusWorkflowItem[];
  ok?: boolean;
  roleKey?: string;
};

type BonusDecisionResponse = {
  error?: string;
  item?: BonusWorkflowItem;
  ok?: boolean;
};

type BonusDecisionAction = "approve" | "reject" | "adjust";

type BonusDecisionModalState = {
  action: Extract<BonusDecisionAction, "reject" | "adjust">;
  amount: string;
  reason: string;
};

type SortKey =
  | "score"
  | "targetCompletionRate"
  | "netSales"
  | "utility"
  | "occupancyRate"
  | "dataQuality"
  | "baseBonusAmount"
  | "bonusRecommended"
  | "blockers";

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

function createDefaultFilters(): ManagerFilters {
  return {
    bonusState: allOption,
    goalType: allOption,
    managerRole: allOption,
    managerType: allOption,
    status: allOption,
  };
}

function uniqueOptions<T extends string>(records: T[]) {
  return [allOption, ...Array.from(new Set(records)).sort()];
}

function toneClass(tone: ManagerBonusMetric["tone"]) {
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

function statusClass(status: ManagerBonusStatus) {
  if (status === "Sobresaliente" || status === "Saludable") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Precaucion") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  if (status === "Critico") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function bonusStateClass(state: BonusState) {
  if (state === "ELIGIBLE") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (state === "NOT ELIGIBLE") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (state === "REVIEW REQUIRED") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-blue-100 text-blue-800 hover:bg-blue-100";
}

function bonusStateLabel(state: BonusState) {
  if (state === "ELIGIBLE") {
    return "Elegible";
  }

  if (state === "NOT ELIGIBLE") {
    return "No elegible";
  }

  return "Requiere revision";
}

function workflowStatusLabel(status: BonusWorkflowStatus) {
  if (status === "SYSTEM_RECOMMENDED") {
    return "Pendiente de revision";
  }

  if (status === "APPROVED") {
    return "Bono aprobado";
  }

  if (status === "REJECTED") {
    return "Bono rechazado";
  }

  if (status === "ADJUSTED") {
    return "Bono ajustado";
  }

  return status;
}

function workflowStatusClass(status: BonusWorkflowStatus) {
  if (status === "APPROVED") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (status === "ADJUSTED") {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function closingStatusLabel(status: ManagerBonusRecord["closingStatus"]) {
  if (status === "PUBLISHED") {
    return "Cierre publicado";
  }

  if (status === "INCOMPLETE") {
    return "Periodo incompleto";
  }

  return "Cierre pendiente";
}

function defaultWorkflowItem(record: ManagerBonusRecord): BonusWorkflowItem {
  return {
    auditEvents: [],
    bonusRecommendationId: record.id,
    businessLine: record.line,
    canAdjust: false,
    canApprove: false,
    canReject: false,
    decidedAt: "",
    finalAmount: record.bonusRecommended,
    manager: record.manager,
    baseBonusAmount: record.baseBonusAmount,
    managementLevel: managementLevelLabels[record.managementLevel],
    period: record.period,
    reason: null,
    recommendedAmount: record.bonusRecommended,
    targetCompletionRate: record.targetCompletionRate,
    scoreOriginal: record.score,
    status: "SYSTEM_RECOMMENDED",
    userEmail: "",
  };
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
        Pantalla de gerentes y bonos activa
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.businessLineName ?? context?.companyName ?? "Consolidado"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>{context?.managerName ?? "Todos los gerentes"}</span>
        <span>Linea: {lineSlug}</span>
        <span>Periodo: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

function ManagerFiltersPanel({
  filters,
  onChange,
  records,
}: {
  filters: ManagerFilters;
  onChange: (filters: ManagerFilters) => void;
  records: ManagerBonusRecord[];
}) {
  function updateField(key: keyof ManagerFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const fields: {
    key: keyof ManagerFilters;
    label: string;
    options: string[];
  }[] = [
    {
      key: "bonusState",
      label: "Estado del bono",
      options: uniqueOptions(records.map((record) => record.bonusState)),
    },
    {
      key: "managerRole",
      label: "Rol evaluado",
      options: uniqueOptions(records.map((record) => record.managerRole)),
    },
    {
      key: "goalType",
      label: "Tipo de meta",
      options: uniqueOptions(records.map((record) => record.goalType)),
    },
    {
      key: "managerType",
      label: "Tipo de gerente",
      options: uniqueOptions(records.map((record) => record.managerType)),
    },
    {
      key: "status",
      label: "Estado del puntaje",
      options: uniqueOptions(records.map((record) => record.status)),
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de gerentes y bonos
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
                  {field.key === "bonusState"
                    ? bonusStateLabel(option as BonusState)
                    : option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function GroupedMetrics({ metrics }: { metrics: ManagerBonusMetric[] }) {
  const groups: ManagerBonusMetric["group"][] = ["Gerentes", "Bonos", "Gestion"];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {groups.map((group) => (
        <section className="rounded-md border bg-card p-4" key={group}>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            {group === "Gerentes" ? (
              <UsersRound className="size-4 text-primary" />
            ) : group === "Bonos" ? (
              <BadgeDollarSign className="size-4 text-primary" />
            ) : (
              <Target className="size-4 text-primary" />
            )}
            {group}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics
              .filter((metric) => metric.group === group)
              .slice(0, 8)
              .map((metric) => (
                <article
                  className={cn("grid min-h-28 gap-2 rounded-md border p-3", toneClass(metric.tone))}
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
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Scale className="size-4 text-primary" />
        Ponderacion configurable del score
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {weights.map((weight) => (
          <article className="rounded-md border bg-background p-3" key={weight.dimension}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{weight.dimension}</span>
              <span className="text-muted-foreground">{weight.weight}%</span>
            </div>
            <ProgressBar value={weight.weight * 3.3} />
          </article>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-blue-600",
            label: "Barra",
            text: "peso que tiene esa dimension dentro del puntaje total.",
          },
          {
            color: "bg-slate-500",
            label: "Porcentaje",
            text: "cuanto influye esa dimension al calcular el bono.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "permite ajustar la ponderacion por empresa, linea de negocio o tipo de sucursal.",
          },
        ]}
      />
    </section>
  );
}

function BonusBacktestPanel({ backtest }: { backtest: BonusBacktestSummary }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4 text-primary" />
          Backtest de politica de bonos
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Prueba con datos DEMO existentes antes de aprobar formula real. No ejecuta pagos.
        </p>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[
          { label: "Registros", value: `${backtest.records}`, note: "sucursal + area" },
          { label: "Elegibles", value: `${backtest.eligible}`, note: "sin bloqueo activo" },
          { label: "Requieren revision", value: `${backtest.reviewRequired}`, note: "requiere evidencia" },
          { label: "Promedio", value: formatCurrency(backtest.averageRecommendedBonus), note: "con bono recomendado" },
        ].map((item) => (
          <article className="rounded-md border bg-background p-3" key={item.label}>
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-lg font-semibold tracking-normal">{item.value}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-2">
        {backtest.findings.map((finding) => (
          <div className="flex flex-col gap-2 rounded-md border bg-background p-3 text-xs sm:flex-row sm:items-start sm:justify-between" key={finding.check}>
            <div>
              <div className="font-medium">{finding.check}</div>
              <p className="mt-1 leading-5 text-muted-foreground">{finding.result}</p>
            </div>
            <Badge
              className={
                finding.status === "PASS"
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"
              }
            >
              {finding.status === "PASS" ? "Aprobado" : "Revisar"}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

function findDimensionScore(record: ManagerBonusRecord, pattern: RegExp) {
  return record.dimensions.find((dimension) => pattern.test(dimension.label))?.score;
}

function ExecutiveManagerPerformanceTable({
  records,
}: {
  records: ManagerBonusRecord[];
}) {
  if (records.length === 0) {
    return (
      <section className="rounded-md border bg-card p-6 text-sm leading-6 text-muted-foreground">
        No hay gerentes para estos filtros. Ajusta estado, tipo de meta o
        alcance del contexto superior.
      </section>
    );
  }

  const rows = records.map((record) => ({
    ...record,
    productivity:
      findDimensionScore(record, /productividad|operacion|produccion/i) ??
      record.score,
  }));

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="size-4 text-primary" />
          Rendimiento ejecutivo de gerentes
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Respeta jerarquia Gerente Operaciones {"->"} Gerente Area {"->"}{" "}
          Gerente Sucursal. No rankea solo por ingresos absolutos; separa
          componentes para evitar un puntaje opaco.
        </p>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((record) => (
          <article
            className="grid gap-3 rounded-md border bg-background p-3 text-sm"
            key={`${record.id}-executive-mobile`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{record.manager}</div>
                <div className="text-xs text-muted-foreground">
                  {record.region} · {record.branch}
                </div>
              </div>
              <Badge className={statusClass(record.status)}>
                {record.status}
              </Badge>
            </div>
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt>Ingresos vs meta</dt>
                <dd>
                  {formatCurrency(record.netSales)} /{" "}
                  {formatRate(record.targetCompletionRate)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Ocupacion efectiva</dt>
                <dd>{formatRate(record.occupancyRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Finalizacion/SLA</dt>
                <dd>{formatRate(record.slaRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>No-show</dt>
                <dd>No calculable sin agenda por gerente</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Productividad</dt>
                <dd>{record.productivity}/100</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Margen</dt>
                <dd>{formatRate(record.marginRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Calidad</dt>
                <dd>{record.dataQuality}/100</dd>
              </div>
            </dl>
            <p className="rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
              {record.blockingConditions[0]?.reason ?? record.principalGap}
            </p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Area</th>
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Ingresos vs meta</th>
              <th className="py-2 pr-4 font-medium">Ocupacion efectiva</th>
              <th className="py-2 pr-4 font-medium">Finalizacion/SLA</th>
              <th className="py-2 pr-4 font-medium">No-show</th>
              <th className="py-2 pr-4 font-medium">Productividad</th>
              <th className="py-2 pr-4 font-medium">Margen</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
              <th className="py-2 pr-4 font-medium">Alertas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr className="border-b last:border-b-0" key={`${record.id}-executive`}>
                <td className="py-3 pr-4 font-medium">{record.manager}</td>
                <td className="py-3 pr-4">{record.region}</td>
                <td className="py-3 pr-4">{record.branch}</td>
                <td className="py-3 pr-4">
                  <div>{formatCurrency(record.netSales)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRate(record.targetCompletionRate)}
                  </div>
                </td>
                <td className="py-3 pr-4">{formatRate(record.occupancyRate)}</td>
                <td className="py-3 pr-4">{formatRate(record.slaRate)}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  No calculable sin agenda por gerente
                </td>
                <td className="py-3 pr-4">{record.productivity}/100</td>
                <td className="py-3 pr-4">{formatRate(record.marginRate)}</td>
                <td className="py-3 pr-4">
                  {record.dataQuality}/100
                  {record.dataQuality < 72 ? (
                    <div className="text-xs text-amber-700">
                      Puntaje ejecutivo no concluyente
                    </div>
                  ) : null}
                </td>
                <td className="max-w-[280px] py-3 pr-4 text-muted-foreground">
                  {record.blockingConditions[0]?.reason ?? record.principalGap}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ManagerRankingTable({
  onSelect,
  records,
  selectedId,
  workflowById,
}: {
  onSelect: (id: string) => void;
  records: ManagerBonusRecord[];
  selectedId: string | null;
  workflowById: Map<string, BonusWorkflowItem>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const aValue = sortKey === "blockers" ? a.blockingConditions.length : Number(a[sortKey]);
      const bValue = sortKey === "blockers" ? b.blockingConditions.length : Number(b[sortKey]);
      return direction === "asc" ? aValue - bValue : bValue - aValue;
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

  const columns: {
    key: SortKey;
    label: string;
    render: (record: ManagerBonusRecord) => string;
  }[] = [
    { key: "score", label: "Puntaje", render: (record) => `${record.score}` },
    {
      key: "targetCompletionRate",
      label: "Cumplimiento",
      render: (record) => formatRate(record.targetCompletionRate),
    },
    { key: "netSales", label: "Venta", render: (record) => formatCurrency(record.netSales) },
    { key: "utility", label: "Utilidad", render: (record) => formatCurrency(record.utility) },
    {
      key: "occupancyRate",
      label: "Ocupacion",
      render: (record) => formatRate(record.occupancyRate),
    },
    { key: "dataQuality", label: "Datos", render: (record) => `${record.dataQuality}` },
    {
      key: "baseBonusAmount",
      label: "Bono base",
      render: (record) => formatCurrency(record.baseBonusAmount),
    },
    {
      key: "bonusRecommended",
      label: "Bono recomendado",
      render: (record) => formatCurrency(record.bonusRecommended),
    },
    {
      key: "blockers",
      label: "Bloqueos",
      render: (record) => `${record.blockingConditions.length}`,
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="size-4 text-primary" />
        Ranking de gerentes: resultado, gestion y bono
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Rol</th>
              <th className="py-2 pr-4 font-medium">Nivel</th>
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Linea</th>
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
              <th className="py-2 pr-4 font-medium">Bono</th>
              <th className="py-2 pr-4 font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => {
              const workflow =
                workflowById.get(record.id) ?? defaultWorkflowItem(record);

              return (
                <tr
                  className={cn(
                    "cursor-pointer border-b last:border-b-0 hover:bg-muted/50",
                    selectedId === record.id ? "bg-muted" : "",
                  )}
                  key={record.id}
                  onClick={() => onSelect(record.id)}
                >
                  <td className="py-3 pr-4 font-medium">{record.manager}</td>
                  <td className="py-3 pr-4">{record.managerRole}</td>
                  <td className="py-3 pr-4">
                    {managementLevelLabels[record.managementLevel]}
                  </td>
                  <td className="py-3 pr-4">
                    <div>{record.branch}</div>
                    <div className="text-xs text-muted-foreground">
                      {record.managerType}
                    </div>
                  </td>
                  <td className="py-3 pr-4">{record.line}</td>
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
                  <td className="py-3 pr-4">
                    <Badge className={bonusStateClass(record.bonusState)}>
                      {bonusStateLabel(record.bonusState)}
                    </Badge>
                  </td>
                  <td className="max-w-[260px] py-3 pr-4 text-muted-foreground">
                    <Badge className={workflowStatusClass(workflow.status)}>
                      {workflowStatusLabel(workflow.status)}
                    </Badge>
                    <div className="mt-1">
                      Bono final: {formatCurrency(workflow.finalAmount)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoreDimensionBars({ record }: { record: ManagerBonusRecord }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="size-4 text-primary" />
          Desglose del puntaje
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {record.explanation}
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
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Cada fila",
            text: "es una dimension del puntaje del gerente, como finanzas, operacion, calidad o datos.",
          },
          {
            color: "bg-slate-500",
            label: "Barra",
            text: "muestra el resultado de esa dimension en una escala de 0 a 100.",
          },
          {
            color: "bg-emerald-600",
            label: "Verde",
            text: "dimension saludable; amarillo indica precaucion y rojo indica riesgo.",
          },
          {
            color: "bg-blue-600",
            label: "Puntos",
            text: "son el aporte ponderado de esa dimension al puntaje total.",
          },
        ]}
      />
    </section>
  );
}

function ComplianceBonusChart({ records }: { records: ManagerBonusRecord[] }) {
  const chartRecords = records.slice(0, 8);
  const width = 760;
  const height = 260;
  const padding = { bottom: 54, left: 48, right: 56, top: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxBonus = Math.max(...chartRecords.map((record) => record.bonusRecommended), 1);
  const bonusCeiling = Math.ceil(maxBonus / 100) * 100;
  const bonusTicks = [0, bonusCeiling * 0.5, bonusCeiling];
  const yMax = 120;

  function yScale(value: number) {
    return padding.top + (1 - value / yMax) * plotHeight;
  }

  function bonusY(value: number) {
    return padding.top + (1 - value / bonusCeiling) * plotHeight;
  }

  const linePoints = chartRecords
    .map((record, index) => {
      const x = padding.left + (index + 0.5) * (plotWidth / Math.max(chartRecords.length, 1));
      return `${x.toFixed(2)},${bonusY(record.bonusRecommended).toFixed(2)}`;
    })
    .join(" ");

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LineChart className="size-4 text-primary" />
          Cumplimiento versus bono recomendado
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Barras: cumplimiento de meta. Linea: bono recomendado. La linea punteada
          marca 100% de meta.
        </p>
      </div>
      <div className="overflow-x-auto">
        <svg
          aria-label="Cumplimiento versus bono recomendado"
          className="h-80 min-w-[760px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 50, 100, 120].map((tick) => (
            <g key={tick}>
              <line
                stroke="#e2e8f0"
                strokeDasharray={tick === 100 ? "5 5" : "4 4"}
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
          {bonusTicks.map((tick) => (
            <text
              fill="#2563eb"
              fontSize="11"
              key={`bonus-${tick}`}
              textAnchor="start"
              x={width - padding.right + 8}
              y={bonusY(tick) + 4}
            >
              {formatCurrency(tick)}
            </text>
          ))}
          <line
            stroke="#2563eb"
            strokeDasharray="3 4"
            x1={width - padding.right}
            x2={width - padding.right}
            y1={padding.top}
            y2={height - padding.bottom}
          />

          {chartRecords.map((record, index) => {
            const band = plotWidth / Math.max(chartRecords.length, 1);
            const barWidth = Math.max(28, band * 0.5);
            const x = padding.left + index * band + (band - barWidth) / 2;
            const barHeight = yScale(0) - yScale(record.targetCompletionRate * 100);
            return (
              <g key={record.id}>
                <rect
                  fill={record.targetCompletionRate >= 1 ? "#16a34a" : "#f59e0b"}
                  height={Math.max(2, barHeight)}
                  rx="4"
                  width={barWidth}
                  x={x}
                  y={yScale(record.targetCompletionRate * 100)}
                >
                  <title>{`${record.manager}
Cumplimiento: ${formatRate(record.targetCompletionRate)}
Bono base: ${formatCurrency(record.baseBonusAmount)}
Bono recomendado: ${formatCurrency(record.bonusRecommended)}
Estado: ${bonusStateLabel(record.bonusState)}`}</title>
                </rect>
                <text fill="#64748b" fontSize="10" textAnchor="middle" x={x + barWidth / 2} y={height - 18}>
                  {record.manager.split(" ")[0]}
                </text>
              </g>
            );
          })}

          <polyline
            fill="none"
            points={linePoints}
            stroke="#2563eb"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {chartRecords.map((record, index) => {
            const x = padding.left + (index + 0.5) * (plotWidth / Math.max(chartRecords.length, 1));
            const y = bonusY(record.bonusRecommended);
            return (
              <circle cx={x} cy={y} fill="#2563eb" key={`${record.id}-bonus`} r="5">
                <title>{`${record.manager}: ${formatCurrency(record.bonusRecommended)}`}</title>
              </circle>
            );
          })}

          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 2}>
            Gerentes
          </text>
          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={width - 24} y={padding.top + 10}>
            Bono USD
          </text>
        </svg>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje X",
            text: "cada nombre abajo es un gerente.",
          },
          {
            color: "bg-slate-500",
            label: "Eje Y izquierdo",
            text: "porcentaje de cumplimiento de meta; las barras usan esta escala.",
          },
          {
            color: "bg-blue-600",
            label: "Linea azul",
            text: "bono recomendado en dolares despues de aplicar bono base y cumplimiento; se lee con el eje derecho azul.",
          },
          {
            color: "bg-emerald-600",
            label: "Barras verdes",
            text: "gerentes que llegaron o superaron 100% de meta.",
          },
          {
            color: "bg-amber-500",
            label: "Barras naranjas",
            text: "gerentes por debajo de 100% de meta.",
          },
          {
            color: "bg-slate-400",
            label: "Linea punteada",
            text: "referencia de 100% de meta.",
          },
        ]}
      />
    </section>
  );
}

function ProfitabilityPerformanceMatrix({
  onSelect,
  records,
}: {
  onSelect: (id: string) => void;
  records: ManagerBonusRecord[];
}) {
  const chartRecords = records.slice(0, 10);
  const width = 720;
  const height = 360;
  const padding = { bottom: 66, left: 76, right: 56, top: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xMin = 55;
  const xMax = 100;
  const xThreshold = 80;
  const maxUtility = Math.max(...chartRecords.map((record) => record.utility), 16000);
  const yMax = Math.ceil((maxUtility * 1.12) / 5000) * 5000;
  const yThreshold = yMax * 0.55;

  function xScale(value: number) {
    return padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  }

  function yScale(value: number) {
    return padding.top + (1 - value / yMax) * plotHeight;
  }

  const xTicks = [60, 70, 80, 90, 100];
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4 text-primary" />
          Rentabilidad versus desempeno gerencial
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Eje X: puntaje gerencial. Eje Y: utilidad operativa. Tamano: venta.
          Pasa encima para ver datos exactos.
        </p>
      </div>
      <div className="overflow-hidden rounded-md border bg-background p-2">
        <svg
          aria-label="Matriz de rentabilidad versus desempeno gerencial"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect fill="#f8fafc" height={plotHeight} width={plotWidth} x={padding.left} y={padding.top} />
          <rect fill="#ecfdf5" height={yScale(yThreshold) - padding.top} opacity="0.7" width={width - padding.right - xScale(xThreshold)} x={xScale(xThreshold)} y={padding.top} />
          <rect fill="#fff7ed" height={plotHeight - (yScale(yThreshold) - padding.top)} opacity="0.62" width={width - padding.right - xScale(xThreshold)} x={xScale(xThreshold)} y={yScale(yThreshold)} />
          <rect fill="#fef2f2" height={plotHeight - (yScale(yThreshold) - padding.top)} opacity="0.58" width={xScale(xThreshold) - padding.left} x={padding.left} y={yScale(yThreshold)} />
          <rect fill="#eff6ff" height={yScale(yThreshold) - padding.top} opacity="0.55" width={xScale(xThreshold) - padding.left} x={padding.left} y={padding.top} />

          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={xScale(tick)} x2={xScale(tick)} y1={padding.top} y2={height - padding.bottom} />
              <text fill="#64748b" fontSize="11" textAnchor="middle" x={xScale(tick)} y={height - 28}>
                {tick}
              </text>
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={padding.left} x2={width - padding.right} y1={yScale(tick)} y2={yScale(tick)} />
              <text fill="#64748b" fontSize="11" textAnchor="end" x={padding.left - 10} y={yScale(tick) + 4}>
                {formatCurrency(tick)}
              </text>
            </g>
          ))}

          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} />
          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} />
          <line stroke="#0f172a" strokeDasharray="5 5" x1={xScale(xThreshold)} x2={xScale(xThreshold)} y1={padding.top} y2={height - padding.bottom} />
          <line stroke="#0f172a" strokeDasharray="5 5" x1={padding.left} x2={width - padding.right} y1={yScale(yThreshold)} y2={yScale(yThreshold)} />

          <text fill="#1e40af" fontSize="11" fontWeight="600" x={padding.left + 12} y={padding.top + 20}>
            Rentable con riesgo
          </text>
          <text fill="#166534" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={padding.top + 20}>
            Gerente modelo
          </text>
          <text fill="#991b1b" fontSize="11" fontWeight="600" x={padding.left + 12} y={height - padding.bottom - 18}>
            Intervencion prioritaria
          </text>
          <text fill="#92400e" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={height - padding.bottom - 24}>
            <tspan x={width - padding.right - 12}>Buena gestion</tspan>
            <tspan x={width - padding.right - 12} dy="13">
              revisar finanzas
            </tspan>
          </text>

          {chartRecords.map((record) => {
            const radius = Math.max(10, Math.min(26, record.netSales / 2200));
            const x = xScale(record.score);
            const y = yScale(record.utility);
            return (
              <g
                className="cursor-pointer"
                key={record.id}
                onClick={() => onSelect(record.id)}
              >
                <circle
                  cx={x}
                  cy={y}
                  fill={record.bonusState === "NOT ELIGIBLE" ? "#dc2626" : record.bonusState === "REVIEW REQUIRED" ? "#f59e0b" : "#2563eb"}
                  opacity="0.84"
                  r={radius}
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <text fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle" x={x} y={y + 4}>
                  {record.manager.slice(0, 2)}
                </text>
                <title>{`${record.manager}
Sucursal: ${record.branch}
Puntaje: ${record.score}
Utilidad: ${formatCurrency(record.utility)}
Venta: ${formatCurrency(record.netSales)}
Bono: ${formatCurrency(record.bonusRecommended)}
Estado: ${bonusStateLabel(record.bonusState)}`}</title>
              </g>
            );
          })}

          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 18}>
            Puntaje gerencial
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
            Utilidad operativa
          </text>
        </svg>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje X",
            text: "puntaje gerencial; mientras mas a la derecha, mejor desempeno integral.",
          },
          {
            color: "bg-slate-500",
            label: "Eje Y",
            text: "utilidad operativa; mientras mas arriba, mas rentable es la gestion.",
          },
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "bono recomendado elegible para revision humana.",
          },
          {
            color: "bg-amber-500",
            label: "Naranja",
            text: "requiere evidencia o validacion antes de aprobar.",
          },
          {
            color: "bg-red-600",
            label: "Rojo",
            text: "no elegible por una condicion critica.",
          },
          {
            color: "bg-slate-500",
            label: "Tamano",
            text: "venta gestionada por el gerente.",
          },
        ]}
      />
    </section>
  );
}

function BonusWaterfall({ record }: { record: ManagerBonusRecord }) {
  const maxAmount = Math.max(
    ...record.waterfall.map((step) => Math.abs(step.amount)),
    record.bonusPotential,
    1,
  );

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BadgeDollarSign className="size-4 text-primary" />
          Composicion del bono
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Bono base, cumplimiento de meta, elegibilidad y bono recomendado.
        </p>
      </div>
      <div className="grid gap-3">
        {record.waterfall.map((step) => {
          const isNegative = step.amount < 0;
          const width = Math.max(8, (Math.abs(step.amount) / maxAmount) * 100);
          return (
            <div className="grid gap-1" key={step.label}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium">{step.label}</span>
                <span
                  className={cn(
                    "font-semibold",
                    isNegative ? "text-red-700" : step.kind === "final" ? "text-blue-700" : "text-emerald-700",
                  )}
                >
                  {isNegative ? "-" : ""}
                  {formatCurrency(Math.abs(step.amount))}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-3 rounded-full",
                    isNegative ? "bg-red-500" : step.kind === "final" ? "bg-blue-600" : "bg-emerald-600",
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{step.note}</p>
            </div>
          );
        })}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-emerald-600",
            label: "Verde",
            text: "monto positivo o base que suma al bono.",
          },
          {
            color: "bg-red-500",
            label: "Rojo",
            text: "descuento, penalizacion, retencion o bloqueo que reduce el bono.",
          },
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "bono recomendado antes de aprobacion.",
          },
          {
            color: "bg-slate-500",
            label: "Largo de barra",
            text: "tamano del monto comparado contra el mayor valor del calculo.",
          },
        ]}
      />
    </section>
  );
}

function ReductionPareto({ records }: { records: ManagerBonusRecord[] }) {
  const causes = useMemo(() => {
    const totals = new Map<string, { amount: number; count: number }>();

    records.forEach((record) => {
      record.reductionCauses.forEach((cause) => {
        const current = totals.get(cause.cause) ?? { amount: 0, count: 0 };
        current.amount += cause.amount;
        current.count += cause.count;
        totals.set(cause.cause, current);
      });
    });

    return Array.from(totals, ([cause, value]) => ({
      cause,
      ...value,
    }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [records]);
  const maxAmount = Math.max(...causes.map((cause) => cause.amount), 1);

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 text-primary" />
          Causas de reduccion o bloqueo
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Pareto de las causas que reducen, retienen o bloquean bonos.
        </p>
      </div>
      <div className="grid gap-3">
        {causes.map((cause) => (
          <div className="grid gap-1" key={cause.cause}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{cause.cause}</span>
              <span className="text-muted-foreground">
                {formatCurrency(cause.amount)} / {cause.count} casos
              </span>
            </div>
            <ProgressBar color="bg-rose-600" value={(cause.amount / maxAmount) * 100} />
          </div>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje Y",
            text: "cada fila es una causa que reduce, retiene o bloquea bonos.",
          },
          {
            color: "bg-rose-600",
            label: "Barra roja",
            text: "dinero estimado que se pierde o se retiene por esa causa.",
          },
          {
            color: "bg-slate-500",
            label: "Numero de casos",
            text: "cantidad de gerentes afectados por esa causa.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "prioriza corregir primero la causa con mayor impacto monetario.",
          },
        ]}
      />
    </section>
  );
}

function TalentMatrix({ records }: { records: ManagerBonusRecord[] }) {
  const chartRecords = records.slice(0, 10);
  const width = 640;
  const height = 300;
  const padding = { bottom: 48, left: 52, right: 28, top: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  function xScale(value: number) {
    return padding.left + (value / 100) * plotWidth;
  }

  function yScale(value: number) {
    return padding.top + (1 - value / 100) * plotHeight;
  }

  function potential(record: ManagerBonusRecord) {
    return Math.round(
      Math.max(
        0,
        Math.min(
          100,
          62 + record.scoreDelta * 3 + record.dataQuality * 0.22 - record.staffTurnoverRate * 80,
        ),
      ),
    );
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UsersRound className="size-4 text-primary" />
          Matriz de talento gerencial
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Eje X: desempeno actual. Eje Y: tendencia de gestion revisable por humanos.
        </p>
      </div>
      <div className="overflow-hidden rounded-md border bg-background p-2">
        <svg
          aria-label="Matriz de talento gerencial"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[33, 66].map((value) => (
            <g key={value}>
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={xScale(value)} x2={xScale(value)} y1={padding.top} y2={height - padding.bottom} />
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={padding.left} x2={width - padding.right} y1={yScale(value)} y2={yScale(value)} />
            </g>
          ))}
          <rect fill="none" height={plotHeight} stroke="#334155" strokeWidth="1.5" width={plotWidth} x={padding.left} y={padding.top} />
          <text fill="#166534" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 10} y={padding.top + 18}>
            Alto desempeno
          </text>
          <text fill="#991b1b" fontSize="11" fontWeight="600" x={padding.left + 10} y={height - padding.bottom - 12}>
            Intervencion necesaria
          </text>
          {chartRecords.map((record) => {
            const x = xScale(record.score);
            const y = yScale(potential(record));
            return (
              <g key={record.id}>
                <circle
                  cx={x}
                  cy={y}
                  fill={record.status === "Critico" ? "#dc2626" : record.status === "Precaucion" ? "#f59e0b" : "#2563eb"}
                  opacity="0.86"
                  r="11"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <text fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle" x={x} y={y + 3}>
                  {record.manager.slice(0, 2)}
                </text>
                <title>{`${record.manager}
Desempeno: ${record.score}
Tendencia: ${potential(record)}
Estado: ${record.status}`}</title>
              </g>
            );
          })}
          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 12}>
            Desempeno actual
          </text>
          <text
            fill="#334155"
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            transform={`rotate(-90 ${18} ${padding.top + plotHeight / 2})`}
            x="18"
            y={padding.top + plotHeight / 2}
          >
            Tendencia
          </text>
        </svg>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje X",
            text: "desempeno actual del gerente medido por su puntaje integral.",
          },
          {
            color: "bg-slate-500",
            label: "Eje Y",
            text: "tendencia de gestion; debe revisarse con criterio humano antes de decidir.",
          },
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "gerente saludable o sobresaliente.",
          },
          {
            color: "bg-amber-500",
            label: "Naranja",
            text: "gerente en precaucion.",
          },
          {
            color: "bg-red-600",
            label: "Rojo",
            text: "gerente critico o con intervencion necesaria.",
          },
        ]}
      />
    </section>
  );
}

function ManagerProfile({
  record,
  workflow,
}: {
  record: ManagerBonusRecord;
  workflow: BonusWorkflowItem;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold tracking-normal">
            Perfil individual del gerente
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {record.manager} / {record.branch} / {record.line}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusClass(record.status)}>{record.status}</Badge>
          <Badge className={bonusStateClass(record.bonusState)}>
            {bonusStateLabel(record.bonusState)}
          </Badge>
          <Badge className={workflowStatusClass(workflow.status)}>
            {workflowStatusLabel(workflow.status)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Puntaje de desempeno", value: `${record.score}`, note: `${record.scoreDelta >= 0 ? "+" : ""}${record.scoreDelta} pts vs periodo anterior` },
          { label: "Rol evaluado", value: record.managerRole, note: `${record.branchesInScope.length} sucursal(es) en alcance` },
          { label: "Nivel de gerencia", value: managementLevelLabels[record.managementLevel], note: "definido al crear gerente" },
          { label: "Bono base", value: formatCurrency(record.baseBonusAmount), note: "monto mensual configurable" },
          { label: "Cumplimiento", value: formatRate(record.targetCompletionRate), note: "meta aprobada del periodo" },
          { label: "Bono recomendado", value: formatCurrency(workflow.recommendedAmount), note: `Bono base x ${formatRate(record.bonusCompletionFactor)}` },
          { label: "Bono final", value: workflow.status === "SYSTEM_RECOMMENDED" ? "Pendiente" : formatCurrency(workflow.finalAmount), note: workflowStatusLabel(workflow.status) },
          { label: "Bloqueos", value: `${record.blockingConditions.length}`, note: record.principalGap },
          { label: "Fortaleza", value: record.principalStrength, note: "dimension principal" },
          { label: "Accion", value: record.goalType, note: record.recommendedAction },
        ].map((item) => (
          <article className="rounded-md border bg-background p-3" key={item.label}>
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-lg font-semibold tracking-normal">{item.value}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-md border bg-blue-50 p-3 text-sm leading-6 text-blue-950">
        <div className="font-medium">Por que recibo este bono</div>
        <p className="mt-1">{record.whyBonus}</p>
        <p className="mt-1 text-xs">
          Periodo {record.period}. Cierre {closingStatusLabel(record.closingStatus)}. Modelo{" "}
          {record.formulaVersion}. {workflow.reason ?? record.approvalReason}
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Evidencia y trazabilidad</div>
          <div className="grid gap-3">
            {record.blockingConditions.length > 0 ? (
              record.blockingConditions.map((condition) => (
                <article className="rounded-md border bg-card p-3 text-xs" key={`${condition.reason}-${condition.date}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{condition.category}</Badge>
                    <Badge className={condition.state === "Bloquea" ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>
                      {condition.state}
                    </Badge>
                  </div>
                  <div className="font-medium">{condition.reason}</div>
                  <p className="mt-1 leading-5 text-muted-foreground">
                    {condition.evidence}
                  </p>
                  <div className="mt-2 grid gap-1 text-muted-foreground">
                    <span>Responsable: {condition.reviewer}</span>
                    <span>Fecha: {condition.date}</span>
                    <span>Plan: {condition.correctivePlan}</span>
                    <span>Reevaluacion: {condition.reevaluationDate}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
                Sin bloqueos activos. Mantener evidencia de metas, cierres y datos.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Flujo de aprobacion</div>
          <div className="grid gap-2 text-xs">
            {[
              "El sistema calcula puntaje y bono recomendado",
              "El gerente revisa el calculo y agrega evidencia",
              "Gerencia de Operaciones o autoridad autorizada revisa",
              "La decision queda como aprobada, rechazada o ajustada con motivo",
              "Auditoria consulta cambios, usuario, motivo y evidencia",
              "Nomina externa recibe solo el resultado aprobado; no hay pago automatico",
            ].map((step, index) => (
              <div className="flex items-center gap-3 rounded-md border bg-card p-2" key={step}>
                <div className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BonusDecisionWorkflow({
  onDecision,
  pending,
  record,
  workflow,
}: {
  onDecision: (
    record: ManagerBonusRecord,
    action: BonusDecisionAction,
    payload?: { finalAmount?: number; reason?: string },
  ) => Promise<void>;
  pending: boolean;
  record: ManagerBonusRecord;
  workflow: BonusWorkflowItem;
}) {
  const [modal, setModal] = useState<BonusDecisionModalState | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const canDecide =
    workflow.status === "SYSTEM_RECOMMENDED" &&
    (workflow.canApprove || workflow.canReject || workflow.canAdjust);

  async function approve() {
    setLocalError(null);
    try {
      await onDecision(record, "approve");
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "No se pudo aprobar el bono.",
      );
    }
  }

  async function submitModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!modal) {
      return;
    }

    const reason = modal.reason.trim();

    if (!reason) {
      setLocalError("El motivo es obligatorio para esta decision.");
      return;
    }

    const finalAmount =
      modal.action === "adjust" ? Number(modal.amount) : undefined;

    setLocalError(null);

    try {
      await onDecision(record, modal.action, {
        finalAmount,
        reason,
      });
      setModal(null);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la decision.",
      );
    }
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid gap-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BadgeDollarSign className="size-4 text-primary" />
            Aprobacion auditable de bono
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            La decision queda registrada con usuario, fecha y motivo cuando
            aplica. El puntaje original, monto recomendado y desglose se
            conservan despues de decidir.
          </p>
        </div>
        <Badge className={workflowStatusClass(workflow.status)}>
          {workflowStatusLabel(workflow.status)}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: "BONO RECOMENDADO",
            note: "monto calculado por el sistema",
            value: formatCurrency(workflow.recommendedAmount),
          },
          {
            label: "BONO FINAL",
            note:
              workflow.status === "SYSTEM_RECOMMENDED"
                ? "pendiente de decision"
                : workflowStatusLabel(workflow.status),
            value:
              workflow.status === "SYSTEM_RECOMMENDED"
                ? "Pendiente"
                : formatCurrency(workflow.finalAmount),
          },
          {
            label: "PUNTAJE",
            note: "puntaje original preservado",
            value: `${workflow.scoreOriginal}/100`,
          },
          {
            label: "Gerente",
            note: record.managerRole,
            value: record.manager,
          },
          {
            label: "Periodo",
            note: record.line,
            value: workflow.period,
          },
        ].map((item) => (
          <article className="rounded-md border bg-background p-3" key={item.label}>
            <div className="text-xs font-medium text-muted-foreground">
              {item.label}
            </div>
            <div className="mt-1 text-lg font-semibold tracking-normal">
              {item.value}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {item.note}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Desglose original</div>
          <div className="grid gap-2">
            {record.dimensions.map((dimension) => (
              <div
                className="grid gap-1 rounded-md border bg-card p-2 text-xs"
                key={`${record.id}-${dimension.id}-workflow`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{dimension.label}</span>
                  <span className="text-muted-foreground">
                    {dimension.score}/100 · {dimension.points} pts
                  </span>
                </div>
                <ProgressBar value={dimension.score} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 rounded-md border bg-background p-3">
          <div className="text-sm font-medium">Decision</div>
          {workflow.status !== "SYSTEM_RECOMMENDED" ? (
            <div className="rounded-md border bg-card p-3 text-xs leading-5 text-muted-foreground">
              <div className="font-medium text-foreground">
                {workflowStatusLabel(workflow.status)}
              </div>
              <div>Usuario: {workflow.userEmail || "Auditoria interna"}</div>
              <div>Fecha: {workflow.decidedAt || "Pendiente"}</div>
              {workflow.reason ? <div>Motivo: {workflow.reason}</div> : null}
            </div>
          ) : canDecide ? (
            <div className="grid gap-2">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending || !workflow.canApprove}
                onClick={approve}
                type="button"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Aprobar
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending || !workflow.canAdjust}
                onClick={() =>
                  setModal({
                    action: "adjust",
                    amount: String(workflow.recommendedAmount),
                    reason: "",
                  })
                }
                type="button"
              >
                <Pencil className="size-4" />
                Ajustar
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending || !workflow.canReject}
                onClick={() =>
                  setModal({
                    action: "reject",
                    amount: "0",
                    reason: "",
                  })
                }
                type="button"
              >
                <XCircle className="size-4" />
                Rechazar
              </button>
            </div>
          ) : (
            <div className="rounded-md border bg-card p-3 text-xs leading-5 text-muted-foreground">
              Tu rol puede consultar este bono, pero no aprobarlo,
              modificarlo ni rechazarlo.
            </div>
          )}

          {localError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
              {localError}
            </div>
          ) : null}

          <div className="rounded-md border bg-card p-3 text-xs leading-5 text-muted-foreground">
            Auditoria: {workflow.auditEvents.length} evento(s). No ejecuta
            pagos ni envia datos a nomina.
          </div>
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            className="grid w-full max-w-lg gap-4 rounded-md border bg-background p-5 shadow-xl"
            onSubmit={submitModal}
          >
            <div className="grid gap-1">
              <h3 className="text-lg font-semibold tracking-normal">
                {modal.action === "adjust" ? "Ajustar bono" : "Rechazar bono"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                El motivo queda registrado en auditoria junto con usuario,
                fecha, monto recomendado y monto final.
              </p>
            </div>
            <div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>Monto recomendado</span>
                <span className="font-medium">
                  {formatCurrency(workflow.recommendedAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Bono base autorizado</span>
                <span className="font-medium">
                  {formatCurrency(record.baseBonusAmount)}
                </span>
              </div>
              {modal.action === "adjust" ? (
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Monto nuevo
                  </span>
                  <input
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    max={record.baseBonusAmount}
                    min="0"
                    onChange={(event) =>
                      setModal({ ...modal, amount: event.target.value })
                    }
                    step="1"
                    type="number"
                    value={modal.amount}
                  />
                </label>
              ) : null}
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Motivo obligatorio
                </span>
                <textarea
                  className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) =>
                    setModal({ ...modal, reason: event.target.value })
                  }
                  placeholder="Explica la razon de negocio y evidencia usada."
                  value={modal.reason}
                />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted"
                disabled={pending}
                onClick={() => setModal(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={pending}
                type="submit"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Registrar decision
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function BonusSimulator({ record }: { record: ManagerBonusRecord }) {
  const [occupancyLift, setOccupancyLift] = useState(6);
  const [marginLift, setMarginLift] = useState(3);
  const [dataLift, setDataLift] = useState(4);

  useEffect(() => {
    setOccupancyLift(6);
    setMarginLift(3);
    setDataLift(4);
  }, [record.id]);

  const simulatedScore = Math.round(
    Math.min(100, record.score + occupancyLift * 0.35 + marginLift * 0.75 + dataLift * 0.25),
  );
  const simulatedTargetCompletionRate = Math.min(
    1.2,
    record.targetCompletionRate + occupancyLift * 0.004 + marginLift * 0.006,
  );
  const simulatedCompletionFactor = getGoalCompletionFactor(
    simulatedTargetCompletionRate,
  );
  const simulatedIsEligible =
    !(record.bonusState === "NOT ELIGIBLE" && record.dataQuality + dataLift < 70) &&
    simulatedScore >= 70;
  const simulatedBonus =
    calculateRecommendedManagerBonus({
      baseBonusAmount: record.baseBonusAmount,
      isEligible: simulatedIsEligible,
      targetCompletionRate: simulatedTargetCompletionRate,
    });

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="size-4 text-primary" />
          Simulador de bono
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Planeacion solamente: no modifica datos reales ni reglas aprobadas.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-4">
          {[
            {
              label: "Subir ocupacion efectiva",
              value: occupancyLift,
              max: 15,
              setter: setOccupancyLift,
              suffix: "pts",
            },
            {
              label: "Mejorar margen",
              value: marginLift,
              max: 8,
              setter: setMarginLift,
              suffix: "pts",
            },
            {
              label: "Mejorar calidad de datos",
              value: dataLift,
              max: 12,
              setter: setDataLift,
              suffix: "pts",
            },
          ].map((control) => (
            <label className="grid gap-2 text-sm" key={control.label}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{control.label}</span>
                <span className="text-muted-foreground">
                  +{control.value} {control.suffix}
                </span>
              </div>
              <input
                className="w-full accent-primary"
                max={control.max}
                min="0"
                onChange={(event) => control.setter(Number(event.target.value))}
                type="range"
                value={control.value}
              />
            </label>
          ))}
        </div>
        <div className="grid gap-3 rounded-md border bg-background p-3">
          <div>
            <div className="text-xs text-muted-foreground">Puntaje actual</div>
            <div className="text-2xl font-semibold">{record.score}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Puntaje simulado</div>
            <div className="text-2xl font-semibold text-emerald-700">
              {simulatedScore}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Cumplimiento simulado</div>
            <div className="text-2xl font-semibold">
              {formatRate(simulatedCompletionFactor)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bono recomendado</div>
            <div className="text-2xl font-semibold">
              {formatCurrency(simulatedBonus)}
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Si se corrigen estas brechas, el bono podria cambiar de{" "}
            {formatCurrency(record.bonusRecommended)} a {formatCurrency(simulatedBonus)}.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ManagerBonusDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState(createDefaultFilters);
  const [pendingDecisionId, setPendingDecisionId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowItems, setWorkflowItems] = useState<BonusWorkflowItem[]>([]);
  const [workflowLoaded, setWorkflowLoaded] = useState(false);

  const refreshBonusWorkflow = useCallback(async () => {
    setWorkflowError(null);

    try {
      const response = await fetch("/api/bonuses/decisions", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as BonusWorkflowResponse;

      if (!response.ok || payload.ok !== true || !Array.isArray(payload.items)) {
        throw new Error("No se pudo cargar el workflow de bonos.");
      }

      setWorkflowItems(payload.items);
      setWorkflowLoaded(true);
    } catch (error) {
      setWorkflowItems([]);
      setWorkflowLoaded(true);
      setWorkflowError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el workflow de bonos.",
      );
    }
  }, []);

  async function submitBonusDecision(
    record: ManagerBonusRecord,
    action: BonusDecisionAction,
    payload: { finalAmount?: number; reason?: string } = {},
  ) {
    setDecisionNotice(null);
    setPendingDecisionId(record.id);

    try {
      const response = await fetch("/api/bonuses/decisions", {
        body: JSON.stringify({
          action,
          bonusRecommendationId: record.id,
          finalAmount: payload.finalAmount,
          reason: payload.reason,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as BonusDecisionResponse;

      if (!response.ok || result.ok !== true || !result.item) {
        throw new Error(result.error ?? "No se pudo registrar la decision.");
      }

      setWorkflowItems((currentItems) =>
        currentItems.map((item) =>
          item.bonusRecommendationId === record.id ? result.item! : item,
        ),
      );
      setDecisionNotice(
        `${workflowStatusLabel(result.item.status)} registrado para ${record.manager}.`,
      );
    } finally {
      setPendingDecisionId(null);
    }
  }

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
    void refreshBonusWorkflow();
  }, [refreshBonusWorkflow]);

  const lineSlug = useMemo(() => resolveContextLine(context), [context]);
  const screen = useMemo(() => getManagerBonusScreen(lineSlug), [lineSlug]);
  const workflowById = useMemo(
    () =>
      new Map(
        workflowItems.map((item) => [item.bonusRecommendationId, item]),
      ),
    [workflowItems],
  );
  const contextRecords = useMemo(() => {
    if (!workflowLoaded) {
      return [];
    }

    let records = screen.records.filter((record) => workflowById.has(record.id));
    const branchName = context?.branchName;
    const managerName = context?.managerName;

    if (branchName && !/^Todas/i.test(branchName)) {
      records = records.filter((record) => record.branch === branchName);
    }

    if (
      managerName &&
      managerName !== "Todos los gerentes" &&
      !/^Gerencia operaciones/i.test(managerName) &&
      managerName !== "Gerentes sucursales SV"
    ) {
      records = records.filter((record) => record.manager === managerName);
    }

    return records;
  }, [
    context?.branchName,
    context?.managerName,
    screen.records,
    workflowById,
    workflowLoaded,
  ]);
  const filteredRecords = useMemo(
    () =>
      contextRecords.filter(
        (record) =>
          (filters.bonusState === allOption || record.bonusState === filters.bonusState) &&
          (filters.goalType === allOption || record.goalType === filters.goalType) &&
          (filters.managerRole === allOption || record.managerRole === filters.managerRole) &&
          (filters.managerType === allOption || record.managerType === filters.managerType) &&
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
  const selectedWorkflow = selectedRecord
    ? (workflowById.get(selectedRecord.id) ?? defaultWorkflowItem(selectedRecord))
    : null;
  const chart = useMemo(
    () => buildManagerBonusTrendChart(filteredRecords),
    [filteredRecords],
  );
  const backtest = useMemo(
    () => getManagerBonusBacktest(contextRecords),
    [contextRecords],
  );

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
            Entorno DEMO
          </Badge>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <UsersRound className="size-5 text-primary" />
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

      {!workflowLoaded ? (
        <section className="flex items-center gap-2 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          Cargando permisos y auditoria de bonos...
        </section>
      ) : null}

      {workflowError ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
          {workflowError}
        </section>
      ) : null}

      {decisionNotice ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          {decisionNotice}
        </section>
      ) : null}

      <ManagerFiltersPanel
        filters={filters}
        onChange={setFilters}
        records={contextRecords}
      />

      <ReadableTabs
        tabs={[
          {
            id: "lectura-gerentes",
            label: "Lectura rapida",
            description: "KPIs, pesos e insights antes del ranking.",
            children: (
              <>
                <ExecutiveManagerPerformanceTable records={filteredRecords} />
                <GroupedMetrics metrics={screen.metrics} />
                <BonusBacktestPanel backtest={backtest} />
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <WeightModel weights={screen.weights} />
                  <section className="rounded-md border bg-card p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                      <ClipboardList className="size-4 text-primary" />
                      Insights ejecutivos
                    </div>
                    <div className="grid gap-3 text-sm text-muted-foreground">
                      {screen.executiveInsights.map((insight) => (
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
            id: "bonos-gerentes",
            label: "Elegibilidad y bono",
            description: "Ranking, dimensiones, elegibilidad y bono recomendado.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <ManagerRankingTable
                    onSelect={setSelectedId}
                    records={filteredRecords}
                    selectedId={selectedRecord.id}
                    workflowById={workflowById}
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ScoreDimensionBars record={selectedRecord} />
                    <BonusWaterfall record={selectedRecord} />
                  </div>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay gerentes para los filtros seleccionados.
                </section>
              ),
          },
          {
            id: "comparacion-gerentes",
            label: "Comparacion",
            description: "Tendencias y matrices para decidir.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ComplianceBonusChart records={filteredRecords} />
                    <ProfitabilityPerformanceMatrix
                      onSelect={setSelectedId}
                      records={filteredRecords}
                    />
                  </div>
                  <AnalyticsComparisonChart
                    description={chart.description}
                    enableSeriesSelection
                    insights={chart.insights}
                    maxSelectableSeries={5}
                    metricOptions={chart.metricOptions}
                    series={chart.series}
                    seriesSelectionHint="Elige hasta cinco gerentes para comparar sus lineas en la grafica."
                    seriesSelectorLabel="Gerentes a comparar"
                    title={chart.title}
                    xLabels={chart.xLabels}
                    yLabel={chart.yLabel}
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ReductionPareto records={filteredRecords} />
                    <TalentMatrix records={filteredRecords} />
                  </div>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay gerentes para los filtros seleccionados.
                </section>
              ),
          },
          {
            id: "detalle-gerente",
            label: "Detalle y simulacion",
            description: "Perfil, causa y cambio posible del bono.",
            children:
              filteredRecords.length > 0 && selectedRecord && selectedWorkflow ? (
                <>
                  <ManagerProfile
                    record={selectedRecord}
                    workflow={selectedWorkflow}
                  />
                  <BonusDecisionWorkflow
                    onDecision={submitBonusDecision}
                    pending={pendingDecisionId === selectedRecord.id}
                    record={selectedRecord}
                    workflow={selectedWorkflow}
                  />
                  <BonusSimulator record={selectedRecord} />
                  <section className="rounded-md border bg-muted p-4 text-sm leading-6 text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                      <GitBranch className="size-4 text-primary" />
                      {screen.rule}
                    </div>
                    <p>
                      Resultado de sucursal, desempeno del gerente, bono
                      recomendado, bono aprobado, bloqueos, evidencia y
                      trazabilidad se muestran por separado para que el calculo
                      no sea una caja negra.
                    </p>
                  </section>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay gerentes para los filtros seleccionados.
                </section>
              ),
          },
        ]}
      />
    </section>
  );
}
