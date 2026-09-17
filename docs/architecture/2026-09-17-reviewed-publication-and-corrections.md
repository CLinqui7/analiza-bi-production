# Publicación revisada y correcciones de cierres

Fecha: 2026-09-17

## Decisión

La revisión previa se vincula a una versión guardada mediante SHA-256 de un JSON canónico que incluye alcance, periodo, respuestas (distinguiendo `0`, vacío y `null`), evidencia con hash, advertencias, bloqueos y KPI calculados con unidad y fórmula. El servidor vuelve a descargar cada evidencia y comprueba su hash tanto al revisar como al publicar. Un cambio de respuestas, versión, KPI o evidencia produce otro digest y hace inválida la confirmación anterior.

La publicación usa `finalize_reviewed_manual_closing_publication` como única promoción nueva. La función bloquea la versión, la revisión y, cuando aplica, la solicitud de corrección; llama a la promoción autoritativa existente y consume revisión/autorización en la misma transacción. La primera publicación no requiere aprobación adicional.

Un cierre publicado no se edita. El responsable solicita una corrección con motivo. El aprobador se resuelve del `manager_profile_id` del área y se verifica contra una asignación activa con rol `gerente_area`; GO/CEO no reciben este permiso por paridad. Una aprobación corresponde a un responsable, envío, versión/cierre base, sucursal, línea y periodo. Puede respaldar varios guardados del mismo borrador, queda completada al publicar y no se puede reutilizar. Si la base deja de ser oficial, guardar o decidir falla.

## Defensa por capas

- UI: resumen explícito, frase de confirmación, bloqueo de publicación y flujo de solicitud/decisión.
- API: autenticación, rol, grants de sucursal+línea, versión vigente, hash físico de evidencia, base oficial y comparación condicional de estado.
- Base: versión/metadata de evidencia publicada inmutables, política restrictiva de Storage, trigger que exige autorización aprobada y RPC transaccional de un solo uso.
- Auditoría: solicitud, decisión, digest de revisión, versión base, cierre resultante y motivos quedan registrados sin copiar archivos.

## Corrección dirigida de Krissia

La migración `20260917215551_krissia_obsolete_assignment_guard.sql` resuelve la identidad exclusivamente por `krissia.dominguez@labanaliza.com`. Conserva Laboratorio/SS-Casco-L010, desactiva solo Centro Médico-L024/Fisioterapia en `user_roles` y `manager_assignments`, elimina el acceso de sucursal legado que reabriría el alcance, corrige la sucursal predeterminada solo si apuntaba a L024 y crea una denegación persistente contra resincronizaciones antiguas. Si identidad o catálogos son ambiguos, aborta sin aplicar una corrección parcial; si la identidad no existe en un entorno no productivo, registra `NOTICE` y no toca otros usuarios.

## Despliegue y recuperación

Orden: aplicar migraciones aditivas, verificar invariantes de directorio y contratos HTTP, desplegar el SHA candidato a preview del proyecto Vercel existente, ejecutar QA autenticada y solo entonces promover el alias existente. El rollback de código vuelve al deployment anterior; no elimina solicitudes, revisiones, denegaciones ni auditoría. Las migraciones no borran cierres, KPI, evidencias, usuarios ni bonos.
