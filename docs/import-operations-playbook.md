# Import operations playbook

This document defines how Analiza Intelligence stays updated while real
connectors are not available.

## Operating model

Analiza has two ingestion paths:

1. Connectors: official APIs or authorized exports from CRM, agenda,
   billing, accounting, LIS, RIS/PACS, inventory, HR/payroll or ERP systems.
2. Bulk document uploads: controlled Excel or CSV files uploaded by operations
   managers when the connector is unavailable, lacks credentials or does not
   expose the needed data.

The bulk upload path is not a weaker data path. It must keep the same controls
as a connector: server validation, lineage, audit trail, versioning and data
quality gates before any KPI is published.

## Ownership

- Webmaster / Administrador: defines templates, manages connectors, credentials,
  permissions, replacements, audit policy and data quality rules.
- CEO: approves final goals and reviews only published data or explicit quality
  warnings.
- Gerente de operaciones: uploads and validates files for the assigned business
  line while connectors are not ready.
- Gerente de sucursal: read-only consumer of published branch results.

## Required document families

### Consolidated

- Master catalogs: country, company, business line, branch, manager, service,
  roles and active users.
- Goals: suggested goal, final goal, owner, period, approval user and metric
  unit.
- Calendar and capacity: business days, branch hours, resources, equipment,
  rooms, professionals and unavailable hours.
- Financial results: revenue, direct costs, fixed expenses, variable expenses,
  budget, cost center and operating profit.
- Service catalog: code, name, price, direct cost, allocated fixed cost and
  active status.

### Laboratory

- Branch results template reviewed for El Salvador.
- Orders, tests, samples and statuses.
- Reagents, inventory, lots, expirations and urgent purchases.
- Referring doctors, specialties, zones and visitadores.

### Physiotherapy

- Monthly branch results.
- Appointments, sessions, treatment plan continuity, no-show and cancellations.
- Professionals, generated payroll sheets and bonuses.
- Capacity by therapist, room and schedule.

### Imaging

- Monthly branch results by modality.
- Appointments, studies, reports, delivery and telemedicine.
- Equipment, availability, maintenance, downtime and supplies.
- Capacity by machine, modality and schedule.

## Update rules

Every upload creates an import version. A version contains:

- source type: connector or bulk document;
- document or connector id;
- business line, branch and period;
- uploaded by, validated by and published by;
- source file name, sanitized stored name and file hash;
- schema version and transformation version;
- validation result, warnings and blocking errors;
- publication status and affected dashboard modules.

A new file for the same document, branch and period does not silently overwrite
data. It either:

- creates a pending version when the period is open;
- replaces the active version after approval and stores the replacement reason;
- is rejected when the period is closed and the user lacks override permission.

Dashboards read only the active published version. AnaliA can monitor pending
and invalid versions, but must label the insight as a data quality alert rather
than a business conclusion.

## Server validation

The browser may allow selecting files for usability, but all real validation
must run server-side.

Required server controls:

- restrict file extension and size;
- sanitize uploaded file names;
- reject executable or unexpected content;
- block dangerous spreadsheet formulas in imports and generated exports;
- validate required columns by template version;
- map branch, service, professional and status values to master catalogs;
- detect duplicate period, duplicate branch and duplicate transaction keys;
- anonymize or pseudonymize patient identifiers before analytics use;
- keep PII out of logs, dashboards, exports and audit summaries.

## Connector fallback

Each connector has a fallback document list. Until the connector is active:

- the operations manager uploads the fallback documents;
- the webmaster keeps connector status visible as pending credentials, pending
  API, no disponible or deshabilitado real;
- the system shows which dashboards depend on each document;
- data quality rules stay identical between connector and document paths.

When a connector becomes available, its first sync should run in preview mode
against the last accepted bulk upload. Differences must be reconciled before
the connector becomes the active source.

## KPI publication rule

No KPI should appear as conclusive when an essential source is missing. The UI
must show pending upload, source not connected or data incomplete instead of
inventing a number.
