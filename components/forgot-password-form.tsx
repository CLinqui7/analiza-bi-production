"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    if (!hasEnvVars) {
      setStatus("error");
      return;
    }
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input autoComplete="email" id="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
      </div>
      <Button type="submit">Enviar instrucciones</Button>
      {status === "sent" ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Si la cuenta existe, recibirá instrucciones de recuperación.</p> : null}
      {status === "error" ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">No se pudo iniciar la recuperación. Intenta nuevamente.</p> : null}
    </form>
  );
}
