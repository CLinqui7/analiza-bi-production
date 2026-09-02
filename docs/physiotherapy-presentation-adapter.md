# Fisioterapia: modulo de comite mensual

## Adapter

`FISIO_RESULTADOS_MENSUALES_V1` importa plantillas mensuales de resultados de Fisioterapia para generar una presentacion ejecutiva por sucursal. La plantilla usada en demo se etiqueta siempre como `Datos de la plantilla de prueba`; no se presenta como dato global del sistema.

## Fuentes esperadas

- `llenado fisio`: series mensuales, metas, ventas y acumulados recalculables.
- `CONSOLIDADO`: resultados organizados del periodo.
- `Llenado Medicos Fisio`: detalle de medicos, ordenes, venta y especialidad.
- `Medicos y Especialidades`: catalogo de medicos referidores y especialidades.
- `Visitadores`: produccion y concentracion por visitador.
- `Filtros Fisio`: catalogos y aliases.
- `Proyeccion Fisio`: solo para periodos abiertos; no puede depender de `TODAY()`.
- `Fisioterapia`: hoja visual de apoyo; no se usa como fuente unica porque puede contener ceros, formulas rotas o datos sin actualizar.

## Modelo de datos

El modelo separa cuatro capas:

- Importacion: archivo, sucursal, periodo, gerente, version, hojas detectadas, mapeo, validaciones, conciliaciones, score, auditoria y rollback.
- Resultado: metas, ventas, ordenes, sesiones, pacientes, canales, medicos, especialidades, visitadores, terapias, equipos, aseguradoras, cancelaciones, gastos, utilidad, personal y capacidad.
- Presentacion: slides principales, opcionales, pendientes de fuente y anexos con KPIs, graficos, notas de gerente, comentarios de direccion, evidencia y estado.
- Seguimiento: explicaciones, acciones, decisiones CEO, acuerdos, historial y versiones.

## Reglas bloqueantes

Una presentacion no puede cerrarse oficialmente si existe cualquiera de estos errores:

- Periodo de archivo, periodo interno y periodo seleccionado no coinciden.
- El archivo usa fechas dinamicas como periodo oficial.
- La sucursal no existe o no coincide con la sucursal seleccionada.
- Hay formulas con `#REF!`, `#DIV/0!`, `#N/A`, `#NAME?` o `#VALUE!`.
- Venta total no concilia con formas de pago.
- Venta total no concilia con venta medica, venta sin medico o terapias.
- Utilidad, margen, meta acumulada o venta acumulada no recalculan correctamente.
- Ordenes medicas y sin medico no cierran contra ordenes totales.
- Clientes segmentados no cierran contra clientes totales.
- Sesiones o cancelaciones por aseguradora no cierran contra totales.
- Capacidad y ocupacion mezclan unidades incompatibles.

## Advertencias

Las advertencias permiten revisar el borrador, pero deben resolverse antes de usar el dato para bonos o decisiones sensibles:

- Aliases de fisioterapeutas, medicos, visitadores, aseguradoras o terapias.
- Sesiones por profesional menores al total por registros sin asignar.
- Proyeccion con nombres de dias mezclados entre ingles y espanol.
- Filas vacias donde existe otro total disponible.
- Falta de fuente para continuidad terapeutica o resultados clinicos.

## Nueva version de plantilla

Para agregar una version nueva:

1. Crear un adapter nuevo con version explicita, por ejemplo `FISIO_RESULTADOS_MENSUALES_V2`.
2. Registrar hojas, columnas requeridas y aliases nuevos.
3. Mantener las reglas de conciliacion existentes.
4. Ejecutar fixtures de errores reales contra el adapter nuevo.
5. Migrar plantillas por sucursal sin reemplazar historiales cerrados.

## Conexiones futuras

- Agenda y expediente clinico: habilitan continuidad terapeutica, planes, abandono, altas, pacientes sin proxima cita y resultados clinicos validados.
- Facturacion: habilita venta oficial, formas de pago, gastos, utilidad, margen, impuestos y conciliacion con caja.
- CRM: habilita origen de pacientes, campanas, canal medico, visitadores, medicos activos, medicos nuevos y recuperacion.
- Exportacion: el frontend genera HTML compatible con PowerPoint y usa impresion del navegador para PDF; una integracion posterior puede reemplazarlo por generacion server-side de `.pptx` y PDF.

## Reemplazo del fixture

Cuando exista el Excel real accesible por el sistema, reemplazar `physioReferenceRecord` por registros importados desde almacenamiento y conservar el texto `Datos de la plantilla de prueba` solo para entornos demo o fixtures automatizados.
