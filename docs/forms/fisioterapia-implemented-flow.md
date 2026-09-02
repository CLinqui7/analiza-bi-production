# Fisioterapia Implemented Flow

## Scope

Vertical 1 implements the Fisioterapia monthly closing flow end to end for DEMO local review only. Laboratorio and Imagenes remain unchanged.

The implemented chain is:

Gerente de Sucursal -> Importaciones -> Formulario Fisioterapia -> Validacion server-side -> Preview -> Publicacion -> KPIs automaticos -> Meta vs Real -> Insights -> Dashboard Sucursal -> Consolidacion Gerente Area, Gerente Operaciones y CEO.

## User Experience By Role

### Gerente de Sucursal

- `/protected/mi-sucursal`: home focused on one assigned Fisioterapia branch, including goals, progress, insights and evidence in one place.
- `/protected/cierres/nuevo`: creates or resumes the current monthly closure.
- `/protected/cierres`: reviews closure history and starts versioned corrections.
- `/protected/resultados`: sees branch KPIs, targets, compliance, insights and audit without exposing separate goals or insights tabs.

### Gerente de Area

- `/protected/cierres`: consolidates closures from branches in the assigned area.
- `/protected/resultados`: consolidates branch performance for that area.
- `/protected/metas`: configures targets for branches in the assigned area.
- `/protected/insights`: reviews area insights.

### Gerente de Operaciones

- `/protected/resultados`: consolidates all Fisioterapia branches in scope.
- `/protected/operacion`: uses the unified operational dashboard for goals, progress and insights when the selected line is Fisioterapia.

### CEO

- `/protected/overview`: includes a Fisioterapia executive summary fed by published closures.
- `/protected/resultados`: reads consolidated Fisioterapia results.

### Viewer

- Can read authorized results and insights.
- Cannot open `/protected/cierres/nuevo` by direct URL.
- Cannot create, validate, publish, or correct closures server-side.

## Routes And Server APIs

### Pages

- `/protected/mi-sucursal`
- `/protected/cierres/nuevo`
- `/protected/cierres`
- `/protected/resultados`

### APIs

- `GET /api/physiotherapy/closures`
- `POST /api/physiotherapy/closures`
- `POST /api/physiotherapy/closures/:closureId/validate`
- `POST /api/physiotherapy/closures/:closureId/publish`
- `GET /api/physiotherapy/targets`
- `POST /api/physiotherapy/targets`

Every API route resolves the authenticated actor server-side with `requireProtectedAccess`. RBAC and scope checks run in the server service, not only in React.

## Data Model Implemented In This Phase

The flow keeps a server-side DEMO store only when `APP_ENV=demo` so the product can still be reviewed visually without a database dependency. Outside DEMO, the service is prepared to use PostgreSQL persistence through the server-side database pool:

- Closure identity: organization, country, company, branch, business line, period and version.
- Closure status: `draft`, `validation_failed`, `validated`, `published`, `replaced`.
- Scope: country, company, operational area, branch and managers.
- Inputs: monthly Fisioterapia source fields.
- Validation: blocking errors and warnings.
- KPIs: calculated values with `CALCULABLE` or `NOT_CALCULABLE`.
- Targets: active or inactive per branch, period and KPI.
- Target comparison: target, actual, variation, compliance and status.
- Insights: generated from real closure values versus targets, prior period and allowed benchmarks.
- Audit: draft, validation, publish and replacement events.

The PostgreSQL migration is intentionally new and has not been applied to production by this task.

## Persistence Prepared

The new persistent model separates source inputs from calculated outputs:

- `monthly_closings`: one logical monthly closing by organization, country, company, branch, business line and period.
- `closing_versions`: immutable version lineage for drafts, published closings, superseded closings and corrections.
- `physiotherapy_closing_inputs`: manual Fisioterapia source inputs only.
- `closing_validation_results`: server-side validation state, errors, warnings and data quality score.
- `closing_kpi_results`: derived KPI results recalculated server-side.
- `kpi_targets`: governed KPI targets by period, branch, KPI, type, value, status and approvers.
- `generated_insights`: deterministic insights tied to closing version, KPI, severity and rule.
- `closing_audit_events`: creation, autosave, validation, publication, correction and target changes.

The migration enables RLS on every table and keeps the branch hierarchy as the access boundary. Application code still applies server-side RBAC before reads and writes.

## Form Fields

The Fisioterapia MVP form captures only source inputs the gerente can reasonably provide:

- Periodo
- Sucursal
- Facturacion total
- Ordenes
- Pacientes atendidos
- Sesiones realizadas
- Fisioterapeutas activos
- Costos directos
- Citas agendadas
- Citas completadas
- Citas canceladas
- No-show
- Horas disponibles
- Horas agendadas
- Horas atendidas
- Observaciones del cierre

The form does not ask the gerente to type calculated KPIs.

## Validation Rules

Blocking errors:

- Period must be `YYYY-MM`.
- Period cannot be later than the configured DEMO current period or the real current period, whichever is later.
- Branch is required.
- Numeric required fields must be finite and non-negative.
- Monthly hours cannot exceed a reasonable maximum based on active physiotherapists.
- Observations cannot contain likely phone numbers or personal identifiers.
- Duplicate published closure for the same branch and period is blocked unless the new draft is a versioned correction.

Warnings:

- Completed + cancelled + no-show exceeds scheduled appointments.
- Attended hours exceed available hours.
- Some scheduled appointments are not classified as completed, cancelled or no-show.
- Scheduled hours exceed available hours.
- Attended hours exceed scheduled hours.
- Direct costs exceed revenue.
- Relevant variations should include a brief observation without PII.

Only closures without blocking errors can be published. Published closures feed dashboards, KPIs, targets and insights.

## KPIs Calculated

- Facturacion neta
- Cumplimiento de venta
- Ticket promedio
- Sesiones totales
- Sesiones por paciente
- Ocupacion agendada
- Ocupacion efectiva
- Brecha de conversion
- Tasa de finalizacion
- Tasa de no-show
- Tasa de cancelacion
- Ingreso por hora
- Ingreso por fisioterapeuta
- Margen de contribucion
- Porcentaje de margen

When a required input is missing or invalid, the KPI is marked `NOT_CALCULABLE`. The UI must not show `NaN` or `Infinity`.

## Targets

Targets are supported for:

- Facturacion
- Ocupacion efectiva
- Sesiones
- No-show maximo
- Margen de contribucion

Targets are configured by period, country/company scope inherited from branch, branch and KPI. Each target has an active/inactive state; only the latest active target version feeds Meta vs Real comparisons. Gerente de Operaciones, Gerente de Area, CEO and platform admins can manage targets within their authorized scope. Gerente de Sucursal and Viewer have read-only access.

## Insights

Insights are deterministic and generated only from:

- Published closure data.
- Target comparisons.
- Prior published period when available.
- Allowed benchmarks embedded in the Fisioterapia rules.

Each insight includes:

- What happened.
- Where it happened.
- How much it varied.
- Business impact.
- Possible action.

When the system does not have enough evidence for causality, the wording uses "Factores a revisar" instead of making unsupported claims.

## RBAC And Scope

The service enforces:

- Gerente de Sucursal: only own branch.
- Gerente de Area: branches inside assigned operational area.
- Gerente de Operaciones: company/business line scope.
- CEO: executive read and target governance, without closure creation.
- Viewer: read-only authorized routes.

Navigation visibility is aligned with RBAC, but the server remains the source of authorization.

For Gerente de Sucursal, navigation is intentionally reduced to the Fisioterapia closure flow: Mi sucursal, Importaciones, Historial, Resultados and Mi cuenta. Metas, Insights and Gerentes y bonos are hidden and blocked for this role because the branch report already contains its goals, progress, insights and evidence.

## Executive Screen Review

- KEEP: Mi sucursal, Importaciones, Historial de cierres, Resultados and Resumen ejecutivo because each screen answers a concrete operating decision without duplicating the branch manager view.
- KEEP: Gerentes, Sucursales, Capacidad, Finanzas and Calidad de datos for the roles that consolidate or govern operations, subject to existing RBAC.
- REWORK: Legacy Formulario mensual and generic Importaciones for branch managers; they should be absorbed by the vertical closure flow or limited to back-office roles.
- REWORK: generic dashboards when the selected business line is not Fisioterapia; they must eventually read the same closure/KPI/target contracts by line of business.

## Current Limitations

- The PostgreSQL migration is prepared but not applied to production or a remote environment by this task.
- Full restart persistence must be validated against an authorized local/staging PostgreSQL database after applying the new migration.
- DEMO fallback remains available only for `APP_ENV=demo`.
- Seed data is DEMO and exists only to review the executive flow.
- Laboratorio and Imagenes still use the existing modules and are not part of Vertical 1.
- Real connector ingestion is not part of this implementation.
- Production deployment was not performed.

## Validation Commands

Sprint validation must run:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
