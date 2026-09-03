import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Lightbulb,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  OfficialExecutiveSnapshot,
  OfficialInsight,
  OfficialLineSummary,
  OfficialTargetComparison,
} from "@/lib/server/official-bi";
import { cn } from "@/lib/utils";

type OfficialExecutiveDataDashboardProps = {
  mode: "overview" | "finances" | "targets" | "insights";
  snapshot: OfficialExecutiveSnapshot;
};

function formatNumber(value: number | null, unit?: string) {
  if (value === null) {
    return "Sin dato";
  }

  if (unit === "currency") {
    return new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(value);
  }

  if (unit === "ratio") {
    return `${Math.round(value * 1000) / 10}%`;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null) {
  return value === null ? "Sin meta" : `${Math.round(value * 1000) / 10}%`;
}

function statusLabel(
  status: OfficialLineSummary["status"] | OfficialTargetComparison["status"],
) {
  const labels = {
    critico: "Requiere atencion",
    cumplido: "Cumplido",
    sin_meta: "Sin meta aprobada",
    sin_resultado: "Sin resultado",
    vigilar: "Vigilar",
  } as const;

  return labels[status];
}

function statusClass(
  status: OfficialLineSummary["status"] | OfficialTargetComparison["status"],
) {
  if (status === "cumplido") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "vigilar" || status === "sin_meta" || status === "sin_resultado") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function insightClass(severity: OfficialInsight["severity"]) {
  if (severity === "critica" || severity === "alta") {
    return "border-red-200 bg-red-50 text-red-950";
  }

  if (severity === "media") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

function titleForMode(mode: OfficialExecutiveDataDashboardProps["mode"]) {
  if (mode === "finances") {
    return {
      icon: BarChart3,
      subtitle: "Finanzas consolidadas desde cierres publicados y KPIs calculados.",
      title: "Salud financiera",
    };
  }

  if (mode === "targets") {
    return {
      icon: Target,
      subtitle: "Metas aprobadas comparadas contra resultados publicados.",
      title: "Metas",
    };
  }

  if (mode === "insights") {
    return {
      icon: Lightbulb,
      subtitle: "Insights oficiales generados desde cierres publicados.",
      title: "Insights",
    };
  }

  return {
    icon: BarChart3,
    subtitle: "Rendimiento operativo y financiero consolidado del periodo.",
    title: "Resumen Ejecutivo",
  };
}

function EmptyOrErrorState({ snapshot }: { snapshot: OfficialExecutiveSnapshot }) {
  const isError = snapshot.dataStatus === "configuration_error";

  return (
    <section className="rounded-md border border-dashed bg-card p-6 text-sm leading-6">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4 text-amber-600" />
        {isError ? "Lectura oficial no disponible" : "Sin cierres publicados"}
      </div>
      <p className="text-muted-foreground">
        {isError
          ? snapshot.errorMessage
          : "No hay cierres publicados no-demo para el contexto seleccionado. La plataforma no mostrara datos simulados como resultados reales."}
      </p>
    </section>
  );
}

function SummaryCards({ snapshot }: { snapshot: OfficialExecutiveSnapshot }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Cierres publicados</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {snapshot.totals.publishedClosings}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          Periodo {snapshot.period ?? "pendiente"}
        </Badge>
      </article>
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Resultado</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {formatNumber(snapshot.totals.revenueActual, "currency")}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          Desde KPIs calculados
        </Badge>
      </article>
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Meta aprobada</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {formatNumber(snapshot.totals.revenueTarget, "currency")}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          {snapshot.totals.approvedTargets} comparaciones
        </Badge>
      </article>
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Cumplimiento</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {formatPercent(snapshot.totals.revenueCompliance)}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          Insights oficiales: {snapshot.totals.officialInsights}
        </Badge>
      </article>
    </section>
  );
}

function LineSummaryTable({ rows }: { rows: OfficialLineSummary[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Lectura por linea de negocio
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Meta</th>
              <th className="py-2 pr-4 font-medium">Real</th>
              <th className="py-2 pr-4 font-medium">Variacion</th>
              <th className="py-2 pr-4 font-medium">Cumplimiento</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const variance =
                row.revenueActual !== null && row.revenueTarget !== null
                  ? row.revenueActual - row.revenueTarget
                  : null;

              return (
                <tr className="border-b last:border-b-0" key={row.businessLine}>
                  <td className="py-3 pr-4 font-medium">{row.lineName}</td>
                  <td className="py-3 pr-4">
                    {formatNumber(row.revenueTarget, "currency")}
                  </td>
                  <td className="py-3 pr-4">
                    {formatNumber(row.revenueActual, "currency")}
                  </td>
                  <td className="py-3 pr-4">
                    {formatNumber(variance, "currency")}
                  </td>
                  <td className="py-3 pr-4">
                    {formatPercent(row.revenueCompliance)}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge className={statusClass(row.status)}>
                      {statusLabel(row.status)}
                    </Badge>
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

function TargetTable({ rows }: { rows: OfficialTargetComparison[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Target className="size-4 text-primary" />
        Metas aprobadas vs resultados
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin metas aprobadas para los cierres publicados y el alcance seleccionado.
        </p>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">KPI</th>
              <th className="py-2 pr-4 font-medium">Meta</th>
              <th className="py-2 pr-4 font-medium">Real</th>
              <th className="py-2 pr-4 font-medium">Variacion</th>
              <th className="py-2 pr-4 font-medium">Cumplimiento</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className="border-b last:border-b-0"
                key={`${row.businessLine}-${row.branchName}-${row.kpiId}`}
              >
                <td className="py-3 pr-4 font-medium">{row.lineName}</td>
                <td className="py-3 pr-4">{row.branchName}</td>
                <td className="py-3 pr-4">{row.kpiLabel}</td>
                <td className="py-3 pr-4">
                  {formatNumber(row.targetValue, row.unit)}
                </td>
                <td className="py-3 pr-4">
                  {formatNumber(row.actualValue, row.unit)}
                </td>
                <td className="py-3 pr-4">
                  {formatNumber(row.variance, row.unit)}
                </td>
                <td className="py-3 pr-4">{formatPercent(row.compliance)}</td>
                <td className="py-3 pr-4">
                  <Badge className={statusClass(row.status)}>
                    {statusLabel(row.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}

function InsightList({ insights }: { insights: OfficialInsight[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Lightbulb className="size-4 text-primary" />
        Insights oficiales
      </div>
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay insights oficiales para el periodo seleccionado.
        </p>
      ) : (
        <div className="grid gap-3">
          {insights.slice(0, 8).map((insight) => (
            <article
              className={cn("rounded-md border p-4", insightClass(insight.severity))}
              key={`${insight.businessLine}-${insight.branchName}-${insight.title}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{insight.lineName}</Badge>
                <Badge variant="outline">{insight.branchName}</Badge>
                <Badge variant="outline">{insight.severity}</Badge>
              </div>
              <h2 className="mt-3 text-base font-semibold tracking-normal">
                {insight.title}
              </h2>
              <p className="mt-2 text-sm leading-6">{insight.message}</p>
              <p className="mt-2 text-sm leading-6">
                <strong>Impacto:</strong> {insight.impact}
              </p>
              <p className="mt-1 text-sm leading-6">
                <strong>Accion sugerida:</strong> {insight.recommendedAction}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function OfficialExecutiveDataDashboard({
  mode,
  snapshot,
}: OfficialExecutiveDataDashboardProps) {
  const title = titleForMode(mode);
  const Icon = title.icon;

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="w-fit bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Datos oficiales
          </Badge>
          <Badge variant="outline">Supabase RLS</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border bg-card">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              {title.title}
            </h1>
            <p className="text-sm text-muted-foreground">{title.subtitle}</p>
          </div>
        </div>
      </div>

      {snapshot.dataStatus !== "available" ? (
        <EmptyOrErrorState snapshot={snapshot} />
      ) : (
        <>
          <SummaryCards snapshot={snapshot} />
          {(mode === "overview" || mode === "finances") && (
            <LineSummaryTable rows={snapshot.lineSummaries} />
          )}
          {(mode === "overview" || mode === "targets") && (
            <TargetTable rows={snapshot.targetComparisons} />
          )}
          {(mode === "overview" || mode === "insights") && (
            <InsightList insights={snapshot.insights} />
          )}
        </>
      )}

      <footer className="rounded-md border bg-card p-4 text-xs leading-5 text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <Database className="size-4 text-primary" />
          Fuente exacta
        </div>
        {snapshot.sourceTables.join(" -> ")}. Solo se muestran cierres
        publicados no-demo, KPIs calculados, metas activas aprobadas e insights
        oficiales del periodo.
      </footer>
    </section>
  );
}
