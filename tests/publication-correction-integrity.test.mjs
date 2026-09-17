import assert from "node:assert/strict";

import {
  correctionCanFinalize,
  correctionDecisionError,
  correctionUseError,
} from "../lib/analytics/closing-correction-state.ts";
import {
  buildMonthlyPublicationReview,
  MONTHLY_PUBLICATION_CONFIRMATION,
} from "../lib/server/monthly-publication-review.ts";
import { managedBranchRecords } from "../lib/tenant/managed-branch-records.ts";

const baseReview = {
  submission: {
    id: "submission-a", organization_id: "org", country_id: "country", company_id: "company",
    operational_area_id: "area", branch_id: "branch-a", business_line_id: "line-a",
    period_start: "2026-08-01", period_end: "2026-08-31",
  },
  version: {
    id: "version-2", version_number: 2, responses: { revenue: 1000, visits: 0, note: null },
    correction_request_id: null, base_submission_version_id: null,
  },
  branch: { id: "branch-a", name: "Sucursal A", code: "A" },
  businessLine: { id: "line-a", name: "Laboratorio", code: "LABORATORY" },
  attachments: [{
    id: "evidence-a", original_file_name: "cierre.xlsx", byte_size: 123, sha256: "a".repeat(64),
    parser_kind: "generic_spreadsheet", parser_status: "parsed", warning_codes: [],
  }],
  kpis: [{
    code: "reported_revenue", name: "Facturación", value: 1000, numerator: 1000,
    denominator: null, unit: "USD", formulaVersion: "reported:v1", dataStatus: "AVAILABLE",
  }],
  blockers: [],
  warnings: [],
};

const first = buildMonthlyPublicationReview(baseReview);
const reordered = buildMonthlyPublicationReview({
  ...baseReview,
  version: { ...baseReview.version, responses: { note: null, visits: 0, revenue: 1000 } },
});
assert.equal(first.digest, reordered.digest, "object key order must not change the review digest");
assert.deepEqual(first.summary.explicitZeroFields, ["visits"]);
assert.deepEqual(first.summary.blankFields, ["note"]);
assert.equal(MONTHLY_PUBLICATION_CONFIRMATION, "He revisado la información y confirmo su publicación");

const changedResponse = buildMonthlyPublicationReview({
  ...baseReview,
  version: { ...baseReview.version, responses: { ...baseReview.version.responses, revenue: 1001 } },
});
assert.notEqual(first.digest, changedResponse.digest, "response edits must invalidate confirmation");
const changedEvidence = buildMonthlyPublicationReview({
  ...baseReview,
  attachments: [{ ...baseReview.attachments[0], sha256: "b".repeat(64) }],
});
assert.notEqual(first.digest, changedEvidence.digest, "evidence replacement must invalidate confirmation");

const decision = {
  status: "pending", requesterId: "branch-manager", approverId: "area-manager",
  actorId: "area-manager", actorRole: "gerente_area", baseStillOfficial: true,
};
assert.equal(correctionDecisionError(decision), null);
assert.equal(correctionDecisionError({ ...decision, actorId: "branch-manager" }), "INDEPENDENT_ASSIGNED_APPROVER_REQUIRED");
assert.equal(correctionDecisionError({ ...decision, actorId: "go", actorRole: "gerente_operaciones" }), "AREA_MANAGER_APPROVAL_REQUIRED");
assert.equal(correctionDecisionError({ ...decision, status: "approved" }), "CORRECTION_REQUEST_ALREADY_DECIDED");
assert.equal(correctionDecisionError({ ...decision, baseStillOfficial: false }), "STALE_OFFICIAL_BASE_CLOSING");

const use = {
  status: "approved", requestSubmissionId: "submission-a", targetSubmissionId: "submission-a",
  requestBaseVersionId: "version-1", expectedBaseVersionId: "version-1",
  responsibleId: "branch-manager", actorId: "branch-manager", approverId: "area-manager",
  baseStillOfficial: true,
};
assert.equal(correctionUseError(use), null);
assert.equal(correctionUseError(use), null, "one approval permits multiple saves in the same correction");
assert.equal(correctionUseError({ ...use, targetSubmissionId: "other-period" }), "CORRECTION_SCOPE_MISMATCH");
assert.equal(correctionUseError({ ...use, expectedBaseVersionId: "version-new" }), "CORRECTION_BASE_MISMATCH");
assert.equal(correctionUseError({ ...use, status: "completed" }), "CORRECTION_NOT_APPROVED");
assert.equal(correctionCanFinalize("approved"), true);
assert.equal(correctionCanFinalize("completed"), false, "completed approval cannot be reused");

const krissiaAssignments = managedBranchRecords.filter((item) =>
  item.branchManagerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("kriscia dominguez"),
);
assert.deepEqual(
  krissiaAssignments.map((item) => [item.businessLineCode, item.branchName]),
  [["LABORATORY", "SS - Casco - L010"]],
  "the corrected directory fixture must preserve only Laboratorio/Casco for Kriscia",
);

console.log("publication/correction integrity: PASS");
