import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const defaultBaseUrl =
  process.env.QA_BASE_URL ?? "https://web-clinqui7s-projects.vercel.app";
const navigationTimeoutMs = 20_000;
const expectedPeriod = { from: "2026-07-01", to: "2026-07-31" };
function seedPath(traceRequestId) {
  const searchParams = new URLSearchParams({
    from: expectedPeriod.from,
    to: expectedPeriod.to,
  });
  if (traceRequestId) searchParams.set("qaTrace", traceRequestId);
  return `/protected/mi-sucursal?${searchParams.toString()}`;
}

const routes = {
  form: {
    marker: "new-closure",
    pathname: "/protected/plantillas",
  },
  history: {
    marker: "closures",
    pathname: "/protected/cierres",
  },
  results: {
    marker: "results",
    pathname: "/protected/resultados",
  },
  targets: {
    marker: "official-targets",
    pathname: "/protected/metas",
  },
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

function hrefSelector(pathname) {
  return `a[href^="${pathname}"]`;
}

function isRscRequest(request, pathname) {
  const url = new URL(request.url());
  const headers = request.headers();
  return (
    request.resourceType() === "fetch" &&
    url.pathname === pathname &&
    (url.searchParams.has("_rsc") || headers.rsc === "1")
  );
}

async function firstVisibleLink(page, pathname) {
  const links = page.locator(hrefSelector(pathname));
  const count = await links.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = links.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  throw new Error(`NAVIGATION_LINK_UNAVAILABLE:${pathname}`);
}

async function verifyPeriodControl(page) {
  const periodButton = page.getByRole("button", { name: /periodo|filtros/i });
  if ((await periodButton.count()) === 0) {
    await page.getByText("Acceso de sucursal", { exact: true }).waitFor({
      state: "visible",
      timeout: navigationTimeoutMs,
    });
    return "branch_scope_lock_verified";
  }
  await periodButton.click();
  const from = page.getByLabel("Fecha desde");
  const to = page.getByLabel("Fecha hasta");
  await Promise.all([
    from.waitFor({ state: "visible", timeout: navigationTimeoutMs }),
    to.waitFor({ state: "visible", timeout: navigationTimeoutMs }),
  ]);
  assert.equal(await from.inputValue(), expectedPeriod.from, "PERIOD_FROM_MISMATCH");
  assert.equal(await to.inputValue(), expectedPeriod.to, "PERIOD_TO_MISMATCH");
  return "period_controls_opened";
}

async function verifyUsability(page, routeName) {
  if (routeName === "form") {
    const formSteps = page.getByTestId("monthly-form-steps").getByRole("button");
    const stepCount = await formSteps.count();
    let editable = page.locator('input[id^="monthly-"]:not([disabled])').first();
    for (let index = 0; index < stepCount; index += 1) {
      if (await editable.isVisible()) break;
      await formSteps.nth(index).click();
      await page.waitForTimeout(50);
      editable = page.locator('input[id^="monthly-"]:not([disabled])').first();
    }
    if (!(await editable.isVisible())) {
      throw new Error(`FORM_FIELD_NOT_RENDERED:steps=${stepCount}`);
    }
    const originalValue = await editable.inputValue();
    const inputType = await editable.getAttribute("type");
    const testValue = inputType === "date" ? expectedPeriod.from : inputType === "month" ? "2026-07" : "0";
    await editable.fill(testValue);
    assert.equal(await editable.inputValue(), testValue, "FORM_FIELD_NOT_EDITABLE");
    await editable.fill(originalValue);
    return "monthly_field_edited_without_save";
  }

  if (routeName === "results") {
    await page.getByTestId("bi-results-aggregate").waitFor({
      state: "visible",
      timeout: navigationTimeoutMs,
    });
  }

  if (routeName === "history") {
    await page.getByTestId("bi-history").waitFor({
      state: "visible",
      timeout: navigationTimeoutMs,
    });
  }

  return verifyPeriodControl(page);
}

async function awaitRscFinishers(finishers) {
  await Promise.race([
    Promise.allSettled(finishers),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
}

async function clientWork(page, clickPerformanceTime) {
  return page.evaluate((clickedAt) => {
    const resources = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.startTime >= clickedAt);
    const scripts = resources.filter((entry) => entry.initiatorType === "script");
    const fetches = resources.filter((entry) => entry.initiatorType === "fetch");
    const longTasks = Array.isArray(window.__qaNavigationLongTasks)
      ? window.__qaNavigationLongTasks.filter((entry) => entry.startTime >= clickedAt)
      : [];

    return {
      fetchCount: fetches.length,
      longTaskCount: longTasks.length,
      longTaskMs: Math.round(
        longTasks.reduce((sum, entry) => sum + entry.duration, 0),
      ),
      scriptDurationMs: Math.round(
        scripts.reduce((sum, entry) => sum + entry.duration, 0),
      ),
      scriptMaxDurationMs: Math.round(
        Math.max(0, ...scripts.map((entry) => entry.duration)),
      ),
      scriptResources: scripts.map((entry) => ({
        durationMs: Math.round(entry.duration),
        path: new URL(entry.name).pathname,
        transferBytes: entry.transferSize,
      })),
      scriptTransferBytes: scripts.reduce(
        (sum, entry) => sum + entry.transferSize,
        0,
      ),
    };
  }, clickPerformanceTime);
}

async function navigate(page, routeName, scenario, hoverMs) {
  const route = routes[routeName];
  const targetRequests = [];
  const rscResponses = [];
  const finishers = [];
  let clickedAt = null;
  let clickPerformanceTime = null;

  const requestListener = (request) => {
    if (!isRscRequest(request, route.pathname)) return;
    targetRequests.push({
      phase: clickedAt === null ? "before_click" : "after_click",
      routerPrefetch: request.headers()["next-router-prefetch"] === "1",
      startedMs: clickedAt === null ? null : Math.round(Date.now() - clickedAt),
    });
  };
  const responseListener = (response) => {
    if (!isRscRequest(response.request(), route.pathname)) return;
    const measurement = {
      headersMs: clickedAt === null ? null : Math.round(Date.now() - clickedAt),
      status: response.status(),
      streamCompletedMs: null,
    };
    rscResponses.push(measurement);
    finishers.push(
      response.finished().then(
        () => {
          measurement.streamCompletedMs =
            clickedAt === null ? null : Math.round(Date.now() - clickedAt);
        },
        () => undefined,
      ),
    );
  };

  page.on("request", requestListener);
  page.on("response", responseListener);
  try {
    const link = await firstVisibleLink(page, route.pathname);
    const href = await link.getAttribute("href");
    assert.ok(href?.includes(`from=${expectedPeriod.from}`), "ROUTE_PERIOD_FROM_MISSING");
    assert.ok(href?.includes(`to=${expectedPeriod.to}`), "ROUTE_PERIOD_TO_MISSING");

    if (hoverMs > 0) {
      await page.evaluate(() => {
        window.__qaNavigationSaveData = false;
      });
      await link.hover();
      await page.waitForTimeout(hoverMs);
    }

    clickPerformanceTime = await page.evaluate(() => performance.now());
    clickedAt = Date.now();
    const pendingFeedback = page
      .waitForFunction(
        (path) =>
          document
            .querySelector(`a[href^="${path}"]`)
            ?.getAttribute("data-navigation-pending") === "true",
        route.pathname,
        { timeout: 500 },
      )
      .then(() => Math.round(Date.now() - clickedAt))
      .catch(() => null);
    const targetPattern = new RegExp(
      `${route.pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?|$)`,
    );
    await Promise.all([
      page.waitForURL(targetPattern, { timeout: navigationTimeoutMs }),
      link.click(),
    ]);
    const marker = page.locator(
      `[data-route-content-ready="${route.marker}"]`,
    );
    await marker.waitFor({ state: "visible", timeout: navigationTimeoutMs });
    const contentReadyMs = Math.round(Date.now() - clickedAt);
    const current = new URL(page.url());
    const traceValues = await page
      .locator("[data-navigation-trace]")
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute("data-navigation-trace"))
          .filter((value) => Boolean(value)),
      );
    const parsedTraces = traceValues.map((value) => JSON.parse(value));
    const serverTrace = parsedTraces.findLast(
      (candidate) => candidate.route === routeName,
    ) ?? null;
    const usableControl = await verifyUsability(page, routeName);
    const usableMs = Math.round(Date.now() - clickedAt);
    await awaitRscFinishers(finishers);
    const client = await clientWork(page, clickPerformanceTime);
    assert.equal(current.pathname, route.pathname, "ROUTE_PATH_MISMATCH");
    assert.equal(current.searchParams.get("from"), expectedPeriod.from, "ROUTE_PERIOD_FROM_MISMATCH");
    assert.equal(current.searchParams.get("to"), expectedPeriod.to, "ROUTE_PERIOD_TO_MISMATCH");

    return {
      client,
      contentReadyMs,
      feedbackMs: await pendingFeedback,
      rscResponses,
      route: routeName,
      scenario,
      serverTrace,
      traceMarkerCount: parsedTraces.length,
      traceQueryPresent: current.searchParams.has("qaTrace"),
      targetRequests,
      usableControl,
      usableMs,
    };
  } finally {
    page.off("request", requestListener);
    page.off("response", responseListener);
  }
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
    admin.from("roles").select("id").eq("key", "gerente_sucursal").maybeSingle(),
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
const physiotherapyLine = businessLines.find((line) => line.code === "PHYSIOTHERAPY");
const branchA = catalogBranches.find(
  (branch) => branch.company_id === laboratoryLine?.company_id,
);
const branchB = catalogBranches.find(
  (branch) =>
    branch.company_id === physiotherapyLine?.company_id && branch.id !== branchA?.id,
);

if (!laboratoryLine || !physiotherapyLine || !branchA || !branchB) {
  throw new Error("QA_MULTI_BRANCH_CATALOG_UNAVAILABLE");
}

const email = `qa.first-navigation.${Date.now()}.${randomBytes(4).toString("hex")}@labanaliza.com`;
const password = `Qa-${randomBytes(24).toString("base64url")}-9`;
const requestedRouteNames = process.env.QA_ROUTE_NAMES
  ? process.env.QA_ROUTE_NAMES.split(",").filter((routeName) =>
      Object.hasOwn(routes, routeName),
    )
  : Object.keys(routes);
const onlyUnprepared = process.env.QA_ONLY_UNPREPARED === "1";
const requestedRepeatCount = Number.parseInt(process.env.QA_REPEATS ?? "1", 10);
const repeatCount =
  Number.isSafeInteger(requestedRepeatCount) &&
  requestedRepeatCount > 0 &&
  requestedRepeatCount <= 10
    ? requestedRepeatCount
    : 1;
let browser;
let userId;

async function createAuthenticatedPage({ trace }) {
  const context = await browser.newContext();
  const traceRequestId = trace ? randomBytes(12).toString("hex") : null;
  await context.addInitScript(() => {
    window.__qaNavigationSaveData = true;
    window.__qaNavigationLongTasks = [];
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      get: () => ({ effectiveType: "4g", saveData: window.__qaNavigationSaveData }),
    });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__qaNavigationLongTasks.push({
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }
    }).observe({ entryTypes: ["longtask"] });
  });
  const page = await context.newPage();
  const loginStartedAt = Date.now();
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: navigationTimeoutMs });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  try {
    await page.waitForURL("**/protected/**", {
      timeout: navigationTimeoutMs,
      waitUntil: "commit",
    });
  } catch {
    const loginError = await page
      .locator("form div.border-red-200 span")
      .allTextContents();
    throw new Error(`QA_LOGIN_FAILED:${loginError.join(" ") || "no_message"}`);
  }
  const loginMs = Math.round(Date.now() - loginStartedAt);
  await page.goto(`${baseUrl}${seedPath(traceRequestId)}`, {
    waitUntil: "domcontentloaded",
  });
  await firstVisibleLink(page, routes.results.pathname);
  return { context, loginMs, page };
}

try {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { full_name: "QA First Navigation" },
  });
  if (error || !data.user) throw new Error("QA_USER_CREATE_FAILED");
  userId = data.user.id;

  const now = new Date().toISOString();
  const scopes = [
    {
      ...branchA,
      business_line_code: laboratoryLine.code,
      business_line_id: laboratoryLine.id,
    },
    {
      ...branchB,
      business_line_code: physiotherapyLine.code,
      business_line_id: physiotherapyLine.id,
    },
  ];
  const { error: profileError } = await admin.from("profiles").upsert({
    default_branch_id: branchA.id,
    default_company_id: branchA.company_id,
    default_country_id: branchA.country_id,
    display_name: "QA First Navigation",
    email,
    id: userId,
    organization_id: organization.id,
    status: "active",
    updated_at: now,
  });
  if (profileError) throw new Error("QA_PROFILE_PROVISION_FAILED");

  const grants = await Promise.all([
    admin.from("user_roles").insert(
      scopes.map((branch) => ({
        branch_id: branch.id,
        business_line_code: branch.business_line_code,
        business_line_id: branch.business_line_id,
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
        business_line_code: branch.business_line_code,
        business_line_id: branch.business_line_id,
        company_id: branch.company_id,
        country_id: branch.country_id,
        metadata: { source: "first-navigation-production-qa" },
        operational_area_id: branch.operational_area_id,
        organization_id: organization.id,
        profile_id: userId,
        role_id: role.id,
        starts_at: now,
        status: "active",
      })),
    ),
  ]);
  if (grants.some((result) => result.error)) {
    throw new Error("QA_SCOPE_PROVISION_FAILED");
  }

  browser = await chromium.launch({ channel: "msedge", headless: true });
  const measurements = [];
  const loginSamples = [];

  for (const routeName of requestedRouteNames) {
    for (let sample = 1; sample <= repeatCount; sample += 1) {
      const session = await createAuthenticatedPage({ trace: true });
      loginSamples.push(session.loginMs);
      try {
        measurements.push({
          ...(await navigate(session.page, routeName, "unprepared", 0)),
          sample,
        });
      } finally {
        await session.context.close();
      }
    }
  }

  if (!onlyUnprepared) {
    for (const routeName of requestedRouteNames) {
      for (let sample = 1; sample <= repeatCount; sample += 1) {
        const session = await createAuthenticatedPage({ trace: false });
        loginSamples.push(session.loginMs);
        try {
          measurements.push({
            ...(await navigate(session.page, routeName, "brief_hover_175ms", 175)),
            sample,
          });
        } finally {
          await session.context.close();
        }
      }
    }
  }

  if (!onlyUnprepared) {
    const prepared = await createAuthenticatedPage({ trace: false });
    loginSamples.push(prepared.loginMs);
    try {
      measurements.push(await navigate(prepared.page, "results", "prepared_1800ms", 1_800));
      measurements.push(await navigate(prepared.page, "targets", "intermediate_for_revisit", 0));
      measurements.push(await navigate(prepared.page, "results", "revisit", 0));
    } finally {
      await prepared.context.close();
    }
  }

  assert.ok(measurements.every((measurement) => measurement.feedbackMs !== null), "PENDING_FEEDBACK_MISSING");
  console.log(
    JSON.stringify({
      baseUrl,
      expectedPeriod,
      loginSamples,
      measurements,
      methodology: {
        briefHoverMs: 175,
        freshContextPerFirstVisit: true,
        preClickRequestsRecorded: true,
        traceQuery: "opaque per-request QA identifier",
      },
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
