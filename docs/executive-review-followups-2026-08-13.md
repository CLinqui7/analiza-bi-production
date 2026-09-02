# Executive Review Follow-ups - 2026-08-13

## Alcance

Resumen de cambios y decisiones posteriores a la reunion con Maria Jose Linqui, Germay Barralaga y Gabriela Guevara.

La regla principal es no inventar datos, metas, encuestas, SLA ni bonos. Toda medicion debe indicar fuente, periodo, responsable y estado de aprobacion.

## Cambios implementables ahora

| Tema | Cambio | Estado |
| --- | --- | --- |
| Fisioterapia mostraba Laboratorio | El contexto visual debe respetar el alcance real de la sesion por empresa y no el ultimo filtro guardado del navegador. | Implementado en UI. |
| Metas/proyecciones | Mostrar Actual, Proyectado y Presupuestado en la lectura de metas. | Implementado en vista general de metas. |
| Mi cuenta | Crear perfil de usuario con foto por URL, nombre, nombre preferido, telefono y cargo. | Implementado con API server-side y migracion nueva. |

## SLA - Primera version recomendada

La medicion debe combinar dos fuentes, sin tratarlas como equivalentes:

| Fuente | Que mide | Captura | Uso inicial |
| --- | --- | --- | --- |
| Autoevaluacion de sucursal | Percepcion del servicio, cumplimiento y fricciones internas. | Encuesta por correo, WhatsApp o QR. | Senal cualitativa y alerta temprana. |
| Evaluacion cruzada externa | Revision por gerente externo o par autorizado. | Formulario estructurado con evidencia. | Validacion operativa y control de sesgo. |

Primera version sugerida:

- Usar autoencuestas como fuente rapida de cobertura.
- Usar evaluacion cruzada para confirmar hallazgos antes de afectar bonos.
- Mostrar cada resultado como `AUTO`, `CRUZADA` o `MIXTA`.
- No mezclar respuestas anonimas con nombres individuales en dashboards ejecutivos.
- No afectar bono si falta evidencia o si la muestra es insuficiente.

## Evaluaciones 180/360

Frecuencia sugerida para aprobar:

- 180: bimensual.
- 360: trimestral o por ciclo gerencial.
- 5 a 10 preguntas por evaluacion.
- Escala recomendada: 1 a 5 con campo de comentario opcional.
- Resultado visible por sucursal, area, linea y periodo.

Fuentes permitidas:

- Correo.
- WhatsApp.
- QR en sucursal.
- Formulario interno autenticado.

Campos minimos:

| Campo | Uso |
| --- | --- |
| periodo | Corte de evaluacion. |
| linea | Fisioterapia, Laboratorio o Imagenes. |
| sucursal | Alcance operativo. |
| tipo_evaluacion | 180, 360, autoevaluacion o cruzada. |
| fuente | correo, WhatsApp, QR o interno. |
| score | Resultado numerico. |
| muestra | Cantidad de respuestas validas. |
| comentario_resumido | Texto anonimizado. |
| evidencia | URL o referencia interna si aplica. |

## Logica de metas

Cada KPI de metas debe mostrar:

| Campo | Definicion |
| --- | --- |
| Presupuestado | Meta aprobada para el periodo. |
| Proyectado | Resultado esperado segun tendencia y supuestos autorizados. |
| Real | Resultado calculado desde cierre publicado o conector aprobado. |
| Cumplido | Real / Presupuestado, ajustado por direccion del KPI. |
| Variacion | Real - Presupuestado. |
| Estado | Cumplido, en riesgo, incumplido o sin datos suficientes. |

Decision pendiente:

- Confirmar si la proyeccion anual usara 30%, 35%, 40% o rangos por linea.
- Confirmar si el crecimiento se calcula sobre venta neta, margen, volumen o score compuesto.
- Confirmar quien aprueba cambios de metas y desde que rol.

## Bonos - Especificacion base

No se debe calcular bono final sin politica aprobada. La plataforma puede mostrar `bono proyectado` mientras el estado sea revision.

Plantilla minima de regla:

| Campo | Descripcion |
| --- | --- |
| periodo | Mes o bimestre del bono. |
| linea | Fisioterapia, Laboratorio o Imagenes. |
| rol | Gerente sucursal, gerente area u otro. |
| KPI base | KPI principal que habilita el bono. |
| peso KPI | Porcentaje del bono asociado al KPI. |
| umbral minimo | Nivel minimo para elegibilidad. |
| acelerador | Regla por superar meta. |
| penalizacion | Regla por calidad, SLA, datos faltantes o incumplimientos. |
| evidencia requerida | Cierre, evaluacion, conector o aprobacion. |
| estado | proyectado, retenido, bloqueado, aprobado o pagado. |
| aprobador | Usuario que autoriza el bono final. |

Regla de seguridad:

- `bono proyectado` puede ser visible.
- `bono aprobado` requiere aprobador, evidencia y periodo cerrado.
- No usar evaluaciones anonimas para sanciones individuales.

## Rollout recomendado

Primera ola:

1. Una sucursal por linea: Fisioterapia, Laboratorio e Imagenes.
2. Un gerente de sucursal por linea.
3. Un gerente de operaciones por linea.
4. CEO o direccion ejecutiva como lectura consolidada.

Capacitacion:

- Sesion 1: login, cambio de contrasena, Mi cuenta y navegacion.
- Sesion 2: cierre mensual por linea.
- Sesion 3: metas, insights, SLA y lectura de resultados.
- Sesion 4: validacion de datos reales y decisiones de rollout.

Gate para avanzar:

- Datos reales cargados sin PII.
- Cierres publicados por las tres lineas.
- Metas aprobadas con fuente.
- SLA primera version definida.
- Politica de bonos aprobada o marcada como pendiente.
