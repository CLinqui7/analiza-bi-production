import {
  elSalvadorBranchResultTemplates,
  elSalvadorResultTemplateSheets,
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
import {
  bulkImportDocuments,
  getDocumentsForLine,
  importBusinessLines,
  type BulkImportDocument,
  type ImportBusinessLine,
} from "@/lib/analytics/import-operations";

export type TemplateWorkbookFile = {
  fileName: string;
  workbookXml: string;
  documentId: string;
  documentName: string;
  line: ImportBusinessLine;
  periodLabel: string;
};

export type TemplatePackageSummary = {
  line: ImportBusinessLine;
  documents: BulkImportDocument[];
  requiredCount: number;
  optionalCount: number;
  latestUploadedCount: number;
  resultTemplateCount: number;
};

type SheetData = {
  name: string;
  rows: Array<Array<string | number>>;
};

const spreadsheetNamespace =
  "urn:schemas-microsoft-com:office:spreadsheet";

const defaultPeriodLabel = "Julio 2026";

const lineNames: Record<ImportBusinessLine, string> = {
  Consolidado: "Consolidado",
  Fisioterapia: "Fisioterapia",
  Imagenes: "Imagenes",
  Laboratorio: "Laboratorio",
};

export const templateLineDescriptions: Record<ImportBusinessLine, string> = {
  Consolidado:
    "Plantillas maestras para catalogos, metas, capacidad, costos, servicios y finanzas.",
  Fisioterapia:
    "Paquete para sesiones, citas, continuidad terapeutica, capacidad, profesionales, resultados y bonos.",
  Imagenes:
    "Paquete para estudios, citas, informes, telemedicina, equipos, mantenimiento, resultados y costos.",
  Laboratorio:
    "Paquete para resultados de sucursal, ordenes, pruebas, muestras, reactivos, medicos y costos.",
};

export function getTemplatePackageSummary(
  line: ImportBusinessLine,
): TemplatePackageSummary {
  const documents = getTemplateDocumentsForLine(line);

  return {
    documents,
    latestUploadedCount: documents.filter(
      (document) => document.lastUploadedAt !== null || isResultTemplate(document),
    ).length,
    line,
    optionalCount: documents.filter((document) => !document.required).length,
    requiredCount: documents.filter((document) => document.required).length,
    resultTemplateCount: documents.filter(isResultTemplate).length,
  };
}

export function getAllTemplatePackageSummaries() {
  return importBusinessLines.map(getTemplatePackageSummary);
}

export function getTemplateDocumentsForLine(line: ImportBusinessLine) {
  return getDocumentsForLine(line).filter((document) =>
    document.acceptedFormats.some((format) => format.includes("xls")),
  );
}

export function buildTemplateWorkbookFile({
  document,
  periodLabel = defaultPeriodLabel,
}: {
  document: BulkImportDocument;
  periodLabel?: string;
}): TemplateWorkbookFile {
  const workbookXml = buildSpreadsheetXml([
    buildInstructionsSheet(document, periodLabel),
    buildNextMonthSheet(document, periodLabel),
    buildLatestUploadSheet(document),
    buildRulesSheet(document),
    buildFieldDictionarySheet(document),
  ]);

  return {
    documentId: document.id,
    documentName: document.name,
    fileName: buildTemplateFileName(document, periodLabel),
    line: document.businessLine,
    periodLabel,
    workbookXml,
  };
}

export function buildTemplatePackageFiles({
  line,
  periodLabel = defaultPeriodLabel,
}: {
  line: ImportBusinessLine;
  periodLabel?: string;
}) {
  return getTemplateDocumentsForLine(line).map((document) =>
    buildTemplateWorkbookFile({ document, periodLabel }),
  );
}

export function isResultTemplate(document: BulkImportDocument) {
  return (
    document.id.endsWith("branch-results") ||
    /resultado|resultados|plantilla de resultados/i.test(document.name)
  );
}

export function getTemplateModeLabel(document: BulkImportDocument) {
  if (isResultTemplate(document)) {
    return "Ultima subida + siguiente mes";
  }

  if (document.lastUploadedAt) {
    return "Ultima version subida";
  }

  return "Estructura base";
}

function buildInstructionsSheet(
  document: BulkImportDocument,
  periodLabel: string,
): SheetData {
  return {
    name: "INSTRUCCIONES",
    rows: [
      ["Plantilla", document.name],
      ["Linea", lineNames[document.businessLine]],
      ["Periodo a llenar", periodLabel],
      ["Entorno", "DEMO"],
      ["Responsable", document.ownerRole],
      ["Frecuencia", document.frequency],
      ["Fecha limite", document.deadline],
      ["Modo de descarga", getTemplateModeLabel(document)],
      [
        "Uso",
        "Llenar la hoja CARGA_SIGUIENTE_MES y conservar ULTIMA_SUBIDA_SIN_PII como referencia.",
      ],
      [
        "Privacidad",
        "No cargar nombres, telefonos, documentos de identidad ni datos clinicos identificables en analitica.",
      ],
      [
        "Publicacion",
        "El archivo no alimenta dashboards hasta pasar validacion de servidor, vista previa y auditoria.",
      ],
      ["Regla de actualizacion", document.updateRule],
      ["Conector futuro", document.connectorFallback],
    ],
  };
}

function buildNextMonthSheet(
  document: BulkImportDocument,
  periodLabel: string,
): SheetData {
  const headers = [
    ...document.keyFields,
    "comentario_operaciones",
    "estado_validacion",
  ];
  const branchRows = buildBranchPrefillRows(document, periodLabel);

  if (branchRows.length > 0) {
    return {
      name: "CARGA_SIGUIENTE_MES",
      rows: [headers, ...branchRows],
    };
  }

  return {
    name: "CARGA_SIGUIENTE_MES",
    rows: [
      headers,
      document.keyFields
        .map((field) => getEmptyTemplateValue(field, document, periodLabel))
        .concat(["", "Pendiente"]),
    ],
  };
}

function buildLatestUploadSheet(document: BulkImportDocument): SheetData {
  if (document.id === "lab-branch-results") {
    return {
      name: "ULTIMA_SUBIDA_SIN_PII",
      rows: [
        [
          "sucursal",
          "codigo_sucursal",
          "gerente",
          "periodo_ultima_subida",
          "archivo_fuente",
          "venta_objetivo",
          "venta_obtenida",
          "cumplimiento",
          "venta_neta",
          "costo_venta",
          "margen",
          "calidad_datos",
          "alertas",
        ],
        ...elSalvadorBranchResultTemplates.map((branch) => [
          branch.branchName,
          branch.branchCode,
          branch.manager,
          branch.salesPeriod,
          branch.fileName,
          branch.revenueTarget,
          branch.actualRevenue,
          formatRate(branch.revenueCompletionRate),
          branch.netRevenue,
          branch.costOfSale,
          formatRate(branch.marginRate),
          `${branch.dataQualityScore}%`,
          branch.validationFlags.join(" | "),
        ]),
      ],
    };
  }

  if (!document.lastUploadedAt) {
    return {
      name: "ULTIMA_SUBIDA_SIN_PII",
      rows: [
        ["estado", "detalle"],
        [
          "Sin ultima subida",
          "Esta descarga contiene estructura base para iniciar la carga del periodo.",
        ],
      ],
    };
  }

  return {
    name: "ULTIMA_SUBIDA_SIN_PII",
    rows: [
      ["campo", "valor"],
      ["documento", document.name],
      ["linea", document.businessLine],
      ["ultima_subida", document.lastUploadedAt],
      ["estado", document.status],
      ["nota", "Resumen de ultima version sin datos personales."],
    ],
  };
}

function buildRulesSheet(document: BulkImportDocument): SheetData {
  return {
    name: "REGLAS",
    rows: [
      ["tipo", "regla"],
      ...document.validationRules.map((rule) => ["Validacion", rule]),
      ...document.blockingRules.map((rule) => ["Bloqueante", rule]),
      ...document.targetModules.map((moduleName) => [
        "Modulo alimentado",
        moduleName,
      ]),
      ["Riesgo PII", document.piiRisk],
      ["Formato aceptado", document.acceptedFormats.join(", ")],
    ],
  };
}

function buildFieldDictionarySheet(document: BulkImportDocument): SheetData {
  const rows: Array<Array<string | number>> = [
    ["campo", "tipo sugerido", "ejemplo", "obligatorio"],
  ];

  rows.push(
    ...document.keyFields.map((field) => [
      field,
      inferFieldType(field),
      getFieldExample(field, document),
      "SI",
    ]),
  );

  if (document.id === "lab-branch-results") {
    rows.push(
      ["hojas_origen_sv", "texto", "Solo referencia; sin PII", "NO"],
      ...elSalvadorResultTemplateSheets.map((sheet) => [
        sheet.sheetName,
        sheet.containsPersonalData ? "PII - bloquear dashboard" : "operativo",
        sheet.purpose,
        "NO",
      ]),
    );
  }

  return {
    name: "DICCIONARIO",
    rows,
  };
}

function buildBranchPrefillRows(
  document: BulkImportDocument,
  periodLabel: string,
) {
  if (document.id !== "lab-branch-results") {
    return [];
  }

  return elSalvadorBranchResultTemplates.map((branch) =>
    document.keyFields
      .map((field) => {
        if (field === "periodo") {
          return periodLabel;
        }

        if (field === "sucursal") {
          return branch.branchName;
        }

        if (field === "gerente") {
          return branch.manager;
        }

        if (field === "venta_objetivo") {
          return branch.revenueTarget;
        }

        if (field === "margen") {
          return "";
        }

        if (field === "venta_obtenida" || field === "costo_venta") {
          return "";
        }

        if (field === "num_orden") {
          return "";
        }

        return getEmptyTemplateValue(field, document, periodLabel);
      })
      .concat(["", "Pendiente"]),
  );
}

function getEmptyTemplateValue(
  field: string,
  document: BulkImportDocument,
  periodLabel: string,
) {
  if (field === "periodo") {
    return periodLabel;
  }

  if (field === "linea_negocio") {
    return document.businessLine;
  }

  if (/fecha/i.test(field)) {
    return "";
  }

  if (/estado/i.test(field)) {
    return "Pendiente";
  }

  if (/pais/i.test(field)) {
    return "El Salvador";
  }

  if (/empresa/i.test(field)) {
    return `Analiza ${document.businessLine}`;
  }

  return "";
}

function getFieldExample(field: string, document: BulkImportDocument) {
  if (/periodo/i.test(field)) {
    return defaultPeriodLabel;
  }

  if (/fecha/i.test(field)) {
    return "2026-07-31";
  }

  if (/linea/i.test(field)) {
    return document.businessLine;
  }

  if (/sucursal/i.test(field)) {
    return "SS - Aguilares - L033";
  }

  if (/gerente/i.test(field)) {
    return "Gerente asignado";
  }

  if (/paciente/i.test(field)) {
    return "paciente_hash_demo";
  }

  if (/monto|ingreso|costo|precio|venta|meta|horas|stock|consumo|sesiones|estudios|presupuesto/i.test(field)) {
    return "0";
  }

  if (/margen/i.test(field)) {
    return "0%";
  }

  return `${field}_demo`;
}

function inferFieldType(field: string) {
  if (/fecha|periodo|vencimiento/i.test(field)) {
    return "fecha/periodo";
  }

  if (/monto|ingreso|costo|precio|venta|meta|horas|stock|consumo|sesiones|estudios|presupuesto/i.test(field)) {
    return "numero";
  }

  if (/estado/i.test(field)) {
    return "catalogo";
  }

  return "texto";
}

function buildTemplateFileName(
  document: BulkImportDocument,
  periodLabel: string,
) {
  const normalizedPeriod = sanitizeFileSegment(periodLabel);
  const normalizedLine = sanitizeFileSegment(document.businessLine);
  const normalizedName = sanitizeFileSegment(document.name);

  return `${normalizedLine}_${normalizedName}_${normalizedPeriod}.xls`;
}

function buildSpreadsheetXml(sheets: SheetData[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="${spreadsheetNamespace}" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="${spreadsheetNamespace}" xmlns:html="http://www.w3.org/TR/REC-html40">\n<Styles>\n<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>\n<Style ss:ID="Warning"><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/></Style>\n</Styles>\n${sheets.map(buildWorksheetXml).join("\n")}\n</Workbook>`;
}

function buildWorksheetXml(sheet: SheetData) {
  return `<Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name))}"><Table>\n${sheet.rows
    .map((row, rowIndex) => buildRowXml(row, rowIndex === 0))
    .join("\n")}\n</Table></Worksheet>`;
}

function buildRowXml(row: Array<string | number>, isHeader: boolean) {
  return `<Row>${row
    .map((value) => buildCellXml(value, isHeader))
    .join("")}</Row>`;
}

function buildCellXml(value: string | number, isHeader: boolean) {
  const style = isHeader ? ' ss:StyleID="Header"' : "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
  }

  return `<Cell${style}><Data ss:Type="String">${escapeXml(
    protectFormulaLikeText(String(value)),
  )}</Data></Cell>`;
}

function protectFormulaLikeText(value: string) {
  return /^[=+\-@]/.test(value.trim()) ? `'${value}` : value;
}

function sanitizeSheetName(name: string) {
  const sanitized = name.replace(/[\[\]*?:/\\]/g, " ").trim();
  return sanitized.slice(0, 31) || "Hoja";
}

function sanitizeFileSegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getTemplateLibraryTotals() {
  const documents = bulkImportDocuments.filter((document) =>
    document.acceptedFormats.some((format) => format.includes("xls")),
  );

  return {
    documents: documents.length,
    latestUploads: documents.filter(
      (document) => document.lastUploadedAt !== null || isResultTemplate(document),
    ).length,
    lines: importBusinessLines.length,
    required: documents.filter((document) => document.required).length,
    resultTemplates: documents.filter(isResultTemplate).length,
  };
}

export function formatTemplateCurrency(value: number | null) {
  return formatCurrency(value);
}
