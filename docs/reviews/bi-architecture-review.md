# BI Architecture Review

Fecha: 2026-08-07

## Veredicto

Estado: PASS para demo ejecutiva. CONDITIONAL para produccion.

La arquitectura BI actual ya separa contratos KPI, filtros globales, datasets de unidades de negocio, dashboards ejecutivos y capa semantica. La brecha principal es persistencia real y versionada de hechos BI publicados.

## Evidencia Revisada

- `lib/analytics/semantic-bi.ts`
- `lib/analytics/global-filters.ts`
- `lib/analytics/kpi-registry.ts`
- `lib/analytics/financial-health.ts`
- `lib/data-ingestion/platform.ts`
- `docs/architecture-current.md`

## Hallazgos

| ID | Prioridad | Hallazgo | Recomendacion |
| --- | --- | --- | --- |
| BI-01 | P1 | La capa BI usa datos DEMO y resultados publicados en memoria, no hechos persistidos en PostgreSQL para produccion. | Crear tablas/versiones de hechos BI publicados y adaptar dashboards a lectura server-side real. |
| BI-02 | P1 | Los filtros globales existen, pero su aplicacion completa depende de que cada dataset respete el contrato. | Mantener tests por dashboard que prueben pais, empresa, linea, area, sucursal y periodo. |
| BI-03 | P1 | La semantica ejecutiva diferencia DEMO, pero aun puede dar sensacion de dato real si no se controla el contexto visual. | Mantener marca DEMO visible en cada pantalla y exportacion. |
| BI-04 | P2 | No hay estrategia explicita de snapshot mensual aprobado para evitar cambios retroactivos accidentales. | Implementar snapshots versionados con estado draft, approved, superseded. |

## Gate

BI Gate: PASS para demo. No Production Ready hasta persistir hechos publicados, snapshots y linaje en base real.
