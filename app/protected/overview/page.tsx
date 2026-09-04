import { Suspense } from "react";
import { connection } from "next/server";

import { requireProtectedPath } from "@/lib/server/authorization";
import { BranchBiServerDashboard } from "@/components/branch-bi-server-dashboard";

type OverviewPageProps = {
  searchParams?: Promise<{
    area?: string;
    branch?: string;
    company?: string;
    country?: string;
    from?: string;
    line?: string;
    manager?: string;
    to?: string;
  }>;
};

async function OverviewGate({ searchParams }: OverviewPageProps) {
  await connection();

  const actor = await requireProtectedPath("/protected/overview");

  const params = searchParams ? await searchParams : {};
  return <BranchBiServerDashboard actor={actor} filter={{ areaId: params.area, branchId: params.branch, businessLineId: params.line, companyId: params.company, countryId: params.country, managerId: params.manager, periodStart: params.from, periodEnd: params.to }} mode="home" />;
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
