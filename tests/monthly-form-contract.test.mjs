import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = readFileSync("lib/monthly-form-contract.ts", "utf8");
const form = readFileSync("components/production/monthly-submission-center.tsx", "utf8");
const definitions = readFileSync("lib/analytics/import-operations.ts", "utf8");

assert.match(contract, /return value === null \|\| value === undefined \|\| \(typeof value === "string"/, "Blank must remain distinct from numeric zero.");
assert.match(contract, /if \(typeof value === "number" && Number\.isFinite\(value\)\) return value/, "Numeric zero must remain a valid response.");
assert.match(contract, /isNonNegativeCountField[\s\S]*NOT_AN_INTEGER/, "Personnel and visit counts must reject fractions.");
assert.match(contract, /field\.min !== undefined && parsed < field\.min/, "Negative counts must remain invalid.");
assert.match(form, /No tenemos \/ Registrar 0/, "The UI must persist an explicit zero rather than displaying an ambiguous placeholder.");
assert.match(form, /placeholder=\{allowsExplicitZero \? "Sin responder"/, "Zero-capable fields must show an unambiguous empty state.");
assert.match(definitions, /lab_nurses_count[\s\S]*appliesTo: \["Laboratorio"\]/, "Laboratory personnel fields must stay scoped to Laboratory.");

console.log("monthly-form-contract: PASS");
