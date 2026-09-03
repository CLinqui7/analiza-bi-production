import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

const baseUrl = (process.env.QA_BASE_URL ?? process.env.QA_TEST_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const output = resolve("artifacts/selenium");
const screenshots = resolve(output, "screenshots");
const network = resolve(output, "network");
await Promise.all([mkdir(screenshots, { recursive: true }), mkdir(network, { recursive: true })]);

const outcomes = [];
const startedAt = Date.now();
async function check(name, work) {
  const started = Date.now();
  try {
    await work();
    outcomes.push({ name, status: "passed", durationMs: Date.now() - started });
  } catch (error) {
    outcomes.push({ name, status: "failed", durationMs: Date.now() - started, error: error instanceof Error ? error.message : "unknown" });
  }
}

const options = new chrome.Options().addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1200");
let driver;
try {
  driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  await driver.manage().setTimeouts({ implicit: 0, pageLoad: 30_000, script: 15_000 });
  await check("login page is reachable", async () => {
    await driver.get(`${baseUrl}/auth/login`);
    await driver.wait(until.elementLocated(By.css("body")), 10_000);
    const title = await driver.getTitle();
    assert.ok(title.includes("Analiza"));
  });
  await check("light theme is forced", async () => {
    const rootClass = await driver.executeScript("return document.documentElement.className");
    assert.ok(!String(rootClass).split(/\s+/).includes("dark"));
    const background = await driver.executeScript("return getComputedStyle(document.body).backgroundColor");
    assert.notEqual(background, "rgb(0, 0, 0)");
  });
  await check("static visual assets answer successfully", async () => {
    const paths = ["/login-redesign/logo-analiza-white.png", "/login-redesign/logo-analiza-word.png", "/login-redesign/logo-ecosystem.png", "/interactive-core/interactive-core-logo.png", "/interactive-core/interactive-core-mark.png"];
    const results = await driver.executeAsyncScript(`const done=arguments[arguments.length-1]; Promise.all(${JSON.stringify(paths)}.map(async path=>({path,status:(await fetch(path,{cache:'no-store'})).status}))).then(done).catch(error=>done({error:String(error)}));`);
    assert.ok(Array.isArray(results));
    assert.deepEqual(results.map((result) => result.status), [200, 200, 200, 200, 200]);
    await writeFile(resolve(network, "assets.json"), JSON.stringify(results, null, 2));
  });
  await check("public endpoints avoid server failures", async () => {
    const paths = ["/api/health", "/api/imaging/closures", "/api/laboratory/closures", "/api/physiotherapy/closures"];
    const results = await driver.executeAsyncScript(`const done=arguments[arguments.length-1]; Promise.all(${JSON.stringify(paths)}.map(async path=>({path,status:(await fetch(path,{redirect:'manual',cache:'no-store'})).status}))).then(done).catch(error=>done({error:String(error)}));`);
    assert.ok(Array.isArray(results));
    assert.ok(results.every((result) => result.status !== 500 && result.status !== 503));
    await writeFile(resolve(network, "public-endpoints.json"), JSON.stringify(results, null, 2));
  });
  await driver.takeScreenshot().then((data) => writeFile(resolve(screenshots, "login.png"), data, "base64"));
} finally {
  if (driver) await driver.quit();
}

const report = { baseUrl, durationMs: Date.now() - startedAt, passed: outcomes.filter((item) => item.status === "passed").length, failed: outcomes.filter((item) => item.status === "failed").length, outcomes };
await writeFile(resolve(output, "results.json"), JSON.stringify(report, null, 2));
await writeFile(resolve(output, "report.html"), `<!doctype html><meta charset="utf-8"><title>Analiza Selenium QA</title><h1>Analiza Selenium QA</h1><p>${report.passed} passed, ${report.failed} failed</p><ul>${outcomes.map((item) => `<li>${item.status}: ${item.name} (${item.durationMs}ms)${item.error ? ` — ${item.error}` : ""}</li>`).join("")}</ul>`);
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, durationMs: report.durationMs }));
if (report.failed > 0) process.exitCode = 1;
