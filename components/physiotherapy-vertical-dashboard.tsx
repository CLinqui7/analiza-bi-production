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
  PhysiotherapyBranchSummary,
  PhysiotherapyClosure,
  PhysiotherapyClosureInputs,
  PhysiotherapyInsight,
  PhysiotherapyKpiResult,
  PhysiotherapyTarget,
  PhysiotherapyTargetComparison,
  PhysiotherapyTargetDirection,
  PhysiotherapyTargetableKpiId,
  PhysiotherapyWorkspace,
} from "@/lib/analytics/physiotherapy-closures";
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

type PhysiotherapyVerticalDashboardProps = {
  embedded?: boolean;
  mode: DashboardMode;
};

type WorkspaceResponse =
  | {
      closure?: PhysiotherapyClosure;
      ok: true;
      workspace: PhysiotherapyWorkspace;
    }
  | {
      error: string;
      ok: false;
    };

type ClosureInputKey = keyof PhysiotherapyClosureInputs;

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
  unit: string;
};

type TargetFormValues = {
  branchId: string;
  direction: PhysiotherapyTargetDirection;
  kpiId: PhysiotherapyTargetableKpiId;
  period: string;
  status: "active" | "inactive";
  targetValue: string;
};

const inputDefaults: Record<ClosureInputKey, string> = {
  appointmentsCancelled: "",
  appointmentsCompleted: "",
  appointmentsScheduled: "",
  attendedHours: "",
  availableHours: "",
  closureObservations: "",
  directCosts: "",
  ordersTotal: "",
  patientsAttended: "",
  physiotherapistsActive: "",
  revenueTotal: "",
  scheduledHours: "",
  sessionsTotal: "",
  noShowAppointments: "",
};

const productionFields: FieldConfig[] = [
  {
    description: "Facturacion del mes. No incluye metas ni porcentajes.",
    key: "revenueTotal",
    label: "Facturacion / venta",
    unit: "USD",
  },
  {
    description: "Ordenes totales registradas para la sucursal.",
    key: "ordersTotal",
    label: "Ordenes",
    unit: "ordenes",
  },
  {
    description: "Sesiones realizadas en el periodo.",
    key: "sessionsTotal",
    label: "Sesiones",
    unit: "sesiones",
  },
  {
    description: "Pacientes o clientes atendidos sin datos personales.",
    key: "patientsAttended",
    label: "Pacientes atendidos",
    unit: "personas",
  },
  {
    description: "Costos/gastos directos asociados al servicio.",
    key: "directCosts",
    label: "Costos directos",
    unit: "USD",
  },
  {
    description: "Fisioterapeutas activos durante el periodo.",
    key: "physiotherapistsActive",
    label: "Personal activo",
    unit: "fisioterapeutas",
  },
];

const scheduleFields: FieldConfig[] = [
  {
    description: "Total de citas creadas en agenda.",
    key: "appointmentsScheduled",
    label: "Citas agendadas",
    unit: "citas",
  },
  {
    description: "Citas que terminaron en atencion.",
    key: "appointmentsCompleted",
    label: "Citas completadas",
    unit: "citas",
  },
  {
    description: "Citas canceladas antes de la atencion.",
    key: "appointmentsCancelled",
    label: "Citas canceladas",
    unit: "citas",
  },
  {
    description: "Citas en las que el paciente no se presento.",
    key: "noShowAppointments",
    label: "No-show",
    unit: "citas",
  },
  {
    description: "Capacidad clinica total disponible.",
    key: "availableHours",
    label: "Horas clinicas disponibles",
    unit: "horas",
  },
  {
    description: "Horas reservadas en agenda.",
    key: "scheduledHours",
    label: "Horas agendadas",
    unit: "horas",
  },
  {
    description: "Horas que realmente se atendieron.",
    key: "attendedHours",
    label: "Horas atendidas",
    unit: "horas",
  },
];

const targetKpiOptions: Array<{
  direction: PhysiotherapyTargetDirection;
  kpiId: PhysiotherapyTargetableKpiId;
  label: string;
  unit: "USD" | "sesiones" | "%";
}> = [
  {
    direction: "HIGHER_IS_BETTER",
    kpiId: "facturacion_neta",
    label: "Facturacion",
    unit: "USD",
  },
  {
    direction: "HIGHER_IS_BETTER",
    kpiId: "ocupacion_efectiva",
    label: "Ocupacion efectiva",
    unit: "%",
  },
  {
    direction: "HIGHER_IS_BETTER",
    kpiId: "sesiones_total",
    label: "Sesiones",
    unit: "sesiones",
  },
  {
    direction: "LOWER_IS_BETTER",
    kpiId: "tasa_no_show",
    label: "No-show maximo",
    unit: "%",
  },
  {
    direction: "HIGHER_IS_BETTER",
    kpiId: "margen_contribucion",
    label: "Margen de contribucion",
    unit: "USD",
  },
];

const kpiFieldLabels: Record<string, string> = {
  appointmentsCancelled: "citas canceladas",
  appointmentsCompleted: "citas completadas",
  appointmentsScheduled: "citas agendadas",
  attendedHours: "horas atendidas",
  availableHours: "horas disponibles",
  directCosts: "costos directos",
  noShowAppointments: "no-show",
  patientsAttended: "pacientes atendidos",
  physiotherapistsActive: "fisioterapeutas activos",
  revenueTotal: "facturacion neta",
  scheduledHours: "horas agendadas",
  sessionsTotal: "sesiones",
  target_revenue: "meta de facturacion",
};

function formatKpiFieldList(fields: string[]) {
  return fields.map((field) => kpiFieldLabels[field] ?? field).join(", ");
}

const wizardSteps = [
  "Contexto",
  "Venta y produccion",
  "Agenda y capacidad",
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

function targetStatusLabel(status: PhysiotherapyTarget["status"]) {
  return status === "active" ? "Activa" : "Inactiva";
}

function priorityClass(priority: PhysiotherapyInsight["priority"]) {
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

function formValuesFromClosure(closure: PhysiotherapyClosure): ClosureFormValues {
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

function emptyFormValues(workspace: PhysiotherapyWorkspace): ClosureFormValues {
  return {
    branchId: workspace.branches[0]?.branchId ?? "",
    id: "",
    inputs: inputDefaults,
    period: workspace.currentPeriod,
    replacesClosureId: "",
  };
}

function selectedBranch(
  workspace: PhysiotherapyWorkspace | null,
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
  comparisons: PhysiotherapyTargetComparison[];
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
  targets: PhysiotherapyTarget[];
  workspace: PhysiotherapyWorkspace;
}) {
  const visibleTargets = [...targets].sort((left, right) =>
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

function KpiGrid({ kpis }: { kpis: PhysiotherapyKpiResult[] }) {
  const [openKpiId, setOpenKpiId] = useState<
    PhysiotherapyKpiResult["id"] | null
  >(null);

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const isInfoOpen = openKpiId === kpi.id;
        const infoId = `fisio-kpi-info-${kpi.id}`;

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
  rows: PhysiotherapyBranchSummary[];
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
              <th className="py-2 pr-4 font-medium">Sesiones</th>
              <th className="py-2 pr-4 font-medium">Ocupacion</th>
              <th className="py-2 pr-4 font-medium">No-show</th>
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
                <td className="py-3 pr-4">{formatCount(row.sessions)}</td>
                <td className="py-3 pr-4">
                  {formatRatio(row.effectiveOccupancy)}
                </td>
                <td className="py-3 pr-4">{formatRatio(row.noShowRate)}</td>
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

function InsightsList({ insights }: { insights: PhysiotherapyInsight[] }) {
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

function ValidationPanel({ closure }: { closure: PhysiotherapyClosure | null }) {
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
  workspace: PhysiotherapyWorkspace | null;
}) {
  const titleByMode: Record<DashboardMode, string> = {
    "branch-home": "Mi sucursal Fisioterapia",
    history: "Historial de cierres Fisioterapia",
    insights: "Insights Fisioterapia",
    "new-closure": "Nuevo cierre mensual Fisioterapia",
    operations: "Resumen operativo Fisioterapia",
    overview: "Resumen Fisioterapia",
    results: "Resultados Fisioterapia",
    targets: "Metas Fisioterapia",
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
      "Lectura ejecutiva de Fisioterapia desde cierres publicados.",
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
          <Badge variant="outline">Fisioterapia end-to-end</Badge>
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

export function PhysiotherapyVerticalDashboard({
  embedded = false,
  mode,
}: PhysiotherapyVerticalDashboardProps) {
  const [workspace, setWorkspace] = useState<PhysiotherapyWorkspace | null>(null);
  const [formValues, setFormValues] = useState<ClosureFormValues | null>(null);
  const [targetFormValues, setTargetFormValues] =
    useState<TargetFormValues | null>(null);
  const [workingClosure, setWorkingClosure] =
    useState<PhysiotherapyClosure | null>(null);
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
      const response = await fetch("/api/physiotherapy/closures", {
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
          : "No se pudo cargar Fisioterapia.",
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
      const response = await fetch("/api/physiotherapy/closures", {
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
      `/api/physiotherapy/closures/${savedClosure.id}/validate`,
      { method: "POST" },
    );
    const payload = await readWorkspaceResponse(response);

    if (payload.closure) {
      setWorkingClosure(payload.closure);
      setFormValues(formValuesFromClosure(payload.closure));
    }

    setWorkspace(payload.workspace);
    setActiveStep(4);
  }

  async function publishDraft() {
    const savedClosure = formValues ? await saveDraft(formValues) : workingClosure;

    if (!savedClosure) {
      return;
    }

    const response = await fetch(
      `/api/physiotherapy/closures/${savedClosure.id}/publish`,
      { method: "POST" },
    );
    const payload = await readWorkspaceResponse(response);

    if (payload.closure) {
      setWorkingClosure(payload.closure);
      setFormValues(emptyFormValues(payload.workspace));
    }

    setWorkspace(payload.workspace);
    setActiveStep(6);
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
    const response = await fetch("/api/physiotherapy/targets", {
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

  function startCorrection(closure: PhysiotherapyClosure) {
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
        note: "Facturacion - costos directos",
        value: formatMoney(summary?.contributionMargin),
      },
      {
        label: "Sesiones",
        note: `${formatCount(summary?.patients)} pacientes`,
        value: formatCount(summary?.sessions),
      },
      {
        label: "Ocupacion",
        note: "Horas atendidas / disponibles",
        value: formatRatio(summary?.effectiveOccupancy),
      },
    ];
  }, [workspace?.summary]);

  if (loading) {
    return (
      <section className={sectionClass}>
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          Cargando vertical de Fisioterapia...
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

  function renderNumberFields(fields: FieldConfig[]) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <label className="grid gap-2 text-sm" key={field.key}>
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {field.label}
              <Badge variant="outline">MANUAL</Badge>
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
                {selectedBranchScope?.companyName ?? "Analiza Fisioterapia"}
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
              Paso 2 - Venta y produccion
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Capture datos fuente. Tickets, margen y cumplimiento se calculan
              automaticamente.
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
              Paso 3 - Agenda y capacidad
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Estos campos son manuales en MVP y quedan listos para reemplazo
              posterior por conector de agenda.
            </p>
          </div>
          {renderNumberFields(scheduleFields)}
        </section>
      );
    }

    if (activeStep === 3) {
      return (
        <section className="grid gap-4 rounded-md border bg-card p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold tracking-normal">
              Paso 4 - Observaciones
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

    if (activeStep === 4) {
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

    if (activeStep === 5) {
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
            Paso 7 - Publicar
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
          <div className="rounded-md border bg-card p-3">
            <div className="grid gap-2 md:grid-cols-7">
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

          <div className="flex flex-col gap-3 rounded-md border bg-card p-3 md:flex-row md:items-center md:justify-between">
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
                Atras
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
                          (event.target.value as PhysiotherapyTargetableKpiId) ??
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
            Input: cierre mensual de Fisioterapia con campos fuente manuales.
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

export function PhysiotherapyExecutiveSummary() {
  return <PhysiotherapyVerticalDashboard embedded mode="overview" />;
}
