/** Small dependency-free value rules, shared by browser and server validation. */
export function isBlankMonthlyValue(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

export function numericMonthlyValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function isNonNegativeCountId(fieldId: string, inputType: string, min: number | undefined) {
  return inputType === "number" && min === 0 && /(?:count|visit)/.test(fieldId);
}
