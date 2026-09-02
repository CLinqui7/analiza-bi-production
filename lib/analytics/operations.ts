export type OccupancyInput = {
  availableMinutes: number;
  scheduledMinutes: number;
  attendedMinutes: number;
};

export type AppointmentRateInput = {
  scheduledApplicable: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
};

export type OccupancyResult = {
  scheduledOccupancy: number | null;
  effectiveOccupancy: number | null;
  attendanceGap: number | null;
};

export type AppointmentRateResult = {
  completionRate: number | null;
  cancellationRate: number | null;
  noShowRate: number | null;
  rescheduleRate: number | null;
};

export function safeRatio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }

  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

export function calculateOccupancy({
  availableMinutes,
  scheduledMinutes,
  attendedMinutes,
}: OccupancyInput): OccupancyResult {
  const scheduledOccupancy = safeRatio(scheduledMinutes, availableMinutes);
  const effectiveOccupancy = safeRatio(attendedMinutes, availableMinutes);

  return {
    scheduledOccupancy,
    effectiveOccupancy,
    attendanceGap:
      scheduledOccupancy === null || effectiveOccupancy === null
        ? null
        : scheduledOccupancy - effectiveOccupancy,
  };
}

export function calculateAppointmentRates({
  scheduledApplicable,
  completed,
  cancelled,
  noShow,
  rescheduled,
}: AppointmentRateInput): AppointmentRateResult {
  return {
    completionRate: safeRatio(completed, scheduledApplicable),
    cancellationRate: safeRatio(cancelled, scheduledApplicable),
    noShowRate: safeRatio(noShow, scheduledApplicable),
    rescheduleRate: safeRatio(rescheduled, scheduledApplicable),
  };
}

export function formatPercent(value: number | null, decimals = 0) {
  if (value === null) {
    return "Pendiente";
  }

  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPercentagePoints(value: number | null, decimals = 0) {
  if (value === null) {
    return "Pendiente";
  }

  return `${(value * 100).toFixed(decimals)} pp`;
}

