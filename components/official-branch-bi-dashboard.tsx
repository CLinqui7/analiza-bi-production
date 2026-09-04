"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  BarChart3,
  Building2,
  MapPinned,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";

import type {
  BranchBiMetric,
  BranchBiRecord,
  BranchBiSnapshot,
} from "@/lib/v7/server/branch-bi-snapshot";
import type { RoleKey } from "@/lib/tenant/demo-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DashboardMode = "branch" | "branches" | "home" | "history" | "results";
type SortKey = "branch" | "quality" | "revenue" | "score";
type FilterState = {
  area: string;
  branch: string;
  country: string;
  line: string;
  manager: string;
};
type FilterOption = { id: string; name: string };

function recordOptions(
  records: readonly BranchBiRecord[],
  select: (record: BranchBiRecord) => { id: string | null; name: string | null },
) {
  return Array.from(
    new Map(
      records.flatMap((record) => {
        const option = select(record);
        return option.id && option.name ? [[option.id, { id: option.id, name: option.name }] as const] : [];
      }),
    ).values(),
  );
}

function metricValue(metric: BranchBiMetric | undefined) {
  return metric?.value ?? null;
}

function formatMetric(metric: BranchBiMetric | undefined) {
  if (!metric) return "Sin dato";
  if (metric.unit === "currency") {
    return new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(metric.value);
  }
  if (metric.unit === "ratio" || metric.unit === "percentage") {
    const percentage = Math.abs(metric.value) <= 1 ? metric.value * 100 : metric.value;
    return `${new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 }).format(percentage)}%`;
  }
  return new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 }).format(metric.value);
}

function formatNumber(value: number | null, suffix = "") {
  return value === null
    ? "Sin dato"
    : `${new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

function sumCurrency(records: readonly BranchBiRecord[]) {
  const countries = new Set(records.map((record) => record.countryId).filter(Boolean));
  const values = records
    .map((record) => metricValue(record.metrics.revenue))
    .filter((value): value is number => value !== null);
  if (countries.size !== 1 || values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function average(records: readonly BranchBiRecord[], select: (record: BranchBiRecord) => number | null) {
  const values = records.map(select).filter((value): value is number => value !== null);
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function status(record: BranchBiRecord) {
  if (record.status === "no_published_closing") {
    return { className: "bg-slate-100 text-slate-700", label: "Sin cierre publicado" };
  }
  if (record.status === "quality_review") {
    return { className: "bg-amber-100 text-amber-800", label: "Revisar calidad" };
  }
  return { className: "bg-emerald-100 text-emerald-800", label: "Publicado" };
}

function titleFor(mode: DashboardMode, roleKey: RoleKey) {
  if (mode === "home") {
    return roleKey === "ceo" ? "Panel ejecutivo" : "Gobierno y lectura oficial";
  }
  if (mode === "history") return "Historial de cierres";
  if (mode === "branch") return "Mi sucursal";
  if (mode === "results") return "Resultados operativos";
  return "Sucursales";
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly FilterOption[];
  value: string;
}) {
  if (options.length < 2) return null;

  return (
    <label className="grid min-w-40 gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        aria-label={label}
        className="h-10 rounded-lg border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Todas</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

function AssignmentSelect({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void;
  options: readonly { id: string; label: string }[];
  value: string;
}) {
  if (options.length < 2) return null;

  return (
    <label className="grid min-w-56 gap-1 text-xs font-medium text-muted-foreground">
      Asignación
      <select
        aria-label="Asignación"
        className="h-10 rounded-lg border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Todas mis asignaciones</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TrendChart({ records }: { records: readonly BranchBiRecord[] }) {
  const lines = records
    .map((record) => ({
      name: record.branchName,
      points: record.trend
        .map((point) => ({ label: point.period, value: point.revenue?.value ?? null }))
        .filter((point): point is { label: string; value: number } => point.value !== null),
    }))
    .filter((line) => line.points.length >= 2)
    .slice(0, 5);

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin tendencia publicada para el alcance seleccionado.</p>;
  }

  const values = lines.flatMap((line) => line.points.map((point) => point.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const colors = ["#2878ff", "#0f9d72", "#d97706", "#9f1239", "#475569"];

  return (
    <div className="grid gap-3">
      <svg aria-label="Tendencia operativa real" className="h-56 w-full rounded-lg border bg-slate-50" viewBox="0 0 640 220">
        <line stroke="#cbd5e1" strokeDasharray="4 4" x1="40" x2="620" y1="180" y2="180" />
        <line stroke="#cbd5e1" strokeDasharray="4 4" x1="40" x2="620" y1="40" y2="40" />
        {lines.map((line, index) => {
          const step = line.points.length > 1 ? 560 / (line.points.length - 1) : 0;
          const points = line.points
            .map((point, pointIndex) => `${40 + pointIndex * step},${180 - ((point.value - min) / span) * 140}`)
            .join(" ");
          return <polyline fill="none" key={line.name} points={points} stroke={colors[index]} strokeWidth="3" />;
        })}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {lines.map((line, index) => <span key={line.name}><span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: colors[index] }} />{line.name}</span>)}
      </div>
    </div>
  );
}

function Matrix({ records }: { records: readonly BranchBiRecord[] }) {
  const points = records
    .map((record) => ({
      margin: metricValue(record.metrics.margin),
      name: record.branchName,
      revenue: metricValue(record.metrics.revenue),
    }))
    .filter((point): point is { margin: number; name: string; revenue: number } => point.margin !== null && point.revenue !== null);
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin pares reales de facturación y margen para graficar.</p>;
  }
  const maxRevenue = Math.max(...points.map((point) => point.revenue), 1);
  const margins = points.map((point) => point.margin);
  const minMargin = Math.min(...margins);
  const maxMargin = Math.max(...margins);
  const marginRange = Math.max(maxMargin - minMargin, 1);

  return (
    <svg aria-label="Matriz rentabilidad versus operación" className="h-72 w-full rounded-lg border bg-slate-50" viewBox="0 0 500 280">
      <line stroke="#94a3b8" x1="50" x2="470" y1="230" y2="230" />
      <line stroke="#94a3b8" x1="50" x2="50" y1="30" y2="230" />
      <text fill="#475569" fontSize="12" x="210" y="265">Facturación</text>
      <text fill="#475569" fontSize="12" transform="rotate(-90 16 150)" x="16" y="150">Margen</text>
      {points.map((point) => {
        const x = 50 + (point.revenue / maxRevenue) * 400;
        const y = 230 - ((point.margin - minMargin) / marginRange) * 180;
        return <g key={point.name}><circle cx={x} cy={y} fill="#2878ff" r="8" /><title>{point.name}</title></g>;
      })}
    </svg>
  );
}

export function OfficialBranchBiDashboard({
  mode,
  roleKey,
  snapshot,
}: {
  mode: DashboardMode;
  roleKey: RoleKey;
  snapshot: BranchBiSnapshot;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftFilters, setDraftFilters] = useState<FilterState>(() => ({
    area: searchParams.get("area") ?? searchParams.get("bi_area") ?? "",
    branch: searchParams.get("branch") ?? searchParams.get("bi_branch") ?? "",
    country: searchParams.get("country") ?? searchParams.get("bi_country") ?? "",
    line: searchParams.get("line") ?? searchParams.get("bi_line") ?? "",
    manager: searchParams.get("manager") ?? searchParams.get("bi_manager") ?? "",
  }));
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(() => ({
    area: searchParams.get("area") ?? searchParams.get("bi_area") ?? "",
    branch: searchParams.get("branch") ?? searchParams.get("bi_branch") ?? "",
    country: searchParams.get("country") ?? searchParams.get("bi_country") ?? "",
    line: searchParams.get("line") ?? searchParams.get("bi_line") ?? "",
    manager: searchParams.get("manager") ?? searchParams.get("bi_manager") ?? "",
  }));
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ direction: "asc" | "desc"; key: SortKey }>({ direction: "desc", key: "score" });
  const recordsForRole = snapshot.records;
  const countries = recordOptions(recordsForRole, (record) => ({ id: record.countryId, name: record.countryName }));
  const lines = recordOptions(recordsForRole, (record) => ({ id: record.businessLineId, name: record.businessLineName }));
  const areas = recordOptions(recordsForRole, (record) => ({ id: record.operationalAreaId, name: record.operationalAreaName }));
  const branches = recordOptions(recordsForRole, (record) => ({ id: record.branchId, name: record.branchName }));
  const managers = recordOptions(recordsForRole, (record) => ({ id: record.branchManagerName, name: record.branchManagerName }));
  const isBranchManager = roleKey === "gerente_sucursal";
  const isCountryLocked = roleKey === "gerente_area" || roleKey === "gerente_operaciones";
  const assignments = Array.from(
    new Map(
      recordsForRole.map((record) => [
        record.branchId,
        {
          id: record.branchId,
          label: record.businessLineName
            ? `${record.branchName} · ${record.businessLineName}`
            : record.branchName,
        },
      ]),
    ).values(),
  );
  const hasSelectableFilters = isBranchManager
    ? assignments.length >= 2
    : [
      ...(isCountryLocked ? [] : [countries]),
      lines,
      areas,
      branches,
      managers,
    ].some(
        (options) => options.length >= 2,
      );
  useEffect(() => {
    const fromRoute: FilterState = {
      area: searchParams.get("area") ?? searchParams.get("bi_area") ?? "",
      branch: searchParams.get("branch") ?? searchParams.get("bi_branch") ?? "",
      country: searchParams.get("country") ?? searchParams.get("bi_country") ?? "",
      line: searchParams.get("line") ?? searchParams.get("bi_line") ?? "",
      manager: searchParams.get("manager") ?? searchParams.get("bi_manager") ?? "",
    };
    setDraftFilters(fromRoute);
    setAppliedFilters(fromRoute);
    setSelectedBranchId(null);
  }, [searchParams]);
  const filtered = useMemo(() => recordsForRole.filter((record) => (
    (!appliedFilters.country || record.countryId === appliedFilters.country)
    && (!appliedFilters.line || record.businessLineId === appliedFilters.line)
    && (!appliedFilters.area || record.operationalAreaId === appliedFilters.area)
    && (!appliedFilters.branch || record.branchId === appliedFilters.branch)
    && (!appliedFilters.manager || record.branchManagerName === appliedFilters.manager)
  )), [appliedFilters, recordsForRole]);
  const history = useMemo(() => snapshot.history.filter((entry) => {
    const record = recordsForRole.find((candidate) => candidate.branchId === entry.branchId);
    return Boolean(record)
      && (!appliedFilters.country || record?.countryId === appliedFilters.country)
      && (!appliedFilters.area || record?.operationalAreaId === appliedFilters.area)
      && (!appliedFilters.branch || entry.branchId === appliedFilters.branch)
      && (!appliedFilters.line || entry.businessLineId === appliedFilters.line)
      && (!appliedFilters.manager || record?.branchManagerName === appliedFilters.manager);
  }), [appliedFilters, recordsForRole, snapshot.history]);
  const ranking = useMemo(() => [...filtered].sort((left, right) => {
    const valueFor = (record: BranchBiRecord) => {
      if (sort.key === "branch") return record.branchName;
      if (sort.key === "quality") return record.dataQuality ?? -Infinity;
      return metricValue(record.metrics[sort.key]) ?? -Infinity;
    };
    const leftValue = valueFor(left);
    const rightValue = valueFor(right);
    const comparison = typeof leftValue === "string" && typeof rightValue === "string"
      ? leftValue.localeCompare(rightValue, "es")
      : Number(leftValue) - Number(rightValue);
    return sort.direction === "asc" ? comparison : -comparison;
  }), [filtered, sort]);
  const selected = ranking.find((record) => record.branchId === selectedBranchId) ?? ranking[0] ?? null;
  const hasChanges = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const publishedCount = filtered.filter((record) => record.hasPublishedClosing).length;
  const revenue = sumCurrency(filtered);
  const quality = average(filtered, (record) => record.dataQuality);

  function updateDraft(key: keyof FilterState, value: string) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    const entries: Array<[keyof FilterState, string]> = [
      ["country", "country"], ["line", "line"], ["area", "area"], ["branch", "branch"], ["manager", "manager"],
    ];
    for (const [key, parameter] of entries) {
      if (draftFilters[key]) params.set(parameter, draftFilters[key]);
      else params.delete(parameter);
    }
    setAppliedFilters({ ...draftFilters });
    setSelectedBranchId(null);
    router.replace(`${pathname}${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: key === "branch" ? "asc" : "desc" });
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-5 px-4 py-6 lg:px-6" data-testid="official-branch-bi">
      <header className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Datos oficiales</Badge>
            <Badge variant="outline">Supabase RLS</Badge>
            <Badge variant="outline">Sin simulación</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-card"><Building2 className="size-5 text-primary" /></div>
            <div><h1 className="text-3xl font-semibold tracking-normal">{titleFor(mode, roleKey)}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Comparación, ranking, mapa operativo, matriz, calidad y tendencia construidos únicamente desde el alcance autorizado.</p></div>
          </div>
        </div>
        <aside className="rounded-lg border bg-card p-4 text-sm leading-6"><div className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-primary" />Alcance verificado</div><p className="mt-2 text-muted-foreground">{filtered.length} sucursales visibles · {publishedCount} con cierre publicado</p><p className="mt-1 text-xs text-muted-foreground">Actualizado {new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.generatedAt))}</p></aside>
      </header>

      {!snapshot.sourceAvailable ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">La fuente V7 no está disponible para esta sesión. No se muestran valores de respaldo.</div> : null}

      <section className="grid gap-3 rounded-lg border bg-card p-4" data-applied-branch={appliedFilters.branch || "all"} data-testid="bi-filters">
        <div className="flex items-center gap-2 text-sm font-semibold"><Target className="size-4 text-primary" />Filtros de análisis</div>
        <div className="flex flex-wrap gap-3">
          {isBranchManager ? (
            <AssignmentSelect
              onChange={(value) => updateDraft("branch", value)}
              options={assignments}
              value={draftFilters.branch}
            />
          ) : (
            <>
              {!isCountryLocked && <FilterSelect label="País" onChange={(value) => updateDraft("country", value)} options={countries} value={draftFilters.country} />}
              <FilterSelect label="Línea" onChange={(value) => updateDraft("line", value)} options={lines} value={draftFilters.line} />
              <FilterSelect label="Área" onChange={(value) => updateDraft("area", value)} options={areas} value={draftFilters.area} />
              <FilterSelect label="Sucursal" onChange={(value) => updateDraft("branch", value)} options={branches} value={draftFilters.branch} />
              <FilterSelect label="Gerente de sucursal" onChange={(value) => updateDraft("manager", value)} options={managers} value={draftFilters.manager} />
            </>
          )}
          {hasSelectableFilters ? <button className="mt-auto h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60" data-testid="bi-apply-filters" disabled={!hasChanges} onClick={applyFilters} type="button">Aplicar filtros</button> : null}
        </div>
      </section>

      {mode === "history" ? (
        <section className="grid gap-4" data-testid="bi-history">
          <article className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Versiones y evidencia de cierres</h2>
                <p className="mt-1 text-sm text-muted-foreground">Consulta por período y sucursal; esta pantalla no usa ranking como contenido principal.</p>
              </div>
              <Badge variant="outline">{history.length} versiones dentro del alcance</Badge>
            </div>
          </article>
          {snapshot.historyStatus === "source_error" ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">Error de fuente al consultar el historial. No se sustituye por “Sin dato”.</div> : null}
          {snapshot.historyStatus === "scope_empty" ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No hay sucursales autorizadas en el alcance actual.</div> : null}
          {snapshot.historyStatus === "no_data" ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No hay versiones de cierre para los filtros aplicados.</div> : null}
          {history.map((entry) => {
            const blockers = Array.isArray(entry.validationSummary.blockers) ? entry.validationSummary.blockers.filter((item): item is string => typeof item === "string") : [];
            return <article className="rounded-lg border bg-card p-4" data-testid="bi-history-entry" key={entry.versionId}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{entry.branchName} · {entry.businessLineName}</h3><p className="mt-1 text-sm text-muted-foreground">Período {entry.periodStart.slice(0, 7)} · versión {entry.versionNumber} · autor {entry.authorName ?? "Sin autor registrado"}</p></div><Badge variant="outline">{entry.status}</Badge></div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3"><span>Fecha: {new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</span><span>Publicación: {entry.publishedAt ? new Intl.DateTimeFormat("es-SV", { dateStyle: "medium" }).format(new Date(entry.publishedAt)) : "Pendiente"}</span><span>Archivos: {entry.attachmentCount}</span></div>
              <p className="mt-3 text-xs text-muted-foreground">Validación: {blockers.length > 0 ? `pendiente · ${blockers.join(" · ")}` : "sin blockers registrados"}</p>
              <a className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href={`/api/monthly-submissions/${entry.submissionId}/report?format=pdf`}>Ver detalle / reporte</a>
            </article>;
          })}
        </section>
      ) : <>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Sucursales", String(filtered.length), "en el alcance actual"],
          ["Cierres publicados", String(publishedCount), "periodo más reciente por sucursal"],
          ["Sin cierre", String(filtered.length - publishedCount), "no se reemplaza con cero"],
          ["Facturación", revenue === null ? "Sin dato" : new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(revenue), revenue === null ? "seleccione un país o publique un KPI" : "suma de KPIs calculables"],
          ["Meta aprobada", "Sin meta aprobada", "no existe tabla V7 aprobada"],
          ["Cumplimiento", "Sin resultado", "requiere meta aprobada y KPI calculable"],
          ["Calidad de datos", formatNumber(quality, "%"), "score registrado en cierres publicados"],
          ["Puntaje comparable", formatMetric(selected?.metrics.score), "solo cuando existe KPI oficial"],
        ].map(([label, value, note]) => <article className="rounded-lg border bg-card p-4" key={label}><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold tracking-normal">{value}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p></article>)}
      </section>

      <section className="rounded-lg border bg-card p-4" data-testid={mode === "results" ? "bi-results-by-branch" : "bi-branches-ranking"}>
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><BarChart3 className="size-4 text-primary" />{mode === "results" ? "Desglose de resultados por sucursal" : "Ranking integral de sucursales"}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr>{([ ["branch", "Sucursal"], ["score", "Puntaje"], ["revenue", "Facturación"], ["quality", "Calidad"] ] as Array<[SortKey, string]>).map(([key, label]) => <th className="py-2 pr-4" key={key}><button aria-label={`Ordenar por ${label}`} className="inline-flex items-center gap-1 font-medium hover:text-foreground" data-sort-direction={sort.key === key ? sort.direction : "none"} onClick={() => toggleSort(key)} type="button">{label}<ArrowUpDown className="size-3" /></button></th>)}<th className="py-2 pr-4 font-medium">Margen</th><th className="py-2 pr-4 font-medium">Estado</th><th className="py-2 font-medium">Gerente</th></tr></thead><tbody>{ranking.map((record) => { const state = status(record); return <tr className={cn("cursor-pointer border-b last:border-b-0 hover:bg-muted/40", selected?.branchId === record.branchId && "bg-primary/5")} key={record.branchId} onClick={() => setSelectedBranchId(record.branchId)}><td className="py-3 pr-4 font-medium">{record.branchName}<div className="text-xs font-normal text-muted-foreground">{record.operationalAreaName ?? "Sin área asignada"}</div></td><td className="py-3 pr-4">{formatMetric(record.metrics.score)}</td><td className="py-3 pr-4">{formatMetric(record.metrics.revenue)}</td><td className="py-3 pr-4">{formatNumber(record.dataQuality, "%")}</td><td className="py-3 pr-4">{formatMetric(record.metrics.margin)}</td><td className="py-3 pr-4"><Badge className={state.className}>{state.label}</Badge></td><td className="py-3">{record.branchManagerName ?? "Sin gerente asignado"}</td></tr>; })}</tbody></table></div>
        {ranking.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No hay sucursales que coincidan con los filtros aplicados.</p> : null}
      </section>

      {selected ? <section className="rounded-lg border bg-card p-4" data-testid="bi-drilldown"><div className="text-sm font-semibold">Detalle de sucursal</div><div className="mt-2 text-base font-medium">{selected.branchName}</div><p className="mt-1 text-sm text-muted-foreground">{selected.latestPeriod ? `Último cierre publicado: ${selected.latestPeriod}` : "Sin cierre publicado para esta sucursal."}</p></section> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border bg-card p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><MapPinned className="size-4 text-primary" />Mapa operativo por área</div><div className="grid gap-2 sm:grid-cols-2">{filtered.map((record) => { const state = status(record); return <button className={cn("rounded-lg border p-3 text-left transition-colors hover:border-primary", selected?.branchId === record.branchId && "border-primary bg-primary/5")} key={record.branchId} onClick={() => setSelectedBranchId(record.branchId)} type="button"><div className="font-medium">{record.branchName}</div><div className="mt-1 text-xs text-muted-foreground">{record.operationalAreaName ?? record.city ?? "Sin ubicación operacional"}</div><Badge className={cn("mt-3", state.className)}>{state.label}</Badge></button>; })}</div></section>
        <section className="rounded-lg border bg-card p-4"><div className="mb-3 text-sm font-semibold">Matriz rentabilidad versus operación</div><p className="mb-3 text-xs leading-5 text-muted-foreground">Cada punto requiere KPI oficial de facturación y margen.</p><Matrix records={filtered} /></section>
      </div>

      <section className="rounded-lg border bg-card p-4"><div className="mb-4 text-sm font-semibold">Heatmap de KPIs publicados</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-2 pr-4 font-medium">Sucursal</th><th className="py-2 pr-4 font-medium">Facturación</th><th className="py-2 pr-4 font-medium">Volumen</th><th className="py-2 pr-4 font-medium">Ocupación</th><th className="py-2 pr-4 font-medium">SLA/TAT</th><th className="py-2 font-medium">Calidad</th></tr></thead><tbody>{filtered.map((record) => <tr className="border-b last:border-b-0" key={record.branchId}><td className="py-3 pr-4 font-medium">{record.branchName}</td><td className="py-3 pr-4">{formatMetric(record.metrics.revenue)}</td><td className="py-3 pr-4">{formatMetric(record.metrics.volume)}</td><td className="py-3 pr-4">{formatMetric(record.metrics.occupancy)}</td><td className="py-3 pr-4">{formatMetric(record.metrics.sla)}</td><td className="py-3">{formatNumber(record.dataQuality, "%")}</td></tr>)}</tbody></table></div></section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]"><article className="rounded-lg border bg-card p-4"><div className="mb-3 text-sm font-semibold">Tendencia operativa</div><TrendChart records={filtered} /></article><article className="rounded-lg border bg-card p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><UsersRound className="size-4 text-primary" />Gerentes dentro del alcance</div><div className="grid gap-2">{Array.from(new Map(filtered.flatMap((record) => [[`area-${record.operationalAreaId}`, { name: record.areaManagerName, scope: record.operationalAreaName }], [`branch-${record.branchId}`, { name: record.branchManagerName, scope: record.branchName }]])).values()).filter((manager): manager is { name: string; scope: string | null } => Boolean(manager.name)).map((manager) => <div className="rounded-lg border p-3 text-sm" key={`${manager.name}-${manager.scope}`}><div className="font-medium">{manager.name}</div><div className="mt-1 text-xs text-muted-foreground">{manager.scope ?? "Asignación autorizada"}</div></div>)}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">Solo se muestran nombres y asignaciones autorizadas; no se exponen bonos, categoría ni nivel de gestión.</p></article></section>
      </>}

      <footer className="rounded-lg border bg-card p-4 text-xs leading-5 text-muted-foreground">Fuente V7: {snapshot.sourceTables.join(" → ")}. Los faltantes se muestran como “Sin dato” y las sucursales sin cierre permanecen visibles.</footer>
    </section>
  );
}
