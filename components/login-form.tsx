"use client";

import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn, hasEnvVars } from "@/lib/utils";

const roleStorageKey = "analiza:demo-role";
const businessLineStorageKey = "analiza:demo-business-line";
const roleChangeEvent = "analiza:role-change";

type DemoBusinessLineCode = "PHYSIOTHERAPY" | "LABORATORY" | "IMAGING";

type DemoLoginProfile = {
  label: string;
  roleKey:
    | "super_admin"
    | "ceo"
    | "gerente_operaciones"
    | "gerente_area"
    | "gerente_sucursal"
    | "usuario_operativo"
    | "viewer";
};

const demoLoginProfiles: DemoLoginProfile[] = [
  { label: "Direccion / Super Admin", roleKey: "super_admin" },
  { label: "CEO / Direccion Ejecutiva", roleKey: "ceo" },
  { label: "Gerente de Operaciones", roleKey: "gerente_operaciones" },
  { label: "Gerente de Area", roleKey: "gerente_area" },
  { label: "Gerente de Sucursal", roleKey: "gerente_sucursal" },
  { label: "Usuario Operativo", roleKey: "usuario_operativo" },
  { label: "Viewer", roleKey: "viewer" },
];

const demoBusinessLineProfiles: {
  code: DemoBusinessLineCode;
  label: string;
}[] = [
  { code: "IMAGING", label: "Analiza Imagenes" },
  { code: "LABORATORY", label: "Analiza Laboratorio" },
  { code: "PHYSIOTHERAPY", label: "Analiza Fisioterapia" },
];

const intelligenceSignals = [
  {
    label: "Operacion",
    metric: "87%",
    note: "Ocupacion",
  },
  {
    label: "Finanzas",
    metric: "+12.4%",
    note: "vs periodo anterior",
  },
  {
    label: "Insights",
    metric: "3",
    note: "alertas prioritarias",
  },
];

const valuePillars = [
  {
    title: "Confiable",
    text: "Datos validados y trazables.",
  },
  {
    title: "Integrado",
    text: "Tres lineas en un solo ecosistema.",
  },
  {
    title: "Inteligente",
    text: "Informacion convertida en decisiones.",
  },
];

export function LoginForm({
  enableLocalDemoLogin = false,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  enableLocalDemoLogin?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeDemoRole, setActiveDemoRole] =
    useState<DemoLoginProfile["roleKey"]>("gerente_sucursal");
  const [activeDemoBusinessLine, setActiveDemoBusinessLine] =
    useState<DemoBusinessLineCode>("LABORATORY");
  const router = useRouter();

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/demo-session", {
        body: JSON.stringify({
          businessLineCode: activeDemoBusinessLine,
          roleKey: activeDemoRole,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "No se pudo iniciar el entorno DEMO local.");
      }

      window.localStorage.setItem(roleStorageKey, activeDemoRole);
      window.localStorage.setItem(businessLineStorageKey, activeDemoBusinessLine);
      window.dispatchEvent(new Event(roleChangeEvent));
      router.push("/protected/context");
      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo completar el acceso. Intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const demoResponse = await fetch("/auth/demo-admin", {
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (demoResponse.ok) {
        router.push("/protected/context");
        router.refresh();
        return;
      }

      // Production users already live in the previous Supabase project. Prefer
      // that authentication source so the migration keeps the existing user
      // directory intact instead of forcing a second password store.
      let supabaseLoginError: Error | null = null;

      if (hasEnvVars) {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error) {
          router.push("/protected/context");
          router.refresh();
          return;
        }

        supabaseLoginError = error;
      }

      // Compatibility fallback for installations that still use the local
      // PostgreSQL password flow from the original project.
      const localResponse = await fetch("/api/auth/local-login", {
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (localResponse.ok) {
        const localPayload = (await localResponse.json().catch(() => null)) as
          | { redirectTo?: string }
          | null;

        router.push(localPayload?.redirectTo ?? "/protected/context");
        router.refresh();
        return;
      }

      const localPayload = (await localResponse.json().catch(() => null)) as
        | { error?: string }
        | null;

      throw new Error(
        supabaseLoginError?.message ??
          localPayload?.error ??
          "Usuario o contrasena incorrectos.",
      );
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo completar el acceso. Intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className={cn(
        "min-h-svh w-full overflow-x-hidden bg-[#f7f8fa] text-slate-950",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-svh w-full items-stretch justify-center p-0 sm:p-6 xl:p-8">
        <section className="flex w-full max-w-[1350px] flex-col overflow-hidden bg-white shadow-[0_44px_90px_-46px_rgba(7,23,45,0.30),0_2px_10px_rgba(16,24,40,0.04)] sm:min-h-[calc(100svh-3rem)] sm:rounded-lg lg:min-h-[min(816px,calc(100svh-4rem))] lg:flex-row">
          <aside className="relative hidden flex-[0_0_54%] overflow-hidden bg-[#07172d] px-11 py-11 text-white lg:flex xl:px-14 xl:py-14">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(circle_at_32%_18%,#000_0%,transparent_74%)]" />
            <div className="absolute right-0 top-0 h-40 w-full bg-[linear-gradient(90deg,transparent,rgba(40,120,255,.22),transparent)] blur-2xl" />
            <div className="absolute bottom-0 left-0 h-36 w-full bg-[linear-gradient(90deg,rgba(23,75,122,.20),transparent)] blur-xl" />
            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full opacity-50"
              preserveAspectRatio="none"
              viewBox="0 0 700 900"
            >
              <path
                d="M-40 220 C 200 140 360 360 720 260"
                fill="none"
                stroke="rgba(255,255,255,.06)"
                strokeWidth="1.2"
              />
              <path
                d="M-40 340 C 240 260 420 500 760 380"
                fill="none"
                stroke="rgba(40,120,255,.10)"
                strokeWidth="1.2"
              />
            </svg>

            <div className="relative z-10 flex h-full min-h-[680px] w-full flex-col">
              <div className="flex items-center gap-4">
                <Image
                  alt="Analiza"
                  className="h-[30px] w-auto"
                  height={114}
                  priority
                  src="/login-redesign/logo-analiza-white.png"
                  width={455}
                />
                <div className="h-[30px] w-px bg-white/20" />
                <div>
                  <div className="text-[11.5px] font-semibold tracking-[0.15em]">
                    ANALIZA INTELLIGENCE
                  </div>
                  <div className="mt-1 text-xs tracking-[0.01em] text-[#8fa6c4]">
                    Plataforma de inteligencia ejecutiva
                  </div>
                </div>
              </div>

              <div className="mt-6 inline-flex w-fit items-center rounded-lg bg-white/95 px-4 py-2 shadow-[0_10px_30px_-14px_rgba(0,0,0,.6)]">
                <Image
                  alt="Fisioterapia, Laboratorios, Imagenes"
                  className="h-5 w-auto"
                  height={48}
                  src="/login-redesign/logo-ecosystem.png"
                  width={456}
                />
              </div>

              <div className="mt-12 max-w-[520px]">
                <h1 className="text-[clamp(2.25rem,3.4vw,3.15rem)] font-semibold leading-[1.08] tracking-normal">
                  Convierte operacion en{" "}
                  <span className="text-[#2878ff] drop-shadow-[0_0_26px_rgba(40,120,255,.35)]">
                    inteligencia.
                  </span>
                </h1>
                <p className="mt-5 max-w-[468px] text-[15.5px] leading-7 text-[#9cb2ce]">
                  Una plataforma ejecutiva para monitorear rendimiento, metas,
                  capacidad e insights de Fisioterapia, Laboratorio e Imagenes.
                </p>
              </div>

              <div className="relative mt-10 h-[230px] w-full max-w-[452px]">
                <svg
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full overflow-visible"
                  viewBox="0 0 452 230"
                >
                  <path
                    d="M112 56 L 336 116"
                    stroke="rgba(120,160,220,.28)"
                    strokeDasharray="3 4"
                    strokeWidth="1"
                  />
                  <path
                    d="M336 116 L 112 178"
                    stroke="rgba(120,160,220,.28)"
                    strokeDasharray="3 4"
                    strokeWidth="1"
                  />
                  <circle cx="112" cy="56" fill="#2878ff" r="2.5" />
                  <circle cx="336" cy="116" fill="#2878ff" r="2.5" />
                  <circle cx="112" cy="178" fill="#2878ff" r="2.5" />
                </svg>
                {intelligenceSignals.map((signal, index) => (
                  <div
                    className={cn(
                      "absolute rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-[0_20px_40px_-24px_rgba(0,0,0,.6)] backdrop-blur-md",
                      index === 0 && "left-0 top-0 w-[214px]",
                      index === 1 && "right-0 top-16 w-[222px]",
                      index === 2 && "left-0 top-[146px] w-[230px]",
                    )}
                    key={signal.label}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fa6c4]">
                      0{index + 1} · {signal.label}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-[26px] font-semibold text-white">
                        {signal.metric}
                      </span>
                      <span className="text-xs text-[#9cb2ce]">
                        {signal.note}
                      </span>
                    </div>
                    {index === 0 && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[87%] rounded-full bg-[#2878ff]" />
                      </div>
                    )}
                    {index === 1 && (
                      <svg
                        aria-hidden="true"
                        className="mt-3"
                        fill="none"
                        height="34"
                        viewBox="0 0 64 34"
                        width="64"
                      >
                        <path
                          d="M2 28 L14 22 L24 25 L34 14 L46 17 L62 4"
                          stroke="#2878ff"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <circle cx="62" cy="4" fill="#2878ff" r="2.6" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-auto grid grid-cols-3 gap-8 pt-10">
                {valuePillars.map((pillar) => (
                  <div key={pillar.title}>
                    <div className="mb-3 h-0.5 w-6 rounded-full bg-[#2878ff]" />
                    <div className="text-sm font-semibold text-white">
                      {pillar.title}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#8296b4]">
                      {pillar.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="relative flex flex-1 flex-col justify-start bg-white px-6 py-10 sm:px-11 sm:py-12 lg:justify-center lg:px-12 xl:px-16">
            <div className="mx-auto w-full max-w-[452px]">
              <div className="flex items-center justify-between gap-4">
                <Image
                  alt="Analiza"
                  className="h-[30px] w-auto"
                  height={114}
                  priority
                  src="/login-redesign/logo-analiza-word.png"
                  width={455}
                />
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 lg:hidden">
                  Intelligence
                </div>
              </div>

              <div className="mt-8 rounded-lg border border-slate-200 bg-[#07172d] p-5 text-white shadow-[0_18px_50px_-34px_rgba(7,23,45,.75)] lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8fa6c4]">
                  Analiza Intelligence
                </p>
                <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-normal">
                  Operacion clara para decisiones ejecutivas.
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#9cb2ce]">
                  Fisioterapia, Laboratorio e Imagenes en una sola vista.
                </p>
              </div>

              <div className="mt-8">
                <h2 className="text-[27px] font-semibold leading-tight tracking-normal text-slate-950">
                  Iniciar sesion
                </h2>
                <p className="mt-2 text-[15px] text-slate-500">
                  Accede a Analiza Intelligence con tu cuenta asignada.
                </p>
              </div>

              {enableLocalDemoLogin && (
                <div className="mt-7 grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <div>
                    <div className="font-semibold">Entorno DEMO local</div>
                    <p className="mt-1 text-xs leading-5 text-amber-900">
                      Crea una sesion demo validada para revision visual. No
                      muestra contrasenas y solo funciona en entorno demo.
                    </p>
                  </div>
                  <Label htmlFor="demo-role">Perfil de prueba autorizado</Label>
                  <select
                    className="h-11 rounded-lg border border-amber-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#2878ff] focus:ring-4 focus:ring-[#2878ff]/10"
                    id="demo-role"
                    value={activeDemoRole}
                    onChange={(event) =>
                      setActiveDemoRole(
                        event.target.value as DemoLoginProfile["roleKey"],
                      )
                    }
                  >
                    {demoLoginProfiles.map((profile) => (
                      <option key={profile.roleKey} value={profile.roleKey}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                  <Label htmlFor="demo-business-line">Unidad demo</Label>
                  <select
                    className="h-11 rounded-lg border border-amber-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#2878ff] focus:ring-4 focus:ring-[#2878ff]/10"
                    id="demo-business-line"
                    value={activeDemoBusinessLine}
                    onChange={(event) =>
                      setActiveDemoBusinessLine(
                        event.target.value as DemoBusinessLineCode,
                      )
                    }
                  >
                    {demoBusinessLineProfiles.map((profile) => (
                      <option key={profile.code} value={profile.code}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="h-11 w-full rounded-lg"
                    disabled={isLoading}
                    onClick={handleDemoLogin}
                    type="button"
                    variant="secondary"
                  >
                    {isLoading ? "Preparando acceso..." : "Entrar en DEMO local"}
                  </Button>
                </div>
              )}

              <form className="mt-8" onSubmit={handleLogin}>
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <Label
                      className="text-[13px] font-medium text-slate-700"
                      htmlFor="email"
                    >
                      Correo electronico
                    </Label>
                    <Input
                      autoComplete="username"
                      className="h-12 rounded-lg border-slate-200 bg-white px-3.5 text-[15px] shadow-none transition focus-visible:border-[#2878ff] focus-visible:ring-4 focus-visible:ring-[#2878ff]/10"
                      id="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nombre@analiza.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center gap-3">
                      <Label
                        className="text-[13px] font-medium text-slate-700"
                        htmlFor="password"
                      >
                        Contrasena
                      </Label>
                      <Link
                        className="ml-auto text-sm font-medium text-[#2878ff] underline-offset-4 transition hover:text-[#174b7a] hover:underline"
                        href="/auth/forgot-password"
                      >
                        Recuperar acceso
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        autoComplete="current-password"
                        className="h-12 rounded-lg border-slate-200 bg-white px-3.5 pr-12 text-[15px] shadow-none transition focus-visible:border-[#2878ff] focus-visible:ring-4 focus-visible:ring-[#2878ff]/10"
                        id="password"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                      />
                      <button
                        aria-label={
                          showPassword
                            ? "Ocultar contrasena"
                            : "Mostrar contrasena"
                        }
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2878ff]/30"
                        onClick={() => setShowPassword((value) => !value)}
                        type="button"
                      >
                        {showPassword ? (
                          <EyeOff
                            aria-hidden="true"
                            className="h-[18px] w-[18px]"
                          />
                        ) : (
                          <Eye
                            aria-hidden="true"
                            className="h-[18px] w-[18px]"
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">
                      <AlertCircle
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 flex-none"
                      />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    className="h-[50px] w-full rounded-lg bg-[#07172d] text-[15px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(23,75,122,.65)] transition hover:bg-[#12345e]"
                    disabled={isLoading}
                    type="submit"
                  >
                    {isLoading ? (
                      <>
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                        Ingresando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
                  <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Tus credenciales se transmiten de forma segura.</span>
                </div>

                <div className="mt-5 text-center text-sm text-slate-500">
                  ¿Necesitas acceso?{" "}
                  <Link
                    className="font-medium text-[#2878ff] underline-offset-4 hover:text-[#174b7a] hover:underline"
                    href="/auth/sign-up"
                  >
                    Crear cuenta
                  </Link>
                </div>

                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  Acceso protegido por credenciales asignadas y permisos por
                  rol. Cada sesion se valida antes de abrir la plataforma.
                </div>
              </form>

              <div className="mt-7 flex justify-center text-xs tracking-[0.03em] text-slate-400 lg:hidden">
                Fisioterapia · Laboratorios · Imagenes
              </div>
            </div>

            <div className="mx-auto mt-8 w-full max-w-[452px] text-xs text-slate-400 lg:absolute lg:bottom-7 lg:left-12 lg:mx-0 lg:max-w-none xl:left-16">
              © 2026 Interactivecore. Todos los derechos reservados.
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
