# Data Ingestion

Fecha de revision: 2026-08-07

## Estado Macro Sprint 3

Sprint 3 agrega una plataforma server-side para entrada de datos con flujo:

1. seleccion de pais, empresa, linea, sucursal, dataset y periodo;
2. carga `.csv`, `.xlsx` o `.xls` compatible;
3. deteccion de tipo real por firma/contenido;
4. lectura de headers;
5. mapping por aliases de plantilla;
6. validacion server-side;
7. staging;
8. preview;
9. quality gate;
10. publish;
11. lineage;
12. rollback;
13. audit log.

La implementacion runtime vive en `lib/data-ingestion/*` y las rutas API bajo `/api/imports/*`. La migracion `supabase/migrations/20260807000200_sprint3_ingestion_connectors.sql` deja el modelo fisico RAW/STAGING/PUBLISHED listo para Supabase/Postgres.

## Separacion RAW / STAGING / PUBLISHED

RAW:
- `ingestion_raw_files`
- checksum SHA-256
- nombre original y sanitizado
- content type
- tamanio
- source/import/upload actor
- inmutable

STAGING:
- `ingestion_staging_rows`
- fila original
- fila mapeada
- errores
- warnings
- codigos de validacion
- hash por fila

PUBLISHED:
- `ingestion_published_rows`
- solo filas validas aprobadas
- `active=true`
- rollback marca filas como inactivas, no borra RAW

## Plantillas Versionadas

`lib/data-ingestion/templates.ts` define plantillas `2026-08-sprint3` para:

- Fisioterapia
- Laboratorio
- Imagenes
- Facturacion
- Cobros
- Costos directos
- Capacidad
- Citas
- Metas
- Profesionales
- Servicios
- Gerentes
- Sucursales
- CRM

Cada campo declara definicion, obligatoriedad, tipo, aliases, ejemplo DEMO y catalogo valido cuando aplica.

## Validaciones

El cliente puede ayudar a seleccionar archivo, pero la decision ocurre en servidor:

- extension permitida por plantilla
- tamanio maximo
- MIME/firma real
- columnas obligatorias
- fechas `YYYY-MM-DD`
- periodos `YYYY-MM`
- numeros, decimales y porcentajes
- moneda explicita
- catalogos de pais/empresa/linea/sucursal/estado
- formulas peligrosas
- duplicados por llave natural
- idempotencia por pais/empresa/sucursal/dataset/periodo/checksum/source
- alcance por actor, rol y sucursal

Estados:
- `VALIDATED`
- `WARNING`
- `BLOCKED`
- `PUBLISHED`
- `ROLLED_BACK`

## Lineage

Cada fila publicada conserva:

- source
- connector
- file
- import
- row original
- mapping version
- transformaciones
- validaciones
- usuario
- fecha
- version de plantilla

El endpoint `/api/imports/[importId]/lineage` responde a la pregunta: “de donde salio este dato”.

## Blockers Manuales

Permanecen como release blockers:

- aplicar migracion RLS remota;
- rotar credenciales demo historicas si existen;
- verificar DOM en deployment;
- configurar credenciales reales de conectores en variables server-side;
- activar repositorio persistente DB en ambientes con Supabase/Postgres antes de operacion real.
