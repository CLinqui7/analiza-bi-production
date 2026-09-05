# Producción: carga de cierres y metas reales

## Cierres mensuales

Cada Gerente de Sucursal descarga la plantilla correspondiente desde una sesión autorizada:

- `GET /api/monthly-templates/laboratory?format=xlsx` o `format=csv`
- `GET /api/monthly-templates/imaging?format=xlsx` o `format=csv`
- `GET /api/monthly-templates/physiotherapy?format=xlsx` o `format=csv`

Las plantillas salen del contrato vigente de formulario. Incluyen el nombre visible y técnico de cada campo, unidad, obligatoriedad, ejemplo no productivo y reglas de validación. Deben contener únicamente valores agregados; no se permite PII ni identificadores de pacientes.

El flujo de publicación es: seleccionar el branch+line autorizado, guardar el borrador, adjuntar entre una y dos evidencias permitidas, completar campos obligatorios y publicar. La publicación crea un cierre no DEMO, sus KPIs y su trazabilidad solamente después de validación de alcance, formulario y evidencia.

## Metas reales

Un CEO, super administrador o webmaster administrador puede cargar metas mediante `POST /api/kpi-targets/import` usando `multipart/form-data`.

Campos CSV/XLSX obligatorios:

`country_id,company_id,operational_area_id,branch_id,business_line_id,period,kpi_code,kpi_name,target_value,unit,direction,approval_status`

- `period` usa `YYYY-MM` y se normaliza al primer y último día reales del mes.
- `unit` debe ser `currency`, `count` o `ratio`.
- `direction` debe ser `HIGHER_IS_BETTER` o `LOWER_IS_BETTER`.
- `approval_status` debe ser `active` o `approved`.
- La primera ejecución debe enviar `dryRun=true`. Valida tipo, tamaño, fórmulas, columnas, catálogos y scope sin escribir datos.
- Para escribir, usar `dryRun=false`. El proceso actualiza o inserta por organización, branch, línea, período y KPI; registra una auditoría por fila.

La importación rechaza archivos mayores de 1 MB, extensiones distintas de CSV/XLSX, celdas con fórmulas o valores con prefijos de fórmula. Nunca usarla para metas ficticias ni datos DEMO.

## Inventario de readiness

Ejecutar `node scripts/production-data-readiness.mjs` con credenciales de administración configuradas localmente. La herramienta sólo lee producción y genera archivos ignorados por Git:

- `artifacts/production-data-readiness.json`
- `artifacts/production-data-readiness.csv`

Cada fila representa exactamente un branch+line y puede incluir `READY`, `NO_CLOSING`, `MISSING_TARGET`, `MISSING_MANAGER`, `VACANT_MANAGER` o `MISSING_REQUIRED_CONFIGURATION`. El reporte usa referencias de área opacas y no incluye personas, correos, tokens ni contenido de archivos.
