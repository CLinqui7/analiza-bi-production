import {
  formatCurrency,
  formatRate,
} from "./el-salvador-result-templates.ts";
import {
  formatKpiValue,
  getKpiStatusLabel,
  kpiRegistry,
  type BusinessLineCode,
} from "./kpi-registry.ts";

export const allInsightOption = "Todos";

export const insightBusinessLines = [
  "Consolidado",
  "Laboratorio",
  "Fisioterapia",
  "Imagenes",
] as const;

export type InsightBusinessLine = (typeof insightBusinessLines)[number];

export const insightCategories = [
  "Finanzas",
  "Operacion",
  "Pacientes",
  "Capacidad",
  "Calidad",
  "Datos",
  "Personas",
  "Comercial",
  "Inventario",
  "Equipos",
  "Cumplimiento",
] as const;

export type InsightCategory = (typeof insightCategories)[number];

export const insightTypes = [
  "Anomalia",
  "Riesgo",
  "Oportunidad",
  "Prediccion",
  "Incumplimiento",
  "Tendencia",
  "Comparacion",
  "Calidad de datos",
  "Capacidad",
  "Perdida financiera",
  "Hallazgo comercial",
  "Hallazgo operativo",
] as const;

export type InsightType = (typeof insightTypes)[number];

export const insightPriorities = ["Critica", "Alta", "Media", "Baja"] as const;
export type InsightPriority = (typeof insightPriorities)[number];

export const insightStatuses = [
  "Detectado",
  "Pendiente de revision",
  "Validado",
  "Accion creada",
  "En curso",
  "Bloqueado",
  "Resuelto",
  "No aplicable",
  "Descartado",
  "Reabierto",
] as const;

export type InsightStatus = (typeof insightStatuses)[number];

export const actionStatuses = [
  "Borrador",
  "Asignada",
  "Aceptada",
  "En curso",
  "Bloqueada",
  "En validacion",
  "Completada",
  "Cancelada",
  "Vencida",
  "Reabierta",
] as const;

export type InsightActionStatus = (typeof actionStatuses)[number];

export const insightDataSources = [
  "Dato demo",
  "Pendiente de conexion de datos",
  "Plantilla",
  "Conector",
  "KPI calculado",
  "Presentacion gerencial",
  "Comentario gerencial",
] as const;

export type InsightDataSource = (typeof insightDataSources)[number];

export type InsightDataQualityStatus =
  | "Dato demo"
  | "Dato real"
  | "Dato estimado"
  | "Pendiente de conexion de datos"
  | "Requiere conciliacion"
  | "Datos incompletos";

export type InsightImpactType =
  | "Financiero"
  | "Operativo"
  | "Pacientes"
  | "Capacidad"
  | "Calidad"
  | "Comercial"
  | "Personas"
  | "Cumplimiento";

export type InsightCause = {
  description: string;
  type:
    | "Causa confirmada"
    | "Causa probable"
    | "Correlacion detectada"
    | "Informacion insuficiente";
};

export type InsightEvidence = {
  absolute_variation: string;
  current_result: string;
  data_quality: InsightDataQualityStatus;
  demo_flag: boolean;
  kpi: string;
  period_previous: string;
  percent_variation: string;
  source: string;
  target: string;
  updated_at: string;
};

export type InsightRecommendation = {
  action: string;
  expected_impact: string;
  expected_kpi: string;
  owner: string;
  risk_of_inaction: string;
  suggested_due_date: string;
};

export type InsightModel = {
  id: string;
  title: string;
  summary: string;
  category: InsightCategory;
  insight_type: InsightType;
  priority: InsightPriority;
  status: InsightStatus;
  country_id: string;
  company_id: string;
  business_line: InsightBusinessLine;
  branch_id: string;
  branch_name: string;
  manager_id: string;
  period_start: string;
  period_end: string;
  detected_at: string;
  updated_at: string;
  source_modules: string[];
  source_records: string[];
  source_templates: string[];
  affected_kpis: {
    current: string;
    kpi_id: string;
    label: string;
    variation: string;
  }[];
  evidence: InsightEvidence[];
  impact_type: InsightImpactType;
  financial_impact: number;
  patient_impact: number;
  operational_impact: string;
  confidence: number;
  confidence_reason: string;
  confirmed_causes: string[];
  probable_causes: string[];
  assumptions: string[];
  recommended_actions: InsightRecommendation[];
  suggested_owner: string;
  suggested_due_date: string;
  related_action_ids: string[];
  related_insight_ids: string[];
  related_dashboard_link: string;
  data_quality_status: InsightDataQualityStatus;
  demo_flag: boolean;
  created_by: string;
  validated_by: string | null;
  resolved_at: string | null;
  resolution_result: string | null;
  audit_metadata: {
    filters_snapshot: string[];
    formulas: string[];
    last_function_run: string;
    model_or_rule_version: string;
    permission_scope: string;
    source_version: string;
  };
};

export type InsightAction = {
  id: string;
  title: string;
  description: string;
  origin_insight_id: string;
  responsible: string;
  team: string;
  start_date: string;
  due_date: string;
  affected_kpi: string;
  expected_result: string;
  expected_impact: string;
  priority: InsightPriority;
  evidence_required: string;
  status: InsightActionStatus;
  comments: string[];
  blockers: string[];
  actual_result: string;
  close_date: string | null;
  impact_status:
    | "Impacto validado"
    | "Impacto parcial"
    | "Sin impacto"
    | "No medible todavia";
  financial_impact: number;
  operational_impact: string;
  patients_recovered: number;
  capacity_recovered: string;
  demo_flag: boolean;
};

export type InsightFilters = {
  branch: string;
  category: string;
  company: string;
  country: string;
  businessLine: string;
  manager: string;
  period: string;
  priority: string;
  responsible: string;
  sourceData: string;
  status: string;
};

export type InsightExecutiveCard = {
  filter: Partial<InsightFilters>;
  id: string;
  label: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
  value: string;
};

export type ImpactUrgencyPoint = {
  branch: string;
  id: string;
  impactScore: number;
  label: string;
  priority: InsightPriority;
  size: number;
  type: InsightType;
  urgencyScore: number;
};

export type CategoryImpactPoint = {
  category: InsightCategory;
  count: number;
  financialImpact: number;
  patientImpact: number;
};

export type InsightTrendPoint = {
  actions: number;
  label: string;
  newInsights: number;
  reopened: number;
  resolved: number;
  validated: number;
  overdue: number;
};

export type BranchAlertRanking = {
  actionsOverdue: number;
  branch: string;
  criticalInsights: number;
  estimatedImpact: number;
  opportunities: number;
  risks: number;
};

export type ActionFunnelPoint = {
  label: string;
  value: number;
};

export type FinancialWaterfallPoint = {
  label: string;
  tone: "negative" | "positive" | "neutral";
  value: number;
};

export type DataScienceModelType =
  | "Exploratorio"
  | "Descriptivo"
  | "Predictivo";

export type DataScienceModelStatus =
  | "Activo DEMO"
  | "Listo para backend"
  | "Pendiente de datos";

export type AnaliaDataScienceModel = {
  businessLine: InsightBusinessLine;
  dataQualityGate: InsightDataQualityStatus;
  id: string;
  lastRunAt: string;
  method: string;
  output: string;
  owner: string;
  signal: string;
  status: DataScienceModelStatus;
  title: string;
  traceability: string[];
  type: DataScienceModelType;
};

export type EarlyWarningSeverity =
  | "Critica"
  | "Alta"
  | "Media"
  | "Baja";

export type EarlyWarningStatus =
  | "Actuar ahora"
  | "Revisar hoy"
  | "Monitorear"
  | "Esperando datos";

export type EarlyWarningIndicator = {
  action: string;
  businessLine: InsightBusinessLine;
  confidence: number;
  current: string;
  dataQuality: InsightDataQualityStatus;
  driver: string;
  horizon: string;
  id: string;
  indicator: string;
  linkedInsightId: string;
  modelIds: string[];
  owner: string;
  previous: string;
  riskScore: number;
  route: string;
  severity: EarlyWarningSeverity;
  status: EarlyWarningStatus;
  target: string;
  trend: number[];
};

export type AnaliaMonitoringCycle = {
  checkedAt: string;
  description: string;
  id: string;
  nextRunAt: string;
  outputs: string[];
  scope: string;
  status: "Activo DEMO" | "Pausado" | "Pendiente de conexion";
};

export type InsightKpiCatalogItem = {
  business_line: BusinessLineCode;
  critical_threshold: number | null;
  data_quality_rules: string[];
  demo_flag: boolean;
  description: string;
  dimensions: string[];
  drilldown_route: string;
  formula: string;
  frequency: string;
  id: string;
  label: string;
  module: string;
  owner: string;
  source: string;
  target_type: string;
  unit: string;
  warning_threshold: number | null;
};

export type InternalInsightTool = {
  id: string;
  description: string;
  permission: string;
  status: "Mock demo" | "Listo para backend" | "Pendiente de conexion";
};

export type DemoAiResponse = {
  actionDraft?: InsightAction;
  answer: string;
  assumptions: string[];
  confidence: number;
  directAnswer: string;
  evidence: string[];
  filtersUsed: string[];
  interpretation: string;
  limitations: string[];
  mode: "Consultar" | "Analizar" | "Simular" | "Actuar";
  possibleCauses: InsightCause[];
  recommendedAction: string;
  relatedLinks: { href: string; label: string }[];
  sources: string[];
  table: {
    columns: string[];
    rows: string[][];
  };
};

const countryElSalvador = "30000000-0000-4000-8000-000000000003";
const countryRegional = "__regional__";
const companyConsolidated = "__consolidated__";
const companyPhysio = "40000000-0000-4000-8000-000000000001";
const companyLab = "40000000-0000-4000-8000-000000000002";
const companyImaging = "40000000-0000-4000-8000-000000000003";

function sourceRecord(label: string, isPending = false) {
  return isPending ? "Pendiente de conexion de datos" : label;
}

export const insightRuleRegistry = [
  {
    id: "rule-financial-margin-deterioration",
    kpiCode: "CORP_NET_REVENUE",
    label: "Venta sube y utilidad cae",
    severity: "Critica",
    source: "Registro central de KPIs + salud financiera",
    threshold: "margen cae mas de 2 puntos con venta positiva",
  },
  {
    id: "rule-physio-effective-occupancy-gap",
    kpiCode: "PHYSIO_REAL_OCCUPANCY",
    label: "Ocupacion agendada versus efectiva",
    severity: "Alta",
    source: "Registro central de KPIs + agenda fisioterapia",
    threshold: "ocupacion real bajo umbral amarillo del KPI",
  },
  {
    id: "rule-lab-ticket-volume-divergence",
    kpiCode: "LAB_ORDERS_TOTAL",
    label: "Venta crece mientras volumen baja",
    severity: "Alta",
    source: "Plantilla laboratorio + ventas",
    threshold: "venta positiva con ordenes negativas",
  },
  {
    id: "rule-imaging-capacity-pending",
    kpiCode: "IMG_EQUIPMENT_UTILIZATION",
    label: "Rentabilidad no validable por falta de equipos/SLA",
    severity: "Media",
    source: "Registro central de KPIs",
    threshold: "dataStatus NOT_CONNECTED o PENDING_UPLOAD",
  },
];

export const insightKpiCatalog: InsightKpiCatalogItem[] = kpiRegistry.map((kpi) => ({
  business_line: kpi.businessLine,
  critical_threshold: kpi.thresholdRed,
  data_quality_rules: kpi.requiredFields.map(
    (field) => `Campo requerido: ${field}`,
  ),
  demo_flag: kpi.dataStatus === "DEMO" || kpi.sourceType === "DEMO",
  description: kpi.description,
  dimensions: kpi.dimensions,
  drilldown_route: kpi.drillDownRoute,
  formula: kpi.formula,
  frequency: kpi.updateFrequency,
  id: kpi.id,
  label: kpi.name,
  module: kpi.category,
  owner: kpi.owner,
  source: kpi.source,
  target_type: kpi.higherIsBetter ? "Mayor es mejor" : "Menor es mejor",
  unit: kpi.unit,
  warning_threshold: kpi.thresholdYellow,
}));

export const internalInsightTools: InternalInsightTool[] = [
  {
    id: "get_kpi",
    description: "Consulta definicion, formula, fuente, calidad y ruta del KPI.",
    permission: "Respeta allowedRoles del registro central.",
    status: "Listo para backend",
  },
  {
    id: "compare_periods",
    description: "Compara KPI contra periodo anterior o mismo periodo del ano anterior.",
    permission: "Solo sobre agregados permitidos.",
    status: "Mock demo",
  },
  {
    id: "list_active_insights",
    description: "Lista hallazgos filtrados por linea, sucursal, estado y prioridad.",
    permission: "Usa filtros y rol activo.",
    status: "Mock demo",
  },
  {
    id: "get_data_quality_issues",
    description: "Devuelve diferencias de plantillas, conectores y formulas.",
    permission: "Auditoria y datos segun rol.",
    status: "Mock demo",
  },
  {
    id: "simulate_scenario",
    description: "Calcula escenarios sin modificar datos fuente.",
    permission: "Solo lectura y etiqueta Simulacion.",
    status: "Mock demo",
  },
  {
    id: "create_action_draft",
    description: "Prepara borrador de accion; exige confirmacion para crearla.",
    permission: "No ejecuta cambios sensibles automaticamente.",
    status: "Mock demo",
  },
  {
    id: "search_documents",
    description: "Busca plantillas, presentaciones gerenciales, minutas y acuerdos.",
    permission: "No permite que comentarios reemplacen KPIs oficiales.",
    status: "Pendiente de conexion",
  },
];

export const analiaDataScienceModels: AnaliaDataScienceModel[] = [
  {
    businessLine: "Consolidado",
    dataQualityGate: "Requiere conciliacion",
    id: "analia-model-consolidated-margin-eda",
    lastRunAt: "2026-07-23T08:00:00-06:00",
    method: "Analisis exploratorio de dispersion venta, margen, utilidad y gastos.",
    output: "Detecta lineas donde crecimiento de venta no explica margen.",
    owner: "AnaliA Data Science",
    signal: "Venta sube y utilidad cae",
    status: "Activo DEMO",
    title: "Exploracion de rentabilidad consolidada",
    traceability: ["Resumen ejecutivo DEMO", "Salud financiera DEMO", "Metas DEMO"],
    type: "Exploratorio",
  },
  {
    businessLine: "Laboratorio",
    dataQualityGate: "Requiere conciliacion",
    id: "analia-model-lab-ticket-bridge",
    lastRunAt: "2026-07-23T08:05:00-06:00",
    method: "Descomposicion descriptiva entre volumen, ticket, canal y mezcla.",
    output: "Explica si la venta cambia por ordenes, precio o composicion de pruebas.",
    owner: "AnaliA Data Science",
    signal: "Venta crece con menos ordenes",
    status: "Activo DEMO",
    title: "Puente de venta y ticket de laboratorio",
    traceability: ["Plantilla Julio 2026 Aguilares.xlsx", "YTD", "Evaluacion"],
    type: "Descriptivo",
  },
  {
    businessLine: "Fisioterapia",
    dataQualityGate: "Dato demo",
    id: "analia-model-physio-occupancy-forecast",
    lastRunAt: "2026-07-23T08:10:00-06:00",
    method: "Pronostico de ocupacion efectiva con no-show, cancelaciones y capacidad.",
    output: "Anticipa brecha de sesiones y capacidad perdida por sucursal.",
    owner: "AnaliA Data Science",
    signal: "Ocupacion efectiva debajo de meta",
    status: "Activo DEMO",
    title: "Pronostico de ocupacion efectiva de fisioterapia",
    traceability: ["Agenda fisioterapia DEMO", "Capacidad y ocupacion", "Citas por negocio"],
    type: "Predictivo",
  },
  {
    businessLine: "Imagenes",
    dataQualityGate: "Pendiente de conexion de datos",
    id: "analia-model-imaging-sla-equipment",
    lastRunAt: "2026-07-23T08:15:00-06:00",
    method: "Deteccion exploratoria de brechas entre demanda, equipos y SLA.",
    output: "Marca alertas cuando falta fuente para explicar rentabilidad por modalidad.",
    owner: "AnaliA Data Science",
    signal: "Rentabilidad no validable por falta de equipo/SLA",
    status: "Pendiente de datos",
    title: "Exploracion de capacidad y SLA de imagenes",
    traceability: ["Imagenes DEMO", "Equipos pendiente", "SLA pendiente"],
    type: "Exploratorio",
  },
  {
    businessLine: "Laboratorio",
    dataQualityGate: "Dato demo",
    id: "analia-model-lab-inventory-anomaly",
    lastRunAt: "2026-07-23T08:20:00-06:00",
    method: "Deteccion predictiva de consumo de reactivos vs ordenes esperadas.",
    output: "Anticipa riesgo de compras urgentes o consumo fuera de tendencia.",
    owner: "AnaliA Data Science",
    signal: "Reactivos crecen mas que ordenes",
    status: "Activo DEMO",
    title: "Alerta predictiva de inventario de laboratorio",
    traceability: ["Inventario DEMO", "Ordenes laboratorio DEMO"],
    type: "Predictivo",
  },
];

export const analiaMonitoringCycles: AnaliaMonitoringCycle[] = [
  {
    checkedAt: "2026-07-23T08:20:00-06:00",
    description:
      "AnaliA revisa KPIs, plantillas, calidad de datos, acciones y cambios de periodo para actualizar Insights.",
    id: "analia-cycle-early-warning",
    nextRunAt: "Cada 6 horas en backend; DEMO cada vez que se abre Insights.",
    outputs: [
      "Alertas tempranas por linea",
      "Insights priorizados",
      "Acciones sugeridas",
      "Preguntas sugeridas",
      "Auditoria de fuentes",
    ],
    scope: "El Salvador / Analiza / lineas de negocio",
    status: "Activo DEMO",
  },
  {
    checkedAt: "2026-07-23T08:20:00-06:00",
    description:
      "Cuando falten conectores, AnaliA crea alerta de datos pendientes en vez de inventar resultado.",
    id: "analia-cycle-data-quality",
    nextRunAt: "Al cargar plantilla o cambiar conector",
    outputs: [
      "Bloqueos de calidad",
      "Advertencias de conciliacion",
      "Fuentes faltantes",
    ],
    scope: "Plantillas, CRM, agenda, facturacion e inventario",
    status: "Pendiente de conexion",
  },
];

export const earlyWarningIndicators: EarlyWarningIndicator[] = [
  {
    action: "Conciliar venta, gastos y utilidad antes del resumen ejecutivo.",
    businessLine: "Consolidado",
    confidence: 72,
    current: "+8.2% venta / -6.4% utilidad",
    dataQuality: "Requiere conciliacion",
    driver: "Los costos y gastos crecen mas rapido que la venta.",
    horizon: "Cierre mensual",
    id: "early-consolidated-margin",
    indicator: "Margen operativo consolidado",
    linkedInsightId: "ins-consolidated-profit-gap",
    modelIds: ["analia-model-consolidated-margin-eda"],
    owner: "Finanzas Analiza",
    previous: "Mayo 2026",
    riskScore: 92,
    route: "/protected/finanzas",
    severity: "Critica",
    status: "Actuar ahora",
    target: "Venta y utilidad deben crecer con margen estable",
    trend: [64, 68, 72, 76, 83, 92],
  },
  {
    action: "Separar efecto volumen, ticket, canal y mezcla de pruebas.",
    businessLine: "Laboratorio",
    confidence: 86,
    current: "+21% venta / -7.2% ordenes",
    dataQuality: "Requiere conciliacion",
    driver: "El ticket aumenta mientras cae el volumen operativo.",
    horizon: "7 dias",
    id: "early-lab-ticket-volume",
    indicator: "Venta, ordenes y ticket",
    linkedInsightId: "ins-lab-ticket-orders",
    modelIds: ["analia-model-lab-ticket-bridge"],
    owner: "Gerencia operaciones Laboratorio",
    previous: "Mayo 2026",
    riskScore: 84,
    route: "/protected/laboratorio",
    severity: "Alta",
    status: "Revisar hoy",
    target: "Crecimiento explicado por volumen, ticket y margen",
    trend: [48, 52, 60, 67, 74, 84],
  },
  {
    action: "Activar confirmacion escalonada y lista de espera por franja horaria.",
    businessLine: "Fisioterapia",
    confidence: 84,
    current: "61% ocupacion efectiva",
    dataQuality: "Dato demo",
    driver: "No-show y cancelaciones reducen sesiones efectivas.",
    horizon: "14 dias",
    id: "early-physio-occupancy",
    indicator: "Ocupacion efectiva",
    linkedInsightId: "ins-physio-occupancy-gap",
    modelIds: ["analia-model-physio-occupancy-forecast"],
    owner: "Gerencia operaciones Fisioterapia",
    previous: "Mayo 2026",
    riskScore: 78,
    route: "/protected/capacidad",
    severity: "Alta",
    status: "Revisar hoy",
    target: "86%",
    trend: [55, 58, 61, 66, 72, 78],
  },
  {
    action: "Conectar equipos y SLA antes de evaluar rentabilidad por modalidad.",
    businessLine: "Imagenes",
    confidence: 58,
    current: "Fuente de equipos/SLA pendiente",
    dataQuality: "Pendiente de conexion de datos",
    driver: "No se puede validar si el crecimiento viene de capacidad, precio o agenda.",
    horizon: "Siguiente carga",
    id: "early-imaging-data-source",
    indicator: "Rentabilidad por modalidad",
    linkedInsightId: "ins-img-telemedicine-profitability",
    modelIds: ["analia-model-imaging-sla-equipment"],
    owner: "Gerencia operaciones Imagenes",
    previous: "Sin fuente validada",
    riskScore: 68,
    route: "/protected/imagenes",
    severity: "Media",
    status: "Esperando datos",
    target: "Equipo, modalidad y SLA conectados",
    trend: [68, 68, 68, 68, 68, 68],
  },
  {
    action: "Revisar consumo de reactivos contra ordenes y pruebas de bajo rendimiento.",
    businessLine: "Laboratorio",
    confidence: 74,
    current: "+22.8% reactivos",
    dataQuality: "Dato demo",
    driver: "Inventario crece mas rapido que ordenes proyectadas.",
    horizon: "21 dias",
    id: "early-lab-inventory",
    indicator: "Reactivos e inventario",
    linkedInsightId: "ins-lab-reactives-gap",
    modelIds: ["analia-model-lab-inventory-anomaly"],
    owner: "Compras e inventario Laboratorio",
    previous: "Mayo 2026",
    riskScore: 73,
    route: "/protected/laboratorio",
    severity: "Media",
    status: "Monitorear",
    target: "Consumo alineado a volumen y mix",
    trend: [41, 45, 52, 59, 66, 73],
  },
];

export const demoInsights: InsightModel[] = [
  {
    affected_kpis: [
      {
        current: "+8.2% venta / -6.4% utilidad",
        kpi_id: "kpi-corp-net-revenue",
        label: "Venta neta y utilidad operativa",
        variation: "brecha de 14.6 puntos",
      },
    ],
    assumptions: [
      "Los gastos operativos se mantienen en estado demo hasta conectar contabilidad.",
      "La utilidad no debe usarse como oficial sin conciliacion financiera.",
    ],
    audit_metadata: {
      filters_snapshot: ["Vista regional", "Consolidado", "Junio 2026"],
      formulas: ["margen_operativo = utilidad_operativa / venta_neta"],
      last_function_run: "compare_periods",
      model_or_rule_version: "rules-demo-v1",
      permission_scope: "CEO / Webmaster",
      source_version: "demo-finance-2026-07-21",
    },
    branch_id: "__all__",
    branch_name: "Consolidado regional",
    business_line: "Consolidado",
    category: "Finanzas",
    company_id: companyConsolidated,
    confidence: 72,
    confidence_reason:
      "La venta demo esta disponible, pero gastos y utilidad requieren conciliacion contable.",
    confirmed_causes: ["Costos directos crecen mas rapido que la venta neta."],
    country_id: countryRegional,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Requiere conciliacion",
    demo_flag: true,
    detected_at: "2026-07-21T08:30:00-06:00",
    evidence: [
      {
        absolute_variation: "+$18,400 venta / -$7,900 utilidad",
        current_result: "+8.2% venta neta, -6.4% utilidad",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Venta neta y utilidad operativa",
        percent_variation: "brecha 14.6 puntos",
        period_previous: "Mayo 2026",
        source: "Salud financiera DEMO",
        target: "Utilidad positiva con margen estable",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 12900,
    id: "ins-consolidated-profit-gap",
    impact_type: "Financiero",
    insight_type: "Anomalia",
    manager_id: "__all_managers__",
    operational_impact:
      "La direccion puede interpretar crecimiento como exito cuando la rentabilidad no esta confirmada.",
    patient_impact: 0,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Critica",
    probable_causes: [
      "Mezcla de servicios con menor margen.",
      "Gastos fijos cargados al periodo sin conciliacion.",
    ],
    recommended_actions: [
      {
        action: "Conciliar venta, costos directos y gastos antes del cierre ejecutivo.",
        expected_impact: "Separar crecimiento sano de crecimiento no rentable.",
        expected_kpi: "Margen operativo conciliado",
        owner: "Finanzas Analiza",
        risk_of_inaction:
          "Aprobar metas de volumen que deterioren utilidad.",
        suggested_due_date: "2026-07-25",
      },
    ],
    related_action_ids: ["act-finance-reconcile"],
    related_dashboard_link: "/protected/finanzas",
    related_insight_ids: ["ins-lab-ticket-orders"],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Resumen ejecutivo", "Salud financiera", "Metas"],
    source_records: ["Capa financiera DEMO", sourceRecord("Contabilidad", true)],
    source_templates: ["Plantillas mensuales DEMO"],
    status: "Detectado",
    suggested_due_date: "2026-07-25",
    suggested_owner: "Finanzas Analiza",
    summary:
      "La venta sube, pero la utilidad operativa se deteriora. Se requiere conciliacion antes de presentarlo como resultado oficial.",
    title: "Venta crece, pero utilidad cae",
    updated_at: "2026-07-21T11:20:00-06:00",
    validated_by: null,
  },
  {
    affected_kpis: [
      {
        current: "61% ocupacion efectiva",
        kpi_id: "kpi-physio-real-occupancy",
        label: "Ocupacion real",
        variation: "-9 pp",
      },
    ],
    assumptions: [
      "El dato de agenda es DEMO hasta conectar calendario o plantilla operativa.",
    ],
    audit_metadata: {
      filters_snapshot: ["Fisioterapia", "Todas las sucursales", "Junio 2026"],
      formulas: ["ocupacion_real = horas_atendidas / horas_disponibles"],
      last_function_run: "get_capacity_analysis",
      model_or_rule_version: "rules-demo-v1",
      permission_scope: "CEO / Operaciones",
      source_version: "demo-physio-2026-07-21",
    },
    branch_id: "demo-branch-SV-analiza-fisioterapia",
    branch_name: "Fisioterapia Norte",
    business_line: "Fisioterapia",
    category: "Capacidad",
    company_id: companyPhysio,
    confidence: 84,
    confidence_reason:
      "El KPI esta definido en el registro oficial, pero requiere fuente de agenda para dejar de ser demo.",
    confirmed_causes: ["Ocupacion efectiva por debajo de la meta de 86%."],
    country_id: countryElSalvador,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Dato demo",
    demo_flag: true,
    detected_at: "2026-07-21T09:05:00-06:00",
    evidence: [
      {
        absolute_variation: "-9 puntos",
        current_result: "61%",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Ocupacion real",
        percent_variation: "-12.9%",
        period_previous: "Mayo 2026",
        source: "Agenda fisioterapia DEMO",
        target: "86%",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 2880,
    id: "ins-physio-occupancy-gap",
    impact_type: "Capacidad",
    insight_type: "Riesgo",
    manager_id: "manager-operations-physio",
    operational_impact:
      "Hay demanda agendada, pero la capacidad atendida no se convierte completamente en sesiones efectivas.",
    patient_impact: 64,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Alta",
    probable_causes: [
      "No-show sin lista de espera activa.",
      "Cancelaciones tardias no recuperadas.",
    ],
    recommended_actions: [
      {
        action: "Activar confirmacion escalonada y lista de espera por franja horaria.",
        expected_impact: "Recuperar 64 sesiones y acercar no-show a 7%.",
        expected_kpi: "Ocupacion efectiva",
        owner: "Gerencia operaciones Fisioterapia",
        risk_of_inaction: "Mayor abandono antes de completar el plan terapeutico.",
        suggested_due_date: "2026-07-26",
      },
    ],
    related_action_ids: ["act-physio-waitlist"],
    related_dashboard_link: "/protected/capacidad",
    related_insight_ids: [],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Capacidad y ocupacion", "Fisioterapia", "Citas por negocio"],
    source_records: ["Agenda fisioterapia DEMO"],
    source_templates: ["Plantilla sesiones DEMO"],
    status: "Accion creada",
    suggested_due_date: "2026-07-26",
    suggested_owner: "Gerencia operaciones Fisioterapia",
    summary:
      "La ocupacion agendada parece suficiente, pero la ocupacion efectiva no alcanza la meta.",
    title: "Ocupacion agendada alta, ocupacion efectiva baja",
    updated_at: "2026-07-21T12:10:00-06:00",
    validated_by: "Operaciones DEMO",
  },
  {
    affected_kpis: [
      {
        current: "+21% venta / -7.2% ordenes",
        kpi_id: "kpi-lab-orders-total",
        label: "Ordenes totales y ticket",
        variation: "+23.7% ticket",
      },
    ],
    assumptions: [
      "La lectura usa plantilla de sucursal revisada; hay diferencias entre archivo, Evaluacion y periodo.",
    ],
    audit_metadata: {
      filters_snapshot: ["Laboratorio", "Aguilares", "Junio 2026"],
      formulas: ["ticket = venta_total / ordenes"],
      last_function_run: "compare_kpis",
      model_or_rule_version: "rules-demo-v1",
      permission_scope: "CEO / Operaciones laboratorio",
      source_version: "Plantilla Julio 2026 Aguilares.xlsx",
    },
    branch_id: "ss-aguilares-l033",
    branch_name: "SS - Aguilares - L033",
    business_line: "Laboratorio",
    category: "Comercial",
    company_id: companyLab,
    confidence: 86,
    confidence_reason:
      "Los valores principales vienen de plantilla revisada, pero la meta con IVA/sin IVA necesita regla oficial.",
    confirmed_causes: [
      "La venta crece mientras bajan ordenes y pacientes.",
      "El ticket promedio aumenta frente al periodo anterior.",
    ],
    country_id: countryElSalvador,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Requiere conciliacion",
    demo_flag: true,
    detected_at: "2026-07-21T10:15:00-06:00",
    evidence: [
      {
        absolute_variation: "+$5,194 venta / -154 ordenes",
        current_result: "$29,943 venta, 1,979 ordenes",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Venta, ordenes y ticket",
        percent_variation: "+21% venta, -7.2% ordenes, +23.7% ticket",
        period_previous: "Mayo 2026",
        source: "Plantilla Julio 2026 Aguilares.xlsx",
        target: "$28,000",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 6400,
    id: "ins-lab-ticket-orders",
    impact_type: "Financiero",
    insight_type: "Anomalia",
    manager_id: "manager-operations-lab",
    operational_impact:
      "El crecimiento puede deberse a mezcla y ticket, no a mayor volumen operativo.",
    patient_impact: 129,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Alta",
    probable_causes: [
      "Cambio de mezcla hacia pruebas de mayor ticket.",
      "Canal medico con mejor valor por orden.",
    ],
    recommended_actions: [
      {
        action: "Separar efecto volumen, ticket, canal y mezcla de pruebas.",
        expected_impact: "Explicar venta sin forzar crecimiento por volumen.",
        expected_kpi: "Ticket promedio y margen por prueba",
        owner: "Gerencia operaciones Laboratorio",
        risk_of_inaction:
          "Tomar decisiones de capacidad basadas en venta, no en demanda real.",
        suggested_due_date: "2026-07-24",
      },
    ],
    related_action_ids: ["act-lab-ticket-bridge"],
    related_dashboard_link: "/protected/laboratorio",
    related_insight_ids: ["ins-consolidated-profit-gap"],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Laboratorio", "Plantillas", "Salud financiera"],
    source_records: ["Ventas", "YTD", "Evaluacion"],
    source_templates: ["Plantilla Julio 2026 Aguilares.xlsx"],
    status: "Validado",
    suggested_due_date: "2026-07-24",
    suggested_owner: "Gerencia operaciones Laboratorio",
    summary:
      "Aguilares supera la meta con venta total, pero las ordenes y pacientes bajan; el insight requiere explicar ticket y mezcla.",
    title: "Laboratorio vende mas con menos ordenes",
    updated_at: "2026-07-21T12:45:00-06:00",
    validated_by: "Webmaster DEMO",
  },
  {
    affected_kpis: [
      {
        current: "+22.8% reactivos",
        kpi_id: "kpi-lab-analyzer-utilization",
        label: "Reactivos e inventario",
        variation: "+30 puntos vs ordenes",
      },
    ],
    assumptions: [
      "No se afirma sobreinventario sin consumo, vencimiento y rotacion real.",
    ],
    audit_metadata: {
      filters_snapshot: ["Laboratorio", "Aguilares", "Junio 2026"],
      formulas: ["variacion_reactivos - variacion_ordenes"],
      last_function_run: "get_data_quality_issues",
      model_or_rule_version: "rules-demo-v1",
      permission_scope: "CEO / Operaciones laboratorio",
      source_version: "Plantilla Julio 2026 Aguilares.xlsx",
    },
    branch_id: "ss-aguilares-l033",
    branch_name: "SS - Aguilares - L033",
    business_line: "Laboratorio",
    category: "Inventario",
    company_id: companyLab,
    confidence: 63,
    confidence_reason:
      "La variacion existe en demo, pero falta consumo real, rotacion, vencimientos y rendimiento teorico.",
    confirmed_causes: ["Reactivos crecen mas rapido que el volumen de ordenes."],
    country_id: countryElSalvador,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Pendiente de conexion de datos",
    demo_flag: true,
    detected_at: "2026-07-21T10:50:00-06:00",
    evidence: [
      {
        absolute_variation: "+$1,018 reactivos",
        current_result: "+22.8%",
        data_quality: "Pendiente de conexion de datos",
        demo_flag: true,
        kpi: "Reactivos",
        percent_variation: "+22.8% reactivos vs -7.2% ordenes",
        period_previous: "Mayo 2026",
        source: "Pendiente de conexion de datos",
        target: "Relacionado con volumen y consumo",
        updated_at: "Pendiente",
      },
    ],
    financial_impact: 3200,
    id: "ins-lab-reactives-gap",
    impact_type: "Financiero",
    insight_type: "Riesgo",
    manager_id: "manager-operations-lab",
    operational_impact:
      "Puede haber presion de costo o compra urgente, pero no se debe concluir sin fuente de consumo.",
    patient_impact: 0,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Media",
    probable_causes: [
      "Compra preventiva.",
      "Vencimientos o bajo rendimiento por prueba.",
    ],
    recommended_actions: [
      {
        action: "Conectar consumo, vencimientos y rotacion antes de aprobar conclusion.",
        expected_impact: "Distinguir inventario necesario de gasto evitable.",
        expected_kpi: "Dias de inventario y costo por prueba",
        owner: "Laboratorio tecnico",
        risk_of_inaction: "Aumentar costo sin detectar pruebas de bajo rendimiento.",
        suggested_due_date: "2026-07-29",
      },
    ],
    related_action_ids: [],
    related_dashboard_link: "/protected/laboratorio",
    related_insight_ids: ["ins-lab-ticket-orders"],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Laboratorio", "Calidad de datos", "Plantillas"],
    source_records: [sourceRecord("Inventario real", true)],
    source_templates: ["Plantilla Julio 2026 Aguilares.xlsx"],
    status: "Pendiente de revision",
    suggested_due_date: "2026-07-29",
    suggested_owner: "Laboratorio tecnico",
    summary:
      "Reactivos suben mientras las ordenes bajan. La conclusion queda bloqueada hasta conectar consumo y vencimientos.",
    title: "Reactivos aumentan sin fuente de consumo validada",
    updated_at: "2026-07-21T12:55:00-06:00",
    validated_by: null,
  },
  {
    affected_kpis: [
      {
        current: "Telemedicina +13.8%",
        kpi_id: "kpi-imaging-equipment-utilization",
        label: "Crecimiento por canal",
        variation: "+13.8%",
      },
    ],
    assumptions: [
      "Rentabilidad de telemedicina no esta validada sin gastos completos.",
    ],
    audit_metadata: {
      filters_snapshot: ["Imagenes", "Junio 2026"],
      formulas: ["crecimiento = pacientes_mes_actual / pacientes_mes_anterior - 1"],
      last_function_run: "get_business_line_summary",
      model_or_rule_version: "rules-demo-v1",
      permission_scope: "CEO / Operaciones imagenes",
      source_version: "demo-imaging-2026-07-21",
    },
    branch_id: "demo-branch-SV-analiza-imagenes",
    branch_name: "Imagenes Este",
    business_line: "Imagenes",
    category: "Comercial",
    company_id: companyImaging,
    confidence: 68,
    confidence_reason:
      "La tendencia demo es consistente, pero equipos, informes, SLA y gastos siguen pendientes.",
    confirmed_causes: ["Telemedicina explica parte relevante del crecimiento."],
    country_id: countryElSalvador,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Dato demo",
    demo_flag: true,
    detected_at: "2026-07-21T11:15:00-06:00",
    evidence: [
      {
        absolute_variation: "+247 pacientes",
        current_result: "2,026 pacientes de telemedicina",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Pacientes telemedicina",
        percent_variation: "+13.8%",
        period_previous: "Mayo 2026",
        source: "Imagenes DEMO",
        target: "Crecimiento rentable",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 7800,
    id: "ins-img-telemedicine-profitability",
    impact_type: "Financiero",
    insight_type: "Oportunidad",
    manager_id: "manager-operations-img",
    operational_impact:
      "El crecimiento puede convertirse en cartera recurrente si se valida rentabilidad y capacidad de lectura.",
    patient_impact: 247,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Media",
    probable_causes: [
      "Mayor adquisicion por canal digital.",
      "Demanda derivada de servicios de diagnostico externo.",
    ],
    recommended_actions: [
      {
        action: "Validar rentabilidad por canal antes de aumentar inversion.",
        expected_impact: "Escalar solo si margen y SLA son sostenibles.",
        expected_kpi: "Margen por canal y tiempo de informe",
        owner: "Direccion Imagenes",
        risk_of_inaction:
          "Aumentar volumen sin saber si equipos o lectura son cuello de botella.",
        suggested_due_date: "2026-07-31",
      },
    ],
    related_action_ids: [],
    related_dashboard_link: "/protected/imagenes",
    related_insight_ids: [],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Imagenes", "Servicios", "Capacidad y ocupacion"],
    source_records: ["Pacientes de Telemedicina DEMO", sourceRecord("RIS/PACS", true)],
    source_templates: ["Presentacion mensual imagenes DEMO"],
    status: "Detectado",
    suggested_due_date: "2026-07-31",
    suggested_owner: "Direccion Imagenes",
    summary:
      "Telemedicina crece, pero la rentabilidad no puede validarse sin gastos, agenda, equipos y SLA.",
    title: "Telemedicina impulsa crecimiento sin rentabilidad validada",
    updated_at: "2026-07-21T13:10:00-06:00",
    validated_by: null,
  },
  {
    affected_kpis: [
      {
        current: "5 medicos concentran 42%",
        kpi_id: "kpi-lab-orders-total",
        label: "Concentracion canal medico",
        variation: "riesgo comercial",
      },
    ],
    assumptions: [
      "La concentracion es DEMO y debe validarse contra CRM o cartera medica.",
    ],
    audit_metadata: {
      filters_snapshot: ["Laboratorio", "Canal medico", "Junio 2026"],
      formulas: ["participacion_top_medicos = venta_top_medicos / venta_medica"],
      last_function_run: "get_service_performance",
      model_or_rule_version: "rules-demo-v1",
      permission_scope: "CEO / Operaciones laboratorio",
      source_version: "demo-medical-channel-2026-07-21",
    },
    branch_id: "__all__",
    branch_name: "Laboratorio SV",
    business_line: "Laboratorio",
    category: "Comercial",
    company_id: companyLab,
    confidence: 75,
    confidence_reason:
      "Se reconoce patron comercial demo; falta CRM real para activar seguimiento individual.",
    confirmed_causes: ["Pocos medicos explican parte relevante de la venta."],
    country_id: countryElSalvador,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Dato demo",
    demo_flag: true,
    detected_at: "2026-07-21T11:55:00-06:00",
    evidence: [
      {
        absolute_variation: "42% venta medica top 5",
        current_result: "5 medicos concentran 42%",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Concentracion medica",
        percent_variation: "+6 pp vs referencia demo",
        period_previous: "Mayo 2026",
        source: "Canal medico DEMO",
        target: "Cartera diversificada",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 5200,
    id: "ins-lab-doctor-concentration",
    impact_type: "Comercial" as InsightImpactType,
    insight_type: "Riesgo",
    manager_id: "manager-operations-lab",
    operational_impact:
      "Si uno de esos medicos baja referencia, la sucursal puede perder venta sin alerta temprana.",
    patient_impact: 74,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Alta",
    probable_causes: [
      "Dependencia de visitadores activos.",
      "Poca reactivacion de medicos inactivos.",
    ],
    recommended_actions: [
      {
        action: "Crear cartera de medicos en riesgo y plan de reactivacion.",
        expected_impact: "Reducir dependencia y recuperar medicos sin actividad.",
        expected_kpi: "Medicos activos y venta medica",
        owner: "Visitadores medicos",
        risk_of_inaction: "Perder venta por concentracion no gestionada.",
        suggested_due_date: "2026-07-30",
      },
    ],
    related_action_ids: ["act-lab-medical-reactivation"],
    related_dashboard_link: "/protected/laboratorio",
    related_insight_ids: ["ins-lab-ticket-orders"],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Laboratorio", "Servicios", "Gerentes y bonos"],
    source_records: ["Canal medico DEMO", sourceRecord("CRM medico", true)],
    source_templates: ["Plantilla mensual laboratorio DEMO"],
    status: "En curso",
    suggested_due_date: "2026-07-30",
    suggested_owner: "Visitadores medicos",
    summary:
      "Un grupo pequeno de medicos concentra venta relevante; se debe gestionar cartera y reactivacion.",
    title: "Dependencia comercial de pocos medicos",
    updated_at: "2026-07-21T13:35:00-06:00",
    validated_by: "Operaciones DEMO",
  },
  {
    affected_kpis: [
      {
        current: "Plantilla no coincide",
        kpi_id: "kpi-lab-orders-total",
        label: "Consistencia Evaluacion / YTD",
        variation: "bloquea dato oficial",
      },
    ],
    assumptions: [
      "No se debe usar la cifra como oficial hasta reconciliar plantilla y consolidado.",
    ],
    audit_metadata: {
      filters_snapshot: ["Laboratorio", "Plantillas", "Junio 2026"],
      formulas: ["validacion = Evaluacion == YTD == fuente_diaria"],
      last_function_run: "get_data_quality_issues",
      model_or_rule_version: "rules-demo-v1",
      permission_scope: "Auditoria / Webmaster",
      source_version: "plantillas-sv-2026-07-21",
    },
    branch_id: "ss-aguilares-l033",
    branch_name: "SS - Aguilares - L033",
    business_line: "Laboratorio",
    category: "Datos",
    company_id: companyLab,
    confidence: 91,
    confidence_reason:
      "La inconsistencia se detecta en las plantillas revisadas; no requiere inferencia clinica.",
    confirmed_causes: ["La hoja Evaluacion y YTD no coinciden con el periodo del archivo."],
    country_id: countryElSalvador,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Requiere conciliacion",
    demo_flag: true,
    detected_at: "2026-07-21T12:25:00-06:00",
    evidence: [
      {
        absolute_variation: "Diferencia entre hojas",
        current_result: "Archivo julio / ventas junio",
        data_quality: "Requiere conciliacion",
        demo_flag: true,
        kpi: "Periodo y fuente",
        percent_variation: "No aplica",
        period_previous: "Junio 2026",
        source: "Plantilla de resultados",
        target: "Periodo unico validado",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 0,
    id: "ins-data-template-mismatch",
    impact_type: "Calidad",
    insight_type: "Calidad de datos",
    manager_id: "manager-operations-lab",
    operational_impact:
      "El CEO podria ver un resultado correcto en apariencia pero con periodo/fuente incorrecta.",
    patient_impact: 0,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Critica",
    probable_causes: [
      "Archivo duplicado.",
      "Formula TODAY() o mezcla de nombres de mes.",
    ],
    recommended_actions: [
      {
        action: "Bloquear version oficial hasta conciliar periodo, YTD y fuente diaria.",
        expected_impact: "Evitar decisiones con cifra no trazable.",
        expected_kpi: "Calidad de datos",
        owner: "Webmaster / Auditoria",
        risk_of_inaction: "Publicar resultados contradictorios.",
        suggested_due_date: "2026-07-23",
      },
    ],
    related_action_ids: ["act-data-template-reconcile"],
    related_dashboard_link: "/protected/calidad-datos",
    related_insight_ids: ["ins-lab-ticket-orders"],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Calidad de datos", "Plantillas", "Laboratorio"],
    source_records: ["Evaluacion", "YTD", "Ventas"],
    source_templates: ["Plantilla Julio 2026 Aguilares.xlsx"],
    status: "Bloqueado",
    suggested_due_date: "2026-07-23",
    suggested_owner: "Webmaster / Auditoria",
    summary:
      "La cifra de la plantilla no coincide con el consolidado interno; se requiere conciliacion antes de usarla como resultado oficial.",
    title: "Evaluacion y YTD no coinciden",
    updated_at: "2026-07-21T14:05:00-06:00",
    validated_by: null,
  },
  {
    affected_kpis: [
      {
        current: "Meta probable 77%",
        kpi_id: "kpi-corp-net-revenue",
        label: "Probabilidad de meta",
        variation: "riesgo de cierre",
      },
    ],
    assumptions: [
      "Proyeccion basada en tendencia demo; no es modelo predictivo de IA.",
      "No considera eventos extraordinarios ni cambios de precio.",
    ],
    audit_metadata: {
      filters_snapshot: ["Consolidado", "Junio 2026"],
      formulas: ["proyeccion = venta_diaria_promedio * dias_habiles"],
      last_function_run: "simulate_scenario",
      model_or_rule_version: "trend-demo-v1",
      permission_scope: "CEO",
      source_version: "demo-goals-2026-07-21",
    },
    branch_id: "__all__",
    branch_name: "Consolidado regional",
    business_line: "Consolidado",
    category: "Cumplimiento",
    company_id: companyConsolidated,
    confidence: 79,
    confidence_reason:
      "Es una proyeccion basada en tendencia, no una prediccion de IA.",
    confirmed_causes: ["Avance de meta inferior al ritmo esperado."],
    country_id: countryRegional,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Dato demo",
    demo_flag: true,
    detected_at: "2026-07-21T13:00:00-06:00",
    evidence: [
      {
        absolute_variation: "-$18,200 contra meta esperada",
        current_result: "77% probabilidad de alcanzar meta",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Proyeccion de cierre",
        percent_variation: "-8 pp vs ritmo esperado",
        period_previous: "Mayo 2026",
        source: "Metas y avances DEMO",
        target: ">=90%",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 18200,
    id: "ins-goal-attainment-projection",
    impact_type: "Cumplimiento",
    insight_type: "Prediccion",
    manager_id: "__all_managers__",
    operational_impact:
      "La direccion necesita decidir si ajusta acciones comerciales o mantiene meta final.",
    patient_impact: 0,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Alta",
    probable_causes: [
      "Ritmo comercial menor en sucursales con alertas.",
      "Acciones vencidas sin responsable confirmado.",
    ],
    recommended_actions: [
      {
        action: "Revisar brecha por linea y decidir metas finales del periodo.",
        expected_impact: "Focalizar acciones comerciales en lineas con capacidad disponible.",
        expected_kpi: "Cumplimiento de meta",
        owner: "CEO",
        risk_of_inaction: "Llegar al cierre sin accion correctiva priorizada.",
        suggested_due_date: "2026-07-24",
      },
    ],
    related_action_ids: [],
    related_dashboard_link: "/protected/metas",
    related_insight_ids: [],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Metas", "Resumen ejecutivo", "Acciones"],
    source_records: ["Metas DEMO"],
    source_templates: ["Plan de metas DEMO"],
    status: "Detectado",
    suggested_due_date: "2026-07-24",
    suggested_owner: "CEO",
    summary:
      "La probabilidad de meta se calcula por tendencia demo y debe presentarse como proyeccion, no como IA predictiva.",
    title: "Meta mensual en riesgo segun tendencia",
    updated_at: "2026-07-21T14:20:00-06:00",
    validated_by: null,
  },
  {
    affected_kpis: [
      {
        current: "2 profesionales sobrecargados",
        kpi_id: "kpi-physio-plan-compliance",
        label: "Carga profesional",
        variation: "+18% sobre promedio",
      },
    ],
    assumptions: [
      "No se evalua calidad clinica individual; solo carga operativa agregada.",
    ],
    audit_metadata: {
      filters_snapshot: ["Fisioterapia", "Profesionales", "Junio 2026"],
      formulas: ["carga = sesiones_asignadas / horas_disponibles"],
      last_function_run: "get_professional_workload",
      model_or_rule_version: "rules-demo-v1",
      permission_scope: "CEO / Operaciones",
      source_version: "demo-professionals-2026-07-21",
    },
    branch_id: "demo-branch-SV-analiza-fisioterapia",
    branch_name: "Fisioterapia Centro",
    business_line: "Fisioterapia",
    category: "Personas",
    company_id: companyPhysio,
    confidence: 76,
    confidence_reason:
      "El hallazgo usa carga agregada demo; no incluye evaluacion clinica ni diagnosticos.",
    confirmed_causes: ["La carga asignada supera el promedio de la sucursal."],
    country_id: countryElSalvador,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Dato demo",
    demo_flag: true,
    detected_at: "2026-07-21T13:30:00-06:00",
    evidence: [
      {
        absolute_variation: "+18% carga",
        current_result: "2 profesionales sobre promedio",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Carga profesional",
        percent_variation: "+18%",
        period_previous: "Mayo 2026",
        source: "Profesionales DEMO",
        target: "Carga balanceada",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 1100,
    id: "ins-physio-workload-risk",
    impact_type: "Personas",
    insight_type: "Riesgo",
    manager_id: "manager-operations-physio",
    operational_impact:
      "La sobrecarga puede afectar continuidad operacional si no se redistribuye agenda.",
    patient_impact: 38,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Media",
    probable_causes: [
      "Asignacion manual sin balance por horas disponibles.",
      "Demanda concentrada en profesionales con alta recurrencia.",
    ],
    recommended_actions: [
      {
        action: "Redistribuir sesiones nuevas y proteger continuidad de pacientes activos.",
        expected_impact: "Reducir riesgo de abandono por disponibilidad.",
        expected_kpi: "Carga profesional y continuidad de plan",
        owner: "Gerencia operaciones Fisioterapia",
        risk_of_inaction: "Aumentar espera y abandono temprano.",
        suggested_due_date: "2026-08-02",
      },
    ],
    related_action_ids: [],
    related_dashboard_link: "/protected/profesionales",
    related_insight_ids: ["ins-physio-occupancy-gap"],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Profesionales", "Fisioterapia", "Capacidad y ocupacion"],
    source_records: ["Planilla profesionales DEMO"],
    source_templates: ["Plantilla bonos DEMO"],
    status: "Pendiente de revision",
    suggested_due_date: "2026-08-02",
    suggested_owner: "Gerencia operaciones Fisioterapia",
    summary:
      "Dos profesionales concentran carga operativa. No se evalua calidad clinica, solo distribucion de agenda.",
    title: "Carga profesional concentrada",
    updated_at: "2026-07-21T14:40:00-06:00",
    validated_by: null,
  },
  {
    affected_kpis: [
      {
        current: "$4,700 recuperacion esperada",
        kpi_id: "kpi-corp-net-revenue",
        label: "Accion correctiva",
        variation: "impacto parcial",
      },
    ],
    assumptions: [
      "Impacto real pendiente de validacion contra periodo posterior.",
    ],
    audit_metadata: {
      filters_snapshot: ["Consolidado", "Acciones", "Junio 2026"],
      formulas: ["impacto = resultado_posterior - resultado_base"],
      last_function_run: "get_action_result",
      model_or_rule_version: "actions-demo-v1",
      permission_scope: "CEO / Webmaster",
      source_version: "demo-actions-2026-07-21",
    },
    branch_id: "demo-branch-SV-analiza-imagenes",
    branch_name: "Imagenes Este",
    business_line: "Imagenes",
    category: "Operacion",
    company_id: companyImaging,
    confidence: 81,
    confidence_reason:
      "El seguimiento tiene accion vinculada, pero el resultado posterior aun no cierra.",
    confirmed_causes: ["La accion fue aceptada y esta en curso."],
    country_id: countryElSalvador,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Dato demo",
    demo_flag: true,
    detected_at: "2026-07-18T15:10:00-06:00",
    evidence: [
      {
        absolute_variation: "$4,700 recuperacion esperada",
        current_result: "Accion en curso",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Impacto de accion",
        percent_variation: "No medible todavia",
        period_previous: "Mayo 2026",
        source: "Seguimiento DEMO",
        target: "Impacto validado",
        updated_at: "2026-07-21",
      },
    ],
    financial_impact: 4700,
    id: "ins-action-followup-imaging",
    impact_type: "Operativo",
    insight_type: "Hallazgo operativo",
    manager_id: "manager-operations-img",
    operational_impact:
      "La accion ya existe, pero requiere evidencia posterior antes de declararse exitosa.",
    patient_impact: 51,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Baja",
    probable_causes: ["Ejecucion parcial o evidencia aun no cargada."],
    recommended_actions: [
      {
        action: "Subir evidencia y comparar antes/meta/resultado posterior.",
        expected_impact: "Cerrar accion con impacto validado o parcial.",
        expected_kpi: "Impacto comprobado",
        owner: "Direccion Imagenes",
        risk_of_inaction: "Mantener acciones abiertas sin aprendizaje.",
        suggested_due_date: "2026-08-04",
      },
    ],
    related_action_ids: ["act-img-channel-profit"],
    related_dashboard_link: "/protected/imagenes",
    related_insight_ids: ["ins-img-telemedicine-profitability"],
    resolution_result: null,
    resolved_at: null,
    source_modules: ["Seguimiento", "Imagenes", "Acciones"],
    source_records: ["Bitacora acciones DEMO"],
    source_templates: ["Presentacion gerencial imagenes DEMO"],
    status: "En curso",
    suggested_due_date: "2026-08-04",
    suggested_owner: "Direccion Imagenes",
    summary:
      "Existe accion vinculada a imagenes, pero aun falta medir resultado posterior para validar impacto.",
    title: "Accion en curso sin impacto comprobado",
    updated_at: "2026-07-21T14:55:00-06:00",
    validated_by: "Direccion DEMO",
  },
  {
    affected_kpis: [
      {
        current: "21 insights resueltos",
        kpi_id: "kpi-corp-net-revenue",
        label: "Insights resueltos",
        variation: "+6 vs periodo anterior",
      },
    ],
    assumptions: [
      "Historial demo para probar auditoria y aprendizaje.",
    ],
    audit_metadata: {
      filters_snapshot: ["Consolidado", "Historial", "Junio 2026"],
      formulas: ["resueltos = count(status == Resuelto)"],
      last_function_run: "list_active_insights",
      model_or_rule_version: "history-demo-v1",
      permission_scope: "Auditoria / CEO",
      source_version: "demo-history-2026-07-21",
    },
    branch_id: "__all__",
    branch_name: "Consolidado regional",
    business_line: "Consolidado",
    category: "Calidad",
    company_id: companyConsolidated,
    confidence: 88,
    confidence_reason:
      "El dato esta en historial demo y sirve para validar la experiencia de auditoria.",
    confirmed_causes: ["Se cerraron acciones con evidencia parcial o validada."],
    country_id: countryRegional,
    created_by: "Analiza Intelligence DEMO",
    data_quality_status: "Dato demo",
    demo_flag: true,
    detected_at: "2026-06-30T16:00:00-06:00",
    evidence: [
      {
        absolute_variation: "+6 insights",
        current_result: "21 resueltos",
        data_quality: "Dato demo",
        demo_flag: true,
        kpi: "Insights resueltos",
        percent_variation: "+40%",
        period_previous: "Mayo 2026",
        source: "Historial DEMO",
        target: "Aprendizaje operativo",
        updated_at: "2026-07-01",
      },
    ],
    financial_impact: 3500,
    id: "ins-history-resolved-learning",
    impact_type: "Calidad",
    insight_type: "Tendencia",
    manager_id: "__all_managers__",
    operational_impact:
      "El historial permite evaluar que acciones funcionaron y que reglas deben ajustarse.",
    patient_impact: 22,
    period_end: "2026-06-30",
    period_start: "2026-06-01",
    priority: "Baja",
    probable_causes: ["Mayor disciplina de seguimiento gerencial."],
    recommended_actions: [
      {
        action: "Revisar aprendizajes resueltos y convertirlos en reglas recurrentes.",
        expected_impact: "Mejorar priorizacion automatica de hallazgos.",
        expected_kpi: "Insights con impacto validado",
        owner: "Webmaster / Auditoria",
        risk_of_inaction: "Repetir acciones sin aprender del resultado.",
        suggested_due_date: "2026-08-05",
      },
    ],
    related_action_ids: [],
    related_dashboard_link: "/protected/auditoria",
    related_insight_ids: [],
    resolution_result: "Impacto parcial documentado en historial demo.",
    resolved_at: "2026-07-01T09:00:00-06:00",
    source_modules: ["Historial", "Auditoria", "Acciones"],
    source_records: ["Bitacora DEMO"],
    source_templates: ["Presentaciones gerenciales DEMO"],
    status: "Resuelto",
    suggested_due_date: "2026-08-05",
    suggested_owner: "Webmaster / Auditoria",
    summary:
      "El historial muestra aprendizajes y cierres anteriores para no repetir decisiones sin evidencia.",
    title: "Insights resueltos generan aprendizaje",
    updated_at: "2026-07-01T09:00:00-06:00",
    validated_by: "Auditoria DEMO",
  },
];

export const demoInsightActions: InsightAction[] = [
  {
    actual_result: "Pendiente de cierre",
    affected_kpi: "Margen operativo conciliado",
    blockers: ["Contabilidad real pendiente"],
    capacity_recovered: "No medible todavia",
    close_date: null,
    comments: ["Borrador generado desde insight financiero."],
    demo_flag: true,
    description:
      "Conciliar venta neta, costo directo y gasto operativo antes de presentar utilidad oficial.",
    due_date: "2026-07-25",
    evidence_required: "Conciliacion contable y plantilla aprobada",
    expected_impact: "Evitar decision con margen no conciliado",
    expected_result: "Utilidad oficial validada por Finanzas",
    financial_impact: 12900,
    id: "act-finance-reconcile",
    impact_status: "No medible todavia",
    operational_impact: "Cierre ejecutivo con regla unica",
    origin_insight_id: "ins-consolidated-profit-gap",
    patients_recovered: 0,
    priority: "Critica",
    responsible: "Finanzas Analiza",
    start_date: "2026-07-21",
    status: "En curso",
    team: "Finanzas",
    title: "Conciliar utilidad operativa del periodo",
  },
  {
    actual_result: "No-show baja de 11.0% a 8.1%",
    affected_kpi: "Ocupacion efectiva",
    blockers: [],
    capacity_recovered: "+4.3 puntos ocupacion efectiva",
    close_date: null,
    comments: ["Lista de espera activa en prueba piloto."],
    demo_flag: true,
    description:
      "Implementar confirmacion escalonada, llamada preventiva y lista de espera por franja.",
    due_date: "2026-07-26",
    evidence_required: "Agenda, cancelaciones, sesiones recuperadas",
    expected_impact: "$2,880 adicionales y 64 sesiones recuperadas",
    expected_result: "No-show objetivo 7%",
    financial_impact: 2880,
    id: "act-physio-waitlist",
    impact_status: "Impacto parcial",
    operational_impact: "64 sesiones recuperadas",
    origin_insight_id: "ins-physio-occupancy-gap",
    patients_recovered: 64,
    priority: "Alta",
    responsible: "Gerencia operaciones Fisioterapia",
    start_date: "2026-07-21",
    status: "En validacion",
    team: "Operaciones Fisioterapia",
    title: "Confirmacion escalonada y lista de espera",
  },
  {
    actual_result: "Pendiente",
    affected_kpi: "Calidad de datos",
    blockers: ["Archivo duplicado"],
    capacity_recovered: "No aplica",
    close_date: null,
    comments: ["No se puede resolver sin comentario y evidencia de conciliacion."],
    demo_flag: true,
    description:
      "Bloquear presentacion oficial hasta reconciliar Evaluacion, YTD y ventas fuente.",
    due_date: "2026-07-23",
    evidence_required: "Archivo corregido y bitacora de cambios",
    expected_impact: "Resultado oficial trazable",
    expected_result: "Plantilla validada sin diferencias criticas",
    financial_impact: 0,
    id: "act-data-template-reconcile",
    impact_status: "No medible todavia",
    operational_impact: "Evita decisiones con cifras inconsistentes",
    origin_insight_id: "ins-data-template-mismatch",
    patients_recovered: 0,
    priority: "Critica",
    responsible: "Webmaster / Auditoria",
    start_date: "2026-07-21",
    status: "Vencida",
    team: "Datos",
    title: "Conciliar plantilla Aguilares",
  },
  {
    actual_result: "Pendiente",
    affected_kpi: "Medicos activos y venta medica",
    blockers: ["CRM medico no conectado"],
    capacity_recovered: "No aplica",
    close_date: null,
    comments: ["Se requiere lista real de medicos antes de accion formal."],
    demo_flag: true,
    description:
      "Identificar medicos inactivos, asignar visitador y recuperar cartera prioritaria.",
    due_date: "2026-07-30",
    evidence_required: "Cartera medica y visitas documentadas",
    expected_impact: "$5,200 venta medica protegida",
    expected_result: "Medicos activos recuperados",
    financial_impact: 5200,
    id: "act-lab-medical-reactivation",
    impact_status: "No medible todavia",
    operational_impact: "Menor dependencia comercial",
    origin_insight_id: "ins-lab-doctor-concentration",
    patients_recovered: 74,
    priority: "Alta",
    responsible: "Visitadores medicos",
    start_date: "2026-07-22",
    status: "Asignada",
    team: "Comercial Laboratorio",
    title: "Reactivar medicos sin actividad",
  },
  {
    actual_result: "Pendiente",
    affected_kpi: "Margen por canal",
    blockers: ["Gastos incompletos"],
    capacity_recovered: "No medible todavia",
    close_date: null,
    comments: ["Accion en seguimiento desde imagenes."],
    demo_flag: true,
    description:
      "Comparar venta, costo, informes, SLA y capacidad de lectura por canal.",
    due_date: "2026-08-04",
    evidence_required: "Venta por canal, agenda, equipos, informes y gastos",
    expected_impact: "$4,700 recuperacion esperada",
    expected_result: "Rentabilidad por canal validada",
    financial_impact: 4700,
    id: "act-img-channel-profit",
    impact_status: "No medible todavia",
    operational_impact: "Decidir inversion en telemedicina",
    origin_insight_id: "ins-action-followup-imaging",
    patients_recovered: 51,
    priority: "Media",
    responsible: "Direccion Imagenes",
    start_date: "2026-07-20",
    status: "En curso",
    team: "Imagenes",
    title: "Validar rentabilidad de telemedicina",
  },
];

export function getDefaultInsightFilters(): InsightFilters {
  return {
    branch: allInsightOption,
    category: allInsightOption,
    company: allInsightOption,
    country: allInsightOption,
    businessLine: allInsightOption,
    manager: allInsightOption,
    period: "Este mes",
    priority: allInsightOption,
    responsible: allInsightOption,
    sourceData: allInsightOption,
    status: allInsightOption,
  };
}

export function mapBusinessLineCodeToInsightLine(
  code?: BusinessLineCode | string,
): InsightBusinessLine {
  if (code === "PHYSIOTHERAPY") {
    return "Fisioterapia";
  }

  if (code === "LABORATORY") {
    return "Laboratorio";
  }

  if (code === "IMAGING") {
    return "Imagenes";
  }

  return "Consolidado";
}

function priorityScore(priority: InsightPriority) {
  const scores: Record<InsightPriority, number> = {
    Alta: 78,
    Baja: 34,
    Critica: 96,
    Media: 56,
  };

  return scores[priority];
}

function priorityOrder(priority: InsightPriority) {
  const orders: Record<InsightPriority, number> = {
    Alta: 2,
    Baja: 4,
    Critica: 1,
    Media: 3,
  };

  return orders[priority];
}

function isActiveStatus(status: InsightStatus) {
  return !["Resuelto", "No aplicable", "Descartado"].includes(status);
}

function overlapsPeriod(insight: InsightModel, filterPeriod: string) {
  if (
    filterPeriod === allInsightOption ||
    filterPeriod === "Este mes" ||
    filterPeriod === "Rango personalizado"
  ) {
    return true;
  }

  if (filterPeriod === "Hoy") {
    return insight.detected_at.startsWith("2026-07-21");
  }

  if (filterPeriod === "Esta semana") {
    return insight.detected_at >= "2026-07-15";
  }

  if (filterPeriod === "Trimestre" || filterPeriod === "Ano") {
    return insight.period_start.startsWith("2026");
  }

  if (filterPeriod === "Periodo anterior") {
    return insight.period_start.startsWith("2026-06");
  }

  if (filterPeriod === "Mismo periodo del ano anterior") {
    return insight.period_start.startsWith("2025");
  }

  return true;
}

export function isInsightConclusionBlocked(insight: InsightModel) {
  return (
    insight.confidence < 70 ||
    insight.data_quality_status === "Pendiente de conexion de datos" ||
    insight.data_quality_status === "Datos incompletos" ||
    insight.data_quality_status === "Requiere conciliacion"
  );
}

export function getInsightConclusionGate(insight: InsightModel) {
  if (!isInsightConclusionBlocked(insight)) {
    return {
      blocked: false,
      message: "Conclusion ejecutiva permitida con lectura cautelosa.",
    };
  }

  return {
    blocked: true,
    message:
      "Datos insuficientes para conclusion ejecutiva. Complete o concilie la fuente antes de presentar una decision.",
  };
}

export function filterInsights(
  insights: InsightModel[],
  filters: InsightFilters,
) {
  return insights.filter((insight) => {
    const sourceText = [
      insight.data_quality_status,
      ...insight.source_modules,
      ...insight.source_records,
      ...insight.source_templates,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (filters.country === allInsightOption ||
        insight.country_id === filters.country ||
        (filters.country === "Vista regional" && insight.country_id === countryRegional)) &&
      (filters.company === allInsightOption ||
        insight.company_id === filters.company ||
        insight.company_id === companyConsolidated) &&
      (filters.businessLine === allInsightOption ||
        insight.business_line === filters.businessLine ||
        filters.businessLine === "Consolidado") &&
      (filters.branch === allInsightOption ||
        insight.branch_name === filters.branch ||
        insight.branch_id === filters.branch ||
        insight.branch_name.includes(filters.branch)) &&
      (filters.manager === allInsightOption ||
        insight.manager_id === filters.manager ||
        insight.suggested_owner === filters.manager) &&
      (filters.category === allInsightOption ||
        insight.category === filters.category) &&
      (filters.priority === allInsightOption ||
        insight.priority === filters.priority) &&
      (filters.status === allInsightOption || insight.status === filters.status) &&
      (filters.responsible === allInsightOption ||
        insight.suggested_owner === filters.responsible) &&
      (filters.sourceData === allInsightOption ||
        sourceText.includes(filters.sourceData.toLowerCase())) &&
      overlapsPeriod(insight, filters.period)
    );
  });
}

export function sortInsightsForToday(insights: InsightModel[]) {
  return [...insights].sort((a, b) => {
    const urgencyDiff = priorityOrder(a.priority) - priorityOrder(b.priority);
    if (urgencyDiff !== 0) {
      return urgencyDiff;
    }

    const impactDiff = b.financial_impact - a.financial_impact;
    if (impactDiff !== 0) {
      return impactDiff;
    }

    const patientDiff = b.patient_impact - a.patient_impact;
    if (patientDiff !== 0) {
      return patientDiff;
    }

    const confidenceDiff = b.confidence - a.confidence;
    if (confidenceDiff !== 0) {
      return confidenceDiff;
    }

    return b.detected_at.localeCompare(a.detected_at);
  });
}

export function buildExecutiveCards(
  insights: InsightModel[],
  actions: InsightAction[],
): InsightExecutiveCard[] {
  const activeInsights = insights.filter((insight) => isActiveStatus(insight.status));
  const critical = activeInsights.filter((insight) => insight.priority === "Critica");
  const opportunities = activeInsights.filter(
    (insight) => insight.insight_type === "Oportunidad",
  );
  const risks = activeInsights.filter((insight) => insight.insight_type === "Riesgo");
  const financialImpact = activeInsights.reduce(
    (sum, insight) => sum + insight.financial_impact,
    0,
  );
  const patientImpact = activeInsights.reduce(
    (sum, insight) => sum + insight.patient_impact,
    0,
  );
  const branches = new Set(
    activeInsights
      .filter((insight) => insight.branch_name !== "Consolidado regional")
      .map((insight) => insight.branch_name),
  );
  const overdueActions = actions.filter((action) => action.status === "Vencida");
  const resolved = insights.filter((insight) => insight.status === "Resuelto");
  const highConfidencePredictions = activeInsights.filter(
    (insight) => insight.insight_type === "Prediccion" && insight.confidence >= 75,
  );

  return [
    {
      filter: { priority: "Critica" },
      id: "critical",
      label: "Insights criticos",
      note: "DEMO, requieren direccion",
      tone: critical.length > 0 ? "negative" : "positive",
      value: critical.length.toString(),
    },
    {
      filter: { category: allInsightOption, status: allInsightOption },
      id: "opportunities",
      label: "Oportunidades detectadas",
      note: "DEMO, potencial accionable",
      tone: "positive",
      value: opportunities.length.toString(),
    },
    {
      filter: { status: allInsightOption },
      id: "risks",
      label: "Riesgos activos",
      note: "DEMO, no resueltos",
      tone: risks.length > 0 ? "warning" : "positive",
      value: risks.length.toString(),
    },
    {
      filter: {},
      id: "financial-impact",
      label: "Impacto financiero estimado",
      note: "DEMO, no oficial",
      tone: "warning",
      value: formatCurrency(financialImpact),
    },
    {
      filter: {},
      id: "patient-impact",
      label: "Pacientes potencialmente afectados",
      note: "DEMO, agregado",
      tone: "warning",
      value: patientImpact.toLocaleString("en-US"),
    },
    {
      filter: {},
      id: "branch-alerts",
      label: "Sucursales con alertas",
      note: "DEMO, con hallazgos activos",
      tone: "neutral",
      value: branches.size.toString(),
    },
    {
      filter: {},
      id: "overdue-actions",
      label: "Acciones vencidas",
      note: "DEMO, necesitan dueno",
      tone: overdueActions.length > 0 ? "negative" : "positive",
      value: overdueActions.length.toString(),
    },
    {
      filter: { status: "Resuelto" },
      id: "resolved",
      label: "Insights resueltos",
      note: "DEMO, periodo",
      tone: "positive",
      value: resolved.length.toString(),
    },
    {
      filter: { category: "Cumplimiento" },
      id: "predictions",
      label: "Predicciones alta confianza",
      note: "DEMO, tendencia",
      tone: "neutral",
      value: highConfidencePredictions.length.toString(),
    },
  ];
}

function matchesBusinessLine(line: InsightBusinessLine, filter: string) {
  return filter === allInsightOption || line === filter || line === "Consolidado";
}

export function filterEarlyWarnings(filters: InsightFilters) {
  return earlyWarningIndicators
    .filter((warning) => matchesBusinessLine(warning.businessLine, filters.businessLine))
    .sort(
      (a, b) =>
        b.riskScore - a.riskScore ||
        b.confidence - a.confidence ||
        a.businessLine.localeCompare(b.businessLine),
    );
}

export function filterAnaliaModels(filters: InsightFilters) {
  return analiaDataScienceModels.filter((model) =>
    matchesBusinessLine(model.businessLine, filters.businessLine),
  );
}

export function buildEarlyWarningSummary(warnings: EarlyWarningIndicator[]) {
  const critical = warnings.filter((warning) => warning.severity === "Critica").length;
  const actNow = warnings.filter((warning) => warning.status === "Actuar ahora").length;
  const pendingData = warnings.filter(
    (warning) => warning.dataQuality === "Pendiente de conexion de datos",
  ).length;
  const averageRisk =
    warnings.length > 0
      ? Math.round(
          warnings.reduce((sum, warning) => sum + warning.riskScore, 0) /
            warnings.length,
        )
      : 0;
  const highestRisk = warnings[0];

  return {
    actNow,
    averageRisk,
    critical,
    highestRisk,
    pendingData,
    total: warnings.length,
  };
}

export function buildBusinessLineWarningSummary(
  warnings: EarlyWarningIndicator[],
) {
  return insightBusinessLines
    .map((line) => {
      const scoped = warnings.filter((warning) => warning.businessLine === line);
      const maxRisk = scoped.reduce(
        (max, warning) => Math.max(max, warning.riskScore),
        0,
      );

      return {
        actNow: scoped.filter((warning) => warning.status === "Actuar ahora").length,
        alerts: scoped.length,
        businessLine: line,
        maxRisk,
        pendingData: scoped.filter(
          (warning) => warning.dataQuality === "Pendiente de conexion de datos",
        ).length,
        severity:
          scoped.find((warning) => warning.severity === "Critica")?.severity ??
          scoped.find((warning) => warning.severity === "Alta")?.severity ??
          scoped.find((warning) => warning.severity === "Media")?.severity ??
          scoped[0]?.severity ??
          "Baja",
      };
    })
    .filter((row) => row.alerts > 0);
}

export function buildAnaliaModelCoverage(models: AnaliaDataScienceModel[]) {
  const modelTypes: DataScienceModelType[] = [
    "Exploratorio",
    "Descriptivo",
    "Predictivo",
  ];

  return modelTypes.map((type) => ({
    active: models.filter(
      (model) => model.type === type && model.status === "Activo DEMO",
    ).length,
    pending: models.filter(
      (model) => model.type === type && model.status === "Pendiente de datos",
    ).length,
    total: models.filter((model) => model.type === type).length,
    type,
  }));
}

export function buildImpactUrgencyMatrix(insights: InsightModel[]) {
  const maxImpact = Math.max(
    ...insights.map((insight) => insight.financial_impact + insight.patient_impact * 35),
    1,
  );

  return insights.map<ImpactUrgencyPoint>((insight) => {
    const rawImpact = insight.financial_impact + insight.patient_impact * 35;

    return {
      branch: insight.branch_name,
      id: insight.id,
      impactScore: Math.max(12, Math.round((rawImpact / maxImpact) * 94)),
      label: insight.title,
      priority: insight.priority,
      size: Math.max(12, Math.min(38, 12 + rawImpact / maxImpact * 28)),
      type: insight.insight_type,
      urgencyScore: priorityScore(insight.priority),
    };
  });
}

export function buildCategoryImpact(insights: InsightModel[]) {
  return insightCategories
    .map<CategoryImpactPoint>((category) => {
      const categoryInsights = insights.filter(
        (insight) => insight.category === category,
      );

      return {
        category,
        count: categoryInsights.length,
        financialImpact: categoryInsights.reduce(
          (sum, insight) => sum + insight.financial_impact,
          0,
        ),
        patientImpact: categoryInsights.reduce(
          (sum, insight) => sum + insight.patient_impact,
          0,
        ),
      };
    })
    .filter((item) => item.count > 0);
}

export function buildInsightTrend(insights: InsightModel[], actions: InsightAction[]) {
  const base = [
    { label: "01/06", newInsights: 2, validated: 1, actions: 0, resolved: 0, overdue: 0, reopened: 0 },
    { label: "08/06", newInsights: 4, validated: 2, actions: 1, resolved: 1, overdue: 0, reopened: 0 },
    { label: "15/06", newInsights: 6, validated: 3, actions: 2, resolved: 2, overdue: 1, reopened: 0 },
    { label: "22/06", newInsights: 8, validated: 4, actions: 3, resolved: 3, overdue: 1, reopened: 1 },
    { label: "30/06", newInsights: insights.length, validated: insights.filter((item) => item.status === "Validado").length + 4, actions: actions.length, resolved: insights.filter((item) => item.status === "Resuelto").length + 20, overdue: actions.filter((item) => item.status === "Vencida").length + 4, reopened: 1 },
  ];

  return base satisfies InsightTrendPoint[];
}

export function buildBranchRanking(
  insights: InsightModel[],
  actions: InsightAction[],
) {
  const ranking = new Map<string, BranchAlertRanking>();

  insights.forEach((insight) => {
    if (!ranking.has(insight.branch_name)) {
      ranking.set(insight.branch_name, {
        actionsOverdue: 0,
        branch: insight.branch_name,
        criticalInsights: 0,
        estimatedImpact: 0,
        opportunities: 0,
        risks: 0,
      });
    }

    const current = ranking.get(insight.branch_name);
    if (!current) {
      return;
    }

    current.criticalInsights += insight.priority === "Critica" ? 1 : 0;
    current.risks += insight.insight_type === "Riesgo" ? 1 : 0;
    current.opportunities += insight.insight_type === "Oportunidad" ? 1 : 0;
    current.estimatedImpact += insight.financial_impact;
    current.actionsOverdue += actions.filter(
      (action) =>
        action.origin_insight_id === insight.id && action.status === "Vencida",
    ).length;
  });

  return Array.from(ranking.values()).sort(
    (a, b) =>
      b.criticalInsights - a.criticalInsights ||
      b.estimatedImpact - a.estimatedImpact,
  );
}

export function buildActionFunnel(
  insights: InsightModel[],
  actions: InsightAction[],
) {
  const reviewed = insights.filter(
    (insight) => insight.status !== "Detectado",
  ).length;
  const validated = insights.filter(
    (insight) =>
      insight.status === "Validado" ||
      insight.status === "Accion creada" ||
      insight.status === "En curso" ||
      insight.status === "Resuelto",
  ).length;
  const executed = actions.filter(
    (action) =>
      action.status === "Completada" ||
      action.status === "En validacion" ||
      action.impact_status === "Impacto parcial" ||
      action.impact_status === "Impacto validado",
  ).length;
  const impact = actions.filter(
    (action) =>
      action.impact_status === "Impacto parcial" ||
      action.impact_status === "Impacto validado",
  ).length;

  return [
    { label: "Detectados", value: insights.length },
    { label: "Revisados", value: reviewed },
    { label: "Validados", value: validated },
    { label: "Acciones creadas", value: actions.length },
    { label: "Ejecutadas", value: executed },
    { label: "Impacto comprobado", value: impact },
  ] satisfies ActionFunnelPoint[];
}

export function buildFinancialWaterfall(
  insights: InsightModel[],
  actions: InsightAction[],
) {
  const potentialLoss = insights
    .filter((insight) => insight.priority === "Critica" || insight.priority === "Alta")
    .reduce((sum, insight) => sum + insight.financial_impact, 0);
  const expectedRecovery = actions.reduce(
    (sum, action) => sum + action.financial_impact,
    0,
  );
  const obtainedRecovery = actions
    .filter(
      (action) =>
        action.impact_status === "Impacto validado" ||
        action.impact_status === "Impacto parcial",
    )
    .reduce((sum, action) => sum + action.financial_impact * 0.62, 0);

  return [
    { label: "Perdida potencial", tone: "negative", value: potentialLoss },
    { label: "Recuperacion esperada", tone: "positive", value: expectedRecovery },
    { label: "Recuperacion obtenida", tone: "positive", value: obtainedRecovery },
    {
      label: "Impacto residual",
      tone: "neutral",
      value: Math.max(potentialLoss - obtainedRecovery, 0),
    },
  ] satisfies FinancialWaterfallPoint[];
}

export function createActionDraftFromInsight(
  insight: InsightModel,
  index = 1,
): InsightAction {
  const recommendation = insight.recommended_actions[0];

  return {
    actual_result: "Pendiente",
    affected_kpi: recommendation?.expected_kpi ?? insight.affected_kpis[0]?.label ?? "KPI afectado",
    blockers: [],
    capacity_recovered: "No medible todavia",
    close_date: null,
    comments: ["Borrador creado desde Insights. Requiere confirmacion humana."],
    demo_flag: true,
    description: recommendation?.action ?? insight.summary,
    due_date: recommendation?.suggested_due_date ?? insight.suggested_due_date,
    evidence_required: "Evidencia del KPI antes y despues",
    expected_impact: recommendation?.expected_impact ?? insight.operational_impact,
    expected_result: "Resultado esperado pendiente de validar",
    financial_impact: insight.financial_impact,
    id: `act-draft-${insight.id}-${index}`,
    impact_status: "No medible todavia",
    operational_impact: insight.operational_impact,
    origin_insight_id: insight.id,
    patients_recovered: insight.patient_impact,
    priority: insight.priority,
    responsible: recommendation?.owner ?? insight.suggested_owner,
    start_date: "2026-07-23",
    status: "Borrador",
    team: insight.business_line,
    title: `Accion: ${insight.title}`,
  };
}

export function getSuggestedQuestions(businessLine: string) {
  if (businessLine === "Fisioterapia") {
    return [
      "Donde se pierde la continuidad?",
      "Que pacientes estan en riesgo?",
      "Que profesionales tienen sobrecarga?",
      "Que explica la brecha de ocupacion?",
    ];
  }

  if (businessLine === "Laboratorio") {
    return [
      "Por que cambio el ticket?",
      "Que canal genera mayor valor?",
      "Que medicos disminuyeron su actividad?",
      "Que diferencias existen entre hojas?",
    ];
  }

  if (businessLine === "Imagenes") {
    return [
      "Que modalidad impulso la venta?",
      "Que estudios tienen mayor crecimiento?",
      "Que canal tiene mayor ticket?",
      "Que datos faltan para evaluar equipos y SLA?",
    ];
  }

  return [
    "Que cambio este mes?",
    "Que necesita atencion?",
    "Que sucursal tiene mayor riesgo?",
    "Alcanzaremos la meta?",
    "Resume el periodo para direccion.",
  ];
}

export function describeFilters(filters: InsightFilters) {
  return [
    `Pais: ${filters.country}`,
    `Empresa: ${filters.company}`,
    `Linea: ${filters.businessLine}`,
    `Sucursal: ${filters.branch}`,
    `Gerente: ${filters.manager}`,
    `Periodo: ${filters.period}`,
    `Categoria: ${filters.category}`,
    `Prioridad: ${filters.priority}`,
    `Estado: ${filters.status}`,
    `Responsable: ${filters.responsible}`,
    `Fuente: ${filters.sourceData}`,
  ];
}

export function createDemoAiResponse({
  filters,
  mode,
  question,
  roleLabel,
  scopedInsights,
}: {
  filters: InsightFilters;
  mode: DemoAiResponse["mode"];
  question: string;
  roleLabel: string;
  scopedInsights: InsightModel[];
}): DemoAiResponse {
  const normalizedQuestion = question.toLowerCase();
  const selectedInsight =
    scopedInsights.find((insight) =>
      normalizedQuestion.includes("ticket")
        ? insight.id === "ins-lab-ticket-orders"
        : normalizedQuestion.includes("no-show") ||
            normalizedQuestion.includes("ocupacion")
          ? insight.id === "ins-physio-occupancy-gap"
          : normalizedQuestion.includes("hoja") ||
              normalizedQuestion.includes("evaluacion")
            ? insight.id === "ins-data-template-mismatch"
            : normalizedQuestion.includes("telemedicina")
              ? insight.id === "ins-img-telemedicine-profitability"
              : false,
    ) ?? sortInsightsForToday(scopedInsights)[0] ?? demoInsights[0];
  const kpi = kpiRegistry.find(
    (item) => item.id === selectedInsight.affected_kpis[0]?.kpi_id,
  );
  const actionDraft =
    mode === "Actuar" ? createActionDraftFromInsight(selectedInsight) : undefined;
  const conclusionGate = getInsightConclusionGate(selectedInsight);
  const simulationNote =
    mode === "Simular"
      ? "Simulacion DEMO: si la accion recupera 62% del impacto estimado, el beneficio esperado seria " +
        formatCurrency(selectedInsight.financial_impact * 0.62) +
        "."
      : "";
  const directAnswer =
    conclusionGate.blocked
      ? conclusionGate.message
      : mode === "Simular"
      ? simulationNote
      : mode === "Actuar"
        ? "Prepare un borrador de accion. No se ejecuta hasta que una persona lo confirme."
        : selectedInsight.summary;

  return {
    actionDraft,
    answer:
      conclusionGate.blocked
        ? "AnaliA encontro una senal, pero bloquea la conclusion ejecutiva por calidad insuficiente o fuente pendiente."
        : "AnaliA responde usando datos filtrados, registro de KPIs y trazabilidad. Todo valor demo se marca como DEMO y toda fuente faltante se marca como Pendiente de conexion de datos.",
    assumptions: selectedInsight.assumptions,
    confidence: conclusionGate.blocked
      ? Math.min(selectedInsight.confidence, 64)
      : selectedInsight.confidence,
    directAnswer,
    evidence: selectedInsight.evidence.map(
      (item) =>
        `${item.kpi}: ${item.current_result}; meta ${item.target}; variacion ${item.percent_variation}; fuente ${item.source}.`,
    ),
    filtersUsed: [
      ...describeFilters(filters),
      `Rol: ${roleLabel}`,
      `Insight seleccionado: ${selectedInsight.title}`,
    ],
    interpretation: selectedInsight.operational_impact,
    limitations: [
      ...(conclusionGate.blocked ? [conclusionGate.message] : []),
      ...selectedInsight.assumptions,
      selectedInsight.data_quality_status === "Pendiente de conexion de datos"
        ? "No se puede responder con precision porque falta la fuente de datos de agenda, costos, SLA o equipos."
        : "El dato es DEMO y no debe usarse como resultado oficial.",
    ],
    mode,
    possibleCauses: [
      ...selectedInsight.confirmed_causes.map<InsightCause>((description) => ({
        description,
        type: "Causa confirmada",
      })),
      ...selectedInsight.probable_causes.map<InsightCause>((description) => ({
        description,
        type: "Causa probable",
      })),
    ],
    recommendedAction:
      conclusionGate.blocked
        ? "Completar o conciliar la fuente antes de ejecutar acciones ejecutivas."
        : selectedInsight.recommended_actions[0]?.action ??
          "Revisar evidencia y crear accion con responsable.",
    relatedLinks: [
      {
        href: selectedInsight.related_dashboard_link,
        label: "Abrir modulo relacionado",
      },
      {
        href: "/protected/calidad-datos",
        label: "Ver calidad de datos",
      },
    ],
    sources: [
      ...selectedInsight.source_modules,
      ...selectedInsight.source_records,
      kpi
        ? `KPI oficial: ${kpi.name} (${formatKpiValue(kpi)}; ${getKpiStatusLabel(kpi.dataStatus)})`
        : "KPI oficial pendiente",
    ],
    table: {
      columns: ["Campo", "Valor"],
      rows: [
        ["Insight", selectedInsight.title],
        ["Impacto financiero", formatCurrency(selectedInsight.financial_impact)],
        ["Pacientes afectados", selectedInsight.patient_impact.toLocaleString("en-US")],
        ["Confianza", `${selectedInsight.confidence}%`],
        ["Calidad del dato", selectedInsight.data_quality_status],
      ],
    },
  };
}

export function formatInsightImpact(insight: InsightModel) {
  const financial = insight.financial_impact > 0
    ? formatCurrency(insight.financial_impact)
    : "Sin impacto financiero estimado";
  const patients = insight.patient_impact > 0
    ? `${insight.patient_impact.toLocaleString("en-US")} pacientes`
    : "Sin pacientes estimados";

  return `${financial} / ${patients}`;
}

export function formatConfidence(value: number) {
  return formatRate(value / 100);
}
