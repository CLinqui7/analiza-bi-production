# Form Discovery Summary

Fecha: 2026-08-07

Fuentes reales revisadas:

- `/Users/majolinqui/Desktop/JUNIO 2026 FISIOTERAPIA.xlsx`
- `/Users/majolinqui/Desktop/JUNIO 2026 LABORATORIO.xlsx`
- `/Users/majolinqui/Desktop/JUNIO 2026 IMAGENES .xlsx`

No se modifico codigo, no se crearon pantallas, no se modifico base de datos, no se crearon migraciones y no se hizo commit.

## Lectura Ejecutiva

Las plantillas actuales no son solo formularios. Son una mezcla de captura manual, fuentes transaccionales, formulas, catalogos, pivots, metas, proyecciones y dashboards.

El producto debe separar esas responsabilidades:

```text
Gerente de sucursal llena datos fuente
  -> sistema valida
  -> sistema calcula KPIs
  -> sistema compara contra metas aprobadas
  -> sistema genera insights deterministas
  -> dashboards muestran resultados segun rol y alcance
```

## 1. Que Llena Actualmente Cada Gerente

| Linea | Lo que hoy se llena o alimenta en Excel |
| --- | --- |
| Fisioterapia | Venta, ordenes, formas de pago, ordenes medicas, sesiones, terapias, equipos especiales, clientes por segmento, aseguradoras, gastos, personal, facturacion por usuario, atencion por fisioterapeuta, capacidad por cubiculos/licenciada, citas canceladas y meta de venta. |
| Laboratorio | Meta, venta total, venta sin IVA, costo de venta, formas de pago, venta/ordenes medicas, Analiza/DRSV, domicilios, clientes, gastos, personal, perfiles, cafe, inventario, cliente incognito y fuentes transaccionales de ordenes/examenes/medicos. |
| Imagenes | Meta, venta total, costo de venta, telemedicina, ordenes, estudios por modalidad, clientes, tickets, gastos, personal, inventario, estudios 80-20, medicos, lecturas/firma y fuentes de telemedicina. |

## 2. Que Deberia Seguir Llenando

| Linea | Datos fuente que si debe capturar la gerente si no existe conector/importacion |
| --- | --- |
| Fisioterapia | Venta total, ordenes, formas de pago, sesiones, terapias, equipos especiales, clientes, citas canceladas, gastos, personal, facturacion por usuario y observaciones. |
| Laboratorio | Venta total, costo de venta, formas de pago si no se importan, ordenes, domicilios, clientes, gastos, personal, perfiles, inventario, cliente incognito y observaciones. |
| Imagenes | Venta total, costo de venta, estudios por modalidad si no se importan, telemedicina, clientes, gastos, personal, inventario, lecturas/informes si se confirma fuente y observaciones. |

## 3. Que Debe Calcular El Sistema

| Tipo de calculo | Ejemplos |
| --- | --- |
| Cumplimiento | Alcance de meta, cumplimiento proyectado. |
| Porcentajes | Mix de pago, participacion de terapias/modalidades, margen porcentual. |
| Promedios | Tickets promedio, clientes promedio diarios, ingreso por estudio si aplica. |
| Totales/subtotales | Total gastos, total inventario, total personal, total estudios por modalidad. |
| Variaciones | Mes contra mes, semestre, ano contra ano. |
| Margenes | Margen bruto, utilidad operativa, margen operativo. |
| Forecast | Proyeccion mensual con dias laborables y venta acumulada. |
| Data quality | Faltantes, inconsistencias, reconciliaciones y estado `NOT_CALCULABLE`. |
| Insights | Reglas deterministas basadas en dato real vs meta/periodo anterior/benchmark permitido. |

## 4. Que Informacion Falta

| Linea | Faltantes principales |
| --- | --- |
| Fisioterapia | Citas programadas, no-show separado de cancelacion, horas disponibles, horas agendadas, horas atendidas, duracion estandar de sesion y definicion de unidad de capacidad. |
| Laboratorio | Reprocesos, rechazos, capacidad tecnica, timestamps de recepcion y resultado/entrega para TAT, definicion de perfil vs prueba y escala de cliente incognito/espera. |
| Imagenes | Horas disponibles/usadas por equipo, downtime, cancelaciones/no-show, backlog directo de informes, fecha inicio de estudio/orden confirmada para TAT y separacion de IVA/costo de venta. |

## 5. Que KPIs Realmente Podemos Producir

| Linea | KPIs calculables con plantilla actual | KPIs no calculables aun |
| --- | --- | --- |
| Fisioterapia | Facturacion, cumplimiento de venta, ordenes, ticket promedio, mix de pago, venta/ordenes referidas, sesiones, terapias, equipos especiales, clientes, gastos, utilidad, margen operativo, productividad por personal con definicion. | No-show, ocupacion agendada, ocupacion efectiva, ingreso por hora real. |
| Laboratorio | Facturacion, venta sin IVA, costo de venta, margen, utilidad, ordenes, Analiza/DRSV, domicilios, clientes, tickets con denominador aprobado, perfiles, inventario, pruebas por area si se importa fuente completa. | TAT completo, reprocesos, rechazos, utilizacion/capacidad tecnica. |
| Imagenes | Facturacion, costo/margen si costo confiable, ordenes, estudios totales, estudios por modalidad, venta por modalidad, telemedicina, clientes, tickets, gastos, utilidad, lecturas/informes si se confirma fuente. | Utilizacion de equipos, downtime, no-show/cancelaciones, TAT completo sin confirmacion. |

## 6. Que Metas Realmente Podemos Configurar

Metas listas para primera version:

- Facturacion total por sucursal/periodo.
- Ordenes totales.
- Sesiones totales de fisioterapia.
- Estudios totales y por modalidad de imagenes.
- Perfiles o pruebas de laboratorio si se confirma definicion.
- Margen y utilidad cuando venta/costo/gastos sean confiables.
- Domicilios para Fisioterapia y Laboratorio.
- Venta/ordenes medicas.
- Calidad de datos y reconciliacion.

Metas que deben esperar:

- No-show, ocupacion efectiva, TAT, reprocesos, rechazos, downtime y utilizacion de equipo.

## 7. Que Insights Realmente Podemos Generar

Insights deterministas posibles desde datos actuales:

| Linea | Insight posible |
| --- | --- |
| Fisioterapia | Venta bajo meta, sesiones crecen pero ticket baja, cancelaciones suben, equipo especial cae, gastos crecen mas que ventas. |
| Laboratorio | Venta cumple pero margen cae, DRSV cambia su participacion, domicilios caen, inventario sube fuera de rango, perfiles caen contra periodo anterior. |
| Imagenes | Estudios suben pero ticket por estudio baja, modalidad especifica cae, telemedicina cambia, margen bajo, posible atraso de informes si se confirma lectura/firma. |

No deben generarse insights sobre no-show, TAT, ocupacion o utilizacion de equipo hasta capturar los inputs faltantes.

## 8. Como Debe Ser Cada Formulario

Cada formulario debe ser un wizard de cierre mensual con ocho pasos, pero con campos diferentes por linea:

1. Contexto del cierre.
2. Operacion.
3. Produccion / capacidad.
4. Finanzas.
5. Calidad / indicadores especificos.
6. Observaciones.
7. Validacion.
8. Publicar cierre.

El wizard debe guardar borrador, validar en vivo, mostrar preview de KPIs calculables, marcar KPIs no calculables y bloquear publicacion si faltan datos esenciales.

## 9. Campos Que Requieren Aclaracion Con Negocio

| Linea | Campo / tema | Pregunta |
| --- | --- | --- |
| Fisioterapia | `VENTA D.D` | Que significa exactamente y si es equivalente a venta total oficial. |
| Fisioterapia | `Numero de sesiones totales` | Incluye solo sesiones atendidas o tambien canceladas/cortesias/jornadas. |
| Fisioterapia | Capacidad instalada | La unidad es sesiones, horas o cupos? Que constantes usa la plantilla. |
| Fisioterapia | Citas canceladas | Es cancelacion previa, no-show o ambas. |
| Fisioterapia | Metas por fisioterapeuta | La meta es por venta, sesiones, atenciones o combinacion. |
| Laboratorio | `Total perfiles` | Es perfil como paquete, prueba individual o categoria de examenes. |
| Laboratorio | Tickets | El denominador oficial es orden, cliente o examen. |
| Laboratorio | `Tiempo de espera por servicio` | Cual es inicio, fin, unidad y si puede representar TAT. |
| Laboratorio | Costo de venta | Quien lo aprueba y de que sistema/fuente debe venir. |
| Laboratorio | Reprocesos/rechazos | Existen en LIS o deben capturarse manualmente. |
| Imagenes | `IVA y Costo de Venta` | Que parte es impuesto y que parte costo directo. |
| Imagenes | `CANTIDAD LECTURAS` | Equivale a informes firmados, lecturas realizadas o asignaciones. |
| Imagenes | `Fecha de firma` | Puede unirse a fecha de estudio para calcular TAT. |
| Imagenes | Utilizacion de equipo | Existe agenda/capacidad por equipo o debe crearse nueva captura. |
| Imagenes | Telemedicina | `Cantidad de pacientes` cuenta pacientes, ordenes o estudios. |

## Formulario Recomendado Fisioterapia

### Paso 1 - Contexto Del Cierre

Campos principales: periodo, pais, empresa, sucursal, gerente sucursal, gerente area, responsable, fecha de corte.

### Paso 2 - Operacion

Campos principales: ordenes totales, ordenes medicas, ordenes pagadas, cortesias, jornadas, domicilios, clientes totales, segmentos de clientes.

### Paso 3 - Produccion / Capacidad

Campos principales: sesiones totales, terapia por descarga muscular, terapia por patologia, equipos especiales, cubiculos, personal por rol, citas canceladas.

Campos propuestos: citas programadas, no-show, horas disponibles, horas agendadas, horas atendidas.

### Paso 4 - Finanzas

Campos principales: venta total, tarjeta, efectivo, credito, mixto, venta por ordenes medicas, venta sin medico calculada, gastos por categoria.

### Paso 5 - Calidad / Indicadores Especificos

Campos principales: cliente incognito, aseguradoras con sesiones completadas/canceladas, monto por aseguradora si aplica.

### Paso 6 - Observaciones

Campos principales: causas de variacion, incidencias de agenda, equipos fuera de servicio, contexto local.

### Paso 7 - Validacion

Validaciones clave: ventas por pago cuadran, sesiones/cancelaciones no negativas, gastos no negativos, meta aprobada, capacidad con unidad clara.

### Paso 8 - Publicar Cierre

Salida: cierre publicado, KPIs calculados, metas comparadas, insights permitidos y trazabilidad.

## Formulario Recomendado Laboratorio

### Paso 1 - Contexto Del Cierre

Campos principales: periodo, pais, empresa, sucursal, gerente sucursal, gerente area, responsable, fecha de corte.

### Paso 2 - Operacion

Campos principales: ordenes totales, ordenes medicas, ordenes Analiza, ordenes DRSV, domicilios, clientes totales, clientes DRSV.

### Paso 3 - Produccion / Capacidad

Campos principales: total perfiles, pruebas por area si se importa fuente, distribucion por dia/hora si se importa fuente.

Campos propuestos: pruebas procesadas, reprocesos, rechazos, capacidad tecnica.

### Paso 4 - Finanzas

Campos principales: venta total, costo de venta, ventas por forma de pago, gastos por categoria, inventario por consumibles/insumos/reactivos.

### Paso 5 - Calidad / Indicadores Especificos

Campos principales: cliente incognito, sala de espera/monitoreo si se confirma, estado de orden si se importa.

Campos propuestos: TAT con timestamps de recepcion y resultado/entrega.

### Paso 6 - Observaciones

Campos principales: variaciones de demanda, incidentes de insumos, compras extraordinarias, notas de operacion.

### Paso 7 - Validacion

Validaciones clave: venta por pago cuadra, costo de venta existe para margen, clientes/ordenes consistentes, inventario no negativo, sin PII en observaciones.

### Paso 8 - Publicar Cierre

Salida: cierre publicado con KPIs financieros, demanda, perfiles, inventario y calidad de datos.

## Formulario Recomendado Imagenes

### Paso 1 - Contexto Del Cierre

Campos principales: periodo, pais, empresa, sucursal, gerente sucursal, gerente area, responsable, fecha de corte.

### Paso 2 - Operacion

Campos principales: ordenes totales, clientes totales, clientes nuevos, pacientes telemedicina, venta telemedicina, ordenes medicas.

### Paso 3 - Produccion / Capacidad

Campos principales: estudios por modalidad, cantidad y monto por estudio, lecturas/informes firmados si se confirma fuente.

Campos propuestos: horas disponibles/usadas por equipo, downtime, cancelaciones/no-show.

### Paso 4 - Finanzas

Campos principales: venta total, costo de venta separado de IVA, gastos por categoria, inventario si aplica.

### Paso 5 - Calidad / Indicadores Especificos

Campos principales: fecha de firma, medico asignado como catalogo, observaciones de backlog si se confirma.

Campos propuestos: TAT con fecha de estudio y fecha de firma confirmadas.

### Paso 6 - Observaciones

Campos principales: variaciones por modalidad, equipos fuera de servicio, atrasos de informe, contexto comercial.

### Paso 7 - Validacion

Validaciones clave: estudios por modalidad cuadran con total, venta por modalidad cuadra con venta total, costo confiable, sin PII en observaciones.

### Paso 8 - Publicar Cierre

Salida: cierre publicado con KPIs de facturacion, estudios, modalidad, telemedicina, margen y datos de informes cuando sean confiables.

## Explicacion No Tecnica En Menos De 60 Segundos

Analiza Intelligence funciona como un cierre mensual inteligente para cada sucursal. La gerente no llena un Excel generico: llena un formulario especifico para su linea, ya sea Fisioterapia, Laboratorio o Imagenes. El sistema revisa que los datos esten completos y consistentes, calcula automaticamente los KPIs, los compara contra metas aprobadas y genera alertas concretas sobre lo que paso. Luego cada nivel ve lo que le corresponde: la sucursal ve sus resultados, el area consolida sus sucursales, Operaciones ve areas y paises, y CEO ve la vision ejecutiva. El objetivo es que las decisiones salgan de datos reales, no de formulas manuales ni interpretaciones sueltas.

