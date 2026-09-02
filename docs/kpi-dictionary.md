# KPI Dictionary

## Data Sufficiency

Do not show a KPI when essential fields are missing. If capacity is missing, show:

```text
Pendiente de cargar capacidad disponible
```

No future appointments are included in historical compliance indicators.

Phase 3 implements the formulas in `lib/analytics/operations.ts` and keeps zero-capacity results as `null` so the UI can show pending capacity instead of estimating silently.

## Occupancy

Scheduled occupancy:

```text
scheduled_minutes / available_minutes
```

Effective occupancy:

```text
completed_or_attended_minutes / available_minutes
```

Attendance gap:

```text
scheduled_occupancy - effective_occupancy
```

Completion rate:

```text
completed_appointments / applicable_scheduled_appointments
```

No-show rate:

```text
no_show_appointments / applicable_scheduled_appointments
```

Cancellation rate:

```text
cancelled_appointments / applicable_scheduled_appointments
```

Reschedule rate:

```text
rescheduled_appointments / applicable_scheduled_appointments
```

Appointment success rate:

```text
completed_appointments / applicable_scheduled_appointments
```

Appointment success must be visible by business and branch so a CEO can compare business units and a branch manager can manage local execution.

## Executive Cards

- invoiced revenue
- collected revenue
- accounts receivable
- patients or clients served
- scheduled appointments
- completed appointments
- cancelled appointments
- no-shows
- rescheduled appointments
- performed services
- average ticket
- scheduled occupancy
- effective occupancy
- attendance gap
- available capacity
- contribution margin, only when direct costs exist
- revenue target attainment
- operating target attainment
- variance against prior period
- variance against same period last year, when data exists

The Phase 2 dashboard implements DEMO versions of these executive cards. Each card includes a tooltip with definition, formula, source, and last update.

The executive summary must not lead with one mixed total across unrelated business lines. The first section is by business line:

- Fisioterapia
- Laboratorio
- Imagenes

Each line keeps its own revenue, collected revenue, accounts receivable, target, margin, appointments, occupancy, costs, expenses, health score, and alert. Consolidated views may compare lines side by side, but should avoid presenting a single total as the main answer when that total would be operationally misleading.

## Financial Rules

- Do not calculate net profit without complete operating expenses.
- If only direct costs exist, use `Margen de contribucion estimado`.
- Label financial data as loaded, calculated, estimated, or pending.
- Separate fixed expenses, variable expenses, fixed costs, and variable costs by business and branch.
- Show losses only when revenue, costs, and operating expense coverage are sufficient.
- Service profitability should show revenue, direct cost, estimated contribution, goal gap, and missing cost warnings.

## Goals

Goal dashboards must support:

- overview by business
- detail by branch
- month-by-month progress
- actual vs goal
- prior month vs current month
- suggested goal from system insights
- final CEO-approved goal

Suggested goals are advisory only. The CEO can approve, edit, or reject them.

## Branch Health

Branch dashboards should include manager, result template status, revenue, operating costs, losses when applicable, appointments, capacity, goal attainment, data quality, and actionable insights. This page serves branch managers as much as owners or executives.

For El Salvador branch result templates, the first implemented branch-health metrics are:

- venta objetivo
- venta obtenida
- cumplimiento de venta
- venta sin IVA
- costo de la venta
- margen porcentual
- margen absoluto
- filas cargadas por hoja fuente
- alertas de periodo, duplicado, formula y datos personales

## Manager Performance

The manager performance index is configurable and must show component values separately:

- revenue attainment
- effective occupancy
- completion and attendance
- contribution margin
- productivity
- data quality

Do not show a score when comparability, capacity, financial essentials, or data completeness are insufficient.
