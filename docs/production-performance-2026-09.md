# Producción: integridad y rendimiento (2026-09)

## Alcance y seguridad

La medición usa el alias productivo con un usuario QA efímero creado y eliminado por `scripts/runtime-service-role-qa.mjs`. Sus grants contienen A/Laboratorio y B/Fisioterapia; C permanece fuera del alcance. El script no imprime contraseñas, cookies, tokens, IDs ni respuestas de negocio.

La denegación directa de escritura contra C devolvió `404` bajo RLS. Se registra como una denegación sin revelación de existencia, no como autorización correcta ni como un `403` inventado.

## Línea base remota

Antes de este cambio, el mismo script efectuó cinco lecturas no-cacheadas por operación desde la misma máquina y alias. Los valores son milisegundos de extremo a extremo del navegador; no son una prueba de carga ni p95.

| Operación | Mediana | Rango | Muestras | Instrumentación de servidor |
| --- | ---: | ---: | ---: | --- |
| Login hasta `/protected` | 890 | una ejecución | 1 | no disponible |
| `/api/context/options` | 1003 | 728–1278 | 5 | no disponible |
| `/api/auth/session` | 565 | 525–1069 | 5 | no disponible |

Una segunda corrida de control, sin cambios desplegados, dio 848 ms de mediana para contexto (759–1019, n=5). Por eso el resultado posterior se comparará contra ambas corridas y se reportará variabilidad, no una mejora porcentual basada en una única muestra.

## Cambios aplicados

- El actor, los grants V7 y las opciones de tenant se deduplican solamente dentro de la solicitud de React; no hay caché de identidad entre usuarios o peticiones.
- Cuando todos los grants son sucursales concretas, contexto consulta solamente esas sucursales, sus líneas, responsables y asignaciones; los grants más amplios siguen el camino completo y mantienen el filtrado final de autorización.
- El snapshot BI usa modos explícitos. Resumen no consulta submissions, versiones manuales, autores ni adjuntos. Historial no consulta cierres publicados, KPI ni insights de dashboard.
- Filtros de país, empresa, área, sucursal y línea se aplican en las consultas antes de la comprobación final `actorCanSee`.
- Versiones de cierre se agrupan una vez por sucursal y línea; las tendencias y la versión oficial usan el mismo índice ordenado.
- `/api/context/options` expone `Server-Timing: app` sin identificadores, SQL, cuerpos ni secretos para separar servidor de red en la medición posterior.
- La ruta de operación ejecutiva renderiza el resumen oficial (`overview`) y no reutiliza el módulo de Insights.

## Medición posterior remota

El candidato final `47da8af` se verificó ya detrás del alias productivo con el mismo QA efímero, región y cinco solicitudes no-cacheadas. La sesión de prueba comprobó A/Laboratorio y B/Fisioterapia, mantuvo C fuera de listas y obtuvo `404` al intentar una escritura directa en C bajo RLS.

| Operación | Antes (mediana) | Después (mediana) | Rango posterior | Muestras |
| --- | ---: | ---: | ---: | ---: |
| `/api/context/options` | 1003 ms | 745 ms | 678–1013 ms | 5 / 5 |
| `/api/auth/session` | 565 ms | 582 ms | 467–694 ms | 5 / 5 |

La mejora de contexto frente a la primera línea base es 258 ms (26 %). Frente a la corrida de control previa (848 ms) es 103 ms (12 %); esta segunda comparación es más conservadora y se reporta porque las muestras son pequeñas. `Server-Timing: app` posterior quedó entre 529.9 y 892.3 ms. El tiempo de login y sesión no se presentan como mejoras: la red varió entre corridas.

## Trabajo eliminado y límites

En una vista de resumen se eliminan tres lecturas de historial: submissions manuales, perfiles de autores y adjuntos. En una vista de historial se eliminan tres lecturas de resumen: cierres publicados, resultados KPI e insights. Además, la agrupación de versiones evita repetir `filter` y `sort` por cada combinación sucursal/línea.

No se creó un índice ni una migración: la evidencia mostró trabajo de aplicación y viajes/filas evitables, no un plan SQL lento medido que justificara un cambio de escritura en producción. Aún no hay una medición de carga para dashboards muy grandes ni de carga de archivos; no se presentan como optimizados.

## Cómo repetir

1. Ejecutar `node scripts/runtime-service-role-qa.mjs` con configuración local de administrador ya autorizada.
2. Conservar alias, región de prueba, usuario QA efímero y cinco muestras.
3. Registrar mediana, mínimo, máximo, número de muestras y `Server-Timing`; no comparar `next dev` con producción.
4. Ejecutar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run scan:secrets` y `npm run release:gate` antes de promover.

## Rollback

El rollback consiste en reasignar el alias al deployment anterior verificado o revertir el commit de rendimiento. No requiere cambios de esquema, migraciones, variables de entorno, RLS ni proveedores.

## Navegación protegida: línea base y criterio de aceptación

La línea base se tomó en el alias productivo con una cuenta efímera de gerente de sucursal, grants A/Laboratorio y B/Fisioterapia y sin crear ni publicar cierres. La secuencia fue Resultados → Metas → Resultados → Metas → Mi sucursal → Historial → Formulario. Antes de este cambio, la primera interacción provocó múltiples precargas RSC de enlaces laterales no seleccionados; en la misma corrida, los dos accesos a Metas completaron en 1421 ms y 1158 ms, y el cambio de URL tardó 1057 ms y 796 ms respectivamente.

La navegación lateral ahora desactiva la precarga por visibilidad y precarga solamente la URL exacta —incluidos los filtros— al hover/focus y hasta dos destinos probables después de 1.2 s de inactividad. Se deduplica por sesión y no se precarga con ahorro de datos o red 2G. No se usa caché pública de contenido privado: la autorización y las consultas siguen en servidor por solicitud.

Cada enlace mantiene semántica nativa, modificadores de teclado y clic secundario. Un estado pendiente inmediato, con el destino visible y `aria-busy`, se cierra al cambiar de ruta o por tiempo de seguridad. `loading.tsx` y límites de Suspense entregan un esqueleto autorizado antes de los snapshots BI costosos. El snapshot oficial usa el mismo período predeterminado que muestra la cabecera; así, una cabecera de julio no puede presentar una comparación de metas de agosto al faltar parámetros de período.

La verificación posterior debe registrar por transición: respuesta RSC de la ruta elegida, tiempo de feedback pendiente, cambio de URL y aparición de `data-route-content-ready`; no se interpreta el estado 200 por sí solo como contenido correcto. `scripts/navigation-production-qa.mjs` crea y elimina su usuario y asignaciones en `finally`.

## Navegación: candidato activo `9bd36d2` (2026-09-08)

El deployment activo es `dpl_H2B8XceMAhVEXuTaM6QYwWHSUuQz`, en IAD1, con los alias `https://web-clinqui7s-projects.vercel.app` y `https://web-eta-peach-44.vercel.app`. Se publicó desde un archivo limpio de ese SHA; no incluyó cambios locales ajenos.

La barra protegida conserva enlaces nativos. Una intención por hover/foco o las dos rutas probables tras 1.2 s habilita `prefetch={true}` en ese enlace exacto. Esta es la API pública de Next 16.2.10 para traer la ruta completa dinámica; no se usa una caché HTTP pública ni se comparte contenido entre sesiones. La intención se limita a 12 URLs por sesión, respeta ahorro de datos/2G y conserva los filtros URL vigentes.

La medición se hizo contra el alias con un gerente de sucursal QA efímero, grants A/Laboratorio y B/Fisioterapia, y sin registrar cuerpos, IDs, cookies ni datos de negocio. `contentReadyMs` espera el marcador de contenido final; no cuenta el shell, el cambio de URL ni el skeleton como éxito.

| Ruta | Escenario | Clic → feedback | Clic → contenido correcto | RSC iniciado tras clic |
| --- | --- | ---: | ---: | --- |
| Resultados | primera no preparada | 54 ms | 1644 ms | 3 respuestas; headers 141, 160 y 256 ms |
| Metas | preparada tras estabilizar la ruta anterior | 48 ms | 67 ms | ninguna |
| Resultados | revisita | 45 ms | 64 ms | ninguna |
| Metas | revisita | 44 ms | 60 ms | ninguna |
| Mi sucursal | preparada | 35 ms | 54 ms | ninguna |
| Historial | primera no preparada | 43 ms | 1111 ms | 3 respuestas; headers 126, 143 y 241 ms |
| Formulario | primera no preparada | 40 ms | 1135 ms | 3 respuestas; headers 146, 219 y 263 ms |

La comprobación adicional de intención por hover (tres clics) obtuvo 54 ms de mediana, 52–61 ms de rango, desde el clic hasta contenido. El tiempo de preparación se reporta aparte (1841–1853 ms) y no se suma ni se oculta dentro de la métrica de clic. Esas transiciones no iniciaron RSC después del clic.

Por tanto, el objetivo de 300 ms se cumple en esta muestra para las rutas preparadas y revisitas (54–67 ms, seis transiciones); el feedback cumple en las siete rutas observadas (35–54 ms). No se cumple todavía para primeras entradas no preparadas: 1111–1644 ms. Sus headers RSC llegan en 126–263 ms, por lo que el tramo dominante es posterior al primer byte: composición dinámica privada/streaming y activación del contenido. Las corrientes RSC de esas rutas pueden permanecer abiertas tras aparecer el contenido, así que su finalización no se usa como indicador de pantalla útil.

La diferencia frente a la corrida rápida previa de revisitas (mediana 1411 ms) se interpreta sólo para el escenario preparado/revisitado equivalente; no se extrapola a primeras cargas ni a otras redes. La próxima optimización, si se autoriza una nueva fase, debe instrumentar por separado las consultas y la hidratación de esas tres primeras entradas antes de cambiar índices, regiones o políticas de caché.

La matriz funcional autenticada de producción terminó con `authenticatedRoles: PASS` y `qaCleanup: PASS`. Además, `runtime-service-role-qa` confirmó A y B permitidas, C denegada, escritura directa a C denegada con `404`, filtros correctos y runtime de service role correcto. La prueba de Metas ahora espera su marcador de contenido final después del streaming; valida el período explícito, meta aprobada, resultado publicado y cálculo de cumplimiento, no el skeleton inicial.

## Segunda optimización: primeras entradas sin precarga (2026-09-09)

El candidato de código `5e2d47a` está publicado como `dpl_Annz4MuPqZhXxZeHE66RvYn7uFvD` (IAD1) detrás de `https://web-clinqui7s-projects.vercel.app`. Se desplegó desde un archivo limpio: no incluye `next-env.d.ts` ni trabajo local ajeno. El deployment anterior `dpl_CDx2HyS5vmeqNZ5Egtx8W1BBV9fN` queda disponible como rollback.

### Cambio acotado y seguridad

`/protected/plantillas` y `/protected/metas` ahora tienen entradas estáticas propias y no atraviesan el despachador dinámico de módulos protegidos. Esto evita que la primera transición de esas dos pantallas solicite el conjunto de módulos no relacionados. La autorización, los grants y los filtros por organización, sucursal, línea y período siguen en servidor por petición; no se añadieron cachés HTTP públicas, índices, migraciones, cambios de región ni dependencias.

El marcador de diagnóstico sólo acepta un identificador QA opaco de 24 caracteres hexadecimales y contiene tiempos y nombres de etapas, nunca filtros, cuerpos, IDs de negocio, credenciales ni cookies. La cuenta QA efímera crea sólo grants A/Laboratorio y B/Fisioterapia, no escribe cierres, y se elimina junto con profile y grants en `finally`. La comprobación posterior obtuvo `QA_REMAINING=0`.

### Metodología corregida

El runner `scripts/first-navigation-production-qa.mjs` conserva el período explícito `2026-07-01` a `2026-07-31`, usa un contexto de navegador nuevo para cada primera visita y registra las solicitudes RSC que comienzan antes del clic. URL y marcador de contenido final se esperan en paralelo: el indicador de contenido no queda detrás de una espera auxiliar de URL. El navegador registra por petición headers, primer y último byte RSC, bytes/scripts posteriores, tareas largas y aparición del marcador; la traza del servidor correlaciona autenticación, grants, catálogos, consultas y composición.

Cada muestra A tuvo cero solicitudes objetivo antes del clic. El control funcional no se limita a URL o skeleton: Formulario edita y restaura un campo sin guardar; Historial y Resultados esperan su vista BI y verifican el bloqueo de alcance de sucursal; Metas verifica el bloqueo de alcance. Los valores siguientes son muestras remotas, no pruebas de carga ni p95.

| Ruta | Escenario A: no visitada, sin precarga | Feedback (ms) | Contenido final (ms) | Usable (ms) | Muestras |
| --- | --- | ---: | ---: | ---: | --- |
| Formulario | A | 63, 53, 49 | 819, 854, 815 | 993, 1031, 1007 | 3 |
| Historial | A | 63, 62, 71 | 844, 812, 826 | 859, 825, 839 | 3 |
| Resultados | A | 46, 55, 50 | 810, 815, 808 | 822, 827, 820 | 3 |
| Metas | A | 61, 54, 57 | 820, 826, 824 | 834, 837, 836 | 3 |

| Ruta | Escenario separado | Feedback (ms) | Contenido final (ms) | Solicitud antes del clic | Muestras |
| --- | --- | ---: | ---: | --- | --- |
| Formulario | B, hover 175 ms | 72 | 836 | sí; todavía no había finalizado | 1 |
| Historial | B, hover 175 ms | 53 | 825 | sí; todavía no había finalizado | 1 |
| Resultados | B, hover 175 ms | 51 | 835 | sí; todavía no había finalizado | 1 |
| Metas | B, hover 175 ms | 54 | 813 | sí; todavía no había finalizado | 1 |
| Resultados | C, preparado durante 1800 ms | 53 | 95 | sí; completado antes del clic | 1 |
| Metas | D, transición intermedia | 46 | 102 | ruta en caché del router | 1 |
| Resultados | D, revisita | 33 | 89 | ruta en caché del router | 1 |

### Trazas y decisión

En A, los headers llegaron en 133–172 ms; la última porción RSC observada llegó aproximadamente en 426–558 ms. La autorización inicial más composición de servidor quedó aproximadamente entre 0.27 y 0.36 s en las muestras centrales, con un outlier de grants observado y reportado en otra corrida. Tras separar rutas, el navegador descargó `0 B` de scripts y no tuvo tareas largas después del clic para las 12 muestras A. Antes del cambio, Formulario y Metas descargaban el mismo conjunto de módulos no relacionados (`289,716 B` en la corrida diagnóstica) al abrirse desde la ruta dinámica.

La pantalla final todavía se consolida unos 0.30–0.37 s después del último byte RSC observado. Por ello no se atribuye la demora restante a hidratación: no hubo descarga de JS ni tareas largas en ese tramo. La evidencia apunta a la entrega/consolidación del flujo RSC privado y del router; no se cambian consultas, cachés o infraestructura a ciegas. La meta de 300 ms se cumple para C y D (89–102 ms), y el feedback de todas las rutas A queda por debajo de 100 ms. No se cumple aún para primeras visitas A (medianas aproximadas 819–826 ms).

La comparación temporal anterior de 1111–1644 ms no se mezcla con A: aquella medición no tenía la misma espera paralela de contenido ni los mismos límites de stream. El antes/después directamente demostrado es la transferencia no relacionada, de 289,716 B a 0 B tras el clic; los tiempos A se publican como muestras separadas, sin porcentajes de mejora no comparables.

### Validación y rollback

Se ejecutaron lint, typecheck, la suite de pruebas, escaneo de secretos y build local. La regresión autenticada de producción se repite contra el alias final. El rollback es reasignar el alias a `dpl_CDx2HyS5vmeqNZ5Egtx8W1BBV9fN` o revertir `770a51f`; no requiere esquema, RLS, variables ni proveedores nuevos.

## Tercera optimización: latencia intermitente de autorización y contexto (2026-09-10)

Una nueva corrida A, con tres sesiones limpias por ruta y cero solicitudes previas al clic, mantuvo Formulario en 811–821 ms y Resultados en 819–831 ms. También reveló picos reales: Historial tuvo una muestra de 3386 ms y Metas muestras de 1838, 2365 y 5966 ms. En esos picos no hubo scripts descargados ni tareas largas después del clic; la traza correlacionada ubicó el costo en autorización (hasta 4183 ms), catálogos de contexto (hasta 1215 ms) y snapshot oficial (hasta 1357 ms).

El candidato reduce rondas HTTP sin cambiar la decisión de acceso. La lectura del directorio obtiene perfil, rol activo, sucursal y nombres de alcance mediante relaciones PostgREST verificadas contra el esquema productivo; si una instalación antigua no expone esas relaciones, conserva las consultas compatibles anteriores. Para un actor cuyos grants son todos sucursales concretas, los catálogos padre se obtienen dentro de la consulta de sucursales y el rol dentro de las asignaciones: el bloque paralelo pasa de ocho solicitudes a cuatro. Los actores globales conservan el catálogo completo.

No hay caché pública ni caché de permisos entre peticiones. La asignación activa, su estado y los grants se vuelven a leer en cada solicitud, por lo que revocaciones y cambios de rol siguen siendo inmediatos. No se añadieron índices, migraciones, regiones, dependencias ni datos. La aceptación requiere volver a desplegar un candidato validado y repetir exactamente las muestras A; los picos previos se conservan y no se mezclan con revisitas.

### Resultado desplegado y regresión

El código `9cc0285` se construyó localmente y en Vercel con 71 rutas, y quedó publicado como `dpl_FVGaUoWQjTpmYSvuXJTjQMD7hg9s` en IAD1. Durante la primera regresión autenticada, una lectura de Resultados superó el límite de 15 segundos; se revirtió inmediatamente el alias a `dpl_2G64jPbyqKAbzeGzrx1v93KLrGWo`. El deployment nuevo no registró errores de runtime. Una segunda regresión completa, ejecutada sobre su URL inmutable, terminó con `authenticatedRoles: PASS` y `qaCleanup: PASS`; después de las mediciones aisladas se promovió exactamente ese mismo artefacto, sin reconstruirlo. El alias final resolvió de nuevo al ID nuevo y `/api/health` respondió 200 con `Cache-Control: no-store`.

| Ruta | Escenario A | Feedback (ms) | Contenido final (ms) | Usable (ms) | Muestras |
| --- | --- | ---: | ---: | ---: | ---: |
| Formulario | no visitada, sin precarga | 66, 76, 62 | 804, 829, 799 | 1046, 1017, 1039 | 3 |
| Historial | no visitada, sin precarga | 83, 79, 104 | 825, 1304, 852 | 847, 1325, 891 | 3 |
| Resultados | no visitada, sin precarga | 57, 111, 85 | 824, 843, 815 | 839, 899, 838 | 3 |
| Metas | no visitada, sin precarga | 91, 77, 57 | 808, 804, 799 | 831, 819, 810 | 3 |

Antes del cambio, las tres muestras de Metas fueron 1838, 5966 y 2365 ms a contenido; después fueron 808, 804 y 799 ms. La etapa de autorización bajó de 158–4183 ms a 58–114 ms y los catálogos de contexto de 65–1215 ms a 54–408 ms. La muestra más lenta posterior fue Historial en 1304 ms, asociada a 408 ms de catálogos; no se oculta ni se mezcla con revisitas. Formulario, Resultados y Metas quedaron alrededor de 0.8 segundos a contenido, todavía por encima del objetivo de 300 ms. El navegador descargó 0 B de scripts después del clic en las doce muestras; hubo una sola tarea larga de 52 ms, por lo que el trabajo eliminado y la mejora demostrada corresponden al servidor/Supabase, no a una atribución genérica de hidratación.

### Verificación funcional con un XLSX real

La regresión autenticada se repitió contra el alias productivo usando un archivo `.xlsx` real de 4 KB, generado sin fórmulas y únicamente con valores `DEMO`/QA. Fisioterapia, Laboratorio e Imágenes guardaron el borrador, finalizaron la carga, publicaron el cierre y mostraron el resultado oficial y el historial correspondiente. La interfaz confirmó el nombre del adjunto; el valor cero del archivo se conservó. El mismo recorrido volvió a verificar la paridad autorizada de Gerente de Operaciones con CEO y terminó con `authenticatedRoles: PASS` y `qaCleanup: PASS`. La prueba admite ahora una ruta de evidencia configurable para cubrir tanto CSV como XLSX sin incorporar archivos temporales al repositorio.
