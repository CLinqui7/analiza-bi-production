# Design System

## Principles

The product should feel executive, professional, clean, modern, responsive, accessible, and easy to present in meetings. Operational screens should stay dense, calm, and scannable.

## Initial Palette

- Primary navy for structure and navigation.
- Electric blue for active states and primary action accents.
- Very light gray app background.
- White cards for repeated content and bounded tools.
- Red only for alerts and destructive states.
- Green only for positive outcomes.
- Amber for warnings and incomplete data.

## Business Line Identity

The protected BI shell uses one accent color per active business line. The global selector writes the selected context, and the shell applies `data-business-line-theme` so navigation, primary actions, active states and chart variables inherit the correct color.

- Consolidado keeps the executive navy.
- Laboratorio uses indigo as its operating identity.
- Fisioterapia uses teal/green as its operating identity.
- Imagenes uses diagnostic blue as its operating identity.

Line colors identify scope; they do not replace semantic colors. Red remains risk, amber remains warning or incomplete data, and green remains positive performance unless the active line is Fisioterapia.

## Component Guidance

- Use accessible reusable components.
- Use lucide-react icons when an icon exists.
- Use segmented controls for modes, toggles for binary settings, and menus for option sets.
- Keep cards to repeated items, dialogs, and bounded tools.
- Avoid card-in-card layouts.
- Avoid excessive gradients, decorative blobs, 3D charts, and unnecessary animation.
- Every KPI needs a tooltip with definition, formula, source, and last update.

Phase 2 uses a dense executive shell: collapsible sidebar, compact header filters, small KPI cards, and simple 2D bar visualizations. This keeps the BI surface scannable in meetings and avoids misleading decorative charts.

## Role-Based Reading

The shell should reduce cognitive load by role:

- Use grouped navigation instead of a flat module list.
- Keep the role workspace home as the first operational screen.
- Show only essential modules for each role; deeper dashboards should be drilldowns, not default navigation.
- Open every screen with 3 to 5 key signals, one primary alert, and one clear next action before detailed tables.
- Keep global filters as a compact context bar. Put branch, manager, dates, and secondary filters in `Cambiar filtros` or local `Filtros avanzados`.

Large line-of-business presentations should not become endless dashboard pages. Prefer cockpit views with tabs or guided sections: resumen, causas, plan, decisiones, and trazabilidad.

Every role should enter through a role workspace before detailed dashboards. The first screen must answer: what is happening, what needs review, what action is expected, and what data is missing. The sidebar should expose only essential modules for that role; deeper diagnostics remain accessible through drilldowns, tabs, or the role's recommended action.

Dense dashboards such as profesionales, servicios, gerentes y bonos, laboratorio, imagenes, insights and importaciones must use progressive disclosure. Put KPIs and the executive read first, then comparison charts, then detail tables, then rules/audit. Do not render every table, matrix and narrative in one continuous page.

Administrative forms that include wide tables, such as usuarios y permisos, should stack the form above the table or use a full-width form grid. Do not place a narrow form beside a wide table when selectors contain long role, branch, area, or business-line names.

Operational KPI groups should pair numeric lists with compact trend charts when the decision depends on time movement. The chart must show date labels, the current period, a comparison period, and point-level values through hover/title metadata.

When KPI groups include an internal trend chart, stack each group full-width before placing the chart beside its KPI list. Do not place two charted KPI groups side by side and then add another internal side-by-side chart grid; that causes overlap on common desktop widths.

## Branding

Do not invent the logo. Provide configurable slots for:

- group logo
- company logo
- favicon
- corporate colors

## Macro Sprint 4 Executive System

Fecha de revision: 2026-08-07

El look and feel objetivo es ejecutivo, claro y sobrio:

- Fondo claro `hsl(210 24% 98%)`.
- Navy como base de navegacion y jerarquia.
- Azul electrico solo para acentos activos, focus y acciones primarias.
- Tarjetas blancas con sombra discreta y borde suave.
- Radio base de 8px o menos para superficies operativas.
- Rojo solo para riesgo, error o bloqueo.
- Ambar para atencion, dato incompleto o credenciales pendientes.
- Verde para objetivo logrado o fuente confiable.
- Espaciado generoso entre secciones y compacto dentro de tablas/paneles.

### Spacing

- Page shell: `px-4 py-6`, `lg:px-6`.
- Secciones: `gap-6` entre bloques principales.
- Tarjetas KPI: `p-4`, `gap-3`, altura minima estable.
- Tablas: padding vertical `py-2` en header, `py-3` en filas.
- Mobile: apilar cards y evitar depender de scroll horizontal para KPIs principales.

### Typography

- H1: `text-3xl font-semibold tracking-normal`.
- Section title: `text-lg font-semibold tracking-normal`.
- Card title: `text-sm font-medium`.
- Supporting copy: `text-sm leading-6 text-muted-foreground`.
- Microcopy/source: `text-xs leading-5 text-muted-foreground`.
- No escalar fuente con viewport ni usar letter-spacing negativo.

### Semantic States

- `Logrado`: verde, KPI o fuente en rango saludable.
- `Atencion`: ambar, requiere revision o dato incompleto.
- `Riesgo`: rojo, bloqueo, margen/meta critica o error.
- `Informativo`: slate, lectura sin meta aprobada.
- `Sin datos`: explicar si es cero real, fuente faltante o filtro sin dataset.
- `Sin permiso`: usar `/forbidden`, no esconder solo por UI.
- `Sin configurar`: integracion pendiente de credenciales server-side.
- `Dato vencido`: mostrar ultima actualizacion y freshness.

### Charts

- Usar visualizaciones 2D simples.
- Mostrar periodo, unidad, comparacion y tooltip/title cuando aplique.
- No usar 3D, gradientes decorativos ni colores sin significado.
- Usar colores de linea de negocio solo para identidad; estados mantienen verde/ambar/rojo.

### Cards, Tables And Filters

- Cards: items repetidos, modales o herramientas acotadas; no cards dentro de cards si se puede evitar.
- Tables: desktop/tablet con `overflow-x-auto`; mobile con cards resumidas para filas ejecutivas.
- Filters: globales en header, filtros secundarios en tabs/paneles locales.
- Buttons icon+texto para acciones criticas; icon-only solo con `aria-label`.
- Badges: estado, alcance, fuente y calidad; no reemplazan explicacion de datos faltantes.

### Loading, Empty And Error

- Loading: skeleton o texto corto dentro de la region que carga.
- Empty: explicar que filtro no tiene dataset y que accion lo resuelve.
- Error: mensaje claro con retry cuando existe accion segura.
- No data: no presentar cero silencioso si falta fuente esencial.
- Not connected: mostrar conector, credenciales requeridas, ultimo intento y fallback manual.
