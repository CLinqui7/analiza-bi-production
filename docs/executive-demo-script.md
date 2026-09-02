# Executive Demo Script

Fecha de revision: 2026-08-07  
Duracion objetivo: maximo 10 minutos  
Modo: `APP_ENV=demo` con dataset DEMO aislado y marcado.

## Mensaje central

Analiza Intelligence permite a Direccion ver rapidamente donde se cumple meta,
donde se pierde margen, que capacidad esta ociosa, que sucursal o gerente
requiere atencion y que dato no es confiable todavia.

## Guion

1. Login seguro.
   - Entrar con cuenta demo autorizada del entorno demo.
   - Aclarar que el selector de rol no existe en production y que los permisos reales vienen del servidor.

2. Seleccion de pais y empresa.
   - Abrir contexto.
   - Seleccionar El Salvador y una unidad, por ejemplo Analiza Laboratorio.
   - Mostrar que pais, empresa, sucursal y periodo quedan visibles en el header.

3. Executive Command Center.
   - Ir a `/protected/overview`.
   - Leer las tarjetas: ingresos, cumplimiento meta, margen, pacientes/clientes, ocupacion, no-show, capacidad disponible y cuentas por cobrar.
   - Resaltar ultima actualizacion y calidad del dato.

4. detectar alerta.
   - Abrir “Requiere su atencion”.
   - Leer una tarjeta CRITICO o ATENCION.
   - Explicar impacto y accion propuesta sin presentar DEMO como dato real.

5. Entrar a sucursal.
   - Usar el filtro superior para una sucursal.
   - Confirmar que el dashboard recalcula o muestra no-data si el filtro no tiene fuente cargada.

6. comparar gerentes.
   - Ir a `/protected/gerentes`.
   - Mostrar jerarquia Gerente Operaciones -> Gerente Area -> Gerente Sucursal.
   - Explicar que ingresos, ocupacion, finalizacion, productividad, margen y calidad se ven separados.
   - Aclarar que no-show por gerente queda no calculable si falta agenda por gerente.

7. Revisar capacidad.
   - Ir a `/protected/capacidad`.
   - Explicar diferencia entre ocupacion agendada, ocupacion efectiva y utilizacion tecnica por unidad.
   - Mostrar capacidad ociosa como oportunidad, no como conclusion final si falta fuente.

8. Revisar finanzas.
   - Ir a `/protected/finanzas`.
   - Mostrar facturacion neta, cobros, cuentas por cobrar, costos directos y margen de contribucion.
   - Aclarar que margen de contribucion no es utilidad neta.

9. mostrar importacion.
   - Ir a `/protected/importaciones`.
   - Abrir Carga masiva.
   - Mostrar stepper: Upload, Mapping, Validacion, Preview, Publish y Lineage.
   - Explicar que ningun archivo alimenta BI sin validacion server-side.

10. calidad y lineage.
    - Mostrar lineage de una importacion si existe.
    - Ir a Calidad de datos si hace falta.
    - Cerrar con blockers manuales: migraciones remotas, credenciales reales de conectores y verificacion DOM en deployment.

## Frase de cierre

“La plataforma ya es demostrable como experiencia ejecutiva demo. Para produccion real, faltan aplicar migraciones remotas, conectar credenciales oficiales, poblar jerarquia real y validar el DOM/Console en el deployment autorizado.”
