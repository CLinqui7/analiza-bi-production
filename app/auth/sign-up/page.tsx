import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Suspense } from "react";

import { AcceptInvitationForm } from "@/components/accept-invitation-form";
import { Button } from "@/components/ui/button";
import { isDemoAdminEnabled } from "@/lib/auth/demo-admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SignUpSearchParams = Promise<{
  email?: string;
  invitation?: string;
}>;

async function SignUpContent({
  searchParams,
}: {
  searchParams: SignUpSearchParams;
}) {
  const params = await searchParams;
  const invitedEmail = params.email;
  const invitationToken = params.invitation;
  const hasInvitation = Boolean(invitationToken && invitedEmail);
  const demoAdminEnabled = isDemoAdminEnabled();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-muted">
            <ShieldAlert className="size-5 text-primary" />
          </div>
          <CardTitle>
            {hasInvitation ? "Aceptar invitacion" : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            {hasInvitation
              ? "Crea tu contrasena para activar la cuenta con el rol y alcance definidos por administracion."
              : "Para usuarios reales, el webmaster/administrador crea el acceso y asigna el rol correspondiente."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {hasInvitation ? (
              <AcceptInvitationForm
                email={invitedEmail ?? ""}
                token={invitationToken ?? ""}
              />
            ) : (
              <Button asChild className="w-full">
                <Link href="/auth/login">Solicitar acceso</Link>
              </Button>
            )}
            {hasInvitation ? (
              <Button asChild className="w-full" variant="outline">
                <Link href="/auth/login">Volver al login</Link>
              </Button>
            ) : null}
            {!hasInvitation && demoAdminEnabled ? (
              <Button asChild className="w-full" variant="outline">
                <Link href="/auth/demo-admin">Entrar como Admin DEMO</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: SignUpSearchParams;
}) {
  return (
    <Suspense>
      <SignUpContent searchParams={searchParams} />
    </Suspense>
  );
}
