import { NextResponse } from "next/server";

import { publishImport } from "@/lib/data-ingestion/platform";
import { requireProtectedAccess } from "@/lib/server/authorization";

type ImportRouteContext = {
  params: Promise<{
    importId: string;
  }>;
};

export async function POST(_request: Request, context: ImportRouteContext) {
  const actor = await requireProtectedAccess();
  const { importId } = await context.params;

  try {
    const result = publishImport(importId, actor);

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
            : "No se pudo publicar el import.",
      },
      { status: 400 },
    );
  }
}
