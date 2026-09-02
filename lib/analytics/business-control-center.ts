export type BusinessControlLine = "Laboratorio" | "Fisioterapia" | "Imagenes";

export type ConnectorEndpoint = {
  method: "GET" | "POST";
  path: string;
  purpose: string;
  requiredFields: string[];
  feedsModules: string[];
};

export type CrmConnectorPlan = {
  line: BusinessControlLine;
  owner: string;
  crmObject: string;
  keyPrefix: string;
  demoLastFour: string;
  authScope: string[];
  endpoints: ConnectorEndpoint[];
  setupSteps: string[];
  requirements: string[];
  fallbackDocuments: string[];
};

export type AnaliaQualitySuggestion = {
  id: string;
  module: string;
  line: BusinessControlLine | "Consolidado";
  priority: "Alta" | "Media" | "Baja";
  target: "Plantilla de resultados" | "Dashboard" | "Conector" | "Modelo";
  issue: string;
  suggestedChange: string;
  expectedImpact: string;
  affectedDashboards: string[];
  sourceTrace: string;
};

export type GoalStrategySuggestion = {
  id: string;
  line: BusinessControlLine;
  branch: string;
  manager: string;
  currentMonthlyRevenue: number;
  suggestedGoalRevenue: number;
  conservativeGrowthRate: number;
  confidence: "Alta" | "Media" | "Baja";
  bonusPoolSuggestion: number;
  bonusRule: string;
  strategy: string;
  simulatedRoiLow: number;
  simulatedRoiHigh: number;
  assumptions: string[];
  guardrail: string;
};

export const crmConnectorPlans: CrmConnectorPlan[] = [
  {
    authScope: [
      "crm:read_patients_anonymized",
      "crm:read_appointments",
      "crm:read_billing_summary",
    ],
    crmObject: "Ordenes, pacientes anonimizados, pruebas y pagos",
    demoLastFour: "L7A2",
    endpoints: [
      {
        feedsModules: ["Laboratorio", "Operacion ejecutiva", "Salud financiera"],
        method: "POST",
        path: "/api/connectors/crm/laboratorio/orders",
        purpose: "Recibir ordenes, pacientes anonimizados y estado de pago.",
        requiredFields: ["order_id", "anonymous_patient_id", "branch_code", "created_at", "gross_amount"],
      },
      {
        feedsModules: ["Laboratorio", "Servicios", "Calidad de datos"],
        method: "POST",
        path: "/api/connectors/crm/laboratorio/tests",
        purpose: "Recibir pruebas por orden, costo directo y estado tecnico.",
        requiredFields: ["order_id", "test_code", "test_name", "direct_cost", "result_status"],
      },
    ],
    fallbackDocuments: [
      "Plantilla resultados de sucursal",
      "Catalogo de pruebas y costos",
      "Inventario y reactivos",
    ],
    keyPrefix: "az_lab_demo",
    line: "Laboratorio",
    owner: "Webmaster + Gerencia laboratorio",
    requirements: [
      "URL base del CRM o API gateway",
      "Ambiente sandbox antes de produccion",
      "Webhook firmado o OAuth client credentials",
      "Diccionario de sucursales y codigos de pruebas",
      "Campos anonimizados para pacientes",
    ],
    setupSteps: [
      "Crear conector DEMO y validar alcance de lectura.",
      "Copiar endpoint del modulo Laboratorio en el CRM.",
      "Configurar llave en el servidor del CRM, no en hojas Excel.",
      "Enviar archivo o payload de prueba sin PII.",
      "Validar calidad de datos y publicar version aprobada.",
    ],
  },
  {
    authScope: [
      "crm:read_patients_anonymized",
      "crm:read_appointments",
      "crm:read_sessions",
    ],
    crmObject: "Solicitudes, citas, sesiones, planes y pagos",
    demoLastFour: "F3P8",
    endpoints: [
      {
        feedsModules: ["Fisioterapia", "Citas por negocio", "Capacidad y ocupacion"],
        method: "POST",
        path: "/api/connectors/crm/fisioterapia/appointments",
        purpose: "Recibir solicitudes, citas, asistencia, no-show y cancelaciones.",
        requiredFields: ["appointment_id", "anonymous_patient_id", "branch_code", "status", "scheduled_at"],
      },
      {
        feedsModules: ["Fisioterapia", "Profesionales", "Metas y avances"],
        method: "POST",
        path: "/api/connectors/crm/fisioterapia/sessions",
        purpose: "Recibir sesiones atendidas, profesional, plan y facturacion.",
        requiredFields: ["session_id", "professional_id", "plan_id", "duration_minutes", "net_amount"],
      },
    ],
    fallbackDocuments: [
      "Plantilla de sesiones",
      "Plantilla de agenda y no-show",
      "Planilla de profesionales y bonos",
    ],
    keyPrefix: "az_fis_demo",
    line: "Fisioterapia",
    owner: "Webmaster + Gerencia fisioterapia",
    requirements: [
      "Estados normalizados de citas",
      "Profesionales y horarios disponibles",
      "Planes terapeuticos por paciente anonimizado",
      "Reglas de no-show y cancelacion",
      "Costos por hora profesional",
    ],
    setupSteps: [
      "Crear conector DEMO para agenda y sesiones.",
      "Mapear estados del CRM a estados normalizados de Analiza.",
      "Enviar prueba de cita atendida, cancelada y no-show.",
      "Validar capacidad disponible contra horas atendidas.",
      "Activar publicacion mensual cuando AnaliA marque calidad suficiente.",
    ],
  },
  {
    authScope: [
      "crm:read_patients_anonymized",
      "crm:read_studies",
      "crm:read_equipment_usage",
    ],
    crmObject: "Solicitudes, estudios, modalidades, equipos e informes",
    demoLastFour: "I9M4",
    endpoints: [
      {
        feedsModules: ["Imagenes", "Operacion ejecutiva", "Capacidad y ocupacion"],
        method: "POST",
        path: "/api/connectors/crm/imagenes/studies",
        purpose: "Recibir estudios agendados, realizados, modalidad y equipo.",
        requiredFields: ["study_id", "modality", "equipment_id", "branch_code", "performed_at"],
      },
      {
        feedsModules: ["Imagenes", "Profesionales", "Salud financiera"],
        method: "POST",
        path: "/api/connectors/crm/imagenes/reports",
        purpose: "Recibir informe, radiologo, entrega y monto facturado.",
        requiredFields: ["study_id", "radiologist_id", "report_status", "delivered_at", "net_amount"],
      },
    ],
    fallbackDocuments: [
      "Plantilla de estudios",
      "Plantilla de equipos y mantenimiento",
      "Plantilla de informes pendientes",
    ],
    keyPrefix: "az_img_demo",
    line: "Imagenes",
    owner: "Webmaster + Gerencia imagenes",
    requirements: [
      "Catalogo de modalidades",
      "Catalogo de equipos y horas disponibles",
      "Estados de informe y entrega",
      "Costos por modalidad y uso de equipo",
      "Reglas de mantenimiento o equipo detenido",
    ],
    setupSteps: [
      "Crear conector DEMO para estudios e informes.",
      "Mapear modalidades, equipos y sucursales.",
      "Enviar payload de estudio realizado e informe pendiente.",
      "Validar ocupacion de equipo contra horas disponibles.",
      "Publicar solo si no faltan costos directos o equipo detenido.",
    ],
  },
];

export const analiaQualitySuggestions: AnaliaQualitySuggestion[] = [
  {
    affectedDashboards: ["Salud financiera", "Servicios", "Laboratorio"],
    expectedImpact: "Evita interpretar margen alto cuando faltan reactivos o compras urgentes.",
    id: "dq-lab-costos-reactivos",
    issue: "Costo por prueba incompleto en plantillas de laboratorio.",
    line: "Laboratorio",
    module: "Plantillas",
    priority: "Alta",
    sourceTrace: "Plantillas laboratorio DEMO / hoja costos / Julio 2026",
    suggestedChange:
      "Agregar columnas obligatorias: costo reactivo, merma, vencimiento y compra urgente por prueba.",
    target: "Plantilla de resultados",
  },
  {
    affectedDashboards: ["Citas por negocio", "Capacidad y ocupacion", "Fisioterapia"],
    expectedImpact: "Mejora lectura de ocupacion efectiva y perdida por no-show.",
    id: "dq-fisio-estados-agenda",
    issue: "Estados de cita no distinguen cancelacion tardia, no-show y reprogramacion.",
    line: "Fisioterapia",
    module: "Citas por negocio",
    priority: "Alta",
    sourceTrace: "CRM agenda DEMO / estados mapeados / Julio 2026",
    suggestedChange:
      "Normalizar estados y exigir hora de cancelacion para separar perdida recuperable.",
    target: "Conector",
  },
  {
    affectedDashboards: ["Imagenes", "Salud financiera", "Capacidad y ocupacion"],
    expectedImpact: "Permite saber si la baja utilidad viene de equipo detenido o baja demanda.",
    id: "dq-img-equipo-costo",
    issue: "No siempre se captura equipo, modalidad y tiempo detenido en estudios.",
    line: "Imagenes",
    module: "Imagenes",
    priority: "Media",
    sourceTrace: "Plantilla estudios DEMO / equipos / Junio 2026",
    suggestedChange:
      "Hacer obligatorios equipo_id, modalidad, minutos usados y motivo de equipo detenido.",
    target: "Dashboard",
  },
  {
    affectedDashboards: ["Resumen ejecutivo", "Metas y avances", "Auditoria"],
    expectedImpact: "Evita aprobar metas con datos incompletos o sin responsable.",
    id: "dq-metas-trazabilidad",
    issue: "Meta sugerida no siempre conserva fuente, supuesto y aprobador final.",
    line: "Consolidado",
    module: "Metas y avances",
    priority: "Alta",
    sourceTrace: "Plan de metas DEMO / version mensual / Julio 2026",
    suggestedChange:
      "Guardar meta sugerida, meta editada, meta final, motivo de cambio y usuario aprobador.",
    target: "Modelo",
  },
];

export const goalStrategySuggestions: GoalStrategySuggestion[] = [
  {
    assumptions: [
      "Demanda actual sostiene agenda sin contratar mas profesionales.",
      "No-show baja de 9% a 6% con confirmacion 24h antes.",
      "Ticket promedio se mantiene estable.",
    ],
    bonusPoolSuggestion: 1850,
    bonusRule: "60% cumplimiento de sesiones, 25% asistencia efectiva, 15% calidad de registro.",
    branch: "Fisioterapia Norte",
    confidence: "Media",
    conservativeGrowthRate: 0.075,
    currentMonthlyRevenue: 94200,
    guardrail: "No subir meta si la ocupacion efectiva cae bajo 72% dos semanas seguidas.",
    id: "goal-fis-norte-retencion",
    line: "Fisioterapia",
    manager: "Gerente Norte",
    simulatedRoiHigh: 2.1,
    simulatedRoiLow: 1.35,
    strategy:
      "Recuperar sesiones perdidas con recordatorios, lista de espera activa y paquetes de continuidad.",
    suggestedGoalRevenue: 101200,
  },
  {
    assumptions: [
      "Costo de reactivos se controla con compras programadas.",
      "Volumen sube sin deteriorar tiempo de entrega.",
      "Se priorizan pruebas con margen positivo.",
    ],
    bonusPoolSuggestion: 2200,
    bonusRule: "50% margen por prueba, 30% entrega en meta, 20% calidad/inventario.",
    branch: "Laboratorio Aguilares",
    confidence: "Media",
    conservativeGrowthRate: 0.052,
    currentMonthlyRevenue: 86900,
    guardrail: "No bonificar volumen si el margen por prueba cae mas de 2 puntos.",
    id: "goal-lab-aguilares-margen",
    line: "Laboratorio",
    manager: "Katherine Leonardo",
    simulatedRoiHigh: 1.85,
    simulatedRoiLow: 1.18,
    strategy:
      "Aumentar ordenes medicas de pruebas rentables y reducir compras urgentes de reactivos.",
    suggestedGoalRevenue: 91400,
  },
  {
    assumptions: [
      "Equipo tiene capacidad ociosa en franja vespertina.",
      "Campana se dirige a referidores existentes.",
      "No se agrega costo fijo nuevo.",
    ],
    bonusPoolSuggestion: 1450,
    bonusRule: "45% estudios realizados, 35% informes a tiempo, 20% uso de equipo.",
    branch: "Imagenes Este",
    confidence: "Baja",
    conservativeGrowthRate: 0.038,
    currentMonthlyRevenue: 67500,
    guardrail: "Validar mantenimiento y disponibilidad de radiologo antes de aprobar.",
    id: "goal-img-este-ocupacion",
    line: "Imagenes",
    manager: "Gerente Este",
    simulatedRoiHigh: 1.55,
    simulatedRoiLow: 0.92,
    strategy:
      "Llenar horas ociosas con convenios y agenda prioritaria de modalidades con margen positivo.",
    suggestedGoalRevenue: 70100,
  },
];

export function maskDemoApiKey(prefix: string, lastFour: string) {
  return `${prefix}_****_****_${lastFour}`;
}

export function buildDemoApiKey(prefix: string) {
  const segment = Math.random().toString(36).slice(2, 6).toUpperCase();
  const secondSegment = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}_${segment}_${secondSegment}_DEMO`;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
