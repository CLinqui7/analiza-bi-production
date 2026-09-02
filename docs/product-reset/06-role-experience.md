# 06 - Role Experience

Fecha: 2026-08-07

## Objetivo

Definir la experiencia principal por rol alrededor del cierre mensual.

La navegacion debe sentirse distinta para cada rol porque cada rol toma decisiones distintas.

## Gerente de Sucursal

Experiencia simple y operativa.

Menu principal:

- Mi sucursal
- Nuevo cierre mensual
- Historial de cierres
- Resultados
- Metas
- Insights

Flujo ideal:

1. Entra y ve estado del cierre actual.
2. Si no ha cerrado el mes, ve un boton claro: "Nuevo cierre mensual".
3. Completa formulario especifico de su linea.
4. Corrige errores si existen.
5. Publica o envia a validacion segun politica.
6. Ve resultados de su sucursal.
7. Ve metas, cumplimiento e insights.

No debe ver:

- modulos tecnicos
- conectores
- configuracion global
- datos de otras sucursales
- comparaciones fuera de su alcance salvo benchmark permitido

## Gerente de Area

Experiencia de supervision.

Menu principal:

- Resumen de area
- Sucursales
- Gerentes
- Metas
- Cierres
- Insights

Flujo ideal:

1. Ve que sucursales ya cerraron y cuales estan pendientes.
2. Revisa errores de calidad por sucursal.
3. Compara cumplimiento de metas.
4. Identifica gerentes con riesgo u oportunidad.
5. Da seguimiento a insights.

No debe administrar:

- sucursales fuera de su area
- metas globales fuera de su alcance
- conectores globales

## Gerente de Operaciones

Experiencia de control operativo.

Menu principal:

- Resumen operativo
- Areas
- Sucursales
- Gerentes
- Metas
- Insights
- Calidad de datos

Flujo ideal:

1. Ve estado de cierres por area.
2. Detecta areas con retrasos o mala calidad.
3. Compara sucursales y gerentes.
4. Ajusta prioridades operativas.
5. Revisa metas y cumplimiento.
6. Supervisa calidad de datos y fuentes.

Puede ver:

- todas las areas dentro de su pais/empresa/alcance
- calidad de datos
- importaciones o cierres pendientes
- consolidacion operativa

## CEO

Experiencia ejecutiva.

Menu principal:

- Resumen ejecutivo
- Operacion
- Finanzas
- Sucursales
- Gerentes
- Insights

Flujo ideal:

1. Ve si el negocio va bien o mal.
2. Entiende donde esta la brecha contra meta.
3. Ve impacto financiero y operativo.
4. Identifica sucursales o areas criticas.
5. Lee insights concretos.
6. Toma decisiones.

No debe necesitar:

- llenar cierres
- entender plantillas
- revisar campos tecnicos
- navegar por conectores

## Experiencia de inicio por rol

Cada rol deberia tener una home distinta:

| Rol | Home propuesta |
| --- | --- |
| Gerente Sucursal | Estado del cierre de mi sucursal |
| Gerente Area | Resumen de cierres y resultados de mi area |
| Gerente Operaciones | Resumen operativo por area |
| CEO | Resumen ejecutivo |

## Codigo actual reutilizable

- `components/role-workspace-home.tsx`
- `components/app-sidebar.tsx`
- `lib/navigation.ts`
- `lib/security/authorization-policy.ts`
- `lib/tenant/delegation-policy.ts`
- `components/context-selection-form.tsx`

## Cambio de producto requerido

La navegacion actual debe dejar de ser una lista de modulos y convertirse en una lista de tareas por rol.

Ejemplo:

Antes:

- Importaciones
- Formulario mensual
- Sucursales
- Metas
- Insights

Despues para Gerente Sucursal:

- Nuevo cierre mensual
- Historial de cierres
- Resultados
- Metas
- Insights

El mismo modulo tecnico puede existir detras, pero la experiencia debe hablar el idioma del rol.
