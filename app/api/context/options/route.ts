import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getOfficialContextOptions } from "@/lib/server/official-context-options";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para ver filtros.", 401);
  }

  if (actor.source === "local" && actor.requiresPasswordChange) {
    return jsonError("Debes actualizar tu contrasena antes de continuar.", 403);
  }

  try {
    const options = await getOfficialContextOptions(actor);

    return NextResponse.json({ ok: true, options });
  } catch (error) {
    console.error("Failed to load official context options", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError("No se pudieron cargar los filtros oficiales.", 500);
  }
}
