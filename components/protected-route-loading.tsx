type ProtectedRouteLoadingProps = {
  label?: string;
};

export function ProtectedRouteLoading({
  label = "pantalla autorizada",
}: ProtectedRouteLoadingProps) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-8 lg:px-6"
      data-route-loading="true"
      role="status"
    >
      <div className="grid gap-2">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-8 w-72 max-w-full animate-pulse rounded bg-muted" />
        <p className="text-sm text-muted-foreground">Preparando {label}...</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {["summary", "trend", "quality"].map((key) => (
          <div
            className="h-32 animate-pulse rounded-xl border bg-card/70"
            key={key}
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-card/70" />
    </section>
  );
}
