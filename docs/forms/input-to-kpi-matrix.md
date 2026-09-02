# Input To KPI Matrix

Fecha: 2026-08-07

Regla: si falta un input esencial, el KPI debe mostrarse como `KPI_STATUS = NOT_CALCULABLE`. No se debe inventar el dato ni sustituirlo por texto generico.

## Estados

| Estado | Significado |
| --- | --- |
| `CALCULABLE` | La plantilla actual trae los inputs esenciales. |
| `CALCULABLE_WITH_SOURCE_IMPORT` | El KPI es calculable si se importa la hoja/fuente transaccional relacionada. |
| `NEEDS_BUSINESS_CONFIRMATION` | Existe una pista en Excel, pero falta definicion de negocio o unidad. |
| `NOT_CALCULABLE` | Falta un input esencial en la plantilla actual. |

## Fisioterapia

| KPI | Inputs exactos necesarios | Fuente Excel detectada | Formula recomendada | KPI_STATUS | Notas |
| --- | --- | --- | --- | --- | --- |
| Facturacion total | `revenue_total` | `VENTA D.D` / `VENTA OBTENIDA` | `revenue_total` | CALCULABLE | Confirmar significado de `D.D`. |
| Cumplimiento de facturacion | `revenue_total`, `target_revenue` | `VENTA D.D`, `Meta` | `revenue_total / target_revenue` | CALCULABLE | Meta debe venir de `kpi_targets`. |
| Ordenes totales | `orders_total` | `NÚMERO DE ORDENES TOTALES` | `orders_total` | CALCULABLE | |
| Ticket promedio total | `revenue_total`, `orders_total` | Venta y ordenes | `revenue_total / orders_total` | CALCULABLE | |
| Mix de pago | `card_revenue`, `cash_revenue`, `credit_revenue`, `mixed_payment_revenue`, `revenue_total` | Ventas por forma de pago | `payment_revenue / revenue_total` | CALCULABLE | Reconciliar suma contra venta. |
| Venta referida | `referred_revenue` | `Venta por órdenes médicas` | `referred_revenue` | CALCULABLE | |
| Ordenes referidas | `referred_orders` | `Número de ordenes médicas` | `referred_orders` | CALCULABLE | |
| Venta directa | `revenue_total`, `referred_revenue` | Venta total y venta por ordenes medicas | `revenue_total - referred_revenue` | CALCULABLE | Si negocio confirma que las categorias son exhaustivas. |
| Ordenes directas | `orders_total`, `referred_orders` | Ordenes totales y medicas | `orders_total - referred_orders` | CALCULABLE | |
| Sesiones totales | `sessions_total` | `Numero de sesiones totales` | `sessions_total` | CALCULABLE | Confirmar si incluye canceladas. |
| Sesiones por tipo de terapia | `therapy_type`, `therapy_sessions` | Descarga muscular, patologias | Suma por tipo | CALCULABLE | Catalogar tipos de terapia. |
| Ingreso por tipo de terapia | `therapy_type`, `therapy_revenue` | Ventas por tipo de terapia | Suma por tipo | CALCULABLE | |
| Uso de equipos especiales | `equipment_type`, `equipment_sessions` | Equipos especiales | Suma por equipo | CALCULABLE | Confirmar unidad: sesion vs uso. |
| Clientes totales | `clients_total` | `Cantidad de Clientes Totales` | `clients_total` | CALCULABLE | Confirmar si cliente unico o atencion. |
| Segmentacion clientes | `athlete_clients`, `older_adult_clients`, `pediatric_clients`, `general_public_clients` | Base de clientes | Suma por segmento | CALCULABLE | Validar si segmentos son exhaustivos. |
| Variacion de clientes | `clients_total_current`, `clients_total_previous` | Base de clientes y periodo anterior | `current - previous`; `% = current / previous - 1` | CALCULABLE | No manual. |
| Promedio diario clientes | `clients_total`, `working_days` | Clientes totales y calendario/proyeccion | `clients_total / working_days` | NEEDS_BUSINESS_CONFIRMATION | Excel usa dias; debe venir de calendario operativo. |
| Gastos operativos | `rent_expense`, `payroll_expense`, `social_security_expense`, `electricity_expense`, `water_expense`, `internet_expense`, otros gastos aprobados | GASTOS | Suma de categorias | CALCULABLE | Catalogar categorias. |
| Utilidad operativa | `revenue_total`, `operating_expense_total` | Venta y gastos | `revenue_total - operating_expense_total` | CALCULABLE | |
| Margen operativo | `operating_profit`, `revenue_total` | Venta y gastos | `operating_profit / revenue_total` | CALCULABLE | |
| Productividad por personal | `sessions_total` o `revenue_total`, `staff_total` | Sesiones/venta y personal | `sessions_total / staff_total` o `revenue_total / staff_total` | CALCULABLE | Definir KPI oficial. |
| Capacidad instalada | `treatment_room_count`, `therapist_count`, `working_days`, `schedule_rules`, `session_duration` | Cubiculos/capacidad por licenciada | Regla parametrizada | NEEDS_BUSINESS_CONFIRMATION | Excel usa constantes no documentadas. |
| Ocupacion agendada | `scheduled_hours`, `available_hours` | No existe | `scheduled_hours / available_hours` | NOT_CALCULABLE | Requiere campo propuesto. |
| Ocupacion efectiva | `attended_hours`, `available_hours` | No existe | `attended_hours / available_hours` | NOT_CALCULABLE | No derivar desde sesiones sin duracion aprobada. |
| No-show | `no_show_appointments`, `scheduled_appointments` | No existe | `no_show_appointments / scheduled_appointments` | NOT_CALCULABLE | Citas canceladas no equivale a no-show. |
| Cancelaciones | `cancelled_appointments` | `CANTIDAD DE CITAS CANCELADAS`, sesiones canceladas por aseguradora | `cancelled_appointments` | CALCULABLE | Tasa requiere citas programadas. |
| Ingreso por hora | `revenue_total`, `attended_hours` | No existe horas atendidas | `revenue_total / attended_hours` | NOT_CALCULABLE | Requiere horas atendidas. |

## Laboratorio

| KPI | Inputs exactos necesarios | Fuente Excel detectada | Formula recomendada | KPI_STATUS | Notas |
| --- | --- | --- | --- | --- | --- |
| Facturacion total | `revenue_total` | `Venta Total` | `revenue_total` | CALCULABLE | |
| Cumplimiento de facturacion | `revenue_total`, `target_revenue` | `Venta Total`, `Meta` | `revenue_total / target_revenue` | CALCULABLE | |
| Venta sin IVA | `revenue_total`, `tax_rate` | `Venta sin IVA` | `revenue_total / (1 + tax_rate)` | CALCULABLE | Tax rate por pais. |
| Costo de venta | `cost_of_sales` | `Costo de la Venta` | `cost_of_sales` | CALCULABLE | Manual/GA. |
| Margen absoluto | `revenue_total`, `cost_of_sales` | Venta y costo | `revenue_total - cost_of_sales` | CALCULABLE | |
| Margen porcentual | `gross_margin_amount`, `revenue_total` | Margen y venta | `gross_margin_amount / revenue_total` | CALCULABLE | |
| Utilidad operativa | `gross_margin_amount`, `operating_expense_total` | Margen y gastos | `gross_margin_amount - operating_expense_total` | CALCULABLE | |
| Ordenes totales | `orders_total` | `Numero de Ordenes Totales` | `orders_total` | CALCULABLE | |
| Ordenes medicas | `referred_orders` | `Número de ordenes médicas` | `referred_orders` | CALCULABLE | |
| Ordenes Analiza | `analiza_orders` | `Número de ordenes Analiza` | `analiza_orders` | CALCULABLE | |
| Ordenes DRSV | `drsv_orders` | `Número de ordenes DRSV` | `drsv_orders` | CALCULABLE | |
| Domicilios | `home_service_orders`, `home_service_revenue` | Domicilios | Conteo y monto | CALCULABLE | |
| Clientes totales | `clients_total` | `Cantidad de Clientes Totales` | `clients_total` | CALCULABLE | |
| Clientes Analiza | `clients_total`, `drsv_clients` | Clientes totales y DRSV | `clients_total - drsv_clients` | CALCULABLE | Si segmentos son exhaustivos. |
| Clientes DRSV | `drsv_clients` | `Cantidad de Clientes (DRSV)` | `drsv_clients` | CALCULABLE | |
| Ticket total | `revenue_total`, `orders_total` o `clients_total` | Ticket total | `revenue_total / denominator` | NEEDS_BUSINESS_CONFIRMATION | Definir denominador oficial. |
| Ticket Analiza | `analiza_revenue`, `analiza_orders` o `analiza_clients` | Venta/ordenes/clientes Analiza | `analiza_revenue / denominator` | NEEDS_BUSINESS_CONFIRMATION | |
| Ticket DRSV | `drsv_revenue`, `drsv_orders` o `drsv_clients` | Venta/ordenes/clientes DRSV | `drsv_revenue / denominator` | NEEDS_BUSINESS_CONFIRMATION | |
| Perfiles realizados | `profiles_total` | `Total perfiles` | `profiles_total` | CALCULABLE | Confirmar si perfil equivale a paquete. |
| Pruebas por categoria/area | `test_id`, `lab_area_id`, `test_count` | `Llenado de Medicos` contiene `Examen` y `Area` | Suma por area/examen | CALCULABLE_WITH_SOURCE_IMPORT | Requiere importacion de fuente completa. |
| Pruebas procesadas | `processed_tests` o transacciones completas por examen | No existe como cierre resumido | Suma de pruebas procesadas | NEEDS_BUSINESS_CONFIRMATION | Puede derivarse de detalle si cubre todo. |
| Reprocesos | `reprocessed_tests` | No existe | Conteo de reprocesos | NOT_CALCULABLE | Campo propuesto. |
| Rechazos | `rejected_tests` | No existe | Conteo de rechazos | NOT_CALCULABLE | Campo propuesto. |
| TAT | `received_at`, `result_released_at` | No existe completo; hay fecha/hora y espera parcial | `result_released_at - received_at` | NOT_CALCULABLE | No usar fecha/hora de factura como TAT. |
| Tiempo de espera | `service_wait_time` | `INSAING` | Promedio/percentiles | NEEDS_BUSINESS_CONFIRMATION | Falta unidad y definicion de inicio/fin. |
| Productividad por colaborador | `orders_total` o `profiles_total`, `staff_total` | Ordenes/perfiles y personal | `output / staff_total` | CALCULABLE | Definir output oficial. |
| Capacidad tecnica | `technical_capacity_tests`, `processed_tests` | No existe | `processed_tests / technical_capacity_tests` | NOT_CALCULABLE | Requiere capacidad por equipo/turno. |
| Inventario total monto | Montos consumibles, insumos, reactivos | Inventario | Suma por tipo | CALCULABLE | |
| Inventario total cantidad | Cantidades consumibles, insumos, reactivos | Inventario | Suma por tipo | CALCULABLE | |
| Calidad cliente incognito | `mystery_client_score` | `Cliente Incognito` / `Monitoreo` | Puntaje aprobado | NEEDS_BUSINESS_CONFIRMATION | Falta escala. |

## Imagenes

| KPI | Inputs exactos necesarios | Fuente Excel detectada | Formula recomendada | KPI_STATUS | Notas |
| --- | --- | --- | --- | --- | --- |
| Facturacion total | `revenue_total` | `VENTA D.D` | `revenue_total` | CALCULABLE | |
| Cumplimiento de facturacion | `revenue_total`, `target_revenue` | Venta y meta | `revenue_total / target_revenue` | CALCULABLE | |
| Costo de venta | `cost_of_sales` | `COSTO DE LA VENTA`, `IVA y Costo de Venta` | `cost_of_sales` | NEEDS_BUSINESS_CONFIRMATION | Separar IVA de costo. |
| Margen absoluto | `revenue_total`, `cost_of_sales` | Venta/costo | `revenue_total - cost_of_sales` | CALCULABLE | Requiere costo confiable. |
| Margen porcentual | `gross_margin_amount`, `revenue_total` | Margen/venta | `gross_margin_amount / revenue_total` | CALCULABLE | Fuente tiene nota de enlace pendiente. |
| Ordenes totales | `orders_total` | `NÚMERO DE ORDENES TOTALES` | `orders_total` | CALCULABLE | |
| Estudios totales | Cantidades por modalidad/categoria | Modalidades y `LLENADO 80-20` | Suma de estudios | CALCULABLE | Corregir typo `Caltidad`. |
| Estudios por modalidad | `modality_id`, `study_quantity` | RX, TAC, Ultrasonografia, Doppler, CAAF, placas | Suma por modalidad | CALCULABLE | Modalidades desde catalogo. |
| Ingreso por modalidad | `modality_id`, `study_revenue` | Ventas por modalidad | Suma por modalidad | CALCULABLE | |
| Telemedicina pacientes | `telemedicine_patients` | `Cantidad de pacientes TELEMEDICINA`, `TM` | Conteo | CALCULABLE | Confirmar unidad. |
| Telemedicina venta | `telemedicine_revenue` | `Venta TELEMEDICINA`, `LLENADO TM` | Suma total | CALCULABLE_WITH_SOURCE_IMPORT | Algunas formulas tienen referencias rotas. |
| Venta no telemedicina | `revenue_total`, `telemedicine_revenue` | Venta total y TM | `revenue_total - telemedicine_revenue` | CALCULABLE | |
| Clientes totales | `clients_total` | `Cantidad de Clientes Totales` | `clients_total` | CALCULABLE | |
| Clientes nuevos | `new_clients` | `Cantidad de Nuevos Clientes` | `new_clients` | CALCULABLE | |
| Variacion clientes | `clients_current`, `clients_previous` | Clientes por periodo | `current - previous`; `% = current / previous - 1` | CALCULABLE | |
| Ticket por cliente | `revenue_total`, `clients_total` | Venta/clientes | `revenue_total / clients_total` | CALCULABLE | |
| Ticket por estudio | `revenue_total`, `studies_total` | Venta/estudios | `revenue_total / studies_total` | CALCULABLE | Cuidar formulas `#REF!`. |
| Ticket referido | `referred_revenue`, `referred_orders` | Ordenes medicas | `referred_revenue / referred_orders` | CALCULABLE | |
| Lecturas/informes | `report_reading_count`, `report_signed_at` | `LLENADO MEDICO SUCURSAL` | Conteo de lecturas | CALCULABLE_WITH_SOURCE_IMPORT | Confirmar si `CANTIDAD LECTURAS` equivale a informes firmados. |
| TAT de informe | `study_performed_at`, `report_signed_at` | Fecha/firma disponible parcialmente | `report_signed_at - study_performed_at` | NEEDS_BUSINESS_CONFIRMATION | Necesita llave confiable entre estudio y firma. |
| Informes pendientes | `studies_total`, `reports_signed_total` | No existe como pendiente directo | `studies_total - reports_signed_total` | NEEDS_BUSINESS_CONFIRMATION | Solo si lecturas firmadas representan informes entregados. |
| Utilizacion de equipo | `equipment_used_hours`, `equipment_available_hours` | No existe | `used_hours / available_hours` | NOT_CALCULABLE | No inventar desde cantidad de estudios. |
| Downtime equipo | `equipment_downtime_hours`, `equipment_available_hours` | No existe | `downtime / available_hours` | NOT_CALCULABLE | Campo propuesto. |
| Cancelaciones/no-show | `cancelled_studies`, `scheduled_studies` | No existe | `cancelled / scheduled` o `no_show / scheduled` | NOT_CALCULABLE | |
| Productividad por personal | `studies_total` o `revenue_total`, `staff_total` | Estudios/venta y personal | `output / staff_total` | CALCULABLE | Definir output oficial. |

## Insights Deterministicos Posibles Con Datos Actuales

| Linea | Condicion | Dato | Comparacion | Insight | Accion posible | Soporte |
| --- | --- | --- | --- | --- | --- | --- |
| Fisioterapia | Cumplimiento de venta < 90% | Venta y meta | Contra meta aprobada | La sucursal esta por debajo de la meta de facturacion del mes. | Revisar dias con menor venta y origen de ordenes. | Soportado. |
| Fisioterapia | Sesiones crecen pero venta cae | Sesiones, venta | Contra periodo anterior | Hay mayor volumen con menor ingreso promedio. | Revisar mix de servicios, cortesias y ticket. | Soportado si periodos anteriores estan publicados. |
| Fisioterapia | Citas canceladas altas | Canceladas | Contra periodo anterior o meta | Las cancelaciones estan afectando la conversion operativa. | Reforzar confirmacion y lista de espera. | Soportado como conteo; tasa no calculable sin citas programadas. |
| Fisioterapia | Uso de equipo especial cae | Uso por equipo | Contra periodo anterior | Un equipo o terapia muestra baja utilizacion relativa. | Revisar agenda, disponibilidad o promocion del servicio. | Soportado como volumen, no como horas de utilizacion. |
| Laboratorio | Venta cumple pero margen cae | Venta, costo, margen | Contra meta y periodo anterior | La venta es suficiente pero el costo esta erosionando margen. | Revisar costo de venta, insumos y pruebas de mayor costo. | Soportado. |
| Laboratorio | DRSV crece y ticket DRSV cae | DRSV venta/ordenes/clientes | Contra periodo anterior | El canal DRSV crece en volumen pero con menor ticket. | Revisar convenios, descuentos y mix de pruebas. | Soportado con definicion de denominador. |
| Laboratorio | Inventario reactivos sube fuerte | Monto/cantidad reactivos | Contra periodo anterior/rango | Hay acumulacion o variacion relevante de reactivos. | Revisar rotacion, compras y vencimientos. | Soportado parcialmente; falta benchmark de rotacion. |
| Laboratorio | Perfiles caen con venta estable | Perfiles y venta | Contra periodo anterior | La venta se sostiene con menor volumen de perfiles. | Revisar mix de examenes y precios. | Soportado. |
| Imagenes | Estudios suben y ticket por estudio baja | Estudios, venta | Contra periodo anterior | Hay mas volumen con menor ingreso por estudio. | Revisar mix de modalidades y descuentos. | Soportado. |
| Imagenes | Telemedicina cambia significativamente | Venta/pacientes TM | Contra periodo anterior | La participacion de telemedicina cambio de forma relevante. | Revisar procedencia, conversion y acuerdos. | Soportado con fuente TM. |
| Imagenes | Margen bajo contra meta | Venta, costo, margen | Contra meta/rango | La sucursal factura pero el margen no acompana. | Revisar costo de venta e IVA separado. | Soportado si costo confiable. |
| Imagenes | Lecturas firmadas quedan por debajo de estudios | Estudios, lecturas | Contra mismo periodo | Puede existir backlog de informes. | Priorizar informes por fecha y modalidad. | Necesita confirmar equivalencia lecturas/informes. |

