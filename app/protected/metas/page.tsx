import { connection } from "next/server";
import { Suspense } from "react";

import { NavigationPerformanceTraceMarker } from "@/components/navigation-performance-trace-marker";
import { OfficialExecutiveDataDashboard } from "@/components/official-executive-data-dashboard";
import { ProtectedRouteLoading } from "@/components/protected-route-loading";
import { requireProtectedPath } from "@/lib/server/authorization";
import { getOfficialExecutiveSnapshot } from "@/lib/server/official-bi";
import {
  getNavigationPerformanceTrace,
  traceNavigationReady,
  traceNavigationStage,
} from "@/lib/server/navigation-performance-trace";

type TargetsPageProps = {
  searchParams?: Promise<{
    qaTrace?: string;
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

async function TargetsGate({
  searchParams,
}: {
  searchParams?: TargetsPageProps["searchParams"];
}) {
  await connection();

  const params = searchParams ? await searchParams : {};
  const trace = await getNavigationPerformanceTrace("targets", params.qaTrace);
  const actor = await traceNavigationStage(trace, "page_authorization_cache", () =>
    requireProtectedPath("/protected/metas"),
  );
  const startedAt = performance.now();
  const snapshot = await traceNavigationStage(trace, "official_snapshot", () =>
    getOfficialExecutiveSnapshot(
      actor,
      {
        areaId: params.area,
        branchId: params.branch,
        businessLineId: params.line,
        companyId: params.company,
        countryId: params.country,
        managerId: params.manager,
        periodEnd: params.to,
        periodStart: params.from,
      },
      trace,
    ),
  );
  traceNavigationReady(trace, startedAt);

  return (
    <div data-route-content-ready="official-targets">
      <OfficialExecutiveDataDashboard mode="targets" snapshot={snapshot} />
      <NavigationPerformanceTraceMarker trace={trace} />
    </div>
  );
}

export default function TargetsPage({ searchParams }: TargetsPageProps) {
  return (
    <Suspense fallback={<ProtectedRouteLoading label="metas oficiales" />}>
      <TargetsGate searchParams={searchParams} />
    </Suspense>
  );
}
