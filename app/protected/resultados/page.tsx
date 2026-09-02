import { Suspense } from "react";
import { connection } from "next/server";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type ResultsPageProps = {
  searchParams?: Promise<{
    line?: string | string[];
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

  return <MonthlyClosureRouter actor={actor} line={params.line} mode="results" />;
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
