"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getGroupedNavigationForRole,
  getNavigationForRole,
  navigationItems,
  type NavigationItem,
} from "@/lib/navigation";
import {
  demoRoleProfiles,
  roleKeys,
  type RoleKey,
} from "@/lib/tenant/demo-context";

const storageKey = "analiza:sidebar-collapsed";
const roleStorageKey = "analiza:demo-role";
const roleChangeEvent = "analiza:role-change";
const businessLineByHref: Record<string, string> = {
  "/protected/fisioterapia": "business-line-fisioterapia",
  "/protected/imagenes": "business-line-imagenes",
  "/protected/laboratorio": "business-line-laboratorio",
};

type AppSidebarProps = {
  allowDemoRoleSwitch: boolean;
  roleKey: RoleKey;
};

function isActive(pathname: string, item: NavigationItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppSidebar({ allowDemoRoleSwitch, roleKey }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [activeRole, setActiveRole] = useState<RoleKey>(roleKey);
  const visibleItems = getNavigationForRole(activeRole);
  const visibleGroups = getGroupedNavigationForRole(activeRole);
  const roleProfile = demoRoleProfiles[activeRole];
  const canOpenRoleHome = ["super_admin", "webmaster_admin", "ceo"].includes(
    activeRole,
  );

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(storageKey) === "true");

    setActiveRole(roleKey);
    window.localStorage.setItem(roleStorageKey, roleKey);
    window.dispatchEvent(new Event(roleChangeEvent));
  }, [roleKey]);

  function toggleCollapsed() {
    setCollapsed((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem(storageKey, String(nextValue));
      return nextValue;
    });
  }

  function changeRole(nextRole: RoleKey) {
    setActiveRole(nextRole);
    window.localStorage.setItem(roleStorageKey, nextRole);
    window.dispatchEvent(new Event(roleChangeEvent));

    void fetch("/api/auth/demo-role", {
      body: JSON.stringify({ roleKey: nextRole }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  function hrefForItem(item: NavigationItem) {
    const businessLineId = businessLineByHref[item.href];
    const params = new URLSearchParams(searchParams.toString());

    if (!businessLineId) {
      const serializedParams = params.toString();
      return serializedParams ? `${item.href}?${serializedParams}` : item.href;
    }

    params.set("line", businessLineId);

    return `${item.href}?${params.toString()}`;
  }

  return (
    <aside
      className={cn(
        "hidden border-r border-white/10 bg-[#07172d] text-white shadow-[18px_0_55px_-44px_rgba(7,23,45,0.78)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col",
        collapsed ? "lg:w-[72px]" : "lg:w-72",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <span
          className={cn(
            "text-sm font-semibold tracking-normal",
            collapsed && "sr-only",
          )}
        >
          Analiza Intelligence
        </span>
        <Button
          className="text-white/70 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
          onClick={toggleCollapsed}
          size="icon"
          type="button"
          variant="ghost"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid gap-4">
          {canOpenRoleHome ? <Link
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white",
              pathname === "/protected" &&
                "bg-[#2878ff] text-white shadow-[0_12px_24px_-18px_rgba(40,120,255,0.9)] hover:bg-[#2878ff] hover:text-white",
              collapsed && "justify-center px-0",
            )}
            href="/protected"
            title="Inicio por rol"
          >
            <Home className="size-4 shrink-0" />
            <span className={cn(collapsed && "sr-only")}>
              Inicio por rol
            </span>
          </Link> : null}

          {visibleGroups.map((group) => (
            <section className="grid gap-1" key={group.key}>
              <div
                className={cn(
                  "px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-white/40",
                  collapsed && "sr-only",
                )}
              >
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);

                return (
                  <Link
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                      active &&
                        "bg-white text-[#07172d] shadow-[0_14px_30px_-22px_rgba(255,255,255,0.65)] hover:bg-white hover:text-[#07172d]",
                      collapsed && "justify-center px-0",
                    )}
                    href={hrefForItem(item)}
                    key={item.href}
                    title={`${group.title}: ${item.title}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className={cn(collapsed && "sr-only")}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className={cn("grid gap-2", collapsed && "sr-only")}>
          {!allowDemoRoleSwitch ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs leading-5 text-white/60">
              <div className="font-medium text-white">
                {roleProfile.label}
              </div>
              <div>{roleProfile.accessSummary}</div>
              <div className="mt-1 text-white/50">
                {visibleItems.length} de {navigationItems.length} modulos visibles
              </div>
            </div>
          ) : (
            <>
              <label className="grid gap-1 text-xs">
                <span className="font-medium text-white">Rol DEMO</span>
                <select
                  className="h-9 rounded-lg border border-white/10 bg-white px-2 text-xs text-slate-950 outline-none"
                  value={activeRole}
                  onChange={(event) => changeRole(event.target.value as RoleKey)}
                >
                  {roleKeys.map((role) => (
                    <option key={role} value={role}>
                      {demoRoleProfiles[role].label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs leading-5 text-white/60">
                <div className="font-medium text-white">{roleProfile.label}</div>
                <div>{roleProfile.accessSummary}</div>
                <div className="mt-1 text-white/50">
                  {visibleItems.length} de {navigationItems.length} modulos visibles
                </div>
              </div>
            </>
          )}
        </div>
        <div
          className={cn(
            "mt-3 border-t border-white/10 pt-3",
            collapsed && "mt-0 border-t-0 pt-0",
          )}
        >
          {collapsed ? (
            <div
              className="flex justify-center"
              title="InteractiveCore - Todos los derechos reservados"
            >
              <Image
                alt="InteractiveCore"
                className="h-8 w-7 rounded-md bg-white p-1 object-contain"
                height={128}
                src="/interactive-core/interactive-core-mark.png"
                width={113}
              />
            </div>
          ) : (
            <div className="grid justify-items-start gap-2 text-[0.62rem] leading-4 text-white/45">
              <Image
                alt="InteractiveCore"
                className="h-auto w-[92px] rounded-md bg-white px-1.5 py-1 object-contain"
                height={151}
                src="/interactive-core/interactive-core-logo.png"
                width={360}
              />
              <div>
                <div className="font-medium text-white/65">
                  InteractiveCore
                </div>
                <div>Todos los derechos reservados</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
