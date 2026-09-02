"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Goal,
  History,
  Info,
  Lightbulb,
  LockKeyhole,
  Save,
  Send,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  LaboratoryBranchSummary,
  LaboratoryClosure,
  LaboratoryClosureInputs,
  LaboratoryInsight,
  LaboratoryKpiResult,
  LaboratoryTarget,
  LaboratoryTargetComparison,
  LaboratoryTargetDirection,
  LaboratoryTargetableKpiId,
  LaboratoryWorkspace,
} from "@/lib/analytics/laboratory-closures";
import { cn } from "@/lib/utils";

type DashboardMode =
  | "branch-home"
  | "new-closure"
  | "history"
  | "results"
  | "targets"
  | "insights"
  | "operations"
  | "overview";

type LaboratoryVerticalDashboardProps = {
  embedded?: boolean;
  mode: DashboardMode;
};

type WorkspaceResponse =
  | {
      closure?: LaboratoryClosure;
      ok: true;
      workspace: LaboratoryWorkspace;
    }
  | {
      error: string;
      ok: false;
    };

type ClosureInputKey = keyof LaboratoryClosureInputs;

type ClosureFormValues = {
  branchId: string;
  id: string;
  inputs: Record<ClosureInputKey, string>;
  period: string;
  replacesClosureId: string;
};

type FieldConfig = {
  description: string;
  key: ClosureInputKey;
  label: string;
  source: "MANUAL" | "NUEVO PROPUESTO";
  unit: string;
};

type TargetFormValues = {
  branchId: string;
  direction: LaboratoryTargetDirection;
  kpiId: LaboratoryTargetableKpiId;
  period: string;
  status: "active" | "inactive";
  targetValue: string;
};

const inputDefaults: Record<ClosureInputKey, string> = {
  analizaOrders: "",
  analizaRevenue: "",
  averageTurnaroundTimeHours: "",
  cardRevenue: "",
  cashRevenue: "",
  clientsTotal: "",
  closureObservations: "",
  costOfSales: "",
  creditRevenue: "",
  customerServiceCount: "",
  drsvClients: "",
  drsvOrders: "",
  drsvRevenue: "",
  homeServiceOrders: "",
  homeServiceRevenue: "",
  mixedPaymentRevenue: "",
  nurseCount: "",
  ordersTotal: "",
  phlebotomistCount: "",
  processedTests: "",
  profilesTotal: "",
  referredOrders: "",
  referredRevenue: "",
  rejectedTests: "",
  reprocessedTests: "",
  revenueTotal: "",
  technicalCapacityTests: "",
  technicalStaffCount: "",
};

const productionFields: FieldConfig[] = [
  {
    description: "Ordenes totales registradas para la sucursal.",
    key: "ordersTotal",
    label: "Ordenes",
    source: "MANUAL",
    unit: "ordenes",
  },
  {
    description: "Clientes atendidos en el periodo sin datos personales.",
    key: "clientsTotal",
    label: "Clientes",
    source: "MANUAL",
    unit: "personas",
  },
  {
    description: "Perfiles o servicios procesados segun plantilla actual.",
    key: "profilesTotal",
    label: "Perfiles",
    source: "MANUAL",
    unit: "perfiles",
  },
  {
    description: "Pruebas procesadas. Campo propuesto para KPIs por prueba.",
    key: "processedTests",
    label: "Pruebas procesadas",
    source: "NUEVO PROPUESTO",
    unit: "pruebas",
  },
];

const financeFields: FieldConfig[] = [
  {
    description: "Facturacion del mes. No incluye metas ni porcentajes.",
    key: "revenueTotal",
    label: "Facturacion / venta",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Costo de ventas asociado al cierre.",
    key: "costOfSales",
    label: "Costo de ventas",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Venta por tarjeta.",
    key: "cardRevenue",
    label: "Tarjeta",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Venta en efectivo.",
    key: "cashRevenue",
    label: "Efectivo",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Venta al credito.",
    key: "creditRevenue",
    label: "Credito",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Venta con pago mixto.",
    key: "mixedPaymentRevenue",
    label: "Pago mixto",
    source: "MANUAL",
    unit: "USD",
  },
];

const originFields: FieldConfig[] = [
  {
    description: "Facturacion de referidos.",
    key: "referredRevenue",
    label: "Referidos venta",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Ordenes de referidos.",
    key: "referredOrders",
    label: "Referidos ordenes",
    source: "MANUAL",
    unit: "ordenes",
  },
  {
    description: "Facturacion directa Analiza.",
    key: "analizaRevenue",
    label: "Analiza venta",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Ordenes directas Analiza.",
    key: "analizaOrders",
    label: "Analiza ordenes",
    source: "MANUAL",
    unit: "ordenes",
  },
  {
    description: "Facturacion DRSV.",
    key: "drsvRevenue",
    label: "DRSV venta",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Ordenes DRSV.",
    key: "drsvOrders",
    label: "DRSV ordenes",
    source: "MANUAL",
    unit: "ordenes",
  },
  {
    description: "Clientes DRSV.",
    key: "drsvClients",
    label: "DRSV clientes",
    source: "MANUAL",
    unit: "clientes",
  },
  {
    description: "Facturacion de servicio a domicilio.",
    key: "homeServiceRevenue",
    label: "Domicilio venta",
    source: "MANUAL",
    unit: "USD",
  },
  {
    description: "Ordenes de servicio a domicilio.",
    key: "homeServiceOrders",
    label: "Domicilio ordenes",
    source: "MANUAL",
    unit: "ordenes",
  },
];

const capacityFields: FieldConfig[] = [
  {
    description: "Flebotomistas activos durante el periodo.",
    key: "phlebotomistCount",
    label: "Flebotomistas",
    source: "MANUAL",
    unit: "personas",
  },
  {
    description: "Personal de servicio al cliente activo.",
    key: "customerServiceCount",
    label: "Servicio al cliente",
    source: "MANUAL",
    unit: "personas",
  },
  {
    description: "Enfermeria activa para Laboratorio.",
    key: "nurseCount",
    label: "Enfermeria",
    source: "MANUAL",
    unit: "personas",
  },
  {
    description: "Personal tecnico activo.",
    key: "technicalStaffCount",
    label: "Personal tecnico",
    source: "MANUAL",
    unit: "personas",
  },
  {
    description: "Capacidad tecnica mensual en pruebas.",
    key: "technicalCapacityTests",
    label: "Capacidad tecnica",
    source: "NUEVO PROPUESTO",
    unit: "pruebas",
  },
];

const qualityFields: FieldConfig[] = [
  {
    description: "Tiempo promedio de entrega en horas.",
    key: "averageTurnaroundTimeHours",
    label: "TAT promedio",
    source: "NUEVO PROPUESTO",
    unit: "horas",
  },
  {
    description: "Pruebas rechazadas por calidad de muestra o proceso.",
    key: "rejectedTests",
    label: "Rechazos",
    source: "NUEVO PROPUESTO",
    unit: "pruebas",
  },
  {
    description: "Pruebas reprocesadas.",
    key: "reprocessedTests",
    label: "Reprocesos",
    source: "NUEVO PROPUESTO",
    unit: "pruebas",
  },
];

const kpiFieldLabels: Record<string, string> = {
  averageTurnaroundTimeHours: "TAT promedio",
  clientsTotal: "clientes",
  costOfSales: "costo de ventas",
  ordersTotal: "ordenes",
  processedTests: "pruebas procesadas",
  profilesTotal: "perfiles",
  rejectedTests: "pruebas rechazadas",
  reprocessedTests: "pruebas reprocesadas",
  revenueTotal: "facturacion neta",
  staffTotal: "personal operativo",
  target_production: "meta de produccion",
  target_revenue: "meta de facturacion",
  technicalCapacityTests: "capacidad tecnica",
};

function formatKpiFieldList(fields: string[]) {
  return fields.map((field) => kpiFieldLabels[field] ?? field).join(", ");
}

const targetKpiOptions: Array<{
  direction: LaboratoryTargetDirection;
  kpiId: LaboratoryTargetableKpiId;
  label: string;
  unit: "USD" | "perfiles" | "valor" | "horas" | "%";
}> = [
  {
    direction: "HIGHER_IS_BETTER",
    kpiId: "facturacion_neta",
    label: "Facturacion",
    unit: "USD",
  },
  {
    direction: "HIGHER_IS_BETTER",
    kpiId: "perfiles_total",
    label: "Perfiles",
    unit: "perfiles",
  },
  {
    direction: "HIGHER_IS_BETTER",
    kpiId: "productividad_personal",
    label: "Productividad",
    unit: "valor",
  },
  {
    direction: "HIGHER_IS_BETTER",
    kpiId: "margen_contribucion",
    label: "Margen de contribucion",
    unit: "USD",
  },
  {
    direction: "LOWER_IS_BETTER",
    kpiId: "tat_promedio",
    label: "TAT maximo",
    unit: "horas",
  },
  {
    direction: "LOWER_IS_BETTER",
    kpiId: "tasa_rechazo",
    label: "Rechazo maximo",
    unit: "%",
  },
];

const wizardSteps = [
  "Contexto",
  "Produccion",
  "Finanzas",
  "Origen",
  "Capacidad",
  "Calidad",
  "Observaciones",
  "Validacion",
  "Vista previa",
  "Publicar",
];

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "No calculable";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "No calculable";
  }

  return Math.round(value).toLocaleString("en-US");
}

function formatRatio(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "No calculable";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

function formatUnitValue(
  value: number | null | undefined,
  unit: "currency" | "count" | "ratio",
) {
  if (unit === "currency") {
    return formatMoney(value);
  }

  if (unit === "ratio") {
    return formatRatio(value);
  }

  return formatCount(value);
}

function statusBadgeClass(status: string) {
  if (
    ["VALIDADO", "cumplido", "publicado", "published", "active"].includes(
      status,
    )
  ) {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (
    ["BLOQUEADO", "incumplido", "validation_failed", "inactive"].includes(
      status,
    )
  ) {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function targetStatusLabel(status: LaboratoryTarget["status"]) {
  return status === "active" ? "Activa" : "Inactiva";
}

function priorityClass(priority: LaboratoryInsight["priority"]) {
  if (priority === "critica") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (priority === "alta") {
    return "bg-orange-100 text-orange-800 hover:bg-orange-100";
  }

  if (priority === "positiva") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function inputValueToString(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function formValuesFromClosure(closure: LaboratoryClosure): ClosureFormValues {
  return {
    branchId: closure.scope.branchId ?? "",
    id: closure.id,
    inputs: Object.fromEntries(
      Object.entries(closure.inputs).map(([key, value]) => [
        key,
        inputValueToString(value),
      ]),
    ) as Record<ClosureInputKey, string>,
    period: closure.period,
    replacesClosureId: closure.replacesClosureId ?? "",
  };
}

function emptyFormValues(workspace: LaboratoryWorkspace): ClosureFormValues {
  return {
    branchId: workspace.branches[0]?.branchId ?? "",
    id: "",
    inputs: inputDefaults,
    period: workspace.currentPeriod,
    replacesClosureId: "",
  };
}

function selectedBranch(
  workspace: LaboratoryWorkspace | null,
  formValues: ClosureFormValues,
) {
  return workspace?.branches.find(
    (branch) => branch.branchId === formValues.branchId,
  );
}

async function readWorkspaceResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | WorkspaceResponse
    | null;

  if (!payload) {
    throw new Error("Respuesta invalida del servidor.");
  }

  if (!payload.ok) {
    throw new Error(payload.error);
  }

  return payload;
}

function MetricCard({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className="grid min-h-28 gap-2 rounded-md border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-normal">{value}</div>
      <div className="text-xs leading-5 text-muted-foreground">{note}</div>
    </article>
  );
}

function TargetComparisonTable({
  comparisons,
}: {
  comparisons: LaboratoryTargetComparison[];
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Goal className="size-4 text-primary" />
        Meta vs Real
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">KPI</th>
              <th className="py-2 pr-4 font-medium">Meta</th>
              <th className="py-2 pr-4 font-medium">Real</th>
              <th className="py-2 pr-4 font-medium">Variacion</th>
              <th className="py-2 pr-4 font-medium">% Cumplimiento</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comparison) => (
              <tr className="border-b last:border-b-0" key={comparison.kpiId}>
                <td className="py-3 pr-4 font-medium">{comparison.label}</td>
                <td className="py-3 pr-4">
                  {formatUnitValue(comparison.targetValue, comparison.unit)}
                </td>
                <td className="py-3 pr-4">
                  {formatUnitValue(comparison.actualValue, comparison.unit)}
                </td>
                <td className="py-3 pr-4">
                  {formatUnitValue(comparison.variation, comparison.unit)}
                </td>
                <td className="py-3 pr-4">
                  {formatRatio(comparison.complianceRate)}
                </td>
                <td className="py-3 pr-4">
                  <Badge className={statusBadgeClass(comparison.status)}>
                    {comparison.status}
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

function TargetsList({
  targets,
  workspace,
}: {
  targets: LaboratoryTarget[];
  workspace: LaboratoryWorkspace;
}) {
  const visibleTargets = targets
    .filter((target) => target.kpiId !== "throughput")
    .sort((left, right) =>
      `${right.period}-${right.version}`.localeCompare(
        `${left.period}-${left.version}`,
      ),
    );

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Target className="size-4 text-primary" />
        Metas configuradas
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Periodo</th>
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">KPI</th>
              <th className="py-2 pr-4 font-medium">Meta</th>
              <th className="py-2 pr-4 font-medium">Direccion</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Version</th>
            </tr>
          </thead>
          <tbody>
            {visibleTargets.map((target) => (
              <tr className="border-b last:border-b-0" key={target.id}>
                <td className="py-3 pr-4">{target.period}</td>
                <td className="py-3 pr-4">
                  {workspace.branches.find(
                    (branch) => branch.branchId === target.branchId,
                  )?.branchName ?? target.branchId.slice(0, 8)}
                </td>
                <td className="py-3 pr-4 font-medium">{target.label}</td>
                <td className="py-3 pr-4">
                  {formatUnitValue(target.targetValue, target.unit)}
                </td>
                <td className="py-3 pr-4">{target.direction}</td>
                <td className="py-3 pr-4">
                  <Badge className={statusBadgeClass(target.status)}>
                    {targetStatusLabel(target.status)}
                  </Badge>
                </td>
                <td className="py-3 pr-4">v{target.version}</td>
              </tr>
            ))}
            {visibleTargets.length === 0 ? (
              <tr>
                <td
                  className="py-6 text-sm text-muted-foreground"
                  colSpan={7}
                >
                  No hay metas visibles para el alcance actual.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KpiGrid({ kpis }: { kpis: LaboratoryKpiResult[] }) {
  const [openKpiId, setOpenKpiId] = useState<LaboratoryKpiResult["id"] | null>(
    null,
  );

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const isInfoOpen = openKpiId === kpi.id;
        const infoId = `lab-kpi-info-${kpi.id}`;

        return (
          <article
            className="grid min-h-40 gap-2 rounded-md border bg-card p-4"
            key={kpi.id}
            title={`${kpi.formula}. Campos requeridos: ${formatKpiFieldList(kpi.requiredFields)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 text-sm font-medium text-muted-foreground">
                {kpi.label}
              </div>
              <Badge
                className={statusBadgeClass(
                  kpi.status === "CALCULABLE" ? "VALIDADO" : "BLOQUEADO",
                )}
              >
                {kpi.status === "CALCULABLE" ? "Calculable" : "No calculable"}
              </Badge>
            </div>
            <div className="text-2xl font-semibold tracking-normal">
              {formatUnitValue(kpi.value, kpi.unit)}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {kpi.status === "CALCULABLE"
                ? kpi.formula
                : `Falta: ${formatKpiFieldList(kpi.missingFields)}`}
            </p>
            <Button
              aria-controls={infoId}
              aria-expanded={isInfoOpen}
              className="h-8 w-fit px-2 text-xs"
              onClick={() =>
                setOpenKpiId((current) => (current === kpi.id ? null : kpi.id))
              }
              title={`Lectura de ${kpi.label}`}
              type="button"
              variant={isInfoOpen ? "secondary" : "outline"}
            >
              <Info className="size-3.5" />
              Info
            </Button>
            {isInfoOpen ? (
              <div
                className="grid gap-1 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground"
                id={infoId}
              >
                <span className="font-medium text-foreground">Lectura</span>
                <span>{kpi.reading}</span>
                <span>
                  Formula: <span className="text-foreground">{kpi.formula}</span>
                </span>
                <span>
                  Campos: {formatKpiFieldList(kpi.requiredFields)}
                </span>
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

function BranchSummaryTable({
  rows,
}: {
  rows: LaboratoryBranchSummary[];
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="size-4 text-primary" />
        Consolidado por sucursal
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Area</th>
              <th className="py-2 pr-4 font-medium">Venta</th>
              <th className="py-2 pr-4 font-medium">Cumplimiento</th>
              <th className="py-2 pr-4 font-medium">Perfiles</th>
              <th className="py-2 pr-4 font-medium">Clientes</th>
              <th className="py-2 pr-4 font-medium">Productividad</th>
              <th className="py-2 pr-4 font-medium">Margen bruto %</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.closureId}>
                <td className="py-3 pr-4 font-medium">{row.branchName}</td>
                <td className="py-3 pr-4">{row.managerName}</td>
                <td className="py-3 pr-4">{row.areaManagerName}</td>
                <td className="py-3 pr-4">{formatMoney(row.revenue)}</td>
                <td className="py-3 pr-4">
                  {formatRatio(row.revenueCompliance)}
                </td>
                <td className="py-3 pr-4">{formatCount(row.profiles)}</td>
                <td className="py-3 pr-4">{formatCount(row.clients)}</td>
                <td className="py-3 pr-4">{formatCount(row.productivity)}</td>
                <td className="py-3 pr-4">{formatRatio(row.marginRate)}</td>
                <td className="py-3 pr-4">
                  <Badge className={statusBadgeClass(row.status)}>
                    {row.dataQualityScore} / {row.status}
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

function InsightsList({ insights }: { insights: LaboratoryInsight[] }) {
  return (
    <section className="grid gap-4">
      {insights.map((insight) => (
        <article className="insight-card rounded-lg border bg-card p-4" key={insight.id}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={priorityClass(insight.priority)}>
              {insight.priority}
            </Badge>
            <Badge variant="outline">{insight.branchName}</Badge>
            <Badge variant="outline">{insight.period}</Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-normal">
            {insight.title}
          </h3>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
            <p className="rounded-lg bg-muted/50 p-3">
              <span className="block text-xs font-semibold uppercase text-foreground">Que ocurrio</span>
              {insight.whatHappened}
            </p>
            <p className="rounded-lg bg-muted/50 p-3">
              <span className="block text-xs font-semibold uppercase text-foreground">Cuanto</span>
              {insight.comparison}
            </p>
            <p className="rounded-lg bg-muted/50 p-3">
              <span className="block text-xs font-semibold uppercase text-foreground">Impacto</span>
              {insight.impact}
            </p>
            <p className="rounded-lg bg-muted/50 p-3">
              <span className="block text-xs font-semibold uppercase text-foreground">Accion</span>
              {insight.recommendation}
            </p>
          </div>
          <p className="mt-3 rounded-lg border bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
            Evidencia: {insight.evidence}
          </p>
        </article>
      ))}
      {insights.length === 0 ? (
        <section className="rounded-md border border-dashed bg-card p-6 text-sm leading-6 text-muted-foreground">
          No hay insights para el alcance actual. Se generan cuando existe un
          cierre publicado con evidencia suficiente contra meta.
        </section>
      ) : null}
    </section>
  );
}

function ValidationPanel({ closure }: { closure: LaboratoryClosure | null }) {
  if (!closure) {
    return (
      <section className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
        Guarda un borrador para validar la informacion antes de publicar.
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={statusBadgeClass(closure.validation.state)}>
          {closure.validation.state}
        </Badge>
        <Badge variant="outline">Calidad {closure.dataQualityScore}/100</Badge>
        <Badge variant="outline">Version {closure.version}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">Bloqueos</div>
          <div className="grid gap-2 text-sm text-muted-foreground">
            {closure.validation.errors.map((issue) => (
              <span className="flex gap-2" key={issue.code}>
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                {issue.message}
              </span>
            ))}
            {closure.validation.errors.length === 0 ? (
              <span className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                Sin bloqueos.
              </span>
            ) : null}
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">Advertencias</div>
          <div className="grid gap-2 text-sm text-muted-foreground">
            {closure.validation.warnings.map((issue) => (
              <span className="flex gap-2" key={issue.code}>
                <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-600" />
                {issue.message}
              </span>
            ))}
            {closure.validation.warnings.length === 0 ? (
              <span className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                Sin advertencias.
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Header({
  mode,
  workspace,
}: {
  mode: DashboardMode;
  workspace: LaboratoryWorkspace | null;
}) {
  const titleByMode: Record<DashboardMode, string> = {
    "branch-home": "Mi sucursal Laboratorio",
    history: "Historial de cierres Laboratorio",
    insights: "Insights Laboratorio",
    "new-closure": "Nuevo cierre mensual Laboratorio",
    operations: "Resumen operativo Laboratorio",
    overview: "Resumen Laboratorio",
    results: "Resultados Laboratorio",
    targets: "Metas Laboratorio",
  };
  const descriptionByMode: Record<DashboardMode, string> = {
    "branch-home":
      "Entrada simple para completar cierre, revisar resultado, metas e insights de la sucursal.",
    history:
      "Cierres con historial. Un cierre publicado solo se corrige creando una nueva version con motivo.",
    insights:
      "Alertas generadas desde datos reales, metas aprobadas y cierres publicados.",
    "new-closure":
      "Formulario guiado para capturar el cierre mensual sin replicar las hojas de Excel.",
    operations:
      "Consolidado por area y sucursal dentro del alcance autorizado.",
    overview:
      "Lectura ejecutiva de Laboratorio desde cierres publicados.",
    results:
      "Indicadores calculados desde el cierre mensual publicado.",
    targets:
      "Metas por periodo, pais, sucursal e indicador.",
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px] xl:items-end">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
            Entorno DEMO
          </Badge>
          <Badge variant="outline">Laboratorio end-to-end</Badge>
          <Badge variant="outline">Fuente: cierre publicado</Badge>
        </div>
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            {titleByMode[mode]}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {descriptionByMode[mode]}
          </p>
        </div>
      </div>
      <aside className="rounded-md border bg-card p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-primary" />
          Alcance de acceso
        </div>
        <div className="grid gap-1 text-muted-foreground">
          <span>Rol: {workspace?.actorRole ?? "verificando"}</span>
          <span>Periodo actual: {workspace?.currentPeriod ?? "..."}</span>
          <span>
            Sucursales visibles: {workspace?.branches.length ?? 0}
          </span>
          <span>
            Pendientes: {workspace?.pendingClosureCount ?? 0}
          </span>
        </div>
      </aside>
    </div>
  );
}

export function LaboratoryVerticalDashboard({
  embedded = false,
  mode,
}: LaboratoryVerticalDashboardProps) {
  const [workspace, setWorkspace] = useState<LaboratoryWorkspace | null>(null);
  const [formValues, setFormValues] = useState<ClosureFormValues | null>(null);
  const [targetFormValues, setTargetFormValues] =
    useState<TargetFormValues | null>(null);
  const [workingClosure, setWorkingClosure] =
    useState<LaboratoryClosure | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedBranchScope = selectedBranch(workspace, formValues ?? {
    branchId: "",
    id: "",
    inputs: inputDefaults,
    period: "",
    replacesClosureId: "",
  });

  async function refreshWorkspace() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/laboratory/closures", {
        cache: "no-store",
      });
      const payload = await readWorkspaceResponse(response);

      setWorkspace(payload.workspace);
      setWorkingClosure(payload.workspace.draftClosure);
      setFormValues(
        payload.workspace.draftClosure
          ? formValuesFromClosure(payload.workspace.draftClosure)
          : emptyFormValues(payload.workspace),
      );
      setTargetFormValues({
        branchId: payload.workspace.branches[0]?.branchId ?? "",
        direction: "HIGHER_IS_BETTER",
        kpiId: "facturacion_neta",
        period: payload.workspace.currentPeriod,
        status: "active",
        targetValue: "",
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo cargar Laboratorio.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  const saveDraft = useCallback(async (values: ClosureFormValues, silent = false) => {
    if (!workspace?.canCreateClosure) {
      throw new Error("Este rol no puede guardar cierres.");
    }

    setSaving(true);

    try {
      const response = await fetch("/api/laboratory/closures", {
        body: JSON.stringify({
          branchId: values.branchId,
          id: values.id || undefined,
          inputs: values.inputs,
          period: values.period,
          replacesClosureId: values.replacesClosureId || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await readWorkspaceResponse(response);

      if (payload.closure) {
        setWorkingClosure(payload.closure);
        setFormValues(formValuesFromClosure(payload.closure));
      }

      setWorkspace(payload.workspace);
      setDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString("es-SV", {
        hour: "2-digit",
        minute: "2-digit",
      }));

      if (!silent) {
        setError("");
      }

      return payload.closure ?? null;
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo guardar el borrador.",
      );
      throw nextError;
    } finally {
      setSaving(false);
    }
  }, [workspace?.canCreateClosure]);

  useEffect(() => {
    if (
      mode !== "new-closure" ||
      !dirty ||
      !formValues ||
      !workspace?.canCreateClosure
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveDraft(formValues, true).catch(() => undefined);
    }, 1600);

    return () => window.clearTimeout(timeout);
  }, [dirty, formValues, mode, saveDraft, workspace?.canCreateClosure]);

  async function validateDraft() {
    const savedClosure = formValues ? await saveDraft(formValues) : workingClosure;

    if (!savedClosure) {
      return;
    }

    const response = await fetch(
      `/api/laboratory/closures/${savedClosure.id}/validate`,
      { method: "POST" },
    );
    const payload = await readWorkspaceResponse(response);

    if (payload.closure) {
      setWorkingClosure(payload.closure);
      setFormValues(formValuesFromClosure(payload.closure));
    }

    setWorkspace(payload.workspace);
    setActiveStep(7);
  }

  async function publishDraft() {
    const savedClosure = formValues ? await saveDraft(formValues) : workingClosure;

    if (!savedClosure) {
      return;
    }

    const response = await fetch(
      `/api/laboratory/closures/${savedClosure.id}/publish`,
      { method: "POST" },
    );
    const payload = await readWorkspaceResponse(response);

    if (payload.closure) {
      setWorkingClosure(payload.closure);
      setFormValues(emptyFormValues(payload.workspace));
    }

    setWorkspace(payload.workspace);
    setActiveStep(9);
    setDirty(false);
  }

  async function saveTarget() {
    if (!targetFormValues) {
      return;
    }

    const selectedKpi = targetKpiOptions.find(
      (option) => option.kpiId === targetFormValues.kpiId,
    );
    const multiplier = selectedKpi?.unit === "%" ? 0.01 : 1;
    const normalizedTargetValue =
      targetFormValues.targetValue.trim() === ""
        ? ""
        : Number(targetFormValues.targetValue) * multiplier;
    const response = await fetch("/api/laboratory/targets", {
      body: JSON.stringify({
        ...targetFormValues,
        targetValue: normalizedTargetValue,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = await readWorkspaceResponse(response);

    setWorkspace(payload.workspace);
    setTargetFormValues({
      ...targetFormValues,
      targetValue: "",
    });
  }

  function updateInput(key: ClosureInputKey, value: string) {
    setFormValues((current) =>
      current
        ? {
            ...current,
            inputs: {
              ...current.inputs,
              [key]: value,
            },
          }
        : current,
    );
    setDirty(true);
  }

  function startCorrection(closure: LaboratoryClosure) {
    setFormValues({
      branchId: closure.scope.branchId ?? "",
      id: "",
      inputs: Object.fromEntries(
        Object.entries(closure.inputs).map(([key, value]) => [
          key,
          inputValueToString(value),
        ]),
      ) as Record<ClosureInputKey, string>,
      period: closure.period,
      replacesClosureId: closure.id,
    });
    setWorkingClosure(null);
    setActiveStep(0);
    setDirty(true);
  }

  const sectionClass = embedded
    ? "grid w-full gap-6"
    : "flex w-full flex-col gap-6 px-4 py-6 lg:px-6";

  const summaryCards = useMemo(() => {
    const summary = workspace?.summary;

    return [
      {
        label: "Venta",
        note: `Meta ${formatMoney(summary?.revenueTarget)}`,
        value: formatMoney(summary?.revenue),
      },
      {
        label: "Cumplimiento",
        note: "Real / meta aprobada",
        value: formatRatio(summary?.revenueCompliance),
      },
      {
        label: "Margen de contribucion",
        note: `Margen bruto ${formatRatio(summary?.marginRate)}`,
        value: formatMoney(summary?.contributionMargin),
      },
      {
        label: "Perfiles",
        note: `${formatCount(summary?.clients)} clientes`,
        value: formatCount(summary?.profiles),
      },
      {
        label: "Productividad",
        note: "Perfiles / personal",
        value: formatCount(summary?.productivity),
      },
    ];
  }, [workspace?.summary]);

  if (loading) {
    return (
      <section className={sectionClass}>
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          Cargando vertical de Laboratorio...
        </div>
      </section>
    );
  }

  if (error && !workspace) {
    return (
      <section className={sectionClass}>
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          {error}
        </div>
      </section>
    );
  }

  if (!workspace || !formValues || !targetFormValues) {
    return null;
  }

  const activeWorkspace = workspace;
  const activeFormValues = formValues;
  const activeTargetFormValues = targetFormValues;
  const latestClosure = activeWorkspace.latestPublishedClosure;
  const showWizard = mode === "new-closure";
  const showHome = mode === "branch-home";
  const showResults = ["branch-home", "results", "operations", "overview"].includes(mode);
  const showHistory = ["history", "branch-home"].includes(mode);
  const showTargets = mode === "targets";
  const showInsights = mode === "insights" || mode === "overview";
  const wizardProgress = Math.round(
    ((activeStep + 1) / wizardSteps.length) * 100,
  );

  function renderNumberFields(fields: FieldConfig[]) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <label className="grid gap-2 text-sm" key={field.key}>
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {field.label}
              <Badge variant="outline">{field.source}</Badge>
            </span>
            <Input
              min={0}
              onChange={(event) => updateInput(field.key, event.target.value)}
              placeholder="0"
              step={field.unit === "USD" ? "0.01" : "1"}
              title={field.description}
              type="number"
              value={activeFormValues.inputs[field.key]}
            />
            <span className="text-xs leading-5 text-muted-foreground">
              {field.description} Unidad: {field.unit}.
            </span>
          </label>
        ))}
      </div>
    );
  }

  function renderWizardStep() {
    if (activeStep === 0) {
      return (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Paso 1 - Contexto
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Pais, empresa, area y gerentes se resuelven desde catalogos y
              alcance autorizado.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                Periodo <Badge variant="outline">MANUAL</Badge>
              </span>
              <Input
                onChange={(event) => {
                  setFormValues({
                    ...activeFormValues,
                    period: event.target.value,
                  });
                  setDirty(true);
                }}
                type="month"
                value={activeFormValues.period}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                Sucursal <Badge variant="outline">CATALOGO</Badge>
              </span>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => {
                  setFormValues({
                    ...activeFormValues,
                    branchId: event.target.value,
                    id: "",
                  });
                  setWorkingClosure(null);
                  setDirty(true);
                }}
                value={activeFormValues.branchId}
              >
                {activeWorkspace.branches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId ?? ""}>
                    {branch.branchName}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                Pais <Badge variant="outline">AUTOMATICO</Badge>
              </span>
              <span className="text-muted-foreground">
                {selectedBranchScope?.countryName ?? "Pendiente"}
              </span>
            </div>
            <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                Gerente sucursal <Badge variant="outline">AUTOMATICO</Badge>
              </span>
              <span className="text-muted-foreground">
                {selectedBranchScope?.managerName ?? "Pendiente"}
              </span>
            </div>
            <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                Gerente area <Badge variant="outline">AUTOMATICO</Badge>
              </span>
              <span className="text-muted-foreground">
                {selectedBranchScope?.areaManagerName ?? "Pendiente"}
              </span>
            </div>
            <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                Empresa <Badge variant="outline">AUTOMATICO</Badge>
              </span>
              <span className="text-muted-foreground">
                {selectedBranchScope?.companyName ?? "Analiza Laboratorio"}
              </span>
            </div>
          </div>
        </section>
      );
    }

    if (activeStep === 1) {
      return (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Paso 2 - Produccion
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Capture datos fuente. Pruebas por paciente y cumplimiento se
              calculan automaticamente cuando exista fuente suficiente.
            </p>
          </div>
          {renderNumberFields(productionFields)}
        </section>
      );
    }

    if (activeStep === 2) {
      return (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Paso 3 - Finanzas
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Capture facturacion, costo de ventas y desglose de pago cuando
              este disponible.
            </p>
          </div>
          {renderNumberFields(financeFields)}
        </section>
      );
    }

    if (activeStep === 3) {
      return (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Paso 4 - Origen de venta
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Desglose por origen para validar consistencia comercial.
            </p>
          </div>
          {renderNumberFields(originFields)}
        </section>
      );
    }

    if (activeStep === 4) {
      return (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Paso 5 - Capacidad tecnica
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Personal disponible y capacidad tecnica propuesta para medir
              productividad y utilizacion.
            </p>
          </div>
          <details className="rounded-md border bg-background p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Campos avanzados de capacidad
            </summary>
            <div className="mt-4">{renderNumberFields(capacityFields)}</div>
          </details>
        </section>
      );
    }

    if (activeStep === 5) {
      return (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Paso 6 - Calidad
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Campos propuestos para TAT, rechazos y reprocesos. Si faltan, los
              KPIs permanecen no calculables.
            </p>
          </div>
          <details className="rounded-md border bg-background p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Campos avanzados de calidad
            </summary>
            <div className="mt-4">{renderNumberFields(qualityFields)}</div>
          </details>
        </section>
      );
    }

    if (activeStep === 6) {
      return (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Paso 7 - Observaciones
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Explique variaciones relevantes. No incluya nombres, telefonos,
              documentos ni datos personales.
            </p>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium">
              Observaciones del cierre <Badge variant="outline">MANUAL</Badge>
            </span>
            <textarea
              className="min-h-32 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) =>
                updateInput("closureObservations", event.target.value)
              }
              placeholder="Ej. baja por mantenimiento, cambio de horario, campana local..."
              value={activeFormValues.inputs.closureObservations}
            />
          </label>
        </section>
      );
    }

    if (activeStep === 7) {
      return (
        <div className="grid gap-4">
          <ValidationPanel closure={workingClosure} />
          <Button
            className="w-fit"
            disabled={saving}
            onClick={() => void validateDraft().catch(() => undefined)}
            type="button"
          >
            <ShieldCheck className="size-4" />
            Ejecutar validacion
          </Button>
        </div>
      );
    }

    if (activeStep === 8) {
      return workingClosure ? (
        <div className="grid gap-4">
          <KpiGrid kpis={workingClosure.kpiResults} />
          <TargetComparisonTable comparisons={workingClosure.targetComparisons} />
        </div>
      ) : (
        <section className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Guarda y valida el cierre para ver el preview.
        </section>
      );
    }

    return (
      <section className="grid gap-4 rounded-md border bg-card p-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold tracking-normal">
            Paso 10 - Publicar
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Al publicar, el cierre queda bloqueado y alimenta KPIs, metas,
            insights y dashboards por rol.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            label="Estado"
            note="Resultado de validacion"
            value={workingClosure?.validation.state ?? "Pendiente"}
          />
          <MetricCard
            label="Version"
            note="Correcciones generan nueva version"
            value={String(workingClosure?.version ?? 1)}
          />
          <MetricCard
            label="Calidad"
            note="Puntaje calculado"
            value={`${workingClosure?.dataQualityScore ?? 0}/100`}
          />
        </div>
        <Button
          className="w-fit"
          disabled={
            saving ||
            !activeWorkspace.canPublishClosure ||
            workingClosure?.validation.errors.length !== 0
          }
          onClick={() => void publishDraft().catch(() => undefined)}
          type="button"
        >
          <Send className="size-4" />
          Publicar cierre
        </Button>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      <Header mode={mode} workspace={activeWorkspace} />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {showHome ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="size-4 text-primary" />
              Estado del cierre actual
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Cierre actual"
                note={activeWorkspace.currentPeriod}
                value={activeWorkspace.currentPeriodStatus.replace("_", " ")}
              />
              <MetricCard
                label="Ultimo publicado"
                note={latestClosure?.scope.branchName ?? "Sin cierre publicado"}
                value={latestClosure?.period ?? "Pendiente"}
              />
              <MetricCard
                label="Alertas"
                note="desde cierre publicado"
                value={String(activeWorkspace.insights.length)}
              />
            </div>
          </div>
          <aside className="grid gap-3 rounded-md border bg-card p-4">
            <div className="text-sm font-medium">Accion principal</div>
            <Button asChild>
              <Link href="/protected/importaciones">
                <ClipboardCheck className="size-4" />
                Completar cierre mensual
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/protected/resultados">
                <BarChart3 className="size-4" />
                Ver resultados
              </Link>
            </Button>
          </aside>
        </section>
      ) : null}

      {showWizard ? (
        <section className="grid gap-4">
          <div className="rounded-md border bg-card p-4 lg:hidden">
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
              <span>
                Paso {activeStep + 1} de {wizardSteps.length}
              </span>
              <span>{wizardProgress}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${wizardProgress}%` }}
              />
            </div>
            <div className="mt-3 text-base font-semibold tracking-normal">
              {wizardSteps[activeStep]}
            </div>
          </div>

          <div className="hidden rounded-md border bg-card p-3 lg:block">
            <div className="grid gap-2 lg:grid-cols-5 xl:grid-cols-10">
              {wizardSteps.map((step, index) => (
                <button
                  className={cn(
                    "min-h-11 rounded-md border px-2 text-xs font-medium transition-colors",
                    activeStep === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-accent",
                  )}
                  key={step}
                  onClick={() => setActiveStep(index)}
                  type="button"
                >
                  {index + 1}. {step}
                </button>
              ))}
            </div>
          </div>

          {renderWizardStep()}

          <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-md border bg-card/95 p-3 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-muted-foreground">
              {saving ? "Guardando..." : "Autosave activo"}
              {lastSavedAt ? ` / ultimo guardado ${lastSavedAt}` : ""}
              {workingClosure?.replacesClosureId
                ? " / correccion versionada"
                : ""}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={activeStep === 0}
                onClick={() => setActiveStep((current) => Math.max(0, current - 1))}
                type="button"
                variant="outline"
              >
                <ArrowLeft className="size-4" />
                Anterior
              </Button>
              <Button
                disabled={saving || !activeWorkspace.canCreateClosure}
                onClick={() =>
                  void saveDraft(activeFormValues).catch(() => undefined)
                }
                type="button"
                variant="outline"
              >
                <Save className="size-4" />
                Guardar borrador
              </Button>
              <Button
                disabled={activeStep >= wizardSteps.length - 1}
                onClick={() =>
                  setActiveStep((current) =>
                    Math.min(wizardSteps.length - 1, current + 1),
                  )
                }
                type="button"
              >
                Siguiente
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {showResults ? (
        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>
          <TargetComparisonTable comparisons={activeWorkspace.targetComparisons} />
          <BranchSummaryTable rows={activeWorkspace.branchSummaries} />
          {latestClosure ? <KpiGrid kpis={latestClosure.kpiResults} /> : null}
        </section>
      ) : null}

      {showTargets ? (
        <section className="grid gap-4">
          <div className="rounded-md border bg-card p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium">
              <Target className="size-4 text-primary" />
              Configurar meta aprobada
            </div>
            {activeWorkspace.canManageTargets ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Periodo</span>
                  <Input
                    onChange={(event) =>
                      setTargetFormValues({
                        ...activeTargetFormValues,
                        period: event.target.value,
                      })
                    }
                    type="month"
                    value={activeTargetFormValues.period}
                  />
                </label>
                <label className="grid gap-2 text-sm xl:col-span-2">
                  <span className="font-medium">Sucursal</span>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) =>
                      setTargetFormValues({
                        ...activeTargetFormValues,
                        branchId: event.target.value,
                      })
                    }
                    value={activeTargetFormValues.branchId}
                  >
                    {activeWorkspace.branches.map((branch) => (
                      <option
                        key={branch.branchId}
                        value={branch.branchId ?? ""}
                      >
                        {branch.branchName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">KPI</span>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) => {
                      const nextKpi = targetKpiOptions.find(
                        (option) => option.kpiId === event.target.value,
                      );
                      setTargetFormValues({
                        ...activeTargetFormValues,
                        direction:
                          nextKpi?.direction ?? activeTargetFormValues.direction,
                        kpiId:
                          (event.target.value as LaboratoryTargetableKpiId) ??
                          activeTargetFormValues.kpiId,
                      });
                    }}
                    value={activeTargetFormValues.kpiId}
                  >
                    {targetKpiOptions.map((option) => (
                      <option key={option.kpiId} value={option.kpiId}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Meta</span>
                  <Input
                    min={0}
                    onChange={(event) =>
                      setTargetFormValues({
                        ...activeTargetFormValues,
                        targetValue: event.target.value,
                      })
                    }
                    placeholder="0"
                    type="number"
                    value={activeTargetFormValues.targetValue}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Estado</span>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) =>
                      setTargetFormValues({
                        ...activeTargetFormValues,
                        status:
                          event.target.value === "inactive"
                            ? "inactive"
                            : "active",
                      })
                    }
                    value={activeTargetFormValues.status}
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                  </select>
                </label>
                <Button
                  className="w-fit self-end"
                  onClick={() => void saveTarget().catch(() => undefined)}
                  type="button"
                >
                  <Goal className="size-4" />
                  Guardar meta
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-4 shrink-0" />
                Este rol consulta metas, pero no puede configurarlas.
              </div>
            )}
          </div>
          <TargetComparisonTable comparisons={activeWorkspace.targetComparisons} />
          <TargetsList
            targets={activeWorkspace.targets}
            workspace={activeWorkspace}
          />
        </section>
      ) : null}

      {showInsights ? <InsightsList insights={activeWorkspace.insights} /> : null}

      {showHistory ? (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="size-4 text-primary" />
            Historial auditable
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Periodo</th>
                  <th className="py-2 pr-4 font-medium">Sucursal</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 font-medium">Version</th>
                  <th className="py-2 pr-4 font-medium">Publicado</th>
                  <th className="py-2 pr-4 font-medium">Accion</th>
                </tr>
              </thead>
              <tbody>
                {activeWorkspace.closures.map((closure) => (
                  <tr className="border-b last:border-b-0" key={closure.id}>
                    <td className="py-3 pr-4">{closure.period}</td>
                    <td className="py-3 pr-4 font-medium">
                      {closure.scope.branchName}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={statusBadgeClass(closure.status)}>
                        {closure.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">v{closure.version}</td>
                    <td className="py-3 pr-4">
                      {closure.publishedAt
                        ? closure.publishedAt.slice(0, 10)
                        : "Pendiente"}
                    </td>
                    <td className="py-3 pr-4">
                      {closure.status === "published" &&
                      activeWorkspace.canCreateClosure ? (
                        <Button
                          onClick={() => startCorrection(closure)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Preparar correccion
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">Lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-md border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="size-4 text-primary" />
          Trazabilidad de la vertical
        </div>
        <div className="grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-3">
          <span>
            Input: cierre mensual de Laboratorio con campos fuente manuales y
            propuestos claramente marcados.
          </span>
          <span>
            Calculo: indicadores automaticos sin valores incompletos ni ceros falsos.
          </span>
          <span>
            Vistas: sucursal, area, operaciones y CEO leen el mismo cierre
            publicado.
          </span>
        </div>
      </section>
    </section>
  );
}

export function LaboratoryExecutiveSummary() {
  return <LaboratoryVerticalDashboard embedded mode="overview" />;
}
