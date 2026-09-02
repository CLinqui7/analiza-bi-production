import { NextResponse } from "next/server";

import {
  createLocalSessionToken,
  getLocalSessionCookieOptions,
} from "@/lib/auth/local-session";
import { localSessionCookieName } from "@/lib/auth/local-session-cookie";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { acceptUserInvitation } from "@/lib/server/local-auth";

type AcceptInvitationRequest = {
  email?: unknown;
  password?: unknown;
  token?: unknown;
};

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

export async function POST(request: Request) {
  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return jsonError(
      "Falta configurar la base de datos para activar invitaciones.",
      503,
      missingConfig,
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | AcceptInvitationRequest
    | null;
  const email =
    typeof payload?.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const password =
    typeof payload?.password === "string" ? payload.password : "";
  const token = typeof payload?.token === "string" ? payload.token : "";

  if (!email || !password || !token) {
    return jsonError("Completa correo, invitacion y contrasena.", 400);
  }

  try {
    const user = await acceptUserInvitation({ email, password, token });
    const response = NextResponse.json({ ok: true });

    response.cookies.set(
      localSessionCookieName,
      createLocalSessionToken(user),
      getLocalSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "No se pudo activar la invitacion.",
      400,
    );
  }
}
