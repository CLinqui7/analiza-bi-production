# Common Closing Fields

Fecha: 2026-08-07

Este documento define los campos comunes que deben existir en cualquier cierre mensual, independientemente de la linea de negocio.

## Regla General

Fisioterapia, Laboratorio e Imagenes no deben compartir un formulario operativo generico. Si deben compartir una cabecera de cierre, estados, trazabilidad, controles de calidad y publicacion.

## Campos Comunes

| Campo comun | Nombre recomendado | Descripcion | Clasificacion | Tipo / unidad | Obligatorio / editable | Validacion | Catalogo asociado | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Periodo | `period` | Mes y anio del cierre. | MASTER_DATA | Mes | Si / No despues de crear borrador | Periodo abierto, no futuro salvo permiso, no duplicado publicado. | Calendario operativo | Debe ser llave central de todos los KPIs. |
| Pais | `country_id` | Pais de operacion. | MASTER_DATA | Catalogo | Si / No | Debe pertenecer al alcance del usuario. | Paises habilitados | Guatemala, Belice, El Salvador, Honduras, Nicaragua, Costa Rica y Panama. |
| Empresa | `company_id` | Unidad de negocio legal/operativa. | MASTER_DATA | Catalogo | Si / No | Debe pertenecer al alcance del usuario. | Empresas/unidades | Fisioterapia, Laboratorio o Imagenes. |
| Linea de negocio | `business_line` | Tipo de formulario mensual. | MASTER_DATA | Enum | Si / No | Debe coincidir con la sucursal y empresa. | Lineas de negocio | Valores: `physiotherapy`, `laboratory`, `imaging`. |
| Area operativa | `operational_area_id` | Area a la que pertenece la sucursal. | MASTER_DATA | Catalogo | Si / No | Debe pertenecer al alcance del gerente de area/operaciones. | Areas operativas | Base para consolidacion del gerente de area. |
| Sucursal | `branch_id` | Sucursal evaluada. | MASTER_DATA | Catalogo | Si / No | Debe pertenecer al pais, empresa y area seleccionados. | Sucursales | Nunca depender de nombre libre de Excel. |
| Gerente sucursal | `branch_manager_user_id` | Responsable operativo local. | MASTER_DATA | Usuario | Si / No | Debe estar asignado a la sucursal en el periodo. | Usuarios/asignaciones | No debe ser texto libre. |
| Gerente area | `area_manager_user_id` | Responsable del area. | MASTER_DATA | Usuario | Si / No | Debe estar asignado al area en el periodo. | Usuarios/asignaciones | |
| Responsable de captura | `submitted_by` | Usuario que guarda/envia el cierre. | MASTER_DATA | Usuario | Si / No | Usuario autenticado. | Usuarios | Puede ser diferente del gerente si se delega con permiso. |
| Estado del cierre | `closure_status` | Estado de workflow del cierre. | SYSTEM_CALCULATED | Enum | Si / No | Transiciones permitidas. | Estados | `draft`, `in_review`, `validation_failed`, `submitted`, `published`, `replaced`, `voided`. |
| Fecha de creacion | `created_at` | Fecha en que se abre el borrador. | SYSTEM_CALCULATED | Timestamp | Si / No | Server-side. | N/A | |
| Fecha de ultima edicion | `updated_at` | Ultima modificacion. | SYSTEM_CALCULATED | Timestamp | Si / No | Server-side. | N/A | |
| Fecha de envio | `submitted_at` | Fecha de envio a validacion/revision. | SYSTEM_CALCULATED | Timestamp | No / No | Server-side. | N/A | |
| Fecha de validacion | `validated_at` | Fecha en que el sistema valida el cierre. | SYSTEM_CALCULATED | Timestamp | No / No | Server-side. | N/A | |
| Fecha de publicacion | `published_at` | Fecha en que el cierre se vuelve oficial. | SYSTEM_CALCULATED | Timestamp | No / No | Server-side. | N/A | Solo cierres publicados alimentan KPIs oficiales. |
| Publicado por | `published_by` | Usuario que publica/aprueba. | MASTER_DATA | Usuario | No / No | Permiso server-side. | Usuarios | Puede requerir gerente area/operaciones segun politica. |
| Version del cierre | `closure_version` | Version del cierre para reemplazos. | SYSTEM_CALCULATED | Entero | Si / No | Incremental por periodo/sucursal. | N/A | No editar historico publicado. |
| Cierre reemplazado | `replaces_closure_id` | Referencia al cierre anterior si hay correccion. | SYSTEM_CALCULATED | UUID | No / No | Debe existir y estar dentro del mismo scope. | Cierres | |
| Observaciones | `closure_observations` | Contexto que no se puede calcular. | OPTIONAL_CONTEXT | Texto | No / Si | Longitud maxima, sin datos personales innecesarios. | N/A | Deben explicar causas, no reemplazar datos. |
| Adjuntos | `closure_attachments` | Evidencia o respaldo autorizado. | OPTIONAL_CONTEXT | Archivo | No / Si | Tipo/tamano permitido, antivirus si aplica, nombre saneado. | N/A | No subir archivos con PII salvo politica aprobada. |
| Calidad de datos | `data_quality_status` | Resultado agregado de validaciones. | SYSTEM_CALCULATED | Enum | Si / No | Server-side. | Reglas de validacion | `valid`, `warning`, `failed`, `not_calculable`. |
| Score de calidad | `data_quality_score` | Puntaje de completitud/consistencia. | DERIVED_KPI | 0-100 | Si / No | Calculado desde reglas. | Reglas de validacion | No es calificacion de personas; es calidad del dato. |
| Errores de validacion | `validation_errors` | Lista de bloqueos. | SYSTEM_CALCULATED | JSON/lista | No / No | Server-side. | Reglas | Deben ser accionables. |
| Advertencias de validacion | `validation_warnings` | Alertas no bloqueantes. | SYSTEM_CALCULATED | JSON/lista | No / No | Server-side. | Reglas | Pueden requerir observacion. |
| Lineage de fuente | `source_lineage` | Origen de datos por campo. | SYSTEM_CALCULATED | JSON | Si / No | Debe apuntar a formulario, importacion o conector. | Fuentes | Clave para auditoria BI. |
| Modo demo | `is_demo` | Marca de datos demo. | SYSTEM_CALCULATED | Boolean | Si / No | Depende de ambiente/organizacion. | Organizacion | No mezclar demo con produccion. |

## Validaciones Comunes

| Regla | Severidad | Aplica a | Mensaje esperado |
| --- | --- | --- | --- |
| Usuario sin alcance de pais/empresa/area/sucursal | Bloqueante | Todos | El usuario no puede crear ni publicar cierres fuera de su alcance. |
| Periodo cerrado | Bloqueante | Todos | El periodo ya no acepta cambios sin reemplazo autorizado. |
| Cierre duplicado publicado | Bloqueante | Todos | Ya existe un cierre oficial para la sucursal y periodo. |
| Campo esencial vacio | Bloqueante | Campos marcados obligatorios | Falta un dato necesario para calcular KPIs oficiales. |
| Valor negativo no permitido | Bloqueante | Conteos, ventas, gastos | El valor debe ser cero o mayor. |
| Totales no reconciliados | Bloqueante o warning | Finanzas/produccion | La suma de componentes no coincide con el total. |
| Meta faltante | Warning | KPIs con meta | El KPI se calcula, pero no puede mostrar cumplimiento oficial. |
| Dato personal en observaciones | Bloqueante | Texto libre | Retirar nombres, telefonos, identificadores o datos sensibles no necesarios. |
| Dato demo en organizacion real | Bloqueante | Todos | No se permite mezclar DEMO con produccion. |

## Estados De Publicacion

| Estado | Quien lo ve | Puede alimentar dashboards | Puede editarse | Notas |
| --- | --- | --- | --- | --- |
| `draft` | Sucursal y superiores autorizados | No | Si | Autosave recomendado. |
| `validation_failed` | Sucursal y superiores autorizados | No | Si | Debe mostrar errores accionables. |
| `submitted` | Area/operaciones segun permisos | No | Limitado | Pendiente de revision o publicacion. |
| `published` | Todos los roles con alcance | Si | No directo | Solo reemplazo versionado. |
| `replaced` | Auditoria | No como actual | No | Mantiene historico. |
| `voided` | Auditoria | No | No | Requiere motivo. |

## Campos Que No Son Comunes

Estos campos deben vivir solo en formularios por linea:

| Linea | Campos no comunes |
| --- | --- |
| Fisioterapia | Sesiones, citas canceladas, cubiculos, capacidad por licenciada, terapias, equipos especiales, aseguradoras, terapeutas. |
| Laboratorio | Pruebas/examenes, DRSV, domicilios de laboratorio, perfiles, reactivos/insumos/consumibles, flebotomistas, tiempo de espera. |
| Imagenes | Modalidades, estudios, telemedicina, lecturas, fecha de firma, equipos de imagen, placas extra, CAAF. |

