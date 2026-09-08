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
