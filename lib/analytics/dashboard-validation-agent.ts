export type DashboardAnalysisModel =
  | "Exploratorio"
  | "Descriptivo"
  | "Predictivo";

export type DashboardDensityStatus =
  | "Lectura visual correcta"
  | "Cargada"
  | "Muy cargada";

export type DashboardReadingMode = "estandar" | "visual";

export type DashboardValidationAudit = {
  href: string;
  module: string;
  owner: string;
  densityScore: number;
  densityStatus: DashboardDensityStatus;
  readingMode: DashboardReadingMode;
  dataStatus: "DEMO";
  models: DashboardAnalysisModel[];
  chartPriority: string[];
  validationChecks: string[];
  editsApplied: string[];
  decisionPrompt: string;
  lastScanAt: string;
};

export type AnaliaScreenChatIntent =
  | "resumen"
  | "critico"
  | "lectura"
  | "accion"
  | "comparacion"
  | "sistema";

export type AnaliaScreenChatResponse = {
  intent: AnaliaScreenChatIntent;
  title: string;
  directAnswer: string;
  bullets: string[];
  criticalItems: string[];
  suggestedNextStep: string;
  sources: string[];
  confidence: number;
  caveat: string;
};

type ChatBusinessLine = {
  key: "fisioterapia" | "laboratorio" | "imagenes";
  shortName: string;
};

const chatBusinessLines: ChatBusinessLine[] = [
  { key: "fisioterapia", shortName: "Fisioterapia" },
  { key: "laboratorio", shortName: "Laboratorio" },
  { key: "imagenes", shortName: "Imagenes" },
];

const standardChecks = [
  "KPI principal visible antes del detalle",
  "Comparacion contra meta o periodo anterior",
  "Grafica con lectura rapida",
  "Insight accionable y responsable sugerido",
  "Dato DEMO o pendiente marcado sin mezclar con dato real",
];

function buildAudit({
  chartPriority,
  densityScore,
  densityStatus,
  href,
  module,
  owner,
  prompt,
}: {
  chartPriority: string[];
  densityScore: number;
  densityStatus: DashboardDensityStatus;
  href: string;
  module: string;
  owner: string;
  prompt: string;
}): DashboardValidationAudit {
  const readingMode: DashboardReadingMode =
    densityStatus === "Lectura visual correcta" ? "estandar" : "visual";

  return {
    chartPriority,
    dataStatus: "DEMO",
    decisionPrompt: prompt,
    densityScore,
    densityStatus,
    editsApplied:
      readingMode === "visual"
        ? [
            "Priorizar graficas y KPI antes de texto largo",
            "Comprimir explicacion a lectura de decision",
            "Separar alerta, causa y accion en bloques visuales",
          ]
        : [
            "Mantener lectura ejecutiva actual",
            "Validar que cada grafica conserve tooltip o dato exacto",
          ],
    href,
    lastScanAt: "2026-07-24 10:30",
    models: ["Exploratorio", "Descriptivo", "Predictivo"],
    module,
    owner,
    readingMode,
    validationChecks: standardChecks,
  };
}

export const dashboardValidationAudits: DashboardValidationAudit[] = [
  buildAudit({
    chartPriority: ["Tabla comparativa por linea", "Metas vs resultados", "Tendencia de ingresos"],
    densityScore: 42,
    densityStatus: "Lectura visual correcta",
    href: "/protected/overview",
    module: "Resumen ejecutivo",
    owner: "CEO",
    prompt: "Detectar rapido que linea esta sana, en riesgo o fuera de meta.",
  }),
  buildAudit({
    chartPriority: ["Volumen operativo", "Tiempo de proceso", "Productividad y errores"],
    densityScore: 68,
    densityStatus: "Cargada",
    href: "/protected/operacion",
    module: "Operacion ejecutiva",
    owner: "Gerencia de operaciones",
    prompt: "Explicar que paso en la operacion y donde intervenir hoy.",
  }),
  buildAudit({
    chartPriority: ["Venta vs costo", "Margen", "Gasto fijo y variable"],
    densityScore: 66,
    densityStatus: "Cargada",
    href: "/protected/finanzas",
    module: "Salud financiera",
    owner: "Direccion financiera",
    prompt: "Separar cuanto se produjo de cuanto dinero dejo la produccion.",
  }),
  buildAudit({
    chartPriority: ["Estado del flujo", "Conversion", "Demanda no atendida"],
    densityScore: 62,
    densityStatus: "Cargada",
    href: "/protected/citas",
    module: "Citas por negocio",
    owner: "Operaciones",
    prompt: "Ver si la demanda llega, se agenda y se convierte en atencion real.",
  }),
  buildAudit({
    chartPriority: ["Ocupacion efectiva", "Capacidad perdida", "Brecha contra meta"],
    densityScore: 64,
    densityStatus: "Cargada",
    href: "/protected/capacidad",
    module: "Capacidad y ocupacion",
    owner: "Operaciones",
    prompt: "Distinguir saturacion real de capacidad disponible no aprovechada.",
  }),
  buildAudit({
    chartPriority: ["Ranking integral", "Matriz rentabilidad-operacion", "Mapa de sucursales"],
    densityScore: 78,
    densityStatus: "Muy cargada",
    href: "/protected/sucursales",
    module: "Sucursales",
    owner: "Gerentes de sucursal",
    prompt: "Leer que sucursal necesita apoyo y cual puede servir como modelo.",
  }),
  buildAudit({
    chartPriority: ["Puntaje de gerente", "Bono proyectado", "Causas de ajuste"],
    densityScore: 70,
    densityStatus: "Cargada",
    href: "/protected/gerentes",
    module: "Gerentes y bonos",
    owner: "CEO y operaciones",
    prompt: "Asignar bonos con evidencia, no solo por venta.",
  }),
  buildAudit({
    chartPriority: ["Desempeno individual", "Calidad", "Comparables por rol"],
    densityScore: 71,
    densityStatus: "Cargada",
    href: "/protected/profesionales",
    module: "Profesionales",
    owner: "Operaciones",
    prompt: "Ver productividad sin castigar roles no comparables.",
  }),
  buildAudit({
    chartPriority: ["Rentabilidad por servicio", "Brecha de meta", "Portafolio"],
    densityScore: 69,
    densityStatus: "Cargada",
    href: "/protected/servicios",
    module: "Servicios",
    owner: "Direccion comercial",
    prompt: "Decidir que servicio crecer, corregir o dejar de impulsar.",
  }),
  buildAudit({
    chartPriority: ["Continuidad terapeutica", "Sesiones", "No-show y abandono"],
    densityScore: 76,
    densityStatus: "Muy cargada",
    href: "/protected/fisioterapia",
    module: "Fisioterapia",
    owner: "Linea Fisioterapia",
    prompt: "Contar agenda, continuidad y resultado sin mezclarlo con laboratorio.",
  }),
  buildAudit({
    chartPriority: ["Ordenes", "Muestras", "Pruebas rentables e inventario"],
    densityScore: 77,
    densityStatus: "Muy cargada",
    href: "/protected/laboratorio",
    module: "Laboratorio",
    owner: "Linea Laboratorio",
    prompt: "Conectar volumen tecnico con margen, reactivos y entregas.",
  }),
  buildAudit({
    chartPriority: ["Estudios", "Equipos", "Informes y modalidad"],
    densityScore: 77,
    densityStatus: "Muy cargada",
    href: "/protected/imagenes",
    module: "Imagenes",
    owner: "Linea Imagenes",
    prompt: "Leer equipos, estudios e informes sin reciclar la vista de laboratorio.",
  }),
  buildAudit({
    chartPriority: ["Alertas tempranas", "Predicciones", "Acciones trazables"],
    densityScore: 82,
    densityStatus: "Muy cargada",
    href: "/protected/insights",
    module: "Insights",
    owner: "AnaliA Data Science",
    prompt: "Priorizar lo que requiere decision hoy y dejar trazabilidad.",
  }),
  buildAudit({
    chartPriority: ["Cobertura de documentos", "Errores de carga", "Actualizacion"],
    densityScore: 66,
    densityStatus: "Cargada",
    href: "/protected/importaciones",
    module: "Importaciones",
    owner: "Gerencia de operaciones",
    prompt: "Saber que falta cargar antes de confiar en un dashboard.",
  }),
  buildAudit({
    chartPriority: ["Paquetes por linea", "Ultima subida", "Siguiente mes"],
    densityScore: 63,
    densityStatus: "Cargada",
    href: "/protected/plantillas",
    module: "Plantillas",
    owner: "Gerencia de operaciones",
    prompt: "Descargar el Excel correcto sin confundir linea, sucursal o periodo.",
  }),
  buildAudit({
    chartPriority: ["Estado del conector", "Fuente pendiente", "Modulo afectado"],
    densityScore: 45,
    densityStatus: "Lectura visual correcta",
    href: "/protected/conectores",
    module: "Conectores",
    owner: "Webmaster",
    prompt: "Ver que fuente real esta conectada y cual sigue deshabilitada.",
  }),
  buildAudit({
    chartPriority: ["Completitud", "Errores criticos", "Dashboards afectados"],
    densityScore: 67,
    densityStatus: "Cargada",
    href: "/protected/calidad-datos",
    module: "Calidad de datos",
    owner: "Operaciones y datos",
    prompt: "Bloquear conclusiones cuando falte calidad o trazabilidad.",
  }),
  buildAudit({
    chartPriority: ["Avance mensual", "Meta sugerida", "Meta final CEO"],
    densityScore: 65,
    densityStatus: "Cargada",
    href: "/protected/metas",
    module: "Metas y avances",
    owner: "CEO",
    prompt: "Comparar meta sugerida por datos contra meta final aprobada.",
  }),
  buildAudit({
    chartPriority: ["Roles", "Permisos", "Usuarios creados"],
    densityScore: 48,
    densityStatus: "Lectura visual correcta",
    href: "/protected/usuarios-permisos",
    module: "Usuarios y permisos",
    owner: "Webmaster",
    prompt: "Validar quien puede crear usuarios, cargar datos y solo leer.",
  }),
  buildAudit({
    chartPriority: ["Cambios personales", "Seguridad", "Preferencias"],
    densityScore: 36,
    densityStatus: "Lectura visual correcta",
    href: "/protected/configuracion",
    module: "Mi cuenta",
    owner: "Usuario",
    prompt: "Mantener configuracion personal simple y sin mezclarla con BI.",
  }),
  buildAudit({
    chartPriority: ["Acciones sensibles", "Cambios de datos", "Trazabilidad"],
    densityScore: 60,
    densityStatus: "Cargada",
    href: "/protected/auditoria",
    module: "Auditoria",
    owner: "Webmaster y CEO",
    prompt: "Ver quien cambio datos, permisos, metas o modelos.",
  }),
];

export function getDashboardAuditForPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/$/, "") || "/";

  return (
    dashboardValidationAudits.find((audit) => audit.href === normalizedPath) ??
    dashboardValidationAudits.find((audit) =>
      normalizedPath.startsWith(`${audit.href}/`),
    ) ??
    null
  );
}

export function getDashboardValidationSummary() {
  const overloaded = dashboardValidationAudits.filter(
    (audit) => audit.densityStatus === "Muy cargada",
  );
  const visualMode = dashboardValidationAudits.filter(
    (audit) => audit.readingMode === "visual",
  );
  const averageDensity =
    dashboardValidationAudits.reduce(
      (total, audit) => total + audit.densityScore,
      0,
    ) / dashboardValidationAudits.length;

  return {
    averageDensity: Math.round(averageDensity),
    dataStatus: "DEMO" as const,
    lastScanAt: "2026-07-24 10:30",
    overloadedCount: overloaded.length,
    reviewedCount: dashboardValidationAudits.length,
    visualModeCount: visualMode.length,
  };
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanScreenLine(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeNavigationDump(value: string) {
  const normalizedValue = normalizeText(value);
  const navigationMatches = [
    "analiza intelligence",
    "inicio por rol",
    "resumen ejecutivo",
    "operacion ejecutiva",
    "todos los gerentes",
    "admin.demo",
    "salir",
  ].filter((fragment) => normalizedValue.includes(fragment));

  return navigationMatches.length >= 3 || value.length > 220;
}

function isUsefulScreenLine(value: string) {
  const normalizedValue = normalizeText(value);

  if (value.length < 4 || looksLikeNavigationDump(value)) {
    return false;
  }

  if (
    normalizedValue === "demo" ||
    normalizedValue === "filtros" ||
    normalizedValue === "todos" ||
    normalizedValue === "consolidado"
  ) {
    return false;
  }

  return true;
}

function shortenChatLine(value: string) {
  const cleanedValue = cleanScreenLine(value);

  if (cleanedValue.length <= 150) {
    return cleanedValue;
  }

  const firstSentence = cleanedValue
    .split(/[.!?]\s+/)
    .find((sentence) => sentence.length >= 20 && sentence.length <= 150);

  return firstSentence ?? `${cleanedValue.slice(0, 147).trim()}...`;
}

function compactChatBullets(items: string[], maxItems = 4) {
  const seen = new Set<string>();

  return items
    .map(shortenChatLine)
    .filter(isUsefulScreenLine)
    .filter((item) => {
      const normalizedItem = normalizeText(item);

      if (seen.has(normalizedItem)) {
        return false;
      }

      seen.add(normalizedItem);
      return true;
    })
    .slice(0, maxItems);
}

function getBusinessLineForChat(businessLine: string) {
  const normalizedBusinessLine = normalizeText(businessLine);

  if (normalizedBusinessLine.includes("laboratorio")) {
    return chatBusinessLines.find((line) => line.key === "laboratorio");
  }

  if (normalizedBusinessLine.includes("fisioterapia")) {
    return chatBusinessLines.find((line) => line.key === "fisioterapia");
  }

  if (
    normalizedBusinessLine.includes("imagenes") ||
    normalizedBusinessLine.includes("imagen")
  ) {
    return chatBusinessLines.find((line) => line.key === "imagenes");
  }

  return null;
}

function getSingleLineComparisonSummary(line: ChatBusinessLine) {
  return {
    bullets: compactChatBullets([
      `${line.shortName}: revisar Meta, Resultado, Variacion, Cumplimiento y Estado en la pantalla visible.`,
      "Usar solo cierres publicados y metas aprobadas para conclusiones oficiales.",
      "Separar volumen, margen, ocupacion o calidad antes de decidir si una mejora es sana.",
    ]),
    directAnswer:
      `Para comparar ${line.shortName}, necesito leer los datos visibles oficiales de la pantalla actual; no uso cifras DEMO precargadas fuera del entorno demo.`,
    suggestedNextStep:
      "Confirmar la comparacion contra meta, periodo anterior y calidad de datos antes de presentar una decision.",
    title: `Comparacion anual: ${line.shortName}`,
  };
}

function getConsolidatedComparisonSummary() {
  return {
    bullets: compactChatBullets([
      "Comparar lineas por Meta, Resultado, Variacion, Cumplimiento y Estado.",
      "No concluir con datos precargados de demostracion fuera de APP_ENV=demo.",
      "Revisar si la pantalla visible muestra margen, ocupacion, calidad y cierre publicado.",
    ]),
    directAnswer:
      "Puedo orientar la comparacion, pero la conclusion oficial debe salir de los datos visibles y fuentes oficiales de cierre, no de datos DEMO.",
    suggestedNextStep:
      "Comparar cada linea por separado: crecimiento, margen, ocupacion y meta antes de tomar una decision consolidada.",
    title: "Comparacion anual consolidada",
  };
}

function getBusinessLineComparisonSummary(businessLine: string) {
  const selectedLine = getBusinessLineForChat(businessLine);

  return selectedLine
    ? getSingleLineComparisonSummary(selectedLine)
    : getConsolidatedComparisonSummary();
}

function asksAboutAnaliaBehavior(normalizedQuestion: string) {
  return (
    normalizedQuestion.includes("por que contestas") ||
    normalizedQuestion.includes("porque contestas") ||
    normalizedQuestion.includes("por que respondes") ||
    normalizedQuestion.includes("porque respondes") ||
    normalizedQuestion.includes("no pregunte") ||
    normalizedQuestion.includes("no pregunto") ||
    normalizedQuestion.includes("no preguntaba") ||
    normalizedQuestion.includes("no contestas") ||
    normalizedQuestion.includes("no respondes") ||
    normalizedQuestion.includes("puedes hablar") ||
    normalizedQuestion.includes("no se puede hablar") ||
    normalizedQuestion.includes("ia real") ||
    normalizedQuestion.includes("modo demo") ||
    normalizedQuestion.includes("openai_api_key") ||
    normalizedQuestion.includes("no funciona bien")
  );
}

function detectChatIntent(question: string): AnaliaScreenChatIntent {
  const normalizedQuestion = normalizeText(question);
  const asksComparison =
    normalizedQuestion.includes("compar") ||
    normalizedQuestion.includes("ano pasado") ||
    normalizedQuestion.includes("2025") ||
    normalizedQuestion.includes("vs ") ||
    ((normalizedQuestion.includes("mejora") ||
      normalizedQuestion.includes("mejoro") ||
      normalizedQuestion.includes("empeoro")) &&
      (normalizedQuestion.includes("hubo") ||
        normalizedQuestion.includes("contra") ||
        normalizedQuestion.includes("pasado")));

  if (asksAboutAnaliaBehavior(normalizedQuestion)) {
    return "sistema";
  }

  if (asksComparison) {
    return "comparacion";
  }

  if (
    normalizedQuestion.includes("critico") ||
    normalizedQuestion.includes("riesgo") ||
    normalizedQuestion.includes("alerta") ||
    normalizedQuestion.includes("urgente")
  ) {
    return "critico";
  }

  if (
    normalizedQuestion.includes("lee") ||
    normalizedQuestion.includes("leer") ||
    normalizedQuestion.includes("pantalla") ||
    normalizedQuestion.includes("completa")
  ) {
    return "lectura";
  }

  if (
    normalizedQuestion.includes("accion") ||
    normalizedQuestion.includes("hacer") ||
    normalizedQuestion.includes("primero") ||
    normalizedQuestion.includes("recomienda")
  ) {
    return "accion";
  }

  return "resumen";
}

function getScreenSignals(screenText: string) {
  const lines = screenText
    .split("\n")
    .map(cleanScreenLine)
    .filter(isUsefulScreenLine)
    .filter(
      (line, index, allLines) =>
        allLines.findIndex((candidate) => candidate === line) === index,
    );
  const relevantLines = lines
    .filter((line) => {
      const normalizedLine = normalizeText(line);

      return (
        normalizedLine.includes("meta") ||
        normalizedLine.includes("roi") ||
        normalizedLine.includes("riesgo") ||
        normalizedLine.includes("pendiente") ||
        normalizedLine.includes("critico") ||
        normalizedLine.includes("demo") ||
        normalizedLine.includes("costo") ||
        normalizedLine.includes("margen") ||
        normalizedLine.includes("ocupacion") ||
        normalizedLine.includes("bono") ||
        normalizedLine.includes("conector") ||
        normalizedLine.includes("calidad")
      );
    })
    .slice(0, 4);

  return (relevantLines.length > 0 ? relevantLines : lines.slice(0, 4)).map(
    shortenChatLine,
  );
}

function getCriticalItems(audit: DashboardValidationAudit, screenText: string) {
  const normalizedScreen = normalizeText(screenText);
  const criticalItems: string[] = [];

  if (audit.densityStatus === "Muy cargada") {
    criticalItems.push(
      `La pantalla ${audit.module} esta muy cargada: conviene priorizar grafica, KPI y accion antes de texto largo.`,
    );
  }

  if (audit.densityStatus === "Cargada") {
    criticalItems.push(
      `La pantalla ${audit.module} requiere lectura guiada: hay riesgo de perder la decision principal entre varios bloques.`,
    );
  }

  if (normalizedScreen.includes("pendiente")) {
    criticalItems.push(
      "Hay elementos pendientes en la pantalla; no conviene cerrar conclusiones sin revisar fuente o responsable.",
    );
  }

  if (
    normalizedScreen.includes("riesgo") ||
    normalizedScreen.includes("critico") ||
    normalizedScreen.includes("alerta")
  ) {
    criticalItems.push(
      "La pantalla contiene senales de riesgo o alerta que deben revisarse antes de aprobar decisiones.",
    );
  }

  if (criticalItems.length === 0) {
    criticalItems.push(
      "No aparece una senal critica concluyente en esta vista DEMO; revisar calidad de datos antes de decidir.",
    );
  }

  return criticalItems.slice(0, 4);
}

export function createAnaliaScreenChatResponse({
  audit,
  businessLine,
  question,
  screenText,
}: {
  audit: DashboardValidationAudit;
  businessLine: string;
  question: string;
  screenText: string;
}): AnaliaScreenChatResponse {
  const intent = detectChatIntent(question);
  const screenSignals = getScreenSignals(screenText);
  const criticalItems = getCriticalItems(audit, screenText);
  const sources = [
    `Pantalla visible: ${audit.module}`,
    `Linea activa: ${businessLine}`,
    "Auditoria visual AnaliA DEMO",
  ];
  const confidence =
    audit.dataStatus === "DEMO"
      ? Math.max(68, Math.min(88, 100 - Math.round(audit.densityScore / 3)))
      : 72;

  if (intent === "sistema") {
    return {
      bullets: [
        "Sin llave de IA, AnaliA solo usa una lectura DEMO deterministica y puede malinterpretar preguntas abiertas.",
        "La respuesta anterior salio como resumen porque no existia una intencion especial para preguntas sobre el propio chat.",
        "Con OPENAI_API_KEY configurada, la pregunta se envia al agente protegido y puede responder como conversacion real.",
      ],
      caveat:
        "Esta respuesta explica el estado del agente; no es un insight operativo del negocio.",
      confidence: 96,
      criticalItems: [
        "Falta configurar OPENAI_API_KEY para activar conversacion libre con IA.",
      ],
      directAnswer:
        "Tienes razon: contestaba lo que no preguntaste porque, sin IA configurada, caia al resumen DEMO de la pantalla. Ahora estas preguntas se responden como estado del agente.",
      intent,
      sources: [
        `Pantalla visible: ${audit.module}`,
        "Estado de AnaliA",
        "Configuracion protegida",
      ],
      suggestedNextStep:
        "Configurar OPENAI_API_KEY en .env.local y reiniciar el servidor para activar conversacion real.",
      title: "Por que AnaliA no respondio bien",
    };
  }

  if (intent === "critico") {
    return {
      bullets: compactChatBullets(criticalItems, 4),
      caveat:
        "No ejecuto acciones ni apruebo metas; solo priorizo senales con datos DEMO visibles.",
      confidence,
      criticalItems,
      directAnswer:
        criticalItems[0] ??
        "No detecte una criticidad concluyente en esta pantalla DEMO.",
      intent,
      sources,
      suggestedNextStep:
        "Abrir el bloque con mayor riesgo, validar fuente y asignar responsable antes de decidir.",
      title: `Revision critica de ${audit.module}`,
    };
  }

  if (intent === "lectura") {
    return {
      bullets: compactChatBullets([
        `Modulo: ${audit.module}.`,
        `Linea activa: ${businessLine}.`,
        `Lectura principal: ${audit.decisionPrompt}`,
        ...screenSignals.slice(0, 3).map((signal) => `Dato visible: ${signal}`),
      ]),
      caveat:
        "Leo y resumo la pantalla visible; para datos reales necesito fuentes conectadas o plantillas validadas.",
      confidence,
      criticalItems,
      directAnswer:
        "Lei la pantalla visible y la condense en los puntos que afectan la decision.",
      intent,
      sources,
      suggestedNextStep:
        "Pedir: 'que es lo mas importante' o 'hay algo critico' para separar decision, causa y accion.",
      title: `Lectura de pantalla: ${audit.module}`,
    };
  }

  if (intent === "accion") {
    return {
      bullets: compactChatBullets([
        `Prioridad: ${audit.decisionPrompt}`,
        `Grafica a mirar primero: ${audit.chartPriority[0]}.`,
        `Validacion minima: ${audit.validationChecks[0]}.`,
        ...criticalItems.slice(0, 2),
      ]),
      caveat:
        "Las acciones son recomendaciones DEMO; en produccion deben quedar auditadas y aprobadas por el rol correspondiente.",
      confidence,
      criticalItems,
      directAnswer:
        "La primera accion es revisar el KPI principal de la pantalla contra meta y confirmar si la fuente esta completa.",
      intent,
      sources,
      suggestedNextStep:
        "Validar fuente, responsable, meta y periodo antes de mover una decision a ejecucion.",
      title: `Accion sugerida en ${audit.module}`,
    };
  }

  if (intent === "comparacion") {
    const comparisonSummary = getBusinessLineComparisonSummary(businessLine);

    return {
      bullets: comparisonSummary.bullets,
      caveat:
        "Comparacion generada sobre datos DEMO y periodo comparable disponible; validar fuentes reales antes de presentar al CEO.",
      confidence,
      criticalItems,
      directAnswer: comparisonSummary.directAnswer,
      intent,
      sources,
      suggestedNextStep: comparisonSummary.suggestedNextStep,
      title: comparisonSummary.title,
    };
  }

  return {
    bullets: compactChatBullets([
      `Lo mas importante: ${audit.decisionPrompt}`,
      `Prioridad visual: ${audit.chartPriority.slice(0, 2).join(" y ")}.`,
      `Estado de lectura: ${audit.densityStatus}, puntaje ${audit.densityScore}/100.`,
      ...screenSignals.slice(0, 2).map((signal) => `Dato visible: ${signal}`),
    ]),
    caveat:
      "Resumen generado sobre entorno DEMO; no sustituye validacion de datos reales.",
    confidence,
    criticalItems,
    directAnswer:
      `Resumen de ${audit.module}: enfocate en ${audit.chartPriority[0].toLowerCase()} y confirma si la lectura responde la decision del modulo.`,
    intent,
    sources,
    suggestedNextStep:
      "Pedir a AnaliA una revision critica si quieres separar riesgo, causa y accion.",
    title: `Resumen de insights: ${audit.module}`,
  };
}
