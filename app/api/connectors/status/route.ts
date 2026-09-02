import { NextResponse } from "next/server";

import {
  listConnectorRuns,
  listConnectorStatuses,
} from "@/lib/data-ingestion/connectors";
import { requireProtectedPath } from "@/lib/server/authorization";

export async function GET() {
  await requireProtectedPath("/protected/conectores");

  return NextResponse.json({
    connectors: await listConnectorStatuses(),
    runs: listConnectorRuns(),
  });
}
