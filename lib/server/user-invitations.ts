import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";

import { getPostgresPool } from "@/lib/server/database";
import { demoRoleProfiles, type RoleKey } from "@/lib/tenant/demo-context";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";
import {
  managementLevelLabels,
  managerIncentiveFormulaVersion,
  type ManagerIncentiveInput,
} from "@/lib/tenant/manager-incentives";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RoleRow = {
  id: string;
};

type InvitationRow = {
  expires_at: string;
  id: string;
};

const assignmentTrackedRoles: RoleKey[] = ["gerente_area", "gerente_sucursal"];

export class UserInvitationError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export type CreateInvitationInput = {
  appUrl: string;
  actorUserId: string;
  email: string;
  fullName: string;
  managedBranchManagerIds?: string[];
  managerIncentive?: ManagerIncentiveInput;
  roleKey: RoleKey;
  scope: ScopeBoundary;
};

export type CreatedInvitation = {
  emailHtml: string;
  emailText: string;
  expiresAt: string;
  id: string;
  managedBranchManagers: number;
  recipientEmail: string;
  subject: string;
};

function nullableUuid(value: string | null | undefined) {
  return value && uuidPattern.test(value) ? value : null;
}

function requiredUuid(value: string | null | undefined, fieldName: string) {
  const uuid = nullableUuid(value);

  if (!uuid) {
    throw new Error(`${fieldName} must be a valid UUID.`);
  }

  return uuid;
}

function normalizeAppUrl(appUrl: string) {
  return appUrl.replace(/\/+$/, "");
}

function buildInvitationUrl(appUrl: string, token: string, email: string) {
  const url = new URL("/auth/sign-up", normalizeAppUrl(appUrl));
  url.searchParams.set("invitation", token);
  url.searchParams.set("email", email);
  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeUuidList(values: string[]) {
  const normalizedIds: string[] = [];

  for (const value of values) {
    const uuid = nullableUuid(value);

    if (!uuid) {
      throw new UserInvitationError(
        "Selecciona gerentes de sucursal validos para esta gerencia de area.",
      );
    }

    if (!normalizedIds.includes(uuid)) {
      normalizedIds.push(uuid);
    }
  }

  return normalizedIds;
}

async function assertManagedBranchManagersInScope({
  branchManagerIds,
  client,
  scope,
}: {
  branchManagerIds: string[];
  client: PoolClient;
  scope: {
    companyId: string | null;
    countryId: string | null;
    operationalAreaId: string | null;
    organizationId: string;
  };
}) {
  if (branchManagerIds.length === 0) {
    return;
  }

  if (!scope.operationalAreaId) {
    throw new UserInvitationError(
      "Selecciona la gerencia de area antes de asignar gerentes de sucursal.",
    );
  }

  const result = await client.query<{ profile_id: string }>(
    `
      select distinct ma.profile_id
      from public.manager_assignments ma
      join public.roles r on r.id = ma.role_id
      join public.profiles p on p.id = ma.profile_id
      where ma.profile_id = any($1::uuid[])
        and ma.organization_id = $2
        and ($3::uuid is null or ma.country_id = $3::uuid)
        and ($4::uuid is null or ma.company_id = $4::uuid)
        and ma.operational_area_id = $5
        and ma.branch_id is not null
        and ma.status = 'active'
        and ma.deactivated_at is null
        and r.key = 'gerente_sucursal'
        and p.status = 'active'
        and p.deactivated_at is null
        and p.deleted_at is null
    `,
    [
      branchManagerIds,
      scope.organizationId,
      scope.countryId,
      scope.companyId,
      scope.operationalAreaId,
    ],
  );
  const validIds = new Set(result.rows.map((row) => row.profile_id));

  if (branchManagerIds.some((id) => !validIds.has(id))) {
    throw new UserInvitationError(
      "Solo puedes asignar gerentes de sucursal activos dentro de la gerencia de area seleccionada.",
    );
  }
}

function buildEmailContent({
  expiresAt,
  fullName,
  invitationUrl,
  managedBranchManagers,
  managerIncentive,
  roleKey,
}: {
  expiresAt: string;
  fullName: string;
  invitationUrl: string;
  managedBranchManagers: number;
  managerIncentive?: ManagerIncentiveInput;
  roleKey: RoleKey;
}) {
  const roleLabel = demoRoleProfiles[roleKey].label;
  const incentiveText = managerIncentive
    ? `Nivel ${managementLevelLabels[managerIncentive.managementLevel]} con bono base mensual USD ${managerIncentive.baseBonusAmount}.`
    : null;
  const subordinateText =
    managedBranchManagers > 0
      ? `Tendra ${managedBranchManagers} gerente${managedBranchManagers === 1 ? "" : "s"} de sucursal a cargo.`
      : null;
  const greeting = fullName ? `Hola ${fullName},` : "Hola,";
  const htmlGreeting = escapeHtml(greeting);
  const htmlIncentiveText = incentiveText ? escapeHtml(incentiveText) : null;
  const htmlSubordinateText = subordinateText ? escapeHtml(subordinateText) : null;
  const htmlInvitationUrl = escapeHtml(invitationUrl);
  const htmlRoleLabel = escapeHtml(roleLabel);
  const htmlExpiresAt = escapeHtml(expiresAt);
  const subject = "Invitacion a Analiza BI";
  const text = [
    greeting,
    "",
    `Te invitaron a Analiza BI con el rol ${roleLabel}.`,
    ...(incentiveText ? [incentiveText] : []),
    ...(subordinateText ? [subordinateText] : []),
    "Abre el enlace para aceptar la invitacion y continuar con la configuracion de tu cuenta:",
    invitationUrl,
    "",
    `Esta invitacion vence el ${expiresAt}.`,
    "",
    "Si no esperabas este correo, puedes ignorarlo.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
      <h2 style="margin:0 0 16px">Invitacion a Analiza BI</h2>
      <p>${htmlGreeting}</p>
      <p>Te invitaron a Analiza BI con el rol <strong>${htmlRoleLabel}</strong>.</p>
      ${htmlIncentiveText ? `<p>${htmlIncentiveText}</p>` : ""}
      ${htmlSubordinateText ? `<p>${htmlSubordinateText}</p>` : ""}
      <p>
        <a href="${htmlInvitationUrl}" style="display:inline-block;background:#4338ca;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
          Aceptar invitacion
        </a>
      </p>
      <p style="color:#4b5563">Esta invitacion vence el ${htmlExpiresAt}.</p>
      <p style="color:#6b7280;font-size:13px">Si no esperabas este correo, puedes ignorarlo.</p>
    </div>
  `;

  return { html, subject, text };
}

export async function createUserInvitation({
  appUrl,
  actorUserId,
  email,
  fullName,
  managedBranchManagerIds = [],
  managerIncentive,
  roleKey,
  scope,
}: CreateInvitationInput): Promise<CreatedInvitation> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  const token = randomBytes(32).toString("base64url");
  const invitationTokenHash = createHash("sha256").update(token).digest("hex");
  const organizationId = requiredUuid(scope.organizationId, "organizationId");
  const auditableActorUserId = nullableUuid(actorUserId);
  const countryId = nullableUuid(scope.countryId);
  const companyId = nullableUuid(scope.companyId);
  const operationalAreaId = nullableUuid(scope.operationalAreaId);
  const branchId = nullableUuid(scope.branchId);
  const normalizedManagedBranchManagerIds =
    roleKey === "gerente_area"
      ? normalizeUuidList(managedBranchManagerIds)
      : [];

  try {
    await client.query("begin");

    const roleResult = await client.query<RoleRow>(
      "select id from public.roles where key = $1 limit 1",
      [roleKey],
    );
    const roleId = roleResult.rows[0]?.id;

    if (!roleId) {
      throw new Error("Role not found for invitation.");
    }

    await assertManagedBranchManagersInScope({
      branchManagerIds: normalizedManagedBranchManagerIds,
      client,
      scope: {
        companyId,
        countryId,
        operationalAreaId,
        organizationId,
      },
    });

    const invitationResult = await client.query<InvitationRow>(
      `
        insert into public.user_invitations (
          organization_id,
          email,
          invited_role_id,
          country_id,
          company_id,
          operational_area_id,
          branch_id,
          management_level,
          base_bonus_amount,
          invited_by,
          invitation_token_hash,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
        returning id, expires_at
      `,
      [
        organizationId,
        email,
        roleId,
        countryId,
        companyId,
        operationalAreaId,
        branchId,
        managerIncentive?.managementLevel ?? null,
        managerIncentive?.baseBonusAmount ?? null,
        auditableActorUserId,
        invitationTokenHash,
        JSON.stringify({
          delivery_provider: "smtp",
          invited_name: fullName,
          manager_incentive: managerIncentive
            ? {
                base_bonus_amount: managerIncentive.baseBonusAmount,
                formula_version: managerIncentiveFormulaVersion,
                management_level: managerIncentive.managementLevel,
              }
            : undefined,
          managed_branch_manager_count:
            normalizedManagedBranchManagerIds.length,
          managed_branch_manager_ids: normalizedManagedBranchManagerIds,
          source: "usuarios-permisos",
        }),
      ],
    );
    const invitation = invitationResult.rows[0];

    if (!invitation) {
      throw new Error("Invitation could not be created.");
    }

    await client.query(
      `
        insert into public.audit_logs (
          organization_id,
          action,
          entity_table,
          entity_id,
          country_id,
          company_id,
          branch_id,
          actor_user_id,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        organizationId,
        "user_invitation.created",
        "user_invitations",
        invitation.id,
        countryId,
        companyId,
        branchId,
        auditableActorUserId,
        JSON.stringify({
          invited_email_domain: email.split("@")[1] ?? "unknown",
          invited_role: roleKey,
          manager_incentive: managerIncentive
            ? {
                base_bonus_amount: managerIncentive.baseBonusAmount,
                formula_version: managerIncentiveFormulaVersion,
                management_level: managerIncentive.managementLevel,
              }
            : undefined,
          managed_branch_manager_count:
            normalizedManagedBranchManagerIds.length,
          source: "usuarios-permisos",
        }),
      ],
    );

    if (assignmentTrackedRoles.includes(roleKey)) {
      await client.query(
        `
          insert into public.assignment_history (
            organization_id,
            actor_user_id,
            entity_table,
            entity_id,
            action,
            previous_scope,
            next_scope,
            reason
          )
          values ($1, $2, 'user_invitations', $3, 'manager_assignment.invited', '{}'::jsonb, $4::jsonb, $5)
        `,
        [
          organizationId,
          auditableActorUserId,
          invitation.id,
          JSON.stringify({
            branch_id: nullableUuid(scope.branchId),
            company_id: companyId,
            country_id: countryId,
            invited_email_domain: email.split("@")[1] ?? "unknown",
            invited_role: roleKey,
            managed_branch_manager_ids: normalizedManagedBranchManagerIds,
            manager_incentive: managerIncentive
              ? {
                  base_bonus_amount: managerIncentive.baseBonusAmount,
                  formula_version: managerIncentiveFormulaVersion,
                  management_level: managerIncentive.managementLevel,
                }
              : undefined,
            operational_area_id: operationalAreaId,
            status: "pending_invitation",
          }),
          "Invitacion para nombramiento de gerente con alcance operativo controlado.",
        ],
      );
    }

    await client.query("commit");

    const expiresAt = new Intl.DateTimeFormat("es-SV", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/El_Salvador",
    }).format(new Date(invitation.expires_at));
    const invitationUrl = buildInvitationUrl(appUrl, token, email);
    const emailContent = buildEmailContent({
      expiresAt,
      fullName,
      invitationUrl,
      managedBranchManagers: normalizedManagedBranchManagerIds.length,
      managerIncentive,
      roleKey,
    });

    return {
      emailHtml: emailContent.html,
      emailText: emailContent.text,
      expiresAt,
      id: invitation.id,
      managedBranchManagers: normalizedManagedBranchManagerIds.length,
      recipientEmail: email,
      subject: emailContent.subject,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
