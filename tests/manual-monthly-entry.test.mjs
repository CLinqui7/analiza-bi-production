import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

const componentPath = "components/manual-monthly-entry-dashboard.tsx";
const component = readWorkspaceFile(componentPath);
const importDashboard = readWorkspaceFile(
  "components/import-operations-dashboard.tsx",
);
const importOperations = readWorkspaceFile("lib/analytics/import-operations.ts");
const managedBranches = readWorkspaceFile("lib/tenant/managed-branch-records.ts");
const demoContext = readWorkspaceFile("lib/tenant/demo-context.ts");
const modulePage = readWorkspaceFile("app/protected/[module]/page.tsx");
const newClosurePage = readWorkspaceFile("app/protected/cierres/nuevo/page.tsx");
const navigation = readWorkspaceFile("lib/navigation.ts");
const packageJson = readWorkspaceFile("package.json");
const documentationExists = existsSync(join(root, "docs/manual-monthly-entry.md"));

assert(
  component.includes("Llena el cierre mensual de la sucursal"),
  "Manual monthly dashboard must expose the monthly closing form.",
);
assert(
  component.includes("Formulario en curso") &&
    component.includes("Resumen para publicar") &&
    component.includes("Control de carga"),
  "Manual monthly dashboard must present the form as a friendly closing wizard.",
);
assert(
  component.includes("analiza:manual-monthly-history"),
  "Manual monthly dashboard must persist DEMO history locally.",
);
assert(
  component.includes("Guardar avance DEMO") &&
    component.includes("Publicar cierre DEMO"),
  "Manual monthly dashboard must support draft and publish actions.",
);
assert(
  component.includes("useActiveBusinessLine"),
  "Manual monthly dashboard must be driven by the selected business line.",
);
assert(
  component.includes("demoBranches") &&
    component.includes("getBranchOptionsForLine") &&
    component.includes("Selecciona una sucursal") &&
    component.includes("areaManagerName") &&
    component.includes("branchManagerName"),
  "Manual monthly dashboard must render branch_reported as a branch selector.",
);
assert(
  component.includes("getBranchManagerOptions") &&
    component.includes("getAreaManagerOptions") &&
    component.includes('field.id === "manager_name"') &&
    component.includes('field.id === "area_manager_name"'),
  "Manual monthly dashboard must render branch and area managers as selectors.",
);
assert(
  component.includes("getMonthlyLoadDeadline") &&
    component.includes("2026-08-04") &&
    component.includes("monthValue, 4") &&
    component.includes("edit_authorization_code") &&
    component.includes("Ese cierre ya fue publicado"),
  "Manual monthly dashboard must enforce deadline and edit authorization rules.",
);
assert(
  component.includes("disabled={readOnly && isSystemDateField}") &&
    component.includes('"data_cutoff_date"') &&
    component.includes('"load_deadline_date"'),
  "Manual monthly dashboard must lock system-owned cutoff and deadline dates.",
);
assert(
  component.includes("scopedHistoryEntries") &&
    component.includes("No se") &&
    component.includes("muestran registros de otras sucursales"),
  "Manual monthly dashboard must scope YTD and history to the selected branch.",
);
assert(
  component.includes("scrollFormToTop") &&
    component.includes("requestAnimationFrame"),
  "Manual monthly dashboard must return to the form top when changing steps.",
);
assert(
  importDashboard.includes("ManualMonthlyEntryDashboard"),
  "Import operations must render the manual monthly dashboard.",
);
assert(
  modulePage.includes('module === "importaciones"') &&
    modulePage.includes("ImportOperationsDashboard") &&
    modulePage.includes('module === "plantillas"') &&
    modulePage.includes("MonthlyClosureRouter"),
  "Importaciones must render the import dashboard while Plantillas keeps the monthly router.",
);
assert(
  newClosurePage.includes('from "next/navigation"') &&
    newClosurePage.includes("redirect(`/protected/importaciones"),
  "The legacy new closure route must redirect to Importaciones.",
);
assert(
  navigation.includes('title: "Importaciones"') &&
    navigation.includes('href: "/protected/importaciones"') &&
    !navigation.includes('title: "Nuevo cierre mensual"'),
  "Navigation must expose Importaciones instead of Nuevo cierre mensual.",
);
assert(
  importOperations.includes("manualMonthlyFormSteps") &&
    importOperations.includes("manualMonthlyHistory"),
  "Import operations data model must include form steps and history.",
);

for (const businessLine of ["Laboratorio", "Fisioterapia", "Imagenes"]) {
  assert(
    importOperations.includes(`businessLine: "${businessLine}"`) ||
      importOperations.includes(`appliesTo: ["${businessLine}"]`),
    `Manual monthly model must include ${businessLine}.`,
  );
}

assert(
  importOperations.includes("sourceTrace"),
  "Manual monthly history must preserve source traceability.",
);
assert(
  importOperations.includes("area_manager_name") &&
    importOperations.includes("load_deadline_date") &&
    importOperations.includes("team_feedback_score"),
  "Manual monthly form must include area manager, deadline, and 360 evaluation fields.",
);
for (const requiredLabField of [
  "lab_financial_target",
  "lab_total_sales",
  "lab_cost_of_sale",
  "lab_medical_order_sales",
  "lab_medical_order_count",
  "lab_total_orders",
  "lab_total_clients",
  "lab_analiza_clients",
  "lab_drsv_clients",
  "lab_rent_expense",
  "lab_personnel_expense",
  "lab_phlebotomists_count",
  "inventory_consumables_amount",
  "inventory_reactives_quantity",
  "medical_exam_sales_file",
]) {
  assert(
    importOperations.includes(requiredLabField),
    `Laboratorio form must include template field ${requiredLabField}.`,
  );
}
for (const retiredLabField of [
  "lab_unique_clients",
  "lab_new_clients",
  "lab_recurring_clients",
  "lab_orders_per_client",
  "lab_tests",
  "lab_goal_completion_rate",
  "lab_sales_without_tax",
  "lab_margin_rate",
  "lab_margin_amount",
  "lab_operating_profit",
  "lab_no_doctor_patient_sales",
  "lab_no_doctor_order_count",
  "lab_profiles_total",
  "doctors_sales_file",
  "medical_reps_sales_file",
]) {
  assert(
    !importOperations.includes(retiredLabField),
    `Laboratorio form must not keep retired generic field ${retiredLabField}.`,
  );
}
assert(
  demoContext.includes("gerente_area") &&
    demoContext.includes("managedDemoBranches"),
  "Demo context must expose area manager role and managed branch catalog.",
);
assert(
  managedBranches.includes("managedBranchRecords") &&
    managedBranches.includes("Ana Maria Rivera Monroy") &&
    managedBranches.includes("Katherine Leonardo") &&
    managedBranches.includes("LABORATORY") &&
    managedBranches.includes("IMAGING") &&
    managedBranches.includes("PHYSIOTHERAPY"),
  "Managed branch catalog must preserve branches, branch managers, area managers, and lines from the workbook.",
);
assert(
  documentationExists,
  "Manual monthly entry decision must be documented.",
);
assert(
  packageJson.includes("manual-monthly-entry.test.mjs"),
  "The manual monthly entry test must run in npm test.",
);
