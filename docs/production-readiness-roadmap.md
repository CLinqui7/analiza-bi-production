# Production Readiness Roadmap

Fecha de revision: 2026-08-07  
Fuente principal: `docs/audits/ANALIZA_INTELLIGENCE_AUDIT.md`  
Estado objetivo: mover ANALIZA INTELLIGENCE de CRITICAL a Executive Ready demo y preparar ruta hacia PRODUCTION READY. Sprint 1, Macro Sprint 2 y Macro Sprint 3 fueron cerrados. Macro Sprint 4 consolida UX premium, Executive Command Center, responsive, QA local y documentos de readiness sin desplegar a produccion.

## Estado actual del repo

- Repositorio Next.js App Router con TypeScript estricto, Supabase SSR, PostgreSQL local opcional, Tailwind, Radix UI, Lucide, Nodemailer y OpenAI server-side.
- La auditoria principal esta presente en `docs/audits/ANALIZA_INTELLIGENCE_AUDIT.md`.
- `git status` antes de crear esta documentacion mostraba `docs/audits/` como contenido no trackeado.
- El producto contiene una mezcla importante de pantallas funcionales, datos DEMO tipados en TypeScript y migraciones Supabase para jerarquia, RLS y contexto semantico.
- Sprint 0 quedo cerrado con commit independiente.
- Sprint 1 implementa controles P0 de seguridad y RBAC sin iniciar Sprint 2.
- Macro Sprint 2 crea una fuente unica de filtros y una capa semantica DEMO para overview ejecutivo, finanzas, capacidad/ocupacion, calidad e insights.
- Macro Sprint 3 crea plataforma server-side de importaciones, plantillas versionadas, staging, publish, rollback, lineage, audit log y framework de conectores.
- Macro Sprint 4 convierte `/protected/overview` en Executive Command Center, cierra ruta `/protected/apis`, mejora gerentes, importaciones, conectores y responsive de tablas criticas, y documenta checklist/guion ejecutivo.

## Stack detectado

- Frontend: Next.js, React 19, App Router, Tailwind CSS, Radix UI primitives, Lucide icons.
- Backend: Next.js route handlers, Supabase SSR/Auth, PostgreSQL via `pg`, cookies server-side.
- BI/demo data: modulos TypeScript bajo `lib/analytics` y `lib/tenant`.
- Validacion: ESLint 9, TypeScript 5, pruebas custom con Node.
- Integraciones: Nodemailer para invitaciones, OpenAI en `/api/analia-chat`; conectores CRM/ERP/documentos estan principalmente en estado de diseno/demo.

## Arquitectura detectada

- `app/protected/layout.tsx` valida acceso general a area protegida.
- `app/protected/[module]/page.tsx` renderiza modulos protegidos desde `lib/navigation.ts` y aplica `requireProtectedPath` server-side antes de renderizar.
- `proxy.ts` y `lib/supabase/proxy.ts` refrescan/verifican sesion, dejan pasar endpoints publicos de autenticacion controlados y redirigen usuarios no autenticados.
- `components/app-sidebar.tsx` filtra menu por rol en cliente y conserva selector `Rol DEMO` solo cuando el actor server-side autoriza demo role switch.
- El contexto global se guarda en URL, `localStorage`, `sessionStorage` y eventos de navegador desde `components/tenant-context-header.tsx`, con contrato central en `lib/analytics/global-filters.ts`.
- Los dashboards principales consumen una primera capa semantica en `lib/analytics/semantic-bi.ts` para aplicar pais, empresa, linea, sucursal, filtros granulares, periodo, no-data y calidad de datos sobre datasets DEMO.
- Las importaciones masivas ya tienen pipeline server-side en `/api/imports/*`; el formulario mensual historico sigue como fallback manual.
- Conectores ya tienen framework comun y endpoints `/api/connectors/*`; los reales quedan deshabilitados hasta configurar credenciales server-only.
- Las migraciones Supabase incluyen RLS, jerarquia y contexto semantico, pero la aplicacion no depende de forma consistente de esas politicas para autorizacion de rutas/API.

## Hallazgos P0 despues de Sprint 1

- P0-SEC-001: RBAC server-side para rutas dinamicas queda resuelto en aplicacion con `requireProtectedPath` y politica central. Viewer ya no debe renderizar modulos administrativos por URL directa.
- P0-SEC-002: Selector `Rol DEMO` queda limitado por ambiente server-side y sincroniza rol contra `/api/auth/demo-role`; staging/production no lo habilitan.
- P0-SEC-003: Invitaciones ya no aceptan `actorRole` ni `actorScope` desde cliente. El actor se deriva server-side y se valida con `canPerformAction`.
- P0-SEC-004: Se agrega `lib/security/environment.ts` para separar demo/staging/production y bloquear demo auth/role switch fuera de demo.
- P0-DATA-001: Usuarios DEMO automaticos ya no se cargan en Usuarios y permisos fuera de runtime demo. Persisten datasets DEMO BI para sprints posteriores.
- P0-RLS-001: Se crea migracion nueva para endurecer RLS de area/sucursal y auditar cambios sensibles. Ejecucion remota pendiente.

## Hallazgos P0 no confirmados o parcialmente resueltos

- BUG-001 de la auditoria, credenciales demo visibles en DOM, no se confirma en el codigo fuente actual. `components/login-form.tsx` no incluye password hardcoded ni prellenado; `ANALIZA_DEMO_ADMIN_PASSWORD` se lee server-side. Persiste riesgo por usuario demo y token default si el ambiente esta mal configurado.
- Proteccion de sesion y autorizacion por modulo existen para `/protected`; el alcance pais/empresa/area/sucursal se valida en acciones server-side cubiertas y debe extenderse a todo nuevo endpoint.

## Hallazgos P1 despues de Macro Sprint 2

- Filtros globales: mitigado en overview, finanzas, capacidad/ocupacion, calidad e insights mediante `lib/analytics/global-filters.ts`; queda pendiente aplicar el contrato a exportaciones y pantallas fuera de la macrofase.
- BI: existe primera capa semantica DEMO con formulas, granularidad, filtros y bloqueo; queda pendiente convertirla en servicio server-side con lineage real.
- Finanzas: las metricas DEMO reconciliadas separan facturacion neta, cobros, cuentas por cobrar, costo directo y margen de contribucion. Queda pendiente conectar facturacion/importaciones reales.
- Importaciones: Sprint 3 mitiga lectura, validacion, staging, publish, rollback, audit log, lineage e idempotencia para carga masiva.
- Campos requeridos: hay validacion funcional en algunos formularios, pero falta consistencia en required/aria-required y contratos de datos.
- Jerarquia organizacional: hay modelos, migraciones y datos DEMO administrados, pero falta demostrar persistencia real y enforcement integral de operaciones por area/sucursal.
- Calidad de datos: mitigado para insights DEMO e importaciones Sprint 3; queda pendiente conectarlo a dashboards sobre datos reales publicados.

## Hallazgos P2 vigentes

- Responsive: varios dashboards usan tablas con anchos minimos grandes y pueden generar overflow en mobile.
- Integraciones: existe framework y endpoints de conectores; faltan credenciales reales y pruebas contra sistemas externos.
- Ruta `/protected/apis`: resuelta localmente como alias explicito de integraciones/conectores.
- Error React minified #418: no se confirma en smoke local Sprint 4; requiere verificacion DOM/Console en deployment.
- Capacidad: fisioterapia, laboratorio e imagenes ya tienen semantica separada en capa DEMO; falta validarla contra fuentes operativas reales y capacidad por equipo.

## Archivos criticos afectados por los hallazgos

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
- `app/api/imports/*`
- `app/api/connectors/*`
- `lib/auth/demo-admin.ts`
- `lib/auth/local-session.ts`
- `app/api/users/invite/route.ts`
- `lib/server/user-invitations.ts`
- `lib/analytics/global-filters.ts`
- `lib/analytics/semantic-bi.ts`
- `lib/analytics/demo-dashboard.ts`
- `lib/analytics/financial-health.ts`
- `lib/analytics/capacity-occupancy.ts`
- `lib/analytics/insights.ts`
- `lib/data-ingestion/*`
- `lib/tenant/delegation-policy.ts`
- `lib/tenant/demo-context.ts`
- `lib/tenant/managed-branch-records.ts`
- `tests/macro-sprint2-bi-integrity.test.mjs`
- `tests/macro-sprint3-ingestion.test.mjs`
- `supabase/migrations/*`
- `supabase/seed.sql`

## Discrepancias entre auditoria y codigo actual

- Credenciales DEMO expuestas: no confirmado en fuente actual. El login ya no muestra password demo prellenado; revisar runtime y variables sigue siendo obligatorio.
- Tabs de importaciones: mitigado. Carga masiva usa API server-side para upload, validacion, preview, publish, rollback y lineage.
- Filtro de fecha: mitigado en capa semantica DEMO y dashboards principales; sigue pendiente para exportaciones y datasets reales.
- Filtro de sucursal: mitigado cuando existe fuente DEMO cargada; sucursales sin fuente muestran no-data y no usan consolidado regional.
- Contexto: mitigado entre URL/header/pagina de seleccion mediante contrato unico.
- Finanzas: mitigado en datos DEMO reconciliados; sigue pendiente con fuentes reales de facturacion/cobros.
- Capacidad: parcialmente resuelto. Laboratorio ya no reutiliza ocupacion clinica; Imagenes conserva metricas pendientes cuando faltan RIS/PACS/capacidad por equipo.
- `/protected/imagenes`: existe como modulo de imagenes; la inconsistencia exacta de auditoria debe revalidarse en UI.
- `/protected/apis`: resuelta localmente como alias de Conectores; verificar en deployment.
- Operational areas: existen derivadas en frontend y migraciones, pero falta confirmar poblacion real en DB y enforcement completo.
- Acceso local para revision ejecutiva: la auditoria inicial no contemplaba el endurecimiento posterior de login. El codigo actual incluye `/login` y `/api/auth/demo-session` para crear sesion DEMO server-side solamente en runtime demo local; preview/staging/production quedan bloqueados.

## Dependencias entre sprints

- Sprint 0 desbloquea todos los demas porque define ambientes, baseline, validacion y politica de datos DEMO.
- Sprint 1 debe ocurrir antes de exponer rutas, importaciones, invitaciones o conectores a usuarios reales.
- Sprint 2 depende de contratos KPI y de contexto global confiable; Macro Sprint 2 entrega la primera version DEMO para finanzas y dashboards ejecutivos.
- Sprint 3 depende de reglas de calidad/lineage del Sprint 2 y entrega importaciones server-side, conectores y lineage.
- Macro Sprint 4 depende de RBAC del Sprint 1, contratos BI del Sprint 2 e ingestion/conectores del Sprint 3.
- La jerarquia organizacional real DB sigue dependiendo de migraciones remotas, poblacion de areas y asignaciones.
- Integraciones reales dependen de credenciales server-side y pruebas contra sistemas externos.
- Production readiness final depende de cierre de blockers manuales y evidencia en deployment autorizado.

## Roadmap

### Sprint 0 - Baseline y ambientes

Objetivo: congelar estado actual, documentar arquitectura, separar modos de ejecucion y establecer gates.

Alcance:
- Inventario de rutas, APIs, datos DEMO, variables de entorno y dependencias.
- Definir matriz de ambientes: local demo, staging, production.
- Crear checklist de validacion y politica de no despliegue sin autorizacion.
- Confirmar que no hay secretos en source, logs ni bundles.

Criterios de salida:
- Documentacion actualizada.
- `AGENTS.md` actualizado.
- `lint`, `typecheck`, `tests` y `build` definidos como obligatorios para cierre de sprint.
- Commit independiente de Sprint 0.

### Sprint 1 - Security y RBAC

Objetivo: implementar autorizacion server-side por rol y alcance.

Alcance:
- AuthorizationService server-side para identidad y permisos.
- Guards server-side para rutas protegidas y URL directa.
- Autorizacion en APIs sensibles, empezando por invitaciones y AnaliA.
- Aislamiento server-side de selector `Rol DEMO`.
- Actor de invitacion derivado de sesion server-side.
- Validacion de rol y alcance pais/empresa/area/sucursal para acciones P0.
- Migracion RLS nueva para endurecer area/sucursal y auditoria de cambios sensibles.

Criterios de salida:
- Viewer no puede entrar por URL directa a modulos no permitidos.
- Invitaciones no aceptan actor/scope desde cliente como fuente de verdad.
- Pruebas de RBAC por rol y alcance.
- `lint`, `typecheck`, `tests` y `build` deben pasar antes del commit.

### Sprint 2 - Integridad BI y filtros

Objetivo: hacer que filtros y KPIs sean consistentes, trazables y bloqueables si faltan datos.

Alcance:
- Servicio semantico de contexto y filtros.
- Contratos KPI por formula, granularidad, required fields y lineage.
- Recalculo real por pais, empresa, area, sucursal y periodo.
- Bloqueos visibles cuando no hay datos suficientes.
- Reconciliacion financiera DEMO por canal, forma de pago, margen de contribucion, moneda y periodo.
- Semantica separada para ocupacion clinica, utilizacion tecnica y capacidad pendiente por equipo.
- Quality score/quality level con bloqueo de conclusiones ejecutivas.

Criterios de salida:
- Overview, finanzas y dashboards principales reaccionan igual al contexto.
- No se muestran totales stale ante filtros incompatibles.
- Invariantes BI cubiertas por `tests/macro-sprint2-bi-integrity.test.mjs`.

Estado Macro Sprint 2:
- Implementado sobre datasets DEMO tipados; no incluye carga XLSX/CSV completa, CRM, facturacion API, webscraping, responsive profundo, rediseno visual premium ni deployment.

### Sprint 3 - Importaciones y calidad de datos

Objetivo: convertir importaciones de demo UI a pipeline confiable.

Alcance:
- Upload server-side para CSV/XLSX.
- Validacion de extension, tamano, columnas, tipos, formulas peligrosas y duplicados.
- Staging, preview, publish, rollback y audit log.
- Data quality scoring y lineage por archivo/import.
- Framework de conectores con adapters DEMO, conectores reales deshabilitados sin credenciales y fallback manual.
- Plantillas versionadas para las fuentes operativas y financieras raiz.

Criterios de salida:
- Ningun dato importado llega a BI sin validacion y trazabilidad.
- Carga duplicada se bloquea por idempotencia.
- Gerente de sucursal no puede cargar otra sucursal.
- Rollback preserva RAW y revierte filas publicadas.

Estado Macro Sprint 3:
- Implementado con `lib/data-ingestion/*`, `/api/imports/*`, `/api/connectors/*`, migracion nueva y `tests/macro-sprint3-ingestion.test.mjs`.
- Pendiente de credenciales: LIS/API Laboratorio, RIS/PACS Imagenes, portal Fisioterapia y CRM/facturacion reales.
- No incluye redisenio visual premium, performance tuning profundo, produccion real, despliegue final, IA generativa ni forecasting.

### Macro Sprint 4 - UX premium, Executive Command Center, Performance, QA y Production Readiness

Objetivo: convertir la experiencia demo ejecutiva en una plataforma coherente, rapida, responsive y presentable ante Direccion sin abrir nuevas funcionalidades grandes.

Alcance:
- Executive Command Center en `/protected/overview`.
- Tarjetas principales con valor, meta cuando aplica, tendencia, estado, formula y fuente.
- Seccion “Requiere su atencion” priorizada por impacto, margen, capacidad y calidad.
- Vista ejecutiva de gerentes con jerarquia y componentes separados.
- Semantica especifica para Fisioterapia, Laboratorio e Imagenes.
- UX de importaciones y conectores sobre la logica Sprint 3.
- Responsive desktop/laptop/tablet/mobile para pantallas criticas.
- Ruta `/protected/apis` resuelta.
- Documentacion: design system, checklist readiness y guion ejecutivo.

Criterios de salida:
- Rutas principales responden en smoke local.
- No hay 404 ambiguo en `/protected/apis`.
- No se detecta password prellenado en HTML protegido del smoke local.
- Lint, typecheck, tests, build y `git diff --check` pasan.

Estado Macro Sprint 4:
- Implementado localmente. No despliega produccion ni declara Production Ready por blockers manuales externos, incluyendo migraciones remotas, verificacion DOM y credenciales reales de conectores.

### Backlog posterior - Jerarquia organizacional real

Objetivo: operar la jerarquia real Gerente de Operaciones -> Area -> Sucursal -> Operativo con DB remota y asignaciones persistentes.

Alcance pendiente:
- CRUD server-side para areas, sucursales y asignaciones.
- Poblacion real de `operational_areas` y `manager_assignments`.
- Politicas por pais/empresa/area/sucursal en entorno remoto.
- Pruebas de creacion y administracion delegada.

### Sprint 5 - Integraciones

Objetivo: habilitar conectores reales con seguridad, auditoria y modo DEMO separado.

Alcance:
- Runtime server-side para credenciales.
- APIs oficiales cuando existan.
- Conectores disabled por defecto sin credenciales.
- Demo adapters claramente marcados.

Criterios de salida:
- Ninguna credencial vive en cliente.
- Conectores fallan cerrado cuando falta configuracion o cambia estructura externa.

### Sprint 6 - Frontend, UX y responsive

Objetivo: estabilizar experiencia mobile/desktop y estados de producto.

Alcance:
- Revisar overflow, truncamiento, tablas, formularios y navegacion.
- Estados vacios, loading, error, no-data y no-permission.
- Revalidacion visual por rutas criticas.

Criterios de salida:
- Pantallas criticas sin overlap ni overflow incoherente.

### Sprint 7 - QA y Production Readiness

Objetivo: cerrar gates de lanzamiento.

Alcance:
- Pruebas E2E por rol y alcance.
- Regression suite BI, importaciones, finanzas y seguridad.
- Build production, smoke test, rollback plan y runbooks.

Criterios de salida:
- P0 cerrado, P1 aceptado o cerrado, P2 documentado.
- Evidencia de lint, typecheck, tests y build.

### Sprint 8 - Executive Demo

Objetivo: preparar demo ejecutiva sin comprometer seguridad ni datos reales.

Alcance:
- Dataset DEMO aislado.
- Narrativa ejecutiva con KPIs trazables.
- Flujos principales: filtros, finanzas, importaciones, jerarquia e insights.

Criterios de salida:
- Demo reproducible, marcada como DEMO y sin mezcla con produccion.
