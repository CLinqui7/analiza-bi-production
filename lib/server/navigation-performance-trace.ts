import "server-only";

import { cookies } from "next/headers";

const traceCookieName = "analiza-navigation-trace";

export type NavigationPerformanceTrace = {
  requestId: string;
  route: string;
  stages: NavigationPerformanceStage[];
};

export type NavigationPerformanceStage = {
  durationMs: number;
  stage: string;
};

/**
 * Production timing is opt-in through a QA browser cookie. Trace events never
 * contain users, organizations, filters, record counts, request URLs, or data.
 */
export async function getNavigationPerformanceTrace(
  route: string,
  queryRequestId?: string,
): Promise<NavigationPerformanceTrace | null> {
  const cookieStore = await cookies();
  const requestId = queryRequestId ?? cookieStore.get(traceCookieName)?.value;
  return requestId && /^[a-f0-9]{12,32}$/.test(requestId)
    ? { requestId, route, stages: [] }
    : null;
}

export async function traceNavigationStage<T>(
  trace: NavigationPerformanceTrace | null | undefined,
  stage: string,
  operation: () => T | PromiseLike<T>,
): Promise<Awaited<T>> {
  if (!trace) {
    return await operation();
  }

  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    trace.stages.push({
      durationMs: Math.round(performance.now() - startedAt),
      stage,
    });
  }
}

export function traceNavigationReady(
  trace: NavigationPerformanceTrace | null | undefined,
  startedAt: number,
) {
  if (!trace) {
    return;
  }

  trace.stages.push({
    durationMs: Math.round(performance.now() - startedAt),
    stage: "server_component_ready",
  });
}
