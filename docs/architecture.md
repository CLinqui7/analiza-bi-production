# Architecture

## System Shape

Analiza Intelligence uses Next.js App Router as the web application layer and Supabase as the authentication, database, storage, and policy platform.

The expected hierarchy is:

```text
Grupo Analiza
  Pais
    Empresa o unidad de negocio
      Sucursal
        Gerente de sucursal
        Profesionales
        Servicios
```

The selected region/country, consolidated view or business unit, branch, and date range must persist while the user navigates.

## Information Architecture

Analiza BI is organized by job-to-be-done, not by a flat list of reports. The protected shell groups navigation into:

- Direccion
- Operacion
- Gestion
- Lineas de negocio
- Datos
- Sistema

Every role receives a focused workspace home at `/protected`. This workspace starts with the question: what does this role need to decide or complete now?

Role entry points:

- CEO: business health, critical alerts, decisions pending approval, goals.
- Gerente de operaciones: pending monthly closes, risky branches, capacity/SLA, missing data.
- Gerente de area: assigned branches, explanations pending, action follow-up, goals.
- Gerente de sucursal: monthly close, own branch alerts, own goals, evidence.
- Superadministrador/webmaster: users, permissions, connectors, data quality, audit.

Global filters are compressed into a context bar. Business line and country remain visible because they define the whole system. Branch, manager, and date range live behind `Cambiar filtros` as advanced filters so dense screens do not start with control noise.

## Application Layers

- Web UI: Next.js App Router, server components by default, client components for forms and interaction.
- Authentication: Supabase Auth with protected routes.
- Authorization: PostgreSQL RLS using organization, country, company, branch, the four Analiza roles, and direct assignments.
- Data ingestion: imports, templates, connectors, sync jobs, and raw records.
- Analytics: dimensions, facts, KPI functions, and dashboard views.
- Audit: immutable records for sensitive actions and data movement.

## Data Pipeline

```text
RAW -> STAGING -> ANALYTICS
```

- RAW: data exactly as received, immutable, tied to source and import.
- STAGING: cleaning, normalization, mapping, deduplication, validation.
- ANALYTICS: dimensions, facts, KPIs, aggregates, and insights.

## Connector Boundary

Connectors run only on the server. Browser code may initiate allowed actions, but it must never receive connector secrets. Real connectors can remain disabled until credentials are configured. DEMO adapters provide safe sample behavior.

## UI Boundary

The UI should feel executive, professional, clean, responsive, accessible, and presentation-ready. It must avoid excessive gradients, unnecessary animation, misleading rankings, and metrics without data sufficiency.
