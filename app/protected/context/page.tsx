import { Suspense } from "react";

import { ContextSelectionForm } from "@/components/context-selection-form";
import { requireProtectedPath } from "@/lib/server/authorization";
import { getOfficialContextOptions } from "@/lib/server/official-context-options";
import { resolveV7ActorFromCurrent } from "@/lib/v7/server/api-auth";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";
import {
  demoBranches,
  demoBusinessLineOptions,
  demoCompanyOptions,
  demoCountryOptions,
} from "@/lib/tenant/demo-context";

async function ContextSelectionGate() {
  const access = await requireProtectedPath("/protected/context");
  const isDemoEnvironment = isDemoRuntimeEnvironment();
  const v7Access = isDemoEnvironment
    ? null
    : await resolveV7ActorFromCurrent(access);
  const options = isDemoEnvironment
    ? {
        branches: demoBranches,
        businessLines: demoBusinessLineOptions,
        companies: demoCompanyOptions,
        countries: demoCountryOptions,
      }
    : await getOfficialContextOptions({
        ...access,
        scopeGrants: v7Access?.scopeGrants,
      });

  return (
    <ContextSelectionForm
      branches={options.branches}
      businessLines={options.businessLines}
      companies={options.companies}
      countries={options.countries}
      isDemoEnvironment={isDemoEnvironment}
      userEmail={access.email}
    />
  );
}

export default function ContextPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando contexto autorizado...
        </div>
      }
    >
      <ContextSelectionGate />
    </Suspense>
  );
}
