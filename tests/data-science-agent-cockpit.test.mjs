import { readFileSync } from "node:fs";
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

const agentModel = readWorkspaceFile("lib/analytics/data-science-agent.ts");
const cockpit = readWorkspaceFile("components/data-science-agent-cockpit.tsx");
const insightsDashboard = readWorkspaceFile(
  "components/insights-intelligence-dashboard.tsx",
);
const documentation = readWorkspaceFile("docs/analia-data-science-agent.md");
const packageJson = readWorkspaceFile("package.json");

for (const requiredExport of [
  "getDataScienceCockpit",
  "selectChartForKpi",
  "DataScienceChartKind",
  "DataScienceCockpit",
]) {
  assert(
    agentModel.includes(requiredExport),
    `Data science agent model must expose ${requiredExport}.`,
  );
}

for (const requiredChart of [
  "line-year",
  "bar-comparison",
  "donut-mix",
  "waterfall-cost",
  "risk-scatter",
]) {
  assert(
    agentModel.includes(requiredChart),
    `Data science agent must support chart kind ${requiredChart}.`,
  );
}

for (const requiredField of [
  "lab_financial_target",
  "lab_total_sales",
  "lab_cost_of_sale",
  "lab_total_orders",
  "lab_total_clients",
  "medical_exam_sales_file",
]) {
  assert(
    agentModel.includes(requiredField),
    `Data science cockpit must trace Laboratorio KPI to ${requiredField}.`,
  );
}

assert(
  cockpit.includes("DataScienceAgentCockpit") &&
    cockpit.includes("KPI a comparar") &&
    cockpit.includes("Comparacion entre KPIs") &&
    cockpit.includes("Predicciones cautelosas"),
  "Cockpit component must render KPI selector, KPI comparison and cautious predictions.",
);

assert(
  cockpit.includes("<title>") &&
    cockpit.includes("2025") &&
    cockpit.includes("2026"),
  "Cockpit charts must expose tooltip data and year comparison labels.",
);

assert(
  insightsDashboard.includes("DataScienceAgentCockpit"),
  "Insights dashboard must render the data science cockpit.",
);

assert(
  documentation.includes("Motor de seleccion de graficas") &&
    documentation.includes("Cockpit predictivo por linea") &&
    documentation.includes("medical_exam_sales_file"),
  "AnaliA data science documentation must describe the new cockpit and inputs.",
);

assert(
  packageJson.includes("data-science-agent-cockpit.test.mjs"),
  "The data science cockpit test must run in npm test.",
);
