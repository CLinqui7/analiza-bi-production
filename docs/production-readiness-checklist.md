# Production Readiness Checklist

Fecha de revision: 2026-08-10
Estado: Executive demo local preparada; produccion bloqueada por tareas manuales externas.

## Security

- [ ] Aplicar migracion RLS remota `20260807000100_sprint1_harden_security_rbac.sql`.
- [ ] Confirmar secret scanning en rama final y artefacto de build.
- [ ] Rotar credenciales demo historicas si existieron en DOM, logs o capturas.
- [x] RBAC server-side para rutas protegidas dinamicas.
- [x] APIs sensibles de invitaciones, AnaliA, imports y conectores derivan actor server-side.
- [x] Selector `Rol DEMO` queda controlado por ambiente server-side.
- [x] DEMO admin requiere `APP_ENV=demo`, `ANALIZA_ENABLE_DEMO_ADMIN=true` y token server-only largo.
- [x] Produccion sin `APP_ENV` explicito falla cerrado como production.
- [x] Invitaciones en produccion exigen `APP_URL` canonico.
- [ ] Auditoria remota de cambios sensibles validada contra base autorizada.
- [ ] Confirmar `ANALIZA_POSTGRES_RLS_VERIFIED=true` solo despues de probar RLS real con rol sin `BYPASSRLS`.

## Database

- [ ] Aplicar migracion remota de ingestiones `20260807000200_sprint3_ingestion_connectors.sql`.
- [ ] Aplicar migraciones remotas de cierres Fisioterapia, Laboratorio e Imagenes.
- [ ] Confirmar backup antes de aplicar migraciones en staging/production.
- [ ] Ejecutar plan de rollback de migraciones en staging.
- [ ] Revisar indices reales con volumen de datos productivo.
- [ ] Poblar areas operativas y asignaciones reales de gerentes.

## Data

- [x] Validacion server-side de archivos CSV/XLSX/XLS compatible.
- [x] Separacion RAW/STAGING/PUBLISHED en modelo de ingestion.
- [x] Quality gates, warnings, errores bloqueantes e idempotencia.
- [x] Reconciliacion financiera DEMO por facturacion neta, cobros, cuentas por cobrar y margen de contribucion.
- [ ] Conectar dashboards a published rows reales antes de operar con datos reales.
- [ ] Validar muestras anonimizadas contra pais, empresa, area, sucursal y periodo.

## Integrations

- [ ] Configurar credenciales reales server-side para LIS/API Laboratorio.
- [ ] Configurar credenciales reales server-side para RIS/PACS Imagenes.
- [ ] Configurar credenciales reales server-side para portal Fisioterapia autorizado.
- [ ] Configurar credenciales reales server-side para CRM/facturacion.
- [x] Conectores reales fallan cerrado cuando faltan credenciales.
- [x] Adapters DEMO permiten recorrer pipeline sin credenciales.
- [ ] Definir retries, alertas y ventanas de sync por fuente real.

## Observability

- [ ] Frontend error tracking en staging/production.
- [ ] Logs backend estructurados sin PII ni secretos.
- [x] Audit log de importaciones en runtime Sprint 3.
- [x] Connector run log en runtime Sprint 3.
- [ ] Uptime monitor y alerta de disponibilidad.
- [ ] Verificar DOM/Console en deployment final.

## QA

- [x] P0 abiertos en codigo local: 0 detectados en smoke Sprint 4.
- [x] P1 abiertos en codigo local: 0 detectados en alcance Sprint 4.
- [x] Smoke local de rutas principales en 200.
- [x] `/protected/apis` resuelto como alias explicito de conectores.
- [x] No se detecto password prellenado en HTML de rutas protegidas del smoke local.
- [ ] E2E browser completo por rol real en staging.
- [ ] Lighthouse/accessibility formal en deployment.

## Deploy

- [ ] Variables `APP_ENV=production`, `APP_URL`, `ANALIZA_LOCAL_AUTH_SECRET`, Supabase/PostgreSQL, SMTP y `ANALIZA_POSTGRES_RLS_VERIFIED=true` configuradas en entorno autorizado.
- [ ] Dominio productivo confirmado por owner.
- [ ] SSL activo.
- [x] Build local pasa.
- [ ] Smoke test post-deploy.
- [ ] Autorizacion explicita del owner para desplegar a produccion.

## Manual Production Blockers

- Aplicar migracion RLS remota.
- Aplicar migracion de ingestion remota.
- Aplicar migraciones de cierres remotas.
- Verificar rol PostgreSQL sin `BYPASSRLS` y RLS con denegaciones reales.
- Rotar credenciales demo historicas si existieron.
- Verificar DOM en deployment.
- Configurar credenciales reales de conectores.
- Conectar repositorio persistente DB para ingestion real.
