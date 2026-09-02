# Business Review Del Form Discovery

Fecha: 2026-08-07

Objetivo: convertir el discovery funcional de formularios en una revision clara para aprobar que se va a construir primero.

No se implementa codigo, no se modifica base de datos, no se crean migraciones y no se hace commit.

## 1. Linea Recomendada Para Comenzar

Recomendacion: empezar con Fisioterapia.

Motivo principal: es la linea con menor complejidad operativa para implementar punta a punta y suficiente valor ejecutivo desde la primera version. Permite probar el flujo central del producto completo: cierre mensual, validacion, calculo de KPIs, metas, insights y dashboard por rol.

| Criterio | Fisioterapia | Laboratorio | Imagenes |
| --- | --- | --- | --- |
| Claridad de datos actuales | Media alta | Media | Media |
| Calidad de la plantilla | Mejor manejable | Pesada y transaccional | Amplia, con muchas formulas |
| Campos ambiguos | Medios | Altos | Altos |
| KPIs disponibles | Buenos | Muy buenos, pero con mas riesgo | Buenos |
| Complejidad | Baja/media | Alta | Media/alta |
| Valor ejecutivo | Alto | Muy alto | Alto |
| Facilidad punta a punta | Alta | Baja | Media |

Conclusion: Fisioterapia da el mejor primer caso real sin abrir demasiados frentes. Laboratorio debe ir despues porque tiene alto valor, pero tambien trae PII, tablas enormes, definiciones pendientes y mas riesgo de calidad. Imagenes puede avanzar en paralelo a nivel de catalogos, pero no debe prometer utilizacion de equipos todavia.

## 2. Resumen Ejecutivo Por Linea

### Fisioterapia

**A. Que llena hoy la gerente**

- Ventas, ordenes, formas de pago, ordenes medicas, sesiones, terapias, equipos especiales, clientes, aseguradoras, gastos, personal, facturacion por usuario, atencion por fisioterapeuta, capacidad y citas canceladas.

**B. Que deberia seguir llenando**

- Venta total, ordenes, formas de pago si no hay conector, sesiones, terapias, equipos especiales, clientes, cancelaciones, gastos, personal, aseguradoras y observaciones del cierre.

**C. Que ya no deberia llenar porque el sistema lo calcula**

- Cumplimiento de meta, tickets promedio, porcentajes de forma de pago, venta sin medico, ordenes sin medico, variaciones, totales, utilidad, margen, productividad y proyecciones.

**D. Que datos nuevos proponemos pedir**

- Observaciones del cierre.
- Citas programadas, no-show, horas disponibles, horas agendadas y horas atendidas solo si negocio aprueba medir ocupacion real.

**E. Que KPIs podremos calcular**

- Facturacion, cumplimiento de venta, ordenes, ticket promedio, mix de pago, venta referida, ordenes referidas, sesiones, clientes, gastos, utilidad, margen operativo, uso de equipos especiales y productividad basica.

**F. Que KPIs no podremos calcular todavia**

- No-show real, ocupacion agendada, ocupacion efectiva e ingreso por hora real.

**G. Que metas se pueden configurar**

- Venta, ordenes, sesiones, clientes, venta referida, domicilios, gastos, utilidad, margen y uso de equipos especiales.

**H. Que insights se pueden generar**

- Venta bajo meta, sesiones suben pero ticket baja, cancelaciones suben, equipo especial cae, gastos crecen mas que ventas.

### Laboratorio

**A. Que llena hoy la gerente**

- Meta, venta total, venta sin IVA, costo de venta, formas de pago, ordenes medicas, Analiza/DRSV, domicilios, clientes, gastos, personal, perfiles, cafe, inventario, cliente incognito y fuentes de examenes/medicos.

**B. Que deberia seguir llenando**

- Venta total, costo de venta, formas de pago si no hay conector, ordenes, domicilios, clientes, gastos, personal, perfiles, inventario, cliente incognito y observaciones.

**C. Que ya no deberia llenar porque el sistema lo calcula**

- Venta sin IVA, cumplimiento de meta, margen, utilidad, tickets promedio, clientes Analiza si se deriva de DRSV, totales de gastos, totales de inventario, variaciones y proyecciones.

**D. Que datos nuevos proponemos pedir**

- Pruebas procesadas, reprocesos, rechazos, capacidad tecnica y TAT solo si negocio confirma que no existen en sistemas fuente.

**E. Que KPIs podremos calcular**

- Facturacion, venta sin IVA, costo de venta, margen, utilidad, ordenes, Analiza/DRSV, domicilios, clientes, perfiles, inventario y productividad basica.

**F. Que KPIs no podremos calcular todavia**

- TAT completo, reprocesos, rechazos y utilizacion/capacidad tecnica.

**G. Que metas se pueden configurar**

- Venta, ordenes, clientes, DRSV, domicilios, perfiles, costo de venta, margen, utilidad, gastos e inventario.

**H. Que insights se pueden generar**

- Venta cumple pero margen cae, DRSV cambia participacion, domicilios caen, inventario sube fuera de rango, perfiles caen contra periodo anterior.

### Imagenes

**A. Que llena hoy la gerente**

- Meta, venta total, costo de venta, telemedicina, ordenes, estudios por modalidad, clientes, tickets, gastos, personal, inventario, 80-20 de estudios, medicos, lecturas/firma y fuentes de telemedicina.

**B. Que deberia seguir llenando**

- Venta total, costo de venta separado de IVA, estudios por modalidad si no hay fuente, telemedicina, clientes, gastos, personal, inventario, lecturas/informes si se confirma fuente y observaciones.

**C. Que ya no deberia llenar porque el sistema lo calcula**

- Cumplimiento de meta, margen, venta no telemedicina, tickets, total de estudios, variaciones, promedio diario, total gastos, utilidad, total personal y proyecciones.

**D. Que datos nuevos proponemos pedir**

- Horas disponibles por equipo, horas usadas por equipo, downtime, cancelaciones/no-show y fechas para TAT solo si negocio quiere medir utilizacion y tiempos.

**E. Que KPIs podremos calcular**

- Facturacion, margen si el costo es confiable, ordenes, estudios totales, estudios por modalidad, venta por modalidad, telemedicina, clientes, tickets, gastos, utilidad y lecturas/informes si se confirma.

**F. Que KPIs no podremos calcular todavia**

- Utilizacion de equipos, downtime, no-show/cancelaciones y TAT completo.

**G. Que metas se pueden configurar**

- Venta, ordenes, estudios totales, estudios por modalidad, venta por modalidad, telemedicina, clientes, margen, utilidad y gastos.

**H. Que insights se pueden generar**

- Estudios suben pero ticket baja, modalidad especifica cae, telemedicina cambia, margen bajo, posible atraso de informes si se confirma lectura/firma.

## 3. Formularios Como Los Veria La Gerente

### Fisioterapia

**Paso 1 - Informacion del cierre**

- Periodo [CATALOGO]
- Pais [CATALOGO]
- Empresa [CATALOGO]
- Sucursal [CATALOGO]
- Gerente de sucursal [AUTOMATICO]
- Gerente de area [AUTOMATICO]
- Responsable del cierre [AUTOMATICO]
- Fecha de corte [CATALOGO]

**Paso 2 - Operacion**

- Ordenes totales [MANUAL]
- Ordenes medicas [MANUAL]
- Ordenes pagadas [MANUAL]
- Ordenes de cortesia [MANUAL]
- Ordenes de jornadas [MANUAL]
- Domicilios [MANUAL]
- Clientes totales [MANUAL]
- Clientes deportistas [MANUAL]
- Clientes tercera edad [MANUAL]
- Clientes pediatricos [MANUAL]
- Clientes publico general [MANUAL]

**Paso 3 - Produccion y capacidad**

- Sesiones totales [MANUAL]
- Terapias por descarga muscular [MANUAL]
- Terapias por patologia [MANUAL]
- Uso de equipos especiales [MANUAL]
- Cubiculos disponibles [MANUAL]
- Personal por rol [MANUAL]
- Citas canceladas [MANUAL]
- Citas programadas [NUEVO PROPUESTO]
- No-show [NUEVO PROPUESTO]
- Horas disponibles [NUEVO PROPUESTO]
- Horas agendadas [NUEVO PROPUESTO]
- Horas atendidas [NUEVO PROPUESTO]

**Paso 4 - Finanzas**

- Venta total [MANUAL]
- Venta en tarjeta [MANUAL]
- Venta en efectivo [MANUAL]
- Venta al credito [MANUAL]
- Venta mixta [MANUAL]
- Venta por ordenes medicas [MANUAL]
- Venta sin medico [AUTOMATICO]
- Gastos por categoria [MANUAL]
- Total gastos [AUTOMATICO]
- Utilidad operativa [AUTOMATICO]
- Margen operativo [AUTOMATICO]

**Paso 5 - Calidad**

- Cliente incognito [MANUAL]
- Sesiones completadas por aseguradora [MANUAL]
- Sesiones canceladas por aseguradora [MANUAL]
- Monto por aseguradora [MANUAL]

**Paso 6 - Observaciones**

- Comentarios del cierre [NUEVO PROPUESTO]
- Incidencias de agenda [NUEVO PROPUESTO]
- Incidencias de equipo [NUEVO PROPUESTO]

**Paso 7 - Validacion**

- Errores de datos [AUTOMATICO]
- Advertencias [AUTOMATICO]
- KPIs calculables [AUTOMATICO]
- KPIs no calculables [AUTOMATICO]

**Paso 8 - Publicar cierre**

- Resumen final [AUTOMATICO]
- Confirmacion de publicacion [MANUAL]
- Fecha de publicacion [AUTOMATICO]

### Laboratorio

**Paso 1 - Informacion del cierre**

- Periodo [CATALOGO]
- Pais [CATALOGO]
- Empresa [CATALOGO]
- Sucursal [CATALOGO]
- Gerente de sucursal [AUTOMATICO]
- Gerente de area [AUTOMATICO]
- Responsable del cierre [AUTOMATICO]
- Fecha de corte [CATALOGO]

**Paso 2 - Operacion**

- Ordenes totales [MANUAL]
- Ordenes medicas [MANUAL]
- Ordenes Analiza [MANUAL]
- Ordenes DRSV [MANUAL]
- Domicilios [MANUAL]
- Clientes totales [MANUAL]
- Clientes DRSV [MANUAL]
- Clientes Analiza [AUTOMATICO]

**Paso 3 - Produccion**

- Perfiles realizados [MANUAL]
- Pruebas por area [MANUAL]
- Pruebas procesadas [NUEVO PROPUESTO]
- Reprocesos [NUEVO PROPUESTO]
- Rechazos [NUEVO PROPUESTO]
- Capacidad tecnica [NUEVO PROPUESTO]

**Paso 4 - Finanzas**

- Venta total [MANUAL]
- Costo de venta [MANUAL]
- Venta en tarjeta [MANUAL]
- Venta en efectivo [MANUAL]
- Venta al credito [MANUAL]
- Venta mixta [MANUAL]
- Venta sin IVA [AUTOMATICO]
- Margen bruto [AUTOMATICO]
- Gastos por categoria [MANUAL]
- Total gastos [AUTOMATICO]
- Utilidad operativa [AUTOMATICO]

**Paso 5 - Inventario y calidad**

- Monto consumibles [MANUAL]
- Monto insumos [MANUAL]
- Monto reactivos [MANUAL]
- Cantidad consumibles [MANUAL]
- Cantidad insumos [MANUAL]
- Cantidad reactivos [MANUAL]
- Total inventario [AUTOMATICO]
- Cliente incognito [MANUAL]
- Tiempo de espera [NUEVO PROPUESTO]
- TAT [NUEVO PROPUESTO]

**Paso 6 - Observaciones**

- Comentarios del cierre [NUEVO PROPUESTO]
- Incidencias de insumos/reactivos [NUEVO PROPUESTO]
- Eventos de demanda [NUEVO PROPUESTO]

**Paso 7 - Validacion**

- Errores de datos [AUTOMATICO]
- Advertencias [AUTOMATICO]
- KPIs calculables [AUTOMATICO]
- KPIs no calculables [AUTOMATICO]

**Paso 8 - Publicar cierre**

- Resumen final [AUTOMATICO]
- Confirmacion de publicacion [MANUAL]
- Fecha de publicacion [AUTOMATICO]

### Imagenes

**Paso 1 - Informacion del cierre**

- Periodo [CATALOGO]
- Pais [CATALOGO]
- Empresa [CATALOGO]
- Sucursal [CATALOGO]
- Gerente de sucursal [AUTOMATICO]
- Gerente de area [AUTOMATICO]
- Responsable del cierre [AUTOMATICO]
- Fecha de corte [CATALOGO]

**Paso 2 - Operacion**

- Ordenes totales [MANUAL]
- Ordenes medicas [MANUAL]
- Clientes totales [MANUAL]
- Clientes nuevos [MANUAL]
- Pacientes telemedicina [MANUAL]
- Venta telemedicina [MANUAL]
- Venta no telemedicina [AUTOMATICO]

**Paso 3 - Estudios y modalidades**

- Estudios Rayos X [MANUAL]
- Estudios TAC [MANUAL]
- Estudios ultrasonografia [MANUAL]
- Estudios Doppler [MANUAL]
- Estudios CAAF [MANUAL]
- Placas extras [MANUAL]
- Total estudios [AUTOMATICO]
- Venta por modalidad [MANUAL]

**Paso 4 - Capacidad e informes**

- Lecturas/informes firmados [MANUAL]
- Fecha de firma [MANUAL]
- Informes pendientes [AUTOMATICO]
- Horas disponibles por equipo [NUEVO PROPUESTO]
- Horas usadas por equipo [NUEVO PROPUESTO]
- Downtime [NUEVO PROPUESTO]
- Cancelaciones/no-show [NUEVO PROPUESTO]
- TAT [NUEVO PROPUESTO]

**Paso 5 - Finanzas**

- Venta total [MANUAL]
- Costo de venta [MANUAL]
- IVA separado [NUEVO PROPUESTO]
- Margen bruto [AUTOMATICO]
- Gastos por categoria [MANUAL]
- Total gastos [AUTOMATICO]
- Utilidad operativa [AUTOMATICO]

**Paso 6 - Observaciones**

- Comentarios del cierre [NUEVO PROPUESTO]
- Incidencias de equipo [NUEVO PROPUESTO]
- Atrasos de informe [NUEVO PROPUESTO]

**Paso 7 - Validacion**

- Errores de datos [AUTOMATICO]
- Advertencias [AUTOMATICO]
- KPIs calculables [AUTOMATICO]
- KPIs no calculables [AUTOMATICO]

**Paso 8 - Publicar cierre**

- Resumen final [AUTOMATICO]
- Confirmacion de publicacion [MANUAL]
- Fecha de publicacion [AUTOMATICO]

## 4. Campos Nuevos Que Requieren Aprobacion De Negocio

| Linea | Campo propuesto | Por que lo necesitamos | KPI que habilita | La gerente deberia conocer este dato? | Frecuencia | Complejidad | Recomendacion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Todas | Observaciones del cierre | Explicar causas de variaciones sin inventar insight. | Contexto de insights | Si | Mensual | Baja | Aprobar para MVP. |
| Fisioterapia | Citas programadas | Calcular tasas de cancelacion y no-show. | Cancelacion %, no-show % | Si, si maneja agenda | Mensual | Media | Aprobar solo si hoy puede obtenerlo sin carga excesiva. |
| Fisioterapia | No-show | Separar inasistencia de cancelacion. | No-show | Si, si agenda lo registra | Mensual | Media | Fase 2 salvo que ya exista fuente confiable. |
| Fisioterapia | Horas disponibles | Medir capacidad real. | Ocupacion, ingreso por hora | Parcialmente | Mensual | Media | Fase 2; definir regla central antes. |
| Fisioterapia | Horas agendadas | Medir demanda agendada. | Ocupacion agendada | Si, si agenda lo registra | Mensual | Media | Fase 2. |
| Fisioterapia | Horas atendidas | Medir conversion real de agenda a atencion. | Ocupacion efectiva, ingreso por hora | Si, si agenda lo registra | Mensual | Media | Fase 2. |
| Laboratorio | Pruebas procesadas | Medir produccion real mas alla de perfiles. | Pruebas, productividad | Depende del sistema fuente | Mensual | Media | No pedir manual si puede salir del LIS. |
| Laboratorio | Reprocesos | Medir calidad tecnica. | Reproceso %, calidad | Probablemente area tecnica, no gerente sola | Mensual | Media/alta | Fase 2 con fuente validada. |
| Laboratorio | Rechazos | Medir problemas de muestra/proceso. | Rechazo %, calidad | Probablemente area tecnica | Mensual | Media/alta | Fase 2 con definicion clara. |
| Laboratorio | Capacidad tecnica | Comparar produccion contra capacidad. | Utilizacion tecnica | No siempre | Mensual | Alta | No agregar al MVP. |
| Laboratorio | TAT | Medir tiempo de entrega de resultados. | TAT | Mejor desde sistema, no manual | Diario/mensual | Alta | No pedir manual; buscar fuente/API. |
| Imagenes | Horas disponibles por equipo | Medir capacidad instalada real. | Utilizacion de equipo | No siempre | Mensual | Media/alta | Fase 2 con catalogo de equipos. |
| Imagenes | Horas usadas por equipo | Medir uso real. | Utilizacion de equipo | No siempre | Mensual | Media/alta | Fase 2 si no existe RIS/PACS. |
| Imagenes | Downtime | Medir equipos fuera de servicio. | Disponibilidad/downtime | Si, si lo reporta la sucursal | Mensual | Media | Fase 2. |
| Imagenes | Cancelaciones/no-show | Medir perdida de agenda. | Cancelacion/no-show | Si, si agenda lo registra | Mensual | Media | Fase 2. |
| Imagenes | Fecha inicio del estudio | Calcular TAT real con fecha de firma. | TAT | Mejor desde sistema | Por estudio/mensual | Alta | No pedir manual en MVP. |
| Imagenes | IVA separado | Evitar mezclar impuesto con costo. | Margen confiable | Si, si contabilidad lo entrega | Mensual | Baja/media | Aprobar para MVP si costo se reporta manual. |

## 5. Decisiones Que Maria Jose Debe Tomar

### Decision 01

Tema: Fisioterapia - linea piloto.

Situacion actual: es la linea mas viable para probar el ciclo completo sin abrir demasiada complejidad.

Opcion A: iniciar implementacion con Fisioterapia.

Opcion B: iniciar con Laboratorio por mayor valor financiero.

Recomendacion: Opcion A.

Impacto: acelera un primer producto usable y reduce riesgo de datos sensibles.

### Decision 02

Tema: Fisioterapia - no-show.

Situacion actual: la plantilla no permite calcularlo de forma confiable.

Opcion A: agregar citas programadas y no-show al formulario.

Opcion B: dejarlo para cuando exista fuente de agenda.

Recomendacion: Opcion B para MVP; Opcion A en Fase 2 si la gerente ya tiene el dato.

Impacto: evita cargar el primer formulario con datos dificiles de obtener.

### Decision 03

Tema: Fisioterapia - ocupacion.

Situacion actual: faltan horas disponibles, agendadas y atendidas.

Opcion A: agregarlas al formulario.

Opcion B: medir solo sesiones y capacidad basica por ahora.

Recomendacion: Opcion B para MVP.

Impacto: permite salir con KPIs confiables sin prometer ocupacion real.

### Decision 04

Tema: Fisioterapia - capacidad instalada.

Situacion actual: Excel usa formulas con constantes no documentadas.

Opcion A: mantener captura de cubiculos y personal, y calcular capacidad despues.

Opcion B: pedir a la gerente capacidad instalada manual.

Recomendacion: Opcion A.

Impacto: evita que cada sucursal calcule capacidad de forma distinta.

### Decision 05

Tema: Todas - metas de venta.

Situacion actual: las metas se escriben manualmente en Excel.

Opcion A: permitir que la gerente escriba la meta en el cierre.

Opcion B: cargar metas aprobadas por periodo/sucursal/KPI.

Recomendacion: Opcion B.

Impacto: separa captura de resultados de aprobacion de metas.

### Decision 06

Tema: Todas - observaciones.

Situacion actual: no hay un campo estandar para explicar variaciones.

Opcion A: agregar observaciones al cierre.

Opcion B: no agregar texto libre.

Recomendacion: Opcion A con validacion para no incluir datos personales.

Impacto: mejora explicacion ejecutiva sin inventar causas.

### Decision 07

Tema: Laboratorio - fuente de pruebas.

Situacion actual: la plantilla tiene examenes en fuentes transaccionales, pero no un resumen claro de pruebas procesadas.

Opcion A: pedir pruebas procesadas manualmente.

Opcion B: obtenerlas por importacion/API.

Recomendacion: Opcion B.

Impacto: reduce carga manual y evita inconsistencias.

### Decision 08

Tema: Laboratorio - TAT.

Situacion actual: no existe inicio/fin confirmado para calcular TAT.

Opcion A: pedir TAT mensual manual.

Opcion B: esperar fuente operativa con timestamps.

Recomendacion: Opcion B.

Impacto: evita un KPI ejecutivo poco confiable.

### Decision 09

Tema: Laboratorio - reprocesos y rechazos.

Situacion actual: no aparecen en la plantilla.

Opcion A: agregarlos al formulario.

Opcion B: dejarlos para Fase 2 con definicion tecnica.

Recomendacion: Opcion B.

Impacto: mantiene el MVP enfocado en cierre financiero-operativo.

### Decision 10

Tema: Laboratorio - ticket promedio.

Situacion actual: el Excel no usa un denominador unico.

Opcion A: ticket por orden.

Opcion B: ticket por cliente.

Recomendacion: definir ambos si negocio los necesita, pero el KPI ejecutivo principal debe ser ticket por orden.

Impacto: evita comparaciones incorrectas entre sucursales.

### Decision 11

Tema: Laboratorio - PII en fuentes transaccionales.

Situacion actual: hay nombres, telefonos e identificadores en hojas fuente.

Opcion A: permitir importacion completa.

Opcion B: minimizar o tokenizar antes de BI.

Recomendacion: Opcion B.

Impacto: reduce riesgo de privacidad y seguridad.

### Decision 12

Tema: Imagenes - utilizacion de equipos.

Situacion actual: la plantilla no trae horas disponibles/usadas ni downtime.

Opcion A: agregar capacidad de equipos al formulario.

Opcion B: no incluir utilizacion en MVP.

Recomendacion: Opcion B.

Impacto: evita medir utilizacion con datos incompletos.

### Decision 13

Tema: Imagenes - TAT de informes.

Situacion actual: existe fecha de firma, pero falta confirmar fecha inicial y relacion con estudio.

Opcion A: calcular TAT desde la plantilla actual.

Opcion B: esperar confirmacion de fuente y definicion.

Recomendacion: Opcion B.

Impacto: previene insights incorrectos sobre tiempos.

### Decision 14

Tema: Imagenes - costo de venta e IVA.

Situacion actual: la plantilla mezcla costo e impuesto.

Opcion A: capturar un solo campo combinado.

Opcion B: separar costo de venta e IVA.

Recomendacion: Opcion B.

Impacto: permite margen confiable.

### Decision 15

Tema: Todas - campos por usuario/persona.

Situacion actual: Excel usa filas o columnas fijas con personas.

Opcion A: copiarlas como campos fijos.

Opcion B: usar catalogos y listas dinamicas.

Recomendacion: Opcion B.

Impacto: evita redisenar formularios cada vez que cambia el personal.

### Decision 16

Tema: Todas - calculos en el formulario.

Situacion actual: Excel contiene muchas formulas manuales y referencias rotas.

Opcion A: mostrar campos calculados como editables.

Opcion B: calcularlos automaticamente y bloquear edicion.

Recomendacion: Opcion B.

Impacto: mejora consistencia y confianza ejecutiva.

### Decision 17

Tema: Todas - publicacion del cierre.

Situacion actual: Excel no separa borrador, validacion y publicado.

Opcion A: guardar datos y mostrar de inmediato en dashboard.

Opcion B: usar estado de cierre y publicar solo despues de validacion.

Recomendacion: Opcion B.

Impacto: protege BI de datos incompletos.

### Decision 18

Tema: Todas - alcance del MVP.

Situacion actual: los Excel son grandes y pueden producir formularios demasiado pesados.

Opcion A: construir todo lo que existe en Excel.

Opcion B: construir un MVP de cierre mensual con campos esenciales.

Recomendacion: Opcion B.

Impacto: acelera salida y facilita adopcion.

## 6. Clasificacion Resumida De Campos

### Fisioterapia

| Campo | Tipo | Obligatorio | Quien lo provee | Validacion | KPI que alimenta |
| --- | --- | --- | --- | --- | --- |
| Periodo | CATALOGO | Si | Sistema | Periodo abierto | Todos |
| Sucursal | CATALOGO | Si | Sistema | Alcance autorizado | Todos |
| Gerente sucursal/area | AUTOMATICO | Si | Sistema | Asignacion vigente | Trazabilidad |
| Venta total | MANUAL | Si | Gerente o conector | Mayor o igual a 0 | Facturacion |
| Meta de venta | CATALOGO | Si | Operaciones/area | Meta aprobada | Cumplimiento |
| Ordenes totales | MANUAL | Si | Gerente o conector | Entero >= 0 | Ordenes, ticket |
| Formas de pago | MANUAL | No | Gerente o conector | Suma cuadra con venta | Mix de pago |
| Ordenes medicas | MANUAL | No | Gerente o conector | No excede total | Referidos |
| Sesiones totales | MANUAL | Si | Gerente o conector | Entero >= 0 | Sesiones |
| Terapias por tipo | MANUAL | No | Gerente o conector | Catalogo de terapia | Mix de servicios |
| Equipos especiales | MANUAL | No | Gerente | Equipo activo en sucursal | Uso de equipo |
| Clientes totales | MANUAL | Si | Gerente o conector | Entero >= 0 | Clientes, ticket |
| Segmentos de clientes | MANUAL | No | Gerente | No exceden total | Segmentacion |
| Citas canceladas | MANUAL | No | Gerente | Entero >= 0 | Cancelaciones |
| Gastos | MANUAL | Si para margen | Gerente/contabilidad | Mayor o igual a 0 | Utilidad |
| Personal por rol | MANUAL | No | Gerente | Entero >= 0 | Productividad |
| Aseguradoras | MANUAL | No | Gerente o conector | Catalogo pagador | Sesiones por pagador |
| Observaciones | PROPUESTO | No | Gerente | Sin PII | Insights |
| No-show y horas | PROPUESTO | No | Gerente o agenda | Requiere agenda | No-show, ocupacion |
| Cumplimientos, tickets, margenes, variaciones | DERIVADO | Si cuando aplica | Sistema | Inputs completos | KPIs calculados |

### Laboratorio

| Campo | Tipo | Obligatorio | Quien lo provee | Validacion | KPI que alimenta |
| --- | --- | --- | --- | --- | --- |
| Periodo | CATALOGO | Si | Sistema | Periodo abierto | Todos |
| Sucursal | CATALOGO | Si | Sistema | Alcance autorizado | Todos |
| Gerente sucursal/area | AUTOMATICO | Si | Sistema | Asignacion vigente | Trazabilidad |
| Venta total | MANUAL | Si | Gerente o conector | Mayor o igual a 0 | Facturacion |
| Meta de venta | CATALOGO | Si | Operaciones/area | Meta aprobada | Cumplimiento |
| Costo de venta | MANUAL | Si para margen | GA/contabilidad | Mayor o igual a 0 | Margen |
| Formas de pago | MANUAL | No | Gerente o conector | Suma cuadra con venta | Mix de pago |
| Ordenes totales | MANUAL | Si | Gerente o conector | Entero >= 0 | Ordenes, ticket |
| Ordenes medicas | MANUAL | No | Gerente o conector | No excede total | Referidos |
| Ordenes Analiza/DRSV | MANUAL | No | Gerente o conector | Segmentos consistentes | Segmentacion |
| Domicilios | MANUAL | No | Gerente o conector | Entero >= 0 | Domicilios |
| Clientes totales/DRSV | MANUAL | Si | Gerente o conector | Entero >= 0 | Clientes |
| Perfiles realizados | MANUAL | No | Gerente o conector | Entero >= 0 | Produccion |
| Gastos | MANUAL | Si para utilidad | Gerente/contabilidad | Mayor o igual a 0 | Utilidad |
| Personal por rol | MANUAL | No | Gerente | Entero >= 0 | Productividad |
| Inventario | MANUAL | No | Gerente/sistema | Montos y cantidades >= 0 | Inventario |
| Cliente incognito | MANUAL | No | Gerente/monitoreo | Escala aprobada | Calidad |
| Pruebas/reprocesos/rechazos/capacidad/TAT | PROPUESTO | No | LIS o negocio | Definicion pendiente | Produccion, calidad |
| Venta sin IVA, margenes, tickets, totales | DERIVADO | Si cuando aplica | Sistema | Inputs completos | KPIs calculados |

### Imagenes

| Campo | Tipo | Obligatorio | Quien lo provee | Validacion | KPI que alimenta |
| --- | --- | --- | --- | --- | --- |
| Periodo | CATALOGO | Si | Sistema | Periodo abierto | Todos |
| Sucursal | CATALOGO | Si | Sistema | Alcance autorizado | Todos |
| Gerente sucursal/area | AUTOMATICO | Si | Sistema | Asignacion vigente | Trazabilidad |
| Venta total | MANUAL | Si | Gerente o conector | Mayor o igual a 0 | Facturacion |
| Meta de venta | CATALOGO | Si | Operaciones/area | Meta aprobada | Cumplimiento |
| Costo de venta | MANUAL | Si para margen | Gerente/contabilidad | Mayor o igual a 0 | Margen |
| IVA separado | PROPUESTO | Si si se mide margen | Contabilidad/gerente | Mayor o igual a 0 | Margen confiable |
| Ordenes totales | MANUAL | Si | Gerente o conector | Entero >= 0 | Ordenes, ticket |
| Ordenes medicas | MANUAL | No | Gerente o conector | No excede total | Referidos |
| Clientes totales/nuevos | MANUAL | Si | Gerente o conector | Entero >= 0 | Clientes |
| Telemedicina | MANUAL | No | Gerente o fuente TM | Conteo/monto >= 0 | Telemedicina |
| Estudios por modalidad | MANUAL | Si | Gerente o fuente | Catalogo modalidad | Estudios |
| Venta por modalidad | MANUAL | No | Gerente o fuente | Cuadra con venta total | Venta por modalidad |
| Lecturas/informes firmados | MANUAL | No | Fuente o gerente | Definicion aprobada | Informes |
| Fecha de firma | MANUAL | No | Fuente | Fecha valida | TAT potencial |
| Gastos | MANUAL | Si para utilidad | Gerente/contabilidad | Mayor o igual a 0 | Utilidad |
| Personal por rol | MANUAL | No | Gerente | Entero >= 0 | Productividad |
| Inventario | MANUAL | No | Gerente/sistema | Mayor o igual a 0 | Inventario |
| Horas equipo/downtime/no-show/TAT | PROPUESTO | No | Agenda/RIS/PACS/gerente | Definicion pendiente | Utilizacion, calidad |
| Margen, tickets, totales, venta no TM | DERIVADO | Si cuando aplica | Sistema | Inputs completos | KPIs calculados |

## 7. MVP Recomendado

### Fisioterapia

**MVP obligatorio**

- Contexto del cierre.
- Venta total y meta aprobada.
- Ordenes totales y ordenes medicas.
- Sesiones totales.
- Clientes totales.
- Gastos principales.
- Personal por rol.
- Citas canceladas.
- Observaciones.
- Validacion y publicacion.

**Fase 2**

- Segmentos de clientes.
- Equipos especiales.
- Aseguradoras.
- Domicilios.
- Facturacion por usuario.
- Metas por fisioterapeuta.
- Citas programadas, no-show y horas.

**No necesario**

- Hojas pivot, rankings historicos y proyecciones manuales.
- Campos fijos por persona.
- Porcentajes, tickets, margenes y variaciones como inputs.

### Laboratorio

**MVP obligatorio**

- Contexto del cierre.
- Venta total, meta y costo de venta.
- Ordenes totales, ordenes medicas, Analiza/DRSV.
- Domicilios.
- Clientes totales y DRSV.
- Gastos principales.
- Personal por rol.
- Perfiles realizados.
- Inventario basico.
- Observaciones.
- Validacion y publicacion.

**Fase 2**

- Pruebas por area desde fuente/importacion.
- Cliente incognito con escala.
- Reprocesos y rechazos.
- Tiempo de espera.
- TAT desde sistema.
- Productividad tecnica.

**No necesario**

- Nombres o telefonos de pacientes.
- Pivots de medicos/visitadores como campos del formulario.
- TAT manual.
- Formulas de venta sin IVA, margen, tickets y proyecciones como inputs.

### Imagenes

**MVP obligatorio**

- Contexto del cierre.
- Venta total, meta y costo de venta separado de IVA si aplica.
- Ordenes totales y ordenes medicas.
- Estudios por modalidad.
- Venta por modalidad.
- Clientes totales y nuevos.
- Telemedicina.
- Gastos principales.
- Personal por rol.
- Observaciones.
- Validacion y publicacion.

**Fase 2**

- Lecturas/informes firmados con definicion aprobada.
- TAT con fuente confiable.
- Informes pendientes.
- Horas disponibles/usadas por equipo.
- Downtime.
- Cancelaciones/no-show.

**No necesario**

- Nombres de pacientes.
- Rankings 80-20 como captura manual.
- Pivots de medicos como formulario.
- Utilizacion de equipos sin horas reales.
- TAT manual.

## 8. KPIs Disponibles

| Linea | KPIs disponibles para MVP |
| --- | --- |
| Fisioterapia | Facturacion, cumplimiento de venta, ordenes, ticket promedio, sesiones, clientes, gastos, utilidad, margen operativo, cancelaciones como conteo, productividad basica. |
| Laboratorio | Facturacion, cumplimiento de venta, venta sin IVA, costo de venta, margen, utilidad, ordenes, Analiza/DRSV, domicilios, clientes, perfiles, inventario, productividad basica. |
| Imagenes | Facturacion, cumplimiento de venta, margen si costo/IVA son confiables, ordenes, estudios totales, estudios por modalidad, venta por modalidad, telemedicina, clientes, tickets, gastos, utilidad. |

## 9. Metas Disponibles

| Linea | Metas recomendadas para MVP |
| --- | --- |
| Fisioterapia | Venta, ordenes, sesiones, clientes, margen/utilidad, gastos y cancelaciones como conteo. |
| Laboratorio | Venta, ordenes, clientes, DRSV, domicilios, perfiles, costo de venta, margen, utilidad, gastos e inventario. |
| Imagenes | Venta, ordenes, estudios totales, estudios por modalidad, venta por modalidad, telemedicina, clientes, margen, utilidad y gastos. |

## 10. Insights Disponibles

| Linea | Insights disponibles para MVP |
| --- | --- |
| Fisioterapia | Venta bajo meta; sesiones suben pero ticket baja; cancelaciones suben; gastos crecen mas que ventas; productividad baja por persona. |
| Laboratorio | Venta cumple pero margen cae; DRSV crece con ticket menor; domicilios caen; inventario sube fuera de rango; perfiles caen contra periodo anterior. |
| Imagenes | Estudios suben pero ticket baja; modalidad cae contra meta; telemedicina cambia; margen bajo; gastos crecen mas que venta. |

## 11. Campos Nuevos Recomendados

| Prioridad | Campo | Linea | Recomendacion |
| --- | --- | --- | --- |
| MVP | Observaciones del cierre | Todas | Agregar desde primera version. |
| MVP si aplica | IVA separado | Imagenes | Agregar si costo de venta se reporta manualmente. |
| Fase 2 | Citas programadas y no-show | Fisioterapia | Agregar solo si la sucursal ya lo conoce o existe fuente de agenda. |
| Fase 2 | Horas disponibles, agendadas y atendidas | Fisioterapia | Agregar despues de definir reglas de capacidad. |
| Fase 2 | Pruebas procesadas | Laboratorio | Preferir importacion/API, no digitacion manual. |
| Fase 2 | Reprocesos y rechazos | Laboratorio | Agregar con definicion tecnica y responsable. |
| Fase 2 | TAT | Laboratorio e Imagenes | No pedir manual; buscar fuente con timestamps. |
| Fase 2 | Horas de equipo y downtime | Imagenes | Agregar solo con catalogo de equipos y regla de disponibilidad. |

