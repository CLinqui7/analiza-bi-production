"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  Eye,
  LineChart,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAnaliaScreenChatResponse,
  getDashboardAuditForPath,
  getDashboardValidationSummary,
  type AnaliaScreenChatResponse,
  type DashboardValidationAudit,
} from "@/lib/analytics/dashboard-validation-agent";
import { useActiveBusinessLine } from "@/hooks/use-active-business-line";
import { cn } from "@/lib/utils";

const openStorageKey = "analiza:analia-screen-chat-open";

type AnaliaScreenChatMessage = {
  id: string;
  mode: "ai" | "demo";
  question: string;
  response: AnaliaScreenChatResponse;
  createdAt: string;
};

type AnaliaChatApiResult = {
  error?: string;
  mode?: "ai" | "demo";
  response?: unknown;
};

const quickQuestions = [
  "Resumeme los insights mas importantes",
  "Hay algo critico?",
  "Lee esta pantalla",
  "Que hago primero?",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAnaliaScreenChatResponse(
  value: unknown,
): value is AnaliaScreenChatResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.intent === "string" &&
    typeof value.title === "string" &&
    typeof value.directAnswer === "string" &&
    isStringArray(value.bullets) &&
    isStringArray(value.criticalItems) &&
    typeof value.suggestedNextStep === "string" &&
    isStringArray(value.sources) &&
    typeof value.confidence === "number" &&
    typeof value.caveat === "string"
  );
}

function normalizeChatText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanReadableLine(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function isReadableScreenLine(value: string) {
  const normalizedValue = normalizeChatText(value);
  const navigationMatches = [
    "analiza intelligence",
    "inicio por rol",
    "resumen ejecutivo",
    "operacion ejecutiva",
    "todos los gerentes",
    "admin.demo",
    "salir",
  ].filter((fragment) => normalizedValue.includes(fragment));

  if (value.length < 4 || value.length > 220 || navigationMatches.length >= 3) {
    return false;
  }

  return ![
    "demo",
    "filtros",
    "todos",
    "consolidado",
    "pais",
    "linea de negocio",
  ].includes(normalizedValue);
}

function getFriendlyBulletText(value: string) {
  const cleanedValue = cleanReadableLine(value);

  if (cleanedValue.length <= 150) {
    return cleanedValue;
  }

  return `${cleanedValue.slice(0, 147).trim()}...`;
}

function getFriendlyBullets(bullets: string[]) {
  const seen = new Set<string>();
  const friendlyBullets = bullets
    .map(getFriendlyBulletText)
    .filter(isReadableScreenLine)
    .filter((bullet) => {
      const normalizedBullet = normalizeChatText(bullet);

      if (seen.has(normalizedBullet)) {
        return false;
      }

      seen.add(normalizedBullet);
      return true;
    })
    .slice(0, 4);

  return friendlyBullets.length > 0
    ? friendlyBullets
    : ["No encontre senales visibles limpias para resumir en esta pantalla."];
}

function getDensityTone(audit: DashboardValidationAudit) {
  if (audit.densityStatus === "Muy cargada") {
    return "border-orange-200 bg-orange-50 text-orange-950";
  }

  if (audit.densityStatus === "Cargada") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

function MiniBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${Math.max(6, Math.min(value, 100))}%` }}
        />
      </div>
    </div>
  );
}

function getReadableScreenText() {
  const root = document.querySelector("main") ?? document.body;
  const clonedNode = root.cloneNode(true);

  if (!(clonedNode instanceof HTMLElement)) {
    return document.body.innerText.slice(0, 6000);
  }

  clonedNode
    .querySelectorAll(
      [
        "[data-analia-agent]",
        "[aria-hidden='true']",
        "[role='navigation']",
        "[role='tablist']",
        "aside",
        "button",
        "footer",
        "form",
        "header",
        "input",
        "nav",
        "script",
        "select",
        "style",
        "textarea",
      ].join(", "),
    )
    .forEach((node) => node.remove());

  return clonedNode.innerText
    .split("\n")
    .map(cleanReadableLine)
    .filter(isReadableScreenLine)
    .filter(
      (line, index, allLines) =>
        allLines.findIndex((candidate) => candidate === line) === index,
    )
    .slice(0, 60)
    .join("\n")
    .slice(0, 5000);
}

function formatChatTime() {
  return new Date().toLocaleTimeString("es-SV", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardValidationAgent() {
  const pathname = usePathname();
  const activeBusinessLine = useActiveBusinessLine();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [lastResponseMode, setLastResponseMode] = useState<"ai" | "demo">("demo");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AnaliaScreenChatMessage[]>([]);
  const audit = useMemo(
    () => getDashboardAuditForPath(pathname),
    [pathname],
  );
  const summary = useMemo(() => getDashboardValidationSummary(), []);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(openStorageKey);
    setIsOpen(storedValue === "true");
  }, []);

  useEffect(() => {
    if (!audit) {
      document.documentElement.removeAttribute("data-analia-dashboard-mode");
      document.documentElement.removeAttribute("data-analia-dashboard-density");
      return;
    }

    document.documentElement.setAttribute(
      "data-analia-dashboard-mode",
      audit.readingMode,
    );
    document.documentElement.setAttribute(
      "data-analia-dashboard-density",
      audit.densityStatus,
    );

    return () => {
      document.documentElement.removeAttribute("data-analia-dashboard-mode");
      document.documentElement.removeAttribute("data-analia-dashboard-density");
    };
  }, [audit]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      setIsAuditOpen(false);
      window.localStorage.setItem(openStorageKey, "false");
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!audit || !pathname.startsWith("/protected")) {
    return null;
  }

  const currentAudit = audit;

  function toggleOpen() {
    setIsOpen((current) => {
      const nextValue = !current;
      window.localStorage.setItem(openStorageKey, String(nextValue));
      return nextValue;
    });
  }

  function closePanel() {
    setIsOpen(false);
    setIsAuditOpen(false);
    window.localStorage.setItem(openStorageKey, "false");
  }

  async function askAnalia(questionText: string) {
    const trimmedQuestion = questionText.trim();

    if (!trimmedQuestion || isThinking) {
      return;
    }

    const screenText = getReadableScreenText();
    const fallbackResponse = createAnaliaScreenChatResponse({
      audit: currentAudit,
      businessLine: activeBusinessLine.line,
      question: trimmedQuestion,
      screenText,
    });
    let response = fallbackResponse;
    let mode: "ai" | "demo" = "demo";

    setIsThinking(true);

    try {
      const apiResponse = await fetch("/api/analia-chat", {
        body: JSON.stringify({
          businessLine: activeBusinessLine.line,
          history: messages.slice(-6).map((message) => ({
            answer: message.response.directAnswer,
            question: message.question,
          })),
          pathname,
          question: trimmedQuestion,
          screenText,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const apiResult = (await apiResponse.json().catch(() => null)) as
        | AnaliaChatApiResult
        | null;

      if (
        apiResponse.ok &&
        apiResult &&
        isAnaliaScreenChatResponse(apiResult.response)
      ) {
        response = apiResult.response;
        mode = apiResult.mode === "ai" ? "ai" : "demo";
      }
    } catch {
      response = {
        ...fallbackResponse,
        caveat:
          "No pude contactar al agente de analisis en este momento; respondo con lectura DEMO local.",
      };
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        createdAt: formatChatTime(),
        id: `analia-screen-chat-${Date.now()}`,
        mode,
        question: trimmedQuestion,
        response,
      },
    ]);
    setLastResponseMode(mode);
    setIsThinking(false);
    setQuestion("");
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAnalia(question);
  }

  if (!isOpen) {
    return (
      <aside
        className="fixed bottom-4 right-4 z-50 print:hidden"
        data-analia-agent
      >
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border bg-card px-4 py-3 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl",
            getDensityTone(audit),
          )}
          onClick={toggleOpen}
          type="button"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/90">
            <Bot className="size-5 text-primary" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-sm font-semibold">Hablar con AnaliA</span>
            <span className="block text-xs opacity-80">
              {audit.module} - {audit.densityScore}/100
            </span>
          </span>
          <Badge className="bg-background/80 text-foreground hover:bg-background/80">
            DEMO
          </Badge>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-[460px] print:hidden lg:left-auto lg:right-4"
      data-analia-agent
    >
      <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 px-3 py-2",
            getDensityTone(audit),
          )}
        >
          <button
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => setIsAuditOpen((current) => !current)}
            type="button"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background/85">
              <Bot className="size-4 text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                Chat con AnaliA
              </span>
              <span className="block truncate text-xs opacity-80">
                {audit.module} - {activeBusinessLine.line} -{" "}
                {lastResponseMode === "ai" ? "IA" : "DEMO"}
              </span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <Badge className="bg-background/80 text-foreground hover:bg-background/80">
              {audit.densityScore}/100
            </Badge>
            <Button
              aria-label={isAuditOpen ? "Ocultar auditoria" : "Ver auditoria"}
              onClick={() => setIsAuditOpen((current) => !current)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  isAuditOpen && "rotate-180",
                )}
              />
            </Button>
            <Button
              aria-label="Minimizar chat"
              onClick={closePanel}
              size="icon"
              title="Minimizar chat"
              type="button"
              variant="ghost"
            >
              <MessageSquareText className="size-4" />
            </Button>
            <Button
              aria-label="Cerrar ventana de AnaliA"
              onClick={closePanel}
              size="icon"
              title="Cerrar ventana de AnaliA"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t bg-card/95 p-3 text-foreground">
          <div className="rounded-2xl border bg-muted/25 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" />
              Preguntar a AnaliA sobre esta pantalla
            </div>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((item) => (
                <Button
                  className="h-auto rounded-full px-3 py-2 text-left text-xs leading-4 sm:text-sm"
                  disabled={isThinking}
                  key={item}
                  onClick={() => void askAnalia(item)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>

          <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="flex items-start gap-2">
                <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </span>
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm border bg-background px-3 py-2 text-sm leading-6 text-muted-foreground shadow-sm">
                  Hola, soy AnaliA. Puedo resumir esta pantalla, detectar algo
                  critico, comparar contra periodos anteriores o leer el sistema
                  como agente de IA. Si no hay llave configurada, respondo en
                  modo DEMO.
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article className="space-y-2" key={message.id}>
                  <div className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
                      <p className="break-words">
                        <span className="sr-only">Tu pregunta: </span>
                        {message.question}
                      </p>
                      <div className="mt-1 text-right text-[10px] text-primary-foreground/75">
                        {message.createdAt}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="size-4 text-primary" />
                    </span>
                    <div className="max-w-[88%] rounded-2xl rounded-bl-sm border bg-background px-3 py-3 text-sm shadow-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            message.mode === "ai"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : "bg-muted text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {message.mode === "ai" ? "IA" : "DEMO"}
                        </Badge>
                        <Badge variant="outline">{message.response.intent}</Badge>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Confianza {message.response.confidence}%
                        </Badge>
                      </div>
                      <h2 className="font-semibold">{message.response.title}</h2>
                      <p className="mt-2 break-words leading-6 text-muted-foreground">
                        {message.response.directAnswer}
                      </p>
                      <div className="mt-3 grid gap-2">
                        {getFriendlyBullets(message.response.bullets).map((bullet) => (
                          <span className="flex gap-2 break-words" key={bullet}>
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                            {bullet}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 rounded-xl bg-muted/35 p-2 text-xs leading-5 text-muted-foreground">
                        <div className="text-amber-900">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <AlertTriangle className="size-3.5" />
                            Siguiente paso:
                          </span>{" "}
                          {message.response.suggestedNextStep}
                        </div>
                        <div>{message.response.caveat}</div>
                        <div>
                          <span className="font-medium">Fuentes:</span>{" "}
                          {message.response.sources.join(" / ")}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
            {isThinking ? (
              <div className="flex items-start gap-2">
                <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </span>
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm border bg-background px-3 py-2 text-sm leading-6 text-muted-foreground shadow-sm">
                  AnaliA esta leyendo esta pantalla y preparando una respuesta...
                </div>
              </div>
            ) : null}
          </div>

          <form
            className="flex items-center gap-2 rounded-full border bg-background p-1 shadow-sm"
            onSubmit={submitQuestion}
          >
            <Input
              aria-label="Pregunta para AnaliA"
              className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
              disabled={isThinking}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pregunta sobre esta pantalla..."
              value={question}
            />
            <Button className="rounded-full" disabled={isThinking} type="submit">
              <Send className="size-4" />
              <span className="hidden sm:inline">
                {isThinking ? "Leyendo" : "Preguntar"}
              </span>
            </Button>
          </form>

          {isAuditOpen ? (
            <div className="grid gap-3 border-t border-current/10 pt-3 text-xs">
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniBar label="Carga visual" value={audit.densityScore} />
                <MiniBar
                  label="Cobertura auditada"
                  value={Math.round((summary.reviewedCount / 21) * 100)}
                />
                <MiniBar
                  label="Modo visual"
                  value={Math.round((summary.visualModeCount / summary.reviewedCount) * 100)}
                />
              </div>

              <div className="grid gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-md border bg-background p-2">
                  <div className="mb-1 flex items-center gap-1 font-medium">
                    <Eye className="size-3.5 text-primary" />
                    Lectura
                  </div>
                  {audit.decisionPrompt}
                </div>
                <div className="rounded-md border bg-background p-2">
                  <div className="mb-1 flex items-center gap-1 font-medium">
                    <BarChart3 className="size-3.5 text-primary" />
                    Graficas
                  </div>
                  {audit.chartPriority.slice(0, 2).join(" / ")}
                </div>
                <div className="rounded-md border bg-background p-2">
                  <div className="mb-1 flex items-center gap-1 font-medium">
                    <LineChart className="size-3.5 text-primary" />
                    Modelos
                  </div>
                  {audit.models.join(" + ")}
                </div>
              </div>

              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-md border bg-background p-2">
                  <div className="mb-2 flex items-center gap-1 font-medium">
                    <Sparkles className="size-3.5 text-primary" />
                    Ajustes aplicados
                  </div>
                  <div className="grid gap-1">
                    {audit.editsApplied.map((edit) => (
                      <span className="flex gap-1" key={edit}>
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {edit}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border bg-background p-2">
                  <div className="mb-2 flex items-center gap-1 font-medium">
                    <ShieldCheck className="size-3.5 text-primary" />
                    Validacion
                  </div>
                  <div className="grid gap-1">
                    {audit.validationChecks.slice(0, 3).map((check) => (
                      <span className="flex gap-1" key={check}>
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {check}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
