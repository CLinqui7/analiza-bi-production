import { Suspense } from "react";
import { connection } from "next/server";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type ClosuresPageProps = {
  searchParams?: Promise<{
    line?: string | string[];
  }>;
};

async function ClosuresGate({
  searchParams,
}: {
  searchParams?: ClosuresPageProps["searchParams"];
}) {
  await connection();

  const params = searchParams ? await searchParams : {};
  const actor = await requireProtectedPath("/protected/cierres");

  return <MonthlyClosureRouter actor={actor} line={params.line} mode="history" />;
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
