# Producción BI V7 — validación de turno nocturno

## Decisión de arquitectura

Las pantallas de resultados, sucursales, historial, inicio ejecutivo, metas e
insights consultan la capa V7 de Supabase. La lectura parte de las sucursales
autorizadas para el actor y recupera, en conjuntos acotados, las versiones de
cierre publicadas, sus KPIs calculables y los insights. No hay un fallback al
modelo de datos anterior ni a registros simulados.

Cuando no existen cierres publicados, el BI conserva las sucursales visibles y
expone `Sin cierre publicado`; no inventa ceros, porcentajes, metas, rankings
ni conclusiones. Cuando la fuente V7 no está disponible, muestra el estado de
fuente no disponible sin sustituir valores.

La autorización se vuelve a evaluar en servidor antes de consultar cierres,
KPIs, directorios de gerentes y creación de sucursales. El directorio de bonos
es exclusivo de CEO y administración; GO y GA reciben únicamente nombres y
asignaciones permitidas.

## Rendimiento y controles de interacción

- El snapshot V7 usa una lista de sucursales con alcance aplicado y consultas
  por lote para cierres, KPIs e insights; no ejecuta una consulta por sucursal.
- El contexto oficial carga una vez por encabezado y los filtros del dashboard
  se aplican localmente desde estado borrador a estado aplicado.
- El encabezado actualiza la ruta una sola vez al aplicar y sólo después
  notifica a los consumidores de contexto.
- Los selects con menos de dos valores reales no se renderizan. Para GS con
  una asignación no hay selector; con varias, se utiliza sólo `Asignación`.

La prueba Selenium autenticada registra el tiempo de carga del dashboard GA y
el tiempo del primer clic de aplicar filtros, además de fallar si duplica las
solicitudes iniciales de sesión o contexto. El resultado se guarda localmente
en `artifacts/selenium/authenticated-roles/result.json`, carpeta ignorada por
Git y sin datos organizacionales privados.

La última ejecución contra el build cloud de la rama, con cuatro cuentas QA
efímeras y limpieza verificada, registró 1,228 ms para cargar el dashboard GA
y 45 ms para aplicar el filtro localmente. Ambos resultados cubren datos V7
reales de prueba y no una respuesta simulada; el clic de filtro falla la prueba
si supera 300 ms o si sesion/contexto se solicitan más de una vez.

## Riesgo operativo residual

La organización productiva no tenía cierres V7 publicados durante la
validación. Por esa razón se valida el comportamiento de ausencia de datos y
el diseño no presenta métricas sin fuente. La publicación de un cierre V7 hará
visibles solamente los KPI calculables que ya existan para el alcance del
usuario.
