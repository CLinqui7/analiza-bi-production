import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean);

const patterns = [
  ["JWT-like token", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ["OpenAI-like key", /sk-[A-Za-z0-9_-]{20,}/],
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{20,}/],
  ["PostgreSQL connection URL", /postgres(?:ql)?:\/\/[^\s"'`]+/i],
  [
    "assigned sensitive environment value",
    /(?:^|\s)(?:SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|SMTP_PASSWORD|ANALIZA_LOCAL_AUTH_SECRET)\s*=\s*["']?[^\s"']{12,}/i,
  ],
];

const findings = [];

for (const file of files) {
  let source;

  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    for (const [label, expression] of patterns) {
      if (expression.test(line)) {
        findings.push({ file, line: index + 1, pattern: label });
      }
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.pattern}]`);
  }

  process.exitCode = 1;
} else {
  console.log(`Secret scan passed for ${files.length} versioned candidate files.`);
}
