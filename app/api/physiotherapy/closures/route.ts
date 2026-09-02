import { NextResponse } from "next/server";

import {
  getPhysiotherapyWorkspace,
  savePhysiotherapyClosureDraft,
} from "@/lib/analytics/physiotherapy-closures";
import { requireProtectedAccess } from "@/lib/server/authorization";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function GET(request: Request) {
  const actor = await requireProtectedAccess();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? undefined;

  return NextResponse.json({
    ok: true,
    workspace: await getPhysiotherapyWorkspace(actor, { period }),
  });
}

export async function POST(request: Request) {
  const actor = await requireProtectedAccess();
  const payload = (await request.json().catch(() => null)) as unknown;

  try {
    const closure = await savePhysiotherapyClosureDraft(actor, payload);

    return NextResponse.json({
      closure,
      ok: true,
      workspace: await getPhysiotherapyWorkspace(actor),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "No se pudo guardar el cierre.",
      400,
    );
  }
}
