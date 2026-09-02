# Targetable KPIs

Fecha: 2026-08-07

Este documento define que KPIs pueden aceptar metas a partir de las plantillas reales revisadas. Una meta solo debe compararse contra un KPI calculado desde cierre publicado o importacion validada.

## Regla De Metas

Cada meta debe estar asociada a:

- periodo
- pais
- empresa
- linea de negocio
- area operativa cuando aplique
- sucursal
- KPI
- unidad
- direccion esperada
- umbrales
- version
- aprobador

## Meta Mayor Es Mejor

| KPI | Linea | Inputs requeridos | Unidad | Estado con plantilla actual | Comentario |
| --- | --- | --- | --- | --- | --- |
| Facturacion total | Fisioterapia, Laboratorio, Imagenes | `revenue_total` | Moneda | Calculable | Meta principal detectada en las tres plantillas. |
| Cumplimiento de facturacion | Fisioterapia, Laboratorio, Imagenes | `revenue_total`, `target_revenue` | Porcentaje | Calculable | Debe derivarse, no configurarse como input. |
| Ordenes totales | Fisioterapia, Laboratorio, Imagenes | `orders_total` | Conteo | Calculable | Buen KPI operativo si la definicion de orden es uniforme. |
| Sesiones totales | Fisioterapia | `sessions_total` | Conteo | Calculable | Meta valida para fisioterapia. |
| Clientes totales | Fisioterapia, Laboratorio, Imagenes | `clients_total` | Conteo | Calculable | Confirmar si cliente unico o atencion. |
| Estudios totales | Imagenes | `studies_total` | Conteo | Calculable | Meta valida para produccion de imagenes. |
| Estudios por modalidad | Imagenes | `modality_id`, `study_quantity` | Conteo | Calculable | Meta por RX, TAC, ultrasonografia, Doppler, CAAF si negocio lo aprueba. |
| Ingreso por modalidad | Imagenes | `modality_id`, `study_revenue` | Moneda | Calculable | Meta comercial por modalidad. |
| Perfiles realizados | Laboratorio | `profiles_total` | Conteo | Calculable | Confirmar definicion de perfil. |
| Pruebas por area/categoria | Laboratorio | `test_id`, `lab_area_id`, `test_count` | Conteo | Calculable con importacion | Requiere fuente transaccional completa. |
| Venta por ordenes medicas | Fisioterapia, Laboratorio, Imagenes | `referred_revenue` | Moneda | Calculable | Meta comercial de referidos. |
| Ordenes medicas | Fisioterapia, Laboratorio, Imagenes | `referred_orders` | Conteo | Calculable | |
| Venta DRSV | Laboratorio | `drsv_revenue` | Moneda | Calculable | Solo aplica a laboratorio segun plantilla. |
| Domicilios | Fisioterapia, Laboratorio | `home_service_orders` o `home_service_revenue` | Conteo/moneda | Calculable | Elegir si meta es volumen o venta. |
| Utilidad operativa | Fisioterapia, Laboratorio, Imagenes | `operating_profit` | Moneda | Calculable | Requiere gastos confiables. |
| Margen operativo | Fisioterapia, Laboratorio, Imagenes | `operating_margin_pct` | Porcentaje | Calculable | Mejor como meta/rango segun politica. |
| Margen bruto | Laboratorio, Imagenes | `gross_margin_pct` | Porcentaje | Calculable | Requiere costo de venta confiable. |
| Telemedicina venta | Imagenes | `telemedicine_revenue` | Moneda | Calculable con fuente TM | Algunas formulas actuales estan rotas; usar tabla fuente. |
| Lecturas/informes firmados | Imagenes | `report_reading_count` | Conteo | Calculable con importacion | Confirmar equivalencia con informe. |
| Productividad por personal | Todas | `output`, `staff_total` | Ratio | Calculable con definicion | Definir output oficial por linea. |
| Calidad cliente incognito | Todas donde aplique | `mystery_client_score` | Puntaje | Requiere confirmacion | Necesita escala. |

## Meta Menor Es Mejor

| KPI | Linea | Inputs requeridos | Unidad | Estado con plantilla actual | Comentario |
| --- | --- | --- | --- | --- | --- |
| Citas canceladas | Fisioterapia | `cancelled_appointments` | Conteo | Calculable | Meta de reduccion posible. |
| Tasa de cancelacion | Fisioterapia | `cancelled_appointments`, `scheduled_appointments` | Porcentaje | No calculable | Falta citas programadas. |
| No-show | Fisioterapia, Imagenes | `no_show`, `scheduled_appointments` | Porcentaje | No calculable | No existe en plantillas. |
| Costo de venta | Laboratorio, Imagenes | `cost_of_sales` | Moneda | Calculable | Mejor evaluar contra venta/margen. |
| Gastos operativos | Todas | `operating_expense_total` | Moneda | Calculable | Meta de control de gasto. |
| Reprocesos | Laboratorio | `reprocessed_tests` | Conteo/% | No calculable | Campo propuesto. |
| Rechazos | Laboratorio | `rejected_tests` | Conteo/% | No calculable | Campo propuesto. |
| TAT | Laboratorio, Imagenes | `start_at`, `end_at` | Tiempo | No calculable / requiere confirmacion | No usar fecha/hora de factura como TAT. |
| Informes pendientes | Imagenes | `studies_total`, `reports_signed_total` | Conteo | Requiere confirmacion | Depende de definicion de lectura/firma. |
| Downtime equipo | Imagenes | `equipment_downtime_hours` | Horas/% | No calculable | No existe captura de horas. |
| Datos faltantes | Todas | Resultados de validacion | Conteo/% | Calculable | Meta de calidad de datos. |
| Diferencia de reconciliacion | Todas | Total y componentes | Moneda/conteo | Calculable | Meta ideal: 0 o tolerancia aprobada. |

## Meta Rango

| KPI | Linea | Inputs requeridos | Unidad | Estado con plantilla actual | Rango sugerido |
| --- | --- | --- | --- | --- | --- |
| Margen porcentual | Laboratorio, Imagenes | Venta, costo | Porcentaje | Calculable | Minimo aprobado y alerta por cambios extremos. |
| Utilidad operativa % | Todas | Venta, gastos | Porcentaje | Calculable | Minimo operativo y rango esperado. |
| Ticket promedio | Todas | Venta, ordenes/clientes/estudios | Moneda | Calculable | Rango por sucursal/linea; demasiado bajo o alto puede indicar mix o error. |
| Mix de pago | Fisioterapia, Laboratorio | Ventas por forma de pago | Porcentaje | Calculable | Rango por politica de caja/cobranza. |
| Inventario reactivos/insumos/consumibles | Laboratorio | Monto y cantidad por tipo | Moneda/conteo | Calculable | Rango minimo/maximo por rotacion; falta rotacion para exactitud. |
| Promedio diario de clientes | Todas | Clientes, dias operativos | Conteo/dia | Calculable con calendario | Rango por capacidad esperada. |
| Uso de equipo especial | Fisioterapia | Uso por equipo | Conteo | Calculable como volumen | Rango por disponibilidad del equipo. |
| Ocupacion | Fisioterapia, Imagenes | Horas usadas/disponibles | Porcentaje | No calculable | Requiere campos propuestos. |
| Tiempo de espera | Laboratorio | `service_wait_time` | Tiempo | Requiere confirmacion | Rango por servicio cuando se confirme fuente. |

## KPIs Que No Deben Tener Meta Todavia

| KPI | Motivo |
| --- | --- |
| Ocupacion efectiva de fisioterapia | Faltan horas atendidas y horas disponibles confiables. |
| Ingreso por hora de fisioterapia | Faltan horas atendidas. |
| No-show de fisioterapia | Faltan citas programadas y no-show separado de cancelacion. |
| TAT de laboratorio | Faltan timestamps de recepcion y resultado/entrega. |
| Reprocesos y rechazos de laboratorio | No aparecen en plantilla. |
| Utilizacion de equipos de imagenes | Faltan horas disponibles/usadas por equipo. |
| Downtime de imagenes | No aparece en plantilla. |
| TAT de imagenes | Requiere confirmar fecha de estudio vs fecha de firma y llave de union. |
| Informes pendientes de imagenes | Requiere confirmar que lecturas/firma representen informe completado. |

## Salida Obligatoria En Dashboards

Todo KPI con meta debe mostrar:

| Campo | Formula / origen |
| --- | --- |
| META | Meta aprobada vigente para periodo/sucursal/KPI. |
| REAL | KPI calculado desde cierre publicado. |
| VARIACION | `REAL - META`. |
| CUMPLIMIENTO | Segun direccion: mayor-mejor `REAL / META`; menor-mejor `META / REAL` o evaluacion por umbral; rango `dentro/fuera de rango`. |
| ESTADO | `cumplido`, `en_riesgo`, `incumplido`, `sin_meta`, `not_calculable`. |

