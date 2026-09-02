import "server-only";

const piiKeyPattern = /(patient|paciente|nombre[_ -]?paciente|email|correo|phone|telefono|teléfono|dui|documento|document_number|birth|nacimiento|address|direccion|dirección)/i;

export type MonthlyValidation = {
  blockers: string[];
  warnings: string[];
  normalized: Record<string, string | number | boolean | null>;
};

export function validateMonthlyResponses(input: Record<string, unknown>): MonthlyValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const normalized: Record<string, string | number | boolean | null> = {};

  const entries = Object.entries(input);
  if (entries.length === 0) blockers.push("EMPTY_SUBMISSION");

  for (const [key, value] of entries) {
    if (piiKeyPattern.test(key)) {
      blockers.push(`PII_FIELD_BLOCKED:${key}`);
      continue;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) blockers.push(`INVALID_NUMBER:${key}`);
      else normalized[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("=") || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.startsWith("@")) {
        blockers.push(`DANGEROUS_FORMULA_LIKE_VALUE:${key}`);
      } else {
        normalized[key] = trimmed;
      }
      continue;
    }
    if (typeof value === "boolean" || value === null) {
      normalized[key] = value;
      continue;
    }
    warnings.push(`UNSUPPORTED_VALUE_IGNORED:${key}`);
  }

  return { blockers: [...new Set(blockers)], warnings: [...new Set(warnings)], normalized };
}
