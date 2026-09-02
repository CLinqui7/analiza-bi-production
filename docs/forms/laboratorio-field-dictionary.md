# Laboratorio Field Dictionary

Fecha: 2026-08-07

Fuente analizada: `/Users/majolinqui/Desktop/JUNIO 2026 LABORATORIO.xlsx`

## Inventario Del Libro

| Hoja | Estado | Uso detectado | Observaciones |
| --- | --- | --- | --- |
| `Llenado de plantilla` | Oculta | Fuente mensual por dato, sucursal y mes | Mezcla campos manuales, campos de reporte y formulas. Es el principal diccionario operativo. |
| `Evaluación` | Visible | Plantilla mensual de resultado de una sucursal | Resume venta, margen, clientes, domicilios, personal, perfiles, inventario y cliente incognito. |
| `YTD` | Visible | Acumulado historico y comparativos | Salida analitica, no captura manual. |
| `Doctor SV` | Visible | Pivot Analiza vs DRSV y conteo de clientes | Contiene formulas `GETPIVOTDATA` con errores `#REF!`. |
| `Llenado clientes DRSV` | Oculta | Tabla `Table_1` de detalle de orden/examen/cliente | Contiene datos personales y celulares; no debe usarse sin minimizacion/anonimizacion. |
| `llenado de venta drsv ` | Oculta | Tabla `Table_2` de venta por sucursal, orden, pago, usuario y tipo | Fuente transaccional de facturacion. |
| `Llenado Dias y Horas ` | Oculta | Tabla `Table_3` de fecha/hora, orden, examen, cliente, importes y dia | Sirve para distribucion por hora/dia; contiene PII. |
| `Evolucion Dias y Horas` | Visible | Pivot de clientes por hora | Salida analitica; posible demanda horaria. |
| `Medicos Monto` | Visible | Pivot top medicos/especialidades por monto | Salida analitica basada en doctores. |
| `Visita médica` | Visible | Pivot de monto por visitador | Salida analitica comercial. |
| `Hoja2` | Oculta | Vacia | Candidata a eliminar despues de validacion. |
| `INSAING` | Oculta | Indicadores por tramite y tiempo de espera | Necesita aclaracion funcional; contiene posible dato de espera, no TAT completo. |
| `Monitoreo` | Oculta | Cliente incognito y sala de espera | Fuente de calidad operativa. |
| `Llenado de Medicos ` | Oculta | Tabla `Table_4` de fecha, doctor, examen, especialidad, area, monto, municipio, visitador | Fuente de produccion/comercial por examen y medico. |
| `Ubicacion Medicos ` | Oculta | Catalogo de doctor, especialidad, ubicacion y visitador | Master data comercial. |
| `Proyección` | Oculta | Proyeccion de venta por dia de semana | Contiene meta manual y proyeccion calculada. |
| `FILTROS` | Oculta | Catalogo de sucursales, gerente y meses | Debe reemplazarse por catalogos de plataforma. |

Resumen tecnico: 17 hojas, 6 visibles, 11 ocultas, 4 tablas detectadas y 623 formulas. El libro contiene hojas con mas de 100,000 filas y datos personales; la version web debe minimizar datos para BI.

## Principios De Modelado

- Laboratorio debe capturar cierres financieros, demanda, ordenes, clientes, domicilios, personal, perfiles e inventario.
- La produccion por prueba/examen debe venir preferiblemente de fuente transaccional o importacion controlada, no de captura manual resumen.
- No hay campos confirmados para reprocesos, rechazos ni capacidad tecnica. Deben ser `PROPOSED_FIELD` hasta que negocio confirme la fuente.
- TAT no esta completamente soportado: hay fecha/hora, estado y una hoja de tiempo de espera, pero falta una definicion confirmada de inicio/fin del proceso.
- El cliente, telefono y otros identificadores de pacientes no son necesarios para dashboards ejecutivos. Deben anonimizase o excluirse.

## Diccionario Principal

| Campo Excel original | Hoja / seccion | Nombre recomendado | Descripcion | Clasificacion | Tipo / unidad | Obligatorio / editable | Validacion y catalogo | Formula actual / recomendada | KPI que alimenta | Observaciones / dudas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MES` | `Evaluación` / contexto | `period` | Periodo mensual del cierre. | MASTER_DATA | Mes | Si / No | Calendario de cierres. | Excel usa numero de mes y lookup. Sistema debe resolverlo. | Todos | |
| `SUCURSAL` | `Evaluación` / contexto | `branch_id` | Sucursal de laboratorio evaluada. | MASTER_DATA | Catalogo | Si / No | Debe respetar pais/empresa/area/sucursal. | Lookup desde `FILTROS`. | Todos | |
| `GERENTE DE SUCURSAL` | `Evaluación` / contexto | `branch_manager_user_id` | Responsable local. | MASTER_DATA | Usuario | Si / No | Usuario asignado a sucursal. | Lookup en filtros. | Trazabilidad | No exponer nombres en datasets analiticos. |
| `GERENTE DE ÁREA` | `Evaluación` / contexto | `area_manager_user_id` | Responsable de area. | MASTER_DATA | Usuario | Si / No | Usuario asignado al area. | Lookup en filtros. | Trazabilidad | |
| `Meta` / `VENTA OBJETIVO` / `META MES` | Financiero/proyeccion | `target_revenue` | Meta aprobada de venta. | TARGET | Moneda | Si / No para gerente sucursal | Debe provenir de metas aprobadas. | Manual en plantilla/proyeccion. | Cumplimiento venta | La hoja indica que la meta la brinda el GA. |
| `Alcance % de la meta` / `CUMPLIMIENTOS DE VENTA (%)` | Financiero | `revenue_target_attainment_pct` | Cumplimiento contra meta. | DERIVED_KPI | Porcentaje | Si / No | Requiere venta y meta > 0. | `venta / meta`. | Cumplimiento venta | No capturar manualmente. |
| `Venta Total` / `VENTA OBTENIDA` | Financiero | `revenue_total` | Venta total del periodo. | SOURCE_INPUT | Moneda | Si / Si si no hay conector | Mayor o igual a 0; reconciliar con pagos. | Fuente: detalle factura pago. | Facturacion, margen, tickets | |
| `Venta sin IVA` | Financiero | `revenue_net_tax` | Venta neta sin IVA. | SYSTEM_CALCULATED | Moneda | Si / No | Requiere venta total y tasa fiscal vigente. | Excel divide entre 1.13. | Margen neto | La tasa debe venir de configuracion pais, no formula fija. |
| `Costo de la Venta` | Financiero | `cost_of_sales` | Costo directo de la venta. | SOURCE_INPUT | Moneda | Si / Si | Mayor o igual a 0; fuente aprobada por GA/contabilidad. | Campo manual indicado como proporcionado por GA. | Margen | Debe quedar trazado a fuente contable. |
| `Margen Absoluto ($.)` | Financiero | `gross_margin_amount` | Venta menos costo de venta. | DERIVED_KPI | Moneda | Si / No | Requiere venta y costo. | `revenue_total - cost_of_sales`. | Margen | No capturar manualmente. |
| `Margen Porcentual (%)` | Financiero | `gross_margin_pct` | Margen bruto porcentual. | DERIVED_KPI | Porcentaje | Si / No | Requiere margen y venta > 0. | `gross_margin_amount / revenue_total`. | Margen | No capturar manualmente. |
| `Utilidad operativa` | Financiero | `operating_profit` | Margen absoluto menos gastos operativos. | DERIVED_KPI | Moneda | Si / No | Requiere margen y total gastos. | `gross_margin_amount - operating_expense_total`. | Utilidad | |
| `Utilidad operativa %` | Financiero | `operating_margin_pct` | Utilidad operativa sobre venta. | DERIVED_KPI | Porcentaje | Si / No | Requiere utilidad y venta > 0. | `operating_profit / revenue_total`. | Margen operativo | |
| `Venta en tarjeta` | Formas de pago | `card_revenue` | Venta pagada con tarjeta. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0; suma de pagos debe reconciliar venta. | Fuente: detalle factura pago. | Mix de pago | |
| `Venta en efectivo` | Formas de pago | `cash_revenue` | Venta en efectivo. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente transaccional. | Mix de pago | |
| `Venta al crédito` | Formas de pago | `credit_revenue` | Venta al credito. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente transaccional. | Mix de pago | |
| `Venta mixto` | Formas de pago | `mixed_payment_revenue` | Venta con pago mixto. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente transaccional. | Mix de pago | |
| `Venta por órdenes médicas` | Demanda | `referred_revenue` | Venta remitida por medicos. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente: reporte de venta examen medico. | Referidos | |
| `Número de ordenes médicas` | Demanda | `referred_orders` | Ordenes remitidas por medicos. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0; no excede ordenes totales. | Fuente: reporte cantidad examenes por medico. | Ordenes referidas | Confirmar si "ordenes" o "examenes". |
| `Venta por pacientes sin médico` | Demanda | `walk_in_revenue` | Venta no referida por medico. | SYSTEM_CALCULATED | Moneda | No / No | `revenue_total - referred_revenue`. | Excel calcula en `Evaluación`. | Venta directa | |
| `Número de ordenes sin médico` | Demanda | `walk_in_orders` | Ordenes no referidas por medico. | SYSTEM_CALCULATED | Conteo | No / No | `orders_total - referred_orders`. | Excel calcula. | Ordenes directas | |
| `Venta por paciente Analiza` | Demanda / tipo | `analiza_revenue` | Venta de clientes tipo Analiza. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente: detalle factura pago. | Segmento Analiza | |
| `Número de ordenes Analiza` | Demanda / tipo | `analiza_orders` | Ordenes tipo Analiza. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Fuente: detalle factura pago. | Segmento Analiza | |
| `Venta por paciente DRSV` | Demanda / tipo | `drsv_revenue` | Venta asociada a DRSV/Doctor SV. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente: detalle ordenes convenios/DRSV. | Segmento DRSV | |
| `Número de ordenes DRSV` | Demanda / tipo | `drsv_orders` | Ordenes DRSV. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Fuente: detalle ordenes convenios. | Segmento DRSV | |
| `Venta por domicilios` | Demanda / canal | `home_service_revenue` | Venta de ordenes a domicilio. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente: reporte de ordenes a domicilio. | Domicilios | |
| `Número de domicilios` | Demanda / canal | `home_service_orders` | Cantidad de domicilios. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Fuente: reporte de ordenes a domicilio. | Domicilios, ticket domicilio | |
| `Numero de Ordenes Totales` | Demanda | `orders_total` | Total de ordenes del periodo. | SOURCE_INPUT | Conteo | Si / Si si no hay conector | Entero >= 0; reconciliar tipos de orden. | Fuente: detalle factura pago. | Ordenes, ticket | |
| `Cantidad de Clientes Totales` | Clientes | `clients_total` | Total de clientes/pacientes atendidos. | SOURCE_INPUT | Conteo | Si / Si si no hay conector | Entero >= 0; debe reconciliar con segmentos. | Fuente: reporte detalle pago sucursal. | Clientes | Puede equivaler a ordenes en algunos meses; confirmar definicion. |
| `Cantidad de Clientes (Analiza)` | Clientes | `analiza_clients` | Clientes tipo Analiza. | SYSTEM_CALCULATED | Conteo | No / No | `clients_total - drsv_clients` si los segmentos son exhaustivos. | Excel lo calcula. | Segmento clientes | |
| `Cantidad de Clientes (DRSV)` | Clientes | `drsv_clients` | Clientes DRSV. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Fuente: detalle DRSV. | Segmento clientes | |
| `Cantidad promedio diaria de Clientes` | Clientes | `average_daily_clients` | Clientes promedio por dia operativo. | DERIVED_KPI | Clientes / dia | No / No | Requiere clientes y dias operativos. | Excel divide por 30. | Demanda diaria | Debe usar calendario real. |
| `Ticket promedio (Total)` | Tickets | `average_ticket_total` | Venta promedio por orden/cliente total. | DERIVED_KPI | Moneda | Si / No | Requiere venta y denominador aprobado. | Excel usa venta / clientes u ordenes segun seccion. | Ticket promedio | Definir denominador oficial: orden o cliente. |
| `Ticket Promedio (Analiza)` | Tickets | `average_ticket_analiza` | Ticket del segmento Analiza. | DERIVED_KPI | Moneda | No / No | Requiere venta y clientes/ordenes Analiza. | Formula en Excel. | Ticket por segmento | |
| `Ticket Promedio (DRSV)` | Tickets | `average_ticket_drsv` | Ticket del segmento DRSV. | DERIVED_KPI | Moneda | No / No | Requiere venta y clientes/ordenes DRSV. | Formula en Excel. | Ticket por segmento | |
| `Ticket promedio (por domicilio)` | Tickets | `average_ticket_home_service` | Ticket de domicilios. | DERIVED_KPI | Moneda | No / No | Requiere venta domicilios y cantidad domicilios. | Formula en Excel. | Ticket domicilio | |
| `Ticket promedio (por ordenes medicas)` | Tickets | `average_ticket_referred` | Ticket por orden medica. | DERIVED_KPI | Moneda | No / No | Requiere venta por ordenes medicas y ordenes medicas. | Formula en Excel. | Ticket referido | |
| `Renta Local` | Gastos | `rent_expense` | Renta del local. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0; soporte contable. | Manual. | Gastos, utilidad | |
| `Internet` | Gastos | `internet_expense` | Gasto de internet. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `Seguridad Electrónica` | Gastos | `electronic_security_expense` | Gasto de alarma/seguridad electronica. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | Aparece en fuente aunque no siempre en vista. |
| `Personal` | Gastos | `payroll_expense` | Gasto de personal devengado. | SOURCE_INPUT | Moneda | Si para utilidad / Si | Mayor o igual a 0; soporte de planilla. | Manual. | Gastos, utilidad | |
| `ISSS/AFP PATRONAL` | Gastos | `social_security_expense` | Prestaciones patronales. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0; puede calcularse si se aprueba porcentaje. | Manual. | Gastos | |
| `Energia` | Gastos | `electricity_expense` | Gasto electrico. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | Normalizar tilde. |
| `Agua` | Gastos | `water_expense` | Gasto de agua. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `Caja Chica` | Gastos | `petty_cash_expense` | Caja chica del mes. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0; no duplicar agua/alcaldia si se descuenta. | Manual con instruccion. | Gastos | Requiere regla contable. |
| `TRANSAE` | Gastos | `transae_expense` | Gasto de transporte/servicio TRANSAE. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | |
| `Alcaldia` | Gastos | `municipal_tax_expense` | Impuesto o pago municipal. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Gastos | Normalizar tilde. |
| `Gastos y costos Operativos CC` | Gastos | `operating_cost_cc` | Gasto/costo operativo proporcionado por GA. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0; fuente aprobada. | Manual. | Gastos | Aclarar diferencia con gasto operativo empresa. |
| `Gastos y costos Operativos empresas` | Gastos | `operating_cost_companies` | Gasto/costo operativo por empresas. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0; fuente aprobada. | Manual. | Gastos | |
| `Total Gastos` | Gastos | `operating_expense_total` | Total de gastos operativos. | SYSTEM_CALCULATED | Moneda | Si / No | Suma de categorias aprobadas. | Excel suma. | Utilidad | |
| `Flebotomistas` | Personal | `phlebotomist_count` | Cantidad de flebotomistas. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Manual. | Productividad | |
| `Atención al cliente` | Personal | `customer_service_count` | Cantidad de personal de atencion. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Manual. | Productividad | |
| `Enfermeras` | Personal | `nurse_count` | Cantidad de enfermeras. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Manual. | Productividad | |
| `Area Tecnica` | Personal | `technical_staff_count` | Cantidad de personal tecnico. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Manual. | Productividad | |
| `Limpieza / Vigilantes` | Personal | `cleaning_security_staff_count` | Personal de limpieza/vigilancia. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0. | Manual. | Productividad | |
| `Total de personal asignado` | Personal | `staff_total` | Total de personal. | SYSTEM_CALCULATED | Conteo | No / No | Suma de roles. | Excel suma. | Productividad por colaborador | |
| `Total perfiles` / `Total de perfiles realizados` | Produccion | `profiles_total` | Total de perfiles realizados. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Fuente: evolucion perfil por cantidad sucursal. | Produccion/perfiles | Confirmar si perfil equivale a paquete de pruebas. |
| `Total de tazas de Café dispensadas` | Calidad/experiencia | `coffee_cups_dispensed` | Consumo de cafe en sucursal. | OPTIONAL_CONTEXT | Conteo | No / Si | Entero >= 0. | Manual. | Experiencia/operacion | No es KPI ejecutivo salvo definicion. |
| `Monto Consumibles` | Inventario | `consumables_inventory_amount` | Valor de consumibles. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente: inventario por sucursal. | Inventario | |
| `Monto Insumos` | Inventario | `supplies_inventory_amount` | Valor de insumos. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente: inventario. | Inventario | |
| `Monto Reactivos` | Inventario | `reagents_inventory_amount` | Valor de reactivos. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente: inventario. | Inventario | |
| `MONTO TOTAL` | Inventario | `inventory_amount_total` | Valor total de inventario. | SYSTEM_CALCULATED | Moneda | No / No | Suma de montos por tipo. | Excel suma. | Inventario | |
| `Cantidad Consumibles` | Inventario | `consumables_inventory_units` | Unidades de consumibles. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Fuente: inventario. | Inventario | |
| `Cantidad Insumos` | Inventario | `supplies_inventory_units` | Unidades de insumos. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Fuente: inventario. | Inventario | |
| `Cantidad Reactivos` | Inventario | `reagents_inventory_units` | Unidades de reactivos. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Fuente: inventario. | Inventario | |
| `CANTIDAD TOTAL` | Inventario | `inventory_units_total` | Total de unidades en inventario. | SYSTEM_CALCULATED | Conteo | No / No | Suma por tipo. | Excel suma. | Inventario | |
| `Cliente Incognito` | Calidad | `mystery_client_score` | Resultado de cliente incognito. | OPTIONAL_CONTEXT | Puntaje | No / Si | Escala aprobada; rango valido. | Manual/monitoreo. | Calidad | Definir escala y responsable. |
| `Fecha` | Tablas transaccionales | `transaction_date` | Fecha de orden/factura/examen. | SOURCE_INPUT | Fecha | Si si se importa / No manual | Fecha valida en periodo. | Tabla fuente. | Produccion, demanda horaria | |
| `Hora` | `Llenado Dias y Horas` | `transaction_time` | Hora de atencion/orden. | SOURCE_INPUT | Hora | No / No manual | Hora valida. | Tabla fuente. | Demanda horaria | No equivale a TAT. |
| `Forma de pago` | Tablas transaccionales | `payment_method` | Metodo de pago. | MASTER_DATA | Catalogo | No / No manual | Catalogo de formas de pago. | Tabla fuente. | Mix de pago | |
| `Estado` | Tablas transaccionales | `order_status` | Estado de orden/entrega. | MASTER_DATA | Catalogo | No / No manual | Catalogo de estados. | Tabla fuente. | Calidad operativa | Podria alimentar pendientes si se define. |
| `Num. Orden` / `NUM.ORDEN` | Tablas transaccionales | `order_number_hash` | Identificador de orden. | SOURCE_INPUT | Texto/token | Si si se importa / No manual | Debe tokenizarse o tratarse como dato sensible. | Tabla fuente. | Lineage, reconciliacion | No exponer en dashboards. |
| `Detalle Examen` / `Examen` | Tablas transaccionales | `test_id` | Examen/prueba realizada. | MASTER_DATA | Catalogo | Si si se importa / No manual | Catalogo de pruebas. | Tabla fuente. | Pruebas por categoria | |
| `Area` | `Llenado de Medicos` | `lab_area_id` | Area tecnica de la prueba. | MASTER_DATA | Catalogo | No / No | Catalogo de areas. | Tabla fuente. | Produccion por area | |
| `Especialidad` | Medicos | `doctor_specialty_id` | Especialidad del medico remitente. | MASTER_DATA | Catalogo | No / No | Catalogo. | Tabla fuente. | Referidos por especialidad | |
| `Doctor` | Medicos | `referring_doctor_id` | Medico remitente. | MASTER_DATA | Catalogo | No / No | Catalogo de medicos. | Tabla fuente. | Referidos | No usar nombres libres en dashboards. |
| `Visitador` | Medicos | `medical_representative_id` | Visitador comercial. | MASTER_DATA | Catalogo | No / No | Catalogo. | Tabla fuente. | Visita medica | |
| `Municipio` / `Departamento` | Ubicacion medicos | `doctor_location` | Ubicacion comercial del medico. | MASTER_DATA | Catalogo geografico | No / No | Catalogo pais/departamento/municipio. | Tabla fuente. | Cobertura comercial | |
| `Cliente` / `Cliente Celular` | Tablas transaccionales | `patient_identifier` | Identificador de paciente/cliente. | REMOVE | PII | No / No | No almacenar en BI salvo tokenizacion y necesidad legal. | Tabla fuente. | Ninguno ejecutivo | Excluir de formularios y reportes ejecutivos. |
| `Sub Total`, `Descuento`, `Impuesto`, `Total` | Tablas transaccionales | `transaction_amounts` | Montos de factura. | SOURCE_INPUT | Moneda | Si si se importa / No manual | Totales deben reconciliar con venta. | Tabla fuente. | Facturacion | |
| `Tipo` | Tablas transaccionales | `customer_type` | Tipo Analiza/DRSV u otro. | MASTER_DATA | Catalogo | No / No | Catalogo de tipo cliente. | Tabla fuente. | Segmentacion | |
| `Tiempo de espera por servicio` | `INSAING` | `service_wait_time` | Posible indicador de espera. | NEEDS_CLARIFICATION | Tiempo | No / Si si se confirma | Requiere definir inicio, fin y unidad. | Hoja oculta. | Calidad/TAT parcial | No equivale a TAT completo hasta confirmar. |
| `PROYECCION $` | `Proyección` | `revenue_projection_amount` | Forecast de venta mensual. | SYSTEM_CALCULATED | Moneda | No / No | Requiere venta acumulada, dias transcurridos y calendario. | Excel calcula con dias laborables. | Forecast | |
| `PROYECCION %` | `Proyección` | `revenue_projection_attainment_pct` | Forecast contra meta. | DERIVED_KPI | Porcentaje | No / No | Requiere proyeccion y meta. | Excel calcula. | Forecast cumplimiento | |
| `Pruebas procesadas` | No existe explicitamente como cierre | `processed_tests` | Pruebas/procesos realizados. | PROPOSED_FIELD | Conteo | No / Si si se quiere productividad tecnica | Entero >= 0. | Podria derivarse de detalle de examenes si la fuente es completa. | Produccion | Confirmar si `Total perfiles` no cubre todas las pruebas. |
| `Reprocesos` | No existe | `reprocessed_tests` | Pruebas repetidas por falla/calidad. | PROPOSED_FIELD | Conteo | No / Si si se captura calidad | Entero >= 0. | No existe. | Calidad tecnica | |
| `Rechazos` | No existe | `rejected_tests` | Pruebas o muestras rechazadas. | PROPOSED_FIELD | Conteo | No / Si si se captura calidad | Entero >= 0. | No existe. | Calidad tecnica | |
| `Capacidad tecnica` | No existe | `technical_capacity_tests` | Capacidad maxima de pruebas. | PROPOSED_FIELD | Conteo o horas | No / Si si se quiere productividad | Parametros por equipo/turno/personal. | No existe. | Utilizacion/productividad | |
| `TAT` | No existe completo | `turnaround_time` | Tiempo desde recepcion hasta resultado/entrega. | PROPOSED_FIELD | Tiempo | No / Si si se confirma fuente | Requiere timestamp inicio y fin. | No existe completo. | TAT | No derivar solo de `Fecha`/`Hora`. |

## Campos Que La Gerente No Debe Calcular

| Campo Excel | Motivo | Calculo recomendado |
| --- | --- | --- |
| `Alcance % de la meta` / `CUMPLIMIENTOS DE VENTA (%)` | Es cumplimiento derivado. | `revenue_total / target_revenue`. |
| `Venta sin IVA` | Depende de configuracion fiscal. | `revenue_total / (1 + tax_rate)` por pais. |
| `Margen Absoluto ($.)` | Es resultado financiero. | `revenue_total - cost_of_sales`. |
| `Margen Porcentual (%)` | Es ratio financiero. | `gross_margin_amount / revenue_total`. |
| `Utilidad operativa` | Es calculo compuesto. | `gross_margin_amount - operating_expense_total`. |
| `Utilidad operativa %` | Es ratio. | `operating_profit / revenue_total`. |
| `Venta por pacientes sin médico` | Puede derivarse. | `revenue_total - referred_revenue`. |
| `Número de ordenes sin médico` | Puede derivarse. | `orders_total - referred_orders`. |
| `Cantidad de Clientes (Analiza)` | Puede derivarse si los segmentos son exhaustivos. | `clients_total - drsv_clients`. |
| `Cantidad promedio diaria de Clientes` | Promedio temporal. | `clients_total / working_days`. |
| Todos los `Ticket promedio` | Promedios derivados. | Numerador de venta / denominador aprobado. |
| `Total Gastos` | Subtotal. | Suma de categorias de gasto. |
| `Total de personal asignado` | Subtotal. | Suma de roles de personal. |
| `MONTO TOTAL` y `CANTIDAD TOTAL` de inventario | Subtotales. | Suma de consumibles, insumos y reactivos. |
| `PROYECCION $` / `PROYECCION %` | Forecast. | Venta acumulada + calendario + meta. |

## Formulario Recomendado Laboratorio

### Paso 1 - Contexto Del Cierre

Campos: periodo, pais, empresa, sucursal, gerente de sucursal, gerente de area, responsable, fecha de corte.

Validaciones: sucursal dentro del alcance del usuario; periodo abierto; cierre unico por periodo/sucursal.

### Paso 2 - Operacion

Campos: ordenes totales, ordenes medicas, ordenes DRSV, ordenes Analiza, domicilios, clientes totales, clientes DRSV.

Dependencias: catalogos de tipo de cliente, forma de pago, estado de orden y canal.

### Paso 3 - Produccion / Capacidad

Campos: total perfiles, pruebas/examenes por area si la fuente transaccional lo permite, produccion por hora/dia desde importacion.

Campos propuestos: pruebas procesadas, reprocesos, rechazos, capacidad tecnica, turnos o horas tecnicas.

### Paso 4 - Finanzas

Campos: venta total, venta por forma de pago, costo de venta, gastos por categoria, inventario por tipo.

Validaciones: venta por forma de pago reconciliada contra venta total; costo y gastos no negativos; inventario no negativo.

### Paso 5 - Calidad / Indicadores Especificos

Campos: cliente incognito, sala de espera/monitoreo si negocio confirma escala, estado de orden si se importa.

Campos condicionales: TAT solo si se confirma timestamp de recepcion y timestamp de resultado/entrega.

### Paso 6 - Observaciones

Campos: causas de variacion, incidencias de insumos/reactivos, eventos de demanda, comentarios para area.

### Paso 7 - Validacion

Preview de errores: diferencias entre venta total y pagos, clientes/ordenes inconsistentes, costo faltante, meta faltante, datos personales detectados en campos de observacion.

### Paso 8 - Publicar Cierre

Accion: publicar cierre validado, generar KPIs oficiales y dejar lineage hacia fuente/importacion.
