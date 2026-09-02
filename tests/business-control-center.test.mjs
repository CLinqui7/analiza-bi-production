import { readFileSync, statSync } from "node:fs";

const modelPath = "lib/analytics/business-control-center.ts";
const connectorsPath = "components/crm-connectors-dashboard.tsx";
const qualityPath = "components/data-quality-analia-dashboard.tsx";
const goalsPath = "components/goals-advances-dashboard.tsx";
const hookPath = "hooks/use-active-business-line.ts";
const headerPath = "components/tenant-context-header.tsx";
const layoutPath = "app/protected/layout.tsx";
const modulePagePath = "app/protected/[module]/page.tsx";
const docsPath = "docs/business-control-center.md";
const packagePath = "package.json";

for (const file of [
  modelPath,
  connectorsPath,
  qualityPath,
  goalsPath,
  hookPath,
  headerPath,
  layoutPath,
  modulePagePath,
  docsPath,
  packagePath,
]) {
  statSync(file);
}

const model = readFileSync(modelPath, "utf8");
const connectors = readFileSync(connectorsPath, "utf8");
const quality = readFileSync(qualityPath, "utf8");
const goals = readFileSync(goalsPath, "utf8");
const hook = readFileSync(hookPath, "utf8");
const header = readFileSync(headerPath, "utf8");
const layout = readFileSync(layoutPath, "utf8");
const modulePage = readFileSync(modulePagePath, "utf8");
const docs = readFileSync(docsPath, "utf8");
const packageJson = readFileSync(packagePath, "utf8");

for (const requiredModelText of [
  "crmConnectorPlans",
  "analiaQualitySuggestions",
  "goalStrategySuggestions",
  "maskDemoApiKey",
  "buildDemoApiKey",
  "az_lab_demo",
  "az_fis_demo",
  "az_img_demo",
  "/api/connectors/crm/laboratorio/orders",
  "/api/connectors/crm/fisioterapia/appointments",
  "/api/connectors/crm/imagenes/studies",
  "simulatedRoiLow",
  "guardrail",
]) {
  if (!model.includes(requiredModelText)) {
    throw new Error(`Business control model is missing: ${requiredModelText}`);
  }
}

for (const requiredConnectorsText of [
  "CrmConnectorsDashboard",
  "useActiveBusinessLine",
  "visiblePlans",
  "Filtro superior activo",
  "Fuentes y Conectores",
  "Probar",
  "Actualizar datos",
  "Credenciales protegidas",
  "No se debe pegar una llave real",
  "No se generan ni muestran llaves reales",
  "Copiar endpoint",
  "Fallback sin conector",
]) {
  if (!connectors.includes(requiredConnectorsText)) {
    throw new Error(`CRM connectors dashboard is missing: ${requiredConnectorsText}`);
  }
}

for (const requiredImportText of [
  "roleKey !== \"gerente_operaciones\"",
  "Fuentes automaticas pendientes",
  "Formulario de importaciones",
]) {
  if (!readFileSync("components/import-operations-dashboard.tsx", "utf8").includes(requiredImportText)) {
    throw new Error(`Import operations dashboard is missing: ${requiredImportText}`);
  }
}

for (const requiredQualityText of [
  "DataQualityAnaliaDashboard",
  "useActiveBusinessLine",
  "visibleFindings",
  "Datos que el sistema sugiere revisar",
  "Datos que podríamos recopilar",
  "Monto demasiado alto o bajo",
  "Sucursal o periodo no cuadran",
  "Registros duplicados",
  "Datos incompletos",
  "Capacidad por sucursal",
  "Gerente responsable",
]) {
  if (!quality.includes(requiredQualityText)) {
    throw new Error(`Data quality dashboard is missing: ${requiredQualityText}`);
  }
}

for (const requiredGoalsText of [
  "GoalsAdvancesDashboard",
  "GoalProjectionChart",
  "useActiveBusinessLine",
  "visibleGoalSuggestions",
  "ROI simulado",
  "Presupuestado, proyectado y cumplido",
  "Proyectado",
  "Presupuestado",
  "Sugerencias cautelosas",
  "Aprobar DEMO",
  "Colocacion de bonos",
  "Condicion para aprobar",
  "supuestos DEMO",
]) {
  if (!goals.includes(requiredGoalsText)) {
    throw new Error(`Goals dashboard is missing: ${requiredGoalsText}`);
  }
}

for (const requiredHookText of [
  "useActiveBusinessLine",
  "resolveActiveBusinessLine",
  "analiza:selected-context",
  "analiza:context-change",
  '"__consolidated__": "Consolidado"',
  "explicitConsolidatedContext",
  "(explicitConsolidatedContext ? undefined : demoBusinessLineCode)",
  "lineParam: searchParams.get(\"line\")",
  "return \"Laboratorio\"",
  "return \"Fisioterapia\"",
  "return \"Imagenes\"",
  "return \"Consolidado\"",
]) {
  if (!hook.includes(requiredHookText)) {
    throw new Error(`Active business-line hook is missing: ${requiredHookText}`);
  }
}

for (const requiredHeaderText of [
  "Linea activa",
  "Linea asignada",
  "scopedCompanyAccess",
  "Pais o region",
  "border-2 border-primary/50",
  "handleBusinessLineChange",
]) {
  if (!header.includes(requiredHeaderText)) {
    throw new Error(`Context header priority is missing: ${requiredHeaderText}`);
  }
}

const routeReplaceIndex = header.indexOf("replaceRouteSearchParams(searchParams)");
const contextEventIndex = header.indexOf(
  "window.dispatchEvent(new Event(contextChangeEvent))",
);

if (
  !header.includes("router.replace(nextHref, { scroll: false })") ||
  routeReplaceIndex < 0 ||
  contextEventIndex < routeReplaceIndex
) {
  throw new Error(
    "Context header must update URL/server context through the router before notifying dashboards.",
  );
}

if (!layout.includes("lg:items-start")) {
  throw new Error("Protected layout must align the dominant selector at the top.");
}

for (const requiredRouteText of [
  "AccountProfileDashboard",
  "CrmConnectorsDashboard",
  "DataQualityAnaliaDashboard",
  "GoalsAdvancesDashboard",
  'module === "configuracion"',
  'module === "conectores"',
  'module === "calidad-datos"',
  'module === "metas"',
]) {
  if (!modulePage.includes(requiredRouteText)) {
    throw new Error(`Module route is missing: ${requiredRouteText}`);
  }
}

for (const requiredDocsText of [
  "Conectores CRM",
  "llaves reales",
  "server-side",
  "Calidad de datos",
  "Datos que el sistema sugiere revisar",
  "Datos que podríamos recopilar",
  "Metas, avances, bonos y ROI",
  "selector superior de linea de negocio gobierna",
  "linea seleccionada arriba limita las metas visibles",
  "ROI es un rango `DEMO` simulado",
]) {
  if (!docs.includes(requiredDocsText)) {
    throw new Error(`Business control docs are missing: ${requiredDocsText}`);
  }
}

if (!packageJson.includes("tests/business-control-center.test.mjs")) {
  throw new Error("Test script must include business control center checks.");
}

console.log("Business control center checks passed.");
