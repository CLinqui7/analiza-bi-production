import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

function environment() {
  if (!existsSync(".env.local")) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  return Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).flatMap((line) => {
    const separator = line.indexOf("=");
    return separator > 0 && !line.trimStart().startsWith("#")
      ? [[line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^(?:\"|')|(?:\"|')$/g, "")]]
      : [];
  }));
}

const env = environment();
const baseUrl = "https://web-clinqui7s-projects.vercel.app";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: organization } = await admin.from("organizations").select("id").eq("slug", env.BOOTSTRAP_ORG_SLUG).maybeSingle();
const [{ data: role }, { data: catalogBranches }, { data: businessLines }] = await Promise.all([
  admin.from("roles").select("id").eq("key", "gerente_sucursal").maybeSingle(),
  admin.from("branches").select("id,country_id,company_id,operational_area_id").eq("organization_id", organization?.id ?? "").eq("is_demo", false).in("status", ["active", "pending_manager"]).limit(100),
  admin.from("business_lines").select("id,company_id,code").eq("organization_id", organization?.id ?? "").eq("is_enabled", true),
]);
if (!organization || !role || !catalogBranches || !businessLines) throw new Error("QA_CATALOG_UNAVAILABLE");

const lineFor = (code) => businessLines.find((line) => line.code === code);
const laboratoryLine = lineFor("LABORATORY");
const physiotherapyLine = lineFor("PHYSIOTHERAPY");
const branchFor = (line, excluded = []) => catalogBranches.find((branch) => branch.company_id === line?.company_id && !excluded.some((item) => item?.id === branch.id));
const branchA = branchFor(laboratoryLine);
const branchB = branchFor(physiotherapyLine, [branchA]);
const branchC = catalogBranches.find((branch) => branch.id !== branchA?.id && branch.id !== branchB?.id);
const lineC = businessLines.find((line) => line.company_id === branchC?.company_id);
if (!laboratoryLine || !physiotherapyLine || !branchA || !branchB || !branchC || !lineC) throw new Error("QA_MULTI_BRANCH_CATALOG_UNAVAILABLE");
const email = `qa.runtime.${Date.now()}.${randomBytes(4).toString("hex")}@labanaliza.com`;
const password = `Qa-${randomBytes(24).toString("base64url")}-9`;
let userId;
let browser;

try {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "QA Runtime" } });
  if (error || !data.user) throw new Error("QA_USER_CREATE_FAILED");
  userId = data.user.id;
  const now = new Date().toISOString();
  const scopes = [
    { ...branchA, business_line_id: laboratoryLine.id },
    { ...branchB, business_line_id: physiotherapyLine.id },
  ];
  const { error: profileError } = await admin.from("profiles").upsert({ id: userId, organization_id: organization.id, email, display_name: "QA Runtime", status: "active", default_branch_id: branchA.id, default_country_id: branchA.country_id, default_company_id: branchA.company_id, updated_at: now });
  if (profileError) throw new Error(`QA_PROFILE_PROVISION_FAILED:${profileError.code ?? "unknown"}`);
  const results = await Promise.all([
    admin.from("user_roles").insert(scopes.map((branch) => ({ user_id: userId, role_id: role.id, organization_id: organization.id, country_id: branch.country_id, company_id: branch.company_id, operational_area_id: branch.operational_area_id, branch_id: branch.id, status: "active" }))),
    admin.from("manager_assignments").insert(scopes.map((branch) => ({ profile_id: userId, role_id: role.id, organization_id: organization.id, country_id: branch.country_id, company_id: branch.company_id, operational_area_id: branch.operational_area_id, branch_id: branch.id, status: "active", starts_at: now, metadata: { source: "runtime-service-role-qa" } }))),
  ]);
  const provisionCodes = results
    .map((result) => result.error?.code ?? null)
    .filter((code) => code !== null);
  if (provisionCodes.length > 0) {
    throw new Error(`QA_SCOPE_PROVISION_FAILED:${provisionCodes.join(",")}`);
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const runtimeFailures = [];
  page.on("response", (response) => { if (response.status() >= 500) runtimeFailures.push(response.status()); });
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  const loginStartedAt = performance.now();
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/protected/**", { timeout: 20_000 });
  const loginMs = Math.round(performance.now() - loginStartedAt);
  const responses = await page.evaluate(async ({ branchC, lineC }) => {
    const read = async (path) => { const response = await fetch(path, { cache: "no-store" }); return { body: await response.json(), status: response.status }; };
    const measure = async (path, samples = 5) => {
      const timings = [];
      const serverTimings = [];
      const sizes = [];
      for (let index = 0; index < samples; index += 1) {
        const startedAt = performance.now();
        const response = await fetch(path, { cache: "no-store" });
        await response.arrayBuffer();
        timings.push(Math.round(performance.now() - startedAt));
        serverTimings.push(response.headers.get("server-timing"));
        sizes.push(Number(response.headers.get("content-length")) || null);
      }
      return {
        maxMs: Math.max(...timings),
        medianMs: [...timings].sort((left, right) => left - right)[Math.floor(timings.length / 2)],
        minMs: Math.min(...timings),
        samples: timings.length,
        serverTiming: serverTimings.filter(Boolean),
        sizes,
      };
    };
    return {
      branches: await read("/api/branches"),
      context: await read("/api/context/options"),
      measurements: {
        context: await measure("/api/context/options"),
        session: await measure("/api/auth/session"),
      },
      session: await read("/api/auth/session"),
      unauthorizedWrite: await fetch("/api/monthly-submissions", {
        body: JSON.stringify({
          branchId: branchC.id,
          businessLineId: lineC.id,
          changeReason: "QA direct scope check",
          companyId: branchC.company_id,
          countryId: branchC.country_id,
          operationalAreaId: branchC.operational_area_id,
          periodEnd: "2026-09-30",
          periodStart: "2026-09-01",
          responses: {},
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).then(async (response) => ({ body: await response.json(), status: response.status })),
    };
  }, { branchC, lineC });
  for (const response of [responses.branches, responses.context, responses.session]) assert.equal(response.status, 200, "RUNTIME_ADMIN_ROUTE_FAILED");
  const allowed = responses.session.body.user.allowedBranches;
  const visible = responses.context.body.options.branches.map((branch) => branch.id);
  for (const branch of [branchA, branchB]) assert.ok(allowed.includes(branch.id) && visible.includes(branch.id), "QA_AUTHORIZED_BRANCH_MISSING");
  assert.ok(!allowed.includes(branchC.id) && !visible.includes(branchC.id), "QA_UNAUTHORIZED_BRANCH_VISIBLE");
  assert.ok([403, 404].includes(responses.unauthorizedWrite.status), "QA_UNAUTHORIZED_RESOURCE_NOT_DENIED");
  assert.deepEqual(runtimeFailures, [], "RUNTIME_5XX");
  console.log(JSON.stringify({
    branchA: "PASS",
    branchB: "PASS",
    branchC: "DENIED",
    directBranchCWrite: `DENIED_${responses.unauthorizedWrite.status}`,
    filters: "PASS",
    loginMs,
    measurements: responses.measurements,
    serviceRoleRuntime: "PASS",
  }));
} finally {
  if (browser) await browser.close();
  if (userId) {
    await admin.from("manager_assignments").delete().eq("profile_id", userId).eq("organization_id", organization.id);
    await admin.from("user_roles").delete().eq("user_id", userId).eq("organization_id", organization.id);
    await admin.from("profiles").delete().eq("id", userId).eq("organization_id", organization.id);
    await admin.auth.admin.deleteUser(userId);
  }
}
