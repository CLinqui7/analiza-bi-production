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
aprobadas, con aprobación y período dentro del alcance. Se comparan contra el
KPI calculable publicado equivalente; la ausencia de meta o de resultado se
expone explícitamente, sin sustitución de datos.

`npm run test:production-directory-integrity` solo consulta el directorio
ddddd2 y no imprime PII. Verifica los 95 slots, distribución por país y línea,
GA/GS, vacantes, y las invariantes de `branch+line` y país.
