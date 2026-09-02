import { readFileSync, statSync } from "node:fs";

function read(path) {
  statSync(path);
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const packageJson = JSON.parse(read("package.json"));
const navigation = read("lib/navigation.ts");
const modulePage = read("app/protected/[module]/page.tsx");
const executiveDashboard = read("components/executive-dashboard.tsx");
const managerDashboard = read("components/manager-bonus-dashboard.tsx");
const accountProfile = read("components/account-profile-dashboard.tsx");
const accountProfileRoute = read("app/api/account/profile/route.ts");
const accountProfileMigration = read(
  "supabase/migrations/20260813000100_user_profile_details.sql",
);
const importsDashboard = read("components/import-operations-dashboard.tsx");
const connectorsDashboard = read("components/crm-connectors-dashboard.tsx");
const physioDashboard = read("components/physiotherapy-presentation-dashboard.tsx");
const laboratoryDashboard = read("components/laboratory-presentation-dashboard.tsx");
const imagingDashboard = read("components/imaging-presentation-dashboard.tsx");
const designSystem = read("docs/design-system.md");
const checklist = read("docs/production-readiness-checklist.md");
const demoScript = read("docs/executive-demo-script.md");
const knownRisks = read("docs/known-risks.md");
const architecture = read("docs/architecture-current.md");
const roadmap = read("docs/production-readiness-roadmap.md");

assert(
  packageJson.scripts?.build === "next build" &&
    packageJson.scripts?.dev === "next dev",
  "Local build and development must use Turbopack after validating generated CSS.",
);

assert(
  navigation.includes("Integraciones") &&
    navigation.includes("href: \"/protected/apis\""),
  "Navigation must define /protected/apis explicitly.",
);

assert(
  modulePage.includes('module === "conectores" || module === "apis"'),
  "Dynamic module route must resolve /protected/apis to connectors.",
);

assert(
  modulePage.includes("AccountProfileDashboard") &&
    modulePage.includes('module === "configuracion"'),
  "Dynamic module route must resolve /protected/configuracion to Mi cuenta.",
);

for (const requiredText of [
  "Resumen Ejecutivo",
  "Calidad del dato",
  "Tarjetas principales del Resumen Ejecutivo",
  "Requiere su atencion",
  "Ingresos",
  "Cumplimiento meta",
  "Margen de contribucion",
  "Pacientes/clientes atendidos",
  "Ocupacion agendada",
  "Ocupacion efectiva",
  "Citas completadas",
  "No-show",
  "Capacidad disponible",
  "Cuentas por cobrar",
  "Formula:",
  "md:hidden",
]) {
  assert(
    executiveDashboard.includes(requiredText),
    `Executive dashboard is missing: ${requiredText}`,
  );
}

for (const requiredManagerText of [
  "Rendimiento ejecutivo de gerentes",
  "Gerente Operaciones",
  "Gerente Area",
  "Gerente Sucursal",
  "Ingresos vs meta",
  "Ocupacion efectiva",
  "Finalizacion/SLA",
  "No-show",
  "No calculable sin agenda por gerente",
  "Productividad",
  "Margen",
  "Calidad",
  "Puntaje ejecutivo no concluyente",
]) {
  assert(
    managerDashboard.includes(requiredManagerText),
    `Manager dashboard is missing: ${requiredManagerText}`,
  );
}

for (const requiredAccountText of [
  "Perfil de usuario",
  "URL de foto",
  "Nombre preferido",
  "Telefono",
  "Cargo",
  "/api/account/profile",
]) {
  assert(
    accountProfile.includes(requiredAccountText),
    `Account profile dashboard is missing: ${requiredAccountText}`,
  );
}

for (const requiredAccountRouteText of [
  "getCurrentAuthorizationActor",
  "account_profile.updated",
  "https:",
  "photo_url",
  "preferred_name",
  "job_title",
  "Este perfil no es editable en modo DEMO",
]) {
  assert(
    accountProfileRoute.includes(requiredAccountRouteText),
    `Account profile API is missing: ${requiredAccountRouteText}`,
  );
}

for (const requiredAccountMigrationText of [
  "preferred_name",
  "phone",
  "job_title",
  "photo_url",
]) {
  assert(
    accountProfileMigration.includes(requiredAccountMigrationText),
    `Account profile migration is missing: ${requiredAccountMigrationText}`,
  );
}

for (const requiredImportText of [
  "ImportPipelineStepper",
  "Recepcion",
  "Revision de columnas",
  "Validacion",
  "Vista previa",
  "Publicacion",
  "Trazabilidad",
  "Archivo original preservado",
  "Datos publicados",
]) {
  assert(
    importsDashboard.includes(requiredImportText),
    `Import UX is missing: ${requiredImportText}`,
  );
}

for (const requiredConnectorText of [
  "Supervisa conexiones",
  "Credenciales protegidas",
  "No se debe pegar una llave real",
  "Sin configurar",
  "Vigencia",
  "Fallback sin conector",
  "md:hidden",
]) {
  assert(
    connectorsDashboard.includes(requiredConnectorText),
    `Connectors UX is missing: ${requiredConnectorText}`,
  );
}

assert(
  !connectorsDashboard.includes("Genera llaves DEMO"),
  "Connectors dashboard must not tell users to generate demo keys in browser.",
);

for (const requiredPhysioText of [
  "Lectura clinica de Fisioterapia",
  "Horas disponibles",
  "Horas agendadas",
  "Horas atendidas",
  "Sesiones",
  "No-show",
  "Ingreso/hora",
  "Utilizacion por fisioterapeuta",
]) {
  assert(
    physioDashboard.includes(requiredPhysioText),
    `Physiotherapy view is missing: ${requiredPhysioText}`,
  );
}

for (const requiredLabText of [
  "Lectura tecnica de Laboratorio",
  "Ordenes",
  "Pruebas",
  "Throughput",
  "Utilizacion",
  "TAT",
  "Rechazo",
  "Reproceso",
  "Ingreso/prueba",
  "Costo/prueba",
  "Margen",
]) {
  assert(
    laboratoryDashboard.includes(requiredLabText),
    `Laboratory view is missing: ${requiredLabText}`,
  );
}

for (const requiredImagingText of [
  "Lectura tecnica de Imagenes",
  "Estudios",
  "Modalidad",
  "Utilizacion equipo",
  "Tiempos",
  "Informes pendientes",
  "Downtime",
  "Productividad",
]) {
  assert(
    imagingDashboard.includes(requiredImagingText),
    `Imaging view is missing: ${requiredImagingText}`,
  );
}

for (const requiredDesignText of [
  "Macro Sprint 4 Executive System",
  "Spacing",
  "Typography",
  "Semantic States",
  "Charts",
  "Loading, Empty And Error",
]) {
  assert(
    designSystem.includes(requiredDesignText),
    `Design system is missing: ${requiredDesignText}`,
  );
}

for (const requiredChecklistText of [
  "Security",
  "Database",
  "Data",
  "Integrations",
  "Observability",
  "QA",
  "Deploy",
  "Manual Production Blockers",
]) {
  assert(
    checklist.includes(requiredChecklistText),
    `Production checklist is missing: ${requiredChecklistText}`,
  );
}

for (const requiredDemoText of [
  "maximo 10 minutos",
  "Executive Command Center",
  "detectar alerta",
  "comparar gerentes",
  "mostrar importacion",
  "calidad y lineage",
]) {
  assert(
    demoScript.includes(requiredDemoText),
    `Executive demo script is missing: ${requiredDemoText}`,
  );
}

for (const requiredDocText of [
  "Macro Sprint 4",
  "Production Ready",
  "verificacion DOM",
  "credenciales reales de conectores",
]) {
  assert(
    knownRisks.includes(requiredDocText) &&
      architecture.includes(requiredDocText) &&
      roadmap.includes(requiredDocText),
    `Sprint 4 docs are missing shared blocker text: ${requiredDocText}`,
  );
}

for (const forbiddenPattern of [
  /type=["']password["'][^>]*value=/i,
  /ANALIZA_DEMO_ADMIN_PASSWORD\s*=\s*["'][^"']+["']/,
]) {
  assert(
    !executiveDashboard.match(forbiddenPattern) &&
      !managerDashboard.match(forbiddenPattern) &&
      !importsDashboard.match(forbiddenPattern) &&
      !connectorsDashboard.match(forbiddenPattern),
    `Forbidden credential-like pattern found: ${forbiddenPattern}`,
  );
}

console.log("Macro Sprint 4 executive readiness checks passed.");
