import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import { getBranchBiSnapshot, type BranchBiFilter } from "@/lib/v7/server/branch-bi-snapshot";
import { OfficialBranchBiDashboard } from "@/components/official-branch-bi-dashboard";
import { NavigationPerformanceTraceMarker } from "@/components/navigation-performance-trace-marker";
import {
  traceNavigationReady,
  traceNavigationStage,
  type NavigationPerformanceTrace,
} from "@/lib/server/navigation-performance-trace";

export async function BranchBiServerDashboard({
  actor,
  filter,
  mode,
  trace,
}: {
  actor: AuthorizationActor;
  filter?: BranchBiFilter;
  mode: "branch" | "branches" | "home" | "history" | "results";
  trace?: NavigationPerformanceTrace | null;
}) {
  const startedAt = performance.now();
  // Historial has its own data path. Summary views never wait for submission
  // versions, authors, or attachment counts that they do not render.
  const snapshot = await traceNavigationStage(trace, "snapshot", () =>
    getBranchBiSnapshot(actor, filter, {
      mode: mode === "history" ? "history" : "summary",
      trace,
    }),
  );
  traceNavigationReady(trace, startedAt);
  return <>
    <OfficialBranchBiDashboard mode={mode} roleKey={actor.roleKey} snapshot={snapshot} />
    <NavigationPerformanceTraceMarker trace={trace} />
  </>;
}
