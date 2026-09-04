import { spawnSync } from "node:child_process";

const productionUrl = "https://analizaintelligence.netlify.app";
const result = spawnSync(
  process.execPath,
  ["tests/e2e/selenium/authenticated-roles.mjs"],
  {
    env: { ...process.env, QA_BASE_URL: productionUrl },
    shell: false,
    stdio: "inherit",
  },
);

if (result.status !== 0) {
  throw new Error("AUTHENTICATED_PRODUCTION_SELENIUM_FAILED");
}
