# Data Science Final Review

Fecha: 2026-08-10

## Gate

Estado: PASS para demo ejecutiva local con datos claramente marcados. CONDITIONAL para produccion.

## Hallazgos

| Severidad | Hallazgo | Impacto | Referencia |
| --- | --- | --- | --- |
| P1 | Fisioterapia captura campos que el discovery marco como propuestos: no-show, horas disponibles, horas agendadas y horas atendidas. | Puede elevar KPIs de ocupacion/no-show antes de aprobacion formal de negocio. | `lib/analytics/physiotherapy-closures.ts`, `docs/forms/BUSINESS_REVIEW.md` |
| P1 | La comparacion ejecutiva consolidada aun usa capa DEMO paralela para parte del overview. | Puede mezclar lectura demo con cierres publicados si no se presenta con contexto. | `components/executive-dashboard.tsx`, `lib/analytics/demo-dashboard.ts` |
| P1 | Insights verticales son deterministas, pero la evidencia persistida no siempre guarda valor real, meta, periodo anterior, benchmark y confianza como campos separados. | Auditoria ejecutiva incompleta ante preguntas de causalidad. | `generated_insights`, `lib/analytics/*-closures.ts` |
| P2 | Calidad de datos pondera errores y warnings de forma simple. | No distingue criticidad financiera, fuente ni KPI afectado. | `calculateQualityScore` en las tres verticales |

## Recomendacion

Antes de operar con datos reales, separar `campo aprobado` vs `campo propuesto`, impedir metas para KPIs no aprobados y persistir evidencia numerica completa por insight.

