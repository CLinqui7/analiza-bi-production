import { NextResponse } from "next/server";

import {
  buildTemplateCsv,
  ingestionTemplates,
} from "@/lib/data-ingestion/templates";
import { requireProtectedPath } from "@/lib/server/authorization";

export async function GET(request: Request) {
  await requireProtectedPath("/protected/importaciones");

  const { searchParams } = new URL(request.url);
  const datasetType = searchParams.get("dataset_type");
  const template = datasetType
    ? ingestionTemplates.find((item) => item.datasetType === datasetType)
    : null;

  if (template && searchParams.get("format") === "csv") {
    return new Response(buildTemplateCsv(template), {
      headers: {
        "Content-Disposition": `attachment; filename="${template.id}-${template.version}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  return NextResponse.json({
    templates: ingestionTemplates.map((item) => ({
      acceptedFormats: item.acceptedFormats,
      businessLine: item.businessLine,
      criticalFields: item.criticalFields,
      datasetType: item.datasetType,
      dedupeKey: item.dedupeKey,
      fields: item.fields,
      id: item.id,
      instructions: item.instructions,
      name: item.name,
      version: item.version,
    })),
  });
}
