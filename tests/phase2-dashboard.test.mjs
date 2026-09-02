import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";


function findTextReferences(needle, roots) {
  const matches = [];
  const visit = (path) => {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
        visit(join(path, entry.name));
      }
      return;
    }

    if (!/\.(?:[cm]?[jt]sx?|json|md|css|html)$/i.test(path)) return;
    const content = readFileSync(path, "utf8");
    if (content.includes(needle)) matches.push(path);
  };

  for (const root of roots) visit(root);
  return matches;
}

const navigationPath = "lib/navigation.ts";
const dashboardDataPath = "lib/analytics/demo-dashboard.ts";
const dashboardComponentPath = "components/executive-dashboard.tsx";
const branchNetworkDashboardComponentPath =
  "components/branch-network-dashboard.tsx";
const operationDashboardComponentPath =
  "components/executive-operation-dashboard.tsx";
const financialDashboardComponentPath =
  "components/financial-health-dashboard.tsx";
const patientFlowDashboardComponentPath =
  "components/patient-flow-demand-dashboard.tsx";
const capacityDashboardComponentPath =
  "components/capacity-occupancy-dashboard.tsx";
const analyticsChartComponentPath = "components/analytics-comparison-chart.tsx";
const businessModuleComponentPath = "components/business-module-dashboard.tsx";
const contextHeaderPath = "components/tenant-context-header.tsx";
const contextSelectionFormPath = "components/context-selection-form.tsx";
const contextDataPath = "lib/tenant/demo-context.ts";
const businessModulesPath = "lib/analytics/demo-business-modules.ts";
const appSidebarPath = "components/app-sidebar.tsx";
const roleHomeComponentPath = "components/role-workspace-home.tsx";
const readableTabsComponentPath = "components/readable-tabs.tsx";
const elSalvadorTemplatesPath =
  "lib/analytics/el-salvador-result-templates.ts";
const kpiRegistryPath = "lib/analytics/kpi-registry.ts";
const businessLineOperationsPath = "lib/analytics/business-line-operations.ts";
const branchNetworkPath = "lib/analytics/branch-network.ts";
const executiveOperationPath = "lib/analytics/executive-operation.ts";
const financialHealthPath = "lib/analytics/financial-health.ts";
const patientFlowDemandPath = "lib/analytics/patient-flow-demand.ts";
const capacityOccupancyPath = "lib/analytics/capacity-occupancy.ts";
const modulePagePath = "app/protected/[module]/page.tsx";

for (const file of [
  navigationPath,
  dashboardDataPath,
  dashboardComponentPath,
  branchNetworkDashboardComponentPath,
  operationDashboardComponentPath,
  financialDashboardComponentPath,
  patientFlowDashboardComponentPath,
  capacityDashboardComponentPath,
  analyticsChartComponentPath,
  businessModuleComponentPath,
  contextHeaderPath,
  contextSelectionFormPath,
  contextDataPath,
  businessModulesPath,
  appSidebarPath,
  roleHomeComponentPath,
  readableTabsComponentPath,
  elSalvadorTemplatesPath,
  kpiRegistryPath,
  businessLineOperationsPath,
  branchNetworkPath,
  executiveOperationPath,
  financialHealthPath,
  patientFlowDemandPath,
  capacityOccupancyPath,
  modulePagePath,
]) {
  statSync(file);
}

const navigation = readFileSync(navigationPath, "utf8");
const dashboardData = readFileSync(dashboardDataPath, "utf8");
const dashboardComponent = readFileSync(dashboardComponentPath, "utf8");
const branchNetworkDashboardComponent = readFileSync(
  branchNetworkDashboardComponentPath,
  "utf8",
);
const operationDashboardComponent = readFileSync(
  operationDashboardComponentPath,
  "utf8",
);
const financialDashboardComponent = readFileSync(
  financialDashboardComponentPath,
  "utf8",
);
const patientFlowDashboardComponent = readFileSync(
  patientFlowDashboardComponentPath,
  "utf8",
);
const capacityDashboardComponent = readFileSync(
  capacityDashboardComponentPath,
  "utf8",
);
const analyticsChartComponent = readFileSync(analyticsChartComponentPath, "utf8");
const businessModuleComponent = readFileSync(
  businessModuleComponentPath,
  "utf8",
);
const contextHeader = readFileSync(contextHeaderPath, "utf8");
const contextSelectionForm = readFileSync(contextSelectionFormPath, "utf8");
const contextData = readFileSync(contextDataPath, "utf8");
const businessModules = readFileSync(businessModulesPath, "utf8");
const appSidebar = readFileSync(appSidebarPath, "utf8");
const roleHomeComponent = readFileSync(roleHomeComponentPath, "utf8");
const readableTabsComponent = readFileSync(readableTabsComponentPath, "utf8");
const elSalvadorTemplates = readFileSync(elSalvadorTemplatesPath, "utf8");
const kpiRegistry = readFileSync(kpiRegistryPath, "utf8");
const businessLineOperations = readFileSync(
  businessLineOperationsPath,
  "utf8",
);
const branchNetwork = readFileSync(branchNetworkPath, "utf8");
const executiveOperation = readFileSync(executiveOperationPath, "utf8");
const financialHealth = readFileSync(financialHealthPath, "utf8");
const patientFlowDemand = readFileSync(patientFlowDemandPath, "utf8");
const capacityOccupancy = readFileSync(capacityOccupancyPath, "utf8");
const modulePage = readFileSync(modulePagePath, "utf8");

const requiredNavigationTitles = [
  "Resumen ejecutivo",
  "Operacion ejecutiva",
  "Salud financiera",
  "Citas por negocio",
  "Capacidad y ocupacion",
  "Sucursales",
  "Gerentes y bonos",
  "Profesionales",
  "Servicios",
  "Fisioterapia",
  "Laboratorio",
  "Imagenes",
  "Insights",
  "Importaciones",
  "Formulario mensual",
  "Conectores",
  "Calidad de datos",
  "Metas y avances",
  "Usuarios y permisos",
  "Mi cuenta",
  "Auditoria del sistema",
];

for (const title of requiredNavigationTitles) {
  if (!navigation.includes(`title: "${title}"`)) {
    throw new Error(`Missing navigation item: ${title}`);
  }
}

if (!navigation.includes("getNavigationForRole")) {
  throw new Error("Navigation must expose role-aware filtering.");
}

if (!navigation.includes("navigationGroups")) {
  throw new Error("Navigation must expose grouped work sections.");
}

if (!navigation.includes("getGroupedNavigationForRole")) {
  throw new Error("Navigation must expose grouped role navigation.");
}

for (const requiredNavigationGroup of [
  "Direccion",
  "Operacion",
  "Gestion",
  "Lineas de negocio",
  "Datos",
  "Sistema",
]) {
  if (!navigation.includes(`title: "${requiredNavigationGroup}"`)) {
    throw new Error(`Navigation group is missing: ${requiredNavigationGroup}`);
  }
}

for (const requiredRole of [
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
  "viewer",
]) {
  if (!navigation.includes(`"${requiredRole}"`)) {
    throw new Error(`Navigation is missing official role: ${requiredRole}`);
  }
}

for (const requiredUploadRole of [
  "super_admin",
  "webmaster_admin",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
]) {
  if (!navigation.includes(`"${requiredUploadRole}"`)) {
    throw new Error(`Upload navigation is missing: ${requiredUploadRole}`);
  }
}

if (!navigation.includes("connectorAdminRoles")) {
  throw new Error("Connector modules should use connectorAdminRoles.");
}

if (!navigation.includes("delegatedUserAdminRoles")) {
  throw new Error("User administration must use delegatedUserAdminRoles.");
}

const requiredKpis = [
  "Ingresos facturados",
  "Ingresos cobrados",
  "Cuentas por cobrar",
  "Citas agendadas",
  "Citas completadas",
  "No-shows",
  "Ocupacion agendada",
  "Ocupacion efectiva",
  "Brecha de asistencia",
  "Margen contribucion estimado",
  "Meta de ingresos",
];

for (const kpi of requiredKpis) {
  if (!dashboardData.includes(`label: "${kpi}"`)) {
    throw new Error(`Missing executive KPI: ${kpi}`);
  }
}

for (const requiredText of [
  "Entorno DEMO",
  "Completitud",
  "Fuentes utilizadas",
  "Ultima actualizacion",
  "Resumen por linea de negocio",
  "Sin total mezclado",
  "Salud financiera de las lineas del negocio",
  "Participacion por empresa",
  "Metas vs resultados por empresa",
  "Cambia con el selector superior",
  "Vista ejecutiva activa",
  "Estado general de las lineas",
  "Lo primero que ve el CEO",
  "Crecimiento",
  "Pacientes",
  "Ticket",
  "Detalle operativo por linea de negocio",
  "Elige la linea para ver citas por estado",
  "Rendimiento de la linea seleccionada",
]) {
  if (!dashboardComponent.includes(requiredText)) {
    throw new Error(`Dashboard is missing required text: ${requiredText}`);
  }
}

for (const requiredDashboardData of [
  "dashboardBusinessLines",
  "getBusinessLinesForDashboard",
  "getRevenueShareData",
  "getTargetVsActualByLine",
  "getAppointmentStatusByLine",
  "getOccupancyByLine",
  "revenueGrowthRate",
  "executiveInterpretation",
  "executiveStatus",
  "Analiza Fisioterapia",
  "Analiza Laboratorio",
  "Analiza Imagenes",
]) {
  if (!dashboardData.includes(requiredDashboardData)) {
    throw new Error(`Dashboard data is missing: ${requiredDashboardData}`);
  }
}

for (const requiredSidebarText of [
  "Inicio por rol",
  "Rol DEMO",
  "demoRoleProfiles",
  "analiza:demo-role",
  "modulos visibles",
  "getGroupedNavigationForRole",
  "group.title",
]) {
  if (!appSidebar.includes(requiredSidebarText)) {
    throw new Error(`Sidebar role switcher is missing: ${requiredSidebarText}`);
  }
}

for (const requiredRoleHomeText of [
  "Bandeja de trabajo",
  "Jerarquia de roles",
  "Alta de sucursal por linea",
  "Lectura en 10 segundos",
  "Que necesita decidir o completar este rol ahora",
  "Acceso recomendado",
  "Atajos por rol",
  "Cierres pendientes",
  "Completar cierre mensual",
]) {
  if (!roleHomeComponent.includes(requiredRoleHomeText)) {
    throw new Error(`Role home is missing: ${requiredRoleHomeText}`);
  }
}

for (const requiredReadableTabsText of [
  "ReadableTabs",
  "role=\"tablist\"",
  "role=\"tabpanel\"",
  "Secciones de lectura",
]) {
  if (!readableTabsComponent.includes(requiredReadableTabsText)) {
    throw new Error(`Readable tabs are missing: ${requiredReadableTabsText}`);
  }
}

for (const readableScreenPath of [
  "components/professional-performance-dashboard.tsx",
  "components/service-portfolio-dashboard.tsx",
  "components/manager-bonus-dashboard.tsx",
  "components/laboratory-presentation-dashboard.tsx",
  "components/imaging-presentation-dashboard.tsx",
  "components/import-operations-dashboard.tsx",
]) {
  let screenSource = "";

  try {
    screenSource = readFileSync(readableScreenPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      continue;
    }

    throw error;
  }

  if (!screenSource.includes("ReadableTabs")) {
    throw new Error(`Heavy dashboard must use readable tabs: ${readableScreenPath}`);
  }
}

for (const requiredRoleScopeText of [
  'const ceoFocusedRoles: RoleKey[] = ["ceo"]',
  'const operationsFocusedRoles: RoleKey[] = ["gerente_operaciones"]',
  "adminDataRoles",
]) {
  if (!navigation.includes(requiredRoleScopeText)) {
    throw new Error(`Navigation role scope is too broad: ${requiredRoleScopeText}`);
  }
}

if (
  !contextHeader.includes("analiza:selected-context") &&
  !contextHeader.includes("globalContextStorageKey")
) {
  throw new Error("Header context selector must persist selected context.");
}

for (const requiredContextText of [
  "Linea activa",
  "Pais o region",
  "Filtros",
  "Filtros avanzados",
  "Fecha desde",
  "Fecha hasta",
  "globalContextChangeEvent",
  "businessLineId",
  "managerName",
  "professionalName",
  "serviceName",
  "payerName",
  "channelName",
  "demoChannelOptions",
  "demoPayerOptions",
  "demoServiceOptions",
  "demoProfessionalOptions",
  "window.sessionStorage.setItem",
  "toGlobalFilterSearchParams",
]) {
  if (!contextHeader.includes(requiredContextText)) {
    throw new Error(`Header selector is missing: ${requiredContextText}`);
  }
}

for (const requiredContextSelectionText of [
  "Linea de negocio",
  "businessLineName",
  "businessLineCode",
  "window.sessionStorage.setItem",
  "URLSearchParams",
]) {
  if (!contextSelectionForm.includes(requiredContextSelectionText)) {
    throw new Error(
      `Context selection form is missing: ${requiredContextSelectionText}`,
    );
  }
}

for (const requiredContextData of [
  "Vista regional",
  "Vista consolidada",
  "demoCountryOptions",
  "demoCompanyOptions",
  "demoBusinessLineOptions",
  "CONSOLIDATED",
  "PHYSIOTHERAPY",
  "LABORATORY",
  "IMAGING",
  "elSalvadorResultBranches",
]) {
  if (!contextData.includes(requiredContextData)) {
    throw new Error(`Context data is missing: ${requiredContextData}`);
  }
}

for (const requiredKpiRegistryText of [
  "KpiRegistryItem",
  "PENDING_UPLOAD",
  "NOT_CONNECTED",
  "INCOMPLETE",
  "NOT_APPLICABLE",
  "requiredFields",
  "allowedRoles",
  "higherIsBetter",
  "safeDivide",
  "Pendiente de carga",
  "Datos pendientes de conexion",
  "Datos incompletos",
  "No aplica",
]) {
  if (!kpiRegistry.includes(requiredKpiRegistryText)) {
    throw new Error(`KPI registry is missing: ${requiredKpiRegistryText}`);
  }
}

for (const requiredLineOperationText of [
  "Ordenes y pacientes",
  "Laboratorio opera por ordenes, pacientes, muestras, pruebas y resultados; no por citas.",
  "Laboratorio no muestra no-show salvo que exista un proceso especifico de reserva.",
  "utilizacion_analizador = pruebas_procesadas / capacidad_tecnica_disponible",
  "Indice normalizado de utilizacion",
]) {
  if (!businessLineOperations.includes(requiredLineOperationText)) {
    throw new Error(
      `Business-line operation model is missing: ${requiredLineOperationText}`,
    );
  }
}

if (!modulePage.includes("ExecutiveOperationDashboard")) {
  throw new Error("Operacion ejecutiva must use the specialized operation dashboard.");
}

if (!modulePage.includes("FinancialHealthDashboard")) {
  throw new Error("Salud financiera must use the specialized financial dashboard.");
}

if (!modulePage.includes("PatientFlowDemandDashboard")) {
  throw new Error("Citas por negocio must use the specialized patient flow dashboard.");
}

if (!modulePage.includes("CapacityOccupancyDashboard")) {
  throw new Error("Capacidad y ocupacion must use the specialized capacity dashboard.");
}

if (!modulePage.includes("BranchNetworkDashboard")) {
  throw new Error("Sucursales must use the specialized branch network dashboard.");
}

for (const requiredAnalyticsChartText of [
  "AnalyticsComparisonChart",
  "Comparaciones activas",
  "Fecha exacta",
  "onPointerMove",
  "hoverIndex",
  "KPI a comparar",
  "Fecha desde",
  "Fecha hasta",
  "Comparar contra",
  "Rango comparativo",
  "same-period-last-year",
  "previous-period",
  "target",
  "custom",
  "metricOptions",
  "TrendSeries",
  "TrendInsight",
  "polyline",
]) {
  if (!analyticsChartComponent.includes(requiredAnalyticsChartText)) {
    throw new Error(`Analytics comparison chart is missing: ${requiredAnalyticsChartText}`);
  }
}

for (const requiredBranchUiText of [
  "Pantalla de sucursales activa",
  "Filtros de sucursal",
  "Ranking integral de sucursales",
  "Mapa operativo de sucursales",
  "Matriz rentabilidad versus operacion",
  "Puntaje operativo",
  "Rentable con riesgo operativo",
  "Intervencion prioritaria",
  "Pasa encima",
  "Heatmap de sucursales por KPI",
  "Sucursales para tendencia",
  "Principal fortaleza",
  "Principal problema",
  "Accion prioritaria",
  "Contribucion de cada sucursal a la red",
  "Causas de perdida por sucursal",
  "Regla: Sucursales responde cual sede funciona mejor",
  "AnalyticsComparisonChart",
  "resolveBusinessLineSlug",
  "getBranchNetworkScreen",
]) {
  if (!branchNetworkDashboardComponent.includes(requiredBranchUiText)) {
    throw new Error(
      `Branch network dashboard UI is missing: ${requiredBranchUiText}`,
    );
  }
}

for (const requiredBranchDataText of [
  "allBranchNetworkRecords",
  "getBranchNetworkScreen",
  "buildBranchTrendChart",
  "Puntaje comparable",
  "Resultado financiero",
  "Mapa de mando de toda la red",
  "Laboratorio por sucursal",
  "Fisioterapia por sucursal",
  "Imagenes por sucursal",
  "Aguilares crecio 14% en ordenes",
  "La sucursal Centro tiene una ocupacion agendada de 89%",
  "Santa Tecla concentra la mayor lista de espera de tomografia",
  "Comparar cada sede contra promedio de red",
  "El puntaje nunca se muestra solo",
  "fecha exacta",
  "venta-neta-sucursal",
  "pacientes-sucursal",
  "margen-sucursal",
  "ocupacion-sucursal",
  "sla-sucursal",
  "score-sucursal",
]) {
  if (!branchNetwork.includes(requiredBranchDataText)) {
    throw new Error(`Branch network data is missing: ${requiredBranchDataText}`);
  }
}

for (const requiredCapacityUiText of [
  "Pantalla de capacidad activa",
  "Formulario para crear o editar capacidad de sucursal",
  "Ocupacion agendada calculada",
  "Ocupacion efectiva calculada",
  "Capacidad exitosa calculada",
  "Filtros de capacidad",
  "Capacidad y ocupacion",
  "Atencion exitosa",
  "Drill-down por sucursal",
  "Que debemos hacer con la capacidad",
  "Regla: esta pantalla mide cuanto podia producirse",
  "AnalyticsComparisonChart",
  "resolveBusinessLineSlug",
  "getCapacityOccupancyScreen",
  "Estado de la atencion",
  "Tipo de capacidad",
]) {
  if (!capacityDashboardComponent.includes(requiredCapacityUiText)) {
    throw new Error(
      `Capacity dashboard UI is missing: ${requiredCapacityUiText}`,
    );
  }
}

for (const requiredCapacityDataText of [
  "capacityTrendOptions",
  "Capacidad y ocupacion",
  "indice-normalizado-utilizacion",
  "atencion-exitosa",
  "capacidad-perdida",
  "brecha-agendada-efectiva",
  "Ocupacion clinica y aprovechamiento de agenda",
  "ocupacion-efectiva-fisio",
  "ocupacion-agendada-fisio",
  "capacidad-recuperada-fisio",
  "ingreso-perdido-fisio-capacidad",
  "Capacidad tecnica y procesamiento exitoso",
  "utilizacion-tecnica-lab",
  "procesamiento-exitoso-lab",
  "cola-muestras-lab",
  "equipo-detenido-lab",
  "Utilizacion de equipos y estudios exitosos",
  "utilizacion-real-imagenes",
  "estudios-exitosos-imagenes",
  "lista-espera-imagenes",
  "capacidad-perdida-imagenes",
  "La sucursal Centro tiene 88% de ocupacion agendada",
  "Quimica usa 96% de capacidad",
  "Redistribuir pacientes de Santa Tecla",
]) {
  if (!capacityOccupancy.includes(requiredCapacityDataText)) {
    throw new Error(
      `Capacity occupancy data is missing: ${requiredCapacityDataText}`,
    );
  }
}

for (const requiredPatientFlowUiText of [
  "Pantalla de flujo activa",
  "Filtros de flujo",
  "Citas por negocio",
  "Drill-down por sucursal",
  "Comparacion por linea",
  "AnalyticsComparisonChart",
  "resolveBusinessLineSlug",
  "getPatientFlowDemandScreen",
  "Tendencia con fechas",
  "KPI a comparar",
  "MetricTrendPanel",
  "Estado del flujo",
  "Dia de la semana",
  "Franja horaria",
]) {
  if (!patientFlowDashboardComponent.includes(requiredPatientFlowUiText)) {
    throw new Error(
      `Patient flow dashboard UI is missing: ${requiredPatientFlowUiText}`,
    );
  }
}

if (
  patientFlowDashboardComponent.includes("grid gap-4 xl:grid-cols-2") &&
  patientFlowDashboardComponent.includes("MetricTrendPanel")
) {
  throw new Error(
    "Patient flow KPI trend panels must not be nested inside side-by-side block cards.",
  );
}

for (const requiredPatientFlowDataText of [
  "Flujo de pacientes y demanda",
  "patientFlowTrendOptions",
  "recurrencia-consolidada",
  "conversion-flujo",
  "demanda-no-atendida",
  "dias-entre-visitas",
  "Pacientes, ordenes y recurrencia",
  "Laboratorio no usa citas como indicador principal",
  "pacientes-recurrentes-lab",
  "ordenes-recibidas-lab",
  "conversion-orden-lab",
  "demanda-perdida-lab",
  "Agenda, continuidad y recurrencia terapeutica",
  "continuidad-terapeutica",
  "pacientes-riesgo-abandono",
  "Demanda, agenda y realizacion de estudios",
  "solicitudes-imagenes",
  "estudios-realizados-imagenes",
  "informes-pendientes-imagenes",
  "demanda-no-atendida-imagenes",
  "Los pacientes recurrentes representan 58% del volumen",
  "El 72% de abandonos ocurre antes de la cuarta sesion",
  "Tomografia tiene lista de espera de 4.8 dias",
]) {
  if (!patientFlowDemand.includes(requiredPatientFlowDataText)) {
    throw new Error(
      `Patient flow demand data is missing: ${requiredPatientFlowDataText}`,
    );
  }
}

for (const requiredOperationUiText of [
  "Pantalla definida por selector superior",
  "Pantalla activa",
  "Cambia la linea de negocio en el selector superior",
  "Esta pantalla no mezcla unidades",
  "Lectura ejecutiva",
  "AnalyticsComparisonChart",
  "resolveBusinessLineSlug",
  "getExecutiveOperationScreen",
]) {
  if (!operationDashboardComponent.includes(requiredOperationUiText)) {
    throw new Error(
      `Operation dashboard UI is missing: ${requiredOperationUiText}`,
    );
  }
}

for (const requiredOperationDataText of [
  "trendChart",
  "Tendencia operativa normalizada",
  "operationTrendOptions",
  "productividad-normalizada",
  "visitas-atendidas",
  "ocupacion-real",
  "muestras-pendientes",
  "informes-pendientes",
  "utilizacion-real",
  "Ordenes procesadas vs ano anterior y meta",
  "Sesiones atendidas vs ano anterior y meta",
  "Estudios realizados vs ano anterior y meta",
  "Operacion ejecutiva consolidada",
  "Pacientes unicos",
  "Ingresos asociados a la operacion",
  "Cumplimiento de volumen",
  "Productividad normalizada",
  "Nivel de servicio",
  "Incidencias criticas",
  "Calidad operativa",
  "Sucursales con desviaciones",
  "Comparacion por linea",
  "Operacion de laboratorio",
  "A. Ordenes y pacientes",
  "B. Flujo de muestras",
  "C. Tiempo de entrega",
  "D. Demanda por dia y hora",
  "E. Productividad",
  "F. Capacidad tecnica",
  "Orden recibida -> paciente atendido -> muestra tomada -> muestra procesada -> resultado validado -> resultado entregado",
  "Operacion de fisioterapia",
  "A. Agenda",
  "B. Atencion",
  "C. Capacidad",
  "D. Continuidad terapeutica",
  "E. Resultados",
  "F. Productividad profesional",
  "Operacion de imagenes",
  "A. Solicitudes y agenda",
  "B. Produccion",
  "C. Informes",
  "D. Equipos",
  "E. Calidad",
  "F. Productividad",
]) {
  if (!executiveOperation.includes(requiredOperationDataText)) {
    throw new Error(
      `Executive operation data is missing: ${requiredOperationDataText}`,
    );
  }
}

for (const requiredFinancialUiText of [
  "Pantalla financiera activa",
  "Separado por linea de negocio",
  "Finanzas responde cuanto ingreso genero la operacion",
  "Regla para no duplicar informacion",
  "Insight financiero clave",
  "Comparacion financiera entre lineas",
  "AnalyticsComparisonChart",
  "resolveBusinessLineSlug",
  "getFinancialHealthScreen",
]) {
  if (!financialDashboardComponent.includes(requiredFinancialUiText)) {
    throw new Error(
      `Financial dashboard UI is missing: ${requiredFinancialUiText}`,
    );
  }
}

for (const requiredFinancialDataText of [
  "Salud financiera consolidada",
  "Estado financiero ejecutivo",
  "Venta bruta",
  "Descuentos",
  "Impuestos",
  "Venta neta",
  "Costos directos",
  "Margen de contribucion",
  "Gastos operativos",
  "Utilidad operativa",
  "Cumplimiento de presupuesto",
  "Proyeccion de cierre",
  "Finanzas de laboratorio",
  "A. Ventas",
  "B. Ventas por canal",
  "C. Formas de pago",
  "D. Costos de produccion",
  "E. Rentabilidad",
  "F. Gastos operativos",
  "G. Impacto de inventario",
  "Finanzas de fisioterapia",
  "B. Ticket y paciente",
  "E. Fugas financieras",
  "Finanzas de imagenes",
  "B. Costos directos",
  "D. Equipos y CAPEX",
  "E. Perdidas",
  "Venta neta vs ano anterior y presupuesto",
  "financialTrendOptions",
  "venta-neta",
  "costo-directo",
  "margen-porcentual",
  "utilidad-operativa",
  "inventario-riesgo",
  "ingreso-perdido",
  "costo-sesion",
  "utilidad-paciente",
  "perdida-equipo",
  "ingreso-hora-equipo",
  "Venta laboratorio vs costo directo y meta",
  "Ingreso de fisioterapia vs fuga financiera",
  "Venta de imagenes vs costo de equipo y meta",
  "Las 42 pruebas repetidas generaron un costo adicional de $860",
]) {
  if (!financialHealth.includes(requiredFinancialDataText)) {
    throw new Error(
      `Financial health data is missing: ${requiredFinancialDataText}`,
    );
  }
}

for (const requiredBusinessText of [
  "Operacion ejecutiva",
  "Salud financiera",
  "gastos fijos",
  "costos fijos/variables",
  "Calidad de datos significa",
  "CEO define la meta final",
  "Auditoria y trazabilidad",
  "Plantillas raiz del sistema",
]) {
  if (!businessModules.includes(requiredBusinessText)) {
    throw new Error(`Business module data is missing: ${requiredBusinessText}`);
  }
}

for (const requiredUserManagementText of [
  "Crear usuario",
  "Invitaciones y usuarios",
  "analiza:demo-users",
  "Contrasena temporal",
  "Enviar invitacion",
  "Resetear contrasena temporal",
  "/api/users/invite",
  "Reasignacion requerida",
  "Tu rol solo puede invitar usuarios de nivel inferior",
]) {
  if (!businessModuleComponent.includes(requiredUserManagementText)) {
    throw new Error(
      `Users and permissions manager is missing: ${requiredUserManagementText}`,
    );
  }
}

for (const requiredTemplateText of [
  "SS - Aguilares - L033",
  "SS - Chalatenango- L036",
  "SS - Constitucion - L009",
  "SS - La Libertad - L031",
  "SS-Merliot 2- L045",
  "SS - Plaza Sur - L018",
  "SS - Santa Tecla - L011",
  "containsPersonalData: true",
  "Archivo duplicado detectado",
  "Las hojas de clientes contienen datos personales",
]) {
  if (!elSalvadorTemplates.includes(requiredTemplateText)) {
    throw new Error(
      `El Salvador result template data is missing: ${requiredTemplateText}`,
    );
  }
}

const starterReferences = [
  ...findTextReferences("Next.js Supabase Starter", ["app", "components"]),
  ...findTextReferences("Supabase Starter Kit", ["app", "components"]),
];

if (starterReferences.length > 0) {
  throw new Error(`Starter text should not be visible:\n${starterReferences.join("\n")}`);
}

console.log("Phase 2 dashboard checks passed.");
