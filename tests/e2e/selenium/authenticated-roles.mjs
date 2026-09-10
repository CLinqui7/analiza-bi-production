import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const baseUrl = (process.env.QA_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const artifacts = resolve("artifacts/selenium/authenticated-roles");
const monthlyEvidenceFixture = resolve(
  process.env.QA_EVIDENCE_PATH ?? "tests/e2e/fixtures/monthly-evidence.csv",
);
const monthlyEvidenceFileName = basename(monthlyEvidenceFixture);
await mkdir(artifacts, { recursive: true });

const fileEnv = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
function netlifyEnvironmentValue(name) {
  try {
    return execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["--yes", "netlify-cli@latest", "env:get", name],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return "";
  }
}
const env = {
  ...fileEnv,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL ?? netlifyEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY ?? netlifyEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
};
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
  gaPeer: `ga-peer-${run}@qa.invalid`,
  go: `go-${run}@qa.invalid`,
  gsA: `gs-a-${run}@qa.invalid`,
  gsB: `gs-b-${run}@qa.invalid`,
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
  await remove("kpi_targets");
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
  try {
    await driver.wait(
      async () => (await driver.getCurrentUrl()).includes("/protected") || (await driver.findElements(By.css(".border-red-200"))).length > 0,
      15_000,
    );
    if (!(await driver.getCurrentUrl()).includes("/protected")) {
      throw new Error(`Login rejected: ${(await bodyText()).slice(-400)}`);
    }
    await driver.wait(
      async () => !/Verificando acceso autorizado/.test(await bodyText()),
      15_000,
    );
  } catch (error) {
    throw new Error(`QA login did not complete at ${await driver.getCurrentUrl()}: ${(await bodyText()).slice(-700)}`, { cause: error });
  }
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

async function download(path, expectedStatus = 200) {
  const result = await driver.executeAsyncScript(
    `const done=arguments[arguments.length-1]; fetch(${JSON.stringify(path)},{cache:'no-store'}).then(async response=>{
      const bytes = new Uint8Array(await response.arrayBuffer());
      done({contentDisposition:response.headers.get('content-disposition') ?? '', contentType:response.headers.get('content-type') ?? '', bytes:Array.from(bytes), status:response.status});
    }).catch(error=>done({error:String(error),status:0}));`,
  );
  assert.equal(result.status, expectedStatus, `${path} unexpected download status`);
  return result;
}

async function postTargetImport(csv, dryRun) {
  return driver.executeAsyncScript(
    `const done=arguments[arguments.length-1]; const form=new FormData();
      form.append('file',new File([${JSON.stringify(csv)}],'kpi-targets-qa.csv',{type:'text/csv'}));
      form.append('dryRun',${JSON.stringify(String(dryRun))});
      fetch('/api/kpi-targets/import',{method:'POST',body:form}).then(async response=>{
        const raw=await response.text(); let body=null; try{body=JSON.parse(raw)}catch{} done({body,status:response.status});
      }).catch(error=>done({error:String(error),status:0}));`,
  );
}

function assertMonthlyTemplate(downloaded, lineName) {
  assert.match(downloaded.contentDisposition, /attachment; filename=.*\.xlsx/i, `${lineName} template must be an attachment.`);
  assert.match(downloaded.contentType, /spreadsheetml/i, `${lineName} template must be XLSX.`);
  const workbook = XLSX.read(Buffer.from(downloaded.bytes), { type: "buffer", cellFormula: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  assert.deepEqual(rows[0], ["Nombre de campo", "Campo técnico", "Descripción", "Obligatorio", "Tipo de dato", "Unidad", "Ejemplo no productivo", "Reglas de validación"]);
  assert.ok(rows.length > 1, `${lineName} template must contain form fields.`);
  assert.ok(rows.slice(1).some((row) => row[3] === "Sí"), `${lineName} template must identify required fields.`);
  assert.equal(Object.values(sheet).filter((cell) => cell && typeof cell === "object" && "f" in cell).length, 0, `${lineName} template must not contain formulas.`);
  assert.equal(rows.flat().filter((value) => typeof value === "string" && /^[=+@-]/.test(value.trim())).length, 0, `${lineName} template must not contain dangerous spreadsheet formulas.`);
}

async function installMonthlyFetchRecorder() {
  await driver.executeScript(`window.__qaLastPublish = null; window.__qaLastSave = null;
    if (!window.__qaMonthlyFetchRecorder) {
      window.__qaMonthlyFetchRecorder = true;
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const url = String(args[0]);
        if (url.includes('/api/monthly-submissions/publish')) {
          let body = null; try { body = await response.clone().json(); } catch {}
          window.__qaLastPublish = { status: response.status, body };
        }
        if (url.endsWith('/api/monthly-submissions') && args[1]?.method === 'POST') {
          let body = null; try { body = await response.clone().json(); } catch {}
          window.__qaLastSave = { body, request: args[1].body, status: response.status };
        }
        return response;
      };
    }`);
}

async function selectMonthlyAssignment(assignmentLabel, templateSlug) {
  const assignment = await driver.wait(until.elementLocated(By.css("[data-testid=monthly-assignment] select")), 15_000);
  let option = null;
  for (const candidate of await assignment.findElements(By.css("option"))) {
    if ((await candidate.getText()) === assignmentLabel) {
      option = candidate;
      break;
    }
  }
  assert.ok(option, `QA assignment must exist: ${assignmentLabel}`);
  const assignmentId = await option.getAttribute("value");
  await driver.executeScript(
    `const select=arguments[0], value=arguments[1];
      const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
      set.call(select,value); select.dispatchEvent(new Event('input',{bubbles:true})); select.dispatchEvent(new Event('change',{bubbles:true}));`,
    assignment,
    assignmentId,
  );
  const template = await driver.wait(until.elementLocated(By.css("[data-testid=monthly-download-template]")), 15_000);
  await driver.wait(
    async () => new RegExp(`/api/monthly-templates/${templateSlug}\\?format=xlsx$`).test(
      (await template.getAttribute("href")) ?? "",
    ),
    10_000,
  );
}

async function setMonthlyPeriod(period) {
  const periodSelect = await driver.wait(until.elementLocated(By.css("[data-testid=monthly-period] select")), 10_000);
  await driver.executeScript(
    `const select=arguments[0], value=arguments[1]; if (![...select.options].some(option=>option.value===value)) throw new Error('QA period unavailable: '+value);
      const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
      set.call(select,value); select.dispatchEvent(new Event('input',{bubbles:true})); select.dispatchEvent(new Event('change',{bubbles:true}));`,
    periodSelect,
    period,
  );
}

async function fillMonthlyForm(period) {
  const [year, month] = period.split("-");
  const dateValue = `${month}/28/${year}`;
  const formStepCount = (await driver.findElements(By.css("[data-testid=monthly-form-steps] button"))).length - 1;
  for (let stepIndex = 0; stepIndex < formStepCount; stepIndex += 1) {
    const formStepButtons = await driver.findElements(By.css("[data-testid=monthly-form-steps] button"));
    await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", formStepButtons[stepIndex]);
    await formStepButtons[stepIndex].click();
    const inputs = await driver.findElements(By.css("input[id^=monthly-]:not([disabled])"));
    for (const input of inputs) {
      const type = await input.getAttribute("type");
      await input.clear();
      await input.sendKeys(type === "date" ? dateValue : type === "month" ? `${month}/${year}` : type === "number" ? "1" : "Cierre QA");
    }
    const selects = await driver.findElements(By.css("select:not([disabled])"));
    for (const select of selects) {
      const contextual = await driver.executeScript("return Boolean(arguments[0].closest('[data-testid=monthly-period],[data-testid=monthly-assignment]'));", select);
      if (!contextual) {
        const choices = await select.findElements(By.css("option"));
        if (choices.length > 1) await choices[1].click();
      }
    }
  }
}

async function publishCompleteMonthlyLine({ assignmentLabel, branchId, lineId, lineName, period, templateSlug }) {
  await driver.get(`${baseUrl}/protected/plantillas`);
  await driver.wait(until.elementLocated(By.css("[data-testid=monthly-derived-context]")), 15_000);
  await selectMonthlyAssignment(assignmentLabel, templateSlug);
  await setMonthlyPeriod(period);
  await installMonthlyFetchRecorder();
  await driver.findElement(By.css("[data-testid=monthly-final-step]")).click();
  await capture("gs-final-step");
  await driver.findElement(By.css("[data-testid=monthly-save-draft]")).click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastSave;")), 15_000);
  const incompleteSave = await driver.executeScript("return window.__qaLastSave;");
  assert.equal(incompleteSave.status, 201, `${lineName} incomplete draft must be created with HTTP 201.`);
  assert.ok((await driver.findElements(By.css("[data-testid=monthly-pending-blockers]"))).length === 1, `${lineName} incomplete draft must expose blockers.`);
  await driver.findElement(By.css("[data-testid=monthly-evidence-input]")).sendKeys(monthlyEvidenceFixture);
  await driver.wait(async () => /Archivo\(s\) cargado\(s\)/.test(await bodyText()), 30_000);
  await driver.executeScript("window.__qaLastPublish = null;");
  await driver.findElement(By.css("[data-testid=monthly-publish]")).click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastPublish;")), 15_000);
  assert.equal((await driver.executeScript("return window.__qaLastPublish;")).status, 422, `${lineName} incomplete draft must not publish.`);
  await fillMonthlyForm(period);
  await driver.findElement(By.css("[data-testid=monthly-final-step]")).click();
  await driver.executeScript("window.__qaLastSave = null;");
  await driver.findElement(By.css("[data-testid=monthly-save-draft]")).click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastSave;")), 15_000);
  assert.equal((await driver.executeScript("return window.__qaLastSave;")).status, 201, `${lineName} completed draft must be versioned with HTTP 201.`);
  await driver.findElement(By.css("[data-testid=monthly-evidence-input]")).sendKeys(monthlyEvidenceFixture);
  await driver.wait(async () => /Archivo\(s\) cargado\(s\)/.test(await bodyText()), 30_000);
  await driver.executeScript("window.__qaLastPublish = null;");
  await driver.findElement(By.css("[data-testid=monthly-publish]")).click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastPublish;")), 30_000);
  const published = await driver.executeScript("return window.__qaLastPublish;");
  assert.equal(published.status, 200, `${lineName} completed draft must publish: ${JSON.stringify(published.body)}`);
  const closing = await admin.from("closing_versions").select("id,status").eq("branch_id", branchId).eq("business_line_id", lineId).eq("period_start", `${period}-01`).eq("status", "published").maybeSingle();
  fail(closing.error, `${lineName} published closing lookup`);
  assert.ok(closing.data?.id, `${lineName} must create an official published closing.`);
  const kpis = await admin.from("closing_kpi_results").select("id").eq("closing_version_id", closing.data.id);
  fail(kpis.error, `${lineName} KPI lookup`);
  assert.ok(kpis.data.length > 0, `${lineName} closing must produce KPI results.`);
  const periodQuery = `from=${period}-01&to=${period}-28&branch=${branchId}&line=${lineId}`;
  await driver.get(`${baseUrl}/protected/resultados?${periodQuery}`);
  await waitForDashboard("Resultados operativos");
  assert.match(await bodyText(), new RegExp(lineName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${lineName} must be visible in Resultados.`);
  await driver.get(`${baseUrl}/protected/cierres?${periodQuery}`);
  await waitForDashboard("Historial de cierres");
  assert.ok((await driver.findElements(By.css("[data-testid=bi-history-entry]"))).length >= 1, `${lineName} must be visible in Historial.`);
}

async function verifyManagerLineViews({ branchId, lineId, lineName, period }) {
  const periodQuery = `from=${period}-01&to=${period}-28&branch=${branchId}&line=${lineId}`;
  const escapedName = new RegExp(lineName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  await driver.get(`${baseUrl}/protected/resultados?${periodQuery}`);
  await waitForDashboard("Resultados operativos");
  assert.match(await bodyText(), escapedName, `${lineName} must remain isolated in Resultados.`);
  await driver.get(`${baseUrl}/protected/sucursales?${periodQuery}`);
  await waitForDashboard("Sucursales");
  assert.match(await bodyText(), escapedName, `${lineName} must remain isolated in Sucursales.`);
  await driver.get(`${baseUrl}/protected/cierres?${periodQuery}`);
  await waitForDashboard("Historial de cierres");
  assert.ok((await driver.findElements(By.css("[data-testid=bi-history-entry]"))).length >= 1, `${lineName} must remain visible in Historial.`);
}

async function capture(name) {
  const screenshot = await driver.takeScreenshot();
  await writeFile(resolve(artifacts, `${name}.png`), screenshot, "base64");
}

async function waitForDashboard(title) {
  try {
    await driver.wait(
      until.elementLocated(By.css("[data-testid=official-branch-bi]")),
      15_000,
    );
    assert.match(await bodyText(), new RegExp(title));
  } catch (error) {
    throw new Error(`Dashboard ${title} did not become ready at ${await driver.getCurrentUrl()}: ${(await bodyText()).slice(0, 500)}`, { cause: error });
  }
}

async function assertNoDuplicateReactKeyWarnings(context) {
  const entries = await driver.manage().logs().get("browser");
  const duplicateKeyWarnings = entries
    .map((entry) => entry.message)
    .filter((message) => /Encountered two children with the same key/.test(message));
  assert.deepEqual(
    duplicateKeyWarnings,
    [],
    `${context} must render every branch-line unit with a unique React key.`,
  );
}

async function setGlobalPeriod(from, to) {
  const fromInput = await driver.wait(until.elementLocated(By.css('input[aria-label="Fecha desde"]')), 10_000);
  const toInput = await driver.wait(until.elementLocated(By.css('input[aria-label="Fecha hasta"]')), 10_000);
  await driver.executeScript(
    `const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
     for (const [input, value] of [[arguments[0], arguments[2]], [arguments[1], arguments[3]]]) {
       set.call(input, value);
       input.dispatchEvent(new Event('input', { bubbles: true }));
       input.dispatchEvent(new Event('change', { bubbles: true }));
     }`,
    fromInput,
    toInput,
    from,
    to,
  );
}

async function openGlobalFilters() {
  const visibleDateInputs = await driver.findElements(By.css('input[aria-label="Fecha desde"]'));
  if (visibleDateInputs.length === 0) {
    await driver.findElement(By.xpath("//button[contains(., 'Periodo') or contains(., 'Filtros')]")).click();
  }
  await driver.wait(until.elementLocated(By.css('input[aria-label="Fecha desde"]')), 15_000);
}

async function waitForGlobalScope(queryPart) {
  try {
    await driver.wait(
      async () => (await driver.getCurrentUrl()).includes(queryPart),
      30_000,
    );
  } catch {
    throw new Error(`Global filter was not applied: expected ${queryPart}; current ${(await driver.getCurrentUrl())}`);
  }
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
  const country = await admin
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
    .single();
  fail(country.error, "QA country creation");
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
  const laboratoryLine = await admin
    .from("business_lines")
    .insert({
      code: "LABORATORY",
      company_id: company.data.id,
      is_demo: false,
      name: "Laboratorio QA",
      organization_id: organizationId,
    })
    .select("id")
    .single();
  fail(laboratoryLine.error, "QA second business-line creation");
  const imagingLine = await admin
    .from("business_lines")
    .insert({
      code: "IMAGING",
      company_id: company.data.id,
      is_demo: false,
      name: "Imágenes QA",
      organization_id: organizationId,
    })
    .select("id")
    .single();
  fail(imagingLine.error, "QA imaging business-line creation");
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
  const peerArea = await admin
    .from("operational_areas")
    .insert({
      code: `QA-${run}-PEER`,
      company_id: company.data.id,
      country_id: country.data.id,
      name: "Área QA par",
      organization_id: organizationId,
      status: "active",
    })
    .select("id")
    .single();
  fail(peerArea.error, "QA peer area creation");
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
  const [branchA, branchB] = branches.data;
  const [ceoId, gaId, gaPeerId, goId, gsAId, gsBId] = await Promise.all(
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
      display_name: "GA QA par",
      email: emails.gaPeer,
      id: gaPeerId,
      organization_id: organizationId,
      status: "active",
    },
    {
      default_branch_id: branchA.id,
      default_company_id: company.data.id,
      default_country_id: country.data.id,
      display_name: "GS QA A",
      email: emails.gsA,
      id: gsAId,
      organization_id: organizationId,
      status: "active",
    },
    {
      default_branch_id: branchB.id,
      default_company_id: company.data.id,
      default_country_id: country.data.id,
      display_name: "GS QA B",
      email: emails.gsB,
      id: gsBId,
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
      company_id: company.data.id,
      country_id: country.data.id,
      operational_area_id: peerArea.data.id,
      organization_id: organizationId,
      role_id: roleId.gerente_area,
      status: "active",
      user_id: gaPeerId,
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
      user_id: gsAId,
    },
    {
      branch_id: branchA.id,
      business_line_code: "LABORATORY",
      business_line_id: laboratoryLine.data.id,
      company_id: company.data.id,
      country_id: country.data.id,
      operational_area_id: area.data.id,
      organization_id: organizationId,
      role_id: roleId.gerente_sucursal,
      status: "active",
      user_id: gsAId,
    },
    {
      branch_id: branchA.id,
      business_line_code: "IMAGING",
      business_line_id: imagingLine.data.id,
      company_id: company.data.id,
      country_id: country.data.id,
      operational_area_id: area.data.id,
      organization_id: organizationId,
      role_id: roleId.gerente_sucursal,
      status: "active",
      user_id: gsAId,
    },
    {
      branch_id: branchB.id,
      business_line_code: "PHYSIOTHERAPY",
      business_line_id: line.data.id,
      company_id: company.data.id,
      country_id: country.data.id,
      operational_area_id: area.data.id,
      organization_id: organizationId,
      role_id: roleId.gerente_sucursal,
      status: "active",
      user_id: gsBId,
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
  fail(
    (
      await admin
        .from("operational_areas")
        .update({ manager_profile_id: gaPeerId })
        .eq("id", peerArea.data.id)
    ).error,
    "QA peer area manager assignment",
  );
  const branchManager = await admin.from("branch_managers").insert({
    branch_id: branchA.id,
    display_name: "GS QA A",
    email: emails.gsA,
    is_demo: false,
    organization_id: organizationId,
    profile_id: gsAId,
  });
  fail(branchManager.error, "QA branch manager assignment");
  const branchManagerB = await admin.from("branch_managers").insert({
    branch_id: branchB.id,
    display_name: "GS QA B",
    email: emails.gsB,
    is_demo: false,
    organization_id: organizationId,
    profile_id: gsBId,
  });
  fail(branchManagerB.error, "QA second branch manager assignment");

  const closingFixtures = [
    { branch: branchA, line: line.data.id, period: "2026-07", revenue: 1100, volume: 11 },
    { branch: branchA, line: line.data.id, period: "2026-08", revenue: 2100, volume: 21 },
    { branch: branchB, line: line.data.id, period: "2026-07", revenue: 3100, volume: 31 },
    { branch: branchB, line: line.data.id, period: "2026-08", revenue: 4100, volume: 41 },
    { branch: branchA, line: laboratoryLine.data.id, period: "2026-07", revenue: 5100, volume: 51 },
    { branch: branchA, line: laboratoryLine.data.id, period: "2026-08", revenue: 6100, volume: 61 },
  ];
  for (const fixture of closingFixtures) {
    const [year, month] = fixture.period.split("-");
    const lastDay = month === "02" ? "28" : month === "07" ? "31" : "31";
    const closing = await admin.from("closing_versions").insert({
      branch_id: fixture.branch.id,
      business_line_id: fixture.line,
      company_id: company.data.id,
      country_id: country.data.id,
      is_demo: false,
      operational_area_id: area.data.id,
      organization_id: organizationId,
      period_end: `${year}-${month}-${lastDay}`,
      period_start: `${year}-${month}-01`,
      published_at: "2026-09-01T00:00:00.000Z",
      quality_score: 95,
      source_kind: "manual",
      status: "published",
      version_number: 1,
    }).select("id").single();
    fail(closing.error, `QA ${fixture.period} closing fixture`);
    const kpis = await admin.from("closing_kpi_results").insert([
      {
        category: "commercial",
        closing_version_id: closing.data.id,
        data_status: "CALCULATED",
        formula_version: "qa-fixture-v1",
        is_demo: false,
        kpi_code: "revenue_qa",
        kpi_name: "Ingresos QA",
        unit: "currency",
        value: fixture.revenue,
      },
      {
        category: "operational",
        closing_version_id: closing.data.id,
        data_status: "CALCULATED",
        formula_version: "qa-fixture-v1",
        is_demo: false,
        kpi_code: "volume_qa",
        kpi_name: "Volumen QA",
        unit: "count",
        value: fixture.volume,
      },
    ]);
    fail(kpis.error, `QA ${fixture.period} KPI fixture`);
  }
  const target = await admin.from("kpi_targets").insert({
    approved_at: "2026-08-01T00:00:00.000Z",
    branch_id: branchA.id,
    business_line_id: line.data.id,
    business_line: "PHYSIOTHERAPY",
    company_id: company.data.id,
    country_id: country.data.id,
    direction: "HIGHER_IS_BETTER",
    is_demo: false,
    kpi_code: "revenue_qa",
    kpi_name: "Ingresos QA",
    operational_area_id: area.data.id,
    organization_id: organizationId,
    period_start: "2026-08-01",
    status: "approved",
    target_value: 2000,
    unit: "currency",
  });
  fail(target.error, "QA approved KPI target fixture");

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
  const ceoContextOptions = await request("/api/context/options");
  const ceoManagerIds = ceoContextOptions.options.managers.map((manager) => manager.id);
  assert.deepEqual(
    new Set(ceoManagerIds),
    new Set([gaId, gaPeerId, gsAId, gsBId]),
    "CEO must receive only the permitted GA and GS UUID manager options.",
  );
  await openGlobalFilters();
  assert.ok(
    (await driver.findElements(By.css('select[aria-label="Gerente"]'))).length === 1,
    "CEO with at least two real permitted managers must see the manager selector.",
  );
  for (const [slug, name] of [["laboratory", "Laboratorio"], ["imaging", "Imágenes"], ["physiotherapy", "Fisioterapia"]]) {
    assertMonthlyTemplate(await download(`/api/monthly-templates/${slug}?format=xlsx`), name);
    const csvTemplate = await download(`/api/monthly-templates/${slug}?format=csv`);
    assert.match(csvTemplate.contentDisposition, /attachment; filename=.*\.csv/i, `${name} CSV template must be an attachment.`);
    assert.match(Buffer.from(csvTemplate.bytes).toString("utf8"), /Campo técnico/, `${name} CSV template must retain the field contract.`);
  }
  const targetTemplate = await download("/api/kpi-targets/import");
  assert.match(targetTemplate.contentDisposition, /attachment; filename="kpi-targets-template\.csv"/i, "Target template must be downloadable.");
  assert.match(Buffer.from(targetTemplate.bytes).toString("utf8"), /country_id,company_id,operational_area_id,branch_id,business_line_id,period,kpi_code/, "Target template must retain the import contract.");
  const targetHeader = "country_id,company_id,operational_area_id,branch_id,business_line_id,period,kpi_code,kpi_name,target_value,unit,direction,approval_status";
  const targetCsv = `${targetHeader}\n${country.data.id},${company.data.id},${area.data.id},${branchA.id},${line.data.id},2026-08,target_import_qa,Meta importada QA,2000,currency,HIGHER_IS_BETTER,approved\n`;
  const targetDryRun = await postTargetImport(targetCsv, true);
  assert.equal(targetDryRun.status, 200, "Target import dry run must succeed.");
  assert.deepEqual(targetDryRun.body, { dryRun: true, rowsValid: 1, rowsRejected: 0 }, "Target dry run must validate the exact row.");
  const targetFirstApply = await postTargetImport(targetCsv, false);
  assert.equal(targetFirstApply.status, 200, "Target import apply must create the approved target.");
  assert.equal(targetFirstApply.body?.inserted, 1, "Target import first apply must insert exactly once.");
  const targetSecondApply = await postTargetImport(targetCsv, false);
  assert.equal(targetSecondApply.status, 200, "Target import repeated apply must upsert.");
  assert.equal(targetSecondApply.body?.updated, 1, "Target import repeated apply must update, not duplicate.");
  const invalidScopeCsv = `${targetHeader}\n00000000-0000-4000-8000-000000000001,${company.data.id},${area.data.id},${branchA.id},${line.data.id},2026-08,target_import_qa,Meta importada QA,2000,currency,HIGHER_IS_BETTER,approved\n`;
  const targetInvalidScope = await postTargetImport(invalidScopeCsv, true);
  assert.equal(targetInvalidScope.status, 422, "Target import must reject a catalog scope mismatch.");
  await request("/api/users/manager-incentives");
  await driver.get(`${baseUrl}/protected/gerentes`);
  await driver.wait(
    until.elementLocated(By.xpath("//*[normalize-space(.)='Gerentes y bonos']")),
    15_000,
  );
  await capture("ceo");

  await login(emails.go);
  await expectNavigation({
    managerBonuses: true,
    roleHome: false,
    roleKey: "gerente_operaciones",
    users: true,
  });
  await driver.get(`${baseUrl}/protected`);
  await waitForDashboard("Panel ejecutivo");
  await openGlobalFilters();
  const goContextOptions = await request("/api/context/options");
  const goManagerIds = goContextOptions.options.managers.map((manager) => manager.id);
  assert.deepEqual(
    new Set(goManagerIds),
    new Set([gaId, gaPeerId, gsAId, gsBId]),
    "GO must receive the same manager options as CEO within the organization.",
  );
  const goManagerFilter = await driver.wait(until.elementLocated(By.css('select[aria-label="Gerente"]')), 10_000);
  const goManagerOptionValues = await goManagerFilter.findElements(By.css("option"));
  const goVisibleManagerIds = (await Promise.all(goManagerOptionValues.map((option) => option.getAttribute("value"))))
    .filter((value) => value && !value.startsWith("__"));
  assert.deepEqual(
    new Set(goVisibleManagerIds),
    new Set([gaId, gaPeerId, gsAId, gsBId]),
    "GO header must render the same manager options as CEO.",
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
  await request("/api/users/manager-incentives");
  await driver.get(`${baseUrl}/protected/gerentes`);
  await driver.wait(
    until.elementLocated(By.xpath("//*[normalize-space(.)='Gerentes y bonos']")),
    15_000,
  );
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
  const initialRequestCounts = await driver.executeScript(
    "return performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.includes('/api/context/options') || name.includes('/api/auth/session')).reduce((counts, name) => ({ ...counts, [name]: (counts[name] ?? 0) + 1 }), {});",
  );
  assert.ok(
    Object.values(initialRequestCounts).every((count) => Number(count) <= 1),
    "The initial context requests must not be duplicated.",
  );
  const gaContextOptions = await request("/api/context/options");
  assert.deepEqual(
    new Set(gaContextOptions.options.managers.map((manager) => manager.id)),
    new Set([gsAId, gsBId]),
    "GA context must expose only its GS UUIDs from the authoritative header source.",
  );
  await openGlobalFilters();
  await capture("ga-global-filters");
  const managerFilter = await driver.wait(until.elementLocated(By.css('select[aria-label="Gerente"]')), 10_000);
  const managerOptionValues = await managerFilter.findElements(By.css("option"));
  const managerIds = (await Promise.all(managerOptionValues.map((option) => option.getAttribute("value"))))
    .filter((value) => value && !value.startsWith("__"));
  assert.deepEqual(new Set(managerIds), new Set([gsAId, gsBId]), "GA manager options must use only actual GS UUID values.");
  await setGlobalPeriod("2026-07-01", "2026-07-31");
  let apply = await driver.findElement(By.xpath("//button[normalize-space(.)='Aplicar filtros']"));
  const filterApplyStartedAt = Date.now();
  await apply.click();
  timings.filterApplyMs = Date.now() - filterApplyStartedAt;
  await waitForGlobalScope("from=2026-07-01");
  assert.match(await bodyText(), /\$4,200/, "July must load only the July BI dataset after one Apply.");
  await openGlobalFilters();
  await setGlobalPeriod("2026-08-01", "2026-08-31");
  apply = await driver.findElement(By.xpath("//button[normalize-space(.)='Aplicar filtros']"));
  await apply.click();
  await waitForGlobalScope("from=2026-08-01");
  assert.match(await bodyText(), /\$6,200/, "August must replace July with the August BI dataset after one Apply.");
  await openGlobalFilters();
  const managerA = await driver.wait(until.elementLocated(By.css('select[aria-label="Gerente"]')), 10_000);
  await managerA.sendKeys("GS QA A");
  assert.equal(await driver.executeScript("return arguments[0].value;", managerA), gsAId, "Selecting GS A must submit its UUID, never its display name.");
  apply = await driver.findElement(By.xpath("//button[normalize-space(.)='Aplicar filtros']"));
  await apply.click();
  await waitForGlobalScope(`manager=${gsAId}`);
  const managerAResults = await driver.findElement(By.css("[data-testid=bi-results-aggregate]")).getText();
  assert.match(managerAResults, /Sucursal QA A/, "GS A filter must retain only GS A records.");
  assert.doesNotMatch(managerAResults, /Sucursal QA B/, "GS A filter must exclude GS B records.");
  await openGlobalFilters();
  const managerB = await driver.wait(until.elementLocated(By.css('select[aria-label="Gerente"]')), 10_000);
  await managerB.sendKeys("GS QA B");
  assert.equal(await driver.executeScript("return arguments[0].value;", managerB), gsBId, "Selecting GS B must submit its UUID, never its display name.");
  apply = await driver.findElement(By.xpath("//button[normalize-space(.)='Aplicar filtros']"));
  await apply.click();
  await waitForGlobalScope(`manager=${gsBId}`);
  const managerBResults = await driver.findElement(By.css("[data-testid=bi-results-aggregate]")).getText();
  assert.match(managerBResults, /Sucursal QA B/, "GS B filter must switch the BI scope to GS B records.");
  assert.doesNotMatch(managerBResults, /Sucursal QA A/, "GS B filter must exclude GS A records.");
  assert.equal((await driver.findElements(By.css("[data-testid=bi-results-aggregate]"))).length, 1, "Resultados must use the aggregate view, not the branch ranking.");
  await driver.get(`${baseUrl}/protected/sucursales?from=2026-08-01&to=2026-08-31`);
  await waitForDashboard("Sucursales");
  assert.equal((await driver.findElements(By.css("[data-testid=bi-branches-ranking]"))).length, 1, "Sucursales must use the ranking/heatmap view.");
  const branchLineText = await bodyText();
  assert.match(branchLineText, /Sucursal QA A\s+Fisioterapia/, "A branch + physiotherapy line must be its own BI unit.");
  assert.match(branchLineText, /Sucursal QA A\s+Laboratorio QA/, "The same branch + laboratory line must be a distinct BI unit.");
  assert.match(branchLineText, /\$2,100/, "Physiotherapy KPI must remain separate from the laboratory KPI.");
  assert.match(branchLineText, /\$6,100/, "Laboratory KPI must remain separate from the physiotherapy KPI.");
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
  await driver.get(`${baseUrl}/protected/metas?branch=${branchA.id}&line=${line.data.id}&from=2026-08-01&to=2026-08-31`);
  await driver.wait(
    until.elementLocated(By.css('[data-route-content-ready="official-targets"]')),
    20_000,
  );
  const targetsText = await bodyText();
  assert.doesNotMatch(targetsText, /configuration_error|backend anterior/i);
  assert.match(targetsText, /Metas aprobadas vs resultados/, "Metas must load the approved QA target.");
  assert.match(targetsText, /\$2,100/, "Metas must show the published actual KPI.");
  assert.match(targetsText, /\$2,000/, "Metas must show the approved target value.");
  assert.match(targetsText, /105%/, "Metas must calculate compliance from the real actual and target.");
  assert.match(targetsText, /Cumplido/, "Metas must expose the derived target state.");
  await capture("ga");

  await login(emails.gsA);
  await expectNavigation({
    managerBonuses: false,
    roleHome: false,
    roleKey: "gerente_sucursal",
    users: false,
  });
  await driver.get(`${baseUrl}/protected/mi-sucursal`);
  await waitForDashboard("Mi sucursal");
  assert.equal(
    (await driver.findElements(By.css('select[aria-label="País"], select[aria-label="Área"], select[aria-label="Gerente"]'))).length,
    0,
    "GS must not receive country, area, or manager selectors",
  );
  const gsContextOptions = await request("/api/context/options");
  assert.deepEqual(gsContextOptions.options.managers, [], "GS must not receive manager filter options.");
  await request("/api/users/manager-incentives", 403);
  await request("/api/users/branch-managers", 403);
  await assertForbidden("/protected/usuarios-permisos");
  await assertForbidden("/protected/gerentes");
  await driver.get(`${baseUrl}/protected/plantillas`);
  await driver.wait(
    until.elementLocated(By.css("[data-testid=monthly-derived-context]")),
    15_000,
  );
  assert.equal((await driver.findElements(By.css("[data-testid=monthly-assignment] select"))).length, 1, "GS with several branch+line assignments must choose the exact current unit.");
  await selectMonthlyAssignment("Sucursal QA A · Fisioterapia", "physiotherapy");
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
  await installMonthlyFetchRecorder();
  await saveButton.click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastSave;")), 15_000);
  const physiotherapyIncompleteSave = await driver.executeScript("return window.__qaLastSave;");
  assert.equal(physiotherapyIncompleteSave.status, 201, `Physiotherapy incomplete draft must be created with HTTP 201: ${JSON.stringify(physiotherapyIncompleteSave.body)}`);
  await capture("gs-incomplete-saved");
  assert.ok(
    (await driver.findElements(By.css("[data-testid=monthly-pending-blockers]"))).length === 1,
    "An incomplete draft must show publication blockers as pending work.",
  );
  const evidenceInput = await driver.findElement(By.css("[data-testid=monthly-evidence-input]"));
  await evidenceInput.sendKeys(monthlyEvidenceFixture);
  await driver.wait(
    async () => /Archivo\(s\) cargado\(s\)/.test(await bodyText()),
    30_000,
  );
  assert.match(
    await bodyText(),
    new RegExp(monthlyEvidenceFileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `The finalized ${monthlyEvidenceFileName} attachment must be visible.`,
  );
  await capture("gs-incomplete-attachment");
  await driver.executeScript("window.__qaLastPublish = null; window.__qaLastSave = null;");
  await driver.findElement(By.css("[data-testid=monthly-publish]")).click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastPublish;")), 15_000);
  const incompletePublish = await driver.executeScript("return window.__qaLastPublish;");
  assert.equal(incompletePublish.status, 422, "Publishing an incomplete draft must be blocked.");
  assert.equal(incompletePublish.body?.error, "INCOMPLETE_MONTHLY_FORM", "The publish blocker must be explicit.");
  await capture("gs-incomplete-blocked");
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
      const isContextSelect = await driver.executeScript(
        "return Boolean(arguments[0].closest('[data-testid=monthly-period],[data-testid=monthly-assignment]'));",
        select,
      );
      if (!isContextSelect) {
        const choices = await select.findElements(By.css("option"));
        if (choices.length > 1) await choices[1].click();
      }
    }
  }
  const physiotherapySteps = await driver.findElements(By.css("[data-testid=monthly-form-steps] button"));
  const commercialStep = physiotherapySteps[1];
  assert.ok(commercialStep, "Physiotherapy must render its production step.");
  assert.match(
    await commercialStep.getText(),
    /Produccion terapeutica/,
    "Physiotherapy must use its business-specific production label.",
  );
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", commercialStep);
  await commercialStep.click();
  const patientsTotal = await driver.wait(until.elementLocated(By.css("#monthly-patients_total")), 10_000);
  await patientsTotal.clear();
  await patientsTotal.sendKeys("1");
  await driver.executeScript("arguments[0].blur();", patientsTotal);
  await driver.wait(async () => (await patientsTotal.getAttribute("value")) === "1", 5_000);
  await capture("gs-form-filled");
  await driver.findElement(By.css("[data-testid=monthly-final-step]")).click();
  await driver.executeScript("window.__qaLastSave = null;");
  await driver.findElement(By.css("[data-testid=monthly-save-draft]")).click();
  await driver.wait(async () => Boolean(await driver.executeScript("return window.__qaLastSave;")), 15_000);
  const secondPhysiotherapySave = await driver.executeScript("return window.__qaLastSave;");
  assert.equal(secondPhysiotherapySave.status, 201, `Physiotherapy completed draft must be versioned with HTTP 201: ${JSON.stringify(secondPhysiotherapySave.body)}`);
  const completedSave = JSON.parse(secondPhysiotherapySave.request ?? "{}");
  assert.equal(completedSave.responses?.patients_total, 1, "The completed save must contain patients_total.");
  await driver.findElement(By.css("[data-testid=monthly-evidence-input]")).sendKeys(monthlyEvidenceFixture);
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
  await publishCompleteMonthlyLine({
    assignmentLabel: "Sucursal QA A · Laboratorio QA",
    branchId: branchA.id,
    lineId: laboratoryLine.data.id,
    lineName: "Laboratorio QA",
    period: "2026-06",
    templateSlug: "laboratory",
  });
  await publishCompleteMonthlyLine({
    assignmentLabel: "Sucursal QA A · Imágenes QA",
    branchId: branchA.id,
    lineId: imagingLine.data.id,
    lineName: "Imágenes QA",
    period: "2026-05",
    templateSlug: "imaging",
  });
  await login(emails.ga);
  for (const view of [
    { branchId: branchA.id, lineId: line.data.id, lineName: "Fisioterapia", period: "2026-09" },
    { branchId: branchA.id, lineId: laboratoryLine.data.id, lineName: "Laboratorio QA", period: "2026-06" },
    { branchId: branchA.id, lineId: imagingLine.data.id, lineName: "Imágenes QA", period: "2026-05" },
  ]) await verifyManagerLineViews(view);

  // Exercise multiple business lines in one branch. A branch-only React key
  // used to make lines vanish from the aggregate views and made the map
  // select the wrong unit.
  await driver.manage().logs().get("browser");
  const aggregatePeriodQuery = `from=2026-05-01&to=2026-09-30&branch=${branchA.id}`;
  await driver.get(`${baseUrl}/protected/resultados?${aggregatePeriodQuery}`);
  await waitForDashboard("Resultados operativos");
  const aggregateResults = await bodyText();
  for (const lineName of ["Fisioterapia", "Laboratorio QA", "Imágenes QA"]) {
    assert.match(aggregateResults, new RegExp(lineName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${lineName} must remain visible in aggregate Resultados.`);
  }
  await assertNoDuplicateReactKeyWarnings("Resultados aggregate view");

  await driver.manage().logs().get("browser");
  await driver.get(`${baseUrl}/protected/sucursales?${aggregatePeriodQuery}`);
  await waitForDashboard("Sucursales");
  const laboratoryUnit = await driver.wait(
    until.elementLocated(
      By.css(`[data-record-id="${branchA.id}:${laboratoryLine.data.id}"]`),
    ),
    15_000,
  );
  await laboratoryUnit.click();
  const drilldown = await driver.wait(
    until.elementLocated(By.css("[data-testid=bi-drilldown]")),
    10_000,
  );
  assert.match(
    await drilldown.getText(),
    /Laboratorio QA/,
    "Selecting a map unit must open that business line, not a sibling line of the same branch.",
  );
  await assertNoDuplicateReactKeyWarnings("Sucursal aggregate view");
  await capture("all-lines-published");

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
