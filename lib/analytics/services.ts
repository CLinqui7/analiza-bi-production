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

export type ServiceLine = "Laboratorio" | "Fisioterapia" | "Imagenes";

export type ServiceStatus =
  | "Estrategico"
  | "Saludable"
  | "En observacion"
  | "Requiere intervencion"
  | "Sin datos suficientes";

export type ServiceState =
  | "Activo"
  | "Suspendido"
  | "Nuevo"
  | "En prueba"
  | "Solo convenio"
  | "Solo sucursales seleccionadas";

export type ServiceOwnership = "Propio" | "Tercerizado" | "Mixto";

export type ServiceMetricGroup =
  | "Portafolio"
  | "Demanda"
  | "Produccion"
  | "Valor"
  | "Calidad";

export type ServiceMetric = {
  group: ServiceMetricGroup;
  label: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
  value: string;
};

export type ServiceDimension = {
  id: string;
  insight: string;
  label: string;
  points: number;
  score: number;
  weight: number;
};

export type BranchServicePerformance = {
  branch: string;
  conversionRate: number;
  demand: number;
  marginRate: number;
  slaRate: number;
  status: "Saludable" | "Oportunidad" | "Critico";
  utilizationRate: number;
  volume: number;
};

export type ServiceRecord = {
  id: string;
  code: string;
  fiscalCode: string;
  name: string;
  description: string;
  line: ServiceLine;
  lineSlug: Exclude<BusinessLineSlug, "consolidado">;
  category: string;
  family: string;
  state: ServiceState;
  branch: string;
  channel: string;
  payer: string;
  ownership: ServiceOwnership;
  includedInPackage: boolean;
  withDiscount: boolean;
  hasIncidents: boolean;
  unit: string;
  standardDurationMinutes: number;
  averageDurationMinutes: number;
  price: number;
  standardCost: number;
  directCost: number;
  minimumMarginRate: number;
  marginRate: number;
  profit: number;
  netSales: number;
  ticketAverage: number;
  revenuePerPatient: number;
  revenuePerHour: number;
  requests: number;
  completed: number;
  pending: number;
  patients: number;
  newPatients: number;
  recurrentPatients: number;
  reactivatedPatients: number;
  frequency: number;
  demandGrowth: number;
  portfolioShare: number;
  demandNotServed: number;
  waitlist: number;
  conversionRate: number;
  slaRate: number;
  capacityUtilization: number;
  productivityPerHour: number;
  targetCompletionRate: number;
  repeats: number;
  reprocesses: number;
  cancellations: number;
  complaints: number;
  incidents: number;
  protocolRate: number;
  satisfaction: number;
  recordQuality: number;
  dataQuality: number;
  unbilledServices: number;
  discountRate: number;
  lossAmount: number;
  creationDate: string;
  validSince: string;
  updatedAt: string;
  owner: string;
  enabledBranches: string[];
  authorizedProfessionals: string[];
  requiredEquipment: string[];
  requiredSupplies: string[];
  patientRequirements: string[];
  preparation: string;
  relatedServices: { service: string; value: number }[];
  branchPerformance: BranchServicePerformance[];
  lossCauses: { cause: string; value: number }[];
  mainDriver: string;
  mainDrag: string;
  recommendation: string;
  score: number;
  scoreDelta: number;
  status: ServiceStatus;
  dimensions: ServiceDimension[];
  trend: {
    requests: number[];
    completed: number[];
    patients: number[];
    sales: number[];
    margin: number[];
    sla: number[];
    score: number[];
  };
};

export type ServiceScreen = {
  description: string;
  insights: string[];
  metrics: ServiceMetric[];
  records: ServiceRecord[];
  rule: string;
  slug: BusinessLineSlug;
  subtitle: string;
  title: string;
  weights: { dimension: string; weight: number }[];
};

type GeneratedServiceFields = "dimensions" | "score" | "status" | "trend";

type ServiceRecordInput = Omit<ServiceRecord, GeneratedServiceFields>;

export const serviceWeightsByLine: Record<
  BusinessLineSlug,
  { dimension: string; weight: number }[]
> = {
  consolidado: [
    { dimension: "Demanda y crecimiento", weight: 20 },
    { dimension: "Rentabilidad", weight: 25 },
    { dimension: "Eficiencia operativa", weight: 20 },
    { dimension: "Calidad y SLA", weight: 20 },
    { dimension: "Utilizacion de capacidad", weight: 10 },
    { dimension: "Calidad de datos", weight: 5 },
  ],
  laboratorio: [
    { dimension: "Demanda y crecimiento", weight: 18 },
    { dimension: "Rentabilidad y costo tecnico", weight: 27 },
    { dimension: "Eficiencia de proceso", weight: 18 },
    { dimension: "Calidad y SLA tecnico", weight: 22 },
    { dimension: "Utilizacion de analizador", weight: 10 },
    { dimension: "Calidad de datos", weight: 5 },
  ],
  fisioterapia: [
    { dimension: "Demanda y recurrencia", weight: 18 },
    { dimension: "Rentabilidad por paciente", weight: 20 },
    { dimension: "Continuidad del plan", weight: 24 },
    { dimension: "Calidad y experiencia", weight: 18 },
    { dimension: "Ocupacion efectiva", weight: 15 },
    { dimension: "Calidad de datos", weight: 5 },
  ],
  imagenes: [
    { dimension: "Demanda y crecimiento", weight: 18 },
    { dimension: "Rentabilidad por estudio", weight: 24 },
    { dimension: "Eficiencia tecnica", weight: 18 },
    { dimension: "Calidad, SLA e informe", weight: 20 },
    { dimension: "Utilizacion de equipo", weight: 15 },
    { dimension: "Calidad de datos", weight: 5 },
  ],
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

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getStatus(score: number, dataQuality: number): ServiceStatus {
  if (dataQuality < 68) {
    return "Sin datos suficientes";
  }

  if (score >= 90) {
    return "Estrategico";
  }

  if (score >= 80) {
    return "Saludable";
  }

  if (score >= 70) {
    return "En observacion";
  }

  return "Requiere intervencion";
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

function buildServiceDimensions(input: ServiceRecordInput): ServiceDimension[] {
  const weights = serviceWeightsByLine[input.lineSlug];
  const continuityScore =
    input.lineSlug === "fisioterapia"
      ? Math.round(
          clamp(
            input.conversionRate * 0.45 +
              input.frequency * 10 +
              (input.recurrentPatients / Math.max(input.patients, 1)) * 45,
          ),
        )
      : Math.round((input.conversionRate + input.slaRate) / 2);
  const demandScore = Math.round(
    clamp(
      58 +
        input.demandGrowth * 1.2 +
        input.portfolioShare * 0.65 +
        input.conversionRate * 0.18 -
        input.demandNotServed * 0.012,
    ),
  );
  const profitabilityScore = Math.round(
    clamp(
      input.marginRate * 1.08 +
        (input.marginRate - input.minimumMarginRate) * 0.85 -
        input.discountRate * 0.4 -
        input.unbilledServices * 0.8,
    ),
  );
  const efficiencyScore = Math.round(
    clamp(
      input.conversionRate * 0.45 +
        input.productivityPerHour * 4 +
        (input.standardDurationMinutes / Math.max(input.averageDurationMinutes, 1)) *
          30 -
        input.pending * 0.04 -
        input.cancellations * 0.18,
    ),
  );
  const qualityScore = Math.round(
    clamp(
      (input.slaRate + input.protocolRate + input.satisfaction + input.recordQuality) /
        4 -
        input.repeats * 0.16 -
        input.complaints * 0.55,
    ),
  );
  const scoresByDimension = [
    demandScore,
    profitabilityScore,
    input.lineSlug === "fisioterapia" ? continuityScore : efficiencyScore,
    qualityScore,
    input.capacityUtilization,
    input.dataQuality,
  ];

  return weights.map((weight, index) => {
    const score = Math.round(clamp(scoresByDimension[index] ?? 75));

    return {
      id: `${input.id}-${index}`,
      insight:
        index === 0
          ? "Mide si el servicio crece, atrae pacientes y sostiene participacion."
          : index === 1
            ? "Revisa margen, costo directo, descuento y servicios sin facturar."
            : index === 2
              ? input.lineSlug === "fisioterapia"
                ? "Evalua continuidad de plan, conversion y recurrencia."
                : "Evalua conversion, tiempo, pendientes y productividad operativa."
              : index === 3
                ? "Integra SLA, protocolo, satisfaccion, reclamos y repeticiones."
                : index === 4
                  ? "Compara uso de capacidad contra demanda y meta del servicio."
                  : "Evita decidir con servicios incompletos, mal codificados o sin trazabilidad.",
      label: weight.dimension,
      points: Number(((score * weight.weight) / 100).toFixed(1)),
      score,
      weight: weight.weight,
    };
  });
}

function finishService(input: ServiceRecordInput): ServiceRecord {
  const dimensions = buildServiceDimensions(input);
  const score = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.points, 0),
  );
  const status = getStatus(score, input.dataQuality);

  return {
    ...input,
    dimensions,
    score,
    status,
    trend: {
      completed: buildVolumePoints(input.completed),
      margin: buildPoints(input.marginRate, input.scoreDelta),
      patients: buildVolumePoints(input.patients),
      requests: buildVolumePoints(input.requests),
      sales: buildVolumePoints(input.netSales),
      score: buildPoints(score, input.scoreDelta),
      sla: buildPoints(input.slaRate, input.scoreDelta),
    },
  };
}

export const serviceRecords: ServiceRecord[] = [
  finishService({
    authorizedProfessionals: ["Flebotomistas", "Tecnicos de laboratorio"],
    averageDurationMinutes: 46,
    branch: "SS - Santa Tecla - L011",
    branchPerformance: [
      { branch: "SS - Santa Tecla - L011", conversionRate: 94, demand: 920, marginRate: 44, slaRate: 92, status: "Saludable", utilizationRate: 86, volume: 865 },
      { branch: "SS - Aguilares - L033", conversionRate: 91, demand: 610, marginRate: 41, slaRate: 94, status: "Saludable", utilizationRate: 68, volume: 555 },
      { branch: "SS - Constitucion - L009", conversionRate: 82, demand: 760, marginRate: 29, slaRate: 78, status: "Critico", utilizationRate: 91, volume: 625 },
    ],
    cancellations: 34,
    capacityUtilization: 86,
    category: "Prueba individual",
    channel: "Sucursal",
    code: "LAB-HEM-001",
    complaints: 3,
    completed: 2045,
    conversionRate: 91,
    creationDate: "2021-02-01",
    dataQuality: 88,
    demandGrowth: 9,
    demandNotServed: 92,
    description: "Hemograma completo automatizado con validacion tecnica.",
    directCost: 6.9,
    discountRate: 6,
    enabledBranches: ["SS - Santa Tecla - L011", "SS - Aguilares - L033", "SS - Constitucion - L009"],
    family: "Hematologia",
    fiscalCode: "SV-LAB-HEM",
    frequency: 1.4,
    hasIncidents: true,
    id: "srv-lab-hemograma",
    includedInPackage: true,
    incidents: 7,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lossAmount: 1850,
    lossCauses: [
      { cause: "Repeticiones", value: 620 },
      { cause: "Registros incompletos", value: 340 },
      { cause: "Tiempo fuera de SLA", value: 510 },
      { cause: "Servicio no facturado", value: 380 },
    ],
    mainDrag: "Constitucion concentra retrasos y margen bajo por repeticion.",
    mainDriver: "Alta demanda recurrente y participacion fuerte en perfiles.",
    marginRate: 43,
    minimumMarginRate: 35,
    name: "Hemograma completo",
    netSales: 28630,
    newPatients: 620,
    owner: "Operacion Laboratorio",
    ownership: "Propio",
    patientRequirements: ["Documento de identidad", "Orden medica cuando aplica"],
    patients: 1760,
    payer: "Particular",
    pending: 86,
    portfolioShare: 18,
    preparation: "Sin ayuno obligatorio.",
    price: 14,
    productivityPerHour: 23,
    profit: 12310,
    protocolRate: 93,
    reactivatedPatients: 70,
    recommendation: "Mantener como servicio base, corregir SLA de Constitucion y revisar causas de repeticion.",
    recordQuality: 87,
    recurrentPatients: 1070,
    relatedServices: [
      { service: "Quimica sanguinea", value: 58 },
      { service: "Perfil tiroideo", value: 18 },
      { service: "Ultrasonido abdomen", value: 9 },
    ],
    repeats: 18,
    reprocesses: 11,
    requests: 2240,
    requiredEquipment: ["Analizador hematologico"],
    requiredSupplies: ["Tubo EDTA", "Reactivo hematologia"],
    revenuePerHour: 312,
    revenuePerPatient: 16.3,
    satisfaction: 89,
    scoreDelta: 4,
    slaRate: 88,
    standardCost: 7.8,
    standardDurationMinutes: 42,
    state: "Activo",
    ticketAverage: 14,
    targetCompletionRate: 104,
    unbilledServices: 10,
    unit: "Prueba",
    updatedAt: "2026-07-18",
    validSince: "2026-01-01",
    waitlist: 22,
    withDiscount: true,
  }),
  finishService({
    authorizedProfessionals: ["Tecnicos de laboratorio", "Responsable de validacion"],
    averageDurationMinutes: 78,
    branch: "SS-Merliot 2- L045",
    branchPerformance: [
      { branch: "SS-Merliot 2- L045", conversionRate: 92, demand: 520, marginRate: 48, slaRate: 90, status: "Saludable", utilizationRate: 84, volume: 478 },
      { branch: "SS - Chalatenango- L036", conversionRate: 87, demand: 380, marginRate: 36, slaRate: 84, status: "Oportunidad", utilizationRate: 66, volume: 331 },
      { branch: "SS - Constitucion - L009", conversionRate: 78, demand: 440, marginRate: 30, slaRate: 76, status: "Critico", utilizationRate: 88, volume: 343 },
    ],
    cancellations: 26,
    capacityUtilization: 80,
    category: "Perfil",
    channel: "Medico referidor",
    code: "LAB-TIR-010",
    complaints: 4,
    completed: 1152,
    conversionRate: 86,
    creationDate: "2021-06-16",
    dataQuality: 82,
    demandGrowth: 12,
    demandNotServed: 128,
    description: "Perfil tiroideo con TSH, T3 y T4 segun configuracion medica.",
    directCost: 18,
    discountRate: 9,
    enabledBranches: ["SS-Merliot 2- L045", "SS - Chalatenango- L036", "SS - Constitucion - L009"],
    family: "Endocrinologia",
    fiscalCode: "SV-LAB-TIR",
    frequency: 1.7,
    hasIncidents: true,
    id: "srv-lab-perfil-tiroideo",
    includedInPackage: true,
    incidents: 9,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lossAmount: 2650,
    lossCauses: [
      { cause: "Tercerizacion", value: 920 },
      { cause: "Tiempo fuera de SLA", value: 710 },
      { cause: "Descuento", value: 540 },
      { cause: "Servicio no facturado", value: 480 },
    ],
    mainDrag: "Costo tecnico sube por reactivos y tercerizacion parcial.",
    mainDriver: "Demanda crece por medico referidor y uso en perfiles.",
    marginRate: 38,
    minimumMarginRate: 36,
    name: "Perfil tiroideo",
    netSales: 39168,
    newPatients: 520,
    owner: "Operacion Laboratorio",
    ownership: "Mixto",
    patientRequirements: ["Orden medica recomendada"],
    patients: 980,
    payer: "Convenio empresarial",
    pending: 112,
    portfolioShare: 13,
    preparation: "Ayuno segun criterio medico.",
    price: 34,
    productivityPerHour: 15,
    profit: 14884,
    protocolRate: 89,
    reactivatedPatients: 58,
    recommendation: "Evaluar procesamiento interno si el volumen sostiene minimo tecnico.",
    recordQuality: 80,
    recurrentPatients: 402,
    relatedServices: [
      { service: "Hemograma completo", value: 24 },
      { service: "Ultrasonido tiroides", value: 16 },
      { service: "Quimica sanguinea", value: 22 },
    ],
    repeats: 22,
    reprocesses: 15,
    requests: 1340,
    requiredEquipment: ["Inmunoanalizador", "Modulo tercerizado"],
    requiredSupplies: ["Reactivo TSH", "Reactivo T3", "Reactivo T4"],
    revenuePerHour: 296,
    revenuePerPatient: 40,
    satisfaction: 86,
    scoreDelta: 3,
    slaRate: 83,
    standardCost: 17,
    standardDurationMinutes: 70,
    state: "Activo",
    ticketAverage: 34,
    targetCompletionRate: 98,
    unbilledServices: 12,
    unit: "Perfil",
    updatedAt: "2026-07-19",
    validSince: "2026-01-01",
    waitlist: 34,
    withDiscount: true,
  }),
  finishService({
    authorizedProfessionals: ["Tecnicos de laboratorio"],
    averageDurationMinutes: 95,
    branch: "SS - Aguilares - L033",
    branchPerformance: [
      { branch: "SS - Aguilares - L033", conversionRate: 89, demand: 420, marginRate: 33, slaRate: 81, status: "Oportunidad", utilizationRate: 70, volume: 374 },
      { branch: "SS - Santa Tecla - L011", conversionRate: 93, demand: 620, marginRate: 39, slaRate: 88, status: "Saludable", utilizationRate: 84, volume: 577 },
      { branch: "SS - Constitucion - L009", conversionRate: 77, demand: 500, marginRate: 26, slaRate: 72, status: "Critico", utilizationRate: 88, volume: 385 },
    ],
    cancellations: 42,
    capacityUtilization: 82,
    category: "Prueba individual",
    channel: "Sucursal",
    code: "LAB-QUI-020",
    complaints: 5,
    completed: 1336,
    conversionRate: 87,
    creationDate: "2020-05-12",
    dataQuality: 77,
    demandGrowth: -4,
    demandNotServed: 170,
    description: "Quimica sanguinea basica y complementaria.",
    directCost: 12.8,
    discountRate: 11,
    enabledBranches: ["SS - Aguilares - L033", "SS - Santa Tecla - L011", "SS - Constitucion - L009"],
    family: "Quimica clinica",
    fiscalCode: "SV-LAB-QUI",
    frequency: 1.5,
    hasIncidents: true,
    id: "srv-lab-quimica",
    includedInPackage: true,
    incidents: 12,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lossAmount: 3180,
    lossCauses: [
      { cause: "Rendimiento reactivo", value: 1240 },
      { cause: "Repeticiones", value: 760 },
      { cause: "Tiempo fuera de SLA", value: 620 },
      { cause: "Descuento", value: 560 },
    ],
    mainDrag: "Margen cae por rendimiento real de reactivo y descuentos.",
    mainDriver: "Servicio de entrada para perfiles y ordenes recurrentes.",
    marginRate: 31,
    minimumMarginRate: 34,
    name: "Quimica sanguinea",
    netSales: 30728,
    newPatients: 430,
    owner: "Operacion Laboratorio",
    ownership: "Propio",
    patientRequirements: ["Ayuno recomendado"],
    patients: 1010,
    payer: "Particular",
    pending: 142,
    portfolioShare: 14,
    preparation: "Ayuno de 8 horas segun prueba.",
    price: 23,
    productivityPerHour: 16,
    profit: 9525,
    protocolRate: 86,
    reactivatedPatients: 45,
    recommendation: "Revisar precio, descuento y rendimiento de reactivos por sucursal.",
    recordQuality: 75,
    recurrentPatients: 535,
    relatedServices: [
      { service: "Hemograma completo", value: 52 },
      { service: "Perfil tiroideo", value: 21 },
      { service: "Electrocardiograma", value: 6 },
    ],
    repeats: 34,
    reprocesses: 19,
    requests: 1532,
    requiredEquipment: ["Analizador quimica"],
    requiredSupplies: ["Reactivos quimica", "Controles"],
    revenuePerHour: 230,
    revenuePerPatient: 30.4,
    satisfaction: 82,
    scoreDelta: -5,
    slaRate: 78,
    standardCost: 11.5,
    standardDurationMinutes: 82,
    state: "Activo",
    ticketAverage: 23,
    targetCompletionRate: 86,
    unbilledServices: 16,
    unit: "Prueba",
    updatedAt: "2026-07-16",
    validSince: "2026-01-01",
    waitlist: 48,
    withDiscount: true,
  }),
  finishService({
    authorizedProfessionals: ["Fisioterapeutas"],
    averageDurationMinutes: 52,
    branch: "Fisioterapia Centro",
    branchPerformance: [
      { branch: "Fisioterapia Centro", conversionRate: 68, demand: 360, marginRate: 47, slaRate: 84, status: "Oportunidad", utilizationRate: 72, volume: 245 },
      { branch: "Fisioterapia Norte", conversionRate: 82, demand: 420, marginRate: 54, slaRate: 91, status: "Saludable", utilizationRate: 89, volume: 344 },
      { branch: "Fisioterapia Sur", conversionRate: 78, demand: 250, marginRate: 52, slaRate: 88, status: "Saludable", utilizationRate: 76, volume: 195 },
    ],
    cancellations: 58,
    capacityUtilization: 79,
    category: "Evaluacion",
    channel: "Whatsapp",
    code: "FIS-EVA-001",
    complaints: 3,
    completed: 784,
    conversionRate: 76,
    creationDate: "2022-01-10",
    dataQuality: 85,
    demandGrowth: 18,
    demandNotServed: 84,
    description: "Evaluacion inicial para plan terapeutico.",
    directCost: 14,
    discountRate: 5,
    enabledBranches: ["Fisioterapia Centro", "Fisioterapia Norte", "Fisioterapia Sur"],
    family: "Inicio de plan",
    fiscalCode: "SV-FIS-EVA",
    frequency: 1.1,
    hasIncidents: false,
    id: "srv-fis-evaluacion",
    includedInPackage: false,
    incidents: 3,
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    lossAmount: 1420,
    lossCauses: [
      { cause: "No-show", value: 620 },
      { cause: "Cancelacion", value: 430 },
      { cause: "Seguimiento no convertido", value: 370 },
    ],
    mainDrag: "Baja conversion a plan en Centro.",
    mainDriver: "Atrae pacientes nuevos y abre oportunidad de continuidad.",
    marginRate: 51,
    minimumMarginRate: 40,
    name: "Evaluacion fisioterapia",
    netSales: 27440,
    newPatients: 710,
    owner: "Operacion Fisioterapia",
    ownership: "Propio",
    patientRequirements: ["Diagnostico o referencia cuando aplica"],
    patients: 760,
    payer: "Particular",
    pending: 44,
    portfolioShare: 12,
    preparation: "Llegar 10 minutos antes.",
    price: 35,
    productivityPerHour: 1.8,
    profit: 13994,
    protocolRate: 91,
    reactivatedPatients: 22,
    recommendation: "Mejorar seguimiento posterior a evaluacion antes de abrir mas capacidad.",
    recordQuality: 84,
    recurrentPatients: 28,
    relatedServices: [
      { service: "Paquete 10 sesiones", value: 42 },
      { service: "Sesion terapia fisica", value: 38 },
      { service: "Neurorehabilitacion", value: 11 },
    ],
    repeats: 2,
    reprocesses: 1,
    requests: 1030,
    requiredEquipment: ["Consultorio", "Camilla"],
    requiredSupplies: ["Historia clinica", "Escalas funcionales"],
    revenuePerHour: 63,
    revenuePerPatient: 36.1,
    satisfaction: 92,
    scoreDelta: 5,
    slaRate: 87,
    standardCost: 13,
    standardDurationMinutes: 50,
    state: "Activo",
    ticketAverage: 35,
    targetCompletionRate: 102,
    unbilledServices: 3,
    unit: "Evaluacion",
    updatedAt: "2026-07-20",
    validSince: "2026-01-01",
    waitlist: 19,
    withDiscount: false,
  }),
  finishService({
    authorizedProfessionals: ["Fisioterapeutas"],
    averageDurationMinutes: 48,
    branch: "Fisioterapia Norte",
    branchPerformance: [
      { branch: "Fisioterapia Norte", conversionRate: 95, demand: 540, marginRate: 56, slaRate: 94, status: "Saludable", utilizationRate: 93, volume: 513 },
      { branch: "Fisioterapia Centro", conversionRate: 88, demand: 490, marginRate: 42, slaRate: 80, status: "Oportunidad", utilizationRate: 86, volume: 431 },
      { branch: "Fisioterapia Sur", conversionRate: 91, demand: 330, marginRate: 51, slaRate: 90, status: "Saludable", utilizationRate: 78, volume: 300 },
    ],
    cancellations: 66,
    capacityUtilization: 88,
    category: "Sesion",
    channel: "Sucursal",
    code: "FIS-SES-010",
    complaints: 5,
    completed: 1244,
    conversionRate: 91,
    creationDate: "2021-09-01",
    dataQuality: 86,
    demandGrowth: 10,
    demandNotServed: 104,
    description: "Sesion individual de terapia fisica.",
    directCost: 12,
    discountRate: 8,
    enabledBranches: ["Fisioterapia Norte", "Fisioterapia Centro", "Fisioterapia Sur"],
    family: "Terapia fisica",
    fiscalCode: "SV-FIS-SES",
    frequency: 4.2,
    hasIncidents: true,
    id: "srv-fis-sesion",
    includedInPackage: true,
    incidents: 8,
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    lossAmount: 2360,
    lossCauses: [
      { cause: "No-show", value: 880 },
      { cause: "Cancelacion", value: 610 },
      { cause: "Servicios no facturados", value: 420 },
      { cause: "Tiempo excedido", value: 450 },
    ],
    mainDrag: "Centro tiene SLA bajo y descuentos superiores.",
    mainDriver: "Alta recurrencia y continuidad de pacientes.",
    marginRate: 50,
    minimumMarginRate: 38,
    name: "Sesion terapia fisica",
    netSales: 55980,
    newPatients: 220,
    owner: "Operacion Fisioterapia",
    ownership: "Propio",
    patientRequirements: ["Plan terapeutico activo"],
    patients: 410,
    payer: "Particular",
    pending: 72,
    portfolioShare: 21,
    preparation: "Ropa comoda.",
    price: 45,
    productivityPerHour: 1.9,
    profit: 27990,
    protocolRate: 92,
    reactivatedPatients: 48,
    recommendation: "Proteger continuidad y reducir no-show con confirmacion automatica.",
    recordQuality: 83,
    recurrentPatients: 142,
    relatedServices: [
      { service: "Paquete 10 sesiones", value: 56 },
      { service: "Evaluacion fisioterapia", value: 44 },
      { service: "Neurorehabilitacion", value: 10 },
    ],
    repeats: 4,
    reprocesses: 0,
    requests: 1360,
    requiredEquipment: ["Camilla", "Electroterapia"],
    requiredSupplies: ["Consumibles terapeuticos"],
    revenuePerHour: 85,
    revenuePerPatient: 136.5,
    satisfaction: 91,
    scoreDelta: 4,
    slaRate: 88,
    standardCost: 13,
    standardDurationMinutes: 45,
    state: "Activo",
    ticketAverage: 45,
    targetCompletionRate: 108,
    unbilledServices: 7,
    unit: "Sesion",
    updatedAt: "2026-07-19",
    validSince: "2026-01-01",
    waitlist: 36,
    withDiscount: true,
  }),
  finishService({
    authorizedProfessionals: ["Fisioterapeutas"],
    averageDurationMinutes: 50,
    branch: "Fisioterapia Sur",
    branchPerformance: [
      { branch: "Fisioterapia Sur", conversionRate: 87, demand: 180, marginRate: 58, slaRate: 91, status: "Saludable", utilizationRate: 72, volume: 157 },
      { branch: "Fisioterapia Norte", conversionRate: 90, demand: 230, marginRate: 61, slaRate: 93, status: "Saludable", utilizationRate: 84, volume: 207 },
      { branch: "Fisioterapia Centro", conversionRate: 76, demand: 205, marginRate: 44, slaRate: 80, status: "Oportunidad", utilizationRate: 68, volume: 156 },
    ],
    cancellations: 24,
    capacityUtilization: 75,
    category: "Paquete",
    channel: "Sucursal",
    code: "FIS-PAQ-010",
    complaints: 2,
    completed: 520,
    conversionRate: 84,
    creationDate: "2023-03-15",
    dataQuality: 84,
    demandGrowth: 14,
    demandNotServed: 38,
    description: "Paquete de 10 sesiones con seguimiento de vigencia.",
    directCost: 104,
    discountRate: 12,
    enabledBranches: ["Fisioterapia Sur", "Fisioterapia Norte", "Fisioterapia Centro"],
    family: "Plan terapeutico",
    fiscalCode: "SV-FIS-PAQ10",
    frequency: 8.7,
    hasIncidents: false,
    id: "srv-fis-paquete-10",
    includedInPackage: false,
    incidents: 3,
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    lossAmount: 1720,
    lossCauses: [
      { cause: "Sesiones vencidas", value: 540 },
      { cause: "Abandono", value: 670 },
      { cause: "Descuento", value: 510 },
    ],
    mainDrag: "Paquetes con sesiones pendientes cerca de vencimiento.",
    mainDriver: "Mayor ingreso por paciente y continuidad terapeutica.",
    marginRate: 54,
    minimumMarginRate: 42,
    name: "Paquete 10 sesiones",
    netSales: 114400,
    newPatients: 122,
    owner: "Operacion Fisioterapia",
    ownership: "Propio",
    patientRequirements: ["Evaluacion previa", "Plan activo"],
    patients: 260,
    payer: "Convenio empresarial",
    pending: 116,
    portfolioShare: 24,
    preparation: "Agenda de continuidad semanal.",
    price: 220,
    productivityPerHour: 1.6,
    profit: 61776,
    protocolRate: 89,
    reactivatedPatients: 30,
    recommendation: "Gestionar sesiones pendientes antes de vender nuevos paquetes en Centro.",
    recordQuality: 82,
    recurrentPatients: 108,
    relatedServices: [
      { service: "Sesion terapia fisica", value: 72 },
      { service: "Evaluacion fisioterapia", value: 41 },
      { service: "Terapia complementaria", value: 18 },
    ],
    repeats: 2,
    reprocesses: 0,
    requests: 615,
    requiredEquipment: ["Consultorio", "Agenda recurrente"],
    requiredSupplies: ["Plan terapeutico"],
    revenuePerHour: 146,
    revenuePerPatient: 440,
    satisfaction: 90,
    scoreDelta: 6,
    slaRate: 86,
    standardCost: 100,
    standardDurationMinutes: 450,
    state: "Activo",
    ticketAverage: 220,
    targetCompletionRate: 110,
    unbilledServices: 4,
    unit: "Paquete",
    updatedAt: "2026-07-21",
    validSince: "2026-01-01",
    waitlist: 16,
    withDiscount: true,
  }),
  finishService({
    authorizedProfessionals: ["Tecnicos de imagenes", "Radiologos"],
    averageDurationMinutes: 46,
    branch: "Imagenes Santa Tecla",
    branchPerformance: [
      { branch: "Imagenes Santa Tecla", conversionRate: 92, demand: 360, marginRate: 57, slaRate: 82, status: "Oportunidad", utilizationRate: 94, volume: 331 },
      { branch: "Imagenes Centro", conversionRate: 84, demand: 260, marginRate: 49, slaRate: 78, status: "Oportunidad", utilizationRate: 88, volume: 218 },
      { branch: "Imagenes Este", conversionRate: 74, demand: 160, marginRate: 42, slaRate: 84, status: "Oportunidad", utilizationRate: 62, volume: 118 },
    ],
    cancellations: 38,
    capacityUtilization: 88,
    category: "Modalidad",
    channel: "Medico referidor",
    code: "IMG-TAC-001",
    complaints: 4,
    completed: 667,
    conversionRate: 86,
    creationDate: "2020-10-02",
    dataQuality: 83,
    demandGrowth: 24,
    demandNotServed: 156,
    description: "Tomografia simple con lectura diagnostica.",
    directCost: 52,
    discountRate: 7,
    enabledBranches: ["Imagenes Santa Tecla", "Imagenes Centro", "Imagenes Este"],
    family: "Tomografia",
    fiscalCode: "SV-IMG-TAC",
    frequency: 1.2,
    hasIncidents: true,
    id: "srv-img-tomografia",
    includedInPackage: false,
    incidents: 12,
    line: "Imagenes",
    lineSlug: "imagenes",
    lossAmount: 4260,
    lossCauses: [
      { cause: "Tiempo de informe", value: 1420 },
      { cause: "Equipo detenido", value: 980 },
      { cause: "Autorizacion pendiente", value: 710 },
      { cause: "Servicio no facturado", value: 610 },
      { cause: "Preparacion incompleta", value: 540 },
    ],
    mainDrag: "La lectura e informes pendientes limitan el crecimiento.",
    mainDriver: "Alta demanda, buen margen y relevancia diagnostica.",
    marginRate: 52,
    minimumMarginRate: 42,
    name: "Tomografia simple",
    netSales: 80040,
    newPatients: 330,
    owner: "Operacion Imagenes",
    ownership: "Propio",
    patientRequirements: ["Orden medica", "Autorizacion si aplica"],
    patients: 610,
    payer: "Aseguradora",
    pending: 148,
    portfolioShare: 20,
    preparation: "Indicaciones segun zona anatomica.",
    price: 120,
    productivityPerHour: 2.4,
    profit: 41621,
    protocolRate: 88,
    reactivatedPatients: 36,
    recommendation: "Aumentar capacidad de lectura antes de vender mas agenda nocturna.",
    recordQuality: 82,
    recurrentPatients: 244,
    relatedServices: [
      { service: "Hemograma completo", value: 22 },
      { service: "Ultrasonido abdomen", value: 19 },
      { service: "Lectura diagnostica", value: 68 },
    ],
    repeats: 15,
    reprocesses: 8,
    requests: 776,
    requiredEquipment: ["Tomografo", "PACS"],
    requiredSupplies: ["Placas", "Insumos de sala"],
    revenuePerHour: 288,
    revenuePerPatient: 131.2,
    satisfaction: 87,
    scoreDelta: 5,
    slaRate: 81,
    standardCost: 50,
    standardDurationMinutes: 40,
    state: "Activo",
    ticketAverage: 120,
    targetCompletionRate: 106,
    unbilledServices: 9,
    unit: "Estudio",
    updatedAt: "2026-07-21",
    validSince: "2026-01-01",
    waitlist: 61,
    withDiscount: true,
  }),
  finishService({
    authorizedProfessionals: ["Tecnicos de imagenes"],
    averageDurationMinutes: 24,
    branch: "Imagenes Este",
    branchPerformance: [
      { branch: "Imagenes Este", conversionRate: 91, demand: 260, marginRate: 48, slaRate: 92, status: "Saludable", utilizationRate: 58, volume: 237 },
      { branch: "Imagenes Centro", conversionRate: 88, demand: 320, marginRate: 45, slaRate: 88, status: "Saludable", utilizationRate: 64, volume: 282 },
      { branch: "Imagenes Santa Tecla", conversionRate: 86, demand: 390, marginRate: 43, slaRate: 84, status: "Oportunidad", utilizationRate: 78, volume: 335 },
    ],
    cancellations: 28,
    capacityUtilization: 67,
    category: "Modalidad",
    channel: "Sucursal",
    code: "IMG-RX-001",
    complaints: 2,
    completed: 854,
    conversionRate: 88,
    creationDate: "2020-04-22",
    dataQuality: 86,
    demandGrowth: -2,
    demandNotServed: 42,
    description: "Rayos X convencional por region anatomica.",
    directCost: 16,
    discountRate: 9,
    enabledBranches: ["Imagenes Este", "Imagenes Centro", "Imagenes Santa Tecla"],
    family: "Rayos X",
    fiscalCode: "SV-IMG-RX",
    frequency: 1.1,
    hasIncidents: false,
    id: "srv-img-rayos-x",
    includedInPackage: false,
    incidents: 4,
    line: "Imagenes",
    lineSlug: "imagenes",
    lossAmount: 1180,
    lossCauses: [
      { cause: "No-show", value: 340 },
      { cause: "Descuento", value: 300 },
      { cause: "Tiempo muerto", value: 310 },
      { cause: "Servicio no facturado", value: 230 },
    ],
    mainDrag: "Capacidad disponible con demanda estancada.",
    mainDriver: "Servicio rapido, buena calidad y margen estable.",
    marginRate: 45,
    minimumMarginRate: 36,
    name: "Rayos X",
    netSales: 34160,
    newPatients: 390,
    owner: "Operacion Imagenes",
    ownership: "Propio",
    patientRequirements: ["Orden medica cuando aplica"],
    patients: 740,
    payer: "Particular",
    pending: 36,
    portfolioShare: 15,
    preparation: "Sin preparacion general.",
    price: 40,
    productivityPerHour: 3.1,
    profit: 15372,
    protocolRate: 93,
    reactivatedPatients: 44,
    recommendation: "Activar convenios o campanas en horarios con equipo disponible.",
    recordQuality: 86,
    recurrentPatients: 306,
    relatedServices: [
      { service: "Tomografia simple", value: 16 },
      { service: "Ultrasonido abdomen", value: 12 },
      { service: "Consulta externa", value: 8 },
    ],
    repeats: 6,
    reprocesses: 2,
    requests: 970,
    requiredEquipment: ["Rayos X", "PACS"],
    requiredSupplies: ["Placas digitales"],
    revenuePerHour: 124,
    revenuePerPatient: 46.2,
    satisfaction: 90,
    scoreDelta: 1,
    slaRate: 88,
    standardCost: 15,
    standardDurationMinutes: 20,
    state: "Activo",
    ticketAverage: 40,
    targetCompletionRate: 94,
    unbilledServices: 5,
    unit: "Estudio",
    updatedAt: "2026-07-18",
    validSince: "2026-01-01",
    waitlist: 12,
    withDiscount: true,
  }),
  finishService({
    authorizedProfessionals: ["Tecnicos de imagenes", "Radiologos"],
    averageDurationMinutes: 34,
    branch: "Imagenes Centro",
    branchPerformance: [
      { branch: "Imagenes Centro", conversionRate: 90, demand: 410, marginRate: 61, slaRate: 91, status: "Saludable", utilizationRate: 78, volume: 369 },
      { branch: "Imagenes Santa Tecla", conversionRate: 88, demand: 330, marginRate: 56, slaRate: 87, status: "Saludable", utilizationRate: 84, volume: 290 },
      { branch: "Imagenes Este", conversionRate: 80, demand: 190, marginRate: 52, slaRate: 85, status: "Oportunidad", utilizationRate: 60, volume: 152 },
    ],
    cancellations: 24,
    capacityUtilization: 76,
    category: "Modalidad",
    channel: "Medico referidor",
    code: "IMG-USG-001",
    complaints: 2,
    completed: 811,
    conversionRate: 87,
    creationDate: "2020-07-05",
    dataQuality: 85,
    demandGrowth: 16,
    demandNotServed: 58,
    description: "Ultrasonido diagnostico general.",
    directCost: 22,
    discountRate: 6,
    enabledBranches: ["Imagenes Centro", "Imagenes Santa Tecla", "Imagenes Este"],
    family: "Ultrasonido",
    fiscalCode: "SV-IMG-USG",
    frequency: 1.3,
    hasIncidents: false,
    id: "srv-img-ultrasonido",
    includedInPackage: false,
    incidents: 4,
    line: "Imagenes",
    lineSlug: "imagenes",
    lossAmount: 1280,
    lossCauses: [
      { cause: "Lista de espera", value: 420 },
      { cause: "Preparacion incompleta", value: 270 },
      { cause: "No-show", value: 310 },
      { cause: "Servicio no facturado", value: 280 },
    ],
    mainDrag: "Demanda crece mas rapido que agenda habilitada.",
    mainDriver: "Buen margen, alta satisfaccion y venta cruzada con laboratorio.",
    marginRate: 58,
    minimumMarginRate: 40,
    name: "Ultrasonido abdomen",
    netSales: 60825,
    newPatients: 390,
    owner: "Operacion Imagenes",
    ownership: "Propio",
    patientRequirements: ["Orden medica", "Preparacion abdominal"],
    patients: 690,
    payer: "Particular",
    pending: 52,
    portfolioShare: 17,
    preparation: "Ayuno segun estudio.",
    price: 75,
    productivityPerHour: 2.6,
    profit: 35279,
    protocolRate: 92,
    reactivatedPatients: 42,
    recommendation: "Impulsar en sucursales con agenda disponible y conectar con laboratorio complementario.",
    recordQuality: 84,
    recurrentPatients: 258,
    relatedServices: [
      { service: "Hemograma completo", value: 28 },
      { service: "Perfil tiroideo", value: 14 },
      { service: "Tomografia simple", value: 18 },
    ],
    repeats: 5,
    reprocesses: 2,
    requests: 930,
    requiredEquipment: ["Ultrasonido", "PACS"],
    requiredSupplies: ["Gel", "Insumos de imagen"],
    revenuePerHour: 195,
    revenuePerPatient: 88.2,
    satisfaction: 93,
    scoreDelta: 5,
    slaRate: 88,
    standardCost: 20,
    standardDurationMinutes: 30,
    state: "Activo",
    ticketAverage: 75,
    targetCompletionRate: 112,
    unbilledServices: 4,
    unit: "Estudio",
    updatedAt: "2026-07-20",
    validSince: "2026-01-01",
    waitlist: 22,
    withDiscount: false,
  }),
  finishService({
    authorizedProfessionals: ["Proveedor externo", "Responsable de validacion"],
    averageDurationMinutes: 240,
    branch: "SS - Chalatenango- L036",
    branchPerformance: [
      { branch: "SS - Chalatenango- L036", conversionRate: 72, demand: 110, marginRate: 18, slaRate: 64, status: "Critico", utilizationRate: 42, volume: 79 },
      { branch: "SS - Santa Tecla - L011", conversionRate: 79, demand: 160, marginRate: 24, slaRate: 70, status: "Critico", utilizationRate: 54, volume: 126 },
      { branch: "SS - Aguilares - L033", conversionRate: 68, demand: 90, marginRate: 16, slaRate: 61, status: "Critico", utilizationRate: 38, volume: 61 },
    ],
    cancellations: 18,
    capacityUtilization: 45,
    category: "Prueba tercerizada",
    channel: "Medico referidor",
    code: "LAB-EXT-VITD",
    complaints: 6,
    completed: 266,
    conversionRate: 74,
    creationDate: "2024-02-11",
    dataQuality: 70,
    demandGrowth: -12,
    demandNotServed: 86,
    description: "Prueba tercerizada con entrega diferida.",
    directCost: 31,
    discountRate: 4,
    enabledBranches: ["SS - Chalatenango- L036", "SS - Santa Tecla - L011", "SS - Aguilares - L033"],
    family: "Prueba especial",
    fiscalCode: "SV-LAB-EXT",
    frequency: 1.0,
    hasIncidents: true,
    id: "srv-lab-vitamina-d",
    includedInPackage: false,
    incidents: 14,
    line: "Laboratorio",
    lineSlug: "laboratorio",
    lossAmount: 2940,
    lossCauses: [
      { cause: "Tercerizacion", value: 1260 },
      { cause: "Tiempo fuera de SLA", value: 920 },
      { cause: "Cancelacion", value: 420 },
      { cause: "Reclamos", value: 340 },
    ],
    mainDrag: "Costo externo creciente y SLA debil.",
    mainDriver: "Servicio especializado con pacientes de mayor ticket.",
    marginRate: 21,
    minimumMarginRate: 35,
    name: "Vitamina D tercerizada",
    netSales: 11970,
    newPatients: 180,
    owner: "Operacion Laboratorio",
    ownership: "Tercerizado",
    patientRequirements: ["Orden medica"],
    patients: 240,
    payer: "Particular",
    pending: 64,
    portfolioShare: 4,
    preparation: "Sin preparacion.",
    price: 45,
    productivityPerHour: 1.2,
    profit: 2514,
    protocolRate: 78,
    reactivatedPatients: 8,
    recommendation: "Evaluar tercerizacion, volumen minimo interno o ajuste de precio.",
    recordQuality: 72,
    recurrentPatients: 52,
    relatedServices: [
      { service: "Quimica sanguinea", value: 18 },
      { service: "Perfil tiroideo", value: 10 },
      { service: "Hemograma completo", value: 8 },
    ],
    repeats: 8,
    reprocesses: 6,
    requests: 360,
    requiredEquipment: ["Proveedor externo"],
    requiredSupplies: ["Kit envio"],
    revenuePerHour: 54,
    revenuePerPatient: 49.9,
    satisfaction: 70,
    scoreDelta: -8,
    slaRate: 65,
    standardCost: 29,
    standardDurationMinutes: 180,
    state: "Activo",
    ticketAverage: 45,
    targetCompletionRate: 63,
    unbilledServices: 2,
    unit: "Prueba",
    updatedAt: "2026-07-15",
    validSince: "2026-01-01",
    waitlist: 18,
    withDiscount: false,
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

export function buildServiceMetrics(records: ServiceRecord[]): ServiceMetric[] {
  const active = records.filter((record) => record.state === "Activo").length;
  const newServices = records.filter((record) => record.state === "Nuevo" || record.state === "En prueba").length;
  const suspended = records.filter((record) => record.state === "Suspendido").length;
  const growing = records.filter((record) => record.demandGrowth > 0).length;
  const falling = records.filter((record) => record.demandGrowth < 0).length;
  const overTarget = records.filter((record) => record.targetCompletionRate >= 100).length;
  const belowTarget = records.filter((record) => record.targetCompletionRate < 90).length;
  const lowMargin = records.filter((record) => record.marginRate < record.minimumMarginRate).length;
  const incompleteData = records.filter((record) => record.dataQuality < 76).length;
  const outsourced = records.filter((record) => record.ownership === "Tercerizado").length;
  const totalRequests = records.reduce((sum, record) => sum + record.requests, 0);
  const totalCompleted = records.reduce((sum, record) => sum + record.completed, 0);
  const totalPatients = records.reduce((sum, record) => sum + record.patients, 0);
  const totalNewPatients = records.reduce((sum, record) => sum + record.newPatients, 0);
  const totalRecurrent = records.reduce((sum, record) => sum + record.recurrentPatients, 0);
  const totalWaitlist = records.reduce((sum, record) => sum + record.waitlist, 0);
  const totalPending = records.reduce((sum, record) => sum + record.pending, 0);
  const totalSales = records.reduce((sum, record) => sum + record.netSales, 0);
  const totalProfit = records.reduce((sum, record) => sum + record.profit, 0);
  const averageMargin =
    records.reduce((sum, record) => sum + record.marginRate, 0) /
    Math.max(records.length, 1);
  const averageSla =
    records.reduce((sum, record) => sum + record.slaRate, 0) /
    Math.max(records.length, 1);
  const averageQuality =
    records.reduce((sum, record) => sum + record.dataQuality, 0) /
    Math.max(records.length, 1);
  const repeats = records.reduce((sum, record) => sum + record.repeats, 0);
  const complaints = records.reduce((sum, record) => sum + record.complaints, 0);
  const incidents = records.reduce((sum, record) => sum + record.incidents, 0);
  const unbilled = records.reduce((sum, record) => sum + record.unbilledServices, 0);
  const lossAmount = records.reduce((sum, record) => sum + record.lossAmount, 0);

  return [
    { group: "Portafolio", label: "Servicios activos", value: `${active}`, note: "en la vista filtrada", tone: "positive" },
    { group: "Portafolio", label: "Servicios nuevos", value: `${newServices}`, note: "en prueba o recien creados", tone: newServices > 0 ? "warning" : "neutral" },
    { group: "Portafolio", label: "Suspendidos", value: `${suspended}`, note: "fuera de oferta", tone: suspended > 0 ? "warning" : "positive" },
    { group: "Portafolio", label: "Con crecimiento", value: `${growing}`, note: "demanda positiva", tone: growing > falling ? "positive" : "warning" },
    { group: "Portafolio", label: "Caida de demanda", value: `${falling}`, note: "requieren revision", tone: falling > 0 ? "warning" : "positive" },
    { group: "Portafolio", label: "Sobre meta", value: `${overTarget}`, note: "cumplimiento >= 100%", tone: "positive" },
    { group: "Portafolio", label: "Bajo meta", value: `${belowTarget}`, note: "cumplimiento < 90%", tone: belowTarget > 0 ? "warning" : "positive" },
    { group: "Portafolio", label: "Margen bajo", value: `${lowMargin}`, note: "por debajo del minimo", tone: lowMargin > 0 ? "negative" : "positive" },
    { group: "Portafolio", label: "Datos incompletos", value: `${incompleteData}`, note: "no decidir sin trazabilidad", tone: incompleteData > 0 ? "warning" : "positive" },
    { group: "Portafolio", label: "Tercerizados", value: `${outsourced}`, note: "vigilar costo externo", tone: outsourced > 0 ? "warning" : "neutral" },
    { group: "Demanda", label: "Solicitudes", value: totalRequests.toLocaleString("en-US"), note: "demanda registrada", tone: "neutral" },
    { group: "Demanda", label: "Servicios realizados", value: totalCompleted.toLocaleString("en-US"), note: "volumen ejecutado", tone: "positive" },
    { group: "Demanda", label: "Pacientes unicos", value: totalPatients.toLocaleString("en-US"), note: "anonimizados", tone: "neutral" },
    { group: "Demanda", label: "Pacientes nuevos", value: totalNewPatients.toLocaleString("en-US"), note: "captacion", tone: "positive" },
    { group: "Demanda", label: "Pacientes recurrentes", value: totalRecurrent.toLocaleString("en-US"), note: "continuidad", tone: "positive" },
    { group: "Demanda", label: "Lista de espera", value: totalWaitlist.toLocaleString("en-US"), note: "demanda no cubierta", tone: totalWaitlist > 120 ? "warning" : "neutral" },
    { group: "Produccion", label: "Conversion", value: formatRate(totalCompleted / Math.max(totalRequests, 1)), note: "solicitud a servicio", tone: metricTone((totalCompleted / Math.max(totalRequests, 1)) * 100, 88, 78) },
    { group: "Produccion", label: "Pendientes", value: totalPending.toLocaleString("en-US"), note: "produccion no cerrada", tone: totalPending > 500 ? "negative" : "warning" },
    { group: "Produccion", label: "SLA promedio", value: `${Math.round(averageSla)}%`, note: "entrega en tiempo", tone: metricTone(averageSla, 88, 78) },
    { group: "Produccion", label: "Repeticiones", value: repeats.toLocaleString("en-US"), note: "impacta calidad y costo", tone: repeats > 80 ? "negative" : "warning" },
    { group: "Valor", label: "Venta neta", value: formatCurrency(totalSales), note: "sin duplicar finanzas", tone: "positive" },
    { group: "Valor", label: "Utilidad", value: formatCurrency(totalProfit), note: "por portafolio filtrado", tone: "positive" },
    { group: "Valor", label: "Margen promedio", value: `${Math.round(averageMargin)}%`, note: "contra minimo por servicio", tone: metricTone(averageMargin, 42, 34) },
    { group: "Valor", label: "Servicios sin facturar", value: `${unbilled}`, note: "fuga operativa", tone: unbilled > 30 ? "negative" : "warning" },
    { group: "Valor", label: "Perdida estimada", value: formatCurrency(lossAmount), note: "por incidencias y capacidad", tone: lossAmount > 10000 ? "negative" : "warning" },
    { group: "Calidad", label: "Calidad de datos", value: `${Math.round(averageQuality)}`, note: "catalogo y operacion", tone: metricTone(averageQuality, 85, 75) },
    { group: "Calidad", label: "Incidencias", value: incidents.toLocaleString("en-US"), note: "casos reportados", tone: incidents > 50 ? "negative" : "warning" },
    { group: "Calidad", label: "Reclamos", value: complaints.toLocaleString("en-US"), note: "experiencia del paciente", tone: complaints > 25 ? "negative" : "warning" },
  ];
}

export function getServiceScreen(slug: BusinessLineSlug): ServiceScreen {
  const records =
    slug === "consolidado"
      ? serviceRecords
      : serviceRecords.filter((record) => record.lineSlug === slug);
  const titles: Record<
    BusinessLineSlug,
    Pick<ServiceScreen, "description" | "subtitle" | "title">
  > = {
    consolidado: {
      title: "Servicios",
      subtitle: "Portafolio completo de Analiza",
      description:
        "Compara demanda, produccion, pacientes, calidad y rentabilidad sin sumar pruebas, sesiones y estudios como una sola unidad.",
    },
    fisioterapia: {
      title: "Servicios de Fisioterapia",
      subtitle: "Evaluaciones, sesiones, paquetes y continuidad",
      description:
        "Evalua demanda, conversion a plan, recurrencia, ocupacion efectiva, ingreso por hora y sesiones pendientes.",
    },
    laboratorio: {
      title: "Servicios de Laboratorio",
      subtitle: "Pruebas, perfiles y tercerizacion",
      description:
        "Diferencia pruebas individuales, perfiles y servicios tercerizados con margen, SLA, reactivos y repeticiones.",
    },
    imagenes: {
      title: "Servicios de Imagenes",
      subtitle: "Modalidades, estudios, equipos e informes",
      description:
        "Analiza modalidad y estudio con margen, utilizacion de equipo, informes, repeticion, lista de espera y lectura.",
    },
  };

  return {
    slug,
    ...titles[slug],
    insights: [
      "El consolidado usa indices: una prueba, una sesion y un estudio no se suman como si fueran la misma unidad.",
      "Un servicio que vende mucho puede necesitar optimizacion si consume demasiado tiempo, insumos o capacidad.",
      "Servicios con alto margen y capacidad disponible deben impulsarse; servicios con alta demanda y bajo margen deben corregirse.",
      "La decision de suspender o retirar un servicio debe pasar por revision estrategica, no por un nombre automatico del grafico.",
    ],
    metrics: buildServiceMetrics(records),
    records,
    rule:
      "Regla: Servicios responde que ofrecer, donde ofrecerlo y como gestionar el portafolio; no reemplaza Salud financiera, Operacion, Capacidad, Sucursales ni Profesionales.",
    weights: serviceWeightsByLine[slug],
  };
}

function seriesForRecords(
  records: ServiceRecord[],
  field: keyof ServiceRecord["trend"],
  valueFormatter: (record: ServiceRecord) => string,
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
      label: field === "sales" ? "Presupuesto" : "Meta servicio",
      points:
        field === "sales"
          ? [42000, 42000, 42000, 42000, 42000, 42000, 42000]
          : field === "patients"
            ? [500, 500, 500, 500, 500, 500, 500]
            : [85, 85, 85, 85, 85, 85, 85],
      value:
        field === "sales"
          ? "$42K"
          : field === "patients"
            ? "500"
            : "85",
    },
  ];
}

export function buildServiceTrendChart(records: ServiceRecord[]) {
  const scopedRecords = records.slice(0, 8);
  const firstRecord = scopedRecords[0] ?? serviceRecords[0];
  const insights: TrendInsight[] = [
    {
      label: "Comparacion activa",
      note: "Selecciona hasta cinco servicios y cambia KPI, fechas o comparativo.",
      tone: "neutral",
      value: `${scopedRecords.length} servicios`,
    },
    {
      label: "Mayor accion",
      note: firstRecord?.recommendation ?? "Sin recomendacion principal.",
      tone: firstRecord?.status === "Requiere intervencion" ? "warning" : "positive",
      value: firstRecord?.name ?? "Sin datos",
    },
    {
      label: "Decision",
      note: "Usa la tendencia para impulsar, optimizar, redistribuir, revisar precio o capacitar.",
      tone: "positive",
      value: "Portafolio",
    },
  ];
  const metricOptions: TrendChartOption[] = [
    {
      description: "Solicitudes registradas por servicio en el periodo seleccionado.",
      id: "solicitudes-servicio",
      insights,
      label: "Solicitudes",
      series: seriesForRecords(scopedRecords, "requests", (record) =>
        record.requests.toLocaleString("en-US"),
      ),
      yLabel: "Solicitudes",
    },
    {
      description: "Servicios ejecutados y cerrados operativamente.",
      id: "realizados-servicio",
      insights,
      label: "Servicios realizados",
      series: seriesForRecords(scopedRecords, "completed", (record) =>
        record.completed.toLocaleString("en-US"),
      ),
      yLabel: "Servicios",
    },
    {
      description: "Pacientes unicos asociados al servicio.",
      id: "pacientes-servicio",
      insights,
      label: "Pacientes",
      series: seriesForRecords(scopedRecords, "patients", (record) =>
        record.patients.toLocaleString("en-US"),
      ),
      yLabel: "Pacientes",
    },
    {
      description: "Venta neta por servicio, util para priorizar portafolio.",
      id: "venta-servicio",
      insights,
      label: "Venta",
      series: seriesForRecords(scopedRecords, "sales", (record) =>
        formatCurrency(record.netSales),
      ),
      yLabel: "USD",
    },
    {
      description: "Margen operativo por servicio contra su minimo requerido.",
      id: "margen-servicio",
      insights,
      label: "Margen",
      series: seriesForRecords(scopedRecords, "margin", (record) =>
        `${record.marginRate}%`,
      ),
      yLabel: "% margen",
    },
    {
      description: "Cumplimiento de SLA o entrega a tiempo por servicio.",
      id: "sla-servicio",
      insights,
      label: "SLA",
      series: seriesForRecords(scopedRecords, "sla", (record) =>
        `${record.slaRate}%`,
      ),
      yLabel: "% SLA",
    },
    {
      description: "Puntaje integral del servicio dentro de su linea y categoria.",
      id: "score-servicio",
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
      "Compara servicios, selecciona fechas y activa mismo periodo anterior, periodo previo o meta.",
    insights,
    metricOptions,
    series: metricOptions[0].series,
    title: "Tendencia de demanda y valor por servicio",
    xLabels: exactDateLabels,
    yLabel: metricOptions[0].yLabel,
  };
}
