export const importBusinessLines = [
  "Consolidado",
  "Laboratorio",
  "Fisioterapia",
  "Imagenes",
] as const;

export type ImportBusinessLine = (typeof importBusinessLines)[number];

export type ImportSourceMode = "Conector" | "Carga masiva";

export type BulkImportStatus =
  | "Pendiente de carga"
  | "Listo para cargar"
  | "Validado"
  | "Importado"
  | "Con errores"
  | "Reemplazado"
  | "Archivado";

export type ConnectorStatus =
  | "Conectado DEMO"
  | "Pendiente credenciales"
  | "Pendiente API"
  | "No disponible"
  | "Deshabilitado real";

export type ImportFrequency =
  | "Diario"
  | "Semanal"
  | "Quincenal"
  | "Mensual"
  | "Al cierre"
  | "Bajo demanda";

export type BulkImportDocument = {
  id: string;
  businessLine: ImportBusinessLine;
  name: string;
  purpose: string;
  ownerRole: string;
  frequency: ImportFrequency;
  deadline: string;
  required: boolean;
  acceptedFormats: string[];
  sourceTemplate: string;
  targetModules: string[];
  keyFields: string[];
  validationRules: string[];
  blockingRules: string[];
  updateRule: string;
  connectorFallback: string;
  piiRisk: "Bajo" | "Medio" | "Alto";
  status: BulkImportStatus;
  lastUploadedAt: string | null;
  nextDueAt: string;
  demoFlag: true;
};

export type ConnectorPlan = {
  id: string;
  businessLine: ImportBusinessLine;
  system: string;
  purpose: string;
  ownerRole: string;
  status: ConnectorStatus;
  credentialRequirement: string;
  endpointOrSource: string;
  syncFrequency: ImportFrequency;
  fallbackDocumentIds: string[];
  dataQualityGate: string;
  auditTrail: string;
  demoFlag: true;
};

export type ImportPipelineStep = {
  id: string;
  label: string;
  owner: string;
  description: string;
  gate: string;
};

export type ImportBatchRun = {
  id: string;
  businessLine: ImportBusinessLine;
  documentId: string;
  documentName: string;
  period: string;
  owner: string;
  status: BulkImportStatus;
  records: string;
  qualityScore: number;
  publishedModules: string[];
  traceability: string;
  demoFlag: true;
};

export type ImportCoverageSummary = {
  line: ImportBusinessLine | "Todas";
  totalDocuments: number;
  requiredDocuments: number;
  pendingRequired: number;
  validatedOrImported: number;
  errorDocuments: number;
  pendingConnectors: number;
  nextDueAt: string;
};

export type ManualMonthlyFormInputType =
  | "currency"
  | "date"
  | "file"
  | "month"
  | "number"
  | "percent"
  | "text";

export type ManualMonthlyFormField = {
  id: string;
  label: string;
  description: string;
  inputType: ManualMonthlyFormInputType;
  unit: string;
  required: boolean;
  placeholder: string;
  appliesTo: ImportBusinessLine[];
  min?: number;
  max?: number;
};

export type ManualMonthlyFormStep = {
  id: string;
  title: string;
  description: string;
  ownerNote: string;
  fields: ManualMonthlyFormField[];
};

export type ManualMonthlySubmissionStatus =
  | "Borrador DEMO"
  | "Publicado DEMO"
  | "Bloqueado por calidad DEMO";

export type ManualMonthlyDeadlineStatus =
  | "A tiempo DEMO"
  | "Tarde DEMO"
  | "Pendiente DEMO";

export type ManualMonthlyHistoryEntry = {
  id: string;
  businessLine: ImportBusinessLine;
  branch: string;
  period: string;
  manager: string;
  branchManager?: string;
  areaManager?: string;
  deadlineDate?: string;
  deadlineStatus?: ManualMonthlyDeadlineStatus;
  punctualityScore?: number;
  netRevenue: number;
  revenueTarget: number;
  grossMarginRate: number;
  effectiveOccupancyRate: number;
  activityVolume: number;
  dataQualityScore: number;
  status: ManualMonthlySubmissionStatus;
  sourceTrace: string;
  createdAt: string;
  demoFlag: true;
};

export type ManualMonthlyHistorySummary = {
  totalEntries: number;
  publishedEntries: number;
  lastPeriod: string;
  lastNetRevenue: number;
  averageMarginRate: number;
  averageOccupancyRate: number;
  averageDataQualityScore: number;
  qualityWarnings: number;
};

const sharedTargetModules = [
  "Resumen ejecutivo",
  "Operacion ejecutiva",
  "Salud financiera",
  "Insights",
  "Metas y avances",
  "Calidad de datos",
];

const manualOperationalLines: ImportBusinessLine[] = [
  "Laboratorio",
  "Fisioterapia",
  "Imagenes",
];

const nonLaboratoryOperationalLines: ImportBusinessLine[] = [
  "Fisioterapia",
  "Imagenes",
];

export const bulkImportDocuments: BulkImportDocument[] = [
  {
    id: "core-master-catalogs",
    businessLine: "Consolidado",
    name: "Catalogos maestros de Analiza",
    purpose:
      "Define paises, empresas, lineas, sucursales, gerentes, servicios, roles y usuarios que estructuran todo el BI.",
    ownerRole: "Webmaster / Administrador",
    frequency: "Mensual",
    deadline: "Antes del dia 1 de cada mes",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "ANALIZA_CATALOGOS_MAESTROS_V1",
    targetModules: ["Todos los modulos"],
    keyFields: [
      "pais",
      "empresa",
      "linea_negocio",
      "sucursal",
      "codigo_sucursal",
      "gerente",
      "rol",
      "estado",
    ],
    validationRules: [
      "Cada sucursal debe tener codigo unico y gerente asignado.",
      "Las lineas validas son Fisioterapia, Laboratorio e Imagenes.",
      "No se publica ningun KPI si la sucursal no existe en catalogo.",
    ],
    blockingRules: [
      "Sucursal duplicada con codigos distintos.",
      "Linea de negocio vacia.",
      "Usuario sin rol o sucursal asignada cuando aplica.",
    ],
    updateRule:
      "Se versiona por mes. Si cambia una sucursal, el nuevo catalogo aplica solo desde el periodo confirmado.",
    connectorFallback: "Directorio corporativo o ERP maestro cuando exista API.",
    piiRisk: "Medio",
    status: "Validado",
    lastUploadedAt: "2026-07-21",
    nextDueAt: "2026-08-01",
    demoFlag: true,
  },
  {
    id: "core-goals",
    businessLine: "Consolidado",
    name: "Metas por negocio, sucursal, servicio y profesional",
    purpose:
      "Alimenta metas sugeridas, metas finales aprobadas, avance mensual y brechas por responsable.",
    ownerRole: "CEO y Gerente de operaciones",
    frequency: "Mensual",
    deadline: "Antes del cierre de planificacion",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "ANALIZA_METAS_V1",
    targetModules: ["Metas y avances", "Resumen ejecutivo", "Sucursales", "Servicios", "Profesionales"],
    keyFields: [
      "periodo",
      "linea_negocio",
      "sucursal",
      "tipo_meta",
      "responsable",
      "valor_sugerido",
      "valor_final",
      "aprobado_por",
    ],
    validationRules: [
      "La meta final debe quedar separada de la meta sugerida por el sistema.",
      "Cada meta necesita periodo, responsable y unidad de medida.",
      "Las metas historicas no se recalculan sin nueva version aprobada.",
    ],
    blockingRules: [
      "Meta final vacia en un KPI obligatorio.",
      "Unidad de medida incompatible con el KPI.",
      "Meta aprobada sin usuario aprobador.",
    ],
    updateRule:
      "La carga nueva crea version. El CEO conserva la meta final aunque el sistema proponga otra.",
    connectorFallback: "Modulo de planificacion financiera u OKR corporativo.",
    piiRisk: "Bajo",
    status: "Listo para cargar",
    lastUploadedAt: null,
    nextDueAt: "2026-08-01",
    demoFlag: true,
  },
  {
    id: "core-calendar-capacity",
    businessLine: "Consolidado",
    name: "Calendario operativo, horarios, feriados y capacidad base",
    purpose:
      "Define horas disponibles por sucursal, sala, equipo y profesional para medir ocupacion real.",
    ownerRole: "Gerente de operaciones",
    frequency: "Mensual",
    deadline: "Antes de abrir agenda del mes",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "ANALIZA_CAPACIDAD_BASE_V1",
    targetModules: ["Capacidad y ocupacion", "Operacion ejecutiva", "Sucursales", "Profesionales"],
    keyFields: [
      "periodo",
      "linea_negocio",
      "sucursal",
      "recurso",
      "tipo_recurso",
      "horas_disponibles",
      "horas_no_laborables",
    ],
    validationRules: [
      "Las horas disponibles no pueden ser negativas.",
      "Los feriados se descuentan antes de calcular ocupacion efectiva.",
      "Cada recurso debe pertenecer a una sucursal y linea.",
    ],
    blockingRules: [
      "Capacidad faltante para una sucursal activa.",
      "Horas disponibles mayores a las horas calendario sin justificacion.",
      "Recurso sin linea de negocio.",
    ],
    updateRule:
      "Los cambios de horario crean version desde fecha efectiva; no reescriben meses cerrados.",
    connectorFallback: "Sistema de agenda o RRHH cuando exponga horarios por recurso.",
    piiRisk: "Bajo",
    status: "Pendiente de carga",
    lastUploadedAt: null,
    nextDueAt: "2026-08-01",
    demoFlag: true,
  },
  {
    id: "core-financial-results",
    businessLine: "Consolidado",
    name: "Estado de resultados, presupuesto y gastos",
    purpose:
      "Separa ingresos, costos directos, gastos fijos, gastos variables, utilidad y presupuesto por linea.",
    ownerRole: "Finanzas y Gerente de operaciones",
    frequency: "Mensual",
    deadline: "Dia 3 despues del cierre",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "ANALIZA_FINANZAS_RESULTADOS_V1",
    targetModules: ["Salud financiera", "Resumen ejecutivo", "Servicios", "Insights"],
    keyFields: [
      "periodo",
      "linea_negocio",
      "sucursal",
      "cuenta",
      "tipo_costo",
      "monto",
      "presupuesto",
      "centro_costo",
    ],
    validationRules: [
      "Ingresos, costos y gastos deben venir por linea de negocio.",
      "Costos fijos y variables deben estar clasificados.",
      "No se muestra margen neto si faltan costos esenciales.",
    ],
    blockingRules: [
      "Monto sin periodo.",
      "Cuenta financiera sin tipo de costo.",
      "Sucursal no reconciliada contra catalogo.",
    ],
    updateRule:
      "Cierre mensual bloquea ediciones directas. Correcciones entran como reemplazo versionado con motivo.",
    connectorFallback: "ERP, contabilidad o facturacion electronica.",
    piiRisk: "Bajo",
    status: "Con errores",
    lastUploadedAt: "2026-07-22",
    nextDueAt: "2026-08-03",
    demoFlag: true,
  },
  {
    id: "core-service-prices-costs",
    businessLine: "Consolidado",
    name: "Catalogo de servicios, precios y costos unitarios",
    purpose:
      "Permite calcular rentabilidad por servicio, brecha de meta, ticket y precio promedio.",
    ownerRole: "Finanzas y Webmaster / Administrador",
    frequency: "Mensual",
    deadline: "Antes de publicar tarifas",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "ANALIZA_SERVICIOS_COSTOS_V1",
    targetModules: ["Servicios", "Salud financiera", "Resumen ejecutivo"],
    keyFields: [
      "codigo_servicio",
      "linea_negocio",
      "nombre_servicio",
      "precio_lista",
      "costo_directo",
      "costo_fijo_asignado",
      "estado",
    ],
    validationRules: [
      "Cada servicio debe tener codigo unico por linea.",
      "Precio y costo directo deben ser mayores o iguales a cero.",
      "Los servicios inactivos no alimentan nuevas metas.",
    ],
    blockingRules: [
      "Servicio vendido sin codigo.",
      "Costo directo faltante en servicio critico.",
      "Servicio asociado a linea equivocada.",
    ],
    updateRule:
      "La tarifa nueva se activa por fecha efectiva; historico conserva el precio vigente al momento de venta.",
    connectorFallback: "Catalogo de facturacion o POS.",
    piiRisk: "Bajo",
    status: "Listo para cargar",
    lastUploadedAt: null,
    nextDueAt: "2026-08-01",
    demoFlag: true,
  },
  {
    id: "lab-branch-results",
    businessLine: "Laboratorio",
    name: "Plantilla de resultados de sucursal Laboratorio",
    purpose:
      "Es la plantilla raiz revisada para El Salvador: venta, meta, costo de venta, margen, clientes, dias, horas, medicos y ubicacion.",
    ownerRole: "Gerente de operaciones de Laboratorio",
    frequency: "Mensual",
    deadline: "Dia 2 despues del cierre",
    required: true,
    acceptedFormats: [".xlsx"],
    sourceTemplate: "Plantilla Julio/Junio 2026 por sucursal",
    targetModules: [...sharedTargetModules, "Laboratorio", "Sucursales", "Gerentes y bonos"],
    keyFields: [
      "periodo",
      "sucursal",
      "gerente",
      "venta_objetivo",
      "venta_obtenida",
      "costo_venta",
      "margen",
      "num_orden",
    ],
    validationRules: [
      "El periodo del nombre del archivo debe coincidir con el periodo dentro del libro.",
      "Se detectan y bloquean duplicados de la misma sucursal y periodo.",
      "Las hojas con datos personales se anonimizan antes de analitica.",
    ],
    blockingRules: [
      "Archivo duplicado sin seleccion de reemplazo.",
      "Sucursal o gerente no coincide con catalogo.",
      "Hojas de cliente con identificadores visibles para dashboards.",
    ],
    updateRule:
      "Cada sucursal sube una version mensual. Una correccion reemplaza la version activa y conserva auditoria.",
    connectorFallback: "LIS o facturacion cuando exista endpoint por orden y prueba.",
    piiRisk: "Alto",
    status: "Validado",
    lastUploadedAt: "2026-07-21",
    nextDueAt: "2026-08-02",
    demoFlag: true,
  },
  {
    id: "lab-orders-tests",
    businessLine: "Laboratorio",
    name: "Ordenes, pruebas, muestras y estados",
    purpose:
      "Actualiza volumen real, flujo de paciente, pruebas por orden, entrega de resultados y atrasos.",
    ownerRole: "Gerente de operaciones de Laboratorio",
    frequency: "Diario",
    deadline: "Al cierre diario",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "LAB_ORDENES_PRUEBAS_V1",
    targetModules: ["Operacion ejecutiva", "Citas por negocio", "Capacidad y ocupacion", "Laboratorio", "Insights"],
    keyFields: [
      "fecha",
      "sucursal",
      "num_orden",
      "codigo_prueba",
      "estado_muestra",
      "hora_recepcion",
      "hora_validacion",
      "hora_entrega",
    ],
    validationRules: [
      "La orden debe tener estado homologado.",
      "Cada prueba debe mapear contra el catalogo de servicios.",
      "Los tiempos deben seguir recepcion, procesamiento, validacion y entrega.",
    ],
    blockingRules: [
      "Orden sin fecha o sucursal.",
      "Prueba sin codigo de servicio.",
      "Estado desconocido que afecte resultados.",
    ],
    updateRule:
      "Carga incremental diaria. Si se carga el mismo dia, el sistema reemplaza ordenes existentes por llave.",
    connectorFallback: "LIS o CRM de laboratorio.",
    piiRisk: "Alto",
    status: "Pendiente de carga",
    lastUploadedAt: null,
    nextDueAt: "2026-07-23",
    demoFlag: true,
  },
  {
    id: "lab-reactives-inventory",
    businessLine: "Laboratorio",
    name: "Reactivos, inventario, lotes y compras urgentes",
    purpose:
      "Explica costo variable, quiebres de inventario, vencimientos y compras que presionan margen.",
    ownerRole: "Gerente de operaciones de Laboratorio",
    frequency: "Semanal",
    deadline: "Cada viernes",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "LAB_INVENTARIO_REACTIVOS_V1",
    targetModules: ["Salud financiera", "Laboratorio", "Servicios", "Insights"],
    keyFields: [
      "fecha",
      "sucursal",
      "reactivo",
      "lote",
      "vencimiento",
      "stock_inicial",
      "consumo",
      "stock_final",
      "costo_unitario",
      "compra_urgente",
    ],
    validationRules: [
      "Consumo no puede exceder stock inicial mas compras.",
      "Los lotes vencidos deben marcarse fuera de uso.",
      "Cada reactivo debe asociarse a una o varias pruebas.",
    ],
    blockingRules: [
      "Lote sin vencimiento.",
      "Costo unitario faltante.",
      "Consumo negativo.",
    ],
    updateRule:
      "El inventario semanal actualiza costos estimados; cierre mensual congela consumo para margen.",
    connectorFallback: "Sistema de inventario o compras.",
    piiRisk: "Bajo",
    status: "Listo para cargar",
    lastUploadedAt: null,
    nextDueAt: "2026-07-24",
    demoFlag: true,
  },
  {
    id: "lab-referrers",
    businessLine: "Laboratorio",
    name: "Medicos referidores, especialidades y visitadores",
    purpose:
      "Mantiene demanda por medico, especialidad, visitador y zona para decisiones comerciales.",
    ownerRole: "Gerente de operaciones de Laboratorio",
    frequency: "Mensual",
    deadline: "Dia 2 despues del cierre",
    required: false,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "LAB_MEDICOS_REFERIDORES_V1",
    targetModules: ["Laboratorio", "Servicios", "Insights", "Sucursales"],
    keyFields: [
      "fecha",
      "doctor",
      "especialidad",
      "municipio",
      "visitador",
      "codigo_servicio",
      "monto",
    ],
    validationRules: [
      "No se deben cargar telefonos personales en analitica.",
      "La especialidad debe estar homologada.",
      "El doctor puede venir seudonimizado con identificador estable.",
    ],
    blockingRules: [
      "Doctor sin identificador estable.",
      "Monto sin orden asociada.",
    ],
    updateRule:
      "Se actualiza mensual; altas de medicos pueden cargarse bajo demanda.",
    connectorFallback: "CRM medico o modulo comercial.",
    piiRisk: "Medio",
    status: "Pendiente de carga",
    lastUploadedAt: null,
    nextDueAt: "2026-08-02",
    demoFlag: true,
  },
  {
    id: "fisio-branch-results",
    businessLine: "Fisioterapia",
    name: "Resultados mensuales de Fisioterapia",
    purpose:
      "Resume sesiones, ingresos, cumplimiento de planes, metas, costos y bonos por sucursal.",
    ownerRole: "Gerente de operaciones de Fisioterapia",
    frequency: "Mensual",
    deadline: "Dia 2 despues del cierre",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "FISIO_RESULTADOS_MENSUALES_V1",
    targetModules: [...sharedTargetModules, "Fisioterapia", "Sucursales", "Gerentes y bonos"],
    keyFields: [
      "periodo",
      "sucursal",
      "gerente",
      "ingreso",
      "meta_ingreso",
      "sesiones_completadas",
      "planes_activos",
      "planes_completados",
      "costo_operativo",
    ],
    validationRules: [
      "Las sesiones y citas deben mantenerse separadas.",
      "El cumplimiento de plan requiere plan anonimo y estado final.",
      "Los bonos solo se calculan con periodo cerrado y aprobado.",
    ],
    blockingRules: [
      "Sucursal sin capacidad base.",
      "Sesion sin fecha o profesional.",
      "Paciente identificable sin seudonimizacion.",
    ],
    updateRule:
      "Carga mensual por sucursal; correcciones reemplazan version con justificacion.",
    connectorFallback: "Agenda terapeutica o CRM de fisioterapia.",
    piiRisk: "Alto",
    status: "Pendiente de carga",
    lastUploadedAt: null,
    nextDueAt: "2026-08-02",
    demoFlag: true,
  },
  {
    id: "fisio-appointments-sessions",
    businessLine: "Fisioterapia",
    name: "Agenda, citas, sesiones y continuidad terapeutica",
    purpose:
      "Actualiza asistencia efectiva, no-show, cancelaciones, abandono de plan e ingreso perdido.",
    ownerRole: "Gerente de operaciones de Fisioterapia",
    frequency: "Diario",
    deadline: "Al cierre diario",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "FISIO_CITAS_SESIONES_V1",
    targetModules: ["Citas por negocio", "Capacidad y ocupacion", "Fisioterapia", "Profesionales", "Insights"],
    keyFields: [
      "fecha",
      "sucursal",
      "paciente_hash",
      "profesional",
      "estado_cita",
      "tipo_sesion",
      "plan_id",
      "ingreso",
      "motivo_cancelacion",
    ],
    validationRules: [
      "El paciente debe estar seudonimizado antes de entrar al BI.",
      "Los estados validos separan agendada, confirmada, atendida, no-show y cancelada.",
      "Cada sesion debe vincularse a profesional y sucursal.",
    ],
    blockingRules: [
      "Paciente con nombre, telefono o documento visible.",
      "Estado de cita no homologado.",
      "Sesion completada sin profesional.",
    ],
    updateRule:
      "Carga incremental diaria por cita. El sistema recalcula ocupacion y continuidad del periodo activo.",
    connectorFallback: "Sistema de agenda o CRM terapeutico.",
    piiRisk: "Alto",
    status: "Listo para cargar",
    lastUploadedAt: null,
    nextDueAt: "2026-07-23",
    demoFlag: true,
  },
  {
    id: "fisio-professional-payroll",
    businessLine: "Fisioterapia",
    name: "Profesionales, planillas generadas y bonos",
    purpose:
      "Alimenta productividad, calidad de atencion, asignacion de bonos y carga por terapeuta.",
    ownerRole: "Gerente de operaciones de Fisioterapia",
    frequency: "Quincenal",
    deadline: "Antes de corte de planilla",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "FISIO_PROFESIONALES_BONOS_V1",
    targetModules: ["Profesionales", "Gerentes y bonos", "Fisioterapia", "Auditoria"],
    keyFields: [
      "periodo",
      "sucursal",
      "profesional",
      "horas_disponibles",
      "horas_atendidas",
      "sesiones",
      "score_calidad",
      "bono_sugerido",
      "bono_final",
    ],
    validationRules: [
      "Bono sugerido y bono final deben guardarse separados.",
      "El bono final requiere usuario aprobador.",
      "No se calcula bono si faltan horas disponibles.",
    ],
    blockingRules: [
      "Profesional sin sucursal.",
      "Bono final mayor a politica sin justificacion.",
      "Horas atendidas mayores a horas disponibles sin excepcion documentada.",
    ],
    updateRule:
      "Cada corte quincenal genera planilla. Reemplazos requieren motivo y auditoria.",
    connectorFallback: "RRHH o nomina cuando exista integracion.",
    piiRisk: "Medio",
    status: "Pendiente de carga",
    lastUploadedAt: null,
    nextDueAt: "2026-07-31",
    demoFlag: true,
  },
  {
    id: "img-branch-results",
    businessLine: "Imagenes",
    name: "Resultados mensuales de Imagenes",
    purpose:
      "Resume estudios, ingresos, costos, metas, modalidad, equipos, informes y bonos por sucursal.",
    ownerRole: "Gerente de operaciones de Imagenes",
    frequency: "Mensual",
    deadline: "Dia 2 despues del cierre",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "IMG_RESULTADOS_MENSUALES_V1",
    targetModules: [...sharedTargetModules, "Imagenes", "Sucursales", "Gerentes y bonos"],
    keyFields: [
      "periodo",
      "sucursal",
      "modalidad",
      "estudios_realizados",
      "ingreso",
      "meta_ingreso",
      "costo_operativo",
      "informes_pendientes",
    ],
    validationRules: [
      "Cada estudio debe tener modalidad.",
      "Ingresos de telemedicina se separan de estudios presenciales.",
      "No se muestra utilidad si faltan costos de equipo o mantenimiento.",
    ],
    blockingRules: [
      "Modalidad vacia.",
      "Equipo no existe en catalogo.",
      "Estudio sin estado de informe.",
    ],
    updateRule:
      "Carga mensual por sucursal y modalidad. Reemplazo conserva version anterior.",
    connectorFallback: "RIS/PACS o sistema de agenda de imagenes.",
    piiRisk: "Alto",
    status: "Pendiente de carga",
    lastUploadedAt: null,
    nextDueAt: "2026-08-02",
    demoFlag: true,
  },
  {
    id: "img-appointments-studies",
    businessLine: "Imagenes",
    name: "Citas, estudios, informes y telemedicina",
    purpose:
      "Actualiza solicitudes, agenda, estudios realizados, informes pendientes, entrega y demanda por modalidad.",
    ownerRole: "Gerente de operaciones de Imagenes",
    frequency: "Diario",
    deadline: "Al cierre diario",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "IMG_CITAS_ESTUDIOS_V1",
    targetModules: ["Citas por negocio", "Capacidad y ocupacion", "Imagenes", "Profesionales", "Insights"],
    keyFields: [
      "fecha",
      "sucursal",
      "paciente_hash",
      "modalidad",
      "equipo",
      "estado_cita",
      "estado_estudio",
      "medico_informante",
      "fecha_entrega",
    ],
    validationRules: [
      "Paciente debe estar seudonimizado.",
      "La modalidad debe mapearse al catalogo de servicios.",
      "El flujo separa cita, estudio, informe y entrega.",
    ],
    blockingRules: [
      "Paciente identificable.",
      "Estudio sin modalidad.",
      "Informe entregado antes de realizado.",
    ],
    updateRule:
      "Carga incremental diaria; corrige estados por llave de estudio y periodo.",
    connectorFallback: "RIS/PACS o CRM de imagenes.",
    piiRisk: "Alto",
    status: "Listo para cargar",
    lastUploadedAt: null,
    nextDueAt: "2026-07-23",
    demoFlag: true,
  },
  {
    id: "img-equipment-maintenance",
    businessLine: "Imagenes",
    name: "Equipos, disponibilidad, mantenimiento e insumos",
    purpose:
      "Explica ocupacion real, tiempo muerto, capacidad perdida y costos fijos/variables por equipo.",
    ownerRole: "Gerente de operaciones de Imagenes",
    frequency: "Semanal",
    deadline: "Cada viernes",
    required: true,
    acceptedFormats: [".xlsx", ".csv"],
    sourceTemplate: "IMG_EQUIPOS_MANTENIMIENTO_V1",
    targetModules: ["Capacidad y ocupacion", "Salud financiera", "Servicios", "Imagenes", "Insights"],
    keyFields: [
      "fecha",
      "sucursal",
      "equipo",
      "modalidad",
      "horas_disponibles",
      "horas_fuera_servicio",
      "motivo_fuera_servicio",
      "costo_mantenimiento",
      "costo_insumos",
    ],
    validationRules: [
      "El equipo debe estar activo en catalogo.",
      "Horas fuera de servicio se descuentan de capacidad disponible.",
      "Costos se asignan por modalidad o equipo.",
    ],
    blockingRules: [
      "Equipo sin sucursal.",
      "Horas negativas.",
      "Costo de mantenimiento sin periodo.",
    ],
    updateRule:
      "Semanal para alertas; cierre mensual congela costos por equipo.",
    connectorFallback: "Sistema de mantenimiento o inventario.",
    piiRisk: "Bajo",
    status: "Pendiente de carga",
    lastUploadedAt: null,
    nextDueAt: "2026-07-24",
    demoFlag: true,
  },
];

export const connectorPlans: ConnectorPlan[] = [
  {
    id: "connector-crm-agenda",
    businessLine: "Consolidado",
    system: "CRM / agenda corporativa",
    purpose:
      "Sincroniza citas, estados, pacientes seudonimizados, profesionales, sucursales y canales.",
    ownerRole: "Webmaster / Administrador",
    status: "Pendiente credenciales",
    credentialRequirement:
      "API oficial, usuario tecnico, alcance de solo lectura y ambiente de prueba.",
    endpointOrSource: "REST API / exportacion oficial del proveedor",
    syncFrequency: "Diario",
    fallbackDocumentIds: [
      "fisio-appointments-sessions",
      "img-appointments-studies",
      "lab-orders-tests",
    ],
    dataQualityGate:
      "Estados homologados, pacientes seudonimizados y sucursal valida antes de publicar.",
    auditTrail:
      "Cada sincronizacion guarda conector, rango, hash de archivo/respuesta y usuario responsable.",
    demoFlag: true,
  },
  {
    id: "connector-billing",
    businessLine: "Consolidado",
    system: "Facturacion / caja",
    purpose:
      "Sincroniza ventas, formas de pago, notas de credito, descuentos, impuestos y cuentas por cobrar.",
    ownerRole: "Webmaster / Administrador y Finanzas",
    status: "Pendiente API",
    credentialRequirement:
      "Endpoint oficial de ventas con permisos de lectura y mapeo de centro de costo.",
    endpointOrSource: "API de facturacion o exportacion certificada",
    syncFrequency: "Diario",
    fallbackDocumentIds: ["core-financial-results", "lab-branch-results"],
    dataQualityGate:
      "Conciliacion contra total mensual por sucursal antes de actualizar finanzas.",
    auditTrail:
      "Se registra lote, periodo, total bruto, total neto y diferencias de conciliacion.",
    demoFlag: true,
  },
  {
    id: "connector-accounting",
    businessLine: "Consolidado",
    system: "Contabilidad / ERP",
    purpose:
      "Sincroniza costos, gastos, presupuesto, centros de costo y cierres contables.",
    ownerRole: "Webmaster / Administrador y Finanzas",
    status: "Deshabilitado real",
    credentialRequirement:
      "Service account server-only; nunca exponer credenciales en navegador.",
    endpointOrSource: "API ERP / carga de mayor contable",
    syncFrequency: "Mensual",
    fallbackDocumentIds: ["core-financial-results", "core-service-prices-costs"],
    dataQualityGate:
      "Cuentas clasificadas en ingreso, costo directo, gasto fijo o gasto variable.",
    auditTrail:
      "Cada cierre conserva version de presupuesto, archivo fuente y aprobador.",
    demoFlag: true,
  },
  {
    id: "connector-lis",
    businessLine: "Laboratorio",
    system: "LIS Laboratorio",
    purpose:
      "Sincroniza ordenes, pruebas, muestras, resultados, tiempos de entrega y estados clinicos operativos.",
    ownerRole: "Webmaster / Administrador y Gerencia Laboratorio",
    status: "Pendiente credenciales",
    credentialRequirement:
      "API LIS con permisos de lectura, sin datos identificables en analitica.",
    endpointOrSource: "LIS API / exportacion oficial",
    syncFrequency: "Diario",
    fallbackDocumentIds: ["lab-orders-tests", "lab-branch-results"],
    dataQualityGate:
      "Prueba mapeada a catalogo, orden unica y tiempos en secuencia valida.",
    auditTrail:
      "Se conserva trazabilidad por orden seudonimizada, prueba y lote de importacion.",
    demoFlag: true,
  },
  {
    id: "connector-ris-pacs",
    businessLine: "Imagenes",
    system: "RIS / PACS Imagenes",
    purpose:
      "Sincroniza estudios, modalidades, equipos, informes, medico informante y entrega de resultados.",
    ownerRole: "Webmaster / Administrador y Gerencia Imagenes",
    status: "Pendiente credenciales",
    credentialRequirement:
      "API RIS/PACS o exportacion autorizada; no extraer imagenes diagnosticas al BI.",
    endpointOrSource: "RIS/PACS API / HL7 exportado por proveedor",
    syncFrequency: "Diario",
    fallbackDocumentIds: ["img-appointments-studies", "img-equipment-maintenance"],
    dataQualityGate:
      "Estudio con modalidad, equipo, fecha, estado de informe y paciente seudonimizado.",
    auditTrail:
      "Cada evento guarda source id, transformacion, version y estado publicado.",
    demoFlag: true,
  },
  {
    id: "connector-hr-payroll",
    businessLine: "Consolidado",
    system: "RRHH / nomina",
    purpose:
      "Sincroniza profesionales, jornadas, planillas, bonos sugeridos, bonos finales y aprobaciones.",
    ownerRole: "Webmaster / Administrador",
    status: "No disponible",
    credentialRequirement:
      "API de nomina o exportacion segura con datos laborales minimos.",
    endpointOrSource: "RRHH API / archivo oficial",
    syncFrequency: "Quincenal",
    fallbackDocumentIds: ["fisio-professional-payroll"],
    dataQualityGate:
      "Bono final separado de sugerido y aprobado por usuario autorizado.",
    auditTrail:
      "Se registra cambio de bono, aprobador, evidencia y politica aplicada.",
    demoFlag: true,
  },
  {
    id: "connector-inventory",
    businessLine: "Laboratorio",
    system: "Inventario / compras",
    purpose:
      "Sincroniza reactivos, lotes, vencimientos, insumos, compras urgentes y consumo por prueba.",
    ownerRole: "Webmaster / Administrador y Gerencia Laboratorio",
    status: "Pendiente API",
    credentialRequirement:
      "Endpoint oficial de inventario y compras con costos unitarios.",
    endpointOrSource: "API inventario / exportacion de compras",
    syncFrequency: "Semanal",
    fallbackDocumentIds: ["lab-reactives-inventory"],
    dataQualityGate:
      "Lote, vencimiento, costo unitario y stock conciliado por sucursal.",
    auditTrail:
      "Cada movimiento conserva lote, documento fuente y usuario importador.",
    demoFlag: true,
  },
];

export const importPipelineSteps: ImportPipelineStep[] = [
  {
    id: "select-scope",
    label: "1. Seleccionar linea y periodo",
    owner: "Gerente de operaciones",
    description:
      "El cierre mensual queda amarrado a linea de negocio, sucursal, pais y periodo antes de capturar datos.",
    gate: "Sin linea activa no se puede publicar el cierre.",
  },
  {
    id: "fill-form",
    label: "2. Llenar formulario mensual",
    owner: "Gerente de operaciones",
    description:
      "El gerente captura resultados, citas, capacidad, costos, margen y calidad en pasos cortos.",
    gate: "Sin pacientes identificables y sin campos obligatorios vacios.",
  },
  {
    id: "save-progress",
    label: "3. Guardar avance",
    owner: "Gerente de operaciones",
    description:
      "El avance queda en historial DEMO del periodo y aun no cambia ningun dashboard ejecutivo real.",
    gate: "Trazabilidad con fuente, linea, sucursal, periodo y usuario.",
  },
  {
    id: "validate",
    label: "4. Validar en servidor",
    owner: "Sistema",
    description:
      "Se revisan duplicados, fechas, sucursales, unidades, costos, estados, coherencia y calidad.",
    gate: "Sin errores bloqueantes. Advertencias visibles antes de publicar.",
  },
  {
    id: "preview",
    label: "5. Vista previa ejecutiva",
    owner: "Gerente de operaciones",
    description:
      "El responsable ve impactos en KPIs, sucursales, servicios, bonos e Insights antes de confirmar.",
    gate: "Diferencias conciliadas contra cierre o meta.",
  },
  {
    id: "publish",
    label: "6. Confirmar y publicar",
    owner: "Gerente de operaciones o Webmaster",
    description:
      "Solo la version aprobada alimenta los dashboards y AnaliA la usa para alertas tempranas.",
    gate: "Auditoria con usuario, fecha, fuente, version y motivo.",
  },
  {
    id: "replace",
    label: "7. Reemplazar si hay correccion",
    owner: "Webmaster / Administrador",
    description:
      "Una nueva captura no borra el historico: reemplaza la version activa y archiva la anterior.",
    gate: "Motivo obligatorio y periodo desbloqueado o aprobacion especial.",
  },
];

export const importBatchRuns: ImportBatchRun[] = [
  {
    id: "batch-lab-sv-2026-06",
    businessLine: "Laboratorio",
    documentId: "lab-branch-results",
    documentName: "Plantillas de resultados sucursales SV",
    period: "Junio 2026",
    owner: "Gerencia Laboratorio",
    status: "Validado",
    records: "7 archivos",
    qualityScore: 81,
    publishedModules: ["Resumen ejecutivo", "Laboratorio", "Sucursales", "Insights"],
    traceability: "DEMO import lab-branch-results v1",
    demoFlag: true,
  },
  {
    id: "batch-finance-2026-07",
    businessLine: "Consolidado",
    documentId: "core-financial-results",
    documentName: "Estado de resultados, presupuesto y gastos",
    period: "Julio 2026",
    owner: "Finanzas",
    status: "Con errores",
    records: "1 archivo",
    qualityScore: 64,
    publishedModules: [],
    traceability: "DEMO bloqueado por clasificacion de costos",
    demoFlag: true,
  },
  {
    id: "batch-img-daily-2026-07-23",
    businessLine: "Imagenes",
    documentId: "img-appointments-studies",
    documentName: "Citas, estudios, informes y telemedicina",
    period: "23/07/2026",
    owner: "Gerencia Imagenes",
    status: "Listo para cargar",
    records: "Pendiente",
    qualityScore: 0,
    publishedModules: [],
    traceability: "DEMO pendiente de seleccion de archivo",
    demoFlag: true,
  },
];

export const manualMonthlyFormSteps: ManualMonthlyFormStep[] = [
  {
    id: "contexto-cierre",
    title: "Contexto del cierre",
    description:
      "Identifica periodo, sucursal, gerente y fecha de corte antes de guardar datos historicos.",
    ownerNote:
      "Responsable: gerente de operaciones o gerente de sucursal con datos anonimos.",
    fields: [
      {
        id: "period",
        label: "Mes reportado",
        description: "Mes que se cerrara para alimentar dashboards e Insights.",
        inputType: "month",
        unit: "mes",
        required: true,
        placeholder: "2026-07",
        appliesTo: manualOperationalLines,
      },
      {
        id: "branch_reported",
        label: "Sucursal reportada",
        description: "Sucursal del catalogo que entrega el cierre mensual.",
        inputType: "text",
        unit: "sucursal",
        required: true,
        placeholder: "Selecciona una sucursal",
        appliesTo: manualOperationalLines,
      },
      {
        id: "manager_name",
        label: "Gerente de sucursal",
        description:
          "Selecciona el gerente de sucursal desde el catalogo; si falta, debe asignarse antes de publicar.",
        inputType: "text",
        unit: "responsable",
        required: true,
        placeholder: "Selecciona gerente de sucursal",
        appliesTo: manualOperationalLines,
      },
      {
        id: "area_manager_name",
        label: "Gerente de area",
        description:
          "Selecciona el gerente de area que supervisa el grupo de sucursales.",
        inputType: "text",
        unit: "responsable",
        required: true,
        placeholder: "Selecciona gerente de area",
        appliesTo: manualOperationalLines,
      },
      {
        id: "area_zone",
        label: "Departamento",
        description: "Zona, departamento o municipio usado para agrupar sucursales.",
        inputType: "text",
        unit: "departamento",
        required: true,
        placeholder: "Centro",
        appliesTo: manualOperationalLines,
      },
      {
        id: "data_cutoff_date",
        label: "Fecha de corte",
        description: "Ultimo dia incluido en el cierre mensual.",
        inputType: "date",
        unit: "fecha",
        required: true,
        placeholder: "2026-07-31",
        appliesTo: manualOperationalLines,
      },
      {
        id: "load_deadline_date",
        label: "Fecha limite de carga",
        description:
          "El cierre mensual debe publicarse antes o el dia 5 del mes siguiente.",
        inputType: "date",
        unit: "fecha",
        required: true,
        placeholder: "2026-08-05",
        appliesTo: manualOperationalLines,
      },
    ],
  },
  {
    id: "resultados-comerciales",
    title: "Resultados comerciales",
    description:
      "Recoge ventas, metas, pacientes y ticket para medir desempeno real por negocio.",
    ownerNote:
      "AnaliA compara estos valores contra meta, meses anteriores y linea seleccionada.",
    fields: [
      {
        id: "gross_revenue",
        label: "Ingreso bruto",
        description: "Venta total antes de descuentos, anulaciones o notas.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "net_revenue",
        label: "Ingreso neto",
        description: "Ingreso que realmente alimenta margen y avance de meta.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "revenue_target",
        label: "Meta de ingreso",
        description: "Meta final aprobada para el mes y sucursal.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "patients_total",
        label: "Pacientes atendidos",
        description: "Conteo anonimo de pacientes o clientes atendidos.",
        inputType: "number",
        unit: "pacientes",
        required: true,
        placeholder: "0",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "ticket_average",
        label: "Ticket promedio",
        description: "Promedio de ingreso por paciente, orden, sesion o estudio.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
    ],
  },
  {
    id: "financiero-laboratorio",
    title: "Financiero",
    description:
      "Campos financieros de la plantilla de resultados de Laboratorio marcados en amarillo.",
    ownerNote:
      "La gerente ingresa solo los valores amarillos; los totales o validaciones derivadas los calcula AnaliA.",
    fields: [
      {
        id: "lab_financial_target",
        label: "Meta",
        description: "Meta mensual aprobada para la sucursal.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_total_sales",
        label: "Venta Total",
        description: "Venta total reportada en la plantilla mensual.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_cost_of_sale",
        label: "Costo de la Venta",
        description: "Costo de venta del periodo.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
    ],
  },
  {
    id: "datos-generales-laboratorio",
    title: "Datos generales",
    description:
      "Ventas y ordenes por origen de demanda segun la plantilla de Laboratorio.",
    ownerNote:
      "Estos campos explican si la venta vino de orden medica, paciente Analiza, DRSV o domicilios.",
    fields: [
      {
        id: "lab_medical_order_sales",
        label: "Venta por ordenes medicas",
        description: "Monto vendido por ordenes medicas.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_medical_order_count",
        label: "Numero de ordenes medicas",
        description: "Cantidad de ordenes medicas del mes.",
        inputType: "number",
        unit: "ordenes",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },


      {
        id: "lab_analiza_patient_sales",
        label: "Venta por paciente Analiza",
        description: "Monto vendido a pacientes Analiza.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_analiza_order_count",
        label: "Numero de ordenes Analiza",
        description: "Cantidad de ordenes de pacientes Analiza.",
        inputType: "number",
        unit: "ordenes",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_drsv_patient_sales",
        label: "Venta por paciente DRSV",
        description: "Monto vendido a pacientes DRSV.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_drsv_order_count",
        label: "Numero de ordenes DRSV",
        description: "Cantidad de ordenes DRSV del mes.",
        inputType: "number",
        unit: "ordenes",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_home_visit_sales",
        label: "Venta por domicilios",
        description: "Monto vendido por servicios a domicilio.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_home_visit_count",
        label: "Numero de domicilios",
        description: "Cantidad de domicilios atendidos.",
        inputType: "number",
        unit: "domicilios",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_total_orders",
        label: "Numero de Ordenes Totales",
        description: "Total de ordenes del periodo reportado.",
        inputType: "number",
        unit: "ordenes",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
    ],
  },
  {
    id: "operacion-citas",
    title: "Operacion y citas",
    description:
      "Separa volumen realizado, estados de citas y atrasos para explicar la operacion.",
    ownerNote:
      "Estos datos alimentan Operacion ejecutiva, Citas por negocio y alertas tempranas.",
    fields: [
      {
        id: "appointments_completed",
        label: "Citas completadas",
        description: "Citas que llegaron a atencion o servicio realizado.",
        inputType: "number",
        unit: "citas",
        required: true,
        placeholder: "0",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "appointments_no_show",
        label: "No-show",
        description: "Citas en las que el paciente no se presento.",
        inputType: "number",
        unit: "citas",
        required: true,
        placeholder: "0",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "appointments_cancelled",
        label: "Canceladas",
        description: "Citas canceladas antes del servicio.",
        inputType: "number",
        unit: "citas",
        required: true,
        placeholder: "0",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "sla_on_time_rate",
        label: "Cumplimiento SLA",
        description: "Porcentaje de atenciones, informes o entregas dentro del tiempo esperado.",
        inputType: "percent",
        unit: "%",
        required: true,
        placeholder: "0",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
        max: 100,
      },
      {
        id: "therapy_sessions",
        label: "Sesiones realizadas",
        description: "Sesiones de fisioterapia completadas.",
        inputType: "number",
        unit: "sesiones",
        required: true,
        placeholder: "0",
        appliesTo: ["Fisioterapia"],
        min: 0,
      },
      {
        id: "active_treatment_plans",
        label: "Planes activos",
        description: "Planes terapeuticos activos al cierre del mes.",
        inputType: "number",
        unit: "planes",
        required: true,
        placeholder: "0",
        appliesTo: ["Fisioterapia"],
        min: 0,
      },
      {
        id: "imaging_studies",
        label: "Estudios realizados",
        description: "Estudios de imagen realizados por modalidad o sucursal.",
        inputType: "number",
        unit: "estudios",
        required: true,
        placeholder: "0",
        appliesTo: ["Imagenes"],
        min: 0,
      },
      {
        id: "reports_pending",
        label: "Informes pendientes",
        description: "Informes diagnosticos pendientes al cierre.",
        inputType: "number",
        unit: "informes",
        required: true,
        placeholder: "0",
        appliesTo: ["Imagenes"],
        min: 0,
      },
    ],
  },
  {
    id: "capacidad-equipo",
    title: "Capacidad y equipo",
    description:
      "Mide cuanto recurso disponible se uso y cuanto se perdio por espera, agenda o equipo.",
    ownerNote:
      "La ocupacion efectiva no se publica si faltan horas disponibles o usadas.",
    fields: [
      {
        id: "available_hours",
        label: "Horas disponibles",
        description: "Capacidad disponible del mes por sucursal, equipo o profesional.",
        inputType: "number",
        unit: "horas",
        required: true,
        placeholder: "0",
        appliesTo: ["Fisioterapia", "Imagenes"],
        min: 0,
      },
      {
        id: "used_hours",
        label: "Horas utilizadas",
        description: "Horas realmente usadas para servicios completados.",
        inputType: "number",
        unit: "horas",
        required: true,
        placeholder: "0",
        appliesTo: ["Fisioterapia", "Imagenes"],
        min: 0,
      },
      {
        id: "effective_occupancy_rate",
        label: "Ocupacion efectiva",
        description: "Porcentaje real de capacidad usada.",
        inputType: "percent",
        unit: "%",
        required: true,
        placeholder: "0",
        appliesTo: ["Fisioterapia", "Imagenes"],
        min: 0,
        max: 100,
      },
      {
        id: "lost_capacity_hours",
        label: "Horas de capacidad perdida",
        description: "Horas perdidas por cancelaciones, equipo fuera de servicio o brechas de agenda.",
        inputType: "number",
        unit: "horas",
        required: false,
        placeholder: "0",
        appliesTo: ["Fisioterapia", "Imagenes"],
        min: 0,
      },
      {
        id: "equipment_downtime_hours",
        label: "Horas fuera de servicio",
        description: "Tiempo muerto por equipo o mantenimiento.",
        inputType: "number",
        unit: "horas",
        required: true,
        placeholder: "0",
        appliesTo: ["Imagenes"],
        min: 0,
      },
      {
        id: "therapist_hours",
        label: "Horas terapeutas",
        description: "Horas disponibles del equipo terapeutico.",
        inputType: "number",
        unit: "horas",
        required: true,
        placeholder: "0",
        appliesTo: ["Fisioterapia"],
        min: 0,
      },
    ],
  },
  {
    id: "clientes-laboratorio",
    title: "Base de clientes",
    description:
      "Base de clientes de Laboratorio segun los campos amarillos de la plantilla.",
    ownerNote:
      "El promedio diario de clientes se calcula despues; aqui solo se ingresan los valores amarillos.",
    fields: [
      {
        id: "lab_total_clients",
        label: "Cantidad de Clientes Totales",
        description: "Total de clientes atendidos durante el mes.",
        inputType: "number",
        unit: "clientes",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_analiza_clients",
        label: "Cantidad de Clientes (Analiza)",
        description: "Clientes clasificados como Analiza en el periodo.",
        inputType: "number",
        unit: "clientes",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_drsv_clients",
        label: "Cantidad de Clientes (DRSV)",
        description: "Clientes clasificados como DRSV en el periodo.",
        inputType: "number",
        unit: "clientes",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
    ],
  },
  {
    id: "gastos-laboratorio",
    title: "Gastos",
    description:
      "Gastos de Laboratorio que se ingresan desde los renglones amarillos de la plantilla.",
    ownerNote:
      "El total de gastos se calcula desde estos conceptos; no se captura como texto libre para evitar diferencias.",
    fields: [
      {
        id: "lab_rent_expense",
        label: "Renta Local",
        description: "Gasto mensual de renta de local.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_personnel_expense",
        label: "Personal",
        description: "Gasto mensual de personal.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_social_security_expense",
        label: "ISSS/AFP Patronal",
        description: "Gasto patronal reportado para el mes.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_energy_expense",
        label: "Energia",
        description: "Gasto mensual de energia electrica.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_water_expense",
        label: "Agua",
        description: "Gasto mensual de agua.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_internet_expense",
        label: "Internet",
        description: "Gasto mensual de internet.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_petty_cash_expense",
        label: "Caja Chica",
        description: "Monto usado de caja chica durante el mes.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_electronic_security_expense",
        label: "Seguridad Electronica",
        description: "Gasto mensual de seguridad electronica.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_transae_expense",
        label: "TRANSAE",
        description: "Gasto mensual asociado a TRANSAE.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_municipality_expense",
        label: "Alcaldia",
        description: "Gasto municipal reportado para el mes.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_call_center_operating_costs",
        label: "Gastos y costos Operativos CC",
        description: "Gastos y costos operativos asociados a call center.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_company_operating_costs",
        label: "Gastos y costos Operativos empresas",
        description: "Gastos y costos operativos asignados por empresas.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
    ],
  },
  {
    id: "personal-laboratorio",
    title: "Personal",
    description:
      "Personal asignado capturado desde los campos amarillos.",
    ownerNote:
      "El total de personal asignado se calcula con los cargos ingresados.",
    fields: [
      {
        id: "lab_phlebotomists_count",
        label: "Flebotomistas",
        description: "Cantidad de flebotomistas asignados a la sucursal.",
        inputType: "number",
        unit: "personas",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_customer_service_count",
        label: "Atencion al cliente",
        description: "Cantidad de personas en atencion al cliente.",
        inputType: "number",
        unit: "personas",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_nurses_count",
        label: "Enfermeras",
        description: "Cantidad de enfermeras asignadas a la sucursal.",
        inputType: "number",
        unit: "personas",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_technical_area_count",
        label: "Area Tecnica",
        description: "Cantidad de personas asignadas al area tecnica.",
        inputType: "number",
        unit: "personas",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "lab_cleaning_security_count",
        label: "Limpieza / Vigilantes",
        description: "Cantidad de personas en limpieza o vigilancia.",
        inputType: "number",
        unit: "personas",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
    ],
  },
  {
    id: "inventario-laboratorio",
    title: "Inventario",
    description:
      "Monto y cantidad de inventario que la plantilla solicita en amarillo.",
    ownerNote:
      "Los totales de monto y cantidad se calculan con consumibles, insumos y reactivos; AnaliA alerta si algo no cuadra.",
    fields: [
      {
        id: "inventory_consumables_amount",
        label: "Monto Consumibles",
        description: "Monto mensual asociado a consumibles.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "inventory_supplies_amount",
        label: "Monto Insumos",
        description: "Monto mensual asociado a insumos.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "inventory_reactives_amount",
        label: "Monto Reactivos",
        description:
          "Monto mensual asociado a reactivos. AnaliA lo comparara contra venta, ordenes y costo de venta.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "inventory_consumables_quantity",
        label: "Cantidad Consumibles",
        description: "Cantidad de consumibles reportados en el cierre.",
        inputType: "number",
        unit: "unidades",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "inventory_supplies_quantity",
        label: "Cantidad Insumos",
        description: "Cantidad de insumos reportados en el cierre.",
        inputType: "number",
        unit: "unidades",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
      {
        id: "inventory_reactives_quantity",
        label: "Cantidad Reactivos",
        description: "Cantidad de reactivos reportados en el cierre.",
        inputType: "number",
        unit: "unidades",
        required: true,
        placeholder: "0",
        appliesTo: ["Laboratorio"],
        min: 0,
      },
    ],
  },
  {
    id: "costos-margen",
    title: "Costos y margen",
    description:
      "Permite separar costo directo, gasto fijo, gasto variable y margen por linea.",
    ownerNote:
      "Finanzas y operaciones deben poder reconciliar estos campos antes de publicar.",
    fields: [
      {
        id: "direct_costs",
        label: "Costos directos",
        description: "Costos asociados directamente a producir los servicios.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "fixed_costs",
        label: "Gastos fijos",
        description: "Gastos que no cambian proporcionalmente con el volumen mensual.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "variable_costs",
        label: "Gastos variables",
        description: "Gastos que suben o bajan segun volumen, compras o demanda.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
      {
        id: "gross_margin_rate",
        label: "Margen bruto",
        description: "Margen porcentual despues de costos directos.",
        inputType: "percent",
        unit: "%",
        required: true,
        placeholder: "0",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
        max: 100,
      },
      {
        id: "urgent_purchase_cost",
        label: "Compras urgentes",
        description: "Compras de emergencia que presionan margen.",
        inputType: "currency",
        unit: "USD",
        required: false,
        placeholder: "0.00",
        appliesTo: ["Imagenes"],
        min: 0,
      },
      {
        id: "maintenance_cost",
        label: "Mantenimiento e insumos",
        description: "Costos de equipo, mantenimiento o insumos criticos.",
        inputType: "currency",
        unit: "USD",
        required: true,
        placeholder: "0.00",
        appliesTo: ["Imagenes"],
        min: 0,
      },
      {
        id: "bonus_pool",
        label: "Bolsa de bonos sugerida",
        description: "Monto estimado para bonos del periodo, sujeto a aprobacion.",
        inputType: "currency",
        unit: "USD",
        required: false,
        placeholder: "0.00",
        appliesTo: nonLaboratoryOperationalLines,
        min: 0,
      },
    ],
  },
  {
    id: "evaluacion-360",
    title: "Evaluacion 360",
    description:
      "Las evaluaciones se enviaran por correo al equipo y los resultados se cargaran automaticamente en estos campos, sin datos personales ni represalias.",
    ownerNote:
      "El gerente no debe escribir la evaluacion manualmente; en produccion estos campos se llenan desde respuestas anonimas por correo.",
    fields: [
      {
        id: "team_feedback_score",
        label: "Score 360 del equipo automatico",
        description:
          "Promedio anonimo de confianza, claridad, seguimiento y apoyo del gerente recibido por correo.",
        inputType: "percent",
        unit: "%",
        required: false,
        placeholder: "0",
        appliesTo: manualOperationalLines,
        min: 0,
        max: 100,
      },
      {
        id: "team_feedback_theme",
        label: "Tema cualitativo automatico",
        description:
          "Resumen anonimo del tema mas repetido por el equipo este mes.",
        inputType: "text",
        unit: "texto",
        required: false,
        placeholder: "Ej. comunicacion, seguimiento, carga de trabajo",
        appliesTo: manualOperationalLines,
      },
      {
        id: "team_feedback_action",
        label: "Accion sugerida por evaluacion",
        description:
          "Accion sugerida a partir de las respuestas anonimas.",
        inputType: "text",
        unit: "texto",
        required: false,
        placeholder: "Ej. reunion semanal de bloqueo operativo",
        appliesTo: manualOperationalLines,
      },
    ],
  },
  {
    id: "calidad-validacion",
    title: "Excel y montos vendidos",
    description:
      "Carga el reporte comercial de examenes medicos y montos vendidos.",
    ownerNote:
      "El archivo esperado contiene Fecha, Sucursal, Doctor, Examen, Especialidad, Area, Total y Visitador.",
    fields: [
      {
        id: "medical_exam_sales_file",
        label: "Reporte examen medico y montos vendidos",
        description:
          "Sube el Excel mensual con fecha, sucursal, doctor, examen, especialidad, area, total vendido y visitador.",
        inputType: "file",
        unit: ".xlsx",
        required: true,
        placeholder: "Selecciona Reporte_examen_medico_monto.xlsx",
        appliesTo: ["Laboratorio"],
      },
      {
        id: "late_reason",
        label: "Motivo si carga fuera de fecha",
        description:
          "Explicacion corta cuando se publica despues del deadline del dia 5.",
        inputType: "text",
        unit: "texto",
        required: false,
        placeholder: "No aplica",
        appliesTo: nonLaboratoryOperationalLines,
      },
      {
        id: "edit_authorization_code",
        label: "Autorizacion para editar",
        description:
          "Solo se llena si el periodo ya fue publicado y un administrador autorizo reemplazarlo.",
        inputType: "text",
        unit: "codigo",
        required: false,
        placeholder: "Codigo DEMO de autorizacion",
        appliesTo: nonLaboratoryOperationalLines,
      },
      {
        id: "manager_attestation",
        label: "Confirmacion del gerente",
        description: "Declaracion corta de cierre sin datos personales visibles.",
        inputType: "text",
        unit: "texto",
        required: true,
        placeholder: "Confirmo cierre mensual anonimo y conciliado.",
        appliesTo: nonLaboratoryOperationalLines,
      },
    ],
  },
];

export const manualMonthlyHistory: ManualMonthlyHistoryEntry[] = [
  {
    id: "manual-lab-aguilares-2026-06",
    businessLine: "Laboratorio",
    branch: "Aguilares",
    period: "2026-06",
    manager: "Gerencia Laboratorio",
    netRevenue: 48950,
    revenueTarget: 52000,
    grossMarginRate: 38,
    effectiveOccupancyRate: 74,
    activityVolume: 8128,
    dataQualityScore: 81,
    status: "Publicado DEMO",
    sourceTrace: "DEMO formulario mensual laboratorio v1",
    createdAt: "2026-07-02",
    demoFlag: true,
  },
  {
    id: "manual-lab-aguilares-2026-07",
    businessLine: "Laboratorio",
    branch: "Aguilares",
    period: "2026-07",
    manager: "Gerencia Laboratorio",
    netRevenue: 54100,
    revenueTarget: 56000,
    grossMarginRate: 36,
    effectiveOccupancyRate: 78,
    activityVolume: 8460,
    dataQualityScore: 84,
    status: "Borrador DEMO",
    sourceTrace: "DEMO formulario mensual laboratorio v2",
    createdAt: "2026-07-24",
    demoFlag: true,
  },
  {
    id: "manual-fisio-norte-2026-06",
    businessLine: "Fisioterapia",
    branch: "Fisioterapia Norte",
    period: "2026-06",
    manager: "Gerencia Fisioterapia",
    netRevenue: 33200,
    revenueTarget: 36000,
    grossMarginRate: 44,
    effectiveOccupancyRate: 61,
    activityVolume: 1320,
    dataQualityScore: 78,
    status: "Publicado DEMO",
    sourceTrace: "DEMO formulario mensual fisioterapia v1",
    createdAt: "2026-07-02",
    demoFlag: true,
  },
  {
    id: "manual-fisio-norte-2026-07",
    businessLine: "Fisioterapia",
    branch: "Fisioterapia Norte",
    period: "2026-07",
    manager: "Gerencia Fisioterapia",
    netRevenue: 35450,
    revenueTarget: 37000,
    grossMarginRate: 46,
    effectiveOccupancyRate: 64,
    activityVolume: 1394,
    dataQualityScore: 82,
    status: "Borrador DEMO",
    sourceTrace: "DEMO formulario mensual fisioterapia v2",
    createdAt: "2026-07-24",
    demoFlag: true,
  },
  {
    id: "manual-img-este-2026-06",
    businessLine: "Imagenes",
    branch: "Imagenes Este",
    period: "2026-06",
    manager: "Gerencia Imagenes",
    netRevenue: 61400,
    revenueTarget: 65000,
    grossMarginRate: 41,
    effectiveOccupancyRate: 63,
    activityVolume: 521,
    dataQualityScore: 76,
    status: "Publicado DEMO",
    sourceTrace: "DEMO formulario mensual imagenes v1",
    createdAt: "2026-07-02",
    demoFlag: true,
  },
  {
    id: "manual-img-este-2026-07",
    businessLine: "Imagenes",
    branch: "Imagenes Este",
    period: "2026-07",
    manager: "Gerencia Imagenes",
    netRevenue: 64220,
    revenueTarget: 67500,
    grossMarginRate: 39,
    effectiveOccupancyRate: 67,
    activityVolume: 548,
    dataQualityScore: 79,
    status: "Borrador DEMO",
    sourceTrace: "DEMO formulario mensual imagenes v2",
    createdAt: "2026-07-24",
    demoFlag: true,
  },
];

function isVisibleForLine(
  itemLine: ImportBusinessLine,
  selectedLine: ImportBusinessLine | "Todas",
) {
  return (
    selectedLine === "Todas" ||
    itemLine === selectedLine ||
    itemLine === "Consolidado"
  );
}

export function getDocumentsForLine(line: ImportBusinessLine | "Todas") {
  return bulkImportDocuments.filter((document) =>
    isVisibleForLine(document.businessLine, line),
  );
}

export function getConnectorsForLine(line: ImportBusinessLine | "Todas") {
  return connectorPlans.filter((connector) =>
    isVisibleForLine(connector.businessLine, line),
  );
}

export function getManualMonthlyFormStepsForLine(
  line: ImportBusinessLine,
): ManualMonthlyFormStep[] {
  return manualMonthlyFormSteps
    .map((step) => ({
      ...step,
      fields: step.fields.filter((field) => field.appliesTo.includes(line)),
    }))
    .filter((step) => step.fields.length > 0);
}

export function getManualMonthlyHistoryForLine(
  line: ImportBusinessLine | "Todas",
) {
  return manualMonthlyHistory.filter((entry) =>
    line === "Todas" ? entry.businessLine !== "Consolidado" : entry.businessLine === line,
  );
}

export function calculateManualMonthlyHistorySummary(
  entries: ManualMonthlyHistoryEntry[],
): ManualMonthlyHistorySummary {
  const totalEntries = entries.length;
  const publishedEntries = entries.filter(
    (entry) => entry.status === "Publicado DEMO",
  ).length;
  const qualityWarnings = entries.filter(
    (entry) =>
      entry.status === "Bloqueado por calidad DEMO" ||
      entry.dataQualityScore < 75,
  ).length;
  const lastEntry =
    [...entries].sort((left, right) => right.period.localeCompare(left.period))[0] ??
    null;
  const marginTotal = entries.reduce(
    (sum, entry) => sum + entry.grossMarginRate,
    0,
  );
  const occupancyTotal = entries.reduce(
    (sum, entry) => sum + entry.effectiveOccupancyRate,
    0,
  );
  const qualityTotal = entries.reduce(
    (sum, entry) => sum + entry.dataQualityScore,
    0,
  );

  return {
    totalEntries,
    publishedEntries,
    lastPeriod: lastEntry?.period ?? "Sin cierres",
    lastNetRevenue: lastEntry?.netRevenue ?? 0,
    averageMarginRate:
      totalEntries > 0 ? Math.round(marginTotal / totalEntries) : 0,
    averageOccupancyRate:
      totalEntries > 0 ? Math.round(occupancyTotal / totalEntries) : 0,
    averageDataQualityScore:
      totalEntries > 0 ? Math.round(qualityTotal / totalEntries) : 0,
    qualityWarnings,
  };
}

export function getDocumentById(documentId: string) {
  return bulkImportDocuments.find((document) => document.id === documentId) ?? null;
}

export function buildImportCoverageSummary(
  line: ImportBusinessLine | "Todas",
): ImportCoverageSummary {
  const documents = getDocumentsForLine(line);
  const connectors = getConnectorsForLine(line);
  const requiredDocuments = documents.filter((document) => document.required);
  const pendingRequired = requiredDocuments.filter((document) =>
    ["Pendiente de carga", "Listo para cargar", "Con errores"].includes(
      document.status,
    ),
  );
  const validatedOrImported = documents.filter((document) =>
    ["Validado", "Importado"].includes(document.status),
  );
  const errorDocuments = documents.filter(
    (document) => document.status === "Con errores",
  );
  const pendingConnectors = connectors.filter(
    (connector) => connector.status !== "Conectado DEMO",
  );
  const nextDueAt =
    documents
      .map((document) => document.nextDueAt)
      .sort((left, right) => left.localeCompare(right))[0] ?? "Sin fecha";

  return {
    line,
    totalDocuments: documents.length,
    requiredDocuments: requiredDocuments.length,
    pendingRequired: pendingRequired.length,
    validatedOrImported: validatedOrImported.length,
    errorDocuments: errorDocuments.length,
    pendingConnectors: pendingConnectors.length,
    nextDueAt,
  };
}

export function getFallbackDocumentsForConnector(connector: ConnectorPlan) {
  return connector.fallbackDocumentIds
    .map((documentId) => getDocumentById(documentId))
    .filter((document): document is BulkImportDocument => document !== null);
}

export function buildCsvTemplate(document: BulkImportDocument) {
  const header = document.keyFields.join(",");
  const sample = document.keyFields
    .map((field) => {
      if (/fecha|periodo/i.test(field)) {
        return "2026-07-31";
      }

      if (/monto|ingreso|costo|precio|venta|meta|horas|stock|consumo|sesiones|estudios/i.test(field)) {
        return "0";
      }

      if (/paciente/i.test(field)) {
        return "paciente_hash_demo";
      }

      return `${field}_demo`;
    })
    .join(",");

  return `${header}\n${sample}\n`;
}
