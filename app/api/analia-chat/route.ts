import { NextResponse } from "next/server";

import {
  createAnaliaScreenChatResponse,
  getDashboardAuditForPath,
  type AnaliaScreenChatIntent,
  type AnaliaScreenChatResponse,
} from "@/lib/analytics/dashboard-validation-agent";
import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { canPerformAction } from "@/lib/security/authorization-policy";

type ChatHistoryItem = {
  question: string;
  answer: string;
};

type AnaliaChatRequest = {
  businessLine: string;
  history: ChatHistoryItem[];
  pathname: string;
  question: string;
  screenText: string;
};

type OpenAIContentItem = {
  text?: unknown;
  type?: unknown;
};

type OpenAIOutputItem = {
  content?: unknown;
  text?: unknown;
  type?: unknown;
};

const maxScreenCharacters = 6000;
const maxQuestionCharacters = 600;
const maxHistoryItems = 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeText(value: string, maxCharacters: number) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[correo oculto]")
    .replace(/\b(?:\+?\d[\d -]{7,}\d)\b/g, "[telefono oculto]")
    .replace(/\b\d{4,}[- ]?\d{4,}[- ]?\d{0,4}\b/g, "[identificador oculto]")
    .replace(/\s{3,}/g, " ")
    .trim()
    .slice(0, maxCharacters);
}

function normalizeHistory(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const question = sanitizeText(
        getString(item.question),
        maxQuestionCharacters,
      );
      const answer = sanitizeText(getString(item.answer), 900);

      return question && answer ? { answer, question } : null;
    })
    .filter((item): item is ChatHistoryItem => item !== null)
    .slice(-maxHistoryItems);
}

function normalizeRequestBody(value: unknown): AnaliaChatRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const pathname = getString(value.pathname, "/protected/overview").slice(0, 160);
  const question = sanitizeText(getString(value.question), maxQuestionCharacters);

  if (!question) {
    return null;
  }

  return {
    businessLine: sanitizeText(getString(value.businessLine, "Consolidado"), 80),
    history: normalizeHistory(value.history),
    pathname,
    question,
    screenText: sanitizeText(getString(value.screenText), maxScreenCharacters),
  };
}

function getAnaliaInstructions() {
  return [
    "Eres AnaliA, agente de IA de Analiza BI.",
    "Tu trabajo es leer la pantalla visible del sistema, entender la linea de negocio activa y contestar preguntas del usuario sobre operacion, finanzas, metas, alertas, comparaciones y datos pendientes.",
    "Responde siempre en espanol claro para CEO, fundador, director financiero, gerente de operaciones, gerente de area o gerente de sucursal.",
    "No inventes datos reales. Si el contexto dice DEMO, marca la lectura como DEMO y explica la cautela.",
    "Si el usuario pregunta por comparaciones, di directamente si hubo mejora, empeoro o si la mejora es parcial, y separa crecimiento de margen, meta, ocupacion o calidad de datos.",
    "Si faltan fuentes o conectores, dilo como limitacion y no presentes conclusiones definitivas.",
    "Si el usuario pregunta por que AnaliA no contesta, no entiende, responde otra cosa o no puede hablar, explica el estado del agente, si esta en DEMO o IA, y que hace falta para resolverlo.",
    "No repitas el menu ni los filtros completos. Resume la pantalla, no la transcribas.",
    "No incluyas datos personales: agrupa o anonimiza nombres, correos, telefonos e identificadores.",
    "Devuelve SOLO JSON valido con estas llaves: intent, title, directAnswer, bullets, criticalItems, suggestedNextStep, confidence, caveat.",
    "intent debe ser uno de: resumen, critico, lectura, accion, comparacion, sistema.",
    "bullets y criticalItems deben ser arreglos de strings cortos. confidence debe ser un numero de 0 a 100.",
  ].join("\n");
}

function buildOpenAIInput({
  fallbackResponse,
  request,
}: {
  fallbackResponse: AnaliaScreenChatResponse;
  request: AnaliaChatRequest;
}) {
  return [
    {
      content: [{ text: getAnaliaInstructions(), type: "input_text" }],
      role: "developer",
    },
    {
      content: [
        {
          text: JSON.stringify({
            businessLine: request.businessLine,
            deterministicBaseline: fallbackResponse,
            history: request.history,
            pathname: request.pathname,
            question: request.question,
            screenText: request.screenText,
          }),
          type: "input_text",
        },
      ],
      role: "user",
    },
  ];
}

function extractOpenAIResponseText(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }

  if (typeof value.output_text === "string") {
    return value.output_text;
  }

  const output = value.output;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item: unknown) => {
      if (!isRecord(item)) {
        return [];
      }

      const outputItem = item as OpenAIOutputItem;

      if (typeof outputItem.text === "string") {
        return [outputItem.text];
      }

      if (!Array.isArray(outputItem.content)) {
        return [];
      }

      return outputItem.content.flatMap((contentItem: unknown) => {
        if (!isRecord(contentItem)) {
          return [];
        }

        const content = contentItem as OpenAIContentItem;
        return typeof content.text === "string" ? [content.text] : [];
      });
    })
    .join("\n")
    .trim();
}

function parseJsonObject(value: string) {
  const trimmedValue = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const parsedValue: unknown = JSON.parse(trimmedValue);
    return isRecord(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function normalizeIntent(
  value: unknown,
  fallback: AnaliaScreenChatIntent,
): AnaliaScreenChatIntent {
  if (
    value === "resumen" ||
    value === "critico" ||
    value === "lectura" ||
    value === "accion" ||
    value === "comparacion" ||
    value === "sistema"
  ) {
    return value;
  }

  return fallback;
}

function normalizeConfidence(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function mergeAiResponse({
  fallbackResponse,
  modelResponse,
}: {
  fallbackResponse: AnaliaScreenChatResponse;
  modelResponse: Record<string, unknown>;
}): AnaliaScreenChatResponse {
  const bullets = getStringArray(modelResponse.bullets).slice(0, 5);
  const criticalItems = getStringArray(modelResponse.criticalItems).slice(0, 4);

  return {
    bullets: bullets.length > 0 ? bullets : fallbackResponse.bullets,
    caveat:
      getString(modelResponse.caveat) ||
      "Respuesta generada por IA con contexto visible del sistema; validar datos reales antes de decidir.",
    confidence: normalizeConfidence(
      modelResponse.confidence,
      fallbackResponse.confidence,
    ),
    criticalItems:
      criticalItems.length > 0 ? criticalItems : fallbackResponse.criticalItems,
    directAnswer:
      getString(modelResponse.directAnswer) || fallbackResponse.directAnswer,
    intent: normalizeIntent(modelResponse.intent, fallbackResponse.intent),
    sources: [...fallbackResponse.sources, "Agente IA protegido"],
    suggestedNextStep:
      getString(modelResponse.suggestedNextStep) ||
      fallbackResponse.suggestedNextStep,
    title: getString(modelResponse.title) || fallbackResponse.title,
  };
}

function withDemoCaveat(response: AnaliaScreenChatResponse) {
  return {
    ...response,
    caveat:
      "Modo DEMO: falta configurar OPENAI_API_KEY para activar el agente conversacional real. " +
      response.caveat,
  };
}

export async function POST(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return NextResponse.json(
      { error: "Debes iniciar sesion para usar AnaliA." },
      { status: 401 },
    );
  }

  const requestBody: unknown = await request.json().catch(() => null);
  const normalizedRequest = normalizeRequestBody(requestBody);

  if (!normalizedRequest) {
    return NextResponse.json(
      { error: "Pregunta invalida para AnaliA." },
      { status: 400 },
    );
  }

  if (
    !canPerformAction(actor, "route.access", {
      pathname: normalizedRequest.pathname,
    })
  ) {
    return NextResponse.json(
      { error: "No tienes permiso para consultar esta pantalla." },
      { status: 403 },
    );
  }

  const audit =
    getDashboardAuditForPath(normalizedRequest.pathname) ??
    getDashboardAuditForPath("/protected/overview");

  if (!audit) {
    return NextResponse.json(
      { error: "No encontre auditoria para esta pantalla." },
      { status: 404 },
    );
  }

  const fallbackResponse = createAnaliaScreenChatResponse({
    audit,
    businessLine: normalizedRequest.businessLine,
    question: normalizedRequest.question,
    screenText: normalizedRequest.screenText,
  });
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      mode: "demo",
      response: withDemoCaveat(fallbackResponse),
    });
  }

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: buildOpenAIInput({
          fallbackResponse,
          request: normalizedRequest,
        }),
        max_output_tokens: 900,
        model: process.env.ANALIA_OPENAI_MODEL ?? "gpt-5",
        store: false,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!openAIResponse.ok) {
      return NextResponse.json({
        mode: "demo",
        response: {
          ...withDemoCaveat(fallbackResponse),
          caveat:
            "No pude conectar con el modelo de IA en este momento; respondo con lectura DEMO del sistema.",
        },
      });
    }

    const rawModelResponse: unknown = await openAIResponse.json();
    const responseText = extractOpenAIResponseText(rawModelResponse);
    const parsedResponse = parseJsonObject(responseText);

    if (!parsedResponse) {
      return NextResponse.json({
        mode: "demo",
        response: {
          ...withDemoCaveat(fallbackResponse),
          caveat:
            "La IA no devolvio un formato legible; respondo con lectura DEMO del sistema.",
        },
      });
    }

    return NextResponse.json({
      mode: "ai",
      response: mergeAiResponse({
        fallbackResponse,
        modelResponse: parsedResponse,
      }),
    });
  } catch {
    return NextResponse.json({
      mode: "demo",
      response: {
        ...withDemoCaveat(fallbackResponse),
        caveat:
          "El agente IA no esta disponible en este momento; respondo con lectura DEMO del sistema.",
      },
    });
  }
}
