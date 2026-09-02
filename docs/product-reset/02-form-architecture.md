# 02 - Form Architecture

Fecha: 2026-08-07

## Decicion de producto

Cada linea de negocio necesita su propio formulario mensual.

No debe existir un unico formulario generico para Fisioterapia, Laboratorio e Imagenes. El formulario mensual debe ser la version web estructurada de las plantillas Excel que cada linea ya utiliza.

## Lineas

### Fisioterapia

Objetivo del cierre:

- medir sesiones, planes, ocupacion, no-show, ingresos, continuidad y capacidad terapeutica.

Secciones recomendadas:

- Contexto del cierre: periodo, sucursal, gerente, area, fecha de corte.
- Produccion clinica: sesiones realizadas, evaluaciones, planes activos, planes completados.
- Agenda y asistencia: citas programadas, atendidas, no-show, canceladas, reprogramadas.
- Capacidad: terapeutas, horas disponibles, horas utilizadas, horas perdidas.
- Finanzas operativas: ingreso bruto, ingreso neto, descuentos, ticket promedio.
- Calidad operativa: campos faltantes, inconsistencias, comentarios de cierre.

KPIs derivados:

- sesiones
- ocupacion efectiva
- no-show
- cumplimiento de planes
- ingreso neto
- ticket promedio
- margen si existen costos

### Laboratorio

Objetivo del cierre:

- medir ventas, ordenes, pruebas, costos, margen, clientes, domicilios y estados operativos.

Secciones recomendadas:

- Contexto del cierre: periodo, sucursal, gerente, area, fecha de corte.
- Financiero: meta, venta total, costo de venta, gastos relevantes.
- Demanda: ordenes medicas, paciente Analiza, DRSV, domicilios, ordenes totales.
- Produccion tecnica: pruebas procesadas, pruebas rechazadas/repetidas, estados de orden.
- Clientes: clientes totales, Analiza, DRSV, otros segmentos autorizados.
- Calidad y consistencia: suma por origen vs venta total, costo vs margen, ordenes vs clientes.

KPIs derivados:

- facturacion
- ordenes
- pruebas
- costo de venta
- margen
- ticket por orden
- domicilios
- TAT si existe fecha/hora suficiente

### Imagenes

Objetivo del cierre:

- medir estudios, modalidad, uso de equipo, tiempos, informes pendientes, ingresos y costos.

Secciones recomendadas:

- Contexto del cierre: periodo, sucursal, gerente, area, fecha de corte.
- Produccion: estudios realizados por modalidad, estudios repetidos, estudios cancelados.
- Informe y entrega: informes pendientes, entregados, TAT, atrasos.
- Capacidad/equipo: horas disponibles, horas utilizadas, downtime, equipos activos.
- Finanzas operativas: ingreso, costo directo, margen por modalidad si existe.
- Calidad: consistencia entre estudios, informes y facturacion.

KPIs derivados:

- estudios
- utilizacion de equipo
- informes pendientes
- TAT
- downtime
- ingreso neto
- margen

## Workflow del formulario

1. El sistema detecta la sucursal y linea del gerente.
2. El gerente elige periodo.
3. El sistema carga el formulario correcto.
4. El gerente guarda borrador.
5. El sistema ejecuta validaciones en vivo.
6. El gerente envia cierre.
7. El sistema ejecuta validacion server-side.
8. Si falla, muestra errores accionables.
9. Si pasa, publica el cierre.
10. El cierre publicado alimenta KPIs, metas, insights y dashboards.

## Reglas de validacion

Validaciones comunes:

- periodo requerido
- sucursal requerida
- gerente asignado
- pais, empresa, area y sucursal dentro del alcance del usuario
- campos esenciales no vacios
- numeros no negativos
- porcentajes entre 0 y 100
- fecha de corte dentro del periodo
- cierre duplicado bloqueado salvo reemplazo autorizado

Validaciones por linea:

- Fisioterapia: sesiones realizadas no pueden superar capacidad sin alerta; no-show debe reconciliar con citas programadas.
- Laboratorio: venta por origen debe reconciliar con venta total; costo de venta no puede calcular margen si falta.
- Imagenes: informes pendientes no pueden superar estudios realizados; downtime no puede superar horas disponibles.

## Persistencia propuesta

Tablas conceptuales:

- `monthly_closures`
- `monthly_closure_sections`
- `monthly_closure_values`
- `monthly_closure_validation_results`
- `monthly_closure_publications`
- `monthly_closure_audit_events`
- `monthly_closure_attachments`

Campos minimos de `monthly_closures`:

- id
- organization_id
- country_id
- company_id
- operational_area_id
- branch_id
- business_line
- period
- status
- submitted_by
- validated_at
- published_at
- replaced_by_closure_id
- is_demo

## Codigo actual reutilizable

- `components/manual-monthly-entry-dashboard.tsx`: base visual y flujo de pasos.
- `lib/analytics/import-operations.ts`: ya contiene campos y pasos por linea, especialmente Laboratorio.
- `lib/data-ingestion/templates.ts`: plantillas versionadas por dataset.
- `lib/data-ingestion/platform.ts`: validacion, staging, publish, rollback y lineage.

## Codigo que debe cambiar despues

- Separar el formulario mensual en componentes por linea:
  - `PhysiotherapyMonthlyClosureForm`
  - `LaboratoryMonthlyClosureForm`
  - `ImagingMonthlyClosureForm`
- Cambiar almacenamiento local DEMO por persistencia server-side.
- Convertir campos actuales en schemas versionados.
- Crear rutas especificas para:
  - nuevo cierre
  - editar borrador
  - validar
  - publicar
  - historial
  - resultados del cierre

## No hacer en este reset

- No borrar el formulario actual.
- No eliminar importaciones.
- No reemplazar dashboards todavia.
- No modificar migraciones ejecutadas.
- No inventar campos financieros o clinicos no confirmados por plantilla real.
