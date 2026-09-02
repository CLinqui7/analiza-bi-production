# Implementation Plan

## Phase 0: Diagnosis And Documentation

- Inspect repository state, dependencies, Next.js, and Supabase setup.
- Create agent rules.
- Create initial product, architecture, database, security, design, KPI, ingestion, connector, deployment, and user documentation.
- Add basic validation scripts.
- Run lint, typecheck, tests, and build.
- Commit the phase.

## Phase 1: Database, Auth, Roles, RLS, Context

- Add Supabase migrations for operational core.
- Add RLS policies and helper functions.
- Disable public registration in product UI.
- Add profile, role, and assignment queries.
- Add country, company, and branch selection after login.

Implemented in the Phase 1 baseline:

- `supabase/migrations/20260720000100_phase1_core.sql`
- `supabase/seed.sql`
- protected context selection at `/protected/context`
- protected overview handoff at `/protected/overview`
- public self-registration disabled; visible `Crear cuenta` points to controlled provisioning

Next Phase 1 hardening before production:

- replace DEMO bootstrap context with live Supabase assignment queries
- add a controlled first `webmaster_admin` setup command or server-only action
- add database-level tests against a local Supabase instance

## Phase 2: Layout, Navigation, Filters, DEMO Executive Dashboard

- Replace starter UI.
- Add role-aware sidebar.
- Add persistent context selector.
- Add executive DEMO dashboard with data coverage labels.

Implemented in the Phase 2 baseline:

- protected app shell with collapsible sidebar
- role-aware navigation definition with 21 requested modules
- four-role Analiza model: Webmaster / Administrador, CEO, Gerente de operaciones, Gerente de sucursal
- persistent header selector for region/country, consolidated/business unit, branch, and date range
- executive DEMO dashboard at `/protected/overview` with financial and operational health by business
- shared protected module route that renders DEMO module dashboards
- dashboard tests for navigation coverage, DEMO labels, and starter removal

## Phase 3: Appointments, Capacity, Occupancy, Branches, Managers

- Add appointment and capacity facts.
- Add normalized status mapping.
- Add occupancy formulas and manager branch views.

Implemented in the Phase 3 baseline:

- `supabase/migrations/20260720000200_phase3_operations.sql`
- normalized appointment status catalog
- operational tables for appointments, capacity, professionals, schedules, anonymous patients, and service events
- pure TypeScript formulas for occupancy, attendance gap, completion, cancellation, no-show, and reschedule rates
- DEMO views for `/protected/citas`, `/protected/capacidad`, `/protected/sucursales`, and `/protected/gerentes`
- tests for formulas, migration coverage, and manager data sufficiency messaging

Executive DEMO expansion now also includes:

- operation, finance, professionals, services, fisioterapia, laboratorio, imagenes, insights, imports, templates, connectors, data quality, goals, users, account, and audit panels
- appointments by business and success rate by business/branch
- capacity by business/branch with prior month, current month, and goal
- branch manager view with result templates, goals, sales, losses, revenue, operating costs, appointments, and quality
- manager organization view and employee performance for bonus review
- suggested goals with CEO final approval concept
- audit recommendations for imports, goals, permissions, connector runs, exports, and KPI traceability

## Phase 4: Fisioterapia, Laboratorio, Imagenes

- Add unit-specific facts, templates, and dashboards.
- Add authorized scraping shell for fisioterapia with DEMO adapter.

## Phase 5: Finance, Targets, Manager Performance

- Add billing, collections, costs, targets, and contribution margin.
- Add configurable manager performance components.

## Phase 6: Imports, Templates, Validations, Data Quality

- Build import assistant.
- Generate templates.
- Add quality dashboard and issue workflows.

## Phase 7: Connectors, APIs, Authorized Scraping, Sync

- Implement connector framework.
- Add secure internal endpoints.
- Add DEMO adapters and disabled real adapters.

## Phase 8: Insights, Alerts, Traceability, Audit

- Add deterministic rule engine.
- Add traceability detail views.
- Expand audit coverage.

## Phase 9: Exports, Final Tests, Security, Deployment Prep

- Add CSV, XLSX, and executive PDF exports.
- Complete E2E coverage.
- Harden security.
- Finalize Supabase and deployment guides.
