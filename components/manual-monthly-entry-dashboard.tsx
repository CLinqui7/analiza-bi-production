"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  FileCheck2,
  FileSpreadsheet,
  History,
  ListChecks,
  LockKeyhole,
  Save,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  calculateManualMonthlyHistorySummary,
  getManualMonthlyFormStepsForLine,
  getManualMonthlyHistoryForLine,
  importBusinessLines,
  type ImportBusinessLine,
  type ManualMonthlyDeadlineStatus,
  type ManualMonthlyFormField,
  type ManualMonthlyHistoryEntry,
  type ManualMonthlySubmissionStatus,
} from "@/lib/analytics/import-operations";
import {
  type ActiveBusinessLine,
  useActiveBusinessLine,
} from "@/hooks/use-active-business-line";
import {
  demoBranches,
  demoBusinessLineOptions,
  demoCountryOptions,
  regionalCountryId,
  roleKeys,
  type BranchOption,
  type RoleKey,
} from "@/lib/tenant/demo-context";
import { cn } from "@/lib/utils";

const contextStorageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const manualHistoryStorageKey = "analiza:manual-monthly-history";
const roleStorageKey = "analiza:demo-role";
const roleChangeEvent = "analiza:role-change";

type StoredContext = {
  branchId?: string;
  businessLineCode?: string;
  businessLineId?: string;
  businessLineName?: string;
  companyId?: string;
  countryName?: string;
  countryId?: string;
  companyName?: string;
  branchName?: string;
  managerName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
};

type LocalManualMonthlySubmission = ManualMonthlyHistoryEntry & {
  answers: Record<string, string>;
};

type ManualMetricCardProps = {
  icon: typeof ClipboardList;
  label: string;
  note: string;
  value: string;
};

type AutomaticQualityAlert = {
  title: string;
  reason: string;
  severity: "alta" | "media" | "baja";
};

const manualStatuses: ManualMonthlySubmissionStatus[] = [
  "Borrador DEMO",
  "Publicado DEMO",
  "Bloqueado por calidad DEMO",
];

const businessLineTone: Record<
  ImportBusinessLine,
  {
    accent: string;
    badge: string;
    border: string;
    soft: string;
    text: string;
  }
> = {
  Consolidado: {
    accent: "bg-slate-700",
    badge: "bg-slate-100 text-slate-800 hover:bg-slate-100",
    border: "border-slate-300",
    soft: "bg-slate-50",
    text: "text-slate-800",
  },
  Laboratorio: {
    accent: "bg-indigo-600",
    badge: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
    border: "border-indigo-300",
    soft: "bg-indigo-50",
    text: "text-indigo-900",
  },
  Fisioterapia: {
    accent: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    border: "border-emerald-300",
    soft: "bg-emerald-50",
    text: "text-emerald-900",
  },
  Imagenes: {
    accent: "bg-sky-600",
    badge: "bg-sky-100 text-sky-800 hover:bg-sky-100",
    border: "border-sky-300",
    soft: "bg-sky-50",
    text: "text-sky-900",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(isString);
}

function isImportBusinessLine(value: unknown): value is ImportBusinessLine {
  return isString(value) && importBusinessLines.includes(value as ImportBusinessLine);
}

function isManualSubmissionStatus(
  value: unknown,
): value is ManualMonthlySubmissionStatus {
  return isString(value) && manualStatuses.includes(value as ManualMonthlySubmissionStatus);
}

function isLocalManualMonthlySubmission(
  value: unknown,
): value is LocalManualMonthlySubmission {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isImportBusinessLine(value.businessLine) &&
    isString(value.branch) &&
    isString(value.period) &&
    isString(value.manager) &&
    isNumber(value.netRevenue) &&
    isNumber(value.revenueTarget) &&
    isNumber(value.grossMarginRate) &&
    isNumber(value.effectiveOccupancyRate) &&
    isNumber(value.activityVolume) &&
    isNumber(value.dataQualityScore) &&
    isManualSubmissionStatus(value.status) &&
    isString(value.sourceTrace) &&
    isString(value.createdAt) &&
    value.demoFlag === true &&
    isStringRecord(value.answers)
  );
}

function readStoredContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawContext =
    window.localStorage.getItem(contextStorageKey) ??
    window.sessionStorage.getItem(contextStorageKey);

  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as StoredContext;
  } catch {
    return null;
  }
}

function readLocalManualHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  const rawHistory = window.localStorage.getItem(manualHistoryStorageKey);

  if (!rawHistory) {
    return [];
  }

  try {
    const parsedHistory: unknown = JSON.parse(rawHistory);
    return Array.isArray(parsedHistory)
      ? parsedHistory.filter(isLocalManualMonthlySubmission)
      : [];
  } catch {
    window.localStorage.removeItem(manualHistoryStorageKey);
    return [];
  }
}

function readActiveDemoRole(): RoleKey {
  if (typeof window === "undefined") {
    return "super_admin";
  }

  const storedRole = window.localStorage.getItem(roleStorageKey);

  if (roleKeys.includes(storedRole as RoleKey)) {
    return storedRole as RoleKey;
  }

  return "super_admin";
}

function toImportBusinessLine(line: ActiveBusinessLine): ImportBusinessLine {
  if (line === "Laboratorio") {
    return "Laboratorio";
  }

  if (line === "Fisioterapia") {
    return "Fisioterapia";
  }

  if (line === "Imagenes") {
    return "Imagenes";
  }

  return "Consolidado";
}

function getBusinessLineCompanyId(line: ImportBusinessLine) {
  const lineCode: Record<ImportBusinessLine, string> = {
    Consolidado: "CONSOLIDATED",
    Fisioterapia: "PHYSIOTHERAPY",
    Imagenes: "IMAGING",
    Laboratorio: "LABORATORY",
  };
  const businessLine = demoBusinessLineOptions.find(
    (option) => option.code === lineCode[line],
  );

  return businessLine?.companyId ?? null;
}

function getBranchCountryName(countryId: string) {
  return (
    demoCountryOptions.find((country) => country.id === countryId)?.name ??
    "Pais pendiente"
  );
}

function formatBranchOption(branch: BranchOption) {
  const branchManager = branch.branchManagerName ?? "Sin gerente asignado";
  const areaManager = branch.areaManagerName ?? "Area pendiente";

  return `${branch.name} · ${branchManager} · Area: ${areaManager} · ${getBranchCountryName(branch.countryId)}`;
}

function getBranchOptionsForLine(
  line: ImportBusinessLine,
  context: StoredContext | null,
) {
  const companyId = getBusinessLineCompanyId(line);

  if (!companyId) {
    return [];
  }

  return demoBranches
    .filter((branch) => branch.companyId === companyId)
    .filter(
      (branch) =>
        !context?.countryId ||
        context.countryId === regionalCountryId ||
        branch.countryId === context.countryId,
    )
    .sort((left, right) =>
      formatBranchOption(left).localeCompare(formatBranchOption(right)),
    );
}

function uniqueSortedNames(names: Array<string | undefined>) {
  return Array.from(
    new Set(names.map((name) => name?.trim()).filter(isString).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

function getBranchManagerOptions(branchOptions: BranchOption[]) {
  return uniqueSortedNames(
    branchOptions.map((branch) => branch.branchManagerName),
  );
}

function getAreaManagerOptions(branchOptions: BranchOption[]) {
  return uniqueSortedNames(branchOptions.map((branch) => branch.areaManagerName));
}

function resolveBranchName(
  branchId: string | undefined,
  branchOptions: BranchOption[],
) {
  if (!branchId) {
    return "";
  }

  return (
    branchOptions.find((branch) => branch.id === branchId)?.name ??
    branchId
  );
}

function findSelectedBranch(
  branchId: string | undefined,
  branchOptions: BranchOption[],
) {
  if (!branchId) {
    return null;
  }

  return branchOptions.find((branch) => branch.id === branchId) ?? null;
}

function getDefaultAssignedBranchId(
  line: ImportBusinessLine,
  branchOptions: BranchOption[],
) {
  if (line === "Laboratorio") {
    return (
      branchOptions.find((branch) =>
        normalizeBranchText(branch.name).includes("escalon"),
      )?.id ??
      branchOptions[0]?.id ??
      ""
    );
  }

  return branchOptions[0]?.id ?? "";
}

function getMonthEndDate(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return "2026-07-31";
  }

  const [yearValue, monthValue] = period.split("-").map(Number);
  const monthEndDate = new Date(Date.UTC(yearValue, monthValue, 0));

  return monthEndDate.toISOString().slice(0, 10);
}

function getMonthlyLoadDeadline(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return "2026-08-04";
  }

  const [yearValue, monthValue] = period.split("-").map(Number);
  const deadlineDate = new Date(Date.UTC(yearValue, monthValue, 4));

  return deadlineDate.toISOString().slice(0, 10);
}

function getDeadlineStatus(
  period: string,
  createdAt: string,
): ManualMonthlyDeadlineStatus {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return "Pendiente DEMO";
  }

  return createdAt <= getMonthlyLoadDeadline(period)
    ? "A tiempo DEMO"
    : "Tarde DEMO";
}

function getPunctualityScore(status: ManualMonthlyDeadlineStatus) {
  if (status === "A tiempo DEMO") {
    return 100;
  }

  if (status === "Tarde DEMO") {
    return 70;
  }

  return 0;
}

function applyBranchMetadata(
  values: Record<string, string>,
  branch: BranchOption | null,
) {
  return {
    ...values,
    area_manager_name: branch?.areaManagerName ?? values.area_manager_name ?? "",
    area_zone: branch?.areaZone ?? values.area_zone ?? "",
    manager_name: branch?.branchManagerName ?? values.manager_name ?? "",
  };
}

function normalizeMonthValue(context: StoredContext | null) {
  if (context?.periodStart && /^\d{4}-\d{2}/.test(context.periodStart)) {
    return context.periodStart.slice(0, 7);
  }

  if (context?.period && /^\d{4}-\d{2}/.test(context.period)) {
    return context.period.slice(0, 7);
  }

  return "2026-07";
}

function buildInitialFormValues(
  line: ImportBusinessLine,
  context: StoredContext | null,
  branchOptions: BranchOption[],
  activeRole: RoleKey,
) {
  const fields = getManualMonthlyFormStepsForLine(line).flatMap(
    (step) => step.fields,
  );
  const values = fields.reduce<Record<string, string>>((currentValue, field) => {
    currentValue[field.id] = "";
    return currentValue;
  }, {});

  values.period = normalizeMonthValue(context);
  const contextBranchId =
    context?.branchId && context.branchId !== "__all__"
      ? context.branchId
      : "";
  const branchByName = branchOptions.find(
    (branch) => branch.name === context?.branchName,
  );

  values.branch_reported = branchOptions.some(
    (branch) => branch.id === contextBranchId,
  )
    ? contextBranchId
    : branchByName?.id ??
      (activeRole === "gerente_sucursal"
        ? getDefaultAssignedBranchId(line, branchOptions)
        : "");
  values.data_cutoff_date = getMonthEndDate(values.period);
  values.load_deadline_date = getMonthlyLoadDeadline(values.period);
  values.manager_attestation =
    "Confirmo cierre mensual anonimo, conciliado y sin datos personales visibles.";
  const contextManagerName =
    context?.managerName && context.managerName !== "Todos los gerentes"
      ? context.managerName
      : values.manager_name;

  return applyBranchMetadata(
    {
      ...values,
      manager_name: contextManagerName,
    },
    findSelectedBranch(values.branch_reported, branchOptions),
  );
}

function numberFromValue(value: string | undefined) {
  const parsedValue = Number((value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function resolveNetRevenue(
  line: ImportBusinessLine,
  values: Record<string, string>,
) {
  if (line === "Laboratorio") {
    return (
      numberFromValue(values.lab_total_sales) ||
      numberFromValue(values.net_revenue)
    );
  }

  return numberFromValue(values.net_revenue);
}

function resolveRevenueTarget(
  line: ImportBusinessLine,
  values: Record<string, string>,
) {
  if (line === "Laboratorio") {
    return (
      numberFromValue(values.lab_financial_target) ||
      numberFromValue(values.revenue_target)
    );
  }

  return numberFromValue(values.revenue_target);
}

function resolveGrossMarginRate(
  line: ImportBusinessLine,
  values: Record<string, string>,
) {
  if (line === "Laboratorio") {
    const totalSales = numberFromValue(values.lab_total_sales);
    const costOfSale = numberFromValue(values.lab_cost_of_sale);

    if (totalSales > 0 && costOfSale >= 0) {
      return ((totalSales - costOfSale) / totalSales) * 100;
    }

    return numberFromValue(values.gross_margin_rate);
  }

  return numberFromValue(values.gross_margin_rate);
}

function resolveDirectAndVariableCosts(
  line: ImportBusinessLine,
  values: Record<string, string>,
) {
  if (line === "Laboratorio") {
    const inventoryAmounts =
      numberFromValue(values.inventory_consumables_amount) +
      numberFromValue(values.inventory_supplies_amount) +
      numberFromValue(values.inventory_reactives_amount);

    return {
      directCosts:
        numberFromValue(values.lab_cost_of_sale) ||
        numberFromValue(values.direct_costs),
      variableCosts:
        inventoryAmounts ||
        numberFromValue(values.variable_costs),
    };
  }

  return {
    directCosts: numberFromValue(values.direct_costs),
    variableCosts: numberFromValue(values.variable_costs),
  };
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function resolveActivityVolume(
  line: ImportBusinessLine,
  values: Record<string, string>,
) {
  if (line === "Laboratorio") {
    const channelOrders =
      numberFromValue(values.lab_medical_order_count) +
      numberFromValue(values.lab_analiza_order_count) +
      numberFromValue(values.lab_drsv_order_count) +
      numberFromValue(values.lab_home_visit_count);

    return (
      numberFromValue(values.lab_total_orders) ||
      channelOrders ||
      numberFromValue(values.appointments_completed)
    );
  }

  if (line === "Fisioterapia") {
    return (
      numberFromValue(values.therapy_sessions) ||
      numberFromValue(values.active_treatment_plans) ||
      numberFromValue(values.appointments_completed)
    );
  }

  if (line === "Imagenes") {
    return (
      numberFromValue(values.imaging_studies) ||
      numberFromValue(values.reports_pending) ||
      numberFromValue(values.appointments_completed)
    );
  }

  return numberFromValue(values.appointments_completed);
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function statusClass(status: ManualMonthlySubmissionStatus) {
  if (status === "Publicado DEMO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "Bloqueado por calidad DEMO") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function ManualMetricCard({ icon: Icon, label, note, value }: ManualMetricCardProps) {
  return (
    <article className="grid min-h-28 gap-2 rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <strong className="text-2xl font-semibold tracking-normal">{value}</strong>
      <span className="text-xs leading-5 text-muted-foreground">{note}</span>
    </article>
  );
}

function fieldInputType(field: ManualMonthlyFormField) {
  if (field.inputType === "file") {
    return "file";
  }

  if (
    field.inputType === "currency" ||
    field.inputType === "number" ||
    field.inputType === "percent"
  ) {
    return "number";
  }

  return field.inputType;
}

function fieldInputStep(field: ManualMonthlyFormField) {
  if (field.inputType === "currency") {
    return "0.01";
  }

  if (field.inputType === "percent") {
    return "0.1";
  }

  if (field.inputType === "number") {
    return "1";
  }

  return undefined;
}

function normalizeBranchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function branchNamesMatch(left: string, right: string) {
  const normalizedLeft = normalizeBranchText(left);
  const normalizedRight = normalizeBranchText(right);

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function getAutomaticQualityAlerts({
  line,
  missingRequiredCount,
  values,
}: {
  line: ImportBusinessLine;
  missingRequiredCount: number;
  values: Record<string, string>;
}) {
  const alerts: AutomaticQualityAlert[] = [];
  const netRevenue = resolveNetRevenue(line, values);
  const revenueTarget = resolveRevenueTarget(line, values);
  const { directCosts, variableCosts } = resolveDirectAndVariableCosts(
    line,
    values,
  );

  if (missingRequiredCount > 0) {
    alerts.push({
      title: "Campos obligatorios pendientes",
      reason: `Faltan ${missingRequiredCount} campos requeridos; no conviene publicar conclusiones ejecutivas todavia.`,
      severity: "media",
    });
  }

  if (revenueTarget > 0 && netRevenue > revenueTarget * 1.35) {
    alerts.push({
      title: "Ingreso muy arriba de meta",
      reason:
        "La venta supera 135% de la meta. AnaliA recomienda validar si hay duplicados, mes incorrecto o venta extraordinaria documentada.",
      severity: "alta",
    });
  }

  if (revenueTarget > 0 && netRevenue > 0 && netRevenue < revenueTarget * 0.5) {
    alerts.push({
      title: "Ingreso muy por debajo de meta",
      reason:
        "La venta esta por debajo del 50% de la meta. Puede ser real, pero requiere explicacion antes de afectar puntaje o bono.",
      severity: "alta",
    });
  }

  if (netRevenue > 0 && directCosts + variableCosts > netRevenue * 0.85) {
    alerts.push({
      title: "Costos presionan margen",
      reason:
        "Costos directos y variables consumen mas del 85% del ingreso registrado; revisar clasificacion o compras extraordinarias.",
      severity: "media",
    });
  }

  if (line === "Laboratorio") {
    const labOrders = numberFromValue(values.lab_total_orders);
    const channelOrders =
      numberFromValue(values.lab_medical_order_count) +
      numberFromValue(values.lab_analiza_order_count) +
      numberFromValue(values.lab_drsv_order_count) +
      numberFromValue(values.lab_home_visit_count);
    const totalClients = numberFromValue(values.lab_total_clients);
    const classifiedClients =
      numberFromValue(values.lab_analiza_clients) +
      numberFromValue(values.lab_drsv_clients);
    const reactiveCost =
      numberFromValue(values.inventory_reactives_amount) ||
      numberFromValue(values.reactive_cost);
    const consumablesAmount = numberFromValue(values.inventory_consumables_amount);
    const suppliesAmount = numberFromValue(values.inventory_supplies_amount);

    if (netRevenue > 0 && reactiveCost > netRevenue * 0.22) {
      alerts.push({
        title: "Monto de reactivos sospechoso",
        reason:
          "Reactivos superan 22% de la venta registrada. Validar si el monto corresponde al mes, si incluye inventario acumulado o si hubo compras urgentes.",
        severity: "alta",
      });
    }

    if (labOrders > 0 && channelOrders > labOrders * 1.2) {
      alerts.push({
        title: "Ordenes por canal no cuadran",
        reason:
          "La suma de ordenes por origen supera demasiado las ordenes totales. Puede haber duplicados o una clasificacion mezclada.",
        severity: "media",
      });
    }

    if (totalClients > 0 && classifiedClients > totalClients * 1.15) {
      alerts.push({
        title: "Clientes duplicados o mal clasificados",
        reason:
          "Clientes Analiza y DRSV exceden el total de clientes. Revisar clasificacion antes de comparar crecimiento.",
        severity: "media",
      });
    }

    if (netRevenue > 0 && consumablesAmount + suppliesAmount > netRevenue * 0.18) {
      alerts.push({
        title: "Consumibles e insumos altos",
        reason:
          "Consumibles e insumos superan 18% de la venta registrada. AnaliA sugiere revisar unidades, compras acumuladas y costos mal asignados.",
        severity: "media",
      });
    }

    if (!values.medical_exam_sales_file?.trim()) {
      alerts.push({
        title: "Falta reporte de examenes y montos",
        reason:
          "Sin este Excel no se puede validar venta por doctor, examen, sucursal, monto vendido y visitador.",
        severity: "media",
      });
    }
  }

  return alerts;
}

function getAutomaticQualityScore({
  alerts,
  missingRequiredCount,
}: {
  alerts: AutomaticQualityAlert[];
  missingRequiredCount: number;
}) {
  const highAlertCount = alerts.filter((alert) => alert.severity === "alta").length;
  const mediumAlertCount = alerts.filter(
    (alert) => alert.severity === "media",
  ).length;

  return clampPercent(
    94 - missingRequiredCount * 3 - highAlertCount * 10 - mediumAlertCount * 5,
  );
}

function getEffectiveOccupancyForSubmission(
  line: ImportBusinessLine,
  values: Record<string, string>,
) {
  if (line === "Laboratorio") {
    const totalSales = numberFromValue(values.lab_total_sales);
    const revenueTarget = numberFromValue(values.lab_financial_target);
    const totalClients = numberFromValue(values.lab_total_clients);
    const analizaClients = numberFromValue(values.lab_analiza_clients);
    const drsvClients = numberFromValue(values.lab_drsv_clients);

    if (revenueTarget > 0) {
      return (totalSales / revenueTarget) * 100;
    }

    if (totalClients > 0) {
      return clampPercent(((analizaClients + drsvClients) / totalClients) * 100);
    }
  }

  return clampPercent(numberFromValue(values.effective_occupancy_rate));
}

function alertSeverityClass(severity: AutomaticQualityAlert["severity"]) {
  if (severity === "alta") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  if (severity === "media") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function ManualField({
  areaManagerOptions,
  branchManagerOptions,
  branchOptions,
  field,
  onChange,
  readOnly,
  value,
}: {
  areaManagerOptions: string[];
  branchManagerOptions: string[];
  branchOptions: BranchOption[];
  field: ManualMonthlyFormField;
  onChange: (value: string) => void;
  readOnly?: boolean;
  value: string;
}) {
  const isCurrency = field.inputType === "currency";
  const isPercent = field.inputType === "percent";
  const isFile = field.inputType === "file";
  const isNumeric =
    field.inputType === "currency" ||
    field.inputType === "number" ||
    field.inputType === "percent";
  const isBranchSelector = field.id === "branch_reported";
  const isBranchManagerSelector = field.id === "manager_name";
  const isAreaManagerSelector = field.id === "area_manager_name";
  const isSelectField =
    isBranchSelector || isBranchManagerSelector || isAreaManagerSelector;
  const isSystemDateField = ["data_cutoff_date", "load_deadline_date"].includes(
    field.id,
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0]?.name ?? "");
  }

  function renderTextOption(option: string) {
    return (
      <option key={option} value={option}>
        {option}
      </option>
    );
  }

  const contextFieldIds = [
    "period",
    "branch_reported",
    "manager_name",
    "area_manager_name",
    "area_zone",
    "data_cutoff_date",
    "load_deadline_date",
    "manager_attestation",
    "late_reason",
    "edit_authorization_code",
  ];
  const isTemplateInput =
    field.required &&
    !readOnly &&
    !isFile &&
    !field.id.startsWith("team_feedback_") &&
    !contextFieldIds.includes(field.id);

  return (
    <label
      className={cn(
        "grid gap-3 rounded-md border bg-card p-4 text-sm shadow-sm",
        isTemplateInput && "border-amber-200 bg-amber-50/60",
      )}
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-base font-semibold tracking-normal">
          {field.label}
        </span>
        <Badge
          className={
            field.required
              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/10"
              : undefined
          }
          variant="outline"
        >
          {field.required ? "Obligatorio" : "Opcional"}
        </Badge>
      </span>
      <span className="min-h-10 text-sm leading-6 text-muted-foreground">
        {field.description}
      </span>
      <span className="relative">
        {isBranchSelector ? (
          <select
            className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            disabled={readOnly}
            onChange={(event) => onChange(event.target.value)}
            value={value}
          >
            <option value="">Selecciona una sucursal</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {formatBranchOption(branch)}
              </option>
            ))}
          </select>
        ) : isBranchManagerSelector ? (
          <select
            className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            disabled={readOnly}
            onChange={(event) => onChange(event.target.value)}
            value={value}
          >
            <option value="">{field.placeholder}</option>
            {value && !branchManagerOptions.includes(value)
              ? renderTextOption(value)
              : null}
            {branchManagerOptions.map(renderTextOption)}
          </select>
        ) : isAreaManagerSelector ? (
          <select
            className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            disabled={readOnly}
            onChange={(event) => onChange(event.target.value)}
            value={value}
          >
            <option value="">{field.placeholder}</option>
            {value && !areaManagerOptions.includes(value)
              ? renderTextOption(value)
              : null}
            {areaManagerOptions.map(renderTextOption)}
          </select>
        ) : isFile ? (
          <div className="grid gap-2">
            <Input
              accept=".xlsx,.xls,.csv"
              className="h-12 cursor-pointer text-base file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              disabled={readOnly}
              onChange={handleFileChange}
              type="file"
            />
            {value ? (
              <span className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <FileSpreadsheet className="size-3 text-primary" />
                {value}
              </span>
            ) : null}
          </div>
        ) : isCurrency ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
        ) : null}
        {!isSelectField && !isFile ? (
          <Input
            className={cn(
              "h-12 text-base",
              isCurrency && "pl-8",
              isPercent && "pr-10",
              readOnly && "bg-muted text-muted-foreground",
            )}
            inputMode={isNumeric ? "decimal" : undefined}
            disabled={readOnly && isSystemDateField}
            max={field.max}
            min={field.min}
            onChange={handleChange}
            placeholder={field.placeholder}
            readOnly={readOnly}
            step={fieldInputStep(field)}
            type={fieldInputType(field)}
            value={value}
          />
        ) : null}
        {isPercent && !isSelectField ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        ) : null}
      </span>
      <span className="text-[11px] leading-4 text-muted-foreground">
        Unidad: {field.unit}
      </span>
    </label>
  );
}

function AutomaticQualityPanel({
  alerts,
  score,
}: {
  alerts: AutomaticQualityAlert[];
  score: number;
}) {
  return (
    <section className="grid gap-3 rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-primary" />
          Calidad automatica AnaliA
        </div>
        <Badge variant="outline">{Math.round(score)}/100</Badge>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        AnaliA revisa coherencia, archivos, montos, fechas y rangos antes de
        dejar que los dashboards traten el cierre como confiable.
      </p>
      <div className="grid gap-2">
        {alerts.length > 0 ? (
          alerts.slice(0, 4).map((alert) => (
            <div
              className={cn("rounded-md border p-3 text-xs leading-5", alertSeverityClass(alert.severity))}
              key={`${alert.title}-${alert.reason}`}
            >
              <div className="font-semibold">{alert.title}</div>
              <p className="mt-1 opacity-90">{alert.reason}</p>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
            No hay alertas fuertes con los datos capturados. Igual debe existir
            trazabilidad antes de aprobar resultados reales.
          </div>
        )}
      </div>
    </section>
  );
}

function YearToDateDashboard({
  activeLine,
  entries,
  selectedBranch,
}: {
  activeLine: ImportBusinessLine;
  entries: ManualMonthlyHistoryEntry[];
  selectedBranch: BranchOption | null;
}) {
  const selectedBranchName = selectedBranch?.name ?? "";
  const lineEntries = entries
    .filter((entry) => entry.businessLine === activeLine)
    .filter((entry) => entry.period.startsWith("2026-"))
    .filter((entry) => entry.status !== "Bloqueado por calidad DEMO");
  const branchEntries = selectedBranchName
    ? lineEntries.filter((entry) => branchNamesMatch(entry.branch, selectedBranchName))
    : lineEntries;
  const scopedEntries = selectedBranchName ? branchEntries : lineEntries;
  const totalRevenue = scopedEntries.reduce(
    (sum, entry) => sum + entry.netRevenue,
    0,
  );
  const totalTarget = scopedEntries.reduce(
    (sum, entry) => sum + entry.revenueTarget,
    0,
  );
  const totalActivity = scopedEntries.reduce(
    (sum, entry) => sum + entry.activityVolume,
    0,
  );
  const averageQuality =
    scopedEntries.length > 0
      ? scopedEntries.reduce((sum, entry) => sum + entry.dataQualityScore, 0) /
        scopedEntries.length
      : 0;
  const maxRevenue = Math.max(
    ...scopedEntries.map((entry) => entry.netRevenue),
    1,
  );

  return (
    <section className="grid gap-4 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="size-4 text-primary" />
            Acumulado anual
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Acumulado 2026 por linea y sucursal seleccionada. Si la sucursal no
            tiene historico DEMO, no se mezclan datos de otras sucursales.
          </p>
        </div>
        <Badge variant="outline">
          {selectedBranch?.name ?? "Todas las sucursales"}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <ManualMetricCard
          icon={Sparkles}
          label="Ingreso YTD"
          note={`${scopedEntries.length} cierres considerados.`}
          value={formatCurrency(totalRevenue)}
        />
        <ManualMetricCard
          icon={ClipboardList}
          label="Meta YTD"
          note={`Cumplimiento ${totalTarget > 0 ? Math.round((totalRevenue / totalTarget) * 100) : 0}%.`}
          value={formatCurrency(totalTarget)}
        />
        <ManualMetricCard
          icon={ListChecks}
          label={activeLine === "Laboratorio" ? "Actividad / ordenes" : "Actividad"}
          note="Volumen acumulado del periodo."
          value={totalActivity.toLocaleString("en-US")}
        />
        <ManualMetricCard
          icon={ShieldCheck}
          label="Calidad media YTD"
          note="Calculada por AnaliA."
          value={formatPercent(averageQuality)}
        />
      </div>

      <div className="grid gap-2">
        {scopedEntries.length > 0 ? (
          scopedEntries
            .slice()
            .sort((left, right) => left.period.localeCompare(right.period))
            .map((entry) => (
              <div className="grid gap-1" key={entry.id}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium">
                    {entry.period} · {entry.branch}
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(entry.netRevenue)} / meta{" "}
                    {formatCurrency(entry.revenueTarget)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width: `${Math.max(6, (entry.netRevenue / maxRevenue) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))
        ) : (
          <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            Aun no hay cierres publicados para esta sucursal. Cuando se publique
            su cierre mensual, el YTD se calculara solo con esa sucursal.
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryTable({ entries }: { entries: ManualMonthlyHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        Aun no hay cierres historicos para la sucursal seleccionada. No se
        muestran registros de otras sucursales para evitar lecturas mezcladas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-4 font-medium">Periodo</th>
            <th className="py-2 pr-4 font-medium">Linea</th>
            <th className="py-2 pr-4 font-medium">Sucursal</th>
            <th className="py-2 pr-4 font-medium">Gerente de area</th>
            <th className="py-2 pr-4 font-medium">Ingreso neto</th>
            <th className="py-2 pr-4 font-medium">Margen</th>
            <th className="py-2 pr-4 font-medium">Ocupacion</th>
            <th className="py-2 pr-4 font-medium">Calidad</th>
            <th className="py-2 pr-4 font-medium">Puntualidad</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 8).map((entry) => (
            <tr className="border-b last:border-b-0" key={entry.id}>
              <td className="py-3 pr-4 font-medium">{entry.period}</td>
              <td className="py-3 pr-4">{entry.businessLine}</td>
              <td className="py-3 pr-4">{entry.branch}</td>
              <td className="py-3 pr-4">{entry.areaManager ?? "Pendiente"}</td>
              <td className="py-3 pr-4">{formatCurrency(entry.netRevenue)}</td>
              <td className="py-3 pr-4">{formatPercent(entry.grossMarginRate)}</td>
              <td className="py-3 pr-4">
                {formatPercent(entry.effectiveOccupancyRate)}
              </td>
              <td className="py-3 pr-4">{formatPercent(entry.dataQualityScore)}</td>
              <td className="py-3 pr-4">
                <Badge variant="outline">
                  {entry.deadlineStatus ?? "Pendiente DEMO"}
                </Badge>
              </td>
              <td className="py-3 pr-4">
                <Badge className={statusClass(entry.status)}>{entry.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ManualMonthlyEntryDashboard() {
  const activeBusinessLine = useActiveBusinessLine();
  const activeLine = toImportBusinessLine(activeBusinessLine.line);
  const formTopRef = useRef<HTMLElement | null>(null);
  const [context, setContext] = useState<StoredContext | null>(null);
  const [activeRole, setActiveRole] = useState<RoleKey>("super_admin");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [localHistory, setLocalHistory] = useState<LocalManualMonthlySubmission[]>(
    [],
  );
  const [todayIsoDate, setTodayIsoDate] = useState("2026-07-29");
  const [notice, setNotice] = useState(
    "El formulario de importaciones sera la via manual principal mientras no haya fuente automatica aprobada.",
  );

  useEffect(() => {
    function refreshContext() {
      setContext(readStoredContext());
    }

    function refreshRole() {
      setActiveRole(readActiveDemoRole());
    }

    refreshContext();
    refreshRole();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);
    window.addEventListener("storage", refreshRole);
    window.addEventListener(roleChangeEvent, refreshRole);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
      window.removeEventListener("storage", refreshRole);
      window.removeEventListener(roleChangeEvent, refreshRole);
    };
  }, []);

  useEffect(() => {
    setLocalHistory(readLocalManualHistory());
  }, []);

  useEffect(() => {
    setTodayIsoDate(new Date().toISOString().slice(0, 10));
  }, []);

  const formSteps = useMemo(
    () => getManualMonthlyFormStepsForLine(activeLine),
    [activeLine],
  );
  const branchOptions = useMemo(
    () => getBranchOptionsForLine(activeLine, context),
    [activeLine, context],
  );
  const branchManagerOptions = useMemo(
    () => getBranchManagerOptions(branchOptions),
    [branchOptions],
  );
  const areaManagerOptions = useMemo(
    () => getAreaManagerOptions(branchOptions),
    [branchOptions],
  );
  const selectedBranch = useMemo(
    () => findSelectedBranch(formValues.branch_reported, branchOptions),
    [branchOptions, formValues.branch_reported],
  );
  const selectedBranchManagerName =
    formValues.manager_name || selectedBranch?.branchManagerName;
  const selectedAreaManagerName =
    formValues.area_manager_name || selectedBranch?.areaManagerName;
  const branchGroupCount = useMemo(() => {
    if (!selectedAreaManagerName) {
      return 0;
    }

    return branchOptions.filter(
      (branch) => branch.areaManagerName === selectedAreaManagerName,
    ).length;
  }, [branchOptions, selectedAreaManagerName]);

  useEffect(() => {
    setFormValues(
      buildInitialFormValues(activeLine, context, branchOptions, activeRole),
    );
    setActiveStepIndex(0);
  }, [activeLine, activeRole, branchOptions, context]);

  const allFields = useMemo(
    () => formSteps.flatMap((step) => step.fields),
    [formSteps],
  );
  const requiredMissing = useMemo(
    () =>
      allFields.filter(
        (field) => field.required && !formValues[field.id]?.trim(),
      ),
    [allFields, formValues],
  );
  const completionPercent =
    allFields.length > 0
      ? Math.round(
          ((allFields.length - requiredMissing.length) / allFields.length) *
            100,
        )
      : 0;
  const currentStep = formSteps[activeStepIndex] ?? formSteps[0];
  const currentStepMissingCount =
    currentStep?.fields.filter(
      (field) => field.required && !formValues[field.id]?.trim(),
    ).length ?? 0;
  const currentStepCompletionPercent =
    currentStep && currentStep.fields.length > 0
      ? Math.round(
          ((currentStep.fields.length - currentStepMissingCount) /
            currentStep.fields.length) *
            100,
        )
      : 0;
  const canUseManualForm = activeLine !== "Consolidado";
  const historyLine = activeLine === "Consolidado" ? "Todas" : activeLine;
  const demoHistory = useMemo(
    () => getManualMonthlyHistoryForLine(historyLine),
    [historyLine],
  );
  const filteredLocalHistory = useMemo(
    () =>
      localHistory.filter((entry) =>
        historyLine === "Todas" ? true : entry.businessLine === historyLine,
      ),
    [historyLine, localHistory],
  );
  const historyEntries = useMemo(
    () =>
      [...filteredLocalHistory, ...demoHistory].sort(
        (left, right) =>
          right.period.localeCompare(left.period) ||
          right.createdAt.localeCompare(left.createdAt),
      ),
    [demoHistory, filteredLocalHistory],
  );
  const selectedBranchName = selectedBranch?.name ?? "";
  const scopedHistoryEntries = useMemo(() => {
    if (!selectedBranchName || activeLine === "Consolidado") {
      return historyEntries;
    }

    return historyEntries.filter((entry) =>
      branchNamesMatch(entry.branch, selectedBranchName),
    );
  }, [activeLine, historyEntries, selectedBranchName]);
  const summary = useMemo(
    () => calculateManualMonthlyHistorySummary(scopedHistoryEntries),
    [scopedHistoryEntries],
  );
  const tone = businessLineTone[activeLine];
  const deadlineDate =
    formValues.load_deadline_date || getMonthlyLoadDeadline(formValues.period ?? "");
  const currentDeadlineStatus = getDeadlineStatus(
    formValues.period ?? "",
    todayIsoDate,
  );
  const automaticQualityAlerts = useMemo(
    () =>
      getAutomaticQualityAlerts({
        line: activeLine,
        missingRequiredCount: requiredMissing.length,
        values: formValues,
      }),
    [activeLine, formValues, requiredMissing.length],
  );
  const automaticQualityScore = useMemo(
    () =>
      getAutomaticQualityScore({
        alerts: automaticQualityAlerts,
        missingRequiredCount: requiredMissing.length,
      }),
    [automaticQualityAlerts, requiredMissing.length],
  );
  const lockAssignedScope = activeRole === "gerente_sucursal";

  function updateField(fieldId: string, value: string) {
    setFormValues((currentValue) => {
      if (fieldId === "branch_reported") {
        return applyBranchMetadata(
          {
            ...currentValue,
            branch_reported: value,
          },
          findSelectedBranch(value, branchOptions),
        );
      }

      if (fieldId === "period") {
        return {
          ...currentValue,
          data_cutoff_date: getMonthEndDate(value),
          load_deadline_date: getMonthlyLoadDeadline(value),
          period: value,
        };
      }

      return {
        ...currentValue,
        [fieldId]: value,
      };
    });
  }

  function persistHistory(entries: LocalManualMonthlySubmission[]) {
    setLocalHistory(entries);
    window.localStorage.setItem(manualHistoryStorageKey, JSON.stringify(entries));
  }

  function buildSubmission(
    status: ManualMonthlySubmissionStatus,
  ): LocalManualMonthlySubmission | null {
    if (!canUseManualForm) {
      return null;
    }

    const period = formValues.period?.trim() || normalizeMonthValue(context);
    const branch =
      resolveBranchName(formValues.branch_reported, branchOptions) ||
      context?.branchName ||
      "Sucursal pendiente";
    const createdAt = todayIsoDate;
    const deadlineStatus = getDeadlineStatus(period, createdAt);
    const qualityScore = automaticQualityScore;
    const submissionStatus =
      status === "Publicado DEMO" && qualityScore < 70
        ? "Bloqueado por calidad DEMO"
        : status;

    return {
      answers: formValues,
      activityVolume: resolveActivityVolume(activeLine, formValues),
      areaManager: formValues.area_manager_name?.trim() || "Gerente de area pendiente",
      branch,
      branchManager: formValues.manager_name?.trim() || "Gerente pendiente",
      businessLine: activeLine,
      createdAt,
      dataQualityScore: qualityScore,
      deadlineDate: getMonthlyLoadDeadline(period),
      deadlineStatus,
      demoFlag: true,
      effectiveOccupancyRate: clampPercent(
        getEffectiveOccupancyForSubmission(activeLine, formValues),
      ),
      grossMarginRate: clampPercent(
        resolveGrossMarginRate(activeLine, formValues),
      ),
      id: `manual-${activeLine.toLowerCase()}-${period}-${Date.now()}`,
      manager: formValues.manager_name?.trim() || "Gerente pendiente",
      netRevenue: resolveNetRevenue(activeLine, formValues),
      period,
      punctualityScore: getPunctualityScore(deadlineStatus),
      revenueTarget: resolveRevenueTarget(activeLine, formValues),
      sourceTrace: `DEMO formulario mensual ${activeLine} ${period} / ${selectedBranch?.sourceTrace ?? "catalogo demo"}`,
      status: submissionStatus,
    };
  }

  function saveSubmission(status: ManualMonthlySubmissionStatus) {
    if (!canUseManualForm) {
      setNotice("Selecciona una linea de negocio arriba para llenar el cierre mensual.");
      return;
    }

    if (status === "Publicado DEMO" && requiredMissing.length > 0) {
      setNotice(
        `Faltan ${requiredMissing.length} campos obligatorios antes de publicar el cierre.`,
      );
      return;
    }

    const submission = buildSubmission(status);

    if (!submission) {
      return;
    }

    const submissionKey = `${submission.businessLine}|${submission.branch}|${submission.period}`;
    const alreadyPublished = historyEntries.some(
      (entry) =>
        `${entry.businessLine}|${entry.branch}|${entry.period}` ===
          submissionKey && entry.status === "Publicado DEMO",
    );

    if (alreadyPublished && !formValues.edit_authorization_code?.trim()) {
      setNotice(
        "Ese cierre ya fue publicado. Para reemplazarlo necesitas autorizacion del administrador.",
      );
      return;
    }

    const nextHistory = [
      submission,
      ...localHistory.filter(
        (entry) =>
          `${entry.businessLine}|${entry.branch}|${entry.period}` !==
          submissionKey,
      ),
    ];
    persistHistory(nextHistory);
    setNotice(
      `${submission.status} guardado para ${submission.businessLine}, ${submission.branch}, ${submission.period}. Puntualidad: ${submission.deadlineStatus}.`,
    );
  }

  function showPreviousStep() {
    setActiveStepIndex((currentValue) => Math.max(0, currentValue - 1));
    scrollFormToTop();
  }

  function showNextStep() {
    setActiveStepIndex((currentValue) =>
      Math.min(formSteps.length - 1, currentValue + 1),
    );
    scrollFormToTop();
  }

  function selectStep(index: number) {
    setActiveStepIndex(index);
    scrollFormToTop();
  }

  function scrollFormToTop() {
    window.requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <section className="grid gap-6">
      <header className={cn("rounded-md border bg-card", tone.border)}>
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_320px] lg:items-center">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                DEMO
              </Badge>
              <Badge className={tone.badge}>{activeLine}</Badge>
              <Badge variant="outline">Formulario manual</Badge>
              {lockAssignedScope ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  Sucursal asignada
                </Badge>
              ) : null}
            </div>

            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-md text-white",
                  tone.accent,
                )}
              >
                <FileCheck2 className="size-6" />
              </span>
              <div className="grid gap-2">
                <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
                  Captura mensual de resultados
                </p>
                <h2 className="text-3xl font-semibold tracking-normal">
                  Llena el cierre mensual de la sucursal
                </h2>
                <p className="max-w-4xl text-base leading-7 text-muted-foreground">
                  Esta es la entrada manual que alimenta dashboards, Insights,
                  alertas, metas y bonos mientras no exista fuente automatica
                  aprobada.
                </p>
              </div>
            </div>
          </div>

          <aside className={cn("rounded-md border p-4", tone.soft, tone.border)}>
            <div className={cn("mb-3 flex items-center gap-2 font-medium", tone.text)}>
              <DatabaseZap className="size-4" />
              Manual ahora, fuente automatica despues
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              El mismo mapa de datos servira para CRM, agenda, facturacion,
              inventario o ERP cuando exista una fuente automatica aprobada por
              administracion.
            </p>
          </aside>
        </div>
      </header>

      {!canUseManualForm ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Selecciona una linea de negocio arriba para registrar un cierre
          mensual. La vista consolidada solo muestra historial y no debe mezclar
          datos operativos de negocios distintos.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <article
            className={cn("rounded-md border bg-card", tone.border)}
            ref={formTopRef}
          >
            <div className="grid gap-4 border-b p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <ListChecks className="size-4" />
                    Formulario en curso
                  </div>
                  <h3 className="text-2xl font-semibold tracking-normal">
                    Paso {activeStepIndex + 1}: {currentStep?.title}
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    {currentStep?.description}
                  </p>
                </div>
                <Badge variant="outline">
                  {currentStepCompletionPercent}% de este paso
                </Badge>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", tone.accent)}
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {formSteps.map((step, index) => {
                  const isActiveStep = activeStepIndex === index;
                  const stepMissingCount = step.fields.filter(
                    (field) => field.required && !formValues[field.id]?.trim(),
                  ).length;
                  const isCompleteStep = stepMissingCount === 0;

                  return (
                    <button
                      className={cn(
                        "flex items-center gap-3 rounded-md border bg-background p-3 text-left text-sm transition-colors hover:border-primary/50",
                        isActiveStep && "border-primary bg-primary/5",
                      )}
                      key={step.id}
                      onClick={() => selectStep(index)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-md border text-xs font-semibold",
                          isCompleteStep &&
                            "border-emerald-200 bg-emerald-50 text-emerald-800",
                          isActiveStep &&
                            "border-primary bg-primary text-primary-foreground",
                        )}
                      >
                        {isCompleteStep ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="grid min-w-0 gap-1">
                        <span className="truncate font-medium">{step.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {stepMissingCount} pendientes
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 p-5">
              <p className="rounded-md border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
                {currentStep?.ownerNote}
              </p>

              <div className="grid gap-4 lg:grid-cols-2">
                {currentStep?.fields.map((field) => (
                  <ManualField
                    areaManagerOptions={areaManagerOptions}
                    branchManagerOptions={branchManagerOptions}
                    branchOptions={branchOptions}
                    field={field}
                    key={field.id}
                    onChange={(value) => updateField(field.id, value)}
                    readOnly={
                      [
                        "area_zone",
                        "data_cutoff_date",
                        "load_deadline_date",
                      ].includes(field.id) ||
                      field.id.startsWith("team_feedback_") ||
                      (lockAssignedScope &&
                        [
                          "branch_reported",
                          "manager_name",
                          "area_manager_name",
                        ].includes(field.id))
                    }
                    value={formValues[field.id] ?? ""}
                  />
                ))}
              </div>

              <div className="grid gap-3 rounded-md border bg-background p-4">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{notice}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs leading-5 text-muted-foreground">
                    Pais: {context?.countryName ?? "El Salvador"} · Sucursal:{" "}
                    {selectedBranch?.name ?? "pendiente"} · Area:{" "}
                    {selectedAreaManagerName ?? "pendiente"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={activeStepIndex === 0}
                      onClick={showPreviousStep}
                      type="button"
                      variant="outline"
                    >
                      <ArrowLeft className="size-4" />
                      Anterior
                    </Button>
                    <Button
                      disabled={activeStepIndex >= formSteps.length - 1}
                      onClick={showNextStep}
                      type="button"
                      variant="outline"
                    >
                      Siguiente
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      onClick={() => saveSubmission("Borrador DEMO")}
                      type="button"
                      variant="secondary"
                    >
                      <Save className="size-4" />
                      Guardar avance DEMO
                    </Button>
                    <Button
                      onClick={() => saveSubmission("Publicado DEMO")}
                      type="button"
                    >
                      <CheckCircle2 className="size-4" />
                      Publicar cierre DEMO
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <aside className="grid content-start gap-4">
            <AutomaticQualityPanel
              alerts={automaticQualityAlerts}
              score={automaticQualityScore}
            />

            <section className={cn("rounded-md border bg-card p-4", tone.border)}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-medium">
                  <ClipboardList className="size-4 text-primary" />
                  Resumen para publicar
                </div>
                <Badge className={tone.badge}>{completionPercent}% listo</Badge>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="grid gap-1 rounded-md bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground">Periodo</span>
                  <strong>{formValues.period || "Pendiente"}</strong>
                </div>
                <div className="grid gap-1 rounded-md bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground">Sucursal</span>
                  <strong>{selectedBranch?.name ?? "Seleccion pendiente"}</strong>
                </div>
                <div className="grid gap-1 rounded-md bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground">
                    Gerente sucursal
                  </span>
                  <strong>
                    {selectedBranchManagerName ?? "Pendiente de asignar"}
                  </strong>
                </div>
                <div className="grid gap-1 rounded-md bg-muted/40 p-3">
                  <span className="text-xs text-muted-foreground">
                    Gerente de area
                  </span>
                  <strong>{selectedAreaManagerName ?? "Pendiente de asignar"}</strong>
                </div>
              </div>
            </section>

            <section className="grid gap-3 rounded-md border bg-card p-4">
              <div className="flex items-center gap-2 font-medium">
                <CalendarClock className="size-4 text-primary" />
                Control de carga
              </div>
              <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                <span>Deadline: {deadlineDate}</span>
                <span>Estado: {currentDeadlineStatus}</span>
                <span>
                  Penalizacion:{" "}
                  {currentDeadlineStatus === "Tarde DEMO"
                    ? "impacta puntaje y bono"
                    : "sin penalizacion"}
                </span>
                <span>{branchGroupCount || 0} sucursales bajo esta gerencia.</span>
              </div>
            </section>

            <section className="grid gap-3 rounded-md border bg-card p-4">
              <div className="flex items-center gap-2 font-medium">
                <LockKeyhole className="size-4 text-primary" />
                Reglas clave
              </div>
              <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                <span>Sin datos personales de pacientes.</span>
                <span>Publicar requiere todos los obligatorios.</span>
                <span>Editar un cierre publicado requiere autorizacion.</span>
                <span>AnaliA alerta si calidad baja de 70%.</span>
              </div>
            </section>
          </aside>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ManualMetricCard
          icon={ClipboardList}
          label="Campos completos"
          note={`${requiredMissing.length} obligatorios pendientes.`}
          value={`${completionPercent}%`}
        />
        <ManualMetricCard
          icon={History}
          label="Cierres historicos"
          note={`${summary.publishedEntries} publicados DEMO.`}
          value={`${summary.totalEntries}`}
        />
        <ManualMetricCard
          icon={Sparkles}
          label="Ultimo ingreso"
          note={`Ultimo periodo: ${summary.lastPeriod}.`}
          value={formatCurrency(summary.lastNetRevenue)}
        />
        <ManualMetricCard
          icon={ShieldCheck}
          label="Calidad AnaliA"
          note={`${summary.qualityWarnings} cierres con alerta.`}
          value={formatPercent(automaticQualityScore)}
        />
      </div>

      <YearToDateDashboard
        activeLine={activeLine}
        entries={scopedHistoryEntries}
        selectedBranch={selectedBranch}
      />

      <section className="grid gap-3 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-normal">
              Historico mensual guardado
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Cada mes queda separado por linea, sucursal, periodo y fuente DEMO.
            </p>
          </div>
          <Badge className={tone.badge}>{historyLine}</Badge>
        </div>
        <HistoryTable entries={scopedHistoryEntries} />
      </section>
    </section>
  );
}
