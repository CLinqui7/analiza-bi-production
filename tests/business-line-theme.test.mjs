import { readFileSync, statSync } from "node:fs";

const themeDataPath = "lib/tenant/business-line-theme.ts";
const themeProviderPath = "components/business-line-theme-provider.tsx";
const appLayoutPath = "app/layout.tsx";
const contextHeaderPath = "components/tenant-context-header.tsx";
const globalStylesPath = "app/globals.css";
const designSystemPath = "docs/design-system.md";

for (const file of [
  themeDataPath,
  themeProviderPath,
  appLayoutPath,
  contextHeaderPath,
  globalStylesPath,
  designSystemPath,
]) {
  statSync(file);
}

const themeData = readFileSync(themeDataPath, "utf8");
const themeProvider = readFileSync(themeProviderPath, "utf8");
const appLayout = readFileSync(appLayoutPath, "utf8");
const contextHeader = readFileSync(contextHeaderPath, "utf8");
const globalStyles = readFileSync(globalStylesPath, "utf8");
const designSystem = readFileSync(designSystemPath, "utf8");

for (const requiredThemeText of [
  "BusinessLineThemeSlug",
  "businessLineThemes",
  "resolveBusinessLineThemeSlug",
  "consolidado",
  "fisioterapia",
  "laboratorio",
  "imagenes",
  "primaryHex",
]) {
  if (!themeData.includes(requiredThemeText)) {
    throw new Error(`Business-line theme data is missing: ${requiredThemeText}`);
  }
}

for (const requiredProviderText of [
  "BusinessLineThemeProvider",
  "data-business-line-theme",
  "analiza:selected-context",
  "analiza:context-change",
  "window.localStorage",
  "window.sessionStorage",
  "document.documentElement.setAttribute",
  "data-business-line-theme",
  "lineParam: searchParams.get(\"line\")",
]) {
  if (!themeProvider.includes(requiredProviderText)) {
    throw new Error(`Business-line theme provider is missing: ${requiredProviderText}`);
  }
}

for (const requiredLayoutText of [
  "BusinessLineThemeProvider",
]) {
  if (!appLayout.includes(requiredLayoutText)) {
    throw new Error(`App layout is missing: ${requiredLayoutText}`);
  }
}

for (const requiredHeaderText of [
  "businessLineId",
  "handleBusinessLineChange",
  "globalContextChangeEvent",
  "toGlobalFilterSearchParams",
]) {
  if (!contextHeader.includes(requiredHeaderText)) {
    throw new Error(`Context header line identity is missing: ${requiredHeaderText}`);
  }
}

for (const requiredGlobalThemeText of [
  '[data-business-line-theme="consolidado"]',
  '[data-business-line-theme="laboratorio"]',
  '[data-business-line-theme="fisioterapia"]',
  '[data-business-line-theme="imagenes"]',
  "--line-surface",
  "--line-border",
  "[data-business-line-theme] main.min-h-screen::before",
]) {
  if (!globalStyles.includes(requiredGlobalThemeText)) {
    throw new Error(`Global theme styles are missing: ${requiredGlobalThemeText}`);
  }
}

for (const requiredDesignText of [
  "Business Line Identity",
  "Laboratorio uses indigo",
  "Fisioterapia uses teal/green",
  "Imagenes uses diagnostic blue",
]) {
  if (!designSystem.includes(requiredDesignText)) {
    throw new Error(`Design system docs are missing: ${requiredDesignText}`);
  }
}

console.log("Business-line theme checks passed.");
