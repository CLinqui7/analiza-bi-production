# Cloudflare Workers compatibility report

Date: 2026-09-06

## Result

`npx vinext check` confirms that the application uses a supported App Router
layout, server components, route handlers, `proxy.ts`, and `server-only`
modules. The Cloudflare Workers build succeeds through vinext.

## Supported runtime features

- App Router, React Server Components, route handlers, and the Next.js 16
  `proxy.ts` entry point.
- Supabase SSR and cookie-based authentication, tested in the local Workers
  runtime up to protected-route authorization.
- Direct Supabase Storage uploads and downloads, including file generation for
  XLSX, CSV, and PDF exports.
- `Buffer`, `node:crypto`, streams, and dynamic module loading via the current
  Workers Node.js compatibility runtime.
- `pg` 8.22 for the legacy direct PostgreSQL paths. Workers supports modern
  `node-postgres` through TCP sockets; production should retain its existing
  PostgreSQL variables only if those legacy routes are enabled.

## Partial support and operational notes

- `cacheComponents` is experimental in vinext. There are no `"use cache"` or
  `unstable_cache` call sites, so no application cache semantics need adapting.
  The setting remains enabled for the existing Next.js build and Workers uses
  the vinext Cloudflare CDN cache adapter.
- `next/image` is served with vinext's compatibility path; local image
  optimization is not enabled. The existing image assets return successfully.
- Selenium and scripts using `fs` or `child_process` are development-only and
  are not part of the Worker request runtime.
- SMTP continues to be a server-only integration. Cloudflare blocks outbound
  SMTP port 25; the existing configuration must use a supported submission port
  such as 465 or an HTTP email provider.

## Configuration added

- `vite.config.ts` configures vinext and the Cloudflare Vite plugin.
- `wrangler.jsonc` defines the `analiza-bi-production` Worker, static assets,
  and the current compatibility date.
- `package.json` preserves the normal Next.js scripts and adds `dev:vinext`,
  `build:vinext`, `start:vinext`, and `deploy:vinext`.

## Remaining external step

Cloudflare OAuth must complete before a preview Worker can be deployed and its
server-only environment variables can be registered as secrets. No Supabase
data, schema, or Storage bucket is migrated or duplicated.
