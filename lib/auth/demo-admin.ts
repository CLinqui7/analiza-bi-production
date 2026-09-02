import {
  isDemoAdminAllowedByEnvironment,
  isDemoRoleSwitchAllowedByEnvironment,
} from "../security/environment.ts";
import { roleKeys, type RoleKey } from "../tenant/demo-context.ts";

export const demoAdminCookieName = "analiza_demo_admin";
export const demoRoleCookieName = "analiza_demo_role";
export const demoBusinessLineCookieName = "analiza_demo_business_line";
export const demoAdminEmail = "admin.demo@analiza.local";
export const demoOrganizationId = "10000000-0000-4000-8000-000000000001";

export type DemoBusinessLineCode =
  | "PHYSIOTHERAPY"
  | "LABORATORY"
  | "IMAGING";

const demoBusinessLineCodes: DemoBusinessLineCode[] = [
  "PHYSIOTHERAPY",
  "LABORATORY",
  "IMAGING",
];

export function getDemoAdminEmail() {
  return process.env.ANALIZA_DEMO_ADMIN_EMAIL ?? demoAdminEmail;
}

export function getDemoAdminPassword() {
  return process.env.ANALIZA_DEMO_ADMIN_PASSWORD;
}

export function getDemoAdminSessionValue() {
  return process.env.ANALIZA_DEMO_ADMIN_SESSION_TOKEN?.trim() ?? "";
}

export function isDemoAdminEnabled() {
  return (
    process.env.VERCEL_ENV !== "production" &&
    isDemoAdminAllowedByEnvironment() &&
    getDemoAdminSessionValue().length >= 32
  );
}

export function hasDemoAdminCookie(value: string | undefined) {
  return isDemoAdminEnabled() && value === getDemoAdminSessionValue();
}

export function isDemoRoleSwitchEnabled() {
  return isDemoAdminEnabled() && isDemoRoleSwitchAllowedByEnvironment();
}

export function getDemoRoleFromCookie(value: string | undefined): RoleKey | null {
  if (!isDemoRoleSwitchEnabled()) {
    return null;
  }

  return roleKeys.includes(value as RoleKey) ? (value as RoleKey) : null;
}

export function getDemoBusinessLineFromCookie(
  value: string | undefined,
): DemoBusinessLineCode | null {
  if (!isDemoRoleSwitchEnabled()) {
    return null;
  }

  return demoBusinessLineCodes.includes(value as DemoBusinessLineCode)
    ? (value as DemoBusinessLineCode)
    : null;
}

export function getDemoSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.VERCEL_ENV === "production",
  };
}

export function getExpiredDemoSessionCookieOptions() {
  return {
    ...getDemoSessionCookieOptions(),
    maxAge: 0,
  };
}
