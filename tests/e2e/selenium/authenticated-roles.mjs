import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { createClient } from "@supabase/supabase-js";

const baseUrl = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const artifacts = resolve("artifacts/selenium/authenticated-roles");
await mkdir(artifacts, { recursive: true });

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
assert.ok(
  env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
  "Authenticated Selenium requires local server-only Supabase credentials.",
);
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const run = `qa${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
const password = `${randomBytes(24).toString("base64url")}Aa1!`;
const emails = {
  ceo: `ceo-${run}@qa.invalid`,
  ga: `ga-${run}@qa.invalid`,
  go: `go-${run}@qa.invalid`,
  gs: `gs-${run}@qa.invalid`,
};
const userIds = [];
let organizationId;
let driver;
let authenticatedQaPassed = false;
const timings = {};

async function cleanupQaOrganization(id) {
  const submissions = await admin.from("manual_monthly_submissions").select("id").eq("organization_id", id);
  fail(submissions.error, "QA submission cleanup lookup");
  const submissionIds = submissions.data.map((item) => item.id);
  const versions = submissionIds.length > 0
    ? await admin.from("manual_monthly_submission_versions").select("id").in("submission_id", submissionIds)
    : { data: [], error: null };
  fail(versions.error, "QA version cleanup lookup");
  const versionIds = versions.data.map((item) => item.id);
  const remove = async (table, column = "organization_id", values = [id]) => {
    if (values.length === 0) return;
    const result = await admin.from(table).delete().in(column, values);
    fail(result.error, `QA ${table} cleanup`);
  };
  await remove("manual_monthly_submission_events", "submission_id", submissionIds);
  await remove("manual_monthly_submission_attachments", "submission_version_id", versionIds);
  await remove("manual_monthly_submission_versions", "id", versionIds);
  await remove("manual_monthly_submissions");
  // Published QA submissions create official closings. Delete the root closing
  // rows before their scoped branch; dependent KPI and lineage rows cascade.
  await remove("closing_versions");
  for (const table of ["audit_logs", "reporting_lines", "directory_assignment_slots", "branch_managers", "manager_assignments", "user_roles", "profiles", "branches", "operational_areas", "business_lines", "companies", "countries"]) {
    await remove(table);
  }
  const deleted = await admin.from("organizations").delete().eq("id", id);
  fail(deleted.error, "QA organization cleanup");
}

function fail(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function assertNoFalseSuccess(result, context) {
  assert.ok(
    result.status < 500 && result.status !== 502 && result.status !== 503,
    `${context} returned ${result.status}`,
  );
  if (result.status >= 200 && result.status < 300) {
    assert.notEqual(result.body?.ok, false, `${context} returned ok:false`);
    assert.doesNotMatch(
      JSON.stringify(result.body),
      /\bDEMO\b/i,
      `${context} returned simulated data`,
    );
  }
}

async function createUser(email) {
  const result = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  fail(result.error, "QA auth user creation");
  assert.ok(result.data.user?.id, "QA auth user id is required");
  userIds.push(result.data.user.id);
  return result.data.user.id;
}

async function bodyText() {
  const body = await driver.wait(until.elementLocated(By.css("body")), 10_000);
  return body.getText();
}

async function login(email) {
  await driver.manage().deleteAllCookies();
  await driver.get(`${baseUrl}/auth/login`);
  await driver.findElement(By.id("email")).sendKeys(email);
  await driver.findElement(By.id("password")).sendKeys(password);
  await driver.findElement(By.css("button[type=submit]")).click();
  await driver.wait(
    async () => (await driver.getCurrentUrl()).includes("/protected"),
    15_000,
  );
  await driver.wait(
    async () => !/Verificando acceso autorizado/.test(await bodyText()),
    15_000,
  );
}

async function assertForbidden(path) {
  await driver.get(`${baseUrl}${path}`);
  await driver.wait(
    async () => {
      const url = await driver.getCurrentUrl();
      const page = await bodyText();
      return /\/forbidden/.test(url) || /No tienes permiso para abrir este modulo/.test(page);
    },
    10_000,
  );
}

async function currentRole() {
  return driver.executeAsyncScript(
    "const done=arguments[arguments.length-1]; fetch('/api/auth/session',{cache:'no-store'}).then(async r=>done(await r.json())).catch(error=>done({error:String(error)}));",
  );
}

async function request(path, expectedStatus = 200) {
  const result = await driver.executeAsyncScript(
    `const done=arguments[arguments.length-1]; fetch(${JSON.stringify(path)},{cache:'no-store',redirect:'manual'}).then(async response=>{const raw=await response.text(); let body=null; try{body=JSON.parse(raw)}catch{} done({body,status:response.status})}).catch(error=>done({error:String(error),status:0}));`,
  );
  assert.equal(result.status, expectedStatus, `${path} unexpected status`);
  assertNoFalseSuccess(result, path);
  return result.body;
}

async function capture(name) {
  const screenshot = await driver.takeScreenshot();
  await writeFile(resolve(artifacts, `${name}.png`), screenshot, "base64");
}

async function waitForDashboard(title) {
  await driver.wait(
    until.elementLocated(By.css("[data-testid=official-branch-bi]")),
    15_000,
  );
  assert.match(await bodyText(), new RegExp(title));
}

async function expectNavigation({
  managerBonuses,
  roleKey,
  roleHome,
  users,
}) {
  const session = await currentRole();
  assert.equal(session.ok, true, "session endpoint must be successful");
  assert.equal(session.user?.roleKey, roleKey, "session must resolve the assigned role");
  const page = await bodyText();
  if (roleHome) assert.match(page, /Inicio por rol/);
  else assert.doesNotMatch(page, /Inicio por rol/);
  if (managerBonuses) assert.match(page, /Gerentes y bonos/);
  else assert.doesNotMatch(page, /Gerentes y bonos/);
  if (users) assert.match(page, /Usuarios y permisos/);
  else assert.doesNotMatch(page, /Usuarios y permisos/);
}

try {
  const currency = await admin.from("currencies").select("id").limit(1).single();
  fail(currency.error, "QA currency lookup");
  const organization = await admin
    .from("organizations")
    .insert({
      is_demo: false,
      name: `QA RELEASE ${run}`,
      slug: `qa-release-${run}`,
    })
    .select("id")
    .single();
  fail(organization.error, "QA organization creation");
  organizationId = organization.data.id;
  const [country, outsideCountry] = await Promise.all([
    admin
      .from("countries")
      .insert({
        currency_id: currency.data.id,
        date_format: "YYYY-MM-DD",
        is_demo: false,
        iso2: "QA",
        name: "QA Sintético",
        organization_id: organizationId,
        time_zone: "UTC",
      })
      .select("id")
      .single(),
    admin
      .from("countries")
      .insert({
        currency_id: currency.data.id,
        date_format: "YYYY-MM-DD",
        is_demo: false,
        iso2: "QB",
        name: "QA Fuera de alcance",
        organization_id: organizationId,
        time_zone: "UTC",
      })
      .select("id")
      .single(),
  ]);
  fail(country.error, "QA country creation");
  fail(outsideCountry.error, "QA outside-country creation");
  const company = await admin
    .from("companies")
    .insert({
      is_demo: false,
      key: `qa-${run}`,
      name: "QA Fisioterapia",
      organization_id: organizationId,
      unit_type: "fisioterapia",
    })
    .select("id")
    .single();
  fail(company.error, "QA company creation");
  const line = await admin
    .from("business_lines")
    .insert({
      code: "PHYSIOTHERAPY",
      company_id: company.data.id,
      is_demo: false,
      name: "Fisioterapia",
      organization_id: organizationId,
    })
    .select("id")
    .single();
  fail(line.error, "QA business-line creation");
  const area = await admin
    .from("operational_areas")
    .insert({
      code: `QA-${run}`,
      company_id: company.data.id,
      country_id: country.data.id,
      name: "Área QA",
      organization_id: organizationId,
      status: "active",
    })
    .select("id")
    .single();
  fail(area.error, "QA area creation");
  const branches = await admin
    .from("branches")
    .insert([
      {
        city: "QA",
        code: `QA-${run}-A`,
        company_id: company.data.id,
        country_id: country.data.id,
        is_demo: false,
        name: "Sucursal QA A",
        operational_area_id: area.data.id,
        organization_id: organizationId,
        status: "active",
      },
      {
        city: "QA",
        code: `QA-${run}-B`,
        company_id: company.data.id,
        country_id: country.data.id,
        is_demo: false,
        name: "Sucursal QA B",
        operational_area_id: area.data.id,
        organization_id: organizationId,
        status: "active",
      },
    ])
    .select("id,name")
    .order("name");
  fail(branches.error, "QA branch creation");
  assert.equal(branches.data.length, 2, "QA requires two real branch records");
  const [branchA] = branches.data;
  const [ceoId, gaId, goId, gsId] = await Promise.all(
    Object.values(emails).map((email) => createUser(email)),
  );
  const profiles = await admin.from("profiles").upsert([
    {
      default_branch_id: branchA.id,
      default_company_id: company.data.id,
      default_country_id: country.data.id,
      display_name: "CEO QA",
      email: emails.ceo,
      id: ceoId,
      organization_id: organizationId,
      status: "active",
    },
    {
      default_branch_id: branchA.id,
      default_company_id: company.data.id,
      default_country_id: country.data.id,
      display_name: "GO QA",
      email: emails.go,
      id: goId,
      organization_id: organizationId,
      status: "active",
    },
    {
      default_branch_id: branchA.id,
      default_company_id: company.data.id,
      default_country_id: country.data.id,
      display_name: "GA QA",
      email: emails.ga,
      id: gaId,
      organization_id: organizationId,
      status: "active",
    },
    {
      default_branch_id: branchA.id,
      default_company_id: company.data.id,
      default_country_id: country.data.id,
      display_name: "GS QA",
      email: emails.gs,
      id: gsId,
      organization_id: organizationId,
      status: "active",
    },
  ]);
  fail(profiles.error, "QA profile creation");
  const roles = await admin
    .from("roles")
    .select("id,key")
    .in("key", ["ceo", "gerente_operaciones", "gerente_area", "gerente_sucursal"]);
  fail(roles.error, "QA role lookup");
  const roleId = Object.fromEntries(roles.data.map((role) => [role.key, role.id]));
  assert.ok(
    roleId.ceo &&
      roleId.gerente_operaciones &&
      roleId.gerente_area &&
      roleId.gerente_sucursal,
    "QA role catalog is incomplete",
  );
  const grants = await admin.from("user_roles").insert([
    {
      organization_id: organizationId,
      role_id: roleId.ceo,
      status: "active",
      user_id: ceoId,
    },
    {
      country_id: country.data.id,
      organization_id: organizationId,
      role_id: roleId.gerente_operaciones,
      status: "active",
      user_id: goId,
    },
    {
      company_id: company.data.id,
      country_id: country.data.id,
      operational_area_id: area.data.id,
      organization_id: organizationId,
      role_id: roleId.gerente_area,
      status: "active",
      user_id: gaId,
    },
    {
      branch_id: branchA.id,
      business_line_code: "PHYSIOTHERAPY",
      business_line_id: line.data.id,
      company_id: company.data.id,
      country_id: country.data.id,
      operational_area_id: area.data.id,
      organization_id: organizationId,
      role_id: roleId.gerente_sucursal,
      status: "active",
      user_id: gsId,
    },
  ]);
  fail(grants.error, "QA scoped role grants");
  fail(
    (
      await admin
        .from("operational_areas")
        .update({ manager_profile_id: gaId })
        .eq("id", area.data.id)
    ).error,
    "QA area manager assignment",
  );
  const branchManager = await admin.from("branch_managers").insert({
    branch_id: branchA.id,
    display_name: "GS QA",
    email: emails.gs,
    is_demo: false,
    organization_id: organizationId,
    profile_id: gsId,
  });
  fail(branchManager.error, "QA branch manager assignment");

  const options = new chrome.Options().addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--window-size=1440,1200",
  );
  driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  await driver.manage().setTimeouts({
    implicit: 0,
    pageLoad: 30_000,
    script: 15_000,
  });

  await login(emails.ceo);
  await expectNavigation({
    managerBonuses: true,
    roleHome: true,
    roleKey: "ceo",
    users: false,
  });
  await driver.get(`${baseUrl}/protected`);
  await waitForDashboard("Panel ejecutivo");
  await driver.get(`${baseUrl}/protected/sucursales`);
  await waitForDashboard("Sucursales");
  assert.ok(
    (await driver.findElements(By.css("[data-testid=official-branch-bi] tbody tr"))).length >= 2,
    "CEO ranking must render every authorized branch",
  );
  await request("/api/context/options");
  await request("/api/users/manager-incentives");
  await driver.get(`${baseUrl}/protected/gerentes`);
  await driver.wait(
    until.elementLocated(By.xpath("//*[normalize-space(.)='Gerentes y bonos']")),
    15_000,
  );
  await capture("ceo");

  await login(emails.go);
  await expectNavigation({
    managerBonuses: false,
    roleHome: false,
    roleKey: "gerente_operaciones",
    users: true,
  });
  await driver.get(`${baseUrl}/protected`);
  await waitForDashboard("Resultados operativos");
  assert.equal(
    (await driver.findElements(By.css('select[aria-label="País"]'))).length,
    0,
    "GO country must be fixed instead of selectable",
  );
  await driver.findElement(By.xpath("//button[contains(., 'Periodo') or contains(., 'Filtros')]")).click();
  assert.equal(
    (await driver.findElements(By.css('select[aria-label="Gerente"]'))).length,
    0,
    "A one-option manager filter must stay hidden; the global header owns all visible filters.",
  );
  const insideCreation = await request(
    "/api/branches",
  );
  assert.ok(Array.isArray(insideCreation.items), "GO branch listing must be scoped");
  const createInside = await driver.executeAsyncScript(
    `const done=arguments[arguments.length-1]; fetch('/api/branches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify({
      city: "QA",
      code: `QA-${run}-GO`,
      name: "Sucursal QA GO",
      reason: "Prueba de alcance nacional GO",
      scope: {
        companyId: company.data.id,
        countryId: country.data.id,
        operationalAreaId: area.data.id,
        organizationId,
      },
    })})}).then(async response=>done({body:await response.json(),status:response.status})).catch(error=>done({error:String(error),status:0}));`,
  );
  assert.equal(createInside.status, 200, "GO must create a branch in-country");
  assertNoFalseSuccess(createInside, "GO in-country branch creation");
  const createOutside = await driver.executeAsyncScript(
    `const done=arguments[arguments.length-1]; fetch('/api/branches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify({
      city: "QA",
      code: `QA-${run}-OUT`,
      name: "Sucursal QA fuera de alcance",
      reason: "Prueba de bloqueo por país GO",
      scope: {
        companyId: company.data.id,
        countryId: outsideCountry.data.id,
        organizationId,
      },
    })})}).then(async response=>done({body:await response.json(),status:response.status})).catch(error=>done({error:String(error),status:0}));`,
  );
  assert.equal(createOutside.status, 403, "GO must not create a branch outside country");
  assert.equal(createOutside.body?.ok, false, "outside-country branch must be explicitly denied");
  await request("/api/users/manager-incentives", 403);
  await assertForbidden("/protected/gerentes");
  await capture("go");

  await login(emails.ga);
  await expectNavigation({
    managerBonuses: false,
    roleHome: false,
    roleKey: "gerente_area",
    users: false,
  });
  await driver.executeScript("performance.clearResourceTimings()");
  const gaDashboardStartedAt = Date.now();
  await driver.get(`${baseUrl}/protected/resultados`);
  await waitForDashboard("Resultados operativos");
  timings.gaDashboardMs = Date.now() - gaDashboardStartedAt;
  assert.equal(
    (await driver.findElements(By.css('select[aria-label="País"]'))).length,
    0,
    "GA fixed country must not render a selector",
  );
  assert.equal(
    (await driver.findElements(By.css('select[aria-label="Área"]'))).length,
    0,
    "GA single area must not render a selector",
  );
  await driver.findElement(By.xpath("//button[contains(., 'Periodo') or contains(., 'Filtros')]")).click();
  const branchFilter = await driver.wait(until.elementLocated(By.css('select[aria-label="Sucursal"]')), 10_000);
  await branchFilter.sendKeys("Sucursal QA B");
  const apply = await driver.findElement(By.xpath("//button[normalize-space(.)='Aplicar filtros']"));
  const filterApplyStartedAt = Date.now();
  await apply.click();
  timings.filterApplyMs = Date.now() - filterApplyStartedAt;
  await driver.wait(
    async () => (await driver.getCurrentUrl()).includes("branch="),
    10_000,
  );
  const requestCounts = await driver.executeScript(
    "return performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('/api/context/options') || name.includes('/api/auth/session')).reduce((counts, name) => ({ ...counts, [name]: (counts[name] ?? 0) + 1 }), {});",
  );
  assert.ok(
    Object.values(requestCounts).every((count) => Number(count) <= 1),
    "The initial context requests must not be duplicated.",
  );
  assert.equal((await driver.findElements(By.css("[data-testid=bi-results-aggregate]"))).length, 1, "Resultados must use the aggregate view, not the branch ranking.");
  await driver.get(`${baseUrl}/protected/sucursales?branch=${branchA.id}&line=${line.data.id}`);
  await waitForDashboard("Sucursales");
  assert.equal((await driver.findElements(By.css("[data-testid=bi-branches-ranking]"))).length, 1, "Sucursales must use the ranking/heatmap view.");
  await request("/api/branches");
  const gaManagers = await request("/api/users/branch-managers");
  assert.ok(
    gaManagers.branchManagers.every(
      (manager) =>
        !("baseBonusAmount" in manager) && !("managementLevel" in manager),
    ),
    "GA manager directory must not expose compensation",
  );
  await request("/api/users/manager-incentives", 403);
  const gaCreate = await driver.executeAsyncScript(
    `const done=arguments[arguments.length-1]; fetch('/api/branches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify({
      city: "QA",
      code: `QA-${run}-GA`,
      name: "Sucursal QA GA",
      reason: "Prueba de bloqueo de gerente de área",
      scope: {
        companyId: company.data.id,
        countryId: country.data.id,
        operationalAreaId: area.data.id,
        organizationId,
      },
    })})}).then(async response=>done({body:await response.json(),status:response.status})).catch(error=>done({error:String(error),status:0}));`,
  );
  assert.equal(gaCreate.status, 403, "GA branch creation must be denied");
  await assertForbidden("/protected/usuarios-permisos");
  await driver.get(`${baseUrl}/protected/cierres`);
  await waitForDashboard("Historial de cierres");
  await driver.get(`${baseUrl}/protected/metas`);
  assert.doesNotMatch(await bodyText(), /configuration_error|backend anterior/i);
  assert.match(await bodyText(), /Sin cierres publicados|Sin meta aprobada/);
  await capture("ga");

  await login(emails.gs);
  await expectNavigation({
    managerBonuses: false,
    roleHome: false,
    roleKey: "gerente_sucursal",
    users: false,
  });
  await driver.get(`${baseUrl}/protected/mi-sucursal`);
  await waitForDashboard("Mi sucursal");
  assert.equal(
    (await driver.findElements(By.css('select[aria-label="Asignación"]'))).length,
    0,
    "GS with one assignment must not render a context selector",
  );
  assert.equal(
    (await driver.findElements(By.css('select[aria-label="País"], select[aria-label="Área"], select[aria-label="Gerente de sucursal"]'))).length,
    0,
    "GS must not receive country, area, or manager selectors",
  );
  await request("/api/users/manager-incentives", 403);
  await request("/api/users/branch-managers", 403);
  await assertForbidden("/protected/usuarios-permisos");
  await assertForbidden("/protected/gerentes");
  await driver.get(`${baseUrl}/protected/plantillas`);
  await driver.wait(
    until.elementLocated(By.css("[data-testid=monthly-derived-context]")),
    15_000,
  );
  await capture("gs-form-before-save");
  await driver.findElement(By.css("[data-testid=monthly-final-step]")).click();
  await driver.wait(
    until.elementLocated(By.css("[data-testid=monthly-final-evidence-step]")),
    10_000,
  );
  const saveButton = await driver.wait(
    until.elementLocated(By.css("[data-testid=monthly-save-draft]")),
    15_000,
  );
  await saveButton.click();
  await driver.wait(
    async () => /guardada como borrador/i.test(await bodyText()),
    15_000,
  );
  assert.ok(
    (await driver.findElements(By.css("[data-testid=monthly-pending-blockers]"))).length === 1,
    "An incomplete draft must show publication blockers as pending work.",
  );
  const evidenceInput = await driver.findElement(By.css("[data-testid=monthly-evidence-input]"));
  await evidenceInput.sendKeys(resolve("tests/e2e/fixtures/monthly-evidence.csv"));
  await driver.wait(
    async () => /Archivo\(s\) cargado\(s\)/.test(await bodyText()),
    30_000,
  );
  assert.match(await bodyText(), /monthly-evidence\.csv/, "The finalized CSV attachment must be visible.");
  await driver.executeScript(`window.__qaLastPublish = null; window.__qaLastSave = null; const originalFetch = window.fetch; window.fetch = async (...args) => { const response = await originalFetch(...args); const url = String(args[0]); if (url.includes('/api/monthly-submissions/publish')) { let body = null; try { body = await response.clone().json(); } catch {} window.__qaLastPublish = { status: response.status, body }; } if (url.endsWith('/api/monthly-submissions') && args[1]?.method === 'POST') { window.__qaLastSave = { request: args[1].body, status: response.status }; } return response; };`);
  await driver.findElement(By.css("[data-testid=monthly-publish]")).click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastPublish;")), 15_000);
  const incompletePublish = await driver.executeScript("return window.__qaLastPublish;");
  assert.equal(incompletePublish.status, 422, "Publishing an incomplete draft must be blocked.");
  assert.equal(incompletePublish.body?.error, "INCOMPLETE_MONTHLY_FORM", "The publish blocker must be explicit.");
  const formStepCount = (await driver.findElements(By.css("[data-testid=monthly-form-steps] button"))).length - 1;
  for (let stepIndex = 0; stepIndex < formStepCount; stepIndex += 1) {
    const formStepButtons = await driver.findElements(By.css("[data-testid=monthly-form-steps] button"));
    await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", formStepButtons[stepIndex]);
    await formStepButtons[stepIndex].click();
    await driver.wait(async () => (await driver.findElements(By.css("input[id^=monthly-]"))).length >= 0, 5_000);
    const inputs = await driver.findElements(By.css("input[id^=monthly-]:not([disabled])"));
    for (const input of inputs) {
      const type = await input.getAttribute("type");
      await input.clear();
      await input.sendKeys(type === "date" ? "09/30/2026" : type === "month" ? "09/2026" : type === "number" ? "1" : "Cierre QA");
    }
    const selects = await driver.findElements(By.css("select:not([disabled])"));
    for (const select of selects) {
      const isPeriod = await driver.executeScript("return Boolean(arguments[0].closest('[data-testid=monthly-period]'));", select);
      if (!isPeriod) {
        const choices = await select.findElements(By.css("option"));
        if (choices.length > 1) await choices[1].click();
      }
    }
  }
  const commercialStep = await driver.findElement(By.xpath("//button[contains(., 'Resultados comerciales')]"));
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", commercialStep);
  await commercialStep.click();
  const patientsTotal = await driver.wait(until.elementLocated(By.css("#monthly-patients_total")), 10_000);
  await patientsTotal.clear();
  await patientsTotal.sendKeys("1");
  await driver.executeScript("arguments[0].blur();", patientsTotal);
  await driver.wait(async () => (await patientsTotal.getAttribute("value")) === "1", 5_000);
  await driver.findElement(By.css("[data-testid=monthly-final-step]")).click();
  await driver.findElement(By.css("[data-testid=monthly-save-draft]")).click();
  await driver.wait(async () => /Versión 2 guardada como borrador/.test(await bodyText()), 15_000);
  const completedSave = JSON.parse(await driver.executeScript("return window.__qaLastSave?.request ?? '{}';"));
  assert.equal(completedSave.responses?.patients_total, 1, "The completed save must contain patients_total.");
  await driver.findElement(By.css("[data-testid=monthly-evidence-input]")).sendKeys(resolve("tests/e2e/fixtures/monthly-evidence.csv"));
  await driver.wait(async () => /Archivo\(s\) cargado\(s\)/.test(await bodyText()), 30_000);
  await driver.executeScript("window.__qaLastPublish = null;");
  await driver.findElement(By.css("[data-testid=monthly-publish]")).click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastPublish;")), 30_000);
  const finalPublish = await driver.executeScript("return window.__qaLastPublish;");
  assert.equal(finalPublish.status, 200, `Completed draft failed publication: ${JSON.stringify(finalPublish.body)}`);
  // Chromium may keep a page-load command pending after a multipart upload.
  // Navigate through the browser context so the bounded dashboard wait below
  // remains the authoritative readiness check.
  await driver.executeScript(
    "window.location.assign(arguments[0]);",
    `${baseUrl}/protected/cierres`,
  );
  await driver.wait(
    async () => (await driver.getCurrentUrl()).includes("/protected/cierres"),
    15_000,
  );
  await waitForDashboard("Historial de cierres");
  await capture("history");
  const historyPage = await bodyText();
  assert.ok(
    (await driver.findElements(By.css("[data-testid=bi-history-entry]"))).length >= 1,
    `The published closing must appear in the distinct history view. ${historyPage}`,
  );
  await request(
    `/api/monthly-submissions?branchId=${branchA.id}&businessLineId=${line.data.id}`,
  );
  await capture("gs");

  await writeFile(
    resolve(artifacts, "result.json"),
    JSON.stringify({ status: "passed", target: baseUrl, timings }, null, 2),
  );
  authenticatedQaPassed = true;
} finally {
  if (driver) await driver.quit();
  if (organizationId) {
    await cleanupQaOrganization(organizationId);
    const residue = await admin
      .from("organizations")
      .select("id")
      .eq("id", organizationId);
    fail(residue.error, "QA organization residue check");
    assert.equal(residue.data.length, 0, "QA organization residue must be zero");
  }
  for (const userId of userIds) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    fail(deleted.error, "QA auth cleanup");
  }
  const authUsers = await admin.auth.admin.listUsers({ perPage: 1000 });
  fail(authUsers.error, "QA auth residue check");
  assert.equal(
    authUsers.data.users.filter((user) => Object.values(emails).includes(user.email ?? "")).length,
    0,
    "QA auth residue must be zero",
  );
}

if (authenticatedQaPassed) {
  console.log(JSON.stringify({ authenticatedRoles: "PASS", qaCleanup: "PASS" }));
}
