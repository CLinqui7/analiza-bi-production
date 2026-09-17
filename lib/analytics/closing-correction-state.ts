export type CorrectionDecisionCheck = {
  status: string;
  requesterId: string;
  approverId: string;
  actorId: string;
  actorRole: string;
  baseStillOfficial: boolean;
};

export function correctionDecisionError(input: CorrectionDecisionCheck) {
  if (input.actorRole !== "gerente_area") return "AREA_MANAGER_APPROVAL_REQUIRED";
  if (input.actorId !== input.approverId || input.actorId === input.requesterId) {
    return "INDEPENDENT_ASSIGNED_APPROVER_REQUIRED";
  }
  if (input.status !== "pending") return "CORRECTION_REQUEST_ALREADY_DECIDED";
  if (!input.baseStillOfficial) return "STALE_OFFICIAL_BASE_CLOSING";
  return null;
}

export type CorrectionUseCheck = {
  status: string;
  requestSubmissionId: string;
  targetSubmissionId: string;
  requestBaseVersionId: string;
  expectedBaseVersionId: string | null;
  responsibleId: string;
  actorId: string;
  approverId: string;
  baseStillOfficial: boolean;
};

export function correctionUseError(input: CorrectionUseCheck) {
  if (input.status !== "approved") return "CORRECTION_NOT_APPROVED";
  if (input.requestSubmissionId !== input.targetSubmissionId) return "CORRECTION_SCOPE_MISMATCH";
  if (!input.expectedBaseVersionId || input.requestBaseVersionId !== input.expectedBaseVersionId) {
    return "CORRECTION_BASE_MISMATCH";
  }
  if (input.responsibleId !== input.actorId || input.approverId === input.actorId) {
    return "CORRECTION_RESPONSIBLE_MISMATCH";
  }
  if (!input.baseStillOfficial) return "STALE_OFFICIAL_BASE_CLOSING";
  return null;
}

export function correctionCanFinalize(status: string) {
  return status === "approved";
}
