import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

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
      userId: actor.userId,
    },
  });
}
