import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const defaultBaseUrl = "https://web-clinqui7s-projects.vercel.app";
const navigationTimeoutMs = 20_000;
const rscStreamTimeoutMs = 5_000;
const routeReadyMarker = {
  "/protected/cierres": "closures",
  "/protected/mi-sucursal": "my-branch",
  "/protected/metas": "official-targets",
  "/protected/plantillas": "new-closure",
  "/protected/resultados": "results",
};

function environment() {
  if (!existsSync(".env.local")) {
    throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  }

  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .flatMap((line) => {
        const separator = line.indexOf("=");
        return separator > 0 && !line.trimStart().startsWith("#")
          ? [
              [
                line.slice(0, separator).trim(),
                line
                  .slice(separator + 1)
                  .trim()
                  .replace(/^(?:\"|')|(?:\"|')$/g, ""),
              ],
            ]
          : [];
      }),
  );
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}

function hrefSelector(pathname) {
  return `a[href^="${pathname}"]`;
}

async function recordRscStreamCompletion(response, measurement, startedAt) {
  let timeout;
  const outcome = await Promise.race([
    response.finished().then(
      () => "finished",
      () => "failed",
    ),
    new Promise((resolve) => {
      timeout = setTimeout(() => resolve("timeout"), rscStreamTimeoutMs);
    }),
  ]);
  clearTimeout(timeout);

  if (outcome === "finished") {
    measurement.streamCompletedMs = Math.round(performance.now() - startedAt);
    return;
  }

  measurement.streamCompletedMs = null;
  measurement.streamOutcome = outcome;
}

const env = environment();
const baseUrl = process.env.QA_BASE_URL ?? defaultBaseUrl;
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data: organization } = await admin
  .from("organizations")
  .select("id")
  .eq("slug", env.BOOTSTRAP_ORG_SLUG)
  .maybeSingle();
const [{ data: role }, { data: catalogBranches }, { data: businessLines }] =
  await Promise.all([
    admin
      .from("roles")
      .select("id")
      .eq("key", "gerente_sucursal")
      .maybeSingle(),
    admin
      .from("branches")
      .select("id,country_id,company_id,operational_area_id")
      .eq("organization_id", organization?.id ?? "")
      .eq("is_demo", false)
      .in("status", ["active", "pending_manager"])
      .limit(100),
    admin
      .from("business_lines")
      .select("id,company_id,code")
      .eq("organization_id", organization?.id ?? "")
      .eq("is_enabled", true),
  ]);

if (!organization || !role || !catalogBranches || !businessLines) {
  throw new Error("QA_CATALOG_UNAVAILABLE");
}

const laboratoryLine = businessLines.find((line) => line.code === "LABORATORY");
const physiotherapyLine = businessLines.find(
  (line) => line.code === "PHYSIOTHERAPY",
);
const branchA = catalogBranches.find(
  (branch) => branch.company_id === laboratoryLine?.company_id,
);
const branchB = catalogBranches.find(
  (branch) =>
    branch.company_id === physiotherapyLine?.company_id &&
    branch.id !== branchA?.id,
);

if (!laboratoryLine || !physiotherapyLine || !branchA || !branchB) {
  throw new Error("QA_MULTI_BRANCH_CATALOG_UNAVAILABLE");
}

const email = `qa.navigation.${Date.now()}.${randomBytes(4).toString("hex")}@labanaliza.com`;
const password = `Qa-${randomBytes(24).toString("base64url")}-9`;
let browser;
let userId;

try {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { full_name: "QA Navigation" },
  });
  if (error || !data.user) {
    throw new Error("QA_USER_CREATE_FAILED");
  }
  userId = data.user.id;

  const now = new Date().toISOString();
  const scopes = [
    { ...branchA, business_line_id: laboratoryLine.id },
    { ...branchB, business_line_id: physiotherapyLine.id },
  ];
  const { error: profileError } = await admin.from("profiles").upsert({
    default_branch_id: branchA.id,
    default_company_id: branchA.company_id,
    default_country_id: branchA.country_id,
    display_name: "QA Navigation",
    email,
    id: userId,
    organization_id: organization.id,
    status: "active",
    updated_at: now,
  });
  if (profileError) {
    throw new Error(
      `QA_PROFILE_PROVISION_FAILED:${profileError.code ?? "unknown"}`,
    );
  }

  const provisioning = await Promise.all([
    admin.from("user_roles").insert(
      scopes.map((branch) => ({
        branch_id: branch.id,
        company_id: branch.company_id,
        country_id: branch.country_id,
        operational_area_id: branch.operational_area_id,
        organization_id: organization.id,
        role_id: role.id,
        status: "active",
        user_id: userId,
      })),
    ),
    admin.from("manager_assignments").insert(
      scopes.map((branch) => ({
        branch_id: branch.id,
        company_id: branch.company_id,
        country_id: branch.country_id,
        metadata: { source: "navigation-production-qa" },
        operational_area_id: branch.operational_area_id,
        organization_id: organization.id,
        profile_id: userId,
        role_id: role.id,
        starts_at: now,
        status: "active",
      })),
    ),
  ]);
  const provisionError = provisioning.find((result) => result.error)?.error;
  if (provisionError) {
    throw new Error(
      `QA_SCOPE_PROVISION_FAILED:${provisionError.code ?? "unknown"}`,
    );
  }

  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const runtimeFailures = [];
  page.on("response", (response) => {
    if (response.status() >= 500) runtimeFailures.push(response.status());
  });

  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/protected/**", { timeout: navigationTimeoutMs });
  await page.waitForLoadState("networkidle", { timeout: navigationTimeoutMs });

  async function navigateBySidebar(pathname, prefetchLeadMs = 0) {
    const selector = hrefSelector(pathname);
    const link = page.locator(selector).first();
    await link.waitFor({ state: "visible", timeout: navigationTimeoutMs });
    const prefetchStartedAt = performance.now();
    const prefetchedResponses = [];
    const prefetchResponseListener = (response) => {
      const request = response.request();
      const responseUrl = response.url();
      if (
        request.resourceType() === "fetch" &&
        new URL(responseUrl).pathname === pathname &&
        (responseUrl.includes("_rsc=") ||
          response.headers()["content-type"]?.includes("text/x-component"))
      ) {
        prefetchedResponses.push({
          headersMs: Math.round(performance.now() - prefetchStartedAt),
          routerPrefetch: request.headers()["next-router-prefetch"] === "1",
          status: response.status(),
        });
      }
    };
    if (prefetchLeadMs > 0) {
      page.on("response", prefetchResponseListener);
      try {
        await link.hover();
        await page.waitForTimeout(prefetchLeadMs);
      } finally {
        page.off("response", prefetchResponseListener);
      }
    }

    const startedAt = performance.now();
    const responses = [];
    const responseFinishers = [];
    const responseListener = (response) => {
      const request = response.request();
      const responseUrl = response.url();
      const responsePathname = new URL(responseUrl).pathname;
      if (
        request.resourceType() === "fetch" &&
        responsePathname === pathname &&
        (responseUrl.includes("_rsc=") ||
          response.headers()["content-type"]?.includes("text/x-component"))
      ) {
        const measurement = {
          headersMs: Math.round(performance.now() - startedAt),
          status: response.status(),
          url: responseUrl,
        };
        responses.push(measurement);
        responseFinishers.push(
          recordRscStreamCompletion(response, measurement, startedAt),
        );
      }
    };
    const supportsPendingFeedback =
      (await link.getAttribute("data-navigation-link")) === "true";
    const pendingFeedback = supportsPendingFeedback
      ? page
          .waitForFunction(
            (path) =>
              document
                .querySelector(`a[href^="${path}"]`)
                ?.getAttribute("data-navigation-pending") === "true",
            pathname,
            { timeout: 500 },
          )
          .then(() => Math.round(performance.now() - startedAt))
          .catch(() => null)
      : Promise.resolve(null);
    page.on("response", responseListener);
    const targetPattern = new RegExp(
      `${pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?|$)`,
    );
    try {
      await Promise.all([
        page.waitForURL(targetPattern, { timeout: navigationTimeoutMs }),
        link.click(),
      ]);
      const urlChangedMs = Math.round(performance.now() - startedAt);
      const readyMarker = routeReadyMarker[pathname];
      if (readyMarker) {
        await page
          .locator(`[data-route-content-ready="${readyMarker}"]`)
          .waitFor({ state: "visible", timeout: navigationTimeoutMs });
      } else {
        await page.waitForLoadState("networkidle", {
          timeout: navigationTimeoutMs,
        });
      }
      const contentReadyMs = Math.round(performance.now() - startedAt);
      await Promise.all(responseFinishers);
      return {
        contentReadyMs,
        pendingFeedbackMs: await pendingFeedback,
        pathname,
        prefetchLeadMs: Math.round(startedAt - prefetchStartedAt),
        prefetchRscResponses: prefetchedResponses,
        rscResponses: responses,
        urlChangedMs,
      };
    } finally {
      page.off("response", responseListener);
    }
  }

  const routeSequence = [
    "/protected/resultados",
    "/protected/metas",
    "/protected/resultados",
    "/protected/metas",
    "/protected/mi-sucursal",
    "/protected/cierres",
    "/protected/plantillas",
  ];
  const transitions = [];
  for (const pathname of routeSequence) {
    transitions.push(await navigateBySidebar(pathname));
  }

  const prefetchedTransitions = [];
  for (const pathname of [
    "/protected/resultados",
    "/protected/metas",
    "/protected/resultados",
  ]) {
    prefetchedTransitions.push(await navigateBySidebar(pathname, 1_800));
  }

  assert.deepEqual(runtimeFailures, [], "RUNTIME_5XX");
  assert.equal(
    transitions.length,
    routeSequence.length,
    "QA_NAVIGATION_INCOMPLETE",
  );
  const revisitMeasurements = transitions
    .filter((transition) =>
      ["/protected/resultados", "/protected/metas"].includes(
        transition.pathname,
      ),
    )
    .map((transition) => transition.contentReadyMs);
  const prefetchedMedianMs = median(
    prefetchedTransitions.map((transition) => transition.contentReadyMs),
  );

  console.log(
    JSON.stringify({
      baseUrl,
      prefetchedMedianMs,
      prefetchedTransitions,
      revisitMedianMs: median(revisitMeasurements),
      transitions,
    }),
  );
} finally {
  if (browser) await browser.close();
  if (userId) {
    await admin
      .from("manager_assignments")
      .delete()
      .eq("profile_id", userId)
      .eq("organization_id", organization.id);
    await admin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organization.id);
    await admin
      .from("profiles")
      .delete()
      .eq("id", userId)
      .eq("organization_id", organization.id);
    await admin.auth.admin.deleteUser(userId);
  }
}
