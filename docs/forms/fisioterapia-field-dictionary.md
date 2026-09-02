# Fisioterapia Field Dictionary

Fecha: 2026-08-07

Fuente analizada: `/Users/majolinqui/Desktop/JUNIO 2026 FISIOTERAPIA.xlsx`

## Inventario Del Libro

| Hoja | Estado | Uso detectado | Observaciones |
| --- | --- | --- | --- |
| `GENERAL` | Oculta | Consolidado historico por sucursal y total | Contiene formulas de evolucion, totales, capacidad, gastos y errores `#DIV/0!` / `#REF!`. |
| `Fisioterapia` | Visible | Plantilla mensual de resultado de una sucursal | Es la vista que hoy resume el cierre. Depende de `llenado fisio`, `Filtros Fisio` y `Proyeccion Fisio`. |
| `llenado fisio` | Oculta | Fuente tabular de datos por sucursal y mes | Mezcla datos fuente, formulas y referencias a reportes. Es el mejor insumo para modelar el formulario. |
| `CONSOLIDADO` | Visible | Serie mensual consolidada | Resume los mismos indicadores en meses consecutivos. Debe convertirse en dashboard, no en formulario. |
| `Medicos y Especialidades` | Visible | Pivot de monto por medico/especialidad | Incluye datos nominativos de medicos. Debe tratarse como master data/reporting, no como captura mensual manual. |
| `Visitadores` | Visible | Pivot de monto por visitador | Debe derivarse de relaciones medico/visitador y ventas, no capturarse como cierre. |
| `Llenado Medicos Fisio ` | Oculta | Tabla `Tabla6` de doctor, especialidad, visitador, cantidad, monto y mes | Fuente transaccional o semiestructurada para referidos. |
| `Proyeccion Fisio` | Visible | Proyeccion de ventas por dia de semana | Contiene meta mensual manual y proyeccion calculada. |
| `Filtros Fisio` | Visible | Catalogos de sucursales, GA, gerente y meses | Debe reemplazarse por catalogos de plataforma. |

Resumen tecnico: 9 hojas, 6 visibles, 3 ocultas, 1 tabla detectada y 1416 formulas.

## Principios De Modelado

- La gerente debe capturar datos fuente del cierre, no porcentajes, variaciones, promedios, cumplimiento, utilidad ni proyecciones.
- Los campos de `Meta`, gerente, sucursal, area, mes y catalogos deben venir de configuracion autorizada.
- Las hojas `GENERAL` y `CONSOLIDADO` son salidas analiticas, no formularios.
- Los nombres de terapeutas, medicos, visitadores y usuarios deben manejarse como catalogos o entidades relacionadas, no como columnas fijas.
- No hay campos suficientes para calcular no-show real, horas agendadas, horas atendidas u ocupacion efectiva sin campos adicionales.

## Diccionario Principal

| Campo Excel original | Hoja / seccion | Nombre recomendado | Descripcion | Clasificacion | Tipo / unidad | Obligatorio / editable | Validacion y catalogo | Formula actual / recomendada | KPI que alimenta | Observaciones / dudas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MES` | `Fisioterapia` / contexto | `period` | Periodo del cierre mensual. | MASTER_DATA | Mes | Si / No | Debe existir en calendario de cierres. | Excel usa numero de mes y lookup. Sistema debe resolver periodo. | Todos | No debe digitarse libremente. |
| `SUCURSAL` | `Fisioterapia` / contexto | `branch_id` | Sucursal evaluada. | MASTER_DATA | Catalogo | Si / No | Debe estar dentro del alcance pais/empresa/area/sucursal del usuario. | Lookup en `Filtros Fisio`. Sistema debe resolver por RBAC. | Todos | El nombre de Excel no es llave estable. |
| `GERENTE DE SUCURSAL` | `Fisioterapia` / contexto | `branch_manager_user_id` | Responsable del cierre. | MASTER_DATA | Usuario | Si / No | Usuario asignado a la sucursal. | Lookup en filtros. Sistema debe resolver desde asignaciones. | Trazabilidad | No copiar nombres personales al BI. |
| `GERENTE DE AREA` | `Fisioterapia` / contexto | `area_manager_user_id` | Gerente responsable del area. | MASTER_DATA | Usuario | Si / No | Usuario asignado al area. | Lookup en filtros. Sistema debe resolver desde jerarquia. | Trazabilidad | Debe respetar alcance organizacional. |
| `Meta` / `VENTA OBJETIVO` / `META MES` | Resultado y proyeccion | `target_revenue` | Meta aprobada de ingresos del periodo. | TARGET | Moneda | Si / No para gerente sucursal | Debe existir como meta aprobada por periodo/sucursal/KPI. | Se escribe manualmente en `Proyeccion Fisio`. Sistema debe leer `kpi_targets`. | Cumplimiento de facturacion | No debe mezclarse meta manual con resultado. |
| `VENTA D.D` / `VENTA OBTENIDA` | Financiero | `revenue_total` | Venta total del cierre. | SOURCE_INPUT | Moneda | Si / Si si no hay conector | Numero mayor o igual a 0; reconciliar con ventas por tipo de pago. | Excel trae desde `llenado fisio`. Sistema debe sumar fuente publicada. | Facturacion, ticket, margen | Confirmar significado exacto de `D.D`. |
| `Alcance % de la meta` / `CUMPLIMIENTOS DE VENTA (%)` | Financiero | `revenue_target_attainment_pct` | Cumplimiento de venta contra meta. | DERIVED_KPI | Porcentaje | Si / No | Requiere `revenue_total` y `target_revenue`. | `venta / meta`. Igual en sistema. | Cumplimiento de facturacion | Nunca capturar manualmente. |
| `NÚMERO DE ORDENES TOTALES` | Financiero | `orders_total` | Cantidad total de ordenes del periodo. | SOURCE_INPUT | Conteo | Si / Si si no hay conector | Entero mayor o igual a 0. | Fuente desde `llenado fisio`. | Ordenes, ticket promedio | Debe reconciliar ordenes pagadas, cortesias y jornadas si se usan. |
| `TICKET PROMEDIO TOTAL` | Financiero | `average_ticket_total` | Venta promedio por orden total. | DERIVED_KPI | Moneda / orden | Si / No | Requiere `revenue_total` y `orders_total > 0`. | Excel calcula venta / ordenes. | Ticket promedio | No debe ingresarse. |
| `Venta en tarjeta` | Financiero / forma de pago | `card_revenue` | Venta pagada con tarjeta. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0; suma de formas de pago debe reconciliar venta total. | Fuente desde reportes. | Mix de pago | |
| `Venta en efectivo` | Financiero / forma de pago | `cash_revenue` | Venta pagada en efectivo. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente desde reportes. | Mix de pago | |
| `Venta al crédito` | Financiero / forma de pago | `credit_revenue` | Venta al credito/convenio. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente desde reportes. | Mix de pago | |
| `Venta mixto` | Financiero / forma de pago | `mixed_payment_revenue` | Venta con pago mixto. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente desde reportes. | Mix de pago | |
| `% mixto`, `% en tarjeta`, `% en efectivo`, `% en crédito` | Financiero / forma de pago | `payment_mix_pct` | Participacion de cada forma de pago sobre venta total. | DERIVED_KPI | Porcentaje | No / No | Requiere venta por forma de pago y venta total. | Excel divide forma de pago / venta total. | Mix de pago | Hay indicios de desplazamiento de formulas en `GENERAL`; recalcular centralmente. |
| `Venta por órdenes médicas` | Datos generales | `referred_revenue` | Venta originada por orden medica. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0; no debe exceder venta total salvo regla aprobada. | Fuente desde reporte de doctores. | Referidos, ticket por referido | |
| `Número de ordenes médicas` | Datos generales | `referred_orders` | Ordenes originadas por medico. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero mayor o igual a 0; menor o igual a ordenes totales. | Fuente desde reporte de doctores. | Ordenes referidas, ticket por referido | |
| `Venta por pacientes sin médico` | Datos generales | `walk_in_revenue` | Venta no referida por medico. | SYSTEM_CALCULATED | Moneda | No / No | `revenue_total - referred_revenue`. | Excel usa fuente y formulas mixtas. Sistema debe calcular si aplica. | Venta directa | No usar como campo manual si puede derivarse. |
| `Número de ordenes sin médico` | Datos generales | `walk_in_orders` | Ordenes no referidas por medico. | SYSTEM_CALCULATED | Conteo | No / No | `orders_total - referred_orders`. | Excel usa fuente. Sistema debe calcular si aplica. | Ordenes directas | |
| `Venta Terapia por Descarga Muscular` | Produccion | `muscle_release_revenue` | Venta de terapia por descarga muscular. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente desde tipo de terapia. | Ingreso por servicio | |
| `Cantidad terapia por Descargas Musculares` | Produccion | `muscle_release_sessions` | Cantidad de sesiones/servicios de descarga muscular. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero mayor o igual a 0. | Fuente desde tipo de terapia. | Sesiones por servicio | Confirmar si cuenta ordenes, sesiones o procedimientos. |
| `Venta Terapia por patologia` | Produccion | `pathology_therapy_revenue` | Venta por terapias por patologia. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Fuente desde tipo de terapia. | Ingreso por servicio | Normalizar tilde: patologia/patologia. |
| `Cantidad terapia por Patologias` | Produccion | `pathology_therapy_sessions` | Cantidad de sesiones/servicios por patologia. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero mayor o igual a 0. | Fuente desde tipo de terapia. | Sesiones por servicio | Confirmar unidad real. |
| `Terapia por Descargas Musculares (%)` | Produccion | `muscle_release_share_pct` | Participacion del servicio dentro del total. | DERIVED_KPI | Porcentaje | No / No | Requiere cantidad o venta del servicio y total comparable. | Excel calcula porcentajes. Sistema debe recalcular. | Mix de servicios | |
| `Terapia por Patologias (%)` | Produccion | `pathology_therapy_share_pct` | Participacion del servicio dentro del total. | DERIVED_KPI | Porcentaje | No / No | Requiere cantidad o venta del servicio y total comparable. | Excel calcula porcentajes. | Mix de servicios | |
| `Numero de sesiones totales` / `CANTIDAD DE SESIONES TOTALES` | Produccion | `sessions_total` | Total de sesiones realizadas o registradas. | SOURCE_INPUT | Conteo | Si / Si si no hay conector | Entero mayor o igual a 0; reconciliar con servicios y aseguradoras. | Fuente desde `llenado fisio` y `CONSOLIDADO`. | Sesiones, productividad, uso de capacidad | Confirmar si incluye canceladas. |
| `Numero de ordenes Cortesias` | Produccion | `courtesy_orders` | Ordenes sin cobro por cortesia. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0; no excede ordenes totales. | Fuente desde `llenado fisio`. | Ordenes no facturadas | |
| `Numero de ordenes Jornadas` | Produccion | `campaign_orders` | Ordenes originadas en jornadas/campanas. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0. | Fuente desde `llenado fisio`. | Produccion por canal | |
| `Numero de ordenes Pagadas` | Produccion | `paid_orders` | Ordenes efectivamente pagadas. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0; no excede ordenes totales salvo regla. | Fuente desde `llenado fisio`. | Ticket pagado | |
| `Ticket promedio Ordenes pagadas` | Produccion | `average_paid_order_ticket` | Venta promedio por orden pagada. | DERIVED_KPI | Moneda / orden | No / No | Requiere venta aplicable y ordenes pagadas. | Excel calcula. | Ticket pagado | No capturar manualmente. |
| `Venta de Medicamento` | Produccion / adicional | `medication_revenue` | Venta de medicamento asociada a fisioterapia. | SOURCE_INPUT | Moneda | No / Si si aplica | Mayor o igual a 0. | Fuente desde `llenado fisio`. | Ingreso adicional | Confirmar si pertenece a linea o debe separarse. |
| `Cantidad de Medicamento` | Produccion / adicional | `medication_units` | Cantidad de medicamentos vendidos. | SOURCE_INPUT | Conteo | No / Si si aplica | Entero mayor o igual a 0. | Fuente desde `llenado fisio`. | Productividad adicional | |
| `Venta por domicilios` | Produccion / canal | `home_service_revenue` | Venta de servicios a domicilio. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Fuente desde reporte. | Domicilios | |
| `Número de domicilios` | Produccion / canal | `home_service_orders` | Cantidad de domicilios. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0. | Fuente desde reporte. | Domicilios, ticket domicilio | |
| `Nota de cliente incognito` | Calidad | `mystery_client_score` | Resultado de evaluacion de cliente incognito. | OPTIONAL_CONTEXT | Puntaje o texto | No / Si | Definir escala oficial. | Manual. | Calidad de servicio | Necesita aclaracion de escala y periodicidad. |
| `Lymphastim o presoterapia` | Equipos especiales | `lymphastim_sessions` | Uso o cantidad de servicio/equipo. | SOURCE_INPUT | Conteo | No / Si si aplica | Entero mayor o igual a 0. | Fuente desde reporte de licenciadas. | Uso de equipo | Confirmar si representa sesiones o ventas. |
| `Terapia de ondas de choque` | Equipos especiales | `shockwave_sessions` | Uso o cantidad de terapia de ondas de choque. | SOURCE_INPUT | Conteo | No / Si si aplica | Entero mayor o igual a 0. | Fuente desde reporte. | Uso de equipo | |
| `Láser de alta intensidad` | Equipos especiales | `high_intensity_laser_sessions` | Uso o cantidad de laser. | SOURCE_INPUT | Conteo | No / Si si aplica | Entero mayor o igual a 0. | Fuente desde reporte. | Uso de equipo | |
| `Sistema súper inductivo con campo` | Equipos especiales | `super_inductive_system_sessions` | Uso o cantidad del sistema inductivo. | SOURCE_INPUT | Conteo | No / Si si aplica | Entero mayor o igual a 0. | Fuente desde reporte. | Uso de equipo | |
| `Terapia de radiofrecuencia selectiva` | Equipos especiales | `selective_radiofrequency_sessions` | Uso o cantidad de radiofrecuencia. | SOURCE_INPUT | Conteo | No / Si si aplica | Entero mayor o igual a 0. | Fuente desde reporte. | Uso de equipo | |
| `Magnetoterapia con campos magnéticos focalizados` | Equipos especiales | `focused_magnetotherapy_sessions` | Uso o cantidad de magnetoterapia. | SOURCE_INPUT | Conteo | No / Si si aplica | Entero mayor o igual a 0. | Fuente desde reporte. | Uso de equipo | |
| `Equipo combinado de electroterapia avanzada y ultrasonido` | Equipos especiales | `combined_electro_ultrasound_sessions` | Uso o cantidad de equipo combinado. | SOURCE_INPUT | Conteo | No / Si si aplica | Entero mayor o igual a 0. | Fuente desde reporte. | Uso de equipo | |
| `Cantidad de clientes deportistas` | Clientes | `athlete_clients` | Clientes del segmento deportistas. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0; suma de segmentos debe reconciliar total. | Fuente desde cierre. | Segmentacion clientes | |
| `Cantidad de clientes 3era Edad` | Clientes | `older_adult_clients` | Clientes adultos mayores. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0. | Fuente desde cierre. | Segmentacion clientes | Normalizar etiqueta. |
| `Cantidad de clientes Pediatricos` | Clientes | `pediatric_clients` | Clientes pediatricos. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0. | Fuente desde cierre. | Segmentacion clientes | |
| `Cantidad de clientes publico general` | Clientes | `general_public_clients` | Clientes de publico general. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0. | Fuente desde cierre. | Segmentacion clientes | |
| `Cantidad de Clientes Totales` | Clientes | `clients_total` | Total de clientes atendidos. | SOURCE_INPUT | Conteo | Si / Si si no hay conector | Entero mayor o igual a 0; debe ser >= suma de segmentos si los segmentos son exhaustivos. | Fuente desde cierre. | Clientes, ticket por cliente | Confirmar si cliente equivale a paciente unico o atencion. |
| `Variación de clientes respecto al mes anterior` | Clientes | `clients_monthly_variation` | Cambio de clientes contra periodo anterior. | DERIVED_KPI | Conteo / porcentaje | No / No | Requiere clientes del periodo actual y anterior. | Excel calcula. | Tendencia clientes | No capturar manualmente. |
| `Cantidad promedio diaria de Clientes` | Clientes | `average_daily_clients` | Promedio diario de clientes. | DERIVED_KPI | Clientes / dia | No / No | Requiere clientes totales y dias operativos. | Excel divide por dias. | Demanda diaria | Debe usar dias laborados reales, no constante fija. |
| `Renta Local` | Gastos | `rent_expense` | Gasto de alquiler. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0; categoria de gasto autorizada. | Manual. | Costos, utilidad | |
| `Personal` | Gastos | `payroll_expense` | Gasto de personal. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Costos, utilidad | |
| `ISSS/AFP` | Gastos | `social_security_expense` | Prestaciones patronales. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Costos, utilidad | |
| `Energia` | Gastos | `electricity_expense` | Gasto de energia electrica. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Costos, utilidad | Normalizar tilde. |
| `Agua` | Gastos | `water_expense` | Gasto de agua. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Costos, utilidad | |
| `Internet` | Gastos | `internet_expense` | Gasto de internet. | SOURCE_INPUT | Moneda | No / Si | Mayor o igual a 0. | Manual. | Costos, utilidad | |
| `Analiza_Café` | Gastos / consumo | `coffee_expense_or_units` | Gasto o consumo de cafe. | NEEDS_CLARIFICATION | Moneda o conteo | No / Si | Definir si es costo o unidades. | Manual. | Costos o experiencia | El nombre mezcla categoria y unidad. |
| `Total Gastos` | Gastos | `operating_expense_total` | Total de gastos operativos. | SYSTEM_CALCULATED | Moneda | Si / No | Suma de categorias de gasto aprobadas. | Excel suma filas de gastos. | Utilidad, margen operativo | No capturar manualmente. |
| `Utilidad operativa` | Gastos | `operating_profit` | Venta menos gastos operativos. | DERIVED_KPI | Moneda | Si / No | Requiere venta y total gastos. | `revenue_total - operating_expense_total`. | Utilidad | No capturar manualmente. |
| `Utilidad operativa %` | Gastos | `operating_margin_pct` | Margen operativo sobre venta. | DERIVED_KPI | Porcentaje | Si / No | Requiere utilidad y venta > 0. | `operating_profit / revenue_total`. | Margen | No capturar manualmente. |
| `Fisioterapeutas` / `Atención al cliente` / `Pasantias` / `Limpieza` / `Gerentes` | Personal | `staff_count_by_role` | Personal asignado por rol. | SOURCE_INPUT | Conteo | No / Si | Entero mayor o igual a 0; rol desde catalogo. | Excel guarda filas por rol. | Productividad por personal | Debe modelarse como arreglo, no columnas fijas. |
| `Total de personal asignado` | Personal | `staff_total` | Total de personal de la sucursal. | SYSTEM_CALCULATED | Conteo | No / No | Suma de personal por rol. | Excel suma filas. | Productividad por personal | |
| `Total facturado` | Facturacion por usuario | `user_billed_total` | Monto facturado por usuarios de caja. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0; usuario desde catalogo. | Manual/cortes de caja. | Control de caja | Debe venir de sistema de ventas si existe. |
| `Total cantidad de facturas` | Facturacion por usuario | `user_invoice_count_total` | Cantidad de facturas por usuarios. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero mayor o igual a 0. | Manual/cortes de caja. | Productividad caja | |
| `Cantidad de facturas por usuario` | Facturacion por usuario | `invoice_count_by_cashier` | Facturas emitidas por usuario. | SOURCE_INPUT | Conteo | No / Si | Usuario desde catalogo; entero >= 0. | Filas fijas con nombres/usuarios. | Productividad caja | Modelar como lista dinamica de usuarios. |
| `Atencion por fisioterapeuta` | Terapeutas | `therapist_attention_count` | Atenciones por terapeuta. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Terapeuta desde catalogo; entero >= 0. | Hojas muestran metas/alcances por persona. | Productividad terapeuta | No usar nombres como campos fijos. |
| `Meta [fisioterapeuta]` | Terapeutas | `therapist_target` | Meta individual del terapeuta. | TARGET | Conteo o moneda | No / No para gerente | Meta aprobada por terapeuta/periodo. | Excel tiene filas por nombre. Sistema debe versionar metas. | Cumplimiento individual | Requiere definir si meta es sesiones o venta. |
| `Alcance % [fisioterapeuta]` | Terapeutas | `therapist_target_attainment_pct` | Cumplimiento individual de terapeuta. | DERIVED_KPI | Porcentaje | No / No | Requiere atenciones reales y meta aprobada. | Excel calcula/lee por persona. | Productividad individual | |
| `Doctor` | `Llenado Medicos Fisio ` | `referring_doctor_id` | Medico referido. | MASTER_DATA | Catalogo | No / Si solo administracion | Catalogo de medicos, especialidad y visitador. | Tabla fuente. | Referidos | Evitar guardar nombres libres sin catalogo. |
| `Especialidad` | `Llenado Medicos Fisio ` | `doctor_specialty_id` | Especialidad del medico. | MASTER_DATA | Catalogo | No / No | Catalogo de especialidades. | Tabla fuente. | Referidos por especialidad | |
| `Visitador` | `Llenado Medicos Fisio ` | `medical_representative_id` | Visitador asociado. | MASTER_DATA | Catalogo | No / No | Catalogo de visitadores. | Tabla fuente. | Efectividad visitadores | |
| `Cantidad` | `Llenado Medicos Fisio ` | `referral_quantity` | Cantidad remitida por medico/mes. | SOURCE_INPUT | Conteo | No / Si si no hay conector | Entero >= 0. | Tabla fuente. | Referidos | |
| `Monto` | `Llenado Medicos Fisio ` | `referral_revenue` | Venta remitida por medico/mes. | SOURCE_INPUT | Moneda | No / Si si no hay conector | Mayor o igual a 0. | Tabla fuente. | Referidos | |
| `Mes` | `Llenado Medicos Fisio ` | `referral_period` | Periodo de la relacion de referido. | MASTER_DATA | Mes | Si / No | Calendario. | Tabla fuente. | Referidos | |
| `CANTIDAD DE CUBICULOS` | Capacidad | `treatment_room_count` | Cubiculos disponibles. | SOURCE_INPUT | Conteo | No / Si | Entero > 0 si se mide capacidad. | Manual. | Capacidad | |
| `CAPACIDAD INSTALADA POR CUBICULOS` | Capacidad | `room_installed_capacity` | Capacidad teorica por cubiculos. | SYSTEM_CALCULATED | Sesiones o horas | No / No | Requiere cubiculos, horario, dias laborados y regla de duracion. | Excel usa constantes. Sistema debe parametrizar. | Capacidad | La unidad no esta documentada. |
| `CAPACIDAD INSTALADA POR LICENCIADA` | Capacidad | `therapist_installed_capacity` | Capacidad teorica por terapeuta/licenciada. | SYSTEM_CALCULATED | Sesiones o horas | No / No | Requiere terapeutas, horario, dias laborados y regla de duracion. | Excel usa constantes. Sistema debe parametrizar. | Capacidad/productividad | La unidad no esta documentada. |
| `CANTIDAD DE CITAS CANCELADAS` / `TOTAL CANCELADAS` | Agenda | `cancelled_appointments` | Citas/sesiones canceladas. | SOURCE_INPUT | Conteo | No / Si | Entero >= 0; no excede citas programadas si se captura. | Aparece en `CONSOLIDADO`. | Cancelaciones | No hay `citas_programadas`, por lo que la tasa no es calculable hoy. |
| `SESIONES COMPLETADAS` por aseguradora | Aseguradoras | `completed_sessions_by_payer` | Sesiones completadas por aseguradora o sin aseguradora. | SOURCE_INPUT | Conteo | No / Si si aplica | Payer desde catalogo; entero >= 0. | `CONSOLIDADO` usa filas por aseguradora. | Sesiones por pagador | Modelar como arreglo por aseguradora. |
| `SESIONES CANCELADAS` por aseguradora | Aseguradoras | `cancelled_sessions_by_payer` | Sesiones canceladas por aseguradora o sin aseguradora. | SOURCE_INPUT | Conteo | No / Si si aplica | Payer desde catalogo; entero >= 0. | `CONSOLIDADO` usa filas por aseguradora. | Cancelaciones por pagador | |
| `MONTO [aseguradora]` | Aseguradoras | `payer_revenue` | Monto por aseguradora o pagador. | SOURCE_INPUT | Moneda | No / Si si aplica | Payer desde catalogo; mayor o igual a 0. | `CONSOLIDADO`. | Revenue por pagador | |
| `PROYECCION $` | `Proyeccion Fisio` | `revenue_projection_amount` | Proyeccion de venta mensual. | SYSTEM_CALCULATED | Moneda | No / No | Requiere venta acumulada, dias transcurridos y dias laborables. | Excel promedia por dia de semana. | Forecast | No debe capturarse. |
| `PROYECCION %` | `Proyeccion Fisio` | `revenue_projection_attainment_pct` | Proyeccion contra meta. | DERIVED_KPI | Porcentaje | No / No | Requiere proyeccion y meta. | `projection / target`. | Forecast de cumplimiento | |
| `Total Días` / `CANTIDAD DIAS LABORALES DEL MES` | `Proyeccion Fisio` | `working_days_in_period` | Dias laborables usados para proyectar. | MASTER_DATA | Dias | Si / No | Calendario operativo por sucursal. | Manual/contado en Excel. | Forecast | Debe venir de calendario operativo. |
| `Observaciones` | No existe explicitamente | `closure_observations` | Comentarios del cierre. | PROPOSED_FIELD | Texto | No / Si | Longitud maxima, sin PII innecesaria. | No existe. | Contexto ejecutivo | Recomendado para explicar brechas. |
| `Horas disponibles` | No existe | `available_hours` | Horas disponibles para atencion. | PROPOSED_FIELD | Horas | No / Si si se quiere ocupacion | Mayor o igual a 0. | No existe. | Ocupacion | Necesario para ocupacion real. |
| `Horas agendadas` | No existe | `scheduled_hours` | Horas con citas agendadas. | PROPOSED_FIELD | Horas | No / Si si se quiere ocupacion | `<= available_hours`. | No existe. | Ocupacion agendada | |
| `Horas atendidas` | No existe | `attended_hours` | Horas efectivamente atendidas. | PROPOSED_FIELD | Horas | No / Si si se quiere ocupacion | `<= scheduled_hours`. | No existe. | Ocupacion efectiva | |
| `No-show` | No existe | `no_show_appointments` | Citas no asistidas sin cancelacion previa. | PROPOSED_FIELD | Conteo | No / Si si se quiere no-show | Entero >= 0; requiere citas programadas. | No existe. | No-show | No inventar desde canceladas. |

## Campos Que La Gerente No Debe Calcular

| Campo Excel | Motivo | Calculo recomendado |
| --- | --- | --- |
| `Alcance % de la meta` / `CUMPLIMIENTOS DE VENTA (%)` | Es porcentaje derivado. | `revenue_total / target_revenue`. |
| `TICKET PROMEDIO TOTAL` | Depende de venta y ordenes. | `revenue_total / orders_total`. |
| `% mixto`, `% en tarjeta`, `% en efectivo`, `% en crédito` | Son participaciones. | `payment_method_revenue / revenue_total`. |
| `Venta por pacientes sin médico` | Puede derivarse si existe venta por orden medica. | `revenue_total - referred_revenue`. |
| `Número de ordenes sin médico` | Puede derivarse si existe ordenes medicas. | `orders_total - referred_orders`. |
| `Terapia por ... (%)` | Es mix de servicio. | `service_count / sessions_total` o `service_revenue / revenue_total`, segun definicion aprobada. |
| `Variación de clientes respecto al mes anterior` | Es comparativo temporal. | `clients_current - clients_previous` y porcentaje. |
| `Cantidad promedio diaria de Clientes` | Es promedio. | `clients_total / working_days`. |
| `Ticket promedio Ordenes pagadas` | Es ratio. | `paid_revenue / paid_orders`. |
| `Total Gastos` | Es subtotal. | Suma de categorias de gasto. |
| `Utilidad operativa` | Es resultado financiero. | `revenue_total - operating_expense_total`. |
| `Utilidad operativa %` | Es margen. | `operating_profit / revenue_total`. |
| `Total de personal asignado` | Es subtotal. | Suma de personal por rol. |
| `Total facturado` y `Total cantidad de facturas` | Son subtotales por usuario. | Suma de filas por usuario/cajero. |
| `Capacidad instalada por cubiculos/licenciada` | Usa reglas de capacidad. | Parametrizar cubiculos, terapeutas, horario, dias y duracion promedio. |
| `PROYECCION $` / `PROYECCION %` | Forecast. | Calculo server-side usando ventas acumuladas y calendario. |

## Formulario Recomendado Fisioterapia

### Paso 1 - Contexto Del Cierre

Campos: periodo, pais, empresa, sucursal, gerente de sucursal, gerente de area, responsable, fecha de corte.

Validaciones: usuario con alcance sobre sucursal; periodo abierto; no existe cierre publicado para la misma sucursal/periodo salvo reemplazo autorizado.

### Paso 2 - Operacion

Campos: ordenes totales, ordenes medicas, ordenes pagadas, cortesias, jornadas, domicilios, clientes totales y segmentos de clientes.

Dependencias: sucursal y periodo; catalogos de segmentos y canales.

### Paso 3 - Produccion / Capacidad

Campos: sesiones totales, cantidad por tipo de terapia, uso de equipos especiales, cubiculos, terapeutas/personas por rol, citas canceladas.

Campos condicionales: equipos especiales solo si la sucursal tiene el equipo activo en catalogo.

Campos propuestos para ocupacion real: horas disponibles, horas agendadas, horas atendidas, citas programadas, no-show.

### Paso 4 - Finanzas

Campos: venta total, venta por forma de pago, venta por canal, gastos por categoria, ventas de medicamento si aplica.

Validaciones: suma de formas de pago debe reconciliar contra venta total con tolerancia aprobada; gastos no negativos.

### Paso 5 - Calidad / Indicadores Especificos

Campos: cliente incognito, sesiones completadas/canceladas por aseguradora, notas de calidad.

Validaciones: aseguradora desde catalogo; completadas + canceladas no debe exceder el total definido para esa aseguradora.

### Paso 6 - Observaciones

Campos: explicacion de variaciones, incidencias operativas, eventos extraordinarios, comentarios para area.

Ayuda: pedir causas, no conclusiones calculadas.

### Paso 7 - Validacion

Preview de errores: totales no reconciliados, campos obligatorios faltantes, valores negativos, metas ausentes, capacidad sin unidad definida.

### Paso 8 - Publicar Cierre

Accion: publicar resultado validado y bloquear edicion directa. Correcciones posteriores deben crear nueva version o reemplazo autorizado.

