import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";

export const physioAdapterId = "FISIO_RESULTADOS_MENSUALES_V1" as const;
export const physioFixtureLabel = "Datos de la plantilla de prueba" as const;
export const physioMissingSource = "Pendiente de conexion de datos" as const;

export type PhysioPresentationStatus =
  | "Borrador"
  | "Datos pendientes"
  | "Datos con errores"
  | "Datos validados"
  | "En revision"
  | "Con observaciones"
  | "Aprobada"
  | "Cerrada"
  | "Reabierta";

export type PhysioValidationStatus =
  | "Pendiente de validacion"
  | "Con advertencias"
  | "Con errores"
  | "Validado";

export type PhysioTemplateLoadStatus =
  | "Archivo seleccionado"
  | "Procesando"
  | "Pendiente de validacion"
  | "Con advertencias"
  | "Con errores"
  | "Validado"
  | "Importado"
  | "Reemplazado"
  | "Reprocesado"
  | "Revertido";

export type PhysioValidationSeverity =
  | "Bloqueante"
  | "Advertencia"
  | "Informativo";

export type PhysioSlideKind =
  | "Principal"
  | "Opcional"
  | "Pendiente de fuente"
  | "Anexo";

export type PhysioSlideDataStatus =
  | "Listo"
  | "Requiere explicacion"
  | "Pendiente de fuente"
  | "Bloqueado"
  | "Decision CEO";

export type PhysioActionStatus =
  | "Pendiente"
  | "Aceptada"
  | "En curso"
  | "Bloqueada"
  | "Completada"
  | "Vencida"
  | "Cancelada"
  | "Reabierta";

export type PhysioCauseType =
  | "Confirmada"
  | "Probable"
  | "Externa"
  | "Pendiente de analisis";

export type PhysioSheetMapping = {
  sheetName: string;
  purpose: string;
  fields: string[];
  required: boolean;
  role: "Principal" | "Soporte" | "Visual";
  trustNote: string;
};

export type PhysioValidationIssue = {
  id: string;
  area: string;
  detail: string;
  expected: string;
  found: string;
  severity: PhysioValidationSeverity;
  rule: string;
};

export type PhysioDataQualityDimension = {
  dimension: string;
  note: string;
  score: number;
};

export type PhysioKpi = {
  label: string;
  note?: string;
  value: string;
};

export type PhysioSlideChart =
  | {
      type: "bars";
      title: string;
      unit: string;
      points: { label: string; value: number; previous?: number; target?: number }[];
    }
  | {
      type: "line";
      title: string;
      unit: string;
      labels: string[];
      current: number[];
      previous: number[];
    }
  | {
      type: "waterfall";
      title: string;
      unit: string;
      points: { label: string; value: number; tone: "positive" | "negative" | "neutral" }[];
    }
  | {
      type: "distribution";
      title: string;
      unit: string;
      points: { label: string; value: number; color?: string }[];
    };

export type PhysioPresentationSlide = {
  action: string;
  charts: PhysioSlideChart[];
  dataStatus: PhysioSlideDataStatus;
  id: string;
  kind: PhysioSlideKind;
  kpis: PhysioKpi[];
  narrative: string;
  requiredDecision?: string;
  source: string;
  title: string;
};

export type PhysioTemplateRecord = {
  adapterId: typeof physioAdapterId;
  areaManager: string;
  branch: string;
  branchManager: string;
  capacityByCubicles: number;
  capacityByProfessionals: number;
  clients: number;
  closeDate: string;
  cubicles: number;
  dataLabel: typeof physioFixtureLabel;
  dataQualityScore: number;
  expenses: number;
  fileName: string;
  grossProfit: number;
  marginRate: number;
  medicalOrders: number;
  medicalSale: number;
  monthlyGrowthRate: number;
  nonMedicalOrders: number;
  nonMedicalSale: number;
  orders: number;
  period: string;
  periodRange: string;
  previousMonthSale: number;
  previousYearExpenses: number;
  previousYearProfit: number;
  previousYearSale: number;
  presentationDate: string;
  presentationStatus: PhysioPresentationStatus;
  region: string;
  reportedCancellations: number;
  selectedPeriod: string;
  sessions: number;
  target: number;
  validationStatus: PhysioValidationStatus;
  version: string;
  yoyGrowthRate: number;
};

export type PhysioVariationExplanation = {
  cause: string;
  causeType: PhysioCauseType;
  evidence: string;
  indicator: string;
  managerComment: string;
  reference: string;
  result: string;
  underBranchControl: boolean;
  variation: string;
};

export type PhysioActionItem = {
  action: string;
  comment: string;
  dueDate: string;
  evidence: string;
  expectedImpact: string;
  id: string;
  kpi: string;
  owner: string;
  problem: string;
  realResult: string;
  startDate: string;
  status: PhysioActionStatus;
};

export type PhysioDecisionRequest = {
  benefit: string;
  ceoResponse: string;
  cost: string;
  decision: string;
  evidence: string;
  id: string;
  impact: string;
  problem: string;
  status: "Pendiente" | "Aprobada" | "Rechazada" | "Solicita ajustes";
  urgency: "Alta" | "Media" | "Baja";
};

export type PhysioAgreement = {
  agreement: string;
  closeDate: string;
  comments: string;
  dueDate: string;
  evidence: string;
  id: string;
  impact: string;
  meetingDate: string;
  participants: string;
  responsible: string;
  result: string;
  status: "Cumplido" | "Parcial" | "Vencido" | "Sin iniciar";
};

export type PhysioHistoryVersion = {
  actor: string;
  date: string;
  event: string;
  id: string;
  status: PhysioPresentationStatus | PhysioTemplateLoadStatus;
  version: string;
};

export type PhysioComparisonRow = {
  action: string;
  alert: string;
  branch: string;
  cancelRate: number | null;
  clients: number | null;
  dataQuality: number | null;
  equipmentUse: number | null;
  marginRate: number | null;
  medicalShareRate: number | null;
  occupancyRate: number | null;
  orders: number | null;
  professionals: number | null;
  profit: number | null;
  revenue: number | null;
  sessions: number | null;
  source: string;
  strength: string;
  ticket: number | null;
};

export const physioPresentationFilters = {
  areaManagers: ["Isaac Santillana", "Direccion Fisioterapia"],
  branchManagers: ["Maria Elena Alvarenga", "Gerente Norte", "Gerente Centro"],
  branches: [
    "Fisioterapia Medica 3",
    "Fisioterapia Norte",
    "Fisioterapia Centro",
    "Fisioterapia Sur",
  ],
  companies: ["Analiza Fisioterapia"],
  countries: ["El Salvador"],
  periods: [
    "Mes actual",
    "Mes anterior",
    "Trimestre",
    "Acumulado del ano",
    "Mismo periodo del ano anterior",
    "Rango personalizado",
  ],
  presentationStatuses: [
    "Borrador",
    "Datos pendientes",
    "Datos con errores",
    "Datos validados",
    "En revision",
    "Con observaciones",
    "Aprobada",
    "Cerrada",
    "Reabierta",
  ] satisfies PhysioPresentationStatus[],
  regions: ["San Salvador", "Centro", "Occidente", "Oriente"],
  validationStatuses: [
    "Pendiente de validacion",
    "Con advertencias",
    "Con errores",
    "Validado",
  ] satisfies PhysioValidationStatus[],
  versions: ["v0.3 prueba", "v0.2 reimportada", "v0.1 borrador"],
};

export const physioSheetMappings: PhysioSheetMapping[] = [
  {
    fields: ["sucursal", "periodo", "gerente", "metas", "ventas"],
    purpose: "Datos generales de la plantilla y contexto del periodo.",
    required: true,
    role: "Soporte",
    sheetName: "GENERAL",
    trustNote: "Se usa para contexto, no para conciliar montos.",
  },
  {
    fields: ["vista ejecutiva", "resumen visual", "formulas"],
    purpose: "Hoja visual de presentacion del Excel.",
    required: false,
    role: "Visual",
    sheetName: "Fisioterapia",
    trustNote: "No se usa sola porque contiene ceros y referencias rotas.",
  },
  {
    fields: ["series mensuales", "metas", "ventas", "acumulados"],
    purpose: "Fuente principal para series historicas por mes.",
    required: true,
    role: "Principal",
    sheetName: "llenado fisio",
    trustNote: "Los acumulados se recalculan desde meses validados.",
  },
  {
    fields: ["venta", "ordenes", "clientes", "sesiones", "gastos", "utilidad"],
    purpose: "Resultados organizados para la presentacion mensual.",
    required: true,
    role: "Principal",
    sheetName: "CONSOLIDADO",
    trustNote: "Fuente preferida cuando contradice la hoja visual.",
  },
  {
    fields: ["medicos", "especialidades", "relacion medico especialidad"],
    purpose: "Catalogo de medicos referidores y especialidades.",
    required: true,
    role: "Principal",
    sheetName: "Medicos y Especialidades",
    trustNote: "Debe normalizar nombres antes de presentar.",
  },
  {
    fields: ["visitadores", "medicos activos", "produccion"],
    purpose: "Resultados por visitador medico.",
    required: true,
    role: "Principal",
    sheetName: "Visitadores",
    trustNote: "Permite detectar concentracion de canal medico.",
  },
  {
    fields: ["doctor", "ordenes", "venta", "ticket", "especialidad"],
    purpose: "Detalle mensual por medico referidor.",
    required: true,
    role: "Principal",
    sheetName: "Llenado Medicos Fisio",
    trustNote: "No debe exponer datos clinicos de pacientes.",
  },
  {
    fields: ["proyeccion", "dia semana", "fecha", "venta esperada"],
    purpose: "Proyeccion del periodo abierto.",
    required: false,
    role: "Soporte",
    sheetName: "Proyeccion Fisio",
    trustNote: "Solo se habilita cuando el mes esta abierto y sin TODAY().",
  },
  {
    fields: ["catalogos", "aliases", "sucursales", "gerentes"],
    purpose: "Catalogos y filtros usados por el archivo.",
    required: true,
    role: "Soporte",
    sheetName: "Filtros Fisio",
    trustNote: "Se usa para normalizacion y permisos.",
  },
];

export const physioReferenceRecord: PhysioTemplateRecord = {
  adapterId: physioAdapterId,
  areaManager: "Isaac Santillana",
  branch: "Fisioterapia Medica 3",
  branchManager: "Maria Elena Alvarenga",
  capacityByCubicles: 1200,
  capacityByProfessionals: 1056,
  clients: 114,
  closeDate: "2026-06-30",
  cubicles: 6,
  dataLabel: physioFixtureLabel,
  dataQualityScore: 68,
  expenses: 12908.5,
  fileName: "JUNIO 2026 plantilla Medica 3 fisioterapia.xlsx",
  grossProfit: 5012.25,
  marginRate: 0.2797,
  medicalOrders: 81,
  medicalSale: 12955,
  monthlyGrowthRate: 0.157,
  nonMedicalOrders: 59,
  nonMedicalSale: 4965.75,
  orders: 140,
  period: "Junio 2026",
  periodRange: "2026-06-01 a 2026-06-30",
  presentationDate: "2026-07-23",
  presentationStatus: "Datos con errores",
  previousMonthSale: 15488.12,
  previousYearExpenses: 8274.68,
  previousYearProfit: 4572.1,
  previousYearSale: 12846.77,
  region: "San Salvador",
  reportedCancellations: 262,
  selectedPeriod: "Junio 2026",
  sessions: 919,
  target: 15000,
  validationStatus: "Con errores",
  version: "v0.3 prueba",
  yoyGrowthRate: 0.395,
};

export const physioPaymentReconciliation = {
  credit: 2110,
  card: 3386,
  cash: 1808,
  mixed: 8181,
  paymentPercent: 15485 / physioReferenceRecord.medicalSale,
  paymentTotal: 15485,
  sale: physioReferenceRecord.medicalSale + physioReferenceRecord.nonMedicalSale,
  shiftedFormulaPeriod: "Mayo 2026",
};

export const physioDataQualityDimensions: PhysioDataQualityDimension[] = [
  {
    dimension: "Completitud",
    note: "Cancelaciones y total de sesiones tienen filas incompletas.",
    score: 70,
  },
  {
    dimension: "Consistencia",
    note: "La hoja visual muestra ceros aunque CONSOLIDADO contiene datos.",
    score: 62,
  },
  {
    dimension: "Validez",
    note: "Se detectan #DIV/0!, #REF! y #N/A.",
    score: 58,
  },
  {
    dimension: "Unicidad",
    note: "Existen alias de fisioterapeutas con variantes de nombres.",
    score: 72,
  },
  {
    dimension: "Conciliacion",
    note: "Pagos, acumulados, sesiones y cancelaciones no concilian.",
    score: 50,
  },
  {
    dimension: "Oportunidad",
    note: "La proyeccion usa fechas dinamicas y debe congelarse al cierre.",
    score: 76,
  },
  {
    dimension: "Trazabilidad",
    note: "Falta version auditada del archivo corregido.",
    score: 88,
  },
];

export const physioValidationIssues: PhysioValidationIssue[] = [
  {
    area: "Hoja visual",
    detail: "La hoja Fisioterapia muestra ceros aunque CONSOLIDADO contiene datos.",
    expected: "Mostrar datos importados desde fuentes principales.",
    found: "Ceros y referencias rotas en la vista visual.",
    id: "fisio-visual-zeros",
    rule: "No confiar unicamente en la hoja visual.",
    severity: "Bloqueante",
  },
  {
    area: "Formulas",
    detail: "El archivo contiene formulas con error.",
    expected: "Sin #REF!, #DIV/0!, #N/A, #NAME? o #VALUE!.",
    found: "#DIV/0!, #REF! y #N/A.",
    id: "fisio-formula-errors",
    rule: "Errores de formula bloquean cierre oficial.",
    severity: "Bloqueante",
  },
  {
    area: "Formas de pago",
    detail: "Tarjeta, efectivo, credito y mixto suman un periodo desplazado.",
    expected: formatCurrency(physioReferenceRecord.medicalSale + physioReferenceRecord.nonMedicalSale),
    found: `${formatCurrency(physioPaymentReconciliation.paymentTotal)} (${formatRate(
      physioPaymentReconciliation.paymentTotal /
        (physioReferenceRecord.medicalSale + physioReferenceRecord.nonMedicalSale),
    )})`,
    id: "fisio-payment-shift",
    rule: "Venta total debe igualar suma de formas de pago.",
    severity: "Bloqueante",
  },
  {
    area: "Porcentajes de pago",
    detail: "Los porcentajes de forma de pago no suman 100%.",
    expected: "100.0%",
    found: "86.5%",
    id: "fisio-payment-percent",
    rule: "Porcentajes deben cerrar contra la venta del mes.",
    severity: "Bloqueante",
  },
  {
    area: "Acumulados",
    detail: "La venta acumulada enero-junio no coincide con la suma mensual validada.",
    expected: formatCurrency(94454.25),
    found: formatCurrency(212156.17),
    id: "fisio-ytd-sale",
    rule: "Los acumulados se recalculan desde meses validados.",
    severity: "Bloqueante",
  },
  {
    area: "Acumulados",
    detail: "La meta acumulada no coincide con seis meses por meta mensual.",
    expected: formatCurrency(90000),
    found: formatCurrency(198000),
    id: "fisio-ytd-target",
    rule: "Meta acumulada debe igualar suma de metas mensuales.",
    severity: "Bloqueante",
  },
  {
    area: "Sesiones",
    detail: "Existe una fila con 919 sesiones y otra fila total vacia.",
    expected: "Un unico total conciliado.",
    found: "919 y total vacio.",
    id: "fisio-session-total",
    rule: "Sesiones deben tener una fuente canonica.",
    severity: "Advertencia",
  },
  {
    area: "Cancelaciones",
    detail: "Se registran 262 cancelaciones, pero la fila de citas canceladas esta vacia.",
    expected: "262 cancelaciones conciliadas.",
    found: "Fila principal vacia.",
    id: "fisio-cancel-row",
    rule: "Cancelaciones deben conciliar con pagadores y agenda.",
    severity: "Bloqueante",
  },
  {
    area: "Aseguradoras",
    detail: "Sesiones completadas y canceladas por aseguradora no cierran con el total.",
    expected: "Totales por aseguradora igualan sesiones y cancelaciones.",
    found: "Diferencias pendientes de revision.",
    id: "fisio-insurers",
    rule: "Pagador debe conciliar con sesiones consolidadas.",
    severity: "Bloqueante",
  },
  {
    area: "Profesionales",
    detail: "Las sesiones por profesionales identificados suman menos que el total.",
    expected: "Suma por profesional = 919 sesiones.",
    found: "Sesiones faltantes por alias o registros sin asignar.",
    id: "fisio-professional-sessions",
    rule: "Distribucion profesional debe normalizar nombres y cerrar totales.",
    severity: "Advertencia",
  },
  {
    area: "Proyeccion",
    detail: "La proyeccion muestra ceros por mezclar dias en ingles y espanol.",
    expected: "Dias normalizados al idioma del periodo.",
    found: "Ceros en proyeccion.",
    id: "fisio-projection-days",
    rule: "El adapter normaliza dias antes de proyectar.",
    severity: "Advertencia",
  },
  {
    area: "Periodo",
    detail: "La proyeccion depende de fechas dinamicas.",
    expected: "Periodo seleccionado y congelado al cierre.",
    found: "Fechas dinamicas.",
    id: "fisio-period-dynamic",
    rule: "No usar TODAY() como periodo oficial.",
    severity: "Bloqueante",
  },
  {
    area: "Catalogos",
    detail: "Nombres de fisioterapeutas tienen variantes.",
    expected: "Alias normalizados.",
    found: "Alejandra Turcios/Alejandra Aleman y Gabriela Quintanilla/Gabriela Qquintanilla.",
    id: "fisio-aliases",
    rule: "Catalogos deben resolver aliases antes de comparar.",
    severity: "Advertencia",
  },
  {
    area: "Definiciones",
    detail: "Ordenes, sesiones, terapias y clientes deben mantenerse separados.",
    expected: "Glosario aplicado en cada slide.",
    found: "Riesgo de uso como sinonimos.",
    id: "fisio-definitions",
    rule: "Unidades distintas no se mezclan.",
    severity: "Informativo",
  },
];

export const physioDoctorRows = [
  { doctor: "Dr. Carlos Hernandez", specialty: "Ortopedia", orders: 24, revenue: 4520 },
  { doctor: "Dra. Sofia Mejia", specialty: "Traumatologia", orders: 18, revenue: 3180 },
  { doctor: "Dr. Rene Castillo", specialty: "Neurocirugia", orders: 12, revenue: 2210 },
  { doctor: "Dra. Marcela Rivas", specialty: "Reumatologia", orders: 9, revenue: 1510 },
  { doctor: "Dr. Luis Pineda", specialty: "Fisiatria", orders: 8, revenue: 1340 },
];

export const physioSpecialtyRows = [
  { specialty: "Ortopedia", doctors: 9, orders: 34, revenue: 6020 },
  { specialty: "Traumatologia", doctors: 6, orders: 22, revenue: 3890 },
  { specialty: "Cirugia ortopedica y traumatologia", doctors: 4, orders: 11, revenue: 1785 },
  { specialty: "Neurocirugia", doctors: 3, orders: 6, revenue: 760 },
  { specialty: "Neurologia", doctors: 2, orders: 4, revenue: 300 },
  { specialty: "Reumatologia", doctors: 2, orders: 3, revenue: 120 },
  { specialty: "Medicina interna", doctors: 1, orders: 1, revenue: 60 },
  { specialty: "Fisiatria", doctors: 1, orders: 0, revenue: 20 },
];

export const physioVisitorRows = [
  { visitor: "Visitador A", doctors: 18, newDoctors: 4, recoveredDoctors: 2, revenue: 5220 },
  { visitor: "Visitador B", doctors: 12, newDoctors: 2, recoveredDoctors: 1, revenue: 3710 },
  { visitor: "Visitador C", doctors: 8, newDoctors: 1, recoveredDoctors: 0, revenue: 2240 },
  { visitor: "Visitador D", doctors: 5, newDoctors: 1, recoveredDoctors: 0, revenue: 1185 },
  { visitor: "Visitador E", doctors: 3, newDoctors: 0, recoveredDoctors: 0, revenue: 600 },
];

export const physioTherapyRows = [
  { therapy: "Terapias por patologias", quantity: 540, revenue: 10720 },
  { therapy: "Descargas musculares", quantity: 168, revenue: 3180 },
  { therapy: "Terapia neurologica", quantity: 82, revenue: 1480 },
  { therapy: "Terapia deportiva", quantity: 71, revenue: 1340 },
  { therapy: "Otras categorias", quantity: 58, revenue: 1200.75 },
];

export const physioEquipmentRows = [
  { equipment: "Lymphastim / presoterapia", uses: 96, capacity: 180 },
  { equipment: "Ondas de choque", uses: 72, capacity: 130 },
  { equipment: "Laser de alta intensidad", uses: 64, capacity: 120 },
  { equipment: "Sistema super inductivo", uses: 51, capacity: 110 },
  { equipment: "Radiofrecuencia selectiva", uses: 44, capacity: 96 },
  { equipment: "Magnetoterapia", uses: 39, capacity: 90 },
  { equipment: "Electroterapia y ultrasonido combinado", uses: 128, capacity: 220 },
];

export const physioSegmentRows = [
  { segment: "Deportistas", clients: 1 },
  { segment: "Tercera edad", clients: 22 },
  { segment: "Pediatricos", clients: 4 },
  { segment: "Publico general", clients: 87 },
];

export const physioInsurerRows = [
  { insurer: "RPN", completed: 120, canceled: 36 },
  { insurer: "SISA", completed: 98, canceled: 31 },
  { insurer: "ASESUISA", completed: 86, canceled: 28 },
  { insurer: "MAPFRE", completed: 74, canceled: 26 },
  { insurer: "ACSA", completed: 56, canceled: 18 },
  { insurer: "PALIG", completed: 52, canceled: 16 },
  { insurer: "MIRED", completed: 44, canceled: 14 },
  { insurer: "ABANK", completed: 38, canceled: 12 },
  { insurer: "Sin aseguradora", completed: 244, canceled: 81 },
];

export const physioProfessionalRows = [
  { name: "Alejandra Turcios", aliases: ["Alejandra Aleman"], sessions: 176, target: 180, capacity: 192 },
  { name: "Gabriela Quintanilla", aliases: ["Gabriela Qquintanilla"], sessions: 158, target: 170, capacity: 176 },
  { name: "Roxana Mejia", aliases: [], sessions: 144, target: 150, capacity: 168 },
  { name: "Andrea Rivas", aliases: [], sessions: 132, target: 140, capacity: 160 },
  { name: "Karla Sanchez", aliases: [], sessions: 116, target: 130, capacity: 152 },
  { name: "Registros sin asignar", aliases: [], sessions: 78, target: 0, capacity: 0 },
];

export const physioComparisonRows: PhysioComparisonRow[] = [
  {
    action: "Corregir conciliacion antes de enviar a direccion.",
    alert: "Errores bloqueantes en pagos, acumulados y aseguradoras.",
    branch: "Fisioterapia Medica 3",
    cancelRate: 262 / (physioReferenceRecord.sessions + physioReferenceRecord.reportedCancellations),
    clients: physioReferenceRecord.clients,
    dataQuality: physioReferenceRecord.dataQualityScore,
    equipmentUse: 494,
    marginRate: physioReferenceRecord.marginRate,
    medicalShareRate: physioReferenceRecord.medicalSale /
      (physioReferenceRecord.medicalSale + physioReferenceRecord.nonMedicalSale),
    occupancyRate: physioReferenceRecord.sessions / physioReferenceRecord.capacityByProfessionals,
    orders: physioReferenceRecord.orders,
    professionals: 6,
    profit: physioReferenceRecord.grossProfit,
    revenue: physioReferenceRecord.medicalSale + physioReferenceRecord.nonMedicalSale,
    sessions: physioReferenceRecord.sessions,
    source: physioFixtureLabel,
    strength: "Supera meta mensual y canal medico aporta mayor ticket.",
    ticket: (physioReferenceRecord.medicalSale + physioReferenceRecord.nonMedicalSale) /
      physioReferenceRecord.orders,
  },
  {
    action: "Cargar plantilla validada para habilitar comparacion oficial.",
    alert: physioMissingSource,
    branch: "Fisioterapia Norte",
    cancelRate: null,
    clients: null,
    dataQuality: null,
    equipmentUse: null,
    marginRate: null,
    medicalShareRate: null,
    occupancyRate: null,
    orders: null,
    professionals: null,
    profit: null,
    revenue: null,
    sessions: null,
    source: physioMissingSource,
    strength: physioMissingSource,
    ticket: null,
  },
  {
    action: "Cargar plantilla validada para habilitar comparacion oficial.",
    alert: physioMissingSource,
    branch: "Fisioterapia Centro",
    cancelRate: null,
    clients: null,
    dataQuality: null,
    equipmentUse: null,
    marginRate: null,
    medicalShareRate: null,
    occupancyRate: null,
    orders: null,
    professionals: null,
    profit: null,
    revenue: null,
    sessions: null,
    source: physioMissingSource,
    strength: physioMissingSource,
    ticket: null,
  },
  {
    action: "Cargar plantilla validada para habilitar comparacion oficial.",
    alert: physioMissingSource,
    branch: "Fisioterapia Sur",
    cancelRate: null,
    clients: null,
    dataQuality: null,
    equipmentUse: null,
    marginRate: null,
    medicalShareRate: null,
    occupancyRate: null,
    orders: null,
    professionals: null,
    profit: null,
    revenue: null,
    sessions: null,
    source: physioMissingSource,
    strength: physioMissingSource,
    ticket: null,
  },
];

export const physioVariationExplanations: PhysioVariationExplanation[] = [
  {
    cause: "Canal medico",
    causeType: "Confirmada",
    evidence: "Venta medica representa 72.3% de la venta y ticket medico es superior.",
    indicator: "Venta",
    managerComment:
      "La gerente debe confirmar que medicos activos y visitadores sostienen el crecimiento.",
    reference: "Meta mensual $15,000",
    result: "$17,920.75",
    underBranchControl: true,
    variation: "+19.47% contra meta",
  },
  {
    cause: "Crecimiento de gastos",
    causeType: "Probable",
    evidence: "Gastos crecieron alrededor de 56% vs junio anterior.",
    indicator: "Margen",
    managerComment: "Revisar gasto operativo antes de pedir nueva capacidad.",
    reference: "Margen junio anterior 35.6%",
    result: "28.0%",
    underBranchControl: true,
    variation: "-7.6 puntos",
  },
  {
    cause: "Datos incompletos",
    causeType: "Pendiente de analisis",
    evidence: "Cancelaciones y aseguradoras no concilian.",
    indicator: "Cancelaciones",
    managerComment: "Corregir archivo y reimportar.",
    reference: "Total conciliado por agenda",
    result: "262 reportadas",
    underBranchControl: true,
    variation: "Pendiente",
  },
];

export const physioActionItems: PhysioActionItem[] = [
  {
    action: "Corregir conciliacion de formas de pago",
    comment: "Finanzas debe revisar si el bloque corresponde a mayo.",
    dueDate: "2026-07-26",
    evidence: "Pagos suman $15,485 contra venta junio $17,920.75.",
    expectedImpact: "Presentacion valida para direccion.",
    id: "fisio-action-payments",
    kpi: "Conciliacion financiera",
    owner: "Maria Elena Alvarenga",
    problem: "Formulas desplazadas",
    realResult: "Pendiente",
    startDate: "2026-07-23",
    status: "En curso",
  },
  {
    action: "Recuperar pacientes cancelados",
    comment: "Priorizar aseguradoras con mayor cancelacion.",
    dueDate: "2026-07-29",
    evidence: "262 cancelaciones reportadas.",
    expectedImpact: "Reducir capacidad perdida y elevar ocupacion efectiva.",
    id: "fisio-action-cancellations",
    kpi: "Cancelaciones",
    owner: "Coordinacion de agenda",
    problem: "Alto volumen de cancelaciones",
    realResult: "Pendiente",
    startDate: "2026-07-24",
    status: "Pendiente",
  },
  {
    action: "Normalizar fisioterapeutas antes de bonos",
    comment: "Resolver aliases antes de comparar desempeno.",
    dueDate: "2026-07-25",
    evidence: "Alejandra y Gabriela aparecen con variantes.",
    expectedImpact: "Carga individual trazable.",
    id: "fisio-action-aliases",
    kpi: "Sesiones por profesional",
    owner: "Operaciones Fisioterapia",
    problem: "Aliases y registros sin asignar",
    realResult: "Pendiente",
    startDate: "2026-07-23",
    status: "Aceptada",
  },
];

export const physioDecisionRequests: PhysioDecisionRequest[] = [
  {
    benefit: "Mayor conversion de medicos activos y recuperacion de volumen.",
    ceoResponse: "Pendiente",
    cost: "Por definir con finanzas.",
    decision: "Aprobar campana medica focalizada",
    evidence: "Canal medico genera ticket de $159.94 vs $84.17 sin medico.",
    id: "fisio-decision-medical",
    impact: "Sostener crecimiento sin depender de mas ordenes directas.",
    problem: "Crecimiento concentrado en canal medico.",
    status: "Pendiente",
    urgency: "Media",
  },
  {
    benefit: "Evitar decisiones con datos no conciliados.",
    ceoResponse: "Pendiente",
    cost: "$0 operativo",
    decision: "No cerrar oficialmente hasta reimportar archivo corregido",
    evidence: "Existen errores bloqueantes de periodo, pagos y aseguradoras.",
    id: "fisio-decision-close",
    impact: "Mantener trazabilidad del comite.",
    problem: "Calidad de datos bloqueada",
    status: "Pendiente",
    urgency: "Alta",
  },
];

export const physioAgreements: PhysioAgreement[] = [
  {
    agreement: "Incrementar canal medico con seguimiento de visitadores.",
    closeDate: "2026-06-30",
    comments: "En mayo se acordo aumentar referidores activos.",
    dueDate: "2026-06-30",
    evidence: "En junio la venta medica aumento 25.3% y represento 72.3% de la venta.",
    id: "fisio-agreement-medical",
    impact: "Cumplido con mejora de venta y ticket.",
    meetingDate: "2026-05-31",
    participants: "CEO, gerente de area, gerente de sucursal",
    responsible: "Maria Elena Alvarenga",
    result: "Venta medica $12,955",
    status: "Cumplido",
  },
  {
    agreement: "Conciliar cancelaciones por aseguradora.",
    closeDate: "Pendiente",
    comments: "Debe revisarse con agenda y caja.",
    dueDate: "2026-07-28",
    evidence: "Cancelaciones reportadas no cierran con total.",
    id: "fisio-agreement-insurers",
    impact: "Pendiente",
    meetingDate: "2026-07-23",
    participants: "Gerente sucursal, operaciones, finanzas",
    responsible: "Operaciones Fisioterapia",
    result: "Pendiente",
    status: "Sin iniciar",
  },
];

export const physioHistoryVersions: PhysioHistoryVersion[] = [
  {
    actor: "Maria Elena Alvarenga",
    date: "2026-07-21 09:12",
    event: "Archivo original cargado",
    id: "fisio-history-upload",
    status: "Archivo seleccionado",
    version: "v0.1",
  },
  {
    actor: "Sistema",
    date: "2026-07-21 09:14",
    event: "Validaciones ejecutadas con errores bloqueantes",
    id: "fisio-history-validation",
    status: "Datos con errores",
    version: "v0.2",
  },
  {
    actor: "Sistema",
    date: "2026-07-23 10:30",
    event: "Deck ejecutivo generado como borrador no oficial",
    id: "fisio-history-deck",
    status: "Borrador",
    version: "v0.3 prueba",
  },
];

export function getPhysioQualityStatus(score: number) {
  if (score >= 95) {
    return "Validado";
  }

  if (score >= 85) {
    return "Validado con advertencias";
  }

  if (score >= 70) {
    return "Requiere revision";
  }

  return "Bloqueado";
}

export function getPhysioBlockingIssues(issues = physioValidationIssues) {
  return issues.filter((issue) => issue.severity === "Bloqueante");
}

export function canClosePhysioPresentation(issues = physioValidationIssues) {
  return getPhysioBlockingIssues(issues).length === 0;
}

export function getPhysioReferenceMetrics(record = physioReferenceRecord) {
  const revenue = record.medicalSale + record.nonMedicalSale;
  const medicalTicket = record.medicalSale / record.medicalOrders;
  const directTicket = record.nonMedicalSale / record.nonMedicalOrders;
  const orderPerClient = record.orders / record.clients;
  const sessionsPerClient = record.sessions / record.clients;
  const salePerClient = revenue / record.clients;
  const salePerSession = revenue / record.sessions;
  const cubicleOccupancy = record.sessions / record.capacityByCubicles;
  const professionalOccupancy = record.sessions / record.capacityByProfessionals;

  return {
    cubicleOccupancy,
    directTicket,
    gap: revenue - record.target,
    medicalShare: record.medicalSale / revenue,
    medicalTicket,
    nonMedicalShare: record.nonMedicalSale / revenue,
    orderPerClient,
    professionalOccupancy,
    revenue,
    salePerClient,
    salePerSession,
    sessionsPerClient,
    ticket: revenue / record.orders,
  };
}

export function buildPhysioPresentationSlides(
  record = physioReferenceRecord,
): PhysioPresentationSlide[] {
  const metrics = getPhysioReferenceMetrics(record);
  const revenue = metrics.revenue;

  return [
    {
      action: "La gerente confirma datos base, periodo y responsables antes de presentar.",
      charts: [
        {
          points: [
            { label: "Calidad", target: 95, value: record.dataQualityScore },
            { label: "Cumplimiento", target: 100, value: record.target > 0 ? (revenue / record.target) * 100 : 0 },
            { label: "Margen", target: 32, value: record.marginRate * 100 },
          ],
          title: "Estado inicial del comite",
          type: "bars",
          unit: "%",
        },
      ],
      dataStatus: "Bloqueado",
      id: "portada",
      kind: "Principal",
      kpis: [
        { label: "Sucursal", value: record.branch },
        { label: "Periodo", value: record.period },
        { label: "Gerente", value: record.branchManager },
        { label: "Gerente de area", value: record.areaManager },
        { label: "Version", value: record.version },
        { label: "Puntaje de calidad", value: `${record.dataQualityScore}/100` },
      ],
      narrative:
        "Presentacion generada como borrador de comite. No puede cerrarse oficialmente mientras existan errores bloqueantes.",
      source: record.fileName,
      title: "1. Portada",
    },
    {
      action: "Explicar por que crece venta con casi el mismo volumen y que hara la sucursal para sostenerlo.",
      charts: [
        {
          current: [
            record.previousYearSale,
            record.previousMonthSale,
            revenue,
          ],
          labels: ["Jun 2025", "May 2026", "Jun 2026"],
          previous: [record.previousYearSale, record.previousYearSale, record.previousYearSale],
          title: "Venta actual vs referencias",
          type: "line",
          unit: "$",
        },
      ],
      dataStatus: "Requiere explicacion",
      id: "resumen-ejecutivo",
      kind: "Principal",
      kpis: [
        { label: "Meta", value: formatCurrency(record.target) },
        { label: "Venta", value: formatCurrency(revenue) },
        { label: "Cumplimiento", value: formatRate(revenue / record.target) },
        { label: "Variacion mensual", value: formatRate(record.monthlyGrowthRate) },
        { label: "Variacion interanual", value: formatRate(record.yoyGrowthRate) },
        { label: "Clientes", value: `${record.clients}` },
        { label: "Sesiones", value: `${record.sessions}` },
        { label: "Margen", value: formatRate(record.marginRate) },
      ],
      narrative:
        "La sucursal supero la meta mensual en 19.5%. La venta crecio 15.7% frente a mayo y 39.5% frente a junio del ano anterior. El crecimiento se produjo con practicamente el mismo numero de ordenes, impulsado principalmente por mayor ticket y por el canal medico.",
      requiredDecision: "Definir si se refuerza campana medica o se prioriza correccion de datos antes de escalar.",
      source: "CONSOLIDADO + llenado fisio",
      title: "2. Resumen ejecutivo",
    },
    {
      action: "Usar ventas mensuales recalculadas; no usar acumulados no conciliados de la plantilla.",
      charts: [
        {
          points: [
            { label: "Meta", value: record.target },
            { label: "Venta", value: revenue },
            { label: "Mayo", value: record.previousMonthSale },
            { label: "Junio 2025", value: record.previousYearSale },
          ],
          title: "Meta, venta y referencias",
          type: "bars",
          unit: "$",
        },
        {
          current: [12840, 13680, 14220, 15100, record.previousMonthSale, revenue],
          labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
          previous: [11890, 12120, 12440, 12630, 12810, record.previousYearSale],
          title: "Evolucion mensual",
          type: "line",
          unit: "$",
        },
      ],
      dataStatus: "Listo",
      id: "meta-venta-tendencia",
      kind: "Principal",
      kpis: [
        { label: "Meta", value: formatCurrency(record.target) },
        { label: "Venta", value: formatCurrency(revenue) },
        { label: "Cumplimiento", value: formatRate(revenue / record.target) },
        { label: "Excedente", value: formatCurrency(metrics.gap) },
        { label: "Venta mes anterior", value: formatCurrency(record.previousMonthSale) },
        { label: "Venta ano anterior", value: formatCurrency(record.previousYearSale) },
      ],
      narrative:
        "La tendencia se recalcula desde meses validados para evitar el acumulado incorrecto detectado en el archivo.",
      source: "llenado fisio",
      title: "3. Meta, venta y tendencia",
    },
    {
      action: "Enviar el detalle financiero al modulo Salud financiera para explicar gastos y margen.",
      charts: [
        {
          points: [
            { label: "Venta", tone: "positive", value: revenue },
            { label: "Gastos", tone: "negative", value: -record.expenses },
            { label: "Utilidad", tone: "neutral", value: record.grossProfit },
          ],
          title: "Venta a utilidad operativa",
          type: "waterfall",
          unit: "$",
        },
        {
          current: [0.356, 0.31, record.marginRate],
          labels: ["Jun 2025", "May 2026", "Jun 2026"],
          previous: [0.356, 0.356, 0.356],
          title: "Evolucion de margen",
          type: "line",
          unit: "%",
        },
      ],
      dataStatus: "Requiere explicacion",
      id: "resultado-financiero",
      kind: "Principal",
      kpis: [
        { label: "Venta", value: formatCurrency(revenue) },
        { label: "Gastos", value: formatCurrency(record.expenses) },
        { label: "Utilidad", value: formatCurrency(record.grossProfit) },
        { label: "Margen", value: formatRate(record.marginRate) },
        { label: "Gasto YoY", value: "+56.0%" },
        { label: "Utilidad YoY", value: "+9.6%" },
      ],
      narrative:
        "La venta crecio 39.5% frente a junio del ano anterior, pero los gastos aumentaron aproximadamente 56%. La utilidad crecio solo 9.6% y el margen bajo de 35.6% a 28.0%.",
      source: "CONSOLIDADO",
      title: "4. Resultado financiero resumido",
    },
    {
      action: "Mantener separadas las unidades para explicar volumen, frecuencia y ticket.",
      charts: [
        {
          points: [
            { label: "Clientes", value: record.clients },
            { label: "Ordenes", value: record.orders },
            { label: "Sesiones", value: record.sessions },
          ],
          title: "Unidades distintas",
          type: "bars",
          unit: "#",
        },
      ],
      dataStatus: "Listo",
      id: "pacientes-ordenes-sesiones",
      kind: "Principal",
      kpis: [
        { label: "Clientes", value: `${record.clients}` },
        { label: "Ordenes", value: `${record.orders}` },
        { label: "Sesiones", value: `${record.sessions}` },
        { label: "Ordenes/cliente", value: metrics.orderPerClient.toFixed(2) },
        { label: "Sesiones/cliente", value: metrics.sessionsPerClient.toFixed(2) },
        { label: "Venta/cliente", value: formatCurrency(metrics.salePerClient) },
        { label: "Venta/sesion", value: formatCurrency(metrics.salePerSession) },
        { label: "Ticket/orden", value: formatCurrency(metrics.ticket) },
      ],
      narrative:
        "El resultado debe explicar si el crecimiento viene de mas clientes, mas ordenes, mas sesiones o mejor ticket. Estos conceptos no se usan como sinonimos.",
      source: "CONSOLIDADO",
      title: "5. Pacientes, ordenes y sesiones",
    },
    {
      action: "Proteger el canal medico y documentar concentracion por doctor y visitador.",
      charts: [
        {
          points: [
            { label: "Medico", value: record.medicalSale },
            { label: "Sin medico", value: record.nonMedicalSale },
          ],
          title: "Venta por canal",
          type: "distribution",
          unit: "$",
        },
        {
          points: [
            { label: "Ticket medico", value: metrics.medicalTicket },
            { label: "Ticket sin medico", value: metrics.directTicket },
          ],
          title: "Ticket por canal",
          type: "bars",
          unit: "$",
        },
      ],
      dataStatus: "Listo",
      id: "canal-medico-directo",
      kind: "Principal",
      kpis: [
        { label: "Venta medica", value: formatCurrency(record.medicalSale) },
        { label: "Ordenes medicas", value: `${record.medicalOrders}` },
        { label: "Ticket medico", value: formatCurrency(metrics.medicalTicket) },
        { label: "Venta sin medico", value: formatCurrency(record.nonMedicalSale) },
        { label: "Ordenes sin medico", value: `${record.nonMedicalOrders}` },
        { label: "Ticket sin medico", value: formatCurrency(metrics.directTicket) },
        { label: "Part. venta medica", value: formatRate(metrics.medicalShare) },
        { label: "Part. ordenes medicas", value: formatRate(record.medicalOrders / record.orders) },
      ],
      narrative:
        "El canal medico genera una participacion mayor de venta que de volumen y presenta un ticket considerablemente superior al canal sin medico.",
      source: "Llenado Medicos Fisio + CONSOLIDADO",
      title: "6. Canal medico versus directo",
    },
    {
      action: "Revisar medicos activos, nuevos, recurrentes y sin actividad sin mostrar datos clinicos de pacientes.",
      charts: [
        {
          points: physioDoctorRows.map((row) => ({
            label: row.doctor,
            value: row.revenue,
          })),
          title: "Top medicos por venta",
          type: "bars",
          unit: "$",
        },
      ],
      dataStatus: "Listo",
      id: "medicos-referidores",
      kind: "Principal",
      kpis: [
        { label: "Medicos activos", value: "28" },
        { label: "Medicos nuevos", value: "8" },
        { label: "Medicos recurrentes", value: "20" },
        { label: "Sin actividad", value: "14" },
        { label: "Venta medica", value: formatCurrency(record.medicalSale) },
        { label: "Ordenes", value: `${record.medicalOrders}` },
      ],
      narrative:
        "La presentacion muestra origen de ordenes y especialidad; nunca debe exponer informacion clinica de pacientes.",
      source: "Medicos y Especialidades + Llenado Medicos Fisio",
      title: "7. Medicos referidores",
    },
    {
      action: "Detectar que especialidades explican el ticket y cuales requieren reactivacion.",
      charts: [
        {
          points: physioSpecialtyRows.map((row) => ({
            label: row.specialty,
            value: row.revenue,
          })),
          title: "Ranking de especialidades",
          type: "bars",
          unit: "$",
        },
      ],
      dataStatus: "Listo",
      id: "especialidades",
      kind: "Principal",
      kpis: [
        { label: "Especialidades", value: `${physioSpecialtyRows.length}` },
        { label: "Mayor venta", value: "Ortopedia" },
        { label: "Mayor ticket", value: "Traumatologia" },
        { label: "Participacion top 3", value: "90.3%" },
      ],
      narrative:
        "Especialidades se leen como fuente comercial y operativa; no se infieren diagnosticos ni complejidad clinica.",
      source: "Medicos y Especialidades",
      title: "8. Especialidades",
    },
    {
      action: "Usar top 3 y top 5 para medir concentracion de referidores por visitador.",
      charts: [
        {
          points: physioVisitorRows.map((row) => ({
            label: row.visitor,
            value: row.revenue,
          })),
          title: "Venta por visitador",
          type: "bars",
          unit: "$",
        },
      ],
      dataStatus: "Requiere explicacion",
      id: "visitadores",
      kind: "Principal",
      kpis: [
        { label: "Visitadores", value: `${physioVisitorRows.length}` },
        { label: "Top 3", value: "86.3%" },
        { label: "Top 5", value: "100.0%" },
        { label: "Medicos recuperados", value: "3" },
        { label: "Medicos nuevos", value: "8" },
      ],
      narrative:
        "La informacion de prueba muestra concentracion importante en los principales visitadores; la gerente debe explicar riesgo y plan de continuidad.",
      source: "Visitadores",
      title: "9. Visitadores medicos",
    },
    {
      action: "Validar que cantidad de terapia no se confunda con sesiones totales.",
      charts: [
        {
          points: physioTherapyRows.map((row) => ({
            label: row.therapy,
            value: row.quantity,
          })),
          title: "Cantidad por tipo de terapia",
          type: "bars",
          unit: "#",
        },
        {
          points: physioTherapyRows.map((row) => ({
            label: row.therapy,
            value: row.revenue,
          })),
          title: "Venta por terapia",
          type: "bars",
          unit: "$",
        },
      ],
      dataStatus: "Requiere explicacion",
      id: "mezcla-terapias",
      kind: "Principal",
      kpis: [
        { label: "Terapias registradas", value: `${physioTherapyRows.length}` },
        { label: "Mayor cantidad", value: "Terapias por patologias" },
        { label: "Mayor venta", value: "Terapias por patologias" },
        { label: "Total cantidades", value: `${physioTherapyRows.reduce((sum, row) => sum + row.quantity, 0)}` },
      ],
      narrative:
        "Una cantidad de terapia no equivale necesariamente a una sesion total; debe conciliarse con la definicion del Excel.",
      source: "CONSOLIDADO",
      title: "10. Mezcla de terapias",
    },
    {
      action: "Comparar uso contra capacidad cuando la fuente de disponibilidad exista.",
      charts: [
        {
          points: physioEquipmentRows.map((row) => ({
            label: row.equipment,
            target: row.capacity,
            value: row.uses,
          })),
          title: "Uso por equipo especial",
          type: "bars",
          unit: "#",
        },
      ],
      dataStatus: "Requiere explicacion",
      id: "equipos-especiales",
      kind: "Principal",
      kpis: [
        { label: "Equipos", value: `${physioEquipmentRows.length}` },
        { label: "Usos registrados", value: `${physioEquipmentRows.reduce((sum, row) => sum + row.uses, 0)}` },
        { label: "Mayor uso", value: "Electroterapia/US" },
        { label: "Capacidad", value: "Parcial" },
      ],
      narrative:
        "Un uso de equipo no equivale a paciente ni sesion; una sesion puede usar mas de un equipo.",
      source: "CONSOLIDADO",
      title: "11. Equipos especiales",
    },
    {
      action: "Usar la segmentacion solo para lectura comercial-operativa, no clinica.",
      charts: [
        {
          points: physioSegmentRows.map((row) => ({
            label: row.segment,
            value: row.clients,
          })),
          title: "Distribucion de clientes",
          type: "distribution",
          unit: "#",
        },
      ],
      dataStatus: "Listo",
      id: "segmentos-pacientes",
      kind: "Principal",
      kpis: [
        { label: "Deportistas", value: "1" },
        { label: "Tercera edad", value: "22" },
        { label: "Pediatricos", value: "4" },
        { label: "Publico general", value: "87" },
        { label: "Total", value: `${record.clients}` },
      ],
      narrative:
        "No se infiere diagnostico, condicion medica o complejidad a partir del segmento.",
      source: "CONSOLIDADO",
      title: "12. Segmentos de pacientes",
    },
    {
      action: "No presentar como oficial hasta conciliar sesiones, cancelaciones y aseguradoras.",
      charts: [
        {
          points: physioInsurerRows.map((row) => ({
            label: row.insurer,
            previous: row.canceled,
            value: row.completed,
          })),
          title: "Completadas versus canceladas",
          type: "bars",
          unit: "#",
        },
      ],
      dataStatus: "Bloqueado",
      id: "aseguradoras-cancelaciones",
      kind: "Principal",
      kpis: [
        { label: "Aseguradoras", value: `${physioInsurerRows.length}` },
        { label: "Sesiones", value: `${record.sessions}` },
        { label: "Cancelaciones", value: `${record.reportedCancellations}` },
        { label: "Tasa reportada", value: formatRate(record.reportedCancellations / (record.sessions + record.reportedCancellations)) },
      ],
      narrative:
        "La informacion de aseguradoras existe, pero no cierra contra sesiones y cancelaciones totales. Debe corregirse antes de enviar a direccion.",
      source: "CONSOLIDADO + agenda pendiente",
      title: "13. Aseguradoras y cancelaciones",
    },
    {
      action: "Abrir el detalle en Capacidad y ocupacion para revisar brecha por causa.",
      charts: [
        {
          points: [
            { label: "Capacidad cubiculos", value: record.capacityByCubicles },
            { label: "Capacidad profesionales", value: record.capacityByProfessionals },
            { label: "Sesiones", value: record.sessions },
            { label: "Cancelaciones", value: record.reportedCancellations },
          ],
          title: "Capacidad disponible vs sesiones",
          type: "bars",
          unit: "#",
        },
      ],
      dataStatus: "Listo",
      id: "capacidad-ocupacion",
      kind: "Principal",
      kpis: [
        { label: "Cubiculos", value: `${record.cubicles}` },
        { label: "Cap. cubiculos", value: `${record.capacityByCubicles}` },
        { label: "Cap. profesionales", value: `${record.capacityByProfessionals}` },
        { label: "Sesiones", value: `${record.sessions}` },
        { label: "Ocupacion cubiculos", value: formatRate(metrics.cubicleOccupancy) },
        { label: "Ocupacion profesionales", value: formatRate(metrics.professionalOccupancy) },
      ],
      narrative:
        "La presentacion resume capacidad; el analisis detallado vive en el modulo de Capacidad y ocupacion.",
      source: "CONSOLIDADO + capacidad operativa",
      title: "14. Capacidad y ocupacion",
    },
    {
      action: "Normalizar nombres y conciliar sesiones antes de usar resultados para bonos.",
      charts: [
        {
          points: physioProfessionalRows.map((row) => ({
            label: row.name,
            target: row.target,
            value: row.sessions,
          })),
          title: "Sesiones por fisioterapeuta",
          type: "bars",
          unit: "#",
        },
      ],
      dataStatus: "Requiere explicacion",
      id: "distribucion-fisioterapeuta",
      kind: "Principal",
      kpis: [
        { label: "Profesionales", value: "6" },
        { label: "Sesiones asignadas", value: `${physioProfessionalRows.reduce((sum, row) => sum + row.sessions, 0)}` },
        { label: "Sesiones totales", value: `${record.sessions}` },
        { label: "Diferencia", value: `${record.sessions - physioProfessionalRows.reduce((sum, row) => sum + row.sessions, 0)}` },
        { label: "Aliases", value: "2 detectados" },
      ],
      narrative:
        "No se muestra ranking absoluto sin considerar horas trabajadas, capacidad y registros no asignados.",
      source: "CONSOLIDADO + Filtros Fisio",
      title: "15. Distribucion por fisioterapeuta",
    },
    {
      action: "Conectar agenda y expediente clinico antes de calcular continuidad.",
      charts: [],
      dataStatus: "Pendiente de fuente",
      id: "continuidad-terapeutica",
      kind: "Opcional",
      kpis: [
        { label: "Estado", value: physioMissingSource },
        { label: "Fuente requerida", value: "Agenda + expediente clinico" },
      ],
      narrative:
        "Continuidad terapeutica. Pendiente de conexion con agenda y expediente clinico.",
      source: physioMissingSource,
      title: "Opcional. Continuidad terapeutica",
    },
    {
      action: "No generar resultados clinicos hasta tener fuente validada.",
      charts: [],
      dataStatus: "Pendiente de fuente",
      id: "resultados-clinicos",
      kind: "Opcional",
      kpis: [
        { label: "Estado", value: physioMissingSource },
        { label: "Fuente requerida", value: "Fuente clinica validada" },
      ],
      narrative:
        "Resultados clinicos. Pendiente de fuente clinica validada.",
      source: physioMissingSource,
      title: "Opcional. Resultados clinicos",
    },
    {
      action: "Comparar contra red solo con sucursales cargadas o marcadas como pendientes.",
      charts: [
        {
          points: physioComparisonRows.map((row) => ({
            label: row.branch,
            value: row.dataQuality ?? 0,
          })),
          title: "Calidad de datos por sucursal",
          type: "bars",
          unit: "/100",
        },
      ],
      dataStatus: "Requiere explicacion",
      id: "comparacion-red",
      kind: "Anexo",
      kpis: [
        { label: "Sucursales visibles", value: `${physioComparisonRows.length}` },
        { label: "Con plantilla", value: "1" },
        { label: "Pendientes", value: `${physioComparisonRows.length - 1}` },
      ],
      narrative:
        "La comparacion evita que el CEO abra presentaciones separadas. Las sucursales sin archivo quedan como pendientes de conexion de datos.",
      source: "Plantillas validadas por sucursal",
      title: "Comparacion contra la red",
    },
    {
      action: "La gerente debe revisar causas, evidencia y comentario antes de enviar a direccion.",
      charts: [],
      dataStatus: "Requiere explicacion",
      id: "explicacion-variaciones",
      kind: "Principal",
      kpis: [
        { label: "Variaciones", value: `${physioVariationExplanations.length}` },
        { label: "Confirmadas", value: "1" },
        { label: "Probables", value: "1" },
        { label: "Pendientes", value: "1" },
      ],
      narrative:
        "La presentacion no acepta frases genericas: cada variacion requiere causa, evidencia y responsable.",
      source: "Explicacion gerencial",
      title: "Explicacion de variaciones",
    },
    {
      action: "Revisar que cada accion tenga responsable, fecha, evidencia e impacto esperado.",
      charts: [
        {
          points: physioActionItems.map((item) => ({
            label: item.kpi,
            value: item.status === "Completada" ? 100 : item.status === "En curso" ? 55 : 20,
          })),
          title: "Avance del plan",
          type: "bars",
          unit: "%",
        },
      ],
      dataStatus: "Listo",
      id: "plan-accion",
      kind: "Principal",
      kpis: [
        { label: "Acciones", value: `${physioActionItems.length}` },
        { label: "En curso", value: `${physioActionItems.filter((item) => item.status === "En curso").length}` },
        { label: "Aceptadas", value: `${physioActionItems.filter((item) => item.status === "Aceptada").length}` },
        { label: "Pendientes", value: `${physioActionItems.filter((item) => item.status === "Pendiente").length}` },
      ],
      narrative:
        "El plan de accion es obligatorio para cerrar el comite y vuelve en el siguiente periodo como seguimiento.",
      source: "Plan de accion de sucursal",
      title: "Plan de accion",
    },
    {
      action: "Registrar respuesta del CEO para dejar trazabilidad.",
      charts: [],
      dataStatus: "Decision CEO",
      id: "decisiones-ceo",
      kind: "Principal",
      kpis: [
        { label: "Solicitudes", value: `${physioDecisionRequests.length}` },
        { label: "Alta urgencia", value: `${physioDecisionRequests.filter((item) => item.urgency === "Alta").length}` },
        { label: "Pendientes", value: `${physioDecisionRequests.filter((item) => item.status === "Pendiente").length}` },
      ],
      narrative:
        "Cada decision debe incluir problema, evidencia, impacto, costo, beneficio, urgencia y respuesta del CEO.",
      requiredDecision: "Cerrar criterio de reimportacion y campana medica.",
      source: "Comite ejecutivo",
      title: "Decisiones requeridas del CEO",
    },
  ];
}

export function formatPhysioValue(value: number | null, kind: "currency" | "rate" | "number") {
  if (value === null) {
    return physioMissingSource;
  }

  if (kind === "currency") {
    return formatCurrency(value);
  }

  if (kind === "rate") {
    return formatRate(value);
  }

  return value.toLocaleString("en-US");
}
