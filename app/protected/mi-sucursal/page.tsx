import { Suspense } from "react";
import { connection } from "next/server";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type MyBranchPageProps = {
  searchParams?: Promise<{
    area?: string;
    branch?: string;
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
  const actor = await requireProtectedPath("/protected/mi-sucursal");

  return (
    <MonthlyClosureRouter actor={actor} filter={{ areaId: params.area, branchId: params.branch, countryId: params.country, businessLineId: Array.isArray(params.line) ? params.line[0] : params.line, managerId: params.manager, periodStart: params.from, periodEnd: params.to }} line={params.line} mode="branch-home" />
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
