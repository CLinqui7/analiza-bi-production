import "server-only";

import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { canPerformAction } from "@/lib/v7/security/authorization-policy";
import type { ActionKey, Actor } from "@/lib/v7/security/types";

export function toV7Actor(
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentAuthorizationActor>>>,
): Actor {
  return {
    userId: actor.userId,
    email: actor.email,
    displayName: actor.email,
    roleKey: actor.roleKey,
    roleId: null,
    scope: actor.scope,
    scopeGrants: [actor.scope],
    isDemo: actor.source === "demo",
    permissions: [],
  };
}


export async function resolveV7ActorFromCurrent(
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentAuthorizationActor>>>,
): Promise<Actor> {
  const base = toV7Actor(actor);

  if (actor.source === "demo") {
    return base;
  }

  const admin = getSupabaseAdminClient();

  if (!admin) {
    return base;
  }

  const { data: roleData } = await admin
    .from("roles")
    .select("id")
    .eq("key", actor.roleKey)
    .maybeSingle();

  const role = roleData as { id: string } | null;

  if (!role?.id) {
    return base;
  }

  const { data: grantData } = await admin
    .from("user_roles")
    .select("country_id,company_id,operational_area_id,branch_id")
    .eq("user_id", actor.userId)
    .eq("organization_id", actor.scope.organizationId)
    .eq("role_id", role.id)
    .eq("status", "active");

  const grants = (grantData ?? []) as Array<{
    country_id: string | null;
    company_id: string | null;
    operational_area_id: string | null;
    branch_id: string | null;
  }>;

  const scopeGrants = grants.map((grant) => ({
    organizationId: actor.scope.organizationId,
    countryId: grant.country_id,
    companyId: grant.company_id,
    operationalAreaId: grant.operational_area_id,
    branchId: grant.branch_id,
  }));

  return {
    ...base,
    roleId: role.id,
    scopeGrants: scopeGrants.length > 0 ? scopeGrants : base.scopeGrants,
  };
}

export async function actorForApi(
  action?: ActionKey,
): Promise<Actor | NextResponse> {
  const current = await getCurrentAuthorizationActor();

  if (!current) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const actor = await resolveV7ActorFromCurrent(current);

  if (action && !canPerformAction(actor, action)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return actor;
}

export function isApiResponse(
  value: Actor | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
