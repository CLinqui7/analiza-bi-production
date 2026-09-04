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
  const snapshot = await getBranchBiSnapshot(actor, filter);
  return <OfficialBranchBiDashboard mode={mode} roleKey={actor.roleKey} snapshot={snapshot} />;
}
