# Operations Analytics Final Review

Fecha: 2026-08-10

## Gate

Estado: PASS local para flujo de cierres por linea.

## Hallazgos

| Severidad | Hallazgo | Impacto | Referencia |
| --- | --- | --- | --- |
| P1 | Fisioterapia bloquea/usa inputs de ocupacion y no-show que negocio habia marcado como propuestos. | Puede hacer pesado el MVP de gerente sucursal. | `components/physiotherapy-vertical-dashboard.tsx` |
| P2 | Laboratorio e Imagenes manejan mejor campos propuestos, pero permiten KPIs/metas si se llenan. | Se necesita aprobacion por KPI operativo antes de usarlos para meta. | `lib/analytics/laboratory-closures.ts`, `lib/analytics/imaging-closures.ts` |
| P2 | Wizards de Lab e Imagenes son densos para mobile. | Puede reducir adopcion de gerentes de sucursal. | `components/laboratory-vertical-dashboard.tsx`, `components/imaging-vertical-dashboard.tsx` |

## Recomendacion

Mantener Fisioterapia como flujo operativo base, pero simplificar campos propuestos antes de mas rollout y aprobar denominadores por linea.

