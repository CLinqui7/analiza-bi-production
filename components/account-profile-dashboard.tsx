"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Loader2, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountProfile = {
  branchName: string | null;
  companyName: string | null;
  countryName: string | null;
  displayName: string;
  email: string;
  jobTitle: string;
  operationalAreaName: string | null;
  organizationName: string | null;
  phone: string;
  photoUrl: string;
  preferredName: string;
  roleKey: string;
};

type AccountProfileResponse = {
  editable?: boolean;
  error?: string;
  ok?: boolean;
  profile?: AccountProfile;
};

function roleLabel(roleKey: string) {
  return roleKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(profile: AccountProfile | null) {
  const source = profile?.preferredName || profile?.displayName || profile?.email || "AI";

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AccountProfileDashboard() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [editable, setEditable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/account/profile", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | AccountProfileResponse
          | null;

        if (!response.ok || payload?.ok !== true || !payload.profile) {
          throw new Error(payload?.error ?? "No se pudo cargar tu perfil.");
        }

        if (isMounted) {
          setEditable(payload.editable === true);
          setProfile(payload.profile);
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar tu perfil.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const scopeItems = useMemo(
    () => [
      { label: "Organizacion", value: profile?.organizationName },
      { label: "Pais", value: profile?.countryName },
      { label: "Empresa", value: profile?.companyName },
      { label: "Area", value: profile?.operationalAreaName },
      { label: "Sucursal", value: profile?.branchName },
    ],
    [profile],
  );

  function updateField(field: keyof AccountProfile, value: string) {
    setSaved(false);
    setProfile((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setError(null);
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        body: JSON.stringify({
          displayName: profile.displayName,
          jobTitle: profile.jobTitle,
          phone: profile.phone,
          photoUrl: profile.photoUrl,
          preferredName: profile.preferredName,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => null)) as
        | AccountProfileResponse
        | null;

      if (!response.ok || payload?.ok !== true || !payload.profile) {
        throw new Error(payload?.error ?? "No se pudo guardar tu perfil.");
      }

      setEditable(payload.editable === true);
      setProfile(payload.profile);
      setSaved(true);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar tu perfil.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          Cargando perfil...
        </div>
      </section>
    );
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Mi cuenta</Badge>
            <Badge variant="outline">Perfil personal</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <UserRound className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Perfil de usuario
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Actualiza tu foto, datos personales y datos de contacto sin
                cambiar permisos ni alcance operativo.
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-md border bg-card p-4 text-sm leading-6 text-muted-foreground">
          El rol, pais, empresa, area y sucursal vienen de la autorizacion de
          la plataforma. Esta pantalla no permite ampliar permisos ni cambiar
          jerarquia.
        </aside>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {profile ? (
        <form className="grid gap-4 xl:grid-cols-[360px_1fr]" onSubmit={saveProfile}>
          <aside className="rounded-md border bg-card p-5">
            <div className="mx-auto flex size-36 items-center justify-center overflow-hidden rounded-full border bg-muted text-3xl font-semibold text-primary">
              {profile.photoUrl ? (
                <span
                  aria-label="Foto de perfil"
                  className="h-full w-full object-cover"
                  role="img"
                  style={{
                    backgroundImage: `url("${profile.photoUrl.replaceAll("\"", "%22")}")`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                />
              ) : (
                initials(profile)
              )}
            </div>
            <div className="mt-4 text-center">
              <div className="text-lg font-semibold">
                {profile.preferredName || profile.displayName}
              </div>
              <div className="text-sm text-muted-foreground">{profile.email}</div>
              <Badge className="mt-3" variant="outline">
                {roleLabel(profile.roleKey)}
              </Badge>
            </div>

            <div className="mt-5 grid gap-2 text-sm">
              {scopeItems.map((item) =>
                item.value ? (
                  <div
                    className="rounded-md border bg-background px-3 py-2"
                    key={item.label}
                  >
                    <div className="text-xs text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="font-medium">{item.value}</div>
                  </div>
                ) : null,
              )}
            </div>
          </aside>

          <section className="rounded-md border bg-card p-5">
            <div className="mb-5 flex items-center gap-2 text-sm font-medium">
              <Camera className="size-4 text-primary" />
              Datos personales
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="display-name">Nombre completo</Label>
                <Input
                  disabled={!editable}
                  id="display-name"
                  required
                  value={profile.displayName}
                  onChange={(event) =>
                    updateField("displayName", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preferred-name">Nombre preferido</Label>
                <Input
                  disabled={!editable}
                  id="preferred-name"
                  value={profile.preferredName}
                  onChange={(event) =>
                    updateField("preferredName", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  disabled={!editable}
                  id="phone"
                  inputMode="tel"
                  value={profile.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-title">Cargo</Label>
                <Input
                  disabled={!editable}
                  id="job-title"
                  value={profile.jobTitle}
                  onChange={(event) =>
                    updateField("jobTitle", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="photo-url">URL de foto</Label>
                <Input
                  disabled={!editable}
                  id="photo-url"
                  placeholder="https://..."
                  type="url"
                  value={profile.photoUrl}
                  onChange={(event) =>
                    updateField("photoUrl", event.target.value)
                  }
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Usa una URL HTTPS de una imagen autorizada. La plataforma no
                  sube archivos desde esta pantalla.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button disabled={!editable || isSaving} type="submit">
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  "Guardar perfil"
                )}
              </Button>
              {saved ? (
                <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  Perfil actualizado
                </span>
              ) : null}
              {!editable ? (
                <span className="text-sm text-muted-foreground">
                  Perfil de demostracion no editable.
                </span>
              ) : null}
            </div>
          </section>
        </form>
      ) : null}
    </section>
  );
}
