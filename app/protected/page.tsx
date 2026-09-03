import { redirect } from "next/navigation";

import { BranchBiServerDashboard } from "@/components/branch-bi-server-dashboard";
import { requireProtectedPath } from "@/lib/server/authorization";

function landingPath(roleKey: Awaited<ReturnType<typeof requireProtectedPath>>["roleKey"]) {
  if (roleKey === "gerente_operaciones") return "/protected/resultados";
  if (roleKey === "gerente_area") return "/protected/resultados";
  if (roleKey === "gerente_sucursal") return "/protected/mi-sucursal";
  return "/protected/resultados";
}

export default async function ProtectedPage() {
  const access = await requireProtectedPath("/protected");

  if (!["super_admin", "webmaster_admin", "ceo"].includes(access.roleKey)) {
    redirect(landingPath(access.roleKey));
  }

  return <BranchBiServerDashboard actor={access} mode="home" />;
}
