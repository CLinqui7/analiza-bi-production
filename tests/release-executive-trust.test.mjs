import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

function read(path) {
  statSync(path);
  return readFileSync(path, "utf8");
}

const environment = read("lib/security/environment.ts");
const database = read("lib/server/database.ts");
const officialBi = read("lib/server/official-bi.ts");
const dashboardValidationAgent = read(
  "lib/analytics/dashboard-validation-agent.ts",
);
const officialDashboard = read(
  "components/official-executive-data-dashboard.tsx",
);
const overviewPage = read("app/protected/overview/page.tsx");
const modulePage = read("app/protected/[module]/page.tsx");
const resultsPage = read("app/protected/resultados/page.tsx");
const monthlyRouter = read("components/monthly-closure-router.tsx");
const mobileNavigation = read("components/mobile-navigation.tsx");
const sidebar = read("components/app-sidebar.tsx");
const tenantContextHeader = read("components/tenant-context-header.tsx");
const roleHome = read("components/role-workspace-home.tsx");
const laboratoryWizard = read("components/laboratory-vertical-dashboard.tsx");
const imagingWizard = read("components/imaging-vertical-dashboard.tsx");

assert.ok(
  environment.includes('return "production"') &&
    !environment.includes('? "production" : "demo"'),
  "Runtime environment must fail closed and never default implicitly to demo.",
);

assert.ok(
  database.includes("assertSafePostgresRuntimeRole") &&
    database.includes("rolbypassrls") &&
    database.includes("rolsuper") &&
    database.includes("request.jwt.claim.sub") &&
    database.includes("set local role"),
  "PostgreSQL access must verify no bypassrls/superuser and set user context for RLS.",
);

assert.ok(
  overviewPage.includes("isDemoRuntimeEnvironment()") &&
    overviewPage.includes('await import("@/components/executive-dashboard")') &&
    overviewPage.includes("getOfficialExecutiveSnapshot") &&
    !overviewPage.includes("import { ExecutiveDashboard }"),
  "CEO Overview must import the demo dashboard only inside the APP_ENV=demo branch.",
);

assert.ok(
  officialBi.includes("monthly_closings") &&
    officialBi.includes("closing_versions") &&
    officialBi.includes("closing_kpi_results") &&
    officialBi.includes("kpi_targets") &&
    officialBi.includes("generated_insights") &&
    officialBi.includes("cv.status = 'PUBLISHED'") &&
    officialBi.includes("approved_at is not null") &&
    officialBi.includes("cv.is_demo = false") &&
    officialBi.includes("mc.is_demo = false") &&
    officialBi.includes("isScopeWildcard"),
  "Official BI snapshot must use published closings, calculated KPIs, approved targets and official insights only.",
);

assert.ok(
  !dashboardValidationAgent.includes("demo-dashboard"),
  "AnaliA validation agent must not import demo-dashboard outside demo-only components.",
);

assert.ok(
  officialDashboard.includes("Meta") &&
    officialDashboard.includes("Real") &&
    officialDashboard.includes("Variacion") &&
    officialDashboard.includes("Cumplimiento") &&
    officialDashboard.includes("Estado") &&
    officialDashboard.includes("Datos oficiales"),
  "Executive visuals must show Meta, Real, Variacion, Cumplimiento and Estado.",
);

assert.ok(
  modulePage.includes('renderOfficialDataModule("finances"') &&
    modulePage.includes('renderOfficialDataModule("targets"') &&
    modulePage.includes('renderOfficialDataModule("insights"') &&
    modulePage.includes("getOfficialExecutiveSnapshot") &&
    !modulePage.includes('import { FinancialHealthDashboard }') &&
    !modulePage.includes('import { GoalsAdvancesDashboard }') &&
    !modulePage.includes('import { InsightsIntelligenceDashboard }'),
  "Finanzas, Metas and Insights must use official data outside demo.",
);

assert.ok(
  !monthlyRouter.includes("demoCompanies") &&
    monthlyRouter.includes("requestedLine(line)") &&
    monthlyRouter.includes("isDemoRuntimeEnvironment()"),
  "Monthly closure routing must not use demoCompanies for real routing.",
);

assert.ok(
  mobileNavigation.includes("getGroupedNavigationForRole") &&
    mobileNavigation.includes("fixed inset-0") &&
    mobileNavigation.includes("roleKey") &&
    mobileNavigation.includes("hrefForItem") &&
    mobileNavigation.includes("business-line-laboratorio") &&
    mobileNavigation.includes("business-line-imagenes"),
  "Mobile and tablet navigation must be a role-aware drawer.",
);

assert.ok(
  !sidebar.includes("getCompanyForBusinessLine") &&
    !sidebar.includes('searchParams.set("company"') &&
    sidebar.includes('params.set("line", businessLineId)'),
  "Sidebar route links must not overwrite real context with demo company ids.",
);

assert.ok(
  tenantContextHeader.includes("isDemoEnvironment") &&
    tenantContextHeader.includes("consolidatedCompanyId") &&
    tenantContextHeader.includes("isDemoEnvironment ? readStoredContext() : null") &&
    tenantContextHeader.includes("isDemoEnvironment ? \"DEMO\" : \"Oficial\"") &&
    tenantContextHeader.includes("useRouter") &&
    tenantContextHeader.includes("useSearchParams") &&
    tenantContextHeader.includes("router.replace(nextHref, { scroll: false })") &&
    tenantContextHeader.includes(
      "currentUserAccess.scope.companyId !== consolidatedCompanyId",
    ) &&
    tenantContextHeader.includes("routeContextReady") &&
    !tenantContextHeader.includes("window.history.replaceState") &&
    !tenantContextHeader.includes('searchParams.set("company", nextCompany.id)'),
  "Global filter header must keep URL/server context primary, navigate with the Next router and avoid demo company routing outside demo.",
);

assert.ok(
  resultsPage.includes("await connection()") &&
    resultsPage.includes("<ResultsGate searchParams={searchParams} />") &&
    resultsPage.includes("line={params.line}") &&
    monthlyRouter.includes('normalizedValue === "business-line-imagenes"') &&
    monthlyRouter.includes('normalizedValue === "business-line-laboratorio"') &&
    monthlyRouter.includes('normalizedValue === "business-line-fisioterapia"') &&
    monthlyRouter.includes('normalizedValue?.includes("laboratorio")') &&
    officialBi.includes('normalizedLine?.includes("laboratorio")'),
  "Resultados must receive the active line from URL context and route every business line correctly.",
);

assert.ok(
  roleHome.includes("isDemoEnvironment") &&
    roleHome.includes("Datos oficiales") &&
    roleHome.includes("Cierres publicados") &&
    roleHome.includes("workspace.metrics"),
  "Homes by role must avoid hardcoded result metrics outside demo.",
);

for (const [label, source] of [
  ["Laboratory", laboratoryWizard],
  ["Imaging", imagingWizard],
]) {
  assert.ok(
    source.includes("Paso {activeStep + 1} de {wizardSteps.length}") &&
      source.includes("wizardProgress") &&
      source.includes("sticky bottom-3") &&
      source.includes("Campos avanzados de capacidad") &&
      source.includes("Campos avanzados de calidad"),
    `${label} wizard must have mobile progress, sticky actions and collapsible advanced fields.`,
  );
}
