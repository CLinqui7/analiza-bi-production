import { NextResponse } from "next/server";

import { getDataConnector } from "@/lib/data-ingestion/connectors";
import { requireProtectedPath } from "@/lib/server/authorization";

type ConnectorRouteContext = {
  params: Promise<{
    connectorId: string;
  }>;
};

export async function POST(_request: Request, context: ConnectorRouteContext) {
  await requireProtectedPath("/protected/conectores");
  const { connectorId } = await context.params;
  const connector = getDataConnector(connectorId);

  if (!connector) {
    return NextResponse.json({ error: "Conector no encontrado." }, { status: 404 });
  }

  return NextResponse.json(await connector.testConnection());
}
