import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-5 py-10">
      <section className="mx-auto grid min-h-[70vh] w-full max-w-2xl place-items-center">
        <div className="w-full rounded-md border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
              <ShieldAlert className="size-6" />
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <p className="text-sm font-medium uppercase tracking-normal text-red-700">
                  Acceso no autorizado
                </p>
                <h1 className="text-3xl font-semibold tracking-normal">
                  No tienes permiso para abrir este modulo
                </h1>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                La autorizacion se valida en servidor segun rol y alcance
                asignado. Si necesitas este acceso, solicita una invitacion o
                ajuste de permisos a un administrador autorizado.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild>
                  <Link href="/protected">Volver al inicio</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/auth/login">Cambiar sesion</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
