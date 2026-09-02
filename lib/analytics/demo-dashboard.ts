import {
  elSalvadorBranchResultTemplates,
  elSalvadorTemplateSummary,
} from "@/lib/analytics/el-salvador-result-templates";
import type { GlobalFilterInput } from "@/lib/analytics/global-filters";
import {
  formatSemanticPercent,
  getExecutiveBiSnapshot,
  semanticMessages,
  semanticStatusFromLine,
  type ExecutiveBranchRow,
  type ExecutiveManagerRow,
} from "@/lib/analytics/semantic-bi";

export type ExecutiveKpi = {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "warning" | "negative" | "neutral";
  definition: string;
  formula: string;
  source: string;
  updatedAt: string;
};

export type BarPoint = {
  label: string;
  value: number;
};

export type BusinessLineKey = "fisioterapia" | "laboratorio" | "imagenes";
export type BusinessLineStatus = "verde" | "amarillo" | "rojo";

export type BusinessLineDashboard = {
  key: BusinessLineKey;
  companyName: string;
  shortName: string;
  scopeName: string;
  revenue: number;
  revenueGrowthRate: number;
  collectedRevenue: number;
  accountsReceivable: number;
  revenueTarget: number;
  financialHealth: number;
  operatingHealth: number;
  fixedExpenses: number;
  variableExpenses: number;
  fixedCosts: number;
  variableCosts: number;
  marginRate: number;
  marginDeltaPoints: number;
  scheduledAppointments: number;
  completedAppointments: number;
  noShows: number;
  cancelledAppointments: number;
  rescheduledAppointments: number;
  effectiveOccupancy: number;
  scheduledOccupancy: number;
  serviceVolume: number;
  patientCount: number;
  averageTicket: number;
  executiveStatus: BusinessLineStatus;
  executiveInterpretation: string;
  sourceNote: string;
  alert: string;
  monthlyRevenue: BarPoint[];
  occupancyByBranch: BarPoint[];
  qualityLevel?: string;
  qualityScore?: number;
};

export type InsightPreview = {
  title: string;
  priority: "alta" | "media" | "baja";
  affectedIndicator: string;
  recommendation: string;
};

type SemanticDashboardLine = ReturnType<typeof getExecutiveBiSnapshot>["lines"][number];

function mapSemanticLineToDashboard(line: SemanticDashboardLine): BusinessLineDashboard {
  return {
    accountsReceivable: line.finance.accountsReceivable,
    alert:
      line.qualityLevel === "Insuficiente"
        ? semanticMessages.insufficientExecutiveData
        : line.qualityIssues[0] ?? "Lectura DEMO disponible.",
    averageTicket: Math.round(line.finance.averageTicket ?? 0),
    cancelledAppointments: line.operations.cancelledAppointments,
    collectedRevenue: line.finance.collections,
    companyName: line.companyName,
    completedAppointments: line.operations.completedAppointments,
    effectiveOccupancy: Math.round((line.capacity.effective ?? 0) * 100),
    executiveInterpretation:
      line.qualityLevel === "Insuficiente"
        ? semanticMessages.insufficientExecutiveData
        : `${line.shortName} muestra ${formatSemanticPercent(line.finance.targetFulfillment)} de meta y ${formatSemanticPercent(line.finance.contributionMarginRate)} de margen de contribucion con calidad ${line.qualityLevel}.`,
    executiveStatus: semanticStatusFromLine(line),
    financialHealth: line.qualityScore,
    fixedCosts: 0,
    fixedExpenses: 0,
    key: line.key,
    marginDeltaPoints: Math.round((line.finance.yoyVariance ?? 0) * 100),
    marginRate: line.finance.contributionMarginRate ?? 0,
    monthlyRevenue: line.monthlyRevenue,
    noShows: line.operations.noShows,
    occupancyByBranch: line.occupancyByBranch,
    operatingHealth: Math.round(
      (line.capacity.finalizationRate ?? line.capacity.effective ?? 0) * 100,
    ),
    patientCount: line.operations.patientCount,
    qualityLevel: line.qualityLevel,
    qualityScore: line.qualityScore,
    rescheduledAppointments: line.operations.rescheduledAppointments,
    revenue: line.finance.netBilling,
    revenueGrowthRate: Math.round((line.finance.yoyVariance ?? 0) * 100),
    revenueTarget: line.finance.target,
    scheduledAppointments: line.operations.scheduledAppointments,
    scheduledOccupancy: Math.round((line.capacity.scheduled ?? 0) * 100),
    scopeName: line.scopeName,
    serviceVolume: line.operations.serviceVolume,
    shortName: line.shortName,
    sourceNote: line.sourceNote,
    variableCosts: line.finance.directCost,
    variableExpenses: line.finance.directCost,
  };
}

const laboratoryRevenue = elSalvadorTemplateSummary.totalActualRevenue;
const laboratoryTarget = elSalvadorTemplateSummary.totalRevenueTarget;
const laboratoryCostOfSale = elSalvadorTemplateSummary.totalCostOfSale;
const laboratoryPatients = elSalvadorBranchResultTemplates.reduce(
  (sum, branch) => sum + branch.rowCounts.customerRows,
  0,
);

export const dashboardBusinessLines: BusinessLineDashboard[] = [
  {
    key: "fisioterapia",
    companyName: "Analiza Fisioterapia",
    shortName: "Fisioterapia",
    scopeName: "Linea de negocio",
    revenue: 94200,
    revenueGrowthRate: 9,
    collectedRevenue: 86800,
    accountsReceivable: 7400,
    revenueTarget: 100000,
    financialHealth: 89,
    operatingHealth: 91,
    fixedExpenses: 24400,
    variableExpenses: 18500,
    fixedCosts: 12400,
    variableCosts: 21100,
    marginRate: 0.38,
    marginDeltaPoints: 2,
    scheduledAppointments: 1540,
    completedAppointments: 1320,
    noShows: 98,
    cancelledAppointments: 74,
    rescheduledAppointments: 48,
    effectiveOccupancy: 61,
    scheduledOccupancy: 80,
    serviceVolume: 2840,
    patientCount: 1180,
    averageTicket: 80,
    executiveStatus: "amarillo",
    executiveInterpretation:
      "Fisioterapia tiene demanda suficiente, pero solo aprovecha 61% de las horas disponibles.",
    sourceNote: "DEMO fisioterapia",
    alert: "Alta demanda con brecha de asistencia en horas pico.",
    monthlyRevenue: [
      { label: "Ene", value: 68 },
      { label: "Feb", value: 72 },
      { label: "Mar", value: 81 },
      { label: "Abr", value: 79 },
      { label: "May", value: 88 },
      { label: "Jun", value: 94 },
    ],
    occupancyByBranch: [
      { label: "Norte", value: 74 },
      { label: "Centro", value: 69 },
      { label: "Sur", value: 71 },
    ],
  },
  {
    key: "laboratorio",
    companyName: "Analiza Laboratorio",
    shortName: "Laboratorio",
    scopeName: "El Salvador",
    revenue: laboratoryRevenue,
    revenueGrowthRate: 12,
    collectedRevenue: Math.round(laboratoryRevenue * 0.91),
    accountsReceivable: Math.round(laboratoryRevenue * 0.09),
    revenueTarget: laboratoryTarget,
    financialHealth: 78,
    operatingHealth: 86,
    fixedExpenses: 56200,
    variableExpenses: 41800,
    fixedCosts: 31200,
    variableCosts: laboratoryCostOfSale,
    marginRate: 0.86,
    marginDeltaPoints: -5,
    scheduledAppointments: 9034,
    completedAppointments: 8128,
    noShows: 358,
    cancelledAppointments: 287,
    rescheduledAppointments: 261,
    effectiveOccupancy: 68,
    scheduledOccupancy: 75,
    serviceVolume: 88228,
    patientCount: laboratoryPatients,
    averageTicket: Math.round(laboratoryRevenue / Math.max(laboratoryPatients, 1)),
    executiveStatus: "rojo",
    executiveInterpretation:
      "Laboratorio crece 12%, pero el margen cayo 5 puntos por aumento en reactivos y pruebas de bajo rendimiento.",
    sourceNote: "Plantillas reales SV DEMO",
    alert: "Revisar duplicados, periodos y formulas antes de aprobar carga.",
    monthlyRevenue: [
      { label: "Ene", value: 164 },
      { label: "Feb", value: 158 },
      { label: "Mar", value: 184 },
      { label: "Abr", value: 173 },
      { label: "May", value: 182 },
      { label: "Jun", value: Math.round(laboratoryRevenue / 1000) },
    ],
    occupancyByBranch: [
      { label: "Aguilares", value: 86 },
      { label: "Chalatenango", value: 82 },
      { label: "Constitucion", value: 73 },
      { label: "La Libertad", value: 88 },
      { label: "Merliot 2", value: 79 },
      { label: "Plaza Sur", value: 78 },
      { label: "Santa Tecla", value: 76 },
    ],
  },
  {
    key: "imagenes",
    companyName: "Analiza Imagenes",
    shortName: "Imagenes",
    scopeName: "Linea de negocio",
    revenue: 67500,
    revenueGrowthRate: 6,
    collectedRevenue: 60400,
    accountsReceivable: 7100,
    revenueTarget: 82000,
    financialHealth: 74,
    operatingHealth: 80,
    fixedExpenses: 37400,
    variableExpenses: 14900,
    fixedCosts: 28600,
    variableCosts: 9800,
    marginRate: 0.27,
    marginDeltaPoints: 1,
    scheduledAppointments: 668,
    completedAppointments: 521,
    noShows: 66,
    cancelledAppointments: 47,
    rescheduledAppointments: 34,
    effectiveOccupancy: 63,
    scheduledOccupancy: 70,
    serviceVolume: 1940,
    patientCount: 620,
    averageTicket: 109,
    executiveStatus: "verde",
    executiveInterpretation:
      "Imagenes mantiene margen positivo y ocupacion estable, con oportunidad de llenar horarios vespertinos.",
    sourceNote: "DEMO imagenes",
    alert: "Capacidad ociosa y costos fijos de equipo pendientes.",
    monthlyRevenue: [
      { label: "Ene", value: 49 },
      { label: "Feb", value: 52 },
      { label: "Mar", value: 58 },
      { label: "Abr", value: 55 },
      { label: "May", value: 63 },
      { label: "Jun", value: 68 },
    ],
    occupancyByBranch: [
      { label: "Este", value: 63 },
      { label: "Centro", value: 67 },
      { label: "Sur", value: 58 },
    ],
  },
];

export function getBusinessLinesForDashboard({
  branchId,
  branchName,
  businessLineCode,
  businessLineId,
  businessLineName,
  channelId,
  companyId,
  companyName,
  countryId,
  countryName,
  managerId,
  managerName,
  operationalAreaId,
  operationalAreaName,
  payerId,
  periodEnd,
  periodStart,
  professionalId,
  serviceId,
}: GlobalFilterInput) {
  return getExecutiveBiSnapshot({
    branchId,
    branchName,
    businessLineCode,
    businessLineId,
    businessLineName,
    channelId,
    companyId,
    companyName,
    countryId,
    countryName,
    managerId,
    managerName,
    operationalAreaId,
    operationalAreaName,
    payerId,
    periodEnd,
    periodStart,
    professionalId,
    serviceId,
  }).lines.map(mapSemanticLineToDashboard);
}

export function getExecutiveKpisForDashboard(context: GlobalFilterInput) {
  return getExecutiveBiSnapshot(context).kpis.map((kpi): ExecutiveKpi => ({
    change: kpi.status === "blocked" ? "Bloqueado" : "Filtrado",
    definition: kpi.note,
    formula: "Contrato semantico Sprint 2",
    label: kpi.label,
    source: "Capa BI semantica DEMO",
    tone:
      kpi.status === "blocked"
        ? "negative"
        : kpi.status === "pending"
          ? "warning"
          : "positive",
    updatedAt: "Contexto activo",
    value: kpi.value,
  }));
}

export function getExecutiveBranchRowsForDashboard(
  context: GlobalFilterInput,
): ExecutiveBranchRow[] {
  return getExecutiveBiSnapshot(context).branchRows;
}

export function getExecutiveManagerRowsForDashboard(
  context: GlobalFilterInput,
): ExecutiveManagerRow[] {
  return getExecutiveBiSnapshot(context).managerRows;
}

export function getNoDataReasonForDashboard(context: GlobalFilterInput) {
  return getExecutiveBiSnapshot(context).noDataReason;
}

export function getInsightPreviewsForDashboard(
  context: GlobalFilterInput,
): InsightPreview[] {
  return getExecutiveBiSnapshot(context).insights.map((insight) => ({
    affectedIndicator: insight.affectedIndicator,
    priority: insight.priority,
    recommendation: insight.recommendation,
    title: insight.title,
  }));
}

export function getRevenueShareData(lines: BusinessLineDashboard[]): BarPoint[] {
  const totalRevenue = lines.reduce((sum, line) => sum + line.revenue, 0);

  return lines.map((line) => ({
    label: line.shortName,
    value:
      totalRevenue > 0 ? Math.round((line.revenue / totalRevenue) * 100) : 0,
  }));
}

export function getTargetVsActualByLine(
  lines: BusinessLineDashboard[],
): BarPoint[] {
  return lines.flatMap((line) => [
    { label: `${line.shortName} meta`, value: Math.round(line.revenueTarget / 1000) },
    { label: `${line.shortName} real`, value: Math.round(line.revenue / 1000) },
  ]);
}

export function getAppointmentStatusByLine(
  lines: BusinessLineDashboard[],
): BarPoint[] {
  return lines.flatMap((line) => {
    if (line.key === "laboratorio") {
      return [
        {
          label: lines.length === 1 ? "Ordenes creadas" : "Laboratorio ordenes",
          value: line.scheduledAppointments,
        },
        {
          label:
            lines.length === 1
              ? "Pacientes recibidos"
              : "Laboratorio pacientes",
          value: line.completedAppointments,
        },
        {
          label: lines.length === 1 ? "Muestras tomadas" : "Laboratorio muestras",
          value: Math.round(line.completedAppointments * 0.98),
        },
        {
          label:
            lines.length === 1
              ? "Resultados pendientes"
              : "Laboratorio resultados pendientes",
          value: Math.round(line.scheduledAppointments * 0.04),
        },
      ];
    }

    if (line.key === "imagenes") {
      return [
        {
          label:
            lines.length === 1
              ? "Estudios agendados"
              : "Imagenes estudios agendados",
          value: line.scheduledAppointments,
        },
        {
          label:
            lines.length === 1 ? "Estudios realizados" : "Imagenes realizados",
          value: line.completedAppointments,
        },
        {
          label:
            lines.length === 1 ? "Informes pendientes" : "Imagenes pendientes",
          value: Math.round(line.completedAppointments * 0.07),
        },
        {
          label: lines.length === 1 ? "Canceladas" : "Imagenes canceladas",
          value: line.cancelledAppointments,
        },
      ];
    }

    return [
      {
        label:
          lines.length === 1 ? "Citas completadas" : `${line.shortName} citas`,
        value: line.completedAppointments,
      },
      {
        label: lines.length === 1 ? "No-show" : `${line.shortName} no-show`,
        value: line.noShows,
      },
      {
        label: lines.length === 1 ? "Canceladas" : `${line.shortName} canceladas`,
        value: line.cancelledAppointments,
      },
      {
        label:
          lines.length === 1
            ? "Reprogramadas"
            : `${line.shortName} reprogramadas`,
        value: line.rescheduledAppointments,
      },
    ];
  });
}

export function getOccupancyByLine(lines: BusinessLineDashboard[]): BarPoint[] {
  return lines.flatMap((line) =>
    line.occupancyByBranch.map((point) => ({
      label: lines.length === 1 ? point.label : `${line.shortName} ${point.label}`,
      value: point.value,
    })),
  );
}

export function getManagerPerformanceByLine(
  lines: BusinessLineDashboard[],
): BarPoint[] {
  return lines.map((line) => ({
    label: line.shortName,
    value: Math.round(
      line.financialHealth * 0.35 +
        line.operatingHealth * 0.35 +
        Math.min((line.revenue / line.revenueTarget) * 100, 120) * 0.3,
    ),
  }));
}

export const demoDashboardMeta = {
  environment: "DEMO",
  selectedPeriod: "Contexto activo",
  lastUpdated: "2026-07-20 09:00",
  dataCoverage: "6 sucursales DEMO",
  completeness: 82,
  sources: [
    "Carga manual DEMO",
    "Facturacion DEMO",
    "Citas DEMO",
    "Capacidad DEMO",
  ],
};

export const executiveKpis: ExecutiveKpi[] = [
  {
    label: "Ingresos facturados",
    value: "$248.6K",
    change: "+8.4%",
    tone: "positive",
    definition: "Total facturado en el periodo seleccionado.",
    formula: "sum(invoice_net_amount)",
    source: "Facturacion DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Ingresos cobrados",
    value: "$211.9K",
    change: "+5.1%",
    tone: "positive",
    definition: "Cobros aplicados a facturas del periodo.",
    formula: "sum(payment_amount)",
    source: "Cobros DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Cuentas por cobrar",
    value: "$36.7K",
    change: "+3.3%",
    tone: "warning",
    definition: "Facturacion neta menos cobros aplicados.",
    formula: "net_invoicing - collections",
    source: "Facturacion DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Pacientes o clientes atendidos",
    value: "3,842",
    change: "+6.2%",
    tone: "positive",
    definition: "Personas atendidas con identificador anonimo.",
    formula: "count(distinct anonymous_patient_id)",
    source: "Servicios DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Citas agendadas",
    value: "5,418",
    change: "+4.8%",
    tone: "positive",
    definition: "Citas aplicables agendadas en el periodo.",
    formula: "count(appointments)",
    source: "Citas DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Citas completadas",
    value: "4,876",
    change: "+3.9%",
    tone: "positive",
    definition: "Citas con estado normalizado completed.",
    formula: "completed / applicable_scheduled",
    source: "Citas DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Cancelaciones",
    value: "318",
    change: "-1.2%",
    tone: "positive",
    definition: "Citas canceladas por paciente o sucursal.",
    formula: "cancelled / applicable_scheduled",
    source: "Citas DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "No-shows",
    value: "224",
    change: "+2.8%",
    tone: "warning",
    definition: "Citas agendadas aplicables con no asistencia.",
    formula: "no_show / applicable_scheduled",
    source: "Citas DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Servicios realizados",
    value: "7,140",
    change: "+7.0%",
    tone: "positive",
    definition: "Servicios completados en unidades habilitadas.",
    formula: "count(service_events)",
    source: "Servicios DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Ticket promedio",
    value: "$64.70",
    change: "+1.5%",
    tone: "positive",
    definition: "Ingreso facturado dividido entre servicios o visitas.",
    formula: "net_revenue / completed_visits",
    source: "Facturacion DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Ocupacion agendada",
    value: "78%",
    change: "+4 pp",
    tone: "positive",
    definition: "Minutos agendados sobre minutos disponibles.",
    formula: "scheduled_minutes / available_minutes",
    source: "Capacidad DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Ocupacion efectiva",
    value: "69%",
    change: "+2 pp",
    tone: "warning",
    definition: "Minutos completados o atendidos sobre minutos disponibles.",
    formula: "attended_minutes / available_minutes",
    source: "Capacidad DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Brecha de asistencia",
    value: "9 pp",
    change: "+2 pp",
    tone: "warning",
    definition: "Diferencia entre ocupacion agendada y efectiva.",
    formula: "scheduled_occupancy - effective_occupancy",
    source: "Capacidad DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Capacidad disponible",
    value: "1,284 h",
    change: "-3.1%",
    tone: "neutral",
    definition: "Horas configuradas y disponibles para atencion.",
    formula: "sum(available_minutes) / 60",
    source: "Capacidad DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Margen contribucion estimado",
    value: "34%",
    change: "-1.6 pp",
    tone: "warning",
    definition: "Margen calculado solo con costos directos cargados.",
    formula: "(net_revenue - direct_costs) / net_revenue",
    source: "Finanzas DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Meta de ingresos",
    value: "91%",
    change: "+6 pp",
    tone: "positive",
    definition: "Ingresos facturados contra meta configurada.",
    formula: "actual_revenue / revenue_target",
    source: "Metas DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Meta operativa",
    value: "87%",
    change: "+4 pp",
    tone: "positive",
    definition: "Resultado operativo contra meta configurada.",
    formula: "actual_operating_metric / operating_target",
    source: "Metas DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
  {
    label: "Variacion anual",
    value: "+12.3%",
    change: "YoY",
    tone: "positive",
    definition: "Variacion contra mismo periodo del anio anterior.",
    formula: "(current_period - prior_year_period) / prior_year_period",
    source: "Analytics DEMO",
    updatedAt: demoDashboardMeta.lastUpdated,
  },
];

export const revenueByMonth: BarPoint[] = [
  { label: "Ene", value: 178 },
  { label: "Feb", value: 186 },
  { label: "Mar", value: 205 },
  { label: "Abr", value: 198 },
  { label: "May", value: 226 },
  { label: "Jun", value: 249 },
];

export const revenueByCompany: BarPoint[] = [
  { label: "Fisioterapia", value: 42 },
  { label: "Laboratorio", value: 35 },
  { label: "Imagenes", value: 23 },
];

export const appointmentStatus: BarPoint[] = [
  { label: "Completadas", value: 4876 },
  { label: "Canceladas", value: 318 },
  { label: "No-show", value: 224 },
  { label: "Reprogramadas", value: 412 },
];

export const occupancyByUnit: BarPoint[] = [
  { label: "Fisioterapia", value: 74 },
  { label: "Laboratorio", value: 68 },
  { label: "Imagenes", value: 63 },
];

export const targetVsActual: BarPoint[] = [
  { label: "Meta", value: 273 },
  { label: "Real", value: 249 },
];

export const managerPerformance: BarPoint[] = [
  { label: "Sucursal Norte", value: 86 },
  { label: "Central", value: 82 },
  { label: "Este", value: 77 },
  { label: "Centro", value: 74 },
];

export const insightPreviews: InsightPreview[] = [
  {
    title: "Ocupacion agendada alta con brecha efectiva",
    priority: "alta",
    affectedIndicator: "Brecha de asistencia",
    recommendation: "Revisar confirmaciones, recordatorios y causas de no-show.",
  },
  {
    title: "Crecimiento de ingresos con margen presionado",
    priority: "media",
    affectedIndicator: "Margen contribucion estimado",
    recommendation: "Comparar mezcla de servicios y costos directos por unidad.",
  },
  {
    title: "Datos de capacidad incompletos en sucursales DEMO",
    priority: "media",
    affectedIndicator: "Completitud",
    recommendation: "Completar horarios antes de presentar conclusiones ejecutivas.",
  },
];
