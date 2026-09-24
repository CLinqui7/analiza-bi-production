import type { ImportBusinessLine } from "@/lib/analytics/import-operations";

type EvidenceAttachment = {
  id: string;
  parser_kind: string;
  parser_status: string;
  sha256: string;
  extracted_summary: Record<string, unknown>;
  warning_codes: string[] | null;
};

type ImportSource = {
  sourceFileSha256?: unknown;
  formulaFieldCount?: unknown;
} | null;

export type MonthlyEvidenceComparison = {
  attachmentId: string;
  source: "medical_exam_sales_report" | "monthly_form_workbook" | "generic_evidence";
  status: "matched" | "partial" | "mismatch" | "unverified";
  recognizedFieldCount: number;
  matchedFieldCount: number;
  mismatchedFields: string[];
  formTotal: number | null;
  documentTotal: number | null;
  difference: number | null;
  coveragePct: number | null;
  documentPeriodStart: string | null;
  documentPeriodEnd: string | null;
};

export type MonthlyEvidenceReconciliation = {
  contract: "monthly-evidence-reconciliation:v1";
  items: MonthlyEvidenceComparison[];
  blockers: string[];
  warnings: string[];
};

function recordValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function sameValue(left: unknown, right: unknown) {
  const leftNumber = finiteNumber(left);
  const rightNumber = finiteNumber(right);
  if (leftNumber !== null && rightNumber !== null) {
    return Math.abs(leftNumber - rightNumber) <= Math.max(0.01, Math.abs(leftNumber) * 1e-9);
  }
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export function reconcileMonthlyEvidence({
  attachments,
  formLine,
  importSource,
  periodEnd,
  periodStart,
  responses,
}: {
  attachments: readonly EvidenceAttachment[];
  formLine: ImportBusinessLine;
  importSource?: ImportSource;
  periodEnd: string;
  periodStart: string;
  responses: Record<string, unknown>;
}): MonthlyEvidenceReconciliation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const items: MonthlyEvidenceComparison[] = [];

  const requiredParserKind = formLine === "Laboratorio"
    ? "medical_exam_sales_report"
    : "monthly_form_workbook";
  if (!attachments.some((item) => item.parser_kind === requiredParserKind)) {
    blockers.push(formLine === "Laboratorio"
      ? "LAB_STRUCTURED_REPORT_REQUIRED"
      : "MONTHLY_FORM_WORKBOOK_REQUIRED");
  }

  const importedHash = textValue(importSource?.sourceFileSha256)?.toLowerCase() ?? null;
  if (importedHash && !attachments.some((item) => item.sha256.toLowerCase() === importedHash)) {
    blockers.push("IMPORTED_WORKBOOK_ATTACHMENT_MISMATCH");
  }
  const formulaFieldCount = finiteNumber(importSource?.formulaFieldCount);
  if (formulaFieldCount !== null && formulaFieldCount > 0) {
    warnings.push(`IMPORTED_WORKBOOK_HAS_FORMULAS:${formulaFieldCount}`);
  }

  for (const attachment of attachments) {
    const summary = recordValue(attachment.extracted_summary) ?? {};
    if (attachment.parser_kind === "medical_exam_sales_report" && formLine === "Laboratorio") {
      const matchedBranch = recordValue(summary.matchedBranch);
      const formTotal = finiteNumber(responses.lab_total_sales ?? responses.net_revenue);
      const documentTotal = finiteNumber(matchedBranch?.totalSales);
      const documentPeriodStart = textValue(matchedBranch?.minDate);
      const documentPeriodEnd = textValue(matchedBranch?.maxDate);
      const periodMismatch = Boolean(
        (documentPeriodStart && documentPeriodStart < periodStart)
        || (documentPeriodEnd && documentPeriodEnd > periodEnd),
      );
      if (!matchedBranch) blockers.push("DOCUMENT_BRANCH_NOT_RECONCILED");
      if (periodMismatch || attachment.warning_codes?.includes("REPORT_PERIOD_MISMATCH")) {
        blockers.push("DOCUMENT_PERIOD_MISMATCH");
      }
      if (!documentPeriodStart || !documentPeriodEnd) warnings.push("DOCUMENT_PERIOD_UNVERIFIED");

      const difference = formTotal !== null && documentTotal !== null
        ? Number((documentTotal - formTotal).toFixed(2))
        : null;
      const coveragePct = formTotal !== null && formTotal > 0 && documentTotal !== null
        ? Number(((documentTotal / formTotal) * 100).toFixed(2))
        : null;
      const tolerance = formTotal === null ? 0 : Math.max(1, Math.abs(formTotal) * 0.005);
      const exceedsForm = difference !== null && difference > tolerance;
      if (exceedsForm) blockers.push("DOCUMENT_SALES_EXCEED_FORM_TOTAL");
      if (coveragePct !== null && coveragePct < 99.5) warnings.push("LAB_DOCUMENT_PARTIAL_COVERAGE");

      items.push({
        attachmentId: attachment.id,
        source: "medical_exam_sales_report",
        status: periodMismatch || exceedsForm || !matchedBranch
          ? "mismatch"
          : coveragePct !== null && coveragePct < 99.5
            ? "partial"
            : "matched",
        recognizedFieldCount: 1,
        matchedFieldCount: difference !== null && Math.abs(difference) <= tolerance ? 1 : 0,
        mismatchedFields: exceedsForm ? ["lab_total_sales"] : [],
        formTotal,
        documentTotal,
        difference,
        coveragePct,
        documentPeriodStart,
        documentPeriodEnd,
      });
      continue;
    }

    if (attachment.parser_kind === "monthly_form_workbook") {
      const documentValues = recordValue(summary.values) ?? {};
      const entries = Object.entries(documentValues);
      const mismatchedFields = entries
        .filter(([fieldId, value]) => !sameValue(responses[fieldId], value))
        .map(([fieldId]) => fieldId)
        .sort();
      if (mismatchedFields.length > 0) blockers.push("DOCUMENT_FORM_VALUE_MISMATCH");
      items.push({
        attachmentId: attachment.id,
        source: "monthly_form_workbook",
        status: mismatchedFields.length > 0 ? "mismatch" : "matched",
        recognizedFieldCount: entries.length,
        matchedFieldCount: entries.length - mismatchedFields.length,
        mismatchedFields,
        formTotal: null,
        documentTotal: null,
        difference: null,
        coveragePct: null,
        documentPeriodStart: textValue(summary.detectedPeriod),
        documentPeriodEnd: textValue(summary.detectedPeriod),
      });
      continue;
    }

    items.push({
      attachmentId: attachment.id,
      source: "generic_evidence",
      status: "unverified",
      recognizedFieldCount: 0,
      matchedFieldCount: 0,
      mismatchedFields: [],
      formTotal: null,
      documentTotal: null,
      difference: null,
      coveragePct: null,
      documentPeriodStart: null,
      documentPeriodEnd: null,
    });
  }

  return {
    contract: "monthly-evidence-reconciliation:v1",
    items,
    blockers: unique(blockers),
    warnings: unique(warnings),
  };
}
