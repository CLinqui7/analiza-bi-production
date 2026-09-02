import {
  elSalvadorBranchResultTemplates,
  elSalvadorTemplateSummary,
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";

export type ModuleMetric = {
  label: string;
  value: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
};

export type ModuleInsight = {
  title: string;
  detail: string;
  action: string;
  priority: "alta" | "media" | "baja";
};

export type ModuleRow = {
  label: string;
  owner: string;
  value: string;
  status: string;
};

export type ModuleConfig = {
  title: string;
  audience: string;
  description: string;
  metrics: ModuleMetric[];
  insights: ModuleInsight[];
  rows: ModuleRow[];
  explanation?: string;
};

export const moduleConfigs: Record<string, ModuleConfig> = {
  operacion: {
    title: "Operacion ejecutiva",
    audience: "CEO y gerente de operaciones",
    description:
      "Salud operacional por negocio, sucursal y rango de fechas: demanda, productividad, cumplimiento, cuellos de botella y alertas.",
    metrics: [
      { label: "Salud operativa", value: "84%", note: "vs 79% mes anterior", tone: "positive" },
      { label: "Productividad", value: "91%", note: "vs meta 88%", tone: "positive" },
      { label: "Brecha de servicio", value: "7.8%", note: "requiere seguimiento", tone: "warning" },
      { label: "Alertas criticas", value: "3", note: "capacidad y no-shows", tone: "warning" },
    ],
    insights: [
      {
        title: "Fisioterapia tiene alta agenda pero menor asistencia efectiva",
        detail: "La ocupacion agendada supera 78%, pero la efectiva queda cerca de 69%.",
        action: "Revisar confirmaciones, recordatorios y reasignacion de horarios pico.",
        priority: "alta",
      },
      {
        title: "Laboratorio sostiene volumen con riesgo en tiempos de entrega",
        detail: "El volumen sube 11%, pero dos sucursales DEMO aparecen cercanas a meta de entrega.",
        action: "Comparar tecnicos disponibles contra demanda por hora.",
        priority: "media",
      },
      {
        title: "Imagenes muestra capacidad ociosa en horarios vespertinos",
        detail: "La utilizacion baja despues de las 15:00 en dos equipos DEMO.",
        action: "Evaluar campañas o convenios para llenar slots de baja demanda.",
        priority: "media",
      },
    ],
    rows: [
      { label: "Analiza Fisioterapia", owner: "Gerencia Operaciones", value: "91% meta operativa", status: "En ruta" },
      { label: "Analiza Laboratorio", owner: "Gerencia Laboratorio", value: "86% meta operativa", status: "Vigilar TAT" },
      { label: "Analiza Imagenes", owner: "Gerencia Imagenes", value: "80% utilizacion", status: "Capacidad ociosa" },
    ],
  },
  finanzas: {
    title: "Salud financiera",
    audience: "CEO y webmaster / administrador",
    description:
      "Insights financieros por negocio: ingresos, gastos fijos/variables, costos fijos/variables, margen, perdidas y cumplimiento de presupuesto.",
    metrics: [
      { label: "Margen contribucion", value: "34%", note: "costos directos DEMO", tone: "warning" },
      { label: "Gastos fijos", value: "$72.4K", note: "renta, planilla, servicios", tone: "neutral" },
      { label: "Gastos variables", value: "$41.8K", note: "insumos y comisiones", tone: "warning" },
      { label: "Flujo neto operativo", value: "$28.9K", note: "+5.2% vs mes anterior", tone: "positive" },
    ],
    insights: [
      {
        title: "Ingresos crecen, pero el margen baja en Laboratorio",
        detail: "El costo variable por prueba sube por consumo de reactivos DEMO.",
        action: "Revisar compras, merma y precio promedio por prueba.",
        priority: "alta",
      },
      {
        title: "Fisioterapia supera meta con gastos fijos estables",
        detail: "La base fija se mantiene y el ingreso por hora disponible mejora.",
        action: "Usar esta sucursal como referencia para meta sugerida.",
        priority: "media",
      },
      {
        title: "Imagenes requiere separar costo fijo de equipo",
        detail: "Sin depreciacion/mantenimiento completo, no debe mostrarse utilidad neta.",
        action: "Completar plantilla de costos fijos y variables.",
        priority: "media",
      },
    ],
    rows: [
      { label: "Fisioterapia", owner: "Finanzas", value: "$94.2K ingresos", status: "Margen estable" },
      { label: "Laboratorio", owner: "Finanzas", value: "$86.9K ingresos", status: "Costo variable alto" },
      { label: "Imagenes", owner: "Finanzas", value: "$67.5K ingresos", status: "Faltan costos fijos" },
    ],
  },
  profesionales: {
    title: "Profesionales",
    audience: "Gerente de operaciones y gerente de sucursal",
    description:
      "Rendimiento de doctores, licenciados en fisioterapia, tecnicos de laboratorio, rayos X e imagenes.",
    metrics: [
      { label: "Productividad promedio", value: "87%", note: "ajustada por capacidad", tone: "positive" },
      { label: "Sobrecarga", value: "4", note: "profesionales DEMO", tone: "warning" },
      { label: "Disponibilidad", value: "18%", note: "horas abiertas", tone: "neutral" },
      { label: "Calidad registro", value: "82%", note: "campos completos", tone: "warning" },
    ],
    insights: [
      {
        title: "Asignacion de turnos no balanceada",
        detail: "Dos fisioterapeutas concentran mayor volumen en horas pico.",
        action: "Revisar agenda y redistribuir carga semanal.",
        priority: "media",
      },
      {
        title: "Tecnicos de imagenes con disponibilidad reutilizable",
        detail: "Hay slots vespertinos con baja demanda.",
        action: "Activar oferta o convenios para esos horarios.",
        priority: "media",
      },
    ],
    rows: [
      { label: "Lic. Fisioterapia DEMO A", owner: "Fisioterapia Norte", value: "94% productividad", status: "Bono sugerido" },
      { label: "Tecnico Lab DEMO A", owner: "Laboratorio Central", value: "88% productividad", status: "En meta" },
      { label: "Tecnico Rayos X DEMO A", owner: "Imagenes Este", value: "76% productividad", status: "Disponibilidad" },
    ],
  },
  servicios: {
    title: "Servicios",
    audience: "CEO, gerente de operaciones y gerente de sucursal",
    description:
      "Rentabilidad por servicio, costos, ganancias, demanda y brechas contra metas por sucursal.",
    metrics: [
      { label: "Servicios rentables", value: "18", note: "margen positivo", tone: "positive" },
      { label: "Servicios en brecha", value: "5", note: "bajo meta", tone: "warning" },
      { label: "Costo promedio", value: "$18.40", note: "variable DEMO", tone: "neutral" },
      { label: "Ganancia promedio", value: "$31.70", note: "con costos directos", tone: "positive" },
    ],
    insights: [
      {
        title: "Ultrasonido tiene buen ingreso pero costo fijo pendiente",
        detail: "La ganancia DEMO no debe considerarse neta hasta cargar mantenimiento/equipo.",
        action: "Completar plantilla de costos fijos por modalidad.",
        priority: "alta",
      },
      {
        title: "Fisioterapia recurrente sostiene margen",
        detail: "Planes de sesiones tienen menor cancelacion y mejor ticket acumulado.",
        action: "Monitorear cumplimiento de planes por paciente anonimo.",
        priority: "media",
      },
    ],
    rows: [
      { label: "Sesion fisioterapia", owner: "Fisioterapia", value: "$22 ganancia", status: "Sobre meta" },
      { label: "Prueba laboratorio", owner: "Laboratorio", value: "$14 ganancia", status: "Costo variable alto" },
      { label: "Ultrasonido", owner: "Imagenes", value: "$38 ganancia", status: "Costo fijo pendiente" },
    ],
  },
  fisioterapia: {
    title: "Overview Fisioterapia",
    audience: "CEO, gerente de operaciones y gerente de sucursal",
    description:
      "Resumen exclusivo de fisioterapia: sesiones, planes, ocupacion, profesionales, ingresos, planillas y bonos.",
    metrics: [
      { label: "Sesiones completadas", value: "2,840", note: "+9% vs mes anterior", tone: "positive" },
      { label: "Cumplimiento planes", value: "81%", note: "pacientes anonimos", tone: "warning" },
      { label: "Ingreso por hora", value: "$74", note: "hora atendida", tone: "positive" },
      { label: "Bono sugerido", value: "$4.2K", note: "segun productividad", tone: "neutral" },
    ],
    insights: [
      {
        title: "Planes incompletos en dos sucursales",
        detail: "Los pacientes no completan todas las sesiones previstas.",
        action: "Activar seguimiento de abandono de plan.",
        priority: "alta",
      },
    ],
    rows: [
      { label: "Planilla productividad fisio", owner: "Gerente sucursal", value: "Lista DEMO", status: "Para bono" },
      { label: "Plantilla sesiones", owner: "Operaciones", value: "Carga semanal", status: "Raiz KPI" },
    ],
  },
  laboratorio: {
    title: "Overview Laboratorio",
    audience: "CEO, gerente de operaciones y gerente de sucursal",
    description:
      "Resumen exclusivo de laboratorio: ordenes, pruebas, tiempos de entrega, costos, reactivos, planillas y bonos.",
    metrics: [
      { label: "Pruebas procesadas", value: "8,420", note: "+11% vs mes anterior", tone: "positive" },
      { label: "Entrega en meta", value: "86%", note: "TAT DEMO", tone: "warning" },
      { label: "Costo por prueba", value: "$6.90", note: "reactivos variables", tone: "warning" },
      { label: "Bono sugerido", value: "$3.6K", note: "volumen + calidad", tone: "neutral" },
    ],
    insights: [
      {
        title: "Reactivos presionan margen",
        detail: "El costo variable sube mas rapido que el precio promedio.",
        action: "Revisar consumo, vencimientos y compras.",
        priority: "alta",
      },
    ],
    rows: [
      { label: "Plantilla pruebas", owner: "Gerente laboratorio", value: "Carga diaria", status: "Raiz KPI" },
      { label: "Planilla tecnicos", owner: "Operaciones", value: "Lista DEMO", status: "Para bono" },
    ],
  },
  imagenes: {
    title: "Overview Imagenes",
    audience: "CEO, gerente de operaciones y gerente de sucursal",
    description:
      "Resumen exclusivo de imagenes: estudios, modalidades, equipos, informes, costos, planillas y bonos.",
    metrics: [
      { label: "Estudios realizados", value: "1,940", note: "+6% vs mes anterior", tone: "positive" },
      { label: "Utilizacion equipo", value: "74%", note: "vs meta 82%", tone: "warning" },
      { label: "Informes pendientes", value: "38", note: "por medico informante", tone: "warning" },
      { label: "Bono sugerido", value: "$2.8K", note: "productividad + entrega", tone: "neutral" },
    ],
    insights: [
      {
        title: "Capacidad ociosa de equipos",
        detail: "Hay baja utilizacion en horarios vespertinos DEMO.",
        action: "Revisar agenda por modalidad y disponibilidad de medico informante.",
        priority: "media",
      },
    ],
    rows: [
      { label: "Plantilla estudios", owner: "Gerente imagenes", value: "Carga diaria", status: "Raiz KPI" },
      { label: "Planilla tecnicos", owner: "Operaciones", value: "Lista DEMO", status: "Para bono" },
    ],
  },
  insights: {
    title: "Insights ejecutivos",
    audience: "CEO, webmaster / administrador y gerente de operaciones",
    description:
      "Priorizacion de hallazgos financieros, operativos, comerciales y de calidad para decidir que corregir primero.",
    metrics: [
      { label: "Insights activos", value: "18", note: "DEMO", tone: "neutral" },
      { label: "Criticos", value: "4", note: "impactan margen/meta", tone: "warning" },
      { label: "Acciones vencidas", value: "2", note: "requieren dueno", tone: "negative" },
      { label: "Ahorro estimado", value: "$9.8K", note: "si se corrige", tone: "positive" },
    ],
    insights: [
      {
        title: "Priorizar margen antes de aumentar volumen",
        detail: "Laboratorio crece en demanda, pero el costo variable reduce contribucion.",
        action: "Cruzar costos de reactivos, precio promedio y volumen por prueba.",
        priority: "alta",
      },
      {
        title: "Capacidad disponible puede mejorar ventas sin abrir sucursal",
        detail: "Imagenes tiene slots con baja utilizacion en tardes.",
        action: "Activar agenda dirigida y metas por franja horaria.",
        priority: "media",
      },
    ],
    rows: [
      { label: "Margen laboratorio", owner: "Finanzas", value: "Impacto alto", status: "Abierto" },
      { label: "No-shows fisioterapia", owner: "Operaciones", value: "Impacto medio", status: "En accion" },
      { label: "Capacidad imagenes", owner: "Gerente sucursal", value: "Impacto medio", status: "Pendiente" },
    ],
  },
  importaciones: {
    title: "Importaciones",
    audience: "Gerente de operaciones por linea de negocio",
    description:
      "Carga controlada de plantillas Excel/CSV: validacion, vista previa, errores, aprobacion y registro de auditoria.",
    metrics: [
      { label: "Cargas del mes", value: "22", note: "DEMO", tone: "neutral" },
      { label: "Aprobadas", value: "18", note: "sin errores criticos", tone: "positive" },
      { label: "En correccion", value: "4", note: "datos incompletos", tone: "warning" },
      { label: "Trazabilidad", value: "100%", note: "usuario y fuente", tone: "positive" },
    ],
    insights: [
      {
        title: "La importacion no debe afectar dashboard hasta aprobarse",
        detail: "Primero se valida formato, duplicados, fechas, costos y sucursal.",
        action: "Mostrar errores al gerente de operaciones antes de confirmar la carga.",
        priority: "alta",
      },
    ],
    rows: [
      { label: "Citas julio", owner: "Gerente operaciones", value: "Validada", status: "Aprobada" },
      { label: "Costos variables", owner: "Gerente operaciones", value: "Errores", status: "Corregir" },
      { label: "Planilla bonos", owner: "Operaciones", value: "Vista previa", status: "Pendiente" },
    ],
  },
  plantillas: {
    title: "Plantillas raiz del sistema",
    audience: "Gerente de operaciones y gerente de sucursal",
    description:
      "Excels que alimentan todo el sistema cuando no existe API: resultados de sucursal, metas, costos, ventas, ordenes, medicos y planillas.",
    explanation:
      "Estas plantillas son las raices del sistema cuando aun no hay conector. Para El Salvador ya se reconoce la plantilla de resultados que subira cada sucursal; el sistema debe validar periodo, sucursal, gerente, venta, meta, costo, margen, filas y datos personales antes de alimentar dashboards.",
    metrics: [
      {
        label: "Sucursales SV",
        value: `${elSalvadorTemplateSummary.uniqueBranches}`,
        note: "plantillas reales revisadas",
        tone: "positive",
      },
      {
        label: "Archivos detectados",
        value: `${elSalvadorTemplateSummary.uploadedFiles}`,
        note: `${elSalvadorTemplateSummary.duplicateFiles} duplicado`,
        tone: "warning",
      },
      {
        label: "Venta cargada",
        value: formatCurrency(elSalvadorTemplateSummary.totalActualRevenue),
        note: formatRate(elSalvadorTemplateSummary.totalCompletionRate),
        tone: "positive",
      },
      {
        label: "Calidad promedio",
        value: `${Math.round(elSalvadorTemplateSummary.averageDataQuality)}%`,
        note: "requiere validaciones",
        tone: "warning",
      },
    ],
    insights: [
      {
        title: "Plantillas son la fuente raiz cuando no hay conector",
        detail: "Cada KPI debe trazarse hasta el Excel, fila y usuario que lo cargo.",
        action: "Priorizar citas, capacidad, costos, ventas, metas y planillas.",
        priority: "alta",
      },
    ],
    rows: elSalvadorBranchResultTemplates.map((branch) => ({
      label: branch.branchName,
      owner: branch.manager,
      value: `${branch.salesPeriod} / ${formatCurrency(branch.actualRevenue)}`,
      status:
        branch.validationFlags.length > 1 ? "Revisar calidad" : "Validada",
    })),
  },
  conectores: {
    title: "Conectores y APIs",
    audience: "Webmaster / Administrador",
    description:
      "APIs, endpoints, CRM, facturacion y sistemas externos. Si no hay API viable, la plantilla alimenta el sistema.",
    metrics: [
      { label: "Conectores DEMO", value: "5", note: "CRM, facturacion, unidades", tone: "neutral" },
      { label: "Listos para credenciales", value: "0", note: "reales pendientes", tone: "warning" },
      { label: "Fallos sync", value: "0", note: "DEMO", tone: "positive" },
      { label: "Fallback plantilla", value: "Activo", note: "cuando API no existe", tone: "positive" },
    ],
    insights: [
      {
        title: "CRM debe priorizar API oficial",
        detail: "No se debe hacer scraping que evada login, MFA, CAPTCHA o restricciones.",
        action: "Documentar credenciales y permisos necesarios por proveedor.",
        priority: "alta",
      },
    ],
    rows: [
      { label: "CRM", owner: "BI/TI", value: "API pendiente", status: "Deshabilitado real" },
      { label: "Facturacion", owner: "Finanzas", value: "Adaptador DEMO", status: "Listo DEMO" },
      { label: "Carga manual", owner: "Gerentes", value: "Plantillas", status: "Activo" },
    ],
  },
  "calidad-datos": {
    title: "Calidad de datos",
    audience: "CEO, webmaster / administrador y gerente de operaciones",
    description:
      "Calidad de datos significa saber si la informacion es completa, valida, consistente, unica, puntual y trazable.",
    explanation:
      "En simple: calidad de datos es que el numero sea confiable. Revisa si faltan campos, si las fechas son validas, si no hay duplicados, si el estado de una cita esta bien mapeado y si se sabe de que plantilla, API o usuario salio cada dato.",
    metrics: [
      {
        label: "Calidad promedio SV",
        value: `${Math.round(elSalvadorTemplateSummary.averageDataQuality)}%`,
        note: "plantillas revisadas",
        tone: "warning",
      },
      {
        label: "Duplicados",
        value: `${elSalvadorTemplateSummary.duplicateFiles}`,
        note: "Aguilares julio",
        tone: "warning",
      },
      {
        label: "Campos sensibles",
        value: "2 hojas",
        note: "cliente y telefono",
        tone: "warning",
      },
      {
        label: "Fuentes cargadas",
        value: `${elSalvadorTemplateSummary.uploadedFiles}`,
        note: "archivos El Salvador",
        tone: "positive",
      },
    ],
    insights: [
      {
        title: "No hay insight confiable sin calidad suficiente",
        detail: "Si faltan capacidad, costos o mapeo de estados, el sistema debe mostrar advertencia.",
        action: "Corregir plantilla o conector antes de presentar conclusion ejecutiva.",
        priority: "alta",
      },
    ],
    rows: [
      {
        label: "Archivo duplicado",
        owner: "BI",
        value: "Aguilares julio",
        status: "Consolidar una copia",
      },
      {
        label: "Periodo no coincide",
        owner: "Gerente sucursal",
        value: "Aguilares, Constitucion, Plaza Sur",
        status: "Revisar mes",
      },
      {
        label: "Formula con error",
        owner: "BI/Finanzas",
        value: "YTD o proyeccion",
        status: "Corregir antes de aprobar",
      },
      {
        label: "Datos personales",
        owner: "Admin sistema",
        value: "Cliente / telefono",
        status: "Bloquear en dashboards",
      },
    ],
  },
  metas: {
    title: "Metas y avances",
    audience: "CEO y gerente de operaciones",
    description:
      "Metas por negocio, sucursal y mes. El sistema sugiere metas por insights, pero el CEO define la meta final.",
    metrics: [
      { label: "Meta ingresos", value: "91%", note: "avance mes actual", tone: "positive" },
      { label: "Meta operativa", value: "87%", note: "avance mes actual", tone: "positive" },
      { label: "Metas sugeridas", value: "6", note: "por insights", tone: "neutral" },
      { label: "Metas pendientes CEO", value: "2", note: "aprobacion final", tone: "warning" },
    ],
    insights: [
      {
        title: "Meta sugerida para Fisioterapia Norte",
        detail: "Por productividad y demanda, el sistema sugiere +8% vs mes anterior.",
        action: "CEO revisa y aprueba, edita o rechaza la meta sugerida.",
        priority: "alta",
      },
    ],
    rows: [
      { label: "Fisioterapia Norte", owner: "CEO", value: "+8% sugerido", status: "Pendiente aprobacion" },
      { label: "Laboratorio Central", owner: "CEO", value: "+5% sugerido", status: "Pendiente aprobacion" },
      { label: "Imagenes Este", owner: "CEO", value: "+3% sugerido", status: "Revisar capacidad" },
    ],
  },
  "usuarios-permisos": {
    title: "Usuarios y permisos",
    audience: "CEO, superadministrador y delegacion gerencial",
    description:
      "Jerarquia Analiza BI: superadministrador, webmaster, CEO, gerente de operaciones, gerente de area, gerente de sucursal, usuario operativo y viewer. El acceso depende de rol y alcance.",
    metrics: [
      { label: "Roles jerarquicos", value: "8", note: "niveles definidos", tone: "positive" },
      { label: "Creacion", value: "Invitacion", note: "sin contrasena manual", tone: "positive" },
      { label: "Alcance", value: "Area + sucursal", note: "RLS obligatorio", tone: "positive" },
      { label: "Desactivacion", value: "Soft delete", note: "con auditoria", tone: "warning" },
    ],
    insights: [
      {
        title: "Nadie crea un rol igual o superior",
        detail: "Gerente de operaciones puede crear gerentes de area; gerente de area puede crear gerentes de sucursal; gerente de sucursal solo usuarios operativos si tiene permiso.",
        action: "Mantener role_hierarchy y permission_delegations como fuente de autorizacion.",
        priority: "alta",
      },
      {
        title: "El alcance pesa tanto como el rol",
        detail: "Toda accion valida organization_id, country_id, company_id, operational_area_id, branch_id y role_id. Un rol correcto fuera de alcance se bloquea.",
        action: "Auditar cambios y conservar historial de asignaciones por area y sucursal.",
        priority: "alta",
      },
    ],
    rows: [
      { label: "Superadministrador", owner: "Sistema", value: "Gobierno global, conectores, dashboards y permisos", status: "Nivel 100" },
      { label: "Gerente de operaciones", owner: "Linea de negocio", value: "Crea areas, crea sucursales y asigna gerentes de area", status: "Nivel 80" },
      { label: "Gerente de area", owner: "Area operativa", value: "Crea o sustituye gerentes de sucursal dentro de su area", status: "Nivel 60" },
      { label: "Gerente de sucursal", owner: "Sucursal asignada", value: "Carga/corrige datos de su sucursal y puede invitar usuarios operativos", status: "Nivel 40" },
      { label: "Usuario operativo", owner: "Sucursal asignada", value: "Captura datos sin privilegios gerenciales", status: "Nivel 20" },
      { label: "Viewer", owner: "Alcance autorizado", value: "Solo lectura", status: "Nivel 10" },
    ],
  },
  configuracion: {
    title: "Mi cuenta y configuracion",
    audience: "Todos los usuarios",
    description:
      "Cambiar nombre, contrasena, preferencias, branding y parametros generales permitidos por rol.",
    metrics: [
      { label: "Perfil", value: "Editable", note: "nombre y preferencias", tone: "neutral" },
      { label: "Contrasena", value: "Supabase", note: "recuperacion segura", tone: "positive" },
      { label: "Branding", value: "Pendiente", note: "logo y colores", tone: "warning" },
      { label: "Pais default", value: "Configurable", note: "por usuario", tone: "neutral" },
    ],
    insights: [
      {
        title: "Configuracion debe llamarse Mi cuenta para usuarios comunes",
        detail: "La configuracion global solo debe verla admin; usuarios ven perfil y contrasena.",
        action: "Separar configuracion personal de administracion global.",
        priority: "media",
      },
    ],
    rows: [
      { label: "Nombre", owner: "Usuario", value: "Editable", status: "Personal" },
      { label: "Contrasena", owner: "Usuario", value: "Recuperacion", status: "Seguro" },
      { label: "Branding", owner: "Admin", value: "Logo/colores", status: "Global" },
    ],
  },
  auditoria: {
    title: "Auditoria y trazabilidad",
    audience: "CEO y webmaster / administrador",
    description:
      "Que sugiero poner aqui: historial de importaciones, cambios de metas, cambios de permisos, ejecuciones de conectores, exportaciones y trazabilidad de cada KPI.",
    explanation:
      "Auditoria debe guardar quien hizo cada cambio, cuando lo hizo, desde que modulo, que dato cambio, cual era el valor anterior, cual es el nuevo y por que se hizo. Es clave para metas, permisos, importaciones, conectores y reportes exportados.",
    metrics: [
      { label: "Eventos auditados", value: "128", note: "DEMO", tone: "neutral" },
      { label: "Cambios de metas", value: "7", note: "requieren trazabilidad", tone: "warning" },
      { label: "Exportaciones", value: "12", note: "PDF/Excel/CSV", tone: "neutral" },
      { label: "Accesos sensibles", value: "3", note: "usuarios/permisos", tone: "warning" },
    ],
    insights: [
      {
        title: "Auditoria debe responder: quien cambio que, cuando y por que",
        detail: "Especialmente metas, permisos, importaciones, reversas, conectores y exportaciones.",
        action: "Agregar detalle por evento y enlace al dato origen.",
        priority: "alta",
      },
    ],
    rows: [
      { label: "Cambio meta Fisioterapia", owner: "CEO DEMO", value: "2026-07-20", status: "Aprobada" },
      { label: "Carga plantilla costos", owner: "Operaciones DEMO", value: "2026-07-18", status: "Validada" },
      { label: "Export PDF ejecutivo", owner: "CEO DEMO", value: "2026-07-19", status: "Registrada" },
    ],
  },
};
