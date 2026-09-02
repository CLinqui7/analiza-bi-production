# Connectors

Fecha de revision: 2026-08-07

## Estado Macro Sprint 3

Sprint 3 introduce el framework comun `DataConnector`:

```ts
interface DataConnector {
  testConnection(): Promise<ConnectionResult>;
  fetchSchema(): Promise<SourceSchema>;
  sync(params: SyncParams): Promise<SyncResult>;
  getStatus(): Promise<ConnectorStatus>;
}
```

Tipos soportados:

- REST API
- GraphQL
- database
- webhook
- SFTP
- manual file
- authorized scraping

## Catalogo Inicial

`lib/data-ingestion/connectors.ts` define:

- Facturacion DEMO
- Cobros DEMO
- CRM DEMO
- Fisioterapia scraping autorizado
- Laboratorio LIS/API
- Imagenes RIS/PACS

Los conectores reales quedan deshabilitados si faltan credenciales. El fallback manual sigue usando las mismas plantillas y quality gates.

## Variables Requeridas

Fisioterapia scraping autorizado:
- `PHYSIO_PORTAL_BASE_URL`
- `PHYSIO_AUTHORIZED_SESSION_SECRET`

Laboratorio LIS/API:
- `LAB_LIS_BASE_URL`
- `LAB_LIS_CLIENT_ID`
- `LAB_LIS_CLIENT_SECRET`

Imagenes RIS/PACS:
- `IMAGING_RIS_BASE_URL`
- `IMAGING_RIS_CLIENT_SECRET`

Ninguna credencial real debe escribirse en cliente, documentacion, logs o screenshots.

## Estados

Cada fuente muestra:

- Conectado
- Sin configurar
- Error
- Pausado
- Pendiente

Y conserva:

- ultimo sync
- proxima ejecucion
- ultimo dato recibido
- registros procesados
- registros rechazados
- errores
- retries
- cobertura
- freshness
- responsable

## Scraping Autorizado

La arquitectura de Fisioterapia permite fixtures HTML para pruebas y deja el conector real preparado. Reglas:

- no evadir CAPTCHA;
- no evadir MFA;
- no saltar autenticacion;
- usar sesion autorizada;
- detectar cambios HTML;
- registrar ultima extraccion;
- soportar paginacion e incremental sync antes de activacion real;
- deduplicar y reintentar con logs;
- fallar cerrado si la estructura cambia.

## Endpoints

- `GET /api/connectors/status`
- `POST /api/connectors/[connectorId]/test`
- `POST /api/connectors/[connectorId]/sync`

Todos derivan actor en servidor y deben respetar pais, empresa, area, sucursal y rol.
