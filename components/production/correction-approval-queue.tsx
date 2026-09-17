"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type QueueItem = {
  id: string;
  submission_id: string;
  period_start: string;
  period_end: string;
  request_reason: string;
  requested_at: string;
  branches?: { name?: string } | Array<{ name?: string }> | null;
  business_lines?: { name?: string } | Array<{ name?: string }> | null;
};

function relationName(value: QueueItem["branches"]) {
  return Array.isArray(value) ? value[0]?.name ?? "Sin catálogo" : value?.name ?? "Sin catálogo";
}

export function CorrectionApprovalQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/monthly-correction-requests", { cache: "no-store" });
    const body = (await response.json()) as { items?: QueueItem[]; error?: string };
    if (!response.ok) throw new Error(body.error ?? "No se pudo cargar la cola.");
    setItems(body.items ?? []);
  }, []);

  useEffect(() => { void refresh().catch((error) => setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo cargar la cola." })); }, [refresh]);

  async function decide(item: QueueItem, decision: "approved" | "rejected") {
    const reason = reasons[item.id]?.trim() ?? "";
    if (reason.length < 5) return;
    setBusy(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/monthly-submissions/${item.submission_id}/corrections/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo registrar la decisión.");
      await refresh();
      setMessage({ type: "ok", text: decision === "approved" ? "Corrección autorizada una sola vez." : "Solicitud rechazada." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo registrar la decisión." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex w-full flex-col gap-4 px-4 py-6 lg:px-6" data-route-content-ready="correction-approvals">
      <Card>
        <CardHeader>
          <CardTitle>Autorizaciones de corrección</CardTitle>
          <CardDescription>Aprueba o rechaza solicitudes de cierres publicados dentro de tu área. La autorización queda limitada al cierre y versión base indicados.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {message && <div className={`rounded-md border p-3 text-sm ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{message.type === "ok" ? <CheckCircle2 className="mr-2 inline size-4" /> : <AlertCircle className="mr-2 inline size-4" />}{message.text}</div>}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No hay solicitudes pendientes asignadas a tu cuenta.</p>}
          {items.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border p-4">
              <div className="text-sm">
                <p className="font-semibold">{relationName(item.branches)} · {relationName(item.business_lines)}</p>
                <p className="text-xs text-muted-foreground">{item.period_start} a {item.period_end}</p>
                <p className="mt-2"><strong>Motivo solicitado:</strong> {item.request_reason}</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`decision-${item.id}`}>Fundamento de tu decisión</Label>
                <textarea id={`decision-${item.id}`} className="min-h-20 rounded-md border bg-background p-3 text-sm" maxLength={1000} value={reasons[item.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void decide(item, "approved")} disabled={busy !== null || (reasons[item.id]?.trim().length ?? 0) < 5}>{busy === item.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Aprobar corrección</Button>
                <Button type="button" variant="outline" onClick={() => void decide(item, "rejected")} disabled={busy !== null || (reasons[item.id]?.trim().length ?? 0) < 5}>Rechazar</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
