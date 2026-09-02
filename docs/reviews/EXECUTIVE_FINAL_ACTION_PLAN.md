# Executive Final Action Plan

Fecha: 2026-08-07

## 1. Executive Summary

Analiza Intelligence esta listo para revision ejecutiva local en modo DEMO. El acceso visual fue recuperado sin debilitar RBAC productivo: la sesion DEMO es server-side, solo se habilita con `APP_ENV=demo` en runtime local, usa cookies HttpOnly y conserva alcance por pais, empresa, area, sucursal y rol.

El codigo local no debe considerarse produccion lista todavia. Los bloqueos restantes son principalmente manuales o de infraestructura: credenciales reales, migraciones remotas, backup, observabilidad, conectores reales, datos financieros certificados y smoke DOM/consola en ambiente desplegado.

## 2. Executive Ready YES/NO

YES para demo local.

## 3. Production Ready YES/NO

NO.

## 4. Score /100

88/100 para demo ejecutiva local.

74/100 para readiness productivo, por bloqueos manuales pendientes.

## 5. P0

No quedan P0 abiertos en codigo local revisado.

## 6. P1

- Produccion bloqueada por credenciales, migraciones remotas, backup y autorizacion de despliegue.
- BI productivo bloqueado por falta de hechos persistidos/snapshots aprobados.
- Finanzas productivas bloqueadas por falta de cierre financiero certificado.
- Jerarquia productiva requiere persistencia historica y auditoria completa.

## 7. P2

- Smoke visual responsive automatizado pendiente.
- Dashboards densos requieren medicion con datos grandes.
- Tooltips de formula/fuente incompletos en algunos KPIs.
- Observabilidad productiva pendiente.

## 8. P3

- Microcopy de estados prohibidos.
- Virtualizacion/paginacion avanzada para tablas grandes.
- Pulido adicional de exportaciones y guias por rol.

## 9. Quick Wins

- Acceso DEMO local server-side por perfil.
- Alias `/login` para entrada ejecutiva.
- Pruebas de regresion para demo auth, RBAC y scope.
- Correccion de titulos SVG para reducir ruido de consola.

## 10. Cambios obligatorios antes de Direccion

- Mantener app en `APP_ENV=demo`.
- Entrar por `/login` y seleccionar perfil autorizado.
- Aclarar que todos los datos visibles son DEMO.
- Validar visualmente las pantallas clave en navegador local.

## 11. Cambios obligatorios antes de produccion

- Autorizar despliegue de forma explicita.
- Ejecutar backup y migraciones remotas controladas.
- Configurar secretos reales server-side por ambiente.
- Verificar que login DEMO y role selector esten bloqueados en staging/production.
- Conectar fuentes reales o mantener conectores deshabilitados.
- Certificar datos financieros, operativos y BI.
- Ejecutar smoke DOM/consola en deployment real.

## 12. UX polish

El login DEMO local esta listo. Queda pendiente revisar responsive en dashboards densos y mejorar mensajes de prohibicion por rol.

## 13. BI improvements

Crear hechos BI persistidos, snapshots mensuales aprobados y metadata de calidad por KPI antes de produccion.

## 14. Data improvements

Persistir linaje en base real, conectar importaciones publicadas con dashboards y mostrar cobertura/calidad por fuente.

## 15. Technical improvements

Separar dashboards grandes en componentes cargados bajo demanda, agregar smoke visual automatizado y medir performance por pantalla.

## 16. Security improvements

Mantener DEMO aislado por ambiente, rotar/verificar secretos historicos y auditar cookies/DOM/bundle en deployment real.

## 17. Performance improvements

Medir LCP, TTI, peso JS y render de dashboards con dataset realista. Agregar paginacion o virtualizacion donde aplique.

## Action Table

| ID | Area | Problema | Prioridad | Archivo/Pantalla | Solucion | Complejidad | Riesgo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ACT-01 | Seguridad | Acceso local estaba bloqueado tras RBAC | P1 | `/login`, `app/api/auth/demo-session/route.ts` | Sesion DEMO server-side aislada por ambiente | Media | Bajo |
| ACT-02 | Seguridad | Viewer podia depender solo de UI si no habia gate server-side | P0 cerrado | `lib/server/authorization.ts`, `lib/security/authorization-policy.ts` | Validar rutas con `requireProtectedPath` | Media | Bajo |
| ACT-03 | BI | Hechos productivos no persistidos | P1 | `lib/analytics/*`, DB | Crear modelo de snapshots BI aprobados | Alta | Medio |
| ACT-04 | Finanzas | Cifras DEMO no son cierre certificado | P1 | Finanzas | Conectar cierre real y reconciliacion | Alta | Alto |
| ACT-05 | Operaciones | Jerarquia DEMO no equivale a jerarquia historica productiva | P1 | Tenant/DB | Persistir asignaciones con vigencia y auditoria | Alta | Medio |
| ACT-06 | Importaciones | Store de ingestion en memoria | P1 | `lib/data-ingestion/platform.ts` | Persistir raw/staging/published/audit en PostgreSQL | Alta | Medio |
| ACT-07 | Visualizacion | Warnings potenciales en SVG `title` | P2 cerrado | Dashboards SVG | Usar cadena unica por `title` | Baja | Bajo |
| ACT-08 | QA | Falta smoke visual automatizado | P2 | QA | Agregar Playwright desktop/mobile por rol | Media | Bajo |
| ACT-09 | Performance | Dashboards grandes cliente | P2 | `components/*dashboard.tsx` | Lazy sections, medicion y virtualizacion | Media | Medio |
| ACT-10 | Produccion | Deploy no autorizado | P0 manual | Infra | Requiere aprobacion explicita | Baja | Alto |

## Conclusion

SHOW TO EXECUTIVE en DEMO local. DO NOT DEPLOY TO PRODUCTION hasta cerrar bloqueos manuales.
