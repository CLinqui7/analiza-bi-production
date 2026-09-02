import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  demoAdminCookieName,
  demoRoleCookieName,
  getDemoSessionCookieOptions,
  hasDemoAdminCookie,
  isDemoRoleSwitchEnabled,
} from "@/lib/auth/demo-admin";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

type DemoRoleRequest = {
  roleKey?: unknown;
};

function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && roleKeys.includes(value as RoleKey);
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();

  if (!hasDemoAdminCookie(cookieStore.get(demoAdminCookieName)?.value)) {
    return jsonError("Sesion DEMO no autorizada.", 401);
  }

  if (!isDemoRoleSwitchEnabled()) {
    return jsonError("Selector de rol DEMO desactivado para este ambiente.", 403);
  }

  const payload = (await request.json().catch(() => null)) as
    | DemoRoleRequest
    | null;

  if (!isRoleKey(payload?.roleKey)) {
    return jsonError("Rol DEMO invalido.", 400);
  }

  const response = NextResponse.json({ ok: true, roleKey: payload.roleKey });
  response.cookies.set(
    demoRoleCookieName,
    payload.roleKey,
    getDemoSessionCookieOptions(),
  );

  return response;
}
