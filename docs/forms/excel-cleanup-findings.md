# Excel Cleanup Findings

Fecha: 2026-08-07

Alcance: Fisioterapia, Laboratorio e Imagenes. No se modificaron los libros fuente.

## Resumen

| Linea | Hallazgo central | Impacto |
| --- | --- | --- |
| Fisioterapia | Plantilla mezcla captura, formulas, catalogos, pivots, metas y dashboards. | Alto: dificulta saber que debe llenar la gerente. |
| Laboratorio | Libro muy grande con tablas transaccionales, PII, formulas y pivots. | Alto: requiere minimizacion de datos y pipeline de importacion. |
| Imagenes | Muchas formulas y hojas ocultas; fuentes utiles de estudios y telemedicina, pero sin capacidad de equipo. | Alto: permite KPIs de estudios, no utilizacion real. |

## Hallazgos Por Categoria

| Categoria | Linea | Hallazgo | Recomendacion |
| --- | --- | --- | --- |
| Duplicado | Todas | `Meta`, `Alcance %`, `Venta`, `Venta obtenida`, `Cumplimiento` aparecen en vista principal, fuente y proyeccion. | Mantener una sola fuente canonica: metas en `kpi_targets`, resultados en cierre publicado, proyeccion como calculo. |
| Duplicado | Fisioterapia | Sesiones totales aparecen como `Numero de sesiones totales` y `CANTIDAD DE SESIONES TOTALES`. | Definir `sessions_total` unico. |
| Duplicado | Laboratorio | Venta, clientes, ordenes, tickets y gastos aparecen en `Evaluación`, `YTD` y `Llenado de plantilla`. | Separar formulario, hechos publicados y dashboard historico. |
| Duplicado | Imagenes | Estudios por modalidad aparecen en `IMAGENES`, `Llenado de plantilla`, `ESTUDIOS` y `LLENADO 80-20`. | Usar `LLENADO 80-20`/fuente transaccional como hecho y vistas como salida. |
| Ambiguo | Fisioterapia | `VENTA D.D` no tiene descripcion clara. | Confirmar significado con negocio antes de nombrar KPI final. |
| Ambiguo | Fisioterapia | `Cantidad terapia por ...` puede ser orden, sesion o procedimiento. | Definir unidad por servicio. |
| Ambiguo | Fisioterapia | Capacidad instalada usa constantes sin unidad documentada. | Parametrizar horario, dias, cubiculos, terapeutas y duracion. |
| Ambiguo | Laboratorio | `Ticket promedio (Total)` alterna entre ordenes/clientes en diferentes secciones. | Elegir denominador oficial por KPI. |
| Ambiguo | Laboratorio | `Total perfiles` puede ser paquete, perfil o prueba agrupada. | Confirmar definicion y relacion con pruebas procesadas. |
| Ambiguo | Laboratorio | `Tiempo de espera por servicio` existe en hoja oculta, pero no define inicio/fin. | No tratarlo como TAT hasta confirmar. |
| Ambiguo | Imagenes | `COSTO DE LA VENTA` y `IVA y Costo de Venta` estan mezclados. | Separar impuesto, costo directo y gasto operativo. |
| Ambiguo | Imagenes | `CANTIDAD LECTURAS` puede ser informe firmado, lectura realizada o asignacion medica. | Confirmar antes de calcular informes pendientes o TAT. |
| Formula manual | Todas | Porcentajes, tickets, variaciones, margenes, utilidad, totales y proyecciones estan en formulas Excel. | Migrar a calculos server-side versionados. |
| Formula manual | Fisioterapia | `Proyeccion Fisio` calcula forecast con dias y meta escrita manualmente. | Usar calendario operativo y meta aprobada. |
| Formula manual | Laboratorio | `Venta sin IVA` usa 1.13 fijo. | Usar tasa fiscal por pais/periodo. |
| Formula manual | Imagenes | Gastos como energia/personal contienen sumas escritas en celdas. | Capturar comprobantes o componentes, no formulas libres. |
| Error probable | Fisioterapia | Multiples `#DIV/0!` y `#REF!` en formulas historicas y totales. | Bloquear publicacion cuando un KPI esencial no sea calculable. |
| Error probable | Laboratorio | Formulas `GETPIVOTDATA` en `Doctor SV` retornan `#REF!`. | Reemplazar pivots por consultas controladas. |
| Error probable | Imagenes | `Venta TELEMEDICINA`, `Proporción venta nueva` y `Ticket Promedio (Por estudio)` muestran referencias rotas en algunas celdas. | Recalcular desde fuentes estructuradas. |
| Error probable | Imagenes | Nombre de sucursal con doble texto `IMÁGENESS IMÁGENES`. | Usar catalogo de sucursales con IDs. |
| Error probable | Imagenes | Typo `Caltidad Total de examenes`. | Normalizar etiquetas. |
| Error probable | Fisioterapia | Typo `CATIDAD POR ASEGURADORA` y variantes de nombres. | Normalizar catalogos y labels. |
| Dato innecesario | Todas | Hojas de dashboard/pivot (`GENERAL`, `CONSOLIDADO`, `YTD`, `80-20`, `Medicos Monto`) se usan como si fueran fuente. | Mantener como referencia historica, no como formulario. |
| Dato innecesario | Laboratorio e Imagenes | Nombres, telefonos o identificadores de pacientes aparecen en hojas transaccionales. | Excluir de BI ejecutivo o tokenizar para lineage minimo. |
| Dato innecesario | Todas | Filas fijas por usuario/persona en Excel. | Convertir a listas dinamicas desde catalogos de usuarios/roles. |
| Dato faltante | Fisioterapia | No existe no-show separado, citas programadas, horas agendadas ni horas atendidas. | Agregar solo si negocio quiere ocupacion/no-show real. |
| Dato faltante | Laboratorio | No existen reprocesos, rechazos ni capacidad tecnica. | Agregar campos o fuente LIS si existen. |
| Dato faltante | Laboratorio | No existe TAT completo. | Requiere timestamps inicio/fin y definicion por prueba. |
| Dato faltante | Imagenes | No existen horas disponibles/usadas por equipo ni downtime. | Agregar si se desea utilizacion de equipo. |
| Dato faltante | Imagenes | No existe no-show/cancelacion de agenda. | Agregar solo con fuente de agenda. |
| Catalogo necesario | Todas | Sucursal, gerente, area, meses y paises viven en hojas `FILTROS`. | Migrar a master data de plataforma. |
| Catalogo necesario | Fisioterapia | Terapias, equipos especiales, aseguradoras, terapeutas. | Catalogos versionados y activos por sucursal. |
| Catalogo necesario | Laboratorio | Pruebas/examenes, areas tecnicas, medicos, especialidades, visitadores, tipo cliente, forma de pago. | Catalogos centralizados. |
| Catalogo necesario | Imagenes | Estudios, modalidades, medicos, procedencia, telemedicina, equipos. | Catalogos centralizados. |
| Automatizable | Todas | Totales, subtotales, ratios, porcentajes y variaciones. | Calculo server-side. |
| Automatizable | Todas | Proyecciones por dia de semana. | Forecast desde calendario y venta acumulada. |
| Automatizable | Laboratorio e Imagenes | Pivots de medicos/visitadores/80-20. | Consultas sobre hechos importados. |
| Automatizable | Todas | Data quality del cierre. | Validaciones server-side antes de publicar. |

## Riesgos De Datos

| Riesgo | Linea | Severidad | Mitigacion |
| --- | --- | --- | --- |
| PII en hojas transaccionales | Laboratorio, Imagenes | Alta | Minimizar, tokenizar y restringir acceso. No llevar PII a dashboards ejecutivos. |
| Formulas rotas usadas como verdad | Todas | Alta | Calcular KPIs en servicio central y guardar estado `NOT_CALCULABLE` si falta dato. |
| Nombres libres como llaves | Todas | Alta | Usar IDs de catalogos para sucursal, usuario, medico, servicio y modalidad. |
| Metas manuales sin version | Todas | Alta | Usar metas aprobadas y versionadas. |
| Celdas calculadas tratadas como input | Todas | Media | Wizard debe pedir solo datos fuente. |
| Campos de capacidad sin unidad | Fisioterapia, Imagenes | Media | No mostrar ocupacion/utilizacion hasta capturar horas/capacidad real. |

## Acciones Antes De Implementar Formularios

1. Confirmar definiciones de negocio marcadas como `NEEDS_CLARIFICATION`.
2. Aprobar catalogos base por linea.
3. Definir que campos vendran de conector/importacion y cuales seran digitados por gerente.
4. Definir politica de PII para hojas transaccionales.
5. Definir reglas de reconciliacion financiera por linea.
6. Definir umbrales de calidad de datos para publicar.

