import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfilePayload = {
  displayName?: unknown;
  jobTitle?: unknown;
  phone?: unknown;
  photoUrl?: unknown;
  preferredName?: unknown;
};

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
type SupabaseBranchRow = { id: string; name: string | null; operational_area_id: string | null };
type SupabaseNamedRow = { id: string; name: string | null };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}
function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
function readPhotoUrl(value: unknown) {
  const photoUrl = readText(value, 500);
  if (!photoUrl) return "";
  try {
    const url = new URL(photoUrl);
    if (url.protocol !== "https:") throw new Error("invalid protocol");
    return url.toString();
  } catch {
    throw new Error("La foto debe ser una URL valida.");
  }
}
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
    const result = await admin.from("branches").select("id,name,operational_area_id").eq("id", profile.default_branch_id).maybeSingle();
    if (!result.error) branch = result.data as SupabaseBranchRow | null;
  }
  const [organizationName, countryName, companyName, operationalAreaName, authUser] = await Promise.all([
    supabaseName("organizations", profile.organization_id),
    supabaseName("countries", profile.default_country_id),
    supabaseName("companies", profile.default_company_id),
    supabaseName("operational_areas", branch?.operational_area_id ?? null),
    admin.auth.admin.getUserById(userId),
  ]);
  const metadata = authUser.data.user?.user_metadata ?? {};
  const metadataText = (key: string) => typeof metadata[key] === "string" ? String(metadata[key]).trim() : "";
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

export async function GET() {
  const actor = await getCurrentAuthorizationActor();
  if (!actor) return jsonError("Sesion no autorizada.", 401);
  if (!uuidPattern.test(actor.userId)) {
    return NextResponse.json({ editable: false, ok: true, profile: {
      branchName: actor.scope.branchId, companyName: actor.scope.companyId, countryName: actor.scope.countryId,
      displayName: actor.email, email: actor.email, jobTitle: "", operationalAreaName: actor.scope.operationalAreaId,
      organizationName: actor.scope.organizationId, phone: "", photoUrl: "", preferredName: "", roleKey: actor.roleKey,
    }});
  }
  const profile = await readProfileFromSupabase(actor.userId, actor.roleKey);
  if (!profile) return jsonError("Perfil no encontrado.", 404);
  return NextResponse.json({ editable: true, ok: true, profile });
}

export async function PUT(request: Request) {
  const actor = await getCurrentAuthorizationActor();
  if (!actor) return jsonError("Sesion no autorizada.", 401);
  if (!uuidPattern.test(actor.userId)) return jsonError("Este perfil no es editable en modo DEMO.", 403);
  const payload = (await request.json().catch(() => null)) as ProfilePayload | null;
  const displayName = readText(payload?.displayName, 120);
  const preferredName = readText(payload?.preferredName, 80);
  const phone = readText(payload?.phone, 40);
  const jobTitle = readText(payload?.jobTitle, 120);
  let photoUrl = "";
  try { photoUrl = readPhotoUrl(payload?.photoUrl); } catch (error) {
    return jsonError(error instanceof Error ? error.message : "La foto debe ser una URL valida.", 400);
  }
  if (!displayName) return jsonError("El nombre completo es obligatorio.", 400);
  const admin = getSupabaseAdminClient();
  if (!admin) return jsonError("Supabase de servidor no esta configurado para editar el perfil.", 503, ["SUPABASE_SERVICE_ROLE_KEY"]);
  const { error: profileError } = await admin.from("profiles").update({ display_name: displayName, updated_at: new Date().toISOString() }).eq("id", actor.userId);
  if (profileError) return jsonError(`No se pudo actualizar el perfil: ${profileError.message}`, 500);
  const { error: authError } = await admin.auth.admin.updateUserById(actor.userId, { user_metadata: {
    preferred_name: preferredName || null, phone: phone || null, job_title: jobTitle || null, photo_url: photoUrl || null,
  }});
  if (authError) return jsonError(`No se pudieron guardar los datos personales: ${authError.message}`, 500);
  await admin.from("audit_logs").insert({
    organization_id: actor.scope.organizationId, actor_user_id: actor.userId, action: "account_profile.updated",
    entity_table: "profiles", entity_id: actor.userId, country_id: actor.scope.countryId,
    company_id: actor.scope.companyId, branch_id: actor.scope.branchId,
    metadata: { fields: ["display_name", "preferred_name", "phone", "job_title", "photo_url"], source: "mi-cuenta-supabase" },
  });
  const profile = await readProfileFromSupabase(actor.userId, actor.roleKey);
  if (!profile) return jsonError("Perfil no encontrado despues de actualizar.", 404);
  return NextResponse.json({ editable: true, ok: true, profile });
}
