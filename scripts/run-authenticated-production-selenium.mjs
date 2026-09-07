import { spawnSync } from "node:child_process";

const productionUrl = process.env.QA_BASE_URL ?? "https://web-clinqui7s-projects.vercel.app";
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
