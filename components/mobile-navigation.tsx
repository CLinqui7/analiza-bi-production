"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getGroupedNavigationForRole,
  type NavigationItem,
} from "@/lib/navigation";
import type { RoleKey } from "@/lib/tenant/demo-context";
import { cn } from "@/lib/utils";

type MobileNavigationProps = {
  roleKey: RoleKey;
};

const businessLineByHref: Record<string, string> = {
  "/protected/fisioterapia": "business-line-fisioterapia",
  "/protected/imagenes": "business-line-imagenes",
  "/protected/laboratorio": "business-line-laboratorio",
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavigation({ roleKey }: MobileNavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const groups = getGroupedNavigationForRole(roleKey);

  function hrefForItem(item: NavigationItem) {
    const businessLineId = businessLineByHref[item.href];
    const params = new URLSearchParams(searchParams.toString());

    if (businessLineId) {
      params.set("line", businessLineId);
    }

    const serializedParams = params.toString();
    return serializedParams ? `${item.href}?${serializedParams}` : item.href;
  }

  return (
    <div className="lg:hidden">
      <Button
        aria-expanded={open}
        aria-label="Abrir navegacion principal"
        className="h-10 gap-2"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <Menu className="size-4" />
        Menu
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm">
          <button
            aria-label="Cerrar navegacion"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(88vw,360px)] flex-col bg-[#07172d] text-white shadow-2xl">
            <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-4">
              <div>
                <div className="text-sm font-semibold tracking-normal">
                  Analiza Intelligence
                </div>
                <div className="text-xs text-white/55">
                  Navegacion autorizada por rol
                </div>
              </div>
              <Button
                aria-label="Cerrar menu"
                className="text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="grid gap-4">
                <Link
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white",
                    pathname === "/protected" &&
                      "bg-[#2878ff] text-white shadow-[0_12px_24px_-18px_rgba(40,120,255,0.9)]",
                  )}
                  href="/protected"
                  onClick={() => setOpen(false)}
                >
                  <Home className="size-4 shrink-0" />
                  Inicio por rol
                </Link>

                {groups.map((group) => (
                  <section className="grid gap-1" key={group.key}>
                    <div className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-white/40">
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(pathname, item.href);

                      return (
                        <Link
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white",
                            active &&
                              "bg-white text-[#07172d] shadow-[0_14px_30px_-22px_rgba(255,255,255,0.65)] hover:bg-white hover:text-[#07172d]",
                          )}
                          href={hrefForItem(item)}
                          key={item.href}
                          onClick={() => setOpen(false)}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                      );
                    })}
                  </section>
                ))}
              </div>
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
