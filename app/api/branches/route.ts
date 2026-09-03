import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { canAccessRecord } from "@/lib/v7/security/authorization-policy";
import { resolveV7ActorFromCurrent } from "@/lib/v7/server/api-auth";
import type { ScopeBoundary } from "@/lib/v7/security/types";

type CreateBranchRequest = {
  city?: unknown;
  code?: unknown;
  name?: unknown;
  reason?: unknown;
  scope?: unknown;
};

type BranchReadRow = {
  company_id: string | null;
  country_id: string | null;
  id: string;
  operational_area_id: string | null;
  organization_id: string;
};

const branchCodePattern = /^[A-Z0-9][A-Z0-9-_]{1,30}$/;

function readScope(value: unknown): ScopeBoundary | null {
  if (typeof value !== "object" || value === null) return null;
  const scope = value as Record<string, unknown>;

  if (typeof scope.organizationId !== "string" || !scope.organizationId) {
    return null;
  }

  return {
    companyId: typeof scope.companyId === "string" ? scope.companyId : null,
    countryId: typeof scope.countryId === "string" ? scope.countryId : null,
    operationalAreaId:
      typeof scope.operationalAreaId === "string"
        ? scope.operationalAreaId
        : null,
    organizationId: scope.organizationId,
  };
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function canCreateBranch(roleKey: string) {
  return ["super_admin", "webmaster_admin", "gerente_operaciones"].includes(
    roleKey,
  );
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();
  if (!actor) return jsonError("Debes iniciar sesión para ver sucursales.", 401);

  const admin = getSupabaseAdminClient();
  if (!admin) return jsonError("Supabase de servidor no está configurado.", 503);

  const v7Actor = await resolveV7ActorFromCurrent(actor);
  const { data, error } = await admin
    .from("branches")
    .select(
      "id,organization_id,country_id,company_id,operational_area_id,code,name,city,status,is_enabled,is_demo",
    )
    .eq("organization_id", actor.scope.organizationId)
    .eq("is_demo", false)
    .eq("is_enabled", true)
    .is("deleted_at", null)
    .order("name");

  if (error) return jsonError("No se pudieron leer las sucursales autorizadas.", 500);

  const items = ((data ?? []) as Array<BranchReadRow & Record<string, unknown>>)
    .filter((branch) =>
      canAccessRecord(v7Actor, {
        branchId: branch.id,
        companyId: branch.company_id,
        countryId: branch.country_id,
        operationalAreaId: branch.operational_area_id,
        organizationId: branch.organization_id,
      }),
    );

  return NextResponse.json({ items, ok: true, source: "supabase-v7" });
}

export async function POST(request: Request) {
  const actor = await getCurrentAuthorizationActor();
  if (!actor) return jsonError("Debes iniciar sesión para crear sucursales.", 401);
  if (!canCreateBranch(actor.roleKey)) {
    return jsonError("Tu rol no puede crear sucursales.", 403);
  }

  const payload = (await request.json().catch(() => null)) as CreateBranchRequest | null;
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const code = typeof payload?.code === "string" ? normalizeCode(payload.code) : "";
  const city = typeof payload?.city === "string" ? payload.city.trim() : "";
  const reason = typeof payload?.reason === "string" ? payload.reason.trim() : "";
  const targetScope = readScope(payload?.scope);

  if (name.length < 3) return jsonError("Escribe el nombre completo de la sucursal.", 400);
  if (!branchCodePattern.test(code)) {
    return jsonError("El código de sucursal no tiene un formato válido.", 400);
  }
  if (!targetScope?.countryId || !targetScope.companyId) {
    return jsonError("Selecciona país y línea de negocio para crear la sucursal.", 400);
  }
  if (reason.length < 10) {
    return jsonError("Agrega una razón de alta para el historial.", 400);
  }
  if (targetScope.organizationId !== actor.scope.organizationId) {
    return jsonError("La organización seleccionada no coincide con tu sesión.", 403);
  }

  const v7Actor = await resolveV7ActorFromCurrent(actor);
  if (!canAccessRecord(v7Actor, targetScope)) {
    return jsonError("La sucursal debe permanecer dentro de tu alcance autorizado.", 403);
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return jsonError("Supabase de servidor no está configurado.", 503);

  if (targetScope.operationalAreaId) {
    const { data: area, error: areaError } = await admin
      .from("operational_areas")
      .select("id")
      .eq("id", targetScope.operationalAreaId)
      .eq("organization_id", targetScope.organizationId)
      .eq("country_id", targetScope.countryId)
      .eq("company_id", targetScope.companyId)
      .eq("status", "active")
      .maybeSingle();
    if (areaError || !area) {
      return jsonError("El área operativa no pertenece al alcance seleccionado.", 400);
    }
  }

  const { data: branch, error: branchError } = await admin
    .from("branches")
    .insert({
      city: city || null,
      code,
      company_id: targetScope.companyId,
      country_id: targetScope.countryId,
      created_by: actor.userId,
      is_demo: false,
      name,
      operational_area_id: targetScope.operationalAreaId,
      organization_id: targetScope.organizationId,
      status: "pending_manager",
    })
    .select("id,code,name,status")
    .single();

  if (branchError || !branch) {
    return jsonError(
      branchError?.code === "23505"
        ? "Ya existe una sucursal con ese código en el alcance seleccionado."
        : "No se pudo crear la sucursal.",
      branchError?.code === "23505" ? 409 : 500,
    );
  }

  if (targetScope.operationalAreaId) {
    await admin.from("area_branch_assignments").insert({
      assigned_by: actor.userId,
      branch_id: branch.id,
      operational_area_id: targetScope.operationalAreaId,
      organization_id: targetScope.organizationId,
    });
  }

  await Promise.all([
    admin.from("assignment_history").insert({
      action: "branch.created",
      actor_user_id: actor.userId,
      entity_id: branch.id,
      entity_table: "branches",
      next_scope: {
        branch_id: branch.id,
        code: branch.code,
        company_id: targetScope.companyId,
        country_id: targetScope.countryId,
        operational_area_id: targetScope.operationalAreaId,
      },
      organization_id: targetScope.organizationId,
      previous_scope: {},
      reason,
    }),
    admin.from("audit_logs").insert({
      action: "branch.created",
      actor_user_id: actor.userId,
      branch_id: branch.id,
      company_id: targetScope.companyId,
      country_id: targetScope.countryId,
      entity_id: branch.id,
      entity_table: "branches",
      metadata: { source: "branches-v7" },
      organization_id: targetScope.organizationId,
    }),
  ]);

  return NextResponse.json({ branch, ok: true, source: "supabase-v7", status: "created" });
}
