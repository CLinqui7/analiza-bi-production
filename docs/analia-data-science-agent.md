# AnaliA: agente de ciencia de datos para Insights

## Objetivo

AnaliA es la capa de ciencia de datos de la pestaña Insights. Su responsabilidad es monitorear indicadores por linea de negocio, detectar alertas tempranas, priorizar hallazgos y preparar acciones trazables para revision humana.

En el entorno actual funciona como `DEMO`. No mezcla datos demo con datos reales y no presenta predicciones como concluyentes cuando la calidad de datos es insuficiente.

## Tipos de modelos

- Exploratorio: identifica patrones, dispersiones, anomalias y fuentes faltantes.
- Descriptivo: explica variaciones con puentes de volumen, ticket, canal, margen, capacidad o mezcla.
- Predictivo: anticipa riesgo, brecha o tendencia usando historicos validados y umbrales del registro de KPIs.

## Cockpit predictivo por linea

La pestana Insights ahora incluye un cockpit visual de AnaliA Data Science ligado a la linea de negocio activa. El cockpit se alimenta de la nueva carga mensual manual y presenta primero los KPIs que hacen funcionar el sistema:

- Venta total contra meta.
- Cumplimiento de meta.
- Margen calculado desde venta y costo.
- Volumen operativo: ordenes, sesiones o estudios segun la linea.
- Mix de demanda o venta por origen.
- Costo de venta, inventario o costo operativo.
- Calidad y riesgo de datos por sucursal.

En Laboratorio, el cockpit usa explicitamente los campos nuevos del formulario: `lab_financial_target`, `lab_total_sales`, `lab_cost_of_sale`, `lab_total_orders`, `lab_total_clients`, gastos, inventario y `medical_exam_sales_file`. El Excel comercial esperado contiene fecha, sucursal, doctor, examen, especialidad, area, total vendido y visitador.

## Motor de seleccion de graficas

AnaliA no muestra la misma grafica para todos los KPIs. La funcion `selectChartForKpi` decide la visualizacion mas apropiada:

- Linea anual para venta, margen y volumen porque necesitan tendencia y comparacion 2026 versus 2025.
- Barras para cumplimiento contra meta porque la decision depende de un umbral.
- Dona para mix porque muestra participacion por origen.
- Cascada para costo porque explica venta, costo de venta, gastos y contribucion.
- Dispersion para calidad porque compara sucursales por riesgo, margen y tamano.

Cada punto, barra o segmento conserva tooltip con dato exacto para que la lectura sea rapida sin perder detalle.

## Comparacion y prediccion

El cockpit compara:

- KPI actual contra mismo periodo del ano anterior.
- Resultado contra meta.
- Venta contra costo de venta.
- Calidad de datos contra riesgo.

Las predicciones son conservadoras y visibles como `DEMO`. AnaliA calcula una tendencia de proximo mes con el historico mensual disponible y advierte cuando margen, costo o calidad de datos no permiten una conclusion fuerte. No debe aprobar metas, bonos ni acciones automaticamente.

## Alertas tempranas

Cada alerta conserva:

- Linea de negocio.
- Indicador.
- Resultado actual.
- Meta.
- Comparativo.
- Horizonte.
- Score de riesgo.
- Confianza.
- Calidad de datos.
- Modelos usados.
- Insight relacionado.
- Responsable sugerido.
- Ruta al modulo de detalle.

Si falta una fuente esencial, la alerta queda como `Pendiente de conexion de datos` y no inventa resultado operativo, financiero ni clinico.

## Monitoreo

La interfaz muestra un ciclo de monitoreo visible. En produccion, el ciclo debe moverse a backend o job programado:

- Revisar KPIs y plantillas nuevas.
- Ejecutar reglas y modelos.
- Actualizar hallazgos en Insights.
- Crear alertas tempranas.
- Registrar auditoria de fuentes, formulas, filtros y version de modelo.

## Auditoria visual de dashboards

AnaliA tambien revisa cada pestana del BI como una superficie de decision. La auditoria clasifica cada pantalla como `Lectura visual correcta`, `Cargada` o `Muy cargada`, y activa una vista visual cuando la densidad de contenido puede dificultar la lectura ejecutiva.

La validacion por pestana revisa:

- KPI principal visible antes del detalle.
- Comparacion contra meta, periodo anterior o ano anterior.
- Grafica prioritaria para leer la decision sin depender de texto largo.
- Insight accionable con responsable sugerido.
- Estado DEMO, pendiente o dato real claramente marcado.

Cuando una pantalla queda `Cargada` o `Muy cargada`, AnaliA no inventa informacion: reordena la lectura, resalta graficas, reduce friccion visual y deja visible que la vista esta en modo DEMO.

## Burbuja de chat global

AnaliA esta disponible como burbuja flotante en las pantallas protegidas. El usuario puede pedir:

- resumen de los insights mas importantes de la pantalla;
- revision de elementos criticos;
- lectura de la pantalla visible;
- siguiente accion sugerida.
- comparacion contra ano anterior, periodo comparable o 2025.
- estado del propio agente cuando no entiende, contesta otra cosa o esta en modo DEMO.

El chat usa la linea de negocio activa, el modulo actual, la auditoria visual y el texto visible de la pantalla. Cuando `OPENAI_API_KEY` esta configurada en servidor, la burbuja llama a `/api/analia-chat` para que AnaliA responda como agente conversacional de IA usando la pantalla visible y el historial reciente. Si falta la llave o el modelo no responde, vuelve al motor `DEMO` deterministico; no consulta datos privados, no ejecuta acciones y no presenta resultados como reales.

Cada respuesta se presenta en burbujas breves de conversacion: la pregunta del usuario queda separada de la respuesta de AnaliA, con bullets cortos, siguiente paso, fuentes usadas, confianza y una cautela. Antes de responder, el chat filtra navegacion, filtros, botones y textos demasiado largos para evitar que el menu completo se mezcle con los insights. Si el usuario pide algo critico, AnaliA prioriza senales como riesgo, pendiente, alerta, densidad visual o falta de trazabilidad. Si pregunta por mejora contra el ano pasado, AnaliA responde directamente si la mejora es sana, parcial o insuficiente segun crecimiento, margen, meta, ocupacion y estado de la linea activa. Si pregunta por que el chat no contesta bien, AnaliA debe responder sobre su propio estado en vez de generar un resumen del dashboard.

## Seguridad y permisos

AnaliA solo prepara interpretaciones y borradores de accion. No ejecuta acciones sensibles sin confirmacion humana. Credenciales de conectores, llaves privilegiadas, `OPENAI_API_KEY` y validaciones de archivos deben permanecer en servidor. El navegador nunca recibe la llave; solo envia pregunta, modulo, linea activa e informacion visible filtrada.

## Conexion a datos reales

Para reemplazar DEMO:

1. Conectar plantillas validadas, facturacion, agenda, CRM e inventario.
2. Anonimizar identificadores de pacientes antes de analitica.
3. Guardar trazabilidad por archivo, conector, importacion y transformacion.
4. Bloquear insights concluyentes cuando el score de calidad sea insuficiente.
5. Versionar cada modelo y registrar su ultima ejecucion.
