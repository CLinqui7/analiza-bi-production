import { NextResponse } from "next/server";

import { getImportLineage } from "@/lib/data-ingestion/platform";
import { requireProtectedAccess } from "@/lib/server/authorization";
import { canPerformAction } from "@/lib/security/authorization-policy";

type ImportRouteContext = {
  params: Promise<{
    importId: string;
  }>;
};

export async function GET(_request: Request, context: ImportRouteContext) {
  const actor = await requireProtectedAccess();
  const { importId } = await context.params;
  const lineage = getImportLineage(importId);

  if (!lineage) {
    return NextResponse.json({ error: "Import no encontrado." }, { status: 404 });
  }

  if (
    !canPerformAction(actor, "route.access", { pathname: "/protected/importaciones" }) ||
    !canPerformAction(actor, "record.read", {
      scope: lineage.importRecord.scope,
    })
  ) {
    return NextResponse.json(
      { error: "No tienes permiso para consultar esta trazabilidad." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    audit: lineage.audit,
    importRecord: lineage.importRecord,
    publishedRows: lineage.publishedRows.map((row) => ({
      active: row.active,
      datasetType: row.datasetType,
      lineage: row.lineage,
      publishedAt: row.publishedAt,
      rowNumber: row.rowNumber,
    })),
    raw: lineage.raw
      ? {
          checksum: lineage.raw.checksum,
          contentType: lineage.raw.contentType,
          fileName: lineage.raw.fileName,
          fileSize: lineage.raw.fileSize,
          immutable: lineage.raw.immutable,
          receivedAt: lineage.raw.receivedAt,
          sanitizedFileName: lineage.raw.sanitizedFileName,
          sourceId: lineage.raw.sourceId,
          uploadedBy: lineage.raw.uploadedBy,
        }
      : null,
    stagingRows: lineage.stagingRows.map((row) => ({
      errors: row.errors,
      lineage: row.lineage,
      rowNumber: row.rowNumber,
      warnings: row.warnings,
    })),
  });
}
