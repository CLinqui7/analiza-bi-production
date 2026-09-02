import type { RoleKey } from "../tenant/demo-context.ts";

export type BusinessLineCode =
  | "CONSOLIDATED"
  | "PHYSIOTHERAPY"
  | "LABORATORY"
  | "IMAGING";

export type KpiCategory =
  | "executive"
  | "financial"
  | "operation"
  | "capacity"
  | "quality"
  | "goals"
  | "imports";

export type KpiDataStatus =
  | "AVAILABLE"
  | "PENDING_UPLOAD"
  | "NOT_CONNECTED"
  | "INCOMPLETE"
  | "INVALID"
  | "DEMO"
  | "CALCULATED"
  | "NOT_APPLICABLE";

export type KpiSourceType =
  | "TEMPLATE"
  | "API"
  | "CONNECTOR"
  | "MANUAL"
  | "CALCULATED"
  | "DEMO";

export type KpiFormat = "currency" | "number" | "percent" | "duration" | "score";

export type KpiRegistryItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  businessLine: BusinessLineCode;
  category: KpiCategory;
  unit: string;
  format: KpiFormat;
  numerator: string;
  denominator: string | null;
  formula: string;
  source: string;
  sourceType: KpiSourceType;
  updateFrequency: string;
  dimensions: string[];
  target: number | null;
  thresholdGreen: number | null;
  thresholdYellow: number | null;
  thresholdRed: number | null;
  higherIsBetter: boolean;
  dataStatus: KpiDataStatus;
  lastUpdatedAt: string;
  owner: string;
  drillDownRoute: string;
  requiredFields: string[];
  allowedRoles: RoleKey[];
  demoValue?: number | null;
  demoVariation?: string;
  trend?: "up" | "down" | "flat" | "pending";
};

const executiveRoles: RoleKey[] = [
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
  "viewer",
];

const operatorRoles: RoleKey[] = [
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
];

export const kpiRegistry: KpiRegistryItem[] = [
  {
    id: "kpi-corp-net-revenue",
    code: "CORP_NET_REVENUE",
    name: "Venta neta",
    description: "Venta sin impuestos del periodo seleccionado.",
    businessLine: "CONSOLIDATED",
    category: "executive",
    unit: "moneda",
    format: "currency",
    numerator: "sum(fact_financial.net_revenue)",
    denominator: null,
    formula: "sum(venta_neta)",
    source: "Capa financiera canonica",
    sourceType: "CALCULATED",
    updateFrequency: "Diaria",
    dimensions: ["country", "company", "businessLine", "branch", "period"],
    target: null,
    thresholdGreen: null,
    thresholdYellow: null,
    thresholdRed: null,
    higherIsBetter: true,
    dataStatus: "CALCULATED",
    lastUpdatedAt: "2026-07-21",
    owner: "Finanzas Analiza",
    drillDownRoute: "/protected/finanzas",
    requiredFields: ["net_revenue", "currency_code", "tax_amount"],
    allowedRoles: executiveRoles,
    demoVariation: "+8%",
    trend: "up",
  },
  {
    id: "kpi-lab-orders-total",
    code: "LAB_ORDERS_TOTAL",
    name: "Ordenes totales",
    description: "Ordenes creadas por laboratorio en el periodo.",
    businessLine: "LABORATORY",
    category: "operation",
    unit: "ordenes",
    format: "number",
    numerator: "count(fact_lab_orders.id)",
    denominator: null,
    formula: "count(ordenes_laboratorio)",
    source: "Plantilla mensual laboratorio / LIS futuro",
    sourceType: "TEMPLATE",
    updateFrequency: "Diaria o por carga",
    dimensions: ["country", "company", "branch", "channel", "payer", "doctor"],
    target: 9200,
    thresholdGreen: 1,
    thresholdYellow: 0.9,
    thresholdRed: 0.8,
    higherIsBetter: true,
    dataStatus: "DEMO",
    lastUpdatedAt: "2026-07-21",
    owner: "Gerente de operaciones laboratorio",
    drillDownRoute: "/protected/citas",
    requiredFields: ["order_id", "created_at", "branch_id", "patient_key"],
    allowedRoles: executiveRoles,
    demoValue: 9034,
    demoVariation: "+12%",
    trend: "up",
  },
  {
    id: "kpi-lab-tests-processed",
    code: "LAB_TESTS_PROCESSED",
    name: "Pruebas procesadas",
    description: "Pruebas y perfiles procesados por laboratorio.",
    businessLine: "LABORATORY",
    category: "operation",
    unit: "pruebas",
    format: "number",
    numerator: "sum(fact_lab_order_tests.quantity)",
    denominator: null,
    formula: "sum(pruebas_procesadas)",
    source: "LIS / plantilla de pruebas",
    sourceType: "CONNECTOR",
    updateFrequency: "Pendiente",
    dimensions: ["country", "company", "branch", "technical_area", "test"],
    target: null,
    thresholdGreen: null,
    thresholdYellow: null,
    thresholdRed: null,
    higherIsBetter: true,
    dataStatus: "PENDING_UPLOAD",
    lastUpdatedAt: "Pendiente",
    owner: "Laboratorio tecnico",
    drillDownRoute: "/protected/laboratorio",
    requiredFields: ["order_id", "test_code", "processed_at"],
    allowedRoles: operatorRoles,
    trend: "pending",
  },
  {
    id: "kpi-lab-analyzer-utilization",
    code: "LAB_ANALYZER_UTILIZATION",
    name: "Utilizacion tecnica",
    description: "Pruebas procesadas sobre capacidad tecnica disponible.",
    businessLine: "LABORATORY",
    category: "capacity",
    unit: "porcentaje",
    format: "percent",
    numerator: "sum(fact_lab_order_tests.processed_tests)",
    denominator: "sum(fact_lab_inventory.technical_capacity)",
    formula: "pruebas_procesadas / capacidad_tecnica_disponible",
    source: "LIS + capacidad por analizador",
    sourceType: "CONNECTOR",
    updateFrequency: "Diaria",
    dimensions: ["branch", "technical_area", "analyzer", "hour"],
    target: 0.82,
    thresholdGreen: 0.82,
    thresholdYellow: 0.7,
    thresholdRed: 0.6,
    higherIsBetter: true,
    dataStatus: "NOT_CONNECTED",
    lastUpdatedAt: "Pendiente",
    owner: "Laboratorio tecnico",
    drillDownRoute: "/protected/capacidad",
    requiredFields: ["processed_tests", "technical_capacity"],
    allowedRoles: operatorRoles,
    trend: "pending",
  },
  {
    id: "kpi-physio-real-occupancy",
    code: "PHYSIO_REAL_OCCUPANCY",
    name: "Ocupacion real",
    description: "Horas atendidas sobre horas disponibles de fisioterapeutas.",
    businessLine: "PHYSIOTHERAPY",
    category: "capacity",
    unit: "porcentaje",
    format: "percent",
    numerator: "sum(fact_physio_sessions.attended_minutes)",
    denominator: "sum(professional_schedules.available_minutes)",
    formula: "horas_atendidas / horas_disponibles",
    source: "Agenda fisioterapia",
    sourceType: "DEMO",
    updateFrequency: "Diaria",
    dimensions: ["country", "company", "branch", "professional", "service"],
    target: 0.86,
    thresholdGreen: 0.86,
    thresholdYellow: 0.72,
    thresholdRed: 0.6,
    higherIsBetter: true,
    dataStatus: "DEMO",
    lastUpdatedAt: "2026-07-21",
    owner: "Gerente de operaciones fisioterapia",
    drillDownRoute: "/protected/capacidad",
    requiredFields: ["available_minutes", "attended_minutes"],
    allowedRoles: executiveRoles,
    demoValue: 0.61,
    demoVariation: "-9 pp",
    trend: "down",
  },
  {
    id: "kpi-physio-plan-compliance",
    code: "PHYSIO_PLAN_COMPLIANCE",
    name: "Cumplimiento de planes",
    description: "Sesiones realizadas sobre sesiones indicadas.",
    businessLine: "PHYSIOTHERAPY",
    category: "operation",
    unit: "porcentaje",
    format: "percent",
    numerator: "sum(fact_physio_sessions.completed_sessions)",
    denominator: "sum(fact_physio_treatment_plans.indicated_sessions)",
    formula: "sesiones_realizadas / sesiones_indicadas",
    source: "Plantilla de sesiones y planes",
    sourceType: "TEMPLATE",
    updateFrequency: "Semanal",
    dimensions: ["branch", "professional", "service", "plan"],
    target: 0.84,
    thresholdGreen: 0.84,
    thresholdYellow: 0.72,
    thresholdRed: 0.62,
    higherIsBetter: true,
    dataStatus: "PENDING_UPLOAD",
    lastUpdatedAt: "Pendiente",
    owner: "Gerente de operaciones fisioterapia",
    drillDownRoute: "/protected/fisioterapia",
    requiredFields: ["plan_id", "indicated_sessions", "completed_sessions"],
    allowedRoles: operatorRoles,
    trend: "pending",
  },
  {
    id: "kpi-imaging-equipment-utilization",
    code: "IMG_EQUIPMENT_UTILIZATION",
    name: "Utilizacion real de equipo",
    description: "Horas utilizadas sobre horas operativas disponibles.",
    businessLine: "IMAGING",
    category: "capacity",
    unit: "porcentaje",
    format: "percent",
    numerator: "sum(fact_equipment_usage.used_minutes)",
    denominator: "sum(fact_equipment_usage.available_minutes)",
    formula: "horas_utilizadas / horas_operativas_disponibles",
    source: "RIS/PACS futuro",
    sourceType: "CONNECTOR",
    updateFrequency: "Diaria",
    dimensions: ["country", "company", "branch", "equipment", "modality"],
    target: 0.82,
    thresholdGreen: 0.82,
    thresholdYellow: 0.68,
    thresholdRed: 0.55,
    higherIsBetter: true,
    dataStatus: "DEMO",
    lastUpdatedAt: "2026-07-21",
    owner: "Gerente de operaciones imagenes",
    drillDownRoute: "/protected/capacidad",
    requiredFields: ["equipment_id", "used_minutes", "available_minutes"],
    allowedRoles: executiveRoles,
    demoValue: 0.63,
    demoVariation: "-7 pp",
    trend: "down",
  },
  {
    id: "kpi-imaging-pending-reports",
    code: "IMG_PENDING_REPORTS",
    name: "Informes pendientes",
    description: "Estudios realizados sin informe validado.",
    businessLine: "IMAGING",
    category: "operation",
    unit: "informes",
    format: "number",
    numerator: "count(fact_imaging_reports.id where status = 'pending')",
    denominator: null,
    formula: "count(informes_pendientes)",
    source: "RIS/PACS futuro",
    sourceType: "CONNECTOR",
    updateFrequency: "Cada hora",
    dimensions: ["branch", "modality", "radiologist"],
    target: 0,
    thresholdGreen: 0,
    thresholdYellow: 20,
    thresholdRed: 40,
    higherIsBetter: false,
    dataStatus: "NOT_CONNECTED",
    lastUpdatedAt: "Pendiente",
    owner: "Direccion imagenes",
    drillDownRoute: "/protected/imagenes",
    requiredFields: ["study_id", "performed_at", "report_validated_at"],
    allowedRoles: operatorRoles,
    trend: "pending",
  },
];

export function safeDivide(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null) {
    return null;
  }

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }

  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

export function getKpisForBusinessLine(
  businessLine: BusinessLineCode,
  category?: KpiCategory,
) {
  return kpiRegistry.filter(
    (kpi) =>
      (kpi.businessLine === businessLine ||
        businessLine === "CONSOLIDATED" ||
        kpi.businessLine === "CONSOLIDATED") &&
      (!category || kpi.category === category),
  );
}

export function getKpiStatusLabel(status: KpiDataStatus) {
  const labels: Record<KpiDataStatus, string> = {
    AVAILABLE: "Disponible",
    PENDING_UPLOAD: "Pendiente de carga",
    NOT_CONNECTED: "Datos pendientes de conexion",
    INCOMPLETE: "Datos incompletos",
    INVALID: "Dato invalido",
    DEMO: "DEMO",
    CALCULATED: "Calculado",
    NOT_APPLICABLE: "No aplica",
  };

  return labels[status];
}

export function formatKpiValue(kpi: KpiRegistryItem) {
  if (kpi.demoValue === undefined || kpi.demoValue === null) {
    return getKpiStatusLabel(kpi.dataStatus);
  }

  if (kpi.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(kpi.demoValue);
  }

  if (kpi.format === "percent") {
    return `${Math.round(kpi.demoValue * 100)}%`;
  }

  return kpi.demoValue.toLocaleString("en-US");
}
