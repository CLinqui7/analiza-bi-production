import { NextResponse } from "next/server";

import {
  getPhysiotherapyTargetDefinitions,
  getPhysiotherapyWorkspace,
  upsertPhysiotherapyTarget,
} from "@/lib/analytics/physiotherapy-closures";
import { requireProtectedAccess } from "@/lib/server/authorization";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function GET() {
  const actor = await requireProtectedAccess();

  return NextResponse.json({
    definitions: getPhysiotherapyTargetDefinitions(),
    ok: true,
    workspace: await getPhysiotherapyWorkspace(actor),
  });
}

export async function POST(request: Request) {
  const actor = await requireProtectedAccess();
  const payload = (await request.json().catch(() => null)) as unknown;

  try {
    const target = await upsertPhysiotherapyTarget(actor, payload);

    return NextResponse.json({
      ok: true,
      target,
      workspace: await getPhysiotherapyWorkspace(actor),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "No se pudo guardar la meta.",
      400,
    );
  }
}
