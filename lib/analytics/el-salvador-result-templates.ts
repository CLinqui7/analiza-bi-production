export type ResultTemplateSheet = {
  sheetName: string;
  purpose: string;
  containsPersonalData: boolean;
  requiredHeaders: string[];
};

export type ResultTemplateRowCounts = {
  customerRows: number;
  salesRows: number;
  daysAndHoursRows: number;
  doctorRows: number | null;
  doctorLocationRows: number | null;
};

export type ElSalvadorBranchResultTemplate = {
  id: string;
  branchName: string;
  branchCode: string;
  city: string;
  fileName: string;
  filePeriod: string;
  workbookPeriod: string;
  salesPeriod: string;
  manager: string;
  areaManager: string;
  revenueTarget: number;
  projectedRevenue: number | null;
  actualRevenue: number;
  revenueCompletionRate: number;
  netRevenue: number;
  marginRate: number;
  marginAmount: number;
  costOfSale: number;
  rowCounts: ResultTemplateRowCounts;
  uploadedCopies: number;
  dataQualityScore: number;
  validationFlags: string[];
};

export const elSalvadorResultTemplateSheets: ResultTemplateSheet[] = [
  {
    sheetName: "FILTROS",
    purpose: "Catalogos de sucursales, meses, gerente de area y gerente.",
    containsPersonalData: false,
    requiredHeaders: ["SUCURSALES", "GA", "Gerente"],
  },
  {
    sheetName: "Llenado de plantilla",
    purpose: "Raiz manual y formulada para metas, venta, costos y reportes.",
    containsPersonalData: false,
    requiredHeaders: [
      "ORIGEN DEL DATO",
      "NOMBRE DEL REPORTE",
      "DATOS",
      "SUCURSAL",
    ],
  },
  {
    sheetName: "Evaluación",
    purpose: "Resumen ejecutivo de sucursal, gerente, meta, venta y cumplimiento.",
    containsPersonalData: false,
    requiredHeaders: ["VENTA", "VENTA OBJETIVO", "VENTA OBTENIDA"],
  },
  {
    sheetName: "YTD",
    purpose: "Comparativo historico y acumulado financiero por mes.",
    containsPersonalData: false,
    requiredHeaders: [
      "Meta",
      "Venta Total",
      "Venta sin IVA",
      "Costo de la Venta",
    ],
  },
  {
    sheetName: "Llenado clientes DRSV",
    purpose: "Detalle transaccional de ordenes y examenes.",
    containsPersonalData: true,
    requiredHeaders: [
      "Fecha",
      "Hora",
      "Sucursal",
      "Estado",
      "Num. Orden",
      "Total",
    ],
  },
  {
    sheetName: "llenado de venta drsv",
    purpose: "Ventas por orden, forma de pago, usuario y tipo.",
    containsPersonalData: false,
    requiredHeaders: ["SUCURSAL", "FECHA", "NUM.ORDEN", "FORMA DE PAGO", "TOTAL"],
  },
  {
    sheetName: "Llenado Dias y Horas",
    purpose: "Ordenes por fecha, hora, dia, descuento, impuesto y total.",
    containsPersonalData: true,
    requiredHeaders: ["Fecha", "Hora", "Sucursal", "Estado", "Total"],
  },
  {
    sheetName: "Llenado de Medicos",
    purpose: "Produccion por doctor, examen, especialidad, area y visitador.",
    containsPersonalData: false,
    requiredHeaders: ["Fecha", "Doctor", "Examen", "Especialidad", "Monto"],
  },
  {
    sheetName: "Ubicacion Medicos",
    purpose: "Catalogo de doctores, especialidad, ubicacion y visitador.",
    containsPersonalData: false,
    requiredHeaders: ["DOCTOR", "ESPECIALIDAD", "Departamento", "Municipio"],
  },
  {
    sheetName: "Proyección",
    purpose: "Proyeccion de venta por dia de semana.",
    containsPersonalData: false,
    requiredHeaders: ["Dia de Semana", "Fecha", "Venta Neta", "Proyectado"],
  },
];

export const elSalvadorBranchResultTemplates: ElSalvadorBranchResultTemplate[] = [
  {
    id: "sv-aguilares-l033",
    branchName: "SS - Aguilares - L033",
    branchCode: "L033",
    city: "Aguilares",
    fileName: "Plantilla Julio 2026 Aguilares.xlsx",
    filePeriod: "Julio 2026",
    workbookPeriod: "Junio 2026",
    salesPeriod: "Junio 2026",
    manager: "Katherine Leonardo",
    areaManager: "Ana Maria Rivera",
    revenueTarget: 28000,
    projectedRevenue: 28428.91,
    actualRevenue: 29942.68,
    revenueCompletionRate: 1.0694,
    netRevenue: 26497.95,
    marginRate: 0.8585,
    marginAmount: 25704.34,
    costOfSale: 4238.34,
    rowCounts: {
      customerRows: 9031,
      salesRows: 9034,
      daysAndHoursRows: 9031,
      doctorRows: 4504,
      doctorLocationRows: 3125,
    },
    uploadedCopies: 2,
    dataQualityScore: 86,
    validationFlags: [
      "Archivo duplicado detectado",
      "El nombre del archivo dice Julio 2026, pero la hoja Evaluacion dice Junio 2026",
      "Las hojas de clientes contienen datos personales y deben anonimizarse para dashboards",
    ],
  },
  {
    id: "sv-chalatenango-l036",
    branchName: "SS - Chalatenango- L036",
    branchCode: "L036",
    city: "Chalatenango",
    fileName: "Plantilla Junio 2026 Chalatenango.xlsx",
    filePeriod: "Junio 2026",
    workbookPeriod: "Junio 2026",
    salesPeriod: "Junio 2026",
    manager: "Ulises Mayen",
    areaManager: "Ana Maria Rivera",
    revenueTarget: 17000,
    projectedRevenue: 17015.89,
    actualRevenue: 17525.06,
    revenueCompletionRate: 1.0309,
    netRevenue: 15508.9,
    marginRate: 0.8659,
    marginAmount: 15175.38,
    costOfSale: 2349.68,
    rowCounts: {
      customerRows: 5518,
      salesRows: 5490,
      daysAndHoursRows: 5494,
      doctorRows: 4360,
      doctorLocationRows: 3088,
    },
    uploadedCopies: 1,
    dataQualityScore: 82,
    validationFlags: [
      "YTD contiene formulas con division entre cero en el archivo revisado",
      "Las hojas de clientes contienen datos personales y deben anonimizarse para dashboards",
    ],
  },
  {
    id: "sv-constitucion-l009",
    branchName: "SS - Constitucion - L009",
    branchCode: "L009",
    city: "Constitucion",
    fileName: "Plantilla Junio 2026 Constitucion.xlsx",
    filePeriod: "Junio 2026",
    workbookPeriod: "Enero 2026",
    salesPeriod: "Junio 2026",
    manager: "Domenica Lopez",
    areaManager: "Ana Maria Rivera",
    revenueTarget: 65000,
    projectedRevenue: 59130.07,
    actualRevenue: 55663.47,
    revenueCompletionRate: 0.8564,
    netRevenue: 49259.71,
    marginRate: 0.8684,
    marginAmount: 48337.36,
    costOfSale: 7326.11,
    rowCounts: {
      customerRows: 19999,
      salesRows: 19999,
      daysAndHoursRows: 19999,
      doctorRows: null,
      doctorLocationRows: null,
    },
    uploadedCopies: 1,
    dataQualityScore: 73,
    validationFlags: [
      "La celda de mes en Evaluacion no coincide con el periodo de venta",
      "Algunas hojas superan 19,999 filas y requieren validacion completa en backend",
      "Las hojas de clientes contienen datos personales y deben anonimizarse para dashboards",
    ],
  },
  {
    id: "sv-la-libertad-l031",
    branchName: "SS - La Libertad - L031",
    branchCode: "L031",
    city: "La Libertad",
    fileName: "Plantilla Junio 2026 La Libertad.xlsx",
    filePeriod: "Junio 2026",
    workbookPeriod: "Junio 2026",
    salesPeriod: "Junio 2026",
    manager: "Damaris Lopez",
    areaManager: "Ana Maria Rivera",
    revenueTarget: 32000,
    projectedRevenue: 33278.76,
    actualRevenue: 29391.16,
    revenueCompletionRate: 0.9185,
    netRevenue: 26009.88,
    marginRate: 0.8535,
    marginAmount: 25086.66,
    costOfSale: 4304.5,
    rowCounts: {
      customerRows: 13869,
      salesRows: 16282,
      daysAndHoursRows: 8301,
      doctorRows: 8538,
      doctorLocationRows: 3088,
    },
    uploadedCopies: 1,
    dataQualityScore: 88,
    validationFlags: [
      "Las hojas de clientes contienen datos personales y deben anonimizarse para dashboards",
    ],
  },
  {
    id: "sv-merliot-2-l045",
    branchName: "SS-Merliot 2- L045",
    branchCode: "L045",
    city: "Merliot 2",
    fileName: "Plantilla Junio 2026 Merliot 2.xlsx",
    filePeriod: "Junio 2026",
    workbookPeriod: "Junio 2026",
    salesPeriod: "Junio 2026",
    manager: "Devy Campos",
    areaManager: "Ana Maria Rivera",
    revenueTarget: 18000,
    projectedRevenue: 1613.65,
    actualRevenue: 18825.71,
    revenueCompletionRate: 1.0459,
    netRevenue: 16659.92,
    marginRate: 0.832,
    marginAmount: 15663.48,
    costOfSale: 3162.23,
    rowCounts: {
      customerRows: 7439,
      salesRows: 7412,
      daysAndHoursRows: 7436,
      doctorRows: 3088,
      doctorLocationRows: 3125,
    },
    uploadedCopies: 1,
    dataQualityScore: 79,
    validationFlags: [
      "La proyeccion luce incompleta frente a la venta obtenida",
      "YTD contiene formulas con division entre cero en el archivo revisado",
      "Las hojas de clientes contienen datos personales y deben anonimizarse para dashboards",
    ],
  },
  {
    id: "sv-plaza-sur-l018",
    branchName: "SS - Plaza Sur - L018",
    branchCode: "L018",
    city: "Plaza Sur",
    fileName: "Plantilla Junio 2026 Plaza Sur.xlsx",
    filePeriod: "Junio 2026",
    workbookPeriod: "Julio 2026",
    salesPeriod: "Junio 2026",
    manager: "Judith Melgar",
    areaManager: "Ana Maria Rivera",
    revenueTarget: 30000,
    projectedRevenue: 44055.9,
    actualRevenue: 26989.79,
    revenueCompletionRate: 0.8997,
    netRevenue: 23884.77,
    marginRate: 0.8762,
    marginAmount: 23647.3,
    costOfSale: 3342.49,
    rowCounts: {
      customerRows: 17936,
      salesRows: 17975,
      daysAndHoursRows: 17975,
      doctorRows: 19999,
      doctorLocationRows: 3088,
    },
    uploadedCopies: 1,
    dataQualityScore: 78,
    validationFlags: [
      "La celda de mes en Evaluacion no coincide con el periodo de venta",
      "La proyeccion esta muy por encima de la venta obtenida",
      "Las hojas de clientes contienen datos personales y deben anonimizarse para dashboards",
    ],
  },
  {
    id: "sv-santa-tecla-l011",
    branchName: "SS - Santa Tecla - L011",
    branchCode: "L011",
    city: "Santa Tecla",
    fileName: "Plantilla Junio 2026 Santa Tecla.xlsx",
    filePeriod: "Junio 2026",
    workbookPeriod: "Junio 2026",
    salesPeriod: "Junio 2026",
    manager: "Melvin Cerna",
    areaManager: "Ana Maria Rivera",
    revenueTarget: 30000,
    projectedRevenue: null,
    actualRevenue: 28747.5,
    revenueCompletionRate: 0.9583,
    netRevenue: 25440.27,
    marginRate: 0.8372,
    marginAmount: 24067.62,
    costOfSale: 4679.88,
    rowCounts: {
      customerRows: 19999,
      salesRows: 19501,
      daysAndHoursRows: 19493,
      doctorRows: 19999,
      doctorLocationRows: 3088,
    },
    uploadedCopies: 1,
    dataQualityScore: 76,
    validationFlags: [
      "La proyeccion del mes devuelve #DIV/0! en el archivo revisado",
      "Algunas hojas superan 19,999 filas y requieren validacion completa en backend",
      "Las hojas de clientes contienen datos personales y deben anonimizarse para dashboards",
    ],
  },
];

const totalFiles = elSalvadorBranchResultTemplates.reduce(
  (sum, branch) => sum + branch.uploadedCopies,
  0,
);

const totalActualRevenue = elSalvadorBranchResultTemplates.reduce(
  (sum, branch) => sum + branch.actualRevenue,
  0,
);

const totalRevenueTarget = elSalvadorBranchResultTemplates.reduce(
  (sum, branch) => sum + branch.revenueTarget,
  0,
);

const totalCostOfSale = elSalvadorBranchResultTemplates.reduce(
  (sum, branch) => sum + branch.costOfSale,
  0,
);

export const elSalvadorTemplateSummary = {
  country: "El Salvador",
  businessUnit: "Analiza Laboratorio",
  uniqueBranches: elSalvadorBranchResultTemplates.length,
  uploadedFiles: totalFiles,
  duplicateFiles: totalFiles - elSalvadorBranchResultTemplates.length,
  sheetsDetected: elSalvadorResultTemplateSheets.length,
  totalActualRevenue,
  totalRevenueTarget,
  totalCostOfSale,
  totalCompletionRate: totalActualRevenue / totalRevenueTarget,
  averageDataQuality:
    elSalvadorBranchResultTemplates.reduce(
      (sum, branch) => sum + branch.dataQualityScore,
      0,
    ) / elSalvadorBranchResultTemplates.length,
};

export function formatCurrency(value: number | null) {
  if (value === null) {
    return "Pendiente";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}
