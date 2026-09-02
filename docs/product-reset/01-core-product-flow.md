# 01 - Core Product Flow

Fecha: 2026-08-07

## Proposito

Este documento redefine ANALIZA INTELLIGENCE alrededor de su flujo principal de negocio:

Gerente de Sucursal -> cierre mensual -> validacion -> KPIs -> metas -> insights -> dashboards por rol.

La plataforma no debe organizarse primero por dashboards. Debe organizarse por el ciclo de gestion mensual que produce datos confiables y decisiones.

## Core del producto

1. El Gerente de Sucursal entra a su espacio.
2. Selecciona "Nuevo cierre mensual".
3. El sistema muestra el formulario correcto segun la linea de negocio de la sucursal:
   - Fisioterapia
   - Laboratorio
   - Imagenes
4. El gerente completa datos del mes.
5. El sistema valida calidad, consistencia, alcance y campos requeridos.
6. Si hay errores, el cierre queda bloqueado o en borrador.
7. Si pasa validacion, el cierre se publica como dato estructurado.
8. El sistema calcula KPIs derivados.
9. El sistema compara REAL contra META.
10. El sistema compara contra periodo anterior y benchmark permitido.
11. El sistema genera insights especificos.
12. El gerente ve resultados de su sucursal.
13. El Gerente de Area consolida sucursales de su area.
14. El Gerente de Operaciones consolida areas.
15. El CEO recibe vision ejecutiva.

## Arquitectura funcional

```text
INPUT
Formularios por linea

VALIDATION
Calidad, consistencia, permisos y completitud

DATA
Persistencia estructurada del cierre publicado

CALCULATION
KPIs derivados y versionados

TARGETS
Meta vs real vs variacion vs cumplimiento

INSIGHTS
Alertas, oportunidades y explicaciones

DASHBOARDS
Experiencia por rol
```

## Principios

- No existe dashboard confiable sin cierre validado.
- No existe insight confiable sin dato real, meta, periodo y comparador.
- No existe meta operativa sin periodo, pais, empresa, sucursal y KPI.
- No existe resultado ejecutivo si el dato no respeta pais, empresa, area, sucursal y rol.
- No debe haber formulario mensual generico para todas las lineas.
- Las plantillas Excel actuales deben transformarse en formularios web estructurados por linea.
- Los modulos actuales se reutilizan, pero deben quedar subordinados al flujo de cierre mensual.

## Estados del cierre mensual

| Estado | Significado | Puede alimentar dashboards |
| --- | --- | --- |
| Borrador | El gerente esta llenando el cierre | No |
| Enviado | El cierre fue enviado a validacion | No |
| Con errores | Falta informacion o hay inconsistencias | No |
| Validado | Paso reglas de calidad | Todavia no |
| Publicado | Se convierte en dato oficial del periodo | Si |
| Reemplazado | Una version posterior lo sustituyo | Solo historico |
| Revertido | Fue retirado por error o auditoria | No |

## Resultado esperado

La experiencia debe sentirse asi:

- El Gerente de Sucursal no navega por 20 modulos; cierra su mes y entiende sus resultados.
- El Gerente de Area no revisa datos sueltos; ve que sucursales cerraron, quien va mal y por que.
- El Gerente de Operaciones no busca reportes aislados; ve areas, calidad, metas e insights accionables.
- El CEO no interpreta pantallas tecnicas; ve desempeno, riesgo, oportunidad y decision.

## Relacion con el codigo actual

Piezas reutilizables:

- `components/manual-monthly-entry-dashboard.tsx`
- `lib/analytics/import-operations.ts`
- `lib/data-ingestion/templates.ts`
- `lib/data-ingestion/platform.ts`
- `lib/analytics/kpi-registry.ts`
- `lib/analytics/semantic-bi.ts`
- `lib/analytics/insights.ts`
- `components/goals-advances-dashboard.tsx`
- `components/insights-intelligence-dashboard.tsx`
- dashboards por rol y negocio en `components/*dashboard.tsx`

Problema actual:

Las piezas existen, pero el producto todavia se percibe como una coleccion de modulos. El reset debe reordenarlas alrededor del cierre mensual.
