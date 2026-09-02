import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { canPerformAction } from "@/lib/security/authorization-policy";
import {
  getMissingDatabaseConfig,
  getPostgresPool,
  resetPostgresRuntimeRole,
} from "@/lib/server/database";
import { isManagementLevel } from "@/lib/tenant/manager-incentives";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSuperAdministrator } from "@/lib/tenant/delegation-policy";
import type { RoleKey } from "@/lib/tenant/demo-context";

type BranchManagerRow = {
  area_id: string | null;
  area_name: string | null;
  base_bonus_amount: number | string | null;
  branch_id: string | null;
  branch_name: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  display_name: string | null;
  email: string | null;
  management_level: string | null;
  profile_id: string;
};

type SupabaseBranchManagerRow = {
  base_amount: number | string | null;
  branch_id: string | null;
  branch_name: string | null;
  category: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  display_name: string | null;
  email: string | null;
  operational_area_id: string | null;
  operational_area_name: string | null;
  organization_id: string;
  profile_id: string;
  role_key: string;
  status: string;
};

function categoryToManagementLevel(category: string | null) {
  if (category === "SENIOR") return "senior" as const;
  if (category === "MEDIO") return "middle" as const;
  if (category === "JUNIOR") return "junior" as const;
  return null;
}

async function loadBranchManagersFromSupabase(
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentAuthorizationActor>>>,
  organizationId: string,
) {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY_REQUIRED", rows: [] as SupabaseBranchManagerRow[] };
  }

  const { data, error } = await admin
    .from("v_manager_bonus_directory")
    .select(
      "organization_id,profile_id,display_name,email,role_key,country_id,country_name,company_id,company_name,operational_area_id,operational_area_name,branch_id,branch_name,base_amount,category,status",
    )
    .eq("organization_id", organizationId)
    .eq("role_key", "gerente_sucursal")
    .eq("status", "active")
    .order("display_name");

  if (error) {
    return { error: error.message, rows: [] as SupabaseBranchManagerRow[] };
  }

  const rows = (data ?? []) as SupabaseBranchManagerRow[];

  return {
    error: null,
    rows: rows.filter((row) =>
      canPerformAction(actor, "record.read", {
        scope: {
          branchId: row.branch_id,
          companyId: row.company_id,
          countryId: row.country_id,
          operationalAreaId: row.operational_area_id,
          organizationId,
        },
      }),
    ),
  };
}

const listAllowedRoles = new Set<RoleKey>([
  "super_admin",
  "webmaster_admin",
  "gerente_operaciones",
  "gerente_area",
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nullableUuid(value: string | null | undefined) {
  return value && uuidPattern.test(value) ? value : null;
}

function readNumberLike(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para consultar gerentes.", 401);
  }

  if (!listAllowedRoles.has(actor.roleKey)) {
    return NextResponse.json({ branchManagers: [], ok: true });
  }

  const missingConfig = getMissingDatabaseConfig();

  const organizationId = nullableUuid(actor.scope.organizationId);

  if (!organizationId) {
    return jsonError("El alcance de organizacion no esta completo.", 403);
  }

  if (missingConfig.length > 0) {
    const result = await loadBranchManagersFromSupabase(actor, organizationId);

    if (result.error) {
      return jsonError(
        `No se pudo consultar el directorio de gerentes en Supabase: ${result.error}`,
        503,
        ["SUPABASE_DIRECTORY"],
      );
    }

    return NextResponse.json({
      branchManagers: result.rows.map((row) => ({
        areaId: row.operational_area_id,
        areaName: row.operational_area_name,
        baseBonusAmount: readNumberLike(row.base_amount),
        branchId: row.branch_id,
        branchName: row.branch_name,
        businessId: row.company_id,
        businessName: row.company_name,
        countryId: row.country_id,
        countryName: row.country_name,
        email: row.email,
        fullName: row.display_name ?? row.email ?? "Gerente de sucursal",
        id: row.profile_id,
        managementLevel: categoryToManagementLevel(row.category),
      })),
      ok: true,
      source: "supabase",
    });
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);

    const result = await client.query<BranchManagerRow>(
      `
        select distinct on (p.id)
          p.id as profile_id,
          p.display_name,
          p.email,
          ma.management_level,
          ma.base_bonus_amount,
          ma.country_id,
          c.name as country_name,
          ma.company_id,
          co.name as company_name,
          ma.operational_area_id as area_id,
          oa.name as area_name,
          ma.branch_id,
          b.name as branch_name
        from public.manager_assignments ma
        join public.roles r on r.id = ma.role_id
        join public.profiles p on p.id = ma.profile_id
        left join public.countries c on c.id = ma.country_id
        left join public.companies co on co.id = ma.company_id
        left join public.operational_areas oa on oa.id = ma.operational_area_id
        left join public.branches b on b.id = ma.branch_id
        where r.key = 'gerente_sucursal'
          and ma.organization_id = $1
          and ma.status = 'active'
          and ma.deactivated_at is null
          and ma.branch_id is not null
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null
          and (
            $2::uuid is null
            or ma.country_id = $2::uuid
            or $6 = true
          )
          and (
            $3::uuid is null
            or ma.company_id = $3::uuid
            or $6 = true
          )
          and (
            $4::uuid is null
            or ma.operational_area_id = $4::uuid
            or $6 = true
          )
          and (
            $5::uuid is null
            or ma.branch_id = $5::uuid
            or $6 = true
          )
        order by p.id, ma.created_at desc
      `,
      [
        organizationId,
        nullableUuid(actor.scope.countryId),
        nullableUuid(actor.scope.companyId),
        nullableUuid(actor.scope.operationalAreaId),
        nullableUuid(actor.scope.branchId),
        isSuperAdministrator(actor.roleKey),
      ],
    );

    return NextResponse.json({
      branchManagers: result.rows.map((row) => ({
        areaId: row.area_id,
        areaName: row.area_name,
        baseBonusAmount: readNumberLike(row.base_bonus_amount),
        branchId: row.branch_id,
        branchName: row.branch_name,
        businessId: row.company_id,
        businessName: row.company_name,
        countryId: row.country_id,
        countryName: row.country_name,
        email: row.email,
        fullName: row.display_name ?? row.email ?? "Gerente de sucursal",
        id: row.profile_id,
        managementLevel: isManagementLevel(row.management_level)
          ? row.management_level
          : null,
      })),
      ok: true,
    });
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}
