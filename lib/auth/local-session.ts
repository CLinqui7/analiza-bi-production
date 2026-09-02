import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { localSessionCookieName } from "@/lib/auth/local-session-cookie";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

type CookieSource = {
  get(name: string): { value: string } | undefined;
};

export type LocalUserSession = {
  email: string;
  expiresAt: number;
  roleKey: RoleKey;
  userId: string;
};

const sessionMaxAgeSeconds = 60 * 60 * 8;

function getLocalSessionSecret() {
  const secret =
    process.env.ANALIZA_LOCAL_AUTH_SECRET ??
    process.env.ANALIZA_DEMO_ADMIN_SESSION_TOKEN;

  if (!secret && !isDemoRuntimeEnvironment()) {
    throw new Error("Missing ANALIZA_LOCAL_AUTH_SECRET for local sessions.");
  }

  return secret ?? "analiza-local-development-session-secret";
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getLocalSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.byteLength === rightBuffer.byteLength &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && roleKeys.includes(value as RoleKey);
}

function parseSessionPayload(value: unknown): LocalUserSession | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const email = payload.email;
  const expiresAt = payload.expiresAt;
  const roleKey = payload.roleKey;
  const userId = payload.userId;

  if (
    typeof email !== "string" ||
    typeof expiresAt !== "number" ||
    typeof userId !== "string" ||
    !isRoleKey(roleKey)
  ) {
    return null;
  }

  if (expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { email, expiresAt, roleKey, userId };
}

export function createLocalSessionToken({
  email,
  roleKey,
  userId,
}: {
  email: string;
  roleKey: RoleKey;
  userId: string;
}) {
  const encodedPayload = encodeJson({
    email,
    expiresAt: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds,
    roleKey,
    userId,
  });
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyLocalSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature, extraSegment] = token.split(".");

  if (!encodedPayload || !signature || extraSegment) {
    return null;
  }

  if (!constantTimeEqual(signPayload(encodedPayload), signature)) {
    return null;
  }

  try {
    const decodedPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;

    return parseSessionPayload(decodedPayload);
  } catch {
    return null;
  }
}

export function readLocalSession(cookieSource: CookieSource) {
  return verifyLocalSessionToken(
    cookieSource.get(localSessionCookieName)?.value,
  );
}

export function getLocalSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.VERCEL_ENV === "production",
  };
}

export function getExpiredLocalSessionCookieOptions() {
  return {
    ...getLocalSessionCookieOptions(),
    maxAge: 0,
  };
}
