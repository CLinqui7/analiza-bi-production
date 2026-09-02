# Project handoff programmer prompt

Fecha: 2026-08-28

## Project analysis

Analiza Intelligence is a corporate BI platform for Analiza operations in
Central America. The app is built with Next.js App Router, React, strict
TypeScript, Tailwind, Supabase Auth/Postgres/RLS, server-side route handlers,
and custom Node tests.

The product covers three initial business lines:

- Fisioterapia
- Laboratorio
- Imagenes

The database model is multi-tenant and every operational/analytic record should
respect this scope whenever applicable:

- `organization_id`
- `country_id`
- `company_id`
- `operational_area_id`
- `branch_id`
- role and explicit assignment

The security model is not UI-only. Server code must derive the actor from the
server session and then enforce `canPerformAction`, `canAccessRecord`, and the
database RLS helpers. Do not trust client-provided role, scope, organization,
country, company, area, branch, or user identifiers.

The current implementation mixes mature foundations with demo-first business
logic:

- Core auth, profiles, roles, permissions, countries, companies, branches,
  services, managers and audit are in Supabase migrations.
- Delegated hierarchy exists for CEO, operations manager, area manager, branch
  manager and operative users.
- Dashboards still rely heavily on typed DEMO datasets in `lib/analytics` and
  `lib/tenant/demo-context.ts`.
- Monthly closing persistence exists for Fisioterapia, Laboratorio and Imagenes
  through shared closing tables and line-specific input tables.
- Import and connector runtime exists server-side in `lib/data-ingestion/*` and
  `/app/api/imports/*`, `/app/api/connectors/*`.
- Real connectors are disabled until server-only credentials are configured.
- Official BI queries read only published, non-DEMO closing versions, KPI
  results, approved targets and generated insights.

Important files to read first:

- `AGENTS.md`
- `README.md`
- `docs/product-scope.md`
- `docs/architecture-current.md`
- `docs/security-model.md`
- `docs/database-design.md`
- `docs/data-ingestion.md`
- `docs/connectors.md`
- `docs/production-readiness-roadmap.md`
- `lib/security/authorization-policy.ts`
- `lib/tenant/delegation-policy.ts`
- `lib/server/database.ts`
- `lib/server/official-bi.ts`
- `lib/data-ingestion/templates.ts`
- `lib/data-ingestion/platform.ts`
- `lib/data-ingestion/connectors.ts`
- `supabase/migrations/20260828132824_project_handoff_operational_backbone.sql`

## New migration summary

The migration
`supabase/migrations/20260828132824_project_handoff_operational_backbone.sql`
adds the missing operational handoff backbone:

- versioned ingestion template catalog;
- connector credential metadata without storing secret values;
- connector field mappings;
- sync jobs and sync job runs;
- sync errors;
- webhook subscription metadata;
- sanitized raw ingestion records for API/webhook payloads;
- KPI result lineage to imports and published rows;
- export request queue.

Every new public table enables RLS and receives explicit `authenticated` grants
because current Supabase Data API behavior may require explicit table grants for
new tables. The policies keep connector configuration and sync execution under
super administrator control, while read access remains scoped by organization,
country, company, operational area and branch.

## Prompt for the next programmer

Act as a senior full-stack TypeScript, Next.js and Supabase engineer continuing
the Analiza Intelligence project. Your job is to move the current demo-first BI
platform toward production-ready persistence without weakening security, data
lineage or KPI integrity.

First, read and follow `AGENTS.md`. Then inspect `README.md`,
`docs/architecture-current.md`, `docs/security-model.md`,
`docs/database-design.md`, `docs/data-ingestion.md`, `docs/connectors.md`,
`docs/production-readiness-roadmap.md`, and the latest migration
`supabase/migrations/20260828132824_project_handoff_operational_backbone.sql`.

Respect these non-negotiable rules:

- Use strict TypeScript.
- Do not use `any` unless the same change includes a written justification.
- Never expose secrets in source, client bundles, logs, screenshots or docs.
- Never store Supabase service role keys or connector credentials in browser
  code.
- Do not use real patient data in development.
- Mark simulated data as `DEMO`.
- Do not invent KPIs, formulas, targets, operational values or executive
  conclusions.
- Enforce authorization server-side on every route, API, mutation, import,
  export, connector action and privileged read.
- Every analytic row must retain traceability to source file/connector/import,
  template version, transformation and validation.
- Create new migrations instead of modifying migrations that may already have
  run.
- Do not deploy production or customer-visible environments without explicit
  owner authorization.

Understand the architecture this way:

1. Next.js App Router routes live under `app/`.
2. Protected pages go through `app/protected/layout.tsx`,
   `app/protected/[module]/page.tsx`, `proxy.ts`, and
   `lib/supabase/proxy.ts`.
3. Runtime authorization is centralized in
   `lib/security/authorization-policy.ts` and
   `lib/tenant/delegation-policy.ts`.
4. PostgreSQL access uses `lib/server/database.ts`, sets an RLS context with
   `request.jwt.claim.sub`, and must use a runtime role that cannot bypass RLS.
5. Demo data lives mostly in `lib/analytics/*` and
   `lib/tenant/demo-context.ts`; do not mix it with real organization data.
6. Official persisted BI is expected to flow through published monthly closings,
   KPI results, approved targets, generated insights and lineage.
7. Import templates are currently TypeScript definitions in
   `lib/data-ingestion/templates.ts`; the new migration provides tables to
   persist those template definitions and versions.
8. Connectors are currently catalog objects in
   `lib/data-ingestion/connectors.ts`; the new migration provides metadata,
   mappings, sync jobs and run/error history without storing secret values.

Recommended implementation path:

1. Run `git status --short` and avoid touching unrelated user changes.
2. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`
   before changing behavior so you know the baseline.
3. Apply local Supabase migrations in a safe local or staging database only.
4. Add a server-side repository for template definitions and versions. It
   should hydrate from DB when configured and fall back to existing TypeScript
   templates only in demo/local mode.
5. Add a server-side repository for connector metadata, credential state,
   mappings, sync jobs, sync runs and sync errors. Store only env var names,
   verification state and metadata. Store actual credentials only in server
   environment, Supabase Vault or an external secret manager.
6. Update `/api/imports/templates` to read active template versions from the
   repository while preserving the current workbook contract.
7. Update `/api/connectors/status`, `/api/connectors/[connectorId]/test`, and
   `/api/connectors/[connectorId]/sync` to persist status, runs and errors when
   a database is configured.
8. Persist lineage into `kpi_result_lineage` whenever monthly closing KPI
   results are generated from imports or published rows.
9. Add export APIs only if they write `export_requests` and enforce server-side
   scope checks before creating files.
10. Keep existing UI patterns. Do not build a marketing landing page. Improve
    the actual protected operational experience.

Definition of done:

- Lint, typecheck, tests and build pass.
- New code includes focused tests for authorization, persistence fallback,
  lineage and no-secret storage.
- Database changes have RLS, explicit grants, indexes and clear constraints.
- Real connectors remain disabled unless server-only credentials exist.
- Demo and real data cannot mix inside the same organization context.
- Documentation is updated where behavior or architecture changes.
- The final handoff records remaining risks and test gaps.
