# Known Risks

Fecha de revision: 2026-08-07

Este registro resume riesgos vigentes segun la auditoria principal y la revision del codigo actual. No representa una lista de bugs corregidos; es una base para priorizar sprints.

## P0

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P0-SEC-001 | RBAC server-side incompleto en rutas protegidas | Resuelto en aplicacion | Usuarios podrian acceder por URL directa a modulos no permitidos | `lib/server/authorization.ts`, `lib/security/authorization-policy.ts`, `app/protected/[module]/page.tsx`, `app/forbidden/page.tsx` |
| P0-SEC-002 | Autorizacion sensible delegada a cliente | Resuelto para invitaciones | Invitaciones o acciones privilegiadas podrian ejecutarse con actor/scope manipulados | `app/api/users/invite/route.ts`, `lib/server/user-invitations.ts` |
| P0-SEC-003 | Selector `Rol DEMO` disponible en shell protegido | Mitigado con sesion server-side | Riesgo de confundir demos con permisos reales o filtrar comportamiento a ambientes no demo | `lib/security/environment.ts`, `app/api/auth/demo-role/route.ts`, `app/api/auth/demo-session/route.ts`, `components/app-sidebar.tsx` |
| P0-SEC-004 | Separacion demo/staging/production insuficiente | Mitigado localmente | Riesgo de mezclar datos DEMO con datos reales | `lib/security/environment.ts`, `lib/auth/demo-admin.ts`, `components/business-module-dashboard.tsx`, `.env.local` |
| P0-SEC-005 | Credenciales demo expuestas en DOM | No confirmado; mitigado por busqueda y gating | Si reaparece en runtime, compromete acceso demo/admin | `components/login-form.tsx`, `lib/auth/demo-admin.ts` |
| P0-DATA-001 | DEMO y estructuras reales conviven en runtime | Parcial | Ejecutivos podrian leer datos demo como si fueran reales | `lib/analytics/*`, `lib/tenant/*` |

Nota Sprint 1: la migracion `supabase/migrations/20260807000100_sprint1_harden_security_rbac.sql` endurece RLS para area/sucursal y agrega auditoria de cambios de rol, alcance y estado. La ejecucion remota queda pendiente hasta autorizacion segura sobre Supabase.

## P1

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P1-BI-001 | Filtros globales no recalculan todos los KPIs | Mitigado en dashboards ejecutivos principales | Decisiones con metricas stale o fuera de alcance si una pantalla queda fuera del contrato | `lib/analytics/global-filters.ts`, `lib/analytics/semantic-bi.ts`, `components/executive-dashboard.tsx`, `components/financial-health-dashboard.tsx`, `components/capacity-occupancy-dashboard.tsx` |
| P1-BI-002 | Contexto visible puede no coincidir con pagina de seleccion | Mitigado | Usuario cree estar filtrando una entidad distinta | `components/context-selection-form.tsx`, `components/tenant-context-header.tsx`, `lib/analytics/global-filters.ts` |
| P1-FIN-001 | Finanzas no reconcilian | Mitigado en capa DEMO Sprint 2 | Venta total, canales, pagos y tendencias pueden contradecirse si fuentes reales no pasan por invariantes | `lib/analytics/semantic-bi.ts`, `lib/analytics/financial-health.ts`, `tests/macro-sprint2-bi-integrity.test.mjs` |
| P1-IMP-001 | Importaciones reales sin pipeline server-side | Mitigado en Sprint 3 | Archivos pueden simular publicacion sin validacion durable si se evita API server-side | `lib/data-ingestion/platform.ts`, `app/api/imports/upload/route.ts`, `tests/macro-sprint3-ingestion.test.mjs` |
| P1-IMP-002 | Entradas manuales persisten localmente | Parcial | El formulario mensual historico sigue local; carga masiva ya tiene pipeline server-side | `components/manual-monthly-entry-dashboard.tsx`, `components/import-operations-dashboard.tsx` |
| P1-DQ-001 | No hay data quality gate central | Mitigado para insights DEMO e importaciones Sprint 3 | Insights o imports reales pueden fallar si fuentes externas no pasan quality score | `lib/analytics/semantic-bi.ts`, `lib/data-ingestion/platform.ts`, `lib/analytics/insights.ts`, `components/data-quality-analia-dashboard.tsx` |
| P1-ORG-001 | Jerarquia no esta completamente conectada a DB/sesion/permisos | Vigente | Areas y sucursales pueden comportarse como demo UI, no como alcance real | `lib/tenant/managed-branch-records.ts`, `supabase/migrations/*` |
| P1-UX-LOGIN-001 | Acceso visual local bloqueado despues de Security/RBAC | Resuelto para DEMO local | La direccion no podia revisar la plataforma localmente | `app/login/page.tsx`, `components/login-form.tsx`, `app/api/auth/demo-session/route.ts` |

## P2

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P2-UX-001 | Overflow responsive en dashboards densos | Mitigado en pantallas ejecutivas criticas | Mobile/tablet puede ser dificil de usar en dashboards no auditados visualmente | `components/executive-dashboard.tsx`, `components/manager-bonus-dashboard.tsx`, `components/import-operations-dashboard.tsx`, `components/crm-connectors-dashboard.tsx` |
| P2-INT-001 | Conectores sin endpoints reales | Mitigado parcialmente | Integraciones externas siguen pendientes de credenciales y prueba contra sistemas reales | `lib/data-ingestion/connectors.ts`, `app/api/connectors/status/route.ts`, `components/crm-connectors-dashboard.tsx` |
| P2-ROUTE-001 | `/protected/apis` no existe como modulo | Resuelto local | Enlaces o bookmarks ya abren integraciones/conectores; requiere smoke en deployment | `lib/navigation.ts`, `app/protected/[module]/page.tsx` |
| P2-UX-002 | Error React minified #418 reportado por auditoria | No reproducido en smoke local Sprint 4 | Requiere verificacion DOM/Console en deployment real | Auditoria principal, smoke local 2026-08-07 |
| P2-BI-001 | Terminos de capacidad aun necesitan contrato final | Mitigado parcialmente | Riesgo de interpretacion operativa incorrecta al conectar fuentes reales | `components/capacity-occupancy-dashboard.tsx`, `lib/analytics/capacity-occupancy.ts`, `lib/analytics/semantic-bi.ts` |

## Riesgos transversales

- No debe desplegarse a produccion sin autorizacion explicita y evidencia de cierre P0.
- No deben modificarse migraciones ya ejecutadas; usar migraciones nuevas.
- No debe presentarse ningun KPI como concluyente sin source, periodo, formula, granularidad y required fields.
- No deben mezclarse datos DEMO y produccion en la misma organizacion, query, export, insight o vista ejecutiva.
- Todo permiso debe evaluarse server-side ademas de cualquier control visual.

## Nota Macro Sprint 2

- Quedan fuera de alcance, por instruccion explicita, carga XLSX/CSV completa, CRM, facturacion API, webscraping, responsive profundo, rediseno visual premium y deployment.
- La reconciliacion financiera, filtros globales y calidad de datos estan mitigados sobre datasets DEMO versionados. El riesgo vuelve a abrirse si Sprint 3 no obliga importaciones server-side, staging, publish, rollback, audit log y lineage.
- Las conclusiones ejecutivas ahora deben bloquearse con `Datos insuficientes para conclusion ejecutiva` cuando confianza, completitud o conciliacion no alcanzan umbral.

## Nota Macro Sprint 3

- Sprint 3 agrega carga CSV, XLSX y XLS compatible con validacion server-side, staging, publish, rollback, idempotencia, audit log y lineage.
- La migracion `supabase/migrations/20260807000200_sprint3_ingestion_connectors.sql` queda pendiente de aplicacion remota autorizada.
- Los conectores reales de Fisioterapia, Laboratorio e Imagenes fallan cerrado si faltan credenciales; los adapters DEMO existen para validar pipeline sin bloquear el sprint.
- Persisten como blockers manuales: migracion RLS remota, rotacion de credenciales demo historicas y verificacion DOM en deployment.

## Nota Macro Sprint 4

- Sprint 4 consolida la experiencia ejecutiva local: Command Center, gerentes, vistas por unidad, importaciones, conectores, ruta `/protected/apis`, responsive en pantallas criticas y documentacion de readiness.
- El parsing CSS de Turbopack quedó resuelto al sacar los selectores de estado visual de `@layer components`; las variantes Tailwind `file:*` ya no pueden duplicar `::file-selector-button` en el CSS generado.
- Smoke local 2026-08-07: rutas principales respondieron 200 con cookie demo local; no se detecto password prellenado en HTML protegido ni React #418 en la respuesta.
- No se declara Production Ready mientras sigan abiertos blockers manuales externos: migracion RLS remota, migracion ingestion remota, rotacion de credenciales demo historicas si existieron, verificacion DOM en deployment y credenciales reales de conectores.

## Nota Executive Quality Review

- Se agrega acceso DEMO local por perfil desde `/login`, con sesion creada server-side en `/api/auth/demo-session`.
- El mecanismo solo funciona cuando el servidor permite runtime demo local; staging/preview/production deben mantenerlo bloqueado.
- Se corrigen titulos SVG en dashboards para evitar warnings de React durante la revision visual.
- Se agregan revisiones especializadas en `docs/reviews/*` y plan consolidado en `docs/reviews/EXECUTIVE_FINAL_ACTION_PLAN.md`.

## Decisiones pendientes

- Definir matriz oficial de roles y modulos para Gerente de Operaciones, Gerente de Area, Gerente de Sucursal y usuarios operativos.
- Definir estructura final de ambientes y flags para DEMO, staging y production.
- Conectar dashboards ejecutivos a published rows reales cuando la DB remota tenga imports aprobados.
- Verificar en deployment que `/protected/apis` conserva el alias de conectores sin 404.
- Obtener credenciales oficiales para LIS, RIS/PACS, CRM y facturacion antes de activar conectores reales.
- Ejecutar Playwright/Lighthouse o E2E equivalente en staging cuando exista entorno autorizado con navegador y credenciales reales.
