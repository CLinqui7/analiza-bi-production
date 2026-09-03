import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(path, "utf8");
const navigation = read("lib/navigation.ts");
const page = read("app/protected/[module]/page.tsx");
const imports = read("components/import-operations-dashboard.tsx");
const router = read("components/monthly-closure-router.tsx");
const form = read("components/production/monthly-submission-center.tsx");
const v7Policy = read("lib/v7/security/authorization-policy.ts");
const routePolicy = read("lib/security/authorization-policy.ts");
const apiAuth = read("lib/v7/server/api-auth.ts");
const context = read("lib/v7/server/tenant-context.ts");
const monthlyApi = read("app/api/monthly-submissions/route.ts");
const publishApi = read("app/api/monthly-submissions/publish/route.ts");

assert.doesNotMatch(imports, /ManualMonthlyEntryDashboard/, "Importaciones must not embed the legacy monthly form.");
assert.match(page, /module === "plantillas"[\s\S]*MonthlyClosureRouter/, "Formulario mensual must use the V7 router.");
assert.match(router, /MonthlySubmissionCenter/, "The V7 router must render the production submission center.");
assert.match(navigation, /title: "Formulario mensual"[\s\S]*allowedRoles: \["gerente_sucursal"\]/, "Only GS may see Formulario mensual.");
assert.match(navigation, /title: "Importaciones"[\s\S]*allowedRoles: adminRoles/, "Importaciones must be administrator-only.");
assert.match(routePolicy, /\["\/protected\/cierres\/nuevo", "\/protected\/plantillas"\]/, "Legacy new-close URLs must use the GS-only route guard.");
assert.match(v7Policy, /"monthly_submission.write": \["gerente_sucursal"\]/, "Only GS may save monthly submissions.");
assert.match(v7Policy, /"monthly_submission.publish": \["gerente_sucursal"\]/, "Only GS may publish monthly submissions.");
assert.doesNotMatch(v7Policy.match(/"users\.invite": \[[^\]]+\]/)?.[0] ?? "", /gerente_sucursal/, "GS may not invite users.");
assert.match(apiAuth, /manager_assignments/, "V7 actor resolution must include real manager assignments.");
assert.match(apiAuth, /business_line_id,business_line_code/, "V7 actor grants must include the assigned business line.");
assert.match(context, /monthlyAssignments/, "Tenant context must expose branch + line assignments.");
assert.match(context, /actor\.roleKey !== "gerente_sucursal"/, "Monthly assignments must be limited to GS.");
assert.match(form, /monthly-assignment/, "A GS with multiple grants must receive one assignment selector.");
assert.match(form, /Pendiente de asignación/, "Missing area management must be explicit, not an empty select.");
assert.doesNotMatch(form, /Guardar avance DEMO|Publicar cierre DEMO/, "Production form must not contain demo actions.");
assert.match(monthlyApi, /businessLineId: businessLine\.id/, "Saving must enforce the branch + business-line grant.");
assert.match(publishApi, /AREA_MANAGER_ASSIGNMENT_REQUIRED/, "Publication must give an actionable error when GA is unassigned.");

console.log("manual-monthly-entry: PASS");
