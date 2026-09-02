import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getMissingDatabaseConfig, getPostgresPool } from "@/lib/server/database";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfilePayload = {
  displayName?: unknown;
  jobTitle?: unknown;
  phone?: unknown;
  photoUrl?: unknown;
  preferredName?: unknown;
};

type ProfileRow = {
  branch_name: string | null;
  company_name: string | null;
  country_name: string | null;
  display_name: string | null;
  email: string | null;
  job_title: string | null;
  operational_area_name: string | null;
  organization_name: string | null;
  phone: string | null;
  photo_url: string | null;
  preferred_name: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function readPhotoUrl(value: unknown) {
  const photoUrl = readText(value, 500);

  if (!photoUrl) {
    return "";
  }

  try {
    const url = new URL(photoUrl);

    if (url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }

    return url.toString();
  } catch {
    throw new Error("La foto debe ser una URL valida.");
  }
}

function toProfile(row: ProfileRow, actorRoleKey: string) {
  return {
    branchName: row.branch_name,
    companyName: row.company_name,
    countryName: row.country_name,
    displayName: row.display_name ?? "",
    email: row.email ?? "",
    jobTitle: row.job_title ?? "",
    operationalAreaName: row.operational_area_name,
    organizationName: row.organization_name,
    phone: row.phone ?? "",
    photoUrl: row.photo_url ?? "",
    preferredName: row.preferred_name ?? "",
    roleKey: actorRoleKey,
  };
}

type SupabaseProfileRow = {
  default_branch_id: string | null;
  default_company_id: string | null;
  default_country_id: string | null;
  display_name: string | null;
  email: string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
};

type SupabaseBranchRow = {
  id: string;
  name: string | null;
  operational_area_id: string | null;
};

type SupabaseNamedRow = { id: string; name: string | null };

async function supabaseName(table: string, id: string | null) {
  const admin = getSupabaseAdminClient();
  if (!admin || !id) return null;
  const { data, error } = await admin.from(table).select("id,name").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as SupabaseNamedRow | null)?.name ?? null;
}

async function readProfileFromSupabase(userId: string, roleKey: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("profiles")
    .select("id,email,display_name,status,organization_id,default_country_id,default_company_id,default_branch_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const profile = data as SupabaseProfileRow;
  if (profile.status === "suspended") return null;

  let branch: SupabaseBranchRow | null = null;
  if (profile.default_branch_id) {
    const branchResult = await admin
      .from("branches")
      .select("id,name,operational_area_id")
      .eq("id", profile.default_branch_id)
      .maybeSingle();
    if (!branchResult.error) branch = branchResult.data as SupabaseBranchRow | null;
  }

  const [organizationName, countryName, companyName, operationalAreaName, authUser] =
    await Promise.all([
      supabaseName("organizations", profile.organization_id),
      supabaseName("countries", profile.default_country_id),
      supabaseName("companies", profile.default_company_id),
      supabaseName("operational_areas", branch?.operational_area_id ?? null),
      admin.auth.admin.getUserById(userId),
    ]);

  const metadata = authUser.data.user?.user_metadata ?? {};
  const metadataText = (key: string) =>
    typeof metadata[key] === "string" ? String(metadata[key]).trim() : "";

  return {
    branchName: branch?.name ?? null,
    companyName,
    countryName,
    displayName: profile.display_name ?? profile.email ?? "",
    email: profile.email ?? authUser.data.user?.email ?? "",
    jobTitle: metadataText("job_title"),
    operationalAreaName,
    organizationName,
    phone: metadataText("phone"),
    photoUrl: metadataText("photo_url") || metadataText("avatar_url"),
    preferredName: metadataText("preferred_name"),
    roleKey,
  };
}

async function readProfile(userId: string, roleKey: string) {
  const pool = getPostgresPool();
  const result = await pool.query<ProfileRow>(
    `
      select
        p.email,
        p.display_name,
        p.preferred_name,
        p.phone,
        p.job_title,
        p.photo_url,
        o.name as organization_name,
        c.name as country_name,
        co.name as company_name,
        oa.name as operational_area_name,
        b.name as branch_name
      from public.profiles p
      left join public.organizations o on o.id = p.organization_id
      left join public.countries c on c.id = p.default_country_id
      left join public.companies co on co.id = p.default_company_id
      left join public.branches b on b.id = p.default_branch_id
      left join public.operational_areas oa on oa.id = b.operational_area_id
      where p.id = $1
        and p.status = 'active'
        and p.deactivated_at is null
        and p.deleted_at is null
      limit 1
    `,
    [userId],
  );
  const row = result.rows[0];

  return row ? toProfile(row, roleKey) : null;
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Sesion no autorizada.", 401);
  }

  if (!uuidPattern.test(actor.userId)) {
    return NextResponse.json({
      editable: false,
      ok: true,
      profile: {
        branchName: actor.scope.branchId,
        companyName: actor.scope.companyId,
        countryName: actor.scope.countryId,
        displayName: actor.email,
        email: actor.email,
        jobTitle: "",
        operationalAreaName: actor.scope.operationalAreaId,
        organizationName: actor.scope.organizationId,
        phone: "",
        photoUrl: "",
        preferredName: "",
        roleKey: actor.roleKey,
      },
    });
  }

  const missingConfig = getMissingDatabaseConfig();

  const profile = missingConfig.length > 0
    ? await readProfileFromSupabase(actor.userId, actor.roleKey)
    : await readProfile(actor.userId, actor.roleKey);

  if (!profile) {
    return jsonError("Perfil no encontrado.", 404);
  }

  return NextResponse.json({ editable: true, ok: true, profile });
}

export async function PUT(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Sesion no autorizada.", 401);
  }

  if (!uuidPattern.test(actor.userId)) {
    return jsonError("Este perfil no es editable en modo DEMO.", 403);
  }

  const missingConfig = getMissingDatabaseConfig();

  const payload = (await request.json().catch(() => null)) as
    | ProfilePayload
    | null;
  const displayName = readText(payload?.displayName, 120);
  const preferredName = readText(payload?.preferredName, 80);
  const phone = readText(payload?.phone, 40);
  const jobTitle = readText(payload?.jobTitle, 120);
  let photoUrl = "";

  try {
    photoUrl = readPhotoUrl(payload?.photoUrl);
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error ? error.message : "La foto debe ser una URL valida.",
      400,
    );
  }

  if (!displayName) {
    return jsonError("El nombre completo es obligatorio.", 400);
  }

  if (missingConfig.length > 0) {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return jsonError(
        "Supabase de servidor no esta configurado para editar el perfil.",
        503,
        ["SUPABASE_SERVICE_ROLE_KEY"],
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", actor.userId);

    if (profileError) {
      return jsonError(`No se pudo actualizar el perfil: ${profileError.message}`, 500);
    }

    const { error: authError } = await admin.auth.admin.updateUserById(actor.userId, {
      user_metadata: {
        preferred_name: preferredName || null,
        phone: phone || null,
        job_title: jobTitle || null,
        photo_url: photoUrl || null,
      },
    });

    if (authError) {
      return jsonError(`No se pudieron guardar los datos personales: ${authError.message}`, 500);
    }

    await admin.from("audit_logs").insert({
      organization_id: actor.scope.organizationId,
      actor_user_id: actor.userId,
      action: "account_profile.updated",
      entity_table: "profiles",
      entity_id: actor.userId,
      country_id: actor.scope.countryId,
      company_id: actor.scope.companyId,
      branch_id: actor.scope.branchId,
      metadata: {
        fields: ["display_name", "preferred_name", "phone", "job_title", "photo_url"],
        source: "mi-cuenta-supabase",
      },
    });

    const profile = await readProfileFromSupabase(actor.userId, actor.roleKey);
    if (!profile) return jsonError("Perfil no encontrado despues de actualizar.", 404);
    return NextResponse.json({ editable: true, ok: true, profile });
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      `
        update public.profiles
        set display_name = $1,
            preferred_name = nullif($2, ''),
            phone = nullif($3, ''),
            job_title = nullif($4, ''),
            photo_url = nullif($5, ''),
            updated_at = now()
        where id = $6
          and status = 'active'
          and deactivated_at is null
          and deleted_at is null
      `,
      [displayName, preferredName, phone, jobTitle, photoUrl, actor.userId],
    );
    await client.query(
      `
        insert into public.audit_logs (
          organization_id,
          actor_user_id,
          action,
          entity_table,
          entity_id,
          country_id,
          company_id,
          branch_id,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        actor.scope.organizationId,
        actor.userId,
        "account_profile.updated",
        "profiles",
        actor.userId,
        actor.scope.countryId,
        actor.scope.companyId,
        actor.scope.branchId,
        JSON.stringify({
          fields: [
            "display_name",
            "preferred_name",
            "phone",
            "job_title",
            "photo_url",
          ],
          source: "mi-cuenta",
        }),
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const profile = await readProfile(actor.userId, actor.roleKey);

  return NextResponse.json({ editable: true, ok: true, profile });
}
