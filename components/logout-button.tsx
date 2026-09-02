"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { hasEnvVars } from "@/lib/utils";
import { useRouter } from "next/navigation";

const roleStorageKey = "analiza:demo-role";
const businessLineStorageKey = "analiza:demo-business-line";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/auth/demo-admin", { method: "DELETE" });
    await fetch("/api/auth/local-login", { method: "DELETE" });
    window.localStorage.removeItem(roleStorageKey);
    window.localStorage.removeItem(businessLineStorageKey);

    if (hasEnvVars) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }

    router.push("/auth/login");
    router.refresh();
  };

  return <Button onClick={logout}>Salir</Button>;
}
