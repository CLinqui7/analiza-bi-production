import type { BusinessLineCode, KpiDataStatus } from "@/lib/analytics/kpi-registry";

export type BusinessLineSlug =
  | "consolidado"
  | "fisioterapia"
  | "laboratorio"
  | "imagenes";

export type LineMetric = {
  label: string;
  value: string;
  note: string;
  status: KpiDataStatus;
};

export type FunnelStep = {
  label: string;
  value: string;
  conversion: number | null;
  status: KpiDataStatus;
};

export type LineViewDefinition = {
  slug: BusinessLineSlug;
  code: BusinessLineCode;
  label: string;
  appointmentsTitle: string;
  appointmentsDescription: string;
  funnelTitle: string;
  funnel: FunnelStep[];
  appointmentMetrics: LineMetric[];
  capacityTitle: string;
  capacityDescription: string;
  capacityFormula: string;
  capacityMetrics: LineMetric[];
  unitComparisonLabel: string;
  noShowPolicy: string;
};

export const businessLineSlugByCompanyName: Record<string, BusinessLineSlug> = {
  "Vista consolidada": "consolidado",
  "Analiza Fisioterapia": "fisioterapia",
  "Analiza Laboratorio": "laboratorio",
  "Analiza Imagenes": "imagenes",
};

export const businessLineSlugById: Record<string, BusinessLineSlug> = {
  "__consolidated__": "consolidado",
  "business-line-fisioterapia": "fisioterapia",
  "business-line-laboratorio": "laboratorio",
  "business-line-imagenes": "imagenes",
};

export const businessLineViews: Record<BusinessLineSlug, LineViewDefinition> = {
  consolidado: {
    slug: "consolidado",
    code: "CONSOLIDATED",
    label: "Consolidado",
    appointmentsTitle: "Actividad operativa consolidada",
    appointmentsDescription:
      "Compara volumen por linea sin sumar pruebas, sesiones y estudios como una sola unidad.",
    funnelTitle: "Embudo comparable por linea",
    funnel: [
      { label: "Laboratorio: ordenes", value: "9,034", conversion: 1, status: "DEMO" },
      { label: "Fisioterapia: citas", value: "1,540", conversion: 1, status: "DEMO" },
      { label: "Imagenes: estudios", value: "668", conversion: 1, status: "DEMO" },
    ],
    appointmentMetrics: [
      {
        label: "Unidad laboratorio",
        value: "Ordenes / pruebas",
        note: "No se suma con sesiones",
        status: "CALCULATED",
      },
      {
        label: "Unidad fisioterapia",
        value: "Citas / sesiones",
        note: "Continuidad terapeutica",
        status: "CALCULATED",
      },
      {
        label: "Unidad imagenes",
        value: "Estudios / informes",
        note: "Por modalidad y equipo",
        status: "CALCULATED",
      },
    ],
    capacityTitle: "Indice normalizado de utilizacion",
    capacityDescription:
      "Consolidado compara indices normalizados y conserva la unidad original de cada linea.",
    capacityFormula:
      "indice_normalizado = utilizacion_linea / meta_linea; cada linea conserva su formula original",
    capacityMetrics: [
      { label: "Fisioterapia", value: "61%", note: "horas atendidas / horas disponibles", status: "DEMO" },
      { label: "Laboratorio", value: "Pendiente", note: "falta capacidad tecnica por analizador", status: "PENDING_UPLOAD" },
      { label: "Imagenes", value: "63%", note: "horas utilizadas / horas disponibles equipo", status: "DEMO" },
    ],
    unitComparisonLabel: "Unidad operativa original",
    noShowPolicy:
      "Consolidado muestra no-show solo para lineas con agenda; laboratorio se compara por ordenes.",
  },
  fisioterapia: {
    slug: "fisioterapia",
    code: "PHYSIOTHERAPY",
    label: "Fisioterapia",
    appointmentsTitle: "Agenda y continuidad terapeutica",
    appointmentsDescription:
      "Gestiona solicitudes, citas, sesiones, planes terapeuticos y continuidad del paciente.",
    funnelTitle: "Embudo terapeutico",
    funnel: [
      { label: "Solicitudes", value: "1,740", conversion: 1, status: "DEMO" },
      { label: "Citas agendadas", value: "1,540", conversion: 0.89, status: "DEMO" },
      { label: "Confirmadas", value: "1,392", conversion: 0.9, status: "DEMO" },
      { label: "Atendidas", value: "1,320", conversion: 0.95, status: "DEMO" },
      { label: "Sesiones completadas", value: "2,840", conversion: null, status: "DEMO" },
      { label: "Facturadas", value: "$94K", conversion: null, status: "DEMO" },
      { label: "Cobradas", value: "$87K", conversion: null, status: "DEMO" },
    ],
    appointmentMetrics: [
      { label: "No-show", value: "6%", note: "impacta ingreso perdido", status: "DEMO" },
      { label: "Cancelaciones", value: "5%", note: "sobre citas agendadas", status: "DEMO" },
      { label: "Ingreso perdido", value: "$7.8K", note: "por no-show y cancelacion", status: "DEMO" },
      { label: "Proxima disponibilidad", value: "3.1 dias", note: "promedio red", status: "DEMO" },
    ],
    capacityTitle: "Ocupacion real de fisioterapeutas",
    capacityDescription:
      "Mide horas atendidas contra horas disponibles, no solo agenda llena.",
    capacityFormula: "ocupacion_real = horas_atendidas / horas_disponibles",
    capacityMetrics: [
      { label: "Horas disponibles", value: "160 h", note: "fisioterapeutas", status: "DEMO" },
      { label: "Horas atendidas", value: "98 h", note: "61% ocupacion real", status: "DEMO" },
      { label: "Horas ociosas", value: "62 h", note: "capacidad perdida", status: "DEMO" },
      { label: "Lista de espera", value: "18", note: "pacientes", status: "DEMO" },
    ],
    unitComparisonLabel: "Citas, sesiones y planes",
    noShowPolicy: "No-show aplica porque existe agenda de citas terapeuticas.",
  },
  laboratorio: {
    slug: "laboratorio",
    code: "LABORATORY",
    label: "Laboratorio",
    appointmentsTitle: "Ordenes y pacientes",
    appointmentsDescription:
      "Laboratorio opera por ordenes, pacientes, muestras, pruebas y resultados; no por citas.",
    funnelTitle: "Embudo de orden laboratorio",
    funnel: [
      { label: "Orden creada", value: "9,034", conversion: 1, status: "DEMO" },
      { label: "Paciente recibido", value: "8,912", conversion: 0.99, status: "DEMO" },
      { label: "Muestra tomada", value: "8,806", conversion: 0.99, status: "DEMO" },
      { label: "Pruebas procesadas", value: "Pendiente de carga", conversion: null, status: "PENDING_UPLOAD" },
      { label: "Resultado validado", value: "Datos pendientes de conexion", conversion: null, status: "NOT_CONNECTED" },
      { label: "Resultado entregado", value: "Datos pendientes de conexion", conversion: null, status: "NOT_CONNECTED" },
      { label: "Facturado", value: "$1,015K", conversion: null, status: "DEMO" },
      { label: "Cobrado", value: "$924K", conversion: null, status: "DEMO" },
    ],
    appointmentMetrics: [
      { label: "Ordenes totales", value: "9,034", note: "plantillas SV DEMO", status: "DEMO" },
      { label: "Pacientes unicos", value: "93,791", note: "requiere deduplicacion real", status: "INCOMPLETE" },
      { label: "Pruebas por orden", value: "Pendiente de carga", note: "falta detalle por prueba", status: "PENDING_UPLOAD" },
      { label: "Ordenes sin resultado", value: "Datos pendientes de conexion", note: "requiere LIS/API", status: "NOT_CONNECTED" },
    ],
    capacityTitle: "Utilizacion de capacidad tecnica",
    capacityDescription:
      "No mide ocupacion por citas; mide procesamiento, analizadores, estaciones y personal tecnico.",
    capacityFormula:
      "utilizacion_analizador = pruebas_procesadas / capacidad_tecnica_disponible",
    capacityMetrics: [
      { label: "Pruebas procesadas/hora", value: "Pendiente de carga", note: "requiere pruebas por hora", status: "PENDING_UPLOAD" },
      { label: "Cola de muestras", value: "Datos pendientes de conexion", note: "requiere LIS", status: "NOT_CONNECTED" },
      { label: "Equipos activos", value: "Pendiente de carga", note: "capacidad por analizador", status: "PENDING_UPLOAD" },
      { label: "Personal requerido", value: "Calculado", note: "segun volumen y turnos", status: "CALCULATED" },
    ],
    unitComparisonLabel: "Ordenes, pacientes y pruebas",
    noShowPolicy:
      "Laboratorio no muestra no-show salvo que exista un proceso especifico de reserva.",
  },
  imagenes: {
    slug: "imagenes",
    code: "IMAGING",
    label: "Imagenes",
    appointmentsTitle: "Agenda y realizacion de estudios",
    appointmentsDescription:
      "Gestiona solicitudes, agenda, estudios, procesamiento, informes y entrega.",
    funnelTitle: "Embudo de estudio diagnostico",
    funnel: [
      { label: "Solicitudes", value: "760", conversion: 1, status: "DEMO" },
      { label: "Estudios agendados", value: "668", conversion: 0.88, status: "DEMO" },
      { label: "Confirmados", value: "615", conversion: 0.92, status: "DEMO" },
      { label: "Realizados", value: "521", conversion: 0.85, status: "DEMO" },
      { label: "Informados", value: "483", conversion: 0.93, status: "DEMO" },
      { label: "Entregados", value: "460", conversion: 0.95, status: "DEMO" },
      { label: "Facturados", value: "$68K", conversion: null, status: "DEMO" },
      { label: "Cobrados", value: "$60K", conversion: null, status: "DEMO" },
    ],
    appointmentMetrics: [
      { label: "Tiempo espera cita", value: "4.8 dias", note: "promedio", status: "DEMO" },
      { label: "Informes pendientes", value: "38", note: "requiere seguimiento", status: "DEMO" },
      { label: "No-show", value: "10%", note: "solo agenda de estudios", status: "DEMO" },
      { label: "Demanda por modalidad", value: "Datos pendientes de conexion", note: "requiere RIS/PACS", status: "NOT_CONNECTED" },
    ],
    capacityTitle: "Utilizacion real de equipos",
    capacityDescription:
      "Mide horas utilizadas por equipo contra horas operativas disponibles.",
    capacityFormula: "utilizacion_equipo = horas_utilizadas / horas_operativas_disponibles",
    capacityMetrics: [
      { label: "Horas disponibles equipo", value: "120 h", note: "modalidades DEMO", status: "DEMO" },
      { label: "Horas utilizadas", value: "76 h", note: "63% utilizacion", status: "DEMO" },
      { label: "Tiempo muerto", value: "14 h", note: "preparacion y espera", status: "DEMO" },
      { label: "Mantenimiento", value: "Datos pendientes de conexion", note: "pendiente API/equipo", status: "NOT_CONNECTED" },
    ],
    unitComparisonLabel: "Citas, estudios, equipos e informes",
    noShowPolicy: "No-show aplica solo a la agenda de estudios.",
  },
};

export function resolveBusinessLineSlug({
  businessLineId,
  businessLineName,
  companyName,
}: {
  businessLineId?: string;
  businessLineName?: string;
  companyName?: string;
}): BusinessLineSlug {
  if (businessLineId && businessLineSlugById[businessLineId]) {
    return businessLineSlugById[businessLineId];
  }

  if (businessLineName && businessLineSlugByCompanyName[businessLineName]) {
    return businessLineSlugByCompanyName[businessLineName];
  }

  if (companyName && businessLineSlugByCompanyName[companyName]) {
    return businessLineSlugByCompanyName[companyName];
  }

  return "consolidado";
}

export function getBusinessLineView(slug: BusinessLineSlug) {
  return businessLineViews[slug];
}
