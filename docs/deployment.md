# Deployment

## Environments

Recommended environments:

- local development
- staging
- production

Production deployment requires explicit user authorization.

## Environment Variables

Required public variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Server-only secrets for future connectors must not use `NEXT_PUBLIC_` prefixes.

## Supabase

The repository includes Supabase client helpers plus versioned SQL under `supabase/`.

Apply Phase 1 in a Supabase project with:

```bash
supabase db push
supabase db seed
```

If the Supabase CLI is not available, apply `supabase/migrations/20260720000100_phase1_core.sql` and then `supabase/seed.sql` through an approved database deployment path.

## Build Checks

Before deployment:

- lint
- typecheck
- tests
- build
- security review for secrets and RLS
- visual review of modified screens

The current `npm run build` command uses `next build` (Turbopack). This avoids the Node middleware packaging failure observed with the Webpack output in the Netlify Next.js Runtime. The Turbopack build must remain part of local and CI validation.

## First Superadministrator

The first `super_admin` should be created by a controlled server-side or SQL process after Supabase Auth user creation. This process must not expose service role keys in browser code.

Required steps:

1. Create the user in Supabase Auth.
2. Insert or update `public.profiles` with the Auth user id and organization id.
3. Insert the `super_admin` role into `public.user_roles`.
4. Confirm RLS access with a non-service-role session.

`webmaster_admin` remains available as a legacy level-100 alias for existing DEMO sessions, but new installations should start with `super_admin`.
