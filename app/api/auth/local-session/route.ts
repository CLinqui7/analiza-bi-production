import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readLocalSession } from "@/lib/auth/local-session";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { getAuthenticatedLocalUserAccess } from "@/lib/server/local-auth";

export async function GET() {
  const cookieStore = await cookies();
  const localSession = (() => {
    try {
      return readLocalSession(cookieStore);
    } catch {
      return null;
    }
  })();

  if (!localSession) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return NextResponse.json(
      {
        error: "La base de datos local no esta configurada.",
        missingConfig,
        ok: false,
      },
      { status: 503 },
    );
  }

  const user = await getAuthenticatedLocalUserAccess(localSession.userId);

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user });
}
