import type { BusinessLineSlug } from "@/lib/analytics/business-line-operations";
import {
  elSalvadorTemplateSummary,
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
import type { GlobalFilterInput } from "@/lib/analytics/global-filters";
import {
  formatSemanticCurrency,
  formatSemanticPercent,
  getExecutiveBiSnapshot,
  semanticMessages,
  type SemanticLine,
} from "@/lib/analytics/semantic-bi";
import type {
  TrendChartOption,
  TrendInsight,
  TrendSeries,
} from "@/components/analytics-comparison-chart";

export type FinancialMetricStatus =
  | "available"
  | "warning"
  | "critical"
  | "pending-upload"
  | "not-connected"
  | "incomplete"
  | "calculated";

export type FinancialMetric = {
  label: string;
  value: string;
  note: string;
  status: FinancialMetricStatus;
};

export type FinancialBlock = {
  title: string;
  description: string;
  metrics: FinancialMetric[];
};

export type FinancialComparisonRow = {
  line: string;
  netSales: string;
  directCost: string;
  margin: string;
  operatingExpense: string;
  operatingProfit: string;
  insight: string;
};

export type FinancialTrendChart = {
  title: string;
  description: string;
  xLabels: string[];
  yLabel: string;
  series: TrendSeries[];
  insights: TrendInsight[];
  metricOptions?: TrendChartOption[];
};

export type FinancialHealthScreen = {
  slug: BusinessLineSlug;
  title: string;
  subtitle: string;
  description: string;
  primaryMetrics: FinancialMetric[];
  trendChart: FinancialTrendChart;
  blocks: FinancialBlock[];
  comparisonRows?: FinancialComparisonRow[];
  noDataReason?: string;
};

const monthlyLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul"];
const labRevenue = elSalvadorTemplateSummary.totalActualRevenue;
const labCost = elSalvadorTemplateSummary.totalCostOfSale;
const labMargin = labRevenue > 0 ? (labRevenue - labCost) / labRevenue : 0;

const financialTrendOptions: Record<BusinessLineSlug, TrendChartOption[]> = {
  consolidado: [
    {
      id: "venta-neta",
      label: "Venta neta",
      description:
        "Compara venta neta consolidada 2026 contra 2025 y presupuesto para ver crecimiento real y brecha de cierre.",
      yLabel: "USD miles",
      series: [
        { label: "2026 venta neta", value: "$1.18M", color: "blue", points: [780, 826, 904, 980, 1065, 1180, 1180] },
        { label: "2025 venta neta", value: "$1.04M", color: "orange", points: [708, 752, 816, 874, 940, 1040, 1040] },
        { label: "Presupuesto", value: "$1.27M", color: "teal", points: [820, 875, 940, 1010, 1120, 1270, 1270] },
      ],
      insights: [
        { label: "Crecimiento real", value: "+13%", note: "La venta crece contra 2025, pero no todo se convierte en utilidad.", tone: "positive" },
        { label: "Brecha presupuesto", value: "-7%", note: "La diferencia se explica por margen y capacidad ociosa.", tone: "warning" },
        { label: "Decision", value: "Priorizar margen", note: "Subir volumen sin controlar costo puede ocultar perdida.", tone: "warning" },
      ],
    },
    {
      id: "costo-directo",
      label: "Costos directos",
      description:
        "Compara costos directos de produccion para ver si crecen mas rapido que la venta.",
      yLabel: "USD miles",
      series: [
        { label: "2026 costos", value: "$301K", color: "rose", points: [178, 196, 214, 238, 266, 301, 301] },
        { label: "2025 costos", value: "$257K", color: "orange", points: [160, 172, 186, 204, 229, 257, 257] },
        { label: "Presupuesto", value: "$280K", color: "teal", points: [170, 186, 202, 220, 248, 280, 280] },
      ],
      insights: [
        { label: "Presion de costo", value: "+17%", note: "El costo sube mas rapido que algunos ingresos por linea.", tone: "warning" },
        { label: "Brecha presupuesto", value: "+$21K", note: "Reactivos, insumos y equipo deben revisarse por linea.", tone: "warning" },
        { label: "Decision", value: "Costo unitario", note: "Mirar solo venta oculta deterioro de margen.", tone: "negative" },
      ],
    },
    {
      id: "margen-porcentual",
      label: "Margen porcentual",
      description:
        "Mide si cada dolar vendido deja margen suficiente despues del costo directo.",
      yLabel: "% margen",
      series: [
        { label: "2026 margen", value: "76%", color: "blue", points: [79, 78, 77, 77, 76, 76, 76] },
        { label: "2025 margen", value: "75%", color: "orange", points: [77, 76, 76, 75, 75, 75, 75] },
        { label: "Presupuesto", value: "78%", color: "teal", points: [79, 79, 78, 78, 78, 78, 78] },
      ],
      insights: [
        { label: "Margen", value: "+1 pt", note: "Mejora contra 2025, pero queda debajo del presupuesto.", tone: "positive" },
        { label: "Riesgo", value: "-2 pts", note: "Un margen pequeno puede desaparecer con repeticiones o compras urgentes.", tone: "warning" },
        { label: "Accion", value: "Por servicio", note: "Separar margen por prueba, sesion o estudio revela el problema real.", tone: "warning" },
      ],
    },
    {
      id: "utilidad-operativa",
      label: "Utilidad operativa",
      description:
        "Compara la utilidad despues de gastos para saber si el crecimiento llega al resultado final.",
      yLabel: "USD miles",
      series: [
        { label: "2026 utilidad", value: "$774K", color: "blue", points: [512, 548, 600, 648, 704, 774, 774] },
        { label: "2025 utilidad", value: "$681K", color: "orange", points: [455, 486, 532, 574, 620, 681, 681] },
        { label: "Presupuesto", value: "$842K", color: "teal", points: [535, 580, 630, 690, 760, 842, 842] },
      ],
      insights: [
        { label: "Resultado", value: "+14%", note: "La utilidad crece, pero aun no alcanza el presupuesto.", tone: "positive" },
        { label: "Brecha", value: "-$68K", note: "La diferencia se debe atacar por margen y gasto operativo.", tone: "warning" },
        { label: "Lectura CEO", value: "No solo venta", note: "La utilidad debe ser la metrica final por linea.", tone: "neutral" },
      ],
    },
  ],
  laboratorio: [
    {
      id: "venta-total",
      label: "Venta total",
      description:
        "Muestra si el crecimiento de ordenes genera venta suficiente contra ano anterior y meta.",
      yLabel: "USD miles",
      series: [
        { label: "2026 venta", value: formatCurrency(labRevenue), color: "blue", points: [164, 158, 184, 173, 182, Math.round(labRevenue / 1000), Math.round(labRevenue / 1000)] },
        { label: "2025 venta", value: "$905K", color: "orange", points: [141, 149, 159, 166, 174, 905, 905] },
        { label: "Meta", value: "$1.08M", color: "teal", points: [180, 360, 540, 720, 900, 1080, 1080] },
      ],
      insights: [
        { label: "Crecimiento anual", value: "+12%", note: "Mas venta, pero la lectura final depende de costo por prueba.", tone: "positive" },
        { label: "Meta", value: "En vigilancia", note: "El avance debe revisarse por sucursal y canal.", tone: "warning" },
        { label: "Decision", value: "Margen por prueba", note: "No todas las pruebas aportan el mismo margen.", tone: "warning" },
      ],
    },
    {
      id: "costo-directo-lab",
      label: "Costo directo",
      description:
        "Compara reactivos, insumos, tercerizaciones y transporte de muestras contra presupuesto.",
      yLabel: "USD miles",
      series: [
        { label: "2026 costo", value: formatCurrency(labCost), color: "rose", points: [28, 31, 34, 36, 39, Math.round(labCost / 1000), Math.round(labCost / 1000)] },
        { label: "2025 costo", value: "$91K", color: "orange", points: [22, 25, 28, 31, 35, 91, 91] },
        { label: "Presupuesto", value: "$96K", color: "teal", points: [24, 28, 34, 48, 72, 96, 96] },
      ],
      insights: [
        { label: "Costo", value: "Sobre control", note: "El costo directo debe validarse por reactivo y prueba tercerizada.", tone: "warning" },
        { label: "Repeticiones", value: "$860", note: "Las 42 pruebas repetidas generaron un costo adicional de $860 y redujeron el margen mensual en 0.7 pts.", tone: "warning" },
        { label: "Accion", value: "Costo por prueba", note: "La plantilla debe capturar costo unitario para ver rentabilidad real.", tone: "warning" },
      ],
    },
    {
      id: "margen-lab",
      label: "Margen",
      description:
        "Mide cuanto margen deja laboratorio despues de producir pruebas, por canal y por sucursal.",
      yLabel: "% margen",
      series: [
        { label: "2026 margen", value: formatRate(labMargin), color: "blue", points: [87, 86, 86, 85, 85, Math.round(labMargin * 100), Math.round(labMargin * 100)] },
        { label: "2025 margen", value: "84%", color: "orange", points: [85, 85, 84, 84, 84, 84, 84] },
        { label: "Meta", value: "88%", color: "teal", points: [88, 88, 88, 88, 88, 88, 88] },
      ],
      insights: [
        { label: "Margen", value: formatRate(labMargin), note: "Buen promedio, pero puede esconder pruebas de bajo rendimiento.", tone: "positive" },
        { label: "Brecha", value: "Por catalogo", note: "Sin catalogo por prueba no se ve el margen real de cada servicio.", tone: "warning" },
        { label: "Decision", value: "Convenios", note: "Revisar precio y margen por convenio antes de crecer volumen.", tone: "warning" },
      ],
    },
    {
      id: "inventario-riesgo",
      label: "Inventario en riesgo",
      description:
        "Compara merma, reactivos por vencer, compras urgentes e inventario inmovilizado.",
      yLabel: "USD miles",
      series: [
        { label: "2026 riesgo", value: "$18K", color: "rose", points: [9, 10, 12, 14, 16, 18, 18] },
        { label: "2025 riesgo", value: "$13K", color: "orange", points: [6, 7, 8, 10, 11, 13, 13] },
        { label: "Meta", value: "$8K", color: "teal", points: [10, 10, 9, 9, 8, 8, 8] },
      ],
      insights: [
        { label: "Riesgo", value: "+$5K", note: "Inventario inmovilizado y reactivos por vencer destruyen caja.", tone: "negative" },
        { label: "Meta", value: "+$10K", note: "Debe bajar para liberar capital y proteger margen.", tone: "warning" },
        { label: "Accion", value: "Rotacion", note: "Comparar por sucursal muestra donde comprar menos o transferir stock.", tone: "warning" },
      ],
    },
  ],
  fisioterapia: [
    {
      id: "venta-fisio",
      label: "Venta de fisioterapia",
      description:
        "Compara venta de sesiones, evaluaciones y paquetes contra ano anterior y meta.",
      yLabel: "USD miles",
      series: [
        { label: "2026 venta", value: "$94.2K", color: "blue", points: [68, 72, 81, 79, 88, 94, 94] },
        { label: "2025 venta", value: "$84.8K", color: "orange", points: [61, 64, 71, 73, 79, 85, 85] },
        { label: "Meta", value: "$100K", color: "teal", points: [72, 78, 84, 90, 96, 100, 100] },
      ],
      insights: [
        { label: "Crecimiento", value: "+11%", note: "La venta crece, pero la fuga evita alcanzar meta.", tone: "positive" },
        { label: "Meta", value: "-$5.8K", note: "El cierre depende de reducir ausencias y abandono de planes.", tone: "warning" },
        { label: "Palanca", value: "Planes", note: "Completar planes mejora ingreso de vida del paciente.", tone: "positive" },
      ],
    },
    {
      id: "ingreso-perdido",
      label: "Ingreso perdido",
      description:
        "Mide dinero perdido por no-show, cancelaciones, abandono y servicios no facturados.",
      yLabel: "USD miles",
      series: [
        { label: "2026 perdido", value: "$7.8K", color: "rose", points: [4.8, 5.2, 5.9, 6.4, 7.1, 7.8, 7.8] },
        { label: "2025 perdido", value: "$9.1K", color: "orange", points: [6.2, 6.8, 7.4, 8.0, 8.6, 9.1, 9.1] },
        { label: "Meta", value: "$4K", color: "teal", points: [5.6, 5.2, 4.8, 4.5, 4.2, 4.0, 4.0] },
      ],
      insights: [
        { label: "Mejora", value: "-$1.3K", note: "La fuga baja contra 2025, pero sigue alta.", tone: "positive" },
        { label: "Brecha", value: "+$3.8K", note: "Cada no-show debe traducirse a perdida mensual por sucursal.", tone: "warning" },
        { label: "Decision", value: "Recuperacion", note: "Confirmacion y lista de espera pueden recuperar ingreso sin aumentar demanda.", tone: "warning" },
      ],
    },
    {
      id: "costo-sesion",
      label: "Costo por sesion",
      description:
        "Compara costo directo por sesion para ver si la productividad profesional protege margen.",
      yLabel: "USD por sesion",
      series: [
        { label: "2026 costo", value: "$28", color: "rose", points: [24, 25, 26, 27, 28, 28, 28] },
        { label: "2025 costo", value: "$25", color: "orange", points: [22, 23, 24, 24, 25, 25, 25] },
        { label: "Meta", value: "$24", color: "teal", points: [25, 25, 24, 24, 24, 24, 24] },
      ],
      insights: [
        { label: "Costo", value: "+$3", note: "El costo por sesion sube contra 2025.", tone: "warning" },
        { label: "Brecha", value: "+$4", note: "Horas ociosas elevan costo unitario aunque el gasto fijo no cambie.", tone: "warning" },
        { label: "Accion", value: "Ocupacion", note: "Subir ocupacion real diluye costo por sesion.", tone: "positive" },
      ],
    },
    {
      id: "utilidad-paciente",
      label: "Utilidad por paciente",
      description:
        "Compara rentabilidad por paciente segun continuidad de planes y sesiones completadas.",
      yLabel: "USD por paciente",
      series: [
        { label: "2026 utilidad", value: "$148", color: "blue", points: [120, 126, 132, 137, 143, 148, 148] },
        { label: "2025 utilidad", value: "$132", color: "orange", points: [106, 112, 118, 123, 128, 132, 132] },
        { label: "Meta", value: "$165", color: "teal", points: [130, 137, 145, 152, 158, 165, 165] },
      ],
      insights: [
        { label: "Rentabilidad", value: "+$16", note: "Mejora por paciente, pero todavia no alcanza meta.", tone: "positive" },
        { label: "Brecha", value: "-$17", note: "Los planes incompletos reducen utilidad de vida.", tone: "warning" },
        { label: "Decision", value: "Continuidad", note: "Bonos pueden ligarse a cumplimiento de planes, no solo volumen.", tone: "neutral" },
      ],
    },
  ],
  imagenes: [
    {
      id: "venta-imagenes",
      label: "Venta de imagenes",
      description:
        "Compara venta por modalidad y estudio contra ano anterior y meta de equipo.",
      yLabel: "USD miles",
      series: [
        { label: "2026 venta", value: "$67.5K", color: "blue", points: [49, 52, 58, 55, 63, 68, 68] },
        { label: "2025 venta", value: "$61K", color: "orange", points: [44, 47, 51, 50, 57, 61, 61] },
        { label: "Meta", value: "$82K", color: "teal", points: [55, 60, 66, 72, 78, 82, 82] },
      ],
      insights: [
        { label: "Crecimiento", value: "+11%", note: "La venta sube, pero la brecha con meta sigue abierta.", tone: "positive" },
        { label: "Brecha", value: "-$14.5K", note: "Depende de utilizacion real y agenda por modalidad.", tone: "warning" },
        { label: "Decision", value: "Equipo", note: "Venta debe compararse contra costo y horas del equipo.", tone: "warning" },
      ],
    },
    {
      id: "costo-directo-imagenes",
      label: "Costo directo",
      description:
        "Mide materiales, contraste, lectura, tecnicos, energia y tercerizaciones de imagenes.",
      yLabel: "USD miles",
      series: [
        { label: "2026 costo", value: "$38.4K", color: "rose", points: [26, 28, 31, 32, 35, 38, 38] },
        { label: "2025 costo", value: "$33.2K", color: "orange", points: [23, 24, 27, 28, 30, 33, 33] },
        { label: "Presupuesto", value: "$35K", color: "teal", points: [24, 26, 28, 30, 33, 35, 35] },
      ],
      insights: [
        { label: "Costo", value: "+16%", note: "El costo directo sube por lectura, energia e insumos.", tone: "warning" },
        { label: "Brecha", value: "+$3.4K", note: "El gasto de equipo debe compararse por modalidad.", tone: "warning" },
        { label: "Accion", value: "Costo/hora", note: "La salud real se ve al cruzar costo con horas utilizadas.", tone: "neutral" },
      ],
    },
    {
      id: "perdida-equipo",
      label: "Perdida por equipo",
      description:
        "Mide dinero perdido por equipo detenido, fallas, cancelaciones e informes que bloquean facturacion.",
      yLabel: "USD miles",
      series: [
        { label: "2026 perdida", value: "$5.6K", color: "rose", points: [3.8, 4.1, 4.4, 4.8, 5.2, 5.6, 5.6] },
        { label: "2025 perdida", value: "$6.9K", color: "orange", points: [5.0, 5.5, 5.8, 6.2, 6.5, 6.9, 6.9] },
        { label: "Meta", value: "$2.8K", color: "teal", points: [4.0, 3.7, 3.4, 3.1, 2.9, 2.8, 2.8] },
      ],
      insights: [
        { label: "Mejora", value: "-$1.3K", note: "La perdida baja, pero sigue duplicando la meta.", tone: "positive" },
        { label: "Brecha", value: "+$2.8K", note: "Equipo detenido y cancelaciones deben tener responsable.", tone: "warning" },
        { label: "Decision", value: "Mantenimiento", note: "Preventivo y agenda deben medirse juntos.", tone: "warning" },
      ],
    },
    {
      id: "ingreso-hora-equipo",
      label: "Ingreso por hora de equipo",
      description:
        "Compara cuanto ingreso produce cada hora real de equipo utilizado.",
      yLabel: "USD por hora",
      series: [
        { label: "2026 ingreso/hora", value: "$888", color: "blue", points: [740, 770, 805, 830, 862, 888, 888] },
        { label: "2025 ingreso/hora", value: "$812", color: "orange", points: [690, 714, 742, 768, 790, 812, 812] },
        { label: "Meta", value: "$1,020", color: "teal", points: [820, 860, 900, 940, 980, 1020, 1020] },
      ],
      insights: [
        { label: "Rendimiento", value: "+9%", note: "Cada hora produce mas que 2025, pero falta cubrir meta.", tone: "positive" },
        { label: "Brecha", value: "-$132", note: "La brecha sugiere capacidad ociosa o mezcla de estudios menos rentable.", tone: "warning" },
        { label: "Accion", value: "Modalidad", note: "Comparar por equipo y modalidad identifica el mejor retorno.", tone: "neutral" },
      ],
    },
  ],
};

export const financialComparisonRows: FinancialComparisonRow[] = [
  {
    line: "Laboratorio",
    netSales: formatCurrency(labRevenue),
    directCost: formatCurrency(labCost),
    margin: formatRate(labMargin),
    operatingExpense: "$98.0K",
    operatingProfit: "$779.5K",
    insight:
      "Crece en venta, pero debe separar reactivos, tercerizaciones y mermas para entender margen real.",
  },
  {
    line: "Fisioterapia",
    netSales: "$94.2K",
    directCost: "$33.5K",
    margin: "64%",
    operatingExpense: "$42.9K",
    operatingProfit: "$17.8K",
    insight:
      "La fuga financiera principal viene de no-show, cancelaciones y planes abandonados.",
  },
  {
    line: "Imagenes",
    netSales: "$67.5K",
    directCost: "$38.4K",
    margin: "43%",
    operatingExpense: "$52.3K",
    operatingProfit: "-$23.2K",
    insight:
      "La rentabilidad depende de uso de equipo, mantenimiento, depreciacion e informes facturables.",
  },
];

export const financialHealthScreens: Record<
  BusinessLineSlug,
  FinancialHealthScreen
> = {
  consolidado: {
    slug: "consolidado",
    title: "Salud financiera consolidada",
    subtitle: "Venta, costo, margen, gasto y utilidad",
    description:
      "Vista financiera comun para responder cuanto se vende, cuanto cuesta producirlo, que margen genera y donde se pierde rentabilidad.",
    primaryMetrics: [
      { label: "Venta bruta", value: "$1.24M", note: "antes de descuentos", status: "calculated" },
      { label: "Venta neta", value: "$1.18M", note: "sin impuestos ni descuentos", status: "calculated" },
      { label: "Margen porcentual", value: "76%", note: "contribucion DEMO", status: "warning" },
      { label: "Utilidad operativa", value: "$774K", note: "despues de gastos DEMO", status: "available" },
      { label: "Cumplimiento de presupuesto", value: "93%", note: "vs presupuesto 2026", status: "warning" },
      { label: "Proyeccion de cierre", value: "$1.31M", note: "si mantiene tendencia", status: "calculated" },
    ],
    trendChart: {
      title: "Venta neta vs ano anterior y presupuesto",
      description:
        "Compara venta neta consolidada 2026 contra 2025 y presupuesto para ver crecimiento real y brecha de cierre.",
      xLabels: monthlyLabels,
      yLabel: "USD miles",
      metricOptions: financialTrendOptions.consolidado,
      series: [
        { label: "2026 venta neta", value: "$1.18M", color: "blue", points: [780, 826, 904, 980, 1065, 1180, 1180] },
        { label: "2025 venta neta", value: "$1.04M", color: "orange", points: [708, 752, 816, 874, 940, 1040, 1040] },
        { label: "Presupuesto", value: "$1.27M", color: "teal", points: [820, 875, 940, 1010, 1120, 1270, 1270] },
      ],
      insights: [
        {
          label: "Crecimiento real",
          value: "+13%",
          note: "La venta crece contra 2025, pero no todo se convierte en utilidad.",
          tone: "positive",
        },
        {
          label: "Brecha presupuesto",
          value: "-7%",
          note: "La diferencia se explica por margen y capacidad ociosa.",
          tone: "warning",
        },
        {
          label: "Decision",
          value: "Priorizar margen",
          note: "Subir volumen sin controlar costo puede ocultar perdida.",
          tone: "warning",
        },
      ],
    },
    comparisonRows: financialComparisonRows,
    blocks: [
      {
        title: "Estado financiero ejecutivo",
        description:
          "Lectura comun para las tres lineas: venta, costo, margen, gasto, utilidad y presupuesto.",
        metrics: [
          { label: "Venta bruta", value: "$1.24M", note: "facturacion DEMO", status: "calculated" },
          { label: "Descuentos", value: "$31.5K", note: "rebajas y promociones", status: "available" },
          { label: "Impuestos", value: "$28.0K", note: "IVA separado", status: "available" },
          { label: "Venta neta", value: "$1.18M", note: "base de margen", status: "calculated" },
          { label: "Costos directos", value: "$301.4K", note: "produccion", status: "warning" },
          { label: "Margen de contribucion", value: "$878.6K", note: "venta neta - costo directo", status: "calculated" },
          { label: "Margen porcentual", value: "76%", note: "promedio consolidado", status: "warning" },
          { label: "Gastos operativos", value: "$104.5K", note: "personal, renta, servicios", status: "available" },
          { label: "Utilidad operativa", value: "$774K", note: "resultado DEMO", status: "calculated" },
          { label: "Cumplimiento de presupuesto", value: "93%", note: "vs presupuesto", status: "warning" },
          { label: "Proyeccion de cierre", value: "$1.31M", note: "tendencia actual", status: "calculated" },
        ],
      },
    ],
  },
  laboratorio: {
    slug: "laboratorio",
    title: "Finanzas de laboratorio",
    subtitle: "Venta, canales, cobro, costos, rentabilidad e inventario",
    description:
      "Explica como las ordenes, pruebas, repeticiones y muestras se convierten en ingreso, costo, margen o perdida.",
    primaryMetrics: [
      { label: "Venta total", value: formatCurrency(labRevenue), note: "plantillas SV", status: "available" },
      { label: "Alcance de meta", value: formatRate(elSalvadorTemplateSummary.totalCompletionRate), note: "meta de venta", status: "available" },
      { label: "Costo directo", value: formatCurrency(labCost), note: "costos de produccion", status: "warning" },
      { label: "Margen", value: formatRate(labMargin), note: "requiere detalle por prueba", status: "warning" },
    ],
    trendChart: {
      title: "Venta laboratorio vs costo directo y meta",
      description:
        "Muestra si el crecimiento de ordenes genera margen o si el costo de producir pruebas crece mas rapido.",
      xLabels: monthlyLabels,
      yLabel: "USD miles",
      metricOptions: financialTrendOptions.laboratorio,
      series: [
        { label: "2026 venta", value: formatCurrency(labRevenue), color: "blue", points: [164, 158, 184, 173, 182, Math.round(labRevenue / 1000), Math.round(labRevenue / 1000)] },
        { label: "2025 venta", value: "$905K", color: "orange", points: [141, 149, 159, 166, 174, 905, 905] },
        { label: "Costo directo", value: formatCurrency(labCost), color: "rose", points: [28, 31, 34, 36, 39, Math.round(labCost / 1000), Math.round(labCost / 1000)] },
        { label: "Meta", value: "$1.08M", color: "teal", points: [180, 360, 540, 720, 900, 1080, 1080] },
      ],
      insights: [
        {
          label: "Crecimiento anual",
          value: "+12%",
          note: "Mas venta, pero la lectura final depende de costo por prueba.",
          tone: "positive",
        },
        {
          label: "Costo de repeticiones",
          value: "$860",
          note: "Las 42 pruebas repetidas generaron un costo adicional de $860 y redujeron el margen mensual en 0.7 pts.",
          tone: "warning",
        },
        {
          label: "Riesgo",
          value: "Inventario",
          note: "Reactivos vencidos y compras urgentes pueden destruir margen.",
          tone: "negative",
        },
      ],
    },
    blocks: [
      {
        title: "A. Ventas",
        description: "Venta, meta, proyeccion y crecimiento mensual/anual.",
        metrics: [
          { label: "Venta total", value: formatCurrency(labRevenue), note: "periodo seleccionado", status: "available" },
          { label: "Venta sin IVA", value: formatCurrency(Math.round(labRevenue / 1.13)), note: "base neta estimada", status: "calculated" },
          { label: "Meta de venta", value: formatCurrency(elSalvadorTemplateSummary.totalRevenueTarget), note: "plantillas SV", status: "available" },
          { label: "Alcance de meta", value: formatRate(elSalvadorTemplateSummary.totalCompletionRate), note: "avance mensual", status: "available" },
          { label: "Proyeccion", value: "$1.12M", note: "si mantiene tendencia", status: "calculated" },
          { label: "Venta diaria", value: "$32.7K", note: "promedio DEMO", status: "available" },
          { label: "Venta acumulada", value: formatCurrency(labRevenue), note: "corte actual", status: "available" },
          { label: "Crecimiento mensual y anual", value: "+12%", note: "vs 2025", status: "available" },
        ],
      },
      {
        title: "B. Ventas por canal",
        description: "Venta, ordenes, pacientes, ticket, margen y crecimiento por canal.",
        metrics: [
          { label: "Pacientes Analiza", value: "$312K", note: "ticket $53", status: "available" },
          { label: "DRSV", value: "$226K", note: "convenio DEMO", status: "available" },
          { label: "Ordenes medicas", value: "$401K", note: "referidor registrado", status: "available" },
          { label: "Sin medico referidor", value: "$74K", note: "oportunidad comercial", status: "warning" },
          { label: "Domicilio", value: "$28K", note: "transporte de muestras", status: "warning" },
          { label: "Venta directa", value: "$192K", note: "canal directo", status: "available" },
          { label: "Convenios", value: "$243K", note: "margen por convenio pendiente", status: "incomplete" },
          { label: "Credito", value: "$91K", note: "impacta cobro", status: "warning" },
        ],
      },
      {
        title: "C. Formas de pago",
        description: "Cobro, cuentas pendientes y dias promedio de cobro.",
        metrics: [
          { label: "Efectivo", value: "$318K", note: "cobro inmediato", status: "available" },
          { label: "Tarjeta", value: "$415K", note: "comision pendiente", status: "incomplete" },
          { label: "Credito", value: "$91K", note: "cuentas por cobrar", status: "warning" },
          { label: "Pago mixto", value: "$102K", note: "requiere conciliacion", status: "warning" },
          { label: "Cuentas pendientes", value: "$91K", note: "9% de venta", status: "warning" },
          { label: "Dias promedio de cobro", value: "19 dias", note: "credito DEMO", status: "warning" },
        ],
      },
      {
        title: "D. Costos de produccion",
        description: "Reactivos, insumos, consumibles, tercerizaciones y costo unitario.",
        metrics: [
          { label: "Reactivos", value: "$58K", note: "mayor costo variable", status: "warning" },
          { label: "Insumos", value: "$17K", note: "toma de muestra", status: "available" },
          { label: "Consumibles", value: "$12K", note: "material operativo", status: "available" },
          { label: "Pruebas tercerizadas", value: "$8K", note: "margen menor", status: "warning" },
          { label: "Transporte de muestras", value: "$6K", note: "domicilio/rutas", status: "warning" },
          { label: "Costo por orden", value: "$11.20", note: "produccion/orden", status: "calculated" },
          { label: "Costo por paciente", value: "$10.80", note: "deduplicacion pendiente", status: "incomplete" },
          { label: "Costo por prueba", value: "$6.90", note: "requiere detalle prueba", status: "pending-upload" },
          { label: "Costo por perfil", value: "Pendiente", note: "catalogo de perfiles", status: "pending-upload" },
        ],
      },
      {
        title: "E. Rentabilidad",
        description: "Margen por prueba, perfil, canal, referidor, especialidad y sucursal.",
        metrics: [
          { label: "Margen por prueba", value: "Pendiente", note: "requiere catalogo prueba", status: "pending-upload" },
          { label: "Margen por perfil", value: "Pendiente", note: "requiere catalogo perfil", status: "pending-upload" },
          { label: "Margen por canal", value: "86%", note: "promedio DEMO", status: "warning" },
          { label: "Margen por medico referidor", value: "Pendiente", note: "referidor requerido", status: "pending-upload" },
          { label: "Margen por especialidad", value: "Pendiente", note: "especialidad requerida", status: "pending-upload" },
          { label: "Margen por sucursal", value: formatRate(labMargin), note: "plantillas SV", status: "available" },
          { label: "Utilidad por orden", value: "$97", note: "estimado DEMO", status: "calculated" },
          { label: "Utilidad por paciente", value: "$96", note: "deduplicacion pendiente", status: "incomplete" },
        ],
      },
      {
        title: "F. Gastos operativos",
        description: "Gastos del centro de costo que reducen utilidad operativa.",
        metrics: [
          { label: "Personal", value: "$43K", note: "planilla", status: "available" },
          { label: "Cargas patronales", value: "$9K", note: "laborales", status: "available" },
          { label: "Renta", value: "$18K", note: "sucursales", status: "available" },
          { label: "Energia", value: "$7K", note: "equipos", status: "available" },
          { label: "Agua", value: "$2K", note: "operativo", status: "available" },
          { label: "Internet", value: "$1.8K", note: "conectividad", status: "available" },
          { label: "Seguridad", value: "$4.2K", note: "sucursales", status: "available" },
          { label: "Transporte", value: "$6K", note: "rutas y muestras", status: "warning" },
          { label: "Caja chica", value: "$1.5K", note: "control pendiente", status: "warning" },
          { label: "Gastos administrativos", value: "$5.5K", note: "centro de costo", status: "available" },
          { label: "Gastos del centro de costo", value: "$98K", note: "total DEMO", status: "calculated" },
        ],
      },
      {
        title: "G. Impacto de inventario",
        description: "Perdidas por merma, vencimientos, inmovilizado y compras urgentes.",
        metrics: [
          { label: "Merma", value: "$2.8K", note: "material perdido", status: "warning" },
          { label: "Reactivos vencidos", value: "$1.4K", note: "perdida directa", status: "warning" },
          { label: "Reactivos proximos a vencer", value: "$7.6K", note: "riesgo futuro", status: "critical" },
          { label: "Inventario inmovilizado", value: "$18K", note: "capital detenido", status: "warning" },
          { label: "Compras urgentes", value: "$3.1K", note: "sobrecosto", status: "warning" },
          { label: "Diferencia rendimiento esperado y real", value: "-4.2%", note: "reactivos", status: "warning" },
        ],
      },
    ],
  },
  fisioterapia: {
    slug: "fisioterapia",
    title: "Finanzas de fisioterapia",
    subtitle: "Ventas, ticket, costos, rentabilidad, fugas y gastos",
    description:
      "Traduce sesiones, planes, asistencia y capacidad en ingreso, costo, margen y perdida por abandono o no-show.",
    primaryMetrics: [
      { label: "Venta por sesion", value: "$80", note: "ticket promedio", status: "available" },
      { label: "Ingreso por plan", value: "$228", note: "promedio DEMO", status: "available" },
      { label: "Costo por sesion", value: "$28", note: "profesional + insumo", status: "available" },
      { label: "Ingreso perdido", value: "$7.8K", note: "no-show/cancelacion", status: "warning" },
    ],
    trendChart: {
      title: "Ingreso de fisioterapia vs fuga financiera",
      description:
        "Compara venta 2026 contra 2025 y muestra la fuga por no-show, cancelaciones y planes incompletos.",
      xLabels: monthlyLabels,
      yLabel: "USD miles",
      metricOptions: financialTrendOptions.fisioterapia,
      series: [
        { label: "2026 venta", value: "$94.2K", color: "blue", points: [68, 72, 81, 79, 88, 94, 94] },
        { label: "2025 venta", value: "$84.8K", color: "orange", points: [61, 64, 71, 73, 79, 85, 85] },
        { label: "Fuga financiera", value: "$7.8K", color: "rose", points: [4.8, 5.2, 5.9, 6.4, 7.1, 7.8, 7.8] },
        { label: "Meta", value: "$100K", color: "teal", points: [72, 78, 84, 90, 96, 100, 100] },
      ],
      insights: [
        {
          label: "Crecimiento",
          value: "+11%",
          note: "La venta crece, pero la fuga evita alcanzar meta.",
          tone: "positive",
        },
        {
          label: "Perdida por agenda",
          value: "$7.8K",
          note: "No-show y cancelaciones deben verse en finanzas como dinero perdido.",
          tone: "warning",
        },
        {
          label: "Palanca",
          value: "Planes",
          note: "Completar planes mejora ingreso de vida del paciente.",
          tone: "positive",
        },
      ],
    },
    blocks: [
      {
        title: "A. Ventas",
        description: "Venta por sesion, evaluacion, paquete, especialidad, sucursal, profesional y canal.",
        metrics: [
          { label: "Venta por sesion", value: "$80", note: "promedio", status: "available" },
          { label: "Venta por evaluacion", value: "$55", note: "entrada a plan", status: "available" },
          { label: "Venta por paquete", value: "$228", note: "plan terapeutico", status: "available" },
          { label: "Venta por especialidad", value: "Pendiente", note: "catalogo requerido", status: "pending-upload" },
          { label: "Venta por sucursal", value: "$94.2K", note: "periodo DEMO", status: "available" },
          { label: "Venta por fisioterapeuta", value: "$7.8K", note: "promedio DEMO", status: "available" },
          { label: "Venta por canal", value: "Pendiente", note: "canal requerido", status: "pending-upload" },
        ],
      },
      {
        title: "B. Ticket y paciente",
        description: "Ticket por sesion, paciente, plan e ingreso de vida.",
        metrics: [
          { label: "Ticket por sesion", value: "$80", note: "ingreso/sesion", status: "available" },
          { label: "Ticket por paciente", value: "$228", note: "acumulado DEMO", status: "available" },
          { label: "Ingreso acumulado por paciente", value: "$228", note: "plan promedio", status: "available" },
          { label: "Ingreso por plan terapeutico", value: "$456", note: "paquete completo", status: "available" },
          { label: "Ingreso de vida del paciente", value: "$612", note: "retorno estimado", status: "calculated" },
          { label: "Sesiones promedio por paciente", value: "2.4", note: "bajo potencial de plan", status: "warning" },
        ],
      },
      {
        title: "C. Costos",
        description: "Costo por sesion, hora profesional, insumos, equipo y consultorio.",
        metrics: [
          { label: "Costo por sesion", value: "$28", note: "directo", status: "available" },
          { label: "Costo por hora profesional", value: "$22", note: "planilla/hora", status: "available" },
          { label: "Insumos utilizados", value: "$3.4K", note: "terapeuticos", status: "available" },
          { label: "Uso de equipos", value: "$1.2K", note: "depreciacion pendiente", status: "incomplete" },
          { label: "Costo de consultorio", value: "$9.8K", note: "renta/servicios", status: "available" },
          { label: "Costo por especialidad", value: "Pendiente", note: "catalogo requerido", status: "pending-upload" },
        ],
      },
      {
        title: "D. Rentabilidad",
        description: "Margen por sesion, paquete, profesional, especialidad, hora y paciente.",
        metrics: [
          { label: "Margen por sesion", value: "65%", note: "promedio", status: "available" },
          { label: "Margen por paquete", value: "68%", note: "mejor continuidad", status: "available" },
          { label: "Margen por fisioterapeuta", value: "Pendiente", note: "requiere horas/costos", status: "pending-upload" },
          { label: "Margen por especialidad", value: "Pendiente", note: "especialidad requerida", status: "pending-upload" },
          { label: "Ingreso por hora atendida", value: "$74", note: "hora real", status: "available" },
          { label: "Utilidad por paciente", value: "$148", note: "estimado", status: "calculated" },
          { label: "Rentabilidad por sucursal", value: "19%", note: "utilidad operativa", status: "warning" },
        ],
      },
      {
        title: "E. Fugas financieras",
        description: "Dinero perdido por no-show, cancelaciones, abandono y servicios no facturados.",
        metrics: [
          { label: "Ingreso perdido por no-show", value: "$4.9K", note: "98 citas", status: "warning" },
          { label: "Ingreso perdido por cancelaciones", value: "$2.9K", note: "74 citas", status: "warning" },
          { label: "Sesiones indicadas no realizadas", value: "$15.4K", note: "planes incompletos", status: "critical" },
          { label: "Planes abandonados", value: "$8.2K", note: "abandono teraputico", status: "warning" },
          { label: "Paquetes comprados no utilizados", value: "$2.1K", note: "pasivo operativo", status: "warning" },
          { label: "Descuentos aplicados", value: "$3.6K", note: "impacto margen", status: "warning" },
          { label: "Cuentas pendientes", value: "$7.4K", note: "por cobrar", status: "warning" },
          { label: "Servicios realizados no facturados", value: "Pendiente", note: "requiere conciliacion", status: "pending-upload" },
        ],
      },
      {
        title: "F. Gastos operativos",
        description: "Personal, renta, servicios, equipo, mantenimiento, insumos, administracion y marketing.",
        metrics: [
          { label: "Personal", value: "$24.4K", note: "planilla", status: "available" },
          { label: "Renta", value: "$9.2K", note: "consultorios", status: "available" },
          { label: "Servicios basicos", value: "$2.8K", note: "agua/energia", status: "available" },
          { label: "Equipamiento", value: "$3.1K", note: "uso y depreciacion", status: "incomplete" },
          { label: "Mantenimiento", value: "$1.2K", note: "equipos", status: "available" },
          { label: "Insumos terapeuticos", value: "$3.4K", note: "directos", status: "available" },
          { label: "Administracion", value: "$4.1K", note: "centro de costo", status: "available" },
          { label: "Marketing o adquisicion", value: "Pendiente", note: "cuando exista", status: "pending-upload" },
        ],
      },
    ],
  },
  imagenes: {
    slug: "imagenes",
    title: "Finanzas de imagenes",
    subtitle: "Ventas, costos directos, rentabilidad, equipos/CAPEX y perdidas",
    description:
      "Explica como estudios, equipos, informes y fallas generan ingreso, costo, margen, CAPEX o perdida financiera.",
    primaryMetrics: [
      { label: "Venta por modalidad", value: "$67.5K", note: "DEMO", status: "available" },
      { label: "Costo directo", value: "$38.4K", note: "lectura, tecnico e insumos", status: "warning" },
      { label: "Ingreso por hora de equipo", value: "$888", note: "uso real", status: "available" },
      { label: "Perdida por equipo detenido", value: "$5.6K", note: "fallas/capacidad", status: "warning" },
    ],
    trendChart: {
      title: "Venta de imagenes vs costo de equipo y meta",
      description:
        "Compara venta, costos directos y meta para entender si el equipo esta generando retorno o capacidad ociosa.",
      xLabels: monthlyLabels,
      yLabel: "USD miles",
      metricOptions: financialTrendOptions.imagenes,
      series: [
        { label: "2026 venta", value: "$67.5K", color: "blue", points: [49, 52, 58, 55, 63, 68, 68] },
        { label: "2025 venta", value: "$61K", color: "orange", points: [44, 47, 51, 50, 57, 61, 61] },
        { label: "Costo directo", value: "$38.4K", color: "rose", points: [26, 28, 31, 32, 35, 38, 38] },
        { label: "Meta", value: "$82K", color: "teal", points: [55, 60, 66, 72, 78, 82, 82] },
      ],
      insights: [
        {
          label: "Crecimiento",
          value: "+11%",
          note: "La venta sube, pero la brecha con meta sigue abierta.",
          tone: "positive",
        },
        {
          label: "Equipo detenido",
          value: "$5.6K",
          note: "Capacidad no utilizada y fallas tienen impacto directo.",
          tone: "warning",
        },
        {
          label: "CAPEX",
          value: "ROI pendiente",
          note: "Sin depreciacion y mantenimiento no hay utilidad neta real.",
          tone: "negative",
        },
      ],
    },
    blocks: [
      {
        title: "A. Ventas",
        description: "Venta por modalidad, estudio, equipo, sucursal, referidor, canal y convenio.",
        metrics: [
          { label: "Venta por modalidad", value: "$67.5K", note: "modalidades DEMO", status: "available" },
          { label: "Venta por estudio", value: "$109", note: "ticket promedio", status: "available" },
          { label: "Venta por equipo", value: "Pendiente", note: "requiere equipo", status: "pending-upload" },
          { label: "Venta por sucursal", value: "$67.5K", note: "sucursal DEMO", status: "available" },
          { label: "Venta por medico referidor", value: "Pendiente", note: "referidor requerido", status: "pending-upload" },
          { label: "Venta por canal", value: "Pendiente", note: "canal requerido", status: "pending-upload" },
          { label: "Venta por convenio", value: "Pendiente", note: "convenio requerido", status: "pending-upload" },
        ],
      },
      {
        title: "B. Costos directos",
        description: "Materiales, contraste, insumos, lectura, tecnicos, energia y tercerizaciones.",
        metrics: [
          { label: "Materiales", value: "$4.8K", note: "insumo estudio", status: "available" },
          { label: "Contraste", value: "$3.2K", note: "estudios con contraste", status: "warning" },
          { label: "Insumos", value: "$2.6K", note: "operativo", status: "available" },
          { label: "Honorarios de lectura", value: "$12.4K", note: "medico informante", status: "available" },
          { label: "Tecnicos", value: "$11.8K", note: "personal directo", status: "available" },
          { label: "Energia", value: "$3.6K", note: "equipos", status: "warning" },
          { label: "Estudios tercerizados", value: "Pendiente", note: "terceros", status: "pending-upload" },
          { label: "Lecturas tercerizadas", value: "Pendiente", note: "terceros", status: "pending-upload" },
        ],
      },
      {
        title: "C. Rentabilidad",
        description: "Margen por modalidad, estudio, equipo, hora, paciente, sucursal y convenio.",
        metrics: [
          { label: "Margen por modalidad", value: "43%", note: "promedio DEMO", status: "warning" },
          { label: "Margen por estudio", value: "$47", note: "estimado", status: "calculated" },
          { label: "Margen por equipo", value: "Pendiente", note: "requiere CAPEX/equipo", status: "pending-upload" },
          { label: "Ingreso por hora de equipo", value: "$888", note: "venta/horas usadas", status: "available" },
          { label: "Costo por hora de equipo", value: "$505", note: "costos/horas usadas", status: "warning" },
          { label: "Utilidad por paciente", value: "$47", note: "estimado", status: "calculated" },
          { label: "Rentabilidad por sucursal", value: "-34%", note: "gasto operativo alto", status: "critical" },
          { label: "Rentabilidad por convenio", value: "Pendiente", note: "convenio requerido", status: "pending-upload" },
        ],
      },
      {
        title: "D. Equipos y CAPEX",
        description: "Mantenimiento, depreciacion, licencias, recuperacion de inversion y punto de equilibrio.",
        metrics: [
          { label: "Costo de mantenimiento", value: "$4.8K", note: "preventivo", status: "warning" },
          { label: "Costo correctivo", value: "$2.4K", note: "fallas", status: "warning" },
          { label: "Depreciacion", value: "Pendiente", note: "CAPEX requerido", status: "pending-upload" },
          { label: "Contratos de mantenimiento", value: "Datos pendientes de conexion", note: "proveedores", status: "not-connected" },
          { label: "Costo de licencias", value: "Pendiente", note: "software/equipo", status: "pending-upload" },
          { label: "Recuperacion de inversion", value: "Pendiente", note: "requiere CAPEX", status: "pending-upload" },
          { label: "Punto de equilibrio por equipo", value: "615 estudios", note: "estimado DEMO", status: "calculated" },
          { label: "Estudios necesarios para cubrir costos", value: "615", note: "volumen minimo", status: "calculated" },
        ],
      },
      {
        title: "E. Perdidas",
        description: "Dinero perdido por equipo detenido, fallas, capacidad no usada, repeticiones y atrasos.",
        metrics: [
          { label: "Ingreso perdido por equipo detenido", value: "$5.6K", note: "fallas/capacidad", status: "warning" },
          { label: "Estudios cancelados por fallas", value: "$2.1K", note: "perdida directa", status: "warning" },
          { label: "Capacidad no utilizada", value: "$12.9K", note: "horas ociosas", status: "critical" },
          { label: "Estudios repetidos", value: "$1.9K", note: "repeticiones", status: "warning" },
          { label: "Material desperdiciado", value: "$840", note: "insumos/contraste", status: "warning" },
          { label: "Cancelaciones", value: "$5.1K", note: "agenda", status: "warning" },
          { label: "No-show", value: "$7.2K", note: "agenda de estudios", status: "warning" },
          { label: "Informes retrasados que impiden facturacion", value: "$4.6K", note: "backlog informe", status: "warning" },
        ],
      },
    ],
  },
};

export function getFinancialHealthScreen(slug: BusinessLineSlug) {
  return financialHealthScreens[slug];
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

function buildNoDataFinancialScreen(
  slug: BusinessLineSlug,
  reason: string,
): FinancialHealthScreen {
  return {
    blocks: [],
    description:
      "Finanzas bloquea conclusiones cuando faltan datos esenciales del filtro activo.",
    noDataReason: reason,
    primaryMetrics: [
      {
        label: "Facturacion neta",
        note: reason,
        status: "pending-upload",
        value: semanticMessages.pending,
      },
      {
        label: "Cobros",
        note: semanticMessages.notCalculable,
        status: "pending-upload",
        value: semanticMessages.pending,
      },
      {
        label: "Margen de contribucion",
        note: semanticMessages.notCalculable,
        status: "pending-upload",
        value: semanticMessages.pending,
      },
      {
        label: "Calidad financiera",
        note: semanticMessages.insufficientExecutiveData,
        status: "critical",
        value: "Insuficiente",
      },
    ],
    slug,
    subtitle: "Sin datos conciliados",
    title: "Salud financiera",
    trendChart: {
      description: reason,
      insights: [],
      series: [],
      title: "Sin tendencia financiera para el filtro",
      xLabels: [],
      yLabel: "USD",
    },
  };
}

function aggregateLines(lines: SemanticLine[]) {
  return {
    accountsReceivable: lines.reduce(
      (sum, line) => sum + line.finance.accountsReceivable,
      0,
    ),
    channelRevenue: lines.flatMap((line) =>
      line.finance.channelRevenue.map((item) => ({
        label: `${line.shortName} ${item.label}`,
        amount: item.amount,
      })),
    ),
    collections: lines.reduce((sum, line) => sum + line.finance.collections, 0),
    contributionMargin: lines.reduce(
      (sum, line) => sum + line.finance.contributionMargin,
      0,
    ),
    directCost: lines.reduce((sum, line) => sum + line.finance.directCost, 0),
    grossBilling: lines.reduce((sum, line) => sum + line.finance.grossBilling, 0),
    netBilling: lines.reduce((sum, line) => sum + line.finance.netBilling, 0),
    paymentCollections: lines.flatMap((line) =>
      line.finance.paymentCollections.map((item) => ({
        label: `${line.shortName} ${item.label}`,
        amount: item.amount,
      })),
    ),
    target: lines.reduce((sum, line) => sum + line.finance.target, 0),
  };
}

export function getFinancialHealthScreenForContext(
  context: GlobalFilterInput,
): FinancialHealthScreen {
  const snapshot = getExecutiveBiSnapshot(context);
  const fallbackSlug = getFinancialHealthScreen("consolidado").slug;

  if (snapshot.noDataReason || snapshot.lines.length === 0) {
    return buildNoDataFinancialScreen(
      fallbackSlug,
      snapshot.noDataReason ?? semanticMessages.noData,
    );
  }

  const slug =
    snapshot.lines.length === 1 ? slugFromSemanticLine(snapshot.lines[0]) : "consolidado";
  const aggregate = aggregateLines(snapshot.lines);
  const contributionMarginRate =
    aggregate.netBilling > 0
      ? aggregate.contributionMargin / aggregate.netBilling
      : null;
  const targetFulfillment =
    aggregate.target > 0 ? aggregate.netBilling / aggregate.target : null;
  const comparisonRows: FinancialComparisonRow[] | undefined =
    snapshot.lines.length > 1
      ? snapshot.lines.map((line) => ({
          directCost: formatSemanticCurrency(line.finance.directCost),
          insight:
            line.qualityLevel === "Insuficiente"
              ? semanticMessages.insufficientExecutiveData
              : `${line.shortName}: ${formatSemanticPercent(line.finance.targetFulfillment)} de meta y calidad ${line.qualityLevel}.`,
          line: line.shortName,
          margin: formatSemanticPercent(line.finance.contributionMarginRate),
          netSales: formatSemanticCurrency(line.finance.netBilling),
          operatingExpense: "No aplica a contribucion",
          operatingProfit: formatSemanticCurrency(line.finance.contributionMargin),
        }))
      : undefined;
  const invariantMetrics = snapshot.lines.flatMap((line) =>
    line.finance.invariants.map((invariant) => ({
      label: `${line.shortName}: ${invariant.label}`,
      note: invariant.message,
      status: invariant.passed ? "calculated" : "critical",
      value: invariant.passed ? "OK" : "Revisar",
    }) satisfies FinancialMetric),
  );
  const channelMetrics = aggregate.channelRevenue.map((item) => ({
    label: item.label,
    note: "Suma reconciliada contra facturacion neta.",
    status: "calculated" as const,
    value: formatSemanticCurrency(item.amount),
  }));
  const paymentMetrics = aggregate.paymentCollections.map((item) => ({
    label: item.label,
    note: "Suma reconciliada contra cobros.",
    status: "calculated" as const,
    value: formatSemanticCurrency(item.amount),
  }));

  return {
    blocks: [
      {
        description:
          "Contratos financieros P1: bruto, descuentos, notas, neto, cobros, cuentas por cobrar y margen de contribucion.",
        metrics: [
          {
            label: "Facturacion bruta",
            note: "Antes de descuentos y notas de credito.",
            status: "calculated",
            value: formatSemanticCurrency(aggregate.grossBilling),
          },
          {
            label: "Facturacion neta",
            note: "Base oficial para margen y meta.",
            status: "calculated",
            value: formatSemanticCurrency(aggregate.netBilling),
          },
          {
            label: "Cobros",
            note: "Pagos aplicados al periodo.",
            status: "calculated",
            value: formatSemanticCurrency(aggregate.collections),
          },
          {
            label: "Cuentas por cobrar",
            note: "Facturacion neta menos cobros.",
            status: "warning",
            value: formatSemanticCurrency(aggregate.accountsReceivable),
          },
          {
            label: "Costo directo",
            note: "Costo de producir la atencion, prueba o estudio.",
            status: "calculated",
            value: formatSemanticCurrency(aggregate.directCost),
          },
          {
            label: "Margen de contribucion",
            note: "No es utilidad neta; excluye gastos no directos.",
            status: "calculated",
            value: formatSemanticCurrency(aggregate.contributionMargin),
          },
          {
            label: "Margen de contribucion %",
            note: "Margen de contribucion / facturacion neta.",
            status: "calculated",
            value: formatSemanticPercent(contributionMarginRate),
          },
          {
            label: "Cumplimiento de meta",
            note: "Contra meta explicita del periodo.",
            status: "calculated",
            value: formatSemanticPercent(targetFulfillment),
          },
        ],
        title: "Estado financiero reconciliado",
      },
      {
        description:
          "Cada canal debe reconciliar contra el total neto filtrado.",
        metrics: channelMetrics,
        title: "Ventas por canal",
      },
      {
        description:
          "Cada forma de pago debe reconciliar contra cobros, no contra facturacion.",
        metrics: paymentMetrics,
        title: "Formas de pago",
      },
      {
        description:
          "Validaciones que evitan valores no calculables, ceros silenciosos, mezclas de moneda y periodos incomparables.",
        metrics: invariantMetrics,
        title: "Invariantes financieros",
      },
    ],
    comparisonRows,
    description:
      "Vista financiera reconciliada por filtro global. Usa margen de contribucion y bloquea conclusiones cuando faltan datos.",
    primaryMetrics: [
      {
        label: "Facturacion neta",
        note: "Periodo filtrado.",
        status: "calculated",
        value: formatSemanticCurrency(aggregate.netBilling),
      },
      {
        label: "Cobros",
        note: "Suma de formas de pago conciliadas.",
        status: "calculated",
        value: formatSemanticCurrency(aggregate.collections),
      },
      {
        label: "Cuentas por cobrar",
        note: "Facturacion neta menos cobros.",
        status: "warning",
        value: formatSemanticCurrency(aggregate.accountsReceivable),
      },
      {
        label: "Margen de contribucion",
        note: "Facturacion neta menos costo directo.",
        status: "calculated",
        value: formatSemanticPercent(contributionMarginRate),
      },
      {
        label: "Cumplimiento de meta",
        note: "Meta explicita del periodo.",
        status: "calculated",
        value: formatSemanticPercent(targetFulfillment),
      },
      {
        label: "Calidad financiera",
        note: "Bloquea conclusion si baja de 70%.",
        status: snapshot.kpis.some((kpi) => kpi.status === "blocked")
          ? "critical"
          : "available",
        value:
          snapshot.kpis.find((kpi) => kpi.label === "Calidad de datos")?.value ??
          "Pendiente",
      },
    ],
    slug,
    subtitle:
      snapshot.lines.length === 1
        ? snapshot.lines[0].scopeName
        : "Consolidado filtrado",
    title:
      snapshot.lines.length === 1
        ? `Finanzas de ${snapshot.lines[0].shortName}`
        : "Salud financiera consolidada",
    trendChart: {
      description:
        "Tendencia DEMO derivada del periodo filtrado; no mezcla MTD/YTD sin etiqueta.",
      insights: [
        {
          label: "Periodo",
          note: `${snapshot.context.periodStart} a ${snapshot.context.periodEnd}`,
          tone: "neutral",
          value: "Explicito",
        },
        {
          label: "Conciliacion",
          note: "Canales y pagos cuadran con sus totales correspondientes.",
          tone: "positive",
          value: "OK",
        },
        {
          label: "Lectura",
          note: "Margen de contribucion, no utilidad neta.",
          tone: "neutral",
          value: "P1",
        },
      ],
      metricOptions: financialTrendOptions[slug],
      series:
        snapshot.lines.length === 1
          ? [
              {
                color: "blue" as const,
                label: "Facturacion neta",
                points: snapshot.lines[0].monthlyRevenue.map((point) => point.value),
                value: formatSemanticCurrency(snapshot.lines[0].finance.netBilling),
              },
              {
                color: "rose" as const,
                label: "Costo directo",
                points: snapshot.lines[0].monthlyRevenue.map((point) =>
                  Math.round(point.value * (snapshot.lines[0].finance.directCost / Math.max(snapshot.lines[0].finance.netBilling, 1))),
                ),
                value: formatSemanticCurrency(snapshot.lines[0].finance.directCost),
              },
              {
                color: "teal" as const,
                label: "Margen contribucion",
                points: snapshot.lines[0].monthlyRevenue.map((point) =>
                  Math.round(point.value * ((snapshot.lines[0].finance.contributionMarginRate ?? 0))),
                ),
                value: formatSemanticCurrency(snapshot.lines[0].finance.contributionMargin),
              },
            ]
          : [
              {
                color: "blue" as const,
                label: "Facturacion neta",
                points: snapshot.lines.map((line) =>
                  Math.round(line.finance.netBilling / 1000),
                ),
                value: formatSemanticCurrency(aggregate.netBilling),
              },
              {
                color: "rose" as const,
                label: "Costo directo",
                points: snapshot.lines.map((line) =>
                  Math.round(line.finance.directCost / 1000),
                ),
                value: formatSemanticCurrency(aggregate.directCost),
              },
              {
                color: "teal" as const,
                label: "Margen contribucion",
                points: snapshot.lines.map((line) =>
                  Math.round(line.finance.contributionMargin / 1000),
                ),
                value: formatSemanticCurrency(aggregate.contributionMargin),
              },
            ],
      title: "Facturacion neta, costo directo y margen de contribucion",
      xLabels:
        snapshot.lines.length === 1
          ? ["Ene", "Feb", "Mar", "Abr", "May", "Jun"]
          : snapshot.lines.map((line) => line.shortName),
      yLabel: "USD miles",
    },
  };
}
