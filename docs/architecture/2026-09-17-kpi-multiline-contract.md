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
- `lab_medical_exam_report_sales` es la venta agregada extraída del Excel de
  exámenes médicos. Se presenta como `Venta en archivos`, con cobertura
  explícita, y nunca sustituye silenciosamente la facturación total porque el
  reporte puede representar sólo un subconjunto del cierre.
- Los códigos de validación de `kpi_result_lineage` y el resumen del adjunto
  viajan en la misma consulta embebida de resultados. Una advertencia
  informativa mantiene cobertura parcial; una evidencia truncada, bloqueada,
  sin sucursal reconciliada o fuera del período se excluye del total
  documental. La exclusión queda visible y no añade un viaje de red.
- Márgenes consolidados suman numeradores y denominadores antes de dividir.
- Volúmenes con unidades distintas no se suman.
- Una base ausente vuelve no calculable el consolidado; no se sustituye por
  cero. Un cero numérico real se conserva.
- La cobertura parcial se propaga entre niveles de agregación; una suma de
  sucursales no puede convertir cierres documentales faltantes en cobertura
  completa.

La versión oficial se obtiene de filas `published` y, si existe una anomalía
con más de una fila publicada en el mismo grano, se elige de forma
determinista por versión, fecha de publicación e identificador. Las versiones
anteriores del mismo período no se agregan.

## Conciliación Excel contra formulario

La evidencia se analiza al finalizar la carga y vuelve a conciliarse en la
revisión y publicación. La revisión queda incluida en el digest confirmado por
el usuario, por lo que cambiar respuestas o adjuntos invalida la confirmación.

- Fisioterapia e Imágenes usan sus contratos de plantilla propios. Los valores
  reconocidos en el Excel se comparan campo por campo contra el formulario.
- Laboratorio acota el reporte por sucursal y por las fechas exactas del cierre.
  El total documental puede ser menor al formulario porque el reporte puede ser
  un subconjunto; se declara cobertura parcial. Si lo supera fuera de una
  tolerancia de 0.5% o `$1`, la publicación se bloquea.
- Una sucursal o período incompatible, un archivo estructurado sin campos
  reconocidos y una diferencia campo a campo bloquean la publicación.
- Cada cierre exige una fuente estructurada reconocida para su línea. Un PDF,
  imagen u hoja genérica puede acompañarla como segundo respaldo, pero no
  sustituirla.
- Si el formulario se llenó mediante importación, el SHA-256 del Excel adjunto
  debe coincidir con el archivo importado.
- Las fórmulas nunca se ejecutan. Se usa exclusivamente su valor almacenado y
  se revela su presencia como advertencia.
- Archivos genéricos siguen disponibles como evidencia, pero se presentan como
  no verificables y no generan KPIs documentales por inferencia.

## Presentación

Los porcentajes usan un formateador central con exactamente un decimal. La
escala es parte del contrato (`fraction`, `percentage_points` o diferencia en
puntos porcentuales); el valor no se multiplica según su magnitud.

## Compatibilidad

La decisión no reescribe cierres ni KPI históricos. Los cierres nuevos
persisten `reported_revenue`; los históricos conservan trazabilidad mediante
la base contractual ya almacenada. Si esa base no existe, la interfaz muestra
`Sin dato`.
