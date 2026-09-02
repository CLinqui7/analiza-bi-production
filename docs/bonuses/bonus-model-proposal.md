# Bonus Model Proposal

Fecha: 2026-08-13

Alcance: sistema de recomendacion de bonos mensuales para Gerentes de Sucursal y Gerentes de Area en Fisioterapia, Laboratorio e Imagenes.

Este modelo no paga nomina, no ejecuta transferencias y no integra bancos. El sistema recomienda; una autoridad autorizada revisa, aprueba, rechaza o ajusta con razon documentada.

## Principios

- No pagar por ingresos absolutos solamente.
- No usar formula opaca.
- Normalizar por linea, tamano, capacidad, productividad, margen y calidad disponible.
- No usar datos incompletos para bonos finales.
- Mostrar siempre desglose por componente.
- Mantener bono sugerido y bono aprobado separados.
- Registrar razon cuando se ajuste o rechace.

## Rango

- El bono base se define al crear o asignar al gerente.
- Niveles iniciales: Senior USD 400, Middle USD 300, Junior USD 200.
- La formula de recomendacion es: `bono recomendado = bono base x cumplimiento de meta`.
- El cumplimiento se capea a 100% para que el recomendado no supere el bono base autorizado.
- Ejemplo: gerente Senior con bono base USD 400 y cumplimiento de meta de 80% genera USD 320 recomendados.
- Si el resultado no cumple elegibilidad, el monto mostrado debe ser USD 0 o `Pendiente de revision`, no un bono automatico.

## Estados

`ELIGIBLE`

El cierre esta publicado, el periodo esta completo, los KPIs criticos existen, la calidad de datos es suficiente y no hay inconsistencias abiertas.

`REVIEW REQUIRED`

Hay resultado calculable, pero existe una advertencia: calidad limitada, outlier relevante, evidencia pendiente, margen inestable, SLA critico o cierre con observaciones.

`NOT ELIGIBLE`

No existe cierre publicado, faltan KPIs criticos, el periodo esta incompleto, la calidad de datos es insuficiente o hay inconsistencias no resueltas.

## Workflow

SYSTEM RECOMMENDS

El sistema calcula score, componentes, cumplimiento de meta y bono recomendado.

OPERATIONS REVIEWS

Gerente de Operaciones o autoridad autorizada revisa evidencia, periodo, cierre, calidad, nivel gerencial y bono base.

APPROVED

El bono recomendado se acepta.

REJECTED

No se aprueba bono; requiere motivo.

ADJUSTED WITH REASON

Se ajusta monto o estado; requiere razon, usuario, fecha y evidencia.

## Gerente de Sucursal

Indice base sobre 100 puntos:

| Componente | Peso base | Que mide |
| --- | ---: | --- |
| Finanzas | 30% | margen, resultado financiero y salud economica sin premiar volumen puro |
| Operacion | 25% | uso de capacidad, productividad y continuidad operativa |
| Metas | 20% | cumplimiento contra metas aprobadas del periodo |
| Eficiencia/calidad | 15% | SLA, no-show, cancelaciones, TAT, informes, calidad operativa segun linea |
| Calidad y puntualidad del dato | 10% | cierre publicado, puntualidad, completitud y consistencia |

### Fisioterapia

Pesos recomendados:

| Componente | Peso |
| --- | ---: |
| Finanzas | 25% |
| Operacion | 30% |
| Metas | 20% |
| Eficiencia/calidad | 15% |
| Calidad y puntualidad del dato | 10% |

Razon: Fisioterapia depende mucho de convertir agenda en sesiones efectivas. El modelo debe premiar ocupacion real, continuidad y control de no-show, no solo facturacion.

Indicadores disponibles/propuestos:

- Cumplimiento facturacion.
- Margen.
- Ocupacion efectiva.
- Sesiones.
- No-show cuando exista.
- Cancelacion cuando exista.
- Productividad por terapeuta cuando exista.

### Laboratorio

Pesos recomendados:

| Componente | Peso |
| --- | ---: |
| Finanzas | 30% |
| Operacion | 25% |
| Metas | 20% |
| Eficiencia/calidad | 15% |
| Calidad y puntualidad del dato | 10% |

Razon: Laboratorio debe balancear facturacion, margen, pruebas, productividad, calidad y TAT. Venta alta con margen bajo no debe maximizar bono.

Indicadores disponibles/propuestos:

- Cumplimiento facturacion.
- Margen.
- Volumen/pruebas.
- Productividad por orden, tecnico o capacidad.
- Throughput cuando exista.
- Calidad.
- TAT cuando exista.

### Imagenes

Pesos recomendados:

| Componente | Peso |
| --- | ---: |
| Finanzas | 28% |
| Operacion | 27% |
| Metas | 20% |
| Eficiencia/calidad | 15% |
| Calidad y puntualidad del dato | 10% |

Razon: Imagenes necesita balancear facturacion, estudios, utilizacion de equipos, informes pendientes y TAT. Una sede saturada con informes atrasados no debe recibir bono maximo automatico.

Indicadores disponibles/propuestos:

- Cumplimiento facturacion.
- Margen.
- Estudios.
- Productividad por equipo o modalidad.
- Capacidad/utilizacion.
- Informes pendientes cuando exista.
- TAT cuando exista.

## Gerente de Area

El Gerente de Area no debe evaluarse por suma simple de ventas. Su bono debe reflejar calidad de gestion del portafolio.

Indice de area sobre 100 puntos:

| Componente | Peso | Que mide |
| --- | ---: | --- |
| Sucursales en meta | 25% | porcentaje de sucursales que cumplen metas aprobadas |
| Resultado consolidado | 20% | resultado agregado normalizado por cantidad de sucursales |
| Mejora de rezagadas | 20% | avance de sedes con score bajo o brecha negativa |
| Eficiencia y margen | 15% | margen, productividad y capacidad sin depender de volumen |
| Puntualidad/calidad de cierres | 20% | cierres publicados, datos completos e inconsistencias resueltas |

## Thresholds

Nivel y bono base inicial:

| Nivel | Bono base mensual | Lectura |
| --- | ---: | --- |
| Senior | USD 400 | Lidera sucursal o area de mayor impacto, complejidad o responsabilidad. |
| Middle | USD 300 | Lidera operacion estable con responsabilidad gerencial media. |
| Junior | USD 200 | Lidera sucursal o area en curva de crecimiento o menor complejidad. |

Bandas de score para elegibilidad y lectura:

| Banda | Score | Uso |
| --- | ---: | --- |
| Satisfactory | 70 - 74 | Puede recomendar bono proporcional si no hay bloqueo. |
| Strong | 75 - 81 | Puede recomendar bono proporcional con lectura saludable. |
| High | 82 - 88 | Puede recomendar bono proporcional con buena evidencia. |
| Outstanding | 89 - 94 | Puede recomendar bono proporcional con riesgo bajo. |
| Exceptional | 95 - 100 | Puede recomendar hasta el bono base completo si cumple meta. |

Reglas:

- Score menor a 70 no genera bono automatico.
- `REVIEW REQUIRED` puede mostrar monto recomendado, pero no aprobado.
- `NOT ELIGIBLE` muestra USD 0 hasta resolver condicion.
- La banda Exceptional debe ser rara y estar sustentada por datos completos.
- El score no define un monto fijo; controla si el bono calculado por meta puede pasar a revision.
- El bono base se define al crear el gerente. Operaciones lo define para gerentes de area y puede preasignar los gerentes de sucursal a cargo; gerentes de area lo definen para gerentes de sucursal dentro de su area.

## Elegibilidad

No asignar bono si:

- cierre mensual no publicado;
- calidad de datos insuficiente;
- faltan KPIs criticos;
- periodo incompleto;
- hay inconsistencias no resueltas;
- hay outliers criticos sin explicacion;
- se intenta mezclar datos DEMO con datos reales.

## Transparencia Para El Gerente

Cada gerente debe ver:

- Nivel gerencial.
- Bono base mensual.
- Cumplimiento de meta usado para el calculo.
- Bono propuesto.
- Estado.
- Score total.
- Periodo.
- Componentes:
  - Finanzas.
  - Operacion.
  - Metas.
  - Eficiencia/calidad.
  - Calidad dato.
- Texto: "Por que recibo este bono".
- Bloqueos o advertencias.
- Evidencia usada.

## Backtest Con Datos DEMO

Objetivo del backtest:

- Verificar que no premie sucursales grandes injustamente.
- Verificar que no penalice sucursales pequenas por volumen.
- Evitar demasiados bonos base completos.
- Evitar que todo caiga en una sola banda de score.
- Revisar si el resultado tiene sentido operativo.

Criterios esperados:

- Las sucursales con mayor volumen pero margen bajo o calidad insuficiente no deben quedar en la banda maxima.
- Las sucursales pequenas con buena meta, margen, ocupacion y calidad pueden superar a sucursales grandes.
- Las alertas de calidad deben llevar a `REVIEW REQUIRED` o `NOT ELIGIBLE`.
- Gerentes de Area deben reflejar distribucion de sedes, no solo total agregado.

## Auditoria

Cada recomendacion debe registrar:

- periodo;
- linea;
- gerente;
- rol evaluado;
- nivel gerencial;
- bono base;
- cumplimiento de meta;
- sucursales incluidas;
- componentes y pesos;
- score;
- estado;
- bono recomendado;
- reglas de elegibilidad aplicadas;
- aprobador, fecha y razon cuando exista decision humana.

## Seguridad

- Gerente de Sucursal: ve su resultado, no lo aprueba.
- Gerente de Area: ve resultados de su alcance segun politica.
- Gerente de Operaciones: puede revisar, aprobar o ajustar segun permisos.
- CEO: lectura consolidada.

La autorizacion final debe seguir siendo server-side. La UI es solo una capa adicional de experiencia.

## Decision Pendiente De Negocio

Antes de usar este modelo en nomina real, Direccion debe aprobar:

1. pesos por linea;
2. thresholds finales;
3. KPIs criticos por linea;
4. tolerancia de calidad de datos;
5. politica de ajustes;
6. autoridad aprobadora;
7. si el bono de area puede aprobarse cuando una sucursal del area esta `NOT ELIGIBLE`.
