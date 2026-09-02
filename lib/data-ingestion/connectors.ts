import type { AuthorizationActor } from "../security/authorization-policy.ts";
import type { ImportScope } from "./platform.ts";
import { ingestTabularFile, publishImport } from "./platform.ts";
import {
  getIngestionTemplate,
  type IngestionDatasetType,
  type SourceStatusLabel,
} from "./templates.ts";

export type ConnectorType =
  | "REST API"
  | "GraphQL"
  | "database"
  | "webhook"
  | "SFTP"
  | "manual file"
  | "authorized scraping";

export type ConnectionResult = {
  ok: boolean;
  message: string;
  requiredCredentials: string[];
  status: SourceStatusLabel;
};

export type SourceSchema = {
  datasetType: IngestionDatasetType;
  fields: string[];
  templateId: string;
  templateVersion: string;
};

export type SyncParams = {
  actor: AuthorizationActor;
  period: string;
  publish?: boolean;
  scope: ImportScope;
};

export type SyncResult = {
  errors: string[];
  importId: string | null;
  processedRecords: number;
  rejectedRecords: number;
  status: "success" | "failed" | "pending_credentials";
  warnings: string[];
};

export type ConnectorStatus = {
  connectorId: string;
  coverage: number;
  errors: string[];
  freshness: "fresh" | "stale" | "unknown";
  lastDataReceivedAt: string | null;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  processedRecords: number;
  rejectedRecords: number;
  retries: number;
  status: SourceStatusLabel;
};

export type DataConnectorMetadata = {
  branchId?: string | null;
  companyId: string;
  connectorId: string;
  countryId: string;
  datasetType: IngestionDatasetType;
  envVars: string[];
  frequency: string;
  name: string;
  owner: string;
  sourceType: ConnectorType;
};

export interface DataConnector {
  metadata: DataConnectorMetadata;
  fetchSchema(): Promise<SourceSchema>;
  getStatus(): Promise<ConnectorStatus>;
  sync(params: SyncParams): Promise<SyncResult>;
  testConnection(): Promise<ConnectionResult>;
}

type ConnectorRunEvent = {
  at: string;
  connectorId: string;
  message: string;
  status: SyncResult["status"];
};

declare global {
  var analizaConnectorRuns: ConnectorRunEvent[] | undefined;
  var analizaConnectorStatus: Map<string, ConnectorStatus> | undefined;
}

const defaultCountryId = "30000000-0000-4000-8000-000000000003";
const labCompanyId = "40000000-0000-4000-8000-000000000002";
const physioCompanyId = "40000000-0000-4000-8000-000000000001";
const imagingCompanyId = "40000000-0000-4000-8000-000000000003";

function nowIso() {
  return new Date().toISOString();
}

function getConnectorRuns() {
  if (!globalThis.analizaConnectorRuns) {
    globalThis.analizaConnectorRuns = [];
  }

  return globalThis.analizaConnectorRuns;
}

function getConnectorStatusStore() {
  if (!globalThis.analizaConnectorStatus) {
    globalThis.analizaConnectorStatus = new Map();
  }

  return globalThis.analizaConnectorStatus;
}

export function resetConnectorRuntimeForTests() {
  globalThis.analizaConnectorRuns = undefined;
  globalThis.analizaConnectorStatus = undefined;
}

function credentialEnvConfigured(envVars: string[]) {
  return envVars.every((envName) => Boolean(process.env[envName]?.trim()));
}

function csvFromRows(rows: Record<string, string | number>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = rows.map((row) =>
    headers
      .map((header) => {
        const value = String(row[header] ?? "");
        return value.includes(",") ? `"${value.replace(/"/g, '""')}"` : value;
      })
      .join(","),
  );

  return `${headers.join(",")}\n${lines.join("\n")}\n`;
}

function sourceSchema(datasetType: IngestionDatasetType): SourceSchema {
  const template = getIngestionTemplate(datasetType);

  if (!template) {
    throw new Error(`Template not found for ${datasetType}.`);
  }

  return {
    datasetType,
    fields: template.fields.map((field) => field.id),
    templateId: template.id,
    templateVersion: template.version,
  };
}

function buildInitialStatus(metadata: DataConnectorMetadata): ConnectorStatus {
  return {
    connectorId: metadata.connectorId,
    coverage: metadata.envVars.length === 0 ? 100 : 0,
    errors: [],
    freshness: "unknown",
    lastDataReceivedAt: null,
    lastSyncAt: null,
    nextSyncAt: null,
    processedRecords: 0,
    rejectedRecords: 0,
    retries: 0,
    status: metadata.envVars.length === 0 ? "Conectado" : "Sin configurar",
  };
}

abstract class BaseConnector implements DataConnector {
  metadata: DataConnectorMetadata;

  constructor(metadata: DataConnectorMetadata) {
    this.metadata = metadata;
  }

  abstract sync(params: SyncParams): Promise<SyncResult>;

  async fetchSchema() {
    return sourceSchema(this.metadata.datasetType);
  }

  async getStatus() {
    const store = getConnectorStatusStore();
    const currentStatus = store.get(this.metadata.connectorId);

    if (currentStatus) {
      return currentStatus;
    }

    const initialStatus = buildInitialStatus(this.metadata);
    store.set(this.metadata.connectorId, initialStatus);

    return initialStatus;
  }

  async testConnection(): Promise<ConnectionResult> {
    if (!credentialEnvConfigured(this.metadata.envVars)) {
      return {
        message: "Credenciales pendientes; conector real deshabilitado y fallback manual activo.",
        ok: false,
        requiredCredentials: this.metadata.envVars,
        status: "Sin configurar",
      };
    }

    return {
      message: "Configuracion disponible para ejecutar una prueba real protegida.",
      ok: true,
      requiredCredentials: [],
      status: "Conectado",
    };
  }

  protected recordStatus(nextStatus: ConnectorStatus) {
    getConnectorStatusStore().set(this.metadata.connectorId, nextStatus);
  }
}

class DemoFileConnector extends BaseConnector {
  private rows: Record<string, string | number>[];

  constructor(metadata: DataConnectorMetadata, rows: Record<string, string | number>[]) {
    super(metadata);
    this.rows = rows;
  }

  async testConnection(): Promise<ConnectionResult> {
    return {
      message: "Adapter DEMO listo; no usa credenciales reales.",
      ok: true,
      requiredCredentials: [],
      status: "Conectado",
    };
  }

  async sync(params: SyncParams): Promise<SyncResult> {
    const csv = csvFromRows(this.rows);
    const result = ingestTabularFile({
      actor: params.actor,
      buffer: Buffer.from(csv, "utf8"),
      contentType: "text/csv",
      datasetType: this.metadata.datasetType,
      fileName: `${this.metadata.connectorId}-${params.period}.csv`,
      period: params.period,
      scope: params.scope,
      sourceId: this.metadata.connectorId,
    });

    if (params.publish && result.importRecord.status !== "BLOCKED") {
      publishImport(result.importRecord.id, params.actor);
    }

    const rejectedRecords = result.stagingRows.filter(
      (row) => row.errors.length > 0,
    ).length;
    const status: SyncResult["status"] =
      result.importRecord.status === "BLOCKED" ? "failed" : "success";
    const nextStatus: ConnectorStatus = {
      connectorId: this.metadata.connectorId,
      coverage: status === "success" ? 100 : 50,
      errors: result.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message),
      freshness: "fresh",
      lastDataReceivedAt: nowIso(),
      lastSyncAt: nowIso(),
      nextSyncAt: "2026-08-08T06:00:00.000Z",
      processedRecords: result.stagingRows.length,
      rejectedRecords,
      retries: 0,
      status: status === "success" ? "Conectado" : "Error",
    };

    this.recordStatus(nextStatus);
    getConnectorRuns().push({
      at: nowIso(),
      connectorId: this.metadata.connectorId,
      message: `Sync ${status} con ${result.stagingRows.length} filas.`,
      status,
    });

    return {
      errors: nextStatus.errors,
      importId: result.importRecord.id,
      processedRecords: result.stagingRows.length,
      rejectedRecords,
      status,
      warnings: result.issues
        .filter((issue) => issue.severity === "warning")
        .map((issue) => issue.message),
    };
  }
}

class DisabledRealConnector extends BaseConnector {
  async sync(): Promise<SyncResult> {
    const currentStatus = await this.getStatus();
    const nextStatus = {
      ...currentStatus,
      errors: [
        `Pendiente configurar ${this.metadata.envVars.join(", ")} en servidor.`,
      ],
      lastSyncAt: nowIso(),
      rejectedRecords: currentStatus.rejectedRecords,
      retries: currentStatus.retries + 1,
      status: "Sin configurar" as const,
    };

    this.recordStatus(nextStatus);
    getConnectorRuns().push({
      at: nowIso(),
      connectorId: this.metadata.connectorId,
      message: "Sync no ejecutado por credenciales pendientes.",
      status: "pending_credentials",
    });

    return {
      errors: nextStatus.errors,
      importId: null,
      processedRecords: 0,
      rejectedRecords: 0,
      status: "pending_credentials",
      warnings: ["Fallback manual debe permanecer activo."],
    };
  }
}

export function parseAuthorizedPhysioHtmlFixture(html: string) {
  if (
    html.includes("captcha") ||
    html.includes("mfa") ||
    html.includes("password")
  ) {
    throw new Error("Scraping bloqueado: autenticacion interactiva no se evade.");
  }

  const rows = [...html.matchAll(/<tr[^>]*data-appointment[^>]*>([\s\S]*?)<\/tr>/gi)];

  return rows.map((rowMatch, index) => {
    const cells = [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
      (match) => match[1].replace(/<[^>]+>/g, "").trim(),
    );

    return {
      appointment_id: cells[0] || `SCRAPE-${index + 1}`,
      appointment_status: cells[4] || "atendida",
      branch: cells[1] || "SS - Centro Medico - L024",
      business_line: "Fisioterapia",
      company: "Analiza Fisioterapia",
      completed_minutes: cells[6] || "45",
      country: "El Salvador",
      currency: "USD",
      manager: cells[2] || "Gerencia operaciones Fisioterapia",
      patient_hash: cells[3] || `anon_${index + 1}`,
      period: "2026-07",
      professional: cells[5] || "Terapeuta DEMO",
      revenue: cells[7] || "45",
      scheduled_minutes: cells[6] || "45",
      service: "Sesion fisioterapia",
      appointment_date: cells[8] || "2026-07-15",
    };
  });
}

export const connectorCatalog: DataConnectorMetadata[] = [
  {
    companyId: labCompanyId,
    connectorId: "billing-demo-adapter",
    countryId: defaultCountryId,
    datasetType: "billing",
    envVars: [],
    frequency: "Diario",
    name: "Facturacion DEMO - facturas, notas y detalle",
    owner: "Finanzas",
    sourceType: "manual file",
  },
  {
    companyId: labCompanyId,
    connectorId: "payments-demo-adapter",
    countryId: defaultCountryId,
    datasetType: "payments",
    envVars: [],
    frequency: "Diario",
    name: "Cobros DEMO - pagos y cuentas por cobrar",
    owner: "Finanzas",
    sourceType: "manual file",
  },
  {
    companyId: physioCompanyId,
    connectorId: "crm-demo-adapter",
    countryId: defaultCountryId,
    datasetType: "crm",
    envVars: [],
    frequency: "Diario",
    name: "CRM DEMO - leads, referidos y conversion",
    owner: "Comercial",
    sourceType: "REST API",
  },
  {
    companyId: physioCompanyId,
    connectorId: "physio-authorized-scraper",
    countryId: defaultCountryId,
    datasetType: "physiotherapy",
    envVars: [
      "PHYSIO_PORTAL_BASE_URL",
      "PHYSIO_AUTHORIZED_SESSION_SECRET",
    ],
    frequency: "Diario incremental",
    name: "Fisioterapia - scraping autorizado",
    owner: "Operaciones Fisioterapia",
    sourceType: "authorized scraping",
  },
  {
    companyId: labCompanyId,
    connectorId: "laboratory-lis-api",
    countryId: defaultCountryId,
    datasetType: "laboratory",
    envVars: ["LAB_LIS_BASE_URL", "LAB_LIS_CLIENT_ID", "LAB_LIS_CLIENT_SECRET"],
    frequency: "Diario",
    name: "Laboratorio - LIS/API",
    owner: "Operaciones Laboratorio",
    sourceType: "REST API",
  },
  {
    companyId: imagingCompanyId,
    connectorId: "imaging-ris-pacs",
    countryId: defaultCountryId,
    datasetType: "imaging",
    envVars: ["IMAGING_RIS_BASE_URL", "IMAGING_RIS_CLIENT_SECRET"],
    frequency: "Diario",
    name: "Imagenes - RIS/PACS",
    owner: "Operaciones Imagenes",
    sourceType: "REST API",
  },
];

const demoRows: Record<string, Record<string, string | number>[]> = {
  "billing-demo-adapter": [
    {
      branch: "SS - Aguilares - L033",
      branch_code: "L033",
      business_line: "Laboratorio",
      channel: "Venta directa",
      company: "Analiza Laboratorio",
      country: "El Salvador",
      credit_notes: 0,
      currency: "USD",
      discounts: 10,
      gross_billing: 510,
      invoice_id: "FAC-DEMO-001",
      manager: "Gerencia operaciones Laboratorio",
      net_billing: 500,
      payer: "Particular",
      period: "2026-07",
      service_detail: "Perfil laboratorio",
    },
  ],
  "crm-demo-adapter": [
    {
      anonymous_customer_id: "anon_1001",
      branch: "SS - Centro Medico - L024",
      branch_code: "SV-PHYSIOTHERAPY-SS-CENTRO-MEDICO-L024",
      business_line: "Fisioterapia",
      campaign: "Julio DEMO",
      company: "Analiza Fisioterapia",
      conversion_status: "convertido",
      country: "El Salvador",
      lead_id: "CRM-DEMO-001",
      manager: "Edwin Isaac Santillana",
      period: "2026-07",
      referrer: "Referidor DEMO",
      source: "Referidor",
    },
  ],
  "payments-demo-adapter": [
    {
      amount: 500,
      branch: "SS - Aguilares - L033",
      branch_code: "L033",
      business_line: "Laboratorio",
      company: "Analiza Laboratorio",
      country: "El Salvador",
      currency: "USD",
      invoice_id: "FAC-DEMO-001",
      manager: "Gerencia operaciones Laboratorio",
      payment_date: "2026-07-15",
      payment_id: "PAY-DEMO-001",
      payment_method: "Tarjeta",
      period: "2026-07",
    },
  ],
};

export function getDataConnector(connectorId: string): DataConnector | null {
  const metadata = connectorCatalog.find(
    (connector) => connector.connectorId === connectorId,
  );

  if (!metadata) {
    return null;
  }

  if (metadata.envVars.length === 0) {
    return new DemoFileConnector(metadata, demoRows[connectorId] ?? []);
  }

  return new DisabledRealConnector(metadata);
}

export async function listConnectorStatuses() {
  return Promise.all(
    connectorCatalog.map(async (metadata) => {
      const connector = getDataConnector(metadata.connectorId);
      const status = connector ? await connector.getStatus() : buildInitialStatus(metadata);

      return {
        ...metadata,
        ...status,
      };
    }),
  );
}

export function listConnectorRuns() {
  return [...getConnectorRuns()];
}
