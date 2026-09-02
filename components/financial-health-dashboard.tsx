"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  LineChart,
  Scale,
} from "lucide-react";

import { AnalyticsComparisonChart } from "@/components/analytics-comparison-chart";
import { Badge } from "@/components/ui/badge";
import {
  resolveBusinessLineSlug,
  type BusinessLineSlug,
} from "@/lib/analytics/business-line-operations";
import {
  getFinancialHealthScreenForContext,
  type FinancialBlock,
  type FinancialComparisonRow,
  type FinancialMetric,
  type FinancialMetricStatus,
} from "@/lib/analytics/financial-health";
import {
  globalContextChangeEvent as contextChangeEvent,
  globalContextStorageKey as storageKey,
} from "@/lib/analytics/global-filters";
import { cn } from "@/lib/utils";

type StoredContext = {
  countryId?: string;
  countryName?: string;
  companyId?: string;
  companyName?: string;
  businessLineId?: string;
  businessLineName?: string;
  businessLineCode?: string;
  branchId?: string;
  branchName?: string;
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

function getStatusLabel(status: FinancialMetricStatus) {
  const labels: Record<FinancialMetricStatus, string> = {
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

function getStatusClass(status: FinancialMetricStatus) {
  if (status === "available" || status === "calculated") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "warning" || status === "pending-upload" || status === "incomplete") {
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

function FinancialMetricCard({ metric }: { metric: FinancialMetric }) {
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

function FinancialNoDataState({ reason }: { reason: string }) {
  return (
    <section className="rounded-md border border-dashed bg-card p-6 text-sm leading-6 text-muted-foreground">
      <div className="mb-2 font-semibold text-foreground">
        Sin datos disponibles para este filtro
      </div>
      <p>{reason}</p>
    </section>
  );
}

function FinancialRows({ metrics }: { metrics: FinancialMetric[] }) {
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

function FinancialBlockSection({ block }: { block: FinancialBlock }) {
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
      <FinancialRows metrics={block.metrics} />
    </section>
  );
}

function FinancialComparisonTable({ rows }: { rows: FinancialComparisonRow[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <LineChart className="size-4 text-primary" />
        Comparacion financiera entre lineas
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Venta neta</th>
              <th className="py-2 pr-4 font-medium">Costo directo</th>
              <th className="py-2 pr-4 font-medium">Margen</th>
              <th className="py-2 pr-4 font-medium">Gastos operativos</th>
              <th className="py-2 pr-4 font-medium">Margen contribucion</th>
              <th className="py-2 pr-4 font-medium">Insight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.line}>
                <td className="py-3 pr-4 font-medium">{row.line}</td>
                <td className="py-3 pr-4">{row.netSales}</td>
                <td className="py-3 pr-4">{row.directCost}</td>
                <td className="py-3 pr-4">{row.margin}</td>
                <td className="py-3 pr-4">{row.operatingExpense}</td>
                <td className="py-3 pr-4">{row.operatingProfit}</td>
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
        Pantalla financiera activa
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.businessLineName ?? context?.companyName ?? "Consolidado"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>Linea financiera: {lineSlug}</span>
        <span>Periodo: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

export function FinancialHealthDashboard() {
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

  const lineSlug = useMemo(() => resolveContextLine(context), [context]);
  const screen = useMemo(
    () =>
      getFinancialHealthScreenForContext({
        branchId: context?.branchId,
        branchName: context?.branchName,
        businessLineCode: context?.businessLineCode,
        businessLineId: context?.businessLineId,
        businessLineName: context?.businessLineName,
        channelId: context?.channelId,
        companyId: context?.companyId,
        companyName: context?.companyName,
        countryId: context?.countryId,
        countryName: context?.countryName,
        managerId: context?.managerId,
        managerName: context?.managerName,
        operationalAreaId: context?.operationalAreaId,
        operationalAreaName: context?.operationalAreaName,
        payerId: context?.payerId,
        periodEnd: context?.periodEnd,
        periodStart: context?.periodStart,
        professionalId: context?.professionalId,
        serviceId: context?.serviceId,
      }),
    [context],
  );

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Separado por linea de negocio</Badge>
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
              Finanzas responde cuanto ingreso genero la operacion, cuanto costo
              producirla, que margen dejo y donde se perdio dinero.
            </p>
          </div>
        </div>
        <ScopeCard context={context} lineSlug={lineSlug} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {screen.primaryMetrics.map((metric) => (
          <FinancialMetricCard
            key={`${screen.slug}-${metric.label}`}
            metric={metric}
          />
        ))}
      </div>

      {screen.noDataReason ? (
        <FinancialNoDataState reason={screen.noDataReason} />
      ) : (
        <>
          <AnalyticsComparisonChart {...screen.trendChart} />

          {screen.comparisonRows ? (
            <FinancialComparisonTable rows={screen.comparisonRows} />
          ) : null}

          <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <div className="flex items-start gap-2">
              <Scale className="mt-0.5 size-4 shrink-0" />
              <span>
                Regla para no duplicar informacion: Operacion muestra volumen,
                tiempos, capacidad y errores. Finanzas muestra ingreso, costo,
                margen de contribucion y perdida producida por esa operacion.
              </span>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            {screen.blocks.map((block) => (
              <FinancialBlockSection key={`${screen.slug}-${block.title}`} block={block} />
            ))}
          </div>

          <section className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CircleDollarSign className="size-4 text-primary" />
              Insight financiero clave
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <span>El crecimiento solo es sano si el margen de contribucion acompana.</span>
              <span>Los atrasos, fallas y repeticiones deben medirse como dinero perdido.</span>
              <span>CAPEX, inventario y cuentas pendientes explican rentabilidad real.</span>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
