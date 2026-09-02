# 08 - Existing Modules Mapping

Fecha: 2026-08-07

## Clasificaciones

- KEEP: conservar casi como esta.
- REWORK: conservar, pero reenfocar al core del producto.
- MERGE: combinar con otra experiencia para reducir ruido.
- HIDE: mantener en codigo, pero ocultar de navegacion principal.
- DELETE-LATER: no borrar ahora; candidato a retirar cuando el nuevo flujo este estable.

## Mapa de modulos actuales

| Modulo actual | Ruta/componente | Clasificacion | Motivo |
| --- | --- | --- | --- |
| Resumen ejecutivo | `/protected/overview`, `ExecutiveDashboard` | REWORK | Debe ser home CEO alimentada por cierres publicados, metas e insights. |
| Operacion ejecutiva | `/protected/operacion`, `ExecutiveOperationDashboard` | REWORK | Debe ser home de Gerente de Operaciones con areas, cierres, calidad y metas. |
| Salud financiera | `/protected/finanzas`, `FinancialHealthDashboard` | REWORK | Mantener para CEO, pero solo con datos financieros certificados desde cierres/fuentes. |
| Citas por negocio | `/protected/citas`, `PatientFlowDemandDashboard` | MERGE | Debe alimentar Resultados/Operacion por linea; no ser modulo principal aislado. |
| Capacidad y ocupacion | `/protected/capacidad`, `CapacityOccupancyDashboard` | MERGE | Debe integrarse en resultados por linea y vista operativa. |
| Sucursales | `/protected/sucursales`, `BranchNetworkDashboard` | REWORK | Debe ser vista por rol: mi sucursal, sucursales del area o red ejecutiva. |
| Gerentes y bonos | `/protected/gerentes`, `ManagerBonusDashboard` via `OperationsModule` | REWORK | Reenfocar a desempeno de gerentes y cumplimiento; bonos pueden quedar secundarios. |
| Profesionales | `/protected/profesionales`, `ProfessionalPerformanceDashboard` | HIDE | Util para diagnostico; no core inicial del reset. |
| Servicios | `/protected/servicios`, `ServicePortfolioDashboard` | HIDE | Util como drilldown; no core inicial. |
| Fisioterapia | `/protected/fisioterapia`, `PhysiotherapyPresentationDashboard` | MERGE | Convertir en resultados de Fisioterapia derivados del cierre mensual. |
| Laboratorio | `/protected/laboratorio`, `LaboratoryPresentationDashboard` | MERGE | Convertir en resultados de Laboratorio derivados del cierre mensual. |
| Imagenes | `/protected/imagenes`, `ImagingPresentationDashboard` | MERGE | Convertir en resultados de Imagenes derivados del cierre mensual. |
| Insights | `/protected/insights`, `InsightsIntelligenceDashboard` | REWORK | Debe generar insights desde real vs meta vs anterior vs benchmark. |
| Importaciones | `/protected/importaciones`, `ImportOperationsDashboard` | MERGE | Mantener para admin/datos; no debe ser el flujo principal del gerente. |
| Formulario mensual | `/protected/plantillas`, `ManualMonthlyEntryDashboard` | REWORK | Debe convertirse en tres formularios reales por linea. Es el core del producto. |
| Conectores | `/protected/conectores`, `CrmConnectorsDashboard` | HIDE | Soporte tecnico/operativo; no navegacion principal para roles de cierre. |
| APIs e integraciones | `/protected/apis`, `CrmConnectorsDashboard` | MERGE | Alias de conectores; mantener temporal, unir bajo Integraciones. |
| Calidad de datos | `/protected/calidad-datos`, `DataQualityAnaliaDashboard` | REWORK | Debe mostrar calidad de cierres, validaciones y fuentes por rol. |
| Metas y avances | `/protected/metas`, `GoalsAdvancesDashboard` | REWORK | Debe transformarse en configuracion real de metas por periodo/pais/empresa/sucursal/KPI. |
| Usuarios y permisos | `/protected/usuarios-permisos`, `BusinessModuleDashboard` | KEEP | Soporte de administracion; fuera del core mensual pero necesario. |
| Mi cuenta | `/protected/configuracion` | KEEP | Necesario para todo rol. |
| Auditoria | `/protected/auditoria` | KEEP | Necesario para trazabilidad y control. |

## Componentes transversales

| Componente/lib | Clasificacion | Uso futuro |
| --- | --- | --- |
| `components/role-workspace-home.tsx` | REWORK | Home por rol segun estado del cierre y tareas. |
| `components/app-sidebar.tsx` | REWORK | Navegacion por tareas, no por modulos tecnicos. |
| `components/context-selection-form.tsx` | KEEP | Contexto para roles con alcance multiple. |
| `components/tenant-context-header.tsx` | KEEP | Mostrar alcance activo y evitar confusion. |
| `lib/security/authorization-policy.ts` | KEEP | Debe seguir siendo base server-side de acceso. |
| `lib/tenant/delegation-policy.ts` | KEEP | Base para jerarquia y permisos. |
| `lib/data-ingestion/platform.ts` | REWORK | Reutilizar publish/rollback/lineage para cierres mensuales. |
| `lib/data-ingestion/templates.ts` | REWORK | Base para formularios por linea y plantillas Excel. |
| `lib/analytics/kpi-registry.ts` | REWORK | Debe alinearse a KPIs derivados desde cierres. |
| `lib/analytics/semantic-bi.ts` | REWORK | Debe leer hechos publicados, no datasets DEMO. |
| `lib/analytics/insights.ts` | REWORK | Debe persistir insights basados en evidencia real. |
| `components/hero.tsx` | DELETE-LATER | No corresponde al producto interno si ya existe login/shell. |
| `components/tutorial/*` | DELETE-LATER | Herencia de scaffold; retirar cuando no se use. |
| `components/supabase-logo.tsx`, `components/next-logo.tsx` | DELETE-LATER | Branding de scaffold; no producto Analiza. |

## Reglas

- No borrar nada todavia.
- Primero construir el nuevo flujo en paralelo.
- Luego ocultar modulos que distraen.
- Solo despues de estabilizar el reset se decide que eliminar.

## Prioridad de rework

1. Formulario mensual.
2. Metas y avances.
3. Insights.
4. Resumen por rol.
5. Sucursales/gerentes.
6. Finanzas/operacion como vistas ejecutivas derivadas.
