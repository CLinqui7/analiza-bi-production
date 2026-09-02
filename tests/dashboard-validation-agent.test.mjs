import { readFileSync, statSync } from "node:fs";

const modelPath = "lib/analytics/dashboard-validation-agent.ts";
const apiRoutePath = "app/api/analia-chat/route.ts";
const appLayoutPath = "app/layout.tsx";
const globalStylesPath = "app/globals.css";
const docsPath = "docs/analia-data-science-agent.md";
const envExamplePath = ".env.example";
const packagePath = "package.json";

for (const file of [
  modelPath,
  apiRoutePath,
  appLayoutPath,
  globalStylesPath,
  docsPath,
  envExamplePath,
  packagePath,
]) {
  statSync(file);
}

const model = readFileSync(modelPath, "utf8");
const apiRoute = readFileSync(apiRoutePath, "utf8");
const appLayout = readFileSync(appLayoutPath, "utf8");
const globalStyles = readFileSync(globalStylesPath, "utf8");
const docs = readFileSync(docsPath, "utf8");
const envExample = readFileSync(envExamplePath, "utf8");
const packageJson = readFileSync(packagePath, "utf8");

for (const requiredModelText of [
  "DashboardValidationAudit",
  "DashboardAnalysisModel",
  "DashboardDensityStatus",
  "Lectura visual correcta",
  "Muy cargada",
  "Exploratorio",
  "Descriptivo",
  "Predictivo",
  "getDashboardAuditForPath",
  "getDashboardValidationSummary",
  "AnaliaScreenChatResponse",
  "createAnaliaScreenChatResponse",
  "comparacion",
  "sistema",
  "asksAboutAnaliaBehavior",
  "Por que AnaliA no respondio bien",
  "contestaba lo que no preguntaste",
  "detectChatIntent",
  "getScreenSignals",
  "compactChatBullets",
  "looksLikeNavigationDump",
  "getBusinessLineComparisonSummary",
  "getSingleLineComparisonSummary",
  "no uso cifras DEMO precargadas fuera del entorno demo",
  "dataStatus: \"DEMO\"",
  "/protected/overview",
  "/protected/operacion",
  "/protected/finanzas",
  "/protected/citas",
  "/protected/capacidad",
  "/protected/sucursales",
  "/protected/gerentes",
  "/protected/profesionales",
  "/protected/servicios",
  "/protected/fisioterapia",
  "/protected/laboratorio",
  "/protected/imagenes",
  "/protected/insights",
  "/protected/importaciones",
  "/protected/plantillas",
]) {
  if (!model.includes(requiredModelText)) {
    throw new Error(`Dashboard validation model is missing: ${requiredModelText}`);
  }
}

for (const requiredApiRouteText of [
  "OPENAI_API_KEY",
  "ANALIA_OPENAI_MODEL",
  "https://api.openai.com/v1/responses",
  "store: false",
  "Agente IA protegido",
  "sanitizeText",
  "createAnaliaScreenChatResponse",
  "extractOpenAIResponseText",
  "Devuelve SOLO JSON valido",
  "intent debe ser uno de: resumen, critico, lectura, accion, comparacion, sistema",
]) {
  if (!apiRoute.includes(requiredApiRouteText)) {
    throw new Error(`AnaliA API route is missing: ${requiredApiRouteText}`);
  }
}

for (const removedLayoutText of [
  "DashboardValidationAgent",
  "dashboard-validation-agent",
]) {
  if (appLayout.includes(removedLayoutText)) {
    throw new Error(
      `Root layout must not mount the disabled AnaliA floating chat: ${removedLayoutText}`,
    );
  }
}

for (const requiredStyleText of [
  '[data-analia-dashboard-mode="visual"]',
  '[data-analia-dashboard-density="Muy cargada"]',
  "scroll-padding-bottom",
]) {
  if (!globalStyles.includes(requiredStyleText)) {
    throw new Error(`Visual reading styles are missing: ${requiredStyleText}`);
  }
}

for (const requiredDocsText of [
  "Auditoria visual de dashboards",
  "cada pestana del BI",
  "Lectura visual correcta",
  "Cargada",
  "Muy cargada",
  "Burbuja de chat global",
  "lectura de la pantalla visible",
  "/api/analia-chat",
  "OPENAI_API_KEY",
  "burbujas breves",
  "filtra navegacion",
  "motor `DEMO` deterministico",
]) {
  if (!docs.includes(requiredDocsText)) {
    throw new Error(`AnaliA docs are missing: ${requiredDocsText}`);
  }
}

for (const requiredEnvText of [
  "OPENAI_API_KEY",
  "ANALIA_OPENAI_MODEL",
]) {
  if (!envExample.includes(requiredEnvText)) {
    throw new Error(`Env example is missing: ${requiredEnvText}`);
  }
}

if (!packageJson.includes("tests/dashboard-validation-agent.test.mjs")) {
  throw new Error("Test script must include dashboard validation checks.");
}

console.log("Dashboard validation agent checks passed.");
