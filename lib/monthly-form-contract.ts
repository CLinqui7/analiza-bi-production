import {
  getManualMonthlyFormStepsForLine,
  type ImportBusinessLine,
  type ManualMonthlyFormField,
  type ManualMonthlyFormStep,
} from "@/lib/analytics/import-operations";

export type BusinessLineCatalogLike = {
  code?: string | null;
  name?: string | null;
};

const normalizedLineByCode: Record<string, ImportBusinessLine> = {
  LABORATORY: "Laboratorio",
  LABORATORIO: "Laboratorio",
  PHYSIOTHERAPY: "Fisioterapia",
  FISIOTERAPIA: "Fisioterapia",
  IMAGING: "Imagenes",
  IMAGENES: "Imagenes",
  IMÁGENES: "Imagenes",
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function resolveFormBusinessLine(input: BusinessLineCatalogLike): ImportBusinessLine | null {
  const fromCode = normalizedLineByCode[normalize(input.code)];
  if (fromCode) return fromCode;
  const fromName = normalizedLineByCode[normalize(input.name)];
  return fromName ?? null;
}

export function getMonthlyFormSteps(line: ImportBusinessLine): ManualMonthlyFormStep[] {
  return getManualMonthlyFormStepsForLine(line);
}

export function getMonthlyFormFields(line: ImportBusinessLine): ManualMonthlyFormField[] {
  return getMonthlyFormSteps(line).flatMap((step) => step.fields);
}

export function getRequiredMonthlyResponseFields(line: ImportBusinessLine) {
  return getMonthlyFormFields(line).filter((field) => field.required && field.inputType !== "file");
}

export function getMonthlyFileFields(line: ImportBusinessLine) {
  return getMonthlyFormFields(line).filter((field) => field.inputType === "file");
}

function isBlank(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export type FormContractValidation = {
  missing: string[];
  invalid: Array<{ fieldId: string; reason: string }>;
  normalized: Record<string, unknown>;
};

/**
 * Validates only the stable monthly-form contract. PII/formula checks remain in
 * lib/server/monthly-validation.ts and are intentionally separate.
 */
export function validateMonthlyFormContract({
  line,
  responses,
  requireComplete,
}: {
  line: ImportBusinessLine;
  responses: Record<string, unknown>;
  requireComplete: boolean;
}): FormContractValidation {
  const fields = getMonthlyFormFields(line).filter((field) => field.inputType !== "file");
  const normalized: Record<string, unknown> = { ...responses };
  const missing: string[] = [];
  const invalid: Array<{ fieldId: string; reason: string }> = [];

  for (const field of fields) {
    const raw = responses[field.id];
    if (isBlank(raw)) {
      if (requireComplete && field.required) missing.push(field.id);
      continue;
    }

    if (["number", "currency", "percent"].includes(field.inputType)) {
      const parsed = numericValue(raw);
      if (parsed === null) {
        invalid.push({ fieldId: field.id, reason: "NOT_A_NUMBER" });
        continue;
      }
      if (field.min !== undefined && parsed < field.min) {
        invalid.push({ fieldId: field.id, reason: `MIN_${field.min}` });
        continue;
      }
      if (field.max !== undefined && parsed > field.max) {
        invalid.push({ fieldId: field.id, reason: `MAX_${field.max}` });
        continue;
      }
      normalized[field.id] = parsed;
      continue;
    }

    if (typeof raw !== "string") {
      invalid.push({ fieldId: field.id, reason: "EXPECTED_TEXT" });
      continue;
    }
    normalized[field.id] = raw.trim();
  }

  return { missing, invalid, normalized };
}

export function countRequiredCompletion(line: ImportBusinessLine, responses: Record<string, unknown>) {
  const required = getRequiredMonthlyResponseFields(line);
  const completed = required.filter((field) => !isBlank(responses[field.id])).length;
  return { completed, total: required.length };
}
