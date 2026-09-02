import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function isConfiguredSupabaseUrl(value: string | undefined) {
  if (!value || value.includes("your-project") || value.includes("tu_url")) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes("supabase");
  } catch {
    return false;
  }
}

function isConfiguredSupabaseKey(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalizedValue = value.toLowerCase();

  return (
    value.length > 20 &&
    !normalizedValue.includes("your-") &&
    !normalizedValue.includes("tu_") &&
    !normalizedValue.includes("example")
  );
}

export const hasEnvVars = Boolean(
  isConfiguredSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isConfiguredSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
);
