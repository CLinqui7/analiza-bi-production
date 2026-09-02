# Current Deployment Environment

Fecha de diagnostico: 2026-08-10

Este diagnostico fue realizado en modo solo lectura. No se ejecutaron deployments, migraciones, reinicios, cambios de DNS, cambios de credenciales ni escrituras en PostgreSQL.

## Resumen Ejecutivo

Analiza Intelligence ya esta publicado en infraestructura propia sobre AWS EC2, Docker Compose, Nginx y PostgreSQL local en contenedores. Existe tambien un entorno staging publico bajo el mismo servidor y proveedor actual.

La version que esta publicada hoy no corresponde al HEAD local. La aplicacion publica esta en una release anterior, sin las migraciones de Security/RBAC final, ingestion nueva ni Closing Engine para Fisioterapia, Laboratorio e Imagenes.

## Hosting Actual

| Item | Estado detectado |
| --- | --- |
| Proveedor | AWS EC2 existente |
| Servidor | `ubuntu@3.138.91.211` |
| Host interno | `ip-172-31-0-153` |
| Sistema operativo | Ubuntu 26.04 LTS |
| Reverse proxy | Nginx `1.28.3` |
| SSL | Certbot / Let's Encrypt |
| PM2 | No instalado |
| systemd app custom | No detectado |
| CI/CD en servidor | No detectado |
| Git repo activo en servidor | No detectado en releases actuales |
| Metodo de deployment | Releases manuales en `/opt`, Docker image local y Docker Compose |

## Dominios Y Puertos

| Dominio | Nginx proxy | Contenedor |
| --- | --- | --- |
| `https://analizabi.site` | `http://127.0.0.1:3001` | `analiza-intelligence-analiza-intelligence-1` |
| `https://www.analizabi.site` | `http://127.0.0.1:3001` | `analiza-intelligence-analiza-intelligence-1` |
| `https://staging.analizabi.site` | `http://127.0.0.1:3002` | `analiza-staging-app-1` |

Los dos dominios HTTPS respondieron `200 OK` durante el diagnostico.

## Docker Actual

| Contenedor | Imagen | Estado | Puerto |
| --- | --- | --- | --- |
| `analiza-intelligence-analiza-intelligence-1` | `analiza-intelligence:production` | Up 5 days | `0.0.0.0:3001 -> 3000` |
| `analiza-staging-app-1` | `analiza-intelligence:staging-202608050100` | Up 5 days | `127.0.0.1:3002 -> 3000` |
| `analiza-intelligence-postgres-1` | `postgres:17-alpine` | Up 6 days, healthy | `127.0.0.1:5432 -> 5432` |
| `analiza-staging-postgres-1` | `postgres:17-alpine` | Up 5 days, healthy | internal |

## Releases Actuales

Produccion:

- `current` apunta a `/opt/analiza-intelligence/releases/202608050205-real-session-scope`.
- Docker Compose usa `/opt/analiza-intelligence/releases/202608050205-real-session-scope/docker-compose.yml`.
- Runtime env file apunta a `/opt/analiza-intelligence/shared/.env.runtime`.

Staging:

- `current` apunta a `/opt/analiza-intelligence-staging/releases/202608050100-manual-staging`.
- Docker Compose usa `/opt/analiza-intelligence-staging/releases/202608050100-manual-staging/deploy/staging/docker-compose.yml`.
- Runtime env file: `/opt/analiza-intelligence-staging/releases/202608050100-manual-staging/deploy/staging/.env.staging`.

## Commit Publicado

No hay metadata Git dentro de la imagen ni dentro de la release actual. Por eso el commit desplegado no se puede probar criptograficamente desde el servidor.

Inferencia fuerte:

- La release publica contiene exactamente las migraciones y tests presentes en `32ac27638fafc6d586f154b4f2f5bb65c425b609`.
- Commit inferido desplegado: `32ac27638fafc6d586f154b4f2f5bb65c425b609`.
- Mensaje: `fix: prioritize real sessions over demo mode`.
- Release: `202608050205-real-session-scope`.

HEAD local actual:

- Rama: `codex/invitation-password-auth`.
- Commit: `4174cc0837cecb690180575cd8d78409f8416575`.
- Mensaje: `fix: finalize cross-functional executive quality`.
- Diferencia: HEAD local esta 14 commits adelante del commit inferido publicado.

## Variables De Entorno Detectadas

No se imprimieron valores secretos. Se confirmo solo presencia de llaves.

Produccion actual:

- `NODE_ENV=production`
- `APP_URL` configurada.
- `DATABASE_URL` configurada server-side.
- `NEXT_PUBLIC_SUPABASE_URL` esta vacia.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` existe, redacted.
- `ANALIZA_ENABLE_DEMO_ADMIN` esta presente y habilitada.
- `ANALIZA_DISABLE_DEMO_ADMIN` esta presente pero no deshabilita demo.
- SMTP y OpenAI existen como server-only.

Staging actual:

- `NODE_ENV=production`
- `APP_URL=https://staging.analizabi.site`
- `DATABASE_URL` configurada server-side.
- `NEXT_PUBLIC_SUPABASE_URL=https://staging-placeholder.invalid`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` existe, redacted.
- `ANALIZA_ENABLE_DEMO_ADMIN=false`
- `ANALIZA_DISABLE_DEMO_ADMIN=true`

Variable faltante para la version actual del repo:

- `APP_ENV=staging` o `ANALIZA_APP_ENV=staging` debe declararse explicitamente en staging.

## Base De Datos Actual

Tipo:

- PostgreSQL directo, self-hosted en Docker.
- No es Supabase managed.
- La app conserva helpers Supabase SSR/Auth para compatibilidad, pero el servidor actual opera principalmente con PostgreSQL directo y sesiones locales.

Produccion:

- Contenedor: `analiza-intelligence-postgres-1`.
- DB: `analiza_intelligence`.
- Usuario app: `analiza_app`.
- PostgreSQL: `17.10`.
- Esquemas detectados: `auth`, `public`.
- Tabla `supabase_migrations.schema_migrations`: missing.

Staging:

- Contenedor: `analiza-staging-postgres-1`.
- DB: `analiza_staging`.
- Usuario app: `analiza_staging_app`.
- PostgreSQL: `17.10`.
- Esquemas detectados: `auth`, `public`.
- Tabla `supabase_migrations.schema_migrations`: missing.

## RLS

RLS esta habilitado en tablas core como `organizations`, `profiles`, `roles`, `user_roles` y `user_invitations`.

Bloqueo critico:

- Rol production `analiza_app`: `super=true`, `bypassrls=true`.
- Rol staging `analiza_staging_app`: `super=true`, `bypassrls=true`.

Conclusion: aunque las tablas tengan RLS habilitado, el rol actual de aplicacion puede omitir RLS. No debe declararse RLS verificado hasta crear o usar un rol no-superuser, sin `BYPASSRLS`, y probar denegaciones reales.

## Backups

Produccion:

- Script detectado: `/opt/analiza-intelligence/shared/postgres/backup.sh`.
- Cron detectado: `17 3 * * * /opt/analiza-intelligence/shared/postgres/backup.sh`.
- Backup detectado: `/opt/analiza-intelligence/shared/postgres/backups/analiza_intelligence_20260804T010843Z.sql.gz`.

Staging:

- Carpeta detectada: `/opt/analiza-intelligence-staging/shared/backups`.
- Backup detectado: `/opt/analiza-intelligence-staging/shared/backups/analiza_staging_20260805T013500Z.dump`.
- No se detecto cron de staging.

## Migraciones Detectadas

No existe tabla de historial de migraciones. La clasificacion se basa en archivos de release y existencia de tablas representativas.

| Migracion | Produccion actual | Staging actual | Evidencia |
| --- | --- | --- | --- |
| `20260720000100_phase1_core.sql` | APPLIED | APPLIED | Tablas core presentes y RLS core habilitado |
| `20260720000200_phase3_operations.sql` | APPLIED | APPLIED | Tablas `appointments`, `professionals`, `capacity_records`, `service_events` presentes |
| `20260721000100_semantic_ecosystem.sql` | APPLIED | APPLIED | Tablas `business_lines`, `fact_*`, `goals`, `insights` presentes |
| `20260729000100_area_manager_role.sql` | APPLIED | APPLIED | Rol/funciones de gerente de area inferidas por release y jerarquia actual |
| `20260729000200_delegated_user_hierarchy.sql` | APPLIED | APPLIED | `operational_areas`, `manager_assignments`, `role_hierarchy` presentes |
| `20260807000100_sprint1_harden_security_rbac.sql` | PENDING | PENDING | No esta en release actual y no hay historial que pruebe aplicacion |
| `20260807000200_sprint3_ingestion_connectors.sql` | PENDING | PENDING | Tablas `ingestion_*` ausentes |
| `20260810000100_physiotherapy_closing_persistence.sql` | PENDING | PENDING | `monthly_closings`, `physiotherapy_closing_inputs`, `closing_*`, `kpi_targets`, `generated_insights` ausentes |
| `20260810000200_laboratory_closing_persistence.sql` | PENDING | PENDING | `laboratory_closing_inputs` ausente |
| `20260810000300_imaging_closing_persistence.sql` | PENDING | PENDING | `imaging_closing_inputs` ausente |

## Datos Actuales

Produccion tiene datos base:

- Paises: 7.
- Empresas: 3.
- Sucursales: 6.
- Areas operativas: 0.
- `monthly_closings`: tabla ausente.
- `closing_kpi_results`: tabla ausente.
- `kpi_targets`: tabla ausente.
- `generated_insights`: tabla ausente.

Staging tiene datos base:

- Paises: 8.
- Empresas: 4.
- Sucursales: 7.
- Areas operativas: 2.
- `monthly_closings`: tabla ausente.
- `closing_kpi_results`: tabla ausente.
- `kpi_targets`: tabla ausente.
- `generated_insights`: tabla ausente.

Conclusion: no existe todavia un dataset de revision ejecutiva basado en Closing Engine en servidor.

## Riesgos Detectados

| Severidad | Riesgo | Estado |
| --- | --- | --- |
| P0 | Public production actual tiene demo admin habilitado en variables. | Debe corregirse antes de exponer nueva revision fuera de staging. |
| P0 | Roles PostgreSQL actuales son superuser y `bypassrls=true`. | RLS no puede considerarse verificado. |
| P0 | Falta `APP_ENV=staging` explicito en staging actual. | Debe agregarse antes de publicar HEAD actual a staging. |
| P1 | No hay tabla de historial de migraciones. | Se requiere auditoria manual por tablas y backup previo. |
| P1 | No existen tablas de Closing Engine remoto. | Migraciones pendientes antes de publicar verticales. |
| P1 | No existe dataset Closing Engine para revision ejecutiva. | Debe cargarse despues de migraciones. |
| P1 | Scripts staging actuales apuntan a endpoints legacy (`/auth/local`, `/api/manual-submissions`). | Deben reemplazarse o no usarse para validar HEAD actual. |
| P2 | El servidor requiere actualizaciones y reinicio del sistema. | No bloquearia staging, pero debe programarse mantenimiento. |

