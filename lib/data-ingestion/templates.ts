import {
  demoBranches,
  demoBusinessLineOptions,
  demoCompanies,
  demoCountries,
  demoOperationalAreas,
  elSalvadorResultBranches,
} from "../tenant/demo-context.ts";

export type IngestionDatasetType =
  | "physiotherapy"
  | "laboratory"
  | "imaging"
  | "billing"
  | "payments"
  | "direct_costs"
  | "capacity"
  | "appointments"
  | "targets"
  | "professionals"
  | "services"
  | "managers"
  | "branches"
  | "crm";

export type IngestionFieldType =
  | "catalog"
  | "currency"
  | "date"
  | "decimal"
  | "integer"
  | "month"
  | "percent"
  | "text";

export type IngestionTemplateField = {
  id: string;
  label: string;
  definition: string;
  required: boolean;
  type: IngestionFieldType;
  aliases: string[];
  example: string;
  validCatalog?: string[];
};

export type IngestionTemplate = {
  id: string;
  version: string;
  datasetType: IngestionDatasetType;
  businessLine: "Consolidado" | "Fisioterapia" | "Laboratorio" | "Imagenes";
  name: string;
  instructions: string;
  acceptedFormats: string[];
  periodField: string;
  dedupeKey: string[];
  criticalFields: string[];
  fields: IngestionTemplateField[];
};

const validCountries = demoCountries.map((country) => country.name);
const validCompanies = demoCompanies.map((company) => company.name);
const validBusinessLines = [
  ...demoBusinessLineOptions.map((line) => line.name),
  "Fisioterapia",
  "Laboratorio",
  "Imagenes",
  "Imágenes",
];
const validBranches = [
  ...demoBranches.map((branch) => branch.name),
  ...elSalvadorResultBranches.map((branch) => branch.name),
];
const validBranchCodes = [
  ...demoBranches.map((branch) => branch.code),
  ...elSalvadorResultBranches.map((branch) => branch.code),
];
const validOperationalAreas = demoOperationalAreas.map((area) => area.name);
const validCurrencies = ["USD"];
const validAppointmentStatuses = [
  "agendada",
  "confirmada",
  "atendida",
  "no_show",
  "cancelada",
  "reprogramada",
];
const validLabStatuses = [
  "recibida",
  "procesada",
  "validada",
  "entregada",
  "rechazada",
];
const validImagingReportStatuses = [
  "pendiente",
  "en_informe",
  "informado",
  "entregado",
  "repetir",
];
const validConnectorStatuses = ["activo", "inactivo", "pausado"];

function field(
  id: string,
  label: string,
  type: IngestionFieldType,
  required: boolean,
  definition: string,
  example: string,
  aliases: string[] = [],
  validCatalog?: string[],
): IngestionTemplateField {
  return {
    aliases,
    definition,
    example,
    id,
    label,
    required,
    type,
    validCatalog,
  };
}

const scopeFields = [
  field("country", "Pais", "catalog", true, "Pais operativo del registro.", "El Salvador", ["pais"], validCountries),
  field("company", "Empresa", "catalog", true, "Unidad o empresa Analiza.", "Analiza Laboratorio", ["empresa", "unidad"], validCompanies),
  field("business_line", "Linea", "catalog", true, "Linea de negocio.", "Laboratorio", ["linea", "linea_negocio"], validBusinessLines),
  field("branch", "Sucursal", "catalog", true, "Sucursal operativa.", "SS - Aguilares - L033", ["sucursal"], validBranches),
  field("branch_code", "Codigo sucursal", "catalog", false, "Codigo de sucursal si existe.", "L033", ["codigo_sucursal"], validBranchCodes),
  field("manager", "Gerente", "text", true, "Responsable operativo del registro.", "Gerente Sucursal DEMO", ["gerente"]),
] satisfies IngestionTemplateField[];

const moneyFields = [
  field("gross_billing", "Facturacion bruta", "currency", false, "Monto antes de descuentos y notas de credito.", "12500.50", ["venta_bruta"]),
  field("discounts", "Descuentos", "currency", false, "Descuentos aplicados.", "250.00", ["descuento"]),
  field("credit_notes", "Notas de credito", "currency", false, "Notas de credito del periodo.", "0.00", ["nota_credito"]),
  field("net_billing", "Facturacion neta", "currency", true, "Monto neto validado para BI.", "12250.50", ["ingreso", "venta_neta", "venta_obtenida"]),
  field("currency", "Moneda", "catalog", true, "Moneda explicita del registro.", "USD", ["moneda"], validCurrencies),
] satisfies IngestionTemplateField[];

export const ingestionTemplates = [
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Fisioterapia",
    criticalFields: ["period", "branch", "professional", "appointment_status"],
    datasetType: "physiotherapy",
    dedupeKey: ["period", "branch", "appointment_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("appointment_id", "ID cita", "text", true, "Identificador estable de cita.", "FIS-1001", ["cita_id"]),
      field("patient_hash", "Paciente hash", "text", true, "Identificador anonimizado.", "pat_demo_001", ["paciente_hash"]),
      field("professional", "Profesional", "text", true, "Terapeuta responsable.", "Terapeuta DEMO", ["profesional"]),
      field("service", "Servicio", "text", true, "Servicio o sesion.", "Sesion fisioterapia", ["servicio"]),
      field("appointment_date", "Fecha cita", "date", true, "Fecha de la cita.", "2026-07-15", ["fecha"]),
      field("appointment_status", "Estado cita", "catalog", true, "Estado homologado.", "atendida", ["estado"], validAppointmentStatuses),
      field("scheduled_minutes", "Minutos agendados", "integer", true, "Minutos reservados.", "45", ["minutos_agendados"]),
      field("completed_minutes", "Minutos completados", "integer", false, "Minutos completados reales.", "45", ["minutos_completados"]),
      field("revenue", "Ingreso", "currency", false, "Ingreso asociado.", "45.00", ["ingreso"]),
      field("currency", "Moneda", "catalog", true, "Moneda explicita.", "USD", ["moneda"], validCurrencies),
    ],
    id: "TPL-FISIO-APPOINTMENTS",
    instructions: "Usar paciente anonimizado; no cargar nombre, telefono, documento ni notas clinicas.",
    name: "Fisioterapia - citas, sesiones y continuidad",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Laboratorio",
    criticalFields: ["period", "branch", "order_id", "test_code", "status"],
    datasetType: "laboratory",
    dedupeKey: ["period", "branch", "order_id", "test_code"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("order_id", "Orden", "text", true, "Numero de orden.", "L-9001", ["num_orden", "orden"]),
      field("test_code", "Prueba", "text", true, "Codigo de prueba.", "HEMOGRAMA", ["codigo_prueba", "prueba"]),
      field("volume", "Volumen", "integer", true, "Cantidad procesada.", "1", ["volumen"]),
      field("revenue", "Ingreso", "currency", true, "Ingreso de la prueba u orden.", "18.00", ["ingreso", "venta"]),
      field("direct_cost", "Costo directo", "currency", true, "Costo directo asociado.", "7.50", ["costo", "costo_directo"]),
      field("received_at", "Recepcion", "date", true, "Fecha de recepcion.", "2026-07-15", ["fecha", "fecha_recepcion"]),
      field("status", "Estado", "catalog", true, "Estado homologado de muestra/orden.", "procesada", ["estado"], validLabStatuses),
      field("currency", "Moneda", "catalog", true, "Moneda explicita.", "USD", ["moneda"], validCurrencies),
    ],
    id: "TPL-LAB-ORDERS",
    instructions: "Cargar por sucursal y gerente; costos, volumen y estado son obligatorios para publicar.",
    name: "Laboratorio - ordenes, pruebas, costos y estados",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Imagenes",
    criticalFields: ["period", "branch", "study_id", "modality", "report_status"],
    datasetType: "imaging",
    dedupeKey: ["period", "branch", "study_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("study_id", "Estudio", "text", true, "Identificador de estudio.", "IMG-1001", ["estudio_id", "estudio"]),
      field("modality", "Modalidad", "text", true, "Modalidad RIS/PACS.", "Ultrasonido", ["modalidad"]),
      field("equipment", "Equipo", "text", true, "Equipo usado.", "US-01", ["equipo"]),
      field("professional", "Profesional", "text", true, "Tecnico o medico responsable.", "Tecnico DEMO", ["profesional"]),
      field("study_date", "Fecha estudio", "date", true, "Fecha de realizacion.", "2026-07-15", ["fecha"]),
      field("duration_minutes", "Duracion", "integer", true, "Duracion en minutos.", "25", ["duracion"]),
      field("downtime_minutes", "Tiempo detenido", "integer", false, "Minutos no operativos.", "0", ["tiempo_detenido"]),
      field("revenue", "Ingreso", "currency", true, "Ingreso del estudio.", "65.00", ["ingreso"]),
      field("direct_cost", "Costo directo", "currency", true, "Costo directo.", "24.00", ["costo"]),
      field("report_status", "Estado informe", "catalog", true, "Estado del informe.", "informado", ["estado_informe"], validImagingReportStatuses),
      field("currency", "Moneda", "catalog", true, "Moneda explicita.", "USD", ["moneda"], validCurrencies),
    ],
    id: "TPL-IMG-STUDIES",
    instructions: "RIS/PACS futuro debe conservar modalidad, equipo, tiempos y estado de informe.",
    name: "Imagenes - estudios, equipos, tiempos e informes",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "branch", "invoice_id", "net_billing", "currency"],
    datasetType: "billing",
    dedupeKey: ["period", "branch", "invoice_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("invoice_id", "Factura", "text", true, "Identificador de factura.", "FAC-1001", ["factura"]),
      field("payer", "Pagador", "text", true, "Cliente/pagador anonimizado o institucional.", "Particular", ["pagador"]),
      field("channel", "Canal", "text", true, "Canal comercial.", "Venta directa", ["canal"]),
      ...moneyFields,
      field("service_detail", "Detalle servicio", "text", false, "Detalle o codigo de servicio facturado.", "Perfil laboratorio", ["detalle_servicio"]),
    ],
    id: "TPL-BILLING",
    instructions: "Separar bruta, descuentos, notas de credito y neta; no mezclar cobros.",
    name: "Facturacion - facturas, notas y detalle",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "branch", "payment_id", "amount", "currency"],
    datasetType: "payments",
    dedupeKey: ["period", "branch", "payment_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("payment_id", "Pago", "text", true, "Identificador de pago.", "PAY-1001", ["pago"]),
      field("invoice_id", "Factura", "text", false, "Factura relacionada.", "FAC-1001", ["factura"]),
      field("payment_method", "Forma de pago", "text", true, "Metodo de cobro.", "Tarjeta", ["forma_pago"]),
      field("amount", "Monto", "currency", true, "Monto cobrado.", "100.00", ["monto", "cobro"]),
      field("currency", "Moneda", "catalog", true, "Moneda explicita.", "USD", ["moneda"], validCurrencies),
      field("payment_date", "Fecha pago", "date", true, "Fecha de cobro.", "2026-07-15", ["fecha"]),
    ],
    id: "TPL-PAYMENTS",
    instructions: "Cobros deben reconciliar con formas de pago y facturacion neta cuando corresponda.",
    name: "Cobros - pagos y cuentas por cobrar",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "branch", "cost_id", "amount", "currency"],
    datasetType: "direct_costs",
    dedupeKey: ["period", "branch", "cost_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("cost_id", "Costo", "text", true, "Identificador de costo.", "COST-1001", ["costo_id"]),
      field("cost_category", "Categoria", "text", true, "Categoria de costo directo.", "Reactivos", ["categoria"]),
      field("service", "Servicio", "text", false, "Servicio relacionado.", "Hemograma", ["servicio"]),
      field("amount", "Monto", "currency", true, "Monto de costo directo.", "30.00", ["monto"]),
      field("currency", "Moneda", "catalog", true, "Moneda explicita.", "USD", ["moneda"], validCurrencies),
    ],
    id: "TPL-DIRECT-COSTS",
    instructions: "Costos directos alimentan margen de contribucion; no inventar gastos faltantes.",
    name: "Costos directos",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "branch", "resource", "available_hours"],
    datasetType: "capacity",
    dedupeKey: ["period", "branch", "resource"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("resource", "Recurso", "text", true, "Profesional, sala, equipo o analizador.", "Analizador 01", ["recurso"]),
      field("resource_type", "Tipo recurso", "text", true, "Tipo de capacidad.", "analizador", ["tipo_recurso"]),
      field("available_hours", "Horas disponibles", "decimal", true, "Horas disponibles aprobadas.", "160", ["horas_disponibles"]),
      field("blocked_hours", "Horas bloqueadas", "decimal", false, "Feriados, mantenimiento o ausencias.", "8", ["horas_bloqueadas"]),
    ],
    id: "TPL-CAPACITY",
    instructions: "Capacidad es prerequisito para ocupacion; no publicar ocupacion con denominador ausente.",
    name: "Capacidad base",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "branch", "appointment_id", "appointment_status"],
    datasetType: "appointments",
    dedupeKey: ["period", "branch", "appointment_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("appointment_id", "Cita", "text", true, "Identificador de cita/orden/estudio.", "APT-1001", ["cita"]),
      field("appointment_date", "Fecha", "date", true, "Fecha de cita.", "2026-07-15", ["fecha"]),
      field("appointment_status", "Estado", "catalog", true, "Estado operacional.", "atendida", ["estado"], validAppointmentStatuses),
      field("professional", "Profesional", "text", false, "Responsable.", "Profesional DEMO", ["profesional"]),
    ],
    id: "TPL-APPOINTMENTS",
    instructions: "Estados futuros no penalizan historico; separar no-show, cancelacion y reprogramacion.",
    name: "Citas operativas",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "branch", "kpi_id", "target_value"],
    datasetType: "targets",
    dedupeKey: ["period", "branch", "kpi_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("kpi_id", "KPI", "text", true, "KPI con meta aprobada.", "finance.net_billing", ["kpi"]),
      field("target_value", "Meta", "decimal", true, "Valor final aprobado.", "100000", ["meta"]),
      field("unit", "Unidad", "text", true, "Unidad del KPI.", "USD", ["unidad"]),
      field("approved_by", "Aprobador", "text", true, "Usuario aprobador.", "CEO DEMO", ["aprobado_por"]),
    ],
    id: "TPL-TARGETS",
    instructions: "Metas sugeridas y finales deben permanecer separadas y auditadas.",
    name: "Metas aprobadas",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "branch", "professional_id", "professional_name"],
    datasetType: "professionals",
    dedupeKey: ["period", "branch", "professional_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes vigente.", "2026-07", ["mes", "periodo"]),
      field("professional_id", "ID profesional", "text", true, "Identificador interno.", "PRO-001", ["profesional_id"]),
      field("professional_name", "Profesional", "text", true, "Nombre o alias operativo.", "Profesional DEMO", ["profesional"]),
      field("status", "Estado", "catalog", true, "Estado del profesional.", "activo", ["estado"], validConnectorStatuses),
    ],
    id: "TPL-PROFESSIONALS",
    instructions: "Evitar datos personales no necesarios; usar alias cuando aplique.",
    name: "Profesionales",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["service_code", "service_name", "business_line"],
    datasetType: "services",
    dedupeKey: ["service_code", "business_line"],
    fields: [
      field("service_code", "Codigo servicio", "text", true, "Codigo unico.", "LAB-HEMO", ["codigo_servicio"]),
      field("business_line", "Linea", "catalog", true, "Linea del servicio.", "Laboratorio", ["linea"], validBusinessLines),
      field("service_name", "Servicio", "text", true, "Nombre del servicio.", "Hemograma", ["servicio"]),
      field("list_price", "Precio lista", "currency", true, "Precio vigente.", "18.00", ["precio"]),
      field("direct_cost", "Costo directo", "currency", true, "Costo directo.", "7.50", ["costo"]),
      field("currency", "Moneda", "catalog", true, "Moneda explicita.", "USD", ["moneda"], validCurrencies),
      field("status", "Estado", "catalog", true, "Estado del servicio.", "activo", ["estado"], validConnectorStatuses),
    ],
    id: "TPL-SERVICES",
    instructions: "Catalogo requerido para mapear facturacion, pruebas, estudios y sesiones.",
    name: "Servicios",
    periodField: "status",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "manager_id", "manager_name", "operational_area"],
    datasetType: "managers",
    dedupeKey: ["period", "manager_id"],
    fields: [
      ...scopeFields.slice(0, 3),
      field("period", "Periodo", "month", true, "Mes vigente.", "2026-07", ["mes", "periodo"]),
      field("manager_id", "ID gerente", "text", true, "Identificador interno.", "MGR-001", ["gerente_id"]),
      field("manager_name", "Gerente", "text", true, "Nombre o alias operativo.", "Gerente DEMO", ["gerente"]),
      field("operational_area", "Area", "catalog", true, "Area operativa.", "Area Metropolitana", ["area"], validOperationalAreas),
      field("role", "Rol", "text", true, "Rol operativo.", "gerente_sucursal", ["rol"]),
      field("status", "Estado", "catalog", true, "Estado.", "activo", ["estado"], validConnectorStatuses),
    ],
    id: "TPL-MANAGERS",
    instructions: "Gerentes y asignaciones alimentan alcance y auditoria.",
    name: "Gerentes",
    periodField: "period",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["country", "company", "branch", "branch_code", "manager"],
    datasetType: "branches",
    dedupeKey: ["country", "company", "branch_code"],
    fields: [
      ...scopeFields,
      field("operational_area", "Area", "catalog", true, "Area operativa.", "Area Metropolitana", ["area"], validOperationalAreas),
      field("status", "Estado", "catalog", true, "Estado.", "activo", ["estado"], validConnectorStatuses),
    ],
    id: "TPL-BRANCHES",
    instructions: "No publicar datos de sucursal si no existe alcance pais/empresa/area/sucursal.",
    name: "Sucursales",
    periodField: "status",
    version: "2026-08-sprint3",
  },
  {
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    businessLine: "Consolidado",
    criticalFields: ["period", "lead_id", "source", "conversion_status"],
    datasetType: "crm",
    dedupeKey: ["period", "lead_id"],
    fields: [
      ...scopeFields,
      field("period", "Periodo", "month", true, "Mes reportado.", "2026-07", ["mes", "periodo"]),
      field("lead_id", "Lead", "text", true, "Identificador CRM.", "CRM-1001", ["lead"]),
      field("source", "Fuente", "text", true, "Fuente o canal.", "Referidor", ["fuente"]),
      field("campaign", "Campana", "text", false, "Campana relacionada.", "Julio DEMO", ["campana"]),
      field("referrer", "Referidor", "text", false, "Referidor o medico.", "Referidor DEMO", ["referidor"]),
      field("conversion_status", "Conversion", "text", true, "Estado de conversion.", "convertido", ["conversion"]),
      field("anonymous_customer_id", "Cliente anonimizado", "text", false, "Cliente/paciente anonimizado.", "anon_1001", ["cliente_hash"]),
    ],
    id: "TPL-CRM",
    instructions: "CRM nunca debe cargar datos personales identificables al BI.",
    name: "CRM - leads, referidos y conversion",
    periodField: "period",
    version: "2026-08-sprint3",
  },
] satisfies IngestionTemplate[];

export function getIngestionTemplate(datasetType: IngestionDatasetType) {
  return ingestionTemplates.find((template) => template.datasetType === datasetType);
}

export function buildTemplateCsv(template: IngestionTemplate) {
  const headers = template.fields.map((fieldItem) => fieldItem.id);
  const exampleRow = template.fields.map((fieldItem) => fieldItem.example);

  return `${headers.join(",")}\n${exampleRow.join(",")}\n`;
}

export const sourceStatusLabels = [
  "Conectado",
  "Sin configurar",
  "Error",
  "Pausado",
  "Pendiente",
] as const;

export type SourceStatusLabel = (typeof sourceStatusLabels)[number];
