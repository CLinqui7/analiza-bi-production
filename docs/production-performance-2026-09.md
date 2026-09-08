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

## Cómo repetir

1. Ejecutar `node scripts/runtime-service-role-qa.mjs` con configuración local de administrador ya autorizada.
2. Conservar alias, región de prueba, usuario QA efímero y cinco muestras.
3. Registrar mediana, mínimo, máximo, número de muestras y `Server-Timing`; no comparar `next dev` con producción.
4. Ejecutar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run scan:secrets` y `npm run release:gate` antes de promover.

## Rollback

El rollback consiste en reasignar el alias al deployment anterior verificado o revertir el commit de rendimiento. No requiere cambios de esquema, migraciones, variables de entorno, RLS ni proveedores.
