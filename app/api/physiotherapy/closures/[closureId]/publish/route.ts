import { NextResponse } from "next/server";

import {
  getPhysiotherapyWorkspace,
  publishPhysiotherapyClosure,
} from "@/lib/analytics/physiotherapy-closures";
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
    const closure = await publishPhysiotherapyClosure(actor, closureId);

    return NextResponse.json({
      closure,
      ok: true,
      workspace: await getPhysiotherapyWorkspace(actor),
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
