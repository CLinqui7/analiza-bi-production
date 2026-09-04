# Cierre BI: criterios de aceptación

La fuente BI de sucursales usa la unidad estable `branchId:businessLineId`.
Un cambio de `from` o `to` se propaga por URL desde `TenantContextHeader` y
limita en servidor tanto `closing_versions` como los envíos manuales. El
header es la única interfaz para país, línea, área, sucursal, gerente y
período; los tableros reciben ese alcance ya resuelto.

El filtro de gerente utiliza el UUID de perfil de `manager_assignments` o
`branch_managers`; nunca el nombre visible. `Resultados` es una vista agregada
del período, mientras `Sucursales` conserva ranking, matriz, mapa y heatmap.

Las metas de la vista oficial se leen desde `kpi_targets` no-demo, activas o
aprobadas, con aprobación y período dentro del alcance. `period_start` y el
formato histórico `period_month` se normalizan a `YYYY-MM` antes de comparar;
nunca se comparan como cadenas un mes y una fecha. Se comparan contra el KPI
calculable publicado equivalente; la ausencia de meta o de resultado se
expone explícitamente, sin sustitución de datos.

Todos los agregados visibles descartan valores no finitos. En particular,
`Volumen` se muestra como `Sin dato` cuando ninguna fila tiene un KPI de
volumen calculable: no se sintetiza un cero. El mismo alcance URL
`country`, `company`, `area`, `branch`, `line`, `manager`, `from` y `to` se
aplica en Overview, Resultados, Sucursales, Historial y Metas, incluyendo las
fuentes de cierres, historial, tendencias, insights y targets.

El release gate exige integridad read-only del directorio productivo y el
comando explícito `npm run test:e2e:selenium:production-authenticated`; ambos
son condiciones necesarias para declarar un release verde. La Selenium
autenticada crea y limpia fixtures QA para probar cambio julio/agosto,
selección de GS por UUID, meta aprobada con actual/meta/cumplimiento/estado y
dos líneas distintas en la misma sucursal.

`npm run test:production-directory-integrity` solo consulta el directorio
ddddd2 y no imprime PII. Verifica los 95 slots, distribución por país y línea,
GA/GS, vacantes, y las invariantes de `branch+line` y país.
