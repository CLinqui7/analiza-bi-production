import type {
  TrendChartOption,
  TrendInsight,
  TrendSeries,
} from "@/components/analytics-comparison-chart";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";

export type ImagingMetricGroup =
  | "Validacion"
  | "Resultado"
  | "Volumen"
  | "Telemedicina"
  | "Modalidades"
  | "Riesgo";

export type ImagingMetric = {
  group: ImagingMetricGroup;
  label: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
  value: string;
};

export type ImagingSlideStatus =
  | "Listo"
  | "Requiere explicacion"
  | "Pendiente de fuente"
  | "Decision CEO"
  | "Bloqueado";

export type ImagingValidationStatus =
  | "Datos en revision"
  | "Listo para presentar"
  | "Bloqueado por plantilla";

export type ImagingSourceStatus = "Disponible" | "Pendiente de conexion";

export type ImagingSlide = {
  action: string;
  evidence: string;
  id: string;
  kpis: { label: string; value: string }[];
  narrative: string;
  status: ImagingSlideStatus;
  title: string;
};

export type ImagingModality = {
  directShareLabel: string;
  growthRate: number;
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  revenueShare: number;
  ticket: number;
};

export type ImagingStudy = {
  category: "Estrella" | "Carga alta bajo valor" | "Especializado" | "Revisar continuidad";
  modality: string;
  name: string;
  quantity: number;
  revenue: number;
  ticket: number;
};

export type ImagingSpecialty = {
  activeDoctors: number;
  growthRate: number;
  keyStudy: string;
  name: string;
  orders: number;
  revenue: number;
  ticket: number;
};

export type ImagingVisitor = {
  activeDoctors: number;
  medicalOrders: number;
  name: string;
  portfolioShare: number;
  revenue: number;
  status: "Concentrado" | "Saludable" | "Reactivar cartera";
  ticket: number;
};

export type ImagingBranchRecord = {
  id: string;
  branch: string;
  manager: string;
  areaManager: string;
  period: string;
  fileName: string;
  detectedPeriod: string;
  selectedPeriod: string;
  uploadDate: string;
  closeDate: string;
  presentationVersion: string;
  dataQualityScore: number;
  validationStatus: ImagingValidationStatus;
  formulaErrors: string[];
  validationFindings: string[];
  revenue: number;
  revenueTarget: number;
  revenueCompletionRate: number;
  monthlyGrowthRate: number;
  accumulatedGrowthRate: number;
  dailyAverageRevenue: number;
  lastProjection: number | null;
  actualVsProjection: number | null;
  clients: number;
  orders: number;
  studies: number;
  uniquePatients: number | null;
  ordersPerClient: number;
  studiesPerOrder: number;
  studiesPerClient: number;
  ticketPerOrder: number;
  ticketPerStudy: number;
  ticketPerClient: number;
  patientIdentityStatus: ImagingSourceStatus;
  telemedicinePatients: number;
  telemedicineRevenue: number;
  telemedicinePatientGrowthRate: number;
  telemedicineRevenueGrowthRate: number;
  telemedicineStudyCount: number;
  telemedicineMarginStatus: ImagingSourceStatus;
  directRevenue: number;
  directGrowthRate: number;
  directStudyCount: number;
  medicalRevenue: number;
  medicalOrders: number;
  medicalTicket: number;
  medicalRevenueGrowthRate: number;
  medicalOrdersGrowthRate: number;
  medicalTicketChangeRate: number;
  medicalActiveDoctors: number;
  medicalNewDoctors: number;
  medicalRecurrentDoctors: number;
  medicalInactiveDoctors: number;
  topModality: string;
  topGrowthChannel: string;
  top10RevenueConcentration: number;
  top3VisitorsShare: number;
  top5VisitorsShare: number;
  modalityRecords: ImagingModality[];
  topStudies: ImagingStudy[];
  specialties: ImagingSpecialty[];
  visitors: ImagingVisitor[];
  heatmap: number[][];
  capacityStatus: ImagingSourceStatus;
  reportsStatus: ImagingSourceStatus;
  qualityStatus: ImagingSourceStatus;
  financeConciliationStatus: "Confiable" | "Pendiente de conciliacion";
  staffingStatus: "Consistente" | "Inconsistente";
  staffingDetail: {
    customerCare: number;
    doctors: number;
    licensees: number;
    mainSheetTotal: number;
    cleaning: number;
    calculatedTotal: number;
  };
  pendingSources: string[];
  mainOpportunity: string;
  ceoDecision: string;
  managerExplanationRequired: string[];
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
    problem: string;
    urgency: "Alta" | "Media" | "Baja";
  }[];
  trend: {
    clients: number[];
    directRevenue: number[];
    medicalRevenue: number[];
    orders: number[];
    revenue: number[];
    studies: number[];
    telemedicineRevenue: number[];
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

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildVolumePoints(value: number, pattern = "normal") {
  const multipliers =
    pattern === "fast"
      ? [0.44, 0.52, 0.63, 0.74, 0.84, 0.93, 1]
      : pattern === "flat"
        ? [0.7, 0.76, 0.82, 0.87, 0.92, 0.96, 1]
        : [0.5, 0.59, 0.68, 0.76, 0.84, 0.92, 1];

  return multipliers.map((factor) => Math.round(value * factor));
}

function finishRecord(
  input: Omit<ImagingBranchRecord, "trend"> & { trendPattern?: "normal" | "fast" | "flat" },
): ImagingBranchRecord {
  const { trendPattern = "normal", ...record } = input;

  return {
    ...record,
    trend: {
      clients: buildVolumePoints(record.clients, trendPattern),
      directRevenue: buildVolumePoints(record.directRevenue, "flat"),
      medicalRevenue: buildVolumePoints(record.medicalRevenue, "flat"),
      orders: buildVolumePoints(record.orders, trendPattern),
      revenue: buildVolumePoints(record.revenue, trendPattern),
      studies: buildVolumePoints(record.studies, trendPattern),
      telemedicineRevenue: buildVolumePoints(record.telemedicineRevenue, "fast"),
      ticket: buildVolumePoints(record.ticketPerOrder, "flat"),
    },
  };
}

const baseModalities: ImagingModality[] = [
  {
    directShareLabel: "Modalidad consolidada",
    growthRate: 0.49,
    id: "ultrasonografia",
    name: "Ultrasonografia",
    quantity: 1011,
    revenue: 35794.09,
    revenueShare: 0.426,
    ticket: 35.4,
  },
  {
    directShareLabel: "Modalidad consolidada",
    growthRate: 0.08,
    id: "rayos-x",
    name: "Rayos X",
    quantity: 1693,
    revenue: 25679.79,
    revenueShare: 0.305,
    ticket: 15.17,
  },
  {
    directShareLabel: "Modalidad consolidada",
    growthRate: 0.25,
    id: "tac",
    name: "TAC",
    quantity: 86,
    revenue: 22613.05,
    revenueShare: 0.269,
    ticket: 262.94,
  },
];

const baseStudies: ImagingStudy[] = [
  { category: "Estrella", modality: "Ultrasonografia", name: "Ultrasonografia de abdomen", quantity: 312, revenue: 12180, ticket: 39 },
  { category: "Especializado", modality: "TAC", name: "AngioTAC coronario", quantity: 38, revenue: 11400, ticket: 300 },
  { category: "Carga alta bajo valor", modality: "Rayos X", name: "Rayos X de torax", quantity: 520, revenue: 8200, ticket: 16 },
  { category: "Estrella", modality: "Ultrasonografia", name: "Ultrasonografia de tejidos blandos", quantity: 198, revenue: 7020, ticket: 35 },
  { category: "Estrella", modality: "Ultrasonografia", name: "Ultrasonografia renal", quantity: 156, revenue: 5730, ticket: 37 },
  { category: "Carga alta bajo valor", modality: "Rayos X", name: "Rayos X de columna lumbar", quantity: 260, revenue: 5080, ticket: 20 },
  { category: "Especializado", modality: "TAC", name: "TAC de craneo", quantity: 28, revenue: 3920, ticket: 140 },
  { category: "Estrella", modality: "Ultrasonografia", name: "Ultrasonografia pelvica transvaginal", quantity: 126, revenue: 3560, ticket: 28 },
];

const baseSpecialties: ImagingSpecialty[] = [
  { activeDoctors: 24, growthRate: 0.12, keyStudy: "AngioTAC coronario", name: "Cardiologia", orders: 94, revenue: 8550, ticket: 91 },
  { activeDoctors: 19, growthRate: 0.03, keyStudy: "Ultrasonografia de abdomen", name: "Medicina interna", orders: 76, revenue: 4520, ticket: 59 },
  { activeDoctors: 14, growthRate: 0.07, keyStudy: "Ultrasonografia renal", name: "Urologia", orders: 52, revenue: 3680, ticket: 71 },
  { activeDoctors: 10, growthRate: 0.09, keyStudy: "TAC de craneo", name: "Neurologia", orders: 36, revenue: 3340, ticket: 93 },
  { activeDoctors: 28, growthRate: -0.02, keyStudy: "Rayos X de torax", name: "Medicina general", orders: 64, revenue: 2260, ticket: 35 },
  { activeDoctors: 16, growthRate: 0.04, keyStudy: "Rayos X de columna lumbar", name: "Ortopedia", orders: 42, revenue: 2180, ticket: 52 },
];

const baseVisitors: ImagingVisitor[] = [
  { activeDoctors: 34, medicalOrders: 138, name: "Visitador A", portfolioShare: 0.27, revenue: 6420, status: "Concentrado", ticket: 47 },
  { activeDoctors: 29, medicalOrders: 116, name: "Visitador B", portfolioShare: 0.2, revenue: 4760, status: "Saludable", ticket: 41 },
  { activeDoctors: 22, medicalOrders: 86, name: "Visitador C", portfolioShare: 0.14, revenue: 3330, status: "Saludable", ticket: 39 },
  { activeDoctors: 16, medicalOrders: 54, name: "Visitador D", portfolioShare: 0.12, revenue: 2855, status: "Reactivar cartera", ticket: 53 },
  { activeDoctors: 13, medicalOrders: 42, name: "Visitador E", portfolioShare: 0.12, revenue: 2850, status: "Reactivar cartera", ticket: 68 },
];

export const imagingBranchRecords: ImagingBranchRecord[] = [
  finishRecord({
    accumulatedGrowthRate: 0.18,
    actionPlan: [
      {
        action: "Revisar capacidad de Ultrasonografia",
        dueDate: "2026-07-10",
        expectedImpact: "Reducir espera y sostener crecimiento de 49% en cantidad",
        kpi: "Tiempo de espera",
        owner: "Gerente de sucursal",
        status: "Pendiente",
      },
      {
        action: "Reactivar medicos de TAC",
        dueDate: "2026-07-15",
        expectedImpact: "+$3,000 en venta medica",
        kpi: "Venta medica",
        owner: "Visitadores",
        status: "En curso",
      },
      {
        action: "Validar mezcla de Telemedicina",
        dueDate: "2026-07-08",
        expectedImpact: "Confirmar margen y atribucion correcta",
        kpi: "Margen por segmento",
        owner: "Finanzas",
        status: "Pendiente",
      },
      {
        action: "Corregir formulas de plantilla",
        dueDate: "2026-07-05",
        expectedImpact: "Eliminar errores antes de version oficial",
        kpi: "Calidad de datos",
        owner: "BI",
        status: "Pendiente",
      },
    ],
    actualVsProjection: null,
    areaManager: "Direccion Imagenes",
    branch: "Imagenes Colonia Medica",
    capacityStatus: "Pendiente de conexion",
    ceoDecision: "Definir si se amplian horarios, equipo o cobertura profesional para Ultrasonografia.",
    clients: 2404,
    closeDate: "2026-06-30",
    dailyAverageRevenue: 2803,
    dataQualityScore: 71,
    detectedPeriod: "Junio 2026",
    directGrowthRate: 0.078,
    directRevenue: 45751.44,
    directStudyCount: 764,
    fileName: "Plantilla Junio 2026 Imagenes Colonia Medica.xlsx",
    financeConciliationStatus: "Pendiente de conciliacion",
    formulaErrors: ["#REF!", "#NAME?", "#DIV/0!", "#N/A", "#VALUE!"],
    heatmap: [
      [62, 76, 88, 72],
      [68, 82, 91, 78],
      [58, 79, 86, 74],
      [64, 80, 89, 76],
      [52, 70, 78, 66],
    ],
    id: "imagenes-colonia-medica",
    lastProjection: null,
    mainOpportunity:
      "Consolidar Telemedicina y revisar capacidad de Ultrasonografia antes de que la demanda supere la cobertura disponible.",
    manager: "Karla Contreras",
    managerExplanationRequired: [
      "Explicar si Telemedicina es procedencia, canal, lectura remota o venta atribuida a terceros.",
      "Justificar la caida del ticket medico pese al aumento de ordenes.",
      "Conciliar personal detallado contra total de hoja principal.",
      "Confirmar por que la hoja principal muestra ceros aunque la base normalizada tiene venta y ordenes.",
    ],
    medicalActiveDoctors: 126,
    medicalInactiveDoctors: 34,
    medicalNewDoctors: 11,
    medicalOrders: 364,
    medicalOrdersGrowthRate: 0.025,
    medicalRecurrentDoctors: 115,
    medicalRevenue: 23791.95,
    medicalRevenueGrowthRate: 0.0002,
    medicalTicket: 65.36,
    medicalTicketChangeRate: -0.025,
    modalityRecords: baseModalities,
    monthlyGrowthRate: 0.214,
    orders: 2633,
    ordersPerClient: 1.1,
    patientIdentityStatus: "Pendiente de conexion",
    pendingSources: [
      "Agenda de estudios, no-show, cancelaciones y lista de espera",
      "PACS/RIS para informes, pendientes, tiempos de lectura y SLA",
      "Mantenimiento y disponibilidad de equipos",
      "Calidad tecnica, repeticiones, incidentes y preparaciones incompletas",
      "Pacientes nuevos y recurrentes con identificacion confiable",
    ],
    period: "Junio 2026",
    presentationVersion: "v0.9 revision",
    qualityStatus: "Pendiente de conexion",
    reportsStatus: "Pendiente de conexion",
    requiredDecisions: [
      {
        benefit: "Mantener crecimiento sin formar lista de espera",
        cost: "Reasignacion de horario y posible cobertura adicional",
        decision: "Aprobar extension de horario de Ultrasonografia",
        evidence: "Ultrasonografia crecio 49% en cantidad y aporta 42.6% de la venta",
        problem: "Riesgo de saturacion si la demanda se sostiene",
        urgency: "Alta",
      },
      {
        benefit: "Cerrar brecha de lectura e informes cuando se conecte PACS/RIS",
        cost: "Integracion tecnica y reglas de SLA",
        decision: "Priorizar integracion PACS/RIS",
        evidence: "Informes y tiempos de entrega no estan en la plantilla",
        problem: "No se puede medir cuello de botella de lectura",
        urgency: "Media",
      },
    ],
    revenue: 84086.93,
    revenueCompletionRate: 1.001,
    revenueTarget: 84000,
    selectedPeriod: "Junio 2026",
    specialties: baseSpecialties,
    staffingDetail: {
      calculatedTotal: 16,
      cleaning: 1,
      customerCare: 3,
      doctors: 7,
      licensees: 5,
      mainSheetTotal: 6,
    },
    staffingStatus: "Inconsistente",
    studies: 2790,
    studiesPerClient: 1.16,
    studiesPerOrder: 1.06,
    telemedicineMarginStatus: "Pendiente de conexion",
    telemedicinePatientGrowthRate: 0.138,
    telemedicinePatients: 2026,
    telemedicineRevenue: 38335.49,
    telemedicineRevenueGrowthRate: 0.351,
    telemedicineStudyCount: 1182,
    ticketPerClient: 34.98,
    ticketPerOrder: 31.94,
    ticketPerStudy: 30.14,
    top10RevenueConcentration: 0.506,
    top3VisitorsShare: 0.61,
    top5VisitorsShare: 0.85,
    topGrowthChannel: "Telemedicina",
    topModality: "Ultrasonografia",
    topStudies: baseStudies,
    trendPattern: "fast",
    uniquePatients: null,
    uploadDate: "2026-07-01",
    validationFindings: [
      "La hoja principal muestra ceros donde la base normalizada si tiene venta, ordenes y clientes.",
      "La utilidad operativa queda pendiente por gastos vacios de personal, ISSS/AFP y otros gastos.",
      "La proyeccion no debe depender de TODAY() ni de meses mezclados en espanol e ingles.",
      "Telemedicina debe definirse formalmente antes de usarla como etiqueta ejecutiva.",
    ],
    validationStatus: "Datos en revision",
    visitors: baseVisitors,
  }),
  finishRecord({
    accumulatedGrowthRate: 0.11,
    actionPlan: [
      {
        action: "Redistribuir estudios de TAC a horarios con menor espera",
        dueDate: "2026-07-12",
        expectedImpact: "-1.2 dias espera TAC",
        kpi: "Lista de espera",
        owner: "Gerente Santa Tecla",
        status: "En curso",
      },
      {
        action: "Validar SLA de informes con radiologos",
        dueDate: "2026-07-18",
        expectedImpact: "Definir meta de informes dentro de 24 h",
        kpi: "SLA informes",
        owner: "Direccion Imagenes",
        status: "Pendiente",
      },
    ],
    actualVsProjection: null,
    areaManager: "Direccion Imagenes",
    branch: "Imagenes Santa Tecla",
    capacityStatus: "Pendiente de conexion",
    ceoDecision: "Aprobar reglas de redistribucion para TAC y lectura remota.",
    clients: 2110,
    closeDate: "2026-06-30",
    dailyAverageRevenue: 2452,
    dataQualityScore: 78,
    detectedPeriod: "Junio 2026",
    directGrowthRate: 0.052,
    directRevenue: 41120,
    directStudyCount: 702,
    fileName: "Plantilla Junio 2026 Imagenes Santa Tecla.xlsx",
    financeConciliationStatus: "Pendiente de conciliacion",
    formulaErrors: ["#NAME?", "#DIV/0!"],
    heatmap: [
      [70, 86, 94, 84],
      [74, 90, 96, 88],
      [68, 84, 92, 82],
      [72, 88, 95, 86],
      [60, 78, 84, 74],
    ],
    id: "imagenes-santa-tecla",
    lastProjection: null,
    mainOpportunity:
      "Ordenar demanda de TAC y lectura para evitar que la adquisicion supere la capacidad de informe.",
    manager: "Gerente Santa Tecla",
    managerExplanationRequired: [
      "Confirmar si la lista de espera viene de equipo, agenda o lectura.",
      "Explicar concentracion de venta en estudios cardiovasculares.",
    ],
    medicalActiveDoctors: 108,
    medicalInactiveDoctors: 27,
    medicalNewDoctors: 9,
    medicalOrders: 316,
    medicalOrdersGrowthRate: 0.018,
    medicalRecurrentDoctors: 99,
    medicalRevenue: 21680,
    medicalRevenueGrowthRate: 0.011,
    medicalTicket: 68.61,
    medicalTicketChangeRate: -0.007,
    modalityRecords: [
      { ...baseModalities[0], quantity: 870, revenue: 29100, revenueShare: 0.396, ticket: 33.45 },
      { ...baseModalities[1], quantity: 1510, revenue: 21480, revenueShare: 0.292, ticket: 14.23 },
      { ...baseModalities[2], quantity: 82, revenue: 22980, revenueShare: 0.312, ticket: 280.24 },
    ],
    monthlyGrowthRate: 0.132,
    orders: 2358,
    ordersPerClient: 1.12,
    patientIdentityStatus: "Pendiente de conexion",
    pendingSources: [
      "PACS/RIS para informes pendientes",
      "Mantenimiento y tiempo fuera de servicio",
      "Repeticiones tecnicas por modalidad",
    ],
    period: "Junio 2026",
    presentationVersion: "v0.8 revision",
    qualityStatus: "Pendiente de conexion",
    reportsStatus: "Pendiente de conexion",
    requiredDecisions: [
      {
        benefit: "Reducir espera de estudios de alto ticket",
        cost: "Reordenar agenda y lectura remota",
        decision: "Aprobar redistribucion TAC",
        evidence: "TAC pesa 31.2% de venta con 82 estudios",
        problem: "Riesgo de cuello de botella por modalidad",
        urgency: "Alta",
      },
    ],
    revenue: 73560,
    revenueCompletionRate: 0.981,
    revenueTarget: 75000,
    selectedPeriod: "Junio 2026",
    specialties: baseSpecialties.map((item) => ({
      ...item,
      orders: Math.round(item.orders * 0.87),
      revenue: Math.round(item.revenue * 0.91),
    })),
    staffingDetail: {
      calculatedTotal: 14,
      cleaning: 1,
      customerCare: 3,
      doctors: 6,
      licensees: 4,
      mainSheetTotal: 14,
    },
    staffingStatus: "Consistente",
    studies: 2462,
    studiesPerClient: 1.17,
    studiesPerOrder: 1.04,
    telemedicineMarginStatus: "Pendiente de conexion",
    telemedicinePatientGrowthRate: 0.092,
    telemedicinePatients: 1710,
    telemedicineRevenue: 32440,
    telemedicineRevenueGrowthRate: 0.206,
    telemedicineStudyCount: 1014,
    ticketPerClient: 34.86,
    ticketPerOrder: 31.2,
    ticketPerStudy: 29.88,
    top10RevenueConcentration: 0.54,
    top3VisitorsShare: 0.58,
    top5VisitorsShare: 0.81,
    topGrowthChannel: "TAC",
    topModality: "TAC",
    topStudies: baseStudies.map((item) => ({
      ...item,
      quantity: Math.round(item.quantity * 0.88),
      revenue: Math.round(item.revenue * 0.93),
    })),
    trendPattern: "normal",
    uniquePatients: null,
    uploadDate: "2026-07-01",
    validationFindings: [
      "Datos comerciales disponibles; falta validar informes y capacidad.",
      "Utilidad pendiente de conciliacion con Salud financiera.",
    ],
    validationStatus: "Datos en revision",
    visitors: baseVisitors.map((item) => ({
      ...item,
      medicalOrders: Math.round(item.medicalOrders * 0.86),
      revenue: Math.round(item.revenue * 0.9),
    })),
  }),
  finishRecord({
    accumulatedGrowthRate: 0.08,
    actionPlan: [
      {
        action: "Reactivar Rayos X por convenio local",
        dueDate: "2026-07-11",
        expectedImpact: "+180 estudios mensuales",
        kpi: "Cantidad Rayos X",
        owner: "Gerente Centro",
        status: "Pendiente",
      },
      {
        action: "Conectar agenda para medir no-show y cancelaciones",
        dueDate: "2026-07-20",
        expectedImpact: "Medicion confiable de demanda perdida",
        kpi: "Calidad de datos",
        owner: "BI",
        status: "Pendiente",
      },
    ],
    actualVsProjection: null,
    areaManager: "Direccion Imagenes",
    branch: "Imagenes Centro",
    capacityStatus: "Pendiente de conexion",
    ceoDecision: "Aprobar campana medica y conexion de agenda.",
    clients: 1680,
    closeDate: "2026-06-30",
    dailyAverageRevenue: 1973,
    dataQualityScore: 66,
    detectedPeriod: "Junio 2026",
    directGrowthRate: 0.031,
    directRevenue: 34720,
    directStudyCount: 620,
    fileName: "Plantilla Junio 2026 Imagenes Centro.xlsx",
    financeConciliationStatus: "Pendiente de conciliacion",
    formulaErrors: ["#REF!", "#VALUE!", "#N/A"],
    heatmap: [
      [48, 68, 76, 58],
      [52, 72, 80, 62],
      [46, 66, 74, 56],
      [50, 70, 78, 60],
      [38, 58, 66, 48],
    ],
    id: "imagenes-centro",
    lastProjection: null,
    mainOpportunity:
      "Usar capacidad disponible y reactivar canal medico sin bajar ticket.",
    manager: "Gerente Centro Imagenes",
    managerExplanationRequired: [
      "Explicar formula rota en resumen principal.",
      "Definir acciones para estudios sin movimiento.",
      "Confirmar mezcla de descuentos del canal medico.",
    ],
    medicalActiveDoctors: 92,
    medicalInactiveDoctors: 41,
    medicalNewDoctors: 6,
    medicalOrders: 248,
    medicalOrdersGrowthRate: 0.04,
    medicalRecurrentDoctors: 86,
    medicalRevenue: 15120,
    medicalRevenueGrowthRate: -0.015,
    medicalTicket: 60.97,
    medicalTicketChangeRate: -0.053,
    modalityRecords: [
      { ...baseModalities[0], quantity: 690, revenue: 24800, revenueShare: 0.419, ticket: 35.94 },
      { ...baseModalities[1], quantity: 1220, revenue: 18440, revenueShare: 0.311, ticket: 15.11 },
      { ...baseModalities[2], quantity: 54, revenue: 15960, revenueShare: 0.27, ticket: 295.56 },
    ],
    monthlyGrowthRate: 0.075,
    orders: 1904,
    ordersPerClient: 1.13,
    patientIdentityStatus: "Pendiente de conexion",
    pendingSources: [
      "Agenda para demanda temporal",
      "PACS/RIS para informes",
      "Calidad tecnica y repeticiones",
      "Mantenimiento de equipos",
    ],
    period: "Junio 2026",
    presentationVersion: "v0.7 bloqueada",
    qualityStatus: "Pendiente de conexion",
    reportsStatus: "Pendiente de conexion",
    requiredDecisions: [
      {
        benefit: "Aumentar volumen sin inversion inmediata en equipo",
        cost: "$700 campana local",
        decision: "Aprobar campana medica local",
        evidence: "Capacidad comercial disponible y ticket medico cayendo 5.3%",
        problem: "Canal medico pierde valor por orden",
        urgency: "Media",
      },
    ],
    revenue: 59200,
    revenueCompletionRate: 0.91,
    revenueTarget: 65000,
    selectedPeriod: "Junio 2026",
    specialties: baseSpecialties.map((item) => ({
      ...item,
      orders: Math.round(item.orders * 0.68),
      revenue: Math.round(item.revenue * 0.69),
    })),
    staffingDetail: {
      calculatedTotal: 12,
      cleaning: 1,
      customerCare: 2,
      doctors: 5,
      licensees: 4,
      mainSheetTotal: 7,
    },
    staffingStatus: "Inconsistente",
    studies: 1964,
    studiesPerClient: 1.17,
    studiesPerOrder: 1.03,
    telemedicineMarginStatus: "Pendiente de conexion",
    telemedicinePatientGrowthRate: 0.071,
    telemedicinePatients: 1260,
    telemedicineRevenue: 24480,
    telemedicineRevenueGrowthRate: 0.182,
    telemedicineStudyCount: 780,
    ticketPerClient: 35.24,
    ticketPerOrder: 31.09,
    ticketPerStudy: 30.14,
    top10RevenueConcentration: 0.48,
    top3VisitorsShare: 0.66,
    top5VisitorsShare: 0.88,
    topGrowthChannel: "Telemedicina",
    topModality: "Ultrasonografia",
    topStudies: baseStudies.map((item) => ({
      ...item,
      quantity: Math.round(item.quantity * 0.65),
      revenue: Math.round(item.revenue * 0.67),
    })),
    trendPattern: "flat",
    uniquePatients: null,
    uploadDate: "2026-07-01",
    validationFindings: [
      "Presentacion oficial bloqueada por errores de formula en la plantilla.",
      "La utilidad no es confiable hasta conciliar gastos y personal.",
      "Faltan fuentes de informes, capacidad y calidad tecnica.",
    ],
    validationStatus: "Bloqueado por plantilla",
    visitors: baseVisitors.map((item) => ({
      ...item,
      medicalOrders: Math.round(item.medicalOrders * 0.68),
      revenue: Math.round(item.revenue * 0.66),
    })),
  }),
];

function metricTone(value: number, goodThreshold: number, warningThreshold: number) {
  if (value >= goodThreshold) {
    return "positive" as const;
  }

  if (value >= warningThreshold) {
    return "warning" as const;
  }

  return "negative" as const;
}

export function buildImagingMetrics(records: ImagingBranchRecord[]): ImagingMetric[] {
  const totalRevenue = records.reduce((sum, record) => sum + record.revenue, 0);
  const totalTarget = records.reduce((sum, record) => sum + record.revenueTarget, 0);
  const totalClients = records.reduce((sum, record) => sum + record.clients, 0);
  const totalOrders = records.reduce((sum, record) => sum + record.orders, 0);
  const totalStudies = records.reduce((sum, record) => sum + record.studies, 0);
  const telemedicineRevenue = records.reduce(
    (sum, record) => sum + record.telemedicineRevenue,
    0,
  );
  const directRevenue = records.reduce((sum, record) => sum + record.directRevenue, 0);
  const medicalRevenue = records.reduce((sum, record) => sum + record.medicalRevenue, 0);
  const medicalOrders = records.reduce((sum, record) => sum + record.medicalOrders, 0);
  const averageQuality =
    records.reduce((sum, record) => sum + record.dataQualityScore, 0) /
    Math.max(records.length, 1);
  const blockedPresentations = records.filter(
    (record) => record.validationStatus !== "Listo para presentar",
  ).length;
  const pendingSources = records.reduce(
    (sum, record) => sum + record.pendingSources.length,
    0,
  );
  const averageTicket = totalRevenue / Math.max(totalOrders, 1);
  const averageStudiesPerOrder = totalStudies / Math.max(totalOrders, 1);
  const telemedicineShare = telemedicineRevenue / Math.max(totalRevenue, 1);
  const directShare = directRevenue / Math.max(totalRevenue, 1);
  const topModality = records[0]?.topModality ?? "Pendiente";
  const top10Concentration =
    records.reduce((sum, record) => sum + record.top10RevenueConcentration, 0) /
    Math.max(records.length, 1);
  const top3VisitorsShare =
    records.reduce((sum, record) => sum + record.top3VisitorsShare, 0) /
    Math.max(records.length, 1);

  return [
    {
      group: "Validacion",
      label: "Calidad de datos",
      note: "plantilla y fuentes",
      tone: metricTone(averageQuality, 84, 72),
      value: `${Math.round(averageQuality)}`,
    },
    {
      group: "Validacion",
      label: "Presentaciones bloqueadas",
      note: "por revision o formula",
      tone: blockedPresentations > 0 ? "warning" : "positive",
      value: `${blockedPresentations}`,
    },
    {
      group: "Validacion",
      label: "Fuentes pendientes",
      note: "agenda, PACS/RIS, calidad o equipos",
      tone: pendingSources > 8 ? "negative" : "warning",
      value: `${pendingSources}`,
    },
    {
      group: "Resultado",
      label: "Venta",
      note: `${formatRate(totalRevenue / Math.max(totalTarget, 1))} de meta`,
      tone: totalRevenue >= totalTarget ? "positive" : "warning",
      value: formatCurrency(totalRevenue),
    },
    {
      group: "Resultado",
      label: "Meta",
      note: "sucursales filtradas",
      tone: "neutral",
      value: formatCurrency(totalTarget),
    },
    {
      group: "Resultado",
      label: "Ticket por orden",
      note: "venta / ordenes",
      tone: averageTicket >= 32 ? "positive" : "warning",
      value: formatCurrency(averageTicket),
    },
    {
      group: "Volumen",
      label: "Clientes",
      note: "no confundir con pacientes unicos",
      tone: "neutral",
      value: totalClients.toLocaleString("en-US"),
    },
    {
      group: "Volumen",
      label: "Ordenes",
      note: "solicitudes de estudio",
      tone: "neutral",
      value: totalOrders.toLocaleString("en-US"),
    },
    {
      group: "Volumen",
      label: "Estudios",
      note: `${averageStudiesPerOrder.toFixed(2)} estudios por orden`,
      tone: "positive",
      value: totalStudies.toLocaleString("en-US"),
    },
    {
      group: "Telemedicina",
      label: "Venta Telemedicina",
      note: `${formatPercent(telemedicineShare)} de la venta`,
      tone: "positive",
      value: formatCurrency(telemedicineRevenue),
    },
    {
      group: "Telemedicina",
      label: "Venta directa",
      note: `${formatPercent(directShare)} de la venta`,
      tone: "neutral",
      value: formatCurrency(directRevenue),
    },
    {
      group: "Telemedicina",
      label: "Canal medico",
      note: `${medicalOrders.toLocaleString("en-US")} ordenes medicas`,
      tone: "warning",
      value: formatCurrency(medicalRevenue),
    },
    {
      group: "Modalidades",
      label: "Principal modalidad",
      note: "por venta y oportunidad",
      tone: "positive",
      value: topModality,
    },
    {
      group: "Modalidades",
      label: "Concentracion Top 10",
      note: "portafolio 80/20",
      tone: top10Concentration > 0.55 ? "warning" : "positive",
      value: formatPercent(top10Concentration),
    },
    {
      group: "Modalidades",
      label: "Top 3 visitadores",
      note: "dependencia del canal medico",
      tone: top3VisitorsShare > 0.62 ? "warning" : "positive",
      value: formatPercent(top3VisitorsShare),
    },
    {
      group: "Riesgo",
      label: "Capacidad y equipos",
      note: "agenda y mantenimiento",
      tone: "warning",
      value: "Pendiente",
    },
    {
      group: "Riesgo",
      label: "Informes y SLA",
      note: "PACS/RIS no conectado",
      tone: "warning",
      value: "Pendiente",
    },
    {
      group: "Riesgo",
      label: "Calidad tecnica",
      note: "repeticiones e incidentes",
      tone: "warning",
      value: "Pendiente",
    },
  ];
}

export function buildImagingSlides(record: ImagingBranchRecord): ImagingSlide[] {
  return [
    {
      action:
        record.validationStatus === "Listo para presentar"
          ? "Generar version oficial."
          : "Mantener en revision hasta resolver validaciones.",
      evidence: record.validationFindings.join(" "),
      id: "slide-1",
      kpis: [
        { label: "Sucursal", value: record.branch },
        { label: "Periodo", value: record.period },
        { label: "Calidad", value: `${record.dataQualityScore}` },
        { label: "Version", value: record.presentationVersion },
      ],
      narrative:
        "La portada debe dejar claro si la presentacion es oficial o esta en revision por errores de plantilla.",
      status:
        record.validationStatus === "Bloqueado por plantilla"
          ? "Bloqueado"
          : record.validationStatus === "Listo para presentar"
            ? "Listo"
            : "Requiere explicacion",
      title: "1. Portada y estado de datos",
    },
    {
      action: record.mainOpportunity,
      evidence: `${formatCurrency(record.revenue)} de venta, ${formatRate(record.revenueCompletionRate)} de meta y ${record.topGrowthChannel} como motor principal.`,
      id: "slide-2",
      kpis: [
        { label: "Meta", value: formatCurrency(record.revenueTarget) },
        { label: "Venta", value: formatCurrency(record.revenue) },
        { label: "Ordenes", value: record.orders.toLocaleString("en-US") },
        { label: "Ticket", value: formatCurrency(record.ticketPerOrder) },
      ],
      narrative:
        "El resumen ejecutivo muestra logros, alertas, oportunidad principal y decision requerida sin copiar todo Salud financiera.",
      status: record.validationStatus === "Bloqueado por plantilla" ? "Bloqueado" : "Requiere explicacion",
      title: "2. Resumen ejecutivo",
    },
    {
      action: "Mostrar resultado real contra meta y ultima proyeccion cerrada.",
      evidence: `${formatCurrency(record.revenue)} contra ${formatCurrency(record.revenueTarget)}; crecimiento mensual ${formatRate(record.monthlyGrowthRate)}.`,
      id: "slide-3",
      kpis: [
        { label: "Cumplimiento", value: formatRate(record.revenueCompletionRate) },
        { label: "Crecimiento", value: formatRate(record.monthlyGrowthRate) },
        { label: "Venta diaria", value: formatCurrency(record.dailyAverageRevenue) },
        { label: "Proyeccion", value: "No usar TODAY()" },
      ],
      narrative:
        "Con periodo cerrado no debe mostrarse una proyeccion dinamica; debe verse resultado real versus ultima proyeccion confiable.",
      status: record.lastProjection === null ? "Requiere explicacion" : "Listo",
      title: "3. Meta, venta y tendencia",
    },
    {
      action: "Formalizar definicion de clientes, pacientes, ordenes, examenes y estudios.",
      evidence: `${record.clients} clientes, ${record.orders} ordenes y ${record.studies} estudios.`,
      id: "slide-4",
      kpis: [
        { label: "Clientes", value: record.clients.toLocaleString("en-US") },
        { label: "Ordenes", value: record.orders.toLocaleString("en-US") },
        { label: "Estudios", value: record.studies.toLocaleString("en-US") },
        { label: "Estudios/orden", value: record.studiesPerOrder.toFixed(2) },
      ],
      narrative:
        "La slide evita usar pacientes, clientes, ordenes y estudios como sinonimos.",
      status: record.patientIdentityStatus === "Disponible" ? "Listo" : "Pendiente de fuente",
      title: "4. Pacientes, ordenes y estudios",
    },
    {
      action: "Definir si Telemedicina es procedencia, canal, lectura remota o venta de terceros.",
      evidence: `${formatCurrency(record.telemedicineRevenue)} en Telemedicina frente a ${formatCurrency(record.directRevenue)} no Telemedicina.`,
      id: "slide-5",
      kpis: [
        { label: "Venta Telemedicina", value: formatCurrency(record.telemedicineRevenue) },
        { label: "Crecimiento", value: formatRate(record.telemedicineRevenueGrowthRate) },
        { label: "Pacientes", value: record.telemedicinePatients.toLocaleString("en-US") },
        { label: "Venta directa", value: formatCurrency(record.directRevenue) },
      ],
      narrative:
        "Telemedicina no debe aparecer como modalidad de imagen; debe tratarse como procedencia o modelo de atencion.",
      status: "Requiere explicacion",
      title: "5. Telemedicina versus atencion directa",
    },
    {
      action: "Separar modalidades directas, Telemedicina y modalidad consolidada.",
      evidence: record.modalityRecords
        .map((item) => `${item.name}: ${formatCurrency(item.revenue)}`)
        .join(" "),
      id: "slide-6",
      kpis: [
        { label: "Principal venta", value: record.topModality },
        { label: "Rayos X volumen", value: `${record.modalityRecords.find((item) => item.id === "rayos-x")?.quantity ?? 0}` },
        { label: "TAC ticket", value: formatCurrency(record.modalityRecords.find((item) => item.id === "tac")?.ticket ?? 0) },
        { label: "Modalidades", value: `${record.modalityRecords.length}` },
      ],
      narrative:
        "Ultrasonografia aporta venta, Rayos X aporta volumen y TAC aporta ticket alto con bajo volumen.",
      status: "Listo",
      title: "6. Mezcla de modalidades",
    },
    {
      action: "Revisar estudios sin movimiento y proteger estudios estrella.",
      evidence: `Top 10 concentra ${formatPercent(record.top10RevenueConcentration)} de la facturacion.`,
      id: "slide-7",
      kpis: [
        { label: "Top 10 venta", value: formatPercent(record.top10RevenueConcentration) },
        { label: "Top estudios", value: `${record.topStudies.length}` },
        { label: "Mayor estudio", value: record.topStudies[0]?.name ?? "Pendiente" },
        { label: "Ticket alto", value: record.topStudies.find((item) => item.category === "Especializado")?.name ?? "Pendiente" },
      ],
      narrative:
        "El portafolio 80/20 muestra que estudios sostienen el negocio y cuales cargan volumen con bajo valor.",
      status: "Listo",
      title: "7. Portafolio 80/20",
    },
    {
      action: "Explicar por que el canal medico mantiene venta con mas ordenes y menor ticket.",
      evidence: `${formatCurrency(record.medicalRevenue)} en ordenes medicas, ${record.medicalOrders} ordenes y ticket ${formatCurrency(record.medicalTicket)}.`,
      id: "slide-8",
      kpis: [
        { label: "Venta medica", value: formatCurrency(record.medicalRevenue) },
        { label: "Ordenes", value: record.medicalOrders.toLocaleString("en-US") },
        { label: "Ticket", value: formatCurrency(record.medicalTicket) },
        { label: "Ticket cambio", value: formatRate(record.medicalTicketChangeRate) },
      ],
      narrative:
        "El canal medico debe mostrar medicos referidores, especialidades y relacion medico -> modalidad -> estudio.",
      status: "Requiere explicacion",
      title: "8. Canal medico y medicos referidores",
    },
    {
      action: "Priorizar especialidades con alto ticket y estudiar mezcla de descuentos.",
      evidence: record.specialties
        .slice(0, 3)
        .map((item) => `${item.name}: ${formatCurrency(item.revenue)}`)
        .join(" "),
      id: "slide-9",
      kpis: [
        { label: "Especialidades", value: `${record.specialties.length}` },
        { label: "Principal", value: record.specialties[0]?.name ?? "Pendiente" },
        { label: "Estudio clave", value: record.specialties[0]?.keyStudy ?? "Pendiente" },
        { label: "Ticket principal", value: formatCurrency(record.specialties[0]?.ticket ?? 0) },
      ],
      narrative:
        "Cardiologia destaca cuando pesan AngioTAC coronario y protocolos cardiovasculares.",
      status: "Listo",
      title: "9. Especialidades medicas",
    },
    {
      action: "Gestionar concentracion y dependencia del canal por visitador.",
      evidence: `Top 3 visitadores representan ${formatPercent(record.top3VisitorsShare)} del canal medico; Top 5 ${formatPercent(record.top5VisitorsShare)}.`,
      id: "slide-10",
      kpis: [
        { label: "Top 3", value: formatPercent(record.top3VisitorsShare) },
        { label: "Top 5", value: formatPercent(record.top5VisitorsShare) },
        { label: "Visitadores", value: `${record.visitors.length}` },
        { label: "Mayor cartera", value: record.visitors[0]?.name ?? "Pendiente" },
      ],
      narrative:
        "La presentacion debe mostrar visitador -> medico -> estudio para detectar dependencia y carteras sin actividad.",
      status: record.top3VisitorsShare > 0.62 ? "Requiere explicacion" : "Listo",
      title: "10. Gestion de visitadores medicos",
    },
    {
      action: "Conectar agenda para medir estudios por dia, hora, no-show y lista de espera.",
      evidence: "La plantilla actual no tiene agenda completa por dia y hora.",
      id: "slide-11",
      kpis: [
        { label: "Agenda", value: record.capacityStatus },
        { label: "No-show", value: "Pendiente" },
        { label: "Lista espera", value: "Pendiente" },
        { label: "Franja demanda", value: "Pendiente" },
      ],
      narrative:
        "La distribucion temporal debe venir del sistema de agenda o del registro del estudio.",
      status: "Pendiente de fuente",
      title: "11. Demanda y distribucion temporal",
    },
    {
      action: "Conectar agenda, equipos y mantenimiento antes de reportar utilizacion.",
      evidence: "Capacidad y equipos no tienen datos suficientes en la plantilla.",
      id: "slide-12",
      kpis: [
        { label: "Equipos activos", value: "Pendiente" },
        { label: "Horas disponibles", value: "Pendiente" },
        { label: "Utilizacion", value: "Pendiente" },
        { label: "Mantenimiento", value: "Pendiente" },
      ],
      narrative:
        "No se deben usar valores simulados para equipos, horas disponibles o capacidad perdida.",
      status: "Pendiente de fuente",
      title: "12. Capacidad y equipos",
    },
    {
      action: "Integrar PACS/RIS para medir informes pendientes y SLA.",
      evidence: "Informes y tiempos de entrega no aparecen en la plantilla.",
      id: "slide-13",
      kpis: [
        { label: "Informes emitidos", value: "Pendiente" },
        { label: "Informes pendientes", value: "Pendiente" },
        { label: "SLA", value: "Pendiente" },
        { label: "Tiempo lectura", value: "Pendiente" },
      ],
      narrative:
        "La slide debe responder si se realizan estudios pero no se informan con suficiente velocidad.",
      status: "Pendiente de fuente",
      title: "13. Informes y tiempos de entrega",
    },
    {
      action: "Conectar fuente clinica o sistema de calidad.",
      evidence: "La plantilla no trae repeticiones, protocolos, incidentes ni reclamos.",
      id: "slide-14",
      kpis: [
        { label: "Repeticiones", value: "Pendiente" },
        { label: "Incidentes", value: "Pendiente" },
        { label: "Protocolos", value: "Pendiente" },
        { label: "Reclamos", value: "Pendiente" },
      ],
      narrative:
        "Calidad tecnica debe quedar pendiente cuando no exista fuente clinica confiable.",
      status: "Pendiente de fuente",
      title: "14. Calidad tecnica",
    },
    {
      action: "Ver detalle completo en Salud financiera -> Imagenes -> sucursal.",
      evidence:
        record.financeConciliationStatus === "Confiable"
          ? "Finanzas conciliadas."
          : "Utilidad pendiente por gastos vacios o inconsistentes.",
      id: "slide-15",
      kpis: [
        { label: "Venta", value: formatCurrency(record.revenue) },
        { label: "Meta", value: formatCurrency(record.revenueTarget) },
        { label: "Cumplimiento", value: formatRate(record.revenueCompletionRate) },
        { label: "Utilidad", value: "Pendiente" },
      ],
      narrative:
        "El resumen financiero no copia toda Salud financiera; solo muestra resultado y alerta de conciliacion.",
      status:
        record.financeConciliationStatus === "Confiable"
          ? "Listo"
          : "Requiere explicacion",
      title: "15. Resumen financiero",
    },
    {
      action: "Corregir total de personal antes de usar productividad.",
      evidence: `${record.staffingDetail.calculatedTotal} personas calculadas contra ${record.staffingDetail.mainSheetTotal} en hoja principal.`,
      id: "slide-16",
      kpis: [
        { label: "Licenciados", value: `${record.staffingDetail.licensees}` },
        { label: "Medicos", value: `${record.staffingDetail.doctors}` },
        { label: "Atencion", value: `${record.staffingDetail.customerCare}` },
        { label: "Total calculado", value: `${record.staffingDetail.calculatedTotal}` },
      ],
      narrative:
        "No se debe medir productividad solo por cantidad de personas; falta horas contratadas, turnos y cobertura.",
      status: record.staffingStatus === "Consistente" ? "Listo" : "Requiere explicacion",
      title: "16. Personal y cobertura",
    },
    {
      action: "Comparar contra red solo con sedes normalizadas por capacidad instalada.",
      evidence: "No comparar Rayos X basico contra sedes con TAC y Ultrasonografia avanzada sin normalizar.",
      id: "slide-17",
      kpis: [
        { label: "Red", value: "Pendiente" },
        { label: "Sede comparable", value: "Pendiente" },
        { label: "Meta", value: formatCurrency(record.revenueTarget) },
        { label: "Benchmark", value: "Normalizar capacidad" },
      ],
      narrative:
        "La comparacion contra la red debe controlar equipamiento, modalidad, capacidad y mezcla de estudios.",
      status: "Pendiente de fuente",
      title: "17. Comparacion contra la red",
    },
    {
      action: "La gerente debe escribir causa, evidencia, acciones y factores externos.",
      evidence: record.managerExplanationRequired.join(" "),
      id: "slide-18",
      kpis: [
        { label: "Explicaciones", value: `${record.managerExplanationRequired.length}` },
        { label: "Venta", value: formatCurrency(record.revenue) },
        { label: "Ordenes", value: record.orders.toLocaleString("en-US") },
        { label: "Telemedicina", value: formatCurrency(record.telemedicineRevenue) },
      ],
      narrative:
        "Las variaciones no deben quedarse en 'hubo mas pacientes'; deben tener causa operacional verificable.",
      status: "Requiere explicacion",
      title: "18. Variaciones explicadas por la gerente",
    },
    {
      action: "Plan de accion obligatorio para cerrar la presentacion.",
      evidence: record.actionPlan.map((item) => `${item.action}: ${item.expectedImpact}`).join(" "),
      id: "slide-19",
      kpis: [
        { label: "Acciones", value: `${record.actionPlan.length}` },
        { label: "Pendientes", value: `${record.actionPlan.filter((item) => item.status === "Pendiente").length}` },
        { label: "En curso", value: `${record.actionPlan.filter((item) => item.status === "En curso").length}` },
        { label: "Impacto", value: "Trazable" },
      ],
      narrative:
        "Cada accion debe tener responsable, fecha, KPI, impacto esperado y estado.",
      status: "Listo",
      title: "19. Plan de accion",
    },
    {
      action: record.ceoDecision,
      evidence: record.requiredDecisions.map((item) => item.evidence).join(" "),
      id: "slide-20",
      kpis: [
        { label: "Decisiones", value: `${record.requiredDecisions.length}` },
        { label: "Urgencia alta", value: `${record.requiredDecisions.filter((item) => item.urgency === "Alta").length}` },
        { label: "Costo", value: record.requiredDecisions[0]?.cost ?? "Pendiente" },
        { label: "Beneficio", value: record.requiredDecisions[0]?.benefit ?? "Pendiente" },
      ],
      narrative:
        "Cada solicitud al CEO debe mostrar problema, evidencia, impacto, costo, beneficio, urgencia y decision solicitada.",
      status: "Decision CEO",
      title: "20. Decisiones requeridas",
    },
  ];
}

function seriesForRecords(
  records: ImagingBranchRecord[],
  field: keyof ImagingBranchRecord["trend"],
  valueFormatter: (record: ImagingBranchRecord) => string,
): TrendSeries[] {
  const scoped = records.slice(0, 5);

  return [
    ...scoped.map((record, index) => ({
      color: trendColors[index % trendColors.length],
      label: record.branch,
      points: record.trend[field],
      value: valueFormatter(record),
    })),
    {
      color: "slate" as const,
      label: field === "revenue" ? "Meta" : "Referencia",
      points:
        field === "revenue"
          ? [74000, 74000, 74000, 74000, 74000, 74000, 74000]
          : field === "ticket"
            ? [32, 32, 32, 32, 32, 32, 32]
            : [2400, 2400, 2400, 2400, 2400, 2400, 2400],
      value: field === "revenue" ? "$74K" : field === "ticket" ? "$32" : "2.4K",
    },
  ];
}

export function buildImagingTrendChart(records: ImagingBranchRecord[]) {
  const scopedRecords = records.slice(0, 5);
  const firstRecord = scopedRecords[0] ?? imagingBranchRecords[0];
  const insights: TrendInsight[] = [
    {
      label: "Comparacion activa",
      note: "Cambia KPI, fechas y sucursales para leer venta, ordenes, estudios, Telemedicina o ticket.",
      tone: "neutral",
      value: `${scopedRecords.length} sucursales`,
    },
    {
      label: "Motor del mes",
      note: firstRecord?.mainOpportunity ?? "Sin oportunidad principal.",
      tone: "positive",
      value: firstRecord?.topGrowthChannel ?? "Pendiente",
    },
    {
      label: "Datos pendientes",
      note: "Capacidad, informes y calidad deben quedar pendientes hasta conectar agenda y PACS/RIS.",
      tone: "warning",
      value: "No simular",
    },
  ];
  const metricOptions: TrendChartOption[] = [
    {
      description: "Venta diaria acumulada contra meta o periodo comparable.",
      id: "venta-imagenes-presentacion",
      insights,
      label: "Venta",
      series: seriesForRecords(scopedRecords, "revenue", (record) =>
        formatCurrency(record.revenue),
      ),
      yLabel: "USD",
    },
    {
      description: "Ordenes de estudios registradas en el periodo.",
      id: "ordenes-imagenes-presentacion",
      insights,
      label: "Ordenes",
      series: seriesForRecords(scopedRecords, "orders", (record) =>
        record.orders.toLocaleString("en-US"),
      ),
      yLabel: "Ordenes",
    },
    {
      description: "Estudios realizados, separados de clientes y ordenes.",
      id: "estudios-imagenes-presentacion",
      insights,
      label: "Estudios",
      series: seriesForRecords(scopedRecords, "studies", (record) =>
        record.studies.toLocaleString("en-US"),
      ),
      yLabel: "Estudios",
    },
    {
      description: "Venta de Telemedicina como procedencia o modelo de atencion, no modalidad.",
      id: "telemedicina-imagenes-presentacion",
      insights,
      label: "Venta Telemedicina",
      series: seriesForRecords(scopedRecords, "telemedicineRevenue", (record) =>
        formatCurrency(record.telemedicineRevenue),
      ),
      yLabel: "USD",
    },
    {
      description: "Venta no Telemedicina o atencion directa.",
      id: "directa-imagenes-presentacion",
      insights,
      label: "Venta directa",
      series: seriesForRecords(scopedRecords, "directRevenue", (record) =>
        formatCurrency(record.directRevenue),
      ),
      yLabel: "USD",
    },
    {
      description: "Venta por ordenes medicas para medir referidores y especialidades.",
      id: "canal-medico-imagenes-presentacion",
      insights,
      label: "Canal medico",
      series: seriesForRecords(scopedRecords, "medicalRevenue", (record) =>
        formatCurrency(record.medicalRevenue),
      ),
      yLabel: "USD",
    },
    {
      description: "Ticket por orden; alerta cuando suben ordenes pero no sube venta.",
      id: "ticket-imagenes-presentacion",
      insights,
      label: "Ticket",
      series: seriesForRecords(scopedRecords, "ticket", (record) =>
        formatCurrency(record.ticketPerOrder),
      ),
      yLabel: "USD por orden",
    },
  ];

  return {
    description:
      "Compara sucursales, fechas y KPI para preparar la presentacion mensual de Imagenes.",
    insights,
    metricOptions,
    series: metricOptions[0].series,
    title: "Tendencia para presentacion de Imagenes",
    xLabels: exactDateLabels,
    yLabel: metricOptions[0].yLabel,
  };
}
