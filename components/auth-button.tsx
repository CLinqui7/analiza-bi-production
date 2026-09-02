import Link from "next/link";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";
import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { hasEnvVars } from "@/lib/utils";

export async function AuthButton() {
  const actor = await getCurrentAuthorizationActor();

  if (actor) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {actor.email}
        </span>
        <LogoutButton />
      </div>
    );
  }

  if (!hasEnvVars) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/auth/login">Ingresar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Ingresar</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Crear cuenta</Link>
      </Button>
    </div>
  );
}
