# Arquitectura Actual

Fecha de revision: 2026-08-07

## Resumen

ANALIZA INTELLIGENCE es una aplicacion BI multipais y multiempresa construida sobre Next.js App Router. El producto ya contiene pantallas ejecutivas, dashboards operativos, modelos de jerarquia, migraciones Supabase y datos DEMO extensos. Despues de Sprint 1, autenticacion, autorizacion de rutas, permisos de invitacion y aislamiento demo/production tienen una capa server-side central. Despues de Macro Sprint 2, filtros globales, contratos KPI DEMO, finanzas reconciliadas, capacidad/ocupacion, calidad de datos e insights ejecutivos tienen una primera capa semantica compartida. Macro Sprint 3 agrega importaciones server-side, staging, publish, rollback, lineage, auditoria, plantillas versionadas y framework de conectores. Macro Sprint 4 consolida la experiencia ejecutiva, responsive, rutas ambiguas, estados profesionales y documentacion de readiness sin desplegar a produccion.

## Stack

- Next.js App Router con React 19.
- TypeScript estricto.
- Tailwind CSS, Radix UI, Lucide React.
- Supabase SSR/Auth con `@supabase/ssr` y `@supabase/supabase-js`.
- PostgreSQL opcional via `pg`.
- Nodemailer para invitaciones.
- OpenAI API server-side en el endpoint de AnaliA.
- Pruebas custom con Node y scripts `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Capas detectadas

### Rutas y shell protegido

- `app/protected/layout.tsx` actua como compuerta de acceso general via `requireProtectedAccess`.
- `app/protected/overview/page.tsx` renderiza el dashboard ejecutivo despues de `requireProtectedPath`.
- `app/protected/[module]/page.tsx` resuelve modulos dinamicos desde `lib/navigation.ts` y aplica `requireProtectedPath` antes de renderizar.
- `/protected/apis` queda registrado como alias explicito de integraciones/conectores para evitar 404 ambiguo.
- `components/app-sidebar.tsx` controla navegacion visible por rol en cliente.
- `app/forbidden/page.tsx` presenta denegacion profesional cuando el servidor bloquea una ruta.

Estado Sprint 1: el modulo dinamico ya no depende solo del sidebar. `lib/security/authorization-policy.ts` aplica `allowedRoles` server-side y superadministradores tienen override controlado.

### Autenticacion

- `proxy.ts` llama `updateSession` para refrescar/verificar sesion.
- `lib/supabase/proxy.ts` maneja redireccion de usuarios no autenticados.
- `lib/auth/demo-admin.ts` habilita acceso demo admin solo cuando `lib/security/environment.ts` permite runtime demo.
- `app/api/auth/demo-session/route.ts` crea sesiones DEMO server-side por perfil autorizado y escribe cookies HttpOnly.
- `lib/auth/local-session.ts` firma sesiones locales con HMAC y cookies httpOnly.
- `components/login-form.tsx` muestra el selector "Entorno DEMO local" solo cuando el servidor lo habilita; tambien conserva login local y fallback Supabase.
- `lib/server/authorization.ts` resuelve el actor actual desde sesion local, sesion demo o claims Supabase.

Estado Sprint 1: las rutas protegidas y APIs sensibles derivan actor server-side. Sesiones locales requieren secreto configurado fuera de demo.

### RBAC y permisos

- `lib/navigation.ts` define roles permitidos por modulo.
- `lib/tenant/delegation-policy.ts` define reglas de delegacion para operaciones, area, sucursal y usuarios operativos.
- Migraciones Supabase agregan tablas, funciones y politicas RLS.
- `app/api/users/invite/route.ts` valida invitaciones con actor server-side y ya no acepta `actorRole` ni `actorScope` como fuente de verdad.
- `app/api/analia-chat/route.ts` exige sesion y permiso para la ruta consultada.

Estado Sprint 1: existe una politica pura en `lib/security/authorization-policy.ts` y una capa server-side en `lib/server/authorization.ts`.

### Contexto global

- `components/tenant-context-header.tsx` sincroniza contexto por URL, storage y eventos.
- `components/context-selection-form.tsx` permite elegir pais, empresa, linea y sucursal.
- `lib/analytics/global-filters.ts` centraliza la fuente unica para pais, empresa, linea, sucursal, area, gerente, profesional, servicio, pagador, canal y rango de fechas.
- `lib/tenant/demo-context.ts` define opciones DEMO y deriva areas/sucursales.

Estado Macro Sprint 2: Resumen Ejecutivo, Finanzas, Capacidad/Ocupacion, Calidad e Insights consumen el mismo contrato de contexto. Si un filtro no tiene fuente cargada, deben mostrar `Sin datos disponibles para este filtro` en lugar de reutilizar un consolidado.

Riesgo principal: la fuente semantica actual usa datasets DEMO TypeScript; falta reemplazarla por consultas server-side con lineage real.

### Dashboards y BI

- `components/executive-dashboard.tsx` usa datos de `lib/analytics/demo-dashboard.ts`.
- `components/financial-health-dashboard.tsx` usa `lib/analytics/financial-health.ts`.
- `lib/analytics/semantic-bi.ts` calcula snapshots ejecutivos por contexto, aplica invariantes financieras, define estados de KPI bloqueado y publica quality score/quality level.
- Otros dashboards consumen modulos en `lib/analytics`.

Estado Macro Sprint 2: los dashboards ejecutivos principales recalculan por sucursal y fechas cuando hay fuente DEMO disponible; filtros granulares sin datos cargados devuelven estado no-data. Los insights bloquean conclusiones ejecutivas cuando la calidad o confianza es insuficiente.

Estado Macro Sprint 4: `/protected/overview` funciona como Executive Command Center con header de pais, empresa, sucursal, periodo, ultima actualizacion y calidad; tarjetas principales de negocio; seccion “Requiere su atencion”; y tablas ejecutivas con cards mobile.

Riesgo principal: la capa BI todavia no esta conectada a un `KpiSemanticService` server-side persistente ni a published rows reales por archivo/import/conector.

### Finanzas

- Los valores financieros se calculan y formatean en `lib/analytics/financial-health.ts`.
- `getFinancialHealthScreenForContext` consume el snapshot semantico para separar facturacion neta, cobros, cuentas por cobrar, costo directo y margen de contribucion.
- Las invariantes de Sprint 2 exigen reconciliacion de canales contra facturacion neta, formas de pago contra cobros, moneda explicita y ausencia de `NaN`/`Infinity`.

Riesgo principal: las cifras reconciliadas son DEMO y no deben tratarse como resultados reales hasta conectar importaciones publicadas persistidas y fuentes financieras autorizadas.

### Importaciones

- `components/import-operations-dashboard.tsx` ejecuta carga masiva contra `/api/imports/upload`, publica con `/api/imports/[importId]/publish`, revierte con `/api/imports/[importId]/rollback` y consulta lineage.
- `components/manual-monthly-entry-dashboard.tsx` captura entradas mensuales y guarda historial local.
- `lib/data-ingestion/templates.ts` define plantillas versionadas para datasets operativos y financieros.
- `lib/data-ingestion/file-parser.ts` soporta CSV, XLSX basico y XLS compatible tabular/HTML.
- `lib/data-ingestion/platform.ts` separa RAW, STAGING y PUBLISHED, aplica idempotencia, quality gates, audit log y rollback.
- `app/api/imports/*` expone validacion, plantillas, publish, rollback y lineage con actor server-side.
- La migracion `supabase/migrations/20260807000200_sprint3_ingestion_connectors.sql` agrega tablas fisicas para ingestion.

Riesgo principal: antes de operacion real debe aplicarse la migracion remota y conectar el repositorio persistente DB en ambiente autorizado.

### Jerarquia organizacional

- `lib/tenant/managed-branch-records.ts` contiene sucursales, areas y managers DEMO.
- `lib/tenant/demo-context.ts` deriva areas operativas desde esos registros.
- Migraciones Supabase contienen estructura para jerarquia y RLS.

Riesgo principal: el modelo existe, pero falta cerrar el ciclo real entre DB, sesion, permisos y UI.

### Conectores e integraciones

- `components/crm-connectors-dashboard.tsx` presenta Fuentes y Conectores con estado, test connection y sync.
- `lib/data-ingestion/connectors.ts` define el contrato `DataConnector`, adapters DEMO y conectores reales deshabilitados si faltan credenciales.
- `lib/analytics/business-control-center.ts` lista endpoints esperados.
- `app/api/connectors/*` expone status, test y sync.

Riesgo principal: los conectores reales de Fisioterapia, Laboratorio e Imagenes quedan pendientes de credenciales y validacion contra sistemas externos. Fallan cerrado y mantienen fallback manual; credenciales reales de conectores siguen como blocker manual.

### UX, responsive y QA

- `docs/design-system.md` define el sistema visual ejecutivo: fondo claro, navy, azul electrico, tarjetas blancas, sombras discretas, estados semanticos y convenciones de tablas/cards.
- `components/executive-dashboard.tsx`, `components/manager-bonus-dashboard.tsx`, `components/import-operations-dashboard.tsx` y `components/crm-connectors-dashboard.tsx` tienen lectura mobile con cards para tablas criticas.
- Las vistas de Fisioterapia, Laboratorio e Imagenes muestran semantica separada por unidad y marcan fuentes pendientes en lugar de inventar KPIs.
- `package.json` usa Turbopack tanto en desarrollo (`next dev`) como en build (`next build`). El CSS de capa personalizada se mantiene fuera de `@layer components` cuando comparte nombres con utilidades Tailwind, para evitar que las variantes `file:*` corrompan selectores generados.
- Smoke local 2026-08-07: rutas principales respondieron 200 con cookie demo local; no se detecto password prellenado en HTML ni React #418 en la respuesta.

Riesgo principal: falta Playwright/Lighthouse formal y verificacion DOM/Console en deployment real. No se declara Production Ready mientras sigan abiertos blockers manuales externos: migraciones remotas, verificacion DOM y credenciales reales de conectores.

## Arquitectura objetivo recomendada

- `AuthorizationService` server-side para rutas, APIs, acciones, importaciones, exportaciones y conectores. La base inicial ya existe para rutas, invitaciones y AnaliA.
- `TenantScope` obligatorio en cada request: organization, country, company, operational area, branch, role y assignments.
- `KpiSemanticService` con contratos versionados, required fields, formulas, filtros soportados y lineage.
- `ImportPipeline` server-side con staging, validation, publish, rollback, audit log y data quality score.
- `ConnectorRuntime` server-only con adapters reales y DEMO separados.
- `EnvironmentGuard` que impida mezclar DEMO/staging/production y bloquee datos demo en produccion.

## Cambios Sprint 1

- Capa de ambiente server-side en `lib/security/environment.ts`.
- Politica pura RBAC en `lib/security/authorization-policy.ts`.
- Resolucion server-side de actor en `lib/server/authorization.ts`.
- Guard de URL directa en `app/protected/[module]/page.tsx`, `app/protected/overview/page.tsx`, `app/protected/context/page.tsx` y `app/protected/page.tsx`.
- Pantalla `/forbidden`.
- Endpoint `/api/auth/demo-role` para sincronizar rol DEMO server-side solo en runtime demo.
- Invitaciones protegidas por actor server-side y auditoria con `actor_user_id` cuando existe UUID.
- Migracion `supabase/migrations/20260807000100_sprint1_harden_security_rbac.sql` para RLS estricto por area/sucursal y auditoria de cambios de rol/alcance/estado.

## Cambios Macro Sprint 2

- Fuente unica de filtros en `lib/analytics/global-filters.ts` con serializacion URL/storage/evento.
- Primera capa semantica BI en `lib/analytics/semantic-bi.ts` para Resumen Ejecutivo, Finanzas, Capacidad/Ocupacion, Calidad e Insights.
- Finanzas DEMO reconciliadas por facturacion neta, cobros, cuentas por cobrar, canal, forma de pago, moneda y margen de contribucion.
- Capacidad diferencia ocupacion clinica de Fisioterapia, utilizacion tecnica de Laboratorio y metricas pendientes de Imagenes cuando faltan RIS/PACS/capacidad por equipo.
- Calidad de datos publica niveles `Confiable`, `Revisar` e `Insuficiente`, y bloquea conclusiones ejecutivas cuando el dato no soporta una afirmacion.
- Prueba de regresion `tests/macro-sprint2-bi-integrity.test.mjs` cubre filtros, deep links, reconciliacion financiera, ocupacion/capacidad, data quality e insights.

## Cambios Macro Sprint 3

- Plataforma de importacion en `lib/data-ingestion/platform.ts` con RAW/STAGING/PUBLISHED, idempotencia, quality gate, audit log, lineage y rollback.
- Parser server-side en `lib/data-ingestion/file-parser.ts` para CSV, XLSX y XLS compatible.
- Plantillas versionadas en `lib/data-ingestion/templates.ts` para Fisioterapia, Laboratorio, Imagenes, Facturacion, Cobros, Costos, Capacidad, Citas, Metas, Profesionales, Servicios, Gerentes, Sucursales y CRM.
- Framework `DataConnector` en `lib/data-ingestion/connectors.ts` con adapters DEMO y conectores reales preparados para credenciales server-only.
- APIs `/api/imports/*` y `/api/connectors/*` protegidas por actor server-side.
- Migracion `supabase/migrations/20260807000200_sprint3_ingestion_connectors.sql`.
- Prueba de regresion `tests/macro-sprint3-ingestion.test.mjs` cubre importacion, staging, publish, rollback, lineage, duplicados, conectores y scope de sucursal.

## Cambios Macro Sprint 4

- Executive Command Center en `/protected/overview` con tarjetas ejecutivas, calidad de dato visible y “Requiere su atencion”.
- Tablas criticas transformadas a cards en mobile para overview, gerentes, importaciones y conectores.
- Ruta `/protected/apis` resuelta como alias de conectores.
- Vista ejecutiva de gerentes expone jerarquia, area, sucursal, ingresos vs meta, ocupacion, finalizacion/SLA, no-show no calculable cuando falta fuente, productividad, margen, calidad y alertas.
- Vistas por unidad agregan lectura semantica especifica: Fisioterapia clinica, Laboratorio tecnico e Imagenes tecnico-operativa.
- Documentos nuevos: `docs/production-readiness-checklist.md` y `docs/executive-demo-script.md`.
- `docs/design-system.md` actualizado con tokens y convenciones de UX premium.
- Prueba de regresion `tests/macro-sprint4-executive-readiness.test.mjs`.

## Cambios Executive Quality Review

- `/login` queda disponible como entrada ejecutiva local.
- El acceso DEMO por perfil se crea en servidor con `/api/auth/demo-session` y se bloquea fuera de runtime demo local; Vercel preview/staging y production no lo habilitan.
- El actor DEMO usa scope especifico por rol mediante `lib/auth/demo-scope.ts`.
- El proxy permite endpoints publicos de autenticacion controlados sin abrir rutas protegidas.
- Dashboards SVG usan cadenas unicas en `title` para reducir warnings de consola en la demo.
- Revisiones finales documentadas en `docs/reviews/*`.

## Archivos clave

- `app/protected/layout.tsx`
- `app/protected/[module]/page.tsx`
- `app/protected/overview/page.tsx`
- `proxy.ts`
- `lib/supabase/proxy.ts`
- `lib/navigation.ts`
- `components/app-sidebar.tsx`
- `components/tenant-context-header.tsx`
- `components/context-selection-form.tsx`
- `components/executive-dashboard.tsx`
- `components/financial-health-dashboard.tsx`
- `components/capacity-occupancy-dashboard.tsx`
- `components/data-quality-analia-dashboard.tsx`
- `components/import-operations-dashboard.tsx`
- `components/manual-monthly-entry-dashboard.tsx`
- `components/business-module-dashboard.tsx`
- `components/crm-connectors-dashboard.tsx`
- `docs/design-system.md`
- `docs/production-readiness-checklist.md`
- `docs/executive-demo-script.md`
- `lib/auth/demo-admin.ts`
- `lib/auth/local-session.ts`
- `app/api/users/invite/route.ts`
- `lib/server/user-invitations.ts`
- `lib/analytics/global-filters.ts`
- `lib/analytics/semantic-bi.ts`
- `lib/data-ingestion/*`
- `lib/analytics/*`
- `lib/tenant/*`
- `tests/macro-sprint2-bi-integrity.test.mjs`
- `tests/macro-sprint3-ingestion.test.mjs`
- `app/api/imports/*`
- `app/api/connectors/*`
- `supabase/migrations/*`
- `supabase/seed.sql`
