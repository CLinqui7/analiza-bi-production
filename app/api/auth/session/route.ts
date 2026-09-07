import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { resolveV7ActorFromCurrent } from "@/lib/v7/server/api-auth";

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const resolvedActor = await resolveV7ActorFromCurrent(actor);
  const allowedBranches = Array.from(new Set(
    (resolvedActor.scopeGrants ?? [])
      .map((grant) => grant.branchId)
      .filter((branchId): branchId is string => Boolean(branchId)),
  ));

  return NextResponse.json({
    ok: true,
    user: {
      email: actor.email,
      requiresPasswordChange: actor.requiresPasswordChange ?? false,
      roleKey: actor.roleKey,
      scope: {
        branchCity: null,
        branchCode: null,
        branchId: actor.scope.branchId ?? null,
        branchName: actor.scope.branchName ?? null,
        companyId: actor.scope.companyId ?? null,
        companyName: actor.scope.companyName ?? null,
        countryId: actor.scope.countryId ?? null,
        countryName: actor.scope.countryName ?? null,
        operationalAreaId: actor.scope.operationalAreaId ?? null,
        operationalAreaName: actor.scope.operationalAreaName ?? null,
        organizationId: actor.scope.organizationId ?? null,
        organizationName: null,
      },
      allowedBranches,
      scopeGrants: resolvedActor.scopeGrants,
      userId: actor.userId,
    },
  });
}
