# Analiza Intelligence Agent Rules

These rules apply to all work in this repository.

## Engineering Baseline

- Use strict TypeScript.
- Do not use `any` without a written justification in the same change.
- Prefer existing project patterns before adding abstractions.
- Keep changes scoped to the active implementation phase.
- Create new migrations instead of modifying migrations that may have run.
- Document architectural decisions that affect security, data lineage, or KPI behavior.
- Do not deploy to production, production-like domains, or customer-visible environments without explicit authorization from the owner.
- Each sprint must finish with an independent, descriptive Git commit after validation passes.

## Security And Privacy

- Never expose secrets in source control, logs, screenshots, browser bundles, or documentation.
- Never store Supabase service role keys in browser code.
- Use server-only code for connector credentials and privileged Supabase operations.
- Enforce authorization server-side for every route, API, mutation, import, export, connector action, and privileged read; UI hiding is only an additional control.
- Do not use real patient data in development.
- Anonymize patient identifiers before analytics use.
- Avoid PII in logs, imports, exports, demo data, and support artifacts.
- Do not record passwords, tokens, cookies, MFA secrets, or connector secrets in audit logs.
- Never commit `.env`, service keys, database URLs, OpenAI keys, Supabase service role keys, SMTP credentials, cookies, MFA values, or temporary credential dumps.

## Data Integrity

- Mark all simulated data visibly as `DEMO`.
- Do not invent operational, financial, or clinical data.
- Do not invent KPIs, KPI formulas, KPI targets, KPI periods, or executive conclusions.
- Do not show metrics when essential fields are missing.
- Keep traceability for each analytic record back to its source file, connector, import, and transformation.
- No executive insight may be presented as conclusive when data quality is insufficient.
- Do not mix `DEMO` data with real data in the same organization context.
- Keep demo, staging, and production data isolated by environment, organization, and flags.
- Every access decision and analytic query must respect organization, country, company, operational area, branch, role, and explicit assignments.

## Imports And Connectors

- Validate files on the server.
- Restrict file size and extensions.
- Sanitize uploaded file names.
- Block dangerous spreadsheet formulas in generated exports.
- Prefer official APIs when available.
- Do not perform scraping that evades authentication, CAPTCHA, MFA, rate limits, or technical restrictions.
- Authorized scraping must use a valid user session, preserve audit logs, and fail closed when site structure changes.
- When credentials are unavailable, build a disabled real connector plus a `DEMO` adapter and document required credentials.

## Phase Validation

After every phase:

- Run lint.
- Run typecheck.
- Run tests.
- Run build.
- Fix errors before continuing.
- Review modified screens visually when the phase changes UI.
- Update documentation.
- Create a descriptive Git commit.

For every sprint:

- Close with lint, typecheck, tests, and build.
- Record remaining risks and test gaps before handoff.
- Finish with one independent commit scoped to that sprint.
