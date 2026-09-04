import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { resolveV7ActorFromCurrent } from "@/lib/v7/server/api-auth";
import { getTenantContextOptions } from "@/lib/v7/server/tenant-context";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para ver filtros.", 401);
  }

  if (actor.source === "local" && actor.requiresPasswordChange) {
    return jsonError("Debes actualizar tu contrasena antes de continuar.", 403);
  }

  try {
    const v7Actor = await resolveV7ActorFromCurrent(actor);
    const context = await getTenantContextOptions(v7Actor);
    const lineByCompanyId = new Map(
      context.businessLines.map((line) => [line.parentId, line]),
    );
    const unitTypeFor = (lineCode?: string) => {
      if (lineCode === "LABORATORY") return "laboratorio" as const;
      if (lineCode === "IMAGING") return "imagenes" as const;
      return "fisioterapia" as const;
    };
    const options = {
      branches: context.branches.map((branch) => ({
        areaManagerName: context.areaManagers.find((manager) => manager.operationalAreaId === branch.operationalAreaId)?.name,
        areaZone: context.operationalAreas.find((area) => area.id === branch.operationalAreaId)?.name,
        branchManagerName: context.branchManagers.find((manager) => manager.branchId === branch.id)?.name,
        businessLineCode: lineByCompanyId.get(branch.parentId)?.code,
        city: branch.city ?? "",
        code: branch.code ?? branch.id,
        companyId: branch.parentId ?? "",
        countryId: branch.countryId ?? "",
        id: branch.id,
        isActive: branch.status !== "inactive",
        isDemo: false,
        name: branch.name,
        operationalAreaId: branch.operationalAreaId,
        sourceTrace: "supabase-v7",
      })),
      businessLines: context.businessLines.map((line) => ({
        code: line.code ?? "PHYSIOTHERAPY",
        companyId: line.parentId ?? null,
        id: line.id,
        isDemo: false,
        name: line.name,
        unitType: unitTypeFor(line.code),
      })),
      companies: context.companies.map((company) => ({
        id: company.id,
        isDemo: false,
        key: company.code ?? company.id,
        name: company.name,
        unitType: unitTypeFor(lineByCompanyId.get(company.id)?.code),
      })),
      countries: context.countries.map((country) => ({
        currencyCode: "N/A",
        dateFormat: "dd/MM/yyyy",
        id: country.id,
        iso2: country.code ?? "",
        isDemo: false,
        name: country.name,
        timeZone: "America/El_Salvador",
      })),
      managers: [
        ...context.areaManagers.map((manager) => ({ id: manager.id, name: manager.name })),
        ...context.branchManagers.map((manager) => ({ id: manager.id, name: manager.name })),
      ],
      operationalAreas: context.operationalAreas.map((area) => ({
        areaZone: area.name,
        businessLineCode: lineByCompanyId.get(area.parentId)?.code ?? "PHYSIOTHERAPY",
        code: area.code ?? area.id,
        companyId: area.parentId ?? "",
        countryId: area.countryId ?? "",
        id: area.id,
        isDemo: false,
        managerName: context.areaManagers.find((manager) => manager.operationalAreaId === area.id)?.name ?? area.name,
        name: area.name,
        organizationId: actor.scope.organizationId,
        sourceTrace: "supabase-v7",
      })),
    };

    return NextResponse.json({
      ok: true,
      options,
      // The header consumes this metadata with the same authoritative option
      // response; it must not build a second client-side scope model.
      actor: {
        email: actor.email,
        requiresPasswordChange: actor.requiresPasswordChange ?? false,
        roleKey: actor.roleKey,
        scope: {
          branchCity: null,
          branchCode: null,
          branchId: actor.scope.branchId ?? null,
          branchName: actor.scope.branchName ?? null,
          companyId: actor.scope.companyId ?? null,
          companyName: actor.scope.companyName ?? null,
          countryId: actor.scope.countryId ?? null,
          countryName: actor.scope.countryName ?? null,
          operationalAreaId: actor.scope.operationalAreaId ?? null,
          operationalAreaName: actor.scope.operationalAreaName ?? null,
          organizationId: actor.scope.organizationId ?? null,
          organizationName: null,
        },
        scopeGrants: v7Actor.scopeGrants,
        userId: actor.userId,
      },
    });
  } catch (error) {
    console.error("Failed to load official context options", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError("No se pudieron cargar los filtros oficiales.", 500);
  }
}
