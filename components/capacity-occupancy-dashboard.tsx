"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Filter,
  Gauge,
  MapPin,
  Target,
} from "lucide-react";

import { AnalyticsComparisonChart } from "@/components/analytics-comparison-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  resolveBusinessLineSlug,
  type BusinessLineSlug,
} from "@/lib/analytics/business-line-operations";
import {
  getCapacityOccupancyScreen,
  getCapacityOccupancyScreenForContext,
  type CapacityBlock,
  type CapacityBranchRow,
  type CapacityComparisonRow,
  type CapacityMetric,
  type CapacityMetricStatus,
  type CapacityUtilizationRow,
} from "@/lib/analytics/capacity-occupancy";
import {
  globalContextChangeEvent as contextChangeEvent,
  globalContextStorageKey as storageKey,
} from "@/lib/analytics/global-filters";
import { cn } from "@/lib/utils";

const allBranchesLabel = "Todas las sucursales";

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

type CapacitySelection = {
  branch: string;
  service: string;
  resource: string;
  channel: string;
  payer: string;
  day: string;
  timeSlot: string;
  attentionState: string;
  capacityType: string;
};

type CapacityFormMode = "crear" | "editar";

type BranchCapacityFormState = {
  attendedUnits: string;
  availableUnits: string;
  branch: string;
  effectiveFrom: string;
  mode: CapacityFormMode;
  notes: string;
  plannedUnits: string;
  responsible: string;
  successfulUnits: string;
  unitLabel: string;
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

function getStatusLabel(status: CapacityMetricStatus) {
  const labels: Record<CapacityMetricStatus, string> = {
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

function getStatusClass(status: CapacityMetricStatus) {
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

function barWidth(value: number) {
  return `${Math.max(0, Math.min(value, 100))}%`;
}

function readPositiveNumber(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function formatCapacityRatio(numerator: string, denominator: string) {
  const numeratorValue = readPositiveNumber(numerator);
  const denominatorValue = readPositiveNumber(denominator);

  if (
    numeratorValue === null ||
    denominatorValue === null ||
    denominatorValue === 0
  ) {
    return "Pendiente";
  }

  return `${Math.round((numeratorValue / denominatorValue) * 100)}%`;
}

function createDefaultCapacityForm(
  branchOptions: string[],
  lineSlug: BusinessLineSlug,
): BranchCapacityFormState {
  const firstBranch =
    branchOptions.find((branch) => branch !== allBranchesLabel) ??
    "Sucursal por definir";

  return {
    attendedUnits: "",
    availableUnits: "",
    branch: firstBranch,
    effectiveFrom: "2026-08-01",
    mode: "crear",
    notes: "",
    plannedUnits: "",
    responsible: "Gerente de operaciones",
    successfulUnits: "",
    unitLabel:
      lineSlug === "laboratorio"
        ? "Pruebas por mes"
        : lineSlug === "imagenes"
          ? "Horas de equipo por mes"
          : "Horas clinicas por mes",
  };
}

function CapacityMetricCard({ metric }: { metric: CapacityMetric }) {
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

function CapacityNoDataState({ reason }: { reason: string }) {
  return (
    <section className="rounded-md border border-dashed bg-card p-6 text-sm leading-6 text-muted-foreground">
      <div className="mb-2 font-semibold text-foreground">
        Sin datos disponibles para este filtro
      </div>
      <p>{reason}</p>
    </section>
  );
}

function ScopeCard({
  context,
  lineSlug,
  selection,
}: {
  context: StoredContext | null;
  lineSlug: BusinessLineSlug;
  selection: CapacitySelection;
}) {
  return (
    <aside className="rounded-md border bg-card p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Pantalla de capacidad activa
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.businessLineName ?? context?.companyName ?? "Consolidado"}</span>
        <span>{selection.branch}</span>
        <span>Linea: {lineSlug}</span>
        <span>Periodo: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

function CapacityFilters({
  branchOptions,
  filters,
  onChange,
  selection,
}: {
  branchOptions: string[];
  filters: ReturnType<typeof getCapacityOccupancyScreen>["filters"];
  onChange: (selection: CapacitySelection) => void;
  selection: CapacitySelection;
}) {
  function updateField(key: keyof CapacitySelection, value: string) {
    onChange({ ...selection, [key]: value });
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de capacidad
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Sucursal</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("branch", event.target.value)}
            value={selection.branch}
          >
            {branchOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {filters.serviceLabel}
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("service", event.target.value)}
            value={selection.service}
          >
            {filters.serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {filters.resourceLabel}
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("resource", event.target.value)}
            value={selection.resource}
          >
            {filters.resourceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Canal</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("channel", event.target.value)}
            value={selection.channel}
          >
            {filters.channelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Pagador / convenio
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("payer", event.target.value)}
            value={selection.payer}
          >
            {filters.payerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Dia</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("day", event.target.value)}
            value={selection.day}
          >
            {filters.dayOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Franja horaria
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("timeSlot", event.target.value)}
            value={selection.timeSlot}
          >
            {filters.timeSlotOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Estado de la atencion
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("attentionState", event.target.value)}
            value={selection.attentionState}
          >
            {filters.attentionStateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Tipo de capacidad
          </span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("capacityType", event.target.value)}
            value={selection.capacityType}
          >
            {filters.capacityTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function BranchCapacityInputForm({
  branchOptions,
  lineSlug,
}: {
  branchOptions: string[];
  lineSlug: BusinessLineSlug;
}) {
  const [form, setForm] = useState<BranchCapacityFormState>(() =>
    createDefaultCapacityForm(branchOptions, lineSlug),
  );
  const [message, setMessage] = useState("");
  const branchOptionsForForm = useMemo(
    () => branchOptions.filter((branch) => branch !== allBranchesLabel),
    [branchOptions],
  );
  const scheduledOccupancy = formatCapacityRatio(
    form.plannedUnits,
    form.availableUnits,
  );
  const effectiveOccupancy = formatCapacityRatio(
    form.attendedUnits,
    form.availableUnits,
  );
  const successfulOccupancy = formatCapacityRatio(
    form.successfulUnits,
    form.availableUnits,
  );
  const availableUnits = readPositiveNumber(form.availableUnits);
  const plannedUnits = readPositiveNumber(form.plannedUnits);
  const attendedUnits = readPositiveNumber(form.attendedUnits);
  const hasImpossibleValues =
    availableUnits !== null &&
    ((plannedUnits !== null && plannedUnits > availableUnits) ||
      (attendedUnits !== null && attendedUnits > availableUnits));

  useEffect(() => {
    setForm((currentForm) => {
      const nextForm = createDefaultCapacityForm(branchOptions, lineSlug);

      return {
        ...currentForm,
        branch: branchOptionsForForm.includes(currentForm.branch)
          ? currentForm.branch
          : nextForm.branch,
        unitLabel: nextForm.unitLabel,
      };
    });
  }, [branchOptions, branchOptionsForForm, lineSlug]);

  function updateField(
    key: keyof BranchCapacityFormState,
    value: string | CapacityFormMode,
  ) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
    setMessage("");
  }

  function saveCapacityProfile() {
    if (!form.branch || form.branch === "Sucursal por definir") {
      setMessage("Selecciona la sucursal para registrar su capacidad.");
      return;
    }

    if (!form.availableUnits || readPositiveNumber(form.availableUnits) === null) {
      setMessage("Escribe la capacidad disponible con un numero valido.");
      return;
    }

    if (hasImpossibleValues) {
      setMessage(
        "Revisa la ficha: lo planificado o atendido no puede superar la capacidad disponible.",
      );
      return;
    }

    setMessage(
      `${form.branch}: ficha de capacidad lista para ${form.mode === "crear" ? "crear" : "editar"} con ocupacion efectiva ${effectiveOccupancy}.`,
    );
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="size-4 text-primary" />
            Formulario para crear o editar capacidad de sucursal
          </div>
          <p className="max-w-4xl text-xs leading-5 text-muted-foreground">
            La gerente de operaciones captura esta ficha por sucursal cuando la
            crea o la actualiza. Con estos campos el sistema calcula ocupacion
            agendada, ocupacion efectiva y capacidad exitosa sin escribir esos
            porcentajes a mano.
          </p>
        </div>
        <Badge variant="outline">Fuente: operaciones</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Accion</span>
          <select
            className="h-10 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) =>
              updateField("mode", event.target.value as CapacityFormMode)
            }
            value={form.mode}
          >
            <option value="crear">Crear capacidad</option>
            <option value="editar">Editar capacidad</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Sucursal</span>
          <select
            className="h-10 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => updateField("branch", event.target.value)}
            value={form.branch}
          >
            {branchOptionsForForm.length > 0 ? (
              branchOptionsForForm.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))
            ) : (
              <option value="Sucursal por definir">Sucursal por definir</option>
            )}
          </select>
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Vigente desde
          </span>
          <Input
            className="h-10"
            onChange={(event) => updateField("effectiveFrom", event.target.value)}
            type="date"
            value={form.effectiveFrom}
          />
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Unidad de capacidad
          </span>
          <Input
            className="h-10"
            onChange={(event) => updateField("unitLabel", event.target.value)}
            value={form.unitLabel}
          />
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Capacidad disponible
          </span>
          <Input
            className="h-10"
            min="0"
            onChange={(event) => updateField("availableUnits", event.target.value)}
            placeholder="0"
            type="number"
            value={form.availableUnits}
          />
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Capacidad agendada
          </span>
          <Input
            className="h-10"
            min="0"
            onChange={(event) => updateField("plannedUnits", event.target.value)}
            placeholder="0"
            type="number"
            value={form.plannedUnits}
          />
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Capacidad efectiva
          </span>
          <Input
            className="h-10"
            min="0"
            onChange={(event) => updateField("attendedUnits", event.target.value)}
            placeholder="0"
            type="number"
            value={form.attendedUnits}
          />
        </label>

        <label className="grid gap-1 text-xs">
          <span className="font-medium text-muted-foreground">
            Capacidad exitosa
          </span>
          <Input
            className="h-10"
            min="0"
            onChange={(event) => updateField("successfulUnits", event.target.value)}
            placeholder="0"
            type="number"
            value={form.successfulUnits}
          />
        </label>

        <label className="grid gap-1 text-xs xl:col-span-2">
          <span className="font-medium text-muted-foreground">Responsable</span>
          <Input
            className="h-10"
            onChange={(event) => updateField("responsible", event.target.value)}
            value={form.responsible}
          />
        </label>

        <label className="grid gap-1 text-xs xl:col-span-2">
          <span className="font-medium text-muted-foreground">
            Observacion de capacidad
          </span>
          <Input
            className="h-10"
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Ej. se agrego turno sabatino o equipo en mantenimiento"
            value={form.notes}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border bg-muted/40 p-3 text-sm md:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">
            Ocupacion agendada calculada
          </div>
          <div className="font-semibold">{scheduledOccupancy}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            Ocupacion efectiva calculada
          </div>
          <div className="font-semibold">{effectiveOccupancy}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            Capacidad exitosa calculada
          </div>
          <div className="font-semibold">{successfulOccupancy}</div>
        </div>
        <div className="flex items-center justify-start md:justify-end">
          <Button onClick={saveCapacityProfile} type="button">
            <CheckCircle2 className="size-4" />
            Guardar ficha
          </Button>
        </div>
      </div>

      {message || hasImpossibleValues ? (
        <div
          className={cn(
            "mt-3 rounded-md border px-3 py-2 text-sm",
            hasImpossibleValues
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900",
          )}
        >
          {hasImpossibleValues
            ? "Los valores de capacidad deben conservar la regla: disponible >= agendada >= efectiva cuando aplique."
            : message}
        </div>
      ) : null}
    </section>
  );
}

function CapacitySuccessChart({
  description,
  rows,
  title,
}: {
  description: string;
  rows: CapacityUtilizationRow[];
  title: string;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-primary" />
          {title}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4">
        {rows.map((row) => (
          <article className="grid gap-3 rounded-md border p-3" key={row.name}>
            <div className="grid gap-2 md:grid-cols-[1fr_220px] md:items-start">
              <div>
                <h2 className="text-sm font-semibold">{row.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {row.branch} / {row.unit}
                </p>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground md:text-right">
                <span>Perdida: {row.lostCapacity}</span>
                <span>Impacto: {row.financialImpact}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="grid gap-2 sm:grid-cols-[150px_1fr_54px] sm:items-center">
                <span className="text-xs font-medium text-muted-foreground">
                  Disponible
                </span>
                <div className="h-3 rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-slate-500" style={{ width: barWidth(row.available) }} />
                </div>
                <span className="text-xs font-medium">{row.available}%</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-[150px_1fr_54px] sm:items-center">
                <span className="text-xs font-medium text-muted-foreground">
                  Agendada / planificada
                </span>
                <div className="h-3 rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-blue-600" style={{ width: barWidth(row.planned) }} />
                </div>
                <span className="text-xs font-medium">{row.planned}%</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-[150px_1fr_54px] sm:items-center">
                <span className="text-xs font-medium text-muted-foreground">
                  Efectiva
                </span>
                <div className="h-3 rounded-full bg-muted">
                  <div className="h-3 rounded-full bg-emerald-600" style={{ width: barWidth(row.used) }} />
                </div>
                <span className="text-xs font-medium">{row.used}%</span>
              </div>
            </div>

            <div className="grid gap-2 text-xs md:grid-cols-4">
              <div className="rounded-md bg-muted p-2">
                <div className="text-muted-foreground">Atencion exitosa</div>
                <div className="text-base font-semibold">{row.successRate}%</div>
              </div>
              <div className="rounded-md bg-muted p-2">
                <div className="text-muted-foreground">Meta</div>
                <div className="text-base font-semibold">{row.targetRate}%</div>
              </div>
              <div className="rounded-md bg-muted p-2">
                <div className="text-muted-foreground">Causa principal</div>
                <div className="font-medium">{row.mainCause}</div>
              </div>
              <div className="rounded-md bg-muted p-2">
                <div className="text-muted-foreground">Recomendacion</div>
                <div className="font-medium">{row.recommendation}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CapacityComparisonTable({ rows }: { rows: CapacityComparisonRow[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Target className="size-4 text-primary" />
        Comparacion por linea
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Unidad de capacidad</th>
              <th className="py-2 pr-4 font-medium">Disponible</th>
              <th className="py-2 pr-4 font-medium">Planificada</th>
              <th className="py-2 pr-4 font-medium">Utilizada</th>
              <th className="py-2 pr-4 font-medium">Atencion exitosa</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Insight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.line}>
                <td className="py-3 pr-4 font-medium">{row.line}</td>
                <td className="py-3 pr-4">{row.unit}</td>
                <td className="py-3 pr-4">{row.available}</td>
                <td className="py-3 pr-4">{row.planned}</td>
                <td className="py-3 pr-4">{row.used}</td>
                <td className="py-3 pr-4">{row.successRate}</td>
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

function BranchCapacityTable({ rows }: { rows: CapacityBranchRow[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <MapPin className="size-4 text-primary" />
        Drill-down por sucursal
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1260px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Disponible</th>
              <th className="py-2 pr-4 font-medium">Planificada</th>
              <th className="py-2 pr-4 font-medium">Efectiva</th>
              <th className="py-2 pr-4 font-medium">Exitosa</th>
              <th className="py-2 pr-4 font-medium">Brecha meta</th>
              <th className="py-2 pr-4 font-medium">Lista espera</th>
              <th className="py-2 pr-4 font-medium">Capacidad perdida</th>
              <th className="py-2 pr-4 font-medium">Causa</th>
              <th className="py-2 pr-4 font-medium">Ingreso perdido</th>
              <th className="py-2 pr-4 font-medium">Proyeccion</th>
              <th className="py-2 pr-4 font-medium">Recomendacion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.branch}>
                <td className="py-3 pr-4 font-medium">{row.branch}</td>
                <td className="py-3 pr-4">{row.manager}</td>
                <td className="py-3 pr-4">{row.available}</td>
                <td className="py-3 pr-4">{row.planned}</td>
                <td className="py-3 pr-4">{row.effective}</td>
                <td className="py-3 pr-4">{row.successRate}</td>
                <td className="py-3 pr-4">{row.targetGap}</td>
                <td className="py-3 pr-4">{row.waitlist}</td>
                <td className="py-3 pr-4">{row.lostCapacity}</td>
                <td className="py-3 pr-4">{row.mainCause}</td>
                <td className="py-3 pr-4">{row.lostIncome}</td>
                <td className="py-3 pr-4">{row.projection}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {row.recommendation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CapacityRows({ metrics }: { metrics: CapacityMetric[] }) {
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

function CapacityBlockSection({ block }: { block: CapacityBlock }) {
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
      <CapacityRows metrics={block.metrics} />
    </section>
  );
}

function ExecutiveActionPanel({ actions }: { actions: string[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Gauge className="size-4 text-primary" />
        Que debemos hacer con la capacidad
      </div>
      <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
        {actions.map((action) => (
          <div className="rounded-md border p-3" key={action}>
            {action}
          </div>
        ))}
      </div>
    </section>
  );
}

function createDefaultSelection(
  screen: ReturnType<typeof getCapacityOccupancyScreen>,
): CapacitySelection {
  return {
    branch: allBranchesLabel,
    service: screen.filters.serviceOptions[0],
    resource: screen.filters.resourceOptions[0],
    channel: screen.filters.channelOptions[0],
    payer: screen.filters.payerOptions[0],
    day: screen.filters.dayOptions[0],
    timeSlot: screen.filters.timeSlotOptions[0],
    attentionState: screen.filters.attentionStateOptions[0],
    capacityType: screen.filters.capacityTypeOptions[0],
  };
}

export function CapacityOccupancyDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const lineSlug = useMemo(() => resolveContextLine(context), [context]);
  const screen = useMemo(
    () =>
      getCapacityOccupancyScreenForContext(
        {
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
        },
        lineSlug,
      ),
    [context, lineSlug],
  );
  const [selection, setSelection] = useState(() => createDefaultSelection(screen));
  const branchOptions = useMemo(
    () => [allBranchesLabel, ...screen.branchRows.map((row) => row.branch)],
    [screen.branchRows],
  );
  const filteredBranchRows = useMemo(() => {
    if (selection.branch === allBranchesLabel) {
      return screen.branchRows;
    }

    return screen.branchRows.filter((row) => row.branch === selection.branch);
  }, [screen.branchRows, selection.branch]);

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
    const nextSelection = createDefaultSelection(screen);
    const contextBranch = context?.branchName;

    if (
      contextBranch &&
      !/^Todas/i.test(contextBranch) &&
      branchOptions.includes(contextBranch)
    ) {
      nextSelection.branch = contextBranch;
    }

    setSelection(nextSelection);
  }, [branchOptions, context?.branchName, screen]);

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Capacidad y ocupacion</Badge>
            <Badge variant="outline">{screen.subtitle}</Badge>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md border bg-card">
                <Gauge className="size-5 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold tracking-normal">
                {screen.title}
              </h1>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {screen.description}
            </p>
          </div>
        </div>
        <ScopeCard
          context={context}
          lineSlug={lineSlug}
          selection={selection}
        />
      </div>

      <CapacityFilters
        branchOptions={branchOptions}
        filters={screen.filters}
        onChange={setSelection}
        selection={selection}
      />

      <BranchCapacityInputForm
        branchOptions={branchOptions}
        lineSlug={lineSlug}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {screen.primaryMetrics.map((metric, index) => (
          <CapacityMetricCard
            key={`${screen.slug}-${metric.label}-${index}`}
            metric={metric}
          />
        ))}
      </div>

      {screen.noDataReason ? (
        <CapacityNoDataState reason={screen.noDataReason} />
      ) : (
        <>
          <CapacitySuccessChart
            description={screen.mainChartDescription}
            rows={screen.utilizationRows}
            title={screen.mainChartTitle}
          />

          <AnalyticsComparisonChart {...screen.trendChart} />

          {screen.comparisonRows ? (
            <CapacityComparisonTable rows={screen.comparisonRows} />
          ) : null}

          <BranchCapacityTable rows={filteredBranchRows} />

          <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Regla: esta pantalla mide cuanto podia producirse, cuanto se
                planifico, cuanto se uso y cuanto termino exitosamente. Operacion
                ejecutiva mide lo realizado y Salud financiera mide el dinero y el
                margen perdido por esa brecha.
              </span>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            {screen.blocks.map((block) => (
              <CapacityBlockSection key={`${screen.slug}-${block.title}`} block={block} />
            ))}
          </div>

          <ExecutiveActionPanel actions={screen.executiveActions} />
        </>
      )}
    </section>
  );
}
