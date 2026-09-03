import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 p-6 text-slate-950">
      <section className="w-full max-w-md rounded-xl border bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold">Recuperar acceso</h1>
        <p className="mt-2 text-sm text-slate-600">Te enviaremos un enlace seguro para restablecer tu contraseña.</p>
        <div className="mt-6"><ForgotPasswordForm /></div>
        <Link className="mt-5 inline-block text-sm font-medium text-blue-700" href="/auth/login">Volver al inicio de sesión</Link>
      </section>
    </main>
  );
}
