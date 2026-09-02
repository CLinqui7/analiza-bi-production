"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ClipboardList,
  Gauge,
  GitBranch,
  MapPin,
  Target,
} from "lucide-react";

import { ManagerBonusDashboard } from "@/components/manager-bonus-dashboard";
import { Badge } from "@/components/ui/badge";
import {
  getBusinessLineView,
  resolveBusinessLineSlug,
  type BusinessLineSlug,
  type LineMetric,
} from "@/lib/analytics/business-line-operations";
import {
  elSalvadorBranchResultTemplates,
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
import {
  formatKpiValue,
  getKpiStatusLabel,
  getKpisForBusinessLine,
  type KpiDataStatus,
} from "@/lib/analytics/kpi-registry";
import {
  appointmentStatusRows,
  getCapacityViewRows,
} from "@/lib/analytics/demo-operations";

type OperationsModuleProps = {
  module: string;
};

type StoredContext = {
  companyName?: string;
  businessLineId?: string;
  businessLineName?: string;
  branchName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
};

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";

export const operationsModuleSlugs = [
  "citas",
  "capacidad",
  "sucursales",
  "gerentes",
] as const;

const appointmentBusinessRows = [
  {
    business: "Analiza Fisioterapia",
    branch: "Sucursal DEMO Fisioterapia Norte",
    manager: "Gerente DEMO Norte",
    unitLabel: "Sesiones",
    unitValue: "2,840",
    successRate: 84,
    target: 88,
    action: "Mejorar confirmacion en horas pico",
  },
  {
    business: "Analiza Laboratorio",
    branch: "Sucursal DEMO Laboratorio Central",
    manager: "Gerente DEMO Central",
    unitLabel: "Ordenes",
    unitValue: "9,034",
    successRate: 89,
    target: 90,
    action: "Sostener tiempos de toma y entrega",
  },
  {
    business: "Analiza Imagenes",
    branch: "Sucursal DEMO Imagenes Este",
    manager: "Gerente DEMO Este",
    unitLabel: "Estudios",
    unitValue: "668",
    successRate: 78,
    target: 86,
    action: "Llenar slots vespertinos",
  },
];

const capacityComparisonRows = [
  {
    branch: "Sucursal DEMO Fisioterapia Norte",
    priorMonth: 74,
    currentMonth: 80,
    target: 86,
    insight: "Sube ocupacion, pero asistencia efectiva queda atras.",
  },
  {
    branch: "Sucursal DEMO Laboratorio Central",
    priorMonth: 70,
    currentMonth: 75,
    target: 83,
    insight: "Capacidad suficiente, revisar cuellos de botella por hora.",
  },
  {
    branch: "Sucursal DEMO Imagenes Este",
    priorMonth: 66,
    currentMonth: 70,
    target: 82,
    insight: "La brecha contra meta sugiere capacidad ociosa.",
  },
];

const laboratoryStatusRows = [
  {
    status: "orden_creada",
    count: 9034,
    qualityNote: "Ordenes cargadas desde plantillas SV DEMO",
  },
  {
    status: "paciente_recibido",
    count: 8912,
    qualityNote: "Pacientes anonimizados; deduplicacion real pendiente",
  },
  {
    status: "muestra_tomada",
    count: 8806,
    qualityNote: "Requiere trazabilidad por muestra en LIS/API",
  },
  {
    status: "resultado_validado",
    count: "Datos pendientes de conexion",
    qualityNote: "Datos pendientes de conexion; no se interpreta como cero operativo",
  },
];

const imagingStatusRows = [
  {
    status: "estudio_agendado",
    count: 668,
    qualityNote: "Agenda DEMO de imagenes",
  },
  {
    status: "estudio_realizado",
    count: 521,
    qualityNote: "Realizacion por modalidad",
  },
  {
    status: "informe_pendiente",
    count: 38,
    qualityNote: "Requiere RIS/PACS para trazabilidad real",
  },
  {
    status: "informe_entregado",
    count: 460,
    qualityNote: "Entrega DEMO",
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

function getStatusClass(status: KpiDataStatus) {
  if (status === "AVAILABLE" || status === "DEMO" || status === "CALCULATED") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "PENDING_UPLOAD" || status === "INCOMPLETE") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  if (status === "NOT_CONNECTED" || status === "INVALID") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-muted text-muted-foreground hover:bg-muted";
}

function ProgressValue({ value }: { value: number }) {
  const safeWidth = Math.max(0, Math.min(value, 100));

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${safeWidth}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium">{value}%</span>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: LineMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {metrics.map((metric) => (
        <article className="rounded-md border bg-card p-4" key={metric.label}>
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-muted-foreground">{metric.label}</div>
            <Badge className={getStatusClass(metric.status)}>
              {getKpiStatusLabel(metric.status)}
            </Badge>
          </div>
          <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {metric.note}
          </p>
        </article>
      ))}
    </div>
  );
}

function FunnelSection({
  title,
  steps,
}: {
  title: string;
  steps: ReturnType<typeof getBusinessLineView>["funnel"];
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <GitBranch className="size-4 text-primary" />
        {title}
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {steps.map((step) => (
          <article className="grid gap-2 rounded-md border p-3" key={step.label}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium">{step.label}</div>
              <Badge className={getStatusClass(step.status)}>
                {getKpiStatusLabel(step.status)}
              </Badge>
            </div>
            <div className="text-xl font-semibold tracking-normal">
              {step.value}
            </div>
            <div className="text-xs text-muted-foreground">
              Conversion:{" "}
              {step.conversion === null
                ? "No disponible"
                : `${Math.round(step.conversion * 100)}%`}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RegistryKpiStrip({ lineSlug }: { lineSlug: BusinessLineSlug }) {
  const lineView = getBusinessLineView(lineSlug);
  const kpis = getKpisForBusinessLine(lineView.code, "operation").slice(0, 4);

  if (kpis.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <ClipboardList className="size-4 text-primary" />
        KPI Registry conectado
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <article className="grid gap-2 rounded-md border p-3" key={kpi.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium">{kpi.name}</div>
              <Badge className={getStatusClass(kpi.dataStatus)}>
                {getKpiStatusLabel(kpi.dataStatus)}
              </Badge>
            </div>
            <div className="text-xl font-semibold tracking-normal">
              {formatKpiValue(kpi)}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Fuente: {kpi.source}. Actualizado: {kpi.lastUpdatedAt}.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PageHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
        Entorno DEMO
      </Badge>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md border bg-card">
          {icon}
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
        El selector superior define negocio, sucursal y rango de fechas para
        revisar esta vista.
      </p>
    </div>
  );
}

function AppointmentsModule({ lineSlug }: { lineSlug: BusinessLineSlug }) {
  const view = getBusinessLineView(lineSlug);
  const normalizedStatusRows =
    lineSlug === "laboratorio"
      ? laboratoryStatusRows
      : lineSlug === "imagenes"
        ? imagingStatusRows
        : appointmentStatusRows;

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <PageHeader
        description={view.appointmentsDescription}
        icon={<CalendarClock className="size-5 text-primary" />}
        title={view.appointmentsTitle}
      />

      <MetricGrid metrics={view.appointmentMetrics} />
      <FunnelSection steps={view.funnel} title={view.funnelTitle} />
      <RegistryKpiStrip lineSlug={lineSlug} />

      <div className="rounded-md border bg-muted p-3 text-xs leading-5 text-muted-foreground">
        {view.noShowPolicy}
      </div>

      {lineSlug === "consolidado" ? (
        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Target className="size-4 text-primary" />
            Comparativo por unidad operativa original
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Negocio</th>
                  <th className="py-2 pr-4 font-medium">Sucursal</th>
                  <th className="py-2 pr-4 font-medium">Gerente</th>
                  <th className="py-2 pr-4 font-medium">Unidad</th>
                  <th className="py-2 pr-4 font-medium">Exito vs meta</th>
                  <th className="py-2 pr-4 font-medium">Accion</th>
                </tr>
              </thead>
              <tbody>
                {appointmentBusinessRows.map((row) => (
                  <tr className="border-b last:border-b-0" key={row.business}>
                    <td className="py-3 pr-4 font-medium">{row.business}</td>
                    <td className="py-3 pr-4">{row.branch}</td>
                    <td className="py-3 pr-4">{row.manager}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{row.unitValue}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.unitLabel}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="grid gap-1">
                        <ProgressValue value={row.successRate} />
                        <span className="text-xs text-muted-foreground">
                          Meta {row.target}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 text-sm font-medium">Estados normalizados</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Registros</th>
                <th className="py-2 pr-4 font-medium">Calidad</th>
              </tr>
            </thead>
            <tbody>
              {normalizedStatusRows.map((row) => (
                <tr className="border-b last:border-b-0" key={row.status}>
                  <td className="py-3 pr-4 font-medium">{row.status}</td>
                  <td className="py-3 pr-4">{row.count}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {row.qualityNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function CapacityModule({ lineSlug }: { lineSlug: BusinessLineSlug }) {
  const rows = getCapacityViewRows();
  const view = getBusinessLineView(lineSlug);
  const scopedRows =
    lineSlug === "consolidado"
      ? rows
      : rows.filter((row) =>
          row.company.toLowerCase().includes(view.label.toLowerCase()),
        );
  const capacityTableTitle =
    lineSlug === "laboratorio"
      ? "Capacidad tecnica por sucursal"
      : lineSlug === "imagenes"
        ? "Utilizacion por equipo y sucursal"
        : "Ocupacion agendada";
  const availableHeader =
    lineSlug === "laboratorio"
      ? "Capacidad tecnica"
      : lineSlug === "imagenes"
        ? "Horas operativas"
        : "Capacidad";
  const scheduledHeader =
    lineSlug === "laboratorio"
      ? "Procesado estimado"
      : lineSlug === "imagenes"
        ? "Programada"
        : "Agendada";
  const effectiveHeader =
    lineSlug === "laboratorio"
      ? "Utilizacion tecnica"
      : lineSlug === "imagenes"
        ? "Utilizada"
        : "Efectiva";

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <PageHeader
        description={view.capacityDescription}
        icon={<Gauge className="size-5 text-primary" />}
        title={view.capacityTitle}
      />

      <MetricGrid metrics={view.capacityMetrics} />
      <section className="rounded-md border bg-card p-4">
        <div className="mb-2 text-sm font-medium">Formula de capacidad</div>
        <p className="text-sm leading-6 text-muted-foreground">
          {view.capacityFormula}
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {(lineSlug === "consolidado"
          ? capacityComparisonRows
          : capacityComparisonRows.filter((row) =>
              row.branch
                .toLowerCase()
                .includes(getBusinessLineView(lineSlug).label.toLowerCase()),
            )
        ).map((row) => (
            <article className="rounded-md border bg-card p-4" key={row.branch}>
              <div className="mb-4 grid gap-1">
                <h2 className="text-sm font-semibold">{row.branch}</h2>
                <p className="text-xs text-muted-foreground">{row.insight}</p>
              </div>
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Mes anterior</dt>
                  <dd>
                    <ProgressValue value={row.priorMonth} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Mes actual</dt>
                  <dd>
                    <ProgressValue value={row.currentMonth} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Meta</dt>
                  <dd>
                    <ProgressValue value={row.target} />
                  </dd>
                </div>
              </dl>
            </article>
          ))}
      </div>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 text-sm font-medium">{capacityTableTitle}</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Sucursal</th>
                <th className="py-2 pr-4 font-medium">Empresa</th>
                <th className="py-2 pr-4 font-medium">{availableHeader}</th>
                <th className="py-2 pr-4 font-medium">{scheduledHeader}</th>
                <th className="py-2 pr-4 font-medium">{effectiveHeader}</th>
                <th className="py-2 pr-4 font-medium">Brecha</th>
              </tr>
            </thead>
            <tbody>
              {scopedRows.map((row) => (
                <tr className="border-b last:border-b-0" key={row.branch}>
                  <td className="py-3 pr-4 font-medium">{row.branch}</td>
                  <td className="py-3 pr-4">{row.company}</td>
                  <td className="py-3 pr-4">{row.availableHours}</td>
                  <td className="py-3 pr-4">{row.scheduledOccupancy}</td>
                  <td className="py-3 pr-4">{row.effectiveOccupancy}</td>
                  <td className="py-3 pr-4">{row.attendanceGap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function BranchesModule() {
  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <PageHeader
        description="Monitoreo por sucursal para CEO, operaciones y gerentes: metas, ventas, perdidas, costos, citas y plantillas."
        icon={<MapPin className="size-5 text-primary" />}
        title="Sucursales"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {elSalvadorBranchResultTemplates.map((row) => (
          <article className="rounded-md border bg-card p-4" key={row.id}>
            <div className="mb-4 grid gap-1">
              <h2 className="text-sm font-semibold">{row.branchName}</h2>
              <p className="text-xs text-muted-foreground">
                El Salvador / Analiza Laboratorio / {row.manager}
              </p>
            </div>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Gerente de area</dt>
                <dd className="text-right">{row.areaManager}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Plantilla resultados</dt>
                <dd className="text-right">{row.fileName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Periodo archivo</dt>
                <dd>{row.filePeriod}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Periodo venta</dt>
                <dd>{row.salesPeriod}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Ingresos</dt>
                <dd>{formatCurrency(row.actualRevenue)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Meta venta</dt>
                <dd>{formatCurrency(row.revenueTarget)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Costo de venta</dt>
                <dd>{formatCurrency(row.costOfSale)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Margen</dt>
                <dd>{formatRate(row.marginRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Ordenes / ventas</dt>
                <dd>{row.rowCounts.salesRows.toLocaleString("en-US")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Cumplimiento venta</dt>
                <dd>
                  <ProgressValue value={Math.round(row.revenueCompletionRate * 100)} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Calidad de datos</dt>
                <dd>
                  <ProgressValue value={row.dataQualityScore} />
                </dd>
              </div>
            </dl>
            <div className="mt-4 grid gap-2 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              {row.validationFlags.slice(0, 2).map((flag) => (
                <span key={flag}>{flag}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ManagersModule() {
  return (
    <>
      <span className="sr-only">
        Rendimiento de Gerentes Pendiente de cargar capacidad disponible
      </span>
      <ManagerBonusDashboard />
    </>
  );
}

export function OperationsModule({ module }: OperationsModuleProps) {
  const [context, setContext] = useState<StoredContext | null>(null);

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

  const lineSlug = useMemo(
    () =>
      resolveBusinessLineSlug({
        businessLineId: context?.businessLineId,
        businessLineName: context?.businessLineName,
        companyName: context?.companyName,
      }),
    [context?.businessLineId, context?.businessLineName, context?.companyName],
  );

  if (module === "citas") {
    return <AppointmentsModule lineSlug={lineSlug} />;
  }

  if (module === "capacidad") {
    return <CapacityModule lineSlug={lineSlug} />;
  }

  if (module === "sucursales") {
    return <BranchesModule />;
  }

  if (module === "gerentes") {
    return <ManagersModule />;
  }

  return null;
}
