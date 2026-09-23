# Traspaso técnico: facturación de Laboratorio y ventas extraídas de Excel

Fecha de intervención: 2026-09-23

Repositorio: `CLinqui7/analiza-bi-production`

Rama: `codex/cloudflare-production`

Responsable del commit: `CLinqui7 <linquicarloss@gmail.com>`

## Resumen ejecutivo

Se investigó el reporte del gerente de área de Laboratorio que mostraba sólo `$574` de facturación después de cargar información de un año. El valor no provenía de una suma correcta de ventas: era la suma redondeada de seis porcentajes de cumplimiento de meta, clasificados erróneamente como ingreso por el código antiguo.

La corrección quedó publicada en el alias estable:

- Alias de producción: <https://web-clinqui7s-projects.vercel.app>
- Deployment activo: `dpl_HRmgigxqXQUQLHzQktkeZHJTuoHa`
- URL única del deployment: <https://web-gl75kga6g-clinqui7s-projects.vercel.app>
- SHA activo: `0663cb7db45a047ec3d5faf907b8c2dd0bb82bc5`
- Candidato base que ya contenía el contrato y la acumulación oficial: `0af3894`

La URL observada en la captura original, `web-hn1op6073-clinqui7s-projects.vercel.app`, es un deployment antiguo e inmutable con SHA `82d6acd38842a0d5f53a4633d93fea78b4420c7e`. No debe utilizarse para validar la corrección.

## Síntoma reproducido

La reproducción se realizó en sólo lectura con el alcance real del perfil de gerente de área, sin registrar correo, identificadores personales, cookies o credenciales en este documento.

- Rol efectivo: `gerente_area`.
- Línea asignada: Laboratorio.
- Alcance: seis sucursales autorizadas.
- El código antiguo seleccionaba el KPI `revenue_target_achievement` por una expresión regular que aceptaba nombres que contuvieran “ingreso”.
- Los seis últimos valores de ese KPI sumaban `573.621295333521`.
- La interfaz redondeaba esa suma y mostraba `$574` como si fuera facturación.
- El código antiguo también seleccionaba solamente el cierre más reciente por sucursal, en lugar de acumular todos los meses oficiales del período.

Esta reproducción exacta confirmó que el problema no era una ausencia total de archivos cargados ni un error visual de formato.

## Causa raíz

Había dos defectos independientes:

1. **Selección semántica insegura de KPI.** Se intentaba inferir la facturación mediante texto o expresiones regulares. Un porcentaje de cumplimiento de meta podía coincidir con palabras como “ingreso” y terminar presentado como moneda.
2. **Alcance temporal incorrecto.** La pantalla agregaba el último cierre disponible de cada sucursal y no todos los cierres oficiales del intervalo elegido.

La solución base introducida entre `5a279cb` y `0af3894` reemplazó la inferencia textual por contratos exactos de KPI y acumuló los meses oficiales disponibles. La intervención final `0663cb7` agregó la trazabilidad de ventas provenientes de documentos, sin mezclarlas con la facturación oficial.

## Cambios de código

### Contratos exactos de KPI

Archivo: `lib/analytics/official-kpi-contracts.ts`

- La facturación se selecciona por códigos contractuales conocidos, no por coincidencias en nombres.
- Para Laboratorio, cuando no existe un KPI directo de facturación, se utiliza la base de ingreso reportado que aparece como denominador único de la fórmula de margen aprobada.
- Se agregó `documentSales` como métrica oficial separada.
- `lab_medical_exam_report_sales` alimenta exclusivamente `documentSales`; nunca funciona como respaldo de `revenue`.
- Los códigos de validación del parser se propagan desde el linaje.
- Una advertencia del parser o la ausencia de contribuyentes esperados conserva la cobertura como `partial`.
- La agregación anidada ya no convierte accidentalmente una cobertura parcial en completa.

### Consulta y linaje

Archivo: `lib/v7/server/branch-bi-snapshot.ts`

- La consulta incluye `kpi_result_lineage(validation_codes)` mediante la relación embebida de PostgREST.
- No se añadió un viaje de red independiente para recuperar el linaje.
- `kpi_result_lineage` quedó declarado entre las tablas fuente del snapshot.
- La consulta sigue aplicando autorización y filtros de país, empresa, área, línea, sucursal y período en el servidor.

### Pantalla de resultados

Archivo: `components/official-branch-bi-dashboard.tsx`

- Se agregó la tarjeta y columna **Venta en archivos**.
- La pantalla indica cuántos cierres tienen Excel reconocido, si la cobertura es parcial y cuántas advertencias de parser existen.
- El pie aclara que la venta extraída del Excel no sustituye la facturación oficial cuando el documento cubre sólo un subconjunto.
- La gráfica admite hasta ocho series. Antes se truncaba a cinco y ocultaba la sexta sucursal del gerente de área.
- Se conservaron la facturación, margen, volumen, ocupación y SLA/TAT como métricas independientes.

### TypeScript estricto

Archivo: `app/api/monthly-submissions/route.ts`

- Se definieron tipos explícitos para solicitudes de corrección y cierres base.
- Se resolvieron ocho errores de typecheck del candidato integrado sin introducir `any`.

### Pruebas y documentación

Archivos relevantes:

- `tests/kpi-multiline-integrity.test.mjs`
- `tests/official-branch-bi-display.test.mjs`
- `docs/architecture/2026-09-17-kpi-multiline-contract.md`

Cobertura agregada:

- separación entre facturación oficial y ventas del documento;
- aislamiento por línea de negocio;
- advertencias del parser como cobertura parcial;
- propagación de cobertura parcial a través de agregaciones;
- presencia de la nueva métrica en la UI;
- inclusión de la sexta serie de sucursal.

## Evidencia de datos en sólo lectura

Para el alcance de seis sucursales de Laboratorio:

| Período | Cierres oficiales | Facturación oficial |
| --- | ---: | ---: |
| 2025 | 58 | `$5,681,538.60` |
| 2026 hasta agosto | 37 | `$3,578,531.85` |
| 2025-01-01 a 2026-08-31 | 95 | `$9,260,070.45` |

La interfaz redondea el acumulado completo a `$9,260,070`.

En el mismo alcance:

- Los 95 cierres oficiales publicados tienen adjuntos.
- 63 cierres tienen el KPI reconocido de ventas de reporte de examen médico.
- Las ventas reconocidas en esos documentos suman `$3,976,727.52`; la UI muestra `$3,976,728`.
- Esta cifra es una métrica documental parcial y distinta de la facturación oficial.
- La facturación histórica oficial se reconstruye a partir de la base exacta `reported_revenue` usada en la fórmula aprobada `(reported_revenue-direct_costs)/reported_revenue:v1`.

Estado del conjunto actual de adjuntos de Laboratorio, incluyendo borradores:

- 129 archivos `.xls`.
- 89 analizados estructuradamente.
- 36 guardados como evidencia mediante `SPREADSHEET_STORED_AS_EVIDENCE_ONLY`.
- 3 bloqueados mediante `FORMULA_CELLS_BLOCKED:1`.
- 1 analizado con advertencia `ROW_LIMIT_50000_APPLIED`.

No se publicaron borradores, no se crearon meses, no se recalcularon cierres históricos y no se efectuaron escrituras en la base de datos durante la auditoría.

## Verificación productiva

URL exacta usada para validar el acumulado, omitiendo aquí los UUID internos:

```text
/protected/resultados
  ?country=<país autorizado>
  &company=<empresa autorizada>
  &area=<área autorizada>
  &line=<Laboratorio>
  &branch=__all__
  &from=2025-01-01
  &to=2026-08-31
```

Resultado observado en el alias estable:

- Facturación: `$9,260,070`.
- Venta en archivos: `$3,976,728`.
- Mensaje de cobertura: 63 cierres con Excel reconocido, cobertura parcial y una advertencia de parser.
- Margen: `90.6%`.
- Volumen: `208,461`.
- Seis sucursales visibles en la gráfica y en la tabla.
- El control **Filtros** se abrió correctamente.
- No hubo errores de consola del navegador.
- No aparecieron errores en los logs de ejecución consultados después del despliegue.

La verificación visual se ejecutó con una cuenta administrativa de QA disponible. No se inició sesión como la persona real. La equivalencia del alcance del gerente de área se comprobó de forma separada y en sólo lectura aplicando sus autorizaciones efectivas.

## Rendimiento observado

Primera navegación directa al alias estable durante la prueba:

- `responseStart`: 81 ms.
- `DOMContentLoaded`: 839 ms.
- `loadEventEnd` / duración: aproximadamente 840 ms.
- Transferencia: 18,360 bytes.
- Cuerpo decodificado: 131,896 bytes.

La incorporación del linaje documental no añadió otra consulta de red: se utilizó la relación embebida en la consulta existente. Estas cifras describen una muestra puntual y no deben presentarse como mediana o p95.

## Validaciones ejecutadas

Antes del despliegue de `0663cb7` pasaron:

```text
npm run lint
npm run typecheck
npm test
npm run build
tests/kpi-multiline-integrity
tests/publication-correction-integrity
tests/official-branch-bi-display
```

También pasaron la inspección visual local, la inspección del deployment único, la inspección del alias estable y la interacción con el filtro.

El build informó vulnerabilidades ya existentes en dependencias: 1 moderada, 11 altas y 1 crítica. No se actualizaron dependencias a ciegas porque no eran la causa de este incidente. Deben tratarse en un sprint de seguridad separado con pruebas completas.

## Git y despliegue

Commit funcional:

```text
0663cb7db45a047ec3d5faf907b8c2dd0bb82bc5
fix(bi): expose document sales without replacing revenue
```

Se subió normalmente a `origin/codex/cloudflare-production`, sin `force push`.

El primer preview fue `dpl_XEZktUXu9i6WBLCUoSUo5dwrRmGz`, pero su entorno no tenía Supabase configurado y no se promovió. El deployment productivo validado es `dpl_HRmgigxqXQUQLHzQktkeZHJTuoHa`. El alias estable se asignó explícitamente a este deployment después de verificar `ok: true` y `supabaseConfigured: true`.

## Archivos locales y preservación

- Evidencia visual: `artifacts/area-manager-revenue-alias.png`.
- Evidencia del deployment único: `artifacts/area-manager-revenue-production.png`.
- Evidencia local: `artifacts/area-manager-revenue-local.png`.
- `next-env.d.ts` era un cambio ajeno y se preservó sin incorporarlo al commit.
- SHA-256 preservado de `next-env.d.ts`: `7AD303E40D4FDDF44F156129E397511953A71481C5CFD86B1862649AAAF240CC`.

## Pendientes y límites honestos

1. La facturación oficial quedó corregida en código y activa en el alias estable.
2. La cifra documental se muestra y conserva su linaje, pero sólo 63 de 95 cierres publicados tienen el KPI reconocido; no es un reemplazo de la fuente financiera oficial.
3. La conciliación completa fuente financiera → respuesta contra un control maestro externo sigue pendiente.
4. Los 36 archivos de evidencia, los 3 bloqueos por fórmulas y la advertencia de 50,000 filas requieren revisión de ingestión o del archivo fuente; no deben corregirse inventando valores.
5. Cualquier prueba futura debe usar el alias estable o el deployment SHA actual, no la URL antigua de la captura.
6. Mantener las reglas de seguridad: autorización en servidor, ninguna caché pública de contenido privado, aislamiento por organización/período y ninguna escritura histórica automática.

## Secuencia recomendada para otro Codex

1. Confirmar que `git branch --show-current` devuelve `codex/cloudflare-production` y ejecutar `git status --short --branch`.
2. No restaurar ni incluir `next-env.d.ts` sin confirmar primero que el usuario desea ese cambio.
3. Leer `docs/architecture/2026-09-17-kpi-multiline-contract.md` y `lib/analytics/official-kpi-contracts.ts` antes de modificar selección o agregación de KPI.
4. Verificar el SHA que sirve el alias estable antes de redesplegar; no desplegar si ya sirve una versión posterior válida.
5. Para reproducir, separar facturación oficial de `documentSales` y aplicar exactamente los grants del usuario, la línea, las sucursales y el período.
6. Mantener toda auditoría histórica en sólo lectura salvo autorización específica para una mutación concreta.
7. Después de cualquier cambio ejecutar lint, typecheck, pruebas, build, inspección visual y un commit descriptivo independiente.
