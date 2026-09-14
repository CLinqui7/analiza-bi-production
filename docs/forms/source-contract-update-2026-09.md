# Contratos mensuales desde los Excel de septiembre de 2026

## Alcance aplicado

Esta actualización sustituye el formulario genérico de Fisioterapia e Imágenes por contratos distintos y trazables. Laboratorio conserva su contrato anterior porque no se recibió una fuente nueva para esa línea.

| Línea | Contrato | Hoja principal | Campos de contexto | Campos amarillos de negocio | Filas amarillas ocultas |
|---|---|---|---:|---:|---:|
| Fisioterapia | `physiotherapy-yellow-2026-09-v2` | `Fisioterapia` | 5 etiquetas resueltas en 4 controles de sistema | 58 | 2 |
| Imágenes | `imaging-yellow-2026-09-v2` | `EVALUACION` | 5 etiquetas resueltas en 4 controles de sistema | 44 | 8 |
| Laboratorio | `laboratory-production-v1` | Sin cambio | Sin cambio | Sin cambio | Sin cambio |

La lista completa celda → ID técnico → etiqueta está en `lib/monthly-form-source-contracts.ts`. Los IDs son exclusivos por línea, salvo los cuatro campos de contexto y `therapy_sessions`, cuyo concepto existente coincide con el rótulo fuente de sesiones totales.

Huellas autorizadas:

- Fisioterapia: `7B21A90417B094684690BA075F6406D2DEA93FEA5BF97A75EF534AAA385FA759`.
- Imágenes: `B2A8FB5806E7D6998877CF3297CE56734070FBD5F16A305A30517A5D1DEADFC0`.
- Directorio: `510918238DC03BF7F7DF0ABA1DDA3A9C2EB130C79C48F7B028E891BD02F06B32`.

El color `theme7` se resuelve como `#FFC000`. Solo las etiquetas amarillas de columna A de las hojas principales forman el contrato; no se promovieron pivotes, pacientes ni hojas auxiliares a preguntas.

## Comportamiento de captura e importación

- Periodo, sucursal, gerente de sucursal y gerente de área se resuelven desde el contexto y se vuelven a escribir desde catálogos autorizados en el servidor.
- Amarillo identifica captura, pero no demuestra obligatoriedad. Los campos nuevos quedan opcionales hasta recibir una regla explícita; vacío permanece ausente y cero permanece cero.
- Los siete equipos de Fisioterapia son controles separados con unidad `unidad por confirmar`.
- `Pasantia` y `Pasantias` forman un alias explícito y probado con valor distinto de cero.
- Los diez campos identificables que estaban en filas ocultas permanecen visibles, opcionales y advertidos.
- Las catorce etiquetas `#REF!` de `Fisioterapia!A99:A112` se registran como incidencia, pero no generan campos inventados.
- `erivera` y `csanchez` permanecen como etiquetas de fuente; la interfaz los presenta como usuario identificado en la fuente, no como cuentas universales.
- La importación de respuestas es distinta de la carga de evidencia. El endpoint autenticado `/api/monthly-imports/dry-run` acepta `.xlsx` de hasta 4 MB, por debajo del límite de cuerpo de Vercel Functions; comprueba firma, hoja, línea, periodo y sucursal, y nunca persiste durante el análisis. La evidencia conserva su carga directa resumible de hasta 15 MB por archivo.
- El parser se carga únicamente al solicitar la importación. Lee el valor almacenado de las fórmulas, no ejecuta fórmulas ni abre relaciones externas. La interfaz informa cuántas celdas contenían fórmula.
- Aplicar una vista previa solo copia campos reconocidos al borrador local. Guardar requiere una acción posterior y persiste una traza sanitizada con checksum, hoja, contrato y conteos, no el archivo.

## Versionado e históricos

Cada nueva versión guarda `__form_contract_version` desde el servidor. Un cierre anterior sin marcador usa `legacy-unversioned-v1` al validar, publicar o exportar; no se reinterpreta con el contrato nuevo. Versiones desconocidas fallan cerrado.

Solo se publican como KPI los valores agregados reportados que tienen un campo claro (venta, meta y algunos conteos principales). No se certificaron como fórmulas nuevas el margen, porcentajes de pago, promedio diario, utilidad derivada, totales de facturación ni campos con referencias rotas.

## Decisiones todavía requeridas

| ID | Decisión exacta pendiente | Tratamiento actual seguro |
|---|---|---|
| FORM-01 | Definir si los campos amarillos que nacen de una operación serán captura, cálculo o ambos, y la regla de contraste. | Se conservan manuales y no se sobrescriben. |
| FORM-02 | Confirmar aplicabilidad de domicilios, TAC y gastos en filas ocultas. | Visibles, opcionales y marcados como ocultos en fuente. |
| FORM-03 | Definir el modelo repetible de facturación y recuperar nombres de las catorce etiquetas rotas. | Solo se muestran los dos usuarios identificables; no se inventan otros. |
| FORM-04 | Reemplazar las tres relaciones externas de Fisioterapia con claves de sistema demostradas. | No se abren vínculos; se usa periodo/sucursal del contexto. |
| FORM-05 | Confirmar el alias `Pasantia`/`Pasantias`. | Alias exacto, sin similitud automática. |
| FORM-06 | Definir unidad de los siete equipos. | Unidad declarada pendiente. |
| CALC-01 a CALC-07 | Resolver margen de Imágenes, pagos inconsistentes, divisores diarios, datos sin fuente, variaciones rotas, facturas y desfase de personal. | No se publican esas fórmulas ni se convierten errores en cero. |

## Directorio: conciliación aplicada

La fuente contiene 59 asignaciones y 50 correos normalizados. Por autorización del propietario, `Infogeneral_!C59` se corrigió sustituyendo únicamente una `í` por `i`; la comparación de las tres hojas confirmó una sola celda distinta, cero fórmulas o rangos alterados y el mismo estilo. La huella nueva aparece arriba.

| Medida | Antes | Después |
|---|---:|---:|
| Coincidencias exactas fuente/producción | 54 | 59 |
| Filas de fuente sin coincidencia exacta | 5 | 0 |
| Asignaciones productivas de los países de la fuente ausentes en el archivo | 2 | 2, conservadas |
| Correos de fuente sin perfil productivo | 3 | 0 |

Se reconciliaron las filas 17, 47, 48, 59 y 60 con una sola identidad exacta por correo y una sola asignación/rol activos por sucursal y línea. La fila 59 reutilizó la cuenta productiva que coincidió después de la corrección autorizada. Para la fila 60 se creó el catálogo faltante de sucursal y su slot; las identidades nuevas recibieron invitación y sus grants de país, empresa y sucursal. No se desactivaron las dos asignaciones productivas que no aparecen en la fuente.

Los 68 planes de bono conservaron la huella `b6578e87dd5b37f413adf5e773a7b2ccb485ce007dd5375455360850ab035e6e`. La identidad especial de `andrea.rivera@labanaliza.com` conserva una sola asignación activa de Gerente de Sucursal en una sola línea; no se amplió su alcance por coincidencia de nombre.

## Empaquetado Vercel

El proyecto compartido tenía configurada una salida monorepo `apps/web/.next`, incompatible con este repositorio de raíz única. `vercel.json` fija para este código el preset Next.js y su salida predeterminada mediante `outputDirectory: null`; el ajuste queda acotado al repositorio y no cambia la configuración utilizada por otros repositorios vinculados al mismo proyecto Vercel.
