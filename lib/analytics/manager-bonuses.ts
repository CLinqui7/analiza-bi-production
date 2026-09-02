import type {
  TrendChartOption,
  TrendInsight,
  TrendSeries,
} from "@/components/analytics-comparison-chart";
import type { BusinessLineSlug } from "@/lib/analytics/business-line-operations";
import {
  allBranchNetworkRecords,
  type BranchNetworkRecord,
} from "@/lib/analytics/branch-network";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
import {
  calculateRecommendedManagerBonus,
  getDefaultBaseBonusAmount,
  getGoalCompletionFactor,
  managementLevelLabels,
  managerIncentiveFormulaVersion,
  type ManagementLevel,
} from "@/lib/tenant/manager-incentives";

export type ManagerBonusStatus =
  | "Sobresaliente"
  | "Saludable"
  | "Precaucion"
  | "Critico"
  | "Sin datos suficientes";

export type BonusState =
  | "ELIGIBLE"
  | "REVIEW REQUIRED"
  | "NOT ELIGIBLE";

export type BonusApprovalStatus =
  | "SYSTEM RECOMMENDS"
  | "APPROVED"
  | "REJECTED"
  | "ADJUSTED WITH REASON";

export type BonusBand =
  | "No bonus"
  | "Satisfactory"
  | "Strong"
  | "High"
  | "Outstanding"
  | "Exceptional";

export type ManagerRole = "Gerente de Sucursal" | "Gerente de Area";

export type ManagerType =
  | "Gerente activo"
  | "Gerente interino"
  | "Sucursal nueva"
  | "Sucursal comparable";

export type GoalType =
  | "Rentabilidad"
  | "Productividad"
  | "Ocupacion"
  | "Calidad y SLA"
  | "Pacientes"
  | "Inventario"
  | "Continuidad"
  | "Datos";

export type ManagerScoreDimension = {
  id: string;
  label: string;
  score: number;
  weight: number;
  points: number;
  insight: string;
};

export type BonusBlockingCondition = {
  category: "Financiero" | "Operativo" | "Calidad" | "Personas" | "Datos";
  reason: string;
  evidence: string;
  date: string;
  reviewer: string;
  state: "Reduce" | "Retiene" | "Bloquea" | "Pendiente";
  correctivePlan: string;
  reevaluationDate: string;
};

export type BonusWaterfallStep = {
  label: string;
  amount: number;
  kind: "base" | "adjustment" | "final";
  note: string;
};

export type ManagerBonusRecord = {
  id: string;
  manager: string;
  managerRole: ManagerRole;
  branch: string;
  branchCode: string;
  period: string;
  closingStatus: "PUBLISHED" | "INCOMPLETE" | "NOT PUBLISHED";
  formulaVersion: string;
  line: "Laboratorio" | "Fisioterapia" | "Imagenes" | "Multiservicio";
  lineSlug: BusinessLineSlug;
  country: string;
  region: string;
  managerType: ManagerType;
  goalType: GoalType;
  startDate: string;
  score: number;
  scoreDelta: number;
  status: ManagerBonusStatus;
  targetCompletionRate: number;
  netSales: number;
  growthRate: number;
  marginRate: number;
  utility: number;
  occupancyRate: number;
  slaRate: number;
  patientSatisfaction: number;
  dataQuality: number;
  staffTurnoverRate: number;
  criticalIncidents: number;
  managementLevel: ManagementLevel;
  baseBonusAmount: number;
  bonusCompletionFactor: number;
  bonusPotential: number;
  bonusProjected: number;
  bonusRecommended: number;
  bonusApproved: number;
  bonusRetained: number;
  bonusBlocked: number;
  bonusPaid: number;
  bonusState: BonusState;
  bonusBand: BonusBand;
  approvalStatus: BonusApprovalStatus;
  approvalReason: string;
  whyBonus: string;
  branchesInScope: string[];
  scoreMultiplier: number;
  fulfillmentFactor: number;
  qualityFactor: number;
  principalStrength: string;
  principalGap: string;
  recommendedAction: string;
  explanation: string;
  dimensions: ManagerScoreDimension[];
  blockingConditions: BonusBlockingCondition[];
  waterfall: BonusWaterfallStep[];
  reductionCauses: { cause: string; amount: number; count: number }[];
  trend: {
    totalScore: number[];
    financialScore: number[];
    operationalScore: number[];
    qualityScore: number[];
    projectedBonus: number[];
  };
};

export type ManagerBonusMetric = {
  group: "Gerentes" | "Bonos" | "Gestion";
  label: string;
  value: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
};

export type ManagerBonusScreen = {
  slug: BusinessLineSlug;
  title: string;
  subtitle: string;
  description: string;
  rule: string;
  weights: { dimension: string; weight: number }[];
  metrics: ManagerBonusMetric[];
  records: ManagerBonusRecord[];
  executiveInsights: string[];
};

export type BonusBacktestFinding = {
  check: string;
  result: string;
  status: "PASS" | "REVIEW";
};

export type BonusBacktestSummary = {
  records: number;
  eligible: number;
  reviewRequired: number;
  notEligible: number;
  exceptional: number;
  satisfactory: number;
  averageRecommendedBonus: number;
  findings: BonusBacktestFinding[];
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

export const managerBonusWeightsByLine: Record<
  BusinessLineSlug,
  { dimension: string; weight: number }[]
> = {
  consolidado: [
    { dimension: "Finanzas", weight: 30 },
    { dimension: "Operacion", weight: 25 },
    { dimension: "Metas", weight: 20 },
    { dimension: "Eficiencia/calidad", weight: 15 },
    { dimension: "Calidad dato", weight: 10 },
  ],
  laboratorio: [
    { dimension: "Finanzas", weight: 30 },
    { dimension: "Operacion", weight: 25 },
    { dimension: "Metas", weight: 20 },
    { dimension: "Eficiencia/calidad", weight: 15 },
    { dimension: "Calidad dato", weight: 10 },
  ],
  fisioterapia: [
    { dimension: "Finanzas", weight: 25 },
    { dimension: "Operacion", weight: 30 },
    { dimension: "Metas", weight: 20 },
    { dimension: "Eficiencia/calidad", weight: 15 },
    { dimension: "Calidad dato", weight: 10 },
  ],
  imagenes: [
    { dimension: "Finanzas", weight: 28 },
    { dimension: "Operacion", weight: 27 },
    { dimension: "Metas", weight: 20 },
    { dimension: "Eficiencia/calidad", weight: 15 },
    { dimension: "Calidad dato", weight: 10 },
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getManagerStatus(score: number, dataQuality: number): ManagerBonusStatus {
  if (dataQuality < 72) {
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

  return "Critico";
}

function getScoreMultiplier(score: number) {
  if (score < 70) {
    return 0;
  }

  if (score < 80) {
    return 0.5;
  }

  if (score < 90) {
    return 0.8;
  }

  if (score < 100) {
    return 1;
  }

  return 1.1;
}

function getDimensionByLabel(dimensions: ManagerScoreDimension[], pattern: RegExp) {
  return dimensions.find((dimension) => pattern.test(dimension.label))?.score ?? 0;
}

function buildTrendPoints(value: number, delta: number, min = 0, max = 100) {
  const base = clamp(value - delta - 5, min, max);
  return [base, base + 2, base + 4, value - 2, value - 1, value + 1, value].map(
    (point) => Math.round(clamp(point, min, max)),
  );
}

function buildBonusTrend(value: number) {
  const safeValue = Math.max(0, value);
  return [0.72, 0.76, 0.81, 0.86, 0.91, 0.96, 1].map((factor) =>
    Math.round(safeValue * factor),
  );
}

function buildBlockingConditions(
  record: BranchNetworkRecord,
  index: number,
): BonusBlockingCondition[] {
  const conditions: BonusBlockingCondition[] = [];

  if (record.utility < 8500 || record.targetGap < -10) {
    conditions.push({
      category: "Financiero",
      reason: "Utilidad o meta por debajo del umbral",
      evidence: `${record.city}: ${formatCurrency(record.utility)} de utilidad y brecha ${record.targetGap} pts`,
      date: "2026-07-21",
      reviewer: "Direccion financiera",
      state: record.utility < 6500 ? "Bloquea" : "Retiene",
      correctivePlan: "Validar costo operativo, mix de servicios y plan de recuperacion de meta.",
      reevaluationDate: "2026-08-05",
    });
  }

  if (record.marginRate < 0.35) {
    conditions.push({
      category: "Financiero",
      reason: "Margen por debajo del minimo definido",
      evidence: `${formatRate(record.marginRate)} de margen contra umbral operativo`,
      date: "2026-07-21",
      reviewer: "Finanzas",
      state: "Reduce",
      correctivePlan: "Revisar descuentos, reactivos, tercerizaciones o margen por modalidad.",
      reevaluationDate: "2026-08-05",
    });
  }

  if (record.slaRate < 0.82) {
    conditions.push({
      category: "Operativo",
      reason: "SLA operativo debajo de meta",
      evidence: `${formatRate(record.slaRate)} de cumplimiento SLA`,
      date: "2026-07-20",
      reviewer: "Gerencia de operaciones",
      state: "Retiene",
      correctivePlan: "Corregir cuellos de botella y responsables de cierre diario.",
      reevaluationDate: "2026-07-31",
    });
  }

  if (record.dataQuality < 80 || record.alerts.length > 1) {
    conditions.push({
      category: "Datos",
      reason: "Calidad de datos o evidencia incompleta",
      evidence: record.alerts[0] ?? `${record.dataQuality} puntos de calidad de datos`,
      date: "2026-07-22",
      reviewer: "Auditoria de datos",
      state: record.dataQuality < 76 ? "Bloquea" : "Pendiente",
      correctivePlan: "Completar plantilla, corregir periodo y dejar trazabilidad de ajustes.",
      reevaluationDate: "2026-07-29",
    });
  }

  if (record.lineSlug === "laboratorio" && record.dataQuality < 82) {
    conditions.push({
      category: "Calidad",
      reason: "Inventario, reactivos o muestras requieren validacion",
      evidence: "Plantilla indica validaciones pendientes de YTD, proyeccion o filas maximas.",
      date: "2026-07-22",
      reviewer: "Calidad laboratorio",
      state: index % 2 === 0 ? "Retiene" : "Reduce",
      correctivePlan: "Conciliar inventario, vencimientos y ordenes sin facturar.",
      reevaluationDate: "2026-08-03",
    });
  }

  if (record.lineSlug === "fisioterapia" && record.occupancyRate < 0.72) {
    conditions.push({
      category: "Operativo",
      reason: "Ocupacion efectiva baja frente a demanda agendada",
      evidence: `${formatRate(record.occupancyRate)} de ocupacion efectiva`,
      date: "2026-07-19",
      reviewer: "Direccion fisioterapia",
      state: "Reduce",
      correctivePlan: "Reducir no-show, recuperar espacios y fortalecer continuidad terapeutica.",
      reevaluationDate: "2026-07-31",
    });
  }

  if (record.lineSlug === "imagenes" && record.slaRate < 0.84) {
    conditions.push({
      category: "Operativo",
      reason: "Informes o disponibilidad tecnica fuera de meta",
      evidence: `${formatRate(record.slaRate)} de SLA y riesgo de informes pendientes`,
      date: "2026-07-18",
      reviewer: "Direccion imagenes",
      state: "Retiene",
      correctivePlan: "Escalar mantenimiento, lecturas pendientes y agenda por modalidad.",
      reevaluationDate: "2026-07-30",
    });
  }

  if (index % 5 === 2) {
    conditions.push({
      category: "Personas",
      reason: "Rotacion o ausentismo en seguimiento",
      evidence: "Vacante critica o cobertura parcial del equipo durante el periodo.",
      date: "2026-07-17",
      reviewer: "Recursos Humanos",
      state: "Reduce",
      correctivePlan: "Documentar cobertura, refuerzo temporal y plan de retencion.",
      reevaluationDate: "2026-08-02",
    });
  }

  return conditions;
}

function buildDimensions(
  record: BranchNetworkRecord,
): ManagerScoreDimension[] {
  const financialScore = Math.round(
    clamp(
      record.targetGap + 92 + (record.marginRate - 0.35) * 120,
      48,
      100,
    ),
  );
  const operationalScore = Math.round(
    clamp(
      record.normalizedPerformanceScore * 0.45 +
        record.occupancyRate * 45 +
        record.productivityIndex * 0.2,
      45,
      100,
    ),
  );
  const targetScore = Math.round(clamp(100 + record.targetGap, 45, 100));
  const efficiencyQualityScore = Math.round(
    clamp(record.slaRate * 55 + record.occupancyRate * 25 + record.recurrenceRate * 20, 45, 100),
  );
  const dataScore = Math.round(
    clamp(record.dataQuality - record.outlierFlags.length * 2, 45, 100),
  );

  const source: Record<BusinessLineSlug, Omit<ManagerScoreDimension, "points">[]> = {
    consolidado: [
      {
        id: "financial",
        label: "Finanzas",
        score: financialScore,
        weight: 30,
        insight: "Margen, utilidad y cumplimiento financiero sin premiar venta absoluta.",
      },
      {
        id: "operation",
        label: "Operacion",
        score: operationalScore,
        weight: 25,
        insight: "Productividad, utilizacion y resultado normalizado.",
      },
      {
        id: "targets",
        label: "Metas",
        score: targetScore,
        weight: 20,
        insight: "Cumplimiento contra meta aprobada del periodo.",
      },
      {
        id: "efficiency",
        label: "Eficiencia/calidad",
        score: efficiencyQualityScore,
        weight: 15,
        insight: "SLA, ocupacion, continuidad y calidad operativa.",
      },
      {
        id: "data",
        label: "Calidad dato",
        score: dataScore,
        weight: 10,
        insight: "Cierre publicado, completitud, consistencia y puntualidad.",
      },
    ],
    laboratorio: [
      {
        id: "financial",
        label: "Finanzas",
        score: financialScore,
        weight: 30,
        insight: "Facturacion contra meta, margen y utilidad sin premiar volumen puro.",
      },
      {
        id: "operation",
        label: "Operacion",
        score: operationalScore,
        weight: 25,
        insight: "Pruebas, productividad, flujo de procesamiento disponible y operacion diaria.",
      },
      {
        id: "targets",
        label: "Metas",
        score: targetScore,
        weight: 20,
        insight: "Cumplimiento contra meta aprobada de laboratorio.",
      },
      {
        id: "efficiency",
        label: "Eficiencia/calidad",
        score: efficiencyQualityScore,
        weight: 15,
        insight: "SLA, calidad, TAT cuando exista y estabilidad operativa.",
      },
      {
        id: "data",
        label: "Calidad dato",
        score: dataScore,
        weight: 10,
        insight: "Cierre, trazabilidad, calidad y puntualidad del dato.",
      },
    ],
    fisioterapia: [
      {
        id: "financial",
        label: "Finanzas",
        score: financialScore,
        weight: 25,
        insight: "Venta, margen por sesion, utilidad y no-show monetizado.",
      },
      {
        id: "operation",
        label: "Operacion",
        score: operationalScore,
        weight: 30,
        insight: "Ocupacion efectiva, sesiones atendidas y productividad disponible.",
      },
      {
        id: "targets",
        label: "Metas",
        score: targetScore,
        weight: 20,
        insight: "Cumplimiento contra meta aprobada de fisioterapia.",
      },
      {
        id: "efficiency",
        label: "Eficiencia/calidad",
        score: efficiencyQualityScore,
        weight: 15,
        insight: "No-show proxy, cancelacion, continuidad y calidad de atencion.",
      },
      {
        id: "data",
        label: "Calidad dato",
        score: dataScore,
        weight: 10,
        insight: "Cierre, agenda, evidencia y cargas a tiempo.",
      },
    ],
    imagenes: [
      {
        id: "financial",
        label: "Finanzas",
        score: financialScore,
        weight: 28,
        insight: "Venta, margen por modalidad, utilidad y estudios sin facturar.",
      },
      {
        id: "operation",
        label: "Operacion",
        score: operationalScore,
        weight: 27,
        insight: "Estudios, productividad y utilizacion de capacidad disponible.",
      },
      {
        id: "targets",
        label: "Metas",
        score: targetScore,
        weight: 20,
        insight: "Cumplimiento contra meta aprobada de imagenes.",
      },
      {
        id: "efficiency",
        label: "Eficiencia/calidad",
        score: efficiencyQualityScore,
        weight: 15,
        insight: "Informes, SLA, TAT cuando exista y disponibilidad tecnica.",
      },
      {
        id: "data",
        label: "Calidad dato",
        score: dataScore,
        weight: 10,
        insight: "RIS/PACS, evidencia y trazabilidad.",
      },
    ],
  };

  return source[record.lineSlug].map((dimension) => ({
    ...dimension,
    points: Number(((dimension.score * dimension.weight) / 100).toFixed(1)),
  }));
}

function buildAreaDimensions(
  records: BranchNetworkRecord[],
): ManagerScoreDimension[] {
  const branchCount = Math.max(records.length, 1);
  const branchesOnTarget =
    records.filter((record) => record.targetGap >= 0).length / branchCount;
  const consolidatedScore =
    records.reduce((sum, record) => sum + record.normalizedPerformanceScore, 0) /
    branchCount;
  const laggingRecords = records.filter((record) => record.normalizedPerformanceScore < 78);
  const laggingImprovement =
    laggingRecords.length === 0
      ? 92
      : clamp(
          76 +
            (laggingRecords.reduce((sum, record) => sum + record.scoreDelta, 0) /
              laggingRecords.length) *
              3,
          45,
          100,
        );
  const efficiencyMargin = Math.round(
    clamp(
      records.reduce(
        (sum, record) =>
          sum + record.marginRate * 45 + record.occupancyRate * 35 + record.slaRate * 20,
        0,
      ) / branchCount,
      45,
      100,
    ),
  );
  const closingQuality = Math.round(
    clamp(
      records.reduce((sum, record) => sum + record.dataQuality, 0) / branchCount -
        records.filter((record) => record.outlierFlags.length > 0).length * 2,
      45,
      100,
    ),
  );

  const dimensions: Omit<ManagerScoreDimension, "points">[] = [
    {
      id: "area-targets",
      label: "Sucursales en meta",
      score: Math.round(clamp(branchesOnTarget * 100, 45, 100)),
      weight: 25,
      insight: "Porcentaje de sucursales del area que cumplen metas aprobadas.",
    },
    {
      id: "area-consolidated",
      label: "Resultado consolidado",
      score: Math.round(clamp(consolidatedScore, 45, 100)),
      weight: 20,
      insight: "Resultado promedio normalizado, no suma simple de venta.",
    },
    {
      id: "area-lagging",
      label: "Mejora de rezagadas",
      score: Math.round(laggingImprovement),
      weight: 20,
      insight: "Avance de sucursales con brecha o puntaje bajo.",
    },
    {
      id: "area-efficiency",
      label: "Eficiencia y margen",
      score: efficiencyMargin,
      weight: 15,
      insight: "Margen, productividad y capacidad sin depender de volumen.",
    },
    {
      id: "area-data",
      label: "Puntualidad/calidad cierres",
      score: closingQuality,
      weight: 20,
      insight: "Cierres publicados, datos completos e inconsistencias resueltas.",
    },
  ];

  return dimensions.map((dimension) => ({
    ...dimension,
    points: Number(((dimension.score * dimension.weight) / 100).toFixed(1)),
  }));
}

function getGoalType(record: BranchNetworkRecord, dimensions: ManagerScoreDimension[]): GoalType {
  const lowestDimension = dimensions.reduce((lowest, dimension) =>
    dimension.score < lowest.score ? dimension : lowest,
  );

  if (record.lineSlug === "laboratorio" && /Inventario/i.test(lowestDimension.label)) {
    return "Inventario";
  }

  if (record.lineSlug === "fisioterapia" && /Continuidad/i.test(lowestDimension.label)) {
    return "Continuidad";
  }

  if (/Ocupacion|Disponibilidad|Utilizacion/i.test(lowestDimension.label)) {
    return "Ocupacion";
  }

  if (/Calidad|SLA|Informes/i.test(lowestDimension.label)) {
    return "Calidad y SLA";
  }

  if (/Pacientes/i.test(lowestDimension.label)) {
    return "Pacientes";
  }

  if (/Datos/i.test(lowestDimension.label)) {
    return "Datos";
  }

  if (/Operacion|Productividad/i.test(lowestDimension.label)) {
    return "Productividad";
  }

  return "Rentabilidad";
}

function getManagerType(record: BranchNetworkRecord, index: number): ManagerType {
  if (record.lineSlug !== "laboratorio" && index % 4 === 1) {
    return "Sucursal nueva";
  }

  if (index % 6 === 4) {
    return "Gerente interino";
  }

  if (record.size === "Pequena") {
    return "Sucursal comparable";
  }

  return "Gerente activo";
}

function getBonusState(
  score: number,
  dataQuality: number,
  conditions: BonusBlockingCondition[],
  record: BranchNetworkRecord,
): BonusState {
  if (
    dataQuality < 70 ||
    score < 70 ||
    conditions.some((condition) => condition.state === "Bloquea")
  ) {
    return "NOT ELIGIBLE";
  }

  if (
    dataQuality < 82 ||
    conditions.length > 0 ||
    record.outlierFlags.some((flag) => flag.severity === "critical")
  ) {
    return "REVIEW REQUIRED";
  }

  return "ELIGIBLE";
}

function getBonusBand(score: number): BonusBand {
  if (score >= 95) {
    return "Exceptional";
  }

  if (score >= 89) {
    return "Outstanding";
  }

  if (score >= 82) {
    return "High";
  }

  if (score >= 75) {
    return "Strong";
  }

  if (score >= 70) {
    return "Satisfactory";
  }

  return "No bonus";
}

function getDemoManagementLevel(
  managerRole: ManagerRole,
  index: number,
): ManagementLevel {
  if (managerRole === "Gerente de Area") {
    return index % 3 === 1 ? "middle" : "senior";
  }

  if (index % 5 === 0) {
    return "senior";
  }

  if (index % 4 === 0) {
    return "junior";
  }

  return "middle";
}

function buildWaterfall({
  baseBonusAmount,
  managementLevel,
  bonusRecommended,
  targetCompletionRate,
  eligibilityStatus,
}: {
  baseBonusAmount: number;
  managementLevel: ManagementLevel;
  bonusRecommended: number;
  targetCompletionRate: number;
  eligibilityStatus: BonusState;
}) {
  const completionFactor = getGoalCompletionFactor(targetCompletionRate);
  const earnedBeforeEligibility = calculateRecommendedManagerBonus({
    baseBonusAmount,
    targetCompletionRate,
  });
  const completionAdjustment = earnedBeforeEligibility - baseBonusAmount;
  const eligibilityAdjustment =
    eligibilityStatus === "NOT ELIGIBLE" ? -earnedBeforeEligibility : 0;

  return {
    projected: bonusRecommended,
    waterfall: [
      {
        label: `Bono base ${managementLevelLabels[managementLevel]}`,
        amount: baseBonusAmount,
        kind: "base" as const,
        note: "Monto mensual definido al crear o asignar el gerente.",
      },
      {
        label: "Cumplimiento de meta",
        amount: completionAdjustment,
        kind: "adjustment" as const,
        note: `La sucursal cumplio ${formatRate(completionFactor)} de la meta aprobada.`,
      },
      {
        label: "Elegibilidad",
        amount: eligibilityAdjustment,
        kind: "adjustment" as const,
        note:
          eligibilityStatus === "NOT ELIGIBLE"
            ? "El monto ganado queda bloqueado hasta resolver condiciones criticas."
            : `Estado del bono: ${eligibilityStatus}.`,
      },
      {
        label: "Bono recomendado",
        amount: bonusRecommended,
        kind: "final" as const,
        note: "Requiere revision humana antes de nomina.",
      },
    ],
  };
}

function buildReductionCauses(
  record: BranchNetworkRecord,
  conditions: BonusBlockingCondition[],
  penalties: number,
) {
  const causes = [
    {
      cause: "Utilidad bajo meta",
      amount: Math.max(0, Math.round((1 - (1 + record.targetGap / 100)) * 100)),
      count: record.targetGap < 0 ? 1 : 0,
    },
    {
      cause: "Margen bajo",
      amount: Math.max(0, Math.round((0.42 - record.marginRate) * 180)),
      count: record.marginRate < 0.42 ? 1 : 0,
    },
    {
      cause: "SLA",
      amount: Math.max(0, Math.round((0.9 - record.slaRate) * 140)),
      count: record.slaRate < 0.9 ? 1 : 0,
    },
    {
      cause: "Calidad de datos",
      amount: Math.max(0, Math.round((85 - record.dataQuality) * 2)),
      count: record.dataQuality < 85 ? 1 : 0,
    },
    {
      cause: record.lineSlug === "laboratorio" ? "Inventario" : record.lineSlug === "imagenes" ? "Informes" : "No-show",
      amount: Math.max(0, Math.round(penalties * 0.36)),
      count: conditions.length > 0 ? 1 : 0,
    },
    {
      cause: "Rotacion",
      amount: conditions.some((condition) => condition.category === "Personas") ? 25 : 0,
      count: conditions.some((condition) => condition.category === "Personas") ? 1 : 0,
    },
  ];

  return causes
    .filter((cause) => cause.amount > 0 || cause.count > 0)
    .sort((a, b) => b.amount - a.amount);
}

function getLineSpecificExplanation(record: BranchNetworkRecord) {
  if (record.lineSlug === "laboratorio") {
    return "El puntaje de laboratorio pondera ordenes, muestras, SLA, inventario, reactivos, medicos, margen y datos.";
  }

  if (record.lineSlug === "fisioterapia") {
    return "El puntaje de fisioterapia evita premiar solo agenda llena: revisa ocupacion efectiva, continuidad terapeutica y no-show.";
  }

  if (record.lineSlug === "imagenes") {
    return "El puntaje de imagenes incorpora utilizacion, disponibilidad tecnica, informes, repeticiones y estudios sin facturar.";
  }

  return "El puntaje multiservicio separa cada linea para que una fortaleza no oculte una falla critica.";
}

function buildManagerBonusRecord(
  record: BranchNetworkRecord,
  index: number,
  managerRole: ManagerRole = "Gerente de Sucursal",
  scopeRecords: BranchNetworkRecord[] = [record],
): ManagerBonusRecord {
  const dimensions =
    managerRole === "Gerente de Area"
      ? buildAreaDimensions(scopeRecords)
      : buildDimensions(record);
  const score = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.points, 0),
  );
  const conditions = buildBlockingConditions(record, index);
  const scoreMultiplier = getScoreMultiplier(score);
  const targetCompletionRate = clamp(1 + record.targetGap / 100, 0.5, 1.2);
  const fulfillmentFactor = clamp(targetCompletionRate, 0.72, 1.08);
  const qualityFactor = clamp(record.dataQuality / 100 + (record.slaRate >= 0.9 ? 0.08 : 0), 0.72, 1.05);
  const managementLevel = getDemoManagementLevel(managerRole, index);
  const baseBonusAmount = getDefaultBaseBonusAmount(managementLevel);
  const bonusCompletionFactor = getGoalCompletionFactor(targetCompletionRate);
  const penalties =
    conditions.filter((condition) => condition.state === "Bloquea").length * 100 +
    conditions.filter((condition) => condition.state === "Retiene").length * 50 +
    conditions.filter((condition) => condition.state === "Reduce").length * 25 +
    conditions.filter((condition) => condition.state === "Pendiente").length * 15;
  const bonusState = getBonusState(score, record.dataQuality, conditions, record);
  const band = getBonusBand(score);
  const earnedBeforeEligibility = calculateRecommendedManagerBonus({
    baseBonusAmount,
    targetCompletionRate,
  });
  const bonusRecommended = calculateRecommendedManagerBonus({
    baseBonusAmount,
    isEligible: bonusState !== "NOT ELIGIBLE",
    targetCompletionRate,
  });
  const { projected, waterfall } = buildWaterfall({
    baseBonusAmount,
    managementLevel,
    bonusRecommended,
    targetCompletionRate,
    eligibilityStatus: bonusState,
  });
  const bonusApproved = 0;
  const bonusPaid = 0;
  const financialScore = getDimensionByLabel(
    dimensions,
    /Finanzas|Resultado consolidado/,
  );
  const operationalScore = getDimensionByLabel(
    dimensions,
    /Operacion|Productividad|Utilizacion|Sucursales en meta|Mejora/,
  );
  const qualityScore = getDimensionByLabel(dimensions, /Calidad|SLA|Informes|Puntualidad/);
  const lowestDimension = dimensions.reduce((lowest, dimension) =>
    dimension.score < lowest.score ? dimension : lowest,
  );
  const highestDimension = dimensions.reduce((highest, dimension) =>
    dimension.score > highest.score ? dimension : highest,
  );

  return {
    id: `${managerRole === "Gerente de Area" ? "area-manager" : "branch-manager"}-${record.id}`,
    manager: record.manager,
    managerRole,
    branch: record.branch,
    branchCode: record.id,
    branchesInScope: scopeRecords.map((scopeRecord) => scopeRecord.branch),
    closingStatus: bonusState === "NOT ELIGIBLE" && record.dataQuality < 70 ? "INCOMPLETE" : "PUBLISHED",
    line: record.line,
    lineSlug: record.lineSlug,
    country: "El Salvador",
    formulaVersion: managerIncentiveFormulaVersion,
    region: record.region,
    managerType: getManagerType(record, index),
    goalType: getGoalType(record, dimensions),
    period: "Julio 2026",
    startDate: index % 3 === 0 ? "2024-02-01" : index % 3 === 1 ? "2025-05-15" : "2023-09-01",
    score,
    scoreDelta: record.scoreDelta,
    status: getManagerStatus(score, record.dataQuality),
    targetCompletionRate,
    netSales: record.netSales,
    growthRate: record.growthRate,
    marginRate: record.marginRate,
    utility: record.utility,
    occupancyRate: record.occupancyRate,
    slaRate: record.slaRate,
    patientSatisfaction: Math.round(clamp(82 + record.slaRate * 10 - index, 62, 96)),
    dataQuality: record.dataQuality,
    staffTurnoverRate: clamp(0.04 + index * 0.008 + (record.scoreDelta < 0 ? 0.025 : 0), 0.03, 0.18),
    criticalIncidents: conditions.filter((condition) =>
      ["Bloquea", "Retiene"].includes(condition.state),
    ).length,
    managementLevel,
    baseBonusAmount,
    bonusCompletionFactor,
    bonusPotential: baseBonusAmount,
    bonusProjected: projected,
    bonusRecommended,
    bonusApproved,
    bonusRetained: bonusState === "REVIEW REQUIRED" ? projected : 0,
    bonusBlocked: bonusState === "NOT ELIGIBLE" ? earnedBeforeEligibility : 0,
    bonusPaid,
    bonusState,
    bonusBand: band,
    approvalReason: "Pendiente de revision humana; el sistema no paga automaticamente.",
    approvalStatus: "SYSTEM RECOMMENDS",
    scoreMultiplier,
    fulfillmentFactor,
    qualityFactor,
    principalStrength: `${highestDimension.label}: ${highestDimension.score}`,
    principalGap: `${lowestDimension.label}: ${lowestDimension.score}`,
    recommendedAction:
      record.lineSlug === "laboratorio"
        ? "Conciliar margen, inventario, reactivos y ordenes sin facturar antes de aprobar bono."
        : record.lineSlug === "fisioterapia"
          ? "Convertir agenda en sesiones atendidas, recuperar no-show y proteger continuidad terapeutica."
          : record.lineSlug === "imagenes"
            ? "Cerrar informes pendientes, disponibilidad tecnica y agenda por modalidad."
            : "Separar causa operacional, financiera y de datos antes de decidir bono.",
    explanation: `${record.manager} obtuvo ${score} puntos. ${highestDimension.insight} fue la principal fortaleza; pierde puntos por ${lowestDimension.label.toLowerCase()}. ${getLineSpecificExplanation(record)}`,
    whyBonus:
      bonusState === "NOT ELIGIBLE"
        ? `No hay bono recomendado porque ${lowestDimension.label.toLowerCase()} y las reglas de elegibilidad requieren resolver datos o bloqueos antes de aprobacion. El monto base ${managementLevelLabels[managementLevel]} de ${formatCurrency(baseBonusAmount)} habia generado ${formatCurrency(earnedBeforeEligibility)} por cumplimiento de meta ${formatRate(bonusCompletionFactor)}, pero queda bloqueado.`
        : `Recibe una recomendacion de ${formatCurrency(bonusRecommended)} porque el bono base ${managementLevelLabels[managementLevel]} de ${formatCurrency(baseBonusAmount)} se multiplica por el cumplimiento de meta ${formatRate(bonusCompletionFactor)}. El puntaje gerencial queda en banda ${band}: Finanzas ${getDimensionByLabel(dimensions, /Finanzas|Resultado consolidado/)}/100, Operacion ${getDimensionByLabel(dimensions, /Operacion|Productividad|Utilizacion|Sucursales en meta|Mejora/)}/100, Metas ${getDimensionByLabel(dimensions, /Metas|Sucursales en meta/)}/100, Eficiencia/calidad ${getDimensionByLabel(dimensions, /Eficiencia|Calidad|SLA|Informes|margen/i)}/100 y Calidad dato ${getDimensionByLabel(dimensions, /Dato|Puntualidad/)}/100.`,
    dimensions,
    blockingConditions: conditions,
    waterfall,
    reductionCauses: buildReductionCauses(record, conditions, penalties),
    trend: {
      totalScore: buildTrendPoints(score, record.scoreDelta),
      financialScore: buildTrendPoints(financialScore, record.scoreDelta),
      operationalScore: buildTrendPoints(operationalScore, record.scoreDelta),
      qualityScore: buildTrendPoints(qualityScore, record.scoreDelta),
      projectedBonus: buildBonusTrend(projected),
    },
  };
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function average(records: BranchNetworkRecord[], selector: (record: BranchNetworkRecord) => number) {
  return records.reduce((sum, record) => sum + selector(record), 0) / Math.max(records.length, 1);
}

function aggregateAreaRecord(
  lineSlug: BusinessLineSlug,
  areaManager: string,
  records: BranchNetworkRecord[],
): BranchNetworkRecord {
  const template = records[0] ?? allBranchNetworkRecords[0];
  const id = `area-${lineSlug}-${normalizeKey(areaManager)}`;
  const netSales = records.reduce((sum, record) => sum + record.netSales, 0);
  const utility = records.reduce((sum, record) => sum + record.utility, 0);
  const patients = records.reduce((sum, record) => sum + record.patients, 0);
  const targetGap = Math.round(average(records, (record) => record.targetGap));
  const normalizedPerformanceScore = Math.round(
    average(records, (record) => record.normalizedPerformanceScore),
  );

  return {
    ...template,
    alerts: records.flatMap((record) => record.alerts).slice(0, 4),
    areaManager,
    branch: `Area ${areaManager}`,
    branchType: "Propia",
    capacityGapPoints: Math.round(average(records, (record) => record.capacityGapPoints)),
    city: areaManager.replace(/^Direccion\s+/i, ""),
    comparableGroup: `Area / ${template.line}`,
    comparisonBasis: "Portafolio de sucursales asignadas; no suma simple de ventas",
    dataQuality: Math.round(average(records, (record) => record.dataQuality)),
    growthRate: average(records, (record) => record.growthRate),
    id,
    incidenceShare: Math.round(average(records, (record) => record.incidenceShare)),
    incomingPatients: records.reduce((sum, record) => sum + record.incomingPatients, 0),
    lineSlug,
    manager: areaManager,
    marginRate: average(records, (record) => record.marginRate),
    movedPatients: records.reduce((sum, record) => sum + record.movedPatients, 0),
    netSales,
    normalizedPerformanceScore,
    occupancyRate: average(records, (record) => record.occupancyRate),
    operatingScore: Math.round(average(records, (record) => record.operatingScore)),
    outlierFlags: records.flatMap((record) => record.outlierFlags).slice(0, 5),
    patients,
    priorityAction: "Revisar portafolio, sucursales rezagadas y calidad de cierres.",
    productivityIndex: Math.round(average(records, (record) => record.productivityIndex)),
    projectedClose: records.reduce((sum, record) => sum + record.projectedClose, 0),
    recommendation:
      "El bono de area evalua porcentaje de sucursales en meta, mejora de rezagadas, eficiencia, margen y calidad de cierres.",
    recurrenceRate: average(records, (record) => record.recurrenceRate),
    region: records.map((record) => record.region).join(" / "),
    revenueShare: netSales,
    score: normalizedPerformanceScore,
    scoreDelta: Math.round(average(records, (record) => record.scoreDelta)),
    serviceMix: records.length > 1 ? "Multiservicio" : template.serviceMix,
    size: "Grande",
    slaRate: average(records, (record) => record.slaRate),
    strengths: ["Gestion de portafolio", "Seguimiento de sucursales"],
    targetGap,
    ticket: netSales / Math.max(records.reduce((sum, record) => sum + record.patients, 0), 1),
    utility,
    x: normalizedPerformanceScore,
    y: Math.round((1 - average(records, (record) => record.marginRate)) * 100),
  };
}

function buildAreaManagerBonusRecords(): ManagerBonusRecord[] {
  const groups = new Map<string, BranchNetworkRecord[]>();

  for (const record of allBranchNetworkRecords) {
    const key = `${record.lineSlug}-${record.areaManager}`;
    const current = groups.get(key) ?? [];
    current.push(record);
    groups.set(key, current);
  }

  return [...groups.entries()].map(([key, records], index) => {
    const [lineSlug, ...areaParts] = key.split("-");
    const areaManager = areaParts.join("-");
    const aggregate = aggregateAreaRecord(
      lineSlug as BusinessLineSlug,
      areaManager,
      records,
    );

    return buildManagerBonusRecord(
      aggregate,
      index + allBranchNetworkRecords.length,
      "Gerente de Area",
      records,
    );
  });
}

export const allManagerBonusRecords: ManagerBonusRecord[] = [
  ...allBranchNetworkRecords.map((record, index) =>
    buildManagerBonusRecord(record, index),
  ),
  ...buildAreaManagerBonusRecords(),
];

function buildMetrics(records: ManagerBonusRecord[]): ManagerBonusMetric[] {
  const active = records.length;
  const evaluated = records.filter((record) => record.status !== "Sin datos suficientes").length;
  const pending = active - evaluated;
  const aboveTarget = records.filter((record) => record.targetCompletionRate >= 1).length;
  const warning = records.filter((record) => record.status === "Precaucion").length;
  const critical = records.filter((record) =>
    ["Critico", "Sin datos suficientes"].includes(record.status),
  ).length;
  const eligibleManagers = records.filter((record) => record.bonusState === "ELIGIBLE").length;
  const reviewManagers = records.filter(
    (record) => record.bonusState === "REVIEW REQUIRED",
  ).length;
  const blockedManagers = records.filter(
    (record) => record.bonusState === "NOT ELIGIBLE",
  ).length;
  const projectedManagers = records.filter((record) => record.bonusRecommended > 0).length;
  const totalProjected = records.reduce((sum, record) => sum + record.bonusRecommended, 0);
  const totalApproved = records.reduce((sum, record) => sum + record.bonusApproved, 0);
  const totalPaid = records.reduce((sum, record) => sum + record.bonusPaid, 0);
  const baseBonusAmounts = records.map((record) => record.baseBonusAmount);
  const minBaseBonus = baseBonusAmounts.length > 0 ? Math.min(...baseBonusAmounts) : 0;
  const maxBaseBonus = baseBonusAmounts.length > 0 ? Math.max(...baseBonusAmounts) : 0;
  const averageScore =
    records.reduce((sum, record) => sum + record.score, 0) / Math.max(active, 1);
  const managedSales = records.reduce((sum, record) => sum + record.netSales, 0);
  const managedUtility = records.reduce((sum, record) => sum + record.utility, 0);
  const averageMargin =
    records.reduce((sum, record) => sum + record.marginRate, 0) / Math.max(active, 1);
  const averageOccupancy =
    records.reduce((sum, record) => sum + record.occupancyRate, 0) / Math.max(active, 1);
  const averageSla =
    records.reduce((sum, record) => sum + record.slaRate, 0) / Math.max(active, 1);
  const averageDataQuality =
    records.reduce((sum, record) => sum + record.dataQuality, 0) / Math.max(active, 1);
  const averageBonus = totalProjected / Math.max(projectedManagers, 1);
  const bonusCostOnUtility = totalProjected / Math.max(managedUtility, 1);
  const bonusRoi = managedUtility / Math.max(totalProjected, 1);

  return [
    { group: "Gerentes", label: "Gerentes activos", value: `${active}`, note: "en la vista filtrada", tone: "neutral" },
    { group: "Gerentes", label: "Gerentes evaluados", value: `${evaluated}`, note: "con datos suficientes", tone: pending > 0 ? "warning" : "positive" },
    { group: "Gerentes", label: "Pendientes de evaluacion", value: `${pending}`, note: "faltan datos o cierre", tone: pending > 0 ? "warning" : "positive" },
    { group: "Gerentes", label: "Gerentes sobre meta", value: `${aboveTarget}`, note: "cumplimiento >= 100%", tone: "positive" },
    { group: "Gerentes", label: "En precaucion", value: `${warning}`, note: "requieren accion", tone: warning > 0 ? "warning" : "positive" },
    { group: "Gerentes", label: "Criticos o sin datos", value: `${critical}`, note: "riesgo de bono", tone: critical > 0 ? "negative" : "positive" },
    { group: "Bonos", label: "Bono base por nivel", value: `${formatCurrency(minBaseBonus)}-${formatCurrency(maxBaseBonus)}`, note: "definido al crear gerente", tone: "neutral" },
    { group: "Bonos", label: "Elegibles", value: `${eligibleManagers}`, note: "puede pasar a aprobacion humana", tone: eligibleManagers > 0 ? "positive" : "warning" },
    { group: "Bonos", label: "Requieren revision", value: `${reviewManagers}`, note: "requiere evidencia o conciliacion", tone: reviewManagers > 0 ? "warning" : "positive" },
    { group: "Bonos", label: "No elegibles", value: `${blockedManagers}`, note: "sin bono hasta resolver", tone: blockedManagers > 0 ? "negative" : "positive" },
    { group: "Bonos", label: "Bono recomendado", value: formatCurrency(totalProjected), note: `${projectedManagers} gerentes con monto`, tone: "positive" },
    { group: "Bonos", label: "Bono promedio", value: formatCurrency(averageBonus), note: "solo con recomendacion", tone: "neutral" },
    { group: "Gestion", label: "Puntaje gerencial promedio", value: `${Math.round(averageScore)}`, note: "0 a 100 ponderado", tone: averageScore >= 80 ? "positive" : "warning" },
    { group: "Gestion", label: "Venta gestionada", value: formatCurrency(managedSales), note: "no sustituye salud financiera", tone: "neutral" },
    { group: "Gestion", label: "Utilidad gestionada", value: formatCurrency(managedUtility), note: "base de retorno", tone: managedUtility > 0 ? "positive" : "negative" },
    { group: "Gestion", label: "Margen promedio", value: formatRate(averageMargin), note: "ponderado simple DEMO", tone: averageMargin >= 0.38 ? "positive" : "warning" },
    { group: "Gestion", label: "Ocupacion efectiva", value: formatRate(averageOccupancy), note: "capacidad utilizada", tone: averageOccupancy >= 0.78 ? "positive" : "warning" },
    { group: "Gestion", label: "Cumplimiento SLA", value: formatRate(averageSla), note: "calidad operativa", tone: averageSla >= 0.86 ? "positive" : "warning" },
    { group: "Gestion", label: "Calidad de datos", value: `${Math.round(averageDataQuality)}`, note: "habilita aprobacion", tone: averageDataQuality >= 82 ? "positive" : "warning" },
    { group: "Gestion", label: "Costo bono / utilidad", value: formatRate(bonusCostOnUtility), note: "peso del incentivo", tone: bonusCostOnUtility <= 0.12 ? "positive" : "warning" },
    { group: "Gestion", label: "Retorno por $1 bono", value: `$${bonusRoi.toFixed(1)}`, note: "utilidad por dolar incentivado", tone: bonusRoi >= 8 ? "positive" : "warning" },
    { group: "Bonos", label: "Bono aprobado", value: formatCurrency(totalApproved), note: "solo despues de revision", tone: "neutral" },
    { group: "Bonos", label: "Pago automatico", value: formatCurrency(totalPaid), note: "no integrado", tone: "neutral" },
  ];
}

export function getManagerBonusBacktest(
  records: ManagerBonusRecord[] = allManagerBonusRecords,
): BonusBacktestSummary {
  const withRecommendation = records.filter((record) => record.bonusRecommended > 0);
  const exceptional = records.filter((record) => record.bonusBand === "Exceptional").length;
  const satisfactory = records.filter((record) => record.bonusBand === "Satisfactory").length;
  const fullBaseBonus = records.filter(
    (record) =>
      record.bonusRecommended >= record.baseBonusAmount &&
      record.bonusRecommended > 0,
  ).length;
  const eligible = records.filter((record) => record.bonusState === "ELIGIBLE").length;
  const reviewRequired = records.filter((record) => record.bonusState === "REVIEW REQUIRED").length;
  const notEligible = records.filter((record) => record.bonusState === "NOT ELIGIBLE").length;
  const topSalesRecords = [...records]
    .sort((first, second) => second.netSales - first.netSales)
    .slice(0, Math.max(1, Math.ceil(records.length * 0.25)));
  const topSalesNotMaxed = topSalesRecords.some(
    (record) => record.bonusRecommended < record.baseBonusAmount,
  );
  const smallBranchWithBonus = records.some(
    (record) =>
      record.managerRole === "Gerente de Sucursal" &&
      /Pequena|comparable/i.test(record.managerType) &&
      record.bonusRecommended > 0,
  );
  const areaRecords = records.filter((record) => record.managerRole === "Gerente de Area");
  const branchRecords = records.filter(
    (record) => record.managerRole === "Gerente de Sucursal",
  );
  const averageRecommendedBonus =
    withRecommendation.reduce((sum, record) => sum + record.bonusRecommended, 0) /
    Math.max(withRecommendation.length, 1);

  return {
    averageRecommendedBonus: Math.round(averageRecommendedBonus),
    eligible,
    exceptional,
    findings: [
      {
        check: "No premia volumen absoluto automaticamente",
        result: topSalesNotMaxed
          ? "Al menos una sucursal de alto volumen no recibe el 100% del bono base por brechas de margen, meta o datos."
          : "Todos los registros de alto volumen llegan al bono base completo; revisar sesgo por tamano.",
        status: topSalesNotMaxed ? "PASS" : "REVIEW",
      },
      {
        check: "No penaliza sucursal pequena por tamano",
        result: smallBranchWithBonus
          ? "Existe al menos una sucursal pequena/comparable con bono recomendado por desempeno normalizado."
          : "No hay sucursales pequenas con bono; revisar thresholds o datos.",
        status: smallBranchWithBonus ? "PASS" : "REVIEW",
      },
      {
        check: "No genera demasiados bonos base completos",
        result: `${fullBaseBonus} de ${records.length} registros reciben 100% del bono base.`,
        status: fullBaseBonus <= Math.ceil(records.length * 0.25) ? "PASS" : "REVIEW",
      },
      {
        check: "No concentra todo en banda minima",
        result: `${satisfactory} de ${records.length} registros quedan en Satisfactory.`,
        status: satisfactory <= Math.ceil(records.length * 0.45) ? "PASS" : "REVIEW",
      },
      {
        check: "Evalua sucursal y area por separado",
        result: `${branchRecords.length} registros de sucursal y ${areaRecords.length} registros de area.`,
        status: branchRecords.length > 0 && areaRecords.length > 0 ? "PASS" : "REVIEW",
      },
    ],
    notEligible,
    records: records.length,
    reviewRequired,
    satisfactory,
  };
}

export function getManagerBonusScreen(slug: BusinessLineSlug): ManagerBonusScreen {
  const records =
    slug === "consolidado"
      ? allManagerBonusRecords
      : allManagerBonusRecords.filter((record) => record.lineSlug === slug);
  const titles: Record<BusinessLineSlug, Pick<ManagerBonusScreen, "title" | "subtitle" | "description">> = {
    consolidado: {
      title: "Gerentes y bonos",
      subtitle: "Bonos mensuales transparentes y auditables",
      description:
        "Muestra score, componentes, elegibilidad, bono base, cumplimiento de meta y decision pendiente para Gerentes de Sucursal y Gerentes de Area.",
    },
    laboratorio: {
      title: "Gerentes de Laboratorio",
      subtitle: "Ordenes, margen, inventario, SLA y bono",
      description:
        "El bono se calcula con finanzas, operacion, metas, eficiencia/calidad y calidad del dato, sin premiar solo volumen de ordenes.",
    },
    fisioterapia: {
      title: "Gerentes de Fisioterapia",
      subtitle: "Agenda efectiva, continuidad terapeutica y bono",
      description:
        "No premia solo agenda llena: revisa finanzas, ocupacion efectiva, sesiones, metas, no-show proxy y calidad del cierre.",
    },
    imagenes: {
      title: "Gerentes de Imagenes",
      subtitle: "Equipos, estudios, informes, SLA y bono",
      description:
        "El calculo incorpora finanzas, estudios, utilizacion, metas, informes/SLA y calidad del dato.",
    },
  };

  return {
    slug,
    ...titles[slug],
    rule:
      "Regla: el sistema recomienda el bono mensual como bono base del gerente por cumplimiento de meta de su sucursal o portafolio; no paga automaticamente y no reemplaza aprobacion humana.",
    weights: managerBonusWeightsByLine[slug],
    metrics: buildMetrics(records),
    records,
    executiveInsights: [
      "El monto recomendado se calcula con bono base por nivel y cumplimiento de meta; el puntaje controla elegibilidad, revision y riesgos.",
      "El estado del bono puede ser Elegible, Requiere revision o No elegible segun cierre, calidad, indicadores criticos e inconsistencias.",
      "La aprobacion final debe pasar por autoridad autorizada; el gerente puede ver el calculo y evidencia, pero no aprobar su bono.",
      "El Gerente de Area se evalua por portafolio, porcentaje de sucursales en meta y mejora de rezagadas, no por suma simple.",
    ],
  };
}

function seriesForRecords(
  records: ManagerBonusRecord[],
  field: keyof ManagerBonusRecord["trend"],
  valueFormatter: (record: ManagerBonusRecord) => string,
): TrendSeries[] {
  const scoped = records.slice(0, 5);
  const projectedBonusGoal =
    field === "projectedBonus"
      ? Math.max(...scoped.map((record) => record.baseBonusAmount), 1)
      : 85;

  return [
    ...scoped.map((record, index) => ({
      label: record.manager,
      value: valueFormatter(record),
      color: trendColors[index % trendColors.length],
      points: record.trend[field],
    })),
    {
      label: field === "projectedBonus" ? "Bono base mayor" : "Meta gerencial",
      value:
        field === "projectedBonus"
          ? formatCurrency(projectedBonusGoal)
          : "85",
      color: "slate" as const,
      points: recordGoalPoints(field, projectedBonusGoal),
    },
  ];
}

function recordGoalPoints(
  field: keyof ManagerBonusRecord["trend"],
  projectedBonusGoal: number,
) {
  if (field === "projectedBonus") {
    return [
      projectedBonusGoal,
      projectedBonusGoal,
      projectedBonusGoal,
      projectedBonusGoal,
      projectedBonusGoal,
      projectedBonusGoal,
      projectedBonusGoal,
    ];
  }

  return [85, 85, 85, 85, 85, 85, 85];
}

export function buildManagerBonusTrendChart(
  records: ManagerBonusRecord[],
): {
  title: string;
  description: string;
  xLabels: string[];
  yLabel: string;
  series: TrendSeries[];
  insights: TrendInsight[];
  metricOptions: TrendChartOption[];
} {
  const scopedRecords = records.slice(0, 5);
  const firstRecord = scopedRecords[0] ?? allManagerBonusRecords[0];
  const baseInsights: TrendInsight[] = [
    {
      label: "Comparacion",
      value: `${scopedRecords.length} gerentes`,
      note: "Puedes comparar fechas, periodo anterior, meta y hasta cinco gerentes visibles.",
      tone: "neutral",
    },
    {
      label: "Mayor riesgo",
      value: `${firstRecord?.bonusState ?? "Sin datos"}`,
      note: firstRecord?.explanation ?? "Selecciona una linea con datos.",
      tone: firstRecord?.bonusState === "NOT ELIGIBLE" ? "negative" : "warning",
    },
    {
      label: "Decision",
      value: "Trazable",
      note: "Cada variacion del bono muestra causa, evidencia y responsable de revision.",
      tone: "positive",
    },
  ];
  const metricOptions: TrendChartOption[] = [
    {
      id: "score-gerencial",
      label: "Puntaje gerencial",
      description:
        "Evolucion del puntaje total por gerente, con fecha exacta al pasar sobre cada punto.",
      yLabel: "Puntaje 0-100",
      series: seriesForRecords(scopedRecords, "totalScore", (record) => `${record.score}`),
      insights: baseInsights,
    },
    {
      id: "score-financiero",
      label: "Puntaje financiero",
      description:
        "Finanzas separa venta, utilidad y margen para evitar bonos por crecimiento poco rentable.",
      yLabel: "Puntaje financiero",
      series: seriesForRecords(scopedRecords, "financialScore", (record) =>
        `${getDimensionByLabel(record.dimensions, /Finanzas|Resultado consolidado/)}`,
      ),
      insights: baseInsights,
    },
    {
      id: "score-operativo",
      label: "Puntaje operativo",
      description:
        "Operacion muestra productividad, SLA, uso de capacidad y cuellos de botella.",
      yLabel: "Puntaje operativo",
      series: seriesForRecords(scopedRecords, "operationalScore", (record) =>
        `${getDimensionByLabel(record.dimensions, /Operacion|Productividad|Utilizacion|Sucursales en meta|Mejora/)}`,
      ),
      insights: baseInsights,
    },
    {
      id: "score-calidad",
      label: "Puntaje de calidad",
      description:
        "Calidad permite detectar bonos altos con evidencia pendiente, reclamos o SLA debil.",
      yLabel: "Puntaje de calidad",
      series: seriesForRecords(scopedRecords, "qualityScore", (record) =>
        `${getDimensionByLabel(record.dimensions, /Calidad|SLA|Informes|Puntualidad/)}`,
      ),
      insights: baseInsights,
    },
    {
      id: "bono-proyectado-gerente",
      label: "Bono recomendado",
      description:
        "Evolucion del bono recomendado frente al bono base configurado, periodo anterior o rango personalizado.",
      yLabel: "USD",
      series: seriesForRecords(scopedRecords, "projectedBonus", (record) =>
        formatCurrency(record.bonusRecommended),
      ),
      insights: baseInsights,
    },
  ];

  return {
    title: "Evolucion del puntaje y bono",
    description:
      "Selecciona KPI y rango de fechas; la grafica muestra valores exactos al pasar encima.",
    xLabels: exactDateLabels,
    yLabel: metricOptions[0].yLabel,
    series: metricOptions[0].series,
    insights: metricOptions[0].insights,
    metricOptions,
  };
}
