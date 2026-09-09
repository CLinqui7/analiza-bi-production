import { Suspense } from "react";
import { connection } from "next/server";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";
import {
  getNavigationPerformanceTrace,
  traceNavigationStage,
} from "@/lib/server/navigation-performance-trace";

type MyBranchPageProps = {
  searchParams?: Promise<{
    _qaTrace?: string;
    area?: string;
    branch?: string;
    company?: string;
    country?: string;
    from?: string;
    line?: string | string[];
    manager?: string;
    to?: string;
  }>;
};

async function MyBranchGate({
  searchParams,
}: {
  searchParams?: MyBranchPageProps["searchParams"];
}) {
  await connection();

  const params = searchParams ? await searchParams : {};
  const trace = await getNavigationPerformanceTrace("my_branch", params._qaTrace);
  const actor = await traceNavigationStage(trace, "page_authorization_cache", () =>
    requireProtectedPath("/protected/mi-sucursal"),
  );

  return (
    <div data-route-content-ready="my-branch">
      <MonthlyClosureRouter
        actor={actor}
        filter={{
          areaId: params.area,
          branchId: params.branch,
          businessLineId: Array.isArray(params.line)
            ? params.line[0]
            : params.line,
          companyId: params.company,
          countryId: params.country,
          managerId: params.manager,
          periodStart: params.from,
          periodEnd: params.to,
        }}
        line={params.line}
        mode="branch-home"
        trace={trace}
      />
    </div>
  );
}

export default function MyBranchPage({ searchParams }: MyBranchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando mi sucursal...
        </div>
      }
    >
      <MyBranchGate searchParams={searchParams} />
    </Suspense>
  );
}
