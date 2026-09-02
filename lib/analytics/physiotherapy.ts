import type {
  TrendChartOption,
  TrendInsight,
  TrendSeries,
} from "@/components/analytics-comparison-chart";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";

export type PhysioMetricGroup =
  | "Validacion"
  | "Captacion"
  | "Continuidad"
  | "Operacion"
  | "Valor";

export type PhysioMetric = {
  group: PhysioMetricGroup;
  label: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
  value: string;
};

export type PhysioSlideStatus =
  | "Listo"
  | "Requiere explicacion"
  | "Pendiente de fuente"
  | "Decision CEO";

export type PhysioSlide = {
  action: string;
  evidence: string;
  id: string;
  kpis: { label: string; value: string }[];
  narrative: string;
  status: PhysioSlideStatus;
  title: string;
};

export type PhysioBranchRecord = {
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
  dataQualityScore: number;
  validationStatus: "Validado" | "Requiere confirmacion" | "Bloqueado";
  validationFindings: string[];
  captureRequests: number;
  evaluations: number;
  conversionToEvaluationRate: number;
  plansStarted: number;
  evaluationToPlanRate: number;
  activePlans: number;
  completedPlans: number;
  planCompletionRate: number;
  abandonedPlans: number;
  abandonmentRate: number;
  sessionsIndicated: number;
  sessionsScheduled: number;
  sessionsCompleted: number;
  sessionAttendanceRate: number;
  noShows: number;
  noShowRate: number;
  cancellations: number;
  cancellationRate: number;
  rescheduled: number;
  continuity30Rate: number;
  continuity60Rate: number;
  continuity90Rate: number;
  activePatients: number;
  newPatients: number;
  recurrentPatients: number;
  reactivatedPatients: number;
  dischargedPatients: number;
  patientsAtRisk: number;
  waitlist: number;
  avgDaysBetweenSessions: number;
  recommendedDaysBetweenSessions: number;
  availableHours: number;
  scheduledHours: number;
  attendedHours: number;
  effectiveOccupancyRate: number;
  scheduledOccupancyRate: number;
  roomsUsedRate: number;
  therapistCount: number;
  sessionsPerTherapist: number;
  clinicalRecordsCompleteRate: number;
  satisfactionRate: number;
  outcomeImprovementRate: number | null;
  outcomeSourceStatus: "Disponible" | "Pendiente";
  revenue: number;
  revenueTarget: number;
  revenueCompletionRate: number;
  revenuePerPatient: number;
  revenuePerHour: number;
  marginRate: number;
  lostIncome: number;
  unbilledSessions: number;
  actionPriority: string;
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
    urgency: "Alta" | "Media" | "Baja";
  }[];
  heatmap: number[][];
  trend: {
    activePatients: number[];
    continuity: number[];
    evaluations: number[];
    plans: number[];
    revenue: number[];
    sessions: number[];
    noShow: number[];
  };
};

const dateLabels = [
  "01/07/2026",
  "05/07/2026",
  "10/07/2026",
  "15/07/2026",
  "20/07/2026",
  "25/07/2026",
  "31/07/2026",
];

const trendColors: TrendSeries["color"][] = [
  "blue",
  "orange",
  "teal",
  "green",
  "rose",
];

function buildVolumePoints(value: number) {
  return [0.66, 0.72, 0.79, 0.86, 0.92, 0.97, 1].map((factor) =>
    Math.round(value * factor),
  );
}

function buildRatePoints(value: number, delta: number) {
  const start = Math.max(0, Math.min(100, value - delta - 5));

  return [start, start + 2, start + 4, value - 2, value - 1, value, value].map(
    (point) => Math.round(Math.max(0, Math.min(100, point))),
  );
}

function finishRecord(
  input: Omit<PhysioBranchRecord, "trend"> & { trendDelta: number },
): PhysioBranchRecord {
  const { trendDelta, ...record } = input;

  return {
    ...record,
    trend: {
      activePatients: buildVolumePoints(record.activePatients),
      continuity: buildRatePoints(record.continuity30Rate, trendDelta),
      evaluations: buildVolumePoints(record.evaluations),
      noShow: buildRatePoints(record.noShowRate, -trendDelta),
      plans: buildVolumePoints(record.plansStarted),
      revenue: buildVolumePoints(record.revenue),
      sessions: buildVolumePoints(record.sessionsCompleted),
    },
  };
}

export const physioBranchRecords: PhysioBranchRecord[] = [
  finishRecord({
    abandonedPlans: 22,
    abandonmentRate: 12,
    actionPlan: [
      {
        action: "Reservar bloques de continuidad antes de abrir pacientes nuevos",
        dueDate: "2026-07-08",
        expectedImpact: "+7 pts continuidad 30 dias",
        kpi: "Continuidad terapeutica",
        owner: "Gerente Norte",
        status: "En curso",
      },
      {
        action: "Confirmacion 24 h antes y lista de espera por franja",
        dueDate: "2026-07-12",
        expectedImpact: "-18 no-shows",
        kpi: "No-show",
        owner: "Coordinacion agenda",
        status: "Pendiente",
      },
    ],
    actionPriority: "Proteger espacios de continuidad sin aumentar carga clinica.",
    activePatients: 420,
    activePlans: 266,
    areaManager: "Direccion Fisioterapia",
    attendedHours: 224,
    availableHours: 292,
    avgDaysBetweenSessions: 6.1,
    branch: "Fisioterapia Norte",
    cancellationRate: 6,
    cancellations: 42,
    captureRequests: 386,
    ceoDecision: "Autorizar agenda protegida para pacientes activos.",
    clinicalRecordsCompleteRate: 91,
    closeDate: "2026-07-31",
    completedPlans: 168,
    continuity30Rate: 82,
    continuity60Rate: 74,
    continuity90Rate: 66,
    conversionToEvaluationRate: 88,
    dataQualityScore: 89,
    detectedPeriod: "Julio 2026",
    dischargedPatients: 46,
    effectiveOccupancyRate: 77,
    evaluationToPlanRate: 83,
    evaluations: 338,
    fileName: "Plantilla Julio 2026 Fisioterapia Norte.xlsx",
    heatmap: [
      [58, 84, 91, 70],
      [64, 88, 92, 76],
      [52, 81, 87, 72],
      [60, 83, 89, 74],
      [48, 76, 82, 68],
    ],
    id: "fisio-norte",
    lostIncome: 4800,
    manager: "Gerente Norte",
    managerExplanationRequired: [
      "Explicar por que 44 pacientes activos no tienen proxima sesion dentro de frecuencia recomendada.",
      "Indicar si la agenda protegida afectara captacion nueva.",
    ],
    marginRate: 48,
    newPatients: 126,
    noShowRate: 7,
    noShows: 52,
    outcomeImprovementRate: 76,
    outcomeSourceStatus: "Disponible",
    patientsAtRisk: 44,
    period: "Julio 2026",
    planCompletionRate: 63,
    plansStarted: 281,
    recommendedDaysBetweenSessions: 5,
    recurrentPatients: 248,
    reactivatedPatients: 46,
    requiredDecisions: [
      {
        benefit: "Mayor continuidad y menor abandono",
        cost: "Reordenar 12 bloques semanales",
        decision: "Aprobar agenda protegida",
        evidence: "82% continuidad 30 dias, pero 44 pacientes en riesgo",
        urgency: "Alta",
      },
    ],
    rescheduled: 61,
    revenue: 42800,
    revenueCompletionRate: 1.08,
    revenuePerHour: 191,
    revenuePerPatient: 102,
    revenueTarget: 39500,
    roomsUsedRate: 84,
    satisfactionRate: 93,
    scheduledHours: 252,
    scheduledOccupancyRate: 86,
    selectedPeriod: "Julio 2026",
    sessionAttendanceRate: 89,
    sessionsCompleted: 512,
    sessionsIndicated: 694,
    sessionsPerTherapist: 102,
    sessionsScheduled: 576,
    therapistCount: 5,
    trendDelta: 4,
    unbilledSessions: 7,
    uploadDate: "2026-08-01",
    validationFindings: [
      "Periodo del archivo coincide con periodo seleccionado.",
      "Faltan motivos estructurados de abandono para 9 planes.",
      "Resultados funcionales disponibles para 76% de pacientes activos.",
    ],
    validationStatus: "Validado",
    waitlist: 24,
  }),
  finishRecord({
    abandonedPlans: 44,
    abandonmentRate: 24,
    actionPlan: [
      {
        action: "Llamada de rescate a pacientes sin sesion en 10 dias",
        dueDate: "2026-07-09",
        expectedImpact: "Recuperar 28 pacientes activos",
        kpi: "Abandono",
        owner: "Gerente Centro",
        status: "Pendiente",
      },
      {
        action: "Auditar notas clinicas pendientes antes del cierre",
        dueDate: "2026-07-06",
        expectedImpact: "+12 pts registros completos",
        kpi: "Calidad de registros",
        owner: "Coordinacion clinica",
        status: "En curso",
      },
    ],
    actionPriority: "Corregir continuidad antes de aumentar captacion.",
    activePatients: 360,
    activePlans: 214,
    areaManager: "Direccion Fisioterapia",
    attendedHours: 196,
    availableHours: 284,
    avgDaysBetweenSessions: 8.4,
    branch: "Fisioterapia Centro",
    cancellationRate: 9,
    cancellations: 58,
    captureRequests: 420,
    ceoDecision: "Autorizar campana de recuperacion y refuerzo de seguimiento.",
    clinicalRecordsCompleteRate: 72,
    closeDate: "2026-07-31",
    completedPlans: 118,
    continuity30Rate: 64,
    continuity60Rate: 51,
    continuity90Rate: 42,
    conversionToEvaluationRate: 84,
    dataQualityScore: 74,
    detectedPeriod: "Julio 2026",
    dischargedPatients: 28,
    effectiveOccupancyRate: 69,
    evaluationToPlanRate: 68,
    evaluations: 352,
    fileName: "Plantilla Julio 2026 Fisioterapia Centro.xlsx",
    heatmap: [
      [42, 78, 86, 64],
      [48, 82, 91, 68],
      [39, 76, 84, 61],
      [44, 79, 88, 63],
      [36, 70, 78, 55],
    ],
    id: "fisio-centro",
    lostIncome: 11300,
    manager: "Gerente Centro",
    managerExplanationRequired: [
      "Explicar baja conversion de evaluacion a plan.",
      "Detallar causa operativa de 44 planes abandonados.",
      "Confirmar si las notas clinicas pendientes impiden medir resultados.",
    ],
    marginRate: 39,
    newPatients: 148,
    noShowRate: 11,
    noShows: 72,
    outcomeImprovementRate: null,
    outcomeSourceStatus: "Pendiente",
    patientsAtRisk: 78,
    period: "Julio 2026",
    planCompletionRate: 55,
    plansStarted: 239,
    recommendedDaysBetweenSessions: 5,
    recurrentPatients: 168,
    reactivatedPatients: 44,
    requiredDecisions: [
      {
        benefit: "Reducir abandono y recuperar ingreso potencial",
        cost: "$850 campana de seguimiento",
        decision: "Aprobar campana de recuperacion",
        evidence: "24% abandono y $11.3K ingreso perdido",
        urgency: "Alta",
      },
      {
        benefit: "Medicion clinica confiable",
        cost: "Bloque administrativo semanal",
        decision: "Aprobar bloque de cierre clinico",
        evidence: "72% registros completos",
        urgency: "Media",
      },
    ],
    rescheduled: 86,
    revenue: 36200,
    revenueCompletionRate: 0.91,
    revenuePerHour: 185,
    revenuePerPatient: 101,
    revenueTarget: 39800,
    roomsUsedRate: 76,
    satisfactionRate: 82,
    scheduledHours: 250,
    scheduledOccupancyRate: 88,
    selectedPeriod: "Julio 2026",
    sessionAttendanceRate: 78,
    sessionsCompleted: 456,
    sessionsIndicated: 720,
    sessionsPerTherapist: 91,
    sessionsScheduled: 584,
    therapistCount: 5,
    trendDelta: -6,
    unbilledSessions: 18,
    uploadDate: "2026-08-01",
    validationFindings: [
      "Periodo del archivo coincide con periodo seleccionado.",
      "Resultados funcionales pendientes: no se puede afirmar mejora clinica global.",
      "Diferencia entre sesiones agendadas y atendidas requiere explicacion de no-show/cancelacion.",
    ],
    validationStatus: "Requiere confirmacion",
    waitlist: 18,
  }),
  finishRecord({
    abandonedPlans: 18,
    abandonmentRate: 11,
    actionPlan: [
      {
        action: "Impulsar referidos en franjas vespertinas",
        dueDate: "2026-07-14",
        expectedImpact: "+36 sesiones mensuales",
        kpi: "Ocupacion efectiva",
        owner: "Gerente Sur",
        status: "Pendiente",
      },
      {
        action: "Mantener seguimiento de pacientes neurologicos",
        dueDate: "2026-07-18",
        expectedImpact: "+5 pts continuidad 60 dias",
        kpi: "Continuidad 60 dias",
        owner: "Coordinacion clinica",
        status: "En curso",
      },
    ],
    actionPriority: "Usar capacidad disponible en horarios vespertinos.",
    activePatients: 296,
    activePlans: 188,
    areaManager: "Direccion Fisioterapia",
    attendedHours: 186,
    availableHours: 260,
    avgDaysBetweenSessions: 6.6,
    branch: "Fisioterapia Sur",
    cancellationRate: 7,
    cancellations: 34,
    captureRequests: 284,
    ceoDecision: "Aprobar campana local para horarios subutilizados.",
    clinicalRecordsCompleteRate: 88,
    closeDate: "2026-07-31",
    completedPlans: 122,
    continuity30Rate: 78,
    continuity60Rate: 68,
    continuity90Rate: 59,
    conversionToEvaluationRate: 86,
    dataQualityScore: 86,
    detectedPeriod: "Julio 2026",
    dischargedPatients: 36,
    effectiveOccupancyRate: 72,
    evaluationToPlanRate: 79,
    evaluations: 244,
    fileName: "Plantilla Julio 2026 Fisioterapia Sur.xlsx",
    heatmap: [
      [40, 70, 78, 54],
      [46, 74, 82, 58],
      [38, 68, 76, 52],
      [42, 72, 80, 56],
      [34, 62, 70, 48],
    ],
    id: "fisio-sur",
    lostIncome: 5400,
    manager: "Gerente Sur",
    managerExplanationRequired: [
      "Explicar baja demanda vespertina pese a disponibilidad.",
      "Definir campana para pacientes con sesiones pendientes.",
    ],
    marginRate: 44,
    newPatients: 92,
    noShowRate: 8,
    noShows: 39,
    outcomeImprovementRate: 72,
    outcomeSourceStatus: "Disponible",
    patientsAtRisk: 34,
    period: "Julio 2026",
    planCompletionRate: 65,
    plansStarted: 193,
    recommendedDaysBetweenSessions: 5,
    recurrentPatients: 166,
    reactivatedPatients: 38,
    requiredDecisions: [
      {
        benefit: "Aumentar demanda sin contratar mas personal",
        cost: "$620 campana local",
        decision: "Aprobar campana por franja vespertina",
        evidence: "72% ocupacion efectiva y 48% carga viernes PM",
        urgency: "Media",
      },
    ],
    rescheduled: 42,
    revenue: 31800,
    revenueCompletionRate: 0.97,
    revenuePerHour: 171,
    revenuePerPatient: 107,
    revenueTarget: 32800,
    roomsUsedRate: 72,
    satisfactionRate: 90,
    scheduledHours: 218,
    scheduledOccupancyRate: 84,
    selectedPeriod: "Julio 2026",
    sessionAttendanceRate: 84,
    sessionsCompleted: 394,
    sessionsIndicated: 540,
    sessionsPerTherapist: 99,
    sessionsScheduled: 468,
    therapistCount: 4,
    trendDelta: 2,
    unbilledSessions: 6,
    uploadDate: "2026-08-01",
    validationFindings: [
      "Periodo del archivo coincide con periodo seleccionado.",
      "Faltan motivos de baja demanda por franja vespertina.",
      "Resultados funcionales disponibles para 72% de pacientes activos.",
    ],
    validationStatus: "Validado",
    waitlist: 9,
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

export function buildPhysioMetrics(records: PhysioBranchRecord[]): PhysioMetric[] {
  const totalRequests = records.reduce((sum, record) => sum + record.captureRequests, 0);
  const totalEvaluations = records.reduce((sum, record) => sum + record.evaluations, 0);
  const totalPlans = records.reduce((sum, record) => sum + record.plansStarted, 0);
  const totalSessions = records.reduce((sum, record) => sum + record.sessionsCompleted, 0);
  const totalPatients = records.reduce((sum, record) => sum + record.activePatients, 0);
  const totalAtRisk = records.reduce((sum, record) => sum + record.patientsAtRisk, 0);
  const totalNoShows = records.reduce((sum, record) => sum + record.noShows, 0);
  const totalCancellations = records.reduce((sum, record) => sum + record.cancellations, 0);
  const totalRevenue = records.reduce((sum, record) => sum + record.revenue, 0);
  const totalTarget = records.reduce((sum, record) => sum + record.revenueTarget, 0);
  const totalLost = records.reduce((sum, record) => sum + record.lostIncome, 0);
  const unbilled = records.reduce((sum, record) => sum + record.unbilledSessions, 0);
  const averageQuality =
    records.reduce((sum, record) => sum + record.dataQualityScore, 0) /
    Math.max(records.length, 1);
  const averageContinuity =
    records.reduce((sum, record) => sum + record.continuity30Rate, 0) /
    Math.max(records.length, 1);
  const averageOccupancy =
    records.reduce((sum, record) => sum + record.effectiveOccupancyRate, 0) /
    Math.max(records.length, 1);
  const averageAttendance =
    records.reduce((sum, record) => sum + record.sessionAttendanceRate, 0) /
    Math.max(records.length, 1);
  const averagePlanConversion =
    records.reduce((sum, record) => sum + record.evaluationToPlanRate, 0) /
    Math.max(records.length, 1);
  const pendingOutcomes = records.filter(
    (record) => record.outcomeSourceStatus === "Pendiente",
  ).length;
  const pendingValidation = records.filter(
    (record) => record.validationStatus !== "Validado",
  ).length;

  return [
    { group: "Validacion", label: "Calidad de datos", value: `${Math.round(averageQuality)}`, note: "plantillas y fuentes", tone: metricTone(averageQuality, 86, 76) },
    { group: "Validacion", label: "Sucursales a confirmar", value: `${pendingValidation}`, note: "antes de presentar al CEO", tone: pendingValidation > 0 ? "warning" : "positive" },
    { group: "Validacion", label: "Resultados pendientes", value: `${pendingOutcomes}`, note: "fuente clinica incompleta", tone: pendingOutcomes > 0 ? "warning" : "positive" },
    { group: "Captacion", label: "Solicitudes", value: totalRequests.toLocaleString("en-US"), note: "captacion inicial", tone: "neutral" },
    { group: "Captacion", label: "Evaluaciones", value: totalEvaluations.toLocaleString("en-US"), note: "primer paso clinico", tone: "positive" },
    { group: "Captacion", label: "Conversion a plan", value: `${Math.round(averagePlanConversion)}%`, note: "evaluacion a plan", tone: metricTone(averagePlanConversion, 82, 72) },
    { group: "Continuidad", label: "Planes iniciados", value: totalPlans.toLocaleString("en-US"), note: "tratamientos abiertos", tone: "positive" },
    { group: "Continuidad", label: "Sesiones completadas", value: totalSessions.toLocaleString("en-US"), note: "cumplimiento real", tone: "positive" },
    { group: "Continuidad", label: "Continuidad 30 dias", value: `${Math.round(averageContinuity)}%`, note: "frecuencia terapeutica", tone: metricTone(averageContinuity, 80, 68) },
    { group: "Continuidad", label: "Pacientes en riesgo", value: totalAtRisk.toLocaleString("en-US"), note: "sin proxima sesion", tone: totalAtRisk > 120 ? "negative" : "warning" },
    { group: "Operacion", label: "Ocupacion efectiva", value: `${Math.round(averageOccupancy)}%`, note: "horas atendidas / disponibles", tone: metricTone(averageOccupancy, 78, 68) },
    { group: "Operacion", label: "Asistencia efectiva", value: `${Math.round(averageAttendance)}%`, note: "sesiones atendidas / agendadas", tone: metricTone(averageAttendance, 86, 78) },
    { group: "Operacion", label: "No-show", value: totalNoShows.toLocaleString("en-US"), note: "citas perdidas", tone: totalNoShows > 140 ? "negative" : "warning" },
    { group: "Operacion", label: "Cancelaciones", value: totalCancellations.toLocaleString("en-US"), note: "requieren recuperacion", tone: "warning" },
    { group: "Valor", label: "Ingreso", value: formatCurrency(totalRevenue), note: `${formatRate(totalRevenue / Math.max(totalTarget, 1))} de meta`, tone: totalRevenue >= totalTarget ? "positive" : "warning" },
    { group: "Valor", label: "Ingreso perdido", value: formatCurrency(totalLost), note: "no-show, abandono y capacidad", tone: totalLost > 16000 ? "negative" : "warning" },
    { group: "Valor", label: "Sesiones sin facturar", value: `${unbilled}`, note: "conciliacion requerida", tone: unbilled > 24 ? "negative" : "warning" },
    { group: "Valor", label: "Pacientes activos", value: totalPatients.toLocaleString("en-US"), note: "base terapeutica", tone: "positive" },
  ];
}

export function buildPhysioSlides(record: PhysioBranchRecord): PhysioSlide[] {
  return [
    {
      action: record.validationStatus === "Validado" ? "Usar para presentacion mensual." : "Confirmar datos antes de consolidar.",
      evidence: record.validationFindings.join(" "),
      id: "slide-validacion",
      kpis: [
        { label: "Periodo detectado", value: record.detectedPeriod },
        { label: "Periodo seleccionado", value: record.selectedPeriod },
        { label: "Calidad datos", value: `${record.dataQualityScore}` },
        { label: "Estado", value: record.validationStatus },
      ],
      narrative:
        "La portada debe mostrar sucursal, gerente, periodo, fecha de carga, version y alertas de validacion antes de presentar resultados.",
      status: record.validationStatus === "Validado" ? "Listo" : "Requiere explicacion",
      title: "1. Portada y estado de datos",
    },
    {
      action: record.actionPriority,
      evidence: `${record.revenueCompletionRate >= 1 ? "Sobre meta" : "Bajo meta"} con ${record.continuity30Rate}% de continuidad 30 dias y ${record.patientsAtRisk} pacientes en riesgo.`,
      id: "slide-resumen",
      kpis: [
        { label: "Ingreso", value: formatCurrency(record.revenue) },
        { label: "Meta", value: formatCurrency(record.revenueTarget) },
        { label: "Cumplimiento", value: formatRate(record.revenueCompletionRate) },
        { label: "Ocupacion efectiva", value: `${record.effectiveOccupancyRate}%` },
      ],
      narrative:
        "El resumen ejecutivo debe explicar si el resultado viene de captacion, conversion, continuidad, asistencia efectiva o ticket.",
      status: record.revenueCompletionRate >= 1 && record.continuity30Rate >= 78 ? "Listo" : "Requiere explicacion",
      title: "2. Resumen ejecutivo",
    },
    {
      action: "Separar conversion comercial de conversion clinica.",
      evidence: `${record.captureRequests} solicitudes, ${record.evaluations} evaluaciones y ${record.plansStarted} planes iniciados.`,
      id: "slide-captacion",
      kpis: [
        { label: "Solicitudes", value: record.captureRequests.toLocaleString("en-US") },
        { label: "Evaluaciones", value: record.evaluations.toLocaleString("en-US") },
        { label: "Conversion evaluacion", value: `${record.conversionToEvaluationRate}%` },
        { label: "Conversion a plan", value: `${record.evaluationToPlanRate}%` },
      ],
      narrative:
        "Fisioterapia no termina en la primera cita: la historia correcta es captacion, evaluacion, plan y seguimiento.",
      status: record.evaluationToPlanRate >= 78 ? "Listo" : "Requiere explicacion",
      title: "3. Captacion, evaluacion y conversion a plan",
    },
    {
      action: "Identificar planes activos sin frecuencia terapeutica adecuada.",
      evidence: `${record.activePlans} planes activos, ${record.completedPlans} completados y ${record.abandonedPlans} abandonados.`,
      id: "slide-planes",
      kpis: [
        { label: "Planes activos", value: record.activePlans.toLocaleString("en-US") },
        { label: "Planes completados", value: record.completedPlans.toLocaleString("en-US") },
        { label: "Cumplimiento plan", value: `${record.planCompletionRate}%` },
        { label: "Abandono", value: `${record.abandonmentRate}%` },
      ],
      narrative:
        "La gerente debe explicar abandono, vencimiento de sesiones y pacientes que salen de frecuencia.",
      status: record.abandonmentRate <= 14 ? "Listo" : "Requiere explicacion",
      title: "4. Planes terapeuticos y abandono",
    },
    {
      action: "Recuperar no-shows y cancelaciones con lista de espera por franja.",
      evidence: `${record.sessionsScheduled} sesiones agendadas, ${record.sessionsCompleted} atendidas, ${record.noShows} no-shows.`,
      id: "slide-sesiones",
      kpis: [
        { label: "Sesiones indicadas", value: record.sessionsIndicated.toLocaleString("en-US") },
        { label: "Sesiones agendadas", value: record.sessionsScheduled.toLocaleString("en-US") },
        { label: "Sesiones atendidas", value: record.sessionsCompleted.toLocaleString("en-US") },
        { label: "Asistencia", value: `${record.sessionAttendanceRate}%` },
      ],
      narrative:
        "Agenda llena no equivale a continuidad. La presentacion debe separar agendado, atendido y recuperable.",
      status: record.sessionAttendanceRate >= 86 ? "Listo" : "Requiere explicacion",
      title: "5. Sesiones, no-show y asistencia",
    },
    {
      action: "Proteger espacios de continuidad antes de abrir cupos nuevos.",
      evidence: `${record.continuity30Rate}% a 30 dias, ${record.continuity60Rate}% a 60 dias y ${record.continuity90Rate}% a 90 dias.`,
      id: "slide-continuidad",
      kpis: [
        { label: "30 dias", value: `${record.continuity30Rate}%` },
        { label: "60 dias", value: `${record.continuity60Rate}%` },
        { label: "90 dias", value: `${record.continuity90Rate}%` },
        { label: "Dias entre sesiones", value: `${record.avgDaysBetweenSessions}` },
      ],
      narrative:
        "La continuidad muestra si el paciente realmente esta siguiendo el plan, no solo si asistio una vez.",
      status: record.continuity30Rate >= 78 ? "Listo" : "Requiere explicacion",
      title: "6. Continuidad terapeutica",
    },
    {
      action: record.effectiveOccupancyRate < 74 ? "Activar demanda en franjas libres." : "Vigilar saturacion por fisioterapeuta y sala.",
      evidence: `${record.scheduledOccupancyRate}% ocupacion agendada frente a ${record.effectiveOccupancyRate}% efectiva.`,
      id: "slide-capacidad",
      kpis: [
        { label: "Horas disponibles", value: `${record.availableHours} h` },
        { label: "Horas agendadas", value: `${record.scheduledHours} h` },
        { label: "Horas atendidas", value: `${record.attendedHours} h` },
        { label: "Consultorios", value: `${record.roomsUsedRate}%` },
      ],
      narrative:
        "Esta slide evita confundir agenda llena con capacidad efectiva utilizada.",
      status: record.effectiveOccupancyRate >= 70 ? "Listo" : "Requiere explicacion",
      title: "7. Agenda, capacidad y ocupacion efectiva",
    },
    {
      action: record.outcomeSourceStatus === "Disponible" ? "Usar resultados funcionales como evidencia clinica." : "Marcar resultados clinicos como pendiente de fuente.",
      evidence: record.outcomeImprovementRate === null ? "Fuente de resultados no cargada." : `${record.outcomeImprovementRate}% de pacientes con mejora registrada.`,
      id: "slide-resultados",
      kpis: [
        { label: "Pacientes activos", value: record.activePatients.toLocaleString("en-US") },
        { label: "Pacientes nuevos", value: record.newPatients.toLocaleString("en-US") },
        { label: "Pacientes recurrentes", value: record.recurrentPatients.toLocaleString("en-US") },
        { label: "Altas", value: record.dischargedPatients.toLocaleString("en-US") },
      ],
      narrative:
        "Fisioterapia debe medir resultados del paciente cuando la fuente exista; si no existe, debe decir pendiente y no inventar datos.",
      status: record.outcomeSourceStatus === "Disponible" ? "Listo" : "Pendiente de fuente",
      title: "8. Pacientes, altas y resultados",
    },
    {
      action: "Analizar capacidad general; el detalle individual pertenece a Profesionales.",
      evidence: `${record.therapistCount} fisioterapeutas, ${record.sessionsPerTherapist} sesiones por fisioterapeuta en promedio.`,
      id: "slide-productividad",
      kpis: [
        { label: "Fisioterapeutas", value: `${record.therapistCount}` },
        { label: "Sesiones/fisio", value: `${record.sessionsPerTherapist}` },
        { label: "Registros completos", value: `${record.clinicalRecordsCompleteRate}%` },
        { label: "Satisfaccion", value: `${record.satisfactionRate}%` },
      ],
      narrative:
        "Esta slide no premia ni castiga personas; solo muestra si la sucursal tiene capacidad clinica equilibrada.",
      status: record.clinicalRecordsCompleteRate >= 84 ? "Listo" : "Requiere explicacion",
      title: "9. Personal clinico y productividad general",
    },
    {
      action: "Conciliar sesiones sin facturar e ingreso perdido.",
      evidence: `${formatCurrency(record.lostIncome)} de ingreso perdido y ${record.unbilledSessions} sesiones sin facturar.`,
      id: "slide-finanzas",
      kpis: [
        { label: "Ingreso", value: formatCurrency(record.revenue) },
        { label: "Ingreso/paciente", value: formatCurrency(record.revenuePerPatient) },
        { label: "Ingreso/hora", value: formatCurrency(record.revenuePerHour) },
        { label: "Margen", value: `${record.marginRate}%` },
      ],
      narrative:
        "La slide financiera de Fisioterapia debe ser resumida; el detalle completo sigue en Salud financiera.",
      status: record.unbilledSessions > 12 ? "Requiere explicacion" : "Listo",
      title: "10. Finanzas operativas de fisioterapia",
    },
    {
      action: "La gerente debe completar causas concretas, no frases genericas.",
      evidence: record.managerExplanationRequired.join(" "),
      id: "slide-explicaciones",
      kpis: [
        { label: "Explicaciones", value: `${record.managerExplanationRequired.length}` },
        { label: "Bajo control", value: "A confirmar" },
        { label: "Evidencia", value: "Obligatoria" },
        { label: "Periodo", value: record.period },
      ],
      narrative:
        "La presentacion no debe aceptar 'bajo porque hubo menos pacientes'; debe pedir causa operativa especifica.",
      status: "Requiere explicacion",
      title: "11. Variaciones explicadas por la gerente",
    },
    {
      action: "Plan de accion obligatorio para cerrar presentacion.",
      evidence: record.actionPlan.map((item) => `${item.action}: ${item.expectedImpact}`).join(" "),
      id: "slide-plan-accion",
      kpis: [
        { label: "Acciones", value: `${record.actionPlan.length}` },
        { label: "Pendientes", value: `${record.actionPlan.filter((item) => item.status === "Pendiente").length}` },
        { label: "En curso", value: `${record.actionPlan.filter((item) => item.status === "En curso").length}` },
        { label: "Impacto", value: "Trazable" },
      ],
      narrative:
        "Cada accion debe tener responsable, fecha, KPI e impacto esperado para revisarla el siguiente periodo.",
      status: "Listo",
      title: "12. Plan de accion",
    },
    {
      action: record.ceoDecision,
      evidence: record.requiredDecisions.map((item) => item.evidence).join(" "),
      id: "slide-decisiones",
      kpis: [
        { label: "Decisiones", value: `${record.requiredDecisions.length}` },
        { label: "Urgencia alta", value: `${record.requiredDecisions.filter((item) => item.urgency === "Alta").length}` },
        { label: "Costo", value: record.requiredDecisions[0]?.cost ?? "Pendiente" },
        { label: "Beneficio", value: record.requiredDecisions[0]?.benefit ?? "Pendiente" },
      ],
      narrative:
        "Las decisiones solicitadas al CEO deben mostrar evidencia, costo, beneficio y urgencia.",
      status: "Decision CEO",
      title: "13. Decisiones requeridas",
    },
  ];
}

function seriesForRecords(
  records: PhysioBranchRecord[],
  field: keyof PhysioBranchRecord["trend"],
  valueFormatter: (record: PhysioBranchRecord) => string,
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
      label: field === "revenue" ? "Presupuesto" : "Meta",
      points:
        field === "revenue"
          ? [36000, 36000, 36000, 36000, 36000, 36000, 36000]
          : [82, 82, 82, 82, 82, 82, 82],
      value: field === "revenue" ? "$36K" : "82",
    },
  ];
}

export function buildPhysioTrendChart(records: PhysioBranchRecord[]) {
  const scopedRecords = records.slice(0, 5);
  const firstRecord = scopedRecords[0] ?? physioBranchRecords[0];
  const insights: TrendInsight[] = [
    {
      label: "Historia clinica",
      note: "Compara captacion, evaluacion, plan, sesiones, continuidad e ingreso.",
      tone: "neutral",
      value: `${scopedRecords.length} sucursales`,
    },
    {
      label: "Mayor accion",
      note: firstRecord?.actionPriority ?? "Sin accion prioritaria.",
      tone: firstRecord?.validationStatus === "Validado" ? "positive" : "warning",
      value: firstRecord?.branch ?? "Sin datos",
    },
    {
      label: "Decision",
      note: "Usa la tendencia para preparar explicaciones, plan de accion y decisiones CEO.",
      tone: "positive",
      value: "Presentacion",
    },
  ];
  const metricOptions: TrendChartOption[] = [
    {
      description: "Solicitudes captadas y evaluaciones realizadas.",
      id: "evaluaciones-fisio-presentacion",
      insights,
      label: "Evaluaciones",
      series: seriesForRecords(scopedRecords, "evaluations", (record) =>
        record.evaluations.toLocaleString("en-US"),
      ),
      yLabel: "Evaluaciones",
    },
    {
      description: "Planes terapeuticos iniciados desde evaluaciones.",
      id: "planes-fisio-presentacion",
      insights,
      label: "Planes iniciados",
      series: seriesForRecords(scopedRecords, "plans", (record) =>
        record.plansStarted.toLocaleString("en-US"),
      ),
      yLabel: "Planes",
    },
    {
      description: "Sesiones completadas, no solo agendadas.",
      id: "sesiones-fisio-presentacion",
      insights,
      label: "Sesiones completadas",
      series: seriesForRecords(scopedRecords, "sessions", (record) =>
        record.sessionsCompleted.toLocaleString("en-US"),
      ),
      yLabel: "Sesiones",
    },
    {
      description: "Continuidad terapeutica a 30 dias.",
      id: "continuidad-fisio-presentacion",
      insights,
      label: "Continuidad",
      series: seriesForRecords(scopedRecords, "continuity", (record) =>
        `${record.continuity30Rate}%`,
      ),
      yLabel: "% continuidad",
    },
    {
      description: "Pacientes activos bajo seguimiento terapeutico.",
      id: "pacientes-fisio-presentacion",
      insights,
      label: "Pacientes activos",
      series: seriesForRecords(scopedRecords, "activePatients", (record) =>
        record.activePatients.toLocaleString("en-US"),
      ),
      yLabel: "Pacientes",
    },
    {
      description: "Ingreso operativo de fisioterapia por sucursal.",
      id: "ingreso-fisio-presentacion",
      insights,
      label: "Ingreso",
      series: seriesForRecords(scopedRecords, "revenue", (record) =>
        formatCurrency(record.revenue),
      ),
      yLabel: "USD",
    },
    {
      description: "No-show como indicador de perdida recuperable.",
      id: "no-show-fisio-presentacion",
      insights,
      label: "No-show",
      series: seriesForRecords(scopedRecords, "noShow", (record) =>
        `${record.noShowRate}%`,
      ),
      yLabel: "% no-show",
    },
  ];

  return {
    description:
      "Compara sucursales, fechas y metrica para preparar la presentacion mensual.",
    insights,
    metricOptions,
    series: metricOptions[0].series,
    title: "Tendencia para presentacion de Fisioterapia",
    xLabels: dateLabels,
    yLabel: metricOptions[0].yLabel,
  };
}
