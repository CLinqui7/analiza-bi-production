export type MonthlyFormDraft<Saved, Attachment> = {
  attachments: Attachment[];
  blockers: string[];
  changeReason: string;
  currentStep: number;
  dirty: boolean;
  saved: Saved | null;
  values: Record<string, string>;
  warnings: string[];
};

export function monthlyDraftKey(assignmentId: string, periodMonth: string) {
  return `${assignmentId}:${periodMonth}`;
}

export function hasMonthlyDraftContent(values: Record<string, string>) {
  return Object.values(values).some((value) => value.trim() !== "");
}

export function emptyMonthlyDraft<Saved, Attachment>(changeReason: string): MonthlyFormDraft<Saved, Attachment> {
  return {
    attachments: [],
    blockers: [],
    changeReason,
    currentStep: 0,
    dirty: true,
    saved: null,
    values: {},
    warnings: [],
  };
}

/** Returns a detached snapshot so a later edit cannot mutate another context. */
export function copyMonthlyDraft<Saved, Attachment>(draft: MonthlyFormDraft<Saved, Attachment>): MonthlyFormDraft<Saved, Attachment> {
  return {
    ...draft,
    attachments: [...draft.attachments],
    blockers: [...draft.blockers],
    values: { ...draft.values },
    warnings: [...draft.warnings],
  };
}

export function shouldApplyMonthlyResponse(
  activeContextKey: string,
  activeRevision: number,
  requestContextKey: string,
  requestRevision: number,
) {
  return activeContextKey === requestContextKey && activeRevision === requestRevision;
}
