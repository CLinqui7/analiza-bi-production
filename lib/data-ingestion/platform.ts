import { createHash } from "node:crypto";

import {
  canPerformAction,
  type AuthorizationActor,
} from "../security/authorization-policy.ts";
import { demoBranches } from "../tenant/demo-context.ts";
import type { ScopeBoundary } from "../tenant/delegation-policy.ts";
import { parseTabularFile } from "./file-parser.ts";
import {
  getIngestionTemplate,
  type IngestionDatasetType,
  type IngestionTemplate,
  type IngestionTemplateField,
} from "./templates.ts";

export type ImportLifecycleStatus =
  | "RAW_RECEIVED"
  | "VALIDATED"
  | "WARNING"
  | "BLOCKED"
  | "PUBLISHED"
  | "ROLLED_BACK";

export type ImportAuditAction =
  | "upload"
  | "validation"
  | "publish"
  | "rollback"
  | "mapping_change"
  | "connector_run"
  | "connector_failure"
  | "retry"
  | "manual_correction";

export type ImportValidationSeverity = "error" | "warning";

export type ImportValidationIssue = {
  code: string;
  column?: string;
  message: string;
  rowNumber?: number;
  severity: ImportValidationSeverity;
};

export type ImportScope = ScopeBoundary & {
  businessLineId?: string | null;
  businessLineName?: string | null;
  companyName?: string | null;
  countryName?: string | null;
  branchName?: string | null;
};

export type RawImportRecord = {
  checksum: string;
  contentType: string;
  fileName: string;
  fileSize: number;
  immutable: true;
  importId: string;
  rawBytes: Buffer;
  receivedAt: string;
  sanitizedFileName: string;
  sourceId: string;
  uploadedBy: string;
};

export type StagingRow = {
  errors: ImportValidationIssue[];
  importId: string;
  lineage: RowLineage;
  mapped: Record<string, string | number | null>;
  original: Record<string, string>;
  rowHash: string;
  rowNumber: number;
  warnings: ImportValidationIssue[];
};

export type PublishedRow = {
  active: boolean;
  datasetType: IngestionDatasetType;
  importId: string;
  lineage: RowLineage;
  publishedAt: string;
  rowHash: string;
  rowNumber: number;
  values: Record<string, string | number | null>;
};

export type RowLineage = {
  checksum: string;
  connectorId: string | null;
  fileName: string;
  importId: string;
  mappingVersion: string;
  originalRowNumber: number;
  sourceId: string;
  templateId: string;
  templateVersion: string;
  transformations: string[];
  validationCodes: string[];
};

export type ImportAuditEvent = {
  action: ImportAuditAction;
  actorEmail: string;
  actorId: string;
  at: string;
  details: string;
  importId: string;
  status: ImportLifecycleStatus;
};

export type DataImportRecord = {
  actorEmail: string;
  actorId: string;
  checksum: string;
  completedAt: string | null;
  createdAt: string;
  datasetType: IngestionDatasetType;
  duplicateOf: string | null;
  headers: string[];
  id: string;
  idempotencyKey: string;
  period: string;
  qualityScore: number;
  rawId: string;
  replaceDecision: "none" | "replace_requested" | "duplicate_blocked";
  rowCount: number;
  scope: ImportScope;
  sourceId: string;
  status: ImportLifecycleStatus;
  templateId: string;
  templateVersion: string;
};

export type ImportPipelineResult = {
  audit: ImportAuditEvent[];
  duplicateOf: string | null;
  importRecord: DataImportRecord;
  issues: ImportValidationIssue[];
  previewRows: StagingRow[];
  publishedRows: PublishedRow[];
  qualityScore: number;
  raw: RawImportRecord;
  stagingRows: StagingRow[];
};

type IngestionStore = {
  audit: ImportAuditEvent[];
  idempotency: Map<string, string>;
  imports: Map<string, DataImportRecord>;
  published: Map<string, PublishedRow[]>;
  raw: Map<string, RawImportRecord>;
  staging: Map<string, StagingRow[]>;
};

type IngestFileParams = {
  actor: AuthorizationActor;
  allowReplace?: boolean;
  buffer: Buffer;
  connectorId?: string | null;
  contentType?: string | null;
  datasetType: IngestionDatasetType;
  fileName: string;
  maxFileSizeBytes?: number;
  period: string;
  scope: ImportScope;
  sourceId: string;
};

const maxDefaultFileSizeBytes = 10 * 1024 * 1024;
const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const dangerousFormulaPrefixes = ["=", "+", "-", "@"];
declare global {
  var analizaIngestionStore: IngestionStore | undefined;
}

function getStore() {
  if (!globalThis.analizaIngestionStore) {
    globalThis.analizaIngestionStore = {
      audit: [],
      idempotency: new Map(),
      imports: new Map(),
      published: new Map(),
      raw: new Map(),
      staging: new Map(),
    };
  }

  return globalThis.analizaIngestionStore;
}

export function resetIngestionPlatformForTests() {
  globalThis.analizaIngestionStore = undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function stableId(prefix: string, input: string) {
  return `${prefix}_${createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

function checksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sanitizeImportFileName(fileName: string) {
  const fallback = "upload";
  const trimmed = fileName.trim() || fallback;
  const extension = trimmed.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() ?? "";
  const baseName = trimmed
    .replace(/\.[a-z0-9]+$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${baseName || fallback}${extension}`;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeCatalogValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseDecimal(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/^\$/, "")
    .replace(/,/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isValidMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

function isDangerousFormula(value: string) {
  const trimmed = value.trim();

  return dangerousFormulaPrefixes.some((prefix) => trimmed.startsWith(prefix));
}

function issue({
  code,
  column,
  message,
  rowNumber,
  severity,
}: ImportValidationIssue): ImportValidationIssue {
  return { code, column, message, rowNumber, severity };
}

function buildHeaderMap(headers: string[]) {
  const headerMap = new Map<string, string>();

  for (const header of headers) {
    headerMap.set(normalizeHeader(header), header);
  }

  return headerMap;
}

function resolveColumn(fieldItem: IngestionTemplateField, headerMap: Map<string, string>) {
  const candidates = [fieldItem.id, fieldItem.label, ...fieldItem.aliases].map(
    normalizeHeader,
  );

  for (const candidate of candidates) {
    const header = headerMap.get(candidate);

    if (header) {
      return header;
    }
  }

  return null;
}

function coerceValue({
  fieldItem,
  rawValue,
}: {
  fieldItem: IngestionTemplateField;
  rawValue: string;
}) {
  const value = rawValue.trim();

  if (!value) {
    return null;
  }

  if (fieldItem.type === "currency" || fieldItem.type === "decimal") {
    return parseDecimal(value);
  }

  if (fieldItem.type === "integer") {
    const parsed = parseDecimal(value);

    return parsed === null ? null : Math.round(parsed);
  }

  if (fieldItem.type === "percent") {
    const parsed = parseDecimal(value.replace(/%$/, ""));

    return parsed === null ? null : parsed / 100;
  }

  return value;
}

function validateTypedValue({
  fieldItem,
  rawValue,
  rowNumber,
}: {
  fieldItem: IngestionTemplateField;
  rawValue: string;
  rowNumber: number;
}) {
  const issues: ImportValidationIssue[] = [];
  const value = rawValue.trim();

  if (fieldItem.required && !value) {
    issues.push(
      issue({
        code: "required_field_missing",
        column: fieldItem.id,
        message: `${fieldItem.label} es obligatorio.`,
        rowNumber,
        severity: "error",
      }),
    );
  }

  if (!value) {
    return issues;
  }

  if (isDangerousFormula(value)) {
    issues.push(
      issue({
        code: "dangerous_formula",
        column: fieldItem.id,
        message: "Formula de hoja de calculo bloqueada en importacion.",
        rowNumber,
        severity: "error",
      }),
    );
  }

  if (
    ["currency", "decimal", "integer", "percent"].includes(fieldItem.type) &&
    parseDecimal(value.replace(/%$/, "")) === null
  ) {
    issues.push(
      issue({
        code: "invalid_number",
        column: fieldItem.id,
        message: `${fieldItem.label} debe ser numerico.`,
        rowNumber,
        severity: "error",
      }),
    );
  }

  if (
    ["currency", "decimal", "integer"].includes(fieldItem.type) &&
    (parseDecimal(value) ?? 0) < 0
  ) {
    issues.push(
      issue({
        code: "negative_number",
        column: fieldItem.id,
        message: `${fieldItem.label} no puede ser negativo.`,
        rowNumber,
        severity: "warning",
      }),
    );
  }

  if (fieldItem.type === "date" && !isValidDate(value)) {
    issues.push(
      issue({
        code: "invalid_date",
        column: fieldItem.id,
        message: `${fieldItem.label} debe tener formato YYYY-MM-DD.`,
        rowNumber,
        severity: "error",
      }),
    );
  }

  if (fieldItem.type === "month" && !isValidMonth(value)) {
    issues.push(
      issue({
        code: "invalid_period",
        column: fieldItem.id,
        message: `${fieldItem.label} debe tener formato YYYY-MM.`,
        rowNumber,
        severity: "error",
      }),
    );
  }

  if (fieldItem.validCatalog) {
    const normalizedValue = normalizeCatalogValue(value);
    const matchesCatalog = fieldItem.validCatalog.some(
      (catalogValue) => normalizeCatalogValue(catalogValue) === normalizedValue,
    );

    if (!matchesCatalog) {
      issues.push(
        issue({
          code: "invalid_catalog_value",
          column: fieldItem.id,
          message: `${fieldItem.label} no existe en catalogo valido.`,
          rowNumber,
          severity: "error",
        }),
      );
    }
  }

  return issues;
}

function validateBranchScope({
  actor,
  rowBranch,
  rowNumber,
  scope,
}: {
  actor: AuthorizationActor;
  rowBranch: string | number | null | undefined;
  rowNumber: number;
  scope: ImportScope;
}) {
  const normalizedRowBranch = normalizeCatalogValue(String(rowBranch ?? ""));
  const expectedBranchNames = [scope.branchId, scope.branchName]
    .filter((value): value is string => Boolean(value))
    .map(normalizeCatalogValue);

  if (scope.branchId && expectedBranchNames.length > 0) {
    const branchMatches = expectedBranchNames.some(
      (expected) =>
        normalizedRowBranch === expected ||
        normalizedRowBranch.includes(expected) ||
        expected.includes(normalizedRowBranch),
    );

    if (!branchMatches) {
      return issue({
        code: "branch_scope_mismatch",
        column: "branch",
        message: "La fila no pertenece a la sucursal autorizada.",
        rowNumber,
        severity: "error",
      });
    }
  }

  if (
    !canPerformAction(actor, "record.read", {
      scope: {
        branchId: scope.branchId,
        companyId: scope.companyId,
        countryId: scope.countryId,
        operationalAreaId: scope.operationalAreaId,
        organizationId: scope.organizationId,
      },
    })
  ) {
    return issue({
      code: "actor_scope_denied",
      column: "branch",
      message: "El actor no puede cargar datos fuera de su alcance.",
      rowNumber,
      severity: "error",
    });
  }

  return null;
}

function buildIdempotencyKey({
  checksumValue,
  datasetType,
  period,
  scope,
  sourceId,
}: {
  checksumValue: string;
  datasetType: IngestionDatasetType;
  period: string;
  scope: ImportScope;
  sourceId: string;
}) {
  return [
    scope.countryId ?? "__country__",
    scope.companyId ?? "__company__",
    scope.branchId ?? "__branch__",
    datasetType,
    period,
    checksumValue,
    sourceId,
  ].join("|");
}

function buildRawRecord({
  actor,
  buffer,
  checksumValue,
  contentType,
  fileName,
  importId,
  sourceId,
}: {
  actor: AuthorizationActor;
  buffer: Buffer;
  checksumValue: string;
  contentType?: string | null;
  fileName: string;
  importId: string;
  sourceId: string;
}): RawImportRecord {
  return {
    checksum: checksumValue,
    contentType: contentType ?? "application/octet-stream",
    fileName,
    fileSize: buffer.length,
    immutable: true,
    importId,
    rawBytes: Buffer.from(buffer),
    receivedAt: nowIso(),
    sanitizedFileName: sanitizeImportFileName(fileName),
    sourceId,
    uploadedBy: actor.userId,
  };
}

function buildAuditEvent({
  action,
  actor,
  details,
  importId,
  status,
}: {
  action: ImportAuditAction;
  actor: AuthorizationActor;
  details: string;
  importId: string;
  status: ImportLifecycleStatus;
}): ImportAuditEvent {
  return {
    action,
    actorEmail: actor.email,
    actorId: actor.userId,
    at: nowIso(),
    details,
    importId,
    status,
  };
}

function calculateQualityScore(issues: ImportValidationIssue[], rowCount: number) {
  if (rowCount === 0) {
    return 0;
  }

  const errorPenalty = issues.filter((item) => item.severity === "error").length * 12;
  const warningPenalty =
    issues.filter((item) => item.severity === "warning").length * 4;

  return Math.max(0, Math.min(100, 100 - errorPenalty - warningPenalty));
}

function resolveImportStatus(issues: ImportValidationIssue[], qualityScore: number) {
  if (issues.some((item) => item.severity === "error") || qualityScore < 70) {
    return "BLOCKED" satisfies ImportLifecycleStatus;
  }

  if (issues.some((item) => item.severity === "warning") || qualityScore < 85) {
    return "WARNING" satisfies ImportLifecycleStatus;
  }

  return "VALIDATED" satisfies ImportLifecycleStatus;
}

function validateTemplateColumns(template: IngestionTemplate, headers: string[]) {
  const headerMap = buildHeaderMap(headers);

  return template.fields.flatMap((fieldItem) => {
    if (!fieldItem.required || resolveColumn(fieldItem, headerMap)) {
      return [];
    }

    return [
      issue({
        code: "required_column_missing",
        column: fieldItem.id,
        message: `Falta columna obligatoria ${fieldItem.label}.`,
        severity: "error",
      }),
    ];
  });
}

function validateRows({
  actor,
  connectorId,
  parsedRows,
  raw,
  scope,
  template,
}: {
  actor: AuthorizationActor;
  connectorId?: string | null;
  parsedRows: Record<string, string>[];
  raw: RawImportRecord;
  scope: ImportScope;
  template: IngestionTemplate;
}) {
  const headerMap = buildHeaderMap(Object.keys(parsedRows[0] ?? {}));
  const dedupeKeys = new Set<string>();
  const allIssues: ImportValidationIssue[] = [];

  return parsedRows.map((originalRow, rowIndex): StagingRow => {
    const rowNumber = rowIndex + 2;
    const mapped: Record<string, string | number | null> = {};
    const rowIssues: ImportValidationIssue[] = [];
    const rowWarnings: ImportValidationIssue[] = [];

    for (const fieldItem of template.fields) {
      const sourceColumn = resolveColumn(fieldItem, headerMap);
      const rawValue = sourceColumn ? originalRow[sourceColumn] ?? "" : "";
      const typedIssues = validateTypedValue({ fieldItem, rawValue, rowNumber });
      const coercedValue = coerceValue({ fieldItem, rawValue });

      mapped[fieldItem.id] = coercedValue;

      for (const typedIssue of typedIssues) {
        if (typedIssue.severity === "error") {
          rowIssues.push(typedIssue);
        } else {
          rowWarnings.push(typedIssue);
        }
      }
    }

    const periodValue = String(mapped[template.periodField] ?? "");

    if (template.periodField !== "status" && periodValue && periodValue !== raw.sourceId.split(":").at(-1)) {
      rowWarnings.push(
        issue({
          code: "period_mismatch",
          column: template.periodField,
          message: "El periodo de la fila no coincide con el periodo del import.",
          rowNumber,
          severity: "warning",
        }),
      );
    }

    const dedupeValue = template.dedupeKey
      .map((key) => String(mapped[key] ?? ""))
      .join("|");

    if (dedupeKeys.has(dedupeValue)) {
      rowIssues.push(
        issue({
          code: "duplicate_row",
          message: "Fila duplicada por llave natural de plantilla.",
          rowNumber,
          severity: "error",
        }),
      );
    } else {
      dedupeKeys.add(dedupeValue);
    }

    const branchIssue = validateBranchScope({
      actor,
      rowBranch: mapped.branch,
      rowNumber,
      scope,
    });

    if (branchIssue) {
      rowIssues.push(branchIssue);
    }

    allIssues.push(...rowIssues, ...rowWarnings);

    const rowHash = stableId(
      "row",
      JSON.stringify({ importId: raw.importId, originalRow, rowNumber }),
    );

    return {
      errors: rowIssues,
      importId: raw.importId,
      lineage: {
        checksum: raw.checksum,
        connectorId: connectorId ?? null,
        fileName: raw.sanitizedFileName,
        importId: raw.importId,
        mappingVersion: `${template.id}:${template.version}`,
        originalRowNumber: rowNumber,
        sourceId: raw.sourceId,
        templateId: template.id,
        templateVersion: template.version,
        transformations: ["trim", "alias-map", "type-coerce", "catalog-check"],
        validationCodes: [...rowIssues, ...rowWarnings].map((item) => item.code),
      },
      mapped,
      original: originalRow,
      rowHash,
      rowNumber,
      warnings: rowWarnings,
    };
  });
}

function getKnownBranchId(branchName?: string | null) {
  const normalizedBranch = normalizeCatalogValue(branchName ?? "");

  return (
    demoBranches.find((branch) =>
      [branch.id, branch.name, branch.code].some(
        (value) => normalizeCatalogValue(value) === normalizedBranch,
      ),
    )?.id ?? null
  );
}

export function buildImportScope(input: Partial<ImportScope>): ImportScope {
  const branchId = input.branchId ?? getKnownBranchId(input.branchName);

  return {
    branchId,
    branchName: input.branchName ?? null,
    businessLineId: input.businessLineId ?? null,
    businessLineName: input.businessLineName ?? null,
    companyId: input.companyId ?? null,
    companyName: input.companyName ?? null,
    countryId: input.countryId ?? null,
    countryName: input.countryName ?? null,
    operationalAreaId: input.operationalAreaId ?? null,
    organizationId: input.organizationId ?? demoOrganizationId,
  };
}

export function canActorMutateImport(actor: AuthorizationActor, scope: ImportScope) {
  return canPerformAction(actor, "imports.upload", { scope });
}

export function ingestTabularFile(params: IngestFileParams): ImportPipelineResult {
  const template = getIngestionTemplate(params.datasetType);

  if (!template) {
    throw new Error(`Plantilla no encontrada para ${params.datasetType}.`);
  }

  if (!canActorMutateImport(params.actor, params.scope)) {
    throw new Error("Actor no autorizado para importar en este alcance.");
  }

  const maxFileSizeBytes = params.maxFileSizeBytes ?? maxDefaultFileSizeBytes;

  if (params.buffer.length > maxFileSizeBytes) {
    throw new Error("Archivo supera el tamano maximo permitido.");
  }

  const parsed = parseTabularFile({
    buffer: params.buffer,
    contentType: params.contentType,
    fileName: params.fileName,
  });
  const extension = params.fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";

  if (!template.acceptedFormats.includes(extension)) {
    throw new Error(`Extension ${extension} no permitida para ${template.name}.`);
  }

  const checksumValue = checksum(params.buffer);
  const importId = stableId(
    "imp",
    JSON.stringify({
      checksumValue,
      datasetType: params.datasetType,
      fileName: params.fileName,
      period: params.period,
      sourceId: params.sourceId,
      uploadedBy: params.actor.userId,
    }),
  );
  const sourceId = `${params.sourceId}:${params.period}`;
  const raw = buildRawRecord({
    actor: params.actor,
    buffer: params.buffer,
    checksumValue,
    contentType: params.contentType,
    fileName: params.fileName,
    importId,
    sourceId,
  });
  const idempotencyKey = buildIdempotencyKey({
    checksumValue,
    datasetType: params.datasetType,
    period: params.period,
    scope: params.scope,
    sourceId: params.sourceId,
  });
  const store = getStore();
  const duplicateOf = store.idempotency.get(idempotencyKey) ?? null;

  if (duplicateOf && !params.allowReplace) {
    const blockedImport: DataImportRecord = {
      actorEmail: params.actor.email,
      actorId: params.actor.userId,
      checksum: checksumValue,
      completedAt: null,
      createdAt: nowIso(),
      datasetType: params.datasetType,
      duplicateOf,
      headers: parsed.headers,
      id: importId,
      idempotencyKey,
      period: params.period,
      qualityScore: 0,
      rawId: raw.importId,
      replaceDecision: "duplicate_blocked",
      rowCount: parsed.rows.length,
      scope: params.scope,
      sourceId,
      status: "BLOCKED",
      templateId: template.id,
      templateVersion: template.version,
    };
    const audit = [
      buildAuditEvent({
        action: "upload",
        actor: params.actor,
        details: `Carga duplicada bloqueada contra ${duplicateOf}.`,
        importId,
        status: "BLOCKED",
      }),
    ];

    return {
      audit,
      duplicateOf,
      importRecord: blockedImport,
      issues: [
        issue({
          code: "duplicate_import",
          message: "Archivo ya cargado para pais/empresa/sucursal/tipo/periodo/source/checksum.",
          severity: "error",
        }),
      ],
      previewRows: [],
      publishedRows: [],
      qualityScore: 0,
      raw,
      stagingRows: [],
    };
  }

  const columnIssues = validateTemplateColumns(template, parsed.headers);
  const stagingRows =
    parsed.warnings.length > 0
      ? []
      : validateRows({
          actor: params.actor,
          connectorId: params.connectorId,
          parsedRows: parsed.rows,
          raw,
          scope: params.scope,
          template,
        });
  const fileIssues = parsed.warnings.map((warningMessage) =>
    issue({
      code: "file_preview_warning",
      message: warningMessage,
      severity: "error",
    }),
  );
  const rowIssues = stagingRows.flatMap((row) => [...row.errors, ...row.warnings]);
  const allIssues = [...columnIssues, ...fileIssues, ...rowIssues];
  const qualityScore = calculateQualityScore(allIssues, parsed.rows.length);
  const status = resolveImportStatus(allIssues, qualityScore);
  const importRecord: DataImportRecord = {
    actorEmail: params.actor.email,
    actorId: params.actor.userId,
    checksum: checksumValue,
    completedAt: null,
    createdAt: nowIso(),
    datasetType: params.datasetType,
    duplicateOf,
    headers: parsed.headers,
    id: importId,
    idempotencyKey,
    period: params.period,
    qualityScore,
    rawId: raw.importId,
    replaceDecision: params.allowReplace ? "replace_requested" : "none",
    rowCount: parsed.rows.length,
    scope: params.scope,
    sourceId,
    status,
    templateId: template.id,
    templateVersion: template.version,
  };
  const audit = [
    buildAuditEvent({
      action: "upload",
      actor: params.actor,
      details: `RAW recibido ${raw.sanitizedFileName} (${raw.fileSize} bytes).`,
      importId,
      status: "RAW_RECEIVED",
    }),
    buildAuditEvent({
      action: "validation",
      actor: params.actor,
      details: `Validacion ${status} con puntaje de calidad ${qualityScore}.`,
      importId,
      status,
    }),
  ];

  store.raw.set(importId, raw);
  store.imports.set(importId, importRecord);
  store.staging.set(importId, stagingRows);
  store.audit.push(...audit);

  if (!duplicateOf || params.allowReplace) {
    store.idempotency.set(idempotencyKey, importId);
  }

  return {
    audit,
    duplicateOf,
    importRecord,
    issues: allIssues,
    previewRows: stagingRows.slice(0, 5),
    publishedRows: [],
    qualityScore,
    raw,
    stagingRows,
  };
}

export function publishImport(importId: string, actor: AuthorizationActor) {
  const store = getStore();
  const importRecord = store.imports.get(importId);

  if (!importRecord) {
    throw new Error("Import no encontrado.");
  }

  if (!canActorMutateImport(actor, importRecord.scope)) {
    throw new Error("Actor no autorizado para publicar este import.");
  }

  if (importRecord.status === "BLOCKED") {
    throw new Error("Import bloqueado por calidad; no se puede publicar.");
  }

  const stagingRows = store.staging.get(importId) ?? [];
  const publishedAt = nowIso();
  const publishedRows = stagingRows
    .filter((row) => row.errors.length === 0)
    .map((row): PublishedRow => ({
      active: true,
      datasetType: importRecord.datasetType,
      importId,
      lineage: row.lineage,
      publishedAt,
      rowHash: row.rowHash,
      rowNumber: row.rowNumber,
      values: row.mapped,
    }));

  for (const [existingImportId, existingRows] of store.published.entries()) {
    const existingImport = store.imports.get(existingImportId);
    const sameSlice =
      existingImport &&
      existingImport.datasetType === importRecord.datasetType &&
      existingImport.period === importRecord.period &&
      existingImport.scope.branchId === importRecord.scope.branchId &&
      existingImport.status === "PUBLISHED";

    if (sameSlice && existingImportId !== importId) {
      store.published.set(
        existingImportId,
        existingRows.map((row) => ({ ...row, active: false })),
      );
      existingImport.status = "ROLLED_BACK";
      existingImport.completedAt = publishedAt;
      store.imports.set(existingImportId, existingImport);
    }
  }

  importRecord.status = "PUBLISHED";
  importRecord.completedAt = publishedAt;
  store.imports.set(importId, importRecord);
  store.published.set(importId, publishedRows);
  const audit = buildAuditEvent({
    action: "publish",
    actor,
    details: `${publishedRows.length} filas publicadas en ANALYTICS.`,
    importId,
    status: "PUBLISHED",
  });
  store.audit.push(audit);

  return {
    audit,
    importRecord,
    publishedRows,
  };
}

export function rollbackImport(importId: string, actor: AuthorizationActor, reason: string) {
  const store = getStore();
  const importRecord = store.imports.get(importId);

  if (!importRecord) {
    throw new Error("Import no encontrado.");
  }

  if (!canActorMutateImport(actor, importRecord.scope)) {
    throw new Error("Actor no autorizado para revertir este import.");
  }

  const publishedRows = store.published.get(importId) ?? [];

  store.published.set(
    importId,
    publishedRows.map((row) => ({ ...row, active: false })),
  );
  importRecord.status = "ROLLED_BACK";
  importRecord.completedAt = nowIso();
  store.imports.set(importId, importRecord);
  const audit = buildAuditEvent({
    action: "rollback",
    actor,
    details: `Reversion registrada. Motivo: ${reason || "No especificado"}. Archivo original preservado.`,
    importId,
    status: "ROLLED_BACK",
  });
  store.audit.push(audit);

  return {
    audit,
    importRecord,
    publishedRows: store.published.get(importId) ?? [],
  };
}

export function getImportLineage(importId: string) {
  const store = getStore();
  const importRecord = store.imports.get(importId);

  if (!importRecord) {
    return null;
  }

  return {
    audit: store.audit.filter((event) => event.importId === importId),
    importRecord,
    publishedRows: store.published.get(importId) ?? [],
    raw: store.raw.get(importId) ?? null,
    stagingRows: store.staging.get(importId) ?? [],
  };
}

export function listImportAuditEvents() {
  return [...getStore().audit];
}

export function listPublishedRows(datasetType?: IngestionDatasetType) {
  return [...getStore().published.values()]
    .flat()
    .filter((row) => row.active)
    .filter((row) => !datasetType || row.datasetType === datasetType);
}

export function getIngestionStoreSnapshot() {
  const store = getStore();

  return {
    auditCount: store.audit.length,
    importCount: store.imports.size,
    publishedRowCount: listPublishedRows().length,
    rawCount: store.raw.size,
    stagingRowCount: [...store.staging.values()].reduce(
      (sum, rows) => sum + rows.length,
      0,
    ),
  };
}
