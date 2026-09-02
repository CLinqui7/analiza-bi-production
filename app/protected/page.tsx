import { RoleWorkspaceHome } from "@/components/role-workspace-home";
import { requireProtectedPath } from "@/lib/server/authorization";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";

export default async function ProtectedPage() {
  const access = await requireProtectedPath("/protected");

  return (
    <RoleWorkspaceHome
      allowDemoRoleSwitch={access.allowDemoRoleSwitch}
      isDemoEnvironment={isDemoRuntimeEnvironment()}
      roleKey={access.roleKey}
    />
  );
}
