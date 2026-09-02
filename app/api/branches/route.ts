import { NextResponse } from "next/server";

import { demoOrganizationId } from "@/lib/auth/demo-admin";
import {
  BranchGovernanceError,
  createGovernedBranch,
} from "@/lib/server/branch-governance";
import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { canPerformAction } from "@/lib/security/authorization-policy";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";

type CreateBranchRequest = {
  city?: unknown;
  code?: unknown;
  name?: unknown;
  reason?: unknown;
  scope?: unknown;
};

const branchCodePattern = /^[A-Z0-9][A-Z0-9-_]{1,30}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readScope(value: unknown): ScopeBoundary | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const scope = value as Record<string, unknown>;
  const organizationId =
    scope.organizationId === "Grupo Analiza DEMO"
      ? demoOrganizationId
      : scope.organizationId;

  if (typeof organizationId !== "string" || !organizationId) {
    return null;
  }

  return {
    branchId: null,
    companyId:
      typeof scope.companyId === "string" ? scope.companyId : undefined,
    countryId:
      typeof scope.countryId === "string" ? scope.countryId : undefined,
    operationalAreaId:
      typeof scope.operationalAreaId === "string"
        ? scope.operationalAreaId
        : undefined,
    organizationId,
  };
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

export async function POST(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para crear sucursales.", 401);
  }

  const missingConfig = getMissingDatabaseConfig();

  const payload = (await request.json().catch(() => null)) as
    | CreateBranchRequest
    | null;
  const name =
    typeof payload?.name === "string" ? payload.name.trim() : "";
  const code =
    typeof payload?.code === "string" ? normalizeCode(payload.code) : "";
  const city =
    typeof payload?.city === "string" ? payload.city.trim() : "";
  const reason =
    typeof payload?.reason === "string" ? payload.reason.trim() : "";
  const targetScope = readScope(payload?.scope);

  if (name.length < 3) {
    return jsonError("Escribe el nombre completo de la sucursal.", 400);
  }

  if (!branchCodePattern.test(code)) {
    return jsonError(
      "El codigo debe tener 2 a 31 caracteres, usando letras, numeros, guion o guion bajo.",
      400,
    );
  }

  if (!targetScope || !targetScope.countryId || !targetScope.companyId) {
    return jsonError(
      "Selecciona pais y linea de negocio para crear la sucursal.",
      400,
    );
  }

  if (reason.length < 10) {
    return jsonError("Agrega una razon de alta para el historial.", 400);
  }

  if (!canPerformAction(actor, "branches.create", { scope: targetScope })) {
    return jsonError(
      "Tu rol no puede crear sucursales fuera de su alcance autorizado.",
      403,
    );
  }

  if (missingConfig.length > 0) {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return jsonError(
        "Supabase de servidor no esta configurado para crear sucursales reales.",
        503,
        ["SUPABASE_SERVICE_ROLE_KEY"],
      );
    }

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
        return jsonError(
          "La gerencia de area no pertenece al pais y linea seleccionados.",
          400,
        );
      }
    }

    const normalizedCode = normalizeCode(code);
    const { data: branchData, error: branchError } = await admin
      .from("branches")
      .insert({
        organization_id: targetScope.organizationId,
        country_id: targetScope.countryId,
        company_id: targetScope.companyId,
        operational_area_id: targetScope.operationalAreaId ?? null,
        code: normalizedCode,
        name,
        city: city || null,
        status: "pending_manager",
        is_demo: false,
        created_by: uuidPattern.test(actor.userId) ? actor.userId : null,
      })
      .select("id,code,name,status")
      .single();

    if (branchError || !branchData) {
      const duplicate = branchError?.code === "23505";
      return jsonError(
        duplicate
          ? "Ya existe una sucursal con ese codigo en el pais y linea seleccionados."
          : `No se pudo crear la sucursal: ${branchError?.message ?? "error desconocido"}`,
        duplicate ? 409 : 500,
      );
    }

    const branch = branchData as {
      id: string;
      code: string;
      name: string;
      status: string;
    };

    if (targetScope.operationalAreaId) {
      await admin.from("area_branch_assignments").insert({
        organization_id: targetScope.organizationId,
        operational_area_id: targetScope.operationalAreaId,
        branch_id: branch.id,
        assigned_by: uuidPattern.test(actor.userId) ? actor.userId : null,
      });
    }

    await Promise.all([
      admin.from("assignment_history").insert({
        organization_id: targetScope.organizationId,
        actor_user_id: uuidPattern.test(actor.userId) ? actor.userId : null,
        entity_table: "branches",
        entity_id: branch.id,
        action: "branch.created",
        previous_scope: {},
        next_scope: {
          branch_id: branch.id,
          code: branch.code,
          company_id: targetScope.companyId,
          country_id: targetScope.countryId,
          name: branch.name,
          operational_area_id: targetScope.operationalAreaId ?? null,
          status: branch.status,
        },
        reason,
      }),
      admin.from("audit_logs").insert({
        organization_id: targetScope.organizationId,
        actor_user_id: uuidPattern.test(actor.userId) ? actor.userId : null,
        action: "branch.created",
        entity_table: "branches",
        entity_id: branch.id,
        country_id: targetScope.countryId,
        company_id: targetScope.companyId,
        branch_id: branch.id,
        metadata: {
          created_status: branch.status,
          has_operational_area: Boolean(targetScope.operationalAreaId),
          source: "usuarios-permisos-supabase",
        },
      }),
    ]);

    return NextResponse.json({ branch, ok: true, source: "supabase", status: "created" });
  }

  try {
    const branch = await createGovernedBranch({
      actor,
      city,
      code,
      name,
      reason,
      scope: targetScope,
    });

    return NextResponse.json({ branch, ok: true, status: "created" });
  } catch (error) {
    if (error instanceof BranchGovernanceError) {
      return jsonError(error.message, 400);
    }

    console.error("Failed to create governed branch", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError(
      "No se pudo crear la sucursal. Revisa base de datos y logs del servidor.",
      502,
    );
  }
}
