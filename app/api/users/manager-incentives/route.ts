import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { canPerformAction } from "@/lib/security/authorization-policy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RoleKey } from "@/lib/tenant/demo-context";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";
import {
  isManagementLevel,
  normalizeBaseBonusAmount,
} from "@/lib/tenant/manager-incentives";

type ManagerIncentiveRow = {
  base_amount: number | string | null;
  branch_id: string | null;
  branch_name: string | null;
  category: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  display_name: string | null;
  id: string;
  operational_area_id: string | null;
  operational_area_name: string | null;
  organization_id: string;
  profile_id: string;
  role_key: "gerente_area" | "gerente_sucursal";
  role_name: string;
  status: string;
};

type ManagerIncentiveRequest = {
  assignmentId?: unknown;
  baseBonusAmount?: unknown;
  managementLevel?: unknown;
};

const bonusDirectoryRoles = new Set<RoleKey>([
  "super_admin",
  "webmaster_admin",
  "ceo",
]);

const managerDirectoryColumns =
  "id,organization_id,profile_id,display_name,role_key,role_name,country_id,country_name,company_id,company_name,operational_area_id,operational_area_name,branch_id,branch_name,base_amount,category,status";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

function categoryToManagementLevel(category: string | null) {
  if (category === "SENIOR") return "senior" as const;
  if (category === "MEDIO") return "middle" as const;
  if (category === "JUNIOR") return "junior" as const;
  return null;
}

function managementLevelToCategory(level: "senior" | "middle" | "junior") {
  if (level === "senior") return "SENIOR";
  if (level === "middle") return "MEDIO";
  return "JUNIOR";
}

function numberOrNull(value: number | string | null) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function scopeFor(row: ManagerIncentiveRow): ScopeBoundary {
  return {
    branchId: row.branch_id,
    companyId: row.company_id,
    countryId: row.country_id,
    operationalAreaId: row.operational_area_id,
    organizationId: row.organization_id,
  };
}

function canEditRow(
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentAuthorizationActor>>>,
  row: ManagerIncentiveRow,
) {
  return canPerformAction(actor, "bonuses.adjust", {
    roleKey: row.role_key,
    scope: scopeFor(row),
    targetUserId: row.profile_id,
  });
}

async function getAuthorizedActor() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return { actor: null, response: jsonError("Debes iniciar sesion para consultar bonos.", 401) };
  }

  if (!bonusDirectoryRoles.has(actor.roleKey)) {
    return {
      actor: null,
      response: jsonError("No tienes acceso a bonos ni niveles gerenciales.", 403),
    };
  }

  if (!actor.scope.organizationId) {
    return {
      actor: null,
      response: jsonError("El alcance de organización no está completo.", 403),
    };
  }

  return { actor, response: null };
}

export async function GET() {
  const authorized = await getAuthorizedActor();
  if (!authorized.actor) return authorized.response!;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return jsonError("Supabase de servidor no está configurado.", 503);
  }

  const { data, error } = await admin
    .from("v_manager_bonus_directory")
    .select(managerDirectoryColumns)
    .eq("organization_id", authorized.actor.scope.organizationId)
    .eq("status", "active")
    .in("role_key", ["gerente_area", "gerente_sucursal"])
    .order("display_name");

  if (error) {
    return jsonError("No se pudo consultar el directorio autorizado de bonos.", 503);
  }

  const managerIncentives = ((data ?? []) as ManagerIncentiveRow[])
    .filter((row) =>
      canPerformAction(authorized.actor!, "record.read", { scope: scopeFor(row) }),
    )
    .map((row) => ({
      assignmentId: row.id,
      baseBonusAmount: numberOrNull(row.base_amount),
      branchName: row.branch_name,
      businessName: row.company_name,
      canEdit: canEditRow(authorized.actor!, row),
      countryName: row.country_name,
      fullName: row.display_name?.trim() || "Gerente autorizado",
      managementLevel: categoryToManagementLevel(row.category),
      operationalAreaName: row.operational_area_name,
      roleKey: row.role_key,
      roleName: row.role_name,
    }));

  return NextResponse.json({ managerIncentives, ok: true, source: "supabase-v7" });
}

export async function PATCH(request: Request) {
  const authorized = await getAuthorizedActor();
  if (!authorized.actor) return authorized.response!;

  const payload = (await request.json().catch(() => null)) as ManagerIncentiveRequest | null;
  const assignmentId = typeof payload?.assignmentId === "string" ? payload.assignmentId : "";
  const rawBaseBonusAmount =
    typeof payload?.baseBonusAmount === "number"
      ? payload.baseBonusAmount
      : typeof payload?.baseBonusAmount === "string"
        ? Number(payload.baseBonusAmount)
        : Number.NaN;
  const baseBonusAmount = normalizeBaseBonusAmount(rawBaseBonusAmount);
  const managementLevel = isManagementLevel(payload?.managementLevel)
    ? payload.managementLevel
    : null;

  if (!assignmentId || !managementLevel || !baseBonusAmount) {
    return jsonError("La configuración de bono solicitada no es válida.", 400);
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return jsonError("Supabase de servidor no está configurado.", 503);
  }

  const { data, error } = await admin
    .from("v_manager_bonus_directory")
    .select(managerDirectoryColumns)
    .eq("id", assignmentId)
    .eq("organization_id", authorized.actor.scope.organizationId)
    .eq("status", "active")
    .maybeSingle();
  const row = data as ManagerIncentiveRow | null;

  if (error || !row) {
    return jsonError("No se encontró ese gerente activo.", 404);
  }

  if (!canEditRow(authorized.actor, row)) {
    return jsonError("Tu rol no puede editar este bono.", 403);
  }

  const { error: updateError } = await admin
    .from("manager_bonus_plans")
    .update({
      base_amount: baseBonusAmount,
      category: managementLevelToCategory(managementLevel),
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("organization_id", authorized.actor.scope.organizationId)
    .eq("status", "active");

  if (updateError) {
    return jsonError("No se pudo actualizar el bono del gerente.", 500);
  }

  await admin.from("audit_logs").insert({
    action: "manager_bonus_plan.updated",
    actor_user_id: authorized.actor.userId,
    branch_id: row.branch_id,
    company_id: row.company_id,
    country_id: row.country_id,
    entity_id: row.id,
    entity_table: "manager_bonus_plans",
    metadata: {
      category: managementLevelToCategory(managementLevel),
      source: "manager-incentives-v7",
    },
    organization_id: authorized.actor.scope.organizationId,
  });

  return NextResponse.json({
    managerIncentive: {
      assignmentId,
      baseBonusAmount,
      managementLevel,
    },
    ok: true,
    source: "supabase-v7",
    status: "updated",
  });
}
