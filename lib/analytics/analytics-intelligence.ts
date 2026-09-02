export type AnalyticsOutlierSeverity = "info" | "warning" | "critical";

export type AnalyticsOutlierFlag = {
  metric: string;
  value: string;
  benchmark: string;
  severity: AnalyticsOutlierSeverity;
  explanation: string;
};

export type WeightedScoreComponent = {
  value: number | null;
  weight: number;
  fallback?: number;
};

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function weightedScore(components: WeightedScoreComponent[]): number {
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  const total = components.reduce((sum, component) => {
    const score = component.value ?? component.fallback ?? 0;
    return sum + clampScore(score) * component.weight;
  }, 0);

  return clampScore(total / totalWeight);
}

export function median(values: number[]): number | null {
  const sortedValues = values
    .filter((value) => Number.isFinite(value))
    .sort((first, second) => first - second);

  if (sortedValues.length === 0) {
    return null;
  }

  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
  }

  return sortedValues[midpoint];
}

export function scoreAgainstPeerMedian(value: number, peerMedian: number | null): number {
  if (!peerMedian || peerMedian <= 0) {
    return clampScore(value);
  }

  return clampScore((value / peerMedian) * 85);
}

export function scoreRate(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return clampScore(value * 100);
}

export function scoreTargetFulfillment(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return clampScore(value * 100);
}

export function createOutlierFlag({
  benchmark,
  explanation,
  metric,
  severity,
  value,
}: AnalyticsOutlierFlag): AnalyticsOutlierFlag {
  return {
    benchmark,
    explanation,
    metric,
    severity,
    value,
  };
}
