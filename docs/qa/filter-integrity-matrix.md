# Filter Integrity Matrix

Fecha: 2026-08-13

Alcance: integridad de filtros globales y filtros por modulo en Analiza Intelligence.

Principio: ninguna tarjeta, grafica, tabla, insight, meta, resultado o bono debe ignorar el contexto activo. Este cierre no modifica formulas BI, Closing Engine, RLS, persistencia ni navegacion aprobada.

## Filtros Individuales

| Filtro | Pantallas impactadas | Resultado esperado | Evidencia | PASS/FAIL | Bug ID |
| --- | --- | --- | --- | --- | --- |
| Pais | Overview, Resultados, Lineas, Sucursales | Limita datos a pais seleccionado y actualiza encabezado/URL | Validado visualmente cambiando a El Salvador; tests BI cubren contexto | PASS | - |
| Empresa | Overview, Resultados, Lineas, Metas | Limita empresa/unidad de negocio | Validado por dependencias de linea/empresa y tests BI | PASS | - |
| Linea | Fisioterapia, Laboratorio, Imagenes, Resultados, Bonos e informes unicos por rol | Cambia linea y evita mezcla de KPIs | Validado en rutas directas CEO y selector global; se reforzo sincronizacion URL/header | PASS | BUG-003 |
| Area | Sucursales, Gerentes, Resultados, Metas | Limita sucursales del area | Cubierto por RBAC/scope tests y smoke visual de gerentes/bonos | PASS | - |
| Sucursal | Cierres, Resultados, Mi sucursal | Limita a una sucursal y respeta alcance del rol; metas e insights se leen dentro de Mi sucursal para gerente de sucursal | Cubierto por branch-manager-scope, persistence contract y smoke visual | PASS | - |
| Gerente | Gerentes/bonos, Sucursales, Insights | Limita gerente y no deja datos pegados | Validado visualmente al cambiar gerente en bonos: perfil, score, banda y workflow cambian | PASS | - |
| Profesional | Capacidad, Resultados, BI granular | Si no existe fuente, muestra sin datos y KPI bloqueado | Cubierto por BI tests | PASS | - |
| Servicio | Capacidad, Servicios, Resultados | Filtra servicio o muestra no disponible trazable | Cubierto por BI/data-quality tests existentes | PASS | - |
| Pagador | Finanzas, Resultados | Filtra pagador o muestra no disponible trazable | Cubierto por BI/data-quality tests existentes | PASS | - |
| Fecha desde | Overview, Resultados, Finanzas, Lineas | Recalcula hechos del rango | Cubierto por BI tests de rango | PASS | - |
| Fecha hasta | Overview, Resultados, Finanzas, Lineas | Recalcula hechos del rango | Cubierto por BI tests de rango | PASS | - |
| Periodo | Cierres, Metas, Bonos, Insights | Cambia cierre/meta/insight/bono del periodo | Cubierto por vertical, targets, insights y bonus tests | PASS | - |
| Bonus status | Gerentes/bonos | Filtra elegibilidad sin modificar recomendaciones | Validado visualmente con `ELIGIBLE`, `NOT ELIGIBLE` y `REVIEW REQUIRED` | PASS | - |

## Combinaciones Criticas

| Combinacion | Rol | Pantallas | Resultado esperado | Evidencia | PASS/FAIL | Bug ID |
| --- | --- | --- | --- | --- | --- | --- |
| Pais + linea | CEO | Overview, Lineas, Resultados | Solo KPIs de linea/pais; sin datos de linea anterior | Smoke visual y tests BI | PASS | - |
| Pais + linea + sucursal | CEO | Resultados, Cierres | Sucursal corresponde a linea y pais | Vertical/persistence tests y smoke visual | PASS | - |
| Linea + gerente | Gerente Area | Gerentes/bonos, Sucursales | Muestra solo gerente/linea autorizados | Bonus workflow visual y scope tests | PASS | - |
| Sucursal + periodo | Gerente Sucursal | Mi sucursal, Cierres, Resultados | Muestra cierre publicado, metas e insights del periodo seleccionado desde Mi sucursal | Persistence contract | PASS | - |
| Area + linea + fechas | Gerente Area | Sucursales, Gerentes, Resultados | Consolida sucursales del area, rango y linea | RBAC/scope tests y smoke visual | PASS | - |
| Profesional + linea + fechas | Operaciones | Capacidad/Resultados | Si no hay granularidad, muestra no data reason y KPI bloqueado | BI tests | PASS | - |
| Servicio + pagador + fechas | CEO | Finanzas/Resultados | Respeta filtros o indica fuente insuficiente | BI/data-quality tests | PASS | - |
| Linea + metas + periodo | Roles autorizados | Metas, Verticales | Meta vs Real, variacion, cumplimiento y estado cambian | Vertical/targets tests | PASS | - |
| Linea + insight + periodo | Roles autorizados | Insights, Verticales | Insight pertenece a linea/periodo; no queda insight viejo | Insights/BI tests y smoke visual | PASS | - |
| Linea + bono + gerente | Gerente Area / Operaciones | Gerentes/bonos | Bono, score, banda, elegibilidad y workflow cambian por gerente/linea | Bonus model + workflow tests y smoke visual | PASS | - |

## Cambio De Contexto Por Rol

| Flujo | Resultado esperado | Evidencia | PASS/FAIL | Bug ID |
| --- | --- | --- | --- | --- |
| CEO Regional -> Pais -> Linea -> Sucursal | Cada paso actualiza header, KPIs, graficas, tablas, insights, metas y resultados | Smoke visual desktop + tests BI | PASS | - |
| Gerente Operaciones Area -> Sucursal | Solo sucursales de alcance operativo | RBAC/scope tests | PASS | - |
| Gerente Area -> sus sucursales | No puede ver sucursales fuera de area | RBAC/scope tests | PASS | - |
| Gerente Sucursal -> su contexto | Queda fijo a su sucursal; rutas directas fuera de alcance bloqueadas | Branch-manager-scope/RBAC tests | PASS | - |
| Viewer -> rutas admin directas | Redirige a forbidden o bloquea server-side | Sprint 1 RBAC tests y smoke visual | PASS | - |

## Deep Links

| URL | Roles permitidos esperados | Resultado esperado | Evidencia | PASS/FAIL | Bug ID |
| --- | --- | --- | --- | --- | --- |
| `/protected/fisioterapia` | CEO | Carga Fisioterapia con contexto autorizado | Smoke visual CEO | PASS | - |
| `/protected/laboratorio` | CEO | Carga Laboratorio con contexto autorizado | Smoke visual CEO | PASS | - |
| `/protected/imagenes` | CEO | Carga Imagenes con contexto autorizado | Smoke visual CEO | PASS | - |
| `/protected/metas` | Gerente Area | Carga metas, avances e insights segun scope como informe unico; CEO, Operaciones y Sucursal usan sus informes unicos | Smoke visual responsive + tests | PASS | - |
| `/protected/insights` | Viewer, admins | Carga insights segun scope; CEO, Operaciones, Area y Sucursal usan sus informes unicos | Smoke visual responsive + tests | PASS | - |
| `/protected/gerentes` | CEO, Gerente Operaciones, Gerente Area, admins | Carga bonos/gerentes en lectura/autorizacion segun politica; Sucursal queda bloqueado | Corregido y cubierto por bonus/navigation tests | PASS | BUG-001 |
| `/protected/cierres/nuevo` | Operaciones, Sucursal, admins | Carga formulario mensual por linea | Cubierto por vertical tests; CEO y Area bloqueados segun politica | PASS | - |

## Bugs Identificados En Filtros

| Bug ID | Prioridad | Estado | Descripcion | Accion |
| --- | --- | --- | --- | --- |
| BUG-001 | P1 | CLOSED | El deep link `/protected/gerentes` no estaba alineado con la politica de lectura ejecutiva/operativa para bonos. | Se actualizo la matriz RBAC de navegacion y las pruebas de bonos/RBAC. |
| BUG-003 | P2 | CLOSED | El cambio de linea podia dejar parametros relacionados en la URL durante una transicion visual, creando riesgo de header/URL desalineados. | Se reforzo la sincronizacion del selector global para limpiar empresa, sucursal, area y gerente dependientes al cambiar linea. |

No quedan filas `FAIL` ni `PENDING` en el Filter Gate funcional de este cierre.
