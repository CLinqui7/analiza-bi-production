"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Copy,
  DatabaseZap,
  Download,
  ExternalLink,
  FileText,
  Filter,
  GitBranch,
  History,
  Lightbulb,
  LineChart,
  ListChecks,
  MessageSquareText,
  PanelRightOpen,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataScienceAgentCockpit } from "@/components/data-science-agent-cockpit";
import { ImagingVerticalDashboard } from "@/components/imaging-vertical-dashboard";
import { Input } from "@/components/ui/input";
import { LaboratoryVerticalDashboard } from "@/components/laboratory-vertical-dashboard";
import { PhysiotherapyVerticalDashboard } from "@/components/physiotherapy-vertical-dashboard";
import { formatCurrency } from "@/lib/analytics/el-salvador-result-templates";
import {
  actionStatuses,
  allInsightOption,
  analiaMonitoringCycles,
  buildAnaliaModelCoverage,
  buildActionFunnel,
  buildBranchRanking,
  buildBusinessLineWarningSummary,
  buildCategoryImpact,
  buildEarlyWarningSummary,
  buildExecutiveCards,
  buildFinancialWaterfall,
  buildImpactUrgencyMatrix,
  buildInsightTrend,
  filterAnaliaModels,
  filterEarlyWarnings,
  createActionDraftFromInsight,
  createDemoAiResponse,
  demoInsightActions,
  demoInsights,
  describeFilters,
  filterInsights,
  formatConfidence,
  formatInsightImpact,
  getDefaultInsightFilters,
  getSuggestedQuestions,
  insightBusinessLines,
  insightCategories,
  insightDataSources,
  insightKpiCatalog,
  insightPriorities,
  insightRuleRegistry,
  insightStatuses,
  internalInsightTools,
  sortInsightsForToday,
  type AnaliaDataScienceModel,
  type DemoAiResponse,
  type EarlyWarningIndicator,
  type EarlyWarningSeverity,
  type InsightAction,
  type InsightActionStatus,
  type InsightFilters,
  type InsightModel,
  type InsightPriority,
  type InsightStatus,
} from "@/lib/analytics/insights";
import {
  demoBranches,
  demoCompanyOptions,
  demoCountryOptions,
  demoRoleProfiles,
  roleKeys,
  type RoleKey,
} from "@/lib/tenant/demo-context";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const roleStorageKey = "analiza:demo-role";
const roleChangeEvent = "analiza:role-change";
const currentDate = "2026-07-23";
const physiotherapyScopedInsightRoles = new Set<RoleKey>([
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "viewer",
]);

const tabs = [
  "Alertas tempranas",
  "Prioridades de hoy",
  "Oportunidades",
  "Riesgos y alertas",
  "Predicciones",
  "Acciones recomendadas",
  "Preguntar a los datos",
  "Seguimiento",
  "Historial",
] as const;

type InsightsTab = (typeof tabs)[number];

const aiModes = ["Consultar", "Analizar", "Simular", "Actuar"] as const;

type AiMode = (typeof aiModes)[number];

type StoredContext = {
  branchId?: string;
  branchName?: string;
  businessLineCode?: string;
  businessLineId?: string;
  businessLineName?: string;
  companyId?: string;
  companyName?: string;
  countryId?: string;
  countryName?: string;
  isDemo?: boolean;
  managerId?: string;
  managerName?: string;
  period?: string;
  periodEnd?: string;
  periodStart?: string;
};

type SelectOption = {
  label: string;
  value: string;
};

type ChatMessage = {
  id: string;
  question: string;
  response: DemoAiResponse;
};

type ChatAuditEntry = {
  confidence: number;
  filters: string[];
  functions: string[];
  id: string;
  mode: AiMode;
  question: string;
  sources: string[];
  timestamp: string;
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

function readActiveRole(): RoleKey {
  if (typeof window === "undefined") {
    return "webmaster_admin";
  }

  const storedRole = window.localStorage.getItem(roleStorageKey);

  if (roleKeys.includes(storedRole as RoleKey)) {
    return storedRole as RoleKey;
  }

  return "webmaster_admin";
}

function getBusinessLineLabel(context: StoredContext | null) {
  if (context?.businessLineCode === "PHYSIOTHERAPY") {
    return "Fisioterapia";
  }

  if (context?.businessLineCode === "LABORATORY") {
    return "Laboratorio";
  }

  if (context?.businessLineCode === "IMAGING") {
    return "Imagenes";
  }

  return "Consolidado";
}

function uniqueOptions(values: string[]): SelectOption[] {
  return [
    { label: allInsightOption, value: allInsightOption },
    ...Array.from(new Set(values.filter(Boolean))).sort().map((value) => ({
      label: value,
      value,
    })),
  ];
}

function priorityClass(priority: InsightPriority) {
  if (priority === "Critica") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (priority === "Alta") {
    return "bg-orange-100 text-orange-800 hover:bg-orange-100";
  }

  if (priority === "Media") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
}

function statusClass(status: InsightStatus | InsightActionStatus) {
  if (status === "Resuelto" || status === "Completada" || status === "Validado") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (
    status === "Bloqueado" ||
    status === "Bloqueada" ||
    status === "Vencida" ||
    status === "Descartado"
  ) {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (
    status === "Accion creada" ||
    status === "En curso" ||
    status === "En validacion" ||
    status === "Asignada"
  ) {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function earlyWarningSeverityClass(severity: EarlyWarningSeverity) {
  if (severity === "Critica") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (severity === "Alta") {
    return "bg-orange-100 text-orange-800 hover:bg-orange-100";
  }

  if (severity === "Media") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
}

function earlyWarningStatusClass(status: EarlyWarningIndicator["status"]) {
  if (status === "Actuar ahora") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  if (status === "Revisar hoy") {
    return "border-orange-200 bg-orange-50 text-orange-900";
  }

  if (status === "Esperando datos") {
    return "border-slate-200 bg-slate-50 text-slate-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}

function qualityClass(status: string) {
  if (status === "Dato real" || status === "Dato demo") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Pendiente de conexion de datos" || status === "Requiere conciliacion") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function toneCardClass(tone: string) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (tone === "negative") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  return "border-border bg-card text-foreground";
}

function ProgressBar({
  color = "bg-primary",
  value,
}: {
  color?: string;
  value: number;
}) {
  return (
    <div className="h-2 rounded-full bg-muted">
      <div
        className={cn("h-2 rounded-full", color)}
        style={{ width: `${Math.max(4, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function MiniTrend({
  points,
  tone = "bg-blue-600",
}: {
  points: number[];
  tone?: string;
}) {
  const max = Math.max(...points, 1);

  return (
    <div className="grid grid-cols-6 items-end gap-1">
      {points.map((point, index) => (
        <div className="flex h-12 items-end rounded-sm bg-muted" key={`${point}-${index}`}>
          <div
            className={cn("w-full rounded-sm", tone)}
            style={{ height: `${Math.max(8, (point / max) * 100)}%` }}
            title={`Riesgo ${point}`}
          />
        </div>
      ))}
    </div>
  );
}

function FieldSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <select
        className="h-10 min-w-0 rounded-md border bg-card px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed bg-card p-6 text-sm leading-6 text-muted-foreground">
      {text}
    </div>
  );
}

function withFilters(path: string, filters: InsightFilters) {
  const params = new URLSearchParams();

  params.set("country", filters.country);
  params.set("company", filters.company);
  params.set("line", filters.businessLine);
  params.set("branch", filters.branch);
  params.set("manager", filters.manager);

  return `${path}?${params.toString()}`;
}

function downloadEvidence(insight: InsightModel) {
  const lines = [
    "Dato demo,Insight,KPI,Resultado actual,Meta,Periodo anterior,Variacion,Fuente,Calidad",
    ...insight.evidence.map((item) =>
      [
        item.demo_flag ? "DEMO" : "No demo",
        insight.title,
        item.kpi,
        item.current_result,
        item.target,
        item.period_previous,
        item.percent_variation,
        item.source,
        item.data_quality,
      ]
        .map((value) => `"${value.replaceAll("\"", "\"\"")}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${insight.id}-evidencia-demo.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  void navigator.clipboard.writeText(text);
}

function InsightFiltersPanel({
  filters,
  onChange,
  insights,
}: {
  filters: InsightFilters;
  onChange: (filters: InsightFilters) => void;
  insights: InsightModel[];
}) {
  function updateFilter(key: keyof InsightFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const countryOptions = [
    { label: allInsightOption, value: allInsightOption },
    ...demoCountryOptions.map((country) => ({
      label: country.name,
      value: country.id,
    })),
  ];
  const companyOptions = [
    { label: allInsightOption, value: allInsightOption },
    ...demoCompanyOptions.map((company) => ({
      label: company.name,
      value: company.id,
    })),
  ];
  const businessLineOptions = [
    { label: allInsightOption, value: allInsightOption },
    ...insightBusinessLines.map((line) => ({
      label: line,
      value: line,
    })),
  ];
  const branchOptions = uniqueOptions([
    ...insights.map((insight) => insight.branch_name),
    ...demoBranches.map((branch) => branch.name),
  ]);
  const managerOptions = uniqueOptions([
    ...insights.map((insight) => insight.manager_id),
    ...insights.map((insight) => insight.suggested_owner),
  ]);
  const periodOptions = [
    "Hoy",
    "Esta semana",
    "Este mes",
    "Trimestre",
    "Ano",
    "Periodo anterior",
    "Mismo periodo del ano anterior",
    "Rango personalizado",
  ].map((period) => ({ label: period, value: period }));

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4 text-primary" />
          Filtros de Insights
        </div>
        <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
          DEMO: los filtros alimentan tarjetas, graficos, IA, acciones e historial
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <FieldSelect
          label="Pais"
          onChange={(value) => updateFilter("country", value)}
          options={countryOptions}
          value={filters.country}
        />
        <FieldSelect
          label="Empresa"
          onChange={(value) => updateFilter("company", value)}
          options={companyOptions}
          value={filters.company}
        />
        <FieldSelect
          label="Linea de negocio"
          onChange={(value) => updateFilter("businessLine", value)}
          options={businessLineOptions}
          value={filters.businessLine}
        />
        <FieldSelect
          label="Sucursal"
          onChange={(value) => updateFilter("branch", value)}
          options={branchOptions}
          value={filters.branch}
        />
        <FieldSelect
          label="Gerente"
          onChange={(value) => updateFilter("manager", value)}
          options={managerOptions}
          value={filters.manager}
        />
        <FieldSelect
          label="Periodo"
          onChange={(value) => updateFilter("period", value)}
          options={periodOptions}
          value={filters.period}
        />
        <FieldSelect
          label="Categoria"
          onChange={(value) => updateFilter("category", value)}
          options={[
            { label: allInsightOption, value: allInsightOption },
            ...insightCategories.map((category) => ({
              label: category,
              value: category,
            })),
          ]}
          value={filters.category}
        />
        <FieldSelect
          label="Prioridad"
          onChange={(value) => updateFilter("priority", value)}
          options={[
            { label: allInsightOption, value: allInsightOption },
            ...insightPriorities.map((priority) => ({
              label: priority,
              value: priority,
            })),
          ]}
          value={filters.priority}
        />
        <FieldSelect
          label="Estado"
          onChange={(value) => updateFilter("status", value)}
          options={[
            { label: allInsightOption, value: allInsightOption },
            ...insightStatuses.map((status) => ({
              label: status,
              value: status,
            })),
          ]}
          value={filters.status}
        />
        <FieldSelect
          label="Responsable"
          onChange={(value) => updateFilter("responsible", value)}
          options={uniqueOptions(insights.map((insight) => insight.suggested_owner))}
          value={filters.responsible}
        />
        <FieldSelect
          label="Fuente de datos"
          onChange={(value) => updateFilter("sourceData", value)}
          options={[
            { label: allInsightOption, value: allInsightOption },
            ...insightDataSources.map((source) => ({
              label: source,
              value: source,
            })),
          ]}
          value={filters.sourceData}
        />
      </div>
    </section>
  );
}

function TabNavigation({
  activeTab,
  onChange,
}: {
  activeTab: InsightsTab;
  onChange: (tab: InsightsTab) => void;
}) {
  return (
    <div className="rounded-md border bg-card p-2">
      <label className="grid gap-1 sm:hidden">
        <span className="text-xs font-medium text-muted-foreground">
          Seccion
        </span>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          onChange={(event) => onChange(event.target.value as InsightsTab)}
          value={activeTab}
        >
          {tabs.map((tab) => (
            <option key={tab} value={tab}>
              {tab}
            </option>
          ))}
        </select>
      </label>
      <div className="hidden min-w-0 max-w-full gap-2 overflow-x-auto sm:flex">
        {tabs.map((tab) => (
          <Button
            className={cn(
              "shrink-0",
              activeTab === tab ? "bg-primary text-primary-foreground" : "",
            )}
            key={tab}
            onClick={() => onChange(tab)}
            size="sm"
            type="button"
            variant={activeTab === tab ? "default" : "outline"}
          >
            {tab}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ExecutiveCards({
  cards,
  onApplyFilter,
}: {
  cards: ReturnType<typeof buildExecutiveCards>;
  onApplyFilter: (filter: Partial<InsightFilters>, cardId: string) => void;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {cards.map((card) => (
        <button
          className={cn(
            "min-h-28 rounded-md border p-4 text-left transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            toneCardClass(card.tone),
          )}
          key={card.id}
          onClick={() => onApplyFilter(card.filter, card.id)}
          title="Haz clic para filtrar la vista"
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-normal opacity-75">
              {card.label}
            </div>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              DEMO
            </Badge>
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-normal">
            {card.value}
          </div>
          <p className="mt-1 text-xs leading-5 opacity-80">{card.note}</p>
        </button>
      ))}
    </section>
  );
}

function AnaliaAgentStatusPanel({
  lastScanLabel,
  models,
  scanCount,
}: {
  lastScanLabel: string;
  models: AnaliaDataScienceModel[];
  scanCount: number;
}) {
  const coverage = buildAnaliaModelCoverage(models);

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <div className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4 text-primary" />
              AnaliA, agente de ciencia de datos
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Monitorea KPIs, plantillas, acciones y calidad de datos para
              actualizar Insights con modelos exploratorios, descriptivos y
              predictivos. En este entorno se ejecuta como DEMO visible.
            </p>
          </div>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Activo DEMO
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Ultima revision</div>
            <div className="mt-1 text-sm font-semibold">{lastScanLabel}</div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Ciclos visibles</div>
            <div className="mt-1 text-sm font-semibold">{scanCount}</div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Modelos activos</div>
            <div className="mt-1 text-sm font-semibold">
              {models.filter((model) => model.status === "Activo DEMO").length}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <BrainCircuit className="size-4 text-primary" />
          Cobertura de modelos
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {coverage.map((row) => (
            <div className="rounded-md border bg-background p-3" key={row.type}>
              <div className="text-sm font-semibold">{row.type}</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="text-2xl font-semibold">{row.total}</span>
                <span className="text-xs text-muted-foreground">
                  {row.active} activos / {row.pending} pendientes
                </span>
              </div>
              <ProgressBar
                color={row.pending > 0 ? "bg-amber-500" : "bg-emerald-600"}
                value={row.total > 0 ? (row.active / row.total) * 100 : 0}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          {analiaMonitoringCycles.map((cycle) => (
            <div className="rounded-md border bg-background p-3 text-xs leading-5" key={cycle.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{cycle.description}</span>
                <Badge variant="outline">{cycle.status}</Badge>
              </div>
              <div className="mt-1 text-muted-foreground">
                Alcance: {cycle.scope}. Proxima revision: {cycle.nextRunAt}.
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WarningSummaryCards({
  warnings,
}: {
  warnings: EarlyWarningIndicator[];
}) {
  const summary = buildEarlyWarningSummary(warnings);

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-md border bg-card p-4">
        <div className="text-xs font-medium text-muted-foreground">Alertas activas</div>
        <div className="mt-2 text-2xl font-semibold">{summary.total}</div>
        <p className="mt-1 text-xs text-muted-foreground">DEMO por filtros activos</p>
      </div>
      <div className="rounded-md border bg-red-50 p-4 text-red-900">
        <div className="text-xs font-medium">Criticas</div>
        <div className="mt-2 text-2xl font-semibold">{summary.critical}</div>
        <p className="mt-1 text-xs">Requieren direccion o finanzas.</p>
      </div>
      <div className="rounded-md border bg-orange-50 p-4 text-orange-900">
        <div className="text-xs font-medium">Actuar ahora</div>
        <div className="mt-2 text-2xl font-semibold">{summary.actNow}</div>
        <p className="mt-1 text-xs">Riesgo alto y accion sugerida.</p>
      </div>
      <div className="rounded-md border bg-amber-50 p-4 text-amber-900">
        <div className="text-xs font-medium">Riesgo promedio</div>
        <div className="mt-2 text-2xl font-semibold">{summary.averageRisk}/100</div>
        <p className="mt-1 text-xs">Puntaje exploratorio DEMO.</p>
      </div>
      <div className="rounded-md border bg-slate-50 p-4 text-slate-800">
        <div className="text-xs font-medium">Fuentes pendientes</div>
        <div className="mt-2 text-2xl font-semibold">{summary.pendingData}</div>
        <p className="mt-1 text-xs">No se inventa resultado.</p>
      </div>
    </section>
  );
}

function BusinessLineWarningMap({
  onSelectLine,
  warnings,
}: {
  onSelectLine: (line: string) => void;
  warnings: EarlyWarningIndicator[];
}) {
  const rows = buildBusinessLineWarningSummary(warnings);

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="size-4 text-primary" />
        Salud de alertas por linea de negocio
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <button
            className={cn(
              "rounded-md border p-4 text-left transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              earlyWarningStatusClass(
                row.actNow > 0
                  ? "Actuar ahora"
                  : row.pendingData > 0
                    ? "Esperando datos"
                    : "Monitorear",
              ),
            )}
            key={row.businessLine}
            onClick={() => onSelectLine(row.businessLine)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{row.businessLine}</span>
              <Badge className={earlyWarningSeverityClass(row.severity)}>
                {row.severity}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <span>{row.alerts} alertas</span>
              <span>{row.actNow} para actuar ahora</span>
              <span>{row.pendingData} con fuente pendiente</span>
              <span>Riesgo maximo {row.maxRisk}/100</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function EarlyWarningCard({
  onCreateAction,
  onOpenInsight,
  onOpenRoute,
  warning,
}: {
  onCreateAction: (warning: EarlyWarningIndicator) => void;
  onOpenInsight: (insightId: string) => void;
  onOpenRoute: (path: string) => void;
  warning: EarlyWarningIndicator;
}) {
  return (
    <article className="insight-card rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge className={earlyWarningSeverityClass(warning.severity)}>
              {warning.severity}
            </Badge>
            <Badge variant="outline">{warning.businessLine}</Badge>
            <Badge className={qualityClass(warning.dataQuality)}>
              {warning.dataQuality}
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              DEMO
            </Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{warning.indicator}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {warning.driver}
          </p>
        </div>
        <div className={cn("rounded-md border p-3 text-sm", earlyWarningStatusClass(warning.status))}>
          <div className="font-semibold">{warning.status}</div>
          <div className="mt-1 text-xs">Horizonte: {warning.horizon}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_160px]">
        <div className="rounded-lg border bg-background/80 p-3">
          <div className="text-xs text-muted-foreground">Resultado actual</div>
          <div className="mt-1 text-sm font-semibold">{warning.current}</div>
        </div>
        <div className="rounded-lg border bg-background/80 p-3">
          <div className="text-xs text-muted-foreground">Meta</div>
          <div className="mt-1 text-sm font-semibold">{warning.target}</div>
        </div>
        <div className="rounded-lg border bg-background/80 p-3">
          <div className="text-xs text-muted-foreground">Responsable</div>
          <div className="mt-1 text-sm font-semibold">{warning.owner}</div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Riesgo</span>
            <span>{warning.riskScore}/100</span>
          </div>
          <ProgressBar
            color={
              warning.riskScore >= 85
                ? "bg-red-600"
                : warning.riskScore >= 75
                  ? "bg-orange-500"
                  : "bg-amber-500"
            }
            value={warning.riskScore}
          />
          <div className="mt-2 text-xs text-muted-foreground">
            Confianza {formatConfidence(warning.confidence)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[180px_1fr]">
        <MiniTrend
          points={warning.trend}
          tone={
            warning.severity === "Critica"
              ? "bg-red-600"
              : warning.severity === "Alta"
                ? "bg-orange-500"
                : "bg-amber-500"
          }
        />
        <div className="rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground">
          <span className="font-medium text-foreground">Accion sugerida: </span>
          {warning.action}
          <div className="mt-2 text-xs">
            Modelos: {warning.modelIds.join(", ")}. Referencia: {warning.previous}.
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => onOpenInsight(warning.linkedInsightId)}
          size="sm"
          type="button"
          variant="outline"
        >
          <PanelRightOpen />
          Ver insight
        </Button>
        <Button
          onClick={() => onOpenRoute(warning.route)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ExternalLink />
          Abrir modulo
        </Button>
        <Button
          onClick={() => onCreateAction(warning)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ListChecks />
          Crear accion
        </Button>
      </div>
    </article>
  );
}

function AnaliaModelsTable({
  models,
}: {
  models: AnaliaDataScienceModel[];
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <DatabaseZap className="size-4 text-primary" />
        Modelos de ciencia de datos que alimentan Insights
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="text-xs uppercase tracking-normal text-muted-foreground">
            <tr className="border-b">
              <th className="py-3 pr-3 font-medium">Modelo</th>
              <th className="px-3 py-3 font-medium">Tipo</th>
              <th className="px-3 py-3 font-medium">Linea</th>
              <th className="px-3 py-3 font-medium">Metodo</th>
              <th className="px-3 py-3 font-medium">Salida</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 font-medium">Trazabilidad</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr className="border-b last:border-0 align-top" key={model.id}>
                <td className="py-3 pr-3 font-medium">{model.title}</td>
                <td className="px-3 py-3">
                  <Badge variant="outline">{model.type}</Badge>
                </td>
                <td className="px-3 py-3">{model.businessLine}</td>
                <td className="px-3 py-3 text-muted-foreground">{model.method}</td>
                <td className="px-3 py-3 text-muted-foreground">{model.output}</td>
                <td className="px-3 py-3">
                  <Badge className={qualityClass(model.dataQualityGate)}>
                    {model.status}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {model.traceability.join(" / ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EarlyWarningsTab({
  models,
  onCreateAction,
  onOpenInsight,
  onOpenRoute,
  onSelectLine,
  warnings,
}: {
  models: AnaliaDataScienceModel[];
  onCreateAction: (warning: EarlyWarningIndicator) => void;
  onOpenInsight: (insightId: string) => void;
  onOpenRoute: (path: string) => void;
  onSelectLine: (line: string) => void;
  warnings: EarlyWarningIndicator[];
}) {
  if (warnings.length === 0) {
    return (
      <EmptyState text="No hay alertas tempranas para los filtros seleccionados." />
    );
  }

  return (
    <div className="grid gap-4">
      <WarningSummaryCards warnings={warnings} />
      <BusinessLineWarningMap onSelectLine={onSelectLine} warnings={warnings} />
      <section className="grid gap-4">
        {warnings.map((warning) => (
          <EarlyWarningCard
            key={warning.id}
            onCreateAction={onCreateAction}
            onOpenInsight={onOpenInsight}
            onOpenRoute={onOpenRoute}
            warning={warning}
          />
        ))}
      </section>
      <AnaliaModelsTable models={models} />
    </div>
  );
}

function InsightCard({
  assignment,
  insight,
  onAssign,
  onCreateAction,
  onOpenDetail,
  onOpenEvidence,
  onOpenRelated,
  onReview,
  onRequireComment,
}: {
  assignment?: string;
  insight: InsightModel;
  onAssign: (insight: InsightModel) => void;
  onCreateAction: (insight: InsightModel) => void;
  onOpenDetail: (insight: InsightModel) => void;
  onOpenEvidence: (insight: InsightModel) => void;
  onOpenRelated: (insight: InsightModel) => void;
  onReview: (insight: InsightModel) => void;
  onRequireComment: (insight: InsightModel, action: "resolver" | "descartar") => void;
}) {
  return (
    <article className="rounded-md border bg-card p-4">
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge className={priorityClass(insight.priority)}>
            {insight.priority}
          </Badge>
          <Badge variant="outline">{insight.business_line}</Badge>
          <Badge variant="outline">{insight.branch_name}</Badge>
          <Badge variant="outline">
            {insight.period_start} a {insight.period_end}
          </Badge>
          <Badge className={statusClass(insight.status)}>{insight.status}</Badge>
          {insight.demo_flag ? (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              Dato demo
            </Badge>
          ) : null}
        </div>
        <Badge className={qualityClass(insight.data_quality_status)}>
          {insight.data_quality_status}
        </Badge>
      </div>

      <div className="grid gap-2">
        <button
          className="text-left text-lg font-semibold tracking-normal text-foreground underline-offset-4 hover:underline"
          onClick={() => onOpenDetail(insight)}
          type="button"
        >
          {insight.title}
        </button>
        <p className="text-sm leading-6 text-muted-foreground">
          {insight.summary}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Impacto principal
          </div>
          <div className="mt-1 text-sm font-semibold">
            {formatInsightImpact(insight)}
          </div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground">
            KPI afectado
          </div>
          <div className="mt-1 text-sm font-semibold">
            {insight.affected_kpis[0]?.label ?? "Pendiente"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {insight.affected_kpis[0]?.variation ?? "Sin variacion"}
          </div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-muted-foreground">
              Confianza
            </div>
            <span className="text-sm font-semibold">
              {formatConfidence(insight.confidence)}
            </span>
          </div>
          <ProgressBar
            color={
              insight.confidence >= 80
                ? "bg-emerald-600"
                : insight.confidence >= 65
                  ? "bg-amber-500"
                  : "bg-red-600"
            }
            value={insight.confidence}
          />
          <div className="mt-2 text-xs text-muted-foreground">
            Detectado: {insight.detected_at.slice(0, 10)}
          </div>
        </div>
      </div>

      {assignment ? (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          Responsable asignado en esta sesion: {assignment}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => onOpenDetail(insight)} size="sm" type="button" variant="outline">
          <PanelRightOpen />
          Ver detalle
        </Button>
        <Button onClick={() => onOpenEvidence(insight)} size="sm" type="button" variant="outline">
          <FileText />
          Ver evidencia
        </Button>
        <Button onClick={() => onCreateAction(insight)} size="sm" type="button" variant="outline">
          <ListChecks />
          Crear accion
        </Button>
        <Button onClick={() => onAssign(insight)} size="sm" type="button" variant="outline">
          <UserRound />
          Asignar responsable
        </Button>
        <Button onClick={() => onOpenRelated(insight)} size="sm" type="button" variant="outline">
          <ExternalLink />
          Abrir modulo
        </Button>
        <Button onClick={() => onReview(insight)} size="sm" type="button" variant="outline">
          <CheckCircle2 />
          Marcar revisado
        </Button>
        <Button
          onClick={() => onRequireComment(insight, "descartar")}
          size="sm"
          type="button"
          variant="outline"
        >
          Descartar
        </Button>
        <Button
          onClick={() => onRequireComment(insight, "resolver")}
          size="sm"
          type="button"
          variant="outline"
        >
          Resolver
        </Button>
      </div>
    </article>
  );
}

function InsightList({
  assignments,
  emptyText,
  insights,
  onAssign,
  onCreateAction,
  onOpenDetail,
  onOpenEvidence,
  onOpenRelated,
  onReview,
  onRequireComment,
}: {
  assignments: Record<string, string>;
  emptyText: string;
  insights: InsightModel[];
  onAssign: (insight: InsightModel) => void;
  onCreateAction: (insight: InsightModel) => void;
  onOpenDetail: (insight: InsightModel) => void;
  onOpenEvidence: (insight: InsightModel) => void;
  onOpenRelated: (insight: InsightModel) => void;
  onReview: (insight: InsightModel) => void;
  onRequireComment: (insight: InsightModel, action: "resolver" | "descartar") => void;
}) {
  if (insights.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="grid gap-4">
      {insights.map((insight) => (
        <InsightCard
          assignment={assignments[insight.id]}
          insight={insight}
          key={insight.id}
          onAssign={onAssign}
          onCreateAction={onCreateAction}
          onOpenDetail={onOpenDetail}
          onOpenEvidence={onOpenEvidence}
          onOpenRelated={onOpenRelated}
          onRequireComment={onRequireComment}
          onReview={onReview}
        />
      ))}
    </div>
  );
}

function ImpactUrgencyMatrix({
  insights,
  onSelect,
}: {
  insights: InsightModel[];
  onSelect: (insightId: string) => void;
}) {
  const points = buildImpactUrgencyMatrix(insights);

  return (
    <section className="executive-panel min-w-0 rounded-lg border p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="size-4 text-primary" />
          Matriz impacto versus urgencia
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Eje X: impacto. Eje Y: urgencia. Tamano: pacientes o impacto
          financiero. Cada punto permite abrir el detalle.
        </p>
      </div>
      <div className="relative h-[330px] overflow-hidden rounded-lg border bg-background p-4 shadow-inner">
        <div className="absolute inset-x-4 top-1/2 border-t border-dashed" />
        <div className="absolute inset-y-4 left-1/2 border-l border-dashed" />
        <div className="absolute left-5 top-5 text-xs font-medium text-red-800">
          Corregir rapidamente
        </div>
        <div className="absolute right-5 top-5 text-xs font-medium text-red-800">
          Actuar ahora
        </div>
        <div className="absolute bottom-5 left-5 text-xs font-medium text-muted-foreground">
          Monitorear
        </div>
        <div className="absolute bottom-5 right-5 text-xs font-medium text-blue-800">
          Planificar
        </div>
        {points.map((point) => (
          <button
            className={cn(
              "absolute flex items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white shadow-sm transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              point.priority === "Critica"
                ? "bg-red-600"
                : point.priority === "Alta"
                  ? "bg-orange-500"
                  : point.priority === "Media"
                    ? "bg-amber-500"
                    : "bg-emerald-600",
            )}
            key={point.id}
            onClick={() => onSelect(point.id)}
            style={{
              height: `${point.size}px`,
              left: `${Math.min(88, Math.max(8, 8 + point.impactScore * 0.84))}%`,
              top: `${Math.min(86, Math.max(8, 90 - point.urgencyScore * 0.82))}%`,
              width: `${point.size}px`,
            }}
            title={`${point.label} / ${point.branch}`}
            type="button"
          >
            {point.priority.slice(0, 1)}
          </button>
        ))}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
          Impacto
        </div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground">
          Urgencia
        </div>
      </div>
    </section>
  );
}

function CategoryImpactChart({
  insights,
  onSelectCategory,
}: {
  insights: InsightModel[];
  onSelectCategory: (category: string) => void;
}) {
  const points = buildCategoryImpact(insights);
  const maxValue = Math.max(...points.map((point) => point.financialImpact), 1);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="size-4 text-primary" />
        Impacto por categoria
      </div>
      <div className="grid gap-3">
        {points.map((point) => (
          <button
            className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={point.category}
            onClick={() => onSelectCategory(point.category)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{point.category}</span>
              <span className="font-semibold">
                {point.count} / {formatCurrency(point.financialImpact)}
              </span>
            </div>
            <ProgressBar
              color="bg-primary"
              value={(point.financialImpact / maxValue) * 100}
            />
            <div className="text-xs text-muted-foreground">
              {point.patientImpact.toLocaleString("en-US")} pacientes afectados DEMO
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function TrendChart({
  actions,
  insights,
}: {
  actions: InsightAction[];
  insights: InsightModel[];
}) {
  const trend = buildInsightTrend(insights, actions);
  const labels = [
    { key: "newInsights", label: "Nuevos", color: "bg-blue-600" },
    { key: "validated", label: "Validados", color: "bg-emerald-600" },
    { key: "actions", label: "Accion", color: "bg-orange-500" },
    { key: "resolved", label: "Resueltos", color: "bg-cyan-600" },
    { key: "overdue", label: "Vencidos", color: "bg-red-600" },
    { key: "reopened", label: "Reabiertos", color: "bg-slate-600" },
  ] as const;
  const maxValue = Math.max(
    ...trend.flatMap((point) => labels.map((label) => point[label.key])),
    1,
  );

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <LineChart className="size-4 text-primary" />
        Tendencia de insights
      </div>
      <div className="grid gap-3">
        {trend.map((point) => (
          <div className="grid gap-2" key={point.label}>
            <div className="text-xs font-medium text-muted-foreground">
              {point.label}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {labels.map((label) => (
                <div className="grid gap-1" key={label.key}>
                  <div className="flex h-28 items-end rounded-md bg-muted px-1">
                    <div
                      className={cn("w-full rounded-t-md", label.color)}
                      style={{
                        height: `${Math.max(6, (point[label.key] / maxValue) * 100)}%`,
                      }}
                      title={`${label.label}: ${point[label.key]}`}
                    />
                  </div>
                  <span className="truncate text-center text-[10px] text-muted-foreground">
                    {point[label.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {labels.map((label) => (
          <span className="inline-flex items-center gap-2 text-xs" key={label.key}>
            <span className={cn("size-2 rounded-full", label.color)} />
            {label.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function BranchRanking({
  actions,
  insights,
  onSelectBranch,
}: {
  actions: InsightAction[];
  insights: InsightModel[];
  onSelectBranch: (branch: string) => void;
}) {
  const rows = buildBranchRanking(insights, actions);

  return (
    <section className="min-w-0 rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <ClipboardList className="size-4 text-primary" />
        Ranking de sucursales por alertas
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead className="text-xs uppercase tracking-normal text-muted-foreground">
            <tr className="border-b">
              <th className="py-3 pr-3 font-medium">Sucursal</th>
              <th className="px-3 py-3 text-right font-medium">Criticos</th>
              <th className="px-3 py-3 text-right font-medium">Riesgos</th>
              <th className="px-3 py-3 text-right font-medium">Oportunidades</th>
              <th className="px-3 py-3 text-right font-medium">Impacto</th>
              <th className="px-3 py-3 text-right font-medium">Vencidas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-0" key={row.branch}>
                <td className="py-3 pr-3">
                  <button
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => onSelectBranch(row.branch)}
                    type="button"
                  >
                    {row.branch}
                  </button>
                </td>
                <td className="px-3 py-3 text-right">{row.criticalInsights}</td>
                <td className="px-3 py-3 text-right">{row.risks}</td>
                <td className="px-3 py-3 text-right">{row.opportunities}</td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(row.estimatedImpact)}
                </td>
                <td className="px-3 py-3 text-right">{row.actionsOverdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FunnelAndWaterfall({
  actions,
  insights,
}: {
  actions: InsightAction[];
  insights: InsightModel[];
}) {
  const funnel = buildActionFunnel(insights, actions);
  const waterfall = buildFinancialWaterfall(insights, actions);
  const maxFunnel = Math.max(...funnel.map((point) => point.value), 1);
  const maxWaterfall = Math.max(...waterfall.map((point) => point.value), 1);

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <ListChecks className="size-4 text-primary" />
          Embudo de acciones
        </div>
        <div className="grid gap-3">
          {funnel.map((point) => (
            <div className="grid gap-2" key={point.label}>
              <div className="flex items-center justify-between text-sm">
                <span>{point.label}</span>
                <span className="font-semibold">{point.value}</span>
              </div>
              <ProgressBar
                color="bg-blue-600"
                value={(point.value / maxFunnel) * 100}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <BadgeDollarSign className="size-4 text-primary" />
          Impacto financiero
        </div>
        <div className="grid gap-3">
          {waterfall.map((point) => (
            <div className="grid gap-2" key={point.label}>
              <div className="flex items-center justify-between text-sm">
                <span>{point.label}</span>
                <span className="font-semibold">{formatCurrency(point.value)}</span>
              </div>
              <ProgressBar
                color={
                  point.tone === "negative"
                    ? "bg-red-600"
                    : point.tone === "positive"
                      ? "bg-emerald-600"
                      : "bg-slate-600"
                }
                value={(point.value / maxWaterfall) * 100}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border bg-background p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function InsightDetailPanel({
  actionMessage,
  filters,
  insight,
  onClose,
  onCreateAction,
  onOpenRelated,
  onSetActionMessage,
  onUpdateStatus,
}: {
  actionMessage: string;
  filters: InsightFilters;
  insight: InsightModel;
  onClose: () => void;
  onCreateAction: (insight: InsightModel) => void;
  onOpenRelated: (insight: InsightModel) => void;
  onSetActionMessage: (value: string) => void;
  onUpdateStatus: (insight: InsightModel, status: InsightStatus, comment: string) => void;
}) {
  const causes = [
    ...insight.confirmed_causes.map((description) => ({
      description,
      type: "Causa confirmada",
    })),
    ...insight.probable_causes.map((description) => ({
      description,
      type: "Causa probable",
    })),
    ...insight.assumptions.map((description) => ({
      description,
      type: "Informacion insuficiente",
    })),
  ];

  return (
    <aside className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge className={priorityClass(insight.priority)}>
              {insight.priority}
            </Badge>
            <Badge className={statusClass(insight.status)}>{insight.status}</Badge>
            <Badge className={qualityClass(insight.data_quality_status)}>
              {insight.data_quality_status}
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              DEMO
            </Badge>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal">
            {insight.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {insight.summary}
          </p>
        </div>
        <Button onClick={onClose} size="sm" type="button" variant="outline">
          Cerrar detalle
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSection
          icon={<Lightbulb className="size-4 text-primary" />}
          title="A. Hallazgo"
        >
          <p className="text-sm leading-6 text-muted-foreground">
            {insight.operational_impact}
          </p>
        </DetailSection>

        <DetailSection
          icon={<DatabaseZap className="size-4 text-primary" />}
          title="B. Evidencia"
        >
          <div className="grid gap-3">
            {insight.evidence.map((item) => (
              <article className="rounded-md border bg-card p-3" key={item.kpi}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">{item.kpi}</div>
                  <Badge className={qualityClass(item.data_quality)}>
                    {item.data_quality}
                  </Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                  <span>Actual: {item.current_result}</span>
                  <span>Meta: {item.target}</span>
                  <span>Anterior: {item.period_previous}</span>
                  <span>Variacion: {item.percent_variation}</span>
                  <span>Absoluta: {item.absolute_variation}</span>
                  <span>Fuente: {item.source}</span>
                  <span>Actualizado: {item.updated_at}</span>
                </div>
              </article>
            ))}
          </div>
        </DetailSection>

        <DetailSection
          icon={<BadgeDollarSign className="size-4 text-primary" />}
          title="C. Impacto"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-card p-3">
              <div className="text-xs text-muted-foreground">Financiero</div>
              <div className="mt-1 text-lg font-semibold">
                {formatCurrency(insight.financial_impact)}
              </div>
            </div>
            <div className="rounded-md border bg-card p-3">
              <div className="text-xs text-muted-foreground">Pacientes</div>
              <div className="mt-1 text-lg font-semibold">
                {insight.patient_impact.toLocaleString("en-US")}
              </div>
            </div>
            <div className="rounded-md border bg-card p-3 sm:col-span-2">
              <div className="text-xs text-muted-foreground">Operativo</div>
              <p className="mt-1 text-sm leading-6">{insight.operational_impact}</p>
            </div>
          </div>
        </DetailSection>

        <DetailSection
          icon={<GitBranch className="size-4 text-primary" />}
          title="D. Causas"
        >
          <div className="grid gap-2">
            {causes.map((cause) => (
              <div
                className="rounded-md border bg-card p-3 text-sm leading-6"
                key={`${cause.type}-${cause.description}`}
              >
                <Badge
                  className={
                    cause.type === "Causa confirmada"
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      : cause.type === "Causa probable"
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                  }
                >
                  {cause.type}
                </Badge>
                <p className="mt-2 text-muted-foreground">{cause.description}</p>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection
          icon={<Target className="size-4 text-primary" />}
          title="E. Recomendacion"
        >
          <div className="grid gap-3">
            {insight.recommended_actions.map((action) => (
              <article className="rounded-md border bg-card p-3" key={action.action}>
                <div className="text-sm font-medium">{action.action}</div>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
                  <span>Responsable sugerido: {action.owner}</span>
                  <span>Fecha sugerida: {action.suggested_due_date}</span>
                  <span>KPI esperado: {action.expected_kpi}</span>
                  <span>Impacto esperado: {action.expected_impact}</span>
                  <span>Riesgo de no actuar: {action.risk_of_inaction}</span>
                </div>
              </article>
            ))}
          </div>
        </DetailSection>

        <DetailSection
          icon={<ShieldCheck className="size-4 text-primary" />}
          title="F. Fuentes y trazabilidad"
        >
          <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <span>Modulos: {insight.source_modules.join(", ")}</span>
            <span>Plantillas: {insight.source_templates.join(", ")}</span>
            <span>Registros: {insight.source_records.join(", ")}</span>
            <span>Periodo: {insight.period_start} a {insight.period_end}</span>
            <span>Formulas: {insight.audit_metadata.formulas.join(", ")}</span>
            <span>Filtros: {describeFilters(filters).join(" / ")}</span>
            <span>Calidad: {insight.data_quality_status}</span>
            <span>Dato real, estimado o demo: Dato demo</span>
          </div>
        </DetailSection>
      </div>

      <section className="mt-4 rounded-md border bg-background p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <ExternalLink className="size-4 text-primary" />
          G. Navegacion relacionada y cierre
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onOpenRelated(insight)} size="sm" type="button" variant="outline">
            Ver modulo relacionado
          </Button>
          <Button
            onClick={() => {
              window.location.href = withFilters("/protected/calidad-datos", filters);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Ver calidad de datos
          </Button>
          <Button onClick={() => onCreateAction(insight)} size="sm" type="button" variant="outline">
            Crear borrador de accion
          </Button>
          <Button onClick={() => downloadEvidence(insight)} size="sm" type="button" variant="outline">
            <Download />
            Descargar evidencia
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              Comentario obligatorio para resolver o descartar
            </span>
            <textarea
              className="min-h-24 rounded-md border bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => onSetActionMessage(event.target.value)}
              placeholder="Escribe evidencia, motivo o resultado antes de cerrar."
              value={actionMessage}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onUpdateStatus(insight, "Resuelto", actionMessage)}
              size="sm"
              type="button"
            >
              Resolver con comentario
            </Button>
            <Button
              onClick={() => onUpdateStatus(insight, "Descartado", actionMessage)}
              size="sm"
              type="button"
              variant="outline"
            >
              Descartar con comentario
            </Button>
          </div>
        </div>
      </section>
    </aside>
  );
}

function PrioritiesTab({
  assignments,
  filteredInsights,
  onAssign,
  onCreateAction,
  onOpenDetail,
  onOpenEvidence,
  onOpenRelated,
  onReview,
  onRequireComment,
  onSelectCategory,
  onSelectInsightId,
}: {
  assignments: Record<string, string>;
  filteredInsights: InsightModel[];
  onAssign: (insight: InsightModel) => void;
  onCreateAction: (insight: InsightModel) => void;
  onOpenDetail: (insight: InsightModel) => void;
  onOpenEvidence: (insight: InsightModel) => void;
  onOpenRelated: (insight: InsightModel) => void;
  onReview: (insight: InsightModel) => void;
  onRequireComment: (insight: InsightModel, action: "resolver" | "descartar") => void;
  onSelectCategory: (category: string) => void;
  onSelectInsightId: (id: string) => void;
}) {
  const ordered = sortInsightsForToday(filteredInsights).slice(0, 8);

  return (
    <div className="grid gap-4">
      <section className="rounded-md border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          Lo que la direccion necesita saber hoy
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            "Actuar ahora",
            "Revisar esta semana",
            "Monitorear",
            "Esperando datos",
          ].map((label) => (
            <div className="rounded-md border bg-background p-3" key={label}>
              <div className="text-sm font-medium">{label}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {label === "Actuar ahora"
                  ? "Criticos o alta prioridad con impacto."
                  : label === "Esperando datos"
                    ? "Fuente pendiente o conciliacion requerida."
                    : "Seguimiento ejecutivo con responsable."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ImpactUrgencyMatrix
          insights={filteredInsights}
          onSelect={onSelectInsightId}
        />
        <CategoryImpactChart
          insights={filteredInsights}
          onSelectCategory={onSelectCategory}
        />
      </div>

      <InsightList
        assignments={assignments}
        emptyText="No hay insights criticos para los filtros seleccionados."
        insights={ordered}
        onAssign={onAssign}
        onCreateAction={onCreateAction}
        onOpenDetail={onOpenDetail}
        onOpenEvidence={onOpenEvidence}
        onOpenRelated={onOpenRelated}
        onRequireComment={onRequireComment}
        onReview={onReview}
      />
    </div>
  );
}

function OpportunitiesTab({
  assignments,
  filteredInsights,
  onAssign,
  onCreateAction,
  onOpenDetail,
  onOpenEvidence,
  onOpenRelated,
  onReview,
  onRequireComment,
}: {
  assignments: Record<string, string>;
  filteredInsights: InsightModel[];
  onAssign: (insight: InsightModel) => void;
  onCreateAction: (insight: InsightModel) => void;
  onOpenDetail: (insight: InsightModel) => void;
  onOpenEvidence: (insight: InsightModel) => void;
  onOpenRelated: (insight: InsightModel) => void;
  onReview: (insight: InsightModel) => void;
  onRequireComment: (insight: InsightModel, action: "resolver" | "descartar") => void;
}) {
  const opportunities = filteredInsights.filter(
    (insight) => insight.insight_type === "Oportunidad",
  );

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 md:grid-cols-3">
        {opportunities.map((insight) => (
          <article className="rounded-md border bg-emerald-50 p-4 text-emerald-950" key={insight.id}>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              DEMO
            </Badge>
            <h3 className="mt-3 text-base font-semibold">{insight.title}</h3>
            <div className="mt-3 grid gap-2 text-sm leading-6">
              <span>Potencial: {formatCurrency(insight.financial_impact)}</span>
              <span>Recursos: {insight.suggested_owner}</span>
              <span>Esfuerzo: Medio</span>
              <span>Tiempo: {insight.suggested_due_date}</span>
              <span>Riesgo: {insight.recommended_actions[0]?.risk_of_inaction}</span>
            </div>
          </article>
        ))}
      </section>
      <InsightList
        assignments={assignments}
        emptyText="No hay oportunidades para los filtros seleccionados."
        insights={opportunities}
        onAssign={onAssign}
        onCreateAction={onCreateAction}
        onOpenDetail={onOpenDetail}
        onOpenEvidence={onOpenEvidence}
        onOpenRelated={onOpenRelated}
        onRequireComment={onRequireComment}
        onReview={onReview}
      />
    </div>
  );
}

function RisksTab({
  assignments,
  filteredInsights,
  onAssign,
  onCreateAction,
  onOpenDetail,
  onOpenEvidence,
  onOpenRelated,
  onReview,
  onRequireComment,
}: {
  assignments: Record<string, string>;
  filteredInsights: InsightModel[];
  onAssign: (insight: InsightModel) => void;
  onCreateAction: (insight: InsightModel) => void;
  onOpenDetail: (insight: InsightModel) => void;
  onOpenEvidence: (insight: InsightModel) => void;
  onOpenRelated: (insight: InsightModel) => void;
  onReview: (insight: InsightModel) => void;
  onRequireComment: (insight: InsightModel, action: "resolver" | "descartar") => void;
}) {
  const risks = filteredInsights.filter(
    (insight) =>
      insight.insight_type === "Riesgo" ||
      insight.priority === "Critica" ||
      insight.status === "Bloqueado",
  );

  return (
    <div className="grid gap-4">
      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 text-red-600" />
          Umbrales y reglas desde registro de KPIs
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {insightRuleRegistry.map((rule) => {
            const kpi = insightKpiCatalog.find((item) => item.id.includes(rule.kpiCode.toLowerCase()));
            return (
              <article className="rounded-md border bg-background p-3" key={rule.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">{rule.label}</div>
                  <Badge variant="outline">{rule.severity}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {rule.threshold}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Fuente: {kpi?.source ?? rule.source}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <InsightList
        assignments={assignments}
        emptyText="No hay riesgos activos para los filtros seleccionados."
        insights={risks}
        onAssign={onAssign}
        onCreateAction={onCreateAction}
        onOpenDetail={onOpenDetail}
        onOpenEvidence={onOpenEvidence}
        onOpenRelated={onOpenRelated}
        onRequireComment={onRequireComment}
        onReview={onReview}
      />
    </div>
  );
}

function PredictionsTab({
  filteredInsights,
}: {
  filteredInsights: InsightModel[];
}) {
  const predictions = filteredInsights.filter(
    (insight) => insight.insight_type === "Prediccion",
  );

  if (predictions.length === 0) {
    return <EmptyState text="No existen datos suficientes para generar predicciones." />;
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {predictions.map((insight) => (
        <article className="rounded-md border bg-card p-4" key={insight.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge className={priorityClass(insight.priority)}>
              {insight.priority}
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              Proyeccion basada en tendencia DEMO
            </Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{insight.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {insight.summary}
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Resultado proyectado</div>
              <div className="mt-1 font-semibold">
                {insight.evidence[0]?.current_result}
              </div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Horizonte</div>
              <div className="mt-1 font-semibold">
                {insight.period_start} a {insight.period_end}
              </div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Confianza</span>
                <span className="font-semibold">{formatConfidence(insight.confidence)}</span>
              </div>
              <ProgressBar color="bg-blue-600" value={insight.confidence} />
            </div>
            <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
              <span>Escenario favorable: accion ejecutada y recuperacion del 62% del impacto.</span>
              <span>Escenario esperado: cierre con tendencia actual.</span>
              <span>Escenario desfavorable: accion vencida o fuente sin conectar.</span>
              <span>Limitacion: {insight.assumptions.join(" ")}</span>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function ActionsTab({
  actions,
  onStatusChange,
}: {
  actions: InsightAction[];
  onStatusChange: (actionId: string, status: InsightActionStatus) => void;
}) {
  if (actions.length === 0) {
    return <EmptyState text="Todavia no se han creado acciones desde insights." />;
  }

  return (
    <section className="grid gap-4">
      {actions.map((action) => (
        <article className="rounded-md border bg-card p-4" key={action.id}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge className={priorityClass(action.priority)}>
                  {action.priority}
                </Badge>
                <Badge className={statusClass(action.status)}>{action.status}</Badge>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  DEMO
                </Badge>
              </div>
              <h3 className="mt-3 text-lg font-semibold">{action.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {action.description}
              </p>
            </div>
            <div className="rounded-md border bg-background p-3 text-sm">
              <div className="text-xs text-muted-foreground">Responsable</div>
              <div className="mt-1 font-medium">{action.responsible}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Limite: {action.due_date}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">KPI afectado</div>
              <div className="mt-1 text-sm font-medium">{action.affected_kpi}</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Resultado esperado</div>
              <div className="mt-1 text-sm font-medium">{action.expected_result}</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Impacto esperado</div>
              <div className="mt-1 text-sm font-medium">{action.expected_impact}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {actionStatuses.map((status) => (
              <Button
                key={`${action.id}-${status}`}
                onClick={() => onStatusChange(action.id, status)}
                size="sm"
                type="button"
                variant={action.status === status ? "default" : "outline"}
              >
                {status}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function AiResponseCard({
  onConfirmAction,
  onFeedback,
  response,
}: {
  onConfirmAction: (action: InsightAction) => void;
  onFeedback: (value: string) => void;
  response: DemoAiResponse;
}) {
  return (
    <article className="rounded-md border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Modo {response.mode}
        </Badge>
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Dato demo
        </Badge>
        {response.mode === "Simular" ? (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            Simulacion
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Respuesta directa
          </div>
          <p className="mt-1 text-sm leading-6">{response.directAnswer}</p>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Evidencia
          </div>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-muted-foreground">
            {response.evidence.map((item) => (
              <li className="rounded-md border bg-background p-2" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Interpretacion
            </div>
            <p className="mt-1 text-sm leading-6">{response.interpretation}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Accion recomendada
            </div>
            <p className="mt-1 text-sm leading-6">{response.recommendedAction}</p>
          </div>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="font-medium">Posibles causas</div>
          {response.possibleCauses.map((cause) => (
            <div className="rounded-md border bg-background p-2" key={cause.description}>
              <Badge
                className={
                  cause.type === "Causa confirmada"
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                }
              >
                {cause.type}
              </Badge>
              <span className="ml-2 text-muted-foreground">{cause.description}</span>
            </div>
          ))}
        </div>
        <div className="max-w-full overflow-x-auto rounded-md border">
          <table className="min-w-[440px] w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-normal text-muted-foreground">
              <tr>
                {response.table.columns.map((column) => (
                  <th className="px-3 py-2 font-medium" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {response.table.rows.map((row) => (
                <tr className="border-t" key={row.join("-")}>
                  {row.map((cell) => (
                    <td className="px-3 py-2" key={cell}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {response.actionDraft ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
            <div className="font-medium">Borrador de accion preparado</div>
            <p className="mt-1 text-sm leading-6">
              {response.actionDraft.title}. Requiere confirmacion humana antes
              de crearse.
            </p>
            <Button
              className="mt-3"
              onClick={() => response.actionDraft && onConfirmAction(response.actionDraft)}
              size="sm"
              type="button"
            >
              Confirmar creacion del borrador
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => copyText(response.directAnswer)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Copy />
            Copiar respuesta
          </Button>
          <Button onClick={() => onFeedback("util")} size="sm" type="button" variant="outline">
            Respuesta util
          </Button>
          <Button onClick={() => onFeedback("revisar")} size="sm" type="button" variant="outline">
            Necesita revision
          </Button>
        </div>
      </div>
    </article>
  );
}

function AskDataTab({
  actions,
  aiMode,
  chatAudits,
  chatMessages,
  filters,
  onAddAction,
  onAsk,
  onFeedback,
  onModeChange,
  onNewConversation,
  question,
  roleLabel,
  setQuestion,
}: {
  actions: InsightAction[];
  aiMode: AiMode;
  chatAudits: ChatAuditEntry[];
  chatMessages: ChatMessage[];
  filters: InsightFilters;
  onAddAction: (action: InsightAction) => void;
  onAsk: (question: string) => void;
  onFeedback: (value: string) => void;
  onModeChange: (mode: AiMode) => void;
  onNewConversation: () => void;
  question: string;
  roleLabel: string;
  setQuestion: (question: string) => void;
}) {
  const suggestedQuestions = getSuggestedQuestions(filters.businessLine);
  const latestResponse = chatMessages[chatMessages.length - 1]?.response;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAsk(question);
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[280px_1fr_320px]">
      <aside className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <History className="size-4 text-primary" />
          Conversaciones
        </div>
        <Button className="w-full" onClick={onNewConversation} size="sm" type="button" variant="outline">
          Conversacion nueva
        </Button>
        <div className="mt-4 grid gap-2">
          {chatAudits.slice(-5).map((audit) => (
            <button
              className="rounded-md border bg-background p-3 text-left text-xs leading-5 hover:bg-muted/60"
              key={audit.id}
              onClick={() => setQuestion(audit.question)}
              type="button"
            >
              <span className="font-medium">{audit.mode}</span>
              <span className="block text-muted-foreground">{audit.question}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-md border bg-muted/40 p-3">
          <div className="text-xs font-medium">Filtros activos</div>
          <div className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
            {describeFilters(filters).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <div className="text-xs font-medium">Preguntas sugeridas</div>
          {suggestedQuestions.map((item) => (
            <Button
              className="justify-start whitespace-normal text-left"
              key={item}
              onClick={() => onAsk(item)}
              size="sm"
              type="button"
              variant="outline"
            >
              {item}
            </Button>
          ))}
        </div>
      </aside>

      <main className="rounded-md border bg-card p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4 text-primary" />
              AnaliA
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Consulta la informacion validada de Analiza BI Hub, pide
              analisis, simula escenarios y prepara acciones trazables.
            </p>
          </div>
          <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
            Solo dentro de Insights
          </Badge>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {aiModes.map((mode) => (
            <Button
              key={mode}
              onClick={() => onModeChange(mode)}
              size="sm"
              type="button"
              variant={aiMode === mode ? "default" : "outline"}
            >
              {mode}
            </Button>
          ))}
        </div>
        <form className="mb-4 flex flex-col gap-2 md:flex-row" onSubmit={submit}>
          <Input
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Pregunta sobre riesgos, cambios, causas, impacto o acciones..."
            value={question}
          />
          <Button type="submit">
            <Send />
            Preguntar
          </Button>
        </form>
        <div className="grid gap-4">
          {chatMessages.length === 0 ? (
            <EmptyState text="Haz una pregunta o elige una sugerencia. El motor usara automaticamente los filtros activos." />
          ) : (
            chatMessages.map((message) => (
              <div className="grid gap-3" key={message.id}>
                <div className="rounded-md border bg-background p-3 text-sm">
                  <span className="font-medium">Pregunta: </span>
                  {message.question}
                </div>
                <AiResponseCard
                  onConfirmAction={onAddAction}
                  onFeedback={onFeedback}
                  response={message.response}
                />
              </div>
            ))
          )}
        </div>
      </main>

      <aside className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-primary" />
          Evidencia y permisos
        </div>
        <div className="grid gap-3 text-sm">
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Rol activo</div>
            <div className="mt-1 font-medium">{roleLabel}</div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Fuentes consultadas</div>
            <div className="mt-1 grid gap-1 text-xs leading-5">
              {(latestResponse?.sources ?? ["Sin consulta todavia"]).map((source) => (
                <span key={source}>{source}</span>
              ))}
            </div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Confianza</div>
            <div className="mt-1 text-lg font-semibold">
              {latestResponse ? formatConfidence(latestResponse.confidence) : "Pendiente"}
            </div>
            <ProgressBar value={latestResponse?.confidence ?? 0} />
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Acciones en contexto</div>
            <div className="mt-1 font-medium">{actions.length}</div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">Herramientas internas</div>
            <div className="mt-2 grid gap-1 text-xs leading-5">
              {internalInsightTools.slice(0, 6).map((tool) => (
                <span key={tool.id}>
                  {tool.id}: {tool.status}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-md border bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            La base de datos calcula; la IA interpreta. No modifica datos ni
            crea acciones sensibles sin confirmacion.
          </div>
        </div>
      </aside>
    </section>
  );
}

function FollowUpTab({ actions }: { actions: InsightAction[] }) {
  if (actions.length === 0) {
    return <EmptyState text="Todavia no se han creado acciones desde insights." />;
  }

  return (
    <section className="grid gap-4">
      {actions.map((action) => (
        <article className="rounded-md border bg-card p-4" key={action.id}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge className={statusClass(action.status)}>{action.status}</Badge>
              <h3 className="mt-3 text-lg font-semibold">{action.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {action.description}
              </p>
            </div>
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              {action.impact_status}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Antes</div>
              <div className="mt-1 text-sm font-medium">Base DEMO</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Meta</div>
              <div className="mt-1 text-sm font-medium">{action.expected_result}</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Esperado</div>
              <div className="mt-1 text-sm font-medium">{action.expected_impact}</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Posterior</div>
              <div className="mt-1 text-sm font-medium">{action.actual_result}</div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs text-muted-foreground">Impacto</div>
              <div className="mt-1 text-sm font-medium">
                {formatCurrency(action.financial_impact)}
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-3">
            <span>Pacientes recuperados: {action.patients_recovered}</span>
            <span>Capacidad recuperada: {action.capacity_recovered}</span>
            <span>Nivel de cumplimiento: {action.impact_status}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

function HistoryTab({
  audits,
  insights,
}: {
  audits: ChatAuditEntry[];
  insights: InsightModel[];
}) {
  return (
    <section className="grid gap-4">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <History className="size-4 text-primary" />
          Historial de insights
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="text-xs uppercase tracking-normal text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-3 font-medium">Fecha</th>
                <th className="px-3 py-3 font-medium">Insight</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Responsable</th>
                <th className="px-3 py-3 text-right font-medium">Impacto esperado</th>
                <th className="px-3 py-3 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((insight) => (
                <tr className="border-b last:border-0" key={insight.id}>
                  <td className="py-3 pr-3">{insight.detected_at.slice(0, 10)}</td>
                  <td className="px-3 py-3">{insight.title}</td>
                  <td className="px-3 py-3">
                    <Badge className={statusClass(insight.status)}>
                      {insight.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{insight.suggested_owner}</td>
                  <td className="px-3 py-3 text-right">
                    {formatCurrency(insight.financial_impact)}
                  </td>
                  <td className="px-3 py-3">
                    {insight.resolution_result ?? "Pendiente"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <MessageSquareText className="size-4 text-primary" />
          Auditoria de preguntas
        </div>
        {audits.length === 0 ? (
          <EmptyState text="Todavia no hay preguntas registradas en esta sesion." />
        ) : (
          <div className="grid gap-3">
            {audits.map((audit) => (
              <article className="rounded-md border bg-background p-3" key={audit.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">{audit.question}</div>
                  <Badge variant="outline">{audit.mode}</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-muted-foreground">
                  <span>Fecha: {audit.timestamp}</span>
                  <span>Confianza: {formatConfidence(audit.confidence)}</span>
                  <span>Funciones: {audit.functions.join(", ")}</span>
                  <span>Fuentes: {audit.sources.join(", ")}</span>
                  <span>Filtros: {audit.filters.join(" / ")}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function InsightsIntelligenceDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const [roleKey, setRoleKey] = useState<RoleKey>("webmaster_admin");
  const [filters, setFilters] = useState<InsightFilters>(getDefaultInsightFilters);
  const [activeTab, setActiveTab] = useState<InsightsTab>("Alertas tempranas");
  const [insights, setInsights] = useState<InsightModel[]>(demoInsights);
  const [actions, setActions] = useState<InsightAction[]>(demoInsightActions);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(
    demoInsights[0]?.id ?? null,
  );
  const [resolutionComment, setResolutionComment] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [question, setQuestion] = useState("");
  const [aiMode, setAiMode] = useState<AiMode>("Consultar");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatAudits, setChatAudits] = useState<ChatAuditEntry[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [agentScanCount, setAgentScanCount] = useState(1);
  const [agentLastScan, setAgentLastScan] = useState("2026-07-23 08:20");

  useEffect(() => {
    function refreshContext() {
      const nextContext = readStoredContext();
      setContext(nextContext);
      setRoleKey(readActiveRole());

      if (nextContext) {
        setFilters((current) => ({
          ...current,
          branch:
            nextContext.branchName && !/^Todas/i.test(nextContext.branchName)
              ? nextContext.branchName
              : allInsightOption,
          businessLine: getBusinessLineLabel(nextContext),
          company: nextContext.companyId ?? current.company,
          country: nextContext.countryId ?? current.country,
          manager: nextContext.managerId ?? current.manager,
        }));
      }
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);
    window.addEventListener(roleChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
      window.removeEventListener(roleChangeEvent, refreshContext);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextScan = new Date();

      setAgentScanCount((current) => current + 1);
      setAgentLastScan(
        `${nextScan.toLocaleDateString("en-CA")} ${nextScan
          .toLocaleTimeString("en-US", {
            hour: "2-digit",
            hour12: false,
            minute: "2-digit",
          })
          .replace("24:", "00:")}`,
      );
    }, 45000);

    return () => window.clearInterval(interval);
  }, []);

  const roleProfile = demoRoleProfiles[roleKey];
  const filteredInsights = useMemo(
    () => filterInsights(insights, filters),
    [filters, insights],
  );
  const filteredInsightIds = useMemo(
    () => new Set(filteredInsights.map((insight) => insight.id)),
    [filteredInsights],
  );
  const filteredActions = useMemo(
    () =>
      actions.filter(
        (action) =>
          filteredInsightIds.has(action.origin_insight_id) ||
          filters.responsible === allInsightOption ||
          action.responsible === filters.responsible,
      ),
    [actions, filteredInsightIds, filters.responsible],
  );
  const executiveCards = useMemo(
    () => buildExecutiveCards(filteredInsights, filteredActions),
    [filteredActions, filteredInsights],
  );
  const filteredWarnings = useMemo(() => filterEarlyWarnings(filters), [filters]);
  const filteredModels = useMemo(() => filterAnaliaModels(filters), [filters]);
  const selectedInsight =
    filteredInsights.find((insight) => insight.id === selectedInsightId) ??
    filteredInsights[0] ??
    insights.find((insight) => insight.id === selectedInsightId) ??
    null;

  const businessLineLabel = getBusinessLineLabel(context);

  if (businessLineLabel === "Laboratorio") {
    return <LaboratoryVerticalDashboard mode="insights" />;
  }

  if (businessLineLabel === "Imagenes") {
    return <ImagingVerticalDashboard mode="insights" />;
  }

  if (
    businessLineLabel === "Fisioterapia" ||
    (businessLineLabel === "Consolidado" &&
      physiotherapyScopedInsightRoles.has(roleKey))
  ) {
    return <PhysiotherapyVerticalDashboard mode="insights" />;
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 5000);
  }

  function updateInsightStatus(
    insight: InsightModel,
    status: InsightStatus,
    comment: string,
  ) {
    if ((status === "Resuelto" || status === "Descartado") && comment.trim().length < 5) {
      showNotice("No se puede resolver o descartar sin comentario.");
      setSelectedInsightId(insight.id);
      return;
    }

    setInsights((currentInsights) =>
      currentInsights.map((currentInsight) =>
        currentInsight.id === insight.id
          ? {
              ...currentInsight,
              resolution_result:
                status === "Resuelto" || status === "Descartado"
                  ? comment
                  : currentInsight.resolution_result,
              resolved_at:
                status === "Resuelto" || status === "Descartado"
                  ? `${currentDate}T12:00:00-06:00`
                  : currentInsight.resolved_at,
              status,
              updated_at: `${currentDate}T12:00:00-06:00`,
            }
          : currentInsight,
      ),
    );
    setResolutionComment("");
    showNotice(`Insight actualizado a ${status}.`);
  }

  function createDraftAction(insight: InsightModel) {
    const draft = createActionDraftFromInsight(insight, actions.length + 1);
    setActions((currentActions) => [draft, ...currentActions]);
    setInsights((currentInsights) =>
      currentInsights.map((currentInsight) =>
        currentInsight.id === insight.id
          ? {
              ...currentInsight,
              related_action_ids: [
                draft.id,
                ...currentInsight.related_action_ids,
              ],
              status: "Accion creada",
            }
          : currentInsight,
      ),
    );
    setActiveTab("Acciones recomendadas");
    showNotice("Borrador de accion creado. Requiere confirmacion humana para ejecutarse.");
  }

  function handleAssign(insight: InsightModel) {
    setAssignments((currentAssignments) => ({
      ...currentAssignments,
      [insight.id]: insight.suggested_owner,
    }));
    setSelectedInsightId(insight.id);
    showNotice(`Responsable sugerido asignado: ${insight.suggested_owner}.`);
  }

  function openRelated(insight: InsightModel) {
    window.location.href = withFilters(insight.related_dashboard_link, filters);
  }

  function openWarningRoute(path: string) {
    window.location.href = withFilters(path, filters);
  }

  function ask(questionText: string) {
    const trimmedQuestion = questionText.trim();

    if (!trimmedQuestion) {
      showNotice("Escribe una pregunta para consultar los datos.");
      return;
    }

    const response = createDemoAiResponse({
      filters,
      mode: aiMode,
      question: trimmedQuestion,
      roleLabel: roleProfile.label,
      scopedInsights: filteredInsights.length > 0 ? filteredInsights : insights,
    });
    const id = `chat-${Date.now()}`;

    setChatMessages((current) => [
      ...current,
      {
        id,
        question: trimmedQuestion,
        response,
      },
    ]);
    setChatAudits((current) => [
      ...current,
      {
        confidence: response.confidence,
        filters: response.filtersUsed,
        functions:
          aiMode === "Simular"
            ? ["simulate_scenario", "get_kpi"]
            : aiMode === "Actuar"
              ? ["list_active_insights", "create_action_draft"]
              : ["list_active_insights", "get_kpi", "compare_periods"],
        id,
        mode: aiMode,
        question: trimmedQuestion,
        sources: response.sources,
        timestamp: `${currentDate} 12:00`,
      },
    ]);
    setQuestion("");
  }

  function addConfirmedAction(action: InsightAction) {
    const exists = actions.some((currentAction) => currentAction.id === action.id);

    if (!exists) {
      setActions((currentActions) => [action, ...currentActions]);
    }

    setActiveTab("Acciones recomendadas");
    showNotice("Borrador de accion confirmado en DEMO.");
  }

  function createActionFromWarning(warning: EarlyWarningIndicator) {
    const action: InsightAction = {
      actual_result: "Pendiente",
      affected_kpi: warning.indicator,
      blockers:
        warning.dataQuality === "Pendiente de conexion de datos"
          ? ["Fuente pendiente de conexion de datos"]
          : [],
      capacity_recovered: "No medible todavia",
      close_date: null,
      comments: [
        `Accion creada por AnaliA desde alerta temprana DEMO el ${currentDate}.`,
      ],
      demo_flag: true,
      description: warning.action,
      due_date: currentDate,
      evidence_required:
        "Evidencia del KPI antes y despues, fuente, periodo y responsable.",
      expected_impact: `Reducir riesgo ${warning.riskScore}/100 en ${warning.horizon}.`,
      expected_result: `Alcanzar ${warning.target}`,
      financial_impact:
        warning.businessLine === "Consolidado"
          ? 12900
          : warning.businessLine === "Laboratorio"
            ? 6400
            : warning.businessLine === "Fisioterapia"
              ? 2880
              : 0,
      id: `act-warning-${warning.id}-${Date.now()}`,
      impact_status: "No medible todavia",
      operational_impact: warning.driver,
      origin_insight_id: warning.linkedInsightId,
      patients_recovered:
        warning.businessLine === "Fisioterapia"
          ? 64
          : warning.businessLine === "Laboratorio"
            ? 129
            : 0,
      priority: warning.severity,
      responsible: warning.owner,
      start_date: currentDate,
      status: "Borrador",
      team: warning.businessLine,
      title: `Alerta temprana: ${warning.indicator}`,
    };

    setActions((currentActions) => [action, ...currentActions]);
    setInsights((currentInsights) =>
      currentInsights.map((insight) =>
        insight.id === warning.linkedInsightId
          ? {
              ...insight,
              related_action_ids: [action.id, ...insight.related_action_ids],
              status: "Accion creada",
            }
          : insight,
      ),
    );
    setActiveTab("Acciones recomendadas");
    showNotice("AnaliA creo un borrador de accion desde la alerta temprana DEMO.");
  }

  function updateActionStatus(actionId: string, status: InsightActionStatus) {
    setActions((currentActions) =>
      currentActions.map((action) =>
        action.id === actionId
          ? {
              ...action,
              comments: [
                `Estado cambiado a ${status} el ${currentDate}.`,
                ...action.comments,
              ],
              status,
            }
          : action,
      ),
    );
    showNotice(`Accion actualizada a ${status}.`);
  }

  function handleExecutiveCard(filter: Partial<InsightFilters>, cardId: string) {
    setFilters((current) => ({ ...current, ...filter }));

    if (cardId === "opportunities") {
      setActiveTab("Oportunidades");
    } else if (cardId === "risks") {
      setActiveTab("Riesgos y alertas");
    } else if (cardId === "overdue-actions") {
      setActiveTab("Acciones recomendadas");
    } else if (cardId === "resolved") {
      setActiveTab("Historial");
    } else if (cardId === "predictions") {
      setActiveTab("Predicciones");
    } else {
      setActiveTab("Alertas tempranas");
    }
  }

  const commonListProps = {
    assignments,
    onAssign: handleAssign,
    onCreateAction: createDraftAction,
    onOpenDetail: (insight: InsightModel) => {
      setSelectedInsightId(insight.id);
      setNotice(null);
    },
    onOpenEvidence: (insight: InsightModel) => {
      setSelectedInsightId(insight.id);
      showNotice("Detalle abierto en la seccion de evidencia.");
    },
    onOpenRelated: openRelated,
    onRequireComment: (insight: InsightModel, action: "resolver" | "descartar") => {
      setSelectedInsightId(insight.id);
      showNotice(
        action === "resolver"
          ? "Agrega un comentario en el detalle antes de resolver."
          : "Agrega un comentario en el detalle antes de descartar.",
      );
    },
    onReview: (insight: InsightModel) => updateInsightStatus(insight, "Validado", "Revision demo"),
  };

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="executive-panel grid gap-4 rounded-lg border p-5 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
            Entorno DEMO
          </Badge>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border bg-card shadow-sm">
              <BrainCircuit className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Insights, alertas tempranas y AnaliA
              </h1>
              <p className="text-sm text-muted-foreground">
                Agente de ciencia de datos para identificar riesgos,
                oportunidades, anomalias, predicciones y acciones prioritarias.
              </p>
            </div>
          </div>
        </div>
        <aside className="rounded-lg border bg-background/80 p-4 text-sm shadow-inner">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-primary" />
            Contexto activo de AnaliA
          </div>
          <div className="grid gap-1 text-muted-foreground">
            <span>{context?.countryName ?? "Vista regional"}</span>
            <span>{context?.businessLineName ?? "Consolidado"}</span>
            <span>{context?.branchName ?? "Todas las sucursales"}</span>
            <span>{context?.period ?? "Periodo global"}</span>
            <span>Rol: {roleProfile.label}</span>
          </div>
        </aside>
      </div>

      {notice ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {notice}
        </div>
      ) : null}

      <InsightFiltersPanel
        filters={filters}
        insights={insights}
        onChange={setFilters}
      />

      <DataScienceAgentCockpit />

      <AnaliaAgentStatusPanel
        lastScanLabel={agentLastScan}
        models={filteredModels}
        scanCount={agentScanCount}
      />

      <ExecutiveCards cards={executiveCards} onApplyFilter={handleExecutiveCard} />

      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "Alertas tempranas" ? (
        <EarlyWarningsTab
          models={filteredModels}
          onCreateAction={createActionFromWarning}
          onOpenInsight={(insightId) => {
            setSelectedInsightId(insightId);
            setNotice(null);
          }}
          onOpenRoute={openWarningRoute}
          onSelectLine={(businessLine) =>
            setFilters((current) => ({ ...current, businessLine }))
          }
          warnings={filteredWarnings}
        />
      ) : null}

      {activeTab === "Prioridades de hoy" ? (
        <PrioritiesTab
          filteredInsights={filteredInsights}
          onSelectCategory={(category) =>
            setFilters((current) => ({ ...current, category }))
          }
          onSelectInsightId={(id) => setSelectedInsightId(id)}
          {...commonListProps}
        />
      ) : null}

      {activeTab === "Oportunidades" ? (
        <OpportunitiesTab filteredInsights={filteredInsights} {...commonListProps} />
      ) : null}

      {activeTab === "Riesgos y alertas" ? (
        <RisksTab filteredInsights={filteredInsights} {...commonListProps} />
      ) : null}

      {activeTab === "Predicciones" ? (
        <PredictionsTab filteredInsights={filteredInsights} />
      ) : null}

      {activeTab === "Acciones recomendadas" ? (
        <ActionsTab actions={filteredActions} onStatusChange={updateActionStatus} />
      ) : null}

      {activeTab === "Preguntar a los datos" ? (
        <AskDataTab
          actions={filteredActions}
          aiMode={aiMode}
          chatAudits={chatAudits}
          chatMessages={chatMessages}
          filters={filters}
          onAddAction={addConfirmedAction}
          onAsk={ask}
          onFeedback={(value) => {
            setFeedback(value);
            showNotice(
              value === "util"
                ? "Gracias. Respuesta calificada como util."
                : "Feedback registrado para revision.",
            );
          }}
          onModeChange={setAiMode}
          onNewConversation={() => {
            setChatMessages([]);
            setQuestion("");
            showNotice("Conversacion nueva iniciada.");
          }}
          question={question}
          roleLabel={roleProfile.label}
          setQuestion={setQuestion}
        />
      ) : null}

      {activeTab === "Seguimiento" ? (
        <FollowUpTab actions={filteredActions} />
      ) : null}

      {activeTab === "Historial" ? (
        <HistoryTab audits={chatAudits} insights={filteredInsights} />
      ) : null}

      {activeTab !== "Preguntar a los datos" ? (
        <>
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <TrendChart actions={filteredActions} insights={filteredInsights} />
            <BranchRanking
              actions={filteredActions}
              insights={filteredInsights}
              onSelectBranch={(branch) =>
                setFilters((current) => ({ ...current, branch }))
              }
            />
          </div>

          <FunnelAndWaterfall
            actions={filteredActions}
            insights={filteredInsights}
          />
        </>
      ) : null}

      {selectedInsight ? (
        <InsightDetailPanel
          actionMessage={resolutionComment}
          filters={filters}
          insight={selectedInsight}
          onClose={() => setSelectedInsightId(null)}
          onCreateAction={createDraftAction}
          onOpenRelated={openRelated}
          onSetActionMessage={setResolutionComment}
          onUpdateStatus={updateInsightStatus}
        />
      ) : null}

      <section className="rounded-md border bg-muted p-4 text-sm leading-6 text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Regla de seguridad y arquitectura
        </div>
        <p>
          Insights prioriza hallazgos y AnaliA convierte senales en acciones
          trazables. No duplica dashboards completos, no muestra asistente fuera
          de esta pantalla, no usa DEMO como dato real, no ejecuta acciones
          sensibles sin confirmacion y mantiene causas probables separadas de
          causas confirmadas.
        </p>
        {feedback ? (
          <p className="mt-2 text-xs">Ultimo feedback IA: {feedback}</p>
        ) : null}
      </section>
    </section>
  );
}
