# 03 - KPI Data Flow

Fecha: 2026-08-07

## Objetivo

Definir como un dato capturado en un cierre mensual se convierte en KPI confiable.

El KPI no nace en el dashboard. Nace en un cierre validado, publicado y trazable.

## Flujo

```text
Formulario mensual
  -> validacion de campos
  -> cierre publicado
  -> hechos canonicos
  -> calculos KPI
  -> comparacion con metas
  -> insights
  -> dashboards por rol
```

## Capas de datos

### 1. Captura

Datos ingresados por el gerente segun formulario de linea.

Ejemplos:

- sesiones realizadas
- venta total
- ordenes
- estudios realizados
- horas disponibles
- costo de venta
- informes pendientes

### 2. Validacion

Antes de publicar:

- campos requeridos
- tipos correctos
- rangos validos
- conciliacion entre totales
- scope autorizado
- duplicados
- consistencia contra catalogos

### 3. Datos publicados

Solo los cierres publicados alimentan calculos. Un borrador o cierre con errores no debe impactar BI.

### 4. Hechos canonicos

Cada linea debe aterrizar en hechos estructurados:

- `fact_monthly_closure`
- `fact_financial_result`
- `fact_physio_monthly_result`
- `fact_lab_monthly_result`
- `fact_imaging_monthly_result`
- `fact_capacity_result`
- `fact_quality_result`

### 5. KPIs derivados

Cada KPI debe tener contrato:

- id
- nombre
- formula
- numerador
- denominador
- unidad
- periodo
- granularidad
- campos requeridos
- fuente
- lineage
- comportamiento cuando falta dato

## KPIs iniciales por linea

### Fisioterapia

| KPI | Formula conceptual | Campo origen |
| --- | --- | --- |
| Ingreso neto | suma ingreso neto | cierre mensual |
| Sesiones realizadas | suma sesiones realizadas | cierre mensual |
| Ocupacion efectiva | horas utilizadas / horas disponibles | cierre mensual |
| No-show | no-show / citas programadas | cierre mensual |
| Cumplimiento de planes | sesiones realizadas / sesiones indicadas | cierre mensual o agenda |
| Ticket promedio | ingreso neto / pacientes atendidos | cierre mensual |

### Laboratorio

| KPI | Formula conceptual | Campo origen |
| --- | --- | --- |
| Venta total | suma venta total | cierre mensual |
| Ordenes totales | suma ordenes totales | cierre mensual |
| Pruebas procesadas | suma pruebas/procesos | cierre mensual o LIS |
| Costo de venta | suma costo de venta | cierre mensual |
| Margen | venta total - costo de venta | calculado |
| Ticket por orden | venta total / ordenes totales | calculado |
| TAT | entrega - recepcion | LIS/futuro o cierre si existe |

### Imagenes

| KPI | Formula conceptual | Campo origen |
| --- | --- | --- |
| Estudios realizados | suma estudios | cierre mensual |
| Utilizacion de equipo | horas utilizadas / horas disponibles | cierre mensual |
| Informes pendientes | conteo informes pendientes | cierre mensual |
| TAT | entrega informe - estudio | RIS/PACS/futuro |
| Downtime | horas fuera de servicio | cierre mensual |
| Ingreso neto | suma ingreso | cierre mensual |
| Margen | ingreso - costo directo | calculado |

## KPI vs dato

No todo campo es KPI.

Ejemplo:

- Campo: `lab_cost_of_sale`
- KPI derivado: margen
- Insight posible: "Laboratorio Aguilares cumplio venta, pero margen bajo por costo de venta superior a meta."

## Estado de KPI

| Estado | Significado |
| --- | --- |
| Disponible | Dato real validado y calculable |
| Pendiente de cierre | No existe cierre publicado |
| Datos incompletos | Falta campo requerido |
| Requiere conciliacion | Totales no cuadran |
| Sin meta | KPI existe, pero no hay meta aprobada |
| DEMO | Dato simulado o no productivo |

## Codigo actual reutilizable

- `docs/kpi-contracts.md`
- `lib/analytics/kpi-registry.ts`
- `lib/analytics/semantic-bi.ts`
- `tests/macro-sprint2-bi-integrity.test.mjs`
- `lib/data-ingestion/platform.ts`

## Cambios necesarios despues

- Crear un `MonthlyClosureKpiService`.
- Separar calculos por linea de negocio.
- Hacer que cada dashboard lea KPIs desde el mismo servicio.
- Conectar `targets` y `insights` al resultado calculado.
- Persistir resultados por periodo para auditoria y comparacion.

## Regla de oro

Si el cierre no esta publicado, el KPI no existe como resultado oficial.
