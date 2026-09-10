# Gerente de Operaciones: acceso ejecutivo equivalente a CEO

## Decisión

El rol `gerente_operaciones` tiene el mismo alcance de lectura ejecutiva por
organización que `ceo`, incluyendo panel ejecutivo, líneas de negocio,
directorio de gerentes y revisión de bonos. La equivalencia se aplica en la
autorización de ruta, catálogo, registros y acciones de bonos para evitar que
una pantalla visible devuelva datos incompletos o una denegación posterior.

## Límites de seguridad

- La equivalencia nunca cruza `organization_id`.
- No concede importaciones, conectores ni auditoría, que continúan siendo
  exclusivos de administradores.
- Las decisiones de bono conservan el bloqueo de autoaprobación.
- No cambia cuentas ni asignaciones existentes: entra en vigor para usuarios
  que ya tengan el rol al desplegar el cambio.

## Motivo

El responsable de Operaciones necesita revisar la misma información ejecutiva
que CEO para coordinar la operación. Mantener reglas distintas entre navegación
y servidor había dejado la equivalencia incompleta.
