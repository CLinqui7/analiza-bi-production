# Button Action Matrix

Fecha: 2026-08-13

Alcance: inventario funcional de botones, links, tabs, selects, CTAs y acciones criticas de Analiza Intelligence. Esta matriz no autoriza cambios de RBAC, formulas BI, Closing Engine, RLS, produccion ni migraciones remotas.

Estado de cierre:

- `PASS`: validado por test automatizado, smoke funcional o revision visual reproducible.
- `N/A`: accion no existe como control ejecutable en esta pantalla.
- `CLOSED`: bug corregido dentro de este cierre funcional.

## Acciones Criticas

| Pantalla | Rol | Boton/accion | Resultado esperado | Resultado validado | PASS/FAIL | Bug ID |
| --- | --- | --- | --- | --- | --- | --- |
| Login `/login` | CEO, Operaciones, Area, Sucursal, Viewer | Entrar con credenciales/demo local autorizado | Crea sesion server-side y redirige a contexto/overview segun ambiente | Login demo local validado visualmente; guards de ambiente siguen cubiertos por tests RBAC | PASS | - |
| Login `/login` | Demo local autorizado | Seleccionar perfil DEMO | Solo disponible en `APP_ENV=demo`; no expone passwords | Validado por tests security/RBAC y smoke local | PASS | - |
| Login `/login` | Todos | Mostrar/ocultar contrasena | Cambia visibilidad sin alterar valor ni enviar formulario | Validado visualmente en login responsive | PASS | - |
| Sidebar desktop | CEO | Links permitidos | Muestra solo rutas autorizadas para CEO | Validado por tests navigation/RBAC y smoke visual | PASS | - |
| Sidebar desktop | Gerente Operaciones | Links permitidos | Muestra operacion, cierres, bonos y acciones autorizadas | Validado por tests navigation/RBAC y smoke visual | PASS | - |
| Sidebar desktop | Gerente Area | Links permitidos | Muestra cierres, resultados, sucursales, metas y gerentes segun alcance | Validado por tests navigation/RBAC | PASS | - |
| Sidebar desktop | Gerente Sucursal | Links permitidos | Muestra mi sucursal, importaciones, cierres, resultados y mi cuenta; metas, insights y bonos quedan dentro de la lectura autorizada o bloqueados como pestañas separadas | Validado por tests navigation/RBAC | PASS | - |
| Sidebar desktop | Viewer | Links permitidos | Solo lectura autorizada; sin acciones administrativas | Validado por tests RBAC y URL directa | PASS | - |
| Mobile navigation | Todos | Select/menu de navegacion | Cambia a ruta seleccionada y respeta permisos | Validado en 390 px sin overflow horizontal | PASS | - |
| Header/contexto global | CEO | Pais/empresa/linea/area/sucursal/gerente/profesional/servicio/pagador/fechas | Actualiza URL, encabezado y datos dependientes | Validado visualmente para pais, linea, bonos y rutas principales; tests BI cubren consistencia | PASS | - |
| Header/contexto global | Todos autorizados | Fechas desde/hasta | Actualiza rango y evita datos pegados | Cubierto por tests BI de rango | PASS | - |
| Contexto `/protected/context` | Todos autorizados | Guardar contexto | Persiste contexto y redirige a overview | Validado por smoke login/contexto | PASS | - |
| Overview `/protected/overview` | CEO, Viewer | Select linea/empresa si visible | KPIs/graficas/tablas cambian segun contexto | Cubierto por tests BI y smoke visual | PASS | - |
| Fisioterapia `/protected/fisioterapia` | CEO | Periodos, slides, drilldown, export/share/version demo | Cambia contenido sin mezclar linea ni romper sesion | Ruta validada visualmente; acciones no destructivas permanecen demo/lectura | PASS | - |
| Laboratorio `/protected/laboratorio` | CEO | Selects/tabs presentacion | Cambian lectura tecnica sin mezclar linea | Validado por tests presentation y smoke visual | PASS | - |
| Imagenes `/protected/imagenes` | CEO | Selects/tabs presentacion | Cambian lectura tecnica sin mezclar linea | Validado por tests presentation y smoke visual | PASS | - |
| Cierres `/protected/cierres/nuevo` | Gerente Sucursal | Seleccionar linea | Carga formulario especifico por linea | Cubierto por tests verticales y smoke visual | PASS | - |
| Cierres `/protected/cierres/nuevo` | Gerente Sucursal | Guardar draft/autosave | Guarda borrador y lo recupera tras volver/reiniciar | Cubierto por persistence tests | PASS | - |
| Cierres `/protected/cierres/nuevo` | Gerente Sucursal | Siguiente/anterior/validar/preview/publicar/correccion | Valida server-side, publica, versiona y audita | Cubierto por vertical/persistence/contract tests | PASS | - |
| Historial cierres `/protected/cierres` | Sucursal, Area, Operaciones, CEO | Abrir cierre publicado | Todos ven el mismo cierre segun alcance | Cubierto por persistence contract | PASS | - |
| Resultados `/protected/resultados` | Roles autorizados | Link Nuevo cierre / Resultados | Mantiene contexto y muestra resultados publicados | Validado por tests verticales y smoke visual responsive | PASS | - |
| Metas `/protected/metas` | Roles autorizados | Aprobar DEMO / quitar aprobacion / guardar meta | Cambia estado demo o persiste meta segun permisos | Cubierto por business-control y vertical tests; smoke visual responsive | PASS | - |
| Insights `/protected/insights` | Roles autorizados | Filtros, detalle, evidencia, accion, asignar, relacionado, revisar, resolver/descartar, descargar/copiar | Mantiene evidencia, impacto y accion sin datos viejos | Validado por tests BI y smoke visual responsive | PASS | - |
| Bonos `/protected/gerentes` | Gerente Area | Filtros, ordenar, seleccionar gerente, simulador | Actualiza perfil, desglose, ranking y simulacion sin modificar datos reales; bono recomendado usa bono base por nivel x cumplimiento de meta | Validado por bonus tests y smoke visual | PASS | - |
| Bonos `/protected/gerentes` | Gerente Sucursal | Sin acceso | Usa `/protected/mi-sucursal`; bonos queda para roles superiores en jerarquia | Validado por RBAC/navigation tests | PASS | - |
| Bonos `/protected/gerentes` | CEO | Lectura consolidada | Acceso lectura; no aprueba automaticamente | Corregido y validado por tests/smoke | PASS | BUG-001 |
| Bonos `/protected/gerentes` | Gerente Operaciones | Aprobar/rechazar/ajustar | Ejecuta workflow auditable server-side con razon cuando aplica | Implementado y validado visualmente: APPROVED, ADJUSTED, REJECTED preservan recomendacion original | PASS | BUG-002 |
| Usuarios y permisos `/protected/usuarios-permisos` | Operaciones, Area | Invitar gerente, definir nivel/bono, asignar subordinados | Operaciones crea gerentes de area y preasigna gerentes de sucursal; Area crea gerentes de sucursal dentro de su alcance con bono base | Cubierto por tests de delegacion, invitaciones y migracion | PASS | - |
| Usuarios y permisos `/protected/usuarios-permisos` | CEO, Operaciones | Alta de sucursal | Crea sucursal por pais, linea y area opcional; nace pendiente de gerente y queda bloqueada para datos hasta aceptar gerente de sucursal | Cubierto por tests de delegacion, invitaciones, upload y build | PASS | - |
| Importaciones `/protected/importaciones` | Roles autorizados | Descargar plantilla, subir, validar, publicar, rollback, reemplazar, lineage, fallback | Respeta permisos y audita flujo sin mezclar produccion | Cubierto por ingestion/connectors tests | PASS | - |
| Conectores `/protected/conectores` | Admin | Test, sync, copiar endpoint | Ejecuta server-side sin secretos frontend | Cubierto por connector tests/build | PASS | - |
| Calidad datos `/protected/calidad-datos` | Todos los roles con acceso | Revisar alertas y sugerencias | Muestra datos que no cuadran, datos exagerados y campos utiles por recopilar | Cubierto por data-quality tests existentes | PASS | - |
| Mi cuenta `/protected/configuracion` | Todos | Guardar perfil | Actualiza perfil si editable; demo bloquea edicion sensible | Cubierto por executive readiness tests | PASS | - |
| Logout | Todos | Salir desde sidebar/rutas | Cierra sesion y `/protected` vuelve a exigir auth | Cubierto por RBAC/security tests | PASS | - |
| Browser | Todos | Back/forward/refresh | Mantiene contexto o rehidrata desde URL/storage sin datos pegados | Validado en smoke visual principal y filtros | PASS | - |
| Responsive | Todos | Tabs/selects/menu | Accesible sin scroll horizontal ni botones fuera de viewport | Validado 1440, 1280, 768 y 390 px | PASS | - |

## Bugs Identificados En Matriz

| Bug ID | Prioridad | Estado | Descripcion | Accion |
| --- | --- | --- | --- | --- |
| BUG-001 | P1 | CLOSED | CEO y Gerente de Operaciones no tenian acceso de lectura a `/protected/gerentes`, aunque la politica aprobada de bonos exige lectura consolidada ejecutiva y operativa. | Se corrigio `lib/navigation.ts` y se agregaron assertions en pruebas RBAC/bonus. |
| BUG-002 | P2 | CLOSED | El modulo de bonos mostraba recomendacion y estados, pero no tenia acciones ejecutables y auditables para aprobar, rechazar o ajustar con razon. | Se implemento workflow server-side con endpoint protegido, permisos por rol/alcance, auditoria, razones obligatorias y pruebas. |

No quedan filas `FAIL` ni `PENDING` en el Button Gate funcional de este cierre.
