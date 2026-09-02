"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  LineChart,
  Lightbulb,
} from "lucide-react";

import { AnalyticsComparisonChart } from "@/components/analytics-comparison-chart";
import { ImagingVerticalDashboard } from "@/components/imaging-vertical-dashboard";
import { LaboratoryVerticalDashboard } from "@/components/laboratory-vertical-dashboard";
import { PhysiotherapyVerticalDashboard } from "@/components/physiotherapy-vertical-dashboard";
import { Badge } from "@/components/ui/badge";
import { useActiveBusinessLine } from "@/hooks/use-active-business-line";
import {
  resolveBusinessLineSlug,
  type BusinessLineSlug,
} from "@/lib/analytics/business-line-operations";
import {
  getExecutiveOperationScreen,
  type OperationBlock,
  type OperationComparisonRow,
  type OperationMetric,
  type OperationMetricStatus,
} from "@/lib/analytics/executive-operation";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";

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

function getStatusLabel(status: OperationMetricStatus) {
  const labels: Record<OperationMetricStatus, string> = {
    available: "Disponible",
    calculated: "Calculado",
    critical: "Critico",
    incomplete: "Datos incompletos",
    "not-connected": "Datos pendientes de conexion",
    "pending-upload": "Pendiente de carga",
    warning: "Vigilar",
  };

  return labels[status];
}

function getStatusClass(status: OperationMetricStatus) {
  if (status === "available" || status === "calculated") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "warning" || status === "pending-upload" || status === "incomplete") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function getRowStatusClass(status: string) {
  if (status === "Verde") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Amarillo") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
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

function PrimaryMetricCard({ metric }: { metric: OperationMetric }) {
  return (
    <article className="grid min-h-32 gap-3 rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </h2>
        <Badge className={getStatusClass(metric.status)}>
          {getStatusLabel(metric.status)}
        </Badge>
      </div>
      <div className="text-2xl font-semibold tracking-normal">{metric.value}</div>
      <p className="text-xs leading-5 text-muted-foreground">{metric.note}</p>
    </article>
  );
}

function MetricRows({ metrics }: { metrics: OperationMetric[] }) {
  return (
    <dl className="grid divide-y text-sm">
      {metrics.map((metric) => (
        <div
          className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_140px_160px] sm:items-center"
          key={`${metric.label}-${metric.value}`}
        >
          <dt className="font-medium">{metric.label}</dt>
          <dd className="font-semibold tracking-normal">{metric.value}</dd>
          <dd className="grid gap-1">
            <Badge className={cn("w-fit", getStatusClass(metric.status))}>
              {getStatusLabel(metric.status)}
            </Badge>
            <span className="text-xs leading-5 text-muted-foreground">
              {metric.note}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function OperationBlockSection({ block }: { block: OperationBlock }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="size-4 text-primary" />
          {block.title}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {block.description}
        </p>
      </div>
      <MetricRows metrics={block.metrics} />
    </section>
  );
}

function UnifiedOperationsReview({
  screen,
}: {
  screen: ReturnType<typeof getExecutiveOperationScreen>;
}) {
  const leadingMetric = screen.primaryMetrics[0];
  const riskMetric =
    screen.primaryMetrics.find(
      (metric) =>
        metric.status === "critical" ||
        metric.status === "warning" ||
        metric.status === "pending-upload" ||
        metric.status === "incomplete",
    ) ?? screen.primaryMetrics[1];
  const insight = screen.trendChart.insights[0];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="size-4 text-primary" />
          Metas, avances e insights operativos
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Esta es la lectura unica del gerente de operaciones: meta, avance,
          brecha y accion se revisan aqui para evitar dos pantallas con los
          mismos KPIs.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Avance principal
          </div>
          <div className="mt-2 text-xl font-semibold tracking-normal">
            {leadingMetric?.value ?? "Pendiente"}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {leadingMetric?.label ?? "Sin metrica disponible"}:{" "}
            {leadingMetric?.note ?? "Esperando datos publicados."}
          </p>
        </article>

        <article className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Brecha a corregir
          </div>
          <div className="mt-2 text-xl font-semibold tracking-normal">
            {riskMetric?.value ?? "Pendiente"}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {riskMetric?.label ?? "Sin alerta"}:{" "}
            {riskMetric?.note ?? "No hay accion prioritaria registrada."}
          </p>
        </article>

        <article className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Insight accionable
          </div>
          <div className="mt-2 text-xl font-semibold tracking-normal">
            {insight?.value ?? "Pendiente"}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {insight ? `${insight.label}: ${insight.note}` : "Sin insight calculable."}
          </p>
        </article>
      </div>
    </section>
  );
}

function ComparisonTable({ rows }: { rows: OperationComparisonRow[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <LineChart className="size-4 text-primary" />
        Comparacion por linea
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Volumen principal</th>
              <th className="py-2 pr-4 font-medium">Productividad</th>
              <th className="py-2 pr-4 font-medium">Tiempo de respuesta</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Insight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.line}>
                <td className="py-3 pr-4 font-medium">{row.line}</td>
                <td className="py-3 pr-4">{row.volume}</td>
                <td className="py-3 pr-4">{row.productivity}</td>
                <td className="py-3 pr-4">{row.responseTime}</td>
                <td className="py-3 pr-4">{row.quality}</td>
                <td className="py-3 pr-4">
                  <Badge className={getRowStatusClass(row.status)}>
                    {row.status}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {row.insight}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
        Pantalla activa
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.businessLineName ?? context?.companyName ?? "Consolidado"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>Linea tecnica: {lineSlug}</span>
        <span>Periodo: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

export function ExecutiveOperationDashboard() {
  const activeBusinessLine = useActiveBusinessLine();
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

  const contextLineSlug = useMemo(() => resolveContextLine(context), [context]);
  const lineSlug = useMemo(() => {
    if (activeBusinessLine.line === "Laboratorio") {
      return "laboratorio";
    }

    if (activeBusinessLine.line === "Fisioterapia") {
      return "fisioterapia";
    }

    if (activeBusinessLine.line === "Imagenes") {
      return "imagenes";
    }

    return contextLineSlug;
  }, [activeBusinessLine.line, contextLineSlug]);
  const screen = useMemo(() => getExecutiveOperationScreen(lineSlug), [lineSlug]);

  if (lineSlug === "fisioterapia") {
    return <PhysiotherapyVerticalDashboard mode="operations" />;
  }

  if (lineSlug === "laboratorio") {
    return <LaboratoryVerticalDashboard mode="operations" />;
  }

  if (lineSlug === "imagenes") {
    return <ImagingVerticalDashboard mode="operations" />;
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Pantalla definida por selector superior</Badge>
            <Badge variant="outline">{screen.subtitle}</Badge>
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              {screen.title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {screen.description}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Cambia la linea de negocio en el selector superior para ver la
              pantalla de Consolidado, Laboratorio, Fisioterapia o Imagenes.
            </p>
          </div>
        </div>
        <ScopeCard context={context} lineSlug={lineSlug} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {screen.primaryMetrics.map((metric) => (
          <PrimaryMetricCard key={`${screen.slug}-${metric.label}`} metric={metric} />
        ))}
      </div>

      <UnifiedOperationsReview screen={screen} />

      <AnalyticsComparisonChart {...screen.trendChart} />

      {screen.comparisonRows ? (
        <ComparisonTable rows={screen.comparisonRows} />
      ) : null}

      {lineSlug !== "consolidado" ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Esta pantalla no mezcla unidades: Laboratorio trabaja con ordenes
              y muestras, Fisioterapia con citas/sesiones y Imagenes con
              estudios/equipos/informes.
            </span>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {screen.blocks.map((block) => (
          <OperationBlockSection key={`${screen.slug}-${block.title}`} block={block} />
        ))}
      </div>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <GitBranch className="size-4 text-primary" />
          Lectura ejecutiva
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <span>Volumen principal segun unidad real de la linea.</span>
          <span>Productividad conectada a capacidad y personal disponible.</span>
          <span>Alertas sin ceros falsos cuando la fuente esta pendiente.</span>
        </div>
      </section>
    </section>
  );
}
