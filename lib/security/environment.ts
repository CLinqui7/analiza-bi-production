export const analizaRuntimeEnvironments = [
  "demo",
  "staging",
  "production",
] as const;

export type AnalizaRuntimeEnvironment =
  (typeof analizaRuntimeEnvironments)[number];

function isRuntimeEnvironment(
  value: string | undefined,
): value is AnalizaRuntimeEnvironment {
  return analizaRuntimeEnvironments.includes(
    value as AnalizaRuntimeEnvironment,
  );
}

export function getAnalizaRuntimeEnvironment(): AnalizaRuntimeEnvironment {
  const explicitEnvironment =
    process.env.ANALIZA_APP_ENV?.trim().toLowerCase() ||
    process.env.APP_ENV?.trim().toLowerCase();

  if (isRuntimeEnvironment(explicitEnvironment)) {
    return explicitEnvironment;
  }

  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "staging";
  }

  return "production";
}

export function isProductionRuntimeEnvironment() {
  return getAnalizaRuntimeEnvironment() === "production";
}

export function isDemoRuntimeEnvironment() {
  return getAnalizaRuntimeEnvironment() === "demo";
}

export function canUseDemoFeatures() {
  return (
    isDemoRuntimeEnvironment() &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.VERCEL_ENV !== "preview"
  );
}

export function isDemoAdminAllowedByEnvironment() {
  if (!canUseDemoFeatures()) {
    return false;
  }

  if (process.env.ANALIZA_DISABLE_DEMO_ADMIN === "true") {
    return false;
  }

  return process.env.ANALIZA_ENABLE_DEMO_ADMIN === "true";
}

export function isDemoRoleSwitchAllowedByEnvironment() {
  return (
    canUseDemoFeatures() &&
    process.env.ANALIZA_DISABLE_DEMO_ROLE_SWITCH !== "true"
  );
}
