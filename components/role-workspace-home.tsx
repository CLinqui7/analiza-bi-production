"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getNavigationForRole,
  navigationItems,
} from "@/lib/navigation";
import {
  demoRoleProfiles,
  roleKeys,
  type RoleKey,
} from "@/lib/tenant/demo-context";
import {
  getCreatableRoles,
  roleHierarchy,
  type RoleHierarchyEntry,
} from "@/lib/tenant/delegation-policy";
import { cn } from "@/lib/utils";

const roleStorageKey = "analiza:demo-role";
const roleChangeEvent = "analiza:role-change";

type RoleWorkspaceHomeProps = {
  allowDemoRoleSwitch: boolean;
  isDemoEnvironment: boolean;
  roleKey: RoleKey;
};

type WorkspaceItem = {
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "action" | "ok";
};

type WorkspaceConfig = {
  badge: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  metrics: Array<{
    label: string;
    value: string;
    note: string;
  }>;
  inbox: WorkspaceItem[];
  shortcutHrefs: string[];
};

const adminWorkspace: WorkspaceConfig = {
  badge: "Gobierno del sistema",
  title: "Bandeja de trabajo del superadministrador",
  description:
    "Prioriza usuarios, conectores, calidad de datos y auditoria antes de entrar a dashboards densos.",
  primaryHref: "/protected/usuarios-permisos",
  primaryLabel: "Gestionar usuarios",
  metrics: [
    { label: "Usuarios", value: "Delegados", note: "por invitacion" },
    { label: "Conectores", value: "Checklist", note: "por linea" },
    { label: "Calidad", value: "Tickets", note: "con responsable" },
  ],
  inbox: [
    {
      title: "Validar permisos por alcance",
      detail: "Revisar roles, pais, linea, area y sucursal antes de activar cuentas.",
      href: "/protected/usuarios-permisos",
      tone: "action",
    },
    {
      title: "Conectores sin credenciales reales",
      detail: "Mantener fallback manual hasta que CRM/LIS/RIS tengan endpoints aprobados.",
      href: "/protected/conectores",
      tone: "critical",
    },
    {
      title: "Auditoria lista para revision",
      detail: "Cambios de asignacion y carga mensual deben conservar historial.",
      href: "/protected/auditoria",
      tone: "ok",
    },
  ],
  shortcutHrefs: [
    "/protected/usuarios-permisos",
    "/protected/conectores",
    "/protected/calidad-datos",
    "/protected/auditoria",
  ],
};

const workspaceByRole: Record<RoleKey, WorkspaceConfig> = {
  super_admin: adminWorkspace,
  webmaster_admin: adminWorkspace,
  ceo: {
    badge: "Lectura ejecutiva",
    title: "Bandeja de decisiones del CEO",
    description:
      "Empieza por salud del negocio, alertas criticas, metas pendientes y decisiones que requieren aprobacion.",
    primaryHref: "/protected/overview",
    primaryLabel: "Ver resumen ejecutivo",
    metrics: [
      { label: "Decisiones", value: "3", note: "requieren aprobacion" },
      { label: "Riesgo", value: "1 critico", note: "margen laboratorio" },
      { label: "Metas", value: "2", note: "pendientes CEO" },
    ],
    inbox: [
      {
        title: "Laboratorio crece, pero margen bajo presion",
        detail: "Validar costo de reactivos, margen y cumplimiento desde el resumen consolidado.",
        href: "/protected/overview",
        tone: "critical",
      },
      {
        title: "Metas sugeridas pendientes",
        detail: "AnaliA propone escenarios conservadores dentro del informe ejecutivo unico.",
        href: "/protected/overview",
        tone: "action",
      },
      {
        title: "Alta de sucursal por linea",
        detail: "Crear una nueva sucursal por pais y linea de negocio con historial.",
        href: "/protected/usuarios-permisos",
        tone: "action",
      },
      {
        title: "Sucursales con excepciones",
        detail: "Ver top de sucursales que requieren accion, no el ranking completo.",
        href: "/protected/sucursales",
        tone: "ok",
      },
    ],
    shortcutHrefs: [
      "/protected/overview",
      "/protected/usuarios-permisos",
      "/protected/sucursales",
    ],
  },
  gerente_operaciones: {
    badge: "Operacion por linea",
    title: "Bandeja del gerente de operaciones",
    description:
      "Entra por cierres pendientes, sucursales con riesgo, capacidad, SLA y datos faltantes.",
    primaryHref: "/protected/operacion",
    primaryLabel: "Ver resumen operativo",
    metrics: [
      { label: "Cierres pendientes", value: "5", note: "pendientes de validar" },
      { label: "Sucursales", value: "4", note: "con riesgo operativo" },
      { label: "Datos", value: "2", note: "bloqueos de calidad" },
    ],
    inbox: [
      {
        title: "Cierres mensuales incompletos",
        detail: "Priorizar sucursales con campos obligatorios pendientes antes del dia 5.",
        href: "/protected/cierres",
        tone: "critical",
      },
      {
        title: "Capacidad perdida",
        detail: "Detectar donde hay horas disponibles no convertidas en produccion.",
        href: "/protected/capacidad",
        tone: "action",
      },
      {
        title: "Calidad de datos por revisar",
        detail: "Resolver tickets de datos antes de usar insights predictivos.",
        href: "/protected/calidad-datos",
        tone: "ok",
      },
    ],
    shortcutHrefs: [
      "/protected/operacion",
      "/protected/importaciones",
      "/protected/capacidad",
      "/protected/resultados",
      "/protected/sucursales",
      "/protected/cierres",
      "/protected/calidad-datos",
      "/protected/usuarios-permisos",
    ],
  },
  gerente_area: {
    badge: "Area operativa",
    title: "Bandeja del gerente de area",
    description:
      "Supervisa sucursales asignadas, explicaciones pendientes, acciones por validar y metas de su area.",
    primaryHref: "/protected/sucursales",
    primaryLabel: "Ver mis sucursales",
    metrics: [
      { label: "Sucursales", value: "8", note: "en seguimiento" },
      { label: "Acciones", value: "4", note: "requieren evidencia" },
      { label: "Bonos", value: "2", note: "con bloqueo" },
    ],
    inbox: [
      {
        title: "Explicaciones pendientes por sucursal",
        detail: "Pedir causa y accion a gerentes antes de cerrar el periodo.",
        href: "/protected/cierres",
        tone: "critical",
      },
      {
        title: "Bonos con revision",
        detail: "Separar performance, bloqueo y coaching para evitar decisiones injustas.",
        href: "/protected/gerentes",
        tone: "action",
      },
      {
        title: "Metas del area",
        detail: "Comparar avance contra meta y periodo anterior.",
        href: "/protected/metas",
        tone: "ok",
      },
    ],
    shortcutHrefs: [
      "/protected/resultados",
      "/protected/cierres",
      "/protected/sucursales",
      "/protected/gerentes",
      "/protected/metas",
    ],
  },
  gerente_sucursal: {
    badge: "Mi sucursal",
    title: "Bandeja del gerente de sucursal",
    description:
      "Muestra solo lo que necesita completar o explicar: cierre mensual, resultados, alertas y evidencias de su sucursal.",
    primaryHref: "/protected/importaciones",
    primaryLabel: "Completar cierre mensual",
    metrics: [
      { label: "Cierre", value: "33%", note: "DEMO completado" },
      { label: "Pendientes", value: "6", note: "campos obligatorios" },
      { label: "Alertas", value: "2", note: "requieren comentario" },
    ],
    inbox: [
      {
        title: "Completar cierre de julio",
        detail: "Ingresar resultados, costos, capacidad y observaciones antes de publicar.",
        href: "/protected/importaciones",
        tone: "critical",
      },
      {
        title: "Explicar variacion de ventas",
        detail: "Agregar causa, evidencia y accion para que operaciones valide.",
        href: "/protected/mi-sucursal",
        tone: "action",
      },
      {
        title: "Revisar lectura de mi sucursal",
        detail: "Ver avance, brecha contra meta e insights dentro de una sola vista.",
        href: "/protected/mi-sucursal",
        tone: "ok",
      },
    ],
    shortcutHrefs: [
      "/protected/mi-sucursal",
      "/protected/importaciones",
      "/protected/cierres",
      "/protected/resultados",
    ],
  },
  usuario_operativo: {
    badge: "Captura operativa",
    title: "Bandeja del usuario operativo",
    description:
      "Enfoca la experiencia en completar datos asignados y resolver validaciones simples.",
    primaryHref: "/protected/plantillas",
    primaryLabel: "Abrir formulario",
    metrics: [
      { label: "Formulario", value: "Asignado", note: "por sucursal" },
      { label: "Calidad", value: "En revision", note: "por gerente" },
      { label: "Permisos", value: "Limitados", note: "sin gerencia" },
    ],
    inbox: [
      {
        title: "Capturar datos pendientes",
        detail: "Completar solo campos autorizados de la sucursal asignada.",
        href: "/protected/plantillas",
        tone: "action",
      },
      {
        title: "Corregir validaciones",
        detail: "No publicar datos con campos obligatorios incompletos.",
        href: "/protected/plantillas",
        tone: "ok",
      },
    ],
    shortcutHrefs: ["/protected/plantillas", "/protected/configuracion"],
  },
  viewer: {
    badge: "Solo lectura",
    title: "Bandeja de consulta",
    description:
      "Acceso reducido para leer informacion autorizada sin editar datos, usuarios ni permisos.",
    primaryHref: "/protected/overview",
    primaryLabel: "Ver resumen",
    metrics: [
      { label: "Acceso", value: "Lectura", note: "sin edicion" },
      { label: "Alertas", value: "Visibles", note: "segun alcance" },
      { label: "Cuenta", value: "Personal", note: "perfil propio" },
    ],
    inbox: [
      {
        title: "Consultar resumen autorizado",
        detail: "Usar la lectura ejecutiva sin cambiar datos ni configuracion.",
        href: "/protected/overview",
        tone: "ok",
      },
    ],
    shortcutHrefs: ["/protected/overview", "/protected/insights", "/protected/configuracion"],
  },
};

function readActiveRole({
  allowDemoRoleSwitch,
  fallbackRole,
}: {
  allowDemoRoleSwitch: boolean;
  fallbackRole: RoleKey;
}) {
  if (typeof window === "undefined") {
    return fallbackRole;
  }

  if (!allowDemoRoleSwitch) {
    return fallbackRole;
  }

  const storedRole = window.localStorage.getItem(roleStorageKey);
  return roleKeys.includes(storedRole as RoleKey)
    ? (storedRole as RoleKey)
    : fallbackRole;
}

function toneClass(tone: WorkspaceItem["tone"]) {
  if (tone === "critical") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  if (tone === "action") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function toneIcon(tone: WorkspaceItem["tone"]) {
  if (tone === "critical") {
    return AlertTriangle;
  }

  if (tone === "action") {
    return Clock3;
  }

  return CheckCircle2;
}

const orderedRoleHierarchy = [...roleHierarchy].sort(
  (firstRole, secondRole) =>
    secondRole.hierarchyLevel - firstRole.hierarchyLevel,
);

function getHierarchyCapabilities(entry: RoleHierarchyEntry) {
  const capabilities: string[] = [];

  if (entry.canManageGlobalPermissions) {
    capabilities.push("Permisos globales");
  }

  if (entry.canCreateBranches) {
    capabilities.push("Crea sucursales");
  }

  if (entry.canCreateOperationalAreas) {
    capabilities.push("Crea areas");
  }

  if (entry.canCreateUsers) {
    capabilities.push("Invita usuarios");
  }

  return capabilities.length > 0 ? capabilities : ["Solo lectura"];
}

function RoleHierarchyPanel({ activeRole }: { activeRole: RoleKey }) {
  const creatableRoles = getCreatableRoles(activeRole, {
    canInviteOperationalUsers: activeRole === "gerente_sucursal",
  });
  const activeEntry = roleHierarchy.find((entry) => entry.roleKey === activeRole);
  const activeCapabilities = activeEntry
    ? getHierarchyCapabilities(activeEntry)
    : ["Solo lectura"];

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Network className="size-4 text-primary" />
          Jerarquia de roles
        </div>
        <div className="flex flex-wrap gap-2">
          {activeCapabilities.map((capability) => (
            <Badge key={capability} variant="outline">
              {capability}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {orderedRoleHierarchy.map((entry) => {
          const isActiveRole = entry.roleKey === activeRole;
          const capabilities = getHierarchyCapabilities(entry);

          return (
            <article
              className={cn(
                "grid min-h-[148px] gap-3 rounded-md border bg-card p-4",
                isActiveRole && "border-primary bg-primary/5 shadow-sm",
              )}
              key={entry.roleKey}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">
                    {demoRoleProfiles[entry.roleKey].label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Nivel {entry.hierarchyLevel}
                  </div>
                </div>
                {isActiveRole ? <Badge>Actual</Badge> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {capabilities.map((capability) => (
                  <Badge
                    className="bg-muted text-muted-foreground hover:bg-muted"
                    key={capability}
                  >
                    {capability}
                  </Badge>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-md border bg-card p-4 text-sm leading-6 md:grid-cols-3">
        <div className="flex gap-2">
          <ShieldCheck className="mt-1 size-4 shrink-0 text-primary" />
          <span>
            <strong>Rol activo:</strong> {demoRoleProfiles[activeRole].label}
          </span>
        </div>
        <div className="flex gap-2">
          <UsersRound className="mt-1 size-4 shrink-0 text-primary" />
          <span>
            <strong>Puede invitar:</strong>{" "}
            {creatableRoles.length > 0
              ? creatableRoles.map((role) => demoRoleProfiles[role].label).join(", ")
              : "sin delegacion"}
          </span>
        </div>
        <div className="flex gap-2">
          <Building2 className="mt-1 size-4 shrink-0 text-primary" />
          <span>
            <strong>Sucursales:</strong>{" "}
            {activeEntry?.canCreateBranches ? "alta habilitada" : "solo lectura"}
          </span>
        </div>
      </div>
    </section>
  );
}

export function RoleWorkspaceHome({
  allowDemoRoleSwitch,
  isDemoEnvironment,
  roleKey,
}: RoleWorkspaceHomeProps) {
  const searchParams = useSearchParams();
  const [activeRole, setActiveRole] = useState<RoleKey>(roleKey);

  useEffect(() => {
    function refreshRole() {
      setActiveRole(
        readActiveRole({
          allowDemoRoleSwitch,
          fallbackRole: roleKey,
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
  }, [allowDemoRoleSwitch, roleKey]);

  const visibleNavigation = useMemo(
    () => getNavigationForRole(activeRole),
    [activeRole],
  );
  const workspace = workspaceByRole[activeRole];
  const visibleMetrics = isDemoEnvironment
    ? workspace.metrics
    : [
        {
          label: "Fuente BI",
          note: "sin demo",
          value: "Cierres publicados",
        },
        {
          label: "Metas",
          note: "aprobadas",
          value: "Oficiales",
        },
        {
          label: "Insights",
          note: "calculados",
          value: "Desde cierres",
        },
      ];
  const visibleInbox = isDemoEnvironment
    ? workspace.inbox
    : activeRole === "ceo"
      ? [
          {
            detail:
              "Abrir el resumen ejecutivo para revisar salud financiera, metas, insights y riesgos en una sola lectura.",
            href: "/protected/overview",
            title: "Revisar informe ejecutivo unico",
            tone: "ok" as const,
          },
          {
            detail:
              "Crear o revisar sucursales sin abrir reportes financieros duplicados.",
            href: "/protected/usuarios-permisos",
            title: "Gobernar sucursales y alcance",
            tone: "action" as const,
          },
        ]
      : activeRole === "gerente_sucursal"
        ? [
            {
              detail:
                "Abrir la vista de sucursal para revisar cierre publicado, metas, brecha e insights sin duplicar pestanas.",
              href: "/protected/mi-sucursal",
              title: "Revisar informe unico de sucursal",
              tone: "ok" as const,
            },
            {
              detail:
                "Completar o corregir el cierre mensual autorizado para la sucursal asignada.",
              href: "/protected/importaciones",
              title: "Actualizar datos de mi sucursal",
              tone: "action" as const,
            },
          ]
        : [
            {
              detail:
                "Abrir el resumen ejecutivo para revisar cierres publicados, metas e insights autorizados.",
              href: "/protected/overview",
              title: "Revisar resultados oficiales",
              tone: "ok" as const,
            },
            {
              detail:
                "Confirmar que las metas activas tengan aprobacion antes de usarlas para cumplimiento.",
              href: "/protected/metas",
              title: "Validar metas aprobadas",
              tone: "action" as const,
            },
            {
              detail:
                "Atender primero los insights de cierres publicados con mayor severidad.",
              href: "/protected/insights",
              title: "Priorizar insights oficiales",
              tone: "action" as const,
            },
          ];
  const shortcutItems = workspace.shortcutHrefs
    .map((href) => navigationItems.find((item) => item.href === href))
    .filter((item): item is (typeof navigationItems)[number] => {
      if (!item) {
        return false;
      }

      return visibleNavigation.some((visible) => visible.href === item.href);
    });

  function hrefWithCurrentContext(href: string) {
    const serializedParams = searchParams.toString();

    if (!serializedParams || !href.startsWith("/protected")) {
      return href;
    }

    const [pathname, rawQuery = ""] = href.split("?");
    const nextParams = new URLSearchParams(serializedParams);

    for (const [key, value] of new URLSearchParams(rawQuery)) {
      nextParams.set(key, value);
    }

    const nextQuery = nextParams.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_340px] xl:items-end">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isDemoEnvironment ? (
              <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
                Entorno DEMO
              </Badge>
            ) : (
              <Badge className="w-fit bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Datos oficiales
              </Badge>
            )}
            <Badge variant="outline">{workspace.badge}</Badge>
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              {workspace.title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {workspace.description}
            </p>
          </div>
        </div>

        <aside className="rounded-md border bg-card p-4 text-sm">
          <div className="mb-2 font-medium">
            {demoRoleProfiles[activeRole].label}
          </div>
          <p className="leading-6 text-muted-foreground">
            {demoRoleProfiles[activeRole].accessSummary}
          </p>
          <div className="mt-3 text-xs text-muted-foreground">
            {visibleNavigation.length} de {navigationItems.length} modulos visibles
          </div>
        </aside>
      </div>

      <RoleHierarchyPanel activeRole={activeRole} />

      <section className="grid gap-3">
        <div className="text-sm font-medium">Lectura en 10 segundos</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visibleMetrics.map((metric) => (
            <article className="rounded-md border bg-card p-4" key={metric.label}>
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-normal">
                {metric.value}
              </div>
              <Badge className="mt-3 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
                {metric.note}
              </Badge>
            </article>
          ))}
          <article className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <div className="text-sm text-muted-foreground">Accion inicial</div>
            <div className="mt-2 text-lg font-semibold tracking-normal">
              {workspace.primaryLabel}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Entrar por la pantalla recomendada antes de abrir dashboards de
              detalle.
            </p>
          </article>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="size-4 text-primary" />
            Que necesita decidir o completar este rol ahora
          </div>
          <div className="grid gap-3">
            {visibleInbox.map((item) => {
              const Icon = toneIcon(item.tone);

              return (
                <Link
                  className={cn(
                    "grid gap-2 rounded-md border p-4 transition-colors hover:bg-accent/40",
                    toneClass(item.tone),
                  )}
                  href={hrefWithCurrentContext(item.href)}
                  key={item.title}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="size-4" />
                      {item.title}
                    </div>
                    <ArrowRight className="size-4" />
                  </div>
                  <p className="text-sm leading-6 opacity-80">{item.detail}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="grid gap-4">
          <div className="rounded-md border bg-card p-4">
            <div className="mb-3 text-sm font-medium">Acceso recomendado</div>
            <Button asChild className="w-full justify-between">
              <Link href={hrefWithCurrentContext(workspace.primaryHref)}>
                {workspace.primaryLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-md border bg-card p-4">
            <div className="mb-3 text-sm font-medium">Atajos por rol</div>
            <div className="grid gap-2">
              {shortcutItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    href={hrefWithCurrentContext(item.href)}
                    key={item.href}
                  >
                    <Icon className="size-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
