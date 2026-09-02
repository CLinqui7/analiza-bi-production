import type {
  TrendChartOption,
  TrendInsight,
  TrendSeries,
} from "@/components/analytics-comparison-chart";
import type { BusinessLineSlug } from "@/lib/analytics/business-line-operations";
import {
  clampScore,
  createOutlierFlag,
  median,
  scoreAgainstPeerMedian,
  scoreRate,
  weightedScore,
  type AnalyticsOutlierFlag,
} from "@/lib/analytics/analytics-intelligence";
import {
  elSalvadorBranchResultTemplates,
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";

export type BranchStatus = "Sobresaliente" | "Saludable" | "Precaucion" | "Critica";

export type BranchNetworkMetric = {
  label: string;
  value: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
};

export type BranchNetworkRecord = {
  id: string;
  branch: string;
  city: string;
  line: "Laboratorio" | "Fisioterapia" | "Imagenes" | "Multiservicio";
  lineSlug: BusinessLineSlug;
  region: string;
  manager: string;
  areaManager: string;
  branchType: "Propia" | "Alianza";
  serviceMix: "Una linea" | "Multiservicio";
  size: "Grande" | "Mediana" | "Pequena";
  comparableGroup: string;
  score: number;
  scoreDelta: number;
  status: BranchStatus;
  netSales: number;
  growthRate: number;
  marginRate: number;
  patients: number;
  recurrenceRate: number;
  occupancyRate: number;
  slaRate: number;
  dataQuality: number;
  operatingScore: number;
  utility: number;
  ticket: number;
  revenueShare: number;
  incidenceShare: number;
  x: number;
  y: number;
  strengths: string[];
  reducers: string[];
  recommendation: string;
  priorityAction: string;
  lossCauses: { cause: string; value: number }[];
  targetGap: number;
  projectedClose: number;
  movedPatients: number;
  incomingPatients: number;
  alerts: string[];
  normalizedPerformanceScore: number;
  comparisonBasis: string;
  capacityGapPoints: number;
  productivityIndex: number;
  outlierFlags: AnalyticsOutlierFlag[];
};

type BranchNetworkBaseRecord = Omit<
  BranchNetworkRecord,
  | "capacityGapPoints"
  | "comparisonBasis"
  | "normalizedPerformanceScore"
  | "outlierFlags"
  | "productivityIndex"
>;

export type BranchNetworkScreen = {
  slug: BusinessLineSlug;
  title: string;
  subtitle: string;
  description: string;
  metrics: BranchNetworkMetric[];
  records: BranchNetworkRecord[];
  executiveActions: string[];
};

export type BranchTrendChart = {
  title: string;
  description: string;
  xLabels: string[];
  yLabel: string;
  series: TrendSeries[];
  insights: TrendInsight[];
  metricOptions: TrendChartOption[];
};

export const branchScoreWeights = [
  { dimension: "Resultado financiero", weight: "25%" },
  { dimension: "Operacion y productividad", weight: "20%" },
  { dimension: "Pacientes y crecimiento", weight: "15%" },
  { dimension: "Capacidad y ocupacion", weight: "15%" },
  { dimension: "Calidad y SLA", weight: "15%" },
  { dimension: "Experiencia del paciente", weight: "5%" },
  { dimension: "Calidad de datos", weight: "5%" },
];

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

function getBranchStatus(score: number): BranchStatus {
  if (score >= 90) {
    return "Sobresaliente";
  }

  if (score >= 80) {
    return "Saludable";
  }

  if (score >= 70) {
    return "Precaucion";
  }

  return "Critica";
}

function getSize(patients: number): BranchNetworkRecord["size"] {
  if (patients >= 17000) {
    return "Grande";
  }

  if (patients >= 9000) {
    return "Mediana";
  }

  return "Pequena";
}

function buildPoints(value: number, variance = 0.08) {
  const multipliers = [0.78, 0.84, 0.88, 0.93, 0.97, 1.02, 1];

  return multipliers.map((multiplier, index) =>
    Math.max(0, Math.round(value * (multiplier + index * variance * 0.04))),
  );
}

function buildRatePoints(value: number) {
  const base = Math.round(value * 100);
  return [base - 5, base - 3, base - 2, base - 1, base, base + 1, base].map(
    (point) => Math.max(0, Math.min(100, point)),
  );
}

function peerRecords(
  record: BranchNetworkBaseRecord,
  records: BranchNetworkBaseRecord[],
) {
  const comparablePeers = records.filter(
    (peer) =>
      peer.id !== record.id &&
      peer.lineSlug === record.lineSlug &&
      peer.size === record.size &&
      peer.serviceMix === record.serviceMix,
  );

  if (comparablePeers.length >= 2) {
    return comparablePeers;
  }

  return records.filter(
    (peer) => peer.id !== record.id && peer.lineSlug === record.lineSlug,
  );
}

function comparisonBasis(record: BranchNetworkBaseRecord, peers: BranchNetworkBaseRecord[]) {
  const peerLabel = peers.length >= 2 ? "grupo comparable" : "misma linea";

  return `${record.line} / ${record.size} / ${record.serviceMix}; referencia: ${peerLabel}`;
}

function normalizedPerformanceScore(
  record: BranchNetworkBaseRecord,
  peers: BranchNetworkBaseRecord[],
) {
  const marginPeerMedian = median(peers.map((peer) => peer.marginRate));
  const ticketPeerMedian = median(peers.map((peer) => peer.ticket));
  const targetScore = clampScore(100 + record.targetGap);
  const marginScore = scoreAgainstPeerMedian(record.marginRate, marginPeerMedian);
  const utilizationScore = scoreRate(record.occupancyRate);
  const slaScore = scoreRate(record.slaRate);
  const productivityScore = scoreAgainstPeerMedian(record.ticket, ticketPeerMedian);
  const growthScore = clampScore(70 + record.growthRate * 120);
  const recurrenceScore = scoreRate(record.recurrenceRate);

  if (record.lineSlug === "fisioterapia") {
    return weightedScore([
      { value: targetScore, weight: 25 },
      { value: utilizationScore, weight: 24 },
      { value: recurrenceScore, weight: 16 },
      { value: marginScore, weight: 14 },
      { value: slaScore, weight: 10 },
      { value: record.dataQuality, weight: 8 },
      { value: growthScore, weight: 3 },
    ]);
  }

  if (record.lineSlug === "laboratorio") {
    return weightedScore([
      { value: targetScore, weight: 26 },
      { value: productivityScore, weight: 18 },
      { value: marginScore, weight: 18 },
      { value: slaScore, weight: 14 },
      { value: record.dataQuality, weight: 14 },
      { value: growthScore, weight: 10 },
    ]);
  }

  if (record.lineSlug === "imagenes") {
    return weightedScore([
      { value: targetScore, weight: 26 },
      { value: utilizationScore, weight: 24 },
      { value: marginScore, weight: 18 },
      { value: slaScore, weight: 14 },
      { value: record.dataQuality, weight: 10 },
      { value: productivityScore, weight: 5 },
      { value: growthScore, weight: 3 },
    ]);
  }

  return weightedScore([
    { value: targetScore, weight: 25 },
    { value: utilizationScore, weight: 20 },
    { value: productivityScore, weight: 15 },
    { value: marginScore, weight: 15 },
    { value: slaScore, weight: 10 },
    { value: record.dataQuality, weight: 10 },
    { value: growthScore, weight: 5 },
  ]);
}

function buildOutlierFlags(
  record: BranchNetworkBaseRecord,
  peers: BranchNetworkBaseRecord[],
): AnalyticsOutlierFlag[] {
  const flags: AnalyticsOutlierFlag[] = [];
  const marginPeerMedian = median(peers.map((peer) => peer.marginRate));
  const occupancyPeerMedian = median(peers.map((peer) => peer.occupancyRate));
  const growthPeerMedian = median(peers.map((peer) => peer.growthRate));
  const ticketPeerMedian = median(peers.map((peer) => peer.ticket));

  if (record.targetGap <= -10) {
    flags.push(
      createOutlierFlag({
        benchmark: "Meta del periodo",
        explanation:
          "Brecha relevante contra meta; revisar antes de comparar por venta absoluta.",
        metric: "Meta vs real",
        severity: record.targetGap <= -15 ? "critical" : "warning",
        value: `${record.targetGap} pts`,
      }),
    );
  }

  if (record.occupancyRate >= 0.9 || record.occupancyRate <= 0.65) {
    flags.push(
      createOutlierFlag({
        benchmark: occupancyPeerMedian === null ? "Grupo comparable" : formatRate(occupancyPeerMedian),
        explanation:
          record.occupancyRate >= 0.9
            ? "Utilizacion alta; puede indicar saturacion si SLA o lista de espera se deterioran."
            : "Utilizacion baja; revisar capacidad ociosa, demanda y derivaciones disponibles.",
        metric: "Ocupacion/utilizacion",
        severity: record.occupancyRate >= 0.94 || record.occupancyRate <= 0.61 ? "critical" : "warning",
        value: formatRate(record.occupancyRate),
      }),
    );
  }

  if (marginPeerMedian !== null && record.marginRate <= marginPeerMedian - 0.06) {
    flags.push(
      createOutlierFlag({
        benchmark: `Mediana pares ${formatRate(marginPeerMedian)}`,
        explanation:
          "Margen debajo del grupo comparable; separar mix, costo y ticket antes de concluir desempeno.",
        metric: "Margen",
        severity: "warning",
        value: formatRate(record.marginRate),
      }),
    );
  }

  if (ticketPeerMedian !== null && record.ticket <= ticketPeerMedian * 0.85) {
    flags.push(
      createOutlierFlag({
        benchmark: `Mediana pares ${formatCurrency(ticketPeerMedian)}`,
        explanation:
          "Ticket por servicio bajo frente a pares; revisar mezcla y precios antes de aumentar volumen.",
        metric: "Productividad/ticket",
        severity: "warning",
        value: formatCurrency(record.ticket),
      }),
    );
  }

  if (growthPeerMedian !== null && Math.abs(record.growthRate - growthPeerMedian) >= 0.12) {
    flags.push(
      createOutlierFlag({
        benchmark: `Mediana pares ${formatRate(growthPeerMedian)}`,
        explanation:
          "Cambio brusco contra pares; validar si es estacionalidad, recuperacion o problema de captura.",
        metric: "Tendencia",
        severity: Math.abs(record.growthRate - growthPeerMedian) >= 0.2 ? "critical" : "warning",
        value: formatRate(record.growthRate),
      }),
    );
  }

  if (record.dataQuality < 80) {
    flags.push(
      createOutlierFlag({
        benchmark: "Umbral minimo 80",
        explanation:
          "Calidad de datos debajo del umbral; bloquear conclusiones ejecutivas fuertes.",
        metric: "Calidad de datos",
        severity: record.dataQuality < 70 ? "critical" : "warning",
        value: `${record.dataQuality}`,
      }),
    );
  }

  return flags;
}

function enrichBranchNetworkRecords(records: BranchNetworkBaseRecord[]): BranchNetworkRecord[] {
  return records.map((record) => {
    const peers = peerRecords(record, records);
    const occupancyPeerMedian = median(peers.map((peer) => peer.occupancyRate));
    const ticketPeerMedian = median(peers.map((peer) => peer.ticket));

    return {
      ...record,
      capacityGapPoints:
        occupancyPeerMedian === null
          ? 0
          : Math.round((record.occupancyRate - occupancyPeerMedian) * 100),
      comparisonBasis: comparisonBasis(record, peers),
      normalizedPerformanceScore: normalizedPerformanceScore(record, peers),
      outlierFlags: buildOutlierFlags(record, peers),
      productivityIndex: scoreAgainstPeerMedian(record.ticket, ticketPeerMedian),
    };
  });
}

const laboratoryRecords: BranchNetworkBaseRecord[] =
  elSalvadorBranchResultTemplates.map((branch, index) => {
    const patients = branch.rowCounts.customerRows;
    const operatingScore = Math.round(
      branch.revenueCompletionRate * 36 +
        branch.marginRate * 28 +
        branch.dataQualityScore * 0.24 +
        Math.min(12, patients / 1800),
    );
    const score = Math.max(62, Math.min(94, operatingScore));
    const status = getBranchStatus(score);
    const growthRate =
      branch.id === "sv-aguilares-l033"
        ? 0.14
        : branch.revenueCompletionRate >= 1
          ? 0.08
          : -0.06;
    const occupancyRate = Math.min(0.94, 0.58 + branch.revenueCompletionRate * 0.22);
    const slaRate = Math.max(0.72, Math.min(0.96, branch.dataQualityScore / 100 + 0.08));
    const utility = branch.marginAmount - branch.costOfSale * 0.72;

    return {
      id: branch.id,
      branch: branch.branchName,
      city: branch.city,
      line: "Laboratorio",
      lineSlug: "laboratorio",
      region: index <= 2 ? "Norte" : index <= 4 ? "Centro" : "Sur",
      manager: branch.manager,
      areaManager: branch.areaManager,
      branchType: "Propia",
      serviceMix: "Una linea",
      size: getSize(patients),
      comparableGroup: `${getSize(patients)} / Regional / Laboratorio`,
      score,
      scoreDelta: branch.revenueCompletionRate >= 1 ? 4 : -5,
      status,
      netSales: branch.netRevenue,
      growthRate,
      marginRate: branch.marginRate,
      patients,
      recurrenceRate: branch.id === "sv-aguilares-l033" ? 0.42 : 0.54 + index * 0.015,
      occupancyRate,
      slaRate,
      dataQuality: branch.dataQualityScore,
      operatingScore,
      utility,
      ticket: branch.netRevenue / Math.max(branch.rowCounts.salesRows, 1),
      revenueShare: branch.netRevenue,
      incidenceShare: 7 + index * 2,
      x: 16 + index * 12,
      y: 72 - Math.min(38, branch.revenueCompletionRate * 34),
      strengths:
        branch.revenueCompletionRate >= 1
          ? ["Cumplimiento de meta", "Recurrencia favorable"]
          : ["Base de pacientes amplia", "Margen estable"],
      reducers:
        branch.id === "sv-aguilares-l033"
          ? ["Margen cae 3.2 pts por reactivos y tercerizaciones", "Ticket promedio bajo"]
          : branch.dataQualityScore < 80
            ? ["Calidad de datos debajo del umbral", "Proyeccion incompleta"]
            : ["Brecha contra meta", "Costo operativo por validar"],
      recommendation:
        branch.id === "sv-aguilares-l033"
          ? "Aguilares crecio 14% en ordenes, pero su margen cayo 3.2 puntos por mayor consumo de reactivos, pruebas tercerizadas y bajo ticket promedio."
          : branch.revenueCompletionRate >= 1
            ? "Replicar captacion y revisar capacidad para sostener crecimiento sin deteriorar SLA."
            : "Comparar contra sucursales similares antes de juzgar venta; priorizar meta, recurrencia y calidad de datos.",
      priorityAction:
        branch.id === "sv-aguilares-l033"
          ? "Revisar reactivos, tercerizaciones y ticket promedio."
          : "Ajustar meta, demanda y plan operativo por grupo comparable.",
      lossCauses: [
        { cause: "Falta disponibilidad", value: 18 + index },
        { cause: "Procesos administrativos", value: 15 + index * 2 },
        { cause: "Calidad de datos", value: Math.max(6, 28 - branch.dataQualityScore / 4) },
        { cause: "Facturacion", value: 9 + index },
      ],
      targetGap: Math.round((branch.revenueCompletionRate - 1) * 100),
      projectedClose: branch.projectedRevenue ?? branch.actualRevenue * 0.98,
      movedPatients: 14 + index * 5,
      incomingPatients: 21 + index * 4,
      alerts: branch.validationFlags.slice(0, 2),
    };
  });

const physioRecords: BranchNetworkBaseRecord[] = [
  {
    id: "physio-centro",
    branch: "Fisioterapia Centro",
    city: "San Salvador",
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    region: "Centro",
    manager: "Gerente Centro",
    areaManager: "Direccion Fisioterapia",
    branchType: "Propia",
    serviceMix: "Una linea",
    size: "Grande",
    comparableGroup: "Grande / Urbana / Fisioterapia",
    score: 68,
    scoreDelta: -7,
    status: "Critica",
    netSales: 38200,
    growthRate: 0.09,
    marginRate: 0.29,
    patients: 2120,
    recurrenceRate: 0.58,
    occupancyRate: 0.7,
    slaRate: 0.79,
    dataQuality: 84,
    operatingScore: 67,
    utility: 8400,
    ticket: 80,
    revenueShare: 38200,
    incidenceShare: 18,
    x: 46,
    y: 58,
    strengths: ["Alta agenda", "Demanda suficiente"],
    reducers: ["No-show", "Cancelacion tardia", "Baja conversion a sesion"],
    recommendation:
      "La sucursal Centro tiene una ocupacion agendada de 89%, pero una ocupacion efectiva de 70%. El problema principal no es la falta de demanda, sino la conversion de agenda a sesion atendida.",
    priorityAction: "Recuperar agenda con confirmacion y lista de espera.",
    lossCauses: [
      { cause: "No-show", value: 42 },
      { cause: "Cancelaciones", value: 28 },
      { cause: "Abandono", value: 17 },
      { cause: "Espacios libres", value: 13 },
    ],
    targetGap: -14,
    projectedClose: 40100,
    movedPatients: 32,
    incomingPatients: 18,
    alerts: ["Ocupacion alta con baja atencion exitosa", "Aumento de no-show"],
  },
  {
    id: "physio-norte",
    branch: "Fisioterapia Norte",
    city: "San Salvador",
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    region: "Norte",
    manager: "Gerente Norte",
    areaManager: "Direccion Fisioterapia",
    branchType: "Propia",
    serviceMix: "Una linea",
    size: "Mediana",
    comparableGroup: "Mediana / Urbana / Fisioterapia",
    score: 83,
    scoreDelta: 5,
    status: "Saludable",
    netSales: 31800,
    growthRate: 0.12,
    marginRate: 0.38,
    patients: 1760,
    recurrenceRate: 0.67,
    occupancyRate: 0.76,
    slaRate: 0.89,
    dataQuality: 88,
    operatingScore: 84,
    utility: 12100,
    ticket: 86,
    revenueShare: 31800,
    incidenceShare: 9,
    x: 32,
    y: 42,
    strengths: ["Continuidad terapeutica", "Recurrencia alta"],
    reducers: ["Reprogramaciones", "Horas vespertinas libres"],
    recommendation: "Proteger continuidad y recuperar cancelaciones con lista de espera.",
    priorityAction: "Mantener seguimiento de planes activos.",
    lossCauses: [
      { cause: "Reprogramacion", value: 29 },
      { cause: "No-show", value: 24 },
      { cause: "Espacios libres", value: 20 },
      { cause: "Administrativo", value: 12 },
    ],
    targetGap: -4,
    projectedClose: 33400,
    movedPatients: 18,
    incomingPatients: 26,
    alerts: ["Planes activos fuera de frecuencia"],
  },
  {
    id: "physio-sur",
    branch: "Fisioterapia Sur",
    city: "San Salvador",
    line: "Fisioterapia",
    lineSlug: "fisioterapia",
    region: "Sur",
    manager: "Gerente Sur",
    areaManager: "Direccion Fisioterapia",
    branchType: "Alianza",
    serviceMix: "Una linea",
    size: "Pequena",
    comparableGroup: "Pequena / Urbana / Fisioterapia",
    score: 76,
    scoreDelta: 2,
    status: "Precaucion",
    netSales: 24200,
    growthRate: 0.04,
    marginRate: 0.34,
    patients: 1180,
    recurrenceRate: 0.63,
    occupancyRate: 0.72,
    slaRate: 0.86,
    dataQuality: 81,
    operatingScore: 77,
    utility: 8200,
    ticket: 82,
    revenueShare: 24200,
    incidenceShare: 11,
    x: 70,
    y: 48,
    strengths: ["Calidad clinica estable"],
    reducers: ["Baja demanda vespertina", "Lista de espera irregular"],
    recommendation: "Aumentar demanda en franjas libres y comparar solo contra sedes pequenas.",
    priorityAction: "Campanas y referidos en horarios subutilizados.",
    lossCauses: [
      { cause: "Espacios libres", value: 38 },
      { cause: "No-show", value: 22 },
      { cause: "Cancelaciones", value: 18 },
      { cause: "Datos incompletos", value: 9 },
    ],
    targetGap: -8,
    projectedClose: 24900,
    movedPatients: 9,
    incomingPatients: 12,
    alerts: ["Ocupacion baja con demanda recuperable"],
  },
];

const imagingRecords: BranchNetworkBaseRecord[] = [
  {
    id: "img-santa-tecla",
    branch: "Imagenes Santa Tecla",
    city: "Santa Tecla",
    line: "Imagenes",
    lineSlug: "imagenes",
    region: "Centro",
    manager: "Gerente Santa Tecla",
    areaManager: "Direccion Imagenes",
    branchType: "Propia",
    serviceMix: "Una linea",
    size: "Grande",
    comparableGroup: "Grande / Urbana / Imagenes",
    score: 79,
    scoreDelta: -3,
    status: "Precaucion",
    netSales: 42600,
    growthRate: 0.11,
    marginRate: 0.42,
    patients: 2480,
    recurrenceRate: 0.33,
    occupancyRate: 0.94,
    slaRate: 0.82,
    dataQuality: 83,
    operatingScore: 78,
    utility: 10900,
    ticket: 109,
    revenueShare: 42600,
    incidenceShare: 16,
    x: 58,
    y: 31,
    strengths: ["Alta utilizacion", "Demanda sostenida"],
    reducers: ["Lista de espera", "Informes pendientes", "Capacidad desigual"],
    recommendation:
      "Santa Tecla concentra la mayor lista de espera de tomografia, mientras una sede cercana mantiene capacidad disponible. La redistribucion podria reducir el tiempo de espera sin nueva inversion.",
    priorityAction: "Redistribuir pacientes hacia equipo equivalente disponible.",
    lossCauses: [
      { cause: "Lista de espera", value: 34 },
      { cause: "Equipo detenido", value: 24 },
      { cause: "Autorizacion", value: 18 },
      { cause: "Informes", value: 16 },
    ],
    targetGap: -6,
    projectedClose: 45100,
    movedPatients: 48,
    incomingPatients: 12,
    alerts: ["Sucursal saturada", "Lista de espera tomografia 4.8 dias"],
  },
  {
    id: "img-centro",
    branch: "Imagenes Centro",
    city: "San Salvador",
    line: "Imagenes",
    lineSlug: "imagenes",
    region: "Centro",
    manager: "Gerente Centro Imagenes",
    areaManager: "Direccion Imagenes",
    branchType: "Propia",
    serviceMix: "Multiservicio",
    size: "Mediana",
    comparableGroup: "Mediana / Multiservicio / Imagenes",
    score: 86,
    scoreDelta: 6,
    status: "Saludable",
    netSales: 28900,
    growthRate: 0.08,
    marginRate: 0.47,
    patients: 1580,
    recurrenceRate: 0.3,
    occupancyRate: 0.78,
    slaRate: 0.9,
    dataQuality: 87,
    operatingScore: 88,
    utility: 11800,
    ticket: 112,
    revenueShare: 28900,
    incidenceShare: 7,
    x: 42,
    y: 38,
    strengths: ["SLA estable", "Rentabilidad sana"],
    reducers: ["Preparacion incompleta", "Agenda por modalidad"],
    recommendation: "Mantener protocolos y absorber demanda seleccionada de Santa Tecla.",
    priorityAction: "Coordinar agenda por modalidad.",
    lossCauses: [
      { cause: "Preparacion", value: 28 },
      { cause: "Cancelaciones", value: 22 },
      { cause: "No-show", value: 18 },
      { cause: "Informes", value: 11 },
    ],
    targetGap: 4,
    projectedClose: 30600,
    movedPatients: 16,
    incomingPatients: 39,
    alerts: ["Preparacion incompleta en ultrasonido"],
  },
  {
    id: "img-este",
    branch: "Imagenes Este",
    city: "San Miguel",
    line: "Imagenes",
    lineSlug: "imagenes",
    region: "Oriente",
    manager: "Gerente Este",
    areaManager: "Direccion Imagenes",
    branchType: "Alianza",
    serviceMix: "Una linea",
    size: "Mediana",
    comparableGroup: "Mediana / Regional / Imagenes",
    score: 71,
    scoreDelta: -4,
    status: "Precaucion",
    netSales: 21800,
    growthRate: -0.03,
    marginRate: 0.36,
    patients: 1320,
    recurrenceRate: 0.28,
    occupancyRate: 0.61,
    slaRate: 0.84,
    dataQuality: 80,
    operatingScore: 73,
    utility: 5200,
    ticket: 101,
    revenueShare: 21800,
    incidenceShare: 10,
    x: 78,
    y: 64,
    strengths: ["Capacidad disponible", "Calidad tecnica aceptable"],
    reducers: ["Subutilizacion", "Bajo crecimiento", "Demanda transferida"],
    recommendation: "Usar capacidad disponible para absorber demanda de sedes saturadas.",
    priorityAction: "Recibir agenda redistribuida y mejorar referidos locales.",
    lossCauses: [
      { cause: "Baja demanda", value: 36 },
      { cause: "Equipo detenido", value: 20 },
      { cause: "No-show", value: 16 },
      { cause: "Insumos", value: 10 },
    ],
    targetGap: -13,
    projectedClose: 21100,
    movedPatients: 7,
    incomingPatients: 44,
    alerts: ["Capacidad ociosa con lista de espera en sede cercana"],
  },
];

const branchNetworkBaseRecords: BranchNetworkBaseRecord[] = [
  ...laboratoryRecords,
  ...physioRecords,
  ...imagingRecords,
];

export const allBranchNetworkRecords: BranchNetworkRecord[] =
  enrichBranchNetworkRecords(branchNetworkBaseRecords);

function scoreMetrics(records: BranchNetworkRecord[]): BranchNetworkMetric[] {
  const active = records.length;
  const normal = records.filter((record) =>
    ["Sobresaliente", "Saludable"].includes(record.status),
  ).length;
  const warning = records.filter((record) => record.status === "Precaucion").length;
  const critical = records.filter((record) => record.status === "Critica").length;
  const aboveTarget = records.filter((record) => record.targetGap >= 0).length;
  const loss = records.filter((record) => record.utility < 7000 || record.targetGap < -10).length;
  const saturated = records.filter((record) => record.occupancyRate >= 0.88).length;
  const underused = records.filter((record) => record.occupancyRate <= 0.65).length;
  const dataProblems = records.filter((record) => record.dataQuality < 80).length;
  const outliers = records.filter((record) => record.outlierFlags.length > 0).length;
  const totalSales = records.reduce((sum, record) => sum + record.netSales, 0);
  const totalPatients = records.reduce((sum, record) => sum + record.patients, 0);
  const averageScore =
    records.reduce((sum, record) => sum + record.normalizedPerformanceScore, 0) /
    Math.max(active, 1);

  return [
    { label: "Red de sucursales", value: `${active}`, note: "sucursales en la vista", tone: "neutral" },
    { label: "Operacion normal", value: `${normal}`, note: "saludables o sobresalientes", tone: "positive" },
    { label: "Precaucion", value: `${warning}`, note: "requieren seguimiento", tone: "warning" },
    { label: "Criticas", value: `${critical}`, note: "intervencion prioritaria", tone: critical > 0 ? "negative" : "positive" },
    { label: "Encima de meta", value: `${aboveTarget}`, note: "real sobre meta", tone: "positive" },
    { label: "Perdida operativa", value: `${loss}`, note: "utilidad, margen o brecha", tone: "warning" },
    { label: "Saturadas", value: `${saturated}`, note: "ocupacion alta", tone: "warning" },
    { label: "Subutilizadas", value: `${underused}`, note: "capacidad comercial", tone: "warning" },
    { label: "Atipicas", value: `${outliers}`, note: "marcadas, no excluidas", tone: outliers > 0 ? "warning" : "positive" },
    { label: "Calidad de datos", value: `${dataProblems}`, note: "debajo de 80 puntos", tone: dataProblems > 0 ? "warning" : "positive" },
    { label: "Venta neta", value: formatCurrency(totalSales), note: "periodo seleccionado", tone: "positive" },
    { label: "Pacientes", value: totalPatients.toLocaleString("en-US"), note: "unicos DEMO", tone: "neutral" },
    { label: "Puntaje comparable", value: `${Math.round(averageScore)}`, note: "normalizado, no volumen", tone: averageScore >= 80 ? "positive" : "warning" },
  ];
}

export function getBranchNetworkScreen(slug: BusinessLineSlug): BranchNetworkScreen {
  const records =
    slug === "consolidado"
      ? allBranchNetworkRecords
      : allBranchNetworkRecords.filter((record) => record.lineSlug === slug);

  const titles: Record<BusinessLineSlug, { title: string; subtitle: string; description: string }> = {
    consolidado: {
      title: "Sucursales",
      subtitle: "Mapa de mando de toda la red",
      description:
        "Permite saber donde invertir, donde corregir, donde ampliar capacidad, donde recuperar demanda y que buenas practicas replicar.",
    },
    laboratorio: {
      title: "Laboratorio por sucursal",
      subtitle: "Ordenes, pruebas, venta, margen, SLA e inventario",
      description:
        "Compara sucursales de laboratorio por ordenes, venta, margen, referidores, uso de analizadores, rechazos, repeticiones e inventario.",
    },
    fisioterapia: {
      title: "Fisioterapia por sucursal",
      subtitle: "Agenda, sesiones, continuidad, ocupacion y margen",
      description:
        "Compara sucursales de fisioterapia por pacientes activos, citas, sesiones, no-show, ocupacion efectiva y continuidad terapeutica.",
    },
    imagenes: {
      title: "Imagenes por sucursal",
      subtitle: "Solicitudes, estudios, equipos, informes y redistribucion",
      description:
        "Compara sedes de imagenes por utilizacion de equipos, lista de espera, estudios exitosos, informes, margen y demanda transferida.",
    },
  };

  return {
    slug,
    ...titles[slug],
    metrics: scoreMetrics(records),
    records,
    executiveActions: [
      "Comparar cada sede contra promedio de red, grupo comparable, mejor sede del grupo, resultado anterior y meta.",
      "No comparar injustamente una sede pequena con una sede central: usar tamano, capacidad instalada, mezcla de servicios y nivel de demanda.",
      "El puntaje nunca se muestra solo: siempre explica que lo subio, que lo redujo, cuanto cambio y que accion se recomienda.",
      "Sucursal critica no siempre significa baja venta; puede ser alta ocupacion con bajo SLA, margen bajo o calidad de datos incompleta.",
    ],
  };
}

function seriesForMetric(
  records: BranchNetworkRecord[],
  metric: keyof Pick<
    BranchNetworkRecord,
    | "netSales"
    | "patients"
    | "marginRate"
    | "occupancyRate"
    | "slaRate"
    | "normalizedPerformanceScore"
  >,
  formatter: (record: BranchNetworkRecord) => string,
): TrendSeries[] {
  return records.map((record, index) => {
    const rawValue = record[metric];
    const normalizedValue =
      metric === "marginRate" || metric === "occupancyRate" || metric === "slaRate"
        ? Number(rawValue) * 100
        : Number(rawValue);

    return {
      label: record.city,
      value: formatter(record),
      color: trendColors[index % trendColors.length],
      points:
        metric === "marginRate" || metric === "occupancyRate" || metric === "slaRate"
          ? buildRatePoints(Number(rawValue))
          : buildPoints(normalizedValue),
    };
  });
}

export function buildBranchTrendChart(records: BranchNetworkRecord[]): BranchTrendChart {
  const scopedRecords = records.slice(0, 5);
  const primaryRecord = scopedRecords[0] ?? allBranchNetworkRecords[0];
  const baseInsights: TrendInsight[] = [
    {
      label: "Comparacion",
      value: `${scopedRecords.length} sedes`,
      note: "Puedes comparar hasta cinco sucursales y pasar sobre cada fecha para ver datos exactos.",
      tone: "neutral",
    },
    {
      label: "Mayor puntaje comparable",
      value: `${primaryRecord.city} ${primaryRecord.normalizedPerformanceScore}`,
      note: primaryRecord.recommendation,
      tone: primaryRecord.normalizedPerformanceScore >= 80 ? "positive" : "warning",
    },
    {
      label: "Accion",
      value: "Grupo comparable",
      note: "Evaluar contra red, grupo similar, mejor sucursal, periodo anterior y meta.",
      tone: "warning",
    },
  ];

  const metricOptions: TrendChartOption[] = [
    {
      id: "venta-neta-sucursal",
      label: "Venta neta",
      description:
        "Tendencia por sucursal con fecha exacta al pasar sobre cada punto.",
      yLabel: "USD",
      series: seriesForMetric(scopedRecords, "netSales", (record) =>
        formatCurrency(record.netSales),
      ),
      insights: baseInsights,
    },
    {
      id: "pacientes-sucursal",
      label: "Pacientes",
      description:
        "Pacientes por sucursal para detectar caidas de demanda o recuperacion.",
      yLabel: "Pacientes",
      series: seriesForMetric(scopedRecords, "patients", (record) =>
        record.patients.toLocaleString("en-US"),
      ),
      insights: baseInsights,
    },
    {
      id: "margen-sucursal",
      label: "Margen",
      description:
        "Margen por sucursal comparado con su evolucion diaria/semanal.",
      yLabel: "% margen",
      series: seriesForMetric(scopedRecords, "marginRate", (record) =>
        formatRate(record.marginRate),
      ),
      insights: baseInsights,
    },
    {
      id: "ocupacion-sucursal",
      label: "Ocupacion",
      description:
        "Ocupacion efectiva por sucursal para detectar saturacion o capacidad disponible.",
      yLabel: "% ocupacion",
      series: seriesForMetric(scopedRecords, "occupancyRate", (record) =>
        formatRate(record.occupancyRate),
      ),
      insights: baseInsights,
    },
    {
      id: "sla-sucursal",
      label: "SLA",
      description:
        "Cumplimiento de SLA por sucursal con comparacion exacta por fecha.",
      yLabel: "% SLA",
      series: seriesForMetric(scopedRecords, "slaRate", (record) =>
        formatRate(record.slaRate),
      ),
      insights: baseInsights,
    },
    {
      id: "score-sucursal",
      label: "Puntaje comparable",
      description:
        "Puntaje balanceado por meta, margen, capacidad, SLA, calidad y productividad.",
      yLabel: "Puntaje 0-100",
      series: seriesForMetric(scopedRecords, "normalizedPerformanceScore", (record) =>
        `${record.normalizedPerformanceScore}`,
      ),
      insights: baseInsights,
    },
  ];

  return {
    title: "Tendencia por sucursal",
    description:
      "Selecciona KPI, fechas y hasta cinco sucursales. Al pasar sobre una fecha se muestran los valores exactos.",
    xLabels: exactDateLabels,
    yLabel: metricOptions[0].yLabel,
    series: metricOptions[0].series,
    insights: metricOptions[0].insights,
    metricOptions,
  };
}
