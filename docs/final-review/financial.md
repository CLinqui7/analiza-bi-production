# Financial Analytics Final Review

Fecha: 2026-08-10

## Gate

Estado: CONDITIONAL.

## Hallazgos

| Severidad | Hallazgo | Impacto | Referencia |
| --- | --- | --- | --- |
| P1 | Finanzas ejecutivas aun pueden usar datos DEMO reconciliados fuera del Closing Engine. | Un CFO podria ver totales distintos entre overview financiero y cierres publicados. | `lib/analytics/financial-health.ts`, `lib/analytics/semantic-bi.ts` |
| P1 | Metas se guardan como activas/aprobadas en la misma accion. | Falta ciclo formal de aprobacion y cierre historico de metas. | `kpi_targets`, `upsert*Target` |
| P2 | Margen de contribucion esta correctamente separado de utilidad neta, pero requiere costos completos por linea para produccion. | Riesgo de sobreinterpretar margen si falta costo directo confiable. | `docs/kpi-contracts.md` |

## Recomendacion

No presentar finanzas como reales hasta reconciliar contra fuentes oficiales, costos aprobados, moneda y periodo. En demo, mantener etiquetas DEMO visibles.

