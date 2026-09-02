import type {
  TrendChartOption,
  TrendInsight,
  TrendSeries,
} from "@/components/analytics-comparison-chart";
import type { BusinessLineSlug } from "@/lib/analytics/business-line-operations";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";

export type ProfessionalStatus =
  | "Sobresaliente"
  | "Saludable"
  | "Precaucion"
  | "Requiere revision"
  | "Sin datos suficientes";

export type ProfessionalLine = "Laboratorio" | "Fisioterapia" | "Imagenes";

export type ProfessionalRole =
  | "Flebotomista"
  | "Tecnico de laboratorio"
  | "Responsable de validacion"
  | "Fisioterapeuta"
  | "Tecnico de imagenes"
  | "Radiologo";

export type ProfessionalMetricGroup =
  | "Dotacion"
  | "Productividad"
  | "Calidad"
  | "Valor operativo";

export type ProfessionalMetric = {
  group: ProfessionalMetricGroup;
  label: string;
  value: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
};

export type ProfessionalDimension = {
  id: string;
  label: string;
  weight: number;
  score: number;
  points: number;
  insight: string;
};

export type SkillState =
  | "Autorizado"
  | "Capacitado"
  | "En entrenamiento"
  | "No disponible"
  | "Certificacion por vencer";

export type ProfessionalRecord = {
  id: string;
  name: string;
  line: ProfessionalLine;
  lineSlug: Exclude<BusinessLineSlug, "consolidado">;
  branch: string;
  role: ProfessionalRole;
  comparableGroup: string;
  specialty: string;
  service: string;
  shift: "Matutino" | "Vespertino" | "Nocturno" | "Mixto";
  state: "Activo" | "Inactivo" | "Capacitacion" | "Adaptacion";
  scheduleType: "Tiempo completo" | "Parcial" | "Servicios profesionales";
  experienceLevel: "Nuevo" | "Intermedio" | "Senior";
  startDate: string;
  score: number;
  scoreDelta: number;
  status: ProfessionalStatus;
  productivityAdjusted: number;
  qualityScore: number;
  utilizationRate: number;
  successRate: number;
  slaRate: number;
  recordQuality: number;
  continuityRate: number;
  satisfaction: number;
  availableHours: number;
  scheduledHours: number;
  usedHours: number;
  overtimeHours: number;
  idleHours: number;
  services: number;
  patients: number;
  newPatients: number;
  recurrentPatients: number;
  servicesPerHour: number;
  averageDurationMinutes: number;
  complexityIndex: number;
  reworkRate: number;
  incidents: number;
  complaints: number;
  incompleteRecords: number;
  protocolRate: number;
  revenue: number;
  revenuePerHour: number;
  costPerHour: number;
  marginPerHour: number;
  unbilledServices: number;
  lostIncome: number;
  capacityLost: number;
  mainStrength: string;
  mainGap: string;
  recommendation: string;
  fairnessFactors: string[];
  alerts: string[];
  dimensions: ProfessionalDimension[];
  heatmap: number[][];
  skills: { skill: string; state: SkillState }[];
  lossCauses: { cause: string; value: number }[];
  futureAvailability: {
    week: string;
    available: number;
    demand: number;
    risk: "Bajo" | "Medio" | "Alto";
    note: string;
  }[];
  trend: {
    productivity: number[];
    quality: number[];
    utilization: number[];
    sla: number[];
    patients: number[];
    revenuePerHour: number[];
    score: number[];
  };
};

type GeneratedProfessionalFields =
  | "alerts"
  | "dimensions"
  | "futureAvailability"
  | "heatmap"
  | "lossCauses"
  | "score"
  | "status"
  | "trend";

type ProfessionalBaseRecord = Omit<ProfessionalRecord, GeneratedProfessionalFields>;

type ProfessionalRecordInput = Omit<
  ProfessionalBaseRecord,
  "fairnessFactors" | "incidents" | "successRate"
> &
  Partial<Pick<ProfessionalBaseRecord, "fairnessFactors" | "incidents" | "successRate">>;

export type ProfessionalScreen = {
  slug: BusinessLineSlug;
  title: string;
  subtitle: string;
  description: string;
  rule: string;
  weights: { dimension: string; weight: number }[];
  records: ProfessionalRecord[];
  metrics: ProfessionalMetric[];
  insights: string[];
};

const exactDateLabels = [
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

export const professionalWeightsByLine: Record<
  BusinessLineSlug,
  { dimension: string; weight: number }[]
> = {
  consolidado: [
    { dimension: "Productividad ajustada", weight: 25 },
    { dimension: "Calidad y seguridad", weight: 25 },
    { dimension: "Cumplimiento operativo y SLA", weight: 15 },
    { dimension: "Experiencia y continuidad del paciente", weight: 15 },
    { dimension: "Utilizacion de capacidad", weight: 10 },
    { dimension: "Calidad de registros", weight: 5 },
    { dimension: "Desarrollo y cumplimiento interno", weight: 5 },
  ],
  laboratorio: [
    { dimension: "Productividad ajustada", weight: 22 },
    { dimension: "Calidad y seguridad", weight: 28 },
    { dimension: "SLA tecnico", weight: 18 },
    { dimension: "Experiencia del paciente", weight: 10 },
    { dimension: "Utilizacion de capacidad", weight: 10 },
    { dimension: "Registros y trazabilidad", weight: 7 },
    { dimension: "Desarrollo tecnico", weight: 5 },
  ],
  fisioterapia: [
    { dimension: "Productividad ajustada", weight: 20 },
    { dimension: "Calidad clinica y seguridad", weight: 20 },
    { dimension: "Continuidad terapeutica", weight: 20 },
    { dimension: "Experiencia del paciente", weight: 15 },
    { dimension: "Utilizacion de capacidad", weight: 10 },
    { dimension: "Registros clinicos", weight: 10 },
    { dimension: "Desarrollo profesional", weight: 5 },
  ],
  imagenes: [
    { dimension: "Productividad ajustada", weight: 20 },
    { dimension: "Calidad tecnica o informe", weight: 25 },
    { dimension: "SLA de estudio o lectura", weight: 20 },
    { dimension: "Utilizacion de equipo o lectura", weight: 15 },
    { dimension: "Experiencia del paciente", weight: 8 },
    { dimension: "Registros y trazabilidad", weight: 7 },
    { dimension: "Desarrollo y certificacion", weight: 5 },
  ],
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getStatus(score: number, recordQuality: number): ProfessionalStatus {
  if (recordQuality < 68) {
    return "Sin datos suficientes";
  }

  if (score >= 90) {
    return "Sobresaliente";
  }

  if (score >= 80) {
    return "Saludable";
  }

  if (score >= 70) {
    return "Precaucion";
  }

  return "Requiere revision";
}

function buildPoints(value: number, delta: number, min = 0, max = 100) {
  const start = clamp(value - delta - 5, min, max);

  return [start, start + 2, start + 4, value - 2, value, value + 1, value].map(
    (point) => Math.round(clamp(point, min, max)),
  );
}

function buildVolumePoints(value: number) {
  return [0.7, 0.76, 0.82, 0.88, 0.94, 0.98, 1].map((factor) =>
    Math.round(value * factor),
  );
}

function buildDimensions(
  input: ProfessionalBaseRecord,
): ProfessionalDimension[] {
  const weights = professionalWeightsByLine[input.lineSlug];
  const scoresByDimension = [
    input.productivityAdjusted,
    input.qualityScore,
    input.slaRate,
    input.lineSlug === "fisioterapia"
      ? input.continuityRate
      : Math.round((input.satisfaction + input.continuityRate) / 2),
    input.utilizationRate,
    input.recordQuality,
    Math.round(clamp(85 + (input.experienceLevel === "Senior" ? 5 : input.experienceLevel === "Nuevo" ? -4 : 0) - input.incidents * 2)),
  ];

  return weights.map((weight, index) => {
    const score = Math.round(clamp(scoresByDimension[index] ?? 75));

    return {
      id: `${input.id}-${index}`,
      label: weight.dimension,
      points: Number(((score * weight.weight) / 100).toFixed(1)),
      score,
      weight: weight.weight,
      insight:
        index === 0
          ? "Ajustado por horas, complejidad y grupo comparable."
          : index === 1
            ? "Evita premiar volumen cuando suben repeticiones, errores o reclamos."
            : index === 2
              ? "Mide cumplimiento operativo sin asumir que toda demora depende del profesional."
              : index === 3
                ? "Incluye continuidad, experiencia y retorno del paciente cuando aplica."
                : index === 4
                  ? "Compara uso real contra horas disponibles y agenda asignada."
                  : index === 5
                    ? "Registros completos, trazabilidad y evidencia de atencion."
                    : "Capacitaciones, certificaciones y cumplimiento interno.",
    };
  });
}

function finishRecord(
  input: ProfessionalRecordInput,
): ProfessionalRecord {
  const baseRecord: ProfessionalBaseRecord = {
    ...input,
    fairnessFactors:
      input.fairnessFactors ??
      [
        `Comparar solo contra ${input.comparableGroup}.`,
        "Ajustar por horas disponibles, turno, complejidad y agenda asignada.",
      ],
    incidents:
      input.incidents ??
      Math.max(0, Math.round(input.complaints + input.reworkRate * 20 - 1)),
    successRate:
      input.successRate ??
      Math.round(
        clamp(
          (input.qualityScore + input.slaRate + input.protocolRate) / 3 -
            input.reworkRate * 45,
          45,
          99,
        ),
      ),
  };
  const dimensions = buildDimensions(baseRecord);
  const score = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.points, 0),
  );
  const status = getStatus(score, input.recordQuality);
  const heatmapBase = Math.round(input.utilizationRate / 10);
  const heatmap = [
    [heatmapBase - 2, heatmapBase, heatmapBase + 1, heatmapBase - 1],
    [heatmapBase - 1, heatmapBase + 1, heatmapBase + 2, heatmapBase],
    [heatmapBase, heatmapBase + 2, heatmapBase + 1, heatmapBase - 1],
    [heatmapBase - 1, heatmapBase + 1, heatmapBase + 1, heatmapBase],
    [heatmapBase, heatmapBase + 2, heatmapBase, heatmapBase - 2],
  ].map((row) => row.map((value) => clamp(value * 10, 12, 100)));
  const alerts = [
    baseRecord.utilizationRate >= 94 ? "Sobrecarga sostenida" : null,
    baseRecord.utilizationRate <= 62 ? "Capacidad disponible" : null,
    baseRecord.reworkRate >= 0.06 ? "Repeticiones superiores al umbral" : null,
    baseRecord.recordQuality < 78 ? "Registros pendientes" : null,
    baseRecord.continuityRate < 74 ? "Pacientes activos sin continuidad" : null,
    baseRecord.slaRate < 82 ? "SLA en descenso" : null,
  ].filter((alert): alert is string => Boolean(alert));
  const lossCauses = [
    { cause: "Ausencias", value: Math.round(baseRecord.lostIncome * 0.16) },
    { cause: "Cancelaciones", value: Math.round(baseRecord.lostIncome * 0.22) },
    { cause: "Equipo o insumos", value: baseRecord.lineSlug === "imagenes" || baseRecord.lineSlug === "laboratorio" ? Math.round(baseRecord.lostIncome * 0.2) : Math.round(baseRecord.lostIncome * 0.08) },
    { cause: "Agenda mal distribuida", value: Math.round(baseRecord.lostIncome * 0.24) },
    { cause: "Reprocesos", value: Math.round(baseRecord.reworkRate * 2600) },
    { cause: "Registros incompletos", value: Math.max(0, Math.round((85 - baseRecord.recordQuality) * 12)) },
    { cause: "Autorizacion o facturacion", value: baseRecord.unbilledServices * 38 },
  ]
    .filter((cause) => cause.value > 0)
    .sort((a, b) => b.value - a.value);
  const futureAvailability = [
    { week: "Semana 1", demand: baseRecord.scheduledHours, available: baseRecord.availableHours, note: "Demanda esperada por agenda actual." },
    { week: "Semana 2", demand: Math.round(baseRecord.scheduledHours * 1.03), available: baseRecord.availableHours - (baseRecord.state === "Capacitacion" ? 8 : 0), note: baseRecord.state === "Capacitacion" ? "Capacitacion reduce disponibilidad." : "Agenda estable." },
    { week: "Semana 3", demand: Math.round(baseRecord.scheduledHours * 1.08), available: baseRecord.availableHours, note: "Demanda proyectada por tendencia." },
    { week: "Semana 4", demand: Math.round(baseRecord.scheduledHours * 1.12), available: baseRecord.availableHours - (baseRecord.overtimeHours > 4 ? 4 : 0), note: baseRecord.overtimeHours > 4 ? "Riesgo por horas extraordinarias." : "Capacidad planificada." },
  ].map((week) => ({
    ...week,
    risk:
      week.demand / Math.max(week.available, 1) >= 1.05
        ? "Alto" as const
        : week.demand / Math.max(week.available, 1) >= 0.9
          ? "Medio" as const
          : "Bajo" as const,
  }));

  return {
    ...baseRecord,
    alerts,
    dimensions,
    futureAvailability,
    heatmap,
    lossCauses,
    score,
    status,
    trend: {
      productivity: buildPoints(baseRecord.productivityAdjusted, baseRecord.scoreDelta),
      quality: buildPoints(baseRecord.qualityScore, baseRecord.scoreDelta),
      utilization: buildPoints(baseRecord.utilizationRate, baseRecord.scoreDelta),
      sla: buildPoints(baseRecord.slaRate, baseRecord.scoreDelta),
      patients: buildVolumePoints(baseRecord.patients),
      revenuePerHour: buildVolumePoints(baseRecord.revenuePerHour),
      score: buildPoints(score, baseRecord.scoreDelta),
    },
  };
}

export const professionalRecords: ProfessionalRecord[] = [
  finishRecord({
    averageDurationMinutes: 9,
    branch: "SS - Aguilares - L033",
    capacityLost: 7,
    comparableGroup: "Laboratorio / Flebotomistas / Matutino",
    complaints: 1,
    complexityIndex: 78,
    continuityRate: 82,
    costPerHour: 11,
    experienceLevel: "Senior",
    id: "pro-lab-katherine-flebo",
    incompleteRecords: 8,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lostIncome: 520,
    mainGap: "Registros incompletos en horas pico",
    mainStrength: "Alta experiencia y baja repeticion de toma",
    marginPerHour: 46,
    name: "Karla Miranda",
    newPatients: 430,
    overtimeHours: 3,
    patients: 1480,
    productivityAdjusted: 91,
    protocolRate: 96,
    qualityScore: 92,
    recommendation: "Usarla como referencia de toma rapida y completar registros en cierre diario.",
    recordQuality: 84,
    recurrentPatients: 1050,
    revenue: 18400,
    revenuePerHour: 118,
    reworkRate: 0.018,
    role: "Flebotomista",
    satisfaction: 94,
    scheduleType: "Tiempo completo",
    scheduledHours: 148,
    scoreDelta: 4,
    service: "Toma de muestra",
    services: 1710,
    servicesPerHour: 10.9,
    shift: "Matutino",
    skills: [
      { skill: "Toma pediatrica", state: "Autorizado" },
      { skill: "Domicilio", state: "Capacitado" },
      { skill: "Cadena de custodia", state: "Certificacion por vencer" },
    ],
    slaRate: 93,
    specialty: "Preanalitica",
    startDate: "2022-04-11",
    state: "Activo",
    unbilledServices: 2,
    usedHours: 139,
    utilizationRate: 89,
    availableHours: 156,
    idleHours: 17,
  }),
  finishRecord({
    averageDurationMinutes: 14,
    branch: "SS - Constitucion - L009",
    capacityLost: 16,
    comparableGroup: "Laboratorio / Flebotomistas / Vespertino",
    complaints: 3,
    complexityIndex: 72,
    continuityRate: 76,
    costPerHour: 10,
    experienceLevel: "Intermedio",
    id: "pro-lab-flebo-constitucion",
    incompleteRecords: 21,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lostIncome: 1240,
    mainGap: "Tiempo de espera y registros incompletos",
    mainStrength: "Buena cobertura de pacientes recurrentes",
    marginPerHour: 34,
    name: "Andrea Perez",
    newPatients: 320,
    overtimeHours: 5,
    patients: 1260,
    productivityAdjusted: 79,
    protocolRate: 88,
    qualityScore: 74,
    recommendation: "Revisar demanda por turno y reforzar protocolo de identificacion.",
    recordQuality: 72,
    recurrentPatients: 940,
    revenue: 14200,
    revenuePerHour: 91,
    reworkRate: 0.052,
    role: "Flebotomista",
    satisfaction: 82,
    scheduleType: "Tiempo completo",
    scheduledHours: 151,
    scoreDelta: -5,
    service: "Toma de muestra",
    services: 1492,
    servicesPerHour: 9.6,
    shift: "Vespertino",
    skills: [
      { skill: "Toma pediatrica", state: "En entrenamiento" },
      { skill: "Domicilio", state: "No disponible" },
      { skill: "Cadena de custodia", state: "Capacitado" },
    ],
    slaRate: 78,
    specialty: "Preanalitica",
    startDate: "2024-06-03",
    state: "Activo",
    unbilledServices: 6,
    usedHours: 136,
    utilizationRate: 87,
    availableHours: 156,
    idleHours: 20,
  }),
  finishRecord({
    averageDurationMinutes: 5,
    branch: "SS - Santa Tecla - L011",
    capacityLost: 8,
    comparableGroup: "Laboratorio / Tecnicos / Quimica",
    complaints: 1,
    complexityIndex: 86,
    continuityRate: 84,
    costPerHour: 17,
    experienceLevel: "Senior",
    id: "pro-lab-tecnico-santa-tecla",
    incompleteRecords: 9,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lostIncome: 690,
    mainGap: "Repeticiones por control de calidad",
    mainStrength: "Alta produccion por analizador",
    marginPerHour: 74,
    name: "Rafael Caceres",
    newPatients: 0,
    overtimeHours: 7,
    patients: 0,
    productivityAdjusted: 94,
    protocolRate: 93,
    qualityScore: 82,
    recommendation: "Revisar calibracion y mezcla de pruebas antes de asignar mas carga.",
    recordQuality: 88,
    recurrentPatients: 0,
    revenue: 31600,
    revenuePerHour: 203,
    reworkRate: 0.071,
    role: "Tecnico de laboratorio",
    satisfaction: 86,
    scheduleType: "Tiempo completo",
    scheduledHours: 152,
    scoreDelta: 3,
    service: "Quimica clinica",
    services: 3880,
    servicesPerHour: 24.9,
    shift: "Mixto",
    skills: [
      { skill: "Quimica", state: "Autorizado" },
      { skill: "Hematologia", state: "Capacitado" },
      { skill: "Microbiologia", state: "En entrenamiento" },
    ],
    slaRate: 87,
    specialty: "Procesamiento tecnico",
    startDate: "2021-08-19",
    state: "Activo",
    unbilledServices: 4,
    usedHours: 151,
    utilizationRate: 97,
    availableHours: 156,
    idleHours: 5,
  }),
  finishRecord({
    averageDurationMinutes: 7,
    branch: "SS - Chalatenango- L036",
    capacityLost: 19,
    comparableGroup: "Laboratorio / Tecnicos / Hematologia",
    complaints: 0,
    complexityIndex: 74,
    continuityRate: 81,
    costPerHour: 15,
    experienceLevel: "Intermedio",
    id: "pro-lab-tecnico-chalate",
    incompleteRecords: 12,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lostIncome: 980,
    mainGap: "Capacidad disponible en turno vespertino",
    mainStrength: "Buen SLA y baja incidencia",
    marginPerHour: 49,
    name: "Luis Escobar",
    newPatients: 0,
    overtimeHours: 1,
    patients: 0,
    productivityAdjusted: 76,
    protocolRate: 91,
    qualityScore: 88,
    recommendation: "Redistribuir muestras de sucursales saturadas hacia su turno.",
    recordQuality: 82,
    recurrentPatients: 0,
    revenue: 19600,
    revenuePerHour: 126,
    reworkRate: 0.026,
    role: "Tecnico de laboratorio",
    satisfaction: 88,
    scheduleType: "Tiempo completo",
    scheduledHours: 118,
    scoreDelta: 2,
    service: "Hematologia",
    services: 2240,
    servicesPerHour: 14.4,
    shift: "Vespertino",
    skills: [
      { skill: "Hematologia", state: "Autorizado" },
      { skill: "Quimica", state: "Capacitado" },
      { skill: "Bacteriologia", state: "No disponible" },
    ],
    slaRate: 90,
    specialty: "Procesamiento tecnico",
    startDate: "2023-02-07",
    state: "Activo",
    unbilledServices: 1,
    usedHours: 112,
    utilizationRate: 72,
    availableHours: 156,
    idleHours: 44,
  }),
  finishRecord({
    averageDurationMinutes: 3,
    branch: "SS-Merliot 2- L045",
    capacityLost: 12,
    comparableGroup: "Laboratorio / Validacion",
    complaints: 1,
    complexityIndex: 88,
    continuityRate: 85,
    costPerHour: 24,
    experienceLevel: "Senior",
    id: "pro-lab-validacion-merliot",
    incompleteRecords: 5,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lostIncome: 760,
    mainGap: "Certificacion proxima a vencer",
    mainStrength: "Validacion rapida y segura",
    marginPerHour: 96,
    name: "Dra. Marcela Rivas",
    newPatients: 0,
    overtimeHours: 4,
    patients: 0,
    productivityAdjusted: 87,
    protocolRate: 98,
    qualityScore: 96,
    recommendation: "Renovar certificacion y documentar escalamiento de casos criticos.",
    recordQuality: 94,
    recurrentPatients: 0,
    revenue: 27400,
    revenuePerHour: 176,
    reworkRate: 0.012,
    role: "Responsable de validacion",
    satisfaction: 90,
    scheduleType: "Tiempo completo",
    scheduledHours: 142,
    scoreDelta: 5,
    service: "Validacion de resultados",
    services: 3120,
    servicesPerHour: 20,
    shift: "Mixto",
    skills: [
      { skill: "Validacion quimica", state: "Autorizado" },
      { skill: "Casos criticos", state: "Autorizado" },
      { skill: "Firma digital", state: "Certificacion por vencer" },
    ],
    slaRate: 94,
    specialty: "Validacion clinica",
    startDate: "2020-11-01",
    state: "Activo",
    unbilledServices: 0,
    usedHours: 140,
    utilizationRate: 90,
    availableHours: 156,
    idleHours: 16,
  }),
  finishRecord({
    averageDurationMinutes: 45,
    branch: "Fisioterapia Norte",
    capacityLost: 6,
    comparableGroup: "Fisioterapia / Terapia fisica / Matutino",
    complaints: 1,
    complexityIndex: 82,
    continuityRate: 91,
    costPerHour: 18,
    experienceLevel: "Senior",
    id: "pro-fisio-norte-a",
    incompleteRecords: 6,
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    lostIncome: 480,
    mainGap: "Agenda cerca de saturacion",
    mainStrength: "Continuidad terapeutica alta",
    marginPerHour: 58,
    name: "Lic. Sofia Morales",
    newPatients: 54,
    overtimeHours: 5,
    patients: 168,
    productivityAdjusted: 88,
    protocolRate: 94,
    qualityScore: 93,
    recommendation: "Proteger espacios de continuidad y redistribuir nuevos ingresos.",
    recordQuality: 91,
    recurrentPatients: 114,
    revenue: 12100,
    revenuePerHour: 78,
    reworkRate: 0.01,
    role: "Fisioterapeuta",
    satisfaction: 95,
    scheduleType: "Tiempo completo",
    scheduledHours: 150,
    scoreDelta: 4,
    service: "Terapia fisica",
    services: 312,
    servicesPerHour: 2.0,
    shift: "Matutino",
    skills: [
      { skill: "Trauma", state: "Autorizado" },
      { skill: "Neurologica", state: "Capacitado" },
      { skill: "Piso pelvico", state: "En entrenamiento" },
    ],
    slaRate: 92,
    specialty: "Rehabilitacion musculoesqueletica",
    startDate: "2021-03-15",
    state: "Activo",
    unbilledServices: 1,
    usedHours: 145,
    utilizationRate: 93,
    availableHours: 156,
    idleHours: 11,
  }),
  finishRecord({
    averageDurationMinutes: 45,
    branch: "Fisioterapia Centro",
    capacityLost: 26,
    comparableGroup: "Fisioterapia / Terapia fisica / Vespertino",
    complaints: 4,
    complexityIndex: 76,
    continuityRate: 63,
    costPerHour: 17,
    experienceLevel: "Intermedio",
    id: "pro-fisio-centro-b",
    incompleteRecords: 24,
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    lostIncome: 1960,
    mainGap: "Continuidad baja y notas pendientes",
    mainStrength: "Buena captacion de pacientes nuevos",
    marginPerHour: 39,
    name: "Lic. Daniela Guardado",
    newPatients: 72,
    overtimeHours: 2,
    patients: 146,
    productivityAdjusted: 73,
    protocolRate: 82,
    qualityScore: 76,
    recommendation: "No aumentar carga; corregir frecuencia entre sesiones y notas clinicas.",
    recordQuality: 69,
    recurrentPatients: 74,
    revenue: 8920,
    revenuePerHour: 57,
    reworkRate: 0.034,
    role: "Fisioterapeuta",
    satisfaction: 78,
    scheduleType: "Tiempo completo",
    scheduledHours: 132,
    scoreDelta: -7,
    service: "Terapia fisica",
    services: 232,
    servicesPerHour: 1.5,
    shift: "Vespertino",
    skills: [
      { skill: "Trauma", state: "Capacitado" },
      { skill: "Neurologica", state: "En entrenamiento" },
      { skill: "Terapia respiratoria", state: "No disponible" },
    ],
    slaRate: 74,
    specialty: "Rehabilitacion general",
    startDate: "2024-01-22",
    state: "Adaptacion",
    unbilledServices: 7,
    usedHours: 110,
    utilizationRate: 71,
    availableHours: 156,
    idleHours: 46,
  }),
  finishRecord({
    averageDurationMinutes: 50,
    branch: "Fisioterapia Sur",
    capacityLost: 18,
    comparableGroup: "Fisioterapia / Neurorehabilitacion",
    complaints: 1,
    complexityIndex: 92,
    continuityRate: 84,
    costPerHour: 19,
    experienceLevel: "Senior",
    id: "pro-fisio-sur-c",
    incompleteRecords: 9,
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    lostIncome: 840,
    mainGap: "Pacientes complejos requieren mas tiempo por sesion",
    mainStrength: "Alta calidad clinica en casos complejos",
    marginPerHour: 52,
    name: "Lic. Rodrigo Salazar",
    newPatients: 38,
    overtimeHours: 1,
    patients: 118,
    productivityAdjusted: 81,
    protocolRate: 95,
    qualityScore: 94,
    recommendation: "Comparar solo con neurorehabilitacion; no exigir volumen de terapia general.",
    recordQuality: 88,
    recurrentPatients: 80,
    revenue: 10360,
    revenuePerHour: 66,
    reworkRate: 0.012,
    role: "Fisioterapeuta",
    satisfaction: 93,
    scheduleType: "Tiempo completo",
    scheduledHours: 126,
    scoreDelta: 2,
    service: "Neurorehabilitacion",
    services: 205,
    servicesPerHour: 1.3,
    shift: "Mixto",
    skills: [
      { skill: "Neurologica", state: "Autorizado" },
      { skill: "Vestibular", state: "Capacitado" },
      { skill: "Pediatrica", state: "Capacitado" },
    ],
    slaRate: 89,
    specialty: "Neurorehabilitacion",
    startDate: "2020-07-06",
    state: "Activo",
    unbilledServices: 2,
    usedHours: 122,
    utilizationRate: 78,
    availableHours: 156,
    idleHours: 34,
  }),
  finishRecord({
    averageDurationMinutes: 24,
    branch: "Imagenes Santa Tecla",
    capacityLost: 9,
    comparableGroup: "Imagenes / Tecnicos / Tomografia",
    complaints: 2,
    complexityIndex: 90,
    continuityRate: 80,
    costPerHour: 21,
    experienceLevel: "Senior",
    id: "pro-img-tecnico-st",
    incompleteRecords: 10,
    line: "Imagenes",
    lineSlug: "imagenes",
    lostIncome: 1180,
    mainGap: "Riesgo de saturacion en tomografia",
    mainStrength: "Alta utilizacion de equipo",
    marginPerHour: 88,
    name: "Tec. Mauricio Pineda",
    newPatients: 112,
    overtimeHours: 8,
    patients: 420,
    productivityAdjusted: 90,
    protocolRate: 91,
    qualityScore: 84,
    recommendation: "Reforzar turnos de apoyo antes de aumentar agenda de tomografia.",
    recordQuality: 86,
    recurrentPatients: 308,
    revenue: 28600,
    revenuePerHour: 183,
    reworkRate: 0.058,
    role: "Tecnico de imagenes",
    satisfaction: 87,
    scheduleType: "Tiempo completo",
    scheduledHours: 151,
    scoreDelta: 1,
    service: "Tomografia",
    services: 388,
    servicesPerHour: 2.5,
    shift: "Mixto",
    skills: [
      { skill: "Tomografia", state: "Autorizado" },
      { skill: "Contraste", state: "Capacitado" },
      { skill: "Resonancia", state: "En entrenamiento" },
    ],
    slaRate: 82,
    specialty: "Adquisicion diagnostica",
    startDate: "2019-10-14",
    state: "Activo",
    unbilledServices: 3,
    usedHours: 148,
    utilizationRate: 95,
    availableHours: 156,
    idleHours: 8,
  }),
  finishRecord({
    averageDurationMinutes: 18,
    branch: "Imagenes Este",
    capacityLost: 28,
    comparableGroup: "Imagenes / Tecnicos / Rayos X",
    complaints: 1,
    complexityIndex: 68,
    continuityRate: 79,
    costPerHour: 17,
    experienceLevel: "Intermedio",
    id: "pro-img-tecnico-este",
    incompleteRecords: 14,
    line: "Imagenes",
    lineSlug: "imagenes",
    lostIncome: 1760,
    mainGap: "Equipo disponible con baja demanda asignada",
    mainStrength: "Buena calidad tecnica",
    marginPerHour: 42,
    name: "Tec. Ana Baires",
    newPatients: 86,
    overtimeHours: 0,
    patients: 260,
    productivityAdjusted: 68,
    protocolRate: 92,
    qualityScore: 88,
    recommendation: "Recibir estudios redistribuidos desde Santa Tecla y activar convenios vespertinos.",
    recordQuality: 80,
    recurrentPatients: 174,
    revenue: 12600,
    revenuePerHour: 81,
    reworkRate: 0.022,
    role: "Tecnico de imagenes",
    satisfaction: 89,
    scheduleType: "Tiempo completo",
    scheduledHours: 96,
    scoreDelta: 3,
    service: "Rayos X",
    services: 246,
    servicesPerHour: 1.6,
    shift: "Vespertino",
    skills: [
      { skill: "Rayos X", state: "Autorizado" },
      { skill: "Ultrasonido apoyo", state: "No disponible" },
      { skill: "Tomografia", state: "En entrenamiento" },
    ],
    slaRate: 90,
    specialty: "Adquisicion diagnostica",
    startDate: "2022-12-05",
    state: "Activo",
    unbilledServices: 1,
    usedHours: 89,
    utilizationRate: 57,
    availableHours: 156,
    idleHours: 67,
  }),
  finishRecord({
    averageDurationMinutes: 12,
    branch: "Imagenes Centro",
    capacityLost: 20,
    comparableGroup: "Imagenes / Radiologos / Lectura",
    complaints: 0,
    complexityIndex: 94,
    continuityRate: 84,
    costPerHour: 42,
    experienceLevel: "Senior",
    id: "pro-img-radio-centro",
    incompleteRecords: 8,
    line: "Imagenes",
    lineSlug: "imagenes",
    lostIncome: 1350,
    mainGap: "Cobertura nocturna insuficiente",
    mainStrength: "Alta calidad de informe",
    marginPerHour: 122,
    name: "Dr. Ernesto Larin",
    newPatients: 0,
    overtimeHours: 6,
    patients: 0,
    productivityAdjusted: 84,
    protocolRate: 97,
    qualityScore: 95,
    recommendation: "Mover lectura electiva fuera del turno nocturno y cubrir tomografia prioritaria.",
    recordQuality: 93,
    recurrentPatients: 0,
    revenue: 33400,
    revenuePerHour: 214,
    reworkRate: 0.014,
    role: "Radiologo",
    satisfaction: 91,
    scheduleType: "Servicios profesionales",
    scheduledHours: 132,
    scoreDelta: 2,
    service: "Lectura diagnostica",
    services: 520,
    servicesPerHour: 3.3,
    shift: "Nocturno",
    skills: [
      { skill: "Tomografia", state: "Autorizado" },
      { skill: "Resonancia", state: "Autorizado" },
      { skill: "Mama", state: "Certificacion por vencer" },
    ],
    slaRate: 86,
    specialty: "Radiologia",
    startDate: "2018-09-01",
    state: "Activo",
    unbilledServices: 0,
    usedHours: 128,
    utilizationRate: 82,
    availableHours: 156,
    idleHours: 28,
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

export function buildProfessionalMetrics(
  records: ProfessionalRecord[],
): ProfessionalMetric[] {
  const active = records.filter((record) => record.state !== "Inactivo").length;
  const available = records.filter(
    (record) => record.state === "Activo" && record.availableHours > 0,
  ).length;
  const absent = records.filter((record) => record.state === "Inactivo").length;
  const training = records.filter((record) => record.state === "Capacitacion").length;
  const newProfessionals = records.filter(
    (record) => record.experienceLevel === "Nuevo" || record.state === "Adaptacion",
  ).length;
  const totalAvailableHours = records.reduce((sum, record) => sum + record.availableHours, 0);
  const totalUsedHours = records.reduce((sum, record) => sum + record.usedHours, 0);
  const overtime = records.reduce((sum, record) => sum + record.overtimeHours, 0);
  const idle = records.reduce((sum, record) => sum + record.idleHours, 0);
  const averageProductivity =
    records.reduce((sum, record) => sum + record.productivityAdjusted, 0) /
    Math.max(records.length, 1);
  const averageQuality =
    records.reduce((sum, record) => sum + record.qualityScore, 0) /
    Math.max(records.length, 1);
  const averageSla =
    records.reduce((sum, record) => sum + record.slaRate, 0) /
    Math.max(records.length, 1);
  const averageRecords =
    records.reduce((sum, record) => sum + record.recordQuality, 0) /
    Math.max(records.length, 1);
  const overloaded = records.filter((record) => record.utilizationRate >= 92).length;
  const underused = records.filter((record) => record.utilizationRate <= 62).length;
  const totalPatients = records.reduce((sum, record) => sum + record.patients, 0);
  const totalServices = records.reduce((sum, record) => sum + record.services, 0);
  const totalRevenue = records.reduce((sum, record) => sum + record.revenue, 0);
  const revenuePerHour =
    records.reduce((sum, record) => sum + record.revenuePerHour, 0) /
    Math.max(records.length, 1);
  const unbilled = records.reduce((sum, record) => sum + record.unbilledServices, 0);
  const lostIncome = records.reduce((sum, record) => sum + record.lostIncome, 0);

  return [
    { group: "Dotacion", label: "Profesionales activos", value: `${active}`, note: "en la vista filtrada", tone: "neutral" },
    { group: "Dotacion", label: "Profesionales disponibles", value: `${available}`, note: "con horas disponibles", tone: "positive" },
    { group: "Dotacion", label: "Ausentes o inactivos", value: `${absent}`, note: "no evaluables", tone: absent > 0 ? "warning" : "positive" },
    { group: "Dotacion", label: "En capacitacion", value: `${training}`, note: "requieren seguimiento", tone: training > 0 ? "warning" : "neutral" },
    { group: "Dotacion", label: "Nuevos o adaptacion", value: `${newProfessionals}`, note: "comparar con periodo de gracia", tone: newProfessionals > 0 ? "warning" : "neutral" },
    { group: "Dotacion", label: "Horas disponibles", value: `${Math.round(totalAvailableHours)} h`, note: "capacidad profesional", tone: "neutral" },
    { group: "Dotacion", label: "Horas utilizadas", value: `${Math.round(totalUsedHours)} h`, note: `${formatRate(totalUsedHours / Math.max(totalAvailableHours, 1))} de uso`, tone: "positive" },
    { group: "Dotacion", label: "Horas extraordinarias", value: `${Math.round(overtime)} h`, note: "vigilar sobrecarga", tone: overtime > 20 ? "warning" : "neutral" },
    { group: "Productividad", label: "Productividad normalizada", value: `${Math.round(averageProductivity)}`, note: "por rol y horas", tone: metricTone(averageProductivity, 84, 74) },
    { group: "Productividad", label: "Servicios realizados", value: totalServices.toLocaleString("en-US"), note: "unidad del rol", tone: "neutral" },
    { group: "Productividad", label: "Servicios por hora", value: `${(totalServices / Math.max(totalUsedHours, 1)).toFixed(1)}`, note: "promedio de equipo", tone: "neutral" },
    { group: "Productividad", label: "Sobrecargados", value: `${overloaded}`, note: "utilizacion >= 92%", tone: overloaded > 0 ? "warning" : "positive" },
    { group: "Productividad", label: "Subutilizados", value: `${underused}`, note: "utilizacion <= 62%", tone: underused > 0 ? "warning" : "positive" },
    { group: "Productividad", label: "Horas ociosas", value: `${Math.round(idle)} h`, note: "capacidad redistribuible", tone: idle > 80 ? "warning" : "neutral" },
    { group: "Calidad", label: "Calidad promedio", value: `${Math.round(averageQuality)}`, note: "sin errores y protocolos", tone: metricTone(averageQuality, 88, 78) },
    { group: "Calidad", label: "Cumplimiento SLA", value: `${Math.round(averageSla)}`, note: "segun rol", tone: metricTone(averageSla, 88, 78) },
    { group: "Calidad", label: "Registros completos", value: `${Math.round(averageRecords)}`, note: "calidad de evidencia", tone: metricTone(averageRecords, 86, 76) },
    { group: "Calidad", label: "Incidencias", value: `${records.reduce((sum, record) => sum + record.incidents, 0)}`, note: "eventos reportados", tone: "warning" },
    { group: "Calidad", label: "Reclamos", value: `${records.reduce((sum, record) => sum + record.complaints, 0)}`, note: "relacionados con atencion", tone: "warning" },
    { group: "Valor operativo", label: "Pacientes atendidos", value: totalPatients.toLocaleString("en-US"), note: "cuando aplica", tone: "neutral" },
    { group: "Valor operativo", label: "Ingreso generado", value: formatCurrency(totalRevenue), note: "gestion operativa", tone: "positive" },
    { group: "Valor operativo", label: "Ingreso por hora", value: formatCurrency(revenuePerHour), note: "valor por hora disponible", tone: "positive" },
    { group: "Valor operativo", label: "Servicios sin facturar", value: `${unbilled}`, note: "fuga operativa", tone: unbilled > 10 ? "negative" : "warning" },
    { group: "Valor operativo", label: "Ingreso perdido", value: formatCurrency(lostIncome), note: "ausencias, cancelaciones y capacidad", tone: lostIncome > 5000 ? "negative" : "warning" },
  ];
}

export function getProfessionalScreen(slug: BusinessLineSlug): ProfessionalScreen {
  const records =
    slug === "consolidado"
      ? professionalRecords
      : professionalRecords.filter((record) => record.lineSlug === slug);
  const titles: Record<
    BusinessLineSlug,
    Pick<ProfessionalScreen, "description" | "subtitle" | "title">
  > = {
    consolidado: {
      title: "Profesionales",
      subtitle: "Desempeno individual normalizado por rol",
      description:
        "Evalua carga, productividad, calidad, continuidad, capacidad y valor operativo sin comparar injustamente roles distintos.",
    },
    laboratorio: {
      title: "Profesionales de Laboratorio",
      subtitle: "Flebotomistas, tecnicos y validacion",
      description:
        "Separa toma de muestra, procesamiento tecnico y validacion para evitar rankings enganosos por volumen.",
    },
    fisioterapia: {
      title: "Profesionales de Fisioterapia",
      subtitle: "Productividad, continuidad terapeutica y experiencia",
      description:
        "Analiza sesiones, pacientes activos, continuidad, ocupacion efectiva, registros clinicos e ingreso por hora.",
    },
    imagenes: {
      title: "Profesionales de Imagenes",
      subtitle: "Tecnicos, radiologos, equipos e informes",
      description:
        "Distingue adquisicion tecnica y lectura medica, con utilizacion, SLA, repeticiones, modalidades e informes pendientes.",
    },
  };

  return {
    slug,
    ...titles[slug],
    insights: [
      "El puntaje se calcula dentro del rol y grupo comparable; no compara directamente a un fisioterapeuta con un tecnico de laboratorio.",
      "Alta productividad con baja calidad debe revisarse antes de reconocer buenas practicas.",
      "Una ocupacion alta no siempre es buena: puede indicar sobrecarga, riesgo de agotamiento o deterioro de experiencia.",
      "Factores fuera del control del profesional, como equipo detenido, insumos o agenda asignada, deben ajustarse con autorizacion y auditoria.",
    ],
    metrics: buildProfessionalMetrics(records),
    records,
    rule:
      "Regla: Profesionales responde como rinde cada persona dentro de su rol y capacidad; no reemplaza Gerentes y bonos, Sucursales, Capacidad, Servicios ni Salud financiera.",
    weights: professionalWeightsByLine[slug],
  };
}

function seriesForRecords(
  records: ProfessionalRecord[],
  field: keyof ProfessionalRecord["trend"],
  valueFormatter: (record: ProfessionalRecord) => string,
): TrendSeries[] {
  const scoped = records.slice(0, 8);

  return [
    ...scoped.map((record, index) => ({
      color: trendColors[index % trendColors.length],
      label: record.name,
      points: record.trend[field],
      value: valueFormatter(record),
    })),
    {
      color: "slate" as const,
      label: field === "patients" ? "Meta volumen" : "Meta rol",
      points:
        field === "patients"
          ? [250, 250, 250, 250, 250, 250, 250]
          : field === "revenuePerHour"
            ? [90, 90, 90, 90, 90, 90, 90]
            : [85, 85, 85, 85, 85, 85, 85],
      value:
        field === "patients"
          ? "250"
          : field === "revenuePerHour"
            ? "$90"
            : "85",
    },
  ];
}

export function buildProfessionalTrendChart(records: ProfessionalRecord[]) {
  const scopedRecords = records.slice(0, 8);
  const firstRecord = scopedRecords[0] ?? professionalRecords[0];
  const insights: TrendInsight[] = [
    {
      label: "Comparacion justa",
      note: "Selecciona hasta cinco profesionales, idealmente del mismo rol o grupo comparable.",
      tone: "neutral",
      value: `${scopedRecords.length} profesionales`,
    },
    {
      label: "Mayor alerta",
      note: firstRecord?.alerts[0] ?? firstRecord?.recommendation ?? "Sin alerta principal.",
      tone: firstRecord?.alerts.length ? "warning" : "positive",
      value: firstRecord?.name ?? "Sin datos",
    },
    {
      label: "Decision",
      note: "Usa esta tendencia para redistribuir carga, proteger calidad o planificar capacitacion.",
      tone: "positive",
      value: "Accionable",
    },
  ];
  const metricOptions: TrendChartOption[] = [
    {
      description:
        "Productividad normalizada por horas, complejidad y grupo comparable.",
      id: "productividad-profesional",
      insights,
      label: "Productividad",
      series: seriesForRecords(scopedRecords, "productivity", (record) =>
        `${record.productivityAdjusted}`,
      ),
      yLabel: "Puntaje productividad",
    },
    {
      description:
        "Calidad del trabajo: protocolos, repeticion, reclamos e incidencias.",
      id: "calidad-profesional",
      insights,
      label: "Calidad",
      series: seriesForRecords(scopedRecords, "quality", (record) =>
        `${record.qualityScore}`,
      ),
      yLabel: "Puntaje calidad",
    },
    {
      description:
        "Uso real de horas disponibles; ayuda a detectar sobrecarga y subutilizacion.",
      id: "utilizacion-profesional",
      insights,
      label: "Utilizacion",
      series: seriesForRecords(scopedRecords, "utilization", (record) =>
        `${record.utilizationRate}%`,
      ),
      yLabel: "% utilizacion",
    },
    {
      description:
        "Cumplimiento de tiempos o entrega dentro de SLA segun rol.",
      id: "sla-profesional",
      insights,
      label: "SLA",
      series: seriesForRecords(scopedRecords, "sla", (record) =>
        `${record.slaRate}%`,
      ),
      yLabel: "% SLA",
    },
    {
      description:
        "Pacientes atendidos cuando aplica; en tecnicos puede ser volumen operativo equivalente.",
      id: "pacientes-profesional",
      insights,
      label: "Pacientes",
      series: seriesForRecords(scopedRecords, "patients", (record) =>
        record.patients.toLocaleString("en-US"),
      ),
      yLabel: "Pacientes",
    },
    {
      description:
        "Ingreso por hora como indicador operativo, no decision salarial automatica.",
      id: "ingreso-hora-profesional",
      insights,
      label: "Ingreso por hora",
      series: seriesForRecords(scopedRecords, "revenuePerHour", (record) =>
        formatCurrency(record.revenuePerHour),
      ),
      yLabel: "USD por hora",
    },
    {
      description:
        "Puntaje integral del profesional dentro de su rol comparable.",
      id: "score-integral-profesional",
      insights,
      label: "Puntaje integral",
      series: seriesForRecords(scopedRecords, "score", (record) =>
        `${record.score}`,
      ),
      yLabel: "Puntaje 0-100",
    },
  ];

  return {
    description:
      "Compara hasta cinco profesionales y selecciona KPI, fechas, periodo anterior o meta.",
    insights,
    metricOptions,
    series: metricOptions[0].series,
    title: "Evolucion individual del profesional",
    xLabels: exactDateLabels,
    yLabel: metricOptions[0].yLabel,
  };
}
