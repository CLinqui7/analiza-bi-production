import type { TrendChartOption, TrendInsight, TrendSeries } from "@/components/analytics-comparison-chart";
import type { BusinessLineSlug } from "@/lib/analytics/business-line-operations";
import type { GlobalFilterInput } from "@/lib/analytics/global-filters";
import {
  formatSemanticPercent,
  getExecutiveBiSnapshot,
  semanticMessages,
  type SemanticLine,
} from "@/lib/analytics/semantic-bi";

export type CapacityMetricStatus =
  | "available"
  | "warning"
  | "critical"
  | "pending-upload"
  | "not-connected"
  | "incomplete"
  | "calculated";

export type CapacityMetric = {
  label: string;
  value: string;
  note: string;
  status: CapacityMetricStatus;
};

export type CapacityBlock = {
  title: string;
  description: string;
  metrics: CapacityMetric[];
};

export type CapacityUtilizationRow = {
  name: string;
  branch: string;
  unit: string;
  available: number;
  planned: number;
  used: number;
  successRate: number;
  targetRate: number;
  lostCapacity: string;
  mainCause: string;
  financialImpact: string;
  recommendation: string;
};

export type CapacityComparisonRow = {
  line: string;
  unit: string;
  available: string;
  planned: string;
  used: string;
  successRate: string;
  status: string;
  insight: string;
};

export type CapacityBranchRow = {
  branch: string;
  manager: string;
  available: string;
  planned: string;
  effective: string;
  successRate: string;
  targetGap: string;
  waitlist: string;
  lostCapacity: string;
  mainCause: string;
  lostIncome: string;
  projection: string;
  recommendation: string;
};

export type CapacityFilterSet = {
  serviceLabel: string;
  resourceLabel: string;
  serviceOptions: string[];
  resourceOptions: string[];
  channelOptions: string[];
  payerOptions: string[];
  dayOptions: string[];
  timeSlotOptions: string[];
  attentionStateOptions: string[];
  capacityTypeOptions: string[];
};

export type CapacityTrendChart = {
  title: string;
  description: string;
  xLabels: string[];
  yLabel: string;
  series: TrendSeries[];
  insights: TrendInsight[];
  metricOptions: TrendChartOption[];
};

export type CapacityOccupancyScreen = {
  slug: BusinessLineSlug;
  title: string;
  subtitle: string;
  description: string;
  primaryMetrics: CapacityMetric[];
  trendChart: CapacityTrendChart;
  mainChartTitle: string;
  mainChartDescription: string;
  utilizationRows: CapacityUtilizationRow[];
  filters: CapacityFilterSet;
  blocks: CapacityBlock[];
  branchRows: CapacityBranchRow[];
  comparisonRows?: CapacityComparisonRow[];
  executiveActions: string[];
  noDataReason?: string;
};

const monthlyLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul"];

const defaultCapacityFilters = {
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
  dayOptions: [
    "Todos los dias",
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
    "Domingo",
  ],
  timeSlotOptions: [
    "Todas las franjas",
    "06:00-09:00",
    "09:00-12:00",
    "12:00-15:00",
    "15:00-18:00",
    "18:00-20:00",
  ],
  attentionStateOptions: [
    "Todos los estados",
    "Planificada",
    "Confirmada",
    "Efectiva",
    "Exitosa",
    "Cancelada",
    "No-show",
    "Repetida o rechazada",
    "Interrumpida",
  ],
  capacityTypeOptions: [
    "Todas las capacidades",
    "Disponible",
    "Agendada o planificada",
    "Efectiva",
    "Exitosa",
    "Perdida",
    "Recuperada",
  ],
};

const capacityComparisonRows: CapacityComparisonRow[] = [
  {
    line: "Laboratorio",
    unit: "Pruebas / horas de analizador",
    available: "45,000",
    planned: "38,000",
    used: "35,640",
    successRate: "94.8%",
    status: "Verde",
    insight:
      "Quimica esta cerca de saturacion y debe vigilar repeticiones y resultados fuera de SLA antes de subir demanda.",
  },
  {
    line: "Fisioterapia",
    unit: "Horas clinicas / sesiones",
    available: "9,200",
    planned: "7,670",
    used: "6,826",
    successRate: "81.2%",
    status: "Amarillo",
    insight:
      "Centro tiene agenda alta, pero pierde conversion por no-show y cancelaciones tardias.",
  },
  {
    line: "Imagenes",
    unit: "Horas de equipo / estudios",
    available: "6,500",
    planned: "5,480",
    used: "5,075",
    successRate: "86.5%",
    status: "Rojo",
    insight:
      "Santa Tecla tiene lista de espera y alta utilizacion, mientras otro equipo equivalente opera al 61%.",
  },
];

const capacityTrendOptions: Record<BusinessLineSlug, TrendChartOption[]> = {
  consolidado: [
    {
      id: "indice-normalizado-utilizacion",
      label: "Indice normalizado de utilizacion",
      description:
        "Compara utilizacion normalizada por linea sin sumar horas clinicas, pruebas y horas de equipo.",
      yLabel: "% utilizacion",
      series: [
        { label: "2026 utilizacion", value: "82%", color: "blue", points: [74, 76, 78, 79, 81, 82, 82] },
        { label: "2025 utilizacion", value: "76%", color: "orange", points: [68, 70, 72, 73, 75, 76, 76] },
        { label: "Meta", value: "88%", color: "teal", points: [82, 83, 84, 85, 86, 88, 88] },
      ],
      insights: [
        { label: "Vs 2025", value: "+6 pts", note: "La red usa mejor su capacidad que el ano anterior.", tone: "positive" },
        { label: "Brecha meta", value: "-6 pts", note: "La brecha se concentra en capacidad perdida y no en falta de recursos.", tone: "warning" },
        { label: "Decision", value: "No comprar aun", note: "Primero corregir conversion, fallas y redistribucion.", tone: "warning" },
      ],
    },
    {
      id: "atencion-exitosa",
      label: "Atencion exitosa",
      description:
        "Mide cuanto de la carga planificada termina correctamente sin cancelacion, rechazo, repeticion o interrupcion.",
      yLabel: "% exito",
      series: [
        { label: "2026 exito", value: "87%", color: "blue", points: [80, 82, 84, 85, 86, 87, 87] },
        { label: "2025 exito", value: "83%", color: "orange", points: [77, 78, 80, 81, 82, 83, 83] },
        { label: "Meta", value: "92%", color: "teal", points: [88, 89, 90, 90, 91, 92, 92] },
      ],
      insights: [
        { label: "Calidad de capacidad", value: "+4 pts", note: "Mejora el cierre exitoso de servicios.", tone: "positive" },
        { label: "Brecha", value: "-5 pts", note: "Alta ocupacion con bajo exito debe corregirse antes de ampliar capacidad.", tone: "warning" },
        { label: "Foco", value: "Causa perdida", note: "Separar no-show, rechazos, fallas, falta de insumos y repeticiones.", tone: "warning" },
      ],
    },
    {
      id: "capacidad-perdida",
      label: "Capacidad perdida",
      description:
        "Compara recursos disponibles que no se convirtieron en atencion, procesamiento o estudio exitoso.",
      yLabel: "Unidades normalizadas",
      series: [
        { label: "2026 perdida", value: "18%", color: "rose", points: [26, 24, 22, 21, 19, 18, 18] },
        { label: "2025 perdida", value: "24%", color: "orange", points: [32, 30, 28, 27, 25, 24, 24] },
        { label: "Meta", value: "10%", color: "teal", points: [16, 15, 14, 13, 12, 10, 10] },
      ],
      insights: [
        { label: "Mejora", value: "-6 pts", note: "Se pierde menos capacidad que el ano anterior.", tone: "positive" },
        { label: "Meta", value: "+8 pts", note: "La capacidad perdida aun genera ingreso perdido y lista de espera.", tone: "warning" },
        { label: "Accion", value: "Waterfall", note: "Ver disponible -> agendada -> cancelaciones -> fallas -> exito.", tone: "neutral" },
      ],
    },
    {
      id: "brecha-agendada-efectiva",
      label: "Brecha agendada vs efectiva",
      description:
        "Mide diferencia entre estar lleno en agenda y realmente producir o atender.",
      yLabel: "Puntos de brecha",
      series: [
        { label: "2026 brecha", value: "9 pts", color: "rose", points: [14, 13, 12, 11, 10, 9, 9] },
        { label: "2025 brecha", value: "13 pts", color: "orange", points: [18, 17, 16, 15, 14, 13, 13] },
        { label: "Meta", value: "5 pts", color: "teal", points: [9, 8, 8, 7, 6, 5, 5] },
      ],
      insights: [
        { label: "Conversion", value: "-4 pts", note: "La brecha baja, pero sigue escondiendo capacidad sin producir.", tone: "positive" },
        { label: "Riesgo", value: "+4 pts", note: "La agenda puede verse llena sin generar atencion exitosa.", tone: "warning" },
        { label: "Decision", value: "Cerrar brecha", note: "No aumentar recursos sin recuperar ocupacion efectiva.", tone: "warning" },
      ],
    },
  ],
  fisioterapia: [
    {
      id: "ocupacion-efectiva-fisio",
      label: "Ocupacion efectiva",
      description:
        "Compara horas atendidas contra horas clinicas disponibles para ver aprovechamiento real de agenda.",
      yLabel: "% ocupacion",
      series: [
        { label: "2026 efectiva", value: "69%", color: "blue", points: [61, 63, 65, 66, 68, 69, 69] },
        { label: "2025 efectiva", value: "63%", color: "orange", points: [56, 58, 59, 60, 62, 63, 63] },
        { label: "Meta", value: "82%", color: "teal", points: [74, 76, 78, 79, 81, 82, 82] },
      ],
      insights: [
        { label: "Mejora", value: "+6 pts", note: "La atencion real mejora contra 2025.", tone: "positive" },
        { label: "Brecha", value: "-13 pts", note: "La agenda alta no se convierte completamente en sesiones.", tone: "warning" },
        { label: "Causa", value: "No-show", note: "Centro pierde 58% de la brecha por no-show y cancelacion tardia.", tone: "warning" },
      ],
    },
    {
      id: "ocupacion-agendada-fisio",
      label: "Ocupacion agendada",
      description:
        "Mide agenda reservada contra horas clinicas disponibles.",
      yLabel: "% agenda",
      series: [
        { label: "2026 agendada", value: "88%", color: "blue", points: [78, 80, 83, 85, 87, 88, 88] },
        { label: "2025 agendada", value: "81%", color: "orange", points: [72, 75, 77, 78, 80, 81, 81] },
        { label: "Meta", value: "86%", color: "teal", points: [80, 82, 83, 84, 85, 86, 86] },
      ],
      insights: [
        { label: "Agenda", value: "+2 pts", note: "La agenda supera meta, pero debe convertirse en atencion real.", tone: "positive" },
        { label: "Brecha", value: "19 pts", note: "Alta agenda y baja atencion real senala perdida operativa.", tone: "warning" },
        { label: "Decision", value: "No mas agenda", note: "Primero recuperar citas y reducir ausencias.", tone: "warning" },
      ],
    },
    {
      id: "capacidad-recuperada-fisio",
      label: "Capacidad recuperada",
      description:
        "Mide espacios recuperados mediante lista de espera o reacomodo despues de cancelaciones.",
      yLabel: "% recuperacion",
      series: [
        { label: "2026 recuperacion", value: "32%", color: "blue", points: [18, 21, 24, 26, 29, 32, 32] },
        { label: "2025 recuperacion", value: "21%", color: "orange", points: [12, 14, 16, 18, 20, 21, 21] },
        { label: "Meta", value: "45%", color: "teal", points: [28, 32, 36, 39, 42, 45, 45] },
      ],
      insights: [
        { label: "Recuperacion", value: "+11 pts", note: "La lista de espera recupera mas capacidad que 2025.", tone: "positive" },
        { label: "Brecha", value: "-13 pts", note: "Aun quedan espacios liberados sin uso.", tone: "warning" },
        { label: "Accion", value: "Lista espera", note: "Automatizar recuperacion por horario y profesional.", tone: "positive" },
      ],
    },
    {
      id: "ingreso-perdido-fisio-capacidad",
      label: "Ingreso perdido",
      description:
        "Estima ingreso perdido por horas o sesiones no utilizadas.",
      yLabel: "USD miles",
      series: [
        { label: "2026 perdido", value: "$11.3K", color: "rose", points: [14.8, 14.0, 13.4, 12.7, 12.0, 11.3, 11.3] },
        { label: "2025 perdido", value: "$15.9K", color: "orange", points: [18.0, 17.4, 16.9, 16.4, 16.1, 15.9, 15.9] },
        { label: "Meta", value: "$6K", color: "teal", points: [10, 9, 8, 7, 6.5, 6, 6] },
      ],
      insights: [
        { label: "Mejora", value: "-$4.6K", note: "La perdida baja, pero sigue siendo accionable.", tone: "positive" },
        { label: "Brecha", value: "+$5.3K", note: "Las ausencias generan perdida financiera fuera de esta pantalla.", tone: "warning" },
        { label: "Regla", value: "Finanzas", note: "Aqui se mide la capacidad perdida; en finanzas se mide margen perdido.", tone: "neutral" },
      ],
    },
  ],
  laboratorio: [
    {
      id: "utilizacion-tecnica-lab",
      label: "Utilizacion tecnica",
      description:
        "Compara pruebas procesadas contra capacidad tecnica disponible por analizador, area o sucursal.",
      yLabel: "% utilizacion",
      series: [
        { label: "2026 utilizacion", value: "79%", color: "blue", points: [70, 72, 74, 76, 78, 79, 79] },
        { label: "2025 utilizacion", value: "72%", color: "orange", points: [63, 65, 67, 69, 71, 72, 72] },
        { label: "Meta", value: "85%", color: "teal", points: [78, 80, 82, 83, 84, 85, 85] },
      ],
      insights: [
        { label: "Mejora", value: "+7 pts", note: "El procesamiento usa mejor la capacidad tecnica.", tone: "positive" },
        { label: "Brecha", value: "-6 pts", note: "Algunas areas estan saturadas y otras subutilizadas.", tone: "warning" },
        { label: "Decision", value: "Redistribuir", note: "Revisar turnos, analizadores y cola de muestras.", tone: "warning" },
      ],
    },
    {
      id: "procesamiento-exitoso-lab",
      label: "Procesamiento exitoso",
      description:
        "Mide pruebas validadas sin repeticion contra pruebas procesadas.",
      yLabel: "% exitoso",
      series: [
        { label: "2026 exito", value: "94.8%", color: "blue", points: [96, 96, 95, 95, 95, 95, 95] },
        { label: "2025 exito", value: "96.1%", color: "orange", points: [97, 97, 96, 96, 96, 96, 96] },
        { label: "Meta", value: "97%", color: "teal", points: [97, 97, 97, 97, 97, 97, 97] },
      ],
      insights: [
        { label: "Calidad", value: "-1.3 pts", note: "El exito cae aunque la utilizacion sube.", tone: "warning" },
        { label: "Saturacion", value: "Quimica 96%", note: "Alta carga puede explicar repeticiones y SLA fuera de tiempo.", tone: "warning" },
        { label: "Accion", value: "Balancear carga", note: "Mover demanda antes de ampliar capacidad.", tone: "neutral" },
      ],
    },
    {
      id: "cola-muestras-lab",
      label: "Cola de muestras",
      description:
        "Mide muestras entrantes, procesadas y acumuladas para detectar saturacion.",
      yLabel: "Muestras",
      series: [
        { label: "2026 cola", value: "212", color: "rose", points: [286, 264, 248, 236, 224, 212, 212] },
        { label: "2025 cola", value: "260", color: "orange", points: [340, 318, 302, 286, 274, 260, 260] },
        { label: "Meta", value: "120", color: "teal", points: [190, 175, 160, 145, 132, 120, 120] },
      ],
      insights: [
        { label: "Mejora", value: "-18%", note: "La cola baja contra 2025.", tone: "positive" },
        { label: "Brecha", value: "+92", note: "Aun afecta tiempo de entrega y validacion.", tone: "warning" },
        { label: "Fuente", value: "LIS/API", note: "La cola real requiere trazabilidad de muestra.", tone: "neutral" },
      ],
    },
    {
      id: "equipo-detenido-lab",
      label: "Equipo detenido",
      description:
        "Mide tiempo fuera de servicio y mantenimiento que reduce capacidad tecnica.",
      yLabel: "Horas",
      series: [
        { label: "2026 detenido", value: "34 h", color: "rose", points: [46, 43, 41, 39, 36, 34, 34] },
        { label: "2025 detenido", value: "48 h", color: "orange", points: [60, 56, 53, 51, 50, 48, 48] },
        { label: "Meta", value: "18 h", color: "teal", points: [30, 28, 25, 22, 20, 18, 18] },
      ],
      insights: [
        { label: "Mejora", value: "-14 h", note: "Menos tiempo detenido que 2025.", tone: "positive" },
        { label: "Meta", value: "+16 h", note: "Mantenimiento y fallas aun comen capacidad productiva.", tone: "warning" },
        { label: "Accion", value: "Preventivo", note: "Separar mantenimiento programado y correctivo.", tone: "warning" },
      ],
    },
  ],
  imagenes: [
    {
      id: "utilizacion-real-imagenes",
      label: "Utilizacion real",
      description:
        "Compara horas efectivas de estudio contra horas operativas disponibles de equipo.",
      yLabel: "% utilizacion",
      series: [
        { label: "2026 utilizacion", value: "78%", color: "blue", points: [68, 70, 72, 74, 76, 78, 78] },
        { label: "2025 utilizacion", value: "71%", color: "orange", points: [62, 64, 66, 68, 70, 71, 71] },
        { label: "Meta", value: "84%", color: "teal", points: [78, 80, 81, 82, 83, 84, 84] },
      ],
      insights: [
        { label: "Uso real", value: "+7 pts", note: "Los equipos se usan mas que en 2025.", tone: "positive" },
        { label: "Brecha", value: "-6 pts", note: "Hay diferencia fuerte entre equipos equivalentes.", tone: "warning" },
        { label: "Decision", value: "Redistribuir", note: "Redistribuir pacientes antes de comprar nueva capacidad.", tone: "warning" },
      ],
    },
    {
      id: "estudios-exitosos-imagenes",
      label: "Estudios exitosos",
      description:
        "Mide estudios completados sin repeticion contra estudios agendados.",
      yLabel: "% exitoso",
      series: [
        { label: "2026 exito", value: "86.5%", color: "blue", points: [80, 82, 84, 85, 86, 87, 87] },
        { label: "2025 exito", value: "83%", color: "orange", points: [76, 78, 79, 81, 82, 83, 83] },
        { label: "Meta", value: "91%", color: "teal", points: [86, 87, 88, 89, 90, 91, 91] },
      ],
      insights: [
        { label: "Finalizacion", value: "+3.5 pts", note: "Mejor finalizacion que 2025.", tone: "positive" },
        { label: "Brecha", value: "-4.5 pts", note: "Preparacion incompleta, fallas o repeticion reducen el exito.", tone: "warning" },
        { label: "Fuente", value: "RIS/PACS", note: "Informes dentro de SLA completan la lectura real.", tone: "neutral" },
      ],
    },
    {
      id: "lista-espera-imagenes",
      label: "Lista de espera",
      description:
        "Mide dias de espera por modalidad y sucursal para detectar saturacion y redistribucion.",
      yLabel: "Dias",
      series: [
        { label: "2026 espera", value: "4.8", color: "rose", points: [3.6, 3.8, 4.1, 4.3, 4.6, 4.8, 4.8] },
        { label: "2025 espera", value: "4.1", color: "orange", points: [3.2, 3.4, 3.6, 3.8, 4.0, 4.1, 4.1] },
        { label: "Meta", value: "2.5", color: "teal", points: [3.2, 3.0, 2.9, 2.8, 2.6, 2.5, 2.5] },
      ],
      insights: [
        { label: "Saturacion", value: "+0.7 dias", note: "La espera sube contra 2025 en tomografia.", tone: "warning" },
        { label: "Brecha", value: "+2.3 dias", note: "Santa Tecla requiere redistribucion o agenda extendida.", tone: "warning" },
        { label: "Accion", value: "Equipo equivalente", note: "Otra sede opera al 61% de utilizacion.", tone: "positive" },
      ],
    },
    {
      id: "capacidad-perdida-imagenes",
      label: "Capacidad perdida",
      description:
        "Mide horas perdidas por cancelacion, no-show, preparacion incompleta, mantenimiento e insumos.",
      yLabel: "Horas",
      series: [
        { label: "2026 perdida", value: "186 h", color: "rose", points: [238, 226, 214, 204, 194, 186, 186] },
        { label: "2025 perdida", value: "220 h", color: "orange", points: [280, 266, 250, 238, 228, 220, 220] },
        { label: "Meta", value: "110 h", color: "teal", points: [170, 158, 145, 132, 120, 110, 110] },
      ],
      insights: [
        { label: "Mejora", value: "-34 h", note: "La capacidad perdida baja contra 2025.", tone: "positive" },
        { label: "Meta", value: "+76 h", note: "Aun hay horas recuperables por agenda, preparacion y equipo.", tone: "warning" },
        { label: "Decision", value: "Causas", note: "Pareto de fallas, autorizacion y preparacion indica la primera accion.", tone: "warning" },
      ],
    },
  ],
};

export const capacityOccupancyScreens: Record<
  BusinessLineSlug,
  CapacityOccupancyScreen
> = {
  consolidado: {
    slug: "consolidado",
    title: "Capacidad y ocupacion",
    subtitle: "Estar lleno no significa ser productivo",
    description:
      "Compara capacidad disponible, ocupacion planificada, ocupacion efectiva y atencion exitosa por linea sin sumar unidades incompatibles.",
    primaryMetrics: [
      { label: "Indice normalizado", value: "82%", note: "utilizacion por linea", status: "calculated" },
      { label: "Capacidad disponible", value: "100%", note: "base normalizada por linea", status: "calculated" },
      { label: "Capacidad planificada", value: "84%", note: "agenda o carga asignada", status: "available" },
      { label: "Ocupacion efectiva", value: "75%", note: "produccion real", status: "warning" },
      { label: "Atencion exitosa", value: "87%", note: "sin cancelacion, rechazo o repeticion", status: "warning" },
      { label: "Brecha agenda/efectiva", value: "9 pts", note: "capacidad que parecia llena", status: "warning" },
      { label: "Capacidad perdida", value: "18%", note: "no-show, fallas, insumos o personal", status: "warning" },
      { label: "Ingreso perdido", value: "$42.8K", note: "estimado DEMO", status: "calculated" },
    ],
    trendChart: {
      title: "Ocupacion, exito y capacidad perdida",
      description:
        "Compara capacidad normalizada contra periodo anterior, mismo periodo del ano anterior o meta.",
      xLabels: monthlyLabels,
      yLabel: "% utilizacion",
      series: capacityTrendOptions.consolidado[0].series,
      insights: capacityTrendOptions.consolidado[0].insights,
      metricOptions: capacityTrendOptions.consolidado,
    },
    mainChartTitle: "Atencion exitosa actual versus ocupacion",
    mainChartDescription:
      "Barras: disponible, planificada y utilizada. Lineas: atencion exitosa y meta de ocupacion.",
    utilizationRows: [
      { name: "Laboratorio", branch: "Red SV", unit: "Pruebas", available: 100, planned: 84, used: 79, successRate: 94.8, targetRate: 85, lostCapacity: "9,360 pruebas", mainCause: "Cola y validacion pendiente", financialImpact: "$18.2K", recommendation: "Redistribuir procesamiento por area tecnica" },
      { name: "Fisioterapia", branch: "Red SV", unit: "Horas clinicas", available: 100, planned: 83, used: 74, successRate: 81.2, targetRate: 82, lostCapacity: "2,374 h", mainCause: "No-show y cancelacion tardia", financialImpact: "$11.3K", recommendation: "Recuperar agenda antes de sumar profesionales" },
      { name: "Imagenes", branch: "Red SV", unit: "Horas equipo", available: 100, planned: 84, used: 78, successRate: 86.5, targetRate: 84, lostCapacity: "1,425 h", mainCause: "Lista de espera desigual y fallas", financialImpact: "$13.3K", recommendation: "Redistribuir pacientes entre equipos equivalentes" },
    ],
    filters: {
      serviceLabel: "Linea / servicio",
      resourceLabel: "Recurso",
      serviceOptions: ["Todas las lineas", "Laboratorio", "Fisioterapia", "Imagenes"],
      resourceOptions: ["Todos los recursos", "Sucursal", "Gerente", "Profesional", "Equipo", "Dia y hora"],
      ...defaultCapacityFilters,
    },
    comparisonRows: capacityComparisonRows,
    branchRows: [
      { branch: "Aguilares", manager: "Gerente Aguilares", available: "100%", planned: "82%", effective: "75%", successRate: "91%", targetGap: "-7 pts", waitlist: "28", lostCapacity: "310 unidades", mainCause: "Baja recurrencia / horarios", lostIncome: "$5.8K", projection: "Subutilizacion si no sube demanda", recommendation: "Aumentar referidos y horarios pico" },
      { branch: "Centro", manager: "Gerente Centro", available: "100%", planned: "88%", effective: "69%", successRate: "81%", targetGap: "-13 pts", waitlist: "42", lostCapacity: "486 unidades", mainCause: "No-show y cancelacion tardia", lostIncome: "$11.3K", projection: "Saturacion aparente, perdida real", recommendation: "Corregir conversion antes de ampliar agenda" },
      { branch: "Santa Tecla", manager: "Gerente Santa Tecla", available: "100%", planned: "94%", effective: "86%", successRate: "87%", targetGap: "+2 pts", waitlist: "4.8 dias", lostCapacity: "186 h", mainCause: "Lista de espera y redistribucion", lostIncome: "$13.3K", projection: "Saturacion en modalidad especifica", recommendation: "Mover pacientes a equipo equivalente disponible" },
    ],
    blocks: [
      {
        title: "A. Lectura ejecutiva",
        description:
          "Diferencia entre capacidad disponible, planificada, efectiva y atencion exitosa.",
        metrics: [
          { label: "Sucursales saturadas", value: "3", note: "alta ocupacion y lista de espera", status: "warning" },
          { label: "Sucursales subutilizadas", value: "4", note: "capacidad comercial disponible", status: "warning" },
          { label: "Capacidad recuperada", value: "32%", note: "espacios recuperados", status: "available" },
          { label: "Demanda no atendida", value: "1,063", note: "del flujo de pacientes", status: "warning" },
          { label: "Proyeccion 8 semanas", value: "2 saturadas", note: "si sigue tendencia", status: "calculated" },
          { label: "Principal causa perdida", value: "Conversion", note: "agenda no se vuelve atencion", status: "warning" },
        ],
      },
      {
        title: "B. Graficos recomendados",
        description:
          "Vistas que deben existir para diagnosticar saturacion, subutilizacion y capacidad perdida.",
        metrics: [
          { label: "Matriz ocupacion vs exito", value: "Por sucursal", note: "tamano por ingreso", status: "calculated" },
          { label: "Heatmap dia/hora", value: "Disponible", note: "agendada, efectiva, exito y perdida", status: "available" },
          { label: "Waterfall capacidad", value: "Activo", note: "total -> fallas -> exito", status: "calculated" },
          { label: "Pareto de causas", value: "No-show / fallas", note: "perdida de capacidad", status: "available" },
          { label: "Actual vs meta", value: "Incluido", note: "tambien ano anterior y periodo anterior", status: "available" },
          { label: "Proyeccion", value: "4, 8 y 12 semanas", note: "saturacion u ociosidad", status: "calculated" },
        ],
      },
    ],
    executiveActions: [
      "Alta ocupacion + alta atencion exitosa: proteger operacion y evaluar expansion si hay lista de espera.",
      "Alta ocupacion + baja atencion exitosa: corregir proceso antes de aumentar capacidad.",
      "Baja ocupacion + alta atencion exitosa: aumentar demanda, referidos o redistribuir pacientes.",
      "Baja ocupacion + baja atencion exitosa: activar plan integral por sucursal.",
    ],
  },
  fisioterapia: {
    slug: "fisioterapia",
    title: "Ocupacion clinica y aprovechamiento de agenda",
    subtitle: "Horas clinicas, agenda, sesiones y conversion real",
    description:
      "Mide capacidad por fisioterapeuta, consultorio, servicio y sucursal; compara agenda llena contra sesiones efectivamente realizadas.",
    primaryMetrics: [
      { label: "Fisioterapeutas activos", value: "24", note: "red DEMO", status: "available" },
      { label: "Horas clinicas disponibles", value: "9,200", note: "periodo seleccionado", status: "available" },
      { label: "Horas agendadas", value: "7,670", note: "88% en Centro", status: "available" },
      { label: "Horas atendidas", value: "6,826", note: "ocupacion efectiva", status: "warning" },
      { label: "Citas exitosas", value: "81.2%", note: "atendidas/agendadas", status: "warning" },
      { label: "Brecha conversion", value: "19 pts", note: "agenda vs efectiva en Centro", status: "warning" },
      { label: "Capacidad recuperada", value: "32%", note: "lista de espera", status: "available" },
      { label: "Ingreso perdido", value: "$11.3K", note: "ausencias y cancelaciones", status: "calculated" },
    ],
    trendChart: {
      title: "Ocupacion clinica y capacidad recuperada",
      description:
        "Compara agenda, ocupacion efectiva, recuperacion e ingreso perdido por capacidad no utilizada.",
      xLabels: monthlyLabels,
      yLabel: "% ocupacion",
      series: capacityTrendOptions.fisioterapia[0].series,
      insights: capacityTrendOptions.fisioterapia[0].insights,
      metricOptions: capacityTrendOptions.fisioterapia,
    },
    mainChartTitle: "Citas exitosas actuales versus ocupacion",
    mainChartDescription:
      "Comparativo por sucursal, fisioterapeuta o servicio con horas disponibles, agendadas, atendidas y exito.",
    utilizationRows: [
      { name: "Fisioterapia Centro", branch: "Centro", unit: "Horas clinicas", available: 100, planned: 88, used: 69, successRate: 78, targetRate: 82, lostCapacity: "486 h", mainCause: "No-show y cancelacion <4h", financialImpact: "$11.3K", recommendation: "No necesita mas profesionales; necesita mejorar conversion" },
      { name: "Fisioterapia Norte", branch: "Norte", unit: "Horas clinicas", available: 100, planned: 84, used: 76, successRate: 84, targetRate: 82, lostCapacity: "248 h", mainCause: "Reprogramacion", financialImpact: "$4.8K", recommendation: "Proteger agenda y recuperar cancelaciones" },
      { name: "Fisioterapia Sur", branch: "Sur", unit: "Horas clinicas", available: 100, planned: 79, used: 72, successRate: 82, targetRate: 82, lostCapacity: "286 h", mainCause: "Espacios libres", financialImpact: "$5.4K", recommendation: "Aumentar demanda en franjas libres" },
    ],
    filters: {
      serviceLabel: "Servicio / especialidad",
      resourceLabel: "Fisioterapeuta / consultorio",
      serviceOptions: ["Todos los servicios", "Evaluacion", "Sesion individual", "Paquete terapeutico", "Rehabilitacion", "Especialidad DEMO"],
      resourceOptions: ["Todos los recursos", "Fisioterapeuta", "Consultorio", "Servicio", "Sucursal", "Dia y hora"],
      ...defaultCapacityFilters,
    },
    branchRows: [
      { branch: "Fisioterapia Centro", manager: "Gerente Centro", available: "100%", planned: "88%", effective: "69%", successRate: "78%", targetGap: "-13 pts", waitlist: "18", lostCapacity: "486 h", mainCause: "No-show y cancelacion tardia", lostIncome: "$11.3K", projection: "Saturacion aparente", recommendation: "Mejorar confirmacion y lista de espera" },
      { branch: "Fisioterapia Norte", manager: "Gerente Norte", available: "100%", planned: "84%", effective: "76%", successRate: "84%", targetGap: "-6 pts", waitlist: "24", lostCapacity: "248 h", mainCause: "Reprogramacion", lostIncome: "$4.8K", projection: "Estable", recommendation: "Recuperar espacios liberados" },
      { branch: "Fisioterapia Sur", manager: "Gerente Sur", available: "100%", planned: "79%", effective: "72%", successRate: "82%", targetGap: "-10 pts", waitlist: "9", lostCapacity: "286 h", mainCause: "Baja demanda vespertina", lostIncome: "$5.4K", projection: "Capacidad comercial disponible", recommendation: "Impulsar demanda y referidos" },
    ],
    blocks: [
      {
        title: "A. Capacidad disponible",
        description:
          "Fisioterapeutas, horas laborales, horas clinicas, consultorios, capacidad maxima y bloqueos.",
        metrics: [
          { label: "Horas laborales disponibles", value: "11,040", note: "incluye administracion", status: "available" },
          { label: "Consultorios disponibles", value: "18", note: "red DEMO", status: "available" },
          { label: "Capacidad maxima sesiones", value: "8,280", note: "ajustada por duracion", status: "calculated" },
          { label: "Horas bloqueadas", value: "420", note: "reuniones, permisos o formacion", status: "warning" },
          { label: "Capacidad por especialidad", value: "Pendiente", note: "catalogo requerido", status: "pending-upload" },
          { label: "Espacios libres", value: "1,530", note: "capacidad no agendada", status: "warning" },
        ],
      },
      {
        title: "B. Perdida y recuperacion",
        description:
          "Horas perdidas por no-show, cancelacion, reprogramacion, ausencia profesional y recuperacion.",
        metrics: [
          { label: "Horas no-show", value: "392 h", note: "principal causa", status: "warning" },
          { label: "Cancelacion tardia", value: "256 h", note: "menos de 4 horas", status: "warning" },
          { label: "Ausencia profesional", value: "38 h", note: "requiere responsable", status: "warning" },
          { label: "Espacios no recuperados", value: "468", note: "oportunidad", status: "warning" },
          { label: "Ingreso recuperado", value: "$3.9K", note: "lista de espera", status: "available" },
          { label: "Planes sin frecuencia", value: "36", note: "riesgo abandono", status: "warning" },
        ],
      },
    ],
    executiveActions: [
      "La sucursal Centro tiene 88% de ocupacion agendada, pero 69% de ocupacion efectiva; 58% de la brecha viene de no-show y cancelaciones tardias.",
      "Centro no necesita mas profesionales si antes no convierte agenda en atencion real.",
      "Recuperar cancelaciones con lista de espera por franja horaria y fisioterapeuta.",
      "Revisar fisioterapeutas por horas disponibles, no solo por volumen atendido.",
      "Proyectar sesiones pendientes de planes activos para anticipar saturacion.",
    ],
  },
  laboratorio: {
    slug: "laboratorio",
    title: "Capacidad tecnica y procesamiento exitoso",
    subtitle: "Pruebas, analizadores, areas tecnicas y calidad",
    description:
      "Mide capacidad de estaciones de toma, flebotomistas, analizadores, areas de procesamiento y validacion; no usa citas como unidad principal.",
    primaryMetrics: [
      { label: "Capacidad maxima pruebas", value: "45,000", note: "periodo seleccionado", status: "available" },
      { label: "Pruebas procesadas", value: "35,640", note: "79% utilizacion", status: "available" },
      { label: "Procesamiento exitoso", value: "94.8%", note: "sin repeticion", status: "warning" },
      { label: "Ordenes por hora", value: "48", note: "promedio DEMO", status: "available" },
      { label: "Cola de muestras", value: "212", note: "pendientes", status: "warning" },
      { label: "Equipos fuera servicio", value: "1", note: "mantenimiento correctivo", status: "warning" },
      { label: "Capacidad perdida", value: "9,360 pruebas", note: "disponible - produccion valida", status: "calculated" },
      { label: "Resultados dentro SLA", value: "Datos pendientes de conexion", note: "requiere LIS/API", status: "not-connected" },
    ],
    trendChart: {
      title: "Utilizacion tecnica y procesamiento exitoso",
      description:
        "Compara capacidad tecnica, calidad, cola y equipo detenido por laboratorio.",
      xLabels: monthlyLabels,
      yLabel: "% utilizacion",
      series: capacityTrendOptions.laboratorio[0].series,
      insights: capacityTrendOptions.laboratorio[0].insights,
      metricOptions: capacityTrendOptions.laboratorio,
    },
    mainChartTitle: "Procesamiento exitoso versus utilizacion",
    mainChartDescription:
      "Comparativo por sucursal, area tecnica o analizador con capacidad maxima, pruebas procesadas, exito y meta.",
    utilizationRows: [
      { name: "Quimica", branch: "Laboratorio Central", unit: "Pruebas", available: 100, planned: 96, used: 96, successRate: 92, targetRate: 97, lostCapacity: "1,140 pruebas", mainCause: "Saturacion y repeticiones", financialImpact: "$7.2K", recommendation: "Balancear carga y turnos antes de crecer volumen" },
      { name: "Hematologia", branch: "Santa Tecla", unit: "Pruebas", available: 100, planned: 86, used: 86, successRate: 98.2, targetRate: 97, lostCapacity: "820 pruebas", mainCause: "Mantenimiento menor", financialImpact: "$3.4K", recommendation: "Proteger mantenimiento preventivo" },
      { name: "Inmunologia", branch: "Aguilares", unit: "Pruebas", available: 100, planned: 51, used: 51, successRate: 96.8, targetRate: 85, lostCapacity: "3,400 pruebas", mainCause: "Baja demanda asignada", financialImpact: "$5.6K", recommendation: "Redistribuir procesamiento desde areas saturadas" },
    ],
    filters: {
      serviceLabel: "Prueba / perfil / area",
      resourceLabel: "Analizador / estacion / tecnico",
      serviceOptions: ["Todas las pruebas", "Quimica", "Hematologia", "Inmunologia", "Microbiologia", "Pruebas tercerizadas"],
      resourceOptions: ["Todos los recursos", "Area tecnica", "Analizador", "Estacion de toma", "Flebotomista", "Turno"],
      ...defaultCapacityFilters,
    },
    branchRows: [
      { branch: "Laboratorio Central", manager: "Gerente Central", available: "100%", planned: "96%", effective: "96%", successRate: "92%", targetGap: "-5 pts exito", waitlist: "212 muestras", lostCapacity: "1,140 pruebas", mainCause: "Saturacion quimica", lostIncome: "$7.2K", projection: "Riesgo SLA alto", recommendation: "Balancear carga con otra area/equipo" },
      { branch: "Santa Tecla", manager: "Gerente Santa Tecla", available: "100%", planned: "86%", effective: "86%", successRate: "98.2%", targetGap: "+1.2 pts", waitlist: "46 muestras", lostCapacity: "820 pruebas", mainCause: "Mantenimiento menor", lostIncome: "$3.4K", projection: "Estable", recommendation: "Proteger mantenimiento preventivo" },
      { branch: "Aguilares", manager: "Gerente Aguilares", available: "100%", planned: "51%", effective: "51%", successRate: "96.8%", targetGap: "+11.8 pts exito", waitlist: "18 muestras", lostCapacity: "3,400 pruebas", mainCause: "Subutilizacion", lostIncome: "$5.6K", projection: "Capacidad disponible", recommendation: "Enviar demanda desde sucursal saturada" },
    ],
    blocks: [
      {
        title: "A. Capacidad tecnica",
        description:
          "Capacidad maxima, analizadores, areas, turnos, equipos, estaciones y validacion.",
        metrics: [
          { label: "Capacidad por analizador", value: "Disponible DEMO", note: "Equipo A/B/C", status: "available" },
          { label: "Capacidad por turno", value: "Pendiente", note: "turnos requeridos", status: "pending-upload" },
          { label: "Estaciones de toma", value: "16", note: "red DEMO", status: "available" },
          { label: "Pacientes por flebotomista", value: "44", note: "promedio dia", status: "available" },
          { label: "Capacidad de validacion", value: "Datos pendientes de conexion", note: "requiere LIS", status: "not-connected" },
          { label: "Horas equipo detenido", value: "34 h", note: "fuera de servicio", status: "warning" },
        ],
      },
      {
        title: "B. Perdida de capacidad",
        description:
          "Fallas, mantenimiento, falta de reactivos, personal, rechazos, repeticiones, transporte y validacion.",
        metrics: [
          { label: "Falta de reactivos", value: "18 h", note: "capacidad perdida", status: "warning" },
          { label: "Muestras rechazadas", value: "38", note: "preanalitica", status: "warning" },
          { label: "Pruebas repetidas", value: "42", note: "impacta calidad y costo", status: "warning" },
          { label: "Recolectas repetidas", value: "17", note: "toma de muestra", status: "warning" },
          { label: "Demora transporte", value: "26 h", note: "rutas", status: "warning" },
          { label: "Validacion pendiente", value: "Datos pendientes de conexion", note: "LIS/API", status: "not-connected" },
        ],
      },
    ],
    executiveActions: [
      "Quimica usa 96% de capacidad, pero procesamiento exitoso cae a 92%; corregir calidad antes de aumentar carga.",
      "Mover procesamiento hacia equipos o areas con capacidad disponible.",
      "Separar mantenimiento programado, correctivo y falta de reactivos para evitar ceros falsos.",
      "Medir utilizacion y SLA juntos; alta ocupacion con baja calidad es una alerta.",
    ],
  },
  imagenes: {
    slug: "imagenes",
    title: "Utilizacion de equipos y estudios exitosos",
    subtitle: "Equipos, salas, tecnicos, radiologos e informes",
    description:
      "Mide horas disponibles de equipos, salas y personal; compara agenda, utilizacion real, estudios exitosos e informes dentro de SLA.",
    primaryMetrics: [
      { label: "Equipos activos", value: "9", note: "red DEMO", status: "available" },
      { label: "Horas operativas", value: "6,500", note: "equipos y salas", status: "available" },
      { label: "Horas programadas", value: "5,480", note: "84% agenda", status: "available" },
      { label: "Horas utilizadas", value: "5,075", note: "78% utilizacion real", status: "warning" },
      { label: "Estudios exitosos", value: "86.5%", note: "sin repeticion", status: "warning" },
      { label: "Lista de espera", value: "4.8 dias", note: "tomografia Santa Tecla", status: "critical" },
      { label: "Capacidad perdida", value: "186 h", note: "fallas, preparacion y no-show", status: "warning" },
      { label: "Informes dentro SLA", value: "Pendiente", note: "requiere RIS/PACS", status: "pending-upload" },
    ],
    trendChart: {
      title: "Utilizacion de equipos y estudios exitosos",
      description:
        "Compara horas de equipo, estudios exitosos, lista de espera y capacidad perdida.",
      xLabels: monthlyLabels,
      yLabel: "% utilizacion",
      series: capacityTrendOptions.imagenes[0].series,
      insights: capacityTrendOptions.imagenes[0].insights,
      metricOptions: capacityTrendOptions.imagenes,
    },
    mainChartTitle: "Estudios exitosos versus ocupacion",
    mainChartDescription:
      "Comparativo por equipo, modalidad o sucursal con horas disponibles, programadas, utilizadas, exito y meta.",
    utilizationRows: [
      { name: "Tomografo Santa Tecla", branch: "Santa Tecla", unit: "Horas equipo", available: 100, planned: 96, used: 94, successRate: 88, targetRate: 84, lostCapacity: "42 h", mainCause: "Lista espera 4.8 dias", financialImpact: "$8.6K", recommendation: "Redistribuir pacientes antes de comprar equipo" },
      { name: "Equipo equivalente Este", branch: "Este", unit: "Horas equipo", available: 100, planned: 66, used: 61, successRate: 85, targetRate: 84, lostCapacity: "124 h", mainCause: "Subutilizacion", financialImpact: "$6.1K", recommendation: "Absorber demanda de Santa Tecla" },
      { name: "Ultrasonido Centro", branch: "Centro", unit: "Horas equipo", available: 100, planned: 84, used: 78, successRate: 89, targetRate: 84, lostCapacity: "62 h", mainCause: "Preparacion incompleta", financialImpact: "$3.8K", recommendation: "Reforzar instrucciones previas y confirmacion" },
    ],
    filters: {
      serviceLabel: "Modalidad / estudio",
      resourceLabel: "Equipo / tecnico / radiologo",
      serviceOptions: ["Todas las modalidades", "Rayos X", "Ultrasonido", "Tomografia", "Estudio con contraste", "Sala"],
      resourceOptions: ["Todos los recursos", "Equipo", "Sala", "Tecnico", "Radiologo", "Turno"],
      ...defaultCapacityFilters,
    },
    branchRows: [
      { branch: "Imagenes Santa Tecla", manager: "Gerente Santa Tecla", available: "100%", planned: "96%", effective: "94%", successRate: "88%", targetGap: "+10 pts uso", waitlist: "4.8 dias", lostCapacity: "42 h", mainCause: "Saturacion tomografia", lostIncome: "$8.6K", projection: "Saturada 8 semanas", recommendation: "Redistribuir pacientes a equipo equivalente" },
      { branch: "Imagenes Este", manager: "Gerente Este", available: "100%", planned: "66%", effective: "61%", successRate: "85%", targetGap: "-23 pts uso", waitlist: "1.2 dias", lostCapacity: "124 h", mainCause: "Subutilizacion", lostIncome: "$6.1K", projection: "Capacidad ociosa", recommendation: "Recibir demanda de Santa Tecla" },
      { branch: "Imagenes Centro", manager: "Gerente Centro", available: "100%", planned: "84%", effective: "78%", successRate: "89%", targetGap: "-6 pts uso", waitlist: "2.7 dias", lostCapacity: "62 h", mainCause: "Preparacion incompleta", lostIncome: "$3.8K", projection: "Estable con mejora", recommendation: "Mejorar preparacion y autorizaciones" },
    ],
    blocks: [
      {
        title: "A. Capacidad disponible",
        description:
          "Equipos, salas, horas operativas, modalidad, turno, contraste, tecnicos, radiologos e informes.",
        metrics: [
          { label: "Salas disponibles", value: "7", note: "modalidades DEMO", status: "available" },
          { label: "Capacidad con contraste", value: "Pendiente", note: "requiere insumos", status: "pending-upload" },
          { label: "Horas mantenimiento", value: "58 h", note: "programado y correctivo", status: "warning" },
          { label: "Capacidad de lectura", value: "Datos pendientes de conexion", note: "radiologos/RIS", status: "not-connected" },
          { label: "Bloques reservados", value: "420 h", note: "agenda bloqueada", status: "available" },
          { label: "Espacios disponibles", value: "1,020 h", note: "capacidad comercial", status: "warning" },
        ],
      },
      {
        title: "B. Perdida de capacidad",
        description:
          "Cancelaciones, no-show, preparacion incompleta, autorizacion, equipo detenido, mantenimiento e informes.",
        metrics: [
          { label: "Cancelaciones", value: "47", note: "agenda imagenes", status: "warning" },
          { label: "No-show", value: "66", note: "estudios agendados", status: "warning" },
          { label: "Preparacion incompleta", value: "18", note: "causa recuperable", status: "warning" },
          { label: "Autorizacion pendiente", value: "24", note: "pagador/convenio", status: "warning" },
          { label: "Equipo detenido", value: "36 h", note: "fallas", status: "warning" },
          { label: "Estudios repetidos", value: "18", note: "calidad tecnica", status: "warning" },
        ],
      },
    ],
    executiveActions: [
      "Redistribuir pacientes de Santa Tecla a equipo equivalente antes de comprar nueva capacidad.",
      "Separar alta utilizacion con bajo exito por cancelaciones, preparacion incompleta, fallas y repeticiones.",
      "Comparar equipos equivalentes por modalidad, sucursal y franja horaria.",
      "Conectar RIS/PACS para medir informes dentro de SLA y capacidad real de lectura.",
    ],
  },
};

export function getCapacityOccupancyScreen(slug: BusinessLineSlug) {
  return capacityOccupancyScreens[slug];
}

function getCapacityStatus(line: SemanticLine): CapacityMetricStatus {
  if (line.qualityLevel === "Insuficiente") {
    return "critical";
  }

  if (line.capacity.pendingMessage) {
    return "warning";
  }

  return "calculated";
}

function slugFromSemanticLine(line: SemanticLine): BusinessLineSlug {
  if (line.key === "fisioterapia") {
    return "fisioterapia";
  }

  if (line.key === "laboratorio") {
    return "laboratorio";
  }

  return "imagenes";
}

function buildCapacityNoDataScreen(
  slug: BusinessLineSlug,
  reason: string,
): CapacityOccupancyScreen {
  const base = getCapacityOccupancyScreen(slug);

  return {
    ...base,
    branchRows: [],
    comparisonRows: undefined,
    executiveActions: [semanticMessages.insufficientExecutiveData],
    noDataReason: reason,
    primaryMetrics: [
      {
        label: "Capacidad",
        note: reason,
        status: "pending-upload",
        value: semanticMessages.pending,
      },
      {
        label: "Ocupacion / utilizacion",
        note: semanticMessages.notCalculable,
        status: "pending-upload",
        value: semanticMessages.pending,
      },
      {
        label: "Finalizacion",
        note: semanticMessages.notCalculable,
        status: "pending-upload",
        value: semanticMessages.pending,
      },
      {
        label: "Calidad de datos",
        note: semanticMessages.insufficientExecutiveData,
        status: "critical",
        value: "Insuficiente",
      },
    ],
    subtitle: "Sin datos de capacidad",
    utilizationRows: [],
  };
}

export function getCapacityOccupancyScreenForContext(
  context: GlobalFilterInput,
  fallbackSlug: BusinessLineSlug,
): CapacityOccupancyScreen {
  const snapshot = getExecutiveBiSnapshot(context);

  if (snapshot.noDataReason || snapshot.lines.length === 0) {
    return buildCapacityNoDataScreen(
      fallbackSlug,
      snapshot.noDataReason ?? semanticMessages.noData,
    );
  }

  const slug =
    snapshot.lines.length === 1 ? slugFromSemanticLine(snapshot.lines[0]) : fallbackSlug;
  const base = getCapacityOccupancyScreen(slug);
  const primaryMetrics = snapshot.lines.flatMap((line): CapacityMetric[] => [
    {
      label:
        line.key === "laboratorio"
          ? "Utilizacion tecnica"
          : line.key === "fisioterapia"
            ? "Ocupacion efectiva"
            : "Utilizacion real",
      note: line.capacity.unitLabel,
      status: getCapacityStatus(line),
      value: formatSemanticPercent(line.capacity.effective),
    },
    {
      label: "Capacidad planificada",
      note: "Agenda, carga o uso programado sobre capacidad disponible.",
      status: "calculated",
      value: formatSemanticPercent(line.capacity.scheduled),
    },
    {
      label:
        line.key === "laboratorio"
          ? "Procesamiento exitoso"
          : line.key === "fisioterapia"
            ? "Finalizacion de citas"
            : "Estudios exitosos",
      note: line.capacity.pendingMessage ?? "Resultado exitoso sobre actividad programada.",
      status: getCapacityStatus(line),
      value: formatSemanticPercent(line.capacity.finalizationRate),
    },
    {
      label:
        line.capacity.conversionGapPoints === null
          ? "Brecha tecnica"
          : "Brecha agenda/efectiva",
      note:
        line.capacity.conversionGapPoints === null
          ? line.capacity.pendingMessage ?? semanticMessages.notCalculable
          : "Diferencia entre capacidad planificada y efectiva.",
      status:
        line.capacity.conversionGapPoints === null ? "pending-upload" : "warning",
      value:
        line.capacity.conversionGapPoints === null
          ? semanticMessages.notCalculable
          : `${line.capacity.conversionGapPoints} pts`,
    },
  ]);
  const utilizationRows = snapshot.lines.map((line): CapacityUtilizationRow => ({
    available: Math.round((line.capacity.scheduled ?? 0) > 0 ? 100 : 0),
    branch: line.branchName,
    financialImpact: line.finance.accountsReceivable > 0
      ? `$${Math.round(line.finance.accountsReceivable / 1000)}K`
      : "No calculable",
    lostCapacity:
      line.capacity.lostUnits === null
        ? semanticMessages.notCalculable
        : `${Math.round(line.capacity.lostUnits).toLocaleString("en-US")} ${line.capacity.unitLabel}`,
    mainCause:
      line.qualityIssues[0] ??
      (line.capacity.conversionGapPoints === null
        ? "Capacidad tecnica pendiente"
        : "Conversion agenda/efectiva"),
    name: line.shortName,
    planned: Math.round((line.capacity.scheduled ?? 0) * 100),
    recommendation:
      line.qualityLevel === "Insuficiente"
        ? semanticMessages.insufficientExecutiveData
        : "Revisar capacidad efectiva antes de ampliar recursos.",
    successRate: Math.round((line.capacity.finalizationRate ?? 0) * 100),
    targetRate: line.key === "laboratorio" ? 97 : line.key === "fisioterapia" ? 82 : 84,
    unit: line.capacity.unitLabel,
    used: Math.round((line.capacity.effective ?? 0) * 100),
  }));
  const branchRows = snapshot.branchRows.map((row): CapacityBranchRow => ({
    available: "100%",
    branch: row.branch,
    effective: formatSemanticPercent(row.effectiveOccupancy),
    lostCapacity: row.qualityLevel === "Insuficiente" ? "Pendiente" : "Calculada DEMO",
    lostIncome:
      row.revenue === null ? "Pendiente" : `$${Math.round(row.revenue / 1000)}K`,
    mainCause: row.alert,
    manager: row.manager,
    planned: formatSemanticPercent(row.targetFulfillment),
    projection:
      row.qualityLevel === "Insuficiente"
        ? semanticMessages.insufficientExecutiveData
        : "Revisar contra meta y calidad.",
    recommendation:
      row.qualityLevel === "Insuficiente"
        ? semanticMessages.insufficientExecutiveData
        : "Priorizar brecha de conversion y margen.",
    successRate: `${row.qualityScore}%`,
    targetGap: formatSemanticPercent(row.targetFulfillment),
    waitlist: "Pendiente de fuente",
  }));

  return {
    ...base,
    branchRows,
    executiveActions: [
      "Fisioterapia: ocupacion agendada, efectiva, brecha de conversion, finalizacion, no-show y cancelacion excluyen fechas futuras.",
      "Laboratorio: usar utilizacion tecnica, flujo de procesamiento, analizadores, estaciones y SLA; no ocupacion clinica.",
      "Imagenes: mostrar pendiente cuando RIS/PACS o capacidad por equipo no este cargada.",
      ...base.executiveActions,
    ],
    primaryMetrics,
    subtitle:
      snapshot.lines.length === 1
        ? snapshot.lines[0].scopeName
        : "Capacidad consolidada filtrada",
    title:
      snapshot.lines.length === 1
        ? base.title
        : "Capacidad y ocupacion",
    utilizationRows,
  };
}
