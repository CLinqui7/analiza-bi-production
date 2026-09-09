import type { NavigationPerformanceTrace } from "@/lib/server/navigation-performance-trace";

export function NavigationPerformanceTraceMarker({
  trace,
}: {
  trace?: NavigationPerformanceTrace | null;
}) {
  if (!trace) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      data-navigation-trace={JSON.stringify({
        requestId: trace.requestId,
        route: trace.route,
        stages: trace.stages,
      })}
      hidden
    />
  );
}
