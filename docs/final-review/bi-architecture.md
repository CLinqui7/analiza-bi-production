# BI Architecture Final Review

Fecha: 2026-08-10

## Gate

Estado: PASS local para verticales. CONDITIONAL para consolidado ejecutivo.

## Hallazgos

| Severidad | Hallazgo | Impacto | Referencia |
| --- | --- | --- | --- |
| P1 | Las tres verticales usan Closing Engine y APIs propias, pero el CEO overview mantiene una capa comparativa DEMO. | No hay una unica verdad BI para CEO/Finanzas/Operacion consolidada. | `components/executive-dashboard.tsx` |
| P1 | Metas verticales existen, pero el consolidado de metas aun puede caer en sugerencias DEMO/ROI local. | Gobierno de metas no es uniforme. | `components/goals-advances-dashboard.tsx` |
| P1 | Insights verticales leen cierres publicados por linea, pero el modulo principal de Insights conserva sandbox DEMO consolidado. | Dos experiencias de insights pueden comunicar niveles de confianza distintos. | `components/insights-intelligence-dashboard.tsx` |
| P2 | El router vertical infiere linea desde query string o catalogo demo de companias. | Con IDs reales no seed, un usuario podria caer visualmente en Fisioterapia. | `components/monthly-closure-router.tsx` |

## Recomendacion

Crear un servicio server-side consolidado que lea `monthly_closings`, `closing_kpi_results`, `kpi_targets` y `generated_insights` para overview, finanzas, metas e insights.

