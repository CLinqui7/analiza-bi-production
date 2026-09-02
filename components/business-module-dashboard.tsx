"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LineChart,
  LockKeyhole,
  Save,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  moduleConfigs,
  type ModuleConfig,
  type ModuleInsight,
  type ModuleMetric,
} from "@/lib/analytics/demo-business-modules";
import { formatCurrency } from "@/lib/analytics/el-salvador-result-templates";
import {
  demoBranches,
  demoBusinessLineOptions,
  demoCountryOptions,
  demoCompanyOptions,
  demoOperationalAreas,
  demoRoleProfiles,
  roleKeys,
  type BranchOption,
  type RoleKey,
} from "@/lib/tenant/demo-context";
import {
  buildSoftDeactivationPlan,
  canCreateBranch,
  canCreateOperationalArea,
  canInviteUser,
  getCreatableRoles,
  isSuperAdministrator,
  type DelegationActor,
  type ScopeBoundary,
} from "@/lib/tenant/delegation-policy";
import {
  getDefaultBaseBonusAmount,
  isManagementLevel,
  isManagerIncentiveRole,
  managementLevelLabels,
  managementLevels,
  normalizeBaseBonusAmount,
  type ManagementLevel,
} from "@/lib/tenant/manager-incentives";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const roleStorageKey = "analiza:demo-role";
const roleChangeEvent = "analiza:role-change";
const demoUsersStorageKey = "analiza:demo-users";
const revokedDemoUserEmails = new Set(["info@tuvetsv.com"]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StoredContext = {
  countryName: string;
  companyName: string;
  branchName: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo: boolean;
};

type BusinessModuleDashboardProps = {
  allowDemoRoleSwitch: boolean;
  actorScope: ScopeBoundary;
  enableDemoFixtures?: boolean;
  module: string;
  roleKey: RoleKey;
};

type DemoManagedUser = {
  id: string;
  fullName: string;
  email: string;
  roleKey: RoleKey;
  baseBonusAmount?: number;
  managementLevel?: ManagementLevel;
  organizationScope: string;
  countryScope: string;
  businessScope: string;
  areaScope?: string;
  branchScope: string;
  status: "Activo" | "Pendiente invitacion" | "Inactivo";
  createdAt: string;
  deactivatedAt?: string;
  invitationStatus?: "Pendiente" | "Aceptada" | "Revocada";
  managedBranchManagerCount?: number;
  managedBranchManagerIds?: string[];
  reassignmentRequired?: boolean;
};

type AssignableBranchManager = {
  areaId: string | null;
  areaName: string | null;
  baseBonusAmount: number | null;
  branchId: string | null;
  branchName: string | null;
  businessId: string | null;
  businessName: string | null;
  countryId: string | null;
  countryName: string | null;
  email: string | null;
  fullName: string;
  id: string;
  managementLevel: ManagementLevel | null;
};

type InviteUserApiResponse = {
  error?: string;
  expiresAt?: string;
  invitationId?: string;
  managedBranchManagers?: number;
  missingConfig?: string[];
  ok?: boolean;
  status?: "sent" | "created";
  user?: {
    email?: string;
    requiresPasswordChange?: boolean;
    roleKey?: RoleKey;
    userId?: string;
  };
};

type ResetPasswordApiResponse = {
  error?: string;
  missingConfig?: string[];
  ok?: boolean;
  status?: "reset";
  user?: {
    email?: string;
    roleKey?: RoleKey;
    userId?: string;
  };
};

type BranchManagersApiResponse = {
  branchManagers?: AssignableBranchManager[];
  error?: string;
  missingConfig?: string[];
  ok?: boolean;
};

type ManagerIncentiveAssignment = {
  assignmentId: string;
  baseBonusAmount: number | null;
  branchName: string | null;
  businessName: string | null;
  canEdit: boolean;
  countryName: string | null;
  email: string | null;
  fullName: string;
  id: string;
  managementLevel: ManagementLevel | null;
  operationalAreaName: string | null;
  roleKey: RoleKey;
  roleName: string;
};

type ManagerIncentivesApiResponse = {
  error?: string;
  managerIncentives?: ManagerIncentiveAssignment[];
  missingConfig?: string[];
  ok?: boolean;
};

type UpdateManagerIncentiveApiResponse = {
  error?: string;
  managerIncentive?: {
    assignmentId?: string;
    baseBonusAmount?: number;
    managementLevel?: ManagementLevel;
  };
  missingConfig?: string[];
  ok?: boolean;
  status?: "updated";
};

type CreateBranchApiResponse = {
  branch?: {
    code: string;
    id: string;
    name: string;
    status: string;
  };
  error?: string;
  missingConfig?: string[];
  ok?: boolean;
  status?: "created";
};

type PendingCreatedBranch = BranchOption & {
  governanceStatus: "pending_manager";
};

const businessHealth = [
  {
    business: "Fisioterapia",
    financial: 89,
    operational: 91,
    target: 94,
    note: "Alta demanda, vigilar asistencia efectiva",
  },
  {
    business: "Laboratorio",
    financial: 78,
    operational: 86,
    target: 90,
    note: "Costo variable y tiempos de entrega en observacion",
  },
  {
    business: "Imagenes",
    financial: 74,
    operational: 80,
    target: 87,
    note: "Capacidad ociosa y costos fijos pendientes",
  },
];

const allBusinessScope = "Todas las lineas de negocio";
const allCountryScope = "Todos los paises";
const allAreaScope = "Todas las gerencias de area";
const allBranchScope = "Todas las sucursales";
const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const formSelectClassName =
  "h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
const tableSelectClassName =
  "h-9 w-full min-w-0 rounded-md border bg-background px-2 text-xs outline-none disabled:opacity-60";
const initialDemoUsers: DemoManagedUser[] = [
  {
    id: "demo-admin",
    fullName: "Administrador DEMO",
    email: "admin.demo@analiza.local",
    roleKey: "super_admin",
    organizationScope: "Grupo Analiza DEMO",
    countryScope: allCountryScope,
    businessScope: allBusinessScope,
    areaScope: allAreaScope,
    branchScope: allBranchScope,
    status: "Activo",
    createdAt: "2026-07-21",
  },
];

function readStoredContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawContext = window.localStorage.getItem(storageKey);
  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as StoredContext;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function readActiveDashboardRole({
  allowDemoRoleSwitch,
  fallbackRole,
}: {
  allowDemoRoleSwitch: boolean;
  fallbackRole: RoleKey;
}): RoleKey {
  if (typeof window === "undefined") {
    return fallbackRole;
  }

  if (!allowDemoRoleSwitch) {
    return fallbackRole;
  }

  const storedRole = window.localStorage.getItem(roleStorageKey);

  if (roleKeys.includes(storedRole as RoleKey)) {
    return storedRole as RoleKey;
  }

  return fallbackRole;
}

function readDemoUsers(enableDemoFixtures: boolean) {
  if (!enableDemoFixtures) {
    return [];
  }

  if (typeof window === "undefined") {
    return initialDemoUsers;
  }

  const rawUsers = window.localStorage.getItem(demoUsersStorageKey);
  if (!rawUsers) {
    return initialDemoUsers;
  }

  try {
    const parsedUsers = JSON.parse(rawUsers) as DemoManagedUser[];
    const visibleUsers = parsedUsers.filter(
      (user) => !revokedDemoUserEmails.has(user.email.toLowerCase()),
    );

    if (visibleUsers.length !== parsedUsers.length) {
      persistDemoUsers(visibleUsers.length > 0 ? visibleUsers : initialDemoUsers);
    }

    return visibleUsers.length > 0 ? visibleUsers : initialDemoUsers;
  } catch {
    window.localStorage.removeItem(demoUsersStorageKey);
    return initialDemoUsers;
  }
}

function persistDemoUsers(users: DemoManagedUser[]) {
  window.localStorage.setItem(demoUsersStorageKey, JSON.stringify(users));
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isUuid(value: string) {
  return uuidPattern.test(value);
}

function buildScopeBoundary({
  areaScope,
  branchScope,
  businessScope,
  countryScope,
  organizationId = demoOrganizationId,
}: {
  areaScope?: string;
  branchScope: string;
  businessScope: string;
  countryScope: string;
  organizationId?: string;
}): ScopeBoundary {
  return {
    branchId: branchScope === allBranchScope ? null : branchScope,
    companyId: businessScope === allBusinessScope ? null : businessScope,
    countryId: countryScope === allCountryScope ? null : countryScope,
    operationalAreaId:
      !areaScope || areaScope === allAreaScope ? null : areaScope,
    organizationId,
  };
}

function buildDelegationActor(
  roleKey: RoleKey,
  scope: {
    areaScope?: string;
    branchScope: string;
    businessScope: string;
    countryScope: string;
    organizationId?: string;
  },
): DelegationActor {
  return {
    canInviteOperationalUsers: roleKey === "gerente_sucursal",
    roleKey,
    scope: buildScopeBoundary(scope),
    userId: "active-demo-user",
  };
}

function getRoleOptionsForValue(roleKey: RoleKey) {
  return roleKeys.includes(roleKey) ? roleKeys : [roleKey, ...roleKeys];
}

function getDefaultRoleForActor(actorRole: RoleKey) {
  return getCreatableRoles(actorRole, {
    canInviteOperationalUsers: actorRole === "gerente_sucursal",
  })[0] ?? "viewer";
}

function getManagedUserManagementLevelLabel(user: DemoManagedUser) {
  if (!isManagerIncentiveRole(user.roleKey)) {
    return "-";
  }

  return user.managementLevel && isManagementLevel(user.managementLevel)
    ? managementLevelLabels[user.managementLevel]
    : "-";
}

function getManagedUserBaseBonusLabel(user: DemoManagedUser) {
  if (!isManagerIncentiveRole(user.roleKey)) {
    return "-";
  }

  return typeof user.baseBonusAmount === "number"
    ? formatCurrency(user.baseBonusAmount)
    : "Pendiente";
}

function getManagedBranchManagersLabel(user: DemoManagedUser) {
  if (user.roleKey !== "gerente_area") {
    return "-";
  }

  const count =
    typeof user.managedBranchManagerCount === "number"
      ? user.managedBranchManagerCount
      : user.managedBranchManagerIds?.length ?? 0;

  return count > 0 ? `${count} a cargo` : "Sin asignar";
}

function isApiRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && roleKeys.includes(value as RoleKey);
}

function readInviteUserApiResponse(value: unknown): InviteUserApiResponse {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const response = value as Record<string, unknown>;
  const missingConfig = Array.isArray(response.missingConfig)
    ? response.missingConfig.filter(
        (configName): configName is string => typeof configName === "string",
      )
    : undefined;

  const user =
    typeof response.user === "object" && response.user !== null
      ? (response.user as Record<string, unknown>)
      : null;
  const userRoleKey = user?.roleKey;

  return {
    error: typeof response.error === "string" ? response.error : undefined,
    expiresAt:
      typeof response.expiresAt === "string" ? response.expiresAt : undefined,
    invitationId:
      typeof response.invitationId === "string"
        ? response.invitationId
        : undefined,
    managedBranchManagers:
      typeof response.managedBranchManagers === "number"
        ? response.managedBranchManagers
        : undefined,
    missingConfig,
    ok: response.ok === true,
    status:
      response.status === "sent" || response.status === "created"
        ? response.status
        : undefined,
    user: user
      ? {
          email: typeof user.email === "string" ? user.email : undefined,
          requiresPasswordChange: user.requiresPasswordChange === true,
          roleKey: isApiRoleKey(userRoleKey) ? userRoleKey : undefined,
          userId: typeof user.userId === "string" ? user.userId : undefined,
        }
      : undefined,
  };
}

function readResetPasswordApiResponse(value: unknown): ResetPasswordApiResponse {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const response = value as Record<string, unknown>;
  const missingConfig = Array.isArray(response.missingConfig)
    ? response.missingConfig.filter(
        (configName): configName is string => typeof configName === "string",
      )
    : undefined;
  const user =
    typeof response.user === "object" && response.user !== null
      ? (response.user as Record<string, unknown>)
      : null;
  const userRoleKey = user?.roleKey;

  return {
    error: typeof response.error === "string" ? response.error : undefined,
    missingConfig,
    ok: response.ok === true,
    status: response.status === "reset" ? "reset" : undefined,
    user: user
      ? {
          email: typeof user.email === "string" ? user.email : undefined,
          roleKey: isApiRoleKey(userRoleKey) ? userRoleKey : undefined,
          userId: typeof user.userId === "string" ? user.userId : undefined,
        }
      : undefined,
  };
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readAssignableBranchManager(value: unknown): AssignableBranchManager | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const manager = value as Record<string, unknown>;

  if (
    typeof manager.id !== "string" ||
    typeof manager.fullName !== "string"
  ) {
    return null;
  }

  return {
    areaId: readNullableString(manager.areaId),
    areaName: readNullableString(manager.areaName),
    baseBonusAmount:
      typeof manager.baseBonusAmount === "number"
        ? manager.baseBonusAmount
        : null,
    branchId: readNullableString(manager.branchId),
    branchName: readNullableString(manager.branchName),
    businessId: readNullableString(manager.businessId),
    businessName: readNullableString(manager.businessName),
    countryId: readNullableString(manager.countryId),
    countryName: readNullableString(manager.countryName),
    email: readNullableString(manager.email),
    fullName: manager.fullName,
    id: manager.id,
    managementLevel: isManagementLevel(manager.managementLevel)
      ? manager.managementLevel
      : null,
  };
}

function readBranchManagersApiResponse(
  value: unknown,
): BranchManagersApiResponse {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const response = value as Record<string, unknown>;
  const missingConfig = Array.isArray(response.missingConfig)
    ? response.missingConfig.filter(
        (configName): configName is string => typeof configName === "string",
      )
    : undefined;
  const branchManagers = Array.isArray(response.branchManagers)
    ? response.branchManagers
        .map(readAssignableBranchManager)
        .filter((manager): manager is AssignableBranchManager => Boolean(manager))
    : undefined;

  return {
    branchManagers,
    error: typeof response.error === "string" ? response.error : undefined,
    missingConfig,
    ok: response.ok === true,
  };
}

function readManagerIncentiveAssignment(
  value: unknown,
): ManagerIncentiveAssignment | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const assignment = value as Record<string, unknown>;

  if (
    typeof assignment.assignmentId !== "string" ||
    typeof assignment.fullName !== "string" ||
    !isApiRoleKey(assignment.roleKey)
  ) {
    return null;
  }

  return {
    assignmentId: assignment.assignmentId,
    baseBonusAmount:
      typeof assignment.baseBonusAmount === "number"
        ? assignment.baseBonusAmount
        : null,
    branchName: readNullableString(assignment.branchName),
    businessName: readNullableString(assignment.businessName),
    canEdit: assignment.canEdit === true,
    countryName: readNullableString(assignment.countryName),
    email: readNullableString(assignment.email),
    fullName: assignment.fullName,
    id:
      typeof assignment.id === "string"
        ? assignment.id
        : assignment.assignmentId,
    managementLevel: isManagementLevel(assignment.managementLevel)
      ? assignment.managementLevel
      : null,
    operationalAreaName: readNullableString(assignment.operationalAreaName),
    roleKey: assignment.roleKey,
    roleName:
      typeof assignment.roleName === "string"
        ? assignment.roleName
        : demoRoleProfiles[assignment.roleKey].label,
  };
}

function readManagerIncentivesApiResponse(
  value: unknown,
): ManagerIncentivesApiResponse {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const response = value as Record<string, unknown>;
  const missingConfig = Array.isArray(response.missingConfig)
    ? response.missingConfig.filter(
        (configName): configName is string => typeof configName === "string",
      )
    : undefined;
  const managerIncentives = Array.isArray(response.managerIncentives)
    ? response.managerIncentives
        .map(readManagerIncentiveAssignment)
        .filter(
          (assignment): assignment is ManagerIncentiveAssignment =>
            Boolean(assignment),
        )
    : undefined;

  return {
    error: typeof response.error === "string" ? response.error : undefined,
    managerIncentives,
    missingConfig,
    ok: response.ok === true,
  };
}

function readUpdateManagerIncentiveApiResponse(
  value: unknown,
): UpdateManagerIncentiveApiResponse {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const response = value as Record<string, unknown>;
  const missingConfig = Array.isArray(response.missingConfig)
    ? response.missingConfig.filter(
        (configName): configName is string => typeof configName === "string",
      )
    : undefined;
  const managerIncentive =
    typeof response.managerIncentive === "object" &&
    response.managerIncentive !== null
      ? (response.managerIncentive as Record<string, unknown>)
      : null;

  return {
    error: typeof response.error === "string" ? response.error : undefined,
    managerIncentive: managerIncentive
      ? {
          assignmentId:
            typeof managerIncentive.assignmentId === "string"
              ? managerIncentive.assignmentId
              : undefined,
          baseBonusAmount:
            typeof managerIncentive.baseBonusAmount === "number"
              ? managerIncentive.baseBonusAmount
              : undefined,
          managementLevel: isManagementLevel(managerIncentive.managementLevel)
            ? managerIncentive.managementLevel
            : undefined,
        }
      : undefined,
    missingConfig,
    ok: response.ok === true,
    status: response.status === "updated" ? "updated" : undefined,
  };
}

function readCreateBranchApiResponse(value: unknown): CreateBranchApiResponse {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const response = value as Record<string, unknown>;
  const branch =
    typeof response.branch === "object" && response.branch !== null
      ? (response.branch as Record<string, unknown>)
      : null;
  const missingConfig = Array.isArray(response.missingConfig)
    ? response.missingConfig.filter(
        (configName): configName is string => typeof configName === "string",
      )
    : undefined;

  return {
    branch:
      branch !== null &&
      typeof branch?.code === "string" &&
      typeof branch.id === "string" &&
      typeof branch.name === "string" &&
      typeof branch.status === "string"
        ? {
            code: branch.code,
            id: branch.id,
            name: branch.name,
            status: branch.status,
          }
        : undefined,
    error: typeof response.error === "string" ? response.error : undefined,
    missingConfig,
    ok: response.ok === true,
    status: response.status === "created" ? "created" : undefined,
  };
}

function getCountryScopeLabel(countryScope: string) {
  return (
    demoCountryOptions.find((country) => country.id === countryScope)?.name ??
    countryScope
  );
}

function getBusinessScopeLabel(businessScope: string) {
  return (
    demoCompanyOptions.find((company) => company.id === businessScope)?.name ??
    businessScope
  );
}

function getBusinessLineCodeForCompany(companyId: string) {
  return demoBusinessLineOptions.find((line) => line.companyId === companyId)
    ?.code;
}

function getAreaScopeLabel(areaScope?: string) {
  if (!areaScope) {
    return allAreaScope;
  }

  return (
    demoOperationalAreas.find((area) => area.id === areaScope)?.name ??
    areaScope
  );
}

function getBranchScopeLabel(branchScope: string) {
  return (
    demoBranches.find((branch) => branch.id === branchScope)?.name ??
    branchScope
  );
}

function metricToneClass(tone: ModuleMetric["tone"]) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tone === "negative") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-border bg-muted text-muted-foreground";
}

function priorityClass(priority: ModuleInsight["priority"]) {
  if (priority === "alta") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (priority === "media") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
}

function MetricCard({ metric }: { metric: ModuleMetric }) {
  return (
    <article className="metric-card flex min-h-32 flex-col justify-between rounded-lg border p-4">
      <div className="grid gap-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </h2>
        <p className="text-2xl font-semibold tracking-normal">
          {metric.value}
        </p>
      </div>
      <span
        className={cn(
          "w-fit rounded-full border px-2.5 py-1 text-xs font-medium",
          metricToneClass(metric.tone),
        )}
      >
        {metric.note}
      </span>
    </article>
  );
}

function HealthBar({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "muted";
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full",
            tone === "primary" ? "bg-primary" : "bg-muted-foreground",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ScopeCard({ context }: { context: StoredContext | null }) {
  const period =
    context?.period ??
    (context?.periodStart && context?.periodEnd
      ? `${context.periodStart} a ${context.periodEnd}`
      : "Rango pendiente");

  return (
    <aside className="rounded-lg border bg-card p-4 text-sm shadow-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Filtro aplicado
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.companyName ?? "Vista consolidada"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>Periodo: {period}</span>
      </div>
    </aside>
  );
}

function BusinessHealthSection() {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <LineChart className="size-4 text-primary" />
        Salud financiera y operativa por negocio
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {businessHealth.map((item) => (
          <article className="grid gap-3 rounded-lg border bg-background/80 p-3" key={item.business}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{item.business}</h3>
              <Badge variant="outline">Meta {item.target}%</Badge>
            </div>
            <HealthBar label="Salud financiera" value={item.financial} />
            <HealthBar label="Salud operativa" value={item.operational} />
            <HealthBar label="Avance meta" tone="muted" value={item.target} />
            <p className="text-xs leading-5 text-muted-foreground">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModuleInsights({ config }: { config: ModuleConfig }) {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-primary" />
        Insights y acciones sugeridas
      </div>
      <div className="grid gap-3">
        {config.insights.map((insight) => (
          <article
            className="insight-card grid gap-2 rounded-lg border bg-background p-3"
            key={insight.title}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={priorityClass(insight.priority)}>
                {insight.priority}
              </Badge>
              <h3 className="text-sm font-semibold">{insight.title}</h3>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {insight.detail}
            </p>
            <p className="text-sm font-medium">Accion: {insight.action}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModuleRows({ config }: { config: ModuleConfig }) {
  return (
    <section className="executive-panel rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <ClipboardList className="size-4 text-primary" />
        Detalle operativo
      </div>
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Concepto</th>
              <th className="py-2 pr-4 font-medium">Responsable</th>
              <th className="py-2 pr-4 font-medium">Resultado</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row) => (
              <tr className="border-b last:border-b-0" key={`${row.label}-${row.owner}`}>
                <td className="py-3 pr-4 font-medium">{row.label}</td>
                <td className="py-3 pr-4">{row.owner}</td>
                <td className="py-3 pr-4">{row.value}</td>
                <td className="py-3 pr-4 text-muted-foreground">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UsersAndPermissionsManager({
  allowDemoRoleSwitch,
  actorScope,
  context,
  enableDemoFixtures,
  roleKey: initialRoleKey,
}: {
  allowDemoRoleSwitch: boolean;
  actorScope: ScopeBoundary;
  context: StoredContext | null;
  enableDemoFixtures: boolean;
  roleKey: RoleKey;
}) {
  const [activeRole, setActiveRole] = useState<RoleKey>(initialRoleKey);
  const [users, setUsers] = useState<DemoManagedUser[]>(
    enableDemoFixtures ? initialDemoUsers : [],
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetTemporaryPassword, setResetTemporaryPassword] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>("gerente_area");
  const [managementLevel, setManagementLevel] =
    useState<ManagementLevel>("middle");
  const [baseBonusAmount, setBaseBonusAmount] = useState(
    String(getDefaultBaseBonusAmount("middle")),
  );
  const [assignableBranchManagers, setAssignableBranchManagers] = useState<
    AssignableBranchManager[]
  >([]);
  const [managerIncentives, setManagerIncentives] = useState<
    ManagerIncentiveAssignment[]
  >([]);
  const [managerIncentiveEdits, setManagerIncentiveEdits] = useState<
    Record<string, { baseBonusAmount: string; managementLevel: ManagementLevel }>
  >({});
  const [managedBranchManagerIds, setManagedBranchManagerIds] = useState<
    string[]
  >([]);
  const [countryScope, setCountryScope] = useState(allCountryScope);
  const [businessScope, setBusinessScope] = useState(allBusinessScope);
  const [areaScope, setAreaScope] = useState(allAreaScope);
  const [branchScope, setBranchScope] = useState(allBranchScope);
  const [isInviting, setIsInviting] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchReason, setBranchReason] = useState("");
  const [branchCountryScope, setBranchCountryScope] = useState(allCountryScope);
  const [branchBusinessScope, setBranchBusinessScope] = useState(allBusinessScope);
  const [branchAreaScope, setBranchAreaScope] = useState(allAreaScope);
  const [createdBranches, setCreatedBranches] = useState<PendingCreatedBranch[]>(
    [],
  );
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [savingManagerIncentiveId, setSavingManagerIncentiveId] = useState<
    string | null
  >(null);
  const [branchMessage, setBranchMessage] = useState("");
  const [message, setMessage] = useState("");

  const businessOptions = useMemo(
    () => [
      { label: allBusinessScope, value: allBusinessScope },
      ...demoCompanyOptions
        .filter((company) => !company.isConsolidated)
        .map((company) => ({ label: company.name, value: company.id })),
    ],
    [],
  );
  const countryOptions = useMemo(
    () => [
      { label: allCountryScope, value: allCountryScope },
      ...demoCountryOptions
        .filter((country) => country.scope !== "regional")
        .map((country) => ({ label: country.name, value: country.id })),
    ],
    [],
  );
  const areaOptions = useMemo(
    () => [
      { label: allAreaScope, value: allAreaScope },
      ...demoOperationalAreas
        .filter(
          (area) =>
            (countryScope === allCountryScope ||
              area.countryId === countryScope) &&
            (businessScope === allBusinessScope ||
              area.companyId === businessScope),
        )
        .map((area) => ({
          label: `${area.name} · ${getBusinessScopeLabel(area.companyId)}`,
          value: area.id,
        })),
    ],
    [businessScope, countryScope],
  );
  const branchAreaOptions = useMemo(
    () => [
      { label: allAreaScope, value: allAreaScope },
      ...demoOperationalAreas
        .filter(
          (area) =>
            isUuid(area.id) &&
            (branchCountryScope === allCountryScope ||
              area.countryId === branchCountryScope) &&
            (branchBusinessScope === allBusinessScope ||
              area.companyId === branchBusinessScope),
        )
        .map((area) => ({
          label: `${area.name} · ${getBusinessScopeLabel(area.companyId)}`,
          value: area.id,
        })),
    ],
    [branchBusinessScope, branchCountryScope],
  );
  const availableBranches = useMemo(
    () => [...demoBranches, ...createdBranches],
    [createdBranches],
  );
  const branchOptions = useMemo(
    () => [
      { label: allBranchScope, value: allBranchScope },
      ...availableBranches
        .filter(
          (branch) =>
            (countryScope === allCountryScope ||
              branch.countryId === countryScope) &&
            (businessScope === allBusinessScope ||
              branch.companyId === businessScope) &&
            (areaScope === allAreaScope ||
              branch.operationalAreaId === areaScope),
        )
        .map((branch) => ({
          label:
            "governanceStatus" in branch &&
            branch.governanceStatus === "pending_manager"
              ? `${branch.name} · pendiente de gerente`
              : `${branch.name} · ${getBusinessScopeLabel(branch.companyId)}`,
          value: branch.id,
        })),
    ],
    [areaScope, availableBranches, businessScope, countryScope],
  );
  const demoBranchManagerOptions = useMemo(
    () =>
      demoBranches
        .filter(
          (branch) =>
            branch.branchManagerName &&
            branch.operationalAreaId &&
            branch.isActive !== false,
        )
        .map(
          (branch): AssignableBranchManager => ({
            areaId: branch.operationalAreaId ?? null,
            areaName: getAreaScopeLabel(branch.operationalAreaId),
            baseBonusAmount: null,
            branchId: branch.id,
            branchName: branch.name,
            businessId: branch.companyId,
            businessName: getBusinessScopeLabel(branch.companyId),
            countryId: branch.countryId,
            countryName: getCountryScopeLabel(branch.countryId),
            email: null,
            fullName: branch.branchManagerName ?? "Gerente de sucursal",
            id: `demo-${branch.id}`,
            managementLevel: null,
          }),
        ),
    [],
  );
  const branchManagerOptions = useMemo(
    () =>
      assignableBranchManagers.length > 0
        ? assignableBranchManagers
        : enableDemoFixtures
          ? demoBranchManagerOptions
          : [],
    [assignableBranchManagers, demoBranchManagerOptions, enableDemoFixtures],
  );
  const scopedBranchManagerOptions = useMemo(
    () =>
      roleKey === "gerente_area" && areaScope !== allAreaScope
        ? branchManagerOptions.filter(
            (manager) =>
              manager.areaId === areaScope &&
              (countryScope === allCountryScope ||
                manager.countryId === countryScope) &&
              (businessScope === allBusinessScope ||
                manager.businessId === businessScope),
          )
        : [],
    [areaScope, branchManagerOptions, businessScope, countryScope, roleKey],
  );
  const selectedBranch = useMemo(
    () => availableBranches.find((branch) => branch.id === branchScope),
    [availableBranches, branchScope],
  );
  const selectedArea = useMemo(
    () => demoOperationalAreas.find((area) => area.id === areaScope),
    [areaScope],
  );
  const actorAreaScope =
    branchScope !== allBranchScope
      ? selectedBranch?.operationalAreaId ?? areaScope
      : areaScope;
  const actorBusinessScope =
    branchScope !== allBranchScope
      ? selectedBranch?.companyId ?? businessScope
      : areaScope !== allAreaScope
        ? selectedArea?.companyId ?? businessScope
        : businessScope;
  const actorCountryScope =
    branchScope !== allBranchScope
      ? selectedBranch?.countryId ?? countryScope
      : areaScope !== allAreaScope
        ? selectedArea?.countryId ?? countryScope
        : countryScope;
  const organizationId = actorScope.organizationId || demoOrganizationId;
  const getProductionScopedValue = (
    selectedValue: string | undefined,
    allValue: string,
    actorValue?: string | null,
  ) => {
    if (!selectedValue || selectedValue === allValue) {
      return null;
    }

    if (!enableDemoFixtures) {
      return actorValue ?? null;
    }

    return selectedValue;
  };
  const createScopeBoundary = (scope: {
    areaScope?: string;
    branchScope: string;
    businessScope: string;
    countryScope: string;
  }) =>
    buildScopeBoundary({
      areaScope:
        getProductionScopedValue(
          scope.areaScope,
          allAreaScope,
          actorScope.operationalAreaId,
        ) ?? allAreaScope,
      branchScope:
        getProductionScopedValue(
          scope.branchScope,
          allBranchScope,
          actorScope.branchId,
        ) ?? allBranchScope,
      businessScope:
        getProductionScopedValue(
          scope.businessScope,
          allBusinessScope,
          actorScope.companyId,
        ) ?? allBusinessScope,
      countryScope:
        getProductionScopedValue(
          scope.countryScope,
          allCountryScope,
          actorScope.countryId,
        ) ?? allCountryScope,
      organizationId,
    });
  const actor = useMemo(
    () => {
      if (!allowDemoRoleSwitch) {
        return {
          canInviteOperationalUsers: activeRole === "gerente_sucursal",
          roleKey: activeRole,
          scope: actorScope,
          userId: "active-user",
        } satisfies DelegationActor;
      }

      return buildDelegationActor(activeRole, {
        areaScope: actorAreaScope,
        branchScope,
        businessScope: actorBusinessScope,
        countryScope: actorCountryScope,
        organizationId,
      });
    },
    [
      actorScope,
      activeRole,
      allowDemoRoleSwitch,
      actorAreaScope,
      actorBusinessScope,
      actorCountryScope,
      branchScope,
      organizationId,
    ],
  );
  const creatableRoles = useMemo(
    () =>
      getCreatableRoles(activeRole, {
        canInviteOperationalUsers: activeRole === "gerente_sucursal",
      }),
    [activeRole],
  );
  const canCreateUsers = creatableRoles.length > 0;
  const canCreateBranchesForScope = canCreateBranch(
    actor,
    createScopeBoundary({
      areaScope: actorAreaScope,
      branchScope: allBranchScope,
      businessScope: actorBusinessScope,
      countryScope: actorCountryScope,
    }),
  );
  const canCreateAreasForScope = canCreateOperationalArea(
    actor,
    createScopeBoundary({
      areaScope: allAreaScope,
      branchScope: allBranchScope,
      businessScope: actorBusinessScope,
      countryScope: actorCountryScope,
    }),
  );
  const branchCreationScope = createScopeBoundary({
    areaScope: branchAreaScope,
    branchScope: allBranchScope,
    businessScope: branchBusinessScope,
    countryScope: branchCountryScope,
  });
  const canCreateSelectedBranch =
    branchCountryScope !== allCountryScope &&
    branchBusinessScope !== allBusinessScope &&
    canCreateBranch(actor, branchCreationScope);

  useEffect(() => {
    let isActive = true;

    async function loadAssignableBranchManagers() {
      if (
        !canCreateUsers ||
        activeRole === "gerente_sucursal" ||
        activeRole === "usuario_operativo" ||
        activeRole === "viewer"
      ) {
        setAssignableBranchManagers([]);
        return;
      }

      const response = await fetch("/api/users/branch-managers", {
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        if (isActive) {
          setAssignableBranchManagers([]);
        }
        return;
      }

      const branchManagerResult = readBranchManagersApiResponse(
        await response.json().catch(() => null),
      );

      if (isActive) {
        setAssignableBranchManagers(branchManagerResult.branchManagers ?? []);
      }
    }

    void loadAssignableBranchManagers();

    return () => {
      isActive = false;
    };
  }, [activeRole, canCreateUsers]);

  useEffect(() => {
    let isActive = true;

    async function loadManagerIncentives() {
      if (
        activeRole === "gerente_sucursal" ||
        activeRole === "usuario_operativo" ||
        activeRole === "viewer"
      ) {
        setManagerIncentives([]);
        setManagerIncentiveEdits({});
        return;
      }

      const response = await fetch("/api/users/manager-incentives", {
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        if (isActive) {
          setManagerIncentives([]);
          setManagerIncentiveEdits({});
        }
        return;
      }

      const incentiveResult = readManagerIncentivesApiResponse(
        await response.json().catch(() => null),
      );
      const incentives = incentiveResult.managerIncentives ?? [];

      if (isActive) {
        setManagerIncentives(incentives);
        setManagerIncentiveEdits(
          Object.fromEntries(
            incentives.map((incentive) => [
              incentive.assignmentId,
              {
                baseBonusAmount: String(incentive.baseBonusAmount ?? ""),
                managementLevel: incentive.managementLevel ?? "middle",
              },
            ]),
          ),
        );
      }
    }

    void loadManagerIncentives();

    return () => {
      isActive = false;
    };
  }, [activeRole]);

  useEffect(() => {
    const availableIds = new Set(
      scopedBranchManagerOptions.map((manager) => manager.id),
    );

    setManagedBranchManagerIds((currentIds) =>
      currentIds.filter((id) => availableIds.has(id)),
    );
  }, [scopedBranchManagerOptions]);

  useEffect(() => {
    setUsers(readDemoUsers(enableDemoFixtures));

    function refreshRole() {
      setActiveRole(
        readActiveDashboardRole({
          allowDemoRoleSwitch,
          fallbackRole: initialRoleKey,
        }),
      );
    }

    refreshRole();
    window.addEventListener("storage", refreshRole);
    window.addEventListener(roleChangeEvent, refreshRole);

    return () => {
      window.removeEventListener("storage", refreshRole);
      window.removeEventListener(roleChangeEvent, refreshRole);
    };
  }, [allowDemoRoleSwitch, enableDemoFixtures, initialRoleKey]);

  useEffect(() => {
    if (context?.countryName) {
      const contextCountry =
        countryOptions.find((country) => country.label === context.countryName)
          ?.value ?? allCountryScope;

      setCountryScope(contextCountry);
      setBranchCountryScope(contextCountry);
    }

    if (context?.companyName) {
      const contextBusiness =
        businessOptions.find((business) => business.label === context.companyName)
          ?.value ?? allBusinessScope;

      setBusinessScope(contextBusiness);
      setBranchBusinessScope(contextBusiness);
    }

    if (context?.branchName) {
      setBranchScope(
        availableBranches.find((branch) => branch.name === context.branchName)?.id ??
          allBranchScope,
      );
    }
  }, [
    availableBranches,
    businessOptions,
    countryOptions,
    context?.branchName,
    context?.companyName,
    context?.countryName,
  ]);

  useEffect(() => {
    if (!creatableRoles.includes(roleKey)) {
      setRoleKey(getDefaultRoleForActor(activeRole));
    }
  }, [activeRole, creatableRoles, roleKey]);

  useEffect(() => {
    if (!areaOptions.some((area) => area.value === areaScope)) {
      setAreaScope(allAreaScope);
    }
  }, [areaOptions, areaScope]);

  useEffect(() => {
    if (!branchOptions.some((branch) => branch.value === branchScope)) {
      setBranchScope(allBranchScope);
    }
  }, [branchOptions, branchScope]);

  useEffect(() => {
    if (!branchAreaOptions.some((area) => area.value === branchAreaScope)) {
      setBranchAreaScope(allAreaScope);
    }
  }, [branchAreaOptions, branchAreaScope]);

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = branchName.trim();
    const normalizedCode = branchCode.trim().toUpperCase().replace(/\s+/g, "-");
    const normalizedCity = branchCity.trim();
    const normalizedReason = branchReason.trim();

    if (!canCreateSelectedBranch) {
      setBranchMessage("Selecciona pais y linea dentro de tu alcance autorizado.");
      return;
    }

    if (!normalizedName || !normalizedCode) {
      setBranchMessage("Completa nombre y codigo de la sucursal.");
      return;
    }

    if (normalizedReason.length < 10) {
      setBranchMessage("Agrega una razon de alta para que quede historial.");
      return;
    }

    setIsCreatingBranch(true);

    try {
      const response = await fetch("/api/branches", {
        body: JSON.stringify({
          city: normalizedCity,
          code: normalizedCode,
          name: normalizedName,
          reason: normalizedReason,
          scope: branchCreationScope,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const branchResult = readCreateBranchApiResponse(
        await response.json().catch(() => null),
      );

      if (!response.ok || !branchResult.ok) {
        const missingConfig =
          branchResult.missingConfig && branchResult.missingConfig.length > 0
            ? ` Variables pendientes: ${branchResult.missingConfig.join(", ")}.`
            : "";

        throw new Error(
          `${branchResult.error ?? "No se pudo crear la sucursal."}${missingConfig}`,
        );
      }

      setBranchName("");
      setBranchCode("");
      setBranchCity("");
      setBranchReason("");
      const createdBranch = branchResult.branch;

      if (createdBranch) {
        setCreatedBranches((currentBranches) => [
          {
            id: createdBranch.id,
            areaManagerName: getAreaScopeLabel(branchAreaScope),
            branchManagerName: "Gerente de sucursal pendiente",
            businessLineCode: getBusinessLineCodeForCompany(branchBusinessScope),
            city: normalizedCity || "Pendiente",
            code: createdBranch.code,
            companyId: branchBusinessScope,
            countryId: branchCountryScope,
            governanceStatus: "pending_manager",
            isActive: false,
            isDemo: false,
            name: createdBranch.name,
            operationalAreaId:
              branchAreaScope === allAreaScope ? undefined : branchAreaScope,
            sourceTrace: "Alta de sucursal real pendiente de gerente",
          },
          ...currentBranches.filter((branch) => branch.id !== createdBranch.id),
        ]);
        setBranchScope(createdBranch.id);
        setCountryScope(branchCountryScope);
        setBusinessScope(branchBusinessScope);
        setAreaScope(
          branchAreaScope === allAreaScope ? allAreaScope : branchAreaScope,
        );
      }

      setBranchAreaScope(allAreaScope);
      setBranchMessage(
        createdBranch
          ? `Sucursal ${createdBranch.name} creada como pendiente de gerente. Ahora crea o asigna su gerente de sucursal para activarla.`
          : "Sucursal creada como pendiente de gerente. Historial registrado.",
      );
    } catch (error) {
      setBranchMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la sucursal.",
      );
    } finally {
      setIsCreatingBranch(false);
    }
  }

  function toggleManagedBranchManager(managerId: string, checked: boolean) {
    setManagedBranchManagerIds((currentIds) =>
      checked
        ? [...new Set([...currentIds, managerId])]
        : currentIds.filter((id) => id !== managerId),
    );
  }

  function selectAllManagedBranchManagers() {
    setManagedBranchManagerIds(
      scopedBranchManagerOptions.map((manager) => manager.id),
    );
  }

  function clearManagedBranchManagers() {
    setManagedBranchManagerIds([]);
  }

  function getVisibleBranchScopeLabel(nextBranchScope: string) {
    return (
      availableBranches.find((branch) => branch.id === nextBranchScope)?.name ??
      getBranchScopeLabel(nextBranchScope)
    );
  }

  async function createDemoUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const roleRequiresArea =
      roleKey === "gerente_area" ||
      roleKey === "gerente_sucursal" ||
      roleKey === "usuario_operativo";
    const roleRequiresBranch =
      roleKey === "gerente_sucursal" || roleKey === "usuario_operativo";
    const targetAreaScope =
      roleKey === "gerente_area"
        ? areaScope
        : roleRequiresBranch
          ? selectedBranch?.operationalAreaId ?? areaScope
          : allAreaScope;
    const targetBranchScope = roleRequiresBranch ? branchScope : allBranchScope;
    const targetBusinessScope =
      isSuperAdministrator(roleKey) || roleKey === "ceo"
        ? allBusinessScope
        : roleRequiresBranch && selectedBranch
          ? selectedBranch.companyId
          : roleKey === "gerente_area" && selectedArea
            ? selectedArea.companyId
            : businessScope;
    const targetCountryScope =
      isSuperAdministrator(roleKey) || roleKey === "ceo"
        ? allCountryScope
        : roleRequiresBranch && selectedBranch
          ? selectedBranch.countryId
          : roleKey === "gerente_area" && selectedArea
            ? selectedArea.countryId
            : countryScope;

    if (roleRequiresArea && targetAreaScope === allAreaScope) {
      setMessage("Selecciona la gerencia de area antes de invitar este rol.");
      return;
    }

    if (roleRequiresBranch && targetBranchScope === allBranchScope) {
      setMessage("Selecciona la sucursal antes de invitar este rol.");
      return;
    }

    const targetScope = createScopeBoundary({
      areaScope: targetAreaScope,
      branchScope: targetBranchScope,
      businessScope: targetBusinessScope,
      countryScope: targetCountryScope,
    });

    if (!canInviteUser(actor, { roleKey, scope: targetScope })) {
      setMessage(
        "Tu rol solo puede invitar usuarios de nivel inferior y dentro de tu alcance.",
      );
      return;
    }

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      setMessage("Completa nombre y correo para crear el usuario.");
      return;
    }

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      setMessage("Ese correo ya existe en usuarios.");
      return;
    }

    const normalizedBaseBonusAmount = normalizeBaseBonusAmount(
      Number(baseBonusAmount),
    );
    const managerIncentive = isManagerIncentiveRole(roleKey)
      ? {
          baseBonusAmount: normalizedBaseBonusAmount ?? 0,
          managementLevel,
        }
      : null;
    const selectedManagedBranchManagerIds =
      roleKey === "gerente_area"
        ? managedBranchManagerIds.filter((managerId) =>
            scopedBranchManagerOptions.some(
              (manager) => manager.id === managerId && isUuid(manager.id),
            ),
          )
        : [];

    if (isManagerIncentiveRole(roleKey) && !normalizedBaseBonusAmount) {
      setMessage("Ingresa el nivel y un bono base valido para este gerente.");
      return;
    }

    setIsInviting(true);

    try {
      const response = await fetch("/api/users/invite", {
        body: JSON.stringify({
          email: normalizedEmail,
          fullName: normalizedName,
          managedBranchManagerIds:
            selectedManagedBranchManagerIds.length > 0
              ? selectedManagedBranchManagerIds
              : undefined,
          managerIncentive: managerIncentive ?? undefined,
          roleKey,
          scope: targetScope,
          temporaryPassword: temporaryPassword || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const inviteResult = readInviteUserApiResponse(
        await response.json().catch(() => null),
      );

      if (!response.ok || !inviteResult.ok) {
        const missingConfig =
          inviteResult.missingConfig && inviteResult.missingConfig.length > 0
            ? ` Variables pendientes: ${inviteResult.missingConfig.join(", ")}.`
            : "";

        throw new Error(
          `${inviteResult.error ?? "No se pudo enviar la invitacion."}${missingConfig}`,
        );
      }

      const nextUsers: DemoManagedUser[] = [
        {
          id:
            inviteResult.user?.userId ??
            inviteResult.invitationId ??
            `demo-user-${Date.now()}`,
          fullName: normalizedName,
          email: normalizedEmail,
          organizationScope: "Grupo Analiza DEMO",
          countryScope: targetCountryScope,
          roleKey,
          baseBonusAmount: managerIncentive?.baseBonusAmount,
          managementLevel: managerIncentive?.managementLevel,
          businessScope: targetBusinessScope,
          areaScope: targetAreaScope,
          branchScope: targetBranchScope,
          invitationStatus:
            inviteResult.status === "created" ? undefined : "Pendiente",
          managedBranchManagerCount:
            roleKey === "gerente_area"
              ? inviteResult.managedBranchManagers ??
                selectedManagedBranchManagerIds.length
              : undefined,
          managedBranchManagerIds:
            roleKey === "gerente_area"
              ? [...managedBranchManagerIds]
              : undefined,
          status:
            inviteResult.status === "created"
              ? "Activo"
              : "Pendiente invitacion",
          createdAt: todayIsoDate(),
        },
        ...users,
      ];

      setUsers(nextUsers);
      if (enableDemoFixtures) {
        persistDemoUsers(nextUsers);
      }
      setFullName("");
      setEmail("");
      setTemporaryPassword("");
      setRoleKey(getDefaultRoleForActor(activeRole));
      setManagementLevel("middle");
      setBaseBonusAmount(String(getDefaultBaseBonusAmount("middle")));
      setManagedBranchManagerIds([]);
      setCountryScope(allCountryScope);
      setBusinessScope(allBusinessScope);
      setAreaScope(allAreaScope);
      setBranchScope(allBranchScope);
      const managedBranchMessage =
        roleKey === "gerente_area" && selectedManagedBranchManagerIds.length > 0
          ? ` Quedan ${selectedManagedBranchManagerIds.length} gerentes de sucursal preasignados a cargo.`
          : "";
      setMessage(
        inviteResult.status === "created"
          ? `Usuario creado con contrasena temporal. Al ingresar debera cambiarla.${managedBranchMessage}`
          : inviteResult.expiresAt
          ? `Invitacion enviada por correo. La cuenta queda pendiente hasta aceptar antes del ${inviteResult.expiresAt}.${managedBranchMessage}`
          : `Invitacion enviada por correo. La cuenta queda pendiente hasta aceptar.${managedBranchMessage}`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la invitacion.",
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function resetUserPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = resetEmail.trim().toLowerCase();

    if (!canCreateUsers) {
      setMessage("Tu rol actual no tiene delegacion para resetear usuarios.");
      return;
    }

    if (!normalizedEmail || !resetTemporaryPassword) {
      setMessage("Completa correo y nueva contrasena temporal.");
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch("/api/users/reset-password", {
        body: JSON.stringify({
          email: normalizedEmail,
          temporaryPassword: resetTemporaryPassword,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const resetResult = readResetPasswordApiResponse(
        await response.json().catch(() => null),
      );

      if (!response.ok || !resetResult.ok) {
        const missingConfig =
          resetResult.missingConfig && resetResult.missingConfig.length > 0
            ? ` Variables pendientes: ${resetResult.missingConfig.join(", ")}.`
            : "";

        throw new Error(
          `${resetResult.error ?? "No se pudo resetear la contrasena."}${missingConfig}`,
        );
      }

      setUsers((currentUsers) => {
        const nextUsers = currentUsers.map((user) =>
          user.email.toLowerCase() === normalizedEmail
            ? {
                ...user,
                invitationStatus: undefined,
                status: "Activo" as const,
              }
            : user,
        );

        if (enableDemoFixtures) {
          persistDemoUsers(nextUsers);
        }

        return nextUsers;
      });
      setResetEmail("");
      setResetTemporaryPassword("");
      setMessage(
        "Contrasena temporal actualizada. El usuario debera cambiarla al ingresar.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo resetear la contrasena.",
      );
    } finally {
      setIsResettingPassword(false);
    }
  }

  function updateManagerIncentiveDraft(
    assignmentId: string,
    nextDraft: Partial<{ baseBonusAmount: string; managementLevel: ManagementLevel }>,
  ) {
    setManagerIncentiveEdits((currentDrafts) => {
      const currentDraft = currentDrafts[assignmentId] ?? {
        baseBonusAmount: "",
        managementLevel: "middle" as ManagementLevel,
      };

      return {
        ...currentDrafts,
        [assignmentId]: {
          ...currentDraft,
          ...nextDraft,
        },
      };
    });
  }

  async function saveManagerIncentive(assignmentId: string) {
    const draft = managerIncentiveEdits[assignmentId];

    if (!draft) {
      setMessage("No encontre los cambios de bono para guardar.");
      return;
    }

    const normalizedBaseBonusAmount = normalizeBaseBonusAmount(
      Number(draft.baseBonusAmount),
    );

    if (!normalizedBaseBonusAmount) {
      setMessage("Ingresa un bono base valido para este gerente.");
      return;
    }

    setSavingManagerIncentiveId(assignmentId);

    try {
      const response = await fetch("/api/users/manager-incentives", {
        body: JSON.stringify({
          assignmentId,
          baseBonusAmount: normalizedBaseBonusAmount,
          managementLevel: draft.managementLevel,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const updateResult = readUpdateManagerIncentiveApiResponse(
        await response.json().catch(() => null),
      );

      if (!response.ok || !updateResult.ok) {
        const missingConfig =
          updateResult.missingConfig && updateResult.missingConfig.length > 0
            ? ` Variables pendientes: ${updateResult.missingConfig.join(", ")}.`
            : "";

        throw new Error(
          `${updateResult.error ?? "No se pudo actualizar el bono."}${missingConfig}`,
        );
      }

      setManagerIncentives((currentIncentives) =>
        currentIncentives.map((incentive) =>
          incentive.assignmentId === assignmentId
            ? {
                ...incentive,
                baseBonusAmount: normalizedBaseBonusAmount,
                managementLevel: draft.managementLevel,
              }
            : incentive,
        ),
      );
      setManagerIncentiveEdits((currentDrafts) => ({
        ...currentDrafts,
        [assignmentId]: {
          baseBonusAmount: String(normalizedBaseBonusAmount),
          managementLevel: draft.managementLevel,
        },
      }));
      setMessage("Bono base actualizado y registrado en historial.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el bono.",
      );
    } finally {
      setSavingManagerIncentiveId(null);
    }
  }

  function updateUserRole(userId: string, nextRole: RoleKey) {
    const userToUpdate = users.find((user) => user.id === userId);

    if (!userToUpdate) {
      setMessage("No encontre el usuario DEMO seleccionado.");
      return;
    }

    const nextScope = createScopeBoundary({
      areaScope: userToUpdate.areaScope,
      branchScope: userToUpdate.branchScope,
      businessScope: userToUpdate.businessScope,
      countryScope: userToUpdate.countryScope,
    });

    if (!canInviteUser(actor, { roleKey: nextRole, scope: nextScope })) {
      setMessage("No puedes asignar un rol igual, superior o fuera de tu alcance.");
      return;
    }

    const nextManagementLevel =
      userToUpdate.managementLevel && isManagementLevel(userToUpdate.managementLevel)
        ? userToUpdate.managementLevel
        : "middle";
    const nextUsers = users.map((user) =>
      user.id === userId
        ? {
            ...user,
            roleKey: nextRole,
            baseBonusAmount: isManagerIncentiveRole(nextRole)
              ? (user.baseBonusAmount ??
                getDefaultBaseBonusAmount(nextManagementLevel))
              : undefined,
            managementLevel: isManagerIncentiveRole(nextRole)
              ? nextManagementLevel
              : undefined,
            businessScope:
              isSuperAdministrator(nextRole) || nextRole === "ceo"
                ? allBusinessScope
                : user.businessScope,
            areaScope:
              nextRole === "gerente_area"
                ? user.areaScope ?? allAreaScope
                : allAreaScope,
            branchScope:
              nextRole === "gerente_sucursal" ? user.branchScope : allBranchScope,
          }
        : user,
    );

    setUsers(nextUsers);
    if (enableDemoFixtures) {
      persistDemoUsers(nextUsers);
    }
    setMessage("Rol actualizado en usuarios DEMO.");
  }

  function deactivateDemoUser(userId: string) {
    const userToDeactivate = users.find((user) => user.id === userId);

    if (!userToDeactivate) {
      setMessage("No encontre el usuario DEMO seleccionado.");
      return;
    }

    const deactivationPlan = buildSoftDeactivationPlan({
      actor,
      subordinateCount:
        userToDeactivate.roleKey === "gerente_area" ||
        userToDeactivate.roleKey === "gerente_operaciones"
          ? 1
          : 0,
      target: {
        roleKey: userToDeactivate.roleKey,
        scope: createScopeBoundary({
          areaScope: userToDeactivate.areaScope,
          branchScope: userToDeactivate.branchScope,
          businessScope: userToDeactivate.businessScope,
          countryScope: userToDeactivate.countryScope,
        }),
      },
      targetBranchCount:
        userToDeactivate.roleKey === "gerente_area" ||
        userToDeactivate.roleKey === "gerente_sucursal"
          ? 1
          : 0,
    });

    if (!deactivationPlan.canDeactivate) {
      setMessage("No puedes desactivar usuarios de nivel igual, superior o fuera de alcance.");
      return;
    }

    const nextUsers = users.map((user) =>
      user.id === userId
        ? {
            ...user,
            deactivatedAt: todayIsoDate(),
            reassignmentRequired: deactivationPlan.requiresReassignment,
            status: "Inactivo" as const,
          }
        : user,
    );

    setUsers(nextUsers);
    if (enableDemoFixtures) {
      persistDemoUsers(nextUsers);
    }
    setMessage(deactivationPlan.reason);
  }

  return (
    <section className="grid min-w-0 gap-5">
      <form
        className="grid min-w-0 gap-5 rounded-md border bg-card p-4"
        onSubmit={createBranch}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-normal">
              <Building2 className="size-5 text-primary" />
              Alta de sucursal
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Crea sucursales por pais y linea de negocio con estado pendiente
              de gerente e historial operativo.
            </p>
          </div>
          <Badge variant={canCreateBranchesForScope ? "outline" : "secondary"}>
            {canCreateBranchesForScope ? "Alta habilitada" : "Solo lectura"}
          </Badge>
        </div>

        {!canCreateBranchesForScope ? (
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            Tu rol actual no tiene delegacion para crear sucursales.
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Pais</span>
            <select
              className={formSelectClassName}
              disabled={!canCreateBranchesForScope}
              onChange={(event) => setBranchCountryScope(event.target.value)}
              value={branchCountryScope}
            >
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Linea de negocio</span>
            <select
              className={formSelectClassName}
              disabled={!canCreateBranchesForScope}
              onChange={(event) => setBranchBusinessScope(event.target.value)}
              value={branchBusinessScope}
            >
              {businessOptions.map((business) => (
                <option key={business.value} value={business.value}>
                  {business.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Gerencia de area</span>
            <select
              className={formSelectClassName}
              disabled={!canCreateBranchesForScope}
              onChange={(event) => setBranchAreaScope(event.target.value)}
              value={branchAreaScope}
            >
              {branchAreaOptions.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Codigo</span>
            <Input
              className="h-10"
              disabled={!canCreateBranchesForScope}
              onChange={(event) => setBranchCode(event.target.value)}
              placeholder="LAB-ESCALON"
              value={branchCode}
            />
          </label>

          <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
            <span className="font-medium">Nombre de sucursal</span>
            <Input
              className="h-10"
              disabled={!canCreateBranchesForScope}
              onChange={(event) => setBranchName(event.target.value)}
              placeholder="Laboratorio Escalon"
              value={branchName}
            />
          </label>

          <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
            <span className="font-medium">Ciudad</span>
            <Input
              className="h-10"
              disabled={!canCreateBranchesForScope}
              onChange={(event) => setBranchCity(event.target.value)}
              placeholder="San Salvador"
              value={branchCity}
            />
          </label>

          <label className="grid min-w-0 gap-2 text-sm xl:col-span-4">
            <span className="font-medium">Razon de alta</span>
            <textarea
              className="min-h-24 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              disabled={!canCreateBranchesForScope}
              onChange={(event) => setBranchReason(event.target.value)}
              placeholder="Apertura aprobada para operar esta linea de negocio"
              value={branchReason}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {branchMessage ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {branchMessage}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Estado inicial: pendiente de gerente.
            </span>
          )}

          <Button
            disabled={!canCreateSelectedBranch || isCreatingBranch}
            type="submit"
          >
            <Building2 className="size-4" />
            {isCreatingBranch ? "Creando..." : "Crear sucursal"}
          </Button>
        </div>
      </form>

      <form
        className="grid min-w-0 gap-5 rounded-md border bg-card p-4"
        onSubmit={createDemoUser}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-normal">
              <UserPlus className="size-5 text-primary" />
              Crear usuario
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Crea usuarios con invitacion por correo o con contrasena temporal,
              y define su alcance por pais, linea de negocio, gerencia de area y
              sucursal. Para gerentes, define nivel y bono base; para gerentes
              de area, asigna los gerentes de sucursal a cargo.
            </p>
          </div>
          <Badge variant={canCreateUsers ? "outline" : "secondary"}>
            Actuando como {demoRoleProfiles[activeRole].label}
          </Badge>
        </div>

        {!canCreateUsers ? (
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            Tu rol actual no tiene delegacion para crear usuarios.
          </div>
        ) : null}

        <div className="grid gap-3 rounded-md border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground md:grid-cols-2">
          <span>
            <strong className="text-foreground">Roles disponibles:</strong>{" "}
            {creatableRoles.length > 0
              ? creatableRoles.map((role) => demoRoleProfiles[role].label).join(", ")
              : "ningun rol"}
          </span>
          <span>
            <strong className="text-foreground">Alcance operativo:</strong>{" "}
            Sucursales {canCreateBranchesForScope ? "puedes crear" : "solo lectura/asignadas"} ·
            Areas {canCreateAreasForScope ? "puedes crear" : "solo asignadas"}
          </span>
        </div>

        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
          <strong>Correo y contrasena:</strong> si escribes una contrasena
          temporal, el usuario queda activo y debera cambiarla al ingresar. Si
          la dejas vacia, se envia invitacion por correo.
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Nombre</span>
            <Input
              className="h-10"
              disabled={!canCreateUsers}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nombre del usuario"
              value={fullName}
            />
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Correo</span>
            <Input
              className="h-10"
              disabled={!canCreateUsers}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@analiza.com"
              type="email"
              value={email}
            />
          </label>

          <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
            <span className="font-medium">Contrasena temporal</span>
            <Input
              autoComplete="new-password"
              className="h-10"
              disabled={!canCreateUsers}
              minLength={10}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              placeholder="Minimo 10 caracteres con letras y numeros"
              type="password"
              value={temporaryPassword}
            />
            <span className="text-xs leading-5 text-muted-foreground">
              Opcional: si la completas, no se envia invitacion y el usuario
              debera cambiarla al primer ingreso.
            </span>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Rol</span>
            <select
              className={formSelectClassName}
              disabled={!canCreateUsers}
              onChange={(event) => setRoleKey(event.target.value as RoleKey)}
              value={roleKey}
            >
              {creatableRoles.map((role) => (
                <option key={role} value={role}>
                  {demoRoleProfiles[role].label}
                </option>
              ))}
            </select>
            <span className="text-xs leading-5 text-muted-foreground">
              {demoRoleProfiles[roleKey].accessSummary}
            </span>
          </label>

          {isManagerIncentiveRole(roleKey) ? (
            <>
              <label className="grid min-w-0 gap-2 text-sm">
                <span className="font-medium">Nivel de gerencia</span>
                <select
                  className={formSelectClassName}
                  disabled={!canCreateUsers}
                  onChange={(event) => {
                    const nextLevel = event.target.value;

                    if (isManagementLevel(nextLevel)) {
                      setManagementLevel(nextLevel);
                      setBaseBonusAmount(
                        String(getDefaultBaseBonusAmount(nextLevel)),
                      );
                    }
                  }}
                  value={managementLevel}
                >
                  {managementLevels.map((level) => (
                    <option key={level} value={level}>
                      {managementLevelLabels[level]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2 text-sm">
                <span className="font-medium">Bono base mensual</span>
                <Input
                  className="h-10"
                  disabled={!canCreateUsers}
                  max={10000}
                  min={1}
                  onChange={(event) => setBaseBonusAmount(event.target.value)}
                  placeholder="400"
                  step={1}
                  type="number"
                  value={baseBonusAmount}
                />
                <span className="text-xs leading-5 text-muted-foreground">
                  Recomendado = bono base x cumplimiento de meta.
                </span>
              </label>
            </>
          ) : null}

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Pais</span>
            <select
              className={formSelectClassName}
              disabled={
                !canCreateUsers || isSuperAdministrator(roleKey) || roleKey === "ceo"
              }
              onChange={(event) => setCountryScope(event.target.value)}
              value={
                isSuperAdministrator(roleKey) || roleKey === "ceo"
                  ? allCountryScope
                  : countryScope
              }
            >
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Linea de negocio</span>
            <select
              className={formSelectClassName}
              disabled={
                !canCreateUsers || isSuperAdministrator(roleKey) || roleKey === "ceo"
              }
              onChange={(event) => setBusinessScope(event.target.value)}
              value={
                isSuperAdministrator(roleKey) || roleKey === "ceo"
                  ? allBusinessScope
                  : businessScope
              }
            >
              {businessOptions.map((business) => (
                <option key={business.value} value={business.value}>
                  {business.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm">
            <span className="font-medium">Gerencia de area</span>
            <select
              className={formSelectClassName}
              disabled={
                !canCreateUsers ||
                !["gerente_area", "gerente_sucursal", "usuario_operativo"].includes(
                  roleKey,
                )
              }
              onChange={(event) => setAreaScope(event.target.value)}
              value={
                ["gerente_area", "gerente_sucursal", "usuario_operativo"].includes(
                  roleKey,
                )
                  ? areaScope
                  : allAreaScope
              }
            >
              {areaOptions.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
            <span className="font-medium">Sucursal</span>
            <select
              className={formSelectClassName}
              disabled={
                !canCreateUsers ||
                !["gerente_sucursal", "usuario_operativo"].includes(roleKey)
              }
              onChange={(event) => setBranchScope(event.target.value)}
              value={
                ["gerente_sucursal", "usuario_operativo"].includes(roleKey)
                  ? branchScope
                  : allBranchScope
              }
            >
              {branchOptions.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
          </label>

          {roleKey === "gerente_area" ? (
            <div className="grid min-w-0 gap-3 text-sm xl:col-span-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                  <span className="font-medium">Gerentes de sucursal a cargo</span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {managedBranchManagerIds.length} seleccionados
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={
                      !canCreateUsers || scopedBranchManagerOptions.length === 0
                    }
                    onClick={selectAllManagedBranchManagers}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Todos
                  </Button>
                  <Button
                    disabled={!canCreateUsers || managedBranchManagerIds.length === 0}
                    onClick={clearManagedBranchManagers}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              {areaScope === allAreaScope ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  Selecciona una gerencia de area.
                </div>
              ) : scopedBranchManagerOptions.length === 0 ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  Sin gerentes de sucursal activos en esta gerencia.
                </div>
              ) : (
                <div className="grid max-h-56 min-w-0 gap-2 overflow-y-auto rounded-md border bg-background p-3 md:grid-cols-2">
                  {scopedBranchManagerOptions.map((manager) => (
                    <label
                      className="flex min-w-0 items-start gap-3 rounded-md border bg-muted/30 p-3"
                      key={manager.id}
                    >
                      <Checkbox
                        checked={managedBranchManagerIds.includes(manager.id)}
                        disabled={!canCreateUsers}
                        onCheckedChange={(checked) =>
                          toggleManagedBranchManager(manager.id, checked === true)
                        }
                      />
                      <span className="grid min-w-0 gap-1">
                        <span className="truncate font-medium">
                          {manager.fullName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {manager.branchName ?? "Sucursal sin nombre"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {manager.baseBonusAmount
                            ? `Bono base ${formatCurrency(manager.baseBonusAmount)}`
                            : "Bono base pendiente"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {message ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {message}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Puedes crear el usuario con contrasena temporal o enviar invitacion.
            </span>
          )}

          <Button disabled={!canCreateUsers || isInviting} type="submit">
            <UserPlus className="size-4" />
            {isInviting
              ? "Guardando..."
              : temporaryPassword
                ? "Crear usuario"
                : "Enviar invitacion"}
          </Button>
        </div>
      </form>

      <form
        className="grid min-w-0 gap-4 rounded-md border bg-card p-4"
        onSubmit={resetUserPassword}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-normal">
              <KeyRound className="size-5 text-primary" />
              Resetear contrasena temporal
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Actualiza la contrasena temporal cuando un usuario pierde acceso.
              En el siguiente ingreso se le pedira crear una nueva.
            </p>
          </div>
          <Badge variant={canCreateUsers ? "outline" : "secondary"}>
            Cambio obligatorio al ingresar
          </Badge>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
            <span className="font-medium">Correo del usuario</span>
            <Input
              className="h-10"
              disabled={!canCreateUsers}
              onChange={(event) => setResetEmail(event.target.value)}
              placeholder="usuario@analiza.com"
              type="email"
              value={resetEmail}
            />
          </label>

          <label className="grid min-w-0 gap-2 text-sm xl:col-span-2">
            <span className="font-medium">Nueva contrasena temporal</span>
            <Input
              autoComplete="new-password"
              className="h-10"
              disabled={!canCreateUsers}
              minLength={10}
              onChange={(event) => setResetTemporaryPassword(event.target.value)}
              placeholder="Minimo 10 caracteres con letras y numeros"
              type="password"
              value={resetTemporaryPassword}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
          <Button
            disabled={!canCreateUsers || isResettingPassword}
            type="submit"
            variant="outline"
          >
            <KeyRound className="size-4" />
            {isResettingPassword ? "Reseteando..." : "Resetear contrasena"}
          </Button>
        </div>
      </form>

      {managerIncentives.length > 0 ? (
        <section className="grid min-w-0 gap-4 rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <div className="flex items-center gap-2 text-lg font-semibold tracking-normal">
                <BarChart3 className="size-5 text-primary" />
                Bonos configurados
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Edita nivel y bono base de gerentes bajo tu jerarquia. El bono
                recomendado usa bono base por cumplimiento de meta.
              </p>
            </div>
            <Badge variant="outline">{managerIncentives.length} asignaciones</Badge>
          </div>

          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="w-[240px] py-2 pr-4 font-medium">Gerente</th>
                  <th className="w-[170px] py-2 pr-4 font-medium">Rol</th>
                  <th className="w-[260px] py-2 pr-4 font-medium">Alcance</th>
                  <th className="w-[150px] py-2 pr-4 font-medium">Nivel</th>
                  <th className="w-[160px] py-2 pr-4 font-medium">Bono base</th>
                  <th className="w-[150px] py-2 pr-4 font-medium">Permiso</th>
                  <th className="w-[120px] py-2 pr-4 font-medium">Accion</th>
                </tr>
              </thead>
              <tbody>
                {managerIncentives.map((incentive) => {
                  const draft = managerIncentiveEdits[incentive.assignmentId] ?? {
                    baseBonusAmount: String(incentive.baseBonusAmount ?? ""),
                    managementLevel: incentive.managementLevel ?? "middle",
                  };
                  const scopeLabel =
                    incentive.branchName ??
                    incentive.operationalAreaName ??
                    incentive.businessName ??
                    incentive.countryName ??
                    "Alcance asignado";

                  return (
                    <tr className="border-b last:border-b-0" key={incentive.assignmentId}>
                      <td className="py-3 pr-4 align-top">
                        <div className="truncate font-medium">
                          {incentive.fullName}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {incentive.email ?? "Sin correo"}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {demoRoleProfiles[incentive.roleKey].label}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="truncate">{scopeLabel}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[incentive.countryName, incentive.businessName]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <select
                          className={tableSelectClassName}
                          disabled={!incentive.canEdit}
                          onChange={(event) => {
                            const nextLevel = event.target.value;

                            if (isManagementLevel(nextLevel)) {
                              updateManagerIncentiveDraft(
                                incentive.assignmentId,
                                { managementLevel: nextLevel },
                              );
                            }
                          }}
                          value={draft.managementLevel}
                        >
                          {managementLevels.map((level) => (
                            <option key={level} value={level}>
                              {managementLevelLabels[level]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <Input
                          className="h-9"
                          disabled={!incentive.canEdit}
                          max={10000}
                          min={1}
                          onChange={(event) =>
                            updateManagerIncentiveDraft(incentive.assignmentId, {
                              baseBonusAmount: event.target.value,
                            })
                          }
                          step={1}
                          type="number"
                          value={draft.baseBonusAmount}
                        />
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <Badge variant={incentive.canEdit ? "outline" : "secondary"}>
                          {incentive.canEdit ? "Editable" : "Solo lectura"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <Button
                          disabled={
                            !incentive.canEdit ||
                            savingManagerIncentiveId === incentive.assignmentId
                          }
                          onClick={() => saveManagerIncentive(incentive.assignmentId)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Save className="size-4" />
                          {savingManagerIncentiveId === incentive.assignmentId
                            ? "Guardando"
                            : "Guardar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="grid min-w-0 gap-4 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-normal">
              <ClipboardList className="size-5 text-primary" />
              Invitaciones y usuarios
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Revisa estado, alcance asignado y acciones disponibles por usuario.
            </p>
          </div>
          <Badge variant="outline">{users.length} usuarios</Badge>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[1340px] table-fixed text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="w-[220px] py-2 pr-4 font-medium">Usuario</th>
                <th className="w-[190px] py-2 pr-4 font-medium">Rol</th>
                <th className="w-[110px] py-2 pr-4 font-medium">Nivel</th>
                <th className="w-[130px] py-2 pr-4 font-medium">Bono base</th>
                <th className="w-[120px] py-2 pr-4 font-medium">A cargo</th>
                <th className="w-[140px] py-2 pr-4 font-medium">Pais</th>
                <th className="w-[170px] py-2 pr-4 font-medium">Linea</th>
                <th className="w-[190px] py-2 pr-4 font-medium">Gerencia</th>
                <th className="w-[180px] py-2 pr-4 font-medium">Sucursal</th>
                <th className="w-[150px] py-2 pr-4 font-medium">Estado</th>
                <th className="w-[120px] py-2 pr-4 font-medium">Accion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const roleOptions = Array.from(
                  new Set([user.roleKey, ...creatableRoles]),
                ).filter((role) => getRoleOptionsForValue(role).includes(role));
                const canDeactivate =
                  user.id !== "demo-admin" &&
                  user.status !== "Inactivo" &&
                  canInviteUser(actor, {
                    roleKey: user.roleKey,
                    scope: createScopeBoundary({
                      areaScope: user.areaScope,
                      branchScope: user.branchScope,
                      businessScope: user.businessScope,
                      countryScope: user.countryScope,
                    }),
                  });

                return (
                  <tr className="border-b last:border-b-0" key={user.id}>
                    <td className="py-3 pr-4">
                      <div className="truncate font-medium">{user.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        className={tableSelectClassName}
                        disabled={user.id === "demo-admin" || user.status === "Inactivo"}
                        onChange={(event) =>
                          updateUserRole(user.id, event.target.value as RoleKey)
                        }
                        value={user.roleKey}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {demoRoleProfiles[role].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getManagedUserManagementLevelLabel(user)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getManagedUserBaseBonusLabel(user)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getManagedBranchManagersLabel(user)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getCountryScopeLabel(user.countryScope ?? allCountryScope)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getBusinessScopeLabel(user.businessScope)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getAreaScopeLabel(user.areaScope)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      {getVisibleBranchScopeLabel(user.branchScope)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <Badge variant="outline">{user.status}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {user.invitationStatus
                          ? `Invitacion: ${user.invitationStatus}`
                          : user.createdAt}
                      </div>
                      {user.reassignmentRequired ? (
                        <div className="mt-1 text-xs text-amber-700">
                          Reasignacion requerida
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <Button
                        disabled={!canDeactivate}
                        onClick={() => deactivateDemoUser(user.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Desactivar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export function BusinessModuleDashboard({
  allowDemoRoleSwitch,
  actorScope,
  enableDemoFixtures = true,
  module,
  roleKey,
}: BusinessModuleDashboardProps) {
  const [context, setContext] = useState<StoredContext | null>(null);
  const config = moduleConfigs[module];

  useEffect(() => {
    function refreshContext() {
      setContext(readStoredContext());
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
    };
  }, []);

  const scopeText = useMemo(() => {
    const company = context?.companyName ?? "Vista consolidada";
    const branch = context?.branchName ?? "Todas las sucursales";
    return `${company} / ${branch}`;
  }, [context?.branchName, context?.companyName]);

  if (!config) {
    return null;
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="executive-panel grid gap-4 rounded-lg border p-5 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">{config.audience}</Badge>
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              {config.title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {config.description}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Vista actual: {scopeText}. Cambia negocio, sucursal o fechas en el
              selector superior para recalcular este panel.
            </p>
          </div>
        </div>
        <ScopeCard context={context} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {(module === "operacion" || module === "finanzas") && (
        <BusinessHealthSection />
      )}

      {module === "usuarios-permisos" ? (
        <UsersAndPermissionsManager
          allowDemoRoleSwitch={allowDemoRoleSwitch}
          actorScope={actorScope}
          context={context}
          enableDemoFixtures={enableDemoFixtures}
          roleKey={roleKey}
        />
      ) : null}

      {config.explanation && module !== "usuarios-permisos" ? (
        <section className="executive-panel rounded-lg border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4 text-primary" />
            Que significa
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {config.explanation}
          </p>
        </section>
      ) : null}

      {module !== "usuarios-permisos" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <ModuleInsights config={config} />
          <ModuleRows config={config} />
        </div>
      ) : null}
    </section>
  );
}
