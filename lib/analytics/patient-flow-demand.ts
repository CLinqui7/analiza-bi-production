import type { TrendChartOption, TrendInsight, TrendSeries } from "@/components/analytics-comparison-chart";
import type { BusinessLineSlug } from "@/lib/analytics/business-line-operations";

export type PatientFlowMetricStatus =
  | "available"
  | "warning"
  | "critical"
  | "pending-upload"
  | "not-connected"
  | "incomplete"
  | "calculated";

export type PatientFlowMetric = {
  label: string;
  value: string;
  note: string;
  status: PatientFlowMetricStatus;
};

export type PatientFlowStage = {
  label: string;
  value: string;
  conversion: string;
  note: string;
  status: PatientFlowMetricStatus;
};

export type PatientFlowBlock = {
  title: string;
  description: string;
  metrics: PatientFlowMetric[];
};

export type PatientFlowComparisonRow = {
  line: string;
  patients: string;
  recurrence: string;
  conversion: string;
  responseTime: string;
  lostDemand: string;
  status: string;
  insight: string;
};

export type PatientFlowBranchRow = {
  branch: string;
  manager: string;
  patients: string;
  recurrence: string;
  conversion: string;
  waitTime: string;
  lostDemand: string;
  benchmark: string;
  alert: string;
};

export type PatientFlowFilterSet = {
  serviceLabel: string;
  professionalLabel: string;
  serviceOptions: string[];
  professionalOptions: string[];
  channelOptions: string[];
  payerOptions: string[];
  patientTypeOptions: string[];
  flowStateOptions: string[];
};

export type PatientFlowTrendChart = {
  title: string;
  description: string;
  xLabels: string[];
  yLabel: string;
  series: TrendSeries[];
  insights: TrendInsight[];
  metricOptions: TrendChartOption[];
};

export type PatientFlowDemandScreen = {
  slug: BusinessLineSlug;
  title: string;
  subtitle: string;
  description: string;
  primaryMetrics: PatientFlowMetric[];
  trendChart: PatientFlowTrendChart;
  funnelTitle: string;
  funnel: PatientFlowStage[];
  filters: PatientFlowFilterSet;
  blocks: PatientFlowBlock[];
  branchRows: PatientFlowBranchRow[];
  comparisonRows?: PatientFlowComparisonRow[];
};

const monthlyLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul"];

const defaultFilterOptions = {
  channelOptions: [
    "Todos los canales",
    "Paciente Analiza",
    "Referidor medico",
    "Convenio",
    "Domicilio",
    "Venta directa",
  ],
  payerOptions: [
    "Todos los pagadores",
    "Particular",
    "Convenio",
    "Credito",
    "DRSV",
    "Pago mixto",
  ],
  patientTypeOptions: [
    "Todos los pacientes",
    "Nuevo",
    "Recurrente",
    "Reactivado",
    "Inactivo",
    "Riesgo de abandono",
  ],
  flowStateOptions: [
    "Todo el flujo",
    "Inicio del flujo",
    "Atencion",
    "Servicio completado",
    "Facturacion",
    "Cobro",
    "Perdida de oportunidad",
  ],
};

const patientFlowComparisonRows: PatientFlowComparisonRow[] = [
  {
    line: "Laboratorio",
    patients: "10,140",
    recurrence: "58%",
    conversion: "94.8%",
    responseTime: "11.8 horas",
    lostDemand: "382 ordenes",
    status: "Verde",
    insight:
      "Los pacientes recurrentes representan 58% del volumen y sostienen la venta; Aguilares capta pacientes nuevos, pero debe mejorar recurrencia a 90 dias.",
  },
  {
    line: "Fisioterapia",
    patients: "4,850",
    recurrence: "64%",
    conversion: "81.2%",
    responseTime: "3.4 dias a primera cita",
    lostDemand: "485 citas",
    status: "Amarillo",
    insight:
      "El 72% de abandonos ocurre antes de la cuarta sesion; Centro capta pacientes nuevos, pero pierde frecuencia semanal.",
  },
  {
    line: "Imagenes",
    patients: "3,430",
    recurrence: "31%",
    conversion: "86.5%",
    responseTime: "3.8 dias a proxima cita",
    lostDemand: "196 pacientes",
    status: "Rojo",
    insight:
      "Tomografia tiene lista de espera de 4.8 dias en Santa Tecla, mientras otra sede opera con 61% de utilizacion.",
  },
];

const patientFlowTrendOptions: Record<BusinessLineSlug, TrendChartOption[]> = {
  consolidado: [
    {
      id: "recurrencia-consolidada",
      label: "Recurrencia de pacientes",
      description:
        "Compara recurrencia de pacientes por periodo para ver si Analiza logra que el paciente regrese.",
      yLabel: "% recurrencia",
      series: [
        { label: "2026 recurrencia", value: "57%", color: "blue", points: [49, 51, 53, 54, 56, 57, 57] },
        { label: "2025 recurrencia", value: "52%", color: "orange", points: [45, 47, 48, 50, 51, 52, 52] },
        { label: "Meta", value: "63%", color: "teal", points: [57, 58, 59, 60, 61, 63, 63] },
      ],
      insights: [
        { label: "Retencion", value: "+5 pts", note: "La recurrencia mejora, pero todavia queda debajo de meta.", tone: "positive" },
        { label: "Brecha", value: "-6 pts", note: "La brecha debe verse por linea, sucursal y tipo de paciente.", tone: "warning" },
        { label: "Lectura CEO", value: "Pacientes que vuelven", note: "La demanda sana no es solo llegada; tambien regreso y frecuencia.", tone: "neutral" },
      ],
    },
    {
      id: "conversion-flujo",
      label: "Conversion del flujo",
      description:
        "Compara inicio del flujo, atencion, servicio completado, facturacion y cobro sin sumar unidades incompatibles.",
      yLabel: "% conversion",
      series: [
        { label: "2026 conversion", value: "88%", color: "blue", points: [82, 84, 85, 86, 87, 88, 88] },
        { label: "2025 conversion", value: "84%", color: "orange", points: [78, 80, 81, 82, 83, 84, 84] },
        { label: "Meta", value: "92%", color: "teal", points: [88, 89, 90, 90, 91, 92, 92] },
      ],
      insights: [
        { label: "Mejora", value: "+4 pts", note: "El flujo convierte mejor que 2025.", tone: "positive" },
        { label: "Meta", value: "-4 pts", note: "La perdida ocurre en agenda, completado, facturacion o cobro segun linea.", tone: "warning" },
        { label: "Accion", value: "Drill-down", note: "Abrir sucursal y estado del flujo muestra donde se pierde oportunidad.", tone: "warning" },
      ],
    },
    {
      id: "demanda-no-atendida",
      label: "Demanda no atendida",
      description:
        "Mide pacientes, ordenes, citas o solicitudes que iniciaron demanda y no terminaron en atencion efectiva.",
      yLabel: "Oportunidades",
      series: [
        { label: "2026 perdida", value: "1,063", color: "rose", points: [720, 790, 850, 920, 990, 1063, 1063] },
        { label: "2025 perdida", value: "1,180", color: "orange", points: [850, 920, 980, 1040, 1110, 1180, 1180] },
        { label: "Meta", value: "650", color: "teal", points: [820, 780, 740, 700, 670, 650, 650] },
      ],
      insights: [
        { label: "Vs 2025", value: "-10%", note: "Se pierde menos demanda que el ano anterior.", tone: "positive" },
        { label: "Brecha meta", value: "+413", note: "Todavia hay oportunidad no atendida que impacta ingreso y recurrencia.", tone: "warning" },
        { label: "Foco", value: "Causa raiz", note: "Separar no-show, lista de espera, rechazo y flujo incompleto.", tone: "warning" },
      ],
    },
    {
      id: "dias-entre-visitas",
      label: "Dias entre visitas",
      description:
        "Compara la frecuencia real de uso del paciente entre servicios y sucursales.",
      yLabel: "Dias",
      series: [
        { label: "2026 dias", value: "24", color: "blue", points: [31, 29, 27, 26, 25, 24, 24] },
        { label: "2025 dias", value: "28", color: "orange", points: [35, 33, 32, 30, 29, 28, 28] },
        { label: "Meta", value: "20", color: "teal", points: [26, 25, 24, 23, 22, 20, 20] },
      ],
      insights: [
        { label: "Frecuencia", value: "-4 dias", note: "Los pacientes estan regresando antes que en 2025.", tone: "positive" },
        { label: "Meta", value: "+4 dias", note: "La frecuencia ideal depende de la linea y del plan de atencion.", tone: "warning" },
        { label: "Riesgo", value: "Caida de frecuencia", note: "Pacientes con caida deben activarse antes de quedar inactivos.", tone: "warning" },
      ],
    },
  ],
  laboratorio: [
    {
      id: "pacientes-recurrentes-lab",
      label: "Pacientes recurrentes",
      description:
        "Compara la recurrencia de pacientes de laboratorio y su relacion con volumen de ordenes.",
      yLabel: "% recurrencia",
      series: [
        { label: "2026 recurrencia", value: "58%", color: "blue", points: [51, 53, 55, 56, 57, 58, 58] },
        { label: "2025 recurrencia", value: "54%", color: "orange", points: [48, 49, 51, 52, 53, 54, 54] },
        { label: "Meta", value: "62%", color: "teal", points: [56, 57, 58, 59, 60, 62, 62] },
      ],
      insights: [
        { label: "Recurrencia", value: "+4 pts", note: "Los pacientes recurrentes sostienen el volumen de laboratorio.", tone: "positive" },
        { label: "Meta", value: "-4 pts", note: "Aguilares capta nuevos, pero debe mejorar recurrencia a 90 dias.", tone: "warning" },
        { label: "Decision", value: "Referidores", note: "Cruzar medico referidor, sucursal y prueba detecta recurrencia saludable.", tone: "neutral" },
      ],
    },
    {
      id: "ordenes-recibidas-lab",
      label: "Ordenes recibidas",
      description:
        "Mide demanda de laboratorio por orden, antes de muestra, resultado, facturacion y cobro.",
      yLabel: "Ordenes",
      series: [
        { label: "2026 ordenes", value: "9,034", color: "blue", points: [6900, 7040, 7560, 7810, 8240, 9034, 9034] },
        { label: "2025 ordenes", value: "8,120", color: "orange", points: [6200, 6480, 6900, 7240, 7680, 8120, 8120] },
        { label: "Meta", value: "9,500", color: "teal", points: [7200, 7500, 7900, 8350, 8850, 9500, 9500] },
      ],
      insights: [
        { label: "Demanda", value: "+11%", note: "El volumen sube contra 2025.", tone: "positive" },
        { label: "Brecha", value: "-466", note: "La meta depende de horarios pico y ordenes por canal.", tone: "warning" },
        { label: "Riesgo", value: "Resultado", note: "Orden sin resultado no debe interpretarse como orden completada.", tone: "warning" },
      ],
    },
    {
      id: "conversion-orden-lab",
      label: "Conversion de orden",
      description:
        "Compara orden creada contra entrega, facturacion y cobro del resultado.",
      yLabel: "% conversion",
      series: [
        { label: "2026 conversion", value: "94.8%", color: "blue", points: [91, 92, 93, 94, 94, 95, 95] },
        { label: "2025 conversion", value: "91.5%", color: "orange", points: [88, 89, 90, 90, 91, 92, 92] },
        { label: "Meta", value: "96%", color: "teal", points: [94, 94, 95, 95, 96, 96, 96] },
      ],
      insights: [
        { label: "Conversion", value: "+3.3 pts", note: "Mejora el flujo de orden a servicio completado.", tone: "positive" },
        { label: "Brecha", value: "-1.2 pts", note: "Los pendientes deben dividirse entre muestra, resultado, factura y cobro.", tone: "warning" },
        { label: "Fuente", value: "LIS/API", note: "La conexion real cerrara tiempos y estados pendientes.", tone: "neutral" },
      ],
    },
    {
      id: "demanda-perdida-lab",
      label: "Demanda perdida",
      description:
        "Mide ordenes anuladas, pendientes, sin resultado, sin facturar o sin cobrar.",
      yLabel: "Ordenes",
      series: [
        { label: "2026 perdida", value: "382", color: "rose", points: [470, 452, 430, 412, 396, 382, 382] },
        { label: "2025 perdida", value: "510", color: "orange", points: [610, 590, 565, 545, 528, 510, 510] },
        { label: "Meta", value: "250", color: "teal", points: [360, 340, 320, 300, 275, 250, 250] },
      ],
      insights: [
        { label: "Recuperacion", value: "-128", note: "Menos ordenes perdidas que 2025.", tone: "positive" },
        { label: "Meta", value: "+132", note: "La demanda perdida aun representa venta que no termina el flujo.", tone: "warning" },
        { label: "Accion", value: "Estados", note: "Separar anulada, sin resultado, sin factura y sin cobro.", tone: "warning" },
      ],
    },
  ],
  fisioterapia: [
    {
      id: "citas-atendidas-fisio",
      label: "Citas atendidas",
      description:
        "Compara citas atendidas contra ano anterior y meta para ver demanda convertida en atencion.",
      yLabel: "Citas",
      series: [
        { label: "2026 citas", value: "1,320", color: "blue", points: [1040, 1095, 1160, 1205, 1260, 1320, 1320] },
        { label: "2025 citas", value: "1,188", color: "orange", points: [920, 982, 1030, 1088, 1136, 1188, 1188] },
        { label: "Meta", value: "1,470", color: "teal", points: [1120, 1180, 1240, 1320, 1400, 1470, 1470] },
      ],
      insights: [
        { label: "Asistencia", value: "+11%", note: "Se atienden mas citas que 2025.", tone: "positive" },
        { label: "Meta", value: "-150", note: "La brecha esta en confirmacion, no-show y reprogramacion.", tone: "warning" },
        { label: "Decision", value: "Agenda util", note: "Agenda llena no equivale a sesion atendida.", tone: "warning" },
      ],
    },
    {
      id: "continuidad-terapeutica",
      label: "Continuidad terapeutica",
      description:
        "Mide cumplimiento de planes y sesiones realizadas contra sesiones indicadas.",
      yLabel: "% continuidad",
      series: [
        { label: "2026 continuidad", value: "81%", color: "blue", points: [72, 74, 76, 78, 80, 81, 81] },
        { label: "2025 continuidad", value: "76%", color: "orange", points: [68, 70, 72, 73, 75, 76, 76] },
        { label: "Meta", value: "88%", color: "teal", points: [80, 82, 84, 85, 87, 88, 88] },
      ],
      insights: [
        { label: "Mejora", value: "+5 pts", note: "Los planes avanzan mejor que en 2025.", tone: "positive" },
        { label: "Abandono", value: "72%", note: "La mayor parte del abandono ocurre antes de la cuarta sesion.", tone: "warning" },
        { label: "Accion", value: "Sesion 1-4", note: "Seguimiento temprano protege recurrencia e ingreso por paciente.", tone: "warning" },
      ],
    },
    {
      id: "no-show-fisio",
      label: "No-show",
      description:
        "Mide ausencias que rompen continuidad terapeutica y dejan capacidad sin usar.",
      yLabel: "Citas",
      series: [
        { label: "2026 no-show", value: "98", color: "rose", points: [82, 88, 91, 94, 96, 98, 98] },
        { label: "2025 no-show", value: "112", color: "orange", points: [96, 102, 107, 109, 111, 112, 112] },
        { label: "Meta", value: "55", color: "teal", points: [72, 68, 64, 60, 58, 55, 55] },
      ],
      insights: [
        { label: "Vs 2025", value: "-13%", note: "Hay mejora, pero aun impacta horas e ingreso.", tone: "positive" },
        { label: "Brecha", value: "+43", note: "La lista de espera debe recuperar agenda perdida.", tone: "warning" },
        { label: "Sucursal", value: "Centro", note: "Centro combina menor frecuencia semanal y mayor tiempo entre sesiones.", tone: "warning" },
      ],
    },
    {
      id: "pacientes-riesgo-abandono",
      label: "Pacientes en riesgo",
      description:
        "Mide pacientes que no estan cumpliendo frecuencia terapeutica recomendada.",
      yLabel: "Pacientes",
      series: [
        { label: "2026 riesgo", value: "36", color: "rose", points: [48, 45, 43, 41, 38, 36, 36] },
        { label: "2025 riesgo", value: "52", color: "orange", points: [62, 60, 58, 56, 54, 52, 52] },
        { label: "Meta", value: "24", color: "teal", points: [38, 35, 32, 29, 26, 24, 24] },
      ],
      insights: [
        { label: "Recuperacion", value: "-16", note: "Menos pacientes en riesgo que 2025.", tone: "positive" },
        { label: "Brecha", value: "+12", note: "El seguimiento debe ocurrir antes de que el paciente abandone.", tone: "warning" },
        { label: "Accion", value: "Frecuencia", note: "Cruzar dias desde ultima sesion y plan activo.", tone: "warning" },
      ],
    },
  ],
  imagenes: [
    {
      id: "solicitudes-imagenes",
      label: "Solicitudes recibidas",
      description:
        "Mide demanda diagnostica desde solicitud antes de agenda, estudio, informe y entrega.",
      yLabel: "Solicitudes",
      series: [
        { label: "2026 solicitudes", value: "760", color: "blue", points: [610, 632, 675, 704, 732, 760, 760] },
        { label: "2025 solicitudes", value: "690", color: "orange", points: [552, 574, 604, 628, 655, 690, 690] },
        { label: "Meta", value: "820", color: "teal", points: [650, 680, 710, 746, 784, 820, 820] },
      ],
      insights: [
        { label: "Demanda", value: "+10%", note: "Crecen las solicitudes contra 2025.", tone: "positive" },
        { label: "Brecha", value: "-60", note: "La agenda y capacidad por modalidad limitan la meta.", tone: "warning" },
        { label: "Accion", value: "Modalidad", note: "Separar tomografia, rayos X y ultrasonido.", tone: "neutral" },
      ],
    },
    {
      id: "estudios-realizados-imagenes",
      label: "Estudios realizados",
      description:
        "Compara solicitudes que terminan en estudio realizado y oportunidad perdida por agenda o equipo.",
      yLabel: "Estudios",
      series: [
        { label: "2026 estudios", value: "521", color: "blue", points: [438, 452, 481, 493, 508, 521, 521] },
        { label: "2025 estudios", value: "492", color: "orange", points: [410, 421, 438, 456, 472, 492, 492] },
        { label: "Meta", value: "640", color: "teal", points: [510, 530, 555, 580, 610, 640, 640] },
      ],
      insights: [
        { label: "Realizacion", value: "+6%", note: "Se realizan mas estudios que 2025.", tone: "positive" },
        { label: "Brecha", value: "-119", note: "El 23% podria redistribuirse entre sedes si hay capacidad.", tone: "warning" },
        { label: "Riesgo", value: "Lista espera", note: "Tomografia mantiene 4.8 dias de espera en Santa Tecla.", tone: "warning" },
      ],
    },
    {
      id: "informes-pendientes-imagenes",
      label: "Informes pendientes",
      description:
        "Mide estudios realizados que todavia no tienen informe validado o entregado.",
      yLabel: "Informes",
      series: [
        { label: "2026 pendientes", value: "38", color: "rose", points: [52, 49, 46, 44, 41, 38, 38] },
        { label: "2025 pendientes", value: "44", color: "orange", points: [61, 57, 54, 50, 47, 44, 44] },
        { label: "Meta", value: "20", color: "teal", points: [34, 31, 28, 25, 22, 20, 20] },
      ],
      insights: [
        { label: "Backlog", value: "-14%", note: "Mejora contra 2025, pero sigue sobre meta.", tone: "positive" },
        { label: "Brecha", value: "+18", note: "Informe pendiente puede atrasar entrega, facturacion y cobro.", tone: "warning" },
        { label: "Fuente", value: "RIS/PACS", note: "Tiempos por radiologo dependen de la conexion real.", tone: "neutral" },
      ],
    },
    {
      id: "demanda-no-atendida-imagenes",
      label: "Demanda no atendida",
      description:
        "Mide pacientes que esperan, cancelan o no completan el flujo de imagenes.",
      yLabel: "Pacientes",
      series: [
        { label: "2026 perdida", value: "196", color: "rose", points: [230, 222, 216, 208, 201, 196, 196] },
        { label: "2025 perdida", value: "240", color: "orange", points: [286, 276, 266, 255, 247, 240, 240] },
        { label: "Meta", value: "120", color: "teal", points: [180, 165, 150, 140, 130, 120, 120] },
      ],
      insights: [
        { label: "Recuperacion", value: "-44", note: "Menos pacientes perdidos que 2025.", tone: "positive" },
        { label: "Brecha", value: "+76", note: "La redistribucion por sede puede recuperar parte de la demanda.", tone: "warning" },
        { label: "Accion", value: "Disponibilidad", note: "Comparar espera por modalidad, equipo y sucursal.", tone: "warning" },
      ],
    },
  ],
};

export const patientFlowDemandScreens: Record<
  BusinessLineSlug,
  PatientFlowDemandScreen
> = {
  consolidado: {
    slug: "consolidado",
    title: "Flujo de pacientes y demanda",
    subtitle: "Consolidado sin mezclar ordenes, sesiones y estudios",
    description:
      "Radar ejecutivo para ver quien llega, quien regresa, con que frecuencia utiliza Analiza, donde se atiende y en que etapa se pierde oportunidad.",
    primaryMetrics: [
      { label: "Pacientes unicos", value: "18,420", note: "deduplicacion DEMO", status: "incomplete" },
      { label: "Pacientes nuevos", value: "7,880", note: "42.8% del flujo", status: "available" },
      { label: "Pacientes recurrentes", value: "10,540", note: "57.2% del flujo", status: "available" },
      { label: "Frecuencia promedio", value: "2.8 visitas", note: "por paciente", status: "calculated" },
      { label: "Pacientes multi-linea", value: "14%", note: "usan mas de una linea", status: "calculated" },
      { label: "Conversion total", value: "88%", note: "indice normalizado", status: "warning" },
      { label: "Demanda no atendida", value: "1,063", note: "ordenes, citas o pacientes", status: "warning" },
      { label: "Valor de vida estimado", value: "$412", note: "LTV DEMO", status: "calculated" },
    ],
    trendChart: {
      title: "Recurrencia, conversion y demanda perdida",
      description:
        "Compara comportamiento del paciente con el periodo elegido sin sumar unidades incompatibles.",
      xLabels: monthlyLabels,
      yLabel: "% recurrencia",
      series: patientFlowTrendOptions.consolidado[0].series,
      insights: patientFlowTrendOptions.consolidado[0].insights,
      metricOptions: patientFlowTrendOptions.consolidado,
    },
    funnelTitle: "Embudo normalizado por linea",
    funnel: [
      { label: "Inicio del flujo", value: "100%", conversion: "Base", note: "solicitud, cita u orden", status: "calculated" },
      { label: "Atencion", value: "92%", conversion: "-8 pts", note: "paciente atendido o muestra/estudio realizado", status: "warning" },
      { label: "Servicio completado", value: "88%", conversion: "-4 pts", note: "orden, sesion o informe completo", status: "warning" },
      { label: "Facturacion", value: "84%", conversion: "-4 pts", note: "servicio facturado", status: "warning" },
      { label: "Cobro", value: "79%", conversion: "-5 pts", note: "cobro confirmado", status: "warning" },
    ],
    filters: {
      serviceLabel: "Linea / servicio",
      professionalLabel: "Responsable",
      serviceOptions: ["Todas las lineas", "Laboratorio", "Fisioterapia", "Imagenes"],
      professionalOptions: ["Todos los responsables", "Medico referidor", "Fisioterapeuta", "Tecnico", "Radiologo"],
      ...defaultFilterOptions,
    },
    comparisonRows: patientFlowComparisonRows,
    branchRows: [
      { branch: "Aguilares", manager: "Gerente Aguilares", patients: "1,430", recurrence: "42%", conversion: "91%", waitTime: "10.8 h", lostDemand: "84", benchmark: "-8 pts recurrencia", alert: "Capta nuevos, baja recurrencia 90 dias" },
      { branch: "Centro", manager: "Gerente Centro", patients: "1,280", recurrence: "61%", conversion: "83%", waitTime: "3.9 dias", lostDemand: "116", benchmark: "-5 pts conversion", alert: "Perdida en frecuencia y agenda" },
      { branch: "Santa Tecla", manager: "Gerente Santa Tecla", patients: "1,160", recurrence: "48%", conversion: "86%", waitTime: "4.8 dias", lostDemand: "96", benchmark: "+1 pt red", alert: "Lista de espera en imagenes" },
    ],
    blocks: [
      {
        title: "A. Comportamiento del paciente",
        description:
          "Pacientes nuevos, recurrentes, reactivados, inactivos, frecuencia, dias entre visitas y uso multi-linea.",
        metrics: [
          { label: "Pacientes reactivados", value: "640", note: "retomaron servicio", status: "available" },
          { label: "Pacientes inactivos", value: "1,240", note: "sin visita reciente", status: "warning" },
          { label: "Dias entre visitas", value: "24", note: "promedio DEMO", status: "calculated" },
          { label: "Mas de una sucursal", value: "9%", note: "movilidad interna", status: "calculated" },
          { label: "Caida de frecuencia", value: "318", note: "requieren recuperacion", status: "warning" },
          { label: "Ingreso por visita", value: "$56", note: "promedio DEMO", status: "calculated" },
        ],
      },
      {
        title: "B. Graficos ejecutivos",
        description:
          "Vistas recomendadas para comparar flujo, recurrencia, demanda, horarios y perdida de pacientes.",
        metrics: [
          { label: "Embudo normalizado", value: "Activo", note: "inicio, atencion, completado, factura y cobro", status: "calculated" },
          { label: "Nuevos vs recurrentes", value: "Por sucursal", note: "barras apiladas", status: "available" },
          { label: "Frecuencia de visita", value: "1, 2, 3-5, 6-10, +10", note: "histograma", status: "available" },
          { label: "Cohortes de recurrencia", value: "Mensual", note: "retencion desde primera atencion", status: "calculated" },
          { label: "Mapa de calor", value: "Dia y franja", note: "demanda por horario", status: "available" },
          { label: "Ranking perdida", value: "Sucursal / causa", note: "impacto operativo y financiero", status: "warning" },
        ],
      },
    ],
  },
  laboratorio: {
    slug: "laboratorio",
    title: "Pacientes, ordenes y recurrencia",
    subtitle: "Laboratorio no usa citas como indicador principal",
    description:
      "Analiza comportamiento del paciente, volumen de ordenes, pruebas realizadas y cumplimiento del flujo hasta entrega, facturacion y cobro.",
    primaryMetrics: [
      { label: "Pacientes unicos", value: "10,140", note: "plantillas SV DEMO", status: "available" },
      { label: "Recurrencia", value: "58%", note: "pacientes que regresan", status: "available" },
      { label: "Ordenes recibidas", value: "9,034", note: "periodo seleccionado", status: "available" },
      { label: "Ordenes completadas", value: "8,806", note: "flujo operativo", status: "available" },
      { label: "Conversion del flujo", value: "94.8%", note: "orden a servicio completado", status: "warning" },
      { label: "Tiempo total orden", value: "11.8 h", note: "registro a entrega DEMO", status: "incomplete" },
      { label: "Demanda perdida", value: "382 ordenes", note: "anuladas, pendientes o incompletas", status: "warning" },
      { label: "Ordenes por paciente", value: "1.7", note: "promedio DEMO", status: "calculated" },
    ],
    trendChart: {
      title: "Pacientes, ordenes y recurrencia",
      description:
        "Compara el comportamiento de pacientes y ordenes de laboratorio contra el periodo elegido.",
      xLabels: monthlyLabels,
      yLabel: "% recurrencia",
      series: patientFlowTrendOptions.laboratorio[0].series,
      insights: patientFlowTrendOptions.laboratorio[0].insights,
      metricOptions: patientFlowTrendOptions.laboratorio,
    },
    funnelTitle: "Embudo de orden laboratorio",
    funnel: [
      { label: "Orden creada", value: "9,034", conversion: "100%", note: "registro inicial", status: "available" },
      { label: "Paciente recibido", value: "8,912", conversion: "98.6%", note: "paciente atendido", status: "available" },
      { label: "Muestra tomada", value: "8,806", conversion: "97.5%", note: "toma completada", status: "available" },
      { label: "Pruebas procesadas", value: "Pendiente", conversion: "No disponible", note: "requiere detalle por prueba", status: "pending-upload" },
      { label: "Resultado validado", value: "Datos pendientes de conexion", conversion: "No disponible", note: "requiere LIS/API", status: "not-connected" },
      { label: "Entregado", value: "Datos pendientes de conexion", conversion: "No disponible", note: "marcas de tiempo pendientes", status: "not-connected" },
      { label: "Facturado", value: "$1,015K", conversion: "Estimado", note: "plantillas SV", status: "available" },
      { label: "Cobrado", value: "$924K", conversion: "91%", note: "cobro DEMO", status: "warning" },
    ],
    filters: {
      serviceLabel: "Prueba / perfil",
      professionalLabel: "Medico referidor / area tecnica",
      serviceOptions: ["Todas las pruebas", "Hemograma", "Quimica sanguinea", "Perfil tiroideo", "Pruebas tercerizadas", "Domicilio"],
      professionalOptions: ["Todos los referidores", "Medico referidor", "Especialidad medica", "Area tecnica", "Visitador", "Flebotomista"],
      ...defaultFilterOptions,
    },
    branchRows: [
      { branch: "Aguilares", manager: "Gerente Aguilares", patients: "1,430", recurrence: "42%", conversion: "93%", waitTime: "12.4 h", lostDemand: "84 ordenes", benchmark: "-16 pts recurrencia", alert: "Alta captacion nueva, menor retorno a 90 dias" },
      { branch: "Chalatenango", manager: "Gerente Chalatenango", patients: "1,280", recurrence: "59%", conversion: "95%", waitTime: "11.1 h", lostDemand: "42 ordenes", benchmark: "+1 pt recurrencia", alert: "Sostener tiempos de entrega" },
      { branch: "Santa Tecla", manager: "Gerente Santa Tecla", patients: "1,610", recurrence: "63%", conversion: "96%", waitTime: "10.2 h", lostDemand: "38 ordenes", benchmark: "+5 pts recurrencia", alert: "Buen retorno, revisar costo por prueba" },
    ],
    blocks: [
      {
        title: "A. Pacientes y comportamiento",
        description:
          "Pacientes unicos, nuevos, recurrentes, reactivados, ordenes por paciente, frecuencia y referidores.",
        metrics: [
          { label: "Pacientes nuevos", value: "4,260", note: "captacion mensual", status: "available" },
          { label: "Pacientes recurrentes", value: "5,880", note: "58% del volumen", status: "available" },
          { label: "Pacientes reactivados", value: "312", note: "volvieron al flujo", status: "available" },
          { label: "Dias entre ordenes", value: "21", note: "promedio DEMO", status: "calculated" },
          { label: "Pacientes por canal", value: "Disponible", note: "Analiza, DRSV, domicilio y referidor", status: "available" },
          { label: "Usan otra linea", value: "11%", note: "oportunidad cross-line", status: "calculated" },
        ],
      },
      {
        title: "B. Ordenes y tiempos",
        description:
          "Ordenes recibidas, completadas, pendientes, anuladas, sin resultado, sin facturar y tiempos del flujo.",
        metrics: [
          { label: "Ordenes pendientes", value: "228", note: "requieren seguimiento", status: "warning" },
          { label: "Ordenes anuladas", value: "74", note: "motivo pendiente", status: "warning" },
          { label: "Ordenes sin resultado", value: "Datos pendientes de conexion", note: "requiere LIS", status: "not-connected" },
          { label: "Ordenes sin facturar", value: "82", note: "conciliacion pendiente", status: "warning" },
          { label: "Registro a muestra", value: "38 min", note: "estimado DEMO", status: "available" },
          { label: "Validacion a entrega", value: "Datos pendientes de conexion", note: "marca de tiempo requerida", status: "not-connected" },
        ],
      },
    ],
  },
  fisioterapia: {
    slug: "fisioterapia",
    title: "Agenda, continuidad y recurrencia terapeutica",
    subtitle: "Una cita aislada no describe el desempeno",
    description:
      "Analiza agenda, asistencia, sesiones, continuidad de planes, abandono y recurrencia terapeutica por paciente, sucursal y profesional.",
    primaryMetrics: [
      { label: "Pacientes nuevos", value: "420", note: "entrada al flujo", status: "available" },
      { label: "Pacientes activos", value: "1,180", note: "en tratamiento", status: "available" },
      { label: "Recurrencia", value: "64%", note: "regreso a sesiones", status: "available" },
      { label: "Citas agendadas", value: "1,540", note: "agenda DEMO", status: "available" },
      { label: "Citas atendidas", value: "1,320", note: "81.2% conversion", status: "warning" },
      { label: "No-show", value: "98", note: "impacta continuidad", status: "warning" },
      { label: "Planes activos", value: "412", note: "tratamientos vigentes", status: "available" },
      { label: "Riesgo abandono", value: "36", note: "fuera de frecuencia", status: "warning" },
    ],
    trendChart: {
      title: "Agenda, sesiones y continuidad",
      description:
        "Compara la demanda agendada contra atencion real y continuidad terapeutica.",
      xLabels: monthlyLabels,
      yLabel: "Citas",
      series: patientFlowTrendOptions.fisioterapia[0].series,
      insights: patientFlowTrendOptions.fisioterapia[0].insights,
      metricOptions: patientFlowTrendOptions.fisioterapia,
    },
    funnelTitle: "Embudo terapeutico",
    funnel: [
      { label: "Solicitud", value: "1,740", conversion: "100%", note: "demanda inicial", status: "available" },
      { label: "Cita", value: "1,540", conversion: "88.5%", note: "agenda creada", status: "available" },
      { label: "Evaluacion", value: "286", conversion: "18.6%", note: "evaluaciones iniciales", status: "available" },
      { label: "Plan", value: "412", conversion: "Activo", note: "planes iniciados/activos", status: "available" },
      { label: "Sesiones", value: "2,840", conversion: "81%", note: "sesiones realizadas", status: "warning" },
      { label: "Alta", value: "214", conversion: "52%", note: "alta terapeutica", status: "warning" },
    ],
    filters: {
      serviceLabel: "Servicio / especialidad",
      professionalLabel: "Fisioterapeuta",
      serviceOptions: ["Todos los servicios", "Evaluacion", "Sesion individual", "Paquete terapeutico", "Rehabilitacion", "Especialidad DEMO"],
      professionalOptions: ["Todos los fisioterapeutas", "Lic. Fisioterapia A", "Lic. Fisioterapia B", "Lic. Fisioterapia C", "Gerente clinico"],
      ...defaultFilterOptions,
    },
    branchRows: [
      { branch: "Fisioterapia Norte", manager: "Gerente Norte", patients: "1,180", recurrence: "67%", conversion: "84%", waitTime: "3.1 dias", lostDemand: "148 citas", benchmark: "+3 pts red", alert: "Buen retorno, vigilar no-show" },
      { branch: "Fisioterapia Centro", manager: "Gerente Centro", patients: "980", recurrence: "58%", conversion: "76%", waitTime: "4.2 dias", lostDemand: "182 citas", benchmark: "-6 pts red", alert: "Menor frecuencia semanal y abandono temprano" },
      { branch: "Fisioterapia Sur", manager: "Gerente Sur", patients: "910", recurrence: "63%", conversion: "82%", waitTime: "3.6 dias", lostDemand: "155 citas", benchmark: "-1 pt red", alert: "Recuperar agenda con lista de espera" },
    ],
    blocks: [
      {
        title: "A. Pacientes",
        description:
          "Nuevos, activos, recurrentes, reactivados, altas, abandono, riesgo y dias desde ultima sesion.",
        metrics: [
          { label: "Pacientes reactivados", value: "72", note: "regresaron al plan", status: "available" },
          { label: "Pacientes dados de alta", value: "214", note: "alta terapeutica", status: "available" },
          { label: "Pacientes abandonados", value: "64", note: "sin continuidad", status: "warning" },
          { label: "Dias desde ultima sesion", value: "5.6", note: "promedio", status: "available" },
          { label: "Sesiones por paciente", value: "2.4", note: "promedio DEMO", status: "warning" },
          { label: "Reingresos despues del alta", value: "19", note: "seguimiento", status: "warning" },
        ],
      },
      {
        title: "B. Agenda y continuidad",
        description:
          "Solicitudes, citas, no-show, recuperacion por lista de espera, planes, sesiones indicadas y cumplimiento.",
        metrics: [
          { label: "Citas confirmadas", value: "1,392", note: "90% confirmacion", status: "available" },
          { label: "Cancelaciones", value: "74", note: "requieren motivo", status: "warning" },
          { label: "Reprogramaciones", value: "48", note: "movimientos de agenda", status: "available" },
          { label: "Recuperadas por lista espera", value: "31", note: "agenda recuperada", status: "available" },
          { label: "Sesiones pendientes", value: "664", note: "planes incompletos", status: "warning" },
          { label: "Fuera de frecuencia", value: "36", note: "riesgo abandono", status: "warning" },
        ],
      },
    ],
  },
  imagenes: {
    slug: "imagenes",
    title: "Demanda, agenda y realizacion de estudios",
    subtitle: "Solicitudes, equipos, estudios, informes y entrega",
    description:
      "Analiza solicitudes y agenda junto con disponibilidad de equipos, realizacion de estudios, informes, entrega y demanda no atendida.",
    primaryMetrics: [
      { label: "Pacientes unicos", value: "3,430", note: "pacientes imagenes", status: "available" },
      { label: "Recurrencia", value: "31%", note: "frecuencia diagnostica menor", status: "warning" },
      { label: "Solicitudes recibidas", value: "760", note: "demanda inicial", status: "available" },
      { label: "Estudios agendados", value: "668", note: "88% conversion", status: "available" },
      { label: "Estudios realizados", value: "521", note: "86.5% flujo", status: "warning" },
      { label: "Informes pendientes", value: "38", note: "backlog informe", status: "warning" },
      { label: "Proxima cita", value: "3.8 dias", note: "promedio", status: "warning" },
      { label: "Demanda no atendida", value: "196 pacientes", note: "lista espera/cancelacion", status: "warning" },
    ],
    trendChart: {
      title: "Solicitudes, estudios e informes",
      description:
        "Compara demanda diagnostica y realizacion de estudios contra el periodo elegido.",
      xLabels: monthlyLabels,
      yLabel: "Solicitudes",
      series: patientFlowTrendOptions.imagenes[0].series,
      insights: patientFlowTrendOptions.imagenes[0].insights,
      metricOptions: patientFlowTrendOptions.imagenes,
    },
    funnelTitle: "Embudo diagnostico",
    funnel: [
      { label: "Solicitud", value: "760", conversion: "100%", note: "demanda recibida", status: "available" },
      { label: "Agenda", value: "668", conversion: "87.9%", note: "estudio agendado", status: "available" },
      { label: "Estudio", value: "521", conversion: "78.0%", note: "estudio realizado", status: "warning" },
      { label: "Informe", value: "483", conversion: "92.7%", note: "estudio informado", status: "available" },
      { label: "Entrega", value: "460", conversion: "95.2%", note: "entrega al paciente", status: "available" },
      { label: "Facturacion", value: "$68K", conversion: "Estimado", note: "venta asociada", status: "available" },
      { label: "Cobro", value: "$60K", conversion: "88%", note: "cobro DEMO", status: "warning" },
    ],
    filters: {
      serviceLabel: "Modalidad / equipo",
      professionalLabel: "Tecnico / radiologo",
      serviceOptions: ["Todas las modalidades", "Rayos X", "Ultrasonido", "Tomografia", "Estudio con contraste", "Equipo DEMO"],
      professionalOptions: ["Todos los tecnicos", "Tecnico Rayos X", "Radiologo", "Medico referidor", "Equipo disponible"],
      ...defaultFilterOptions,
    },
    branchRows: [
      { branch: "Imagenes Santa Tecla", manager: "Gerente Santa Tecla", patients: "1,080", recurrence: "33%", conversion: "84%", waitTime: "4.8 dias", lostDemand: "88 pacientes", benchmark: "-2 pts red", alert: "Lista de espera en tomografia" },
      { branch: "Imagenes Centro", manager: "Gerente Centro", patients: "940", recurrence: "30%", conversion: "88%", waitTime: "3.6 dias", lostDemand: "52 pacientes", benchmark: "+2 pts red", alert: "Buen flujo, vigilar informes" },
      { branch: "Imagenes Este", manager: "Gerente Este", patients: "760", recurrence: "28%", conversion: "81%", waitTime: "3.9 dias", lostDemand: "56 pacientes", benchmark: "-5 pts red", alert: "Utilizacion baja y oportunidad de redistribucion" },
    ],
    blocks: [
      {
        title: "A. Pacientes y solicitud",
        description:
          "Pacientes unicos, nuevos, recurrentes, estudios por paciente, frecuencia, referidores y convenios.",
        metrics: [
          { label: "Pacientes nuevos", value: "2,366", note: "69% del flujo", status: "available" },
          { label: "Pacientes recurrentes", value: "1,064", note: "31% recurrencia", status: "warning" },
          { label: "Estudios por paciente", value: "1.2", note: "promedio DEMO", status: "calculated" },
          { label: "Multiples modalidades", value: "8%", note: "pacientes multi-modalidad", status: "calculated" },
          { label: "Autorizaciones pendientes", value: "24", note: "riesgo flujo", status: "warning" },
          { label: "Preparaciones incompletas", value: "18", note: "causa de perdida", status: "warning" },
        ],
      },
      {
        title: "B. Realizacion e informes",
        description:
          "Estudios realizados, informados, entregados, SLA, repeticiones, cancelaciones por equipo y modalidad.",
        metrics: [
          { label: "Estudios informados", value: "483", note: "92.7% de realizados", status: "available" },
          { label: "Informes entregados", value: "460", note: "entrega DEMO", status: "available" },
          { label: "Tiempo de informe", value: "Datos pendientes de conexion", note: "requiere RIS/PACS", status: "not-connected" },
          { label: "Dentro de SLA", value: "Pendiente", note: "SLA por modalidad", status: "pending-upload" },
          { label: "Repeticiones", value: "18", note: "calidad tecnica", status: "warning" },
          { label: "Cancelaciones por equipo", value: "$2.1K", note: "impacto financiero", status: "warning" },
        ],
      },
    ],
  },
};

export function getPatientFlowDemandScreen(slug: BusinessLineSlug) {
  return patientFlowDemandScreens[slug];
}
