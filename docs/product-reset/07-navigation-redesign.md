# 07 - Navigation Redesign

Fecha: 2026-08-07

## Objetivo

Proponer una navegacion que refleje el core del producto.

No se implementa en esta tarea.

## Problema actual

La navegacion actual agrupa por:

- Direccion
- Operacion
- Gestion
- Lineas de negocio
- Datos
- Sistema

Esto es util tecnicamente, pero no explica el flujo principal:

cerrar mes -> validar -> calcular -> comparar -> generar insights -> decidir.

## Navegacion propuesta por rol

### Gerente de Sucursal

```text
Mi sucursal
Nuevo cierre mensual
Historial de cierres
Resultados
Mi cuenta
```

Rutas conceptuales:

- `/protected/mi-sucursal`
- `/protected/cierres/nuevo`
- `/protected/cierres`
- `/protected/resultados`

### Gerente de Area

```text
Resumen de area
Sucursales
Gerentes
Cierres
Metas
Insights
Mi cuenta
```

Rutas conceptuales:

- `/protected/area`
- `/protected/area/sucursales`
- `/protected/area/gerentes`
- `/protected/area/cierres`
- `/protected/metas`
- `/protected/insights`

### Gerente de Operaciones

```text
Resumen operativo
Areas
Sucursales
Gerentes
Cierres
Metas
Insights
Calidad de datos
Mi cuenta
```

Rutas conceptuales:

- `/protected/operacion`
- `/protected/operacion/areas`
- `/protected/sucursales`
- `/protected/gerentes`
- `/protected/cierres`
- `/protected/metas`
- `/protected/insights`
- `/protected/calidad-datos`

### CEO

```text
Resumen ejecutivo
Operacion
Finanzas
Sucursales
Gerentes
Insights
Mi cuenta
```

Rutas conceptuales:

- `/protected/overview`
- `/protected/operacion`
- `/protected/finanzas`
- `/protected/sucursales`
- `/protected/gerentes`
- `/protected/insights`

## Modulos tecnicos ocultos o secundarios

Estos modulos no desaparecen, pero no deben dominar la experiencia principal:

- Importaciones
- Conectores
- APIs e integraciones
- Auditoria
- Usuarios y permisos
- Calidad de datos tecnica

Deben vivir como administracion, datos o soporte, visibles solo para roles autorizados.

## Mapeo desde navegacion actual

| Actual | Futuro |
| --- | --- |
| Formulario mensual | Nuevo cierre mensual |
| Importaciones | Cargas/soporte de datos, no flujo principal del gerente |
| Metas y avances | Metas reales |
| Insights | Insights accionables |
| Resumen ejecutivo | Home CEO |
| Operacion ejecutiva | Home Gerente Operaciones |
| Sucursales | Vista de sucursales por area/operaciones/CEO |
| Gerentes y bonos | Gerentes y desempeno |
| Calidad de datos | Control de calidad para operaciones/admin |
| Conectores/APIs | Integraciones para admin/operaciones |

## Reglas de navegacion

- El Gerente de Sucursal debe ver primero su cierre y resultados, con metas e insights dentro de `Mi sucursal` en lugar de pestanas duplicadas.
- El Gerente de Area debe ver primero estado de cierres y sucursales de su area.
- El Gerente de Operaciones debe ver primero areas, cierres y calidad.
- El CEO debe ver primero resultado ejecutivo y decisiones.
- Todo menu visible debe tener permiso server-side equivalente.
- No esconder una accion solo en UI; las rutas y APIs deben validar alcance.

## Codigo actual reutilizable

- `lib/navigation.ts`
- `components/app-sidebar.tsx`
- `components/role-workspace-home.tsx`
- `app/protected/[module]/page.tsx`

## Implementacion futura recomendada

1. Crear una matriz de tareas por rol.
2. Mantener `navigationItems`, pero orientar titulos a tareas.
3. Separar rutas tecnicas de rutas de negocio.
4. Hacer que `/protected` redirija a la home del rol.
5. Mantener aliases temporales para no romper enlaces existentes.
