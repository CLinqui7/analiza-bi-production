import { NextResponse } from "next/server";

import {
  createLocalSessionToken,
  getExpiredLocalSessionCookieOptions,
  getLocalSessionCookieOptions,
} from "@/lib/auth/local-session";
import { localSessionCookieName } from "@/lib/auth/local-session-cookie";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { authenticateLocalUser } from "@/lib/server/local-auth";

type LocalLoginRequest = {
  email?: unknown;
  password?: unknown;
};

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

export async function POST(request: Request) {
  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return jsonError(
      "El acceso con contrasena local no esta configurado.",
      503,
      missingConfig,
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | LocalLoginRequest
    | null;
  const email =
    typeof payload?.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const password =
    typeof payload?.password === "string" ? payload.password : "";

  if (!email || !password) {
    return jsonError("Completa correo y contrasena.", 400);
  }

  const user = await authenticateLocalUser({ email, password });

  if (!user) {
    return jsonError("Usuario o contrasena incorrectos.", 401);
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: user.requiresPasswordChange
      ? "/auth/update-password"
      : "/protected/context",
    requiresPasswordChange: user.requiresPasswordChange,
  });
  response.cookies.set(
    localSessionCookieName,
    createLocalSessionToken(user),
    getLocalSessionCookieOptions(),
  );

  return response;
}

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    localSessionCookieName,
    "",
    getExpiredLocalSessionCookieOptions(),
  );

  return response;
}
