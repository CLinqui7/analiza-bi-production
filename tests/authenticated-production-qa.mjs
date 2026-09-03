import assert from "node:assert/strict";

const baseUrl = process.env.QA_TEST_BASE_URL;
const email = process.env.QA_TEST_EMAIL;
const password = process.env.QA_TEST_PASSWORD;

if (!baseUrl || !email || !password) {
  console.log("authenticated-production-qa: SKIPPED (QA_TEST_* not configured)");
  process.exit(0);
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failures = [];
page.on("console", (message) => { if (message.type() === "error") failures.push(`console:${message.text()}`); });
page.on("response", (response) => { if (response.status() >= 500) failures.push(`network:${response.status()} ${response.url()}`); });

try {
  await page.goto(`${baseUrl.replace(/\/$/, "")}/auth/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/protected/**", { timeout: 20_000 });
  const results = await page.evaluate(async () => Promise.all([
    "/api/auth/session", "/api/account/profile", "/api/context/options", "/api/branches",
    "/api/users/branch-managers", "/api/users/manager-incentives", "/api/monthly-submissions",
    "/api/imaging/closures", "/api/laboratory/closures", "/api/physiotherapy/closures",
  ].map(async (path) => { const response = await fetch(path, { cache: "no-store" }); return { path, status: response.status, body: await response.json().catch(() => null) }; })));
  for (const result of results) {
    assert.ok(result.status >= 200 && result.status < 300, `${result.path} returned ${result.status}`);
    assert.ok(result.body && typeof result.body === "object", `${result.path} has no JSON response`);
  }
  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL("**/auth/login", { timeout: 20_000 });
  assert.deepEqual(failures, [], `Critical browser failures: ${failures.join(" | ")}`);
  console.log("authenticated-production-qa: PASS");
} finally {
  await browser.close();
}
