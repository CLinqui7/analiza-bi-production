import { spawnSync } from "node:child_process";

const steps = [
  ["secret scan", "npm", ["run", "scan:secrets"]],
  ["lint", "npm", ["run", "lint"]],
  ["typecheck", "npm", ["run", "typecheck"]],
  ["tests", "npm", ["run", "test"]],
  ["Supabase backend", "npm", ["run", "test:supabase-backend"]],
  ["build", "npm", ["run", "build"]],
  ["Selenium", "npm", ["run", "test:e2e:selenium"]],
];

for (const [name, command, args] of steps) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`RELEASE_GATE_FAILED:${name}`);
}
