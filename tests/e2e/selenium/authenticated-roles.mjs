import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { createClient } from "@supabase/supabase-js";

const baseUrl = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
assert.ok(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY, "QA requires server-only Supabase credentials.");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const run = `qa${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
const password = `${randomBytes(24).toString("base64url")}Aa1!`;
const emails = { ga: `ga-${run}@qa.invalid`, gs: `gs-${run}@qa.invalid` };
let organizationId;
const userIds = [];

function fail(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function createUser(email, displayName) {
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  fail(result.error, "QA auth user creation");
  assert.ok(result.data.user?.id, "QA auth user id is required");
  userIds.push(result.data.user.id);
  return result.data.user.id;
}

async function text(driver) {
  return driver.findElement(By.css("body")).getText();
}

async function login(driver, email) {
  await driver.get(`${baseUrl}/auth/login`);
  await driver.findElement(By.id("email")).sendKeys(email);
  await driver.findElement(By.id("password")).sendKeys(password);
  await driver.findElement(By.css("button[type=submit]")).click();
  await driver.wait(async () => (await driver.getCurrentUrl()).includes("/protected"), 15_000);
}

async function assertForbidden(driver, path) {
  await driver.get(`${baseUrl}${path}`);
  await driver.wait(until.elementLocated(By.css("body")), 10_000);
  assert.match(await driver.getCurrentUrl(), /\/forbidden/, `${path} must be denied server-side`);
}

async function currentRole(driver) {
  return driver.executeAsyncScript("const done=arguments[arguments.length-1]; fetch('/api/auth/session').then((r)=>r.json()).then((body)=>done(body.user?.roleKey ?? null)).catch((error)=>done(String(error)))");
}

try {
  const currency = await admin.from("currencies").select("id").limit(1).single();
  fail(currency.error, "QA currency lookup");
  const organization = await admin.from("organizations").insert({ name: `QA RELEASE ${run}`, slug: `qa-release-${run}`, is_demo: false }).select("id").single();
  fail(organization.error, "QA organization creation");
  organizationId = organization.data.id;
  const country = await admin.from("countries").insert({ organization_id: organizationId, currency_id: currency.data.id, iso2: "QA", name: "QA Sintético", time_zone: "UTC", date_format: "YYYY-MM-DD", is_demo: false }).select("id").single();
  fail(country.error, "QA country creation");
  const company = await admin.from("companies").insert({ organization_id: organizationId, key: `qa-${run}`, name: "QA Fisioterapia", unit_type: "fisioterapia", is_demo: false }).select("id").single();
  fail(company.error, "QA company creation");
  const line = await admin.from("business_lines").insert({ organization_id: organizationId, company_id: company.data.id, code: "PHYSIOTHERAPY", name: "Fisioterapia", is_demo: false }).select("id").single();
  fail(line.error, "QA business-line creation");
  const area = await admin.from("operational_areas").insert({ organization_id: organizationId, country_id: country.data.id, company_id: company.data.id, code: `QA-${run}`, name: "Área QA", status: "active" }).select("id").single();
  fail(area.error, "QA area creation");
  const branch = await admin.from("branches").insert({ organization_id: organizationId, country_id: country.data.id, company_id: company.data.id, operational_area_id: area.data.id, code: `QA-${run}`, name: "Sucursal QA", city: "QA", is_demo: false, status: "active" }).select("id").single();
  fail(branch.error, "QA branch creation");
  const [gaId, gsId] = await Promise.all([createUser(emails.ga, "Gerente de Área QA"), createUser(emails.gs, "Gerente de Sucursal QA")]);
  const profiles = await admin.from("profiles").upsert([
    { id: gaId, organization_id: organizationId, email: emails.ga, display_name: "Gerente de Área QA", status: "active", default_country_id: country.data.id, default_company_id: company.data.id, default_branch_id: branch.data.id },
    { id: gsId, organization_id: organizationId, email: emails.gs, display_name: "Gerente de Sucursal QA", status: "active", default_country_id: country.data.id, default_company_id: company.data.id, default_branch_id: branch.data.id },
  ]);
  fail(profiles.error, "QA profile creation");
  const roles = await admin.from("roles").select("id,key").in("key", ["gerente_area", "gerente_sucursal"]);
  fail(roles.error, "QA role lookup");
  const roleId = Object.fromEntries(roles.data.map((role) => [role.key, role.id]));
  assert.ok(roleId.gerente_area && roleId.gerente_sucursal, "QA manager roles are required");
  const grants = await admin.from("user_roles").insert([
    { user_id: gaId, role_id: roleId.gerente_area, organization_id: organizationId, country_id: country.data.id, company_id: company.data.id, operational_area_id: area.data.id, branch_id: branch.data.id, status: "active" },
    { user_id: gsId, role_id: roleId.gerente_sucursal, organization_id: organizationId, country_id: country.data.id, company_id: company.data.id, operational_area_id: area.data.id, branch_id: branch.data.id, business_line_id: line.data.id, business_line_code: "PHYSIOTHERAPY", status: "active" },
  ]);
  fail(grants.error, "QA scoped role grants");
  fail((await admin.from("operational_areas").update({ manager_profile_id: gaId }).eq("id", area.data.id)).error, "QA area manager assignment");
  fail((await admin.from("branch_managers").insert({ organization_id: organizationId, branch_id: branch.data.id, profile_id: gsId, display_name: "Gerente de Sucursal QA", email: emails.gs, is_demo: false })).error, "QA branch manager assignment");

  const options = new chrome.Options().addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1200");
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  try {
    await driver.manage().setTimeouts({ implicit: 0, pageLoad: 30_000, script: 15_000 });
    await login(driver, emails.ga);
    assert.equal(await currentRole(driver), "gerente_area", "GA session must resolve its directory role");
    await assertForbidden(driver, "/protected/importaciones");
    await assertForbidden(driver, "/protected/plantillas");
    await assertForbidden(driver, "/protected/cierres/nuevo");
    await driver.get(`${baseUrl}/protected/overview`);
    assert.doesNotMatch(await text(driver), /Formulario mensual|Importaciones|Guardar avance DEMO|Publicar cierre DEMO/, "GA navigation must not expose the monthly form or demo actions");
    await driver.manage().deleteAllCookies();
    await login(driver, emails.gs);
    assert.equal(await currentRole(driver), "gerente_sucursal", "GS session must resolve its directory role");
    await driver.get(`${baseUrl}/protected/plantillas`);
    await driver.wait(until.elementLocated(By.css("[data-testid=monthly-derived-context]")), 15_000);
    const formText = await text(driver);
    assert.match(formText, /Cierre mensual controlado/);
    assert.match(formText, /Gerente de Sucursal QA/);
    assert.doesNotMatch(formText, /Gerente de Área QA.*<select/i, "GS must not select the area manager");
    const saveButton = await driver.wait(until.elementLocated(By.xpath("//button[normalize-space(.)='Guardar borrador']")), 15_000);
    await saveButton.click();
    await driver.wait(async () => /guardada como borrador/i.test(await text(driver)), 15_000);
    await driver.navigate().refresh();
    await driver.findElement(By.xpath("//button[contains(., 'Mostrar cierres')]")).click();
    await driver.wait(async () => /Sucursal QA/.test(await text(driver)), 15_000);
    await driver.get(`${baseUrl}/api/monthly-submissions?branchId=${branch.data.id}&businessLineId=${line.data.id}`);
    const apiBody = await driver.findElement(By.css("body")).getText();
    assert.match(apiBody, /"items"/, "GS history API must return scoped data");
  } finally {
    await driver.quit();
  }
  console.log(JSON.stringify({ gerenteArea: "PASS", gerenteSucursal: "PASS", monthlyForm: "PASS" }));
} finally {
  for (const userId of userIds) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    fail(deleted.error, "QA auth cleanup");
  }
  if (organizationId) {
    const deleted = await admin.from("organizations").delete().eq("id", organizationId);
    fail(deleted.error, "QA tenant cleanup");
  }
  const residue = await admin.auth.admin.listUsers({ perPage: 1000 });
  fail(residue.error, "QA residue check");
  assert.equal(residue.data.users.filter((user) => Object.values(emails).includes(user.email ?? "")).length, 0, "QA auth residue must be zero");
}
