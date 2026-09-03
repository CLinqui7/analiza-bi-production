import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import { getBranchBiSnapshot } from "@/lib/v7/server/branch-bi-snapshot";
import { OfficialBranchBiDashboard } from "@/components/official-branch-bi-dashboard";

export async function BranchBiServerDashboard({
  actor,
  mode,
}: {
  actor: AuthorizationActor;
  mode: "branch" | "branches" | "home" | "history" | "results";
}) {
  const snapshot = await getBranchBiSnapshot(actor);
  return <OfficialBranchBiDashboard mode={mode} roleKey={actor.roleKey} snapshot={snapshot} />;
}
