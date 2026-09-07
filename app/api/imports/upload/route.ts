import { NextResponse } from "next/server";

import {
  buildImportScope,
  ingestTabularFile,
} from "@/lib/data-ingestion/platform";
import {
  getIngestionTemplate,
  type IngestionDatasetType,
} from "@/lib/data-ingestion/templates";
import { requireProtectedAccess } from "@/lib/server/authorization";
import { canPerformAction } from "@/lib/security/authorization-policy";

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toSafePreview(result: ReturnType<typeof ingestTabularFile>) {
  return {
    audit: result.audit,
    duplicateOf: result.duplicateOf,
    importRecord: result.importRecord,
    issues: result.issues,
    previewRows: result.previewRows.map((row) => ({
      errors: row.errors,
      mapped: row.mapped,
      rowNumber: row.rowNumber,
      warnings: row.warnings,
    })),
    qualityScore: result.qualityScore,
    raw: {
      checksum: result.raw.checksum,
      contentType: result.raw.contentType,
      fileName: result.raw.fileName,
      fileSize: result.raw.fileSize,
      immutable: result.raw.immutable,
      sanitizedFileName: result.raw.sanitizedFileName,
      sourceId: result.raw.sourceId,
    },
    stagingRows: result.stagingRows.length,
  };
}

export async function POST(request: Request) {
  const actor = await requireProtectedAccess();
  if (!canPerformAction(actor, "route.access", { pathname: "/protected/importaciones" })) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const formData = await request.formData();
  const fileValue = formData.get("file");
  const datasetType = readFormString(formData, "dataset_type") as
    | IngestionDatasetType
    | null;

  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }

  if (!datasetType || !getIngestionTemplate(datasetType)) {
    return NextResponse.json(
      { error: "Tipo de dataset no soportado." },
      { status: 400 },
    );
  }

  const period = readFormString(formData, "period") ?? "2026-07";
  const scope = buildImportScope({
    branchId: readFormString(formData, "branch_id"),
    branchName: readFormString(formData, "branch_name"),
    businessLineId: readFormString(formData, "business_line_id"),
    businessLineName: readFormString(formData, "business_line_name"),
    companyId: readFormString(formData, "company_id"),
    companyName: readFormString(formData, "company_name"),
    countryId: readFormString(formData, "country_id"),
    countryName: readFormString(formData, "country_name"),
    operationalAreaId: readFormString(formData, "operational_area_id"),
    organizationId:
      readFormString(formData, "organization_id") ?? actor.scope.organizationId,
  });
  const buffer = Buffer.from(await fileValue.arrayBuffer());

  try {
    if (actor.scope.branchId && scope.branchId && scope.branchId !== actor.scope.branchId) {
      return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
    }
    if (actor.scope.countryId && scope.countryId && scope.countryId !== actor.scope.countryId) {
      return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
    }
    if (actor.scope.companyId && scope.companyId && scope.companyId !== actor.scope.companyId) {
      return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
    }

    const result = ingestTabularFile({
      actor,
      allowReplace: readFormString(formData, "allow_replace") === "true",
      buffer,
      connectorId: readFormString(formData, "connector_id"),
      contentType: fileValue.type,
      datasetType,
      fileName: fileValue.name,
      period,
      scope,
      sourceId: readFormString(formData, "source_id") ?? "manual-file",
    });

    return NextResponse.json(toSafePreview(result));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo validar el archivo.",
      },
      { status: 400 },
    );
  }
}
