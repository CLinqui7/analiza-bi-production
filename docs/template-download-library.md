# Template download library

The Plantillas screen is the download library for operations managers. It is
separate from Importaciones:

- Plantillas: downloads the Excel-compatible workbooks that managers fill.
- Importaciones: uploads, validates, previews, approves and publishes those
  completed files.

## Package rule

Each business-line package contains:

- consolidated templates required by every line, such as catalogs, goals,
  capacity, financial results and service costs;
- line-specific templates, such as orders/tests for Laboratory, sessions for
  Physiotherapy, and studies/equipment for Imaging;
- monthly branch-result templates when the line needs branch-level result
  reporting.

## Last-upload rule

When the system has a latest uploaded version, the downloaded workbook must
include a sanitized reference sheet named `ULTIMA_SUBIDA_SIN_PII`. This sheet is
used only as a base for the next month. It must not expose patient names,
phones, document numbers, clinical identifiers or connector secrets.

The active month is written into the `CARGA_SIGUIENTE_MES` sheet. Managers fill
that sheet and then upload the completed workbook in Importaciones.

## File format

Current local implementation generates Excel-compatible `.xls` SpreadsheetML
workbooks without external browser dependencies. In production, if exact `.xlsx`
archives are required, generation should move to a server-side exporter and
preserve the same workbook contract:

- instructions sheet;
- next-month load sheet;
- latest upload without PII;
- validation rules;
- field dictionary.

## Publication boundary

Downloading a template never changes data. Dashboards read only imported,
validated and published versions with traceability to source file, template
version, uploader, period and transformation.
