# Imagenes Field Dictionary

Fecha: 2026-08-07

Fuente analizada: `/Users/majolinqui/Desktop/JUNIO 2026 IMAGENES .xlsx`

## Inventario Del Libro

| Hoja | Estado | Uso detectado | Observaciones |
| --- | --- | --- | --- |
| `IMAGENES` | Visible | Plantilla mensual de resultado de una sucursal | Vista principal de cierre. Depende de `Llenado de plantilla`, `FILTROS` y `Proyeccion Imagenes`. |
| `Tabla de proyeccion de gastos` | Oculta | Tabla `Tabla10` de apoyo a gastos | Debe revisarse antes de modelar gastos proyectados. |
| `Proyeccion de gastos ` | Oculta | Apoyo de proyeccion | Secundaria, salida calculada. |
| `GRAFICO` | Oculta | Sin datos detectados | Candidata a eliminar despues de validacion. |
| `VISITA MEDICA` | Oculta | Tabla/pivot comercial | Salida de relacion medicos/visitadores. |
| `Llenado de plantilla` | Visible | Fuente mensual por sucursal y mes | Mezcla datos, formulas, gastos, usuarios y campos pendientes. |
| `ESTUDIOS` | Visible | Resumen por modalidad/categoria | Muestra Rayos X, TAC, Ultrasonografia y totales. |
| `80-20` | Visible | Ranking de estudios por monto | Salida analitica, no formulario. |
| `LLENADO 80-20` | Visible | Tabla `Tabla2` de mes, estudio, categoria, cantidad y monto | Fuente estructurada para estudios por categoria. |
| `LLENADO MEDICOS MONTO` | Oculta | Tabla `Tabla3` de medico, examen, cantidad, monto y visitador | Fuente comercial; contiene datos nominativos de medicos. |
| `Hoja4` | Oculta | Tabla `Tabla1` de medico, especialidad, examenes, visitador | Fuente historica/comercial. |
| `MEDICOS SUCURSAL` | Oculta | Pivot de lecturas por medico/sucursal | Salida analitica. |
| `MEDICO MONTO` | Visible | Pivot top medicos por monto | Salida analitica. |
| `LLENADO MEDICO SUCURSAL` | Oculta | Tabla `Tabla16` de paciente, modalidad, estudio, lecturas, sede, medico y fecha de firma | Contiene PII. Debe minimizarse/anonimizarse para BI. |
| `TM` | Oculta | Pivot de telemedicina | Salida analitica. |
| `LLENADO TM` | Oculta | Tabla `Tabla4` de estudio, categoria, cantidad, descuento, total, procedencia, sucursal y mes | Fuente de telemedicina. |
| `Proyeccion Imagenes` | Oculta | Proyeccion de ventas por dia de semana | Contiene meta manual y proyeccion calculada. |
| `FILTROS` | Oculta | Catalogos de sucursales, gerente y meses | Debe migrar a catalogos de plataforma. |

Resumen tecnico: 18 hojas, 6 visibles, 12 ocultas, 6 tablas detectadas y 10371 formulas.

## Principios De Modelado

- Imágenes necesita un formulario propio enfocado en estudios, modalidades, telemedicina, lecturas/informes, facturacion, gastos e inventario.
- La utilizacion de equipos no es calculable con fidelidad porque no se capturan horas disponibles, horas usadas ni downtime por equipo.
- El TAT de informes puede ser posible solo si negocio confirma que la fecha de estudio/orden y la fecha de firma corresponden al mismo flujo y tienen granularidad suficiente.
- Los nombres de paciente y medico asignado deben ser tratados como PII o master data, no como informacion libre en dashboards.
- Los rankings `80-20`, medicos y telemedicina son salidas analiticas; el formulario debe capturar o importar los hechos que los alimentan.

## Diccionario Principal

| Campo Excel original | Hoja / seccion | Nombre recomendado | Descripcion | Clasificacion | Tipo / unidad | Obligatorio / editable | Validacion y catalogo | Formula actual / recomendada | KPI que alimenta | Observaciones / dudas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MES` | `IMAGENES` / contexto | `period` | Periodo mensual del cierre. | MASTER_DATA | Mes | Si / No | Calendario de cierres. | Lookup en filtros. | Todos | |
| `SUCURSAL` | `IMAGENES` / contexto | `branch_id` | Sucursal de imagenes evaluada. | MASTER_DATA | Catalogo | Si / No | Debe estar dentro del alcance del usuario. | Lookup en `FILTROS`. | Todos | El archivo contiene nombres de sucursal con errores tipograficos; usar ID estable. |
| `GERENTE DE SUCURSAL` | `IMAGENES` / contexto | `branch_manager_user_id` | Responsable local. | MASTER_DATA | Usuario | Si / No | Usuario asignado a sucursal. | Lookup en filtros. | Trazabilidad | |
| `GERENTE DE ÁREA` | `IMAGENES` / contexto | `area_manager_user_id` | Responsable de area. | MASTER_DATA | Usuario | Si / No | Usuario asignado al area. | Lookup en filtros. | Trazabilidad | |
| `Meta` / `VENTA OBJETIVO` / `META MES` | Financiero/proyeccion | `target_revenue` | Meta aprobada de venta. | TARGET | Moneda | Si / No para gerente sucursal | Meta aprobada por periodo/sucursal/KPI. | Manual en `Proyeccion Imagenes`. | Cumplimiento venta | |
| `Alcance % de la meta` / `CUMPLIMIENTOS DE VENTA (%)` | Financiero | `revenue_target_attainment_pct` | Cumplimiento contra meta. | DERIVED_KPI | Porcentaje | Si / No | Requiere venta y meta > 0. | `venta / meta`. | Cumplimiento venta | No capturar manualmente. |
| `VENTA D.D` / `VENTA OBTENIDA` | Financiero | `revenue_total` | Venta total del cierre. | SOURCE_INPUT | Moneda | Si / Si si no hay conector | Mayor o igual a 0; reconciliar con modalidades y pagos. | Fuente desde `Llenado de plantilla`. | Facturacion, margen, tickets | Confirmar significado de `D.D`. |
| `COSTO DE LA VENTA` / `IVA y Costo de Venta` | Financiero | `cost_of_sales` | Costo directo de venta. | SOURCE_INPUT | Moneda | Si para margen / Si | Mayor o igual a 0; soporte contable. | Aparece en fuente, con nota pendiente en margen. | Margen | Separar IVA de costo de venta. |
| `MARGEN ABSOLUTO ($.)` | Financiero | `gross_margin_amount` | Venta menos costo de venta. | DERIVED_KPI | Moneda | Si / No | Requiere venta y costo. | Excel calcula `venta - costo`. | Margen | |
| `Margen Porcentual (%)` | Financiero | `gross_margin_pct` | Margen porcentual. | DERIVED_KPI | Porcentaje | Si / No | Requiere margen y venta > 0. | Excel calcula, pero la fuente dice pendiente de enlace. | Margen | Validar formula contra contabilidad. |
| `Cantidad de pacientes TELEMEDICINA` | Telemedicina | `telemedicine_patients` | Pacientes/atenciones por telemedicina. | SOURCE_INPUT | Conteo | No / Si si no hay fuente | Entero >= 0. | Fuente desde `Llenado de plantilla`/`TM`. | Telemedicina | Confirmar si cuenta pacientes, ordenes o estudios. |
| `Venta TELEMEDICINA` | Telemedicina | `telemedicine_revenue` | Venta de telemedicina. | SOURCE_INPUT | Moneda | No / Si si no hay fuente | Mayor o igual a 0. | Algunas formulas tienen `#REF!`. | Telemedicina, facturacion | Debe corregirse via fuente estructurada, no formula Excel. |
| `VENTA NO TELEMEDICINA` | Telemedicina | `non_telemedicine_revenue` | Venta distinta de telemedicina. | SYSTEM_CALCULATED | Moneda | No / No | `revenue_total - telemedicine_revenue`. | Excel calcula con mezcla de formulas. | Segmentacion venta | No capturar manualmente. |
| `NÚMERO DE ORDENES TOTALES` | Financiero / demanda | `orders_total` | Ordenes totales del periodo. | SOURCE_INPUT | Conteo | Si / Si si no hay conector | Entero >= 0. | Fuente desde `Llenado de plantilla`. | Ordenes, ticket | |
| `TICKET PROMEDIO TOTAL` | Financiero / demanda | `average_ticket_total` | Venta promedio por orden. | DERIVED_KPI | Moneda / orden | Si / No | Requiere venta y ordenes > 0. | Formula en Excel. | Ticket | |
| `Venta por órdenes médicas` | Datos generales | `referred_revenue` | Venta remitida por medicos. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente de medicos monto. | Referidos | |
| `Número de ordenes médicas` | Datos generales | `referred_orders` | Ordenes medicas. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0; no excede ordenes totales. | Fuente de medicos. | Referidos | |
| `Venta por RX` | Estudios / modalidad | `xray_revenue` | Venta de Rayos X. | SOURCE_INPUT | Moneda | No / Si si no hay fuente estructurada | Mayor o igual a 0. | Fuente desde estudios. | Venta por modalidad | |
| `Cantidad de RX` | Estudios / modalidad | `xray_studies` | Estudios de Rayos X. | SOURCE_INPUT | Conteo | No / Si si no hay fuente estructurada | Entero >= 0. | Fuente desde estudios. | Estudios por modalidad | |
| `Venta por Placas extras` | Estudios / modalidad | `extra_plates_revenue` | Venta por placas extras. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Fuente desde plantilla. | Venta por modalidad | |
| `Cantidad Placas extras` / `Número Placas extras` | Estudios / modalidad | `extra_plates_count` | Cantidad de placas extras. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Fuente desde plantilla. | Produccion adicional | |
| `Venta total TAC` | Estudios / modalidad | `ct_revenue` | Venta de TAC/tomografia. | SOURCE_INPUT | Moneda | No / Si si no hay fuente estructurada | Mayor o igual a 0. | Fuente desde estudios. | Venta por modalidad | |
| `Cantidad de TAC` | Estudios / modalidad | `ct_studies` | Estudios TAC. | SOURCE_INPUT | Conteo | No / Si si no hay fuente estructurada | Entero >= 0. | Fuente desde estudios. | Estudios por modalidad | |
| `Venta de Ultrasonografias` | Estudios / modalidad | `ultrasound_revenue` | Venta de ultrasonografias. | SOURCE_INPUT | Moneda | No / Si si no hay fuente estructurada | Mayor o igual a 0. | Fuente desde estudios. | Venta por modalidad | |
| `Cantidad de Ultrasonografias` | Estudios / modalidad | `ultrasound_studies` | Estudios de ultrasonografia. | SOURCE_INPUT | Conteo | No / Si si no hay fuente estructurada | Entero >= 0. | Fuente desde estudios. | Estudios por modalidad | |
| `Venta de Doppler` | Estudios / modalidad | `doppler_revenue` | Venta de Doppler. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Fuente desde estudios. | Venta por modalidad | |
| `Cantidad de Doppler` | Estudios / modalidad | `doppler_studies` | Estudios Doppler. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Fuente desde estudios. | Estudios por modalidad | |
| `Venta de CAAF` | Estudios / modalidad | `caaf_revenue` | Venta de CAAF. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Fuente desde estudios. | Venta por modalidad | Requiere definicion catalogada del servicio. |
| `Cantidad de CAAF` | Estudios / modalidad | `caaf_studies` | Cantidad de CAAF. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Fuente desde estudios. | Estudios por modalidad | |
| `Caltidad Total de examenes` | Estudios / total | `studies_total` | Total de estudios/examenes. | SYSTEM_CALCULATED | Conteo | Si / No | Suma de cantidades por modalidad/categoria. | Excel suma modalidades. | Estudios totales | Corregir typo `Caltidad`. |
| `Estudio` | `LLENADO 80-20` | `study_id` | Estudio especifico realizado. | MASTER_DATA | Catalogo | Si si se importa / No manual | Catalogo de estudios. | Tabla fuente. | Estudios por tipo, 80-20 | |
| `Categoría Estudio` | `LLENADO 80-20` / `LLENADO TM` | `study_category_id` | Categoria/modalidad del estudio. | MASTER_DATA | Catalogo | Si si se importa / No manual | Catalogo de modalidades. | Tabla fuente. | Modalidades | |
| `Cantidad` | Tablas de estudios | `study_quantity` | Cantidad de estudios. | SOURCE_INPUT | Conteo | Si si se importa / Si si no hay fuente | Entero >= 0. | Tabla fuente. | Estudios | |
| `Monto` / `Total` | Tablas de estudios | `study_revenue` | Monto de venta por estudio/categoria. | SOURCE_INPUT | Moneda | Si si se importa / Si si no hay fuente | Mayor o igual a 0. | Tabla fuente. | Venta por estudio | |
| `Descuento` | `LLENADO TM` | `telemedicine_discount` | Descuento aplicado. | SOURCE_INPUT | Moneda | No / Si si aplica | Mayor o igual a 0; no excede subtotal. | Tabla fuente. | Venta neta TM | |
| `Procedencia` | `LLENADO TM` | `telemedicine_origin` | Procedencia de telemedicina. | MASTER_DATA | Catalogo | No / No | Catalogo de procedencias. | Tabla fuente. | Segmentacion TM | |
| `Cantidad de Clientes Totales` | Clientes | `clients_total` | Total de clientes/pacientes. | SOURCE_INPUT | Conteo | Si / Si si no hay fuente | Entero >= 0. | Fuente desde plantilla. | Clientes, ticket por cliente | |
| `Cantidad de Nuevos Clientes` | Clientes | `new_clients` | Clientes nuevos. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0; no excede clientes totales. | Fuente desde plantilla. | Crecimiento clientes | |
| `Variación de clientes respecto al mes anterior` | Clientes | `clients_monthly_variation` | Cambio de clientes contra mes anterior. | DERIVED_KPI | Conteo/porcentaje | No / No | Requiere clientes actual y periodo anterior. | Formula en Excel. | Tendencia clientes | |
| `Cantidad promedio diaria de Clientes` | Clientes | `average_daily_clients` | Promedio diario de clientes. | DERIVED_KPI | Clientes / dia | No / No | Requiere clientes y dias operativos. | Excel usa division fija. | Demanda diaria | |
| `Proporción venta nueva` | Clientes | `new_revenue_share_pct` | Participacion de venta nueva. | NEEDS_CLARIFICATION | Porcentaje | No / No | Requiere definicion de venta nueva. | Hay formulas con `#REF!`. | Crecimiento | No calculable sin fuente definida. |
| `Ticket promedio (por cliente)` | Tickets | `average_ticket_per_client` | Venta por cliente. | DERIVED_KPI | Moneda / cliente | No / No | Requiere venta y clientes > 0. | Formula en Excel. | Ticket cliente | |
| `Ticket Promedio (Por estudio)` | Tickets | `average_ticket_per_study` | Venta por estudio. | DERIVED_KPI | Moneda / estudio | No / No | Requiere venta y estudios > 0. | Formula en Excel; algunas referencias rotas. | Ticket estudio | |
| `Ticket promedio (por ordenes medicas)` | Tickets | `average_ticket_referred` | Venta por orden medica. | DERIVED_KPI | Moneda / orden | No / No | Requiere venta y ordenes medicas. | Formula en Excel. | Ticket referido | |
| `Renta Local` | Gastos | `rent_expense` | Gasto de renta. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0; soporte contable. | Manual. | Gastos, utilidad | |
| `Personal` | Gastos | `payroll_expense` | Gasto de personal. | SOURCE_INPUT | Moneda | Si para utilidad / Si | Mayor o igual a 0. | Manual; hay celdas con sumas directas. | Gastos, utilidad | Debe capturarse como dato, no formula manual en celda. |
| `ISSS/AFP` | Gastos | `social_security_expense` | Prestaciones patronales. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `Energia` | Gastos | `electricity_expense` | Gasto electrico. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Algunas celdas suman recibos manualmente. | Gastos | Normalizar tilde. |
| `Agua` | Gastos | `water_expense` | Gasto de agua. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `Telefono` | Gastos | `phone_expense` | Gasto telefonico. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | Normalizar tilde. |
| `Internet` | Gastos | `internet_expense` | Gasto de internet. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `Miscelaneos` | Gastos | `miscellaneous_expense` | Gasto miscelaneo. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0; requiere categoria o comentario. | Manual. | Gastos | Debe evitar convertirse en bolsa opaca. |
| `Mantenimiento OTIS` | Gastos | `otis_maintenance_expense` | Gasto de mantenimiento OTIS. | SOURCE_INPUT | Moneda | No / Si si aplica | Mayor o igual a 0. | Manual. | Gastos | Catalogar como mantenimiento. |
| `Seguridad Física` | Gastos | `physical_security_expense` | Gasto de seguridad fisica. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `TRANSAE` | Gastos | `transae_expense` | Gasto TRANSAE. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `Impuestos por actividad Económica (Municipalidad)` | Gastos | `municipal_tax_expense` | Impuesto municipal. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `Costo Operativo + Gasto Operativo` | Gastos | `operating_cost_and_expense` | Costo/gasto operativo combinado. | NEEDS_CLARIFICATION | Moneda | No / Si | Debe separarse en categorias contables. | Fuente de plantilla. | Gastos | Campo demasiado agregado. |
| `Total Gastos` | Gastos | `operating_expense_total` | Total de gastos. | SYSTEM_CALCULATED | Moneda | Si / No | Suma de categorias aprobadas. | Excel suma. | Utilidad | |
| `Utilidad operativa` | Gastos | `operating_profit` | Ganancia operativa. | DERIVED_KPI | Moneda | Si / No | Requiere margen y gastos. | Excel calcula. | Utilidad | |
| `Utilidad operativa %` | Gastos | `operating_margin_pct` | Margen operativo. | DERIVED_KPI | Porcentaje | Si / No | Requiere utilidad y venta. | Excel calcula. | Margen operativo | |
| `Licenciados` | Personal | `licensed_staff_count` | Personal licenciado. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Fuente de plantilla. | Productividad | Confirmar rol exacto en imagenes. |
| `Medico` | Personal | `doctor_staff_count` | Medicos/radiologos asignados. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Fuente de plantilla. | Productividad | |
| `Atención al cliente` | Personal | `customer_service_count` | Personal de atencion. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Fuente de plantilla. | Productividad | |
| `Deliverys` | Personal | `delivery_staff_count` | Personal de delivery/mensajeria. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Fuente de plantilla. | Productividad | Normalizar etiqueta. |
| `Limpieza` | Personal | `cleaning_staff_count` | Personal de limpieza. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Fuente de plantilla. | Productividad | |
| `Cantidad total de personal` | Personal | `staff_total` | Total de personal. | SYSTEM_CALCULATED | Conteo | No / No | Suma de roles. | Excel suma. | Productividad por persona | |
| `Usuario 5...10` / `Cantidad de facturas por Usuario` | Facturacion por usuario | `invoice_count_by_user` | Facturas por usuario/cajero. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Usuario desde catalogo; entero >= 0. | Filas fijas. | Productividad caja | Debe modelarse como lista dinamica, no campos numerados. |
| `Monto Promedio Facturado por empleado` | Facturacion por usuario | `average_billed_amount_per_user` | Promedio facturado por usuario. | DERIVED_KPI | Moneda / usuario | No / No | Requiere monto total por usuario y cantidad de usuarios. | Excel usa promedio. | Productividad caja | |
| `MONTO TOTAL` | Inventario | `inventory_amount_total` | Monto total de inventario. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Aparece en plantilla. | Inventario | No se detecta desglose suficiente en vista principal. |
| `CANTIDAD TOTAL` | Inventario | `inventory_units_total` | Cantidad total de inventario. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Aparece en plantilla. | Inventario | |
| `Doctor` / `Medico` | Fuentes medicas | `referring_doctor_id` | Medico remitente/asignado. | MASTER_DATA | Catalogo | No / No | Catalogo de medicos. | Tablas de medicos. | Referidos, lecturas | No exponer nombres libres. |
| `Examen` / `Descripción del estudio` | Fuentes medicas | `study_id` | Estudio/examen individual. | MASTER_DATA | Catalogo | Si si se importa / No | Catalogo de estudios. | Tablas fuente. | Estudios por tipo | |
| `Núm. Orden` | Fuentes medicas | `order_number_hash` | Identificador de orden. | SOURCE_INPUT | Texto/token | Si si se importa / No | Tokenizar; no exponer. | Tabla fuente. | Lineage | |
| `Area` | Fuentes medicas | `study_area_id` | Area/modalidad. | MASTER_DATA | Catalogo | No / No | Catalogo. | Tabla fuente. | Modalidad | |
| `Visitador` | Fuentes medicas | `medical_representative_id` | Visitador comercial. | MASTER_DATA | Catalogo | No / No | Catalogo. | Tabla fuente. | Visita medica | |
| `Nombre del paciente` | `LLENADO MEDICO SUCURSAL` | `patient_identifier` | Identificador del paciente. | REMOVE | PII | No / No | Excluir o tokenizar solo si es necesario para deduplicacion. | Tabla fuente. | Ninguno ejecutivo | No debe aparecer en formulario ejecutivo. |
| `Modalidad` | `LLENADO MEDICO SUCURSAL` | `modality_id` | Modalidad del estudio. | MASTER_DATA | Catalogo | Si si se importa / No | Catalogo de modalidades. | Tabla fuente. | Estudios por modalidad | |
| `CANTIDAD LECTURAS` | `LLENADO MEDICO SUCURSAL` | `report_reading_count` | Cantidad de lecturas/informes firmados. | SOURCE_INPUT | Conteo | No / Si si no hay fuente | Entero >= 0. | Tabla fuente. | Informes/lecturas | Confirmar si equivale a informe entregado. |
| `Sede` | `LLENADO MEDICO SUCURSAL` | `reading_site_id` | Sede donde se atiende/firma. | MASTER_DATA | Catalogo | No / No | Catalogo de sedes/sucursales. | Tabla fuente. | Alcance | |
| `Médico asignado` | `LLENADO MEDICO SUCURSAL` | `assigned_doctor_id` | Medico asignado al informe. | MASTER_DATA | Catalogo | No / No | Catalogo de medicos. | Tabla fuente. | Productividad medica | |
| `Fecha de firma` | `LLENADO MEDICO SUCURSAL` | `report_signed_at` | Fecha/hora de firma de informe. | SOURCE_INPUT | Fecha/hora | No / No manual | Fecha valida; debe estar asociada a orden/estudio. | Tabla fuente. | TAT potencial, informes | Falta confirmar fecha de inicio para TAT. |
| `PROYECCION $` | `Proyeccion Imagenes` | `revenue_projection_amount` | Proyeccion mensual de venta. | SYSTEM_CALCULATED | Moneda | No / No | Requiere venta acumulada y calendario. | Excel calcula por dias. | Forecast | |
| `PROYECCION %` | `Proyeccion Imagenes` | `revenue_projection_attainment_pct` | Proyeccion contra meta. | DERIVED_KPI | Porcentaje | No / No | Requiere proyeccion y meta. | Excel calcula. | Forecast cumplimiento | |
| `Horas disponibles por equipo` | No existe | `equipment_available_hours` | Capacidad horaria por equipo/modalidad. | PROPOSED_FIELD | Horas | No / Si si se quiere utilizacion | Mayor o igual a 0. | No existe. | Utilizacion | Necesario para utilizacion real. |
| `Horas usadas por equipo` | No existe | `equipment_used_hours` | Horas reales de uso de equipo. | PROPOSED_FIELD | Horas | No / Si si se quiere utilizacion | `<= equipment_available_hours`. | No existe. | Utilizacion | |
| `Downtime equipo` | No existe | `equipment_downtime_hours` | Horas fuera de servicio. | PROPOSED_FIELD | Horas | No / Si si se quiere disponibilidad | `<= equipment_available_hours`. | No existe. | Downtime | |
| `Cancelaciones/no-show` | No existe | `cancelled_or_no_show_studies` | Cancelaciones o inasistencias. | PROPOSED_FIELD | Conteo | No / Si si se quiere calidad agenda | Entero >= 0. | No existe. | Cancelaciones/no-show | No inventar desde estudios realizados. |

## Campos Que La Gerente No Debe Calcular

| Campo Excel | Motivo | Calculo recomendado |
| --- | --- | --- |
| `Alcance % de la meta` / `CUMPLIMIENTOS DE VENTA (%)` | Cumplimiento derivado. | `revenue_total / target_revenue`. |
| `MARGEN ABSOLUTO ($.)` | Resultado financiero. | `revenue_total - cost_of_sales`. |
| `Margen Porcentual (%)` | Ratio financiero. | `gross_margin_amount / revenue_total`. |
| `VENTA NO TELEMEDICINA` | Se deriva de venta total y telemedicina. | `revenue_total - telemedicine_revenue`. |
| `TICKET PROMEDIO TOTAL` | Promedio. | `revenue_total / orders_total`. |
| `Caltidad Total de examenes` | Total de modalidades. | Suma de cantidades por modalidad/categoria. |
| `Variación de clientes respecto al mes anterior` | Comparativo temporal. | `clients_current - clients_previous`. |
| `Cantidad promedio diaria de Clientes` | Promedio temporal. | `clients_total / working_days`. |
| `Proporción venta nueva` | Ratio. | `new_revenue / revenue_total` cuando exista fuente. |
| Tickets por cliente, estudio y orden medica | Ratios. | Numerador de venta / denominador aprobado. |
| `Total Gastos` | Subtotal. | Suma de categorias de gasto. |
| `Utilidad operativa` / `%` | Resultado financiero. | Margen menos gastos y ratio. |
| `Cantidad total de personal` | Subtotal. | Suma de roles. |
| `Monto Promedio Facturado por empleado` | Promedio. | `user_billed_total / user_count`. |
| `PROYECCION $` / `PROYECCION %` | Forecast. | Calculo central con calendario y meta. |

## Formulario Recomendado Imagenes

### Paso 1 - Contexto Del Cierre

Campos: periodo, pais, empresa, sucursal, gerente de sucursal, gerente de area, responsable, fecha de corte.

Validaciones: alcance autorizado; periodo abierto; cierre unico por sucursal/periodo.

### Paso 2 - Operacion

Campos: ordenes totales, clientes totales, clientes nuevos, telemedicina pacientes, telemedicina venta, ordenes medicas.

Dependencias: catalogos de sucursal, tipo de atencion, procedencia y medicos.

### Paso 3 - Produccion / Capacidad

Campos: estudios por modalidad, estudios por categoria, cantidad y monto por estudio, lecturas/informes firmados si la fuente se confirma.

Campos condicionales: modalidades solo si la sucursal tiene servicio activo.

Campos propuestos: horas disponibles/usadas por equipo, downtime y cancelaciones si negocio quiere utilizacion o no-show.

### Paso 4 - Finanzas

Campos: venta total, costo de venta, gasto por categoria, inventario si aplica.

Validaciones: ventas por modalidad deben reconciliar con venta total con tolerancia aprobada; costo de venta no negativo; separar IVA de costo.

### Paso 5 - Calidad / Indicadores Especificos

Campos: lecturas pendientes/firmadas si se confirma fuente, fecha de firma, observaciones de atrasos.

Campos condicionales: TAT solo cuando se confirme fecha de inicio y fecha de fin del informe.

### Paso 6 - Observaciones

Campos: causas de variacion de demanda, equipos fuera de servicio, backlog, incidencias medicas, comentarios para area.

### Paso 7 - Validacion

Preview de errores: modalidades no reconciliadas, formulas rotas sustituidas por calculo server-side, ausencia de meta, campos PII en observaciones.

### Paso 8 - Publicar Cierre

Accion: publicar cierre validado y generar resultados de facturacion, estudios, margen, telemedicina y calidad segun datos disponibles.
