import { NextResponse } from "next/server";

import {
  getLaboratoryWorkspace,
  publishLaboratoryClosure,
} from "@/lib/analytics/laboratory-closures";
import { requireProtectedAccess } from "@/lib/server/authorization";

type ClosureRouteContext = {
  params: Promise<{
    closureId: string;
  }>;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function POST(_request: Request, context: ClosureRouteContext) {
  const actor = await requireProtectedAccess();
  const { closureId } = await context.params;

  try {
    const closure = await publishLaboratoryClosure(actor, closureId);

    return NextResponse.json({
      closure,
      ok: true,
      workspace: await getLaboratoryWorkspace(actor),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "No se pudo publicar el cierre.",
      400,
    );
  }
}
