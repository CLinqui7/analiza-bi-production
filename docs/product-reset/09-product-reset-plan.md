# 09 - Product Reset Plan

Fecha: 2026-08-07

## Objetivo

Reorganizar ANALIZA INTELLIGENCE alrededor del flujo:

cierre mensual -> validacion -> KPIs -> metas -> insights -> dashboards por rol.

No se debe borrar funcionalidad existente durante el reset. La transicion debe ser incremental.

## FASE 1: Formularios

Objetivo:

Crear formularios mensuales separados para Fisioterapia, Laboratorio e Imagenes.

Codigo existente reutilizable:

- `components/manual-monthly-entry-dashboard.tsx`
- `lib/analytics/import-operations.ts`
- `lib/data-ingestion/templates.ts`
- `lib/data-ingestion/platform.ts`

Codigo que debe cambiar:

- Separar el formulario generico en formularios por linea.
- Crear rutas/tareas de cierre:
  - Nuevo cierre mensual
  - Historial de cierres
  - Ver cierre
  - Editar borrador
  - Validar/publicar

Base de datos:

- `monthly_closures`
- `monthly_closure_values`
- `monthly_closure_validation_results`
- `monthly_closure_audit_events`

Riesgos:

- Copiar la plantilla Excel sin entender formulas.
- Mezclar datos DEMO con datos reales.
- Permitir cierres fuera del alcance del gerente.

Dependencias:

- Catalogo real de sucursales, empresas, areas y gerentes.
- Definicion final de campos por linea.

## FASE 2: KPIs

Objetivo:

Calcular KPIs derivados desde cierres publicados.

Codigo existente reutilizable:

- `docs/kpi-contracts.md`
- `lib/analytics/kpi-registry.ts`
- `lib/analytics/semantic-bi.ts`
- `tests/macro-sprint2-bi-integrity.test.mjs`

Codigo que debe cambiar:

- Crear servicio de calculo de KPIs por linea.
- Hacer que dashboards lean resultados desde un contrato unico.
- Bloquear KPIs si faltan datos esenciales.

Base de datos:

- `kpi_definitions`
- `kpi_results`
- `kpi_result_lineage`

Riesgos:

- Mostrar resultados con cierres no publicados.
- Calcular margen sin costos completos.
- Calcular ocupacion sin denominador de capacidad.

Dependencias:

- FASE 1 completada.
- Contratos KPI aprobados por negocio.

## FASE 3: Metas

Objetivo:

Convertir metas en configuracion real por periodo, pais, empresa, sucursal y KPI.

Codigo existente reutilizable:

- `components/goals-advances-dashboard.tsx`
- `lib/analytics/business-control-center.ts`
- dataset `targets` en `lib/data-ingestion/templates.ts`

Codigo que debe cambiar:

- Crear UI real de configuracion/aprobacion de metas.
- Separar meta sugerida de meta aprobada.
- Mostrar meta, real, variacion, cumplimiento y estado en dashboards.

Base de datos:

- `kpi_targets`
- `kpi_target_versions`
- `kpi_target_audit_events`

Riesgos:

- Metas duplicadas por mismo periodo/sucursal/KPI.
- Metas sin unidad.
- Cambiar metas historicas sin versionado.

Dependencias:

- KPIs definidos y estables.
- Permisos de aprobacion por rol.

## FASE 4: Insights

Objetivo:

Generar insights especificos desde evidencia real.

Codigo existente reutilizable:

- `lib/analytics/insights.ts`
- `components/insights-intelligence-dashboard.tsx`
- `lib/analytics/dashboard-validation-agent.ts`

Codigo que debe cambiar:

- Crear servicio server-side de generacion de insights.
- Persistir insights y acciones.
- Asociar insight con cierre, KPI, meta y comparadores.

Base de datos:

- `insights`
- `insight_evidence`
- `insight_actions`
- `insight_audit_events`

Riesgos:

- Generar insights genericos.
- Afirmar causalidad sin evidencia.
- Mostrar insights fuera del alcance del rol.

Dependencias:

- KPIs calculados.
- Metas aprobadas.
- Periodo anterior o benchmark permitido.

## FASE 5: Dashboards por rol

Objetivo:

Reorganizar la experiencia segun tareas y decisiones de cada rol.

Codigo existente reutilizable:

- `components/role-workspace-home.tsx`
- `components/app-sidebar.tsx`
- `lib/navigation.ts`
- dashboards existentes por modulo

Codigo que debe cambiar:

- Redisenar navegacion por rol.
- Crear home por rol.
- Convertir modulos actuales en drilldowns o vistas derivadas.
- Ocultar modulos tecnicos que no son parte del flujo principal.

Base de datos:

- No requiere tablas nuevas si Fases 1-4 estan listas.
- Puede requerir vistas/materialized views para performance.

Riesgos:

- Romper enlaces existentes.
- Ocultar funcionalidad necesaria para admin.
- Mezclar responsabilidades entre roles.

Dependencias:

- Cierres, KPIs, metas e insights funcionales.
- Matriz final de permisos por rol.

## FASE 6: UX/BI review

Objetivo:

Validar que el producto se entiende, que los datos cuadran y que cada rol sabe que hacer.

Codigo existente reutilizable:

- `docs/reviews/*`
- `docs/production-readiness-checklist.md`
- tests existentes de BI, RBAC, importaciones y readiness

Codigo que debe cambiar:

- Ajustes de copy, navegacion, estados vacios, responsive y visualizacion.
- Smoke visual por rol.
- Tests E2E del flujo completo.

Base de datos:

- Dataset seed de prueba por linea.
- Cierres mensuales de prueba por rol y periodo.

Riesgos:

- Que la demo se vea bien pero el flujo real siga confuso.
- Que dashboards no expliquen origen del dato.
- Que responsive falle en pantallas densas.

Dependencias:

- Fases 1-5 implementadas.
- Validacion con usuarios internos.

## Secuencia recomendada

1. Congelar modulos actuales como inventario.
2. Construir nuevo flujo de cierre mensual.
3. Conectar cierres publicados a KPIs.
4. Conectar KPIs a metas.
5. Conectar metas/KPIs a insights.
6. Redisenar navegacion por rol.
7. Ocultar modulos secundarios.
8. Validar con demo ejecutiva.
9. Solo despues decidir que se elimina.

## Como funciona Analiza Intelligence en menos de 60 segundos

Analiza Intelligence funciona como un sistema de cierre mensual para dirigir la operacion. Cada gerente de sucursal entra, completa el formulario web de su linea de negocio, ya sea Fisioterapia, Laboratorio o Imagenes. El sistema valida que los datos esten completos y sean consistentes. Cuando el cierre se publica, Analiza calcula los KPIs, los compara contra las metas del periodo y genera insights concretos: que paso, donde paso, cuanto impacto tuvo y que accion tomar. El gerente de sucursal ve su resultado, el gerente de area consolida sus sucursales, operaciones ve todas las areas y el CEO recibe una vision ejecutiva de desempeno, riesgos y oportunidades.

## Decision final del reset

El core no son los dashboards.

El core es el cierre mensual validado que produce KPIs, metas, insights y decisiones.
