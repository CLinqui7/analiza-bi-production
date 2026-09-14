import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveFormBusinessLine } from "@/lib/monthly-form-contract";
import { parseMonthlyWorkbookBuffer } from "@/lib/monthly-workbook-import";
import { createClient } from "@/lib/supabase/server";
import { assertRecordAccess } from "@/lib/v7/security/authorization-policy";
import { actorForApi, isApiResponse } from "@/lib/v7/server/api-auth";

// Keep multipart imports below Vercel Functions' 4.5 MB request-body ceiling.
const maxImportFileBytes = 4 * 1024 * 1024;
const metadataSchema = z.object({
  branchId: z.string().uuid(),
  businessLineId: z.string().uuid(),
  period: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
});

type BranchRow = {
  id: string;
  organization_id: string;
  country_id: string;
  company_id: string;
  operational_area_id: string | null;
  name: string;
  code: string | null;
  is_demo: boolean;
};
type LineRow = {
  id: string;
  organization_id: string;
  company_id: string | null;
  code: string;
  name: string;
  is_demo: boolean;
};

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export async function POST(request: Request) {
  const actorOrResponse = await actorForApi("monthly_submission.write");
  if (isApiResponse(actorOrResponse)) return actorOrResponse;
  const actor = actorOrResponse;
  if (actor.isDemo) return NextResponse.json({ error: "DEMO_READ_ONLY" }, { status: 409 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "INVALID_MULTIPART_PAYLOAD" }, { status: 400 });
  const file = formData.get("file");
  const metadata = metadataSchema.safeParse({
    branchId: formData.get("branchId"),
    businessLineId: formData.get("businessLineId"),
    period: formData.get("period"),
  });
  if (!metadata.success || !(file instanceof File)) {
    return NextResponse.json({ error: "INVALID_IMPORT_REQUEST" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > maxImportFileBytes) {
    return NextResponse.json(
      { error: "INVALID_IMPORT_FILE_SIZE", maxFileBytes: maxImportFileBytes },
      { status: 413 },
    );
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json({ error: "XLSX_REQUIRED", message: "La importación de respuestas requiere un archivo .xlsx." }, { status: 415 });
  }

  const supabase = await createClient();
  const [{ data: branchData }, { data: lineData }] = await Promise.all([
    supabase
      .from("branches")
      .select("id,organization_id,country_id,company_id,operational_area_id,name,code,is_demo")
      .eq("id", metadata.data.branchId)
      .maybeSingle(),
    supabase
      .from("business_lines")
      .select("id,organization_id,company_id,code,name,is_demo")
      .eq("id", metadata.data.businessLineId)
      .maybeSingle(),
  ]);
  if (!branchData || !lineData) return NextResponse.json({ error: "IMPORT_SCOPE_NOT_FOUND" }, { status: 404 });
  const branch = branchData as BranchRow;
  const line = lineData as LineRow;

  try {
    assertRecordAccess(actor, {
      organizationId: branch.organization_id,
      countryId: branch.country_id,
      companyId: branch.company_id,
      operationalAreaId: branch.operational_area_id,
      branchId: branch.id,
      businessLineId: line.id,
    });
  } catch {
    return NextResponse.json({ error: "FORBIDDEN_SCOPE" }, { status: 403 });
  }
  if (
    branch.organization_id !== actor.scope.organizationId
    || branch.is_demo
    || line.is_demo
    || line.organization_id !== branch.organization_id
    || (line.company_id && line.company_id !== branch.company_id)
  ) {
    return NextResponse.json({ error: "IMPORT_SCOPE_MISMATCH" }, { status: 409 });
  }

  const formLine = resolveFormBusinessLine(line);
  if (formLine !== "Fisioterapia" && formLine !== "Imagenes") {
    return NextResponse.json({ error: "SOURCE_IMPORT_NOT_AVAILABLE_FOR_LINE" }, { status: 422 });
  }

  const buffer = await file.arrayBuffer();
  const signature = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4));
  if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
    return NextResponse.json({ error: "INVALID_XLSX_SIGNATURE" }, { status: 415 });
  }

  try {
    const result = await parseMonthlyWorkbookBuffer({
      line: formLine,
      buffer,
      period: metadata.data.period,
      branchName: branch.name,
      branchCode: branch.code,
    });
    return NextResponse.json({
      ...result,
      sourceFileName: safeFileName(file.name),
      persisted: false,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error && error.message === "EXPECTED_SOURCE_SHEET_NOT_FOUND"
      ? error.message
      : "WORKBOOK_PARSE_FAILED";
    return NextResponse.json({
      error: code,
      message: code === "EXPECTED_SOURCE_SHEET_NOT_FOUND"
        ? "El Excel no contiene la hoja principal esperada para la línea seleccionada."
        : "No se pudo leer el Excel. Verifica que sea una plantilla válida y vuelve a intentarlo.",
    }, { status: 422, headers: { "Cache-Control": "private, no-store" } });
  }
}
