# ANALIZA INTELLIGENCE - AUDITORÍA

## 1. Executive Summary

Estado general:

- Critical

Score general: 38/100

Scores:

- Funcionalidad 45/100
- UX/UI 52/100
- Frontend 50/100
- Backend 38/100
- Seguridad 20/100
- Data/BI 34/100
- Performance 58/100
- Integraciones 30/100
- Production Readiness 18/100

Conclusión ejecutiva: ANALIZA INTELLIGENCE no está lista para presentarse a Dirección Ejecutiva ni para producción. La plataforma muestra una base funcional amplia, pero el entorno visible sigue siendo DEMO, expone controles de rol demo, contiene credenciales demo montadas en DOM, permite acceso directo a rutas administrativas para roles de lectura, y varios filtros cambian la URL o el encabezado sin recalcular KPIs. La capa BI tiene inconsistencias aritméticas visibles en Finanzas y varios módulos esperados están parciales, ocultos, inaccesibles desde navegación o en estado placeholder.

Alcance auditado: sesión autorizada en `https://analizabi.site`, navegación normal con Chrome, inspección DOM/Console, pruebas no destructivas de filtros/rutas/roles/responsive y consultas read-only a base de datos para catálogos/RBAC. No se evadió autenticación, CAPTCHA, MFA ni se ejecutaron acciones destructivas o guardados reales.

## 2. Top 10 problemas antes de mostrar a Dirección

| ID | Prioridad | Área | Problema | Impacto | Pantalla | Solución propuesta |
|---|---|---|---|---|---|---|
| TOP-01 | P0 CRÍTICO | SECURITY / AUTH | OBSERVADO: credenciales demo, incluyendo password censurada en este reporte, están montadas en el DOM de una página protegida aunque el formulario mida 0x0. | Riesgo de exposición de credenciales y mala señal de producción. | `/protected/context` | Eliminar credenciales del cliente, mover demo login a entorno aislado, rotar credenciales y agregar secret scanning. |
| TOP-02 | P0 CRÍTICO | RBAC / BACKEND | OBSERVADO: rol Viewer accede por URL directa a `/protected/importaciones`, `/protected/usuarios-permisos`, `/protected/auditoria`, `/protected/capacidad`, `/protected/gerentes`, etc. sin 403. | La seguridad depende del menú; usuarios podrían ver módulos fuera de alcance. | Rutas protegidas directas | Enforce server-side por ruta/API; agregar middleware RBAC y pruebas e2e por rol. |
| TOP-03 | P0 CRÍTICO | DEVOPS / DATA | OBSERVADO DB: organización, países y empresas están `is_demo=true`; UI muestra "Entorno DEMO" y "Las métricas son DEMO". | Bloquea presentación ejecutiva si se pretende mostrar datos reales. | Global | Separar demo/staging/production, limpiar flags DEMO y bloquear deploy productivo con datos demo. |
| TOP-04 | P1 ALTO | BI / QA | OBSERVADO: filtro de sucursal cambia URL/encabezado a `SS - Escalon - L001`, pero la tabla conserva KPIs consolidados de Laboratorio. | Decisiones ejecutivas por sucursal serían incorrectas. | `/protected/overview` | Conectar filtros a queries; validar que cada componente consuma el contexto global. |
| TOP-05 | P1 ALTO | FRONTEND / BI | OBSERVADO: cambiar fecha visible de `2026-07-01` a `2026-07-15` no actualiza URL, encabezado ni KPIs. | Periodos reportados no coinciden con datos visibles. | `/protected/overview` panel Filtros | Agregar `onChange/onBlur` real, aplicar estado y recalcular. |
| TOP-06 | P1 ALTO | DATA / FINANZAS | OBSERVADO: Finanzas Laboratorio muestra venta total `$207,085`, ventas por canal superiores al total y comparativo `2025 venta $905K` con crecimiento `+12%`. | KPIs financieros no confiables ante Dirección. | `/protected/finanzas` | Revisar fórmulas, granularidad, deduplicación y origen por canal/forma de pago. |
| TOP-07 | P1 ALTO | IMPORTACIONES | OBSERVADO: tarjetas "Control de carga", "Carga masiva", "Conectores" e "Historial" parecen botones pero mantienen el formulario mensual. | No se pudo validar flujo XLSX/CSV ni gobierno de importación. | `/protected/importaciones` | Implementar tabs reales o deshabilitarlas con estado claro. |
| TOP-08 | P1 ALTO | DATABASE / RBAC | OBSERVADO DB: `operational_areas_count=0`, `manager_assignments_count=0`, `user_roles_area_null=4/4`. | Jerarquía Gerente Operaciones -> Área -> Sucursal no está poblada como modelo operativo. | DB / Usuarios | Poblar áreas, asignaciones y restricciones de alcance antes de pruebas UAT. |
| TOP-09 | P2 MEDIO | FRONTEND | OBSERVADO Console: React minified error #418 en chunk Next.js, repetido. | Riesgo de hydration mismatch y comportamiento no determinista. | Varias rutas | Reproducir en build no minificado, corregir diferencias SSR/CSR. |
| TOP-10 | P2 MEDIO | RESPONSIVE / UX | OBSERVADO: en mobile 390px se trunca el contexto "Analiza Laboratorio..." y la tabla de KPIs tiene overflow interno. | Mala lectura ejecutiva en móvil/tablet. | `/protected/overview` | Usar layouts de tarjetas en mobile, truncamiento con tooltip y tablas responsivas. |

## 3. Bugs funcionales

### BUG-001

Prioridad: P0 CRÍTICO  
Categoría: SECURITY / AUTH / FRONTEND  
URL: `https://analizabi.site/protected/context?...`  
Pantalla: Selector de contexto

Descripción:

OBSERVADO: El DOM contiene un formulario de login oculto con email demo precargado y password presente en el input password. El valor fue detectado durante inspección DOM y se censura completamente en este documento.

Pasos para reproducir:

1. Abrir `/protected/context` con sesión autenticada.
2. Inspeccionar DOM buscando inputs/links de autenticación.
3. Verificar que el formulario no es visible pero existe con `rect: 0x0`.

Resultado actual:

El formulario oculto contiene `admin.demo@analiza.local` y un password demo `REDACTED`.

Resultado esperado:

No debe existir ningún secreto, password, token o credencial en HTML/DOM del cliente.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Componente de login/demo montado globalmente u ocultado con CSS en vez de desmontarse.

Solución recomendada:

Eliminar credenciales del bundle/DOM, rotar password demo, aislar demo auth, agregar pruebas que fallen si aparece `password.value` en páginas protegidas.

Evidencia:

`evidence-01-context-page.png`; inspección DOM registró formulario 0x0 con password censurado.

### BUG-002

Prioridad: P0 CRÍTICO  
Categoría: RBAC / BACKEND / SECURITY  
URL: `/protected/importaciones`, `/protected/usuarios-permisos`, `/protected/auditoria`, `/protected/capacidad`, `/protected/gerentes`  
Pantalla: Rutas protegidas directas

Descripción:

OBSERVADO: Con rol demo `Viewer`, la navegación lateral sólo muestra Inicio, Resumen, Insights y Mi cuenta. Sin embargo, escribiendo URLs directas se renderizan módulos administrativos y operativos sin pantalla de acceso denegado.

Pasos para reproducir:

1. Seleccionar rol DEMO `Viewer`.
2. Navegar manualmente a `/protected/importaciones`.
3. Repetir con `/protected/usuarios-permisos`, `/protected/auditoria`, `/protected/capacidad` y `/protected/gerentes`.

Resultado actual:

Las páginas se renderizan. En Usuarios y permisos se deshabilitan inputs críticos, pero se muestran catálogos, usuarios y alcance.

Resultado esperado:

Viewer debe recibir 403/redirect o sólo páginas explícitamente permitidas por backend.

Error Console:

No aplica.

Error Network:

No se pudo capturar Network; no hubo mensaje visible de 403.

Posible causa:

RBAC implementado sólo en menú/acciones UI, no como guard de ruta/server component/API.

Solución recomendada:

Crear matriz de permisos server-side, middleware por ruta, autorización por API y pruebas e2e negativas por rol.

Evidencia:

`evidence-02-viewer-usuarios-permisos.png`.

### BUG-003

Prioridad: P0 CRÍTICO  
Categoría: AUTH / RBAC / PRODUCTION READINESS  
URL: Global protegido  
Pantalla: Sidebar inferior "Rol DEMO"

Descripción:

OBSERVADO: Cualquier usuario en esta sesión puede cambiar el select "Rol DEMO" entre Superadministrador, CEO, Gerente de operaciones, Gerente de área, Gerente de sucursal, Usuario operativo y Viewer. Al entrar al dashboard desde el contexto, el rol pasó de CEO/Superadministrador según navegación, alterando módulos visibles.

Pasos para reproducir:

1. Abrir cualquier ruta protegida.
2. Cambiar el select `Rol DEMO`.
3. Observar que el menú cambia y expone módulos por rol.

Resultado actual:

El rol es controlable desde la UI.

Resultado esperado:

En producción no debe existir selector de rol demo. El rol debe venir de sesión/backend.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Entorno demo desplegado en dominio que se pretende auditar como producción.

Solución recomendada:

Feature flag server-side para demo, hard block en producción y validación CI/CD que impida `Rol DEMO` en builds productivos.

Evidencia:

Capturas `evidence-01-context-page.png`, `evidence-02-viewer-usuarios-permisos.png`.

### BUG-004

Prioridad: P1 ALTO  
Categoría: BI / FRONTEND / QA  
URL: `/protected/overview`  
Pantalla: Resumen ejecutivo, panel Filtros

Descripción:

OBSERVADO: Cambiar sucursal de `Todas las sucursales` a `SS - Escalon - L001` actualiza URL y encabezado, pero la tabla "Estado general de las líneas" conserva exactamente `Laboratorio $207K +12% 86% 68% 93,791 $2 Rojo`.

Pasos para reproducir:

1. Abrir `/protected/overview` con El Salvador / Laboratorio / todas las sucursales.
2. Abrir Filtros.
3. Seleccionar `SS - Escalon - L001`.
4. Comparar tabla antes/después.

Resultado actual:

Los KPI no cambian.

Resultado esperado:

Los KPI deben recalcularse para la sucursal seleccionada o mostrar explícitamente que no hay datos por sucursal.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Componentes usan dataset mock/global y no consumen `branch`.

Solución recomendada:

Propagar `branch` al query/modelo BI; añadir tests snapshot por filtro.

Evidencia:

Registro de prueba: URL cambió a `branch=managed-sv-laboratory-ss-escalon-l001`; tabla quedó igual.

### BUG-005

Prioridad: P1 ALTO  
Categoría: BI / FRONTEND / QA  
URL: `/protected/overview`  
Pantalla: Resumen ejecutivo, filtros de fecha

Descripción:

OBSERVADO: Cambiar input `Fecha desde` de `2026-07-01` a `2026-07-15` no actualiza URL, encabezado ni KPI, incluso tras Enter/Tab.

Pasos para reproducir:

1. Abrir Filtros en `/protected/overview`.
2. Editar Fecha desde a `2026-07-15`.
3. Presionar Enter o salir del campo.
4. Observar periodo y tabla.

Resultado actual:

El input visual cambia, pero el periodo sigue `2026-07-01 a 2026-07-31` y la URL conserva `from=2026-07-01`.

Resultado esperado:

Periodo, URL, tablas, tarjetas, insights y gráficas deben recalcularse o validar el rango.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Inputs de fecha no conectados al estado global o falta handler de aplicación.

Solución recomendada:

Centralizar filtros en store/router, aplicar debounce/submit explícito y tests por cambio de rango.

Evidencia:

Prueba DOM: `dates=["2026-07-15","2026-07-31"]`, URL y tabla sin cambio.

### BUG-006

Prioridad: P1 ALTO  
Categoría: UX / BI / FRONTEND  
URL: `/protected/context?country=30000000...&company=40000000...&line=business-line-laboratorio...`  
Pantalla: Selector de contexto

Descripción:

OBSERVADO: La URL contiene país El Salvador, empresa Laboratorio y línea Laboratorio; el header superior refleja El Salvador/Laboratorio, pero los selectores internos "País o región", "Empresa o unidad" y "Línea de negocio" muestran `Vista regional`, `Vista consolidada` y `Consolidado`.

Pasos para reproducir:

1. Abrir URL original con parámetros de El Salvador/Laboratorio.
2. Revisar selector superior y tarjetas de contexto.

Resultado actual:

Contextos contradictorios en la misma pantalla.

Resultado esperado:

Todos los controles deben inicializar desde los parámetros de URL o limpiar la URL al abrir contexto.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Estado local del wizard no sincronizado con query params globales.

Solución recomendada:

Unificar fuente de verdad de filtros; tests de deep link.

Evidencia:

`evidence-01-context-page.png`.

### BUG-007

Prioridad: P1 ALTO  
Categoría: IMPORTACIONES / UX / FRONTEND  
URL: `/protected/importaciones`  
Pantalla: Importaciones operativas

Descripción:

OBSERVADO: Las tarjetas "Control de carga", "Carga masiva", "Conectores" e "Historial y gobierno" parecen tabs/botones, pero al hacer clic se mantiene la vista "Llena el cierre mensual de la sucursal".

Pasos para reproducir:

1. Entrar como Gerente de operaciones.
2. Abrir `/protected/importaciones`.
3. Hacer clic en cada tarjeta superior.

Resultado actual:

No cambia la sección principal ni aparecen inputs de archivo XLSX/CSV.

Resultado esperado:

Cada tab debe activar su flujo o estar deshabilitada con mensaje claro.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Botones sin estado activo o navegación no implementada.

Solución recomendada:

Implementar tabs accesibles con `aria-selected`, routing interno y pruebas por flujo.

Evidencia:

`evidence-03-importaciones-formulario.png`.

### BUG-008

Prioridad: P1 ALTO  
Categoría: FORMS / DATA / ACCESSIBILITY  
URL: `/protected/importaciones`  
Pantalla: Formulario mensual

Descripción:

OBSERVADO: Campos etiquetados visualmente como "Obligatorio" no tienen atributos `required`, `aria-required`, `min`, `max`, `step` ni `pattern`. Ejemplos: Mes reportado, Sucursal reportada, Gerente de sucursal, Gerente de área, Departamento.

Pasos para reproducir:

1. Abrir `/protected/importaciones`.
2. Inspeccionar atributos de inputs/selects visibles.

Resultado actual:

Validación nativa/accesible ausente.

Resultado esperado:

Campos obligatorios deben tener validación frontend accesible y validación backend obligatoria.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Validación visual/manual pendiente.

Solución recomendada:

Usar schema validation compartido, `required`, `aria-invalid`, mensajes por campo y validación server-side.

Evidencia:

Inspección DOM: todos los campos obligatorios muestreados reportaron `required=false`.

### BUG-009

Prioridad: P1 ALTO  
Categoría: BI / DATA / FINANZAS  
URL: `/protected/finanzas`  
Pantalla: Finanzas de laboratorio

Descripción:

OBSERVADO: Finanzas muestra venta total `$207,085`; ventas por canal como Pacientes Analiza `$312K`, DRSV `$226K`, Órdenes médicas `$401K`, Venta directa `$192K`, Convenios `$243K`; formas de pago como Efectivo `$318K`, Tarjeta `$415K`; y comparativo `2025 venta $905K` con crecimiento `+12%`.

Pasos para reproducir:

1. Abrir `/protected/finanzas` con Laboratorio/El Salvador.
2. Leer KPIs de venta total, canales, formas de pago y comparativo anual.

Resultado actual:

Los subtotales visibles superan ampliamente el total y el crecimiento anual no cuadra con 2025 vs 2026.

Resultado esperado:

Subtotales deben reconciliar con total o indicar claramente que son acumulados/diferentes periodos. Crecimiento debe calcularse con la misma base temporal.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Datos demo mezclados, periodos distintos, doble conteo por canal/pago o labels incorrectos.

Solución recomendada:

Crear capa semántica BI con grain explícito, reconciliación contable y tests de invariantes.

Evidencia:

`evidence-04-finanzas-laboratorio.png`.

### BUG-010

Prioridad: P2 MEDIO  
Categoría: BI / OCUPACIÓN  
URL: `/protected/capacidad`  
Pantalla: Capacidad y ocupación

Descripción:

OBSERVADO: En Fisioterapia se distingue "Horas agendadas", "Horas atendidas", "Ocupación efectiva" y "Brecha conversión", lo cual se acerca a la definición esperada. Sin embargo, la tabla usa columna "Brecha meta" con valores como `-13 pts`, que mezcla brecha contra meta con brecha agenda/efectiva. En Laboratorio la unidad cambia a pruebas/procesamiento, lo cual puede ser válido, pero la columna "Brecha meta" ya no representa ocupación agendada menos efectiva.

Pasos para reproducir:

1. Abrir `/protected/capacidad` en Fisioterapia.
2. Leer tarjetas y tabla.
3. Abrir `/protected/capacidad` en Laboratorio.

Resultado actual:

La definición de brecha no es consistente por pantalla/tabla.

Resultado esperado:

Mostrar separadas: ocupación agendada = minutos agendados/minutos disponibles; ocupación efectiva = minutos completados/minutos disponibles; brecha = agendada - efectiva. Para Laboratorio, renombrar a utilización técnica/procesamiento y no llamar ocupación si la unidad no es cita/minuto.

Error Console:

No aplica.

Error Network:

No verificado.

Posible causa:

Modelo BI usa términos comunes para dominios distintos.

Solución recomendada:

Definir diccionario de métricas por línea de negocio y mostrar fórmula/fuente en tooltip.

Evidencia:

`evidence-05-capacidad-fisioterapia.png`.

### BUG-011

Prioridad: P2 MEDIO  
Categoría: FRONTEND / QA  
URL: Varias rutas protegidas  
Pantalla: Navegación general

Descripción:

OBSERVADO: Console registró React minified error #418 en `/_next/static/chunks/4bd1b696-215e5051988c3dde.js`, repetido.

Pasos para reproducir:

1. Navegar entre rutas protegidas.
2. Revisar Console.

Resultado actual:

Error de React minificado #418.

Resultado esperado:

Console sin errores en producción.

Error Console:

`Error: Minified React error #418... at rZ ... at id ... at sh ...`

Error Network:

No verificado.

Posible causa:

Hydration mismatch SSR/CSR.

Solución recomendada:

Reproducir con build no minificado, revisar HTML dinámico, fechas/localización y componentes client/server.

Evidencia:

Console Errors sección 20.

### BUG-012

Prioridad: P2 MEDIO  
Categoría: NAVIGATION / ROUTING  
URL: `/protected/apis`, `/protected/imagenes`  
Pantalla: Rutas directas

Descripción:

OBSERVADO: `/protected/apis` devuelve 404 real. `/protected/imagenes` fue detectada con texto de 404 en el muestreo aunque mostraba heading "Imagenes", lo que sugiere placeholder o routing inconsistente.

Pasos para reproducir:

1. Navegar a `/protected/apis`.
2. Navegar a `/protected/imagenes`.

Resultado actual:

API no existe como módulo protegido; Imágenes requiere validación adicional por texto 404.

Resultado esperado:

Rutas esperadas deben existir o no aparecer en planificación/módulos; placeholders deben estar marcados.

Error Console:

No aplica.

Error Network:

404 route visible para `/protected/apis`.

Posible causa:

Módulos no implementados o rutas legacy.

Solución recomendada:

Inventariar rutas oficiales y crear páginas "Próximamente" con permisos o remover accesos/documentación.

Evidencia:

Inventario de rutas.

### BUG-013

Prioridad: P2 MEDIO  
Categoría: RESPONSIVE / UX  
URL: `/protected/overview`  
Pantalla: Resumen ejecutivo mobile/tablet

Descripción:

OBSERVADO: En 390px el contexto "Analiza Laboratorio · Todas las sucursales · jul 2026" se trunca a "Analiz...", y la tabla "Estado general de las líneas" tiene overflow interno (`scrollWidth 860`, `clientWidth 324`).

Pasos para reproducir:

1. Abrir `/protected/overview` en viewport 390x844.
2. Revisar barra de contexto y tabla inicial.

Resultado actual:

Información clave queda truncada y tabla no se adapta.

Resultado esperado:

Mobile debe priorizar cards apiladas, labels completos o truncamiento con tooltip.

Error Console:

No aplica.

Error Network:

No aplica.

Posible causa:

Tabla desktop reutilizada en mobile.

Solución recomendada:

Crear variante responsive de KPIs por filas/cards.

Evidencia:

`evidence-responsive-mobile-390.png`, `evidence-responsive-tablet-768.png`.

### BUG-014

Prioridad: P3 BAJO  
Categoría: UX / COPY / PRODUCTION READINESS  
URL: Global  
Pantalla: Múltiples

Descripción:

OBSERVADO: Copys como "Entorno DEMO", "6 sucursales DEMO", "Plantillas reales SV DEMO", "Las métricas son DEMO. No usar..." aparecen en pantallas ejecutivas.

Pasos para reproducir:

1. Navegar a Resumen ejecutivo, Finanzas o Capacidad.
2. Revisar badges y notas.

Resultado actual:

La plataforma se percibe como demo/interna.

Resultado esperado:

Producción debe tener datos reales, branding final y microcopy ejecutivo.

Error Console:

No aplica.

Error Network:

No aplica.

Posible causa:

Entorno demo desplegado como sitio principal.

Solución recomendada:

Separar ambientes y usar banners sólo en demo/staging.

Evidencia:

Capturas 01, 03, 04, 05.

## 4. Seguridad y permisos

OBSERVADO:

- El rol `Viewer` sólo muestra 3 módulos visibles, pero accede por URL directa a páginas fuera de menú.
- `Usuarios y permisos` como Viewer renderiza formulario de invitación deshabilitado, tabla de usuarios y catálogos de país/línea/gerencia/sucursal.
- `Importaciones`, `Auditoría`, `Capacidad`, `Gerentes`, `Finanzas` y otros módulos renderizan contenido al escribir URL directa.
- Hay selector `Rol DEMO` en páginas protegidas.
- Hay credenciales demo montadas en DOM oculto, password censurada.

DB read-only:

- `operational_areas_count=0`
- `branches_count=6`
- `profiles_count=4`
- `user_roles_count=4`
- `user_roles_area_null=4`
- `user_country_access_count=8`
- `user_company_access_count=4`
- `user_branch_access_count=6`
- `branch_managers_count=3`
- `manager_assignments_count=0`
- Tablas existen: `assignment_history`, `branch_managers`, `manager_assignments`, `user_branch_access`, `user_company_access`, `user_country_access`.

INFERIDO:

- El frontend tiene control de visibilidad por rol, pero la protección de rutas no parece suficiente.
- La jerarquía de área no está lista para validar "Gerente de Área administra sólo sus sucursales", porque no hay áreas operativas pobladas ni asignaciones manager-area.

NO VERIFICADO:

- No se verificaron APIs privadas ni políticas RLS reales en queries de negocio.
- No se ejecutaron escrituras para probar si backend bloquea submits.

Recomendación:

Implementar un modelo de autorización por sesión en backend y middleware, no sólo UI. Cada endpoint/ruta debe validar país, empresa, área y sucursal permitida. Agregar pruebas automatizadas negativas por rol.

## 5. Usuarios y jerarquía

Jerarquía esperada:

- Gerente de Operaciones crea gerentes de área y sucursales.
- Gerente de Área crea gerentes de sucursal y administra sucursales asignadas.
- Gerente de Sucursal administra sólo su sucursal.

OBSERVADO UI:

- Roles demo disponibles: Superadministrador, CEO, Gerente de operaciones, Gerente de área, Gerente de sucursal, Usuario operativo, Viewer.
- Gerente de operaciones ve 9 módulos visibles, incluyendo Importaciones, Capacidad, Sucursales, Usuarios y permisos.
- Gerente de área ve Gerentes y bonos, Sucursales, Plantillas y Usuarios y permisos.
- Gerente de sucursal ve Insights, Metas, Sucursales, Plantillas y Mi cuenta.
- Viewer ve Resumen, Insights y Mi cuenta, pero puede acceder a rutas ocultas por URL.

OBSERVADO DB:

- `operational_areas` no tiene filas.
- `manager_assignments` no tiene filas.
- `user_roles.operational_area_id` está null en todos los user_roles muestreados.

Riesgo:

La jerarquía existe como narrativa y parcialmente como tabla, pero no como datos operativos completos. No está demostrado que un gerente de área o sucursal quede limitado por backend.

## 6. Dashboard Ejecutivo

OBSERVADO:

- Existe `/protected/overview`.
- Muestra "Resumen ejecutivo", "Estado general de las líneas", venta, crecimiento, margen, ocupación, pacientes, ticket y estado.
- Cumple parcialmente con separar líneas de negocio: Consolidado muestra Fisioterapia, Laboratorio e Imágenes; filtro de línea muestra sólo la línea elegida.
- El primer viewport en desktop es razonablemente ejecutivo.

Problemas:

- Sucursal y gerente actualizan header/URL pero no cambian la tabla principal.
- Fechas del panel filtros no recalculan.
- Selector de contexto interno contradice query params en `/protected/context`.
- Insights siguen genéricos y demo aun al filtrar sucursal/gerente.
- En mobile se pierde información del contexto y la tabla no se adapta.

NO VERIFICADO:

- Fuente real de KPIs.
- Fórmulas backend.
- Comparativo contra metas reales.

## 7. Finanzas

OBSERVADO:

- Existe `/protected/finanzas`.
- Pantalla Laboratorio muestra venta total, alcance de meta, costo directo, margen, comparativo 2025, ventas por canal, formas de pago, costos, rentabilidad, gastos e inventario.
- Se detectan inconsistencias BI:
  - Venta total: `$207,085`.
  - 2025 venta: `$905K`.
  - Crecimiento anual: `+12%`.
  - Canales individuales visibles superan venta total.
  - Formas de pago visibles superan venta total.
  - Proyección `$1.12M` no explica base temporal.

Impacto:

No se puede presentar finanzas a Dirección con esos números sin reconciliación. La plataforma podría inducir decisiones erróneas.

Recomendación:

Crear reconciliación obligatoria: venta total = suma por canal = suma por forma de pago, o mostrar explícitamente si son acumulados YTD, periodos distintos o datasets no comparables.

## 8. Citas

OBSERVADO:

- `/protected/citas` existe por URL directa y muestra "Flujo de pacientes y demanda".
- Contiene pacientes únicos, pacientes nuevos, recurrentes y frecuencia promedio.
- En Resumen ejecutivo se muestran citas completadas, no-show, canceladas y reprogramadas para Fisioterapia.

Problemas:

- No aparece como módulo de menú para varios roles probados.
- No se verificó CRUD ni agenda real.
- No se verificó que citas futuras se excluyan de incumplimiento histórico.

NO VERIFICADO:

- API/fuente de citas.
- Fórmula de éxito de cita.
- Validación de estados futuros vs históricos.

## 9. Ocupación y capacidad

Definición esperada:

- Ocupación agendada = minutos agendados / minutos disponibles.
- Ocupación efectiva = minutos completados / minutos disponibles.
- Brecha = ocupación agendada - ocupación efectiva.

OBSERVADO:

- Fisioterapia: usa horas clínicas disponibles, horas agendadas, horas atendidas, ocupación efectiva y brecha de conversión. Ejemplo Centro: planificada 88%, efectiva 69%, atención exitosa 78%.
- Laboratorio: cambia semántica a capacidad técnica/pruebas procesadas, lo cual es razonable por dominio, pero debe evitar mezclarlo con "ocupación" clínica.
- Tabla usa "Brecha meta" y no "brecha agenda/efectiva".

Riesgo:

La lectura ejecutiva puede confundir brecha contra meta con brecha de asistencia. Para laboratorio, "agendada/efectiva" no debe interpretarse como citas.

## 10. Fisioterapia

OBSERVADO:

- Existe `/protected/fisioterapia` por URL directa.
- Muestra "Comité de resultados de Fisioterapia", filtros de comité y estructura tipo presentación.
- Capacidad de fisioterapia está bastante más alineada con la lógica esperada: agenda vs atendido vs éxito.

Problemas:

- No aparece en menú de CEO observado, sólo como línea activa/selectores o ruta directa.
- Datos siguen DEMO.
- No se verificó integración/scraping de fisioterapia.

NO VERIFICADO:

- Webscraping autorizado, selectores, paginación, sesiones, reintentos.

## 11. Laboratorio

OBSERVADO:

- Laboratorio aparece en línea activa y overview.
- Finanzas de laboratorio es una de las pantallas más desarrolladas.
- Importaciones Laboratorio tiene formulario mensual con sucursales/gerentes reales demo de El Salvador.
- Capacidad Laboratorio usa pruebas, analizadores, estaciones y SLA.

Problemas:

- Finanzas tiene inconsistencias aritméticas.
- Costo por prueba/perfil y margen por prueba/perfil figuran como pendiente.
- Calidad de datos reporta "Costo por prueba incompleto".

## 12. Imágenes

OBSERVADO:

- Imágenes aparece en overview consolidado, con venta `$68K`, margen 27%, ocupación 63%, estudios/informes.
- `/protected/imagenes` fue detectada como ruta directa con heading "Imagenes", pero también con texto 404 en el muestreo.

Problemas:

- Módulo específico parece parcial o inconsistente.
- No se verificó flujo operacional de estudios, equipos, modalidad, tiempos detenidos o informes.

NO VERIFICADO:

- Integración RIS/PACS.
- Calidad de datos de equipos/modalidades.

## 13. Rendimiento de gerentes

OBSERVADO:

- Existe `/protected/gerentes`.
- Renderiza "Gerentes y bonos", métricas de gerentes activos, evaluados, sobre meta, críticos, bono proyectado, retenido, etc.
- Viewer accede por URL directa aunque el módulo no esté en su menú.

Problemas:

- No se observó tabla visible en primer viewport del inventario, sólo KPIs/secciones.
- `manager_assignments_count=0` en DB, lo que debilita el modelo real de asignación.
- Mensaje "Pendiente de cargar capacidad disponible" visible en la ruta.

## 14. Importaciones

OBSERVADO:

- Existe `/protected/importaciones`.
- Tiene formulario mensual, pasos por categorías, historial, botones Guardar avance DEMO y Publicar cierre DEMO.
- Permite seleccionar sucursal, gerente de sucursal, gerente de área y mes.
- Las tarjetas para "Carga masiva" y gobierno no cambian vista.

Problemas:

- No se pudo validar XLSX/XLS/CSV porque no apareció input file ni flujo de carga masiva funcional.
- Campos obligatorios no tienen required/aria-required.
- Botones de guardar/publicar están disponibles visualmente en demo; no se ejecutaron por seguridad.

NO VERIFICADO:

- Mapping, preview, validación de columnas, duplicados, errores de importación, tamaño de archivo, decimales/fechas.

## 15. Integraciones

OBSERVADO:

- Existe `/protected/conectores` por URL directa con "Conectores CRM por línea de negocio" y secciones Laboratorio, Fisioterapia, Imágenes.
- En importaciones se menciona "Manual ahora, conector después".
- Calidad/finanzas mencionan fuente no conectada para algunos datos.

NO VERIFICADO:

- Endpoints, métodos HTTP, duración, retries, último sync, webhooks, scraping.
- No se observaron tokens visibles en las pantallas inspeccionadas. Sí se observó password demo en DOM, tratado como P0.

Recomendación:

Cada integración debe tener tabla de estado: fuente, último sync, registros, errores, retry policy, dueño y fallback manual.

## 16. Calidad de datos

OBSERVADO:

- Existe `/protected/calidad-datos`.
- Muestra "Calidad de datos por AnaliA".
- Hallazgos visibles: costo por prueba incompleto en laboratorio, estados de cita no distinguen cancelación tardía/no-show/reprogramación, Imágenes no siempre captura equipo/modalidad/tiempo detenido, metas sugeridas sin fuente/supuesto/aprobador.
- Overview muestra completitud 82% y "6 sucursales DEMO".

Problemas:

- El propio producto declara brechas críticas de calidad.
- No hay evidencia de bloqueo de publicación cuando faltan campos BI críticos.

## 17. UX/UI

Fortalezas:

- Layout de dashboard ejecutivo es claro en desktop.
- Sidebar agrupa Dirección, Operación, Datos y Sistema.
- Badges de estado ayudan a leer riesgo.

Problemas:

- Mucho copy de DEMO y microcopy interno.
- Algunas tarjetas parecen tabs pero no cambian estado.
- Roles demo visibles reducen confianza.
- En menos de 30 segundos se entiende el negocio general, pero no se puede confiar en filtros/KPIs por inconsistencias.
- Insights son útiles a nivel tema, pero poco accionables: no siempre incluyen dónde exacto, magnitud, impacto económico y acción propietaria.

UX / BI - POCO ACCIONABLE:

- "Crecimiento de ingresos con margen presionado" no identifica sucursal/gerente exacto ni impacto.
- "Datos de capacidad incompletos" no lista responsables ni deadline.

## 18. Responsive

Probado:

- Desktop 1440x900.
- Laptop 1280x800.
- Tablet 768x1024.
- Mobile 390x844.

OBSERVADO:

- 1440: sin overflow detectado.
- 1280: overflow interno del texto de contexto.
- 768: nav colapsa, tabla KPI tiene overflow interno (`scrollWidth 860`, `clientWidth 702`).
- 390: contexto se trunca a "Analiz...", tabla KPI overflow interno (`scrollWidth 860`, `clientWidth 324`).

Recomendación:

Crear versión mobile de tablas como cards y separar el contexto en líneas completas.

## 19. Performance

OBSERVADO:

- Navegación inicial contexto -> overview: ~2.9s.
- Inventario por rutas: aproximadamente 1.3s a 6.6s según pantalla.
- `/protected/sucursales` fue de las más lentas muestreadas (~6.6s).
- `/protected/operacion` y `/protected/capacidad` rondaron ~4.3-4.5s en una pasada.

NO VERIFICADO:

- Lighthouse no se ejecutó.
- Network waterfall no estuvo disponible en la superficie usada.
- La API `performance` no estaba disponible desde el contexto de evaluación del navegador.

Riesgos:

- Tablas y páginas con mucho contenido demo podrían crecer mal con datos reales.
- Render client-side de muchas secciones puede impactar mobile.

## 20. Console Errors

| Error | Pantalla | Archivo | Frecuencia | Prioridad | Posible solución |
|---|---|---|---|---|---|
| `Minified React error #418` | Varias rutas protegidas durante navegación | `/_next/static/chunks/4bd1b696-215e5051988c3dde.js` | 2 veces registradas | P2 MEDIO | Reproducir en modo no minificado, revisar hydration mismatch SSR/CSR, fechas/localización y contenido condicional. |

## 21. Network Errors

| Endpoint | Método | Status | Duración | Pantalla | Prioridad |
|---|---|---:|---:|---|---|
| `/protected/apis` | GET | 404 visible | ~3.6s navegación | Ruta directa | P2 MEDIO |
| `/protected/imagenes` | GET | 404 textual detectado en muestreo | ~3.0s navegación | Ruta directa | P2 MEDIO |

Nota: no fue posible capturar waterfall Network, 4xx/5xx API, payloads ni CORS con la superficie disponible. No se inventan endpoints.

## 22. Funcionalidades faltantes

Must Have producción:

- RBAC server-side por país, empresa, área y sucursal.
- Remover selector Rol DEMO y credenciales demo del cliente.
- Datos reales o ambiente demo claramente separado.
- Filtros globales consistentes en todas las tarjetas, gráficas, tablas e insights.
- Importación XLSX/XLS/CSV funcional con mapping, preview y reporte de errores.
- Validación real de formularios y doble submit.
- Reconciliación BI financiera.
- Auditoría de accesos sensibles y cambios de permisos.
- Error boundaries y consola sin errores.

Should Have:

- Diccionario de métricas por línea de negocio.
- Estados vacíos y "no conectado" uniformes.
- Pruebas e2e por rol y por filtros.
- Responsive ejecutivo pulido.
- Panel de estado de integraciones.
- Fuente/fórmula/meta visible por KPI.

Nice to Have:

- Tooltips ejecutivos de fórmula.
- Export PDF/Excel auditado.
- AnaliA con recomendación, responsable y deadline.
- Modo presentación para Dirección.

## 23. Riesgos de producción

- Exposición de credenciales demo en DOM.
- Acceso a rutas no autorizadas por URL directa.
- Datos demo mezclados con dominio público.
- Filtros que no recalculan, generando reportes falsos.
- Finanzas no reconciliadas.
- Modelo de áreas/asignaciones incompleto.
- Importaciones parciales sin validación de archivo.
- Console errors en producción.
- Integraciones no verificadas.
- Mobile no listo para consumo ejecutivo.

## 24. Quick Wins

- Ocultar/remover `Rol DEMO` fuera de ambiente demo.
- Eliminar formulario auth oculto de páginas protegidas.
- Agregar guard route-level para Viewer.
- Corregir handlers de fecha.
- Conectar branch/manager a overview o mostrar "datos no disponibles".
- Deshabilitar tabs no implementadas de Importaciones.
- Añadir `required`/`aria-required` a campos obligatorios.
- Cambiar tabla mobile por cards.
- Remover/aislar copys "DEMO" en build de producción.
- Resolver React #418.

## 25. Recomendaciones arquitectónicas

- Crear `AuthorizationService` central: rol + país + empresa + área + sucursal + acción.
- Hacer enforcement en server components/API/middleware, no sólo sidebar.
- Crear capa semántica BI con métricas versionadas: fórmula, grain, fuente, filtros soportados, unidad y moneda.
- Implementar pruebas de invariantes: subtotales financieros, porcentajes, rango de fechas, no NaN/Infinity/null.
- Separar ambientes: demo, staging, producción con datos, flags y dominios distintos.
- Crear contrato de filtros globales y pruebas por página.
- Implementar import pipeline: upload -> parse -> mapping -> validation -> preview -> idempotency key -> publish -> audit log.
- Establecer observabilidad: Sentry/frontend errors, API logs, audit trails, sync logs.

## 26. Backlog recomendado

| ID | Epic | Historia | Prioridad | Dependencias | Complejidad estimada |
|---|---|---|---|---|---|
| RBAC-001 | Seguridad | Como usuario, sólo puedo abrir rutas permitidas por mi rol y alcance. | P0 | Matriz permisos | M |
| RBAC-002 | Seguridad | Como backend, valido país/empresa/área/sucursal en cada API. | P0 | AuthorizationService | L |
| SEC-001 | Secrets | Como DevOps, bloqueo credenciales en DOM/bundle y roto credenciales demo. | P0 | Ambientes | S |
| ENV-001 | Producción | Como release manager, separo demo/staging/production y elimino DEMO en producción. | P0 | CI/CD flags | M |
| BI-001 | Filtros | Como CEO, al cambiar sucursal todos los KPIs cambian o muestran no data. | P1 | Contrato filtros | M |
| BI-002 | Filtros | Como usuario, al cambiar fechas se actualizan URL, encabezado, tablas e insights. | P1 | Store/router | S |
| FIN-001 | Finanzas | Como CFO, los subtotales de venta/canal/pago reconcilian con total. | P1 | Capa semántica | L |
| BI-003 | Métricas | Como equipo BI, cada KPI tiene fórmula, fuente, unidad, moneda y grain. | P1 | Diccionario BI | M |
| IMP-001 | Importaciones | Como gerente, puedo subir XLSX/CSV con preview y validación antes de publicar. | P1 | Parser/mapping | L |
| IMP-002 | Importaciones | Como sistema, evito duplicados con idempotency key por sucursal/periodo/tipo. | P1 | Modelo import | M |
| FORM-001 | Formularios | Como usuario, campos obligatorios validan frontend/backend con mensajes claros. | P1 | Schema validation | S |
| QA-001 | E2E | Como QA, tengo pruebas por rol para rutas permitidas/prohibidas. | P1 | RBAC-001 | M |
| QA-002 | E2E | Como QA, tengo pruebas de filtros globales por dashboard. | P1 | BI-001 | M |
| FE-001 | Frontend | Como dev, resuelvo React #418 y mantengo consola limpia. | P2 | Debug no minificado | S |
| RESP-001 | Responsive | Como ejecutivo mobile, veo KPIs como cards sin truncamiento crítico. | P2 | Diseño mobile | M |
| INT-001 | Integraciones | Como operaciones, veo estado de conectores, último sync, errores y retries. | P2 | Sync logging | M |
| DATA-001 | Calidad | Como BI, bloqueo publicación si faltan campos críticos. | P1 | Reglas calidad | M |
| AUD-001 | Auditoría | Como auditor, veo cambios de permisos, exportaciones y accesos sensibles. | P1 | Event logging | M |

## 27. Evidencias

- `evidence-01-context-page.png`: selector de contexto, entorno DEMO, filtros iniciales.
- `evidence-02-viewer-usuarios-permisos.png`: Viewer accediendo a Usuarios y permisos por URL directa.
- `evidence-03-importaciones-formulario.png`: Importaciones muestra formulario mensual; tabs no cambian a carga masiva.
- `evidence-04-finanzas-laboratorio.png`: Finanzas Laboratorio con KPIs y contradicciones.
- `evidence-05-capacidad-fisioterapia.png`: Capacidad Fisioterapia y brechas.
- `evidence-responsive-desktop-1440.png`: Resumen ejecutivo desktop.
- `evidence-responsive-laptop-1280.png`: Resumen ejecutivo laptop.
- `evidence-responsive-tablet-768.png`: Resumen ejecutivo tablet con overflow interno.
- `evidence-responsive-mobile-390.png`: Resumen ejecutivo mobile con truncamiento.

## 28. Información que no fue posible verificar

- Network waterfall completo, 4xx/5xx API, payloads, duplicidad de requests, CORS y timeouts.
- Lighthouse Performance, Accessibility, Best Practices y SEO.
- Seguridad backend final de submits, porque no se ejecutaron acciones de guardar/publicar/invitar/desactivar.
- APIs reales de integraciones, CRM, facturación, webhooks o scraping.
- Tokens/secretos en Network o código fuente descargado.
- Fórmulas backend exactas y SQL de dashboards.
- RLS/policies reales por tabla.
- Comportamiento con usuarios reales no demo.
- Carga real XLSX/XLS/CSV, mapping, preview, importación, reporte de errores y archivos grandes.
- Recuperación de contraseña y creación de cuenta más allá de links visibles.
- Modales profundos, doble submit y cierre de modales en flujos destructivos, porque no se ejecutaron acciones con side effects.
