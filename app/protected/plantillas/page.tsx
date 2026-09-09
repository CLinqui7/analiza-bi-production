import { connection } from "next/server";
import { Suspense } from "react";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { ProtectedRouteLoading } from "@/components/protected-route-loading";
import { requireProtectedPath } from "@/lib/server/authorization";
import {
  getNavigationPerformanceTrace,
  traceNavigationStage,
} from "@/lib/server/navigation-performance-trace";

type TemplatesPageProps = {
  searchParams?: Promise<{
    qaTrace?: string;
    line?: string | string[];
  }>;
};

async function TemplatesGate({
  searchParams,
}: {
  searchParams?: TemplatesPageProps["searchParams"];
}) {
  await connection();

  const params = searchParams ? await searchParams : {};
  const trace = await getNavigationPerformanceTrace("form", params.qaTrace);
  const actor = await traceNavigationStage(trace, "page_authorization_cache", () =>
    requireProtectedPath("/protected/plantillas"),
  );

  return (
    <MonthlyClosureRouter
      actor={actor}
      line={params.line}
      mode="new-closure"
      trace={trace}
    />
  );
}

export default function TemplatesPage({ searchParams }: TemplatesPageProps) {
  return (
    <Suspense fallback={<ProtectedRouteLoading label="formulario mensual" />}>
      <TemplatesGate searchParams={searchParams} />
    </Suspense>
  );
}
