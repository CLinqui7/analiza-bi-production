import type {
  TrendChartOption,
  TrendInsight,
  TrendSeries,
} from "@/components/analytics-comparison-chart";
import {
  elSalvadorBranchResultTemplates,
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";

export type LaboratoryMetricGroup =
  | "Validacion"
  | "Resultado"
  | "Finanzas"
  | "Volumen"
  | "Canales"
  | "Riesgo";

export type LaboratoryMetric = {
  group: LaboratoryMetricGroup;
  label: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
  value: string;
};

export type LaboratorySlideStatus =
  | "Listo"
  | "Requiere explicacion"
  | "Pendiente de fuente"
  | "Decision CEO"
  | "Bloqueado";

export type LaboratoryValidationStatus =
  | "Validado"
  | "Requiere confirmacion"
  | "Bloqueado";

export type LaboratorySlide = {
  action: string;
  evidence: string;
  id: string;
  kpis: { label: string; value: string }[];
  narrative: string;
  status: LaboratorySlideStatus;
  title: string;
};

export type LaboratoryDoctor = {
  municipality: string;
  name: string;
  orders: number;
  revenue: number;
  specialty: string;
  ticket: number;
};

export type LaboratoryVisitor = {
  activeDoctors: number;
  doctorsRecovered: number;
  growthRate: number;
  name: string;
  orders: number;
  revenue: number;
  status: "Cartera concentrada" | "Cartera saludable" | "Reactivar cartera";
};

export type LaboratoryBranchRecord = {
  id: string;
  branch: string;
  branchCode: string;
  city: string;
  manager: string;
  areaManager: string;
  period: string;
  fileName: string;
  filePeriod: string;
  workbookPeriod: string;
  salesPeriod: string;
  uploadDate: string;
  closeDate: string;
  presentationVersion: string;
  dataQualityScore: number;
  validationStatus: LaboratoryValidationStatus;
  validationFindings: string[];
  formulaErrors: string[];
  revenueTarget: number;
  actualRevenue: number;
  netRevenue: number;
  revenueCompletionTotalRate: number;
  revenueCompletionNetRate: number;
  monthlyRevenueGrowthRate: number;
  samePeriodGrowthRate: number;
  projectedRevenue: number | null;
  dailyRequiredRevenue: number;
  averageDailyRevenue: number;
  costOfSale: number;
  marginAmount: number;
  marginRate: number;
  operatingExpenses: number;
  operatingProfit: number;
  operatingProfitRate: number;
  orders: number;
  previousOrders: number;
  orderGrowthRate: number;
  clients: number;
  previousClients: number;
  clientGrowthRate: number;
  ordersPerClient: number;
  ticketAverage: number;
  previousTicketAverage: number;
  ticketGrowthRate: number;
  analyzeRevenue: number;
  analyzeOrders: number;
  drsvRevenue: number;
  drsvOrders: number;
  medicalRevenue: number;
  medicalOrders: number;
  medicalTicket: number;
  medicalRevenueGrowthRate: number;
  medicalOrdersGrowthRate: number;
  medicalActiveDoctors: number;
  medicalInactiveDoctors: number;
  topMedicalConcentrationRate: number;
  visitors: LaboratoryVisitor[];
  doctors: LaboratoryDoctor[];
  demandHeatmap: number[][];
  peakHoursShare: number;
  peakHoursLabel: string;
  topSalesDays: string[];
  inventoryConsumablesAmount: number;
  inventorySuppliesAmount: number;
  inventoryReactivesAmount: number;
  inventoryConsumablesQty: number;
  inventorySuppliesQty: number;
  inventoryReactivesQty: number;
  inventoryTotalAmount: number;
  inventoryGrowthRate: number;
  reactiveGrowthRate: number;
  mysteryShopperScore: number;
  coffeeCups: number;
  pendingSources: string[];
  managerExplanationRequired: string[];
  actionPriority: string;
  ceoDecision: string;
  actionPlan: {
    action: string;
    dueDate: string;
    expectedImpact: string;
    kpi: string;
    owner: string;
    status: "Pendiente" | "En curso" | "Completado";
  }[];
  requiredDecisions: {
    benefit: string;
    cost: string;
    decision: string;
    evidence: string;
    urgency: "Alta" | "Media" | "Baja";
  }[];
  trend: {
    clients: number[];
    drsvRevenue: number[];
    inventory: number[];
    margin: number[];
    medicalRevenue: number[];
    orders: number[];
    revenue: number[];
    ticket: number[];
  };
};

const exactDateLabels = [
  "01/06/2026",
  "05/06/2026",
  "10/06/2026",
  "15/06/2026",
  "20/06/2026",
  "25/06/2026",
  "30/06/2026",
];

const trendColors: TrendSeries["color"][] = [
  "blue",
  "orange",
  "teal",
  "green",
  "rose",
];

const labDoctors: LaboratoryDoctor[] = [
  {
    municipality: "San Salvador",
    name: "Dr. Martinez",
    orders: 94,
    revenue: 3140,
    specialty: "Medicina interna",
    ticket: 33,
  },
  {
    municipality: "Aguilares",
    name: "Dra. Hernandez",
    orders: 82,
    revenue: 2760,
    specialty: "Ginecologia",
    ticket: 34,
  },
  {
    municipality: "Apopa",
    name: "Dr. Rivera",
    orders: 68,
    revenue: 2410,
    specialty: "Medicina general",
    ticket: 35,
  },
  {
    municipality: "Chalatenango",
    name: "Dra. Lopez",
    orders: 54,
    revenue: 2180,
    specialty: "Pediatria",
    ticket: 40,
  },
];

const labVisitors: LaboratoryVisitor[] = [
  {
    activeDoctors: 32,
    doctorsRecovered: 4,
    growthRate: 0.22,
    name: "Visitador Norte",
    orders: 310,
    revenue: 8200,
    status: "Cartera saludable",
  },
  {
    activeDoctors: 18,
    doctorsRecovered: 1,
    growthRate: 0.08,
    name: "Visitador Centro",
    orders: 190,
    revenue: 5200,
    status: "Cartera concentrada",
  },
  {
    activeDoctors: 14,
    doctorsRecovered: 0,
    growthRate: -0.04,
    name: "Visitador Occidente",
    orders: 126,
    revenue: 3300,
    status: "Reactivar cartera",
  },
];

function buildVolumePoints(value: number, startFactor = 0.64) {
  return [startFactor, 0.7, 0.78, 0.84, 0.9, 0.96, 1].map((factor) =>
    Math.round(value * factor),
  );
}

function buildRatePoints(value: number) {
  const percent = Math.round(value * 100);

  return [percent - 4, percent - 2, percent - 1, percent, percent + 1, percent, percent].map(
    (point) => Math.max(0, Math.min(100, point)),
  );
}

function resolveValidationStatus({
  filePeriod,
  validationFlags,
  workbookPeriod,
}: {
  filePeriod: string;
  validationFlags: string[];
  workbookPeriod: string;
}): LaboratoryValidationStatus {
  if (/no coincide|proyeccion esta muy por encima|muy por encima/i.test(validationFlags.join(" "))) {
    return "Bloqueado";
  }

  if (filePeriod !== workbookPeriod || validationFlags.length > 1) {
    return "Requiere confirmacion";
  }

  return "Validado";
}

function createLabRecord(
  template: (typeof elSalvadorBranchResultTemplates)[number],
  index: number,
): LaboratoryBranchRecord {
  const isAguilares = template.branchCode === "L033";
  const actualRevenue = template.actualRevenue;
  const netCompletionRate = template.netRevenue / Math.max(template.revenueTarget, 1);
  const orders = isAguilares
    ? 1979
    : Math.max(680, Math.round(template.rowCounts.salesRows / (template.rowCounts.salesRows > 15000 ? 9 : 4)));
  const previousOrders = isAguilares
    ? 2133
    : Math.round(orders * (index % 2 === 0 ? 1.05 : 0.96));
  const clients = isAguilares ? 1804 : Math.round(orders * 0.91);
  const previousClients = isAguilares
    ? Math.round(clients / 0.978)
    : Math.round(clients * (index % 2 === 0 ? 1.02 : 0.98));
  const ticketAverage = actualRevenue / Math.max(orders, 1);
  const previousTicketAverage = isAguilares
    ? ticketAverage / 1.237
    : ticketAverage * (index % 2 === 0 ? 0.94 : 1.03);
  const analyzeRevenue = actualRevenue * (isAguilares ? 0.62 : 0.58 + index * 0.01);
  const drsvRevenue = actualRevenue - analyzeRevenue;
  const drsvOrders = Math.round(orders * (isAguilares ? 0.82 : 0.76 + index * 0.02));
  const analyzeOrders = Math.max(0, orders - drsvOrders);
  const medicalRevenue = actualRevenue * (0.28 + index * 0.015);
  const medicalOrders = Math.round(orders * (0.2 + index * 0.01));
  const operatingExpenses = isAguilares ? 6671 : Math.round(actualRevenue * (0.18 + index * 0.006));
  const operatingProfit = actualRevenue - template.costOfSale - operatingExpenses;
  const inventoryTotalAmount = isAguilares
    ? 5476
    : Math.round(template.costOfSale * (1.15 + index * 0.06));
  const validationStatus = resolveValidationStatus({
    filePeriod: template.filePeriod,
    validationFlags: template.validationFlags,
    workbookPeriod: template.workbookPeriod,
  });

  return {
    actionPlan: [
      {
        action: "Recuperar medicos sin actividad",
        dueDate: "2026-07-15",
        expectedImpact: "+$1,500 venta medica",
        kpi: "Venta medica",
        owner: "Visitador medico",
        status: "Pendiente",
      },
      {
        action: "Revisar inventario de reactivos",
        dueDate: "2026-07-10",
        expectedImpact: "Reducir cobertura innecesaria",
        kpi: "Inventario",
        owner: template.manager,
        status: "En curso",
      },
      {
        action: "Reforzar atencion 6-9 a.m.",
        dueDate: "2026-07-05",
        expectedImpact: "-15% tiempo de espera",
        kpi: "Demanda horaria",
        owner: template.manager,
        status: "Pendiente",
      },
    ],
    actionPriority:
      isAguilares
        ? "Explicar crecimiento por ticket y mezcla comercial, no por volumen."
        : "Reconciliar periodo, proyeccion y diferencias entre hojas antes de presentar.",
    actualRevenue,
    analyzeOrders,
    analyzeRevenue,
    areaManager: template.areaManager,
    averageDailyRevenue: actualRevenue / 22,
    branch: template.branchName,
    branchCode: template.branchCode,
    ceoDecision:
      isAguilares
        ? "Definir si la meta se mide con IVA o sin IVA antes de aprobar el resultado."
        : "Aprobar regla de conciliacion de plantilla y correccion de proyeccion.",
    city: template.city,
    clientGrowthRate: clients / Math.max(previousClients, 1) - 1,
    clients,
    closeDate: "2026-06-30",
    coffeeCups: 420 + index * 34,
    costOfSale: template.costOfSale,
    dailyRequiredRevenue: Math.max(template.revenueTarget - actualRevenue, 0) / 5,
    dataQualityScore: template.dataQualityScore,
    demandHeatmap: [
      [72 + index, 92, 86, 48, 34],
      [76 + index, 95, 82, 52, 38],
      [64 + index, 88, 76, 45, 32],
      [60 + index, 82, 71, 42, 30],
      [74 + index, 90, 84, 50, 36],
    ],
    doctors: labDoctors.map((doctor) => ({
      ...doctor,
      orders: Math.round(doctor.orders * (0.84 + index * 0.04)),
      revenue: Math.round(doctor.revenue * (0.82 + index * 0.05)),
    })),
    drsvOrders,
    drsvRevenue,
    fileName: template.fileName,
    filePeriod: template.filePeriod,
    formulaErrors:
      validationStatus === "Validado"
        ? []
        : ["#N/A", "#DIV/0!", "TODAY() dinamico"],
    id: template.id,
    inventoryConsumablesAmount: Math.round(inventoryTotalAmount * 0.22),
    inventoryConsumablesQty: 180 + index * 16,
    inventoryGrowthRate: isAguilares ? 0.127 : 0.08 + index * 0.012,
    inventoryReactivesAmount: Math.round(inventoryTotalAmount * 0.58),
    inventoryReactivesQty: 88 + index * 7,
    inventorySuppliesAmount: Math.round(inventoryTotalAmount * 0.2),
    inventorySuppliesQty: 130 + index * 11,
    inventoryTotalAmount,
    manager: template.manager,
    managerExplanationRequired: [
      "Explicar la variacion de venta separando volumen, ticket y mezcla de canales.",
      "Confirmar si la meta esta definida con IVA o sin IVA.",
      "Justificar variaciones de inventario frente a ordenes del mes.",
      "Documentar diferencias entre Evaluacion, YTD y datos fuente.",
    ],
    marginAmount: template.marginAmount,
    marginRate: template.marginRate,
    medicalActiveDoctors: 70 + index * 8,
    medicalInactiveDoctors: 18 + index * 3,
    medicalOrders,
    medicalOrdersGrowthRate: isAguilares ? 0.06 : 0.03 + index * 0.01,
    medicalRevenue,
    medicalRevenueGrowthRate: isAguilares ? 0.3 : 0.08 + index * 0.02,
    medicalTicket: medicalRevenue / Math.max(medicalOrders, 1),
    monthlyRevenueGrowthRate: isAguilares ? 0.21 : 0.05 + index * 0.025,
    mysteryShopperScore: 82 - index,
    netRevenue: template.netRevenue,
    operatingExpenses,
    operatingProfit,
    operatingProfitRate: operatingProfit / Math.max(actualRevenue, 1),
    orderGrowthRate: orders / Math.max(previousOrders, 1) - 1,
    orders,
    ordersPerClient: orders / Math.max(clients, 1),
    peakHoursLabel: "6:00 a 9:00 a.m.",
    peakHoursShare: isAguilares ? 0.85 : 0.74 + index * 0.02,
    pendingSources: [
      "SLA de resultados y ordenes pendientes",
      "Muestras rechazadas, recolecciones repetidas y pruebas repetidas",
      "Utilizacion de analizadores y tiempo de equipo detenido",
      "Consumo real, rotacion, vencimientos y dias de inventario",
      "Pacientes nuevos y recurrentes identificados individualmente",
      "Servicios realizados sin facturar",
    ],
    period: "Junio 2026",
    presentationVersion:
      validationStatus === "Validado" ? "v1.0 lista" : "v0.9 revision",
    previousClients,
    previousOrders,
    previousTicketAverage,
    projectedRevenue: template.projectedRevenue,
    reactiveGrowthRate: isAguilares ? 0.228 : 0.11 + index * 0.018,
    requiredDecisions: [
      {
        benefit: "Evitar presentar cumplimiento contradictorio al CEO",
        cost: "Regla de negocio y ajuste de plantilla",
        decision: "Definir meta con IVA o sin IVA",
        evidence: `${formatRate(template.revenueCompletionRate)} con venta total versus ${formatRate(netCompletionRate)} con venta sin IVA`,
        urgency: "Alta",
      },
      {
        benefit: "Mejorar venta medica y recuperar cartera",
        cost: "$600 campana de visitadores",
        decision: "Aprobar reactivacion de medicos",
        evidence: `${formatRate(isAguilares ? 0.3 : 0.08 + index * 0.02)} crecimiento de venta medica`,
        urgency: "Media",
      },
    ],
    revenueCompletionNetRate: netCompletionRate,
    revenueCompletionTotalRate: template.revenueCompletionRate,
    revenueTarget: template.revenueTarget,
    salesPeriod: template.salesPeriod,
    samePeriodGrowthRate: 0.12 + index * 0.01,
    ticketAverage,
    ticketGrowthRate: ticketAverage / Math.max(previousTicketAverage, 1) - 1,
    topMedicalConcentrationRate: 0.42 + index * 0.025,
    topSalesDays: ["Lunes", "Martes", "Viernes"],
    uploadDate: "2026-07-01",
    validationFindings: [
      ...template.validationFlags,
      `${formatRate(template.revenueCompletionRate)} de cumplimiento usando venta total, pero ${formatRate(netCompletionRate)} usando venta sin IVA.`,
      "La proyeccion debe calcularse en backend con periodo cerrado, no con formulas locales del Excel.",
      "Evaluacion, YTD y datos fuente deben reconciliarse antes de generar version oficial.",
    ],
    validationStatus,
    visitors: labVisitors.map((visitor) => ({
      ...visitor,
      orders: Math.round(visitor.orders * (0.8 + index * 0.04)),
      revenue: Math.round(visitor.revenue * (0.78 + index * 0.05)),
    })),
    workbookPeriod: template.workbookPeriod,
    trend: {
      clients: buildVolumePoints(clients, 0.66),
      drsvRevenue: buildVolumePoints(drsvRevenue, 0.62),
      inventory: buildVolumePoints(inventoryTotalAmount, 0.74),
      margin: buildRatePoints(template.marginRate),
      medicalRevenue: buildVolumePoints(medicalRevenue, 0.58),
      orders: buildVolumePoints(orders, 0.66),
      revenue: buildVolumePoints(actualRevenue, 0.58),
      ticket: buildVolumePoints(ticketAverage, 0.82),
    },
  };
}

export const laboratoryBranchRecords: LaboratoryBranchRecord[] =
  elSalvadorBranchResultTemplates.map(createLabRecord);

function metricTone(value: number, goodThreshold: number, warningThreshold: number) {
  if (value >= goodThreshold) {
    return "positive" as const;
  }

  if (value >= warningThreshold) {
    return "warning" as const;
  }

  return "negative" as const;
}

export function buildLaboratoryMetrics(
  records: LaboratoryBranchRecord[],
): LaboratoryMetric[] {
  const totalRevenue = records.reduce((sum, record) => sum + record.actualRevenue, 0);
  const totalNetRevenue = records.reduce((sum, record) => sum + record.netRevenue, 0);
  const totalTarget = records.reduce((sum, record) => sum + record.revenueTarget, 0);
  const totalCost = records.reduce((sum, record) => sum + record.costOfSale, 0);
  const totalProfit = records.reduce((sum, record) => sum + record.operatingProfit, 0);
  const totalOrders = records.reduce((sum, record) => sum + record.orders, 0);
  const totalClients = records.reduce((sum, record) => sum + record.clients, 0);
  const totalMedicalRevenue = records.reduce(
    (sum, record) => sum + record.medicalRevenue,
    0,
  );
  const totalDrsvRevenue = records.reduce((sum, record) => sum + record.drsvRevenue, 0);
  const totalAnalyzeRevenue = records.reduce(
    (sum, record) => sum + record.analyzeRevenue,
    0,
  );
  const totalInventory = records.reduce(
    (sum, record) => sum + record.inventoryTotalAmount,
    0,
  );
  const averageQuality =
    records.reduce((sum, record) => sum + record.dataQualityScore, 0) /
    Math.max(records.length, 1);
  const blockedOrPending = records.filter(
    (record) => record.validationStatus !== "Validado",
  ).length;
  const pendingSources = records.reduce(
    (sum, record) => sum + record.pendingSources.length,
    0,
  );
  const averageTicket = totalRevenue / Math.max(totalOrders, 1);
  const averageMargin = (totalRevenue - totalCost) / Math.max(totalRevenue, 1);

  return [
    {
      group: "Validacion",
      label: "Calidad de datos",
      note: "plantillas SV",
      tone: metricTone(averageQuality, 84, 74),
      value: `${Math.round(averageQuality)}`,
    },
    {
      group: "Validacion",
      label: "Sucursales a confirmar",
      note: "periodo, YTD o proyeccion",
      tone: blockedOrPending > 0 ? "warning" : "positive",
      value: `${blockedOrPending}`,
    },
    {
      group: "Validacion",
      label: "Fuentes pendientes",
      note: "SLA, muestras, analizadores e inventario",
      tone: pendingSources > 30 ? "negative" : "warning",
      value: `${pendingSources}`,
    },
    {
      group: "Resultado",
      label: "Venta total",
      note: `${formatRate(totalRevenue / Math.max(totalTarget, 1))} de meta`,
      tone: totalRevenue >= totalTarget ? "positive" : "warning",
      value: formatCurrency(totalRevenue),
    },
    {
      group: "Resultado",
      label: "Venta sin IVA",
      note: `${formatRate(totalNetRevenue / Math.max(totalTarget, 1))} de meta`,
      tone: totalNetRevenue >= totalTarget ? "positive" : "warning",
      value: formatCurrency(totalNetRevenue),
    },
    {
      group: "Resultado",
      label: "Ticket promedio",
      note: "venta / orden",
      tone: averageTicket >= 15 ? "positive" : "warning",
      value: formatCurrency(averageTicket),
    },
    {
      group: "Finanzas",
      label: "Costo de venta",
      note: "reactivos, insumos y pruebas",
      tone: "neutral",
      value: formatCurrency(totalCost),
    },
    {
      group: "Finanzas",
      label: "Margen",
      note: "antes de gastos operativos",
      tone: metricTone(averageMargin, 0.84, 0.78),
      value: formatRate(averageMargin),
    },
    {
      group: "Finanzas",
      label: "Utilidad operativa",
      note: "requiere reconciliacion YTD",
      tone: totalProfit > 0 ? "positive" : "warning",
      value: formatCurrency(totalProfit),
    },
    {
      group: "Volumen",
      label: "Ordenes",
      note: "unidad operativa laboratorio",
      tone: "neutral",
      value: totalOrders.toLocaleString("en-US"),
    },
    {
      group: "Volumen",
      label: "Clientes",
      note: "plantilla mensual",
      tone: "neutral",
      value: totalClients.toLocaleString("en-US"),
    },
    {
      group: "Volumen",
      label: "Ordenes por cliente",
      note: "frecuencia del periodo",
      tone: "positive",
      value: (totalOrders / Math.max(totalClients, 1)).toFixed(2),
    },
    {
      group: "Canales",
      label: "Analiza",
      note: "mayor venta, menor volumen",
      tone: "positive",
      value: formatCurrency(totalAnalyzeRevenue),
    },
    {
      group: "Canales",
      label: "Doctor SV / DRSV",
      note: "mayor volumen de ordenes",
      tone: "warning",
      value: formatCurrency(totalDrsvRevenue),
    },
    {
      group: "Canales",
      label: "Ordenes medicas",
      note: "motores por medico y especialidad",
      tone: "positive",
      value: formatCurrency(totalMedicalRevenue),
    },
    {
      group: "Riesgo",
      label: "Inventario",
      note: "requiere rotacion y consumo real",
      tone: "warning",
      value: formatCurrency(totalInventory),
    },
    {
      group: "Riesgo",
      label: "Pico 6-9 a.m.",
      note: "demanda concentrada",
      tone: "warning",
      value: "85%",
    },
    {
      group: "Riesgo",
      label: "SLA resultados",
      note: "pendiente de fuente",
      tone: "warning",
      value: "Pendiente",
    },
  ];
}

export function buildLaboratorySlides(
  record: LaboratoryBranchRecord,
): LaboratorySlide[] {
  return [
    {
      action:
        record.validationStatus === "Validado"
          ? "Generar version oficial."
          : "Confirmar periodo, hoja y fuente antes de consolidar.",
      evidence: record.validationFindings.join(" "),
      id: "slide-1",
      kpis: [
        { label: "Archivo", value: record.fileName },
        { label: "Periodo archivo", value: record.filePeriod },
        { label: "Periodo hoja", value: record.workbookPeriod },
        { label: "Calidad", value: `${record.dataQualityScore}` },
      ],
      narrative:
        "La portada debe advertir cuando nombre de archivo, periodo de plantilla y periodo seleccionado no coinciden.",
      status: record.validationStatus === "Validado" ? "Listo" : "Requiere explicacion",
      title: "1. Portada y estado de datos",
    },
    {
      action: record.actionPriority,
      evidence: `${formatCurrency(record.actualRevenue)} de venta, ${formatRate(record.revenueCompletionTotalRate)} con venta total y ${formatRate(record.revenueCompletionNetRate)} con venta sin IVA.`,
      id: "slide-2",
      kpis: [
        { label: "Meta", value: formatCurrency(record.revenueTarget) },
        { label: "Venta", value: formatCurrency(record.actualRevenue) },
        { label: "Ordenes", value: record.orders.toLocaleString("en-US") },
        { label: "Ticket", value: formatCurrency(record.ticketAverage) },
      ],
      narrative:
        "El resumen debe explicar si la venta crecio por volumen, ticket, precio, canal o mezcla de pruebas.",
      status: "Requiere explicacion",
      title: "2. Resumen ejecutivo",
    },
    {
      action: "Si el periodo esta cerrado, mostrar proyeccion final versus resultado real.",
      evidence: `${formatRate(record.monthlyRevenueGrowthRate)} crecimiento mensual y ${formatCurrency(record.projectedRevenue)} de proyeccion en plantilla.`,
      id: "slide-3",
      kpis: [
        { label: "Venta acumulada", value: formatCurrency(record.actualRevenue) },
        { label: "Meta", value: formatCurrency(record.revenueTarget) },
        { label: "Pendiente", value: formatCurrency(Math.max(record.revenueTarget - record.actualRevenue, 0)) },
        { label: "Venta diaria", value: formatCurrency(record.averageDailyRevenue) },
      ],
      narrative:
        "La proyeccion no debe depender de TODAY() ni de dias en ingles mezclados con catalogos en espanol.",
      status: record.projectedRevenue === null ? "Pendiente de fuente" : "Requiere explicacion",
      title: "3. Meta, venta y proyeccion",
    },
    {
      action: "Enviar detalle completo a Salud financiera.",
      evidence: `${formatCurrency(record.actualRevenue)} venta, ${formatCurrency(record.costOfSale)} costo y ${formatCurrency(record.operatingExpenses)} gastos.`,
      id: "slide-4",
      kpis: [
        { label: "Venta total", value: formatCurrency(record.actualRevenue) },
        { label: "Venta sin IVA", value: formatCurrency(record.netRevenue) },
        { label: "Margen", value: formatRate(record.marginRate) },
        { label: "Utilidad", value: formatCurrency(record.operatingProfit) },
      ],
      narrative:
        "La slide financiera debe ser resumida: venta, costo, gastos y utilidad, sin duplicar Salud financiera.",
      status: "Listo",
      title: "4. Resultado financiero de la sucursal",
    },
    {
      action: "Separar volumen de valor para explicar el crecimiento real.",
      evidence: `${formatRate(record.orderGrowthRate)} ordenes, ${formatRate(record.clientGrowthRate)} clientes y ${formatRate(record.ticketGrowthRate)} ticket.`,
      id: "slide-5",
      kpis: [
        { label: "Ordenes", value: record.orders.toLocaleString("en-US") },
        { label: "Clientes", value: record.clients.toLocaleString("en-US") },
        { label: "Ordenes/cliente", value: record.ordersPerClient.toFixed(2) },
        { label: "Ticket", value: formatCurrency(record.ticketAverage) },
      ],
      narrative:
        "Esta slide debe decir si la venta subio por mas pacientes, mas ordenes, mayor ticket o cambio de canal.",
      status: "Listo",
      title: "5. Volumen, clientes y ticket",
    },
    {
      action: "Renombrar ocupacion de Doctor SV como participacion del canal.",
      evidence: `DRSV concentra cerca de ${formatRate(record.drsvOrders / Math.max(record.orders, 1))} de ordenes y ${formatRate(record.drsvRevenue / Math.max(record.actualRevenue, 1))} de venta.`,
      id: "slide-6",
      kpis: [
        { label: "Analiza venta", value: formatCurrency(record.analyzeRevenue) },
        { label: "DRSV venta", value: formatCurrency(record.drsvRevenue) },
        { label: "Analiza ordenes", value: record.analyzeOrders.toLocaleString("en-US") },
        { label: "DRSV ordenes", value: record.drsvOrders.toLocaleString("en-US") },
      ],
      narrative:
        "No todos los canales generan el mismo valor: DRSV puede traer volumen mientras Analiza concentra mas venta.",
      status: "Requiere explicacion",
      title: "6. Mezcla de canales",
    },
    {
      action: "Analizar medico -> especialidad -> pruebas solicitadas.",
      evidence: `${formatRate(record.medicalRevenueGrowthRate)} crecimiento de venta medica y ${formatRate(record.medicalOrdersGrowthRate)} crecimiento de ordenes.`,
      id: "slide-7",
      kpis: [
        { label: "Venta medica", value: formatCurrency(record.medicalRevenue) },
        { label: "Ordenes medicas", value: record.medicalOrders.toLocaleString("en-US") },
        { label: "Ticket medico", value: formatCurrency(record.medicalTicket) },
        { label: "Medicos activos", value: `${record.medicalActiveDoctors}` },
      ],
      narrative:
        "El canal medico debe explicar venta, ordenes, ticket, medicos activos, especialidades y concentracion.",
      status: "Listo",
      title: "7. Canal medico",
    },
    {
      action: "Evaluar visitadores por desarrollo de cartera, no solo por monto.",
      evidence: record.visitors
        .map((visitor) => `${visitor.name}: ${formatCurrency(visitor.revenue)}`)
        .join(" "),
      id: "slide-8",
      kpis: [
        { label: "Visitadores", value: `${record.visitors.length}` },
        { label: "Top visitador", value: record.visitors[0]?.name ?? "Pendiente" },
        { label: "Cartera activa", value: `${record.visitors.reduce((sum, item) => sum + item.activeDoctors, 0)}` },
        { label: "Recuperados", value: `${record.visitors.reduce((sum, item) => sum + item.doctorsRecovered, 0)}` },
      ],
      narrative:
        "Un visitador con pocos medicos grandes no es comparable con otro que esta desarrollando cartera nueva.",
      status: "Listo",
      title: "8. Gestion de visitadores medicos",
    },
    {
      action: "Ajustar turnos y toma de muestras segun picos de demanda.",
      evidence: `${formatRate(record.peakHoursShare)} de las ordenes por hora se concentra en ${record.peakHoursLabel}.`,
      id: "slide-9",
      kpis: [
        { label: "Hora pico", value: record.peakHoursLabel },
        { label: "Concentracion", value: formatRate(record.peakHoursShare) },
        { label: "Dias fuertes", value: record.topSalesDays.join(", ") },
        { label: "Demanda tarde", value: "Baja" },
      ],
      narrative:
        "La demanda horaria debe servir para decidir personal, horarios, turnos y campanas en franjas ociosas.",
      status: "Listo",
      title: "9. Demanda por dia y hora",
    },
    {
      action: "No afirmar sobreinventario sin consumo, rotacion y vencimientos.",
      evidence: `${formatRate(record.inventoryGrowthRate)} crecimiento de inventario y ${formatRate(record.reactiveGrowthRate)} crecimiento de reactivos.`,
      id: "slide-10",
      kpis: [
        { label: "Inventario total", value: formatCurrency(record.inventoryTotalAmount) },
        { label: "Reactivos", value: formatCurrency(record.inventoryReactivesAmount) },
        { label: "Insumos", value: formatCurrency(record.inventorySuppliesAmount) },
        { label: "Consumibles", value: formatCurrency(record.inventoryConsumablesAmount) },
      ],
      narrative:
        "Inventario debe analizar monto, cantidad, consumo real, rotacion, dias de cobertura y vencimientos.",
      status: "Requiere explicacion",
      title: "10. Inventario e insumos",
    },
    {
      action: "Usar esta slide solo para capacidad general de sucursal.",
      evidence: `${record.orders} ordenes y ${record.clients} clientes; faltan horas, turnos y ausencias.`,
      id: "slide-11",
      kpis: [
        { label: "Ordenes/persona", value: "Calculado" },
        { label: "Clientes/persona", value: "Calculado" },
        { label: "Horas trabajadas", value: "Pendiente" },
        { label: "Turnos", value: "Pendiente" },
      ],
      narrative:
        "No debe premiar ni castigar individuos porque faltan horas trabajadas, turnos, complejidad y funciones.",
      status: "Pendiente de fuente",
      title: "11. Personal y productividad",
    },
    {
      action: "Mantener cliente incognito como indicador de experiencia.",
      evidence: `Cliente incognito ${record.mysteryShopperScore}; cafe como indicador secundario.`,
      id: "slide-12",
      kpis: [
        { label: "Cliente incognito", value: `${record.mysteryShopperScore}` },
        { label: "Estandar", value: "85" },
        { label: "Tazas cafe", value: `${record.coffeeCups}` },
        { label: "Plan correctivo", value: record.mysteryShopperScore >= 85 ? "No" : "Si" },
      ],
      narrative:
        "Cafe queda como anexo salvo que exista relacion formal con experiencia, costo o estandar de servicio.",
      status: record.mysteryShopperScore >= 85 ? "Listo" : "Requiere explicacion",
      title: "12. Experiencia y cumplimiento",
    },
    {
      action: "Exigir causa operativa, evidencia y controlabilidad.",
      evidence: record.managerExplanationRequired.join(" "),
      id: "slide-13",
      kpis: [
        { label: "Variaciones", value: `${record.managerExplanationRequired.length}` },
        { label: "Venta", value: formatCurrency(record.actualRevenue) },
        { label: "Ordenes", value: record.orders.toLocaleString("en-US") },
        { label: "Inventario", value: formatCurrency(record.inventoryTotalAmount) },
      ],
      narrative:
        "La presentacion no debe aceptar explicaciones genericas; debe pedir causa, evidencia y si esta bajo control de sucursal.",
      status: "Requiere explicacion",
      title: "13. Variaciones explicadas por la gerente",
    },
    {
      action: "Plan de accion obligatorio antes de cerrar la presentacion.",
      evidence: record.actionPlan.map((item) => `${item.action}: ${item.expectedImpact}`).join(" "),
      id: "slide-14",
      kpis: [
        { label: "Acciones", value: `${record.actionPlan.length}` },
        { label: "Pendientes", value: `${record.actionPlan.filter((item) => item.status === "Pendiente").length}` },
        { label: "En curso", value: `${record.actionPlan.filter((item) => item.status === "En curso").length}` },
        { label: "Impacto", value: "Trazable" },
      ],
      narrative:
        "Cada accion debe tener responsable, fecha, KPI, impacto esperado y estado.",
      status: "Listo",
      title: "14. Plan de accion",
    },
    {
      action: record.ceoDecision,
      evidence: record.requiredDecisions.map((decision) => decision.evidence).join(" "),
      id: "slide-15",
      kpis: [
        { label: "Decisiones", value: `${record.requiredDecisions.length}` },
        { label: "Urgencia alta", value: `${record.requiredDecisions.filter((item) => item.urgency === "Alta").length}` },
        { label: "Costo", value: record.requiredDecisions[0]?.cost ?? "Pendiente" },
        { label: "Beneficio", value: record.requiredDecisions[0]?.benefit ?? "Pendiente" },
      ],
      narrative:
        "Cada solicitud debe mostrar evidencia, costo, beneficio, urgencia y decision requerida.",
      status: "Decision CEO",
      title: "15. Decisiones requeridas",
    },
  ];
}

function seriesForRecords(
  records: LaboratoryBranchRecord[],
  field: keyof LaboratoryBranchRecord["trend"],
  valueFormatter: (record: LaboratoryBranchRecord) => string,
): TrendSeries[] {
  const scoped = records.slice(0, 5);

  return [
    ...scoped.map((record, index) => ({
      color: trendColors[index % trendColors.length],
      label: record.city,
      points: record.trend[field],
      value: valueFormatter(record),
    })),
    {
      color: "slate" as const,
      label: field === "revenue" ? "Meta" : "Referencia",
      points:
        field === "revenue"
          ? [28000, 28000, 28000, 28000, 28000, 28000, 28000]
          : field === "margin"
            ? [84, 84, 84, 84, 84, 84, 84]
            : [2000, 2000, 2000, 2000, 2000, 2000, 2000],
      value: field === "revenue" ? "$28K" : field === "margin" ? "84%" : "2K",
    },
  ];
}

export function buildLaboratoryTrendChart(records: LaboratoryBranchRecord[]) {
  const scopedRecords = records.slice(0, 5);
  const firstRecord = scopedRecords[0] ?? laboratoryBranchRecords[0];
  const insights: TrendInsight[] = [
    {
      label: "Historia laboratorio",
      note: "Compara pacientes, canales, ordenes, venta, costos, margen, medicos, demanda e inventario.",
      tone: "neutral",
      value: `${scopedRecords.length} sucursales`,
    },
    {
      label: "Alerta principal",
      note: firstRecord?.actionPriority ?? "Sin accion prioritaria.",
      tone: firstRecord?.validationStatus === "Validado" ? "positive" : "warning",
      value: firstRecord?.city ?? "Sin datos",
    },
    {
      label: "No duplicar",
      note: "Operacion muestra volumen y flujo; Salud financiera conserva el detalle financiero completo.",
      tone: "positive",
      value: "Slides",
    },
  ];
  const metricOptions: TrendChartOption[] = [
    {
      description: "Venta total diaria acumulada contra meta o referencia.",
      id: "venta-laboratorio-presentacion",
      insights,
      label: "Venta total",
      series: seriesForRecords(scopedRecords, "revenue", (record) =>
        formatCurrency(record.actualRevenue),
      ),
      yLabel: "USD",
    },
    {
      description: "Ordenes de laboratorio del periodo.",
      id: "ordenes-laboratorio-presentacion",
      insights,
      label: "Ordenes",
      series: seriesForRecords(scopedRecords, "orders", (record) =>
        record.orders.toLocaleString("en-US"),
      ),
      yLabel: "Ordenes",
    },
    {
      description: "Clientes totales de la plantilla mensual.",
      id: "clientes-laboratorio-presentacion",
      insights,
      label: "Clientes",
      series: seriesForRecords(scopedRecords, "clients", (record) =>
        record.clients.toLocaleString("en-US"),
      ),
      yLabel: "Clientes",
    },
    {
      description: "Ticket promedio por orden para explicar crecimiento sin volumen.",
      id: "ticket-laboratorio-presentacion",
      insights,
      label: "Ticket",
      series: seriesForRecords(scopedRecords, "ticket", (record) =>
        formatCurrency(record.ticketAverage),
      ),
      yLabel: "USD por orden",
    },
    {
      description: "Venta generada por ordenes medicas.",
      id: "medicos-laboratorio-presentacion",
      insights,
      label: "Canal medico",
      series: seriesForRecords(scopedRecords, "medicalRevenue", (record) =>
        formatCurrency(record.medicalRevenue),
      ),
      yLabel: "USD",
    },
    {
      description: "Inventario total, especialmente reactivos e insumos.",
      id: "inventario-laboratorio-presentacion",
      insights,
      label: "Inventario",
      series: seriesForRecords(scopedRecords, "inventory", (record) =>
        formatCurrency(record.inventoryTotalAmount),
      ),
      yLabel: "USD",
    },
    {
      description: "Margen porcentual antes de gastos operativos.",
      id: "margen-laboratorio-presentacion",
      insights,
      label: "Margen",
      series: seriesForRecords(scopedRecords, "margin", (record) =>
        formatRate(record.marginRate),
      ),
      yLabel: "% margen",
    },
  ];

  return {
    description:
      "Compara sucursales, fechas y KPI para preparar la presentacion mensual de Laboratorio.",
    insights,
    metricOptions,
    series: metricOptions[0].series,
    title: "Tendencia para presentacion de Laboratorio",
    xLabels: exactDateLabels,
    yLabel: metricOptions[0].yLabel,
  };
}
