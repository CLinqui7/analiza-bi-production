import { AuthButton } from "@/components/auth-button";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { TenantContextHeader } from "@/components/tenant-context-header";
import { requireProtectedAccess } from "@/lib/server/authorization";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";
import Link from "next/link";
import { Suspense } from "react";

async function ProtectedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireProtectedAccess();

  return (
    <main className="executive-shell min-h-screen">
      <div className="flex min-h-screen w-full">
        <AppSidebar
          allowDemoRoleSwitch={access.allowDemoRoleSwitch}
          roleKey={access.roleKey}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="sticky top-0 z-20 border-b border-border/70 bg-background/90 shadow-[0_12px_32px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="flex min-h-16 w-full flex-col gap-3 px-4 py-3 text-sm lg:flex-row lg:items-start lg:justify-between lg:px-6">
              <Link
                href="/protected"
                className="font-semibold text-primary lg:hidden"
              >
                Analiza Intelligence
              </Link>
              <MobileNavigation roleKey={access.roleKey} />
              <TenantContextHeader
                isDemoEnvironment={isDemoRuntimeEnvironment()}
              />
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </nav>
          <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </main>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Verificando acceso autorizado...
        </div>
      }
    >
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}
