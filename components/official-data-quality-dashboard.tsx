import { AlertTriangle, CheckCircle2, Database, SearchCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { OfficialExecutiveSnapshot } from "@/lib/server/official-bi";

function scoreLabel(score: number | null) {
  if (score === null) return "Sin score";
  return `${Math.round(score)}%`;
}

function scoreState(score: number | null) {
  if (score === null) return { label: "Sin dato", className: "bg-amber-100 text-amber-800" };
  if (score >= 90) return { label: "Confiable", className: "bg-emerald-100 text-emerald-800" };
  if (score >= 75) return { label: "Revisar", className: "bg-amber-100 text-amber-800" };
  return { label: "Critico", className: "bg-red-100 text-red-800" };
}

export function OfficialDataQualityDashboard({
  snapshot,
}: {
  snapshot: OfficialExecutiveSnapshot;
}) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Datos oficiales</Badge>
            <Badge variant="outline">Sin datos simulados</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <SearchCheck className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">Calidad de datos</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Revisa la calidad registrada en cierres publicados. Cuando no existe evidencia suficiente,
                la plataforma lo muestra como sin dato en lugar de inventar una calificacion.
              </p>
            </div>
          </div>
        </div>
        <aside className="rounded-md border bg-card p-4 text-sm leading-6 text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
            <Database className="size-4 text-primary" />
            Fuente
          </div>
          {snapshot.sourceTables.join(", ") || "Cierres publicados"}
        </aside>
      </header>

      {snapshot.dataStatus !== "available" ? (
        <div className="rounded-md border border-dashed bg-card p-6 text-sm leading-6">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 text-amber-600" />
            {snapshot.dataStatus === "configuration_error"
              ? "No se pudo leer la fuente oficial"
              : "Sin cierres publicados"}
          </div>
          <p className="text-muted-foreground">
            {snapshot.errorMessage ??
              "Publica al menos un cierre mensual para calcular calidad por linea y periodo."}
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            {snapshot.lineSummaries.map((line) => {
              const state = scoreState(line.qualityScore);
              return (
                <article className="rounded-md border bg-card p-4" key={line.businessLine}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">{line.lineName}</div>
                      <div className="mt-2 text-3xl font-semibold">{scoreLabel(line.qualityScore)}</div>
                    </div>
                    <Badge className={state.className}>{state.label}</Badge>
                  </div>
                  <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
                    <span>{line.publishedClosings} cierres publicados</span>
                    <span>{line.branchCount} sucursales con resultado</span>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="rounded-md border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-primary" />
              Regla de interpretacion
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              El score proviene del cierre publicado. No se reemplazan faltantes con cero y no se muestra
              un KPI como calculado cuando su fuente esencial esta ausente.
            </p>
          </section>
        </>
      )}
    </section>
  );
}
