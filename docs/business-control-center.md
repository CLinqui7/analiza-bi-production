# Centro de control: conectores, calidad y metas

## Conectores CRM

La pantalla de Conectores permite preparar la integracion por linea de negocio: Laboratorio, Fisioterapia e Imagenes. En el entorno actual solo genera llaves `DEMO` para validar el flujo de trabajo y explicar que endpoints debe configurar cada CRM.

El selector superior de linea de negocio gobierna la pantalla. Si se elige Laboratorio, solo se muestran endpoints, requisitos y llaves DEMO de Laboratorio; en Consolidado se muestran todas las lineas para revision corporativa.

Las llaves reales no deben generarse ni mostrarse en el navegador. En produccion se deben crear server-side, guardarse cifradas, mostrar solo los ultimos cuatro caracteres y registrar auditoria sin exponer secretos.

Conectores e Integraciones son pantallas de administracion tecnica. Gerente de operaciones no las ve ni puede ejecutar sincronizaciones directas; mientras no exista conector aprobado, operaciones trabaja desde Importaciones.

Cada plan de conector define:

- endpoints por linea de negocio;
- campos minimos obligatorios;
- modulos que alimenta;
- requisitos tecnicos;
- pasos de conexion;
- documentos masivos alternativos cuando no exista API viable.

## Calidad de datos

La pantalla de Calidad de datos es una lectura simple para todos los roles. Muestra `Datos que el sistema sugiere revisar`: valores que no cuadran, datos faltantes, duplicados o montos demasiado altos o bajos contra lo habitual.

La revision se filtra por la linea activa del encabezado y por el alcance seleccionado. El sistema no corrige el dato automaticamente; solo senala lo que conviene confirmar antes de publicar KPIs, bonos, cierres o informes de gerencia.

La misma pantalla incluye `Datos que podríamos recopilar`, una lista corta de campos utiles y el beneficio esperado de capturarlos, por ejemplo costos por servicio, capacidad por sucursal, agenda, errores operativos y responsables vigentes.

La pantalla debe mostrar:

- datos que el sistema sugiere revisar;
- severidad alta, media o baja;
- fuente de la alerta;
- sugerencias sencillas de datos adicionales que podrian recopilarse;
- lo que se obtendria al recopilar esos datos.

## Metas, avances, bonos y ROI

La pantalla de Metas y avances presenta sugerencias por linea de negocio y sucursal para los roles que aun trabajan metas como modulo separado. Gerente de operaciones usa `/protected/operacion` y Gerente de sucursal usa `/protected/mi-sucursal` como informes unicos de metas, avances e insights para evitar KPIs duplicados. Cada sugerencia conserva:

- ingreso actual;
- meta sugerida;
- crecimiento conservador;
- responsable;
- confianza;
- regla de bono;
- estrategia comercial u operativa;
- rango de ROI simulado;
- supuestos visibles;
- condicion de cautela antes de aprobar.

El ROI es un rango `DEMO` simulado. Antes de aprobar una meta real, el CEO debe validar costos, capacidad, calidad de datos y disponibilidad operativa. Las metas sugeridas no reemplazan la meta final definida por direccion.

La linea seleccionada arriba limita las metas visibles, el total de bonos y el ROI medio. Esto evita comparar metas de Fisioterapia dentro de una vista filtrada a Laboratorio.
