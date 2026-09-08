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
