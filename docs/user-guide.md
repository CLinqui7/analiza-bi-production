# User Guide

## Login

Users sign in with an assigned account. The UI shows `Crear cuenta`, but it is a controlled account-creation page that explains administrative provisioning. Public self-registration is not part of the product flow. Password recovery is available through Supabase Auth.

For local exploration, use the DEMO admin account from the login page. DEMO access still requires an email and password configured by environment variables; it is not intended for production access and can be disabled with `ANALIZA_DISABLE_DEMO_ADMIN=true`.

## Roles

Analiza Intelligence uses role-based workspaces:

- Superadministrador / Webmaster: configures the platform, users, permissions, connectors, data quality and audit.
- CEO: reads the BI executive view for Analiza and its business lines.
- Gerente de operaciones: manages one business line, imports, quality, capacity, branches, lower-role users and branch risk from a single operational report.
- Gerente de area: supervises assigned branches, explains variations and validates action plans.
- Gerente de sucursal: completes the monthly close and reads branch goals, alerts and pending evidence from one branch report.
- Usuario operativo: completes assigned data-entry tasks without managerial privileges.
- Viewer: reads authorized information only.

In DEMO, the sidebar includes a role selector so the reduced menu and role workspace can be previewed as each role.

## Role Workspace

Every user should start at `/protected`. The role workspace shows the first read in under 10 seconds:

- what is happening
- what needs review
- what action is expected
- which screen should be opened first

The sidebar intentionally shows fewer modules per role. Detailed dashboards remain available through the recommended action, local tabs, drilldowns or authorized role switching in DEMO.

## Business View Selection

After login, users select:

1. Region or country.
2. Consolidated view or business unit.
3. Branch or all assigned branches.
4. Date range, from and to.

CEO and Webmaster / Administrador may access regional or consolidated views when assigned. Gerente de operaciones is scoped by business line, and Gerente de sucursal is scoped to assigned branches. In the branch dashboard, gerente de sucursal should only see the assigned branch, not the whole network.

The screen that previously appeared as `context` is the executive business view selection screen. It decides what the user is looking at before entering the dashboards:

```text
/protected/context
```

In the UI, this is presented as `Elige que negocio quieres ver`: regional or country, consolidated or business unit, branch, and date range. The current UI uses DEMO bootstrap values until Supabase assignments are populated from the Phase 1 migration and seed.

## Header Selector

The app header keeps a compact persistent context bar:

- business line
- country or region
- branch summary
- selected period
- advanced filters behind `Filtros`

The protected header stores these values in the browser under the Analiza context key so the selection survives navigation. Dashboards refresh their selected business, branch, and date range when the header selector changes.

## Dashboards

Every dashboard should show:

- selected period
- last update
- data coverage
- sources used
- completeness percentage
- DEMO label when applicable

Dense dashboards use tabs or guided sections. The first tab should show KPI summary and executive reading; later tabs contain comparison charts, detail tables, rules and audit.

The Phase 2 executive dashboard is available at:

```text
/protected/overview
```

It uses DEMO values only and labels them visibly. The first executive section is intentionally split by business line instead of showing one mixed total. It shows Fisioterapia, Laboratorio, and Imagenes separately so each line keeps its own revenue, goal, margin, appointments, occupancy, and alert.

After the business-line summary, the executive dashboard shows financial health by line, company participation, goals vs results by company, monthly revenue, appointment status, effective occupancy, and adjusted performance. These panels read the header selector, so choosing a business unit or branch narrows the dashboard instead of leaving the same consolidated view.

For the CEO, `/protected/overview` is the single executive report. Financial health, goal progress, insights, data quality, risks, and required decisions must be read there instead of exposing separate CEO menu labels for Finanzas, Metas, or Insights. This avoids two labels opening equivalent executive readings.

For Gerente de operaciones, `/protected/operacion` is the single operational report for metas, avances and insights. The separate `/protected/metas` and `/protected/insights` routes are hidden and blocked for this role so the same KPIs are not repeated under different labels.

For Gerente de area, `/protected/metas` is the single area report for metas, avances and insights. The separate `/protected/insights` route and the legacy `/protected/plantillas` monthly form are hidden and blocked for this role so KPIs and data-entry flows are not duplicated.

For Gerente de sucursal, `/protected/mi-sucursal` is the single branch report for closure status, results, goals, progress, insights and evidence. The separate `/protected/metas`, `/protected/insights` and `/protected/gerentes` routes are hidden and blocked for this role so the same KPIs and manager views are not duplicated.

## Operational Views

Phase 3 adds DEMO operational views:

- `/protected/citas`
- `/protected/capacidad`
- `/protected/sucursales`
- `/protected/gerentes`

Appointments show citas por negocio and appointment success rate by business and branch. Capacity now starts with the branch capacity form used by operations when creating or editing capacity for a branch; it captures available, planned, effective and successful units, then calculates occupancy automatically. Branches show managers, result templates, goals, sales, losses, revenue, operating costs, appointments, and data quality. Manager performance uses separated components and does not present a score when capacity or data completeness is insufficient; it also includes organization view and bonus-oriented employee performance for area, operations, CEO and administrator roles. Gerente de sucursal does not open the manager bonus module.

In Usuarios y permisos, Gerente de Operaciones creates Gerente de Area users with operational scope, manager level, monthly base bonus and assigned branch managers under their portfolio. Gerente de Operaciones and Gerente de Area can create Gerente de Sucursal users inside the delegated area with manager level and monthly base bonus. Initial levels are Senior USD 400, Middle USD 300 and Junior USD 200. The bonus recommendation in Gerentes y bonos is calculated as base bonus multiplied by goal completion for the assigned branch or portfolio, for example USD 400 x 80% = USD 320.

## Business Modules

The DEMO module pages now include structured panels for:

- operation
- financial health
- professionals
- services
- fisioterapia
- laboratorio
- imagenes
- insights
- imports
- templates
- connectors
- data quality
- goals
- users and permissions
- account settings
- audit

`Mi cuenta` is for profile, password recovery, preferences, and user-level settings. System-wide configuration remains an admin-only responsibility.

Users can be created by email invitation or with a temporary password assigned by an authorized administrator. Invitation users accept a secure link and create their own password. Temporary-password users are active immediately, but the first login forces them to change that password before entering protected modules. Authorized administrators can also reset a lost password by assigning a new temporary password, which again forces password change at login. Only Webmaster / Administrador can create global users or change global roles. CEO, Gerente de operaciones and Gerente de area can create or reset lower roles only inside their delegated scope. Gerente de sucursal can only work inside the assigned branch.

Real invitation email requires private server variables:

- `DATABASE_URL`: PostgreSQL connection string used to store the invitation and audit record.
- `APP_URL`: public site URL used in the invitation link.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`: SMTP server settings.
- `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: Google Workspace sender account, app password, and visible sender.

For Google Workspace with app passwords, use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`, and the Workspace mailbox as `SMTP_USER`. The app password must stay only in the server environment file.

## Imports

The import center guides users through the operational import form and controlled file fallback. For Gerente de operaciones and Gerente de area, Importaciones is the only visible data-entry entry point; the legacy Formulario mensual menu entry is hidden and blocked for both roles. Conectores and Integraciones are also hidden and blocked for Gerente de operaciones.

Templates are the root of the system when no API or CRM connector is available. The minimum root templates are appointments, capacity, costs, revenue, services, professionals, targets, result templates by branch, and payroll/bonus sheets.

For El Salvador, the current branch result template is recognized for:

- Aguilares
- Chalatenango
- Constitucion
- La Libertad
- Merliot 2
- Plaza Sur
- Santa Tecla

These files feed branch revenue, target, sales completion, cost of sale, margin, manager, area manager, rows loaded, and data-quality warnings. Customer names and phone numbers must not be shown in dashboards; they are treated as sensitive source fields and used only for controlled validation when necessary.

## Data Quality

Data quality means the system knows whether the information is complete, valid, consistent, unique, timely, and traceable. The manager no longer writes a quality score manually and clicking an action cannot improve the score by itself: AnaliA calculates quality from required fields, source files, suspicious amounts, branch/period consistency, duplicates and traceability. When data is incomplete or invalid, affected dashboards show warnings, block publication when needed and avoid conclusive insights.

## Audit

Audit should show who changed what, when, from which module, previous value, new value, and reason. It should cover imports, template approvals, goal changes, permission changes, connector runs, exports, reversals, and KPI traceability.
