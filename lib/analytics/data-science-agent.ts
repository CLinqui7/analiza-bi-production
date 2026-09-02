import {
  getManualMonthlyHistoryForLine,
  type ImportBusinessLine,
  type ManualMonthlyHistoryEntry,
} from "@/lib/analytics/import-operations";

export type DataScienceChartKind =
  | "bar-comparison"
  | "donut-mix"
  | "line-year"
  | "risk-scatter"
  | "waterfall-cost";

export type DataScienceKpiDomain =
  | "Calidad"
  | "Clientes"
  | "Financiero"
  | "Inventario"
  | "Operacion";

export type DataScienceRiskTone =
  | "critical"
  | "healthy"
  | "neutral"
  | "watch";

export type DataScienceUnit =
  | "count"
  | "currency"
  | "percent"
  | "score";

export type DataScienceMixSegment = {
  color: string;
  label: string;
  value: number;
};

export type DataScienceBreakdownItem = {
  label: string;
  tone: "negative" | "positive" | "neutral";
  value: number;
};

export type DataScienceScatterPoint = {
  branch: string;
  label: string;
  margin: number;
  risk: number;
  size: number;
  value: number;
};

export type DataScienceKpi = {
  chartKind: DataScienceChartKind;
  chartReason: string;
  currentValue: number;
  domain: DataScienceKpiDomain;
  id: string;
  insight: string;
  label: string;
  lastYearValue: number;
  mix: DataScienceMixSegment[];
  monthlyCurrent: number[];
  monthlyLastYear: number[];
  scatter: DataScienceScatterPoint[];
  sourceFields: string[];
  targetValue: number | null;
  trendLabel: string;
  unit: DataScienceUnit;
  warning: string;
};

export type DataSciencePrediction = {
  action: string;
  confidence: "Alta DEMO" | "Media DEMO" | "Baja DEMO";
  driver: string;
  forecast: string;
  id: string;
  title: string;
  value: string;
};

export type DataScienceKpiComparison = {
  id: string;
  leftLabel: string;
  leftValue: number;
  note: string;
  ratio: number;
  rightLabel: string;
  rightValue: number;
  tone: DataScienceRiskTone;
  unit: DataScienceUnit;
};

export type DataScienceSourceReadiness = {
  label: string;
  readiness: number;
  source: string;
  status: "Calculado DEMO" | "Listo DEMO" | "Pendiente";
};

export type DataScienceCockpit = {
  businessLine: ImportBusinessLine;
  chartRecommendationSummary: string;
  comparisons: DataScienceKpiComparison[];
  currentPeriod: string;
  demoFlag: true;
  headline: string;
  kpis: DataScienceKpi[];
  lastYearPeriod: string;
  predictions: DataSciencePrediction[];
  qualityGate: string;
  sourceReadiness: DataScienceSourceReadiness[];
  subtitle: string;
};

export const dataScienceMonthLabels = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

const lineLabels: Record<ImportBusinessLine, string> = {
  Consolidado: "Consolidado",
  Fisioterapia: "Fisioterapia",
  Imagenes: "Imagenes",
  Laboratorio: "Laboratorio",
};

function round(value: number, decimals = 0) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return sum(values) / values.length;
}

function latestEntries(entries: ManualMonthlyHistoryEntry[]) {
  const sortedPeriods = Array.from(new Set(entries.map((entry) => entry.period))).sort();
  const latestPeriod = sortedPeriods[sortedPeriods.length - 1] ?? "2026-07";
  const previousPeriod = sortedPeriods[sortedPeriods.length - 2] ?? "2026-06";

  return {
    latest: entries.filter((entry) => entry.period === latestPeriod),
    latestPeriod,
    previous: entries.filter((entry) => entry.period === previousPeriod),
    previousPeriod,
  };
}

function scaleSeries(finalValue: number, weights: number[]) {
  const lastWeight = weights[weights.length - 1] ?? 1;

  return weights.map((weight) => round((finalValue * weight) / lastWeight));
}

function buildCurrentSeries(finalValue: number, line: ImportBusinessLine) {
  const curves: Record<ImportBusinessLine, number[]> = {
    Consolidado: [0.66, 0.68, 0.7, 0.73, 0.77, 0.82, 0.88, 0.91, 0.94, 0.97, 1, 1.04],
    Fisioterapia: [0.72, 0.73, 0.77, 0.8, 0.83, 0.9, 0.96, 0.98, 1.01, 1.03, 1.06, 1.08],
    Imagenes: [0.7, 0.69, 0.73, 0.76, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.99, 1.01],
    Laboratorio: [0.64, 0.67, 0.69, 0.72, 0.76, 0.84, 0.92, 0.95, 0.98, 1.01, 1.04, 1.07],
  };

  return scaleSeries(finalValue, curves[line]);
}

function buildLastYearSeries(currentFinalValue: number, line: ImportBusinessLine) {
  const lineFactor: Record<ImportBusinessLine, number> = {
    Consolidado: 0.9,
    Fisioterapia: 0.94,
    Imagenes: 0.92,
    Laboratorio: 0.88,
  };

  return buildCurrentSeries(currentFinalValue * lineFactor[line], line);
}

function calculateLatestTotals(line: ImportBusinessLine) {
  const selectedLine = line === "Consolidado" ? "Todas" : line;
  const history = getManualMonthlyHistoryForLine(selectedLine);
  const { latest, latestPeriod, previous, previousPeriod } = latestEntries(history);
  const currentRevenue = sum(latest.map((entry) => entry.netRevenue));
  const targetRevenue = sum(latest.map((entry) => entry.revenueTarget));
  const activity = sum(latest.map((entry) => entry.activityVolume));
  const margin = average(latest.map((entry) => entry.grossMarginRate));
  const occupancy = average(latest.map((entry) => entry.effectiveOccupancyRate));
  const quality = average(latest.map((entry) => entry.dataQualityScore));
  const previousRevenue = sum(previous.map((entry) => entry.netRevenue));
  const previousActivity = sum(previous.map((entry) => entry.activityVolume));

  return {
    activity: activity || previousActivity * 1.04,
    currentRevenue: currentRevenue || previousRevenue * 1.05,
    latestPeriod,
    margin: margin || 38,
    occupancy: occupancy || 68,
    previousPeriod,
    previousRevenue,
    quality: quality || 78,
    targetRevenue: targetRevenue || currentRevenue * 1.05,
  };
}

export function selectChartForKpi(kpi: {
  domain: DataScienceKpiDomain;
  id: string;
  unit: DataScienceUnit;
}): DataScienceChartKind {
  if (kpi.id.includes("mix")) {
    return "donut-mix";
  }

  if (kpi.domain === "Inventario" || kpi.id.includes("cost")) {
    return "waterfall-cost";
  }

  if (kpi.domain === "Calidad") {
    return "risk-scatter";
  }

  if (kpi.unit === "percent" && !kpi.id.includes("margin")) {
    return "bar-comparison";
  }

  return "line-year";
}

function createKpi(
  input: Omit<DataScienceKpi, "chartKind" | "mix" | "scatter"> & {
    mix?: DataScienceMixSegment[];
    scatter?: DataScienceScatterPoint[];
  },
): DataScienceKpi {
  const kpiForChart = {
    domain: input.domain,
    id: input.id,
    unit: input.unit,
  };

  return {
    ...input,
    chartKind: selectChartForKpi(kpiForChart),
    mix: input.mix ?? [],
    scatter: input.scatter ?? [],
  };
}

function getLineSpecificFields(line: ImportBusinessLine) {
  if (line === "Laboratorio") {
    return {
      activityLabel: "Ordenes totales",
      costFields: [
        "lab_cost_of_sale",
        "lab_rent_expense",
        "lab_personnel_expense",
        "inventory_reactives_amount",
      ],
      customerFields: [
        "lab_total_clients",
        "lab_analiza_clients",
        "lab_drsv_clients",
      ],
      financialFields: [
        "lab_financial_target",
        "lab_total_sales",
        "lab_cost_of_sale",
      ],
      mixFields: [
        "lab_medical_order_sales",
        "lab_no_doctor_patient_sales",
        "lab_analiza_patient_sales",
        "lab_drsv_patient_sales",
        "lab_home_visit_sales",
      ],
      subtitle:
        "Lee venta, costo de venta, ordenes, clientes, gastos, inventario y Excel medico cargado por sucursal.",
    };
  }

  if (line === "Fisioterapia") {
    return {
      activityLabel: "Sesiones realizadas",
      costFields: ["direct_costs", "fixed_costs", "variable_costs"],
      customerFields: ["patients_total", "active_treatment_plans"],
      financialFields: ["revenue_target", "net_revenue", "direct_costs"],
      mixFields: ["appointments_completed", "appointments_no_show", "appointments_cancelled"],
      subtitle:
        "Lee sesiones, planes activos, capacidad efectiva, continuidad terapeutica y costo operativo.",
    };
  }

  if (line === "Imagenes") {
    return {
      activityLabel: "Estudios realizados",
      costFields: ["direct_costs", "maintenance_cost", "urgent_purchase_cost"],
      customerFields: ["patients_total", "reports_pending"],
      financialFields: ["revenue_target", "net_revenue", "maintenance_cost"],
      mixFields: ["imaging_studies", "reports_pending", "appointments_completed"],
      subtitle:
        "Lee estudios, equipos, informes pendientes, mantenimiento, capacidad y costos tecnicos.",
    };
  }

  return {
    activityLabel: "Volumen operativo",
    costFields: ["direct_costs", "fixed_costs", "variable_costs"],
    customerFields: ["patients_total", "lab_total_clients"],
    financialFields: ["revenue_target", "net_revenue", "lab_total_sales"],
    mixFields: ["linea_negocio", "sucursal", "servicio"],
    subtitle:
      "Vista regional para comparar lineas sin mezclar la interpretacion de cada negocio.",
  };
}

function buildLineMix(line: ImportBusinessLine, revenue: number): DataScienceMixSegment[] {
  if (line === "Laboratorio") {
    return [
      { color: "#4338ca", label: "Orden medica", value: round(revenue * 0.46) },
      { color: "#0f766e", label: "Paciente Analiza", value: round(revenue * 0.25) },
      { color: "#f59e0b", label: "DRSV", value: round(revenue * 0.18) },
      { color: "#db2777", label: "Domicilio", value: round(revenue * 0.11) },
    ];
  }

  if (line === "Fisioterapia") {
    return [
      { color: "#047857", label: "Plan activo", value: round(revenue * 0.52) },
      { color: "#2563eb", label: "Sesion individual", value: round(revenue * 0.31) },
      { color: "#f59e0b", label: "Reactivado", value: round(revenue * 0.17) },
    ];
  }

  if (line === "Imagenes") {
    return [
      { color: "#0369a1", label: "Rayos X", value: round(revenue * 0.34) },
      { color: "#7c3aed", label: "Ultrasonido", value: round(revenue * 0.29) },
      { color: "#0f766e", label: "Tomografia", value: round(revenue * 0.24) },
      { color: "#f97316", label: "Otros", value: round(revenue * 0.13) },
    ];
  }

  return [
    { color: "#4338ca", label: "Laboratorio", value: round(revenue * 0.42) },
    { color: "#047857", label: "Fisioterapia", value: round(revenue * 0.23) },
    { color: "#0369a1", label: "Imagenes", value: round(revenue * 0.35) },
  ];
}

function buildQualityScatter(line: ImportBusinessLine): DataScienceScatterPoint[] {
  const seeds: Record<ImportBusinessLine, DataScienceScatterPoint[]> = {
    Consolidado: [
      { branch: "Laboratorio", label: "LAB", margin: 36, risk: 72, size: 66, value: 54100 },
      { branch: "Imagenes", label: "IMG", margin: 39, risk: 68, size: 72, value: 64220 },
      { branch: "Fisioterapia", label: "FIS", margin: 46, risk: 58, size: 54, value: 35450 },
    ],
    Fisioterapia: [
      { branch: "Fisioterapia Norte", label: "FN", margin: 46, risk: 58, size: 66, value: 35450 },
      { branch: "Fisioterapia Centro", label: "FC", margin: 43, risk: 63, size: 50, value: 28400 },
      { branch: "Fisioterapia Sur", label: "FS", margin: 41, risk: 69, size: 44, value: 23100 },
    ],
    Imagenes: [
      { branch: "Imagenes Este", label: "IE", margin: 39, risk: 68, size: 70, value: 64220 },
      { branch: "Imagenes Centro", label: "IC", margin: 37, risk: 73, size: 56, value: 48200 },
      { branch: "Imagenes Sur", label: "IS", margin: 34, risk: 78, size: 48, value: 39500 },
    ],
    Laboratorio: [
      { branch: "Aguilares", label: "Ag", margin: 36, risk: 67, size: 72, value: 54100 },
      { branch: "Chalatenango", label: "Ch", margin: 34, risk: 74, size: 58, value: 42100 },
      { branch: "Santa Tecla", label: "ST", margin: 39, risk: 61, size: 64, value: 50800 },
      { branch: "Plaza Sur", label: "PS", margin: 32, risk: 79, size: 48, value: 37200 },
    ],
  };

  return seeds[line];
}

function riskToneForMargin(margin: number): DataScienceRiskTone {
  if (margin < 34) {
    return "critical";
  }

  if (margin < 40) {
    return "watch";
  }

  return "healthy";
}

export function getDataScienceCockpit(
  line: ImportBusinessLine,
): DataScienceCockpit {
  const totals = calculateLatestTotals(line);
  const fields = getLineSpecificFields(line);
  const revenueSeries = buildCurrentSeries(totals.currentRevenue, line);
  const lastYearRevenueSeries = buildLastYearSeries(totals.currentRevenue, line);
  const marginCurrent = round(totals.margin, 1);
  const marginLastYear = line === "Laboratorio" ? marginCurrent + 5 : marginCurrent - 2;
  const goalCompletion =
    totals.targetRevenue > 0 ? (totals.currentRevenue / totals.targetRevenue) * 100 : 0;
  const costOfSale = totals.currentRevenue * (1 - marginCurrent / 100);
  const activitySeries = buildCurrentSeries(totals.activity, line);
  const activityLastYearSeries = buildLastYearSeries(totals.activity, line);
  const dataQualitySeries = scaleSeries(totals.quality, [
    0.78,
    0.8,
    0.81,
    0.83,
    0.84,
    0.86,
    0.88,
    0.9,
    0.92,
    0.94,
    0.96,
    1,
  ]);
  const mix = buildLineMix(line, totals.currentRevenue);
  const sourceReadiness: DataScienceSourceReadiness[] = [
    {
      label: "Formulario mensual",
      readiness: 88,
      source: fields.financialFields.join(", "),
      status: "Listo DEMO",
    },
    {
      label: "Excel comercial",
      readiness: line === "Laboratorio" ? 74 : 45,
      source: line === "Laboratorio" ? "medical_exam_sales_file" : "pendiente por linea",
      status: line === "Laboratorio" ? "Listo DEMO" : "Pendiente",
    },
    {
      label: "Calidad automatica",
      readiness: round(totals.quality),
      source: "AnaliA valida duplicados, outliers, totales y fechas",
      status: "Calculado DEMO",
    },
  ];
  const kpis: DataScienceKpi[] = [
    createKpi({
      chartReason:
        "Serie de lineas porque venta debe leerse por tendencia, ano contra ano y meta.",
      currentValue: totals.currentRevenue,
      domain: "Financiero",
      id: "total_revenue",
      insight:
        "La venta se interpreta por linea de negocio y no como suma ciega. El foco es si crece con margen sano.",
      label: "Venta total",
      lastYearValue: lastYearRevenueSeries[lastYearRevenueSeries.length - 1] ?? 0,
      monthlyCurrent: revenueSeries,
      monthlyLastYear: lastYearRevenueSeries,
      sourceFields: fields.financialFields,
      targetValue: totals.targetRevenue,
      trendLabel: `${lineLabels[line]} ${totals.latestPeriod}`,
      unit: "currency",
      warning:
        goalCompletion < 95
          ? "Debajo de meta; revisar causa antes de subir meta."
          : "Crecimiento sano si costo y calidad sostienen el resultado.",
    }),
    createKpi({
      chartReason:
        "Barras contra meta porque el cumplimiento se decide contra un umbral claro.",
      currentValue: round(goalCompletion, 1),
      domain: "Financiero",
      id: "goal_completion",
      insight:
        "Este KPI dice si la sucursal esta cerca de meta; AnaliA evita aprobar bonos si faltan fuentes.",
      label: "Meta vs resultado",
      lastYearValue: 92,
      monthlyCurrent: scaleSeries(goalCompletion, [0.72, 0.74, 0.76, 0.8, 0.84, 0.89, 0.93, 0.95, 0.97, 0.99, 1, 1.02]),
      monthlyLastYear: scaleSeries(92, [0.75, 0.76, 0.78, 0.81, 0.84, 0.87, 0.89, 0.9, 0.91, 0.93, 0.96, 1]),
      sourceFields: ["revenueTarget", ...fields.financialFields],
      targetValue: 100,
      trendLabel: "Cumplimiento mensual",
      unit: "percent",
      warning:
        goalCompletion >= 100
          ? "Cumple meta; revisar margen antes de celebrar."
          : "Falta cerrar brecha contra meta aprobada.",
    }),
    createKpi({
      chartReason:
        "Serie de lineas porque margen debe compararse con el mismo mes del ano anterior.",
      currentValue: marginCurrent,
      domain: "Financiero",
      id: "gross_margin",
      insight:
        "El margen explica si el crecimiento deja utilidad o si se consume por costos, reactivos o mezcla.",
      label: "Margen calculado",
      lastYearValue: marginLastYear,
      monthlyCurrent: scaleSeries(marginCurrent, [0.92, 0.94, 0.95, 0.96, 0.98, 1.01, 1, 1.02, 1.01, 1, 0.99, 1]),
      monthlyLastYear: scaleSeries(marginLastYear, [0.96, 0.97, 0.98, 1, 1.01, 1.02, 1.01, 1.02, 1.03, 1.02, 1.01, 1]),
      sourceFields: ["lab_total_sales", "lab_cost_of_sale", "direct_costs"],
      targetValue: 40,
      trendLabel: "Margen ano contra ano",
      unit: "percent",
      warning:
        marginCurrent < marginLastYear
          ? "Margen menor que ano anterior; revisar costos y mezcla."
          : "Margen mejora; validar que la fuente de costos este completa.",
    }),
    createKpi({
      chartReason:
        "Serie de lineas porque volumen necesita tendencia y comparacion con la demanda historica.",
      currentValue: totals.activity,
      domain: "Operacion",
      id: "activity_volume",
      insight:
        "El volumen explica si la venta crece por mas actividad o por ticket/mix.",
      label: fields.activityLabel,
      lastYearValue: activityLastYearSeries[activityLastYearSeries.length - 1] ?? 0,
      monthlyCurrent: activitySeries,
      monthlyLastYear: activityLastYearSeries,
      sourceFields: ["lab_total_orders", "therapy_sessions", "imaging_studies"],
      targetValue: totals.activity * 1.06,
      trendLabel: "Volumen operativo",
      unit: "count",
      warning:
        totals.activity > (activityLastYearSeries[activityLastYearSeries.length - 1] ?? 0)
          ? "Hay mas actividad que ano anterior; vigilar capacidad y calidad."
          : "Demanda menor; revisar canales, referidores o agenda.",
    }),
    createKpi({
      chartReason:
        "Dona porque el mix se decide por participacion de origen, no por una sola linea.",
      currentValue: sum(mix.map((segment) => segment.value)),
      domain: "Clientes",
      id: "demand_mix",
      insight:
        "El mix muestra de donde viene la venta y si depende demasiado de un canal.",
      label: "Mix de demanda",
      lastYearValue: sum(mix.map((segment) => segment.value)) * 0.91,
      mix,
      monthlyCurrent: revenueSeries,
      monthlyLastYear: lastYearRevenueSeries,
      sourceFields: fields.mixFields,
      targetValue: null,
      trendLabel: "Participacion por origen",
      unit: "currency",
      warning:
        "Si un origen cae, AnaliA compara venta, ordenes, ticket y gerente responsable.",
    }),
    createKpi({
      chartReason:
        "Cascada porque muestra como venta, costo de venta y gastos explican la contribucion.",
      currentValue: costOfSale,
      domain: "Inventario",
      id: "cost_to_sale",
      insight:
        "El costo debe leerse contra venta y volumen; un monto alto sin mas ordenes es alerta.",
      label: line === "Laboratorio" ? "Costo de venta e inventario" : "Costo operativo",
      lastYearValue: costOfSale * 0.86,
      monthlyCurrent: buildCurrentSeries(costOfSale, line),
      monthlyLastYear: buildLastYearSeries(costOfSale, line),
      sourceFields: fields.costFields,
      targetValue: totals.currentRevenue * 0.6,
      trendLabel: "Puente de costo",
      unit: "currency",
      warning:
        costOfSale / Math.max(totals.currentRevenue, 1) > 0.65
          ? "Costo presiona margen; revisar inventario, compras urgentes y mix."
          : "Costo dentro de rango demo; validar soporte del cierre.",
    }),
    createKpi({
      chartReason:
        "Dispersion porque calidad se evalua por sucursal: riesgo, margen y tamano del cierre.",
      currentValue: totals.quality,
      domain: "Calidad",
      id: "data_quality_risk",
      insight:
        "AnaliA bloquea lectura concluyente si faltan archivos, totales o autorizaciones de edicion.",
      label: "Calidad y riesgo",
      lastYearValue: Math.max(50, totals.quality - 6),
      monthlyCurrent: dataQualitySeries,
      monthlyLastYear: scaleSeries(totals.quality - 6, [0.82, 0.83, 0.84, 0.86, 0.87, 0.9, 0.92, 0.93, 0.94, 0.96, 0.98, 1]),
      scatter: buildQualityScatter(line),
      sourceFields: ["medical_exam_sales_file", "sourceTrace", "createdAt", ...fields.customerFields],
      targetValue: 90,
      trendLabel: "Puntaje de calidad",
      unit: "score",
      warning:
        totals.quality < 85
          ? "Revisar datos sospechosos antes de tomar decision ejecutiva."
          : "Calidad suficiente para lectura demo; aun requiere validacion real.",
    }),
  ];
  const comparisons: DataScienceKpiComparison[] = [
    {
      id: "revenue-vs-cost",
      leftLabel: "Venta",
      leftValue: totals.currentRevenue,
      note: "Si el costo crece mas rapido que la venta, el margen se deteriora.",
      ratio: round((costOfSale / Math.max(totals.currentRevenue, 1)) * 100, 1),
      rightLabel: "Costo venta",
      rightValue: costOfSale,
      tone: costOfSale / Math.max(totals.currentRevenue, 1) > 0.65 ? "watch" : "healthy",
      unit: "currency",
    },
    {
      id: "revenue-vs-target",
      leftLabel: "Resultado",
      leftValue: totals.currentRevenue,
      note: "Compara avance real contra meta final aprobada.",
      ratio: round(goalCompletion, 1),
      rightLabel: "Meta",
      rightValue: totals.targetRevenue,
      tone: goalCompletion >= 100 ? "healthy" : goalCompletion >= 94 ? "watch" : "critical",
      unit: "currency",
    },
    {
      id: "quality-vs-risk",
      leftLabel: "Calidad",
      leftValue: totals.quality,
      note: "Mayor calidad reduce riesgo de insight falso.",
      ratio: round(100 - totals.quality, 1),
      rightLabel: "Riesgo",
      rightValue: 100 - totals.quality,
      tone: totals.quality >= 85 ? "healthy" : "watch",
      unit: "score",
    },
  ];
  const nextMonthRevenue =
    revenueSeries[revenueSeries.length - 1] ?? totals.currentRevenue;
  const priorMonthRevenue = revenueSeries[revenueSeries.length - 2] ?? nextMonthRevenue;
  const conservativeForecast = nextMonthRevenue + (nextMonthRevenue - priorMonthRevenue) * 0.55;
  const predictions: DataSciencePrediction[] = [
    {
      action:
        "Validar costo de venta, Excel comercial y fuente de ordenes antes de aprobar estrategia.",
      confidence: totals.quality >= 85 ? "Alta DEMO" : "Media DEMO",
      driver:
        line === "Laboratorio"
          ? "Venta, costo de venta, ordenes, clientes e inventario manual."
          : "Ingreso, volumen, capacidad y costo operativo manual.",
      forecast: `${round(((conservativeForecast - nextMonthRevenue) / Math.max(nextMonthRevenue, 1)) * 100, 1)}%`,
      id: "forecast-next-month",
      title: "Prediccion conservadora proximo mes",
      value: String(round(conservativeForecast)),
    },
    {
      action:
        "Separar alertas por causa: meta, costo, demanda, inventario o calidad de datos.",
      confidence: "Media DEMO",
      driver: "Comparacion ano contra ano y formularios mensuales historicos.",
      forecast:
        marginCurrent < marginLastYear ? "Riesgo de margen" : "Margen estable",
      id: "margin-risk",
      title: "Riesgo predictivo de margen",
      value: `${round(marginCurrent - marginLastYear, 1)} pts`,
    },
  ];

  return {
    businessLine: line,
    chartRecommendationSummary:
      "AnaliA elige lineas para tendencia, barras para meta, dona para mix, cascada para costo y dispersion para riesgo.",
    comparisons,
    currentPeriod: totals.latestPeriod,
    demoFlag: true,
    headline: `Cockpit predictivo ${lineLabels[line]}`,
    kpis,
    lastYearPeriod: totals.latestPeriod.replace("2026", "2025"),
    predictions,
    qualityGate:
      totals.quality >= 85
        ? "Lectura permitida como DEMO; validar fuentes reales antes de decisiones."
        : "Lectura con cautela: faltan fuentes o hay riesgo de datos sospechosos.",
    sourceReadiness,
    subtitle: fields.subtitle,
  };
}

export function getPrimaryDataScienceRiskTone(
  cockpit: DataScienceCockpit,
): DataScienceRiskTone {
  const marginKpi = cockpit.kpis.find((kpi) => kpi.id === "gross_margin");

  if (!marginKpi) {
    return "neutral";
  }

  return riskToneForMargin(marginKpi.currentValue);
}
