import { readFileSync, statSync } from "node:fs";

const requiredFiles = [
  "AGENTS.md",
  "docs/product-scope.md",
  "docs/architecture.md",
  "docs/database-design.md",
  "docs/security-model.md",
  "docs/design-system.md",
  "docs/kpi-dictionary.md",
  "docs/data-ingestion.md",
  "docs/connectors.md",
  "docs/implementation-plan.md",
  "docs/deployment.md",
  "docs/user-guide.md",
];

for (const file of requiredFiles) {
  const stats = statSync(file);
  if (!stats.isFile() || stats.size === 0) {
    throw new Error(`${file} must exist and contain content`);
  }
}

const agentRules = readFileSync("AGENTS.md", "utf8");
const requiredRules = [
  "strict TypeScript",
  "Do not use `any`",
  "Never expose secrets",
  "service role keys",
  "Do not use real patient data",
  "Anonymize patient identifiers",
  "Mark all simulated data visibly as `DEMO`",
  "Do not invent operational, financial, or clinical data",
  "Do not show metrics when essential fields are missing",
  "Run lint",
  "Create new migrations",
  "Keep traceability",
  "Do not perform scraping that evades authentication",
  "Prefer official APIs",
  "Document architectural decisions",
];

for (const rule of requiredRules) {
  if (!agentRules.includes(rule)) {
    throw new Error(`AGENTS.md is missing required rule: ${rule}`);
  }
}

console.log("Phase 0 documentation checks passed.");

