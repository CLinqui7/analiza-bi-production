# Analytics Intelligence Review

Fecha: 2026-08-13

Alcance: revisar y mejorar la calidad analitica de dashboards, comparativos, graficas e insights sin modificar RBAC, autenticacion, Closing Engine, persistencia, formularios, navegacion ni datos fuente.

## Principio Central

Analiza Intelligence no debe comparar sucursales solo por volumen. Una sucursal grande puede vender mas por capacidad instalada, ubicacion o mezcla de servicios, mientras una sucursal pequena puede operar mejor contra su meta, capacidad y margen. La lectura ejecutiva debe separar volumen absoluto de desempeno comparable.

La comparacion recomendada usa:

- Meta vs real.
- Margen.
- Ocupacion o utilizacion efectiva.
- Calidad del dato.
- Productividad o ticket cuando la linea lo permite.
- SLA cuando existe.
- Grupo comparable por linea, tamano, region, tipo de sucursal y mezcla de servicios.

## Fisioterapia

Comparabilidad:

- No comparar solo facturacion o cantidad de sesiones.
- Comparar cumplimiento de venta, ocupacion efectiva, continuidad, no-show, margen y sesiones atendidas.
- Normalizar por horas disponibles, horas atendidas, dias operativos y capacidad de terapeutas cuando esos datos esten aprobados.

Outliers a marcar:

- Ocupacion agendada alta con ocupacion efectiva baja.
- No-show o cancelacion por encima del grupo comparable.
- Margen bajo con sesiones estables.
- Caidas bruscas de sesiones completadas.

Graficas recomendadas:

- Meta vs real con linea de presupuesto.
- Tendencia de ocupacion efectiva.
- Brecha agenda vs atencion.
- Ranking comparable por sucursal.
- Capacidad ociosa por franja.

Insights validos:

- Que ocurrio: brecha de ocupacion, no-show, margen o meta.
- Donde: sucursal, gerente, periodo.
- Cuanto: puntos, sesiones, USD o porcentaje.
- Vs que: meta, periodo anterior o grupo comparable.
- Impacto: sesiones, pacientes, margen o venta.
- Accion: confirmacion, lista de espera, reprogramacion o ajuste de capacidad.

## Laboratorio

Comparabilidad:

- No comparar solo venta ni numero de ordenes.
- Comparar facturacion contra meta, pruebas por orden, ticket, margen, productividad y calidad/TAT cuando exista.
- Normalizar por personal, dias operativos, capacidad de procesamiento, mix de pruebas y equipos cuando esos campos existan.

Outliers a marcar:

- Venta alta con margen deteriorado.
- Ordenes altas con ticket bajo.
- Calidad de datos debajo del umbral.
- TAT o rechazos fuera de rango cuando la fuente exista.

Graficas recomendadas:

- Meta vs real y presupuesto.
- Ticket/orden y margen.
- Ranking comparable por sucursal.
- Concentracion de venta e incidencias.
- Brecha de productividad si existe capacidad de procesamiento.

Insights validos:

- Separar volumen, ticket, mix y margen antes de concluir crecimiento.
- Marcar calidad insuficiente como limitacion, no como conclusion.
- Recomendar conciliacion cuando venta y costos no reconcilian.

## Imagenes

Comparabilidad:

- No comparar solo facturacion o estudios.
- Comparar facturacion contra meta, estudios, utilizacion, margen, productividad por equipo y SLA de informes si existe.
- Normalizar por modalidad, equipo, disponibilidad, downtime, dias operativos y mix de estudios.

Outliers a marcar:

- Utilizacion muy alta con SLA bajo.
- Capacidad ociosa con demanda transferible.
- Margen bajo por modalidad.
- Equipo detenido o downtime cuando exista fuente.

Graficas recomendadas:

- Utilizacion vs margen.
- Lista de espera vs capacidad disponible.
- Meta vs real y presupuesto.
- Ranking comparable por linea/modalidad.
- Brecha y desviacion contra grupo comparable.

Insights validos:

- Recomendar redistribucion solo cuando hay capacidad compatible.
- No atribuir causa a equipo, medico o proveedor si no hay evidencia.
- Explicar impacto en pacientes, espera, estudios o margen.

## Score Comparable

Se propone un score derivado de revision, no un KPI contractual. Sirve para ordenar y visualizar desempeno balanceado sin mezclarlo con datos fuente.

Componentes disponibles hoy:

- Cumplimiento de meta.
- Margen.
- Ocupacion o utilizacion.
- SLA cuando existe.
- Calidad de datos.
- Tendencia/growth.
- Productividad proxy cuando no hay horas/equipos aun.

Regla de uso:

- Mostrar siempre la base comparable.
- No reemplazar KPIs oficiales.
- No usar como calculo de bonos hasta aprobar formula de negocio.
- Marcar outliers en lugar de eliminarlos.

## Contrato de Insight Deterministico

Cada insight debe responder:

- Que ocurrio.
- Donde ocurrio.
- Cuanto cambio.
- Contra que se compara.
- Que impacto tiene.
- Que accion se recomienda.

Restricciones:

- No inventar causalidad.
- No concluir si calidad de datos es insuficiente.
- No mezclar datos DEMO con datos reales.
- Mantener evidencia, periodo, fuente y regla.

## Implementacion Analytics-Only

Cambios permitidos:

- Agregar score comparable derivado.
- Agregar base comparable visible.
- Agregar banderas de outlier.
- Ajustar ranking para ordenar por desempeno normalizado.
- Mostrar metas/presupuesto con trazo diferenciado.
- Actualizar pruebas BI para asegurar que el ranking no dependa solo de volumen.

Cambios excluidos:

- RBAC.
- Auth.
- Middleware.
- RLS.
- Closing Engine.
- Persistencia.
- Formularios.
- Navegacion.
- Datos fuente.

## Riesgos

- El score comparable puede interpretarse como KPI oficial si no se etiqueta claramente.
- Algunas normalizaciones usan proxies hasta tener horas, equipos y dias operativos reales.
- Con pocos registros por grupo comparable, los outliers deben leerse como alertas de revision, no como anomalias estadisticas concluyentes.

## Recomendacion

Implementar primero las mejoras derivadas y visibles:

1. Score comparable por sucursal y gerente.
2. Base comparable visible.
3. Outliers marcados con explicacion.
4. Ranking ordenado por score comparable.
5. Linea de meta/presupuesto con trazo diferenciado en graficas.
6. Pruebas BI que bloqueen regresiones hacia ranking por volumen absoluto.
