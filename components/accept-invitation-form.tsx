"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AcceptInvitationFormProps = {
  email: string;
  token: string;
};

type AcceptInvitationResponse = {
  error?: string;
  ok?: boolean;
};

export function AcceptInvitationForm({
  email,
  token,
}: AcceptInvitationFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/accept-invitation", {
        body: JSON.stringify({ email, password, token }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | AcceptInvitationResponse
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ?? "No se pudo activar la invitacion.",
        );
      }

      router.push("/protected/context");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo activar la invitacion.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="invitation-email">Correo invitado</Label>
        <Input
          id="invitation-email"
          readOnly
          type="email"
          value={email}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="invitation-password">Crear contrasena</Label>
        <Input
          autoComplete="new-password"
          id="invitation-password"
          minLength={10}
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Usa al menos 10 caracteres y combina letras con numeros.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="invitation-confirm-password">
          Confirmar contrasena
        </Label>
        <Input
          autoComplete="new-password"
          id="invitation-confirm-password"
          minLength={10}
          required
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <Button className="w-full" disabled={isLoading} type="submit">
        {isLoading ? "Activando..." : "Crear contrasena e ingresar"}
      </Button>
    </form>
  );
}
