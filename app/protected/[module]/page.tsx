import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BranchBiServerDashboard } from "@/components/branch-bi-server-dashboard";
import { BusinessModuleDashboard } from "@/components/business-module-dashboard";
import { CapacityOccupancyDashboard } from "@/components/capacity-occupancy-dashboard";
import { AccountProfileDashboard } from "@/components/account-profile-dashboard";
import { CrmConnectorsDashboard } from "@/components/crm-connectors-dashboard";
import { DataQualityAnaliaDashboard } from "@/components/data-quality-analia-dashboard";
import { ExecutiveOperationDashboard } from "@/components/executive-operation-dashboard";
import { ImagingPresentationDashboard } from "@/components/imaging-presentation-dashboard";
import { ImportOperationsDashboard } from "@/components/import-operations-dashboard";
import { LaboratoryPresentationDashboard } from "@/components/laboratory-presentation-dashboard";
import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { OfficialManagerIncentiveDirectory } from "@/components/official-manager-incentive-directory";
import { OperationsModule } from "@/components/operations-modules";
import { PatientFlowDemandDashboard } from "@/components/patient-flow-demand-dashboard";
import { PhysiotherapyPresentationDashboard } from "@/components/physiotherapy-presentation-dashboard";
import { ProfessionalPerformanceDashboard } from "@/components/professional-performance-dashboard";
import { ServicePortfolioDashboard } from "@/components/service-portfolio-dashboard";
import { Badge } from "@/components/ui/badge";
import { moduleConfigs } from "@/lib/analytics/demo-business-modules";
import { navigationItems } from "@/lib/navigation";
import { requireProtectedPath } from "@/lib/server/authorization";
import { getOfficialExecutiveSnapshot } from "@/lib/server/official-bi";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";

type ModulePageProps = {
  params: Promise<{
    module: string;
  }>;
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

const operationsModuleSlugs = [
  "gerentes",
] as const;
const staticProtectedModuleSlugs = new Set([
  "cierres",
  "mi-sucursal",
  "resultados",
]);

export function generateStaticParams() {
  return navigationItems
    .filter((item) => item.href !== "/protected/overview")
    .map((item) => item.href.replace("/protected/", ""))
    .filter(
      (module) =>
        !module.includes("/") && !staticProtectedModuleSlugs.has(module),
    )
    .map((item) => ({
      module: item,
    }));
}

async function renderOfficialDataModule(
  mode: "finances" | "insights" | "targets",
  actor: Awaited<ReturnType<typeof requireProtectedPath>>,
  searchParams: ModulePageProps["searchParams"],
) {
  const params = searchParams ? await searchParams : {};
  const snapshot = await getOfficialExecutiveSnapshot(actor, {
    branchId: params.branch,
    businessLineId: params.line,
    companyId: params.company,
    countryId: params.country,
    periodEnd: params.to,
    periodStart: params.from,
  });
  const { OfficialExecutiveDataDashboard } = await import(
    "@/components/official-executive-data-dashboard"
  );

  return <OfficialExecutiveDataDashboard mode={mode} snapshot={snapshot} />;
}

export default async function ModulePage({
  params,
  searchParams,
}: ModulePageProps) {
  await connection();

  const { module } = await params;
  const item = navigationItems.find(
    (navigationItem) => navigationItem.href === `/protected/${module}`,
  );

  if (!item) {
    notFound();
  }

  const actor = await requireProtectedPath(item.href);

  const Icon = item.icon;

  if (module === "citas") {
    return <PatientFlowDemandDashboard />;
  }

  if (module === "capacidad") {
    return <CapacityOccupancyDashboard />;
  }

  if (module === "sucursales") {
    const context = searchParams ? await searchParams : {};
    return <BranchBiServerDashboard actor={actor} filter={{ areaId: context.area, branchId: context.branch, businessLineId: context.line, countryId: context.country, managerId: context.manager, periodStart: context.from, periodEnd: context.to }} mode="branches" />;
  }

  if (module === "profesionales") {
    return <ProfessionalPerformanceDashboard />;
  }

  if (module === "servicios") {
    return <ServicePortfolioDashboard />;
  }

  if (module === "laboratorio") {
    return <LaboratoryPresentationDashboard />;
  }

  if (module === "fisioterapia") {
    return <PhysiotherapyPresentationDashboard />;
  }

  if (module === "imagenes") {
    return <ImagingPresentationDashboard />;
  }

  if (module === "insights") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("insights", actor, searchParams);
    }

    const { InsightsIntelligenceDashboard } = await import(
      "@/components/insights-intelligence-dashboard"
    );

    return <InsightsIntelligenceDashboard />;
  }

  if (module === "importaciones") {
    return <ImportOperationsDashboard roleKey={actor.roleKey} />;
  }

  if (module === "gerentes" && !isDemoRuntimeEnvironment()) {
    return <OfficialManagerIncentiveDirectory />;
  }

  if (module === "plantillas") {
    const resolvedSearchParams = searchParams ? await searchParams : {};

    return (
      <MonthlyClosureRouter
        actor={actor}
        line={resolvedSearchParams.line}
        mode="new-closure"
      />
    );
  }

  if (module === "conectores" || module === "apis") {
    return <CrmConnectorsDashboard />;
  }

  if (module === "calidad-datos") {
    if (!isDemoRuntimeEnvironment()) {
      const params = searchParams ? await searchParams : {};
      const snapshot = await getOfficialExecutiveSnapshot(actor, {
        branchId: params.branch,
        businessLineId: params.line,
        companyId: params.company,
        countryId: params.country,
        periodEnd: params.to,
        periodStart: params.from,
      });
      const { OfficialDataQualityDashboard } = await import(
        "@/components/official-data-quality-dashboard"
      );
      return <OfficialDataQualityDashboard snapshot={snapshot} />;
    }

    return <DataQualityAnaliaDashboard />;
  }

  if (module === "metas") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("targets", actor, searchParams);
    }

    const { GoalsAdvancesDashboard } = await import(
      "@/components/goals-advances-dashboard"
    );

    return <GoalsAdvancesDashboard />;
  }

  if (module === "configuracion") {
    return <AccountProfileDashboard />;
  }

  if (
    operationsModuleSlugs.includes(
      module as (typeof operationsModuleSlugs)[number],
    )
  ) {
    return <OperationsModule module={module} />;
  }

  if (module === "operacion") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("insights", actor, searchParams);
    }

    return <ExecutiveOperationDashboard />;
  }

  if (module === "finanzas") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("finances", actor, searchParams);
    }

    const { FinancialHealthDashboard } = await import(
      "@/components/financial-health-dashboard"
    );

    return <FinancialHealthDashboard />;
  }

  if (moduleConfigs[module]) {
    return (
      <BusinessModuleDashboard
        allowDemoRoleSwitch={actor.allowDemoRoleSwitch}
        actorScope={actor.scope}
        enableDemoFixtures={isDemoRuntimeEnvironment()}
        module={module}
        roleKey={actor.roleKey}
      />
    );
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3">
        <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
          Entorno DEMO
        </Badge>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border bg-card">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              {item.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Modulo preparado para fases posteriores.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
