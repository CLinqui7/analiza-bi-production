# Analiza BI

Analiza BI is a multi-tenant business-intelligence platform for Analiza operations. It centralizes authorized operational and financial reporting for Fisioterapia, Laboratorio and Imágenes while preserving the source, period and scope behind each analytic result.

## Architecture

- **Frontend and API:** Next.js App Router with strict TypeScript and Tailwind CSS.
- **Identity and data:** Supabase Auth, PostgreSQL, Storage and server-side Supabase clients.
- **Authorization:** server-side organization, country, company, operational-area, branch and role scope checks.
- **Hosting:** Netlify with the managed Next.js Runtime.
- **Data quality:** missing inputs remain `NOT_CALCULABLE`; dashboards do not fabricate zeroes, random values or conclusions.

The production backend is Supabase V7. Browser code uses only the publishable Supabase key. Service-role credentials, email credentials and AI credentials remain server-only and are configured outside Git.

## Requirements

- Node.js 24 (the Netlify build uses Node 24)
- npm
- A Supabase V7 project configured with the migrations in `supabase/migrations/`

## Local setup

1. Copy `.env.example` to `.env.local` and provide values through a secure local secret store.
2. Install locked dependencies:

   ```bash
   npm ci
   ```

3. Start development:

   ```bash
   npm run dev
   ```

Never commit `.env.local`, service-role keys, passwords, tokens, production exports or customer data.

## Required environment variables

| Variable | Scope |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | Application URL |
| `ANALIZA_LOCAL_AUTH_SECRET` | Server only |
| `ANALIZA_DISABLE_DEMO_ADMIN=true` | Production safety control |
| `ANALIZA_ENABLE_DEMO_ADMIN=false` | Production safety control |
| `ANALIZA_MONTHLY_EVIDENCE_BUCKET` | Server-side Storage integration |

SMTP and OpenAI values are optional server-only integrations. Do not add direct `DATABASE_URL`, `POSTGRES_URL` or `PG*` variables: the supported production integration is Supabase V7.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run test:supabase-backend
npm run test:persistence
npm run test:release
npm run verify:supabase:readonly
npm run build
```

`verify:supabase:readonly` only reports aggregate metadata needed to validate a configured Supabase V7 instance; it does not write records or print credentials.

## Main structure

```text
app/                    Next.js pages and server routes
components/             UI, dashboards and monthly-submission workflows
lib/                    Authorization, KPI logic and Supabase services
supabase/migrations/    Reproducible schema, RLS, RPC and Storage changes
tests/                  Quality, scope, persistence and release contracts
docs/                   Architecture, KPI and operational documentation
```

## Roles and scope

The application supports CEO, operations manager, area manager, branch manager and subordinate operational roles. Every protected request applies the authorized scope intersection:

```text
authorized scope ∩ country ∩ company ∩ business line ∩ operational area ∩ branch
```

This prevents branches from another country appearing after a country filter is selected.

## Monthly submission workflow

Authorized users can create incomplete monthly drafts, attach CSV/XLSX source files and evidence, validate the submission and publish only after strict checks pass. The workflow covers Fisioterapia, Laboratorio and Imágenes. Published records retain lineage to submission versions and attachments.

## Netlify deployment

The existing Netlify project is configured in `netlify.toml` with `npm run build`. Keep sensitive variables exclusively in Netlify Environment Variables. Before a production deployment run the quality gates and `netlify build --context production`, then deploy to the already linked site; do not create a replacement site.

## Further documentation

- [Architecture](docs/architecture-current.md)
- [Deployment](docs/deployment.md)
- [Security model](docs/security-model.md)
- [KPI dictionary](docs/kpi-dictionary.md)
- [Agent rules](AGENTS.md)
