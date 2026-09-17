import { createHash } from "node:crypto";

export const MONTHLY_PUBLICATION_CONFIRMATION =
  "He revisado la información y confirmo su publicación";

type ReviewAttachment = {
  id: string;
  original_file_name: string;
  byte_size: number;
  sha256: string;
  parser_kind: string;
  parser_status: string;
  warning_codes: string[] | null;
};

type ReviewKpi = {
  code: string;
  name: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  unit: string;
  formulaVersion: string;
  dataStatus: string;
};

type PublicationReviewInput = {
  submission: {
    id: string;
    organization_id: string;
    country_id: string;
    company_id: string;
    operational_area_id: string | null;
    branch_id: string;
    business_line_id: string;
    period_start: string;
    period_end: string;
  };
  version: {
    id: string;
    version_number: number;
    responses: Record<string, unknown>;
    correction_request_id?: string | null;
    base_submission_version_id?: string | null;
  };
  branch: { id: string; name: string; code?: string | null };
  businessLine: { id: string; name: string; code: string };
  attachments: ReviewAttachment[];
  kpis: ReviewKpi[];
  blockers: string[];
  warnings: string[];
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function stablePublicationJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function publicationDigest(value: unknown) {
  return createHash("sha256").update(stablePublicationJson(value)).digest("hex");
}

export function buildMonthlyPublicationReview(input: PublicationReviewInput) {
  const responseEntries = Object.entries(input.version.responses)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([field, value]) => ({ field, value }));
  const zeroFields = responseEntries
    .filter((item) => item.value === 0)
    .map((item) => item.field);
  const missingFields = responseEntries
    .filter((item) => item.value === null || item.value === undefined || item.value === "")
    .map((item) => item.field);

  const summary = {
    contract: "monthly-publication-review:v1",
    submission: {
      id: input.submission.id,
      organizationId: input.submission.organization_id,
      countryId: input.submission.country_id,
      companyId: input.submission.company_id,
      operationalAreaId: input.submission.operational_area_id,
      branchId: input.submission.branch_id,
      branchName: input.branch.name,
      branchCode: input.branch.code ?? null,
      businessLineId: input.submission.business_line_id,
      businessLineName: input.businessLine.name,
      businessLineCode: input.businessLine.code,
      periodStart: input.submission.period_start,
      periodEnd: input.submission.period_end,
    },
    version: {
      id: input.version.id,
      number: input.version.version_number,
      correctionRequestId: input.version.correction_request_id ?? null,
      baseSubmissionVersionId: input.version.base_submission_version_id ?? null,
    },
    responses: responseEntries,
    explicitZeroFields: zeroFields,
    blankFields: missingFields,
    evidence: [...input.attachments]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((item) => ({
        id: item.id,
        fileName: item.original_file_name,
        byteSize: item.byte_size,
        sha256: item.sha256,
        parserKind: item.parser_kind,
        parserStatus: item.parser_status,
        warningCodes: [...(item.warning_codes ?? [])].sort(),
      })),
    kpis: [...input.kpis]
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((item) => ({
        code: item.code,
        name: item.name,
        value: item.value,
        numerator: item.numerator,
        denominator: item.denominator,
        unit: item.unit,
        formulaVersion: item.formulaVersion,
        dataStatus: item.dataStatus,
      })),
    blockers: [...input.blockers].sort(),
    warnings: [...input.warnings].sort(),
  };

  return { summary, digest: publicationDigest(summary) };
}
