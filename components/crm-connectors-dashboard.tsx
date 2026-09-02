"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Copy,
  DatabaseZap,
  LockKeyhole,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { crmConnectorPlans } from "@/lib/analytics/business-control-center";
import { useActiveBusinessLine } from "@/hooks/use-active-business-line";

type ConnectorStatusRow = {
  connectorId: string;
  coverage: number;
  datasetType: string;
  errors: string[];
  freshness: "fresh" | "stale" | "unknown";
  frequency: string;
  lastDataReceivedAt: string | null;
  lastSyncAt: string | null;
  name: string;
  nextSyncAt: string | null;
  owner: string;
  processedRecords: number;
  rejectedRecords: number;
  retries: number;
  sourceType: string;
  status: "Conectado" | "Sin configurar" | "Error" | "Pausado" | "Pendiente";
};

function sourceStatusClass(status: ConnectorStatusRow["status"]) {
  if (status === "Conectado") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "Error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (status === "Sin configurar" || status === "Pendiente") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function CrmConnectorsDashboard() {
  const activeBusinessLine = useActiveBusinessLine();
  const [baseUrl, setBaseUrl] = useState("https://crm.analiza.local");
  const [connectorStatuses, setConnectorStatuses] = useState<ConnectorStatusRow[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const visiblePlans = useMemo(
    () =>
      activeBusinessLine.isConsolidated
        ? crmConnectorPlans
        : crmConnectorPlans.filter(
            (plan) => plan.line === activeBusinessLine.line,
          ),
    [activeBusinessLine.isConsolidated, activeBusinessLine.line],
  );

  useEffect(() => {
    let isMounted = true;

    fetch("/api/connectors/status")
      .then((response) => response.json())
      .then((payload: { connectors?: ConnectorStatusRow[] }) => {
        if (isMounted) {
          setConnectorStatuses(payload.connectors ?? []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotice("No se pudo consultar estado de conectores.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function copyEndpoint(path: string) {
    const endpoint = `${baseUrl}${path}`;

    try {
      await navigator.clipboard.writeText(endpoint);
      setNotice(`Endpoint copiado: ${endpoint}`);
    } catch {
      setNotice(endpoint);
    }
  }

  async function testConnector(connectorId: string) {
    const response = await fetch(`/api/connectors/${connectorId}/test`, {
      method: "POST",
    });
    const payload = (await response.json()) as { message?: string; error?: string };

    setNotice(payload.message ?? payload.error ?? "Prueba de conexion finalizada.");
  }

  async function syncConnector(connectorId: string) {
    const response = await fetch(`/api/connectors/${connectorId}/sync`, {
      body: JSON.stringify({ period: "2026-07", publish: false }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json()) as {
      error?: string;
      processedRecords?: number;
      status?: string;
    };

    setNotice(
      payload.error ??
        `Sync ${payload.status ?? "finalizado"} con ${payload.processedRecords ?? 0} registros.`,
    );
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Credenciales protegidas</Badge>
            <Badge variant="outline">Fuentes y Conectores</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <DatabaseZap className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Conectores CRM por linea de negocio
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Supervisa conexiones, credenciales protegidas y respaldo manual
                para conectar el CRM de cada linea. Si una fuente no esta
                configurada, las plantillas siguen alimentando el sistema con
                trazabilidad.
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-md border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-primary" />
            Regla de seguridad
          </div>
          <p className="leading-6 text-muted-foreground">
            No se debe pegar una llave real en el navegador, Excel o dashboard.
            Produccion debe crearla en un entorno protegido, guardarla cifrada y mostrar
            solo ultimos 4 caracteres.
          </p>
        </aside>
      </div>

      {notice ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4">
        <div className="rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <PlugZap className="size-4 text-primary" />
            <span className="font-medium">Filtro superior activo:</span>
            <Badge variant="outline">{activeBusinessLine.line}</Badge>
            <span className="text-muted-foreground">
              {activeBusinessLine.isConsolidated
                ? "Se muestran todas las lineas. Elige una linea arriba para concentrar la configuracion."
                : "Solo se muestran endpoints y requisitos de esta linea."}
            </span>
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-normal">
                Fuentes y Conectores
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Estado operativo: conectado, sin configurar, error, pausado o
                pendiente. Las credenciales reales se leen solo desde variables
                de servidor.
              </p>
            </div>
            <RefreshCcw className="size-5 text-primary" />
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Fuente</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 font-medium">Sync</th>
                  <th className="py-2 pr-4 font-medium">Registros</th>
                  <th className="py-2 pr-4 font-medium">Cobertura</th>
                  <th className="py-2 pr-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {connectorStatuses.map((connector) => (
                  <tr className="border-b last:border-b-0" key={connector.connectorId}>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{connector.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {connector.sourceType} · {connector.datasetType} · {connector.owner}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={sourceStatusClass(connector.status)}>
                        {connector.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      <div>Ultimo: {connector.lastSyncAt ?? "pendiente"}</div>
                      <div>Proximo: {connector.nextSyncAt ?? "pendiente"}</div>
                    </td>
                    <td className="py-3 pr-4">
                      {connector.processedRecords} procesados /{" "}
                      {connector.rejectedRecords} rechazados
                    </td>
                    <td className="py-3 pr-4">{connector.coverage}%</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => testConnector(connector.connectorId)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <ShieldCheck className="size-4" />
                          Probar
                        </Button>
                        <Button
                          onClick={() => syncConnector(connector.connectorId)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <RefreshCcw className="size-4" />
                          Actualizar datos
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 md:hidden">
            {connectorStatuses.map((connector) => (
              <article
                className="grid gap-3 rounded-md border bg-background p-3 text-sm"
                key={`${connector.connectorId}-mobile`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{connector.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {connector.sourceType} · {connector.datasetType}
                    </div>
                  </div>
                  <Badge className={sourceStatusClass(connector.status)}>
                    {connector.status}
                  </Badge>
                </div>
                <dl className="grid gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Ultima actualizacion</dt>
                    <dd>{connector.lastSyncAt ?? "pendiente"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Proxima actualizacion</dt>
                    <dd>{connector.nextSyncAt ?? "pendiente"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Registros</dt>
                    <dd>
                      {connector.processedRecords} / {connector.rejectedRecords}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Vigencia</dt>
                    <dd>{connector.freshness}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Cobertura</dt>
                    <dd>{connector.coverage}%</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => testConnector(connector.connectorId)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ShieldCheck className="size-4" />
                    Probar
                  </Button>
                  <Button
                    onClick={() => syncConnector(connector.connectorId)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RefreshCcw className="size-4" />
                    Actualizar datos
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {connectorStatuses.some((connector) => connector.errors.length > 0) ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" />
                Credenciales o errores pendientes
              </div>
              {connectorStatuses
                .filter((connector) => connector.errors.length > 0)
                .map((connector) => (
                  <div key={connector.connectorId}>
                    {connector.name}: {connector.errors.join(" ")}
                  </div>
                ))}
            </div>
          ) : null}
        </div>

        {visiblePlans.map((selectedPlan) => (
          <div className="rounded-md border bg-card p-4" key={selectedPlan.line}>
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{selectedPlan.line}</h2>
                <Badge variant="outline">{selectedPlan.owner}</Badge>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  DEMO
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Objeto CRM: {selectedPlan.crmObject}
              </p>
            </div>

            <div className="rounded-md border bg-background p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <LockKeyhole className="size-4 text-primary" />
                Credencial protegida
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                No se generan ni muestran llaves reales en el navegador. La
                integracion usa variables de servidor y fallback manual cuando
                faltan credenciales.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">URL base del CRM o API gateway</span>
                <Input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                />
              </label>

              <div className="grid gap-3">
                {selectedPlan.endpoints.map((endpoint) => (
                  <article className="rounded-md border bg-background p-3" key={endpoint.path}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Badge variant="outline">{endpoint.method}</Badge>
                          <span className="font-mono text-xs">{endpoint.path}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {endpoint.purpose}
                        </p>
                      </div>
                      <Button
                        onClick={() => copyEndpoint(endpoint.path)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Copy className="size-4" />
                        Copiar endpoint
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                      <div>
                        <div className="font-medium">Campos minimos</div>
                        <p className="mt-1 text-muted-foreground">
                          {endpoint.requiredFields.join(", ")}
                        </p>
                      </div>
                      <div>
                        <div className="font-medium">Alimenta</div>
                        <p className="mt-1 text-muted-foreground">
                          {endpoint.feedsModules.join(", ")}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="grid gap-3">
              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ClipboardList className="size-4 text-primary" />
                  Paso a paso
                </div>
                <ol className="grid gap-2 text-sm leading-6 text-muted-foreground">
                  {selectedPlan.setupSteps.map((step, index) => (
                    <li className="flex gap-2" key={step}>
                      <span className="font-semibold text-foreground">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <LockKeyhole className="size-4 text-primary" />
                  Se necesita
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  {selectedPlan.requirements.map((requirement) => (
                    <span className="flex gap-2" key={requirement}>
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {requirement}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 text-sm font-medium">Fallback sin conector</div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Si no existe API viable, cargar masivamente:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPlan.fallbackDocuments.map((document) => (
                    <Badge key={document} variant="outline">{document}</Badge>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
        ))}
      </section>
    </section>
  );
}
