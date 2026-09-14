import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  emptyMonthlyDraft,
  hasMonthlyDraftContent,
  monthlyDraftKey,
  shouldApplyMonthlyResponse,
} from "../lib/monthly-form-drafts.ts";
import {
  isBlankMonthlyValue,
  isNonNegativeCountId,
  numericMonthlyValue,
} from "../lib/monthly-form-values.ts";
import { getManualMonthlyFormStepsForLine } from "../lib/analytics/import-operations.ts";

const contract = readFileSync("lib/monthly-form-contract.ts", "utf8");
const form = readFileSync("components/production/monthly-submission-center.tsx", "utf8");
const definitions = readFileSync("lib/analytics/import-operations.ts", "utf8");

assert.equal(isBlankMonthlyValue(0), false, "Numeric zero must remain a response.");
assert.equal(isBlankMonthlyValue("0"), false, "String zero must remain a response.");
assert.equal(isBlankMonthlyValue("  "), true, "An empty response must not become zero.");
assert.equal(numericMonthlyValue(0), 0, "Numeric zero must survive normalization.");
assert.equal(numericMonthlyValue("0"), 0, "String zero must survive normalization.");
assert.equal(numericMonthlyValue(""), null, "Empty numeric input must remain absent.");
assert.equal(isNonNegativeCountId("lab_nurses_count", "number", 0), true, "Personnel counts need integral non-negative validation.");
assert.equal(isNonNegativeCountId("revenue", "currency", 0), false, "Revenue is not a personnel counter.");
assert.match(contract, /isNonNegativeCountField[\s\S]*NOT_AN_INTEGER/, "Personnel and visit counts must reject fractions.");
assert.match(contract, /field\.min !== undefined && parsed < field\.min/, "Negative counts must remain invalid.");
assert.match(form, /No tenemos \/ Registrar 0/, "The UI must persist an explicit zero rather than displaying an ambiguous placeholder.");
assert.match(form, /placeholder=\{allowsExplicitZero \? "Sin responder"/, "Zero-capable fields must show an unambiguous empty state.");
assert.match(definitions, /lab_nurses_count[\s\S]*appliesTo: \["Laboratorio"\]/, "Laboratory personnel fields must stay scoped to Laboratory.");

const physiotherapyForm = getManualMonthlyFormStepsForLine("Fisioterapia");
const imagingForm = getManualMonthlyFormStepsForLine("Imagenes");
const laboratoryForm = getManualMonthlyFormStepsForLine("Laboratorio");
const physiotherapyTitles = physiotherapyForm.map((step) => step.title);
const imagingTitles = imagingForm.map((step) => step.title);
const laboratoryTitles = laboratoryForm.map((step) => step.title);

assert.notDeepEqual(
  physiotherapyTitles,
  imagingTitles,
  "Fisioterapia and Imagenes must render distinct monthly form stages.",
);
assert.ok(
  physiotherapyTitles.includes("Uso de equipos"),
  "Fisioterapia must expose its seven source-defined equipment concepts.",
);
assert.ok(
  imagingTitles.includes("Datos generales") && !imagingTitles.includes("Uso de equipos"),
  "Imagenes must retain its own diagnostic source structure.",
);
assert.ok(
  laboratoryTitles.includes("Inventario"),
  "Laboratorio must retain its independent inventory workflow.",
);
assert.ok(
  physiotherapyForm.flatMap((step) => step.fields).filter((field) => field.source?.classification !== "CONTEXT_YELLOW").length === 58,
  "Fisioterapia must expose the 58 identifiable yellow business concepts.",
);
assert.ok(
  imagingForm.flatMap((step) => step.fields).filter((field) => field.source?.classification !== "CONTEXT_YELLOW").length === 44,
  "Imagenes must expose the 44 identifiable yellow business concepts.",
);
assert.equal(
  physiotherapyForm.flatMap((step) => step.fields).filter((field) => field.source?.hiddenRow).length,
  2,
  "The two hidden but identifiable Physiotherapy concepts must remain visible in the contract.",
);
assert.equal(
  imagingForm.flatMap((step) => step.fields).filter((field) => field.source?.hiddenRow).length,
  8,
  "The eight hidden but identifiable Imaging concepts must remain visible in the contract.",
);
assert.deepEqual(
  physiotherapyForm.flatMap((step) => step.fields).find((field) => field.id === "physio_internship_staff_count")?.source?.aliases,
  ["Pasantia", "Pasantias"],
  "Pasantia/Pasantias must be an explicit source alias rather than a fuzzy match.",
);
assert.ok(
  physiotherapyForm.flatMap((step) => step.fields).every((field) => !field.id.startsWith("imaging_")),
  "Physiotherapy must not receive Imaging questions.",
);
assert.ok(
  imagingForm.flatMap((step) => step.fields).every((field) => !field.id.startsWith("physio_")),
  "Imaging must not receive Physiotherapy questions.",
);
assert.match(form, /\.storage\.supabase\.co\/storage\/v1\/upload\/resumable/, "Resumable uploads must use the Storage host.");
assert.match(form, /apikey: publicKey/, "Resumable uploads must include the public Supabase key.");
assert.match(form, /Guarda el borrador antes de adjuntar el Excel/, "An unavailable uploader must explain how to proceed.");
assert.match(
  form,
  /const savedVersion[\s\S]*\[MONTHLY_FORM_CONTRACT_RESPONSE_KEY\]: formContractVersion/,
  "A successful save must retain the resolved contract version instead of falling back to a legacy form.",
);

const assignmentA = monthlyDraftKey("branch-a:line-lab", "2026-09");
const assignmentB = monthlyDraftKey("branch-b:line-physio", "2026-09");
const octoberA = monthlyDraftKey("branch-a:line-lab", "2026-10");
assert.notEqual(assignmentA, assignmentB, "Different authorized assignments need separate drafts.");
assert.notEqual(assignmentA, octoberA, "A previous month must never be reused as the next month.");
assert.equal(hasMonthlyDraftContent({ nurses: "0" }), true, "An explicit zero is a real local draft value.");
assert.equal(hasMonthlyDraftContent({ nurses: "" }), false, "A blank form is not reported as a populated draft.");
assert.deepEqual(emptyMonthlyDraft("Cierre inicial").values, {}, "A new context starts clean without importing the prior month.");
assert.equal(shouldApplyMonthlyResponse(assignmentA, 3, assignmentA, 3), true, "Current response may update its own draft.");
assert.equal(shouldApplyMonthlyResponse(assignmentB, 3, assignmentA, 3), false, "A response for another assignment is stale.");
assert.equal(shouldApplyMonthlyResponse(assignmentA, 4, assignmentA, 3), false, "A response that loses the edit race is stale.");

console.log("monthly-form-contract: PASS");
