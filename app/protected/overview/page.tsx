import { Suspense } from "react";
import { connection } from "next/server";

import { requireProtectedPath } from "@/lib/server/authorization";
import { getOfficialExecutiveSnapshot } from "@/lib/server/official-bi";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";

type OverviewPageProps = {
  searchParams?: Promise<{
    branch?: string;
    company?: string;
    country?: string;
    from?: string;
    line?: string;
    to?: string;
  }>;
};

async function OverviewGate({ searchParams }: OverviewPageProps) {
  await connection();

  const actor = await requireProtectedPath("/protected/overview");

  if (isDemoRuntimeEnvironment()) {
    const { ExecutiveDashboard } = await import("@/components/executive-dashboard");

    return <ExecutiveDashboard />;
  }

  const params = searchParams ? await searchParams : {};
  const snapshot = await getOfficialExecutiveSnapshot(actor, {
    branchId: params.branch,
    businessLineId: params.line,
    companyId: params.company,
    countryId: params.country,
    periodEnd: params.to,
    periodStart: params.from,
  });
  const { OfficialExecutiveDataDashboard } = await import(
    "@/components/official-executive-data-dashboard"
  );

  return <OfficialExecutiveDataDashboard mode="overview" snapshot={snapshot} />;
}

export default function OverviewPage({ searchParams }: OverviewPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando espacio de trabajo...
        </div>
      }
    >
      <OverviewGate searchParams={searchParams} />
    </Suspense>
  );
}
