# Visual Excellence Review - Analiza Intelligence

Fecha: 2026-08-13

## Objetivo

Elevar la percepcion visual de Analiza Intelligence hacia una plataforma SaaS
empresarial premium, moderna, tecnologica y ejecutiva, sin modificar formulas,
queries, persistencia, RBAC, RLS, Closing Engine, filtros, metas, finanzas ni
logica de insights.

## Auditoria Visual

### Login

Estado detectado: la pantalla ya usa un layout premium dividido, panel navy,
branding, formulario claro y control de password visible. Oportunidades:
reducir decoracion pesada, mantener el foco en acceso seguro y evitar que el
panel visual compita con el formulario en pantallas pequenas.

Recomendacion: conservar el layout actual, refinar sombras, bordes y microcopy
para que se sienta mas institucional y menos promocional.

### CEO Overview

Estado detectado: comunica datos ejecutivos relevantes, pero varias tarjetas
compiten al mismo nivel. Hay buen contenido para meta, margen, ocupacion,
alertas y lineas de negocio, aunque la jerarquia puede ser mas clara.

Recomendacion: crear un primer nivel visual para KPIs estrategicos, un segundo
nivel para alertas y un tercer nivel para comparativos y detalle. Las tarjetas
principales deben parecer un command center y no una lista plana.

### Fisioterapia

Estado detectado: el flujo ya distingue cierres, metas, resultados e insights.
La lectura visual puede reforzar la cadena Agenda -> Atencion -> Conversion.

Recomendacion: usar acentos sobrios para agenda, ocupacion, sesiones,
pacientes, no-show, margen y capacidad. Diferenciar ocupacion agendada versus
efectiva cuando la pantalla ya tenga ambos datos.

### Laboratorio

Estado detectado: comparte componentes con otras lineas, lo que ayuda a
consistencia pero puede hacerla parecer una vista de citas.

Recomendacion: reforzar visualmente produccion, throughput, pruebas, TAT cuando
exista, calidad, volumen y margen con etiquetas tecnicas y tarjetas mas densas.

### Imagenes

Estado detectado: cuenta con datos de estudios, productividad, margen y calidad.
Necesita mayor protagonismo para modalidad/equipo sin sobrecargar.

Recomendacion: ordenar la lectura alrededor de estudios, modalidades,
utilizacion, equipos, pendientes y capacidad cuando existan datos.

### Gerentes y Sucursales

Estado detectado: las tablas y rankings son utiles, pero pueden sentirse densos
o lineales si solo se leen como listas.

Recomendacion: usar una lectura comparativa con meta, desempeno,
ocupacion/utilizacion, margen, calidad y alertas. En mobile, convertir tablas
criticas en tarjetas cuando ya exista estructura responsive.

### Metas

Estado detectado: ya se agrego lectura de real, proyectado y presupuestado. La
pantalla todavia puede verse como aprobacion operativa mas que como tablero
ejecutivo.

Recomendacion: consolidar claramente META, REAL, VARIACION, CUMPLIMIENTO y
ESTADO en una lectura visual con barras/progreso y jerarquia.

### Insights

Estado detectado: los insights ya tienen prioridad, titulo, comparacion,
impacto y accion. La estructura puede compactarse para que cada insight se lea
como una decision.

Recomendacion: presentar cada insight en bloques: Prioridad, Titulo, Dato,
Comparacion, Impacto y Accion, evitando parrafos largos.

### Resultados, Cierres, Historial y Capacidad

Estado detectado: el flujo funcional existe y es trazable. La oportunidad es
mejorar ritmo visual, separacion de secciones, estados y tablas.

Recomendacion: mantener la experiencia de captura sencilla, con tarjetas
limpias, validaciones visibles y menos sensacion de formulario interno.

### Finanzas

Estado detectado: se beneficia de tablas y lectura de margen, costo e ingreso,
pero requiere claridad ejecutiva en estados.

Recomendacion: usar verde solo para desempeno favorable, ambar para atencion,
rojo para riesgo y gris para neutral/no-data.

## Sistema Visual Consolidado

- Base: navy profundo para estructura ejecutiva.
- Acento: azul electrico para foco, interaccion y datos primarios.
- Verde: buen desempeno.
- Ambar: atencion o decision pendiente.
- Rojo: riesgo.
- Gris: neutral, no-data o soporte.
- Radius: 8px como base para tarjetas, inputs y botones.
- Sombras: discretas, orientadas a profundidad funcional, no decorativa.
- Tablas: encabezados suaves, filas con hover ligero, bordes menos pesados.
- Cards: mas aire, borde suave y sombra ligera.
- Graficas: mayor contraste de eje, leyendas compactas y colores con significado.
- Responsive: apilar cards, compactar filtros y evitar scroll horizontal
  obligatorio salvo tablas realmente amplias.

## Cambios Visuales Permitidos En Esta Fase

- Tokens visuales globales y estilos base.
- Navegacion lateral y header protegido.
- Componentes UI compartidos: Card, Button, Input, Badge.
- Tarjetas del CEO Overview y alertas ejecutivas.
- Tabla ejecutiva por sucursal/gerente a nivel visual.
- Grafica comparativa: marco, filtros, leyenda y legibilidad.
- Metas: presentacion visual, sin alterar calculos.
- Insights: presentacion visual, sin alterar reglas.

## Cambios Prohibidos En Esta Fase

- Modificar formulas KPI.
- Cambiar queries o fuentes de datos.
- Cambiar Closing Engine.
- Cambiar persistencia o migraciones.
- Cambiar RBAC, AuthorizationService o RLS.
- Cambiar logica de filtros globales.
- Cambiar logica financiera.
- Cambiar logica de metas o insights.
- Inventar datos, metas, KPIs o conclusiones.

## Criterios De Aceptacion

- La plataforma se percibe como SaaS ejecutivo, no como prototipo interno.
- CEO Overview comunica estado del grupo en menos de 30 segundos.
- Metas muestran lectura clara de meta, real, variacion, cumplimiento y estado.
- Insights son accionables visualmente.
- Fisioterapia, Laboratorio e Imagenes mantienen identidad operativa propia.
- Desktop, laptop, tablet y mobile no presentan overflow horizontal inesperado.
- Lint, typecheck, tests y build pasan.
