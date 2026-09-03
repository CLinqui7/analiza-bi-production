import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { canAccessRecord } from "@/lib/v7/security/authorization-policy";
import { resolveV7ActorFromCurrent } from "@/lib/v7/server/api-auth";
import type { RoleKey } from "@/lib/tenant/demo-context";

type ManagerRow = {
  base_amount: number | string | null;
  branch_id: string | null;
  branch_name: string | null;
  category: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  display_name: string | null;
  operational_area_id: string | null;
  operational_area_name: string | null;
  organization_id: string;
  profile_id: string;
};

const listAllowedRoles = new Set<RoleKey>([
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
]);
const compensationRoles = new Set<RoleKey>([
  "super_admin",
  "webmaster_admin",
  "ceo",
]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error, ok: false }, { status });
}

function numberOrNull(value: number | string | null) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function managementLevel(category: string | null) {
  if (category === "SENIOR") return "senior";
  if (category === "MEDIO") return "middle";
  if (category === "JUNIOR") return "junior";
  return null;
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();
  if (!actor) return jsonError("Debes iniciar sesión para consultar gerentes.", 401);
  if (!listAllowedRoles.has(actor.roleKey)) {
    return jsonError("No tienes acceso al directorio de gerentes.", 403);
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return jsonError("Supabase de servidor no está configurado.", 503);

  const v7Actor = await resolveV7ActorFromCurrent(actor);
  const { data, error } = await admin
    .from("v_manager_bonus_directory")
    .select(
      "organization_id,profile_id,display_name,country_id,country_name,company_id,company_name,operational_area_id,operational_area_name,branch_id,branch_name,base_amount,category,status",
    )
    .eq("organization_id", actor.scope.organizationId)
    .eq("status", "active")
    .eq("role_key", "gerente_sucursal")
    .order("display_name");

  if (error) return jsonError("No se pudo consultar el directorio de gerentes.", 503);

  const canReadCompensation = compensationRoles.has(actor.roleKey);
  const branchManagers = ((data ?? []) as ManagerRow[])
    .filter((row) =>
      canAccessRecord(v7Actor, {
        branchId: row.branch_id,
        companyId: row.company_id,
        countryId: row.country_id,
        operationalAreaId: row.operational_area_id,
        organizationId: row.organization_id,
      }),
    )
    .map((row) => ({
      areaId: row.operational_area_id,
      areaName: row.operational_area_name,
      ...(canReadCompensation
        ? {
            baseBonusAmount: numberOrNull(row.base_amount),
            managementLevel: managementLevel(row.category),
          }
        : {}),
      branchId: row.branch_id,
      branchName: row.branch_name,
      businessId: row.company_id,
      businessName: row.company_name,
      countryId: row.country_id,
      countryName: row.country_name,
      fullName: row.display_name?.trim() || "Gerente de sucursal autorizado",
      id: row.profile_id,
    }));

  return NextResponse.json({ branchManagers, ok: true, source: "supabase-v7" });
}
