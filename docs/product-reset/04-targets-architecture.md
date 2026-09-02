# 04 - Targets Architecture

Fecha: 2026-08-07

## Objetivo

Transformar "Metas y avances" en una funcionalidad real.

Una meta no debe ser una sugerencia visual. Debe ser un registro aprobado, versionado y trazable que se compara contra KPIs reales.

## Alcance de metas

Cada meta debe configurarse por:

- periodo
- pais
- empresa
- sucursal
- KPI

Campos adicionales recomendados:

- organization_id
- operational_area_id
- business_line
- unit
- target_value
- threshold_green
- threshold_yellow
- threshold_red
- approved_by
- approved_at
- status
- version
- is_demo

## KPIs con metas iniciales

- facturacion
- ocupacion
- margen
- sesiones
- pruebas
- estudios
- no-show
- TAT

## Pantalla de metas propuesta

La pantalla debe permitir:

- seleccionar periodo
- seleccionar pais
- seleccionar empresa
- seleccionar sucursal
- seleccionar KPI
- ingresar meta
- definir unidad
- definir umbrales de estado
- aprobar meta
- ver historial de versiones
- importar metas desde plantilla
- comparar meta contra real publicado

## Salida obligatoria en dashboards

Todo dashboard que muestre una meta debe mostrar:

| Campo | Descripcion |
| --- | --- |
| META | Valor aprobado para el periodo |
| REAL | Resultado calculado desde cierre publicado |
| VARIACION | Real - meta |
| CUMPLIMIENTO | Real / meta |
| ESTADO | Cumplido, En riesgo, Incumplido, Sin meta |

## Estados de meta

| Estado | Uso |
| --- | --- |
| Borrador | Meta cargada pero no aprobada |
| Aprobada | Puede alimentar dashboards |
| Reemplazada | Fue sustituida por nueva version |
| Cerrada | Periodo finalizado |
| Anulada | No se usa para calculo |

## Permisos recomendados

| Rol | Puede ver | Puede crear | Puede aprobar |
| --- | --- | --- | --- |
| CEO | Todas | Si | Si |
| Gerente Operaciones | Todas dentro de alcance | Si | Si, si politica lo permite |
| Gerente Area | Area asignada | Puede proponer | No o aprobacion limitada |
| Gerente Sucursal | Sucursal asignada | No, salvo propuesta local | No |

## Flujo de metas

1. Operaciones/CEO define metas del periodo.
2. Sistema valida que KPI exista.
3. Sistema valida scope.
4. Meta queda en borrador o aprobada.
5. Cuando se publica cierre mensual, el KPI se calcula.
6. El sistema une KPI real con meta aprobada.
7. Dashboards muestran meta, real, variacion, cumplimiento y estado.
8. Insights usan la brecha para explicar que paso y que accion tomar.

## Codigo actual reutilizable

- `components/goals-advances-dashboard.tsx`
- `lib/analytics/business-control-center.ts`
- `lib/data-ingestion/templates.ts` con dataset `targets`
- `docs/kpi-contracts.md`
- `lib/analytics/kpi-registry.ts`

## Problema actual

La pantalla actual funciona como sugerencias DEMO de metas, avances, bonos y ROI simulado. Debe evolucionar a:

- configuracion real de metas
- aprobacion
- versionado
- comparacion contra resultados publicados
- visualizacion por rol

## Persistencia propuesta

Tablas conceptuales:

- `kpi_targets`
- `kpi_target_versions`
- `kpi_target_audit_events`
- `kpi_target_import_batches`

Clave unica recomendada:

```text
period + country_id + company_id + branch_id + kpi_id + version
```

## Reglas

- No calcular cumplimiento si no hay meta aprobada.
- No mostrar cumplimiento si el KPI real no esta publicado.
- No mezclar meta sugerida con meta aprobada.
- No reemplazar una meta historica sin version nueva.
- No permitir metas fuera del alcance del usuario.
