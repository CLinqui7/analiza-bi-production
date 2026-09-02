import { LaboratoryVerticalDashboard } from "@/components/laboratory-vertical-dashboard";
import { MonthlySubmissionCenter } from "@/components/production/monthly-submission-center";
import { ImagingVerticalDashboard } from "@/components/imaging-vertical-dashboard";
import { PhysiotherapyVerticalDashboard } from "@/components/physiotherapy-vertical-dashboard";
import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";
import { getBusinessLineForCompany } from "@/lib/tenant/demo-context";
import { resolveV7ActorFromCurrent } from "@/lib/v7/server/api-auth";
import { getTenantContextOptions } from "@/lib/v7/server/tenant-context";
import { canPerformAction as canPerformV7Action } from "@/lib/v7/security/authorization-policy";

type DashboardMode =
  | "branch-home"
  | "new-closure"
  | "history"
  | "results"
  | "targets"
  | "insights"
  | "operations"
  | "overview";

type MonthlyClosureRouterProps = {
  actor: AuthorizationActor;
  line?: string | string[];
  mode: DashboardMode;
};

function requestedLine(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (
    normalizedValue === "business-line-imagenes" ||
    normalizedValue === "imagenes" ||
    normalizedValue === "imagen" ||
    normalizedValue === "imaging" ||
    normalizedValue === "img" ||
    normalizedValue?.includes("imagenes") ||
    normalizedValue?.includes("imagen") ||
    normalizedValue?.includes("imaging")
  ) {
    return "imagenes";
  }

  if (
    normalizedValue === "business-line-laboratorio" ||
    normalizedValue === "laboratorio" ||
    normalizedValue === "laboratory" ||
    normalizedValue === "lab" ||
    normalizedValue?.includes("laboratorio") ||
    normalizedValue?.includes("laboratory")
  ) {
    return "laboratorio";
  }

  if (
    normalizedValue === "business-line-fisioterapia" ||
    normalizedValue === "fisioterapia" ||
    normalizedValue === "physiotherapy" ||
    normalizedValue === "fisio" ||
    normalizedValue?.includes("fisioterapia") ||
    normalizedValue?.includes("physiotherapy")
  ) {
    return "fisioterapia";
  }

  return null;
}

function requestedLineFromText(value: string | null | undefined) {
  return requestedLine(value ?? undefined);
}

function scopedCompanyUnit(actor: AuthorizationActor) {
  return (
    requestedLineFromText(actor.scope.companyName) ??
    requestedLineFromText(actor.scope.companyId) ??
    getBusinessLineForCompany(actor.scope.companyId ?? "").unitType
  );
}

export async function MonthlyClosureRouter({
  actor,
  line,
  mode,
}: MonthlyClosureRouterProps) {
  const selectedLine = requestedLine(line) ?? scopedCompanyUnit(actor);

  if (!isDemoRuntimeEnvironment()) {
    const v7Actor = await resolveV7ActorFromCurrent(actor);
    const options = await getTenantContextOptions(v7Actor);
    const lockedBusinessLineCode =
      selectedLine === "laboratorio"
        ? "LABORATORY"
        : selectedLine === "imagenes"
          ? "IMAGING"
          : selectedLine === "fisioterapia"
            ? "PHYSIOTHERAPY"
            : undefined;

    if (!lockedBusinessLineCode) {
      return (
        <section className="flex w-full flex-col gap-4 px-4 py-6 lg:px-6">
          <div className="rounded-md border border-dashed bg-card p-6">
            <h1 className="text-xl font-semibold tracking-normal">
              Selecciona una linea de negocio
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              El cierre mensual necesita una linea en el contexto de la URL o
              en el alcance autorizado del usuario.
            </p>
          </div>
        </section>
      );
    }

    return (
      <MonthlySubmissionCenter
        options={options}
        canWrite={canPerformV7Action(v7Actor, "monthly_submission.write")}
        canPublish={canPerformV7Action(v7Actor, "monthly_submission.publish")}
        lockedBusinessLineCode={lockedBusinessLineCode}
      />
    );
  }

  if (selectedLine === "laboratorio") {
    return <LaboratoryVerticalDashboard mode={mode} />;
  }

  if (selectedLine === "imagenes") {
    return <ImagingVerticalDashboard mode={mode} />;
  }

  if (selectedLine !== "fisioterapia" && !isDemoRuntimeEnvironment()) {
    return (
      <section className="flex w-full flex-col gap-4 px-4 py-6 lg:px-6">
        <div className="rounded-md border border-dashed bg-card p-6">
          <h1 className="text-xl font-semibold tracking-normal">
            Selecciona una linea de negocio
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            El cierre mensual necesita una linea en el contexto de la URL o en
            el alcance autorizado del usuario para abrir el formulario correcto.
          </p>
        </div>
      </section>
    );
  }

  return <PhysiotherapyVerticalDashboard mode={mode} />;
}
