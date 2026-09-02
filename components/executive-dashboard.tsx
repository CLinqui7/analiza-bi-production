"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Database,
  LineChart,
  Target,
  TrendingUp,
} from "lucide-react";

import { ImagingExecutiveSummary } from "@/components/imaging-vertical-dashboard";
import { LaboratoryExecutiveSummary } from "@/components/laboratory-vertical-dashboard";
import { PhysiotherapyExecutiveSummary } from "@/components/physiotherapy-vertical-dashboard";
import { Badge } from "@/components/ui/badge";
import { useActiveBusinessLine } from "@/hooks/use-active-business-line";
import {
  demoDashboardMeta,
  getAppointmentStatusByLine,
  getExecutiveBranchRowsForDashboard,
  getExecutiveManagerRowsForDashboard,
  getInsightPreviewsForDashboard,
  getBusinessLinesForDashboard,
  getManagerPerformanceByLine,
  getNoDataReasonForDashboard,
  getOccupancyByLine,
  getRevenueShareData,
  getTargetVsActualByLine,
  type BarPoint,
  type BusinessLineDashboard,
  type BusinessLineKey,
  type BusinessLineStatus,
} from "@/lib/analytics/demo-dashboard";
import {
  formatSemanticCurrency,
  formatSemanticPercent,
  type ExecutiveBranchRow,
  type ExecutiveManagerRow,
} from "@/lib/analytics/semantic-bi";
import {
  globalContextChangeEvent as contextChangeEvent,
  globalContextStorageKey as storageKey,
} from "@/lib/analytics/global-filters";
import { cn } from "@/lib/utils";

type StoredContext = {
  countryId?: string;
  countryName: string;
  companyId?: string;
  companyName: string;
  businessLineId?: string;
  businessLineName?: string;
  businessLineCode?: string;
  branchId?: string;
  branchName: string;
  operationalAreaId?: string;
  operationalAreaName?: string;
  managerId?: string;
  managerName?: string;
  professionalId?: string;
  professionalName?: string;
  serviceId?: string;
  serviceName?: string;
  payerId?: string;
  payerName?: string;
  channelId?: string;
  channelName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo: boolean;
};

type ExecutiveState = BusinessLineStatus | "neutral";

type CommandCenterMetric = {
  label: string;
  value: string;
  target?: string;
  variation?: string;
  state: ExecutiveState;
  formula: string;
  source: string;
  detail: string;
};

type AttentionItem = {
  category: "CRITICO" | "ATENCION" | "OPORTUNIDAD" | "POSITIVO";
  lineName: string;
  title: string;
  impact: string;
  action: string;
  state: ExecutiveState;
};

function readStoredContext() {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString("en-US")}K`;
  }

  return formatCurrency(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function formatSignedPoints(value: number) {
  return `${value > 0 ? "+" : ""}${value} pts`;
}

function formatQualityLevel(score: number) {
  if (score >= 85) {
    return "Confiable";
  }

  if (score >= 70) {
    return "Revisar";
  }

  return "Insuficiente";
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function getWeightedRate(
  lines: BusinessLineDashboard[],
  valueSelector: (line: BusinessLineDashboard) => number,
  weightSelector: (line: BusinessLineDashboard) => number,
) {
  const totalWeight = lines.reduce((sum, line) => sum + weightSelector(line), 0);

  if (totalWeight <= 0) {
    return 0;
  }

  return (
    lines.reduce(
      (sum, line) => sum + valueSelector(line) * weightSelector(line),
      0,
    ) / totalWeight
  );
}

function getMetricState(value: number, warningFloor: number, successFloor: number) {
  if (value >= successFloor) {
    return "verde";
  }

  if (value >= warningFloor) {
    return "amarillo";
  }

  return "rojo";
}

function getInverseMetricState(value: number, warningCeiling: number, successCeiling: number) {
  if (value <= successCeiling) {
    return "verde";
  }

  if (value <= warningCeiling) {
    return "amarillo";
  }

  return "rojo";
}

function buildCommandCenterMetrics(lines: BusinessLineDashboard[]) {
  const totals = lines.reduce(
    (summary, line) => ({
      accountsReceivable: summary.accountsReceivable + line.accountsReceivable,
      cancelledAppointments:
        summary.cancelledAppointments + line.cancelledAppointments,
      completedAppointments:
        summary.completedAppointments + line.completedAppointments,
      directCost: summary.directCost + line.variableCosts,
      noShows: summary.noShows + line.noShows,
      patientCount: summary.patientCount + line.patientCount,
      revenue: summary.revenue + line.revenue,
      revenueTarget: summary.revenueTarget + line.revenueTarget,
      scheduledAppointments:
        summary.scheduledAppointments + line.scheduledAppointments,
    }),
    {
      accountsReceivable: 0,
      cancelledAppointments: 0,
      completedAppointments: 0,
      directCost: 0,
      noShows: 0,
      patientCount: 0,
      revenue: 0,
      revenueTarget: 0,
      scheduledAppointments: 0,
    },
  );
  const targetFulfillment = clampPercent(totals.revenue / Math.max(totals.revenueTarget, 1));
  const contributionMarginRate = clampPercent(
    (totals.revenue - totals.directCost) / Math.max(totals.revenue, 1),
  );
  const scheduledOccupancy = clampPercent(
    getWeightedRate(
      lines,
      (line) => line.scheduledOccupancy / 100,
      (line) => line.scheduledAppointments,
    ),
  );
  const effectiveOccupancy = clampPercent(
    getWeightedRate(
      lines,
      (line) => line.effectiveOccupancy / 100,
      (line) => line.scheduledAppointments,
    ),
  );
  const noShowRate = clampPercent(
    totals.noShows / Math.max(totals.scheduledAppointments, 1),
  );
  const capacityAvailable =
    scheduledOccupancy > 0
      ? Math.max(
          Math.round(totals.scheduledAppointments / scheduledOccupancy) -
            totals.scheduledAppointments,
          0,
        )
      : 0;
  const yoyVariance = getWeightedRate(
    lines,
    (line) => line.revenueGrowthRate,
    (line) => line.revenue,
  );

  return [
    {
      detail: "Facturacion neta validada para el alcance filtrado.",
      formula: "suma de facturacion neta",
      label: "Ingresos",
      source: "Capa BI semantica DEMO",
      state: getMetricState(targetFulfillment, 0.85, 0.95),
      target: `Meta ${formatCurrency(totals.revenueTarget)}`,
      value: formatCurrency(totals.revenue),
      variation: formatSignedPercent(Math.round(yoyVariance)),
    },
    {
      detail: "Mide avance contra meta aprobada del periodo.",
      formula: "facturacion neta / meta de facturacion",
      label: "Cumplimiento meta",
      source: "Metas DEMO versionadas",
      state: getMetricState(targetFulfillment, 0.85, 0.95),
      target: "Meta 100%",
      value: formatPercent(targetFulfillment),
      variation: `${formatCurrency(Math.max(totals.revenueTarget - totals.revenue, 0))} brecha`,
    },
    {
      detail: "Porcentaje bruto/de contribucion. No equivale a utilidad neta; excluye gastos administrativos, financieros e impuestos.",
      formula: "(facturacion neta - costos directos) / facturacion neta",
      label: "Margen de contribucion bruto %",
      source: "Finanzas DEMO reconciliadas",
      state: getMetricState(contributionMarginRate, 0.25, 0.35),
      target: "Meta por unidad pendiente",
      value: formatPercent(contributionMarginRate),
      variation: `${formatCurrency(totals.revenue - totals.directCost)} margen`,
    },
    {
      detail: "Personas atendidas o clientes anonimizados por fuente.",
      formula: "clientes o pacientes unicos anonimizados",
      label: "Pacientes/clientes atendidos",
      source: "Servicios DEMO",
      state: "neutral",
      value: totals.patientCount.toLocaleString("en-US"),
      variation: "Identificador anonimizado",
    },
    {
      detail: "Capacidad comprometida por agenda o plan tecnico.",
      formula: "capacidad agendada / capacidad disponible",
      label: "Ocupacion agendada",
      source: "Capacidad DEMO",
      state: getMetricState(scheduledOccupancy, 0.7, 0.82),
      value: formatPercent(scheduledOccupancy),
      variation: "Agenda / capacidad",
    },
    {
      detail: "Capacidad realmente atendida o procesada.",
      formula: "capacidad completada / capacidad disponible",
      label: "Ocupacion efectiva",
      source: "Capacidad DEMO",
      state: getMetricState(effectiveOccupancy, 0.62, 0.75),
      value: formatPercent(effectiveOccupancy),
      variation: `${formatSignedPoints(Math.round((effectiveOccupancy - scheduledOccupancy) * 100))} vs agendada`,
    },
    {
      detail: "Citas, ordenes o estudios completados sin mezclar unidades clinicas.",
      formula: "suma de unidades operativas completadas",
      label: "Citas completadas",
      source: "Operacion DEMO",
      state: "neutral",
      value: totals.completedAppointments.toLocaleString("en-US"),
      variation: `${totals.scheduledAppointments.toLocaleString("en-US")} agendadas`,
    },
    {
      detail: "No-show aplica solo donde existe agenda formal.",
      formula: "no-show / citas agendadas",
      label: "No-show",
      source: "Citas DEMO",
      state: getInverseMetricState(noShowRate, 0.08, 0.04),
      value: totals.noShows.toLocaleString("en-US"),
      variation: formatPercent(noShowRate),
    },
    {
      detail: "Unidades disponibles derivadas de agenda y capacidad cargada.",
      formula: "capacidad disponible - capacidad agendada",
      label: "Capacidad disponible",
      source: "Capacidad DEMO",
      state: capacityAvailable > 0 ? "amarillo" : "neutral",
      value: capacityAvailable.toLocaleString("en-US"),
      variation: "Unidades de capacidad",
    },
    {
      detail: "Facturacion neta menos cobros conciliados.",
      formula: "facturacion neta - cobros conciliados",
      label: "Cuentas por cobrar",
      source: "Cobros DEMO",
      state:
        totals.accountsReceivable / Math.max(totals.revenue, 1) > 0.12
          ? "amarillo"
          : "verde",
      value: formatCurrency(totals.accountsReceivable),
      variation: `${formatPercent(totals.accountsReceivable / Math.max(totals.revenue, 1))} de ingresos`,
    },
  ] satisfies CommandCenterMetric[];
}

function buildAttentionItems(lines: BusinessLineDashboard[]) {
  if (lines.length === 0) {
    return [];
  }

  const byTargetGap = [...lines].sort(
    (left, right) =>
      left.revenue / Math.max(left.revenueTarget, 1) -
      right.revenue / Math.max(right.revenueTarget, 1),
  );
  const byMargin = [...lines].sort((left, right) => left.marginRate - right.marginRate);
  const byOccupancyGap = [...lines].sort(
    (left, right) =>
      right.scheduledOccupancy -
      right.effectiveOccupancy -
      (left.scheduledOccupancy - left.effectiveOccupancy),
  );
  const positiveLine =
    lines.find((line) => line.executiveStatus === "verde") ??
    [...lines].sort((left, right) => right.financialHealth - left.financialHealth)[0];
  const targetRisk = byTargetGap[0];
  const marginRisk = byMargin[0];
  const occupancyOpportunity = byOccupancyGap[0];

  return [
    {
      action: "Revisar costos directos, mix de servicios y registros incompletos antes de presentar conclusion.",
      category: "CRITICO",
      impact: `Brecha a meta ${formatCurrency(Math.max(targetRisk.revenueTarget - targetRisk.revenue, 0))}`,
      lineName: targetRisk.shortName,
      state: "rojo",
      title: `${formatPercent(targetRisk.revenue / Math.max(targetRisk.revenueTarget, 1))} de meta`,
    },
    {
      action: "Validar fuente de costos y confirmar si la variacion pertenece al mismo periodo.",
      category: "ATENCION",
      impact: `Margen ${formatPercent(marginRisk.marginRate)} (${formatSignedPoints(marginRisk.marginDeltaPoints)})`,
      lineName: marginRisk.shortName,
      state: "amarillo",
      title: "Margen bajo o presionado",
    },
    {
      action: "Llenar horas ociosas con confirmacion, referidores y agenda priorizada por sucursal.",
      category: "OPORTUNIDAD",
      impact: `Brecha agenda/efectiva ${Math.max(
        occupancyOpportunity.scheduledOccupancy -
          occupancyOpportunity.effectiveOccupancy,
        0,
      )} pts`,
      lineName: occupancyOpportunity.shortName,
      state: "neutral",
      title: "Capacidad disponible accionable",
    },
    {
      action: "Replicar practicas de agenda, seguimiento y control de calidad en sucursales comparables.",
      category: "POSITIVO",
      impact: `Calidad ${positiveLine.qualityScore ?? positiveLine.financialHealth}%`,
      lineName: positiveLine.shortName,
      state: "verde",
      title: "Unidad con senal saludable",
    },
  ] satisfies AttentionItem[];
}

function statusLabel(status: BusinessLineStatus) {
  if (status === "verde") {
    return "Verde";
  }

  if (status === "amarillo") {
    return "Amarillo";
  }

  return "Rojo";
}

function statusClass(status: BusinessLineStatus) {
  if (status === "verde") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "amarillo") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function getOperationalStatusTitle(line: BusinessLineDashboard | null) {
  if (line?.key === "laboratorio") {
    return "Ordenes y pacientes";
  }

  if (line?.key === "imagenes") {
    return "Estudios por estado";
  }

  return "Citas por estado";
}

function getOperationalSuccessLabel(line: BusinessLineDashboard) {
  if (line.key === "laboratorio") {
    return "Ordenes con paciente";
  }

  if (line.key === "imagenes") {
    return "Estudios realizados";
  }

  return "Exito de citas";
}

function getServiceVolumeLabel(line: BusinessLineDashboard) {
  if (line.key === "laboratorio") {
    return "Pruebas / ordenes";
  }

  if (line.key === "imagenes") {
    return "Estudios / informes";
  }

  return "Servicios / sesiones";
}

function BarList({
  data,
  suffix = "",
}: {
  data: BarPoint[];
  suffix?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div className="grid gap-1" key={item.label}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-muted-foreground">
              {item.label}
            </span>
            <span className="font-semibold text-foreground">
              {item.value.toLocaleString("en-US")}
              {suffix}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted shadow-inner">
            <div
              className="h-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(37,99,235,0.22)]"
              style={{ width: `${Math.max((item.value / maxValue) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function NoDataState({ reason }: { reason: string }) {
  return (
    <section className="executive-panel rounded-lg border border-dashed p-6 text-sm leading-6 text-muted-foreground">
      <div className="mb-2 font-semibold text-foreground">
        Sin datos disponibles para este filtro
      </div>
      <p>{reason}</p>
    </section>
  );
}

function stateClass(state: ExecutiveState) {
  if (state === "verde") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (state === "amarillo") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  if (state === "rojo") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-slate-100 text-slate-800 hover:bg-slate-100";
}

function stateLabel(state: ExecutiveState) {
  if (state === "verde") {
    return "Logrado";
  }

  if (state === "amarillo") {
    return "Atencion";
  }

  if (state === "rojo") {
    return "Riesgo";
  }

  return "Informativo";
}

function ExecutiveKpiGrid({ metrics }: { metrics: CommandCenterMetric[] }) {
  return (
    <section
      aria-label="Tarjetas principales del Resumen Ejecutivo"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
    >
      {metrics.map((metric) => (
        <article
          className="metric-card grid min-h-44 gap-3 rounded-lg border p-4"
          key={metric.label}
          title={`${metric.formula}. Fuente: ${metric.source}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              {metric.label}
            </div>
            <Badge className={stateClass(metric.state)}>
              {stateLabel(metric.state)}
            </Badge>
          </div>
          <div className="text-3xl font-semibold tracking-normal text-foreground">
            {metric.value}
          </div>
          <div className="grid gap-1 text-xs leading-5 text-muted-foreground">
            {metric.target ? <span>Meta: {metric.target}</span> : null}
            {metric.variation ? <span>Tendencia: {metric.variation}</span> : null}
            <span>{metric.detail}</span>
            <span className="rounded-md bg-muted/70 px-2 py-1 font-medium text-foreground">
              Formula: {metric.formula}
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}

function AttentionCards({ items }: { items: AttentionItem[] }) {
  return (
    <section className="executive-panel grid gap-4 rounded-lg border p-4">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          Requiere su atencion
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Priorizado por meta, margen, capacidad y calidad; no por ingresos
          absolutos.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article
            className="insight-card grid min-h-44 gap-3 rounded-lg border bg-background p-4"
            key={`${item.category}-${item.lineName}`}
          >
            <div className="flex items-start justify-between gap-3">
              <Badge className={stateClass(item.state)}>{item.category}</Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {item.lineName}
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Impacto: {item.impact}
              </p>
            </div>
            <p className="rounded-md bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
              Accion: {item.action}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExecutiveBranchTable({ rows }: { rows: ExecutiveBranchRow[] }) {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 grid gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          Tabla ejecutiva por sucursal
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Ordenada por riesgo, cumplimiento y puntaje comparable, no por ingreso absoluto.
        </p>
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article
            className="grid gap-3 rounded-lg border bg-background p-3 text-sm"
            key={`${row.company}-${row.branch}-mobile`}
          >
            <div>
              <div className="font-medium">{row.branch}</div>
              <div className="text-xs text-muted-foreground">
                {row.company} · {row.manager}
              </div>
            </div>
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt>Puntaje comparable</dt>
                <dd>{row.normalizedPerformanceScore ?? row.qualityScore}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Ingresos</dt>
                <dd className="font-medium text-foreground">
                  {formatSemanticCurrency(row.revenue)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Meta</dt>
                <dd>{formatSemanticPercent(row.targetFulfillment)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Margen</dt>
                <dd>{formatSemanticPercent(row.contributionMarginRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Ocupacion</dt>
                <dd>{formatSemanticPercent(row.effectiveOccupancy)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Calidad</dt>
                <dd>
                  {row.qualityLevel} {row.qualityScore}%
                </dd>
              </div>
            </dl>
            <p className="rounded-lg border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
              Base: {row.comparisonBasis ?? "Vista ejecutiva filtrada"}
            </p>
            {(row.outlierFlags?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-1">
                {row.outlierFlags?.slice(0, 2).map((flag) => (
                  <Badge
                    className={
                      flag.severity === "critical"
                        ? "bg-rose-100 text-rose-800 hover:bg-rose-100"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                    }
                    key={`${row.branch}-${flag.metric}`}
                  >
                    {flag.metric}
                  </Badge>
                ))}
              </div>
            ) : null}
            <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
              {row.alert}
            </p>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="data-table w-full min-w-[1180px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Empresa</th>
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Puntaje comparable</th>
              <th className="py-2 pr-4 font-medium">Ingresos</th>
              <th className="py-2 pr-4 font-medium">Meta</th>
              <th className="py-2 pr-4 font-medium">Margen contribucion</th>
              <th className="py-2 pr-4 font-medium">Ocupacion / utilizacion</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
              <th className="py-2 pr-4 font-medium">Base</th>
              <th className="py-2 pr-4 font-medium">Atipicos</th>
              <th className="py-2 pr-4 font-medium">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={`${row.company}-${row.branch}`}>
                <td className="py-3 pr-4 font-medium">{row.branch}</td>
                <td className="py-3 pr-4">{row.company}</td>
                <td className="py-3 pr-4">{row.manager}</td>
                <td className="py-3 pr-4">
                  {row.normalizedPerformanceScore ?? row.qualityScore}
                </td>
                <td className="py-3 pr-4">{formatSemanticCurrency(row.revenue)}</td>
                <td className="py-3 pr-4">{formatSemanticPercent(row.targetFulfillment)}</td>
                <td className="py-3 pr-4">
                  {formatSemanticPercent(row.contributionMarginRate)}
                </td>
                <td className="py-3 pr-4">
                  {formatSemanticPercent(row.effectiveOccupancy)}
                </td>
                <td className="py-3 pr-4">
                  {row.qualityLevel} {row.qualityScore}%
                </td>
                <td className="max-w-[220px] py-3 pr-4 text-xs text-muted-foreground">
                  {row.comparisonBasis ?? "Vista ejecutiva filtrada"}
                </td>
                <td className="py-3 pr-4">
                  {(row.outlierFlags?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {row.outlierFlags?.slice(0, 2).map((flag) => (
                        <Badge
                          className={
                            flag.severity === "critical"
                              ? "bg-rose-100 text-rose-800 hover:bg-rose-100"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                          }
                          key={`${row.branch}-${flag.metric}`}
                        >
                          {flag.metric}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin alerta</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{row.alert}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExecutiveManagerTable({ rows }: { rows: ExecutiveManagerRow[] }) {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 grid gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          Tabla ejecutiva por gerente
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Compara responsabilidad, calidad, meta, margen, ocupacion efectiva y
          puntaje comparable promedio.
        </p>
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article
            className="grid gap-3 rounded-lg border bg-background p-3 text-sm"
            key={`${row.manager}-mobile`}
          >
            <div>
              <div className="font-medium">{row.manager}</div>
              <div className="text-xs text-muted-foreground">
                {row.branches}
              </div>
            </div>
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt>Puntaje comparable</dt>
                <dd>{row.normalizedPerformanceScore ?? row.qualityScore}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Meta promedio</dt>
                <dd>{formatSemanticPercent(row.targetFulfillment)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Margen</dt>
                <dd>{formatSemanticPercent(row.contributionMarginRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Ocupacion</dt>
                <dd>{formatSemanticPercent(row.effectiveOccupancy)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Calidad</dt>
                <dd>
                  {row.qualityLevel} {row.qualityScore}%
                </dd>
              </div>
            </dl>
            <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
              {row.action}
            </p>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="data-table w-full min-w-[1040px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Sucursales</th>
              <th className="py-2 pr-4 font-medium">Puntaje comparable</th>
              <th className="py-2 pr-4 font-medium">Meta promedio</th>
              <th className="py-2 pr-4 font-medium">Margen contribucion</th>
              <th className="py-2 pr-4 font-medium">Ocupacion / utilizacion</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
              <th className="py-2 pr-4 font-medium">Atipicos</th>
              <th className="py-2 pr-4 font-medium">Accion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.manager}>
                <td className="py-3 pr-4 font-medium">{row.manager}</td>
                <td className="py-3 pr-4">{row.branches}</td>
                <td className="py-3 pr-4">
                  {row.normalizedPerformanceScore ?? row.qualityScore}
                </td>
                <td className="py-3 pr-4">{formatSemanticPercent(row.targetFulfillment)}</td>
                <td className="py-3 pr-4">
                  {formatSemanticPercent(row.contributionMarginRate)}
                </td>
                <td className="py-3 pr-4">
                  {formatSemanticPercent(row.effectiveOccupancy)}
                </td>
                <td className="py-3 pr-4">
                  {row.qualityLevel} {row.qualityScore}%
                </td>
                <td className="py-3 pr-4">
                  {(row.outlierFlags?.length ?? 0) > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {row.outlierFlags?.map((flag) => flag.metric).join(", ")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin alerta</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExecutiveStatusTable({ lines }: { lines: BusinessLineDashboard[] }) {
  const orderedLines = [...lines].sort((firstLine, secondLine) => {
    const order: Record<BusinessLineKey, number> = {
      imagenes: 0,
      fisioterapia: 1,
      laboratorio: 2,
    };

    return order[firstLine.key] - order[secondLine.key];
  });

  return (
    <section className="executive-panel grid gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          Estado general de las lineas
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Lo primero que ve el CEO: comparacion por ingresos, crecimiento,
          margen, ocupacion, pacientes, ticket y estado.
        </p>
      </div>

      <div className="grid gap-3 md:hidden">
        {orderedLines.map((line) => (
          <article
            className="grid gap-3 rounded-lg border bg-background p-3 text-sm"
            key={`${line.key}-mobile`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{line.shortName}</div>
                <div className="text-xs text-muted-foreground">
                  {line.scopeName}
                </div>
              </div>
              <Badge className={statusClass(line.executiveStatus)}>
                {statusLabel(line.executiveStatus)}
              </Badge>
            </div>
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt>Ingresos</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.revenue)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Crecimiento</dt>
                <dd>{formatSignedPercent(line.revenueGrowthRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Margen</dt>
                <dd>{formatPercent(line.marginRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Ocupacion</dt>
                <dd>{line.effectiveOccupancy}%</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Pacientes</dt>
                <dd>{line.patientCount.toLocaleString("en-US")}</dd>
              </div>
            </dl>
            <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
              {line.executiveInterpretation}
            </p>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="data-table w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Ingresos</th>
              <th className="py-2 pr-4 font-medium">Crecimiento</th>
              <th className="py-2 pr-4 font-medium">Margen bruto %</th>
              <th className="py-2 pr-4 font-medium">Ocupacion</th>
              <th className="py-2 pr-4 font-medium">Pacientes</th>
              <th className="py-2 pr-4 font-medium">Ticket</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orderedLines.map((line) => (
              <tr className="border-b last:border-b-0" key={line.key}>
                <td className="py-3 pr-4 font-medium">{line.shortName}</td>
                <td className="py-3 pr-4">{formatCompactCurrency(line.revenue)}</td>
                <td className="py-3 pr-4">
                  {formatSignedPercent(line.revenueGrowthRate)}
                </td>
                <td className="py-3 pr-4">
                  <div className="font-medium">{formatPercent(line.marginRate)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatSignedPoints(line.marginDeltaPoints)}
                  </div>
                </td>
                <td className="py-3 pr-4">{line.effectiveOccupancy}%</td>
                <td className="py-3 pr-4">
                  {line.patientCount.toLocaleString("en-US")}
                </td>
                <td className="py-3 pr-4">
                  {formatCurrency(line.averageTicket)}
                </td>
                <td className="py-3 pr-4">
                  <Badge className={statusClass(line.executiveStatus)}>
                    {statusLabel(line.executiveStatus)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2">
        {orderedLines.map((line) => (
          <p
            className="rounded-lg bg-muted/70 px-3 py-2 text-sm leading-6 text-muted-foreground"
            key={`${line.key}-interpretation`}
          >
            <span className="font-medium text-foreground">{line.shortName}: </span>
            {line.executiveInterpretation}
          </p>
        ))}
      </div>
    </section>
  );
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const safeWidth = Math.max(0, Math.min(value, 100));

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted shadow-inner">
        <div
          className="h-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(37,99,235,0.2)]"
          style={{ width: `${safeWidth}%` }}
        />
      </div>
    </div>
  );
}

function BusinessLineSummaryCard({ line }: { line: BusinessLineDashboard }) {
  const goalCompletion = line.revenue / line.revenueTarget;
  const operationalSuccess =
    line.scheduledAppointments > 0
      ? line.completedAppointments / line.scheduledAppointments
      : 0;

  return (
    <article className="metric-card grid min-h-72 gap-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{line.companyName}</h2>
          <p className="text-xs text-muted-foreground">{line.scopeName}</p>
        </div>
        <Badge variant="outline">{line.sourceNote}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Venta</div>
          <div className="text-2xl font-semibold tracking-normal">
            {formatCompactCurrency(line.revenue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Meta</div>
          <div className="text-2xl font-semibold tracking-normal">
            {formatCompactCurrency(line.revenueTarget)}
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <HealthBar label="Cumplimiento meta" value={Math.round(goalCompletion * 100)} />
        <HealthBar label="Salud operativa" value={line.operatingHealth} />
        <HealthBar label="Ocupacion efectiva" value={line.effectiveOccupancy} />
      </div>

      <div className="grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Margen bruto %</span>
          <span className="font-medium text-foreground">
            {formatPercent(line.marginRate)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{getOperationalSuccessLabel(line)}</span>
          <span className="font-medium text-foreground">
            {formatPercent(operationalSuccess)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{getServiceVolumeLabel(line)}</span>
          <span className="font-medium text-foreground">
            {line.serviceVolume.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        {line.alert}
      </p>
    </article>
  );
}

function BusinessLineSummary({ lines }: { lines: BusinessLineDashboard[] }) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          1. Resumen por linea de negocio
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Sin total mezclado: cada linea mantiene su venta, meta, margen, citas
          y ocupacion para no leer una suma que no representa la realidad.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {lines.map((line) => (
          <BusinessLineSummaryCard key={`${line.key}-${line.scopeName}`} line={line} />
        ))}
      </div>
    </section>
  );
}

function FinancialHealthByLine({ lines }: { lines: BusinessLineDashboard[] }) {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <CircleDollarSign className="size-4 text-primary" />
        Salud financiera de las lineas del negocio
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {lines.map((line) => (
          <article className="grid gap-3 rounded-lg border bg-background/70 p-3" key={line.companyName}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{line.shortName}</h3>
                <p className="text-xs text-muted-foreground">{line.scopeName}</p>
              </div>
              <Badge
                className={cn(
                  line.financialHealth >= 85 &&
                    "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
                  line.financialHealth < 85 &&
                    "bg-amber-100 text-amber-800 hover:bg-amber-100",
                )}
              >
                {line.financialHealth}%
              </Badge>
            </div>
            <HealthBar label="Salud financiera" value={line.financialHealth} />
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt>Ingresos cobrados</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.collectedRevenue)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Cuentas por cobrar</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.accountsReceivable)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Gastos fijos</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.fixedExpenses)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Gastos variables</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.variableExpenses)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Costos fijos</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.fixedCosts)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Costos variables</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.variableCosts)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function MonthlyRevenueByLine({ lines }: { lines: BusinessLineDashboard[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <TrendingUp className="size-4 text-primary" />
        Ingresos por mes
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {lines.map((line) => (
          <article className="grid gap-3" key={line.companyName}>
            <div>
              <h3 className="text-sm font-semibold">{line.shortName}</h3>
              <p className="text-xs text-muted-foreground">{line.scopeName}</p>
            </div>
            <BarList data={line.monthlyRevenue} suffix="K" />
          </article>
        ))}
      </div>
    </section>
  );
}

function OperationalLineSelector({
  lines,
  selectedLineKey,
  onSelectedLineKeyChange,
}: {
  lines: BusinessLineDashboard[];
  selectedLineKey: BusinessLineKey | "";
  onSelectedLineKeyChange: (lineKey: BusinessLineKey) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          Detalle operativo por linea de negocio
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Elige la linea para ver citas por estado, ocupacion efectiva y
          rendimiento sin mezclar negocios.
        </p>
      </div>
      <label className="grid min-w-64 gap-1 text-sm">
        <span className="font-medium">Linea de negocio</span>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            onSelectedLineKeyChange(event.target.value as BusinessLineKey)
          }
          value={selectedLineKey}
        >
          {lines.map((line) => (
            <option key={line.key} value={line.key}>
              {line.companyName}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ExecutiveDashboard() {
  const activeBusinessLine = useActiveBusinessLine();
  const [context, setContext] = useState<StoredContext | null>(null);
  const [selectedOperationalLineKey, setSelectedOperationalLineKey] =
    useState<BusinessLineKey | "">("");

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

  const selectedPeriod =
    context?.period ??
    (context?.periodStart && context?.periodEnd
      ? `${context.periodStart} a ${context.periodEnd}`
      : demoDashboardMeta.selectedPeriod);
  const dashboardContext = useMemo(
    () => ({
      branchId: context?.branchId,
      branchName: context?.branchName,
      businessLineCode: context?.businessLineCode,
      businessLineId: context?.businessLineId,
      businessLineName: context?.businessLineName,
      channelId: context?.channelId,
      channelName: context?.channelName,
      companyId: context?.companyId,
      companyName: context?.companyName,
      countryId: context?.countryId,
      countryName: context?.countryName,
      managerId: context?.managerId,
      managerName: context?.managerName,
      operationalAreaId: context?.operationalAreaId,
      operationalAreaName: context?.operationalAreaName,
      payerId: context?.payerId,
      payerName: context?.payerName,
      periodEnd: context?.periodEnd,
      periodStart: context?.periodStart,
      professionalId: context?.professionalId,
      professionalName: context?.professionalName,
      serviceId: context?.serviceId,
      serviceName: context?.serviceName,
    }),
    [context],
  );

  const lines = useMemo(
    () => getBusinessLinesForDashboard(dashboardContext),
    [dashboardContext],
  );
  const branchRows = useMemo(
    () => getExecutiveBranchRowsForDashboard(dashboardContext),
    [dashboardContext],
  );
  const managerRows = useMemo(
    () => getExecutiveManagerRowsForDashboard(dashboardContext),
    [dashboardContext],
  );
  const noDataReason = useMemo(
    () => getNoDataReasonForDashboard(dashboardContext),
    [dashboardContext],
  );
  const insightPreviews = useMemo(
    () => getInsightPreviewsForDashboard(dashboardContext),
    [dashboardContext],
  );

  const commandMetrics = useMemo(
    () => buildCommandCenterMetrics(lines),
    [lines],
  );
  const attentionItems = useMemo(() => buildAttentionItems(lines), [lines]);
  const revenueShare = useMemo(() => getRevenueShareData(lines), [lines]);
  const targetVsActual = useMemo(() => getTargetVsActualByLine(lines), [lines]);
  const averageQualityScore = useMemo(() => {
    if (lines.length === 0) {
      return 0;
    }

    return Math.round(
      lines.reduce(
        (sum, line) => sum + (line.qualityScore ?? line.financialHealth),
        0,
      ) / lines.length,
    );
  }, [lines]);
  const selectedOperationalLine = useMemo(
    () =>
      lines.find((line) => line.key === selectedOperationalLineKey) ??
      lines[0] ??
      null,
    [lines, selectedOperationalLineKey],
  );
  const operationalLines = useMemo(
    () => (selectedOperationalLine ? [selectedOperationalLine] : []),
    [selectedOperationalLine],
  );
  const appointmentStatus = useMemo(
    () => getAppointmentStatusByLine(operationalLines),
    [operationalLines],
  );
  const selectedOccupancy = useMemo(
    () => getOccupancyByLine(operationalLines),
    [operationalLines],
  );
  const managerPerformance = useMemo(
    () => getManagerPerformanceByLine(operationalLines),
    [operationalLines],
  );

  useEffect(() => {
    if (lines.length === 0) {
      setSelectedOperationalLineKey("");
      return;
    }

    if (!lines.some((line) => line.key === selectedOperationalLineKey)) {
      setSelectedOperationalLineKey(lines[0].key);
    }
  }, [lines, selectedOperationalLineKey]);

  if (activeBusinessLine.line === "Laboratorio") {
    return (
      <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
        <LaboratoryExecutiveSummary />
      </section>
    );
  }

  if (activeBusinessLine.line === "Imagenes") {
    return (
      <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
        <ImagingExecutiveSummary />
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="executive-panel-strong overflow-hidden rounded-lg border p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-300/20 text-amber-100 hover:bg-amber-300/20">
                Entorno DEMO
              </Badge>
              <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                Completitud {demoDashboardMeta.completeness}%
              </Badge>
              <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                {demoDashboardMeta.dataCoverage}
              </Badge>
            </div>
            <div className="grid gap-2">
              <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Resumen Ejecutivo
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-white/70">
                Rendimiento operativo y financiero consolidado del periodo:
                metas, capacidad, riesgos y calidad del dato en una sola vista.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.08] p-4 text-sm shadow-[0_18px_42px_-36px_rgba(0,0,0,0.7)]">
            <div className="mb-3 flex items-center gap-2 font-medium text-white">
              <CheckCircle2 className="size-4 text-[#6ee7b7]" />
              Vista ejecutiva activa
            </div>
            <div className="grid gap-1.5 text-white/70">
              <span>
                {context?.countryName ?? "Pais pendiente"} /{" "}
                {context?.companyName ?? "Empresa pendiente"} /{" "}
                {context?.businessLineName ?? "Linea pendiente"}
              </span>
              <span>{context?.branchName ?? "Sucursal pendiente"}</span>
              <span>Periodo: {selectedPeriod}</span>
              <span>Ultima actualizacion: {demoDashboardMeta.lastUpdated}</span>
              <span className="font-medium text-white">
                Calidad del dato: {formatQualityLevel(averageQualityScore)}{" "}
                {averageQualityScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {noDataReason ? (
        <NoDataState reason={noDataReason} />
      ) : (
        <>
          <ExecutiveKpiGrid metrics={commandMetrics} />
          <PhysiotherapyExecutiveSummary />
          <AttentionCards items={attentionItems} />
          <ExecutiveStatusTable lines={lines} />
          <BusinessLineSummary lines={lines} />
          <FinancialHealthByLine lines={lines} />

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="executive-panel rounded-lg border p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="size-4 text-primary" />
                Participacion por empresa
              </div>
              <BarList data={revenueShare} suffix="%" />
            </section>

            <section className="executive-panel rounded-lg border p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                <Target className="size-4 text-primary" />
                Metas vs resultados por empresa
              </div>
              <BarList data={targetVsActual} suffix="K" />
            </section>
          </div>

          <MonthlyRevenueByLine lines={lines} />

          <OperationalLineSelector
            lines={lines}
            onSelectedLineKeyChange={setSelectedOperationalLineKey}
            selectedLineKey={selectedOperationalLine?.key ?? ""}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="executive-panel rounded-lg border p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <LineChart className="size-4 text-primary" />
                  {getOperationalStatusTitle(selectedOperationalLine)}
                </div>
                {selectedOperationalLine ? (
                  <Badge variant="outline">{selectedOperationalLine.shortName}</Badge>
                ) : null}
              </div>
              <BarList data={appointmentStatus} />
            </section>

            <section className="executive-panel rounded-lg border p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Database className="size-4 text-primary" />
                  Ocupacion efectiva
                </div>
                {selectedOperationalLine ? (
                  <Badge variant="outline">{selectedOperationalLine.shortName}</Badge>
                ) : null}
              </div>
              <BarList data={selectedOccupancy} suffix="%" />
            </section>

            <section className="executive-panel rounded-lg border p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="size-4 text-primary" />
                  Rendimiento de la linea seleccionada
                </div>
                {selectedOperationalLine ? (
                  <Badge variant="outline">{selectedOperationalLine.shortName}</Badge>
                ) : null}
              </div>
              <BarList data={managerPerformance} suffix="%" />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Cambia con el selector superior de negocio, sucursal y fechas, y
                con el selector de linea de negocio de este bloque.
              </p>
            </section>
          </div>

          <ExecutiveBranchTable rows={branchRows} />
          <ExecutiveManagerTable rows={managerRows} />

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <section className="executive-panel rounded-lg border p-4">
              <div className="mb-4 text-sm font-semibold">Insights DEMO</div>
              <div className="grid gap-3">
                {insightPreviews.map((insight) => (
                  <article
                    className="insight-card grid gap-2 rounded-lg border bg-background p-3"
                    key={insight.title}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={cn(
                          insight.priority === "alta" &&
                            "bg-red-100 text-red-800 hover:bg-red-100",
                          insight.priority === "media" &&
                            "bg-amber-100 text-amber-800 hover:bg-amber-100",
                          insight.priority === "baja" &&
                            "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
                        )}
                      >
                        {insight.priority}
                      </Badge>
                      <span className="text-sm font-medium">{insight.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Indicador: {insight.affectedIndicator}
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {insight.recommendation}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="executive-panel rounded-lg border p-4">
              <div className="mb-4 text-sm font-semibold">Fuentes utilizadas</div>
              <ul className="grid gap-3 text-sm text-muted-foreground">
                {demoDashboardMeta.sources.map((source) => (
                  <li className="flex items-center gap-2" key={source}>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    {source}
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                Las metricas son DEMO. No usar como informacion operativa,
                financiera o clinica real.
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
