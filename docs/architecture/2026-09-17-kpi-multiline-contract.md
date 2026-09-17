# Contrato KPI y alcance multilínea

Fecha: 2026-09-17

## Decisión

La unidad mínima de lectura oficial es organización + sucursal + línea de
negocio + período + versión publicada + código KPI. `profiles.default_branch_id`
y el primer `user_roles` activo son preferencias iniciales; la autorización
se evalúa contra todos los grants activos de `user_roles` y
`manager_assignments`.

El encabezado ofrece cada par sucursal + línea autorizado y un consolidado
cuando hay más de una línea. Una combinación cruzada que no existe en los
grants queda fuera tanto de los catálogos como de la lectura server-side.

## Semántica KPI

`lib/analytics/official-kpi-contracts.ts` es la tabla autoritativa para las
tarjetas oficiales. La selección usa códigos, línea aplicable, unidad, escala y
agregación; no usa coincidencias por nombre ni el orden de PostgREST.

- `reported_revenue` es facturación. Para cierres históricos anteriores a ese
  código se permite únicamente la base `denominator` de
  `estimated_contribution_margin_pct` con su fórmula exacta aprobada.
- `estimated_contribution_margin` es un importe USD y nunca un porcentaje.
- `estimated_contribution_margin_pct` es porcentaje en puntos porcentuales.
- `revenue_target_achievement` es cumplimiento y no es facturación.
- Márgenes consolidados suman numeradores y denominadores antes de dividir.
- Volúmenes con unidades distintas no se suman.
- Una base ausente vuelve no calculable el consolidado; no se sustituye por
  cero. Un cero numérico real se conserva.

La versión oficial se obtiene de filas `published` y, si existe una anomalía
con más de una fila publicada en el mismo grano, se elige de forma
determinista por versión, fecha de publicación e identificador. Las versiones
anteriores del mismo período no se agregan.

## Presentación

Los porcentajes usan un formateador central con exactamente un decimal. La
escala es parte del contrato (`fraction`, `percentage_points` o diferencia en
puntos porcentuales); el valor no se multiplica según su magnitud.

## Compatibilidad

La decisión no reescribe cierres ni KPI históricos. Los cierres nuevos
persisten `reported_revenue`; los históricos conservan trazabilidad mediante
la base contractual ya almacenada. Si esa base no existe, la interfaz muestra
`Sin dato`.
