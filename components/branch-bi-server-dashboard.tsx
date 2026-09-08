import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import { getBranchBiSnapshot, type BranchBiFilter } from "@/lib/v7/server/branch-bi-snapshot";
import { OfficialBranchBiDashboard } from "@/components/official-branch-bi-dashboard";

export async function BranchBiServerDashboard({
  actor,
  filter,
  mode,
}: {
  actor: AuthorizationActor;
  filter?: BranchBiFilter;
  mode: "branch" | "branches" | "home" | "history" | "results";
}) {
  // Historial has its own data path. Summary views never wait for submission
  // versions, authors, or attachment counts that they do not render.
  const snapshot = await getBranchBiSnapshot(actor, filter, {
    mode: mode === "history" ? "history" : "summary",
  });
  return <OfficialBranchBiDashboard mode={mode} roleKey={actor.roleKey} snapshot={snapshot} />;
}
