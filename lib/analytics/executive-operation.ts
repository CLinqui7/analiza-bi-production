import type { BusinessLineSlug } from "@/lib/analytics/business-line-operations";

export type OperationMetricStatus =
  | "available"
  | "warning"
  | "critical"
  | "pending-upload"
  | "not-connected"
  | "incomplete"
  | "calculated";

export type OperationMetric = {
  label: string;
  value: string;
  note: string;
  status: OperationMetricStatus;
};

export type OperationBlock = {
  title: string;
  description: string;
  metrics: OperationMetric[];
};

export type OperationComparisonRow = {
  line: string;
  volume: string;
  productivity: string;
  responseTime: string;
  quality: string;
  status: string;
  insight: string;
};

export type OperationTrendSeries = {
  label: string;
  value: string;
  color: "blue" | "orange" | "teal" | "green" | "rose" | "slate";
  points: number[];
};

export type OperationTrendInsight = {
  label: string;
  value: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
};

export type OperationTrendOption = {
  id: string;
  label: string;
  description: string;
  yLabel: string;
  series: OperationTrendSeries[];
  insights: OperationTrendInsight[];
};

export type OperationTrendChart = {
  title: string;
  description: string;
  xLabels: string[];
  yLabel: string;
  series: OperationTrendSeries[];
  insights: OperationTrendInsight[];
  metricOptions?: OperationTrendOption[];
};

export type ExecutiveOperationScreen = {
  slug: BusinessLineSlug;
  title: string;
  subtitle: string;
  description: string;
  primaryMetrics: OperationMetric[];
  trendChart: OperationTrendChart;
  blocks: OperationBlock[];
  comparisonRows?: OperationComparisonRow[];
};

const monthlyLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul"];

export const operationComparisonRows: OperationComparisonRow[] = [
  {
    line: "Laboratorio",
    volume: "Ordenes, pruebas y pacientes",
    productivity: "Pruebas por hora",
    responseTime: "Tiempo de entrega",
    quality: "Rechazos y repeticiones",
    status: "Rojo",
    insight:
      "Alto volumen con datos pendientes de LIS para tiempo de entrega y resultados.",
  },
  {
    line: "Fisioterapia",
    volume: "Sesiones y pacientes",
    productivity: "Sesiones por hora",
    responseTime: "Tiempo de atencion",
    quality: "Continuidad y resultados",
    status: "Amarillo",
    insight:
      "Agenda suficiente, pero la ocupacion real y continuidad terapeutica deben mejorar.",
  },
  {
    line: "Imagenes",
    volume: "Estudios y pacientes",
    productivity: "Estudios por hora",
    responseTime: "Tiempo de informe",
    quality: "Repeticiones y pendientes",
    status: "Verde",
    insight:
      "Utilizacion estable con oportunidad en horarios de baja demanda e informes.",
  },
];

const operationTrendOptions: Record<BusinessLineSlug, OperationTrendOption[]> = {
  consolidado: [
    {
      id: "productividad-normalizada",
      label: "Productividad normalizada",
      description:
        "Compara productividad 2026 contra el ano anterior y la meta, manteniendo separadas las unidades de cada linea.",
      yLabel: "Indice normalizado",
      series: [
        { label: "2026", value: "84%", color: "blue", points: [76, 78, 81, 79, 83, 84, 84] },
        { label: "2025", value: "78%", color: "orange", points: [71, 72, 74, 75, 76, 78, 78] },
        { label: "Meta", value: "90%", color: "teal", points: [88, 88, 89, 89, 90, 90, 90] },
      ],
      insights: [
        { label: "Vs 2025", value: "+6 pts", note: "Mejora operacional, pero todavia bajo meta consolidada.", tone: "positive" },
        { label: "Brecha meta", value: "-6 pts", note: "La brecha viene de capacidad y tiempos pendientes.", tone: "warning" },
        { label: "Lectura CEO", value: "4 alertas", note: "Revisar sucursales con desviacion antes de ampliar demanda.", tone: "warning" },
      ],
    },
    {
      id: "visitas-pacientes",
      label: "Visitas y pacientes",
      description:
        "Mide visitas o pacientes atendidos como demanda real, sin mezclar sesiones, ordenes y estudios.",
      yLabel: "Pacientes / visitas",
      series: [
        { label: "2026", value: "95,591", color: "blue", points: [71200, 74800, 80300, 84600, 90100, 95591, 95591] },
        { label: "2025", value: "87,420", color: "orange", points: [66200, 68900, 73100, 77000, 82300, 87420, 87420] },
        { label: "Meta", value: "101,000", color: "teal", points: [74000, 78500, 83500, 88500, 94500, 101000, 101000] },
      ],
      insights: [
        { label: "Demanda real", value: "+9%", note: "La red atrae mas pacientes, pero no toda la demanda se convierte en capacidad efectiva.", tone: "positive" },
        { label: "Brecha meta", value: "-5%", note: "La brecha no se resuelve solo con mas agenda; requiere productividad por linea.", tone: "warning" },
        { label: "Decision", value: "Separar lineas", note: "El CEO debe comparar pacientes por linea antes de invertir en expansion.", tone: "neutral" },
      ],
    },
    {
      id: "nivel-servicio",
      label: "Nivel de servicio",
      description:
        "Compara entrega, atencion e informes a tiempo para detectar atrasos que afectan experiencia y venta.",
      yLabel: "% servicio",
      series: [
        { label: "2026", value: "86%", color: "blue", points: [80, 82, 83, 84, 85, 86, 86] },
        { label: "2025", value: "81%", color: "orange", points: [76, 77, 79, 80, 80, 81, 81] },
        { label: "Meta", value: "92%", color: "teal", points: [90, 90, 91, 91, 92, 92, 92] },
      ],
      insights: [
        { label: "Mejora", value: "+5 pts", note: "El servicio mejora, pero todavia hay atrasos en informes y resultados.", tone: "positive" },
        { label: "Brecha", value: "-6 pts", note: "La brecha se debe revisar por sucursal y por proceso.", tone: "warning" },
        { label: "Riesgo", value: "Experiencia", note: "Atrasos recurrentes pueden reducir recurrencia y referidos.", tone: "warning" },
      ],
    },
    {
      id: "incidencias-criticas",
      label: "Incidencias criticas",
      description:
        "Muestra errores, repeticiones o atrasos criticos que requieren responsable y seguimiento.",
      yLabel: "Incidencias",
      series: [
        { label: "2026", value: "6", color: "rose", points: [11, 9, 8, 8, 7, 6, 6] },
        { label: "2025", value: "9", color: "orange", points: [14, 13, 12, 11, 10, 9, 9] },
        { label: "Meta", value: "3", color: "teal", points: [5, 5, 4, 4, 3, 3, 3] },
      ],
      insights: [
        { label: "Reduccion", value: "-3", note: "Menos incidencias que 2025, pero aun duplican la meta.", tone: "positive" },
        { label: "Meta", value: "+3", note: "Cada incidencia debe tener causa, costo e impacto operativo.", tone: "warning" },
        { label: "Accion", value: "Asignar dueno", note: "Auditoria debe guardar responsable y cierre de cada alerta.", tone: "warning" },
      ],
    },
  ],
  laboratorio: [
    {
      id: "ordenes-procesadas",
      label: "Ordenes procesadas",
      description:
        "Mide volumen operativo de laboratorio como ordenes procesadas; la parte financiera se mide aparte como ingreso, costo y margen.",
      yLabel: "Ordenes",
      series: [
        { label: "2026 ordenes", value: "8,806", color: "blue", points: [6900, 7040, 7560, 7810, 8240, 8806, 8806] },
        { label: "2025 ordenes", value: "7,840", color: "orange", points: [6120, 6410, 6880, 7010, 7350, 7840, 7840] },
        { label: "Meta", value: "9,200", color: "teal", points: [7200, 7400, 7800, 8200, 8600, 9200, 9200] },
      ],
      insights: [
        { label: "Crecimiento", value: "+12%", note: "Mas ordenes que el ano anterior, con capacidad tecnica pendiente.", tone: "positive" },
        { label: "Contra meta", value: "-4%", note: "La meta no se alcanza si no se desbloquean pruebas por hora.", tone: "warning" },
        { label: "Riesgo operativo", value: "LIS pendiente", note: "Sin LIS no hay lectura real de TAT ni resultado pendiente.", tone: "negative" },
      ],
    },
    {
      id: "visitas-pacientes-lab",
      label: "Visitas / pacientes",
      description:
        "Compara pacientes recibidos en laboratorio para ver demanda real antes del flujo tecnico de muestras.",
      yLabel: "Pacientes",
      series: [
        { label: "2026 pacientes", value: "93,791", color: "blue", points: [68400, 70200, 74400, 78100, 84200, 93791, 93791] },
        { label: "2025 pacientes", value: "84,600", color: "orange", points: [62100, 64800, 69200, 72100, 77600, 84600, 84600] },
        { label: "Meta", value: "98,500", color: "teal", points: [70000, 73500, 78000, 82500, 89000, 98500, 98500] },
      ],
      insights: [
        { label: "Demanda", value: "+11%", note: "La base de pacientes crece mas rapido que la capacidad documentada.", tone: "positive" },
        { label: "Dato clave", value: "Deduplicar", note: "La plantilla debe confirmar pacientes unicos para no inflar visitas.", tone: "warning" },
        { label: "Operacion", value: "Rutas pico", note: "Comparar por hora ayuda a ajustar flebotomistas y transporte.", tone: "neutral" },
      ],
    },
    {
      id: "muestras-pendientes",
      label: "Muestras pendientes",
      description:
        "Mide cola operativa de muestras; menor valor significa mejor flujo tecnico.",
      yLabel: "Muestras",
      series: [
        { label: "2026 pendientes", value: "212", color: "rose", points: [286, 264, 248, 236, 224, 212, 212] },
        { label: "2025 pendientes", value: "260", color: "orange", points: [340, 318, 302, 286, 274, 260, 260] },
        { label: "Meta", value: "120", color: "teal", points: [190, 175, 160, 145, 132, 120, 120] },
      ],
      insights: [
        { label: "Mejora", value: "-18%", note: "La cola baja contra 2025, pero sigue alta para entregar resultados a tiempo.", tone: "positive" },
        { label: "Brecha", value: "+92", note: "Pendientes sobre meta elevan riesgo de atrasos y reclamos.", tone: "warning" },
        { label: "Foco", value: "Preanalitica", note: "Separar muestras rechazadas, repetidas y en espera por area tecnica.", tone: "warning" },
      ],
    },
    {
      id: "capacidad-utilizada-lab",
      label: "Capacidad utilizada",
      description:
        "Compara uso estimado de analizadores y personal tecnico contra meta de capacidad.",
      yLabel: "% capacidad",
      series: [
        { label: "2026 capacidad", value: "78%", color: "blue", points: [64, 66, 70, 72, 75, 78, 78] },
        { label: "2025 capacidad", value: "71%", color: "orange", points: [59, 61, 64, 66, 69, 71, 71] },
        { label: "Meta", value: "85%", color: "teal", points: [80, 81, 82, 83, 84, 85, 85] },
      ],
      insights: [
        { label: "Mejora", value: "+7 pts", note: "La capacidad se usa mejor, pero faltan datos por analizador.", tone: "positive" },
        { label: "Brecha meta", value: "-7 pts", note: "Si no sube pruebas por hora, la demanda se convierte en cola.", tone: "warning" },
        { label: "Fuente", value: "LIS/equipo", note: "Conectar capacidad tecnica vuelve este KPI auditable.", tone: "neutral" },
      ],
    },
  ],
  fisioterapia: [
    {
      id: "sesiones-atendidas",
      label: "Sesiones atendidas",
      description:
        "Compara continuidad terapeutica y ocupacion real para entender si la demanda se convierte en atencion efectiva.",
      yLabel: "Sesiones",
      series: [
        { label: "2026 sesiones", value: "2,840", color: "blue", points: [2280, 2360, 2490, 2580, 2710, 2840, 2840] },
        { label: "2025 sesiones", value: "2,590", color: "orange", points: [2070, 2140, 2260, 2350, 2450, 2590, 2590] },
        { label: "Meta", value: "3,120", color: "teal", points: [2400, 2520, 2640, 2760, 2940, 3120, 3120] },
      ],
      insights: [
        { label: "Vs 2025", value: "+10%", note: "La produccion mejora, pero no al ritmo de la agenda.", tone: "positive" },
        { label: "Brecha real", value: "61%", note: "La ocupacion real sigue debajo de la agenda.", tone: "warning" },
        { label: "Fuga operativa", value: "98 no-show", note: "Impacta continuidad, horas ociosas y abandono de planes.", tone: "warning" },
      ],
    },
    {
      id: "visitas-atendidas",
      label: "Visitas atendidas",
      description:
        "Mide pacientes o visitas reales atendidas, separado de sesiones indicadas y paquetes vendidos.",
      yLabel: "Visitas",
      series: [
        { label: "2026 visitas", value: "1,180", color: "blue", points: [910, 944, 1002, 1048, 1110, 1180, 1180] },
        { label: "2025 visitas", value: "1,070", color: "orange", points: [820, 862, 906, 948, 1004, 1070, 1070] },
        { label: "Meta", value: "1,320", color: "teal", points: [980, 1040, 1100, 1160, 1240, 1320, 1320] },
      ],
      insights: [
        { label: "Crecimiento", value: "+10%", note: "Hay mas visitas, pero falta convertir agenda en asistencia efectiva.", tone: "positive" },
        { label: "Brecha meta", value: "-11%", note: "El no-show y la reprogramacion explican parte de la diferencia.", tone: "warning" },
        { label: "Decision", value: "Confirmacion", note: "Medir confirmaciones por sucursal ayuda a recuperar visitas.", tone: "warning" },
      ],
    },
    {
      id: "ocupacion-real",
      label: "Ocupacion real",
      description:
        "Compara horas atendidas contra horas disponibles para ver capacidad realmente aprovechada.",
      yLabel: "% ocupacion",
      series: [
        { label: "2026 ocupacion", value: "61%", color: "blue", points: [54, 55, 57, 58, 60, 61, 61] },
        { label: "2025 ocupacion", value: "57%", color: "orange", points: [50, 51, 53, 54, 55, 57, 57] },
        { label: "Meta", value: "78%", color: "teal", points: [68, 70, 72, 74, 76, 78, 78] },
      ],
      insights: [
        { label: "Mejora", value: "+4 pts", note: "La ocupacion sube, pero todavia hay horas ociosas relevantes.", tone: "positive" },
        { label: "Brecha", value: "-17 pts", note: "Demanda suficiente no significa agenda efectiva.", tone: "warning" },
        { label: "Accion", value: "Horas ociosas", note: "Cruzar con no-show y cancelacion por fisioterapeuta.", tone: "warning" },
      ],
    },
    {
      id: "no-shows-fisio",
      label: "No-shows",
      description:
        "Mide ausencias que rompen continuidad terapeutica y desperdician capacidad disponible.",
      yLabel: "No-shows",
      series: [
        { label: "2026 no-show", value: "98", color: "rose", points: [82, 88, 91, 94, 96, 98, 98] },
        { label: "2025 no-show", value: "112", color: "orange", points: [96, 102, 107, 109, 111, 112, 112] },
        { label: "Meta", value: "55", color: "teal", points: [72, 68, 64, 60, 58, 55, 55] },
      ],
      insights: [
        { label: "Vs 2025", value: "-13%", note: "Bajan las ausencias, pero siguen costando horas e ingreso.", tone: "positive" },
        { label: "Brecha", value: "+43", note: "La meta requiere confirmacion y seguimiento de planes.", tone: "warning" },
        { label: "Impacto", value: "Capacidad", note: "Cada no-show debe verse tambien en Salud financiera.", tone: "warning" },
      ],
    },
  ],
  imagenes: [
    {
      id: "estudios-realizados",
      label: "Estudios realizados",
      description:
        "Compara volumen diagnostico contra el ano anterior y la meta operacional por capacidad de equipo.",
      yLabel: "Estudios",
      series: [
        { label: "2026 estudios", value: "521", color: "blue", points: [438, 452, 481, 493, 508, 521, 521] },
        { label: "2025 estudios", value: "492", color: "orange", points: [410, 421, 438, 456, 472, 492, 492] },
        { label: "Meta", value: "640", color: "teal", points: [510, 530, 555, 580, 610, 640, 640] },
      ],
      insights: [
        { label: "Vs 2025", value: "+6%", note: "Mejora el volumen, pero queda capacidad de equipo disponible.", tone: "positive" },
        { label: "Brecha meta", value: "-19%", note: "La utilizacion real de 63% limita produccion y margen.", tone: "warning" },
        { label: "Backlog", value: "38 informes", note: "Informes pendientes pueden atrasar entrega y facturacion.", tone: "warning" },
      ],
    },
    {
      id: "solicitudes-recibidas",
      label: "Solicitudes recibidas",
      description:
        "Mide demanda diagnostica antes de agenda, confirmacion y realizacion de estudios.",
      yLabel: "Solicitudes",
      series: [
        { label: "2026 solicitudes", value: "760", color: "blue", points: [610, 632, 675, 704, 732, 760, 760] },
        { label: "2025 solicitudes", value: "690", color: "orange", points: [552, 574, 604, 628, 655, 690, 690] },
        { label: "Meta", value: "820", color: "teal", points: [650, 680, 710, 746, 784, 820, 820] },
      ],
      insights: [
        { label: "Demanda", value: "+10%", note: "Llegan mas solicitudes que el ano anterior.", tone: "positive" },
        { label: "Conversion", value: "69%", note: "No todas las solicitudes llegan a estudio realizado.", tone: "warning" },
        { label: "Accion", value: "Agenda", note: "Separar por modalidad y sucursal muestra donde se pierden estudios.", tone: "warning" },
      ],
    },
    {
      id: "informes-pendientes",
      label: "Informes pendientes",
      description:
        "Mide backlog de informes pendientes que atrasa entrega clinica y facturacion.",
      yLabel: "Informes",
      series: [
        { label: "2026 pendientes", value: "38", color: "rose", points: [52, 49, 46, 44, 41, 38, 38] },
        { label: "2025 pendientes", value: "44", color: "orange", points: [61, 57, 54, 50, 47, 44, 44] },
        { label: "Meta", value: "20", color: "teal", points: [34, 31, 28, 25, 22, 20, 20] },
      ],
      insights: [
        { label: "Mejora", value: "-14%", note: "El backlog baja contra 2025, pero sigue sobre meta.", tone: "positive" },
        { label: "Brecha", value: "+18", note: "Informes pendientes pueden bloquear facturacion y confianza medica.", tone: "warning" },
        { label: "Fuente", value: "RIS/PACS", note: "Conectar timestamps permitira medir SLA real.", tone: "neutral" },
      ],
    },
    {
      id: "utilizacion-real",
      label: "Utilizacion real",
      description:
        "Compara horas utilizadas de equipo contra disponibilidad real para ver capacidad ociosa.",
      yLabel: "% utilizacion",
      series: [
        { label: "2026 utilizacion", value: "63%", color: "blue", points: [54, 56, 58, 60, 62, 63, 63] },
        { label: "2025 utilizacion", value: "59%", color: "orange", points: [50, 52, 54, 55, 57, 59, 59] },
        { label: "Meta", value: "78%", color: "teal", points: [68, 70, 72, 74, 76, 78, 78] },
      ],
      insights: [
        { label: "Mejora", value: "+4 pts", note: "El equipo se usa mas, pero no lo suficiente para cerrar la brecha.", tone: "positive" },
        { label: "Brecha", value: "-15 pts", note: "La capacidad ociosa debe compararse por modalidad y equipo.", tone: "warning" },
        { label: "Riesgo", value: "Equipo detenido", note: "Horas sin uso se convierten en perdida financiera.", tone: "warning" },
      ],
    },
  ],
};

export const executiveOperationScreens: Record<
  BusinessLineSlug,
  ExecutiveOperationScreen
> = {
  consolidado: {
    slug: "consolidado",
    title: "Operacion ejecutiva consolidada",
    subtitle: "Indicadores comparables sin mezclar unidades",
    description:
      "Muestra la salud operacional de las tres lineas sin sumar ordenes, sesiones y estudios como si fueran una sola unidad.",
    primaryMetrics: [
      {
        label: "Pacientes unicos",
        value: "95,591",
        note: "deduplicacion anonima DEMO",
        status: "incomplete",
      },
      {
        label: "Ingresos asociados a la operacion",
        value: "$1.18M",
        note: "USD, plantillas y DEMO",
        status: "calculated",
      },
      {
        label: "Cumplimiento de volumen",
        value: "91%",
        note: "normalizado por linea",
        status: "available",
      },
      {
        label: "Productividad normalizada",
        value: "84%",
        note: "contra meta de cada linea",
        status: "available",
      },
      {
        label: "Nivel de servicio",
        value: "86%",
        note: "entrega, atencion e informes",
        status: "warning",
      },
      {
        label: "Incidencias criticas",
        value: "6",
        note: "requieren responsable",
        status: "critical",
      },
      {
        label: "Calidad operativa",
        value: "82%",
        note: "completitud y trazabilidad",
        status: "warning",
      },
      {
        label: "Sucursales con desviaciones",
        value: "4",
        note: "meta, calidad o capacidad",
        status: "warning",
      },
    ],
    trendChart: {
      title: "Tendencia operativa normalizada",
      description:
        "Compara productividad operacional 2026 contra 2025 y meta, sin sumar unidades incompatibles entre lineas.",
      xLabels: monthlyLabels,
      yLabel: "Indice normalizado",
      metricOptions: operationTrendOptions.consolidado,
      series: [
        {
          label: "2026",
          value: "84%",
          color: "blue",
          points: [76, 78, 81, 79, 83, 84, 84],
        },
        {
          label: "2025",
          value: "78%",
          color: "orange",
          points: [71, 72, 74, 75, 76, 78, 78],
        },
        {
          label: "Meta",
          value: "90%",
          color: "teal",
          points: [88, 88, 89, 89, 90, 90, 90],
        },
      ],
      insights: [
        {
          label: "Vs 2025",
          value: "+6 pts",
          note: "Mejora operacional, pero todavia bajo meta consolidada.",
          tone: "positive",
        },
        {
          label: "Brecha meta",
          value: "-6 pts",
          note: "La brecha viene sobre todo de capacidad y tiempos pendientes.",
          tone: "warning",
        },
        {
          label: "Lectura CEO",
          value: "4 alertas",
          note: "Revisar sucursales con desviacion antes de ampliar demanda.",
          tone: "warning",
        },
      ],
    },
    comparisonRows: operationComparisonRows,
    blocks: [
      {
        title: "Comparacion por linea",
        description:
          "Cada linea conserva su volumen principal y su medida de productividad.",
        metrics: [
          {
            label: "Laboratorio",
            value: "Ordenes",
            note: "pruebas por hora y tiempo de entrega",
            status: "warning",
          },
          {
            label: "Fisioterapia",
            value: "Sesiones",
            note: "sesiones por hora y continuidad",
            status: "warning",
          },
          {
            label: "Imagenes",
            value: "Estudios",
            note: "estudios por hora y tiempo de informe",
            status: "available",
          },
        ],
      },
    ],
  },
  laboratorio: {
    slug: "laboratorio",
    title: "Operacion de laboratorio",
    subtitle: "Ordenes, muestras, pruebas, resultados y capacidad tecnica",
    description:
      "Pantalla operacional para laboratorio. No usa no-show salvo que exista una reserva formal; el foco es orden, paciente, muestra, prueba y resultado.",
    primaryMetrics: [
      {
        label: "Ordenes recibidas",
        value: "9,034",
        note: "plantillas SV DEMO",
        status: "available",
      },
      {
        label: "Ordenes procesadas",
        value: "8,806",
        note: "estimado por flujo de muestras",
        status: "available",
      },
      {
        label: "Pacientes unicos",
        value: "93,791",
        note: "requiere deduplicacion real",
        status: "incomplete",
      },
      {
        label: "Capacidad utilizada",
        value: "Pendiente",
        note: "requiere capacidad por analizador",
        status: "pending-upload",
      },
    ],
    trendChart: {
      title: "Ordenes procesadas vs ano anterior y meta",
      description:
        "Mide volumen operativo de laboratorio como ordenes procesadas; la parte financiera se mide aparte como ingreso, costo y margen.",
      xLabels: monthlyLabels,
      yLabel: "Ordenes",
      metricOptions: operationTrendOptions.laboratorio,
      series: [
        {
          label: "2026 ordenes",
          value: "8,806",
          color: "blue",
          points: [6900, 7040, 7560, 7810, 8240, 8806, 8806],
        },
        {
          label: "2025 ordenes",
          value: "7,840",
          color: "orange",
          points: [6120, 6410, 6880, 7010, 7350, 7840, 7840],
        },
        {
          label: "Meta",
          value: "9,200",
          color: "teal",
          points: [7200, 7400, 7800, 8200, 8600, 9200, 9200],
        },
      ],
      insights: [
        {
          label: "Crecimiento",
          value: "+12%",
          note: "Mas ordenes que el ano anterior, con capacidad tecnica pendiente.",
          tone: "positive",
        },
        {
          label: "Contra meta",
          value: "-4%",
          note: "La meta no se alcanza si no se desbloquean pruebas por hora.",
          tone: "warning",
        },
        {
          label: "Riesgo operativo",
          value: "LIS pendiente",
          note: "Sin LIS no hay lectura real de TAT ni resultado pendiente.",
          tone: "negative",
        },
      ],
    },
    blocks: [
      {
        title: "A. Ordenes y pacientes",
        description:
          "Volumen principal de laboratorio por orden, origen de paciente y tipo de servicio.",
        metrics: [
          { label: "Ordenes recibidas", value: "9,034", note: "volumen base", status: "available" },
          { label: "Ordenes procesadas", value: "8,806", note: "muestras avanzadas", status: "available" },
          { label: "Ordenes pendientes", value: "228", note: "requiere seguimiento", status: "warning" },
          { label: "Pacientes unicos", value: "93,791", note: "deduplicacion pendiente", status: "incomplete" },
          { label: "Pacientes Analiza", value: "5,840", note: "canal DEMO", status: "available" },
          { label: "Pacientes DRSV", value: "2,120", note: "canal DEMO", status: "available" },
          { label: "Ordenes medicas", value: "7,006", note: "orden medica registrada", status: "available" },
          { label: "Servicios a domicilio", value: "418", note: "domicilio DEMO", status: "available" },
          { label: "Pruebas por orden", value: "Pendiente de carga", note: "falta detalle por prueba", status: "pending-upload" },
          { label: "Perfiles por orden", value: "Pendiente de carga", note: "falta catalogo de perfiles", status: "pending-upload" },
        ],
      },
      {
        title: "B. Flujo de muestras",
        description:
          "Embudo: Orden recibida -> paciente atendido -> muestra tomada -> muestra procesada -> resultado validado -> resultado entregado.",
        metrics: [
          { label: "Muestras recibidas", value: "8,806", note: "estimado DEMO", status: "available" },
          { label: "Muestras pendientes", value: "212", note: "cola de proceso", status: "warning" },
          { label: "Muestras rechazadas", value: "38", note: "calidad preanalitica", status: "warning" },
          { label: "Recolecciones repetidas", value: "17", note: "requiere motivo", status: "warning" },
          { label: "Motivos de rechazo", value: "Pendiente de carga", note: "catalogo requerido", status: "pending-upload" },
          { label: "Pruebas repetidas", value: "Datos pendientes de conexion", note: "requiere LIS", status: "not-connected" },
          { label: "Resultados corregidos", value: "Datos pendientes de conexion", note: "requiere LIS", status: "not-connected" },
          { label: "Resultados pendientes", value: "Datos pendientes de conexion", note: "requiere LIS", status: "not-connected" },
        ],
      },
      {
        title: "C. Tiempo de entrega",
        description:
          "Tiempos desde orden/muestra hasta validacion y entrega del resultado.",
        metrics: [
          { label: "Tiempo promedio de entrega", value: "Datos pendientes de conexion", note: "requiere LIS", status: "not-connected" },
          { label: "Mediana de entrega", value: "Datos pendientes de conexion", note: "requiere marcas de tiempo", status: "not-connected" },
          { label: "Porcentaje dentro del tiempo prometido", value: "Pendiente", note: "requiere SLA por prueba", status: "pending-upload" },
          { label: "Resultados fuera de plazo", value: "Datos pendientes de conexion", note: "requiere validacion", status: "not-connected" },
          { label: "Tiempo por area tecnica", value: "Pendiente de carga", note: "area tecnica requerida", status: "pending-upload" },
          { label: "Tiempo por tipo de prueba", value: "Pendiente de carga", note: "catalogo requerido", status: "pending-upload" },
          { label: "Tiempo por sucursal", value: "Pendiente de carga", note: "requiere timestamps", status: "pending-upload" },
          { label: "Valores criticos pendientes de notificacion", value: "Datos pendientes de conexion", note: "requiere LIS/alertas", status: "not-connected" },
        ],
      },
      {
        title: "D. Demanda por dia y hora",
        description:
          "Patrones de demanda para turnos, staffing, rutas y capacidad por franja.",
        metrics: [
          { label: "Ordenes por dia", value: "291", note: "promedio DEMO", status: "available" },
          { label: "Pacientes por dia", value: "287", note: "pacientes recibidos", status: "available" },
          { label: "Pruebas por hora", value: "Pendiente de carga", note: "requiere detalle prueba/hora", status: "pending-upload" },
          { label: "Horarios pico", value: "07:00-10:00", note: "estimado DEMO", status: "available" },
          { label: "Horarios de baja demanda", value: "14:00-16:00", note: "estimado DEMO", status: "available" },
          { label: "Demanda por dia de la semana", value: "Pendiente de carga", note: "requiere historico", status: "pending-upload" },
          { label: "Volumen por area tecnica", value: "Pendiente de carga", note: "requiere area tecnica", status: "pending-upload" },
        ],
      },
      {
        title: "E. Productividad",
        description:
          "Rendimiento por colaborador, flebotomista, TMB, analizador y hora.",
        metrics: [
          { label: "Ordenes por colaborador", value: "38", note: "promedio DEMO", status: "available" },
          { label: "Pacientes por flebotomista", value: "44", note: "promedio DEMO", status: "available" },
          { label: "Muestras por flebotomista", value: "43", note: "promedio DEMO", status: "available" },
          { label: "Pruebas por TMB", value: "Pendiente de carga", note: "requiere pruebas por tecnico", status: "pending-upload" },
          { label: "Pruebas por analizador", value: "Datos pendientes de conexion", note: "requiere equipo/LIS", status: "not-connected" },
          { label: "Productividad por hora", value: "Pendiente de carga", note: "requiere turnos", status: "pending-upload" },
          { label: "Personal disponible versus requerido", value: "Calculado", note: "segun demanda por hora", status: "calculated" },
        ],
      },
      {
        title: "F. Capacidad tecnica",
        description:
          "Capacidad por analizador, equipos activos, cola de muestras y saturacion por area.",
        metrics: [
          { label: "Capacidad estimada por analizador", value: "Pendiente de carga", note: "requiere ficha tecnica", status: "pending-upload" },
          { label: "Capacidad utilizada", value: "Pendiente de carga", note: "pruebas procesadas/capacidad", status: "pending-upload" },
          { label: "Equipos activos", value: "Pendiente de carga", note: "inventario tecnico", status: "pending-upload" },
          { label: "Equipos fuera de servicio", value: "Datos pendientes de conexion", note: "mantenimiento/equipo", status: "not-connected" },
          { label: "Cola de muestras", value: "Datos pendientes de conexion", note: "requiere LIS", status: "not-connected" },
          { label: "Saturacion por area", value: "Pendiente de carga", note: "area tecnica requerida", status: "pending-upload" },
          { label: "Tiempo de inactividad", value: "Datos pendientes de conexion", note: "requiere eventos equipo", status: "not-connected" },
          { label: "Capacidad perdida", value: "Calculado", note: "fallas + cola + no disponibilidad", status: "calculated" },
        ],
      },
    ],
  },
  fisioterapia: {
    slug: "fisioterapia",
    title: "Operacion de fisioterapia",
    subtitle: "Agenda, atencion, capacidad, continuidad, resultados y productividad",
    description:
      "Pantalla operacional para entender demanda, cumplimiento terapeutico, ocupacion real y productividad profesional.",
    primaryMetrics: [
      { label: "Citas agendadas", value: "1,540", note: "agenda DEMO", status: "available" },
      { label: "Citas atendidas", value: "1,320", note: "86% asistencia", status: "available" },
      { label: "Ocupacion real", value: "61%", note: "horas atendidas/disponibles", status: "warning" },
      { label: "Planes activos", value: "412", note: "continuidad DEMO", status: "available" },
    ],
    trendChart: {
      title: "Sesiones atendidas vs ano anterior y meta",
      description:
        "Compara continuidad terapeutica y ocupacion real para entender si la demanda se convierte en atencion efectiva.",
      xLabels: monthlyLabels,
      yLabel: "Sesiones",
      metricOptions: operationTrendOptions.fisioterapia,
      series: [
        {
          label: "2026 sesiones",
          value: "2,840",
          color: "blue",
          points: [2280, 2360, 2490, 2580, 2710, 2840, 2840],
        },
        {
          label: "2025 sesiones",
          value: "2,590",
          color: "orange",
          points: [2070, 2140, 2260, 2350, 2450, 2590, 2590],
        },
        {
          label: "Meta",
          value: "3,120",
          color: "teal",
          points: [2400, 2520, 2640, 2760, 2940, 3120, 3120],
        },
      ],
      insights: [
        {
          label: "Vs 2025",
          value: "+10%",
          note: "La produccion mejora, pero no al ritmo de la agenda.",
          tone: "positive",
        },
        {
          label: "Brecha real",
          value: "61%",
          note: "La ocupacion real sigue debajo de la agenda.",
          tone: "warning",
        },
        {
          label: "Fuga operativa",
          value: "98 no-show",
          note: "Impacta continuidad, horas ociosas y abandono de planes.",
          tone: "warning",
        },
      ],
    },
    blocks: [
      {
        title: "A. Agenda",
        description: "Estado de agenda, confirmacion, cancelacion y disponibilidad.",
        metrics: [
          { label: "Citas agendadas", value: "1,540", note: "periodo seleccionado", status: "available" },
          { label: "Citas confirmadas", value: "1,392", note: "90% confirmacion", status: "available" },
          { label: "Citas atendidas", value: "1,320", note: "asistencia efectiva", status: "available" },
          { label: "Cancelaciones", value: "74", note: "sobre agenda", status: "warning" },
          { label: "No-show", value: "98", note: "agenda terapeutica", status: "warning" },
          { label: "Reprogramaciones", value: "48", note: "movimientos de agenda", status: "available" },
          { label: "Tiempo hasta la proxima cita disponible", value: "3.1 dias", note: "promedio red", status: "available" },
        ],
      },
      {
        title: "B. Atencion",
        description: "Produccion asistencial por paciente, sesion y fisioterapeuta.",
        metrics: [
          { label: "Pacientes atendidos", value: "1,180", note: "pacientes DEMO", status: "available" },
          { label: "Evaluaciones iniciales", value: "286", note: "entrada de planes", status: "available" },
          { label: "Sesiones realizadas", value: "2,840", note: "volumen terapeutico", status: "available" },
          { label: "Duracion promedio", value: "42 min", note: "promedio sesion", status: "available" },
          { label: "Tiempo real versus estandar", value: "+6 min", note: "brecha atencion", status: "warning" },
          { label: "Sesiones por hora", value: "1.4", note: "por hora disponible", status: "available" },
          { label: "Pacientes por fisioterapeuta", value: "17", note: "promedio dia", status: "available" },
        ],
      },
      {
        title: "C. Capacidad",
        description: "Diferencia entre horas disponibles, agendadas y atendidas.",
        metrics: [
          { label: "Horas disponibles", value: "160 h", note: "fisioterapeutas", status: "available" },
          { label: "Horas agendadas", value: "128 h", note: "80% agenda", status: "available" },
          { label: "Horas atendidas", value: "98 h", note: "61% real", status: "warning" },
          { label: "Ocupacion agendada", value: "80%", note: "agenda/disponible", status: "available" },
          { label: "Ocupacion real", value: "61%", note: "atendida/disponible", status: "warning" },
          { label: "Horas ociosas", value: "62 h", note: "capacidad disponible", status: "warning" },
          { label: "Capacidad perdida", value: "$7.8K", note: "no-show y cancelacion", status: "warning" },
          { label: "Lista de espera", value: "18", note: "pacientes", status: "available" },
        ],
      },
      {
        title: "D. Continuidad terapeutica",
        description: "Cumplimiento de planes, sesiones restantes y riesgo de abandono.",
        metrics: [
          { label: "Planes activos", value: "412", note: "pacientes con plan", status: "available" },
          { label: "Sesiones indicadas", value: "3,504", note: "segun planes", status: "available" },
          { label: "Sesiones realizadas", value: "2,840", note: "avance real", status: "available" },
          { label: "Porcentaje de cumplimiento", value: "81%", note: "real/indicadas", status: "warning" },
          { label: "Sesiones restantes", value: "664", note: "pendientes", status: "warning" },
          { label: "Pacientes en riesgo de abandono", value: "36", note: "brecha de continuidad", status: "warning" },
          { label: "Abandono por numero de sesion", value: "Sesion 3", note: "punto critico DEMO", status: "available" },
          { label: "Tiempo promedio entre sesiones", value: "5.6 dias", note: "continuidad", status: "available" },
        ],
      },
      {
        title: "E. Resultados",
        description: "Resultado clinico-operativo y experiencia del paciente.",
        metrics: [
          { label: "Altas terapeuticas", value: "214", note: "periodo DEMO", status: "available" },
          { label: "Mejora funcional", value: "72%", note: "requiere escala estandar", status: "incomplete" },
          { label: "Dolor inicial versus actual", value: "-38%", note: "escala DEMO", status: "available" },
          { label: "Objetivos alcanzados", value: "68%", note: "segun plan", status: "warning" },
          { label: "Casos sin progreso", value: "24", note: "requieren revision", status: "warning" },
          { label: "Reingresos", value: "19", note: "seguimiento", status: "warning" },
          { label: "Satisfaccion", value: "91%", note: "encuesta DEMO", status: "available" },
        ],
      },
      {
        title: "F. Productividad profesional",
        description: "Rendimiento por fisioterapeuta para gestion y bonos.",
        metrics: [
          { label: "Ocupacion por fisioterapeuta", value: "74%", note: "promedio agenda", status: "available" },
          { label: "Sesiones por fisioterapeuta", value: "118", note: "mensual DEMO", status: "available" },
          { label: "Ingreso relacionado", value: "$94.2K", note: "ingreso asociado", status: "available" },
          { label: "Ingreso por hora", value: "$74", note: "hora atendida", status: "available" },
          { label: "Cumplimiento de planes", value: "81%", note: "planes terapeuticos", status: "warning" },
          { label: "Satisfaccion", value: "91%", note: "paciente", status: "available" },
          { label: "No-show de su agenda", value: "6%", note: "por profesional", status: "warning" },
        ],
      },
    ],
  },
  imagenes: {
    slug: "imagenes",
    title: "Operacion de imagenes",
    subtitle: "Solicitudes, estudios, equipos, informes, calidad y productividad",
    description:
      "Pantalla operacional para visualizar agenda diagnostica, produccion por modalidad, informes y utilizacion de equipos.",
    primaryMetrics: [
      { label: "Solicitudes recibidas", value: "760", note: "DEMO", status: "available" },
      { label: "Estudios realizados", value: "521", note: "68.6% de solicitudes", status: "warning" },
      { label: "Informes pendientes", value: "38", note: "requiere seguimiento", status: "warning" },
      { label: "Utilizacion real", value: "63%", note: "horas utilizadas/equipo", status: "warning" },
    ],
    trendChart: {
      title: "Estudios realizados vs ano anterior y meta",
      description:
        "Compara volumen diagnostico contra el ano anterior y la meta operacional por capacidad de equipo.",
      xLabels: monthlyLabels,
      yLabel: "Estudios",
      metricOptions: operationTrendOptions.imagenes,
      series: [
        {
          label: "2026 estudios",
          value: "521",
          color: "blue",
          points: [438, 452, 481, 493, 508, 521, 521],
        },
        {
          label: "2025 estudios",
          value: "492",
          color: "orange",
          points: [410, 421, 438, 456, 472, 492, 492],
        },
        {
          label: "Meta",
          value: "640",
          color: "teal",
          points: [510, 530, 555, 580, 610, 640, 640],
        },
      ],
      insights: [
        {
          label: "Vs 2025",
          value: "+6%",
          note: "Mejora el volumen, pero queda capacidad de equipo disponible.",
          tone: "positive",
        },
        {
          label: "Brecha meta",
          value: "-19%",
          note: "La utilizacion real de 63% limita produccion y margen.",
          tone: "warning",
        },
        {
          label: "Backlog",
          value: "38 informes",
          note: "Informes pendientes pueden atrasar entrega y facturacion.",
          tone: "warning",
        },
      ],
    },
    blocks: [
      {
        title: "A. Solicitudes y agenda",
        description: "Demanda diagnostica desde solicitud hasta agenda confirmada.",
        metrics: [
          { label: "Solicitudes recibidas", value: "760", note: "periodo DEMO", status: "available" },
          { label: "Estudios agendados", value: "668", note: "88% conversion", status: "available" },
          { label: "Estudios confirmados", value: "615", note: "92% confirmacion", status: "available" },
          { label: "Estudios realizados", value: "521", note: "realizacion", status: "available" },
          { label: "Cancelaciones", value: "47", note: "agenda", status: "warning" },
          { label: "No-show", value: "66", note: "agenda de estudios", status: "warning" },
          { label: "Reprogramaciones", value: "34", note: "movimientos", status: "available" },
          { label: "Lista de espera", value: "42", note: "demanda pendiente", status: "warning" },
        ],
      },
      {
        title: "B. Produccion",
        description: "Estudios por modalidad, equipo, tecnico, hora y sucursal.",
        metrics: [
          { label: "Estudios por modalidad", value: "Pendiente de carga", note: "catalogo modalidad", status: "pending-upload" },
          { label: "Estudios por equipo", value: "Datos pendientes de conexion", note: "requiere RIS/PACS", status: "not-connected" },
          { label: "Estudios por hora", value: "4.3", note: "DEMO", status: "available" },
          { label: "Estudios por tecnico", value: "86", note: "mensual DEMO", status: "available" },
          { label: "Estudios con contraste", value: "Pendiente de carga", note: "campo requerido", status: "pending-upload" },
          { label: "Estudios urgentes", value: "Pendiente de carga", note: "prioridad requerida", status: "pending-upload" },
          { label: "Volumen por sucursal", value: "521", note: "sucursal activa", status: "available" },
        ],
      },
      {
        title: "C. Informes",
        description: "Trazabilidad de informe desde estudio realizado hasta entrega.",
        metrics: [
          { label: "Estudios pendientes de informe", value: "38", note: "backlog", status: "warning" },
          { label: "Estudios informados", value: "483", note: "realizados con informe", status: "available" },
          { label: "Informes validados", value: "460", note: "validacion medica", status: "available" },
          { label: "Informes entregados", value: "460", note: "entrega DEMO", status: "available" },
          { label: "Tiempo promedio de informe", value: "Datos pendientes de conexion", note: "requiere RIS/PACS", status: "not-connected" },
          { label: "Porcentaje dentro del tiempo prometido", value: "Pendiente", note: "requiere SLA por modalidad", status: "pending-upload" },
          { label: "Informes atrasados", value: "Datos pendientes de conexion", note: "requiere marcas de tiempo", status: "not-connected" },
        ],
      },
      {
        title: "D. Equipos",
        description: "Horas disponibles, programadas, utilizadas y mantenimiento.",
        metrics: [
          { label: "Horas disponibles", value: "120 h", note: "equipos DEMO", status: "available" },
          { label: "Horas programadas", value: "84 h", note: "agenda", status: "available" },
          { label: "Horas utilizadas", value: "76 h", note: "uso real", status: "available" },
          { label: "Utilizacion real", value: "63%", note: "utilizadas/disponibles", status: "warning" },
          { label: "Tiempo muerto", value: "14 h", note: "preparacion y espera", status: "warning" },
          { label: "Tiempo fuera de servicio", value: "Datos pendientes de conexion", note: "requiere mantenimiento", status: "not-connected" },
          { label: "Mantenimiento preventivo", value: "Datos pendientes de conexion", note: "requiere equipo", status: "not-connected" },
          { label: "Mantenimiento correctivo", value: "Datos pendientes de conexion", note: "requiere equipo", status: "not-connected" },
          { label: "Capacidad perdida por fallas", value: "Calculado", note: "fallas + agenda", status: "calculated" },
        ],
      },
      {
        title: "E. Calidad",
        description: "Repeticiones, errores tecnicos, estudios incompletos y protocolo.",
        metrics: [
          { label: "Estudios repetidos", value: "18", note: "calidad tecnica", status: "warning" },
          { label: "Repeticiones por error tecnico", value: "Pendiente de carga", note: "motivo requerido", status: "pending-upload" },
          { label: "Estudios incompletos", value: "Pendiente de carga", note: "estado requerido", status: "pending-upload" },
          { label: "Motivos de repeticion", value: "Pendiente de carga", note: "catalogo requerido", status: "pending-upload" },
          { label: "Eventos operativos", value: "Datos pendientes de conexion", note: "registro de eventos", status: "not-connected" },
          { label: "Quejas", value: "Datos pendientes de conexion", note: "experiencia paciente", status: "not-connected" },
          { label: "Cumplimiento de protocolo", value: "Pendiente", note: "checklist requerido", status: "pending-upload" },
        ],
      },
      {
        title: "F. Productividad",
        description: "Produccion por tecnico, radiologo, equipo, turno y modalidad.",
        metrics: [
          { label: "Estudios por tecnico", value: "86", note: "mensual DEMO", status: "available" },
          { label: "Informes por radiologo", value: "Datos pendientes de conexion", note: "requiere medico informante", status: "not-connected" },
          { label: "Estudios por hora de equipo", value: "4.3", note: "DEMO", status: "available" },
          { label: "Tiempo promedio por estudio", value: "18 min", note: "estimado DEMO", status: "available" },
          { label: "Productividad por turno", value: "Pendiente de carga", note: "turnos requeridos", status: "pending-upload" },
          { label: "Productividad por modalidad", value: "Pendiente de carga", note: "modalidad requerida", status: "pending-upload" },
        ],
      },
    ],
  },
};

export function getExecutiveOperationScreen(slug: BusinessLineSlug) {
  return executiveOperationScreens[slug];
}
