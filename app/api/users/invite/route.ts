import { NextResponse } from "next/server";

import { demoOrganizationId } from "@/lib/auth/demo-admin";
import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMissingSmtpConfig, sendMail } from "@/lib/server/mail";
import {
  createUserInvitation,
  UserInvitationError,
} from "@/lib/server/user-invitations";
import {
  createLocalUserWithTemporaryPassword,
  LocalAuthRequestError,
} from "@/lib/server/local-auth";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";
import { canPerformAction } from "@/lib/security/authorization-policy";
import { isProductionRuntimeEnvironment } from "@/lib/security/environment";
import {
  isManagementLevel,
  isManagerIncentiveRole,
  normalizeBaseBonusAmount,
  type ManagerIncentiveInput,
} from "@/lib/tenant/manager-incentives";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type InviteUserRequest = {
  email?: unknown;
  fullName?: unknown;
  managerIncentive?: unknown;
  managedBranchManagerIds?: unknown;
  temporaryPassword?: unknown;
  roleKey?: unknown;
  scope?: unknown;
};

function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && roleKeys.includes(value as RoleKey);
}

function isUuid(value: string) {
  return uuidPattern.test(value);
}

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
    organizationId,
    branchId:
      typeof scope.branchId === "string" ? scope.branchId : undefined,
    companyId:
      typeof scope.companyId === "string" ? scope.companyId : undefined,
    countryId:
      typeof scope.countryId === "string" ? scope.countryId : undefined,
    operationalAreaId:
      typeof scope.operationalAreaId === "string"
        ? scope.operationalAreaId
        : undefined,
  };
}

function getRequestOrigin(request: Request) {
  const configuredOrigin =
    process.env.APP_URL?.trim() ||
    (!isProductionRuntimeEnvironment()
      ? process.env.NEXT_PUBLIC_APP_URL?.trim()
      : "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  return isProductionRuntimeEnvironment() ? null : new URL(request.url).origin;
}

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

function getMissingScopeError(roleKey: RoleKey, scope: ScopeBoundary) {
  if (roleKey === "gerente_area" && !scope.operationalAreaId) {
    return "Selecciona la gerencia de area para invitar este gerente.";
  }

  if (roleKey === "gerente_sucursal") {
    if (!scope.operationalAreaId) {
      return "Selecciona la gerencia de area para invitar este gerente.";
    }

    if (!scope.branchId) {
      return "Selecciona la sucursal para invitar este gerente.";
    }
  }

  if (roleKey === "usuario_operativo" && !scope.branchId) {
    return "Selecciona la sucursal para invitar este usuario.";
  }

  return null;
}

function readManagerIncentive(
  value: unknown,
  roleKey: RoleKey,
): { error: string | null; incentive: ManagerIncentiveInput | null } {
  if (!isManagerIncentiveRole(roleKey)) {
    return { error: null, incentive: null };
  }

  if (typeof value !== "object" || value === null) {
    return {
      error: "Define nivel de gerencia y bono base para este gerente.",
      incentive: null,
    };
  }

  const incentive = value as Record<string, unknown>;
  const rawBaseBonusAmount = incentive.baseBonusAmount;
  const baseBonusAmount =
    typeof rawBaseBonusAmount === "number"
      ? rawBaseBonusAmount
      : typeof rawBaseBonusAmount === "string"
        ? Number(rawBaseBonusAmount)
        : Number.NaN;
  const normalizedBaseBonusAmount =
    normalizeBaseBonusAmount(baseBonusAmount);

  if (!isManagementLevel(incentive.managementLevel)) {
    return {
      error: "Selecciona nivel de gerencia senior, middle o junior.",
      incentive: null,
    };
  }

  if (!normalizedBaseBonusAmount) {
    return {
      error: "Ingresa un bono base mayor a 0 y menor o igual a 10000.",
      incentive: null,
    };
  }

  return {
    error: null,
    incentive: {
      baseBonusAmount: normalizedBaseBonusAmount,
      managementLevel: incentive.managementLevel,
    },
  };
}

function readManagedBranchManagerIds(
  value: unknown,
  roleKey: RoleKey,
): { error: string | null; ids: string[] } {
  if (roleKey !== "gerente_area" || value === undefined) {
    return { error: null, ids: [] };
  }

  if (!Array.isArray(value)) {
    return {
      error: "Selecciona gerentes de sucursal validos para esta gerencia de area.",
      ids: [],
    };
  }

  if (value.length > 50) {
    return {
      error: "Puedes asignar hasta 50 gerentes de sucursal por invitacion.",
      ids: [],
    };
  }

  const ids = value.filter(
    (id): id is string => typeof id === "string" && isUuid(id),
  );

  if (ids.length !== value.length) {
    return {
      error: "Selecciona gerentes de sucursal validos para esta gerencia de area.",
      ids: [],
    };
  }

  return { error: null, ids: [...new Set(ids)] };
}

export async function POST(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para invitar usuarios.", 401);
  }

  const payload = (await request.json().catch(() => null)) as
    | InviteUserRequest
    | null;
  const temporaryPassword =
    typeof payload?.temporaryPassword === "string"
      ? payload.temporaryPassword
      : "";
  const databaseMissingConfig = getMissingDatabaseConfig();
  const useSupabaseDirectory = databaseMissingConfig.length > 0;
  const smtpMissingConfig =
    temporaryPassword || useSupabaseDirectory ? [] : getMissingSmtpConfig();
  const missingConfig = useSupabaseDirectory
    ? []
    : [...databaseMissingConfig, ...smtpMissingConfig];

  if (missingConfig.length > 0) {
    return jsonError(
      temporaryPassword
        ? "Faltan variables privadas para crear usuarios."
        : "Faltan variables privadas para enviar invitaciones reales.",
      503,
      missingConfig,
    );
  }

  const appUrl = temporaryPassword ? "" : getRequestOrigin(request);

  if (!temporaryPassword && !appUrl) {
    return jsonError(
      "Falta configurar APP_URL para enviar invitaciones en produccion.",
      503,
      ["APP_URL"],
    );
  }
  const email =
    typeof payload?.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const fullName =
    typeof payload?.fullName === "string" ? payload.fullName.trim() : "";

  if (!fullName || !email) {
    return jsonError("Completa nombre y correo para enviar la invitacion.", 400);
  }

  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return jsonError("El correo no tiene un formato valido.", 400);
  }

  if (!isRoleKey(payload?.roleKey)) {
    return jsonError("Selecciona un rol valido para la invitacion.", 400);
  }

  const targetScope = readScope(payload?.scope);

  if (!targetScope) {
    return jsonError("El alcance de la invitacion no esta completo.", 400);
  }

  const missingScopeError = getMissingScopeError(payload.roleKey, targetScope);

  if (missingScopeError) {
    return jsonError(missingScopeError, 400);
  }

  const managerIncentiveResult = readManagerIncentive(
    payload.managerIncentive,
    payload.roleKey,
  );

  if (managerIncentiveResult.error) {
    return jsonError(managerIncentiveResult.error, 400);
  }

  const managedBranchManagerResult = readManagedBranchManagerIds(
    payload.managedBranchManagerIds,
    payload.roleKey,
  );

  if (managedBranchManagerResult.error) {
    return jsonError(managedBranchManagerResult.error, 400);
  }

  if (
    !canPerformAction(actor, "users.invite", {
      roleKey: payload.roleKey,
      scope: targetScope,
    })
  ) {
    return jsonError(
      "Tu rol solo puede invitar usuarios de nivel inferior y dentro de tu alcance.",
      403,
    );
  }

  if (useSupabaseDirectory) {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      return jsonError(
        "Supabase de servidor no esta configurado para crear usuarios.",
        503,
        ["SUPABASE_SERVICE_ROLE_KEY"],
      );
    }

    const { data: roleData, error: roleError } = await admin
      .from("roles")
      .select("id,key")
      .eq("key", payload.roleKey)
      .maybeSingle();

    if (roleError || !roleData) {
      return jsonError("No encontre el rol solicitado en Supabase.", 404);
    }

    const role = roleData as { id: string; key: string };

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id,status")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile) {
      return jsonError(
        "Ese correo ya tiene un usuario. Usa recuperar acceso o edita su alcance.",
        409,
      );
    }

    const managementCategory = managerIncentiveResult.incentive
      ? managerIncentiveResult.incentive.managementLevel === "senior"
        ? "SENIOR"
        : managerIncentiveResult.incentive.managementLevel === "middle"
          ? "MEDIO"
          : "JUNIOR"
      : null;

    if (temporaryPassword) {
      const { data: createdAuth, error: authError } =
        await admin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (authError || !createdAuth.user) {
        const duplicate = /already|registered|exists/i.test(authError?.message ?? "");
        return jsonError(
          duplicate
            ? "Ese correo ya esta registrado en Supabase Auth."
            : `No se pudo crear el usuario en Supabase: ${authError?.message ?? "error desconocido"}`,
          duplicate ? 409 : 500,
        );
      }

      const newUserId = createdAuth.user.id;

      try {
        const { error: profileError } = await admin.from("profiles").upsert({
          id: newUserId,
          organization_id: targetScope.organizationId,
          email,
          display_name: fullName,
          status: "active",
          default_country_id: targetScope.countryId ?? null,
          default_company_id: targetScope.companyId ?? null,
          default_branch_id: targetScope.branchId ?? null,
          invited_by: uuidPattern.test(actor.userId) ? actor.userId : null,
          updated_at: new Date().toISOString(),
        });

        if (profileError) throw new Error(profileError.message);

        const { error: roleInsertError } = await admin.from("user_roles").insert({
          user_id: newUserId,
          role_id: role.id,
          organization_id: targetScope.organizationId,
          country_id: targetScope.countryId ?? null,
          company_id: targetScope.companyId ?? null,
          operational_area_id: targetScope.operationalAreaId ?? null,
          branch_id: targetScope.branchId ?? null,
          status: "active",
        });

        if (roleInsertError) throw new Error(roleInsertError.message);

        if (["gerente_operaciones", "gerente_area", "gerente_sucursal"].includes(payload.roleKey)) {
          const { error: assignmentError } = await admin.from("manager_assignments").insert({
            organization_id: targetScope.organizationId,
            profile_id: newUserId,
            role_id: role.id,
            country_id: targetScope.countryId ?? null,
            company_id: targetScope.companyId ?? null,
            operational_area_id: targetScope.operationalAreaId ?? null,
            branch_id: targetScope.branchId ?? null,
            assigned_by: uuidPattern.test(actor.userId) ? actor.userId : null,
            status: "active",
            starts_at: new Date().toISOString(),
            metadata: { source: "usuarios-permisos-supabase" },
          });
          if (assignmentError) throw new Error(assignmentError.message);
        }

        if (payload.roleKey === "gerente_area" && targetScope.operationalAreaId) {
          const { error: areaError } = await admin
            .from("operational_areas")
            .update({ manager_profile_id: newUserId, updated_at: new Date().toISOString() })
            .eq("id", targetScope.operationalAreaId)
            .eq("organization_id", targetScope.organizationId);
          if (areaError) throw new Error(areaError.message);
        }

        if (payload.roleKey === "gerente_sucursal" && targetScope.branchId) {
          const { error: branchManagerError } = await admin.from("branch_managers").insert({
            organization_id: targetScope.organizationId,
            branch_id: targetScope.branchId,
            profile_id: newUserId,
            display_name: fullName,
            email,
            is_demo: false,
            starts_on: new Date().toISOString().slice(0, 10),
          });
          if (branchManagerError) throw new Error(branchManagerError.message);

          await admin.rpc("activate_branch_if_ready", { target_branch_id: targetScope.branchId });
        }

        if (managerIncentiveResult.incentive && managementCategory) {
          const { error: bonusError } = await admin.from("manager_bonus_plans").insert({
            organization_id: targetScope.organizationId,
            profile_id: newUserId,
            role_id: role.id,
            country_id: targetScope.countryId ?? null,
            company_id: targetScope.companyId ?? null,
            operational_area_id: targetScope.operationalAreaId ?? null,
            branch_id: targetScope.branchId ?? null,
            base_amount: managerIncentiveResult.incentive.baseBonusAmount,
            currency_code: "USD",
            category: managementCategory,
            status: "active",
            effective_from: new Date().toISOString().slice(0, 10),
          });
          if (bonusError) throw new Error(bonusError.message);
        }

        if (payload.roleKey === "gerente_area" && managedBranchManagerResult.ids.length > 0) {
          const reportingRows = managedBranchManagerResult.ids.map((subordinateId) => ({
            organization_id: targetScope.organizationId,
            manager_profile_id: newUserId,
            subordinate_profile_id: subordinateId,
            status: "active",
            starts_at: new Date().toISOString(),
            created_by: uuidPattern.test(actor.userId) ? actor.userId : null,
          }));
          const { error: reportingError } = await admin.from("reporting_lines").insert(reportingRows);
          if (reportingError) throw new Error(reportingError.message);
        }

        await admin.from("audit_logs").insert({
          organization_id: targetScope.organizationId,
          actor_user_id: uuidPattern.test(actor.userId) ? actor.userId : null,
          action: "user.created",
          entity_table: "profiles",
          entity_id: newUserId,
          country_id: targetScope.countryId ?? null,
          company_id: targetScope.companyId ?? null,
          branch_id: targetScope.branchId ?? null,
          metadata: { role_key: payload.roleKey, source: "supabase_direct" },
        });

        return NextResponse.json({
          ok: true,
          source: "supabase",
          status: "created",
          user: {
            email,
            fullName,
            roleKey: payload.roleKey,
            scope: targetScope,
            userId: newUserId,
          },
        });
      } catch (provisionError) {
        await admin.auth.admin.deleteUser(newUserId).catch(() => undefined);
        return jsonError(
          `No se pudo completar la jerarquia del usuario: ${provisionError instanceof Error ? provisionError.message : "error desconocido"}`,
          500,
        );
      }
    }

    if (!appUrl) {
      return jsonError(
        "Falta configurar APP_URL para enviar invitaciones en produccion.",
        503,
        ["APP_URL"],
      );
    }

    const { data: pending } = await admin
      .from("user_invitations")
      .select("id")
      .eq("organization_id", targetScope.organizationId)
      .ilike("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (pending) {
      return jsonError("Ya existe una invitacion pendiente para ese correo.", 409);
    }

    const { data: invitationData, error: invitationError } = await admin
      .from("user_invitations")
      .insert({
        organization_id: targetScope.organizationId,
        email,
        invited_role_id: role.id,
        invited_by: uuidPattern.test(actor.userId) ? actor.userId : null,
        country_id: targetScope.countryId ?? null,
        company_id: targetScope.companyId ?? null,
        operational_area_id: targetScope.operationalAreaId ?? null,
        branch_id: targetScope.branchId ?? null,
        status: "pending",
        invitation_token_hash: null,
        metadata: {
          delivery_status: "pending",
          provider: "supabase_auth",
          manager_incentive: managerIncentiveResult.incentive,
          managed_branch_manager_ids: managedBranchManagerResult.ids,
        },
      })
      .select("id")
      .single();

    if (invitationError || !invitationData) {
      return jsonError(
        `No se pudo registrar la invitacion: ${invitationError?.message ?? "error desconocido"}`,
        500,
      );
    }

    const invitation = invitationData as { id: string };

    const { data: invited, error: authInviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl.replace(/\/$/, "")}/auth/confirm`,
        data: { full_name: fullName },
      });

    if (authInviteError) {
      await admin
        .from("user_invitations")
        .update({
          metadata: {
            delivery_status: "failed",
            provider: "supabase_auth",
            error: authInviteError.message,
          },
        })
        .eq("id", invitation.id);
      return jsonError(`No se pudo enviar la invitacion: ${authInviteError.message}`, 502);
    }

    await admin
      .from("user_invitations")
      .update({
        metadata: {
          delivery_status: "sent",
          provider: "supabase_auth",
          auth_user_id: invited.user?.id ?? null,
          manager_incentive: managerIncentiveResult.incentive,
          managed_branch_manager_ids: managedBranchManagerResult.ids,
        },
      })
      .eq("id", invitation.id);

    return NextResponse.json(
      {
        deliveryStatus: "sent",
        email,
        invitationId: invitation.id,
        ok: true,
        source: "supabase",
        status: "pending",
      },
      { status: 201 },
    );
  }

  try {
    if (temporaryPassword) {
      const user = await createLocalUserWithTemporaryPassword({
        actorUserId: actor.userId,
        email,
        fullName,
        managedBranchManagerIds: managedBranchManagerResult.ids,
        managerIncentive: managerIncentiveResult.incentive ?? undefined,
        password: temporaryPassword,
        roleKey: payload.roleKey,
        scope: targetScope,
      });

      return NextResponse.json({
        ok: true,
        status: "created",
        user,
      });
    }

    const invitation = await createUserInvitation({
      appUrl: appUrl ?? "",
      email,
      fullName,
      managedBranchManagerIds: managedBranchManagerResult.ids,
      roleKey: payload.roleKey,
      scope: targetScope,
      actorUserId: actor.userId,
      managerIncentive: managerIncentiveResult.incentive ?? undefined,
    });

    await sendMail({
      html: invitation.emailHtml,
      subject: invitation.subject,
      text: invitation.emailText,
      to: invitation.recipientEmail,
    });

    return NextResponse.json({
      expiresAt: invitation.expiresAt,
      invitationId: invitation.id,
      managedBranchManagers: invitation.managedBranchManagers,
      ok: true,
      status: "sent",
    });
  } catch (error) {
    if (error instanceof LocalAuthRequestError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof UserInvitationError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to send user invitation", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError(
      "No se pudo enviar la invitacion. Revisa SMTP, base de datos y logs del servidor.",
      502,
    );
  }
}
