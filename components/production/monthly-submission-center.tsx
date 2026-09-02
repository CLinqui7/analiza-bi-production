"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Save,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImportBusinessLine, ManualMonthlyFormField } from "@/lib/analytics/import-operations";
import {
  countRequiredCompletion,
  getMonthlyFormFields,
  getMonthlyFormSteps,
  resolveFormBusinessLine,
} from "@/lib/monthly-form-contract";
import type { ContextOption, TenantContextOptions } from "@/lib/v7/server/tenant-context";

const acceptedFiles = ".xlsx,.xls,.csv,.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg";
const maxFileBytes = 15 * 1024 * 1024;

type SelectOption = { id: string; name: string };

const categoricalFieldOptions: Record<string, string[]> = {
  team_feedback_theme: [
    "Comunicación interna",
    "Servicio al cliente",
    "Procesos y tiempos",
    "Carga de trabajo",
    "Capacitación",
    "Liderazgo",
    "Sin hallazgos relevantes",
  ],
  team_feedback_action: [
    "Sin acción adicional",
    "Capacitación del equipo",
    "Ajuste de proceso",
    "Seguimiento individual",
    "Reasignación de recursos",
    "Reconocimiento al equipo",
  ],
  late_reason: [
    "No aplica",
    "Documento recibido tarde",
    "Validación pendiente",
    "Falla técnica",
    "Corrección solicitada",
    "Autorización excepcional",
  ],
  edit_authorization_code: [
    "No aplica",
    "Edición autorizada por administrador",
  ],
  manager_attestation: [
    "Confirmo que el cierre es anónimo, conciliado y corresponde al alcance seleccionado.",
  ],
};

const changeReasonOptions = [
  "Cierre inicial",
  "Corrección de datos",
  "Actualización de costos",
  "Actualización de evidencia",
  "Revisión solicitada",
  "Reapertura autorizada",
];

const contextFieldIds = new Set([
  "period",
  "branch_reported",
  "manager_name",
  "area_manager_name",
  "area_zone",
  "data_cutoff_date",
  "load_deadline_date",
]);

type SavedVersion = { id: string; version_number: number; status: string; created_at: string };
type ApiResult = {
  submissionId?: string;
  version?: SavedVersion;
  validation?: { blockers: string[]; warnings: string[] };
  error?: string;
  message?: string;
};
type AttachmentSummary = {
  reportType?: string;
  rowCount?: number;
  totalSales?: number;
  uniqueBranches?: number;
  uniqueDoctors?: number;
  uniqueExams?: number;
  minDate?: string | null;
  maxDate?: string | null;
  matchedBranch?: {
    branchLabel?: string;
    rowCount?: number;
    totalSales?: number;
    uniqueDoctors?: number;
    uniqueExams?: number;
    minDate?: string | null;
    maxDate?: string | null;
  } | null;
};
type Attachment = {
  id: string;
  original_file_name: string;
  file_extension: string;
  byte_size: number;
  parser_kind: string;
  parser_status: string;
  extracted_summary: AttachmentSummary;
  warning_codes: string[];
  created_at: string;
};
type RecentSubmission = {
  id: string;
  branch_id: string;
  business_line_id: string;
  period_start: string;
  period_end: string;
  status: string;
  current_version_number: number;
  updated_at: string;
  branches?: { name?: string; code?: string } | Array<{ name?: string; code?: string }> | null;
  business_lines?: { name?: string; code?: string } | Array<{ name?: string; code?: string }> | null;
};
type SubmissionDetail = {
  submission?: {
    id: string;
    country_id: string;
    company_id: string;
    operational_area_id: string | null;
    branch_id: string;
    business_line_id: string;
    period_start: string;
    period_end: string;
    status: string;
    current_version_number: number;
  };
  version?: {
    id: string;
    version_number: number;
    responses: Record<string, unknown>;
    validation_summary: Record<string, unknown>;
    status: string;
    change_reason: string | null;
    created_at: string;
    published_at: string | null;
  } | null;
  error?: string;
};

function monthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return { start: "", end: "" };
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const endDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${match[1]}-${match[2]}-01`,
    end: `${match[1]}-${match[2]}-${String(endDay).padStart(2, "0")}`,
  };
}

function loadDeadline(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]), 5));
  return date.toISOString().slice(0, 10);
}

function optionList(values: string[]): SelectOption[] {
  return values.map((value) => ({ id: value, name: value }));
}

function relationName(value: RecentSubmission["branches"]) {
  if (!value) return "Sin catálogo";
  if (Array.isArray(value)) return value[0]?.name ?? "Sin catálogo";
  return value.name ?? "Sin catálogo";
}

function filterByCompany(items: ContextOption[], companyId: string) {
  return items.filter((item) => !item.parentId || item.parentId === companyId);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function currency(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Sin dato";
  return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function parserLabel(status: string) {
  if (status === "parsed") return { label: "Analizado", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" };
  if (status === "warning") return { label: "Con advertencias", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" };
  if (status === "blocked") return { label: "Bloqueado", className: "bg-red-100 text-red-800 hover:bg-red-100" };
  if (status === "failed") return { label: "Falló", className: "bg-red-100 text-red-800 hover:bg-red-100" };
  return { label: "Evidencia", className: "bg-slate-100 text-slate-700 hover:bg-slate-100" };
}

function SelectOrFixed({
  label,
  value,
  onChange,
  options,
  disabled,
  required = false,
  description,
  emptyText = "No hay opciones disponibles dentro de tu alcance.",
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  description?: string;
  emptyText?: string;
  testId?: string;
}) {
  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2" data-testid={testId} data-control-mode="empty">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-800">{label}{required ? " *" : ""}</p>
        <p className="mt-1 text-sm text-amber-900">{emptyText}</p>
        {description && <p className="mt-1 text-xs text-amber-800/80">{description}</p>}
      </div>
    );
  }

  if (options.length === 1) {
    return (
      <div className="rounded-lg border bg-muted/30 px-3 py-2" data-testid={testId} data-control-mode="fixed">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}{required ? " *" : ""}</p>
        <p className="mt-0.5 text-sm font-medium">{options[0]!.name}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
    );
  }

  return (
    <label className="grid gap-1 text-sm" data-testid={testId} data-control-mode="select">
      <span className="font-medium">{label}{required ? " *" : ""}</span>
      <select
        className="h-10 rounded-md border bg-background px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {!value && <option value="">Selecciona una opción</option>}
        {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {description && <span className="text-xs text-muted-foreground">{description}</span>}
    </label>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
  derivedValue,
}: {
  field: ManualMonthlyFormField;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  derivedValue?: string;
}) {
  if (field.inputType === "file") {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</p>
            <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
            <p className="mt-2 text-xs font-medium text-primary">Se adjunta en la sección final “Evidencia del cierre”.</p>
          </div>
        </div>
      </div>
    );
  }

  if (derivedValue !== undefined) {
    return (
      <div className="grid gap-1.5">
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        <div className="min-h-10 rounded-md border bg-muted/40 px-3 py-2 text-sm">{derivedValue || "Pendiente"}</div>
        <p className="text-xs text-muted-foreground">{field.description} Se deriva del contexto autorizado.</p>
      </div>
    );
  }

  const isNumeric = ["number", "currency", "percent"].includes(field.inputType);
  const type = field.inputType === "date" ? "date" : field.inputType === "month" ? "month" : isNumeric ? "number" : "text";
  const step = field.inputType === "currency" ? "0.01" : field.inputType === "percent" ? "0.01" : field.inputType === "number" ? "any" : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`monthly-${field.id}`}>{field.label}{field.required ? " *" : ""}</Label>
      <div className="relative">
        <Input
          id={`monthly-${field.id}`}
          type={type}
          step={step}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={field.unit && !["fecha", "mes"].includes(field.unit) ? "pr-20" : undefined}
        />
        {field.unit && !["fecha", "mes"].includes(field.unit) && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{field.unit}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{field.description}</p>
    </div>
  );
}

export function MonthlySubmissionCenter({
  options,
  canWrite,
  canPublish,
  lockedBusinessLineCode,
}: {
  options: TenantContextOptions;
  canWrite: boolean;
  canPublish: boolean;
  lockedBusinessLineCode?: "LABORATORY" | "PHYSIOTHERAPY" | "IMAGING";
}) {
  const lockedLineOption = lockedBusinessLineCode
    ? options.businessLines.find((item) => item.code === lockedBusinessLineCode) ?? null
    : null;
  const lockedCompanyId = lockedLineOption?.parentId ?? null;
  const initialCompanyId = lockedCompanyId ?? options.companies[0]?.id ?? "";
  const initialLineId = lockedLineOption?.id ?? options.businessLines[0]?.id ?? "";
  const initialBranch = options.branches.find((item) => !initialCompanyId || item.parentId === initialCompanyId) ?? options.branches[0] ?? null;
  const initialCountryId = initialBranch?.countryId ?? options.operationalAreas.find((item) => !initialCompanyId || item.parentId === initialCompanyId)?.countryId ?? options.countries[0]?.id ?? "";
  const initialArea = options.operationalAreas.find((item) =>
    (!initialCompanyId || item.parentId === initialCompanyId)
    && (!initialCountryId || !item.countryId || item.countryId === initialCountryId),
  ) ?? null;
  const coherentInitialBranch = options.branches.find((item) =>
    (!initialCompanyId || item.parentId === initialCompanyId)
    && (!initialCountryId || !item.countryId || item.countryId === initialCountryId)
    && (!initialArea?.id || !item.operationalAreaId || item.operationalAreaId === initialArea.id),
  ) ?? initialBranch;
  const [countryId, setCountryId] = useState(initialCountryId);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [operationalAreaId, setOperationalAreaId] = useState(initialArea?.id ?? "");
  const [branchId, setBranchId] = useState(coherentInitialBranch?.id ?? "");
  const [businessLineId, setBusinessLineId] = useState(initialLineId);
  const [periodMonth, setPeriodMonth] = useState(options.reportingMonths[0]?.id ?? monthValue());
  const [branchManagerId, setBranchManagerId] = useState("");
  const [areaManagerId, setAreaManagerId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [changeReason, setChangeReason] = useState(changeReasonOptions[0]!);
  const [saved, setSaved] = useState<{ submissionId: string; versionId: string; versionNumber: number; status: string } | null>(null);
  const [dirty, setDirty] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recent, setRecent] = useState<RecentSubmission[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [busy, setBusy] = useState<"save" | "publish" | "upload" | "delete" | "open" | "report" | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const companies = useMemo(
    () => lockedCompanyId
      ? options.companies.filter((item) => item.id === lockedCompanyId)
      : options.companies,
    [lockedCompanyId, options.companies],
  );
  const businessLines = useMemo(
    () => lockedLineOption
      ? [lockedLineOption]
      : filterByCompany(options.businessLines, companyId),
    [companyId, lockedLineOption, options.businessLines],
  );
  const operationalAreas = useMemo(
    () => filterByCompany(options.operationalAreas, companyId).filter((item) => !item.countryId || item.countryId === countryId),
    [companyId, countryId, options.operationalAreas],
  );
  const branches = useMemo(
    () => filterByCompany(options.branches, companyId)
      .filter((item) => !item.countryId || item.countryId === countryId)
      .filter((item) => !operationalAreaId || !item.operationalAreaId || item.operationalAreaId === operationalAreaId),
    [companyId, countryId, operationalAreaId, options.branches],
  );
  const branchManagers = useMemo(
    () => options.branchManagers.filter((item) => item.branchId === branchId),
    [branchId, options.branchManagers],
  );
  const areaManagers = useMemo(
    () => options.areaManagers.filter((item) => item.operationalAreaId === operationalAreaId),
    [operationalAreaId, options.areaManagers],
  );
  const selectedBranch = branches.find((item) => item.id === branchId) ?? null;
  const selectedBranchManager = branchManagers.find((item) => item.id === branchManagerId) ?? branchManagers[0] ?? null;
  const selectedAreaManager = areaManagers.find((item) => item.id === areaManagerId) ?? areaManagers[0] ?? null;
  const selectedLineOption = businessLines.find((item) => item.id === businessLineId) ?? null;
  const formLine: ImportBusinessLine | null = selectedLineOption ? resolveFormBusinessLine(selectedLineOption) : null;
  const steps = useMemo(() => {
    if (!formLine) return [];

    return getMonthlyFormSteps(formLine)
      .map((candidate) => {
        const visibleFields = candidate.fields.filter((field) => field.inputType !== "file");

        if (candidate.id === "calidad-validacion" && formLine !== "Laboratorio") {
          return {
            ...candidate,
            title: "Cierre y autorización",
            description: "Confirma excepciones y la declaración del gerente antes de adjuntar el Excel o CSV en el paso final.",
            ownerNote: "Las respuestas se seleccionan desde opciones controladas; el archivo se carga después.",
            fields: visibleFields,
          };
        }

        return { ...candidate, fields: visibleFields };
      })
      .filter((candidate) => candidate.fields.length > 0);
  }, [formLine]);
  const allFields = useMemo(() => formLine ? getMonthlyFormFields(formLine) : [], [formLine]);
  const finalStepIndex = steps.length;
  const isFinalStep = currentStep === finalStepIndex;
  const period = monthBounds(periodMonth);
  const deadline = loadDeadline(periodMonth);
  const contextResponses = useMemo<Record<string, string>>(() => ({
    period: periodMonth,
    branch_reported: selectedBranch?.name ?? "",
    manager_name: selectedBranchManager?.name ?? "",
    area_manager_name: selectedAreaManager?.name ?? "",
    area_zone: selectedBranch?.city ?? "",
    data_cutoff_date: period.end,
    load_deadline_date: deadline,
  }), [deadline, period.end, periodMonth, selectedAreaManager?.name, selectedBranch?.city, selectedBranch?.name, selectedBranchManager?.name]);

  const responses = useMemo(() => {
    const payload: Record<string, unknown> = { ...contextResponses };
    for (const field of allFields) {
      if (field.inputType === "file" || contextFieldIds.has(field.id)) continue;
      const choices = categoricalFieldOptions[field.id] ?? [];
      const fallback = choices.length === 1 ? choices[0]! : "";
      const raw = (values[field.id] ?? fallback).trim();
      if (!raw) continue;
      if (["number", "currency", "percent"].includes(field.inputType)) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) payload[field.id] = parsed;
      } else {
        payload[field.id] = raw;
      }
    }
    return payload;
  }, [allFields, contextResponses, values]);

  const completion = useMemo(
    () => formLine ? countRequiredCompletion(formLine, responses) : { completed: 0, total: 0 },
    [formLine, responses],
  );
  const completionPct = completion.total ? Math.round((completion.completed / completion.total) * 100) : 0;
  const validAttachments = attachments.filter((item) => !["blocked", "failed"].includes(item.parser_status));
  const hasStructuredAttachment = validAttachments.some((item) => ["xlsx", "xls", "csv"].includes(item.file_extension.toLowerCase()));
  const hasBlockedAttachment = attachments.some((item) => item.parser_status === "blocked" || item.parser_status === "failed");
  const currentVersionPublished = saved?.status === "published";
  const canPublishCurrent = Boolean(
    canPublish
    && saved
    && !dirty
    && !currentVersionPublished
    && completion.completed === completion.total
    && validAttachments.length >= 1
    && validAttachments.length <= 2
    && hasStructuredAttachment
    && !hasBlockedAttachment,
  );

  const refreshRecent = useCallback(async () => {
    if (options.isDemo) return;
    setRecentLoading(true);
    try {
      const query = lockedLineOption?.id
        ? `?businessLineId=${encodeURIComponent(lockedLineOption.id)}`
        : "";
      const response = await fetch(`/api/monthly-submissions${query}`, { cache: "no-store" });
      const body = (await response.json()) as { items?: RecentSubmission[] };
      if (response.ok) setRecent(body.items ?? []);
    } finally {
      setRecentLoading(false);
    }
  }, [lockedLineOption?.id, options.isDemo]);

  // Keep form context on valid concrete options. There is intentionally no
  // “Todos” value here because a monthly closing always belongs to one scope.
  useEffect(() => {
    if (!options.countries.some((item) => item.id === countryId)) setCountryId(options.countries[0]?.id ?? "");
  }, [countryId, options.countries]);
  useEffect(() => {
    if (!companies.some((item) => item.id === companyId)) setCompanyId(companies[0]?.id ?? "");
  }, [companies, companyId]);
  useEffect(() => {
    if (!businessLines.some((item) => item.id === businessLineId)) setBusinessLineId(businessLines[0]?.id ?? "");
  }, [businessLineId, businessLines]);
  useEffect(() => {
    if (currentStep > finalStepIndex) setCurrentStep(0);
  }, [currentStep, finalStepIndex]);
  useEffect(() => {
    if (!operationalAreas.some((item) => item.id === operationalAreaId)) setOperationalAreaId(operationalAreas[0]?.id ?? "");
  }, [operationalAreaId, operationalAreas]);
  useEffect(() => {
    if (!branches.some((item) => item.id === branchId)) setBranchId(branches[0]?.id ?? "");
  }, [branchId, branches]);
  useEffect(() => {
    if (!options.reportingMonths.some((item) => item.id === periodMonth)) {
      setPeriodMonth(options.reportingMonths[0]?.id ?? monthValue());
    }
  }, [options.reportingMonths, periodMonth]);
  useEffect(() => {
    if (!branchManagers.some((item) => item.id === branchManagerId)) {
      setBranchManagerId(branchManagers[0]?.id ?? "");
    }
  }, [branchManagerId, branchManagers]);
  useEffect(() => {
    if (!areaManagers.some((item) => item.id === areaManagerId)) {
      setAreaManagerId(areaManagers[0]?.id ?? "");
    }
  }, [areaManagerId, areaManagers]);
  useEffect(() => {
    if (currentStep > steps.length) setCurrentStep(steps.length);
  }, [currentStep, steps.length]);

  function markContextChange() {
    setSaved(null);
    setAttachments([]);
    setDirty(true);
    setCurrentStep(0);
    setMessage(null);
  }

  function changeCountry(next: string) {
    setCountryId(next);
    const nextAreas = filterByCompany(options.operationalAreas, companyId).filter((item) => !item.countryId || item.countryId === next);
    const nextAreaId = nextAreas[0]?.id ?? "";
    setOperationalAreaId(nextAreaId);
    const nextBranches = filterByCompany(options.branches, companyId)
      .filter((item) => !item.countryId || item.countryId === next)
      .filter((item) => !nextAreaId || !item.operationalAreaId || item.operationalAreaId === nextAreaId);
    setBranchId(nextBranches[0]?.id ?? "");
    markContextChange();
  }

  function changeCompany(next: string) {
    setCompanyId(next);
    const lines = filterByCompany(options.businessLines, next);
    setBusinessLineId(lines[0]?.id ?? "");
    const areas = filterByCompany(options.operationalAreas, next).filter((item) => !item.countryId || item.countryId === countryId);
    const nextAreaId = areas[0]?.id ?? "";
    setOperationalAreaId(nextAreaId);
    const nextBranches = filterByCompany(options.branches, next)
      .filter((item) => !item.countryId || item.countryId === countryId)
      .filter((item) => !nextAreaId || !item.operationalAreaId || item.operationalAreaId === nextAreaId);
    setBranchId(nextBranches[0]?.id ?? "");
    setValues({});
    markContextChange();
  }

  function changeArea(next: string) {
    setOperationalAreaId(next);
    const nextBranches = filterByCompany(options.branches, companyId)
      .filter((item) => !item.countryId || item.countryId === countryId)
      .filter((item) => !next || !item.operationalAreaId || item.operationalAreaId === next);
    setBranchId(nextBranches[0]?.id ?? "");
    setAreaManagerId("");
    setBranchManagerId("");
    markContextChange();
  }

  function changeBranch(next: string) {
    setBranchId(next);
    setBranchManagerId("");
    markContextChange();
  }

  function changePeriod(next: string) {
    setPeriodMonth(next);
    markContextChange();
  }

  function changeField(fieldId: string, value: string) {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setDirty(true);
    setMessage(null);
  }

  async function loadAttachments(submissionId: string, versionId: string) {
    const response = await fetch(`/api/monthly-submissions/${submissionId}/attachments?versionId=${encodeURIComponent(versionId)}`, { cache: "no-store" });
    const body = (await response.json()) as { items?: Attachment[] };
    if (response.ok) setAttachments(body.items ?? []);
  }

  async function openSubmission(submissionId: string) {
    setBusy("open");
    setMessage(null);
    try {
      const response = await fetch(`/api/monthly-submissions?submissionId=${encodeURIComponent(submissionId)}`, { cache: "no-store" });
      const body = (await response.json()) as SubmissionDetail;
      if (!response.ok || !body.submission || !body.version) throw new Error(body.error ?? "No se pudo abrir el cierre.");
      if (lockedLineOption && body.submission.business_line_id !== lockedLineOption.id) {
        throw new Error(`Este módulo solo permite cierres de ${lockedLineOption.name}.`);
      }
      setCountryId(body.submission.country_id);
      setCompanyId(body.submission.company_id);
      setOperationalAreaId(body.submission.operational_area_id ?? "");
      setBranchId(body.submission.branch_id);
      setBusinessLineId(body.submission.business_line_id);
      setPeriodMonth(body.submission.period_start.slice(0, 7));
      const loadedResponses = Object.fromEntries(
        Object.entries(body.version.responses ?? {}).map(([key, value]) => [key, value === null || value === undefined ? "" : String(value)]),
      );
      setValues(loadedResponses);
      const loadedBranchManager = options.branchManagers.find((item) =>
        item.branchId === body.submission!.branch_id
        && item.name === loadedResponses.manager_name,
      );
      const loadedAreaManager = options.areaManagers.find((item) =>
        item.operationalAreaId === body.submission!.operational_area_id
        && item.name === loadedResponses.area_manager_name,
      );
      setBranchManagerId(loadedBranchManager?.id ?? "");
      setAreaManagerId(loadedAreaManager?.id ?? "");
      setChangeReason(body.version.change_reason ?? changeReasonOptions[0]!);
      setSaved({ submissionId: body.submission.id, versionId: body.version.id, versionNumber: body.version.version_number, status: body.version.status });
      setDirty(false);
      setWarnings([]);
      setCurrentStep(0);
      await loadAttachments(body.submission.id, body.version.id);
      setMessage({ type: "ok", text: `Cierre cargado · versión ${body.version.version_number} · ${body.version.status}.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo abrir el cierre." });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!canWrite) return;
    if (!countryId || !companyId || !branchId || !businessLineId || !period.start || !period.end || !formLine) {
      setMessage({ type: "error", text: "Selecciona un país, empresa, sucursal, línea y mes válidos." });
      return;
    }
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch("/api/monthly-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryId,
          companyId,
          operationalAreaId: operationalAreaId || null,
          branchId,
          businessLineId,
          branchManagerId: selectedBranchManager?.id ?? null,
          areaManagerId: selectedAreaManager?.id ?? null,
          periodStart: period.start,
          periodEnd: period.end,
          responses,
          changeReason: changeReason || undefined,
        }),
      });
      const body = (await response.json()) as ApiResult;
      if (!response.ok || !body.submissionId || !body.version) throw new Error(body.message ?? body.error ?? "No se pudo guardar el cierre.");
      setSaved({ submissionId: body.submissionId, versionId: body.version.id, versionNumber: body.version.version_number, status: body.version.status });
      setAttachments([]);
      setDirty(false);
      setWarnings(body.validation?.warnings ?? []);
      setMessage({ type: "ok", text: `Versión ${body.version.version_number} guardada como borrador. Ahora adjunta 1 o 2 archivos y publica cuando el formulario esté completo.` });
      if (showRecent) await refreshRecent();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo guardar el cierre." });
    } finally {
      setBusy(null);
    }
  }

  async function uploadFileToSupabaseStorage(file: File, storagePath: string) {
    // TUS is loaded only when the user reaches the final step and selects a
    // file. Keeping it out of the initial bundle makes the three forms faster.
    const [{ Upload }, { createClient }] = await Promise.all([
      import("tus-js-client"),
      import("@/lib/supabase/client"),
    ]);
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error("Tu sesión expiró. Inicia sesión nuevamente antes de cargar evidencia.");
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!baseUrl) throw new Error("Supabase Storage no está configurado.");

    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint: `${baseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: { authorization: `Bearer ${accessToken}` },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: 6 * 1024 * 1024,
        metadata: {
          bucketName: "monthly-evidence",
          objectName: storagePath,
          contentType: file.type || "application/octet-stream",
        },
        onError: (error) => reject(error),
        onSuccess: () => resolve(),
      });
      void upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]!);
        upload.start();
      }).catch(reject);
    });
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!saved || dirty || !fileList || fileList.length === 0 || !canWrite) return;
    const files = Array.from(fileList);
    if (files.length + attachments.length > 2) {
      setMessage({ type: "error", text: "Puedes tener máximo 2 archivos por versión." });
      return;
    }
    const tooLarge = files.find((file) => file.size > maxFileBytes);
    if (tooLarge) {
      setMessage({ type: "error", text: `${tooLarge.name} supera el máximo de 15 MB.` });
      return;
    }
    setBusy("upload");
    setMessage(null);
    try {
      for (const file of files) {
        const ticketResponse = await fetch(`/api/monthly-submissions/${saved.submissionId}/attachments/upload-ticket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId: saved.versionId, fileName: file.name, byteSize: file.size, mimeType: file.type || undefined }),
        });
        const ticket = (await ticketResponse.json()) as { storagePath?: string; error?: string; message?: string };
        if (!ticketResponse.ok || !ticket.storagePath) throw new Error(ticket.message ?? ticket.error ?? "No se pudo autorizar la carga del archivo.");

        // Browser → Supabase Storage via TUS. Large evidence bypasses Netlify's
        // function payload path and remains protected by the Storage RLS policy.
        await uploadFileToSupabaseStorage(file, ticket.storagePath);

        const finalizeResponse = await fetch(`/api/monthly-submissions/${saved.submissionId}/attachments/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId: saved.versionId, storagePath: ticket.storagePath, originalFileName: file.name, mimeType: file.type || undefined }),
        });
        const finalized = (await finalizeResponse.json()) as { item?: Attachment; error?: string; message?: string };
        if (!finalizeResponse.ok || !finalized.item) throw new Error(finalized.message ?? finalized.error ?? "El archivo se cargó, pero no pudo finalizar su validación.");
      }
      await loadAttachments(saved.submissionId, saved.versionId);
      setMessage({ type: "ok", text: "Archivo(s) cargado(s). Los Excel reconocidos se analizan solo en forma agregada para generar KPIs trazables." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudieron cargar los archivos." });
    } finally {
      setBusy(null);
    }
  }

  async function deleteAttachment(attachmentId: string) {
    if (!saved || !canWrite || currentVersionPublished) return;
    setBusy("delete");
    setMessage(null);
    try {
      const response = await fetch(`/api/monthly-submissions/${saved.submissionId}/attachments?attachmentId=${encodeURIComponent(attachmentId)}&versionId=${encodeURIComponent(saved.versionId)}`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo eliminar el archivo.");
      await loadAttachments(saved.submissionId, saved.versionId);
      setMessage({ type: "ok", text: "Archivo eliminado del borrador." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo eliminar el archivo." });
    } finally {
      setBusy(null);
    }
  }

  async function downloadSubmissionReport(format: "xlsx" | "csv" | "pdf") {
    if (!saved) return;
    setBusy("report");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/monthly-submissions/${saved.submissionId}/report?format=${encodeURIComponent(format)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? "No se pudo generar el reporte.");
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
      const fileName = match?.[1] ?? `analiza-cierre-${periodMonth}.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: "ok", text: `Reporte ${format.toUpperCase()} generado desde la versión guardada.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo generar el reporte." });
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!saved || !canPublishCurrent) return;
    setBusy("publish");
    setMessage(null);
    try {
      const response = await fetch("/api/monthly-submissions/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: saved.submissionId, versionId: saved.versionId }),
      });
      const body = (await response.json()) as { closingVersionId?: string; kpiCount?: number; error?: string; message?: string };
      if (!response.ok) throw new Error(body.message ?? body.error ?? "No se pudo publicar el cierre.");
      setSaved((current) => current ? { ...current, status: "published" } : current);
      setMessage({ type: "ok", text: `Cierre publicado. Se generaron ${body.kpiCount ?? 0} KPI(s) con trazabilidad al formulario y, cuando aplica, al archivo estructurado.` });
      if (showRecent) await refreshRecent();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo publicar el cierre." });
    } finally {
      setBusy(null);
    }
  }

  function changeSelectedManager(kind: "branch" | "area", next: string) {
    if (kind === "branch") setBranchManagerId(next);
    else setAreaManagerId(next);
    setDirty(true);
    setMessage(null);
  }

  function renderField(field: ManualMonthlyFormField) {
    const disabled = !canWrite || currentVersionPublished;

    if (field.id === "period") {
      return (
        <SelectOrFixed
          key={field.id}
          label={field.label}
          value={periodMonth}
          onChange={changePeriod}
          options={options.reportingMonths}
          disabled={disabled}
          required={field.required}
          description="Selecciona el mes que se cerrará. Solo se muestran periodos válidos del catálogo."
          testId="monthly-period"
        />
      );
    }

    if (field.id === "branch_reported") {
      return (
        <SelectOrFixed
          key={field.id}
          label={field.label}
          value={branchId}
          onChange={changeBranch}
          options={branches}
          disabled={disabled}
          required={field.required}
          description="Las opciones dependen de tu rol, país, empresa y área asignados."
          testId="monthly-branch"
        />
      );
    }

    if (field.id === "manager_name") {
      return (
        <SelectOrFixed
          key={field.id}
          label={field.label}
          value={selectedBranchManager?.id ?? ""}
          onChange={(next) => changeSelectedManager("branch", next)}
          options={branchManagers}
          disabled={disabled}
          required={field.required}
          description="Catálogo importado desde la asignación oficial de la sucursal."
          emptyText="La sucursal seleccionada no tiene gerente asignado. Debe completarse la asignación antes de publicar."
          testId="monthly-branch-manager"
        />
      );
    }

    if (field.id === "area_manager_name") {
      return (
        <SelectOrFixed
          key={field.id}
          label={field.label}
          value={selectedAreaManager?.id ?? ""}
          onChange={(next) => changeSelectedManager("area", next)}
          options={areaManagers}
          disabled={disabled}
          required={field.required}
          description="Catálogo importado desde la asignación oficial del área operativa."
          emptyText="El área seleccionada no tiene gerente asignado. Debe completarse la asignación antes de publicar."
          testId="monthly-area-manager"
        />
      );
    }

    if (field.id === "area_zone") {
      return (
        <FieldInput
          key={field.id}
          field={field}
          value=""
          onChange={() => undefined}
          disabled
          derivedValue={selectedBranch?.city ?? ""}
        />
      );
    }

    if (field.id === "data_cutoff_date") {
      return (
        <FieldInput
          key={field.id}
          field={field}
          value=""
          onChange={() => undefined}
          disabled
          derivedValue={period.end}
        />
      );
    }

    if (field.id === "load_deadline_date") {
      return (
        <FieldInput
          key={field.id}
          field={field}
          value=""
          onChange={() => undefined}
          disabled
          derivedValue={deadline}
        />
      );
    }

    const categorical = categoricalFieldOptions[field.id];
    if (categorical) {
      const fieldValue = values[field.id] ?? (categorical.length === 1 ? categorical[0]! : "");
      return (
        <SelectOrFixed
          key={field.id}
          label={field.label}
          value={fieldValue}
          onChange={(next) => changeField(field.id, next)}
          options={optionList(categorical)}
          disabled={disabled}
          required={field.required}
          description={field.description}
        />
      );
    }

    return (
      <FieldInput
        key={field.id}
        field={field}
        value={values[field.id] ?? ""}
        onChange={(next) => changeField(field.id, next)}
        disabled={disabled}
      />
    );
  }

  if (options.isDemo) {
    return (
      <Card>
        <CardHeader><CardTitle>Formulario mensual</CardTitle><CardDescription>El entorno DEMO conserva referencias visuales, pero no escribe datos simulados en la organización real.</CardDescription></CardHeader>
        <CardContent><Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">DEMO · solo referencia</Badge></CardContent>
      </Card>
    );
  }

  if (options.countries.length === 0 || options.companies.length === 0 || options.branches.length === 0 || options.businessLines.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Formulario mensual pendiente de estructura</CardTitle><CardDescription>Antes de capturar cierres debe existir al menos un país, empresa, sucursal activa y línea de negocio dentro de tu alcance.</CardDescription></CardHeader>
      </Card>
    );
  }

  const step = isFinalStep ? null : steps[currentStep] ?? null;

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Cierre mensual controlado</CardTitle>
              <CardDescription>Contrato completo por línea de negocio, versionado y sin datos personales de pacientes. Un filtro con una sola opción se muestra como contexto fijo, no como selector inútil.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Sin PII</Badge>
              <Badge variant="outline">RLS</Badge>
              <Badge variant="outline">1–2 adjuntos</Badge>
              {saved && <Badge variant="outline">v{saved.versionNumber} · {saved.status}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectOrFixed testId="monthly-country" label="País" value={countryId} onChange={changeCountry} options={options.countries} disabled={!canWrite && Boolean(saved)} required />
            <SelectOrFixed testId="monthly-company" label="Empresa / unidad" value={companyId} onChange={changeCompany} options={companies} disabled={!canWrite && Boolean(saved)} required />
            <SelectOrFixed testId="monthly-area" label="Área operativa" value={operationalAreaId} onChange={changeArea} options={operationalAreas} disabled={!canWrite && Boolean(saved)} required />
            <SelectOrFixed testId="monthly-line" label="Línea de negocio" value={businessLineId} onChange={(next) => { setBusinessLineId(next); setValues({}); markContextChange(); }} options={businessLines} disabled={!canWrite && Boolean(saved)} required />
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">Completitud de campos obligatorios</span>
              <span>{completion.completed}/{completion.total} · {completionPct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
            </div>
            {!canWrite && <p className="mt-2 text-xs text-muted-foreground">Tu rol puede consultar esta información, pero no editar cierres mensuales.</p>}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1" data-testid="monthly-form-steps">
            {steps.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${index === currentStep ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                {index + 1}. {candidate.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentStep(finalStepIndex)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${isFinalStep ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              {steps.length + 1}. Archivos y publicación
            </button>
          </div>
        </CardContent>
      </Card>

      {formLine && step && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">{formLine} · sección {currentStep + 1} de {steps.length}</p>
                <CardTitle className="mt-1">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
              <Badge variant="outline">{step.ownerNote}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              {step.fields.map(renderField)}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button type="button" variant="outline" disabled={currentStep === 0} onClick={() => setCurrentStep((value) => Math.max(0, value - 1))}>
                <ChevronLeft className="mr-2 size-4" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">* Campo obligatorio para publicar.</span>
              <Button type="button" variant="outline" onClick={() => setCurrentStep((value) => Math.min(finalStepIndex, value + 1))}>
                Siguiente <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isFinalStep && <>
      <Card data-testid="monthly-final-evidence-step">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{formLine} · paso final</p>
              <CardTitle className="mt-1">Archivos y publicación</CardTitle>
              <CardDescription>Termina primero el formulario. Después guarda la versión y adjunta mínimo 1 y máximo 2 archivos. Para publicar, al menos uno debe ser Excel o CSV; el segundo puede ser evidencia PDF, Word, imagen u otro formato permitido.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => setCurrentStep(Math.max(0, steps.length - 1))}>
              <ChevronLeft className="mr-2 size-4" /> Volver al formulario
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!saved ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              <Save className="mb-2 size-5" /> Guarda primero el formulario para crear una versión auditable y habilitar los adjuntos.
            </div>
          ) : dirty ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Cambiaste el formulario después del último guardado. Guarda una nueva versión antes de adjuntar o publicar.
            </div>
          ) : (
            <>
              {attachments.length < 2 && !currentVersionPublished && canWrite && (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center hover:bg-muted/30">
                  {busy === "upload" ? <Loader2 className="size-7 animate-spin text-primary" /> : <UploadCloud className="size-7 text-primary" />}
                  <span className="mt-2 text-sm font-medium">{attachments.length === 0 ? "Seleccionar Excel del reporte" : "Agregar archivo de respaldo"}</span>
                  <span className="mt-1 text-xs text-muted-foreground">Obligatorio para publicar: XLSX, XLS o CSV. Opcional como segundo archivo: PDF, Word, PowerPoint, TXT, PNG o JPG · máximo 15 MB c/u</span>
                  <input className="sr-only" type="file" accept={acceptedFiles} multiple={attachments.length === 0} onChange={(event) => { void uploadFiles(event.target.files); event.currentTarget.value = ""; }} />
                </label>
              )}

              <div className="grid gap-3">
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay archivos. Completa el formulario y, al final, adjunta el Excel o CSV del reporte.</p>
                ) : attachments.map((attachment) => {
                  const parser = parserLabel(attachment.parser_status);
                  const matched = attachment.extracted_summary?.matchedBranch ?? null;
                  return (
                    <div key={attachment.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileCheck2 className="size-4 shrink-0 text-primary" />
                            <p className="truncate text-sm font-medium">{attachment.original_file_name}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatBytes(attachment.byte_size)} · .{attachment.file_extension}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={parser.className}>{parser.label}</Badge>
                          {canWrite && !currentVersionPublished && (
                            <Button type="button" size="sm" variant="ghost" disabled={busy === "delete"} onClick={() => void deleteAttachment(attachment.id)} aria-label={`Eliminar ${attachment.original_file_name}`}>
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {attachment.parser_kind === "medical_exam_sales_report" && (
                        <div className="mt-3 grid gap-2 rounded-md bg-muted/30 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                          <div><span className="text-muted-foreground">Filas archivo</span><p className="font-medium">{attachment.extracted_summary.rowCount ?? "Sin dato"}</p></div>
                          <div><span className="text-muted-foreground">Venta archivo</span><p className="font-medium">{currency(attachment.extracted_summary.totalSales)}</p></div>
                          <div><span className="text-muted-foreground">Médicos únicos</span><p className="font-medium">{attachment.extracted_summary.uniqueDoctors ?? "Sin dato"}</p></div>
                          <div><span className="text-muted-foreground">Exámenes únicos</span><p className="font-medium">{attachment.extracted_summary.uniqueExams ?? "Sin dato"}</p></div>
                          {matched && <>
                            <div><span className="text-muted-foreground">Filas sucursal</span><p className="font-medium">{matched.rowCount ?? "Sin dato"}</p></div>
                            <div><span className="text-muted-foreground">Venta sucursal</span><p className="font-medium">{currency(matched.totalSales)}</p></div>
                            <div><span className="text-muted-foreground">Médicos sucursal</span><p className="font-medium">{matched.uniqueDoctors ?? "Sin dato"}</p></div>
                            <div><span className="text-muted-foreground">Exámenes sucursal</span><p className="font-medium">{matched.uniqueExams ?? "Sin dato"}</p></div>
                          </>}
                        </div>
                      )}
                      {attachment.warning_codes?.length > 0 && <p className="mt-2 text-xs text-amber-700">Validación: {attachment.warning_codes.join(" · ")}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Guardar y publicar</CardTitle><CardDescription>Guardar crea una nueva versión. Publicar convierte únicamente esa versión completa en la fuente oficial de KPIs del período.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="change-reason">Motivo del cambio</Label>
              <select
                id="change-reason"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={changeReason}
                onChange={(event) => { setChangeReason(event.target.value); setDirty(true); }}
                disabled={!canWrite}
              >
                {changeReasonOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                {changeReason && !changeReasonOptions.includes(changeReason) && <option value={changeReason}>{changeReason}</option>}
              </select>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>Publicación disponible cuando: campos obligatorios 100%, versión guardada, 1–2 adjuntos válidos, al menos un Excel/CSV y sin archivos bloqueados.</p>
              {!canPublish && <p className="mt-1 font-medium text-foreground">Tu rol puede preparar el cierre, pero la publicación oficial requiere un rol aprobador.</p>}
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="mr-2 inline size-4" />{warnings.join(" · ")}</div>
          )}
          {message && (
            <div className={`rounded-md border p-3 text-sm ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
              {message.type === "ok" ? <CheckCircle2 className="mr-2 inline size-4" /> : <AlertCircle className="mr-2 inline size-4" />}{message.text}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {canWrite && (
              <Button type="button" onClick={() => void save()} disabled={busy !== null || (!dirty && Boolean(saved))}>
                {busy === "save" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />} Guardar nueva versión
              </Button>
            )}
            {canPublish && (
              <Button type="button" variant="outline" onClick={() => void publish()} disabled={busy !== null || !canPublishCurrent}>
                {busy === "publish" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />} Publicar cierre oficial
              </Button>
            )}
            {saved && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><FileText className="size-3.5" /> Reportes</span>
                <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void downloadSubmissionReport("xlsx")}>
                  {busy === "report" ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Download className="mr-2 size-3.5" />} XLSX
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void downloadSubmissionReport("csv")}>CSV</Button>
                <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void downloadSubmissionReport("pdf")}>PDF</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </>}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Cierres recientes dentro de tu alcance</CardTitle>
              <CardDescription>La lista se carga solo cuando la solicitas para mantener el formulario ágil.</CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={recentLoading}
              onClick={() => {
                const next = !showRecent;
                setShowRecent(next);
                if (next && recent.length === 0) void refreshRecent();
              }}
            >
              {recentLoading ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
              {showRecent ? "Ocultar cierres" : "Mostrar cierres"}
            </Button>
          </div>
        </CardHeader>
        {showRecent && (
          <CardContent className="grid gap-2">
            {recentLoading ? <p className="text-sm text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />Cargando cierres…</p> : recent.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay cierres guardados.</p> : recent.slice(0, 12).map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{relationName(item.branches)} · {relationName(item.business_lines)}</p>
                  <p className="text-xs text-muted-foreground">{item.period_start.slice(0, 7)} · versión {item.current_version_number} · {item.status}</p>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void openSubmission(item.id)}>
                  {busy === "open" ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null} Abrir
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
