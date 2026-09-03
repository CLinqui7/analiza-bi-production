import { NextResponse } from "next/server";

import { rollbackImport } from "@/lib/data-ingestion/platform";
import { requireProtectedAccess } from "@/lib/server/authorization";
import { canPerformAction } from "@/lib/security/authorization-policy";

type ImportRouteContext = {
  params: Promise<{
    importId: string;
  }>;
};

export async function POST(request: Request, context: ImportRouteContext) {
  const actor = await requireProtectedAccess();
  if (!canPerformAction(actor, "route.access", { pathname: "/protected/importaciones" })) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { importId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    reason?: unknown;
  };
  const reason = typeof body.reason === "string" ? body.reason : "";

  try {
    const result = rollbackImport(importId, actor, reason);

    return NextResponse.json({
      audit: result.audit,
      importRecord: result.importRecord,
      publishedRows: result.publishedRows.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo revertir el import.",
      },
      { status: 400 },
    );
  }
}
