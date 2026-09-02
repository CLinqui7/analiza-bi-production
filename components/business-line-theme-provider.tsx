"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  businessLineThemes,
  resolveBusinessLineThemeSlug,
  type BusinessLineThemeSlug,
} from "@/lib/tenant/business-line-theme";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";

type BusinessLineThemeProviderProps = {
  children: ReactNode;
};

type StoredThemeContext = {
  businessLineCode?: string;
  businessLineId?: string;
  businessLineName?: string;
  companyName?: string;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStoredThemeContext(value: unknown): value is StoredThemeContext {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    (record.businessLineCode === undefined ||
      isString(record.businessLineCode)) &&
    (record.businessLineId === undefined || isString(record.businessLineId)) &&
    (record.businessLineName === undefined ||
      isString(record.businessLineName)) &&
    (record.companyName === undefined || isString(record.companyName))
  );
}

function readStoredContext(storage: Storage) {
  const rawValue = storage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return isStoredThemeContext(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function getThemeSlugFromBrowser(): BusinessLineThemeSlug {
  const searchParams = new URLSearchParams(window.location.search);
  const localContext = readStoredContext(window.localStorage);
  const sessionContext = readStoredContext(window.sessionStorage);
  const storedContext = localContext ?? sessionContext;

  return resolveBusinessLineThemeSlug({
    businessLineCode: storedContext?.businessLineCode,
    businessLineId: storedContext?.businessLineId,
    businessLineName: storedContext?.businessLineName,
    companyName: storedContext?.companyName,
    lineParam: searchParams.get("line"),
  });
}

export function BusinessLineThemeProvider({
  children,
}: BusinessLineThemeProviderProps) {
  const [themeSlug, setThemeSlug] =
    useState<BusinessLineThemeSlug>("consolidado");
  const theme = businessLineThemes[themeSlug];

  useEffect(() => {
    const syncTheme = () => setThemeSlug(getThemeSlugFromBrowser());

    syncTheme();
    window.addEventListener(contextChangeEvent, syncTheme);
    window.addEventListener("popstate", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      window.removeEventListener(contextChangeEvent, syncTheme);
      window.removeEventListener("popstate", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-business-line-theme",
      theme.slug,
    );

    return () => {
      document.documentElement.removeAttribute("data-business-line-theme");
    };
  }, [theme.slug]);

  return children;
}
