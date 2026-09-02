import {
  elSalvadorBranchResultTemplates,
  type ElSalvadorBranchResultTemplate,
} from "./el-salvador-result-templates.ts";
import { safeDivide, type BusinessLineCode } from "./kpi-registry.ts";
import {
  createOutlierFlag,
  median,
  scoreRate,
  scoreTargetFulfillment,
  weightedScore,
  type AnalyticsOutlierFlag,
} from "./analytics-intelligence.ts";
import {
  allBranchesValue,
  allChannelsValue,
  allManagersValue,
  allOperationalAreasValue,
  allPayersValue,
  allProfessionalsValue,
  allServicesValue,
  isAllFilterValue,
  normalizeFilterText,
  resolveGlobalFilterContext,
  type GlobalFilterContext,
  type GlobalFilterInput,
} from "./global-filters.ts";

export type SemanticBusinessLineKey = "fisioterapia" | "laboratorio" | "imagenes";
export type SemanticStatus = "verde" | "amarillo" | "rojo";
export type QualityLevel = "Confiable" | "Revisar" | "Insuficiente";

export type DataQualityRuleResult = {
  dimension:
    | "completeness"
    | "validity"
    | "consistency"
    | "uniqueness"
    | "timeliness";
  label: string;
  passed: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
};

export type FinancialInvariant = {
  id: string;
  label: string;
  passed: boolean;
  message: string;
};

export type AmountBreakdown = {
  label: string;
  amount: number;
};

export type SemanticFinance = {
  grossBilling: number;
  discounts: number;
  creditNotes: number;
  netBilling: number;
  collections: number;
  accountsReceivable: number;
  averageTicket: number | null;
  directCost: number;
  contributionMargin: number;
  contributionMarginRate: number | null;
  target: number;
  targetFulfillment: number | null;
  periodPrevious: number;
  periodVariance: number | null;
  priorYear: number;
  yoyVariance: number | null;
  currencyCode: "USD";
  channelRevenue: AmountBreakdown[];
  paymentCollections: AmountBreakdown[];
  invariants: FinancialInvariant[];
};

export type SemanticCapacity = {
  unitLabel: string;
  scheduled: number | null;
  effective: number | null;
  finalizationRate: number | null;
  noShowRate: number | null;
  cancellationRate: number | null;
  conversionGapPoints: number | null;
  availableUnits: number | null;
  scheduledUnits: number | null;
  effectiveUnits: number | null;
  lostUnits: number | null;
  pendingMessage?: string;
};

export type SemanticOperations = {
  scheduledAppointments: number;
  completedAppointments: number;
  noShows: number;
  cancelledAppointments: number;
  rescheduledAppointments: number;
  serviceVolume: number;
  patientCount: number;
};

export type SemanticLine = {
  key: SemanticBusinessLineKey;
  businessLineCode: Exclude<BusinessLineCode, "CONSOLIDATED">;
  companyId: string;
  companyName: string;
  shortName: string;
  countryId: string;
  countryName: string;
  branchId: string;
  branchName: string;
  managerName: string;
  scopeName: string;
  periodStart: string;
  periodEnd: string;
  sourceNote: string;
  sourceVersion: string;
  sourceTemplates?: ElSalvadorBranchResultTemplate[];
  qualityScore: number;
  qualityLevel: QualityLevel;
  qualityRules: DataQualityRuleResult[];
  qualityIssues: string[];
  finance: SemanticFinance;
  capacity: SemanticCapacity;
  operations: SemanticOperations;
  monthlyRevenue: { label: string; value: number }[];
  occupancyByBranch: { label: string; value: number }[];
};

export type ExecutiveBranchRow = {
  branch: string;
  company: string;
  manager: string;
  qualityLevel: QualityLevel;
  qualityScore: number;
  revenue: number | null;
  targetFulfillment: number | null;
  contributionMarginRate: number | null;
  effectiveOccupancy: number | null;
  alert: string;
  normalizedPerformanceScore?: number;
  comparisonBasis?: string;
  outlierFlags?: AnalyticsOutlierFlag[];
};

export type ExecutiveManagerRow = {
  manager: string;
  scope: string;
  branches: number;
  qualityLevel: QualityLevel;
  qualityScore: number;
  targetFulfillment: number | null;
  contributionMarginRate: number | null;
  effectiveOccupancy: number | null;
  action: string;
  normalizedPerformanceScore?: number;
  comparisonBasis?: string;
  outlierFlags?: AnalyticsOutlierFlag[];
};

export type ExecutiveSemanticKpi = {
  label: string;
  value: string;
  status: "available" | "pending" | "blocked";
  note: string;
};

export type ExecutiveSemanticInsight = {
  title: string;
  priority: "alta" | "media" | "baja";
  affectedIndicator: string;
  recommendation: string;
};

export type ExecutiveBiSnapshot = {
  context: GlobalFilterContext;
  lines: SemanticLine[];
  branchRows: ExecutiveBranchRow[];
  managerRows: ExecutiveManagerRow[];
  kpis: ExecutiveSemanticKpi[];
  insights: ExecutiveSemanticInsight[];
  noDataReason: string | null;
};

export type SemanticKpiContract = {
  id: string;
  version: string;
  name: string;
  executiveDefinition: string;
  formula: string;
  numerator: string;
  denominator: string;
  grain: string;
  unit: string;
  currencyCode: "USD" | null;
  source: string;
  supportedDimensions: string[];
  supportedFilters: string[];
  comparisonPeriod: string;
  exclusionRules: string[];
  target: string;
  missingDataBehavior: string;
};

const countryElSalvadorId = "30000000-0000-4000-8000-000000000003";
const companyPhysioId = "40000000-0000-4000-8000-000000000001";
const companyLabId = "40000000-0000-4000-8000-000000000002";
const companyImagingId = "40000000-0000-4000-8000-000000000003";

const pendingMessage = "Pendiente de cargar informacion";
const notCalculableMessage = "No calculable con los datos disponibles";
const noDataMessage = "Sin datos disponibles para este filtro";
const insufficientExecutiveDataMessage = "Datos insuficientes para conclusion ejecutiva";

const semanticSupportedDimensions = [
  "country",
  "company",
  "business_line",
  "operational_area",
  "branch",
  "manager",
  "period",
  "source",
] as const;

const semanticSupportedFilters = [
  "country",
  "company",
  "business_line",
  "branch",
  "operational_area",
  "manager",
  "professional",
  "service",
  "payer",
  "channel",
  "date_from",
  "date_to",
] as const;

export const semanticKpiContracts = [
  {
    comparisonPeriod: "Periodo anterior equivalente y mismo rango año anterior.",
    currencyCode: "USD",
    denominator: "No aplica.",
    executiveDefinition: "Facturacion neta validada para el contexto filtrado.",
    exclusionRules: [
      "Excluir registros sin moneda.",
      "Excluir registros fuera del rango seleccionado.",
      "Bloquear cuando fuente o periodo no esten validados.",
    ],
    formula: "facturacion_bruta - descuentos - notas_credito",
    grain: "dia-sucursal-linea",
    id: "finance.net_billing",
    missingDataBehavior: pendingMessage,
    name: "Facturacion neta",
    numerator: "Facturacion bruta menos descuentos y notas de credito.",
    source: "DEMO semantic-bi; Sprint 3 debe reemplazar por import/conector con lineage.",
    supportedDimensions: [...semanticSupportedDimensions],
    supportedFilters: [...semanticSupportedFilters],
    target: "Meta aprobada de ingresos del periodo.",
    unit: "money",
    version: "2026-08-sprint2",
  },
  {
    comparisonPeriod: "Mismo periodo seleccionado.",
    currencyCode: "USD",
    denominator: "Facturacion neta.",
    executiveDefinition: "Monto facturado pendiente de cobro.",
    exclusionRules: [
      "Bloquear si cobros no reconcilian con formas de pago.",
      "Bloquear si facturacion neta es negativa sin nota explicativa.",
    ],
    formula: "facturacion_neta - cobros",
    grain: "dia-sucursal-linea",
    id: "finance.accounts_receivable",
    missingDataBehavior: pendingMessage,
    name: "Cuentas por cobrar",
    numerator: "Facturacion neta menos cobros conciliados.",
    source: "DEMO semantic-bi; Sprint 3 debe reemplazar por import/conector con lineage.",
    supportedDimensions: [...semanticSupportedDimensions],
    supportedFilters: [...semanticSupportedFilters],
    target: "Politica de cobranza aprobada por linea/periodo.",
    unit: "money",
    version: "2026-08-sprint2",
  },
  {
    comparisonPeriod: "Periodo anterior equivalente y mismo rango año anterior.",
    currencyCode: "USD",
    denominator: "Facturacion neta.",
    executiveDefinition: "Margen disponible despues de costos directos; no es utilidad neta.",
    exclusionRules: [
      "Bloquear si faltan costos directos.",
      "No llamar utilidad neta, EBITDA ni margen operativo.",
    ],
    formula: "facturacion_neta - costo_directo",
    grain: "mes-sucursal-linea",
    id: "finance.contribution_margin",
    missingDataBehavior: notCalculableMessage,
    name: "Margen de contribucion",
    numerator: "Facturacion neta menos costo directo.",
    source: "DEMO semantic-bi; Sprint 3 debe reemplazar por import/conector con lineage.",
    supportedDimensions: [...semanticSupportedDimensions],
    supportedFilters: [...semanticSupportedFilters],
    target: "Meta aprobada de margen de contribucion.",
    unit: "money_and_percent",
    version: "2026-08-sprint2",
  },
  {
    comparisonPeriod: "Periodo anterior equivalente y mismo rango año anterior.",
    currencyCode: null,
    denominator: "Meta aprobada del periodo.",
    executiveDefinition: "Avance contra meta aprobada para el contexto filtrado.",
    exclusionRules: [
      "Bloquear si la meta no esta aprobada.",
      "Bloquear si la meta no corresponde al mismo periodo.",
    ],
    formula: "resultado_actual / meta_aprobada",
    grain: "mes-sucursal-linea",
    id: "target.fulfillment",
    missingDataBehavior: notCalculableMessage,
    name: "Cumplimiento de meta",
    numerator: "Resultado actual del KPI objetivo.",
    source: "DEMO semantic-bi; Sprint 3 debe reemplazar por metas aprobadas.",
    supportedDimensions: [...semanticSupportedDimensions],
    supportedFilters: [...semanticSupportedFilters],
    target: "100% de cumplimiento.",
    unit: "percent",
    version: "2026-08-sprint2",
  },
  {
    comparisonPeriod: "No comparar contra citas futuras.",
    currencyCode: null,
    denominator: "Minutos u horas disponibles planificadas.",
    executiveDefinition: "Capacidad clinica reservada en agenda de fisioterapia.",
    exclusionRules: [
      "Excluir citas futuras.",
      "Excluir capacidad no aprobada o cero.",
    ],
    formula: "minutos_agendados / minutos_disponibles",
    grain: "dia-sucursal-profesional",
    id: "capacity.scheduled_occupancy",
    missingDataBehavior: notCalculableMessage,
    name: "Ocupacion agendada",
    numerator: "Minutos u horas agendadas aplicables.",
    source: "DEMO semantic-bi; Sprint 3 debe reemplazar por agenda operacional.",
    supportedDimensions: [...semanticSupportedDimensions],
    supportedFilters: [...semanticSupportedFilters],
    target: "Meta operativa aprobada por linea/sucursal.",
    unit: "percent",
    version: "2026-08-sprint2",
  },
  {
    comparisonPeriod: "No comparar contra citas futuras.",
    currencyCode: null,
    denominator: "Minutos u horas disponibles planificadas.",
    executiveDefinition: "Capacidad clinica convertida en atencion real de fisioterapia.",
    exclusionRules: [
      "Excluir citas futuras.",
      "Bloquear si servicios completados y capacidad no tienen mismo periodo.",
    ],
    formula: "minutos_completados / minutos_disponibles",
    grain: "dia-sucursal-profesional",
    id: "capacity.effective_occupancy",
    missingDataBehavior: notCalculableMessage,
    name: "Ocupacion efectiva",
    numerator: "Minutos u horas completadas aplicables.",
    source: "DEMO semantic-bi; Sprint 3 debe reemplazar por agenda operacional.",
    supportedDimensions: [...semanticSupportedDimensions],
    supportedFilters: [...semanticSupportedFilters],
    target: "Meta operativa aprobada por linea/sucursal.",
    unit: "percent",
    version: "2026-08-sprint2",
  },
  {
    comparisonPeriod: "Periodo anterior equivalente.",
    currencyCode: null,
    denominator: "Capacidad tecnica disponible.",
    executiveDefinition: "Uso tecnico de analizadores, estaciones o flujo de procesamiento de laboratorio.",
    exclusionRules: [
      "No reutilizar ocupacion clinica.",
      "Bloquear si falta capacidad tecnica.",
    ],
    formula: "pruebas_procesadas / capacidad_tecnica",
    grain: "dia-sucursal-equipo",
    id: "capacity.lab_technical_utilization",
    missingDataBehavior: notCalculableMessage,
    name: "Utilizacion tecnica laboratorio",
    numerator: "Pruebas u ordenes procesadas.",
    source: "DEMO semantic-bi; Sprint 3 debe reemplazar por LIS/equipos/importacion.",
    supportedDimensions: [...semanticSupportedDimensions],
    supportedFilters: [...semanticSupportedFilters],
    target: "Meta tecnica aprobada por laboratorio.",
    unit: "percent",
    version: "2026-08-sprint2",
  },
  {
    comparisonPeriod: "Cada import, fuente y periodo.",
    currencyCode: null,
    denominator: "Reglas de calidad aplicables.",
    executiveDefinition: "Confianza minima para presentar KPIs e insights ejecutivos.",
    exclusionRules: [
      "Bloquear conclusiones con nivel Insuficiente.",
      "Bloquear conclusiones con datos pendientes de conciliacion.",
    ],
    formula: "ponderacion(completitud, validez, consistencia, unicidad, oportunidad)",
    grain: "fuente-periodo-sucursal",
    id: "quality.score",
    missingDataBehavior: insufficientExecutiveDataMessage,
    name: "Calidad de datos",
    numerator: "Reglas aprobadas ponderadas.",
    source: "DEMO de inteligencia; pendiente conectar resultados validados.",
    supportedDimensions: [...semanticSupportedDimensions],
    supportedFilters: [...semanticSupportedFilters],
    target: "Confiable >= 85, Revisar >= 70, Insuficiente < 70.",
    unit: "score",
    version: "2026-08-sprint2",
  },
] satisfies SemanticKpiContract[];

function qualityLevelFromScore(score: number): QualityLevel {
  if (score >= 85) {
    return "Confiable";
  }

  if (score >= 70) {
    return "Revisar";
  }

  return "Insuficiente";
}

function statusFromLine(line: SemanticLine): SemanticStatus {
  const target = line.finance.targetFulfillment ?? 0;
  const margin = line.finance.contributionMarginRate ?? 0;
  const quality = line.qualityScore;

  if (quality >= 85 && target >= 0.95 && margin >= 0.35) {
    return "verde";
  }

  if (quality >= 70 && target >= 0.85 && margin >= 0.25) {
    return "amarillo";
  }

  return "rojo";
}

function roundMoney(value: number) {
  return Math.round(value);
}

function scaleValue(value: number, scale: number) {
  return roundMoney(value * scale);
}

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return pendingMessage;
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatCompactCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return pendingMessage;
  }

  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString("en-US")}K`;
  }

  return formatCurrency(value);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return notCalculableMessage;
  }

  return `${Math.round(value * 100)}%`;
}

function getInclusiveDays(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate < startDate
  ) {
    return null;
  }

  const dayMs = 24 * 60 * 60 * 1000;

  return Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1;
}

function daysInMonth(dateValue: string) {
  const [yearText, monthText] = dateValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return 31;
  }

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getPeriodScale(context: GlobalFilterContext) {
  return getPeriodScaleForDates(context.periodStart, context.periodEnd);
}

function getPeriodScaleForDates(periodStart: string, periodEnd: string) {
  const days = getInclusiveDays(periodStart, periodEnd);

  if (days === null) {
    return null;
  }

  return Math.max(0.03, Math.min(days / daysInMonth(periodStart), 1));
}

function allocateBreakdown(
  total: number,
  items: { label: string; share: number }[],
): AmountBreakdown[] {
  if (total <= 0) {
    return items.map((item) => ({ label: item.label, amount: 0 }));
  }

  let allocated = 0;

  return items.map((item, index) => {
    if (index === items.length - 1) {
      return { label: item.label, amount: total - allocated };
    }

    const amount = roundMoney(total * item.share);
    allocated += amount;

    return { label: item.label, amount };
  });
}

function buildFinancialInvariants(finance: Omit<SemanticFinance, "invariants">) {
  const channelTotal = finance.channelRevenue.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const paymentTotal = finance.paymentCollections.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const finiteValues = [
    finance.grossBilling,
    finance.discounts,
    finance.creditNotes,
    finance.netBilling,
    finance.collections,
    finance.accountsReceivable,
    finance.directCost,
    finance.contributionMargin,
    finance.target,
    finance.periodPrevious,
    finance.priorYear,
    finance.averageTicket,
    finance.contributionMarginRate,
    finance.targetFulfillment,
    finance.periodVariance,
    finance.yoyVariance,
  ].filter((value): value is number => value !== null);

  return [
    {
      id: "channel-reconciles-net-billing",
      label: "Canales reconcilian facturacion neta",
      passed: channelTotal === finance.netBilling,
      message: `${formatCurrency(channelTotal)} en canales contra ${formatCurrency(finance.netBilling)} neto.`,
    },
    {
      id: "payments-reconcile-collections",
      label: "Pagos reconcilian cobros",
      passed: paymentTotal === finance.collections,
      message: `${formatCurrency(paymentTotal)} en pagos contra ${formatCurrency(finance.collections)} cobrado.`,
    },
    {
      id: "no-nan-infinity",
      label: "Sin valores no calculables",
      passed: finiteValues.every((value) => Number.isFinite(value)),
      message: "Las divisiones sin denominador devuelven pendiente, no cero silencioso.",
    },
    {
      id: "net-billing-formula",
      label: "Facturacion neta reconciliada",
      passed:
        finance.grossBilling - finance.discounts - finance.creditNotes ===
        finance.netBilling,
      message: "Facturacion neta = facturacion bruta - descuentos - notas de credito.",
    },
    {
      id: "accounts-receivable-formula",
      label: "Cuentas por cobrar reconciliadas",
      passed: finance.netBilling - finance.collections === finance.accountsReceivable,
      message: "Cuentas por cobrar = facturacion neta - cobros.",
    },
    {
      id: "contribution-margin-formula",
      label: "Margen de contribucion reconciliado",
      passed: finance.netBilling - finance.directCost === finance.contributionMargin,
      message: "Margen de contribucion = facturacion neta - costo directo.",
    },
    {
      id: "currency-explicit",
      label: "Moneda explicita",
      passed: finance.currencyCode === "USD",
      message: `Moneda: ${finance.currencyCode}.`,
    },
  ] satisfies FinancialInvariant[];
}

function buildFinance({
  channelShares,
  collections,
  creditNotes = 0,
  directCost,
  discounts = 0,
  grossBilling,
  paymentShares,
  periodPrevious,
  priorYear,
  target,
  tickets,
}: {
  channelShares: { label: string; share: number }[];
  collections: number;
  creditNotes?: number;
  directCost: number;
  discounts?: number;
  grossBilling: number;
  paymentShares: { label: string; share: number }[];
  periodPrevious: number;
  priorYear: number;
  target: number;
  tickets: number;
}): SemanticFinance {
  const netBilling = grossBilling - discounts - creditNotes;
  const contributionMargin = netBilling - directCost;
  const financeWithoutInvariants = {
    accountsReceivable: netBilling - collections,
    averageTicket: safeDivide(netBilling, tickets),
    channelRevenue: allocateBreakdown(netBilling, channelShares),
    collections,
    contributionMargin,
    contributionMarginRate: safeDivide(contributionMargin, netBilling),
    creditNotes,
    currencyCode: "USD" as const,
    directCost,
    discounts,
    grossBilling,
    netBilling,
    paymentCollections: allocateBreakdown(collections, paymentShares),
    periodPrevious,
    periodVariance: safeDivide(netBilling - periodPrevious, periodPrevious),
    priorYear,
    target,
    targetFulfillment: safeDivide(netBilling, target),
    yoyVariance: safeDivide(netBilling - priorYear, priorYear),
  };

  return {
    ...financeWithoutInvariants,
    invariants: buildFinancialInvariants(financeWithoutInvariants),
  };
}

function buildQualityRules({
  hasValidDates,
  hasValidFinance,
  issues,
  score,
  sourceConnected,
}: {
  hasValidDates: boolean;
  hasValidFinance: boolean;
  issues: string[];
  score: number;
  sourceConnected: boolean;
}): DataQualityRuleResult[] {
  return [
    {
      dimension: "completeness",
      label: "Completitud",
      passed: score >= 70,
      severity: score >= 70 ? "info" : "critical",
      message:
        score >= 70
          ? "Campos esenciales presentes para lectura cautelosa."
          : insufficientExecutiveDataMessage,
    },
    {
      dimension: "validity",
      label: "Validez",
      passed: hasValidDates && hasValidFinance,
      severity: hasValidDates && hasValidFinance ? "info" : "critical",
      message:
        hasValidDates && hasValidFinance
          ? "Fechas y montos pasan validaciones basicas."
          : "Fechas invalidas, montos no finitos o division sin denominador.",
    },
    {
      dimension: "consistency",
      label: "Consistencia",
      passed: issues.length === 0,
      severity: issues.length === 0 ? "info" : "warning",
      message:
        issues.length === 0
          ? "Sin diferencias de periodo, formula o fuente detectadas."
          : issues[0],
    },
    {
      dimension: "uniqueness",
      label: "Unicidad",
      passed: !issues.some((issue) => normalizeFilterText(issue).includes("duplicado")),
      severity: "warning",
      message: "Duplicados bloquean confianza ejecutiva hasta conciliacion.",
    },
    {
      dimension: "timeliness",
      label: "Oportunidad",
      passed: sourceConnected,
      severity: sourceConnected ? "info" : "warning",
      message: sourceConnected
        ? "Fuente dentro del periodo seleccionado."
        : "Fuente historica DEMO; requiere conexion para operacion diaria.",
    },
  ];
}

function makeMonthlyRevenue(netBilling: number, scale: number) {
  const current = Math.max(1, Math.round(netBilling / 1000));
  const points = [0.72, 0.78, 0.88, 0.84, 0.92, 1];

  return ["Ene", "Feb", "Mar", "Abr", "May", "Jun"].map((label, index) => ({
    label,
    value: Math.round(current * points[index] * Math.max(scale, 0.2)),
  }));
}

function scaleFinance(finance: SemanticFinance, scale: number, tickets: number) {
  return buildFinance({
    channelShares: finance.channelRevenue.map((item) => ({
      label: item.label,
      share: finance.netBilling > 0 ? item.amount / finance.netBilling : 0,
    })),
    collections: scaleValue(finance.collections, scale),
    creditNotes: scaleValue(finance.creditNotes, scale),
    directCost: scaleValue(finance.directCost, scale),
    discounts: scaleValue(finance.discounts, scale),
    grossBilling: scaleValue(finance.grossBilling, scale),
    paymentShares: finance.paymentCollections.map((item) => ({
      label: item.label,
      share: finance.collections > 0 ? item.amount / finance.collections : 0,
    })),
    periodPrevious: scaleValue(finance.periodPrevious, scale),
    priorYear: scaleValue(finance.priorYear, scale),
    target: Math.max(scaleValue(finance.target, scale), 1),
    tickets,
  });
}

function scaleOperations(operations: SemanticOperations, scale: number) {
  return {
    cancelledAppointments: Math.round(operations.cancelledAppointments * scale),
    completedAppointments: Math.round(operations.completedAppointments * scale),
    noShows: Math.round(operations.noShows * scale),
    patientCount: Math.round(operations.patientCount * scale),
    rescheduledAppointments: Math.round(operations.rescheduledAppointments * scale),
    scheduledAppointments: Math.round(operations.scheduledAppointments * scale),
    serviceVolume: Math.round(operations.serviceVolume * scale),
  };
}

function buildBaseLineFacts(context: GlobalFilterContext, scale: number): SemanticLine[] {
  const physioOperations = scaleOperations(
    {
      cancelledAppointments: 74,
      completedAppointments: 1320,
      noShows: 98,
      patientCount: 1180,
      rescheduledAppointments: 48,
      scheduledAppointments: 1540,
      serviceVolume: 2840,
    },
    scale,
  );
  const physioFinance = scaleFinance(
    buildFinance({
      channelShares: [
        { label: "Venta directa", share: 0.58 },
        { label: "Paquetes terapeuticos", share: 0.28 },
        { label: "Convenios", share: 0.14 },
      ],
      collections: 86800,
      creditNotes: 1000,
      directCost: 33500,
      discounts: 4800,
      grossBilling: 100000,
      paymentShares: [
        { label: "Tarjeta", share: 0.45 },
        { label: "Efectivo", share: 0.34 },
        { label: "Transferencia", share: 0.16 },
        { label: "Pago mixto", share: 0.05 },
      ],
      periodPrevious: 88200,
      priorYear: 84800,
      target: 100000,
      tickets: 1180,
    }),
    scale,
    physioOperations.patientCount,
  );

  const labLine = buildLaboratoryLineFromTemplates(context, scale);

  const imagingOperations = scaleOperations(
    {
      cancelledAppointments: 47,
      completedAppointments: 521,
      noShows: 66,
      patientCount: 620,
      rescheduledAppointments: 34,
      scheduledAppointments: 668,
      serviceVolume: 1940,
    },
    scale,
  );
  const imagingFinance = scaleFinance(
    buildFinance({
      channelShares: [
        { label: "Referidor medico", share: 0.36 },
        { label: "Venta directa", share: 0.34 },
        { label: "Convenios", share: 0.21 },
        { label: "Autorizaciones", share: 0.09 },
      ],
      collections: 60400,
      creditNotes: 900,
      directCost: 38400,
      discounts: 2100,
      grossBilling: 70500,
      paymentShares: [
        { label: "Tarjeta", share: 0.48 },
        { label: "Efectivo", share: 0.24 },
        { label: "Convenio", share: 0.18 },
        { label: "Pago mixto", share: 0.1 },
      ],
      periodPrevious: 63200,
      priorYear: 61000,
      target: 82000,
      tickets: 620,
    }),
    scale,
    imagingOperations.patientCount,
  );
  const imagingQuality = buildQualityRules({
    hasValidDates: true,
    hasValidFinance: true,
    issues: ["Informes dentro de SLA pendientes de RIS/PACS"],
    score: 74,
    sourceConnected: false,
  });

  return [
    {
      branchId: allBranchesValue,
      branchName: "Red Fisioterapia DEMO",
      businessLineCode: "PHYSIOTHERAPY",
      companyId: companyPhysioId,
      companyName: "Analiza Fisioterapia",
      countryId: countryElSalvadorId,
      countryName: "El Salvador",
      finance: physioFinance,
      key: "fisioterapia",
      managerName: "Gerencia operaciones Fisioterapia",
      monthlyRevenue: makeMonthlyRevenue(physioFinance.netBilling, scale),
      occupancyByBranch: [
        { label: "Centro", value: 69 },
        { label: "Norte", value: 76 },
        { label: "Sur", value: 72 },
      ],
      operations: physioOperations,
      periodEnd: context.periodEnd,
      periodStart: context.periodStart,
      qualityIssues: [],
      qualityLevel: qualityLevelFromScore(89),
      qualityRules: buildQualityRules({
        hasValidDates: true,
        hasValidFinance: true,
        issues: [],
        score: 89,
        sourceConnected: true,
      }),
      qualityScore: 89,
      scopeName: "Red SV DEMO",
      shortName: "Fisioterapia",
      sourceNote: "DEMO fisioterapia",
      sourceVersion: "demo-physio-2026-07",
      capacity: {
        availableUnits: scaleValue(9200, scale),
        cancellationRate: safeDivide(physioOperations.cancelledAppointments, physioOperations.scheduledAppointments),
        conversionGapPoints: 19,
        effective: 0.69,
        effectiveUnits: scaleValue(6826, scale),
        finalizationRate: safeDivide(physioOperations.completedAppointments, physioOperations.scheduledAppointments),
        lostUnits: scaleValue(2374, scale),
        noShowRate: safeDivide(physioOperations.noShows, physioOperations.scheduledAppointments),
        scheduled: 0.88,
        scheduledUnits: scaleValue(7670, scale),
        unitLabel: "Horas clinicas / sesiones",
      },
    },
    labLine,
    {
      branchId: allBranchesValue,
      branchName: "Red Imagenes DEMO",
      businessLineCode: "IMAGING",
      companyId: companyImagingId,
      companyName: "Analiza Imagenes",
      countryId: countryElSalvadorId,
      countryName: "El Salvador",
      finance: imagingFinance,
      key: "imagenes",
      managerName: "Gerencia operaciones Imagenes",
      monthlyRevenue: makeMonthlyRevenue(imagingFinance.netBilling, scale),
      occupancyByBranch: [
        { label: "Santa Tecla", value: 94 },
        { label: "Este", value: 61 },
        { label: "Centro", value: 78 },
      ],
      operations: imagingOperations,
      periodEnd: context.periodEnd,
      periodStart: context.periodStart,
      qualityIssues: ["Informes dentro de SLA pendientes de RIS/PACS"],
      qualityLevel: qualityLevelFromScore(74),
      qualityRules: imagingQuality,
      qualityScore: 74,
      scopeName: "Red SV DEMO",
      shortName: "Imagenes",
      sourceNote: "DEMO imagenes",
      sourceVersion: "demo-imaging-2026-07",
      capacity: {
        availableUnits: scaleValue(6500, scale),
        cancellationRate: safeDivide(imagingOperations.cancelledAppointments, imagingOperations.scheduledAppointments),
        conversionGapPoints: 6,
        effective: 0.78,
        effectiveUnits: scaleValue(5075, scale),
        finalizationRate: 0.865,
        lostUnits: scaleValue(186, scale),
        noShowRate: safeDivide(imagingOperations.noShows, imagingOperations.scheduledAppointments),
        scheduled: 0.84,
        scheduledUnits: scaleValue(5480, scale),
        unitLabel: "Horas de equipo / estudios",
      },
    },
  ];
}

function buildLaboratoryLineFromTemplates(
  context: GlobalFilterContext,
  scale: number,
  templates: ElSalvadorBranchResultTemplate[] = elSalvadorBranchResultTemplates,
  scopeName = "El Salvador",
): SemanticLine {
  const totalActualRevenue = templates.reduce(
    (sum, branch) => sum + branch.actualRevenue,
    0,
  );
  const totalCostOfSale = templates.reduce(
    (sum, branch) => sum + branch.costOfSale,
    0,
  );
  const totalRevenueTarget = templates.reduce(
    (sum, branch) => sum + branch.revenueTarget,
    0,
  );
  const labOperations = scaleOperations(
    {
      cancelledAppointments: 0,
      completedAppointments: templates.reduce(
        (sum, branch) => sum + branch.rowCounts.salesRows,
        0,
      ),
      noShows: 0,
      patientCount: templates.reduce(
        (sum, branch) => sum + branch.rowCounts.customerRows,
        0,
      ),
      rescheduledAppointments: 0,
      scheduledAppointments: templates.reduce(
        (sum, branch) => sum + branch.rowCounts.salesRows,
        0,
      ),
      serviceVolume: templates.reduce(
        (sum, branch) => sum + branch.rowCounts.customerRows,
        0,
      ),
    },
    scale,
  );
  const labFinance = scaleFinance(
    buildFinance({
      channelShares: [
        { label: "Paciente Analiza", share: 0.31 },
        { label: "DRSV", share: 0.22 },
        { label: "Orden medica", share: 0.24 },
        { label: "Convenios", share: 0.15 },
        { label: "Domicilio", share: 0.08 },
      ],
      collections: roundMoney(totalActualRevenue * 0.91),
      directCost: roundMoney(totalCostOfSale),
      grossBilling: roundMoney(totalActualRevenue),
      paymentShares: [
        { label: "Tarjeta", share: 0.44 },
        { label: "Efectivo", share: 0.33 },
        { label: "Transferencia", share: 0.13 },
        { label: "Pago mixto", share: 0.1 },
      ],
      periodPrevious: roundMoney(totalActualRevenue * 0.96),
      priorYear: roundMoney(totalActualRevenue * 0.89),
      target: roundMoney(totalRevenueTarget),
      tickets: labOperations.patientCount,
    }),
    scale,
    labOperations.patientCount,
  );
  const qualityScore = Math.round(
    templates.reduce((sum, branch) => sum + branch.dataQualityScore, 0) /
      Math.max(templates.length, 1),
  );
  const issues = Array.from(
    new Set(
      templates.flatMap((branch) =>
        branch.validationFlags.slice(0, 1),
      ),
    ),
  );

  return {
    branchId: allBranchesValue,
    branchName: "Laboratorio SV",
    businessLineCode: "LABORATORY",
    companyId: companyLabId,
    companyName: "Analiza Laboratorio",
    countryId: countryElSalvadorId,
    countryName: "El Salvador",
    finance: labFinance,
    key: "laboratorio",
    managerName: "Gerencia operaciones Laboratorio",
    monthlyRevenue: makeMonthlyRevenue(labFinance.netBilling, scale),
    occupancyByBranch: templates.map((branch) => ({
      label: branch.city,
      value: branch.dataQualityScore,
    })),
    operations: labOperations,
    periodEnd: context.periodEnd,
    periodStart: context.periodStart,
    qualityIssues: issues,
    qualityLevel: qualityLevelFromScore(qualityScore),
    qualityRules: buildQualityRules({
      hasValidDates: true,
      hasValidFinance: true,
      issues,
      score: qualityScore,
      sourceConnected: true,
    }),
    qualityScore,
    scopeName,
    shortName: "Laboratorio",
    sourceNote:
      templates.length === elSalvadorBranchResultTemplates.length
        ? "Plantillas SV DEMO"
        : "Plantillas SV DEMO por area",
    sourceVersion: "sv-result-templates-2026-06",
    sourceTemplates: templates,
    capacity: {
      availableUnits: scaleValue(45000, scale),
      cancellationRate: null,
      conversionGapPoints: null,
      effective: 0.79,
      effectiveUnits: scaleValue(35640, scale),
      finalizationRate: 0.948,
      lostUnits: scaleValue(9360, scale),
      noShowRate: null,
      pendingMessage: "Laboratorio usa utilizacion tecnica y flujo de procesamiento, no ocupacion clinica.",
      scheduled: 0.84,
      scheduledUnits: scaleValue(38000, scale),
      unitLabel: "Pruebas / horas de analizador",
    },
  };
}

function buildLaboratoryBranchLine(
  template: ElSalvadorBranchResultTemplate,
  context: GlobalFilterContext,
  scale: number,
): SemanticLine {
  const operations = scaleOperations(
    {
      cancelledAppointments: 0,
      completedAppointments: template.rowCounts.salesRows,
      noShows: 0,
      patientCount: template.rowCounts.customerRows,
      rescheduledAppointments: 0,
      scheduledAppointments: template.rowCounts.salesRows,
      serviceVolume: template.rowCounts.customerRows,
    },
    scale,
  );
  const finance = scaleFinance(
    buildFinance({
      channelShares: [
        { label: "Paciente Analiza", share: 0.32 },
        { label: "DRSV", share: 0.22 },
        { label: "Orden medica", share: 0.24 },
        { label: "Convenios", share: 0.14 },
        { label: "Domicilio", share: 0.08 },
      ],
      collections: roundMoney(template.actualRevenue * 0.91),
      directCost: roundMoney(template.costOfSale),
      grossBilling: roundMoney(template.actualRevenue),
      paymentShares: [
        { label: "Tarjeta", share: 0.44 },
        { label: "Efectivo", share: 0.33 },
        { label: "Transferencia", share: 0.13 },
        { label: "Pago mixto", share: 0.1 },
      ],
      periodPrevious: roundMoney(template.actualRevenue * 0.96),
      priorYear: roundMoney(template.actualRevenue * 0.89),
      target: roundMoney(template.revenueTarget),
      tickets: operations.patientCount,
    }),
    scale,
    operations.patientCount,
  );

  return {
    branchId: template.id,
    branchName: template.branchName,
    businessLineCode: "LABORATORY",
    companyId: companyLabId,
    companyName: "Analiza Laboratorio",
    countryId: countryElSalvadorId,
    countryName: "El Salvador",
    finance,
    key: "laboratorio",
    managerName: template.manager,
    monthlyRevenue: makeMonthlyRevenue(finance.netBilling, scale),
    occupancyByBranch: [{ label: template.city, value: template.dataQualityScore }],
    operations,
    periodEnd: context.periodEnd,
    periodStart: context.periodStart,
    qualityIssues: template.validationFlags,
    qualityLevel: qualityLevelFromScore(template.dataQualityScore),
    qualityRules: buildQualityRules({
      hasValidDates: true,
      hasValidFinance: true,
      issues: template.validationFlags,
      score: template.dataQualityScore,
      sourceConnected: true,
    }),
    qualityScore: template.dataQualityScore,
    scopeName: template.branchName,
    shortName: template.city,
    sourceNote: template.fileName,
    sourceVersion: `${template.salesPeriod} / ${template.workbookPeriod}`,
    capacity: {
      availableUnits: scaleValue(Math.max(template.rowCounts.salesRows * 1.18, 1), scale),
      cancellationRate: null,
      conversionGapPoints: null,
      effective: template.dataQualityScore / 100,
      effectiveUnits: operations.completedAppointments,
      finalizationRate: 0.948,
      lostUnits: Math.max(scaleValue(template.rowCounts.salesRows * 0.18, scale), 0),
      noShowRate: null,
      pendingMessage: "Laboratorio usa utilizacion tecnica y flujo de procesamiento, no ocupacion clinica.",
      scheduled: Math.min(template.dataQualityScore / 100 + 0.07, 1),
      scheduledUnits: operations.scheduledAppointments,
      unitLabel: "Ordenes / procesamiento tecnico",
    },
  };
}

function matchesTemplateBranch(
  template: ElSalvadorBranchResultTemplate,
  context: GlobalFilterContext,
) {
  if (isAllFilterValue(context.branchId) && isAllFilterValue(context.branchName)) {
    return false;
  }

  const candidates = [
    context.branchId,
    context.branchName,
    context.branchId.replace(/^managed-/, ""),
  ].map(normalizeFilterText);
  const branchTokens = [
    template.id,
    template.branchName,
    template.branchCode,
    template.city,
  ].map(normalizeFilterText);

  return candidates.some((candidate) =>
    branchTokens.some(
      (token) =>
        token === candidate ||
        token.includes(candidate) ||
        candidate.includes(token) ||
        (template.branchCode.length > 0 &&
          candidate.includes(normalizeFilterText(template.branchCode))),
    ),
  );
}

function isBranchScopedContext(context: GlobalFilterContext) {
  return !isAllFilterValue(context.branchId) || !isAllFilterValue(context.branchName);
}

function templateMatchesOperationalArea(
  template: ElSalvadorBranchResultTemplate,
  context: GlobalFilterContext,
) {
  if (context.operationalAreaId === allOperationalAreasValue) {
    return true;
  }

  const areaText = normalizeFilterText(
    `${context.operationalAreaId} ${context.operationalAreaName}`,
  );
  const areaManagerText = normalizeFilterText(template.areaManager);

  return (
    areaManagerText.length > 0 &&
    (areaText.includes(areaManagerText) || areaManagerText.includes(areaText))
  );
}

function hasUnsupportedGranularFilter(context: GlobalFilterContext) {
  return (
    context.professionalId !== allProfessionalsValue ||
    context.serviceId !== allServicesValue ||
    context.payerId !== allPayersValue ||
    context.channelId !== allChannelsValue
  );
}

function lineMatchesContext(line: SemanticLine, context: GlobalFilterContext) {
  const companyMatches =
    context.companyId === "__consolidated__" || line.companyId === context.companyId;
  const lineMatches =
    context.businessLineCode === "CONSOLIDATED" ||
    line.businessLineCode === context.businessLineCode;
  const managerMatches =
    context.managerId === allManagersValue ||
    normalizeFilterText(line.managerName).includes(normalizeFilterText(context.managerName)) ||
    normalizeFilterText(context.managerName).includes(normalizeFilterText(line.managerName)) ||
    context.managerId === "manager-branch-sv" ||
    (context.managerId === "manager-operations-lab" && line.key === "laboratorio") ||
    (context.managerId === "manager-operations-physio" && line.key === "fisioterapia") ||
    (context.managerId === "manager-operations-img" && line.key === "imagenes");

  return companyMatches && lineMatches && managerMatches;
}

function filterLinesForContext(
  lines: SemanticLine[],
  context: GlobalFilterContext,
  options: { ignoreOperationalArea?: boolean } = {},
) {
  if (context.countryId !== "__regional__" && context.countryId !== countryElSalvadorId) {
    return [];
  }

  if (
    !options.ignoreOperationalArea &&
    context.operationalAreaId !== allOperationalAreasValue
  ) {
    const areaName = normalizeFilterText(context.operationalAreaName);
    lines = lines.filter((line) =>
      normalizeFilterText(line.scopeName).includes(areaName) ||
      normalizeFilterText(line.managerName).includes(areaName),
    );
  }

  if (hasUnsupportedGranularFilter(context)) {
    return [];
  }

  return lines.filter((line) => lineMatchesContext(line, context));
}

function buildLinesForContext(context: GlobalFilterContext) {
  const scale = getPeriodScale(context);

  if (scale === null) {
    return [];
  }

  if (isBranchScopedContext(context)) {
    const template = elSalvadorBranchResultTemplates.find((branch) =>
      matchesTemplateBranch(branch, context),
    );

    if (template) {
      return filterLinesForContext(
        [buildLaboratoryBranchLine(template, context, scale)],
        context,
        { ignoreOperationalArea: true },
      );
    }

    return [];
  }

  if (context.operationalAreaId !== allOperationalAreasValue) {
    const templates = elSalvadorBranchResultTemplates.filter((template) =>
      templateMatchesOperationalArea(template, context),
    );
    const areaLines =
      templates.length > 0
        ? [
            buildLaboratoryLineFromTemplates(
              context,
              scale,
              templates,
              context.operationalAreaName,
            ),
          ]
        : [];

    return filterLinesForContext(areaLines, context, {
      ignoreOperationalArea: true,
    });
  }

  return filterLinesForContext(buildBaseLineFacts(context, scale), context);
}

function getNoDataReason(context: GlobalFilterContext, lines: SemanticLine[]) {
  if (lines.length > 0) {
    return null;
  }

  if (getPeriodScale(context) === null) {
    return "Rango de fechas invalido";
  }

  if (hasUnsupportedGranularFilter(context)) {
    return `${noDataMessage}. ${pendingMessage} para profesional, servicio, pagador o canal en este DEMO.`;
  }

  if (context.countryId !== "__regional__" && context.countryId !== countryElSalvadorId) {
    return `${noDataMessage}. ${pendingMessage} para ${context.countryName}.`;
  }

  return noDataMessage;
}

function buildExecutiveComparableScore(row: ExecutiveBranchRow) {
  return weightedScore([
    { value: scoreTargetFulfillment(row.targetFulfillment), weight: 35 },
    { value: scoreRate(row.contributionMarginRate), weight: 25 },
    { value: scoreRate(row.effectiveOccupancy), weight: 25 },
    { value: row.qualityScore, weight: 15 },
  ]);
}

function buildExecutiveOutlierFlags(
  row: ExecutiveBranchRow,
  peers: ExecutiveBranchRow[],
): AnalyticsOutlierFlag[] {
  const flags: AnalyticsOutlierFlag[] = [];
  const marginMedian = median(
    peers
      .map((peer) => peer.contributionMarginRate)
      .filter((value): value is number => value !== null),
  );
  const occupancyMedian = median(
    peers
      .map((peer) => peer.effectiveOccupancy)
      .filter((value): value is number => value !== null),
  );

  if ((row.targetFulfillment ?? 1) < 0.9) {
    flags.push(
      createOutlierFlag({
        benchmark: "Meta aprobada del periodo",
        explanation:
          "Brecha contra meta; revisar alcance, capacidad y responsable antes de concluir por volumen.",
        metric: "Meta",
        severity: (row.targetFulfillment ?? 1) < 0.8 ? "critical" : "warning",
        value: formatPercent(row.targetFulfillment),
      }),
    );
  }

  if (
    row.effectiveOccupancy !== null &&
    (row.effectiveOccupancy >= 0.9 || row.effectiveOccupancy <= 0.65)
  ) {
    flags.push(
      createOutlierFlag({
        benchmark: occupancyMedian === null ? "Grupo comparable" : formatPercent(occupancyMedian),
        explanation:
          row.effectiveOccupancy >= 0.9
            ? "Utilizacion alta; validar si hay saturacion o deterioro de SLA."
            : "Utilizacion baja; revisar capacidad ociosa y demanda disponible.",
        metric: "Ocupacion",
        severity: "warning",
        value: formatPercent(row.effectiveOccupancy),
      }),
    );
  }

  if (
    marginMedian !== null &&
    row.contributionMarginRate !== null &&
    row.contributionMarginRate <= marginMedian - 0.06
  ) {
    flags.push(
      createOutlierFlag({
        benchmark: `Mediana pares ${formatPercent(marginMedian)}`,
        explanation:
          "Margen debajo del grupo comparable; separar mix, costo y ticket.",
        metric: "Margen",
        severity: "warning",
        value: formatPercent(row.contributionMarginRate),
      }),
    );
  }

  if (row.qualityScore < 80) {
    flags.push(
      createOutlierFlag({
        benchmark: "Umbral minimo 80",
        explanation:
          "Calidad de datos baja; no emitir conclusion ejecutiva fuerte sin conciliacion.",
        metric: "Calidad",
        severity: row.qualityScore < 70 ? "critical" : "warning",
        value: `${row.qualityScore}`,
      }),
    );
  }

  return flags;
}

function enrichExecutiveBranchRows(rows: ExecutiveBranchRow[]) {
  return rows.map((row) => {
    const peers = rows.filter(
      (peer) => peer.company === row.company && peer.branch !== row.branch,
    );
    const fallbackPeers = peers.length >= 2 ? peers : rows.filter((peer) => peer.branch !== row.branch);

    return {
      ...row,
      comparisonBasis:
        peers.length >= 2
          ? `${row.company}; sucursales de la misma linea`
          : "Vista ejecutiva filtrada; pares disponibles limitados",
      normalizedPerformanceScore: buildExecutiveComparableScore(row),
      outlierFlags: buildExecutiveOutlierFlags(row, fallbackPeers),
    };
  });
}

function buildBranchRows(lines: SemanticLine[]): ExecutiveBranchRow[] {
  const rows = lines.flatMap((line) => {
    if (line.key === "laboratorio" && line.branchId === allBranchesValue) {
      const scale = getPeriodScaleForDates(line.periodStart, line.periodEnd) ?? 1;
      const templates = line.sourceTemplates ?? elSalvadorBranchResultTemplates;

      return templates.map((branch) => {
        const revenue = scaleValue(branch.actualRevenue, scale);
        const target = scaleValue(branch.revenueTarget, scale);

        return {
          alert:
            branch.dataQualityScore < 70
              ? insufficientExecutiveDataMessage
              : branch.validationFlags[0] ?? "Plantilla DEMO conciliada.",
          branch: branch.branchName,
          company: line.companyName,
          contributionMarginRate: branch.marginRate,
          effectiveOccupancy: branch.dataQualityScore / 100,
          manager: branch.manager,
          qualityLevel: qualityLevelFromScore(branch.dataQualityScore),
          qualityScore: branch.dataQualityScore,
          revenue,
          targetFulfillment: safeDivide(revenue, target),
        };
      });
    }

    return [
      {
        alert:
          line.qualityLevel === "Insuficiente"
            ? insufficientExecutiveDataMessage
            : line.qualityIssues[0] ?? "Lectura DEMO disponible.",
        branch: line.branchName,
        company: line.companyName,
        contributionMarginRate: line.finance.contributionMarginRate,
        effectiveOccupancy: line.capacity.effective,
        manager: line.managerName,
        qualityLevel: line.qualityLevel,
        qualityScore: line.qualityScore,
        revenue: line.finance.netBilling,
        targetFulfillment: line.finance.targetFulfillment,
      },
    ];
  });

  return enrichExecutiveBranchRows(rows);
}

function buildManagerRows(branchRows: ExecutiveBranchRow[]): ExecutiveManagerRow[] {
  const groups = new Map<string, ExecutiveBranchRow[]>();

  for (const row of branchRows) {
    const current = groups.get(row.manager) ?? [];
    current.push(row);
    groups.set(row.manager, current);
  }

  return [...groups.entries()]
    .map(([manager, rows]) => {
      const averageQuality =
        rows.reduce((sum, row) => sum + row.qualityScore, 0) / rows.length;
      const averageTarget =
        rows.reduce((sum, row) => sum + (row.targetFulfillment ?? 0), 0) /
        rows.length;
      const averageMargin =
        rows.reduce((sum, row) => sum + (row.contributionMarginRate ?? 0), 0) /
        rows.length;
      const averageOccupancy =
        rows.reduce((sum, row) => sum + (row.effectiveOccupancy ?? 0), 0) /
        rows.length;
      const averageComparableScore =
        rows.reduce(
          (sum, row) => sum + (row.normalizedPerformanceScore ?? row.qualityScore),
          0,
        ) / rows.length;
      const outlierFlags = rows.flatMap((row) => row.outlierFlags ?? []).slice(0, 4);

      return {
        action:
          averageQuality < 70
            ? insufficientExecutiveDataMessage
            : averageTarget < 0.9
              ? "Revisar brecha de meta por sucursal."
              : "Mantener control de margen y calidad.",
        branches: rows.length,
        contributionMarginRate: averageMargin,
        effectiveOccupancy: averageOccupancy,
        manager,
        comparisonBasis: "Promedio de sucursales asignadas, no suma por volumen",
        qualityLevel: qualityLevelFromScore(averageQuality),
        qualityScore: Math.round(averageQuality),
        normalizedPerformanceScore: Math.round(averageComparableScore),
        outlierFlags,
        scope: rows.map((row) => row.branch).join(", "),
        targetFulfillment: averageTarget,
      };
    })
    .sort((first, second) => {
      const levelOrder: Record<QualityLevel, number> = {
        Confiable: 2,
        Insuficiente: 0,
        Revisar: 1,
      };

      return (
        levelOrder[first.qualityLevel] - levelOrder[second.qualityLevel] ||
        first.qualityScore - second.qualityScore
      );
    });
}

function sumLines(lines: SemanticLine[]) {
  const sum = (selector: (line: SemanticLine) => number) =>
    lines.reduce((total, line) => total + selector(line), 0);
  const weightedAverage = (
    selector: (line: SemanticLine) => number | null,
    weight: (line: SemanticLine) => number,
  ) => {
    const totalWeight = sum(weight);

    if (totalWeight <= 0) {
      return null;
    }

    return (
      lines.reduce((total, line) => {
        const value = selector(line);
        return total + (value ?? 0) * weight(line);
      }, 0) / totalWeight
    );
  };

  return {
    accountsReceivable: sum((line) => line.finance.accountsReceivable),
    appointments: sum((line) => line.operations.scheduledAppointments),
    cancellations: sum((line) => line.operations.cancelledAppointments),
    collections: sum((line) => line.finance.collections),
    completed: sum((line) => line.operations.completedAppointments),
    contributionMargin: sum((line) => line.finance.contributionMargin),
    contributionMarginRate: weightedAverage(
      (line) => line.finance.contributionMarginRate,
      (line) => line.finance.netBilling,
    ),
    directCost: sum((line) => line.finance.directCost),
    netBilling: sum((line) => line.finance.netBilling),
    noShows: sum((line) => line.operations.noShows),
    patients: sum((line) => line.operations.patientCount),
    quality: Math.round(
      lines.reduce((total, line) => total + line.qualityScore, 0) /
        Math.max(lines.length, 1),
    ),
    targetFulfillment: weightedAverage(
      (line) => line.finance.targetFulfillment,
      (line) => line.finance.netBilling,
    ),
    yoyVariance: weightedAverage(
      (line) => line.finance.yoyVariance,
      (line) => line.finance.netBilling,
    ),
  };
}

function buildExecutiveKpis(lines: SemanticLine[]): ExecutiveSemanticKpi[] {
  if (lines.length === 0) {
    return [
      {
        label: "Ingresos facturados",
        note: noDataMessage,
        status: "blocked",
        value: pendingMessage,
      },
      {
        label: "Margen de contribucion",
        note: notCalculableMessage,
        status: "blocked",
        value: pendingMessage,
      },
      {
        label: "Calidad de datos",
        note: insufficientExecutiveDataMessage,
        status: "blocked",
        value: "Insuficiente",
      },
    ];
  }

  const totals = sumLines(lines);
  const qualityLevel = qualityLevelFromScore(totals.quality);
  const qualityBlocks = qualityLevel === "Insuficiente";

  return [
    {
      label: "Ingresos facturados",
      note: "Facturacion neta del periodo filtrado.",
      status: "available",
      value: formatCompactCurrency(totals.netBilling),
    },
    {
      label: "Cobros",
      note: "Pagos conciliados contra facturacion neta.",
      status: "available",
      value: formatCompactCurrency(totals.collections),
    },
    {
      label: "Cuentas por cobrar",
      note: "Facturacion neta menos cobros.",
      status: "available",
      value: formatCompactCurrency(totals.accountsReceivable),
    },
    {
      label: "Meta de ingresos",
      note: "Cumplimiento sobre meta explicita del periodo.",
      status: totals.targetFulfillment === null ? "pending" : "available",
      value: formatPercent(totals.targetFulfillment),
    },
    {
      label: "Margen de contribucion",
      note: "Facturacion neta menos costos directos.",
      status: totals.contributionMarginRate === null ? "pending" : "available",
      value: formatPercent(totals.contributionMarginRate),
    },
    {
      label: "Pacientes o clientes atendidos",
      note: "Personas o clientes DEMO con trazabilidad por fuente.",
      status: "available",
      value: totals.patients.toLocaleString("en-US"),
    },
    {
      label: "Citas / ordenes / estudios",
      note: "Unidad original por linea; no se mezcla como un solo KPI clinico.",
      status: "available",
      value: totals.appointments.toLocaleString("en-US"),
    },
    {
      label: "No-show",
      note: "Solo aplica a lineas con agenda formal; laboratorio queda fuera.",
      status: totals.noShows > 0 ? "available" : "pending",
      value: totals.noShows > 0 ? totals.noShows.toLocaleString("en-US") : notCalculableMessage,
    },
    {
      label: "Cancelaciones",
      note: "Cancelaciones registradas en agenda aplicable.",
      status: totals.cancellations > 0 ? "available" : "pending",
      value:
        totals.cancellations > 0
          ? totals.cancellations.toLocaleString("en-US")
          : notCalculableMessage,
    },
    {
      label: "Calidad de datos",
      note: qualityBlocks
        ? insufficientExecutiveDataMessage
        : "Nivel calculado por completitud, validez, consistencia, unicidad y oportunidad.",
      status: qualityBlocks ? "blocked" : "available",
      value: `${qualityLevel} ${totals.quality}%`,
    },
  ];
}

function buildExecutiveInsights(lines: SemanticLine[]): ExecutiveSemanticInsight[] {
  if (lines.length === 0) {
    return [
      {
        affectedIndicator: "Calidad de datos",
        priority: "alta",
        recommendation: insufficientExecutiveDataMessage,
        title: noDataMessage,
      },
    ];
  }

  return lines
    .flatMap((line): ExecutiveSemanticInsight[] => {
      const insights: ExecutiveSemanticInsight[] = [];

      if (line.qualityLevel === "Insuficiente") {
        insights.push({
          affectedIndicator: "Calidad de datos",
          priority: "alta",
          recommendation: `${line.branchName}: calidad ${line.qualityScore} vs umbral minimo 70. Impacto: no emitir conclusion ejecutiva fuerte. Accion: conciliar fuente, periodo y duplicados antes de publicar.`,
          title: `${line.shortName}: calidad insuficiente en ${line.branchName}`,
        });
      }

      if ((line.finance.targetFulfillment ?? 1) < 0.9) {
        const targetGap = line.finance.target - line.finance.netBilling;

        insights.push({
          affectedIndicator: "Meta de ingresos",
          priority: "media",
          recommendation: `${line.branchName}: ${formatPercent(line.finance.targetFulfillment)} vs meta 100%, brecha ${formatCurrency(targetGap)}. Impacto: riesgo de cierre bajo meta. Accion: revisar plan por gerente, capacidad disponible y servicios con mayor brecha.`,
          title: `${line.shortName}: brecha de meta en ${line.branchName}`,
        });
      }

      if (line.capacity.conversionGapPoints !== null && line.capacity.conversionGapPoints > 8) {
        insights.push({
          affectedIndicator: "Brecha agenda/efectiva",
          priority: "alta",
          recommendation: `${line.branchName}: brecha agenda/atencion de ${line.capacity.conversionGapPoints} pts vs capacidad agendada. Impacto: capacidad reservada no se convierte en servicio. Accion: confirmar citas, activar lista de espera y medir recuperacion.`,
          title: `${line.shortName}: agenda no se convierte en atencion real`,
        });
      }

      if ((line.finance.contributionMarginRate ?? 1) < 0.45) {
        insights.push({
          affectedIndicator: "Margen de contribucion",
          priority: "media",
          recommendation: `${line.branchName}: margen ${formatPercent(line.finance.contributionMarginRate)} vs umbral de vigilancia 45%. Impacto: venta puede no convertirse en contribucion. Accion: separar costo directo por servicio, canal y sucursal antes de escalar volumen.`,
          title: `${line.shortName}: margen bajo vigilancia`,
        });
      }

      return insights;
    })
    .slice(0, 5);
}

export function getExecutiveBiSnapshot(
  input: GlobalFilterInput | Partial<GlobalFilterContext> = {},
): ExecutiveBiSnapshot {
  const context = resolveGlobalFilterContext(input);
  const lines = buildLinesForContext(context);
  const branchRows = buildBranchRows(lines);
  const managerRows = buildManagerRows(branchRows);

  return {
    branchRows,
    context,
    insights: buildExecutiveInsights(lines),
    kpis: buildExecutiveKpis(lines),
    lines,
    managerRows,
    noDataReason: getNoDataReason(context, lines),
  };
}

export function semanticStatusFromLine(line: SemanticLine) {
  return statusFromLine(line);
}

export function getQualityLevelFromScore(score: number) {
  return qualityLevelFromScore(score);
}

export function formatSemanticCurrency(value: number | null) {
  return formatCurrency(value);
}

export function formatSemanticCompactCurrency(value: number | null) {
  return formatCompactCurrency(value);
}

export function formatSemanticPercent(value: number | null) {
  return formatPercent(value);
}

export function isExecutiveConclusionAllowed(score: number) {
  return qualityLevelFromScore(score) !== "Insuficiente";
}

export const semanticMessages = {
  insufficientExecutiveData: insufficientExecutiveDataMessage,
  noData: noDataMessage,
  notCalculable: notCalculableMessage,
  pending: pendingMessage,
};

export function areFinanceInvariantsPassing(finance: SemanticFinance) {
  return finance.invariants.every((invariant) => invariant.passed);
}
