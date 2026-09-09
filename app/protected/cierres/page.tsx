import { Suspense } from "react";
import { connection } from "next/server";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";
import {
  getNavigationPerformanceTrace,
  traceNavigationStage,
} from "@/lib/server/navigation-performance-trace";

type ClosuresPageProps = {
  searchParams?: Promise<{
    qaTrace?: string;
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

async function ClosuresGate({
  searchParams,
}: {
  searchParams?: ClosuresPageProps["searchParams"];
}) {
  await connection();

  const params = searchParams ? await searchParams : {};
  const trace = await getNavigationPerformanceTrace("history", params.qaTrace);
  const actor = await traceNavigationStage(trace, "page_authorization_cache", () =>
    requireProtectedPath("/protected/cierres"),
  );

  return (
    <div data-route-content-ready="closures">
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
        mode="history"
        trace={trace}
      />
    </div>
  );
}

export default function ClosuresPage({ searchParams }: ClosuresPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando cierres...
        </div>
      }
    >
      <ClosuresGate searchParams={searchParams} />
    </Suspense>
  );
}
