"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UsersRound } from "lucide-react";

type ManagerIncentive = {
  assignmentId: string;
  baseBonusAmount: number | null;
  branchName: string | null;
  businessName: string | null;
  countryName: string | null;
  fullName: string;
  managementLevel: "junior" | "middle" | "senior" | null;
  operationalAreaName: string | null;
  roleKey: "gerente_area" | "gerente_sucursal";
  roleName: string;
};

type DirectoryResponse = {
  error?: string;
  managerIncentives?: ManagerIncentive[];
  ok?: boolean;
};

function formatCurrency(value: number | null) {
  return value === null
    ? "Sin bono configurado"
    : new Intl.NumberFormat("en-US", {
        currency: "USD",
        maximumFractionDigits: 2,
        style: "currency",
      }).format(value);
}

function scopeLabel(manager: ManagerIncentive) {
  return [
    manager.countryName,
    manager.businessName,
    manager.operationalAreaName ?? manager.branchName,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function OfficialManagerIncentiveDirectory() {
  const [response, setResponse] = useState<DirectoryResponse | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/users/manager-incentives", { cache: "no-store" })
      .then(async (result) => {
        const payload = (await result.json().catch(() => null)) as DirectoryResponse | null;
        return payload ?? { error: "No se pudo leer el directorio autorizado.", ok: false };
      })
      .then((payload) => {
        if (active) setResponse(payload);
      })
      .catch(() => {
        if (active) {
          setResponse({
            error: "No se pudo leer el directorio autorizado.",
            ok: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const managers = useMemo(
    () => (response?.ok === true ? response.managerIncentives ?? [] : []),
    [response],
  );
  const areaManagers = useMemo(
    () => managers.filter((manager) => manager.roleKey === "gerente_area"),
    [managers],
  );
  const branchManagers = useMemo(
    () => managers.filter((manager) => manager.roleKey === "gerente_sucursal"),
    [managers],
  );

  return (
    <section className="flex w-full min-w-0 flex-col gap-5 px-4 py-6 lg:px-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Directorio oficial
          </Badge>
          <Badge variant="outline">Acceso CEO / administración</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-card">
            <UsersRound className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              Gerentes y bonos
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Directorio y configuración vigente, bajo el alcance autorizado.
            </p>
          </div>
        </div>
      </header>

      {response === null ? (
        <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
          Cargando directorio autorizado…
        </section>
      ) : response.ok !== true ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          {response.error ?? "No hay un directorio autorizado disponible."}
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Gerentes de área</div>
              <div className="mt-2 text-2xl font-semibold">{areaManagers.length}</div>
            </article>
            <article className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Gerentes de sucursal</div>
              <div className="mt-2 text-2xl font-semibold">{branchManagers.length}</div>
            </article>
            <article className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Fuente
              </div>
              <div className="mt-2 text-sm font-semibold">Supabase V7</div>
            </article>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <div className="mb-4 text-sm font-semibold">Configuración autorizada</div>
            {managers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay gerencias activas en el alcance autorizado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Gerente</th>
                      <th className="py-2 pr-4 font-medium">Rol</th>
                      <th className="py-2 pr-4 font-medium">Alcance</th>
                      <th className="py-2 pr-4 font-medium">Nivel</th>
                      <th className="py-2 font-medium">Bono base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((manager) => (
                      <tr className="border-b last:border-b-0" key={manager.assignmentId}>
                        <td className="py-3 pr-4 font-medium">{manager.fullName}</td>
                        <td className="py-3 pr-4">{manager.roleName}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {scopeLabel(manager) || "Alcance asignado"}
                        </td>
                        <td className="py-3 pr-4">
                          {manager.managementLevel ?? "Sin nivel configurado"}
                        </td>
                        <td className="py-3 font-medium">
                          {formatCurrency(manager.baseBonusAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
