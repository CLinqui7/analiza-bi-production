# Glosario UX Writing Ejecutivo

Fecha: 2026-08-14

Uso: referencia interna para mantener copy visible consistente en Analiza Intelligence. Este glosario no define formulas, permisos, KPIs ni reglas de negocio; solo normaliza lenguaje de interfaz.

## Terminos Oficiales

| Termino oficial | Usar para | Evitar en interfaz |
| --- | --- | --- |
| Resumen Ejecutivo | Vista consolidada para CEO y Direccion | Executive Command Center, Analytics Overview |
| Sucursal | Unidad operativa visible por rol | branch cuando el usuario final lo vea |
| Area | Agrupacion operativa de sucursales | operational area cuando sea visible |
| Gerente de Area | Rol responsable de varias sucursales | area manager en interfaz |
| Gerente de Sucursal | Rol responsable de una sucursal | branch manager en interfaz |
| Periodo | Mes o rango activo de analisis | date grain, grain |
| Cierre mensual | Captura oficial del mes por linea | closing engine, submission |
| Cierre publicado | Cierre que alimenta resultados oficiales | PUBLISHED |
| Requiere correccion | Estado que bloquea publicacion | BLOCKED |
| Validado | Informacion revisada sin bloqueos | VALIDATED |
| Meta | Objetivo configurado para un indicador | target cuando sea visible |
| Resultado | Valor real del periodo | actual cuando sea visible |
| Variacion | Diferencia contra meta o periodo anterior | delta si no aporta claridad |
| Cumplimiento | Porcentaje de logro contra meta | attainment en interfaz |
| Estado | Lectura ejecutiva del indicador | status cuando sea visible |
| Insight | Alerta, oportunidad o explicacion accionable | generic alert sin contexto |
| Bono recomendado | Monto sugerido por el sistema | bonus proposed, SYSTEM RECOMMENDS |
| Bono aprobado | Monto aprobado por autoridad | APPROVED |
| Bono ajustado | Monto cambiado con motivo | ADJUSTED WITH REASON |
| Bono rechazado | Recomendacion no aprobada | REJECTED |
| Puntaje de desempeno | Indice 0-100 de gerente, sucursal o servicio | score |
| Capacidad | Recursos disponibles para operar | capacity si no es necesario |
| Ocupacion | Uso de agenda o capacidad clinica | utilization salvo en Imagenes/equipos |
| Utilizacion tecnica | Uso de equipo o capacidad tecnica | utilization generica |
| Margen de contribucion | Resultado financiero despues de costos directos | margin si puede ser ambiguo |
| Vista previa | Revision segura antes de publicar | preview |
| Trazabilidad | Origen, cambios y auditoria de datos | lineage |
| Datos preparados | Filas listas para validacion/publicacion | staging rows |
| Archivo recibido | Archivo original preservado | RAW |
| Actualizar datos | Ejecutar conexion de datos | sync |
| Vigencia | Que tan actualizada esta la fuente | freshness |

## Estados Vacios

| Situacion | Mensaje recomendado |
| --- | --- |
| Falta cierre | No hay un cierre publicado para este periodo. Publica el cierre mensual para ver resultados oficiales. |
| Falta meta | Aun no se ha configurado una meta para este indicador. Configura una meta para comparar resultado y cumplimiento. |
| Falta dato esencial | Este indicador necesita informacion adicional para poder calcularse. |
| Fuente pendiente | Los datos estan pendientes de conexion o actualizacion. |
| Filtro sin resultados | No hay informacion para los filtros seleccionados. Ajusta el periodo, sucursal o linea de negocio. |

## Formato De Insights

1. Que ocurrio.
2. Donde ocurrio.
3. Cuanto cambio.
4. Contra que se compara.
5. Impacto esperado.
6. Accion sugerida.

Ejemplo:

`La ocupacion efectiva de Fisioterapia Centro quedo 17 pts debajo de la meta del periodo. Esto deja capacidad disponible y puede afectar el cumplimiento de venta. Revisa no-show, cancelaciones y confirmacion de citas antes del siguiente cierre.`

## Reglas De Tono

- Usar frases cortas y accionables.
- Explicar que debe hacer el usuario cuando exista error o bloqueo.
- No presentar una conclusion ejecutiva si la calidad del dato es insuficiente.
- No usar terminos tecnicos internos cuando exista una alternativa de negocio.
- Mantener consistencia entre Meta, Resultado, Variacion, Cumplimiento y Estado.
