# 05 - Insights Architecture

Fecha: 2026-08-07

## Objetivo

Convertir insights en conclusiones especificas, trazables y accionables.

Un insight debe nacer de evidencia real, no de texto generico.

## Requisito minimo

Cada insight debe surgir de:

- dato real
- vs meta
- vs periodo anterior
- vs benchmark permitido

Y debe indicar:

- que ocurrio
- donde ocurrio
- cuanto cambio
- impacto
- posible accion

## Estructura del insight

Campos recomendados:

- id
- period
- country_id
- company_id
- operational_area_id
- branch_id
- business_line
- kpi_id
- insight_type
- priority
- what_happened
- where_happened
- current_value
- target_value
- previous_value
- benchmark_value
- absolute_variation
- percent_variation
- impact
- recommended_action
- confidence
- data_quality_status
- source_closure_id
- source_kpi_result_id
- generated_at
- status

## Tipos de insight

- Incumplimiento de meta
- Riesgo operativo
- Oportunidad de crecimiento
- Perdida financiera
- Capacidad desaprovechada
- Calidad de datos insuficiente
- Tendencia negativa
- Tendencia positiva
- Anomalia

## Ejemplos esperados

### Fisioterapia

No generico:

> "Sucursal Escalon completo 1,240 sesiones en julio, 14% debajo de la meta de 1,440. La brecha equivale a 200 sesiones y esta concentrada en no-show de tarde. Accion sugerida: confirmar citas 24h antes y activar lista de espera."

Evidencia:

- KPI: sesiones realizadas
- real: 1,240
- meta: 1,440
- variacion: -200
- cumplimiento: 86%
- comparador: periodo anterior o benchmark autorizado

### Laboratorio

No generico:

> "Laboratorio Aguilares supero la meta de venta por 6%, pero el margen cayo 4 puntos contra el mes anterior por aumento en costo de venta. Accion sugerida: revisar pruebas con mayor costo unitario y compras urgentes."

### Imagenes

No generico:

> "Imagenes Santa Tecla realizo 420 estudios, 9% sobre meta, pero tiene 58 informes pendientes. El riesgo esta en TAT y experiencia del paciente. Accion sugerida: priorizar backlog por modalidad y fecha de estudio."

## Flujo de generacion

1. Cierre mensual publicado.
2. KPIs calculados.
3. Metas aprobadas cargadas.
4. Comparacion contra meta.
5. Comparacion contra periodo anterior.
6. Comparacion contra benchmark permitido.
7. Motor de reglas detecta brecha.
8. Se calcula impacto.
9. Se genera insight.
10. Se asigna responsable sugerido.
11. Se muestra segun rol y alcance.

## Reglas de bloqueo

No generar insight ejecutivo si:

- no hay cierre publicado
- falta meta aprobada cuando el insight usa meta
- falta periodo anterior cuando el insight habla de tendencia
- falta benchmark cuando el insight habla de benchmark
- data quality esta bajo umbral
- el usuario no tiene acceso al alcance del dato

## Codigo actual reutilizable

- `lib/analytics/insights.ts`
- `components/insights-intelligence-dashboard.tsx`
- `lib/analytics/semantic-bi.ts`
- `lib/analytics/dashboard-validation-agent.ts`
- `docs/analia-data-science-agent.md`

## Cambios necesarios despues

- Crear un `InsightGenerationService` server-side.
- Tomar evidencia desde `kpi_results`, `kpi_targets` y cierres publicados.
- Guardar insights generados y no solo calcularlos en memoria.
- Asociar cada insight a accion, responsable, vencimiento y resultado.
- Separar insights por rol:
  - Gerente Sucursal: solo su sucursal.
  - Gerente Area: sucursales del area.
  - Gerente Operaciones: areas y sucursales.
  - CEO: lectura ejecutiva agregada.

## Regla de lenguaje

Cada insight debe responder en una frase:

Que paso, donde paso, cuanto importa y que hacer.
