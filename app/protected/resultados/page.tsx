import { Suspense } from "react";
import { connection } from "next/server";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type ResultsPageProps = {
  searchParams?: Promise<{
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

async function ResultsGate({
  searchParams,
}: {
  searchParams?: ResultsPageProps["searchParams"];
}) {
  await connection();

  const params = searchParams ? await searchParams : {};
  const actor = await requireProtectedPath("/protected/resultados");

  return <MonthlyClosureRouter actor={actor} filter={{ areaId: params.area, branchId: params.branch, businessLineId: Array.isArray(params.line) ? params.line[0] : params.line, companyId: params.company, countryId: params.country, managerId: params.manager, periodStart: params.from, periodEnd: params.to }} line={params.line} mode="results" />;
}

export default function ResultsPage({ searchParams }: ResultsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando resultados...
        </div>
      }
    >
      <ResultsGate searchParams={searchParams} />
    </Suspense>
  );
}
