import { NextResponse } from "next/server";

import { getDataConnector } from "@/lib/data-ingestion/connectors";
import { buildImportScope } from "@/lib/data-ingestion/platform";
import { requireProtectedAccess } from "@/lib/server/authorization";
import { assertScopedBranchReadyForOperationalData } from "@/lib/server/branch-governance";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { canPerformAction } from "@/lib/security/authorization-policy";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";

type ConnectorRouteContext = {
  params: Promise<{
    connectorId: string;
  }>;
};

type SyncBody = {
  branch_id?: unknown;
  branch_name?: unknown;
  business_line_id?: unknown;
  business_line_name?: unknown;
  company_id?: unknown;
  company_name?: unknown;
  country_id?: unknown;
  country_name?: unknown;
  operational_area_id?: unknown;
  organization_id?: unknown;
  period?: unknown;
  publish?: unknown;
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request, context: ConnectorRouteContext) {
  const actor = await requireProtectedAccess();
  const { connectorId } = await context.params;
  const connector = getDataConnector(connectorId);

  if (!connector) {
    return NextResponse.json({ error: "Conector no encontrado." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as SyncBody;
  const period = stringValue(body.period) ?? "2026-07";
  const scope = buildImportScope({
    branchId: stringValue(body.branch_id),
    branchName: stringValue(body.branch_name),
    businessLineId: stringValue(body.business_line_id),
    businessLineName: stringValue(body.business_line_name),
    companyId: stringValue(body.company_id) ?? connector.metadata.companyId,
    companyName: stringValue(body.company_name),
    countryId: stringValue(body.country_id) ?? connector.metadata.countryId,
    countryName: stringValue(body.country_name),
    operationalAreaId: stringValue(body.operational_area_id),
    organizationId:
      stringValue(body.organization_id) ?? actor.scope.organizationId,
  });

  if (!canPerformAction(actor, "connectors.run", { scope })) {
    return NextResponse.json(
      { error: "Actor no autorizado para ejecutar este conector." },
      { status: 403 },
    );
  }

  try {
    if (
      scope.branchId &&
      !isDemoRuntimeEnvironment() &&
      getMissingDatabaseConfig().length === 0
    ) {
      await assertScopedBranchReadyForOperationalData({
        actor,
        branchId: scope.branchId,
        operationLabel: "sincronizar conectores",
      });
    }

    return NextResponse.json(
      await connector.sync({
        actor,
        period,
        publish: body.publish === true,
        scope,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la informacion.",
      },
      { status: 400 },
    );
  }
}
