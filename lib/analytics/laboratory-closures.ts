import type { PoolClient } from "pg";

import {
  getMissingDatabaseConfig,
  getPostgresPool,
  withPostgresRlsContext,
} from "../server/database.ts";
import { assertBranchReadyForOperationalData } from "../server/branch-governance.ts";
import {
  canPerformAction,
  type AuthorizationActor,
} from "../security/authorization-policy.ts";
import { isDemoRuntimeEnvironment } from "../security/environment.ts";
import {
  demoBranches,
  demoCompanies,
  demoCountries,
  demoDefaultPeriod,
  demoOperationalAreas,
  type BranchOption,
} from "../tenant/demo-context.ts";
import type { ScopeBoundary } from "../tenant/delegation-policy.ts";

export type LaboratoryClosureStatus =
  | "draft"
  | "validation_failed"
  | "validated"
  | "published"
  | "replaced";

export type LaboratoryValidationState =
  | "VALIDADO"
  | "ADVERTENCIA"
  | "BLOQUEADO";

export type LaboratoryValidationSeverity = "error" | "warning";

export type LaboratoryKpiStatus = "CALCULABLE" | "NOT_CALCULABLE";

export type LaboratoryTargetDirection =
  | "HIGHER_IS_BETTER"
  | "LOWER_IS_BETTER"
  | "RANGE";

export type LaboratoryTargetStatus =
  | "cumplido"
  | "en_riesgo"
  | "incumplido"
  | "sin_meta"
  | "not_calculable";

export type LaboratoryTargetLifecycleStatus = "active" | "inactive";

export type LaboratoryInsightPriority =
  | "critica"
  | "alta"
  | "media"
  | "positiva";

export type LaboratoryClosureAction =
  | "autosave"
  | "draft_created"
  | "draft_updated"
  | "target.changed"
  | "validated"
  | "validation_blocked"
  | "published"
  | "replaced";

export type LaboratoryFieldSource =
  | "manual"
  | "catalog"
  | "system"
  | "proposed";

export type LaboratoryClosureInputs = {
  analizaOrders: number;
  analizaRevenue: number;
  averageTurnaroundTimeHours: number;
  cardRevenue: number;
  cashRevenue: number;
  clientsTotal: number;
  closureObservations: string;
  costOfSales: number;
  creditRevenue: number;
  customerServiceCount: number;
  drsvClients: number;
  drsvOrders: number;
  drsvRevenue: number;
  homeServiceOrders: number;
  homeServiceRevenue: number;
  mixedPaymentRevenue: number;
  nurseCount: number;
  ordersTotal: number;
  phlebotomistCount: number;
  processedTests: number;
  profilesTotal: number;
  referredOrders: number;
  referredRevenue: number;
  rejectedTests: number;
  reprocessedTests: number;
  revenueTotal: number;
  technicalCapacityTests: number;
  technicalStaffCount: number;
};

export type LaboratoryClosureScope = ScopeBoundary & {
  areaManagerName: string;
  branchCode: string;
  branchName: string;
  businessLine: "LABORATORY";
  companyName: string;
  countryName: string;
  managerName: string;
};

export type LaboratoryValidationIssue = {
  code: string;
  field?: keyof LaboratoryClosureInputs | "period" | "branchId";
  message: string;
  severity: LaboratoryValidationSeverity;
};

export type LaboratoryKpiResult = {
  id: LaboratoryKpiId;
  label: string;
  formula: string;
  reading: string;
  status: LaboratoryKpiStatus;
  unit: "currency" | "count" | "ratio";
  value: number | null;
  requiredFields: string[];
  missingFields: string[];
};

export type LaboratoryTarget = {
  approvedAt: string;
  approvedBy: string;
  branchId: string;
  companyId: string;
  countryId: string;
  direction: LaboratoryTargetDirection;
  id: string;
  isDemo: boolean;
  kpiId: LaboratoryTargetableKpiId;
  label: string;
  period: string;
  status: LaboratoryTargetLifecycleStatus;
  targetMaxValue?: number;
  targetMinValue?: number;
  targetValue: number;
  unit: "currency" | "count" | "ratio";
  version: number;
};

export type LaboratoryTargetComparison = {
  actualValue: number | null;
  complianceRate: number | null;
  direction: LaboratoryTargetDirection;
  kpiId: LaboratoryTargetableKpiId;
  label: string;
  status: LaboratoryTargetStatus;
  targetMaxValue?: number;
  targetMinValue?: number;
  targetValue: number | null;
  unit: "currency" | "count" | "ratio";
  variation: number | null;
};

export type LaboratoryInsight = {
  branchName: string;
  comparison: string;
  evidence: string;
  id: string;
  impact: string;
  kpiId: LaboratoryKpiId;
  period: string;
  priority: LaboratoryInsightPriority;
  recommendation: string;
  title: string;
  whatHappened: string;
};

export type LaboratoryAuditEvent = {
  action: LaboratoryClosureAction;
  actorEmail: string;
  actorId: string;
  at: string;
  closureId: string;
  details: string;
  period: string;
  branchId: string;
};

export type LaboratoryClosure = {
  auditEvents: LaboratoryAuditEvent[];
  createdAt: string;
  createdBy: string;
  dataQualityScore: number;
  duplicateOfClosureId: string | null;
  id: string;
  inputs: LaboratoryClosureInputs;
  isDemo: boolean;
  kpiResults: LaboratoryKpiResult[];
  period: string;
  publishedAt: string | null;
  publishedBy: string | null;
  replacedByClosureId: string | null;
  replacesClosureId: string | null;
  scope: LaboratoryClosureScope;
  sourceLineage: Record<keyof LaboratoryClosureInputs, LaboratoryFieldSource>;
  status: LaboratoryClosureStatus;
  submittedBy: string;
  targetComparisons: LaboratoryTargetComparison[];
  updatedAt: string;
  validatedAt: string | null;
  validation: {
    errors: LaboratoryValidationIssue[];
    state: LaboratoryValidationState;
    warnings: LaboratoryValidationIssue[];
  };
  version: number;
};

export type LaboratoryBranchSummary = {
  areaName: string;
  areaManagerName: string;
  branchId: string;
  branchName: string;
  clients: number;
  contributionMargin: number;
  dataQualityScore: number;
  managerName: string;
  marginRate: number | null;
  orders: number;
  period: string;
  processedTests: number | null;
  profiles: number;
  productivity: number | null;
  revenue: number;
  revenueCompliance: number | null;
  revenueTarget: number | null;
  closureId: string;
  status: LaboratoryValidationState;
};

export type LaboratoryWorkspace = {
  actorRole: AuthorizationActor["roleKey"];
  auditEvents: LaboratoryAuditEvent[];
  branches: LaboratoryClosureScope[];
  branchSummaries: LaboratoryBranchSummary[];
  canCreateClosure: boolean;
  canManageTargets: boolean;
  canPublishClosure: boolean;
  closures: LaboratoryClosure[];
  currentPeriod: string;
  currentPeriodStatus: "sin_cierre" | "borrador" | "validado" | "publicado";
  draftClosure: LaboratoryClosure | null;
  insights: LaboratoryInsight[];
  latestPublishedClosure: LaboratoryClosure | null;
  pendingClosureCount: number;
  publishedClosures: LaboratoryClosure[];
  reportingPeriod: string;
  summary: LaboratoryRollupSummary;
  targetComparisons: LaboratoryTargetComparison[];
  targets: LaboratoryTarget[];
};

export type LaboratoryRollupSummary = {
  branchCount: number;
  clients: number;
  closuresPublished: number;
  contributionMargin: number;
  dataQualityScore: number;
  marginRate: number | null;
  orders: number;
  processedTests: number | null;
  productivity: number | null;
  profiles: number;
  revenue: number;
  revenueCompliance: number | null;
  revenueTarget: number | null;
};

export type LaboratoryDraftPayload = {
  branchId?: unknown;
  closureObservations?: unknown;
  id?: unknown;
  inputs?: unknown;
  period?: unknown;
  replacesClosureId?: unknown;
};

export type LaboratoryTargetPayload = {
  branchId?: unknown;
  direction?: unknown;
  kpiId?: unknown;
  period?: unknown;
  status?: unknown;
  targetMaxValue?: unknown;
  targetMinValue?: unknown;
  targetValue?: unknown;
};

export type LaboratoryKpiId =
  | "facturacion_neta"
  | "cumplimiento_facturacion"
  | "ordenes_total"
  | "clientes_total"
  | "perfiles_total"
  | "pruebas_procesadas"
  | "pruebas_por_paciente"
  | "ingreso_por_prueba"
  | "costo_por_prueba"
  | "margen_contribucion"
  | "porcentaje_margen"
  | "productividad_personal"
  | "throughput"
  | "cumplimiento_meta_produccion"
  | "tat_promedio"
  | "tasa_rechazo"
  | "tasa_reproceso"
  | "utilizacion_tecnica";

export type LaboratoryTargetableKpiId =
  | "facturacion_neta"
  | "perfiles_total"
  | "throughput"
  | "productividad_personal"
  | "margen_contribucion"
  | "tat_promedio"
  | "tasa_rechazo";

type LaboratoryStore = {
  auditEvents: LaboratoryAuditEvent[];
  closures: Map<string, LaboratoryClosure>;
  targets: Map<string, LaboratoryTarget>;
};

declare global {
  var analizaLaboratoryStore: LaboratoryStore | undefined;
}

const laboratoryCompany =
  demoCompanies.find((company) => company.unitType === "laboratorio") ??
  demoCompanies[0];
const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const currentDemoPeriod = "2026-08";

const kpiMeta: Record<
  LaboratoryKpiId,
  {
    label: string;
    formula: string;
    reading: string;
    unit: LaboratoryKpiResult["unit"];
    requiredFields: string[];
  }
> = {
  clientes_total: {
    formula: "clientes atendidos",
    label: "Clientes",
    reading: "Cuenta clientes atendidos en el periodo. Sirve para leer volumen comercial sin exponer datos personales.",
    requiredFields: ["clientsTotal"],
    unit: "count",
  },
  costo_por_prueba: {
    formula: "costo de ventas / pruebas procesadas",
    label: "Costo por prueba",
    reading: "Indica cuanto costo directo se consume por cada prueba procesada. Si sube, revise insumos, mix de pruebas o reprocesos.",
    requiredFields: ["costOfSales", "processedTests"],
    unit: "currency",
  },
  cumplimiento_facturacion: {
    formula: "facturacion neta / meta de facturacion",
    label: "Cumplimiento de facturacion",
    reading: "Muestra el avance de la facturacion neta contra la meta aprobada del periodo.",
    requiredFields: ["revenueTotal", "target_revenue"],
    unit: "ratio",
  },
  cumplimiento_meta_produccion: {
    formula: "perfiles / meta de produccion",
    label: "Cumplimiento meta produccion",
    reading: "Compara los perfiles procesados contra la meta operativa aprobada.",
    requiredFields: ["profilesTotal", "target_production"],
    unit: "ratio",
  },
  facturacion_neta: {
    formula: "facturacion neta",
    label: "Facturacion neta",
    reading: "Venta neta validada para el cierre. Es la base financiera para cumplimiento, margen e ingreso por prueba.",
    requiredFields: ["revenueTotal"],
    unit: "currency",
  },
  ingreso_por_prueba: {
    formula: "facturacion neta / pruebas procesadas",
    label: "Ingreso por prueba",
    reading: "Promedio facturado por cada prueba procesada. Ayuda a leer precio, mix de servicios y descuentos.",
    requiredFields: ["revenueTotal", "processedTests"],
    unit: "currency",
  },
  margen_contribucion: {
    formula: "facturacion neta - costo de ventas",
    label: "Margen de contribucion",
    reading: "Monto que queda despues de cubrir costo de ventas. No descuenta gastos administrativos, financieros ni impuestos.",
    requiredFields: ["revenueTotal", "costOfSales"],
    unit: "currency",
  },
  ordenes_total: {
    formula: "ordenes registradas",
    label: "Ordenes",
    reading: "Cantidad de ordenes registradas en el cierre. Permite comparar demanda contra perfiles y pruebas.",
    requiredFields: ["ordersTotal"],
    unit: "count",
  },
  perfiles_total: {
    formula: "perfiles procesados",
    label: "Perfiles",
    reading: "Cantidad de perfiles o servicios procesados segun la plantilla actual de Laboratorio.",
    requiredFields: ["profilesTotal"],
    unit: "count",
  },
  porcentaje_margen: {
    formula: "(facturacion neta - costo de ventas) / facturacion neta",
    label: "Margen de contribucion bruto %",
    reading: "Porcentaje de facturacion neta que queda despues del costo de ventas. No es margen neto porque no descuenta gastos administrativos, financieros ni impuestos.",
    requiredFields: ["revenueTotal", "costOfSales"],
    unit: "ratio",
  },
  productividad_personal: {
    formula: "perfiles / personal operativo",
    label: "Productividad por personal",
    reading: "Promedio de perfiles procesados por persona operativa capturada en el cierre.",
    requiredFields: ["profilesTotal", "staffTotal"],
    unit: "count",
  },
  pruebas_por_paciente: {
    formula: "pruebas procesadas / clientes",
    label: "Pruebas por paciente",
    reading: "Promedio de pruebas por cliente atendido. Ayuda a ver intensidad de servicio y cambios en el mix.",
    requiredFields: ["processedTests", "clientsTotal"],
    unit: "count",
  },
  pruebas_procesadas: {
    formula: "pruebas procesadas",
    label: "Pruebas procesadas",
    reading: "Volumen total de pruebas procesadas. Es la base de capacidad, costo e ingreso por prueba.",
    requiredFields: ["processedTests"],
    unit: "count",
  },
  tasa_rechazo: {
    formula: "pruebas rechazadas / pruebas procesadas",
    label: "Tasa de rechazo",
    reading: "Porcentaje de pruebas rechazadas sobre lo procesado. Lectura de calidad de muestra o proceso.",
    requiredFields: ["rejectedTests", "processedTests"],
    unit: "ratio",
  },
  tasa_reproceso: {
    formula: "pruebas reprocesadas / pruebas procesadas",
    label: "Tasa de reproceso",
    reading: "Porcentaje de pruebas reprocesadas sobre lo procesado. Ayuda a detectar retrabajo operativo.",
    requiredFields: ["reprocessedTests", "processedTests"],
    unit: "ratio",
  },
  tat_promedio: {
    formula: "tiempo promedio de entrega",
    label: "TAT promedio",
    reading: "Tiempo promedio en horas desde procesamiento hasta entrega. Mientras menor, mejor oportunidad de servicio.",
    requiredFields: ["averageTurnaroundTimeHours"],
    unit: "count",
  },
  throughput: {
    formula: "perfiles procesados",
    label: "Throughput",
    reading: "Compatibilidad con metas antiguas de throughput. La vista nueva usa Perfiles para evitar duplicidad.",
    requiredFields: ["profilesTotal"],
    unit: "count",
  },
  utilizacion_tecnica: {
    formula: "pruebas procesadas / capacidad tecnica",
    label: "Utilizacion tecnica",
    reading: "Porcentaje de capacidad tecnica utilizada. Ayuda a leer saturacion o capacidad disponible.",
    requiredFields: ["processedTests", "technicalCapacityTests"],
    unit: "ratio",
  },
};

type VisibleLaboratoryTargetableKpiId = Exclude<
  LaboratoryTargetableKpiId,
  "throughput"
>;

const targetableKpis: Record<
  LaboratoryTargetableKpiId,
  {
    direction: LaboratoryTargetDirection;
    label: string;
    unit: LaboratoryTarget["unit"];
  }
> = {
  facturacion_neta: {
    direction: "HIGHER_IS_BETTER",
    label: "Facturacion",
    unit: "currency",
  },
  margen_contribucion: {
    direction: "HIGHER_IS_BETTER",
    label: "Margen de contribucion",
    unit: "currency",
  },
  perfiles_total: {
    direction: "HIGHER_IS_BETTER",
    label: "Perfiles",
    unit: "count",
  },
  productividad_personal: {
    direction: "HIGHER_IS_BETTER",
    label: "Productividad",
    unit: "count",
  },
  tasa_rechazo: {
    direction: "LOWER_IS_BETTER",
    label: "Rechazo maximo",
    unit: "ratio",
  },
  tat_promedio: {
    direction: "LOWER_IS_BETTER",
    label: "TAT maximo",
    unit: "count",
  },
  throughput: {
    direction: "HIGHER_IS_BETTER",
    label: "Throughput",
    unit: "count",
  },
};

const visibleTargetableKpis: Record<
  VisibleLaboratoryTargetableKpiId,
  (typeof targetableKpis)[LaboratoryTargetableKpiId]
> = {
  facturacion_neta: targetableKpis.facturacion_neta,
  margen_contribucion: targetableKpis.margen_contribucion,
  perfiles_total: targetableKpis.perfiles_total,
  productividad_personal: targetableKpis.productividad_personal,
  tasa_rechazo: targetableKpis.tasa_rechazo,
  tat_promedio: targetableKpis.tat_promedio,
};

const inputFieldNames: Array<keyof LaboratoryClosureInputs> = [
  "analizaOrders",
  "analizaRevenue",
  "averageTurnaroundTimeHours",
  "cardRevenue",
  "cashRevenue",
  "clientsTotal",
  "closureObservations",
  "costOfSales",
  "creditRevenue",
  "customerServiceCount",
  "drsvClients",
  "drsvOrders",
  "drsvRevenue",
  "homeServiceOrders",
  "homeServiceRevenue",
  "mixedPaymentRevenue",
  "nurseCount",
  "ordersTotal",
  "phlebotomistCount",
  "processedTests",
  "profilesTotal",
  "referredOrders",
  "referredRevenue",
  "rejectedTests",
  "reprocessedTests",
  "revenueTotal",
  "technicalCapacityTests",
  "technicalStaffCount",
];

type LaboratoryNumericInputKey = Exclude<
  keyof LaboratoryClosureInputs,
  "closureObservations"
>;

const numericInputFieldNames: LaboratoryNumericInputKey[] = [
  "analizaOrders",
  "analizaRevenue",
  "averageTurnaroundTimeHours",
  "cardRevenue",
  "cashRevenue",
  "clientsTotal",
  "costOfSales",
  "creditRevenue",
  "customerServiceCount",
  "drsvClients",
  "drsvOrders",
  "drsvRevenue",
  "homeServiceOrders",
  "homeServiceRevenue",
  "mixedPaymentRevenue",
  "nurseCount",
  "ordersTotal",
  "phlebotomistCount",
  "processedTests",
  "profilesTotal",
  "referredOrders",
  "referredRevenue",
  "rejectedTests",
  "reprocessedTests",
  "revenueTotal",
  "technicalCapacityTests",
  "technicalStaffCount",
];

const requiredNumericInputFieldNames: LaboratoryNumericInputKey[] = [
  "clientsTotal",
  "costOfSales",
  "ordersTotal",
  "profilesTotal",
  "revenueTotal",
];

const proposedNumericInputFieldNames: LaboratoryNumericInputKey[] = [
  "averageTurnaroundTimeHours",
  "processedTests",
  "rejectedTests",
  "reprocessedTests",
  "technicalCapacityTests",
];

export function resetLaboratoryClosureStoreForTests() {
  globalThis.analizaLaboratoryStore = undefined;
}

export function getLaboratoryBranches() {
  return demoBranches
    .filter((branch) => branch.companyId === laboratoryCompany.id)
    .filter((branch) => branch.isActive !== false)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getCountryName(countryId: string) {
  return (
    demoCountries.find((country) => country.id === countryId)?.name ??
    "Pais DEMO"
  );
}

function getOperationalArea(branch: BranchOption) {
  return demoOperationalAreas.find(
    (area) => area.id === branch.operationalAreaId,
  );
}

function toClosureScope(branch: BranchOption): LaboratoryClosureScope {
  const area = getOperationalArea(branch);

  return {
    branchCode: branch.code,
    branchId: branch.id,
    branchName: branch.name,
    businessLine: "LABORATORY",
    companyId: branch.companyId,
    companyName: laboratoryCompany.name,
    countryId: branch.countryId,
    countryName: getCountryName(branch.countryId),
    managerName: branch.branchManagerName ?? "Gerente de sucursal pendiente",
    operationalAreaId: branch.operationalAreaId ?? null,
    areaManagerName:
      branch.areaManagerName ?? area?.managerName ?? "Gerente de area pendiente",
    organizationId: area?.organizationId ?? demoOrganizationId,
  };
}

function branchScope(branch: BranchOption): ScopeBoundary {
  return {
    branchId: branch.id,
    companyId: branch.companyId,
    countryId: branch.countryId,
    operationalAreaId: branch.operationalAreaId ?? null,
    organizationId:
      getOperationalArea(branch)?.organizationId ?? demoOrganizationId,
  };
}

function canActorReadBranch(actor: AuthorizationActor, branch: BranchOption) {
  return canPerformAction(actor, "record.read", {
    scope: branchScope(branch),
  });
}

export function getLaboratoryBranchesForActor(actor: AuthorizationActor) {
  return getLaboratoryBranches().filter((branch) =>
    canActorReadBranch(actor, branch),
  );
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeIdPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/,/g, "");

    if (!normalized) {
      return Number.NaN;
    }

    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return Number.NaN;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPeriod(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

function isFuturePeriod(period: string) {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const latestAllowedPeriod =
    currentPeriod > currentDemoPeriod ? currentPeriod : currentDemoPeriod;

  return period > latestAllowedPeriod;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function ratio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }

  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function kpiResult(
  id: LaboratoryKpiId,
  value: number | null,
  missingFields: string[] = [],
): LaboratoryKpiResult {
  const meta = kpiMeta[id];

  return {
    ...meta,
    id,
    missingFields,
    status:
      value === null || !Number.isFinite(value)
        ? "NOT_CALCULABLE"
        : "CALCULABLE",
    value: value === null || !Number.isFinite(value) ? null : round(value, 4),
  };
}

function getKpiValue(
  kpis: LaboratoryKpiResult[],
  id: LaboratoryKpiId,
) {
  return kpis.find((kpi) => kpi.id === id)?.value ?? null;
}

function missingInputFields(
  inputs: LaboratoryClosureInputs,
  fields: LaboratoryNumericInputKey[],
) {
  return fields.filter((fieldName) => !Number.isFinite(inputs[fieldName]));
}

function missingOrInvalidDenominator(
  inputs: LaboratoryClosureInputs,
  fieldName: LaboratoryNumericInputKey,
) {
  const missingFields = missingInputFields(inputs, [fieldName]);

  if (missingFields.length > 0) {
    return missingFields;
  }

  return inputs[fieldName] <= 0 ? [fieldName] : [];
}

function uniqueFields(fields: string[]) {
  return Array.from(new Set(fields));
}

function totalStaff(inputs: LaboratoryClosureInputs) {
  const staffFields: LaboratoryNumericInputKey[] = [
    "customerServiceCount",
    "nurseCount",
    "phlebotomistCount",
    "technicalStaffCount",
  ];
  const capturedFields = staffFields.filter((fieldName) =>
    Number.isFinite(inputs[fieldName]),
  );

  if (capturedFields.length === 0) {
    return Number.NaN;
  }

  return capturedFields.reduce((sum, fieldName) => sum + inputs[fieldName], 0);
}

function sourceLineage(): LaboratoryClosure["sourceLineage"] {
  return inputFieldNames.reduce<LaboratoryClosure["sourceLineage"]>(
    (lineage, fieldName) => {
      lineage[fieldName] = proposedNumericInputFieldNames.includes(
        fieldName as LaboratoryNumericInputKey,
      )
        ? "proposed"
        : "manual";
      return lineage;
    },
    {} as LaboratoryClosure["sourceLineage"],
  );
}

function createAuditEvent({
  action,
  actor,
  closure,
  details,
}: {
  action: LaboratoryClosureAction;
  actor: AuthorizationActor;
  closure: Pick<LaboratoryClosure, "id" | "period" | "scope">;
  details: string;
}): LaboratoryAuditEvent {
  return {
    action,
    actorEmail: actor.email,
    actorId: actor.userId,
    at: nowIso(),
    branchId: closure.scope.branchId ?? "",
    closureId: closure.id,
    details,
    period: closure.period,
  };
}

function assertWritableRole(actor: AuthorizationActor) {
  if (
    actor.roleKey === "viewer" ||
    actor.roleKey === "ceo" ||
    actor.roleKey === "usuario_operativo"
  ) {
    throw new Error("Este rol no puede crear ni publicar cierres.");
  }
}

function canWriteClosure(actor: AuthorizationActor) {
  return !["viewer", "ceo", "usuario_operativo"].includes(actor.roleKey);
}

function canManageTargets(actor: AuthorizationActor) {
  return [
    "super_admin",
    "webmaster_admin",
    "ceo",
    "gerente_operaciones",
    "gerente_area",
  ].includes(actor.roleKey);
}

function getClosureTarget(
  targets: LaboratoryTarget[],
  closure: LaboratoryClosure,
  kpiId: LaboratoryTargetableKpiId,
) {
  const latestTarget =
    targets
      .filter(
        (target) =>
          target.period === closure.period &&
          target.branchId === closure.scope.branchId &&
          target.kpiId === kpiId,
      )
      .sort((left, right) => right.version - left.version)[0] ?? null;

  return latestTarget?.status === "active" ? latestTarget : null;
}

function calculateKpis(
  inputs: LaboratoryClosureInputs,
  targets: LaboratoryTarget[],
  closureShell: Pick<LaboratoryClosure, "period" | "scope">,
) {
  const targetShell = {
    ...closureShell,
    id: "kpi-shell",
    inputs,
  } as LaboratoryClosure;
  const revenueTarget = getClosureTarget(
    targets,
    targetShell,
    "facturacion_neta",
  )?.targetValue;
  const productionTarget =
    getClosureTarget(targets, targetShell, "perfiles_total")?.targetValue ??
    getClosureTarget(targets, targetShell, "throughput")?.targetValue;
  const marginContribution = inputs.revenueTotal - inputs.costOfSales;
  const staffTotal = totalStaff(inputs);
  const revenueAttainment =
    typeof revenueTarget === "number"
      ? ratio(inputs.revenueTotal, revenueTarget)
      : null;
  const productionAttainment =
    typeof productionTarget === "number"
      ? ratio(inputs.profilesTotal, productionTarget)
      : null;
  const revenueFields = missingInputFields(inputs, ["revenueTotal"]);
  const clientDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "clientsTotal",
  );
  const processedTestsFields = missingInputFields(inputs, ["processedTests"]);
  const processedTestsDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "processedTests",
  );
  const profilesFields = missingInputFields(inputs, ["profilesTotal"]);
  const staffFields = Number.isFinite(staffTotal) && staffTotal > 0
    ? []
    : ["staffTotal"];
  const pruebasPorPacienteFields = uniqueFields([
    ...processedTestsFields,
    ...clientDenominatorFields,
  ]);
  const ingresoPruebaFields = uniqueFields([
    ...revenueFields,
    ...processedTestsDenominatorFields,
  ]);
  const costoPruebaFields = uniqueFields([
    ...missingInputFields(inputs, ["costOfSales"]),
    ...processedTestsDenominatorFields,
  ]);
  const productivityFields = uniqueFields([
    ...profilesFields,
    ...staffFields,
  ]);
  const rejectionFields = uniqueFields([
    ...missingInputFields(inputs, ["rejectedTests"]),
    ...processedTestsDenominatorFields,
  ]);
  const reprocessFields = uniqueFields([
    ...missingInputFields(inputs, ["reprocessedTests"]),
    ...processedTestsDenominatorFields,
  ]);
  const utilizationFields = uniqueFields([
    ...processedTestsFields,
    ...missingOrInvalidDenominator(inputs, "technicalCapacityTests"),
  ]);
  const marginFields = missingInputFields(inputs, ["revenueTotal", "costOfSales"]);
  const marginRateFields = uniqueFields([
    ...missingInputFields(inputs, ["costOfSales"]),
    ...missingOrInvalidDenominator(inputs, "revenueTotal"),
  ]);

  return [
    kpiResult("facturacion_neta", inputs.revenueTotal, revenueFields),
    kpiResult(
      "cumplimiento_facturacion",
      revenueAttainment,
      [
        ...revenueFields,
        ...(typeof revenueTarget === "number" ? [] : ["target_revenue"]),
      ],
    ),
    kpiResult(
      "ordenes_total",
      inputs.ordersTotal,
      missingInputFields(inputs, ["ordersTotal"]),
    ),
    kpiResult(
      "clientes_total",
      inputs.clientsTotal,
      missingInputFields(inputs, ["clientsTotal"]),
    ),
    kpiResult("perfiles_total", inputs.profilesTotal, profilesFields),
    kpiResult(
      "pruebas_procesadas",
      inputs.processedTests,
      processedTestsFields,
    ),
    kpiResult(
      "pruebas_por_paciente",
      ratio(inputs.processedTests, inputs.clientsTotal),
      pruebasPorPacienteFields,
    ),
    kpiResult(
      "ingreso_por_prueba",
      ratio(inputs.revenueTotal, inputs.processedTests),
      ingresoPruebaFields,
    ),
    kpiResult(
      "costo_por_prueba",
      ratio(inputs.costOfSales, inputs.processedTests),
      costoPruebaFields,
    ),
    kpiResult("margen_contribucion", marginContribution, marginFields),
    kpiResult(
      "porcentaje_margen",
      ratio(marginContribution, inputs.revenueTotal),
      marginRateFields,
    ),
    kpiResult(
      "productividad_personal",
      ratio(inputs.profilesTotal, staffTotal),
      productivityFields,
    ),
    kpiResult(
      "cumplimiento_meta_produccion",
      productionAttainment,
      [
        ...profilesFields,
        ...(typeof productionTarget === "number" ? [] : ["target_production"]),
      ],
    ),
    kpiResult(
      "tat_promedio",
      inputs.averageTurnaroundTimeHours,
      missingInputFields(inputs, ["averageTurnaroundTimeHours"]),
    ),
    kpiResult(
      "tasa_rechazo",
      ratio(inputs.rejectedTests, inputs.processedTests),
      rejectionFields,
    ),
    kpiResult(
      "tasa_reproceso",
      ratio(inputs.reprocessedTests, inputs.processedTests),
      reprocessFields,
    ),
    kpiResult(
      "utilizacion_tecnica",
      ratio(inputs.processedTests, inputs.technicalCapacityTests),
      utilizationFields,
    ),
  ];
}

function getTargetStatus({
  actual,
  target,
}: {
  actual: number | null;
  target: LaboratoryTarget;
}): LaboratoryTargetStatus {
  if (actual === null) {
    return "not_calculable";
  }

  if (target.direction === "HIGHER_IS_BETTER") {
    if (actual >= target.targetValue) {
      return "cumplido";
    }

    return actual >= target.targetValue * 0.9 ? "en_riesgo" : "incumplido";
  }

  if (target.direction === "LOWER_IS_BETTER") {
    if (actual <= target.targetValue) {
      return "cumplido";
    }

    return actual <= target.targetValue * 1.15 ? "en_riesgo" : "incumplido";
  }

  if (
    typeof target.targetMinValue === "number" &&
    typeof target.targetMaxValue === "number"
  ) {
    return actual >= target.targetMinValue && actual <= target.targetMaxValue
      ? "cumplido"
      : "incumplido";
  }

  return "sin_meta";
}

function getComplianceRate({
  actual,
  target,
}: {
  actual: number | null;
  target: LaboratoryTarget;
}) {
  if (actual === null) {
    return null;
  }

  if (target.direction === "LOWER_IS_BETTER") {
    if (actual === 0) {
      return 1;
    }

    return ratio(target.targetValue, actual);
  }

  if (target.direction === "RANGE") {
    return getTargetStatus({ actual, target }) === "cumplido" ? 1 : 0;
  }

  return ratio(actual, target.targetValue);
}

function calculateTargetComparisons(
  kpis: LaboratoryKpiResult[],
  closure: LaboratoryClosure,
  targets: LaboratoryTarget[],
): LaboratoryTargetComparison[] {
  return Object.entries(visibleTargetableKpis).map(([rawKpiId, definition]) => {
    const kpiId = rawKpiId as LaboratoryTargetableKpiId;
    const actualValue = getKpiValue(kpis, kpiId);
    const target = getClosureTarget(targets, closure, kpiId);

    if (!target) {
      return {
        actualValue,
        complianceRate: null,
        direction: definition.direction,
        kpiId,
        label: definition.label,
        status: actualValue === null ? "not_calculable" : "sin_meta",
        targetValue: null,
        unit: definition.unit,
        variation: null,
      };
    }

    return {
      actualValue,
      complianceRate: getComplianceRate({ actual: actualValue, target }),
      direction: target.direction,
      kpiId,
      label: target.label,
      status: getTargetStatus({ actual: actualValue, target }),
      targetMaxValue: target.targetMaxValue,
      targetMinValue: target.targetMinValue,
      targetValue: target.targetValue,
      unit: target.unit,
      variation: actualValue === null ? null : actualValue - target.targetValue,
    };
  });
}

function getExistingPublishedClosure(
  store: LaboratoryStore,
  branchId: string,
  period: string,
) {
  return [...store.closures.values()].find(
    (closure) =>
      closure.scope.branchId === branchId &&
      closure.period === period &&
      closure.status === "published",
  );
}

function validateClosure(
  store: LaboratoryStore,
  closure: LaboratoryClosure,
): LaboratoryClosure["validation"] {
  const errors: LaboratoryValidationIssue[] = [];
  const warnings: LaboratoryValidationIssue[] = [];
  const inputs = closure.inputs;

  if (!isValidPeriod(closure.period)) {
    errors.push({
      code: "period.invalid",
      field: "period",
      message: "El periodo debe tener formato YYYY-MM.",
      severity: "error",
    });
  } else if (isFuturePeriod(closure.period)) {
    errors.push({
      code: "period.future",
      field: "period",
      message: "No se puede publicar un cierre de un periodo futuro.",
      severity: "error",
    });
  }

  if (!closure.scope.branchId) {
    errors.push({
      code: "branch.required",
      field: "branchId",
      message: "La sucursal es obligatoria.",
      severity: "error",
    });
  }

  for (const fieldName of requiredNumericInputFieldNames) {
    const fieldValue = inputs[fieldName];

    if (!Number.isFinite(fieldValue)) {
      errors.push({
        code: "number.missing_required",
        field: fieldName,
        message: "Falta un dato fuente obligatorio de Laboratorio.",
        severity: "error",
      });

      continue;
    }

    if (fieldValue < 0) {
      errors.push({
        code: "number.negative",
        field: fieldName,
        message: "El valor debe ser cero o mayor.",
        severity: "error",
      });
    }
  }

  for (const fieldName of numericInputFieldNames) {
    const fieldValue = inputs[fieldName];

    if (Number.isFinite(fieldValue) && fieldValue < 0) {
      errors.push({
        code: "number.negative",
        field: fieldName,
        message: "El valor debe ser cero o mayor.",
        severity: "error",
      });
    }
  }

  const paymentRevenue = [
    inputs.cardRevenue,
    inputs.cashRevenue,
    inputs.creditRevenue,
    inputs.mixedPaymentRevenue,
  ].filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
  const hasPaymentBreakdown = paymentRevenue > 0;

  if (
    hasPaymentBreakdown &&
    Number.isFinite(inputs.revenueTotal) &&
    Math.abs(paymentRevenue - inputs.revenueTotal) >
      Math.max(5, inputs.revenueTotal * 0.02)
  ) {
    warnings.push({
      code: "revenue.payment_breakdown_mismatch",
      field: "revenueTotal",
      message:
        "La suma por formas de pago no coincide con la facturacion total dentro de tolerancia.",
      severity: "warning",
    });
  }

  const channelRevenue = [
    inputs.referredRevenue,
    inputs.analizaRevenue,
    inputs.drsvRevenue,
    inputs.homeServiceRevenue,
  ].filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
  const hasChannelBreakdown = channelRevenue > 0;

  if (
    hasChannelBreakdown &&
    Number.isFinite(inputs.revenueTotal) &&
    Math.abs(channelRevenue - inputs.revenueTotal) >
      Math.max(5, inputs.revenueTotal * 0.03)
  ) {
    warnings.push({
      code: "revenue.channel_breakdown_mismatch",
      field: "revenueTotal",
      message:
        "La suma por origen de venta no coincide con la facturacion total dentro de tolerancia.",
      severity: "warning",
    });
  }

  const channelOrders = [
    inputs.referredOrders,
    inputs.analizaOrders,
    inputs.drsvOrders,
    inputs.homeServiceOrders,
  ].filter(Number.isFinite).reduce((sum, value) => sum + value, 0);

  if (
    channelOrders > 0 &&
    Number.isFinite(inputs.ordersTotal) &&
    channelOrders > inputs.ordersTotal * 1.03
  ) {
    warnings.push({
      code: "orders.channel_breakdown_exceeds_total",
      field: "ordersTotal",
      message:
        "Las ordenes por origen superan las ordenes totales. Revise duplicidad o clasificacion.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.costOfSales) &&
    Number.isFinite(inputs.revenueTotal) &&
    inputs.costOfSales > inputs.revenueTotal &&
    inputs.revenueTotal > 0
  ) {
    warnings.push({
      code: "margin.negative",
      field: "costOfSales",
      message:
        "Los costos de venta superan la facturacion. El margen queda negativo.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.processedTests)) {
    warnings.push({
      code: "proposed.processed_tests_missing",
      field: "processedTests",
      message:
        "Pruebas procesadas no tiene fuente confirmada; pruebas/paciente, ingreso/prueba, costo/prueba, calidad y utilizacion quedan no calculables.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.averageTurnaroundTimeHours)) {
    warnings.push({
      code: "proposed.tat_missing",
      field: "averageTurnaroundTimeHours",
      message: "TAT promedio queda no calculable hasta aprobar fuente o captura.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.rejectedTests)) {
    warnings.push({
      code: "proposed.rejected_tests_missing",
      field: "rejectedTests",
      message:
        "Tasa de rechazo queda no calculable hasta aprobar fuente o captura.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.reprocessedTests)) {
    warnings.push({
      code: "proposed.reprocessed_tests_missing",
      field: "reprocessedTests",
      message:
        "Tasa de reproceso queda no calculable hasta aprobar fuente o captura.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.processedTests) &&
    Number.isFinite(inputs.rejectedTests) &&
    inputs.rejectedTests > inputs.processedTests
  ) {
    warnings.push({
      code: "quality.rejected_exceeds_processed",
      field: "rejectedTests",
      message:
        "Las pruebas rechazadas superan las pruebas procesadas. Revise la fuente de calidad.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.processedTests) &&
    Number.isFinite(inputs.reprocessedTests) &&
    inputs.reprocessedTests > inputs.processedTests
  ) {
    warnings.push({
      code: "quality.reprocessed_exceeds_processed",
      field: "reprocessedTests",
      message:
        "Los reprocesos superan las pruebas procesadas. Revise la fuente de calidad.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.processedTests) &&
    Number.isFinite(inputs.technicalCapacityTests) &&
    inputs.technicalCapacityTests > 0 &&
    inputs.processedTests > inputs.technicalCapacityTests
  ) {
    warnings.push({
      code: "capacity.processed_exceeds_capacity",
      field: "technicalCapacityTests",
      message:
        "Las pruebas procesadas superan la capacidad tecnica capturada. Revise capacidad o volumen.",
      severity: "warning",
    });
  }

  if (
    warnings.some((warning) =>
      [
        "revenue.payment_breakdown_mismatch",
        "revenue.channel_breakdown_mismatch",
        "orders.channel_breakdown_exceeds_total",
        "margin.negative",
        "capacity.processed_exceeds_capacity",
      ].includes(warning.code),
    ) &&
    inputs.closureObservations.trim().length < 12
  ) {
    warnings.push({
      code: "observations.variation_context",
      field: "closureObservations",
      message:
        "Agregue una explicacion breve para la variacion relevante del cierre.",
      severity: "warning",
    });
  }

  if (inputs.closureObservations.match(/\b\d{4}[- ]?\d{4}\b|\b\d{8,}\b/)) {
    errors.push({
      code: "observations.possible_pii",
      field: "closureObservations",
      message:
        "Las observaciones no deben incluir telefonos, identificadores ni datos personales.",
      severity: "error",
    });
  }

  const duplicateClosure = getExistingPublishedClosure(
    store,
    closure.scope.branchId ?? "",
    closure.period,
  );

  if (
    duplicateClosure &&
    duplicateClosure.id !== closure.id &&
    duplicateClosure.id !== closure.replacesClosureId
  ) {
    errors.push({
      code: "closure.duplicate_published",
      field: "period",
      message:
        "Ya existe un cierre publicado para esta sucursal y periodo. Use una correccion versionada.",
      severity: "error",
    });
  }

  return {
    errors,
    state:
      errors.length > 0
        ? "BLOQUEADO"
        : warnings.length > 0
          ? "ADVERTENCIA"
          : "VALIDADO",
    warnings,
  };
}

function calculateQualityScore(validation: LaboratoryClosure["validation"]) {
  return Math.max(
    0,
    Math.min(100, 100 - validation.errors.length * 20 - validation.warnings.length * 7),
  );
}

function withCalculatedFields(
  store: LaboratoryStore,
  closure: LaboratoryClosure,
): LaboratoryClosure {
  const targets = [...store.targets.values()];
  const kpiResults = calculateKpis(closure.inputs, targets, closure);
  const validation = validateClosure(store, closure);
  const calculatedClosure = {
    ...closure,
    dataQualityScore: calculateQualityScore(validation),
    kpiResults,
    validation,
  };

  return {
    ...calculatedClosure,
    targetComparisons: calculateTargetComparisons(
      kpiResults,
      calculatedClosure,
      targets,
    ),
  };
}

function defaultInputs(index = 0): LaboratoryClosureInputs {
  const revenueTotal = 42000 + index * 4700;
  const ordersTotal = 1280 + index * 85;
  const clientsTotal = 860 + index * 52;
  const profilesTotal = 3100 + index * 180;
  const processedTests = profilesTotal + 420 + index * 35;
  const costOfSales = Math.round(revenueTotal * (0.48 + index * 0.01));
  const referredRevenue = Math.round(revenueTotal * 0.25);
  const analizaRevenue = Math.round(revenueTotal * 0.42);
  const drsvRevenue = Math.round(revenueTotal * 0.21);
  const homeServiceRevenue = revenueTotal - referredRevenue - analizaRevenue - drsvRevenue;

  return {
    analizaOrders: Math.round(ordersTotal * 0.42),
    analizaRevenue,
    averageTurnaroundTimeHours: 22 + index,
    cardRevenue: Math.round(revenueTotal * 0.38),
    cashRevenue: Math.round(revenueTotal * 0.26),
    clientsTotal,
    closureObservations:
      "DEMO: cierre de entrenamiento Laboratorio sin datos personales.",
    costOfSales,
    creditRevenue: Math.round(revenueTotal * 0.22),
    customerServiceCount: 4 + (index % 2),
    drsvClients: Math.round(clientsTotal * 0.18),
    drsvOrders: Math.round(ordersTotal * 0.2),
    drsvRevenue,
    homeServiceOrders: Math.round(ordersTotal * 0.08),
    homeServiceRevenue,
    mixedPaymentRevenue:
      revenueTotal -
      Math.round(revenueTotal * 0.38) -
      Math.round(revenueTotal * 0.26) -
      Math.round(revenueTotal * 0.22),
    nurseCount: 2 + (index % 2),
    ordersTotal,
    phlebotomistCount: 5 + (index % 3),
    processedTests,
    profilesTotal,
    referredOrders: Math.round(ordersTotal * 0.24),
    referredRevenue,
    rejectedTests: Math.round(processedTests * 0.012),
    reprocessedTests: Math.round(processedTests * 0.018),
    revenueTotal,
    technicalCapacityTests: Math.round(processedTests * 1.18),
    technicalStaffCount: 6 + (index % 4),
  };
}

function createTargetId(
  period: string,
  branchId: string,
  kpiId: LaboratoryTargetableKpiId,
  version: number,
) {
  return "lab-target-" + sanitizeIdPart(branchId) + "-" + period + "-" + kpiId + "-v" + version;
}

function createSeedTargets(
  branch: BranchOption,
  period: string,
  inputs: LaboratoryClosureInputs,
  index: number,
) {
  const baseTargets: Array<{
    kpiId: LaboratoryTargetableKpiId;
    targetValue: number;
  }> = [
    {
      kpiId: "facturacion_neta",
      targetValue: Math.round(inputs.revenueTotal * (index % 2 === 0 ? 1.03 : 0.97)),
    },
    {
      kpiId: "perfiles_total",
      targetValue: Math.round(inputs.profilesTotal * 1.04),
    },
    {
      kpiId: "margen_contribucion",
      targetValue: Math.round((inputs.revenueTotal - inputs.costOfSales) * 1.02),
    },
    {
      kpiId: "productividad_personal",
      targetValue: round((inputs.profilesTotal / totalStaff(inputs)) * 1.03, 4),
    },
    {
      kpiId: "tat_promedio",
      targetValue: 24,
    },
    {
      kpiId: "tasa_rechazo",
      targetValue: 0.015,
    },
  ];

  return baseTargets.map(({ kpiId, targetValue }) => {
    const definition = targetableKpis[kpiId];

    return {
      approvedAt: period + "-01T06:00:00.000Z",
      approvedBy: "DEMO operaciones laboratorio",
      branchId: branch.id,
      companyId: branch.companyId,
      countryId: branch.countryId,
      direction: definition.direction,
      id: createTargetId(period, branch.id, kpiId, 1),
      isDemo: true,
      kpiId,
      label: definition.label,
      period,
      status: "active",
      targetValue: round(targetValue, 4),
      unit: definition.unit,
      version: 1,
    } satisfies LaboratoryTarget;
  });
}

function createSeedClosure(
  branch: BranchOption,
  period: string,
  inputs: LaboratoryClosureInputs,
  index: number,
): LaboratoryClosure {
  const createdAt = period + "-28T08:0" + (index % 9) + ":00.000Z";
  const baseClosure: LaboratoryClosure = {
    auditEvents: [],
    createdAt,
    createdBy: "demo-seed",
    dataQualityScore: 100,
    duplicateOfClosureId: null,
    id: "lab-closure-" + sanitizeIdPart(branch.id) + "-" + period + "-v1",
    inputs,
    isDemo: true,
    kpiResults: [],
    period,
    publishedAt: period + "-28T09:0" + (index % 9) + ":00.000Z",
    publishedBy: "DEMO operaciones laboratorio",
    replacedByClosureId: null,
    replacesClosureId: null,
    scope: toClosureScope(branch),
    sourceLineage: sourceLineage(),
    status: "published",
    submittedBy: branch.branchManagerName ?? "Gerente de sucursal DEMO",
    targetComparisons: [],
    updatedAt: createdAt,
    validatedAt: period + "-28T08:3" + (index % 9) + ":00.000Z",
    validation: {
      errors: [],
      state: "VALIDADO",
      warnings: [],
    },
    version: 1,
  };

  return baseClosure;
}

function seedStore(store: LaboratoryStore) {
  const branches = getLaboratoryBranches().filter(
    (branch) => branch.operationalAreaId,
  );
  const seedPeriod = demoDefaultPeriod;

  branches.forEach((branch, index) => {
    const inputs = defaultInputs(index);

    for (const target of createSeedTargets(branch, seedPeriod, inputs, index)) {
      store.targets.set(target.id, target);
    }

    for (const target of createSeedTargets(
      branch,
      currentDemoPeriod,
      {
        ...inputs,
        profilesTotal: Math.round(inputs.profilesTotal * 1.03),
        revenueTotal: Math.round(inputs.revenueTotal * 1.05),
      },
      index,
    )) {
      store.targets.set(target.id, target);
    }

    const closure = withCalculatedFields(
      store,
      createSeedClosure(branch, seedPeriod, inputs, index),
    );
    const auditEvent: LaboratoryAuditEvent = {
      action: "published",
      actorEmail: "demo-laboratorio@analiza.local",
      actorId: "demo-seed",
      at: closure.publishedAt ?? closure.updatedAt,
      branchId: branch.id,
      closureId: closure.id,
      details: "Seed DEMO publicado desde el catalogo gestionado de Laboratorio.",
      period: closure.period,
    };

    closure.auditEvents.push(auditEvent);
    store.auditEvents.push(auditEvent);
    store.closures.set(closure.id, closure);
  });
}

function getStore() {
  if (!globalThis.analizaLaboratoryStore) {
    const store: LaboratoryStore = {
      auditEvents: [],
      closures: new Map(),
      targets: new Map(),
    };

    seedStore(store);
    globalThis.analizaLaboratoryStore = store;
  }

  return globalThis.analizaLaboratoryStore;
}

function getBranchForPayload(actor: AuthorizationActor, branchId: string) {
  const branch = getLaboratoryBranches().find(
    (candidate) => candidate.id === branchId,
  );

  if (!branch) {
    throw new Error("Sucursal de Laboratorio no encontrada.");
  }

  if (!canActorReadBranch(actor, branch)) {
    throw new Error("El usuario no tiene alcance sobre esta sucursal.");
  }

  return branch;
}

function parseInputs(payload: LaboratoryDraftPayload) {
  const inputRecord =
    typeof payload.inputs === "object" &&
    payload.inputs !== null &&
    !Array.isArray(payload.inputs)
      ? (payload.inputs as Record<string, unknown>)
      : {};

  return {
    analizaOrders: readNumber(inputRecord.analizaOrders),
    analizaRevenue: readNumber(inputRecord.analizaRevenue),
    averageTurnaroundTimeHours: readNumber(
      inputRecord.averageTurnaroundTimeHours,
    ),
    cardRevenue: readNumber(inputRecord.cardRevenue),
    cashRevenue: readNumber(inputRecord.cashRevenue),
    clientsTotal: readNumber(inputRecord.clientsTotal),
    closureObservations: readString(
      inputRecord.closureObservations ?? payload.closureObservations,
    ).slice(0, 1200),
    costOfSales: readNumber(inputRecord.costOfSales),
    creditRevenue: readNumber(inputRecord.creditRevenue),
    customerServiceCount: readNumber(inputRecord.customerServiceCount),
    drsvClients: readNumber(inputRecord.drsvClients),
    drsvOrders: readNumber(inputRecord.drsvOrders),
    drsvRevenue: readNumber(inputRecord.drsvRevenue),
    homeServiceOrders: readNumber(inputRecord.homeServiceOrders),
    homeServiceRevenue: readNumber(inputRecord.homeServiceRevenue),
    mixedPaymentRevenue: readNumber(inputRecord.mixedPaymentRevenue),
    nurseCount: readNumber(inputRecord.nurseCount),
    ordersTotal: readNumber(inputRecord.ordersTotal),
    phlebotomistCount: readNumber(inputRecord.phlebotomistCount),
    processedTests: readNumber(inputRecord.processedTests),
    profilesTotal: readNumber(inputRecord.profilesTotal),
    referredOrders: readNumber(inputRecord.referredOrders),
    referredRevenue: readNumber(inputRecord.referredRevenue),
    rejectedTests: readNumber(inputRecord.rejectedTests),
    reprocessedTests: readNumber(inputRecord.reprocessedTests),
    revenueTotal: readNumber(inputRecord.revenueTotal),
    technicalCapacityTests: readNumber(inputRecord.technicalCapacityTests),
    technicalStaffCount: readNumber(inputRecord.technicalStaffCount),
  } satisfies LaboratoryClosureInputs;
}

function getNextVersion(
  store: LaboratoryStore,
  branchId: string,
  period: string,
) {
  return (
    Math.max(
      0,
      ...[...store.closures.values()]
        .filter(
          (closure) =>
            closure.scope.branchId === branchId && closure.period === period,
        )
        .map((closure) => closure.version),
    ) + 1
  );
}

function appendAudit(
  store: LaboratoryStore,
  closure: LaboratoryClosure,
  event: LaboratoryAuditEvent,
) {
  closure.auditEvents = [event, ...closure.auditEvents];
  store.auditEvents = [event, ...store.auditEvents];
}

function saveDemoLaboratoryClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  assertWritableRole(actor);

  const store = getStore();
  const payload = (typeof rawPayload === "object" && rawPayload !== null
    ? rawPayload
    : {}) as LaboratoryDraftPayload;
  const branchId = readString(payload.branchId);
  const branch = getBranchForPayload(actor, branchId);
  const period = readString(payload.period) || currentDemoPeriod;
  const inputs = parseInputs(payload);
  const existingId = readString(payload.id);
  const replacesClosureId = readString(payload.replacesClosureId) || null;
  const existingClosure = existingId ? store.closures.get(existingId) : null;
  const timestamp = nowIso();

  if (existingClosure && existingClosure.status === "published") {
    throw new Error("Un cierre publicado no se edita de forma silenciosa.");
  }

  if (replacesClosureId) {
    const replaced = store.closures.get(replacesClosureId);

    if (
      !replaced ||
      replaced.status !== "published" ||
      replaced.scope.branchId !== branch.id ||
      replaced.period !== period
    ) {
      throw new Error("La correccion versionada no coincide con el cierre publicado.");
    }
  }

  const version =
    existingClosure?.version ?? getNextVersion(store, branch.id, period);
  const id =
    existingClosure?.id ??
    `lab-closure-${sanitizeIdPart(branch.id)}-${period}-v${version}`;
  const baseClosure: LaboratoryClosure = {
    auditEvents: existingClosure?.auditEvents ?? [],
    createdAt: existingClosure?.createdAt ?? timestamp,
    createdBy: existingClosure?.createdBy ?? actor.userId,
    dataQualityScore: existingClosure?.dataQualityScore ?? 0,
    duplicateOfClosureId:
      getExistingPublishedClosure(store, branch.id, period)?.id ?? null,
    id,
    inputs,
    isDemo: true,
    kpiResults: existingClosure?.kpiResults ?? [],
    period,
    publishedAt: null,
    publishedBy: null,
    replacedByClosureId: null,
    replacesClosureId,
    scope: toClosureScope(branch),
    sourceLineage: sourceLineage(),
    status: "draft",
    submittedBy: actor.email,
    targetComparisons: existingClosure?.targetComparisons ?? [],
    updatedAt: timestamp,
    validatedAt: null,
    validation: existingClosure?.validation ?? {
      errors: [],
      state: "BLOQUEADO",
      warnings: [],
    },
    version,
  };
  const closure = withCalculatedFields(store, baseClosure);
  const event = createAuditEvent({
    action: existingClosure ? "draft_updated" : "draft_created",
    actor,
    closure,
    details: existingClosure
      ? "Borrador actualizado desde formulario Laboratorio."
      : "Borrador creado desde formulario Laboratorio.",
  });

  appendAudit(store, closure, event);
  store.closures.set(closure.id, closure);

  return closure;
}

function validateDemoLaboratoryClosureDraft(
  actor: AuthorizationActor,
  closureId: string,
) {
  assertWritableRole(actor);

  const store = getStore();
  const closure = store.closures.get(closureId);

  if (!closure) {
    throw new Error("Cierre no encontrado.");
  }

  const branch = getBranchForPayload(actor, closure.scope.branchId ?? "");
  const recalculated = withCalculatedFields(store, {
    ...closure,
    scope: toClosureScope(branch),
    updatedAt: nowIso(),
    validatedAt: nowIso(),
  });
  const validated: LaboratoryClosure = {
    ...recalculated,
    status:
      recalculated.validation.errors.length > 0
        ? "validation_failed"
        : "validated",
  };
  const event = createAuditEvent({
    action:
      validated.validation.errors.length > 0 ? "validation_blocked" : "validated",
    actor,
    closure: validated,
    details:
      validated.validation.errors.length > 0
        ? "Validacion bloqueada por reglas de calidad."
        : "Cierre validado por reglas de negocio.",
  });

  appendAudit(store, validated, event);
  store.closures.set(validated.id, validated);

  return validated;
}

function publishDemoLaboratoryClosure(
  actor: AuthorizationActor,
  closureId: string,
) {
  assertWritableRole(actor);

  const store = getStore();
  const closure = validateDemoLaboratoryClosureDraft(actor, closureId);

  if (closure.validation.errors.length > 0) {
    throw new Error("No se puede publicar un cierre bloqueado.");
  }

  const existingPublished = getExistingPublishedClosure(
    store,
    closure.scope.branchId ?? "",
    closure.period,
  );

  if (
    existingPublished &&
    existingPublished.id !== closure.replacesClosureId &&
    existingPublished.id !== closure.id
  ) {
    throw new Error("Ya existe un cierre publicado. Use correccion versionada.");
  }

  const timestamp = nowIso();
  const published: LaboratoryClosure = withCalculatedFields(store, {
    ...closure,
    publishedAt: timestamp,
    publishedBy: actor.email,
    status: "published",
    updatedAt: timestamp,
  });

  if (closure.replacesClosureId) {
    const replaced = store.closures.get(closure.replacesClosureId);

    if (replaced) {
      const replacementEvent = createAuditEvent({
        action: "replaced",
        actor,
        closure: replaced,
        details: `Reemplazado por correccion versionada ${published.id}.`,
      });
      const replacedClosure: LaboratoryClosure = {
        ...replaced,
        replacedByClosureId: published.id,
        status: "replaced",
        updatedAt: timestamp,
      };

      appendAudit(store, replacedClosure, replacementEvent);
      store.closures.set(replacedClosure.id, replacedClosure);
    }
  }

  const event = createAuditEvent({
    action: "published",
    actor,
    closure: published,
    details: "Cierre publicado y disponible para KPIs, metas e insights.",
  });

  appendAudit(store, published, event);
  store.closures.set(published.id, published);

  return published;
}

function readTargetDirection(
  value: unknown,
  fallback: LaboratoryTargetDirection,
) {
  if (
    value === "HIGHER_IS_BETTER" ||
    value === "LOWER_IS_BETTER" ||
    value === "RANGE"
  ) {
    return value;
  }

  return fallback;
}

function readTargetKpiId(value: unknown): LaboratoryTargetableKpiId {
  if (
    value === "facturacion_neta" ||
    value === "perfiles_total" ||
    value === "throughput" ||
    value === "productividad_personal" ||
    value === "margen_contribucion" ||
    value === "tat_promedio" ||
    value === "tasa_rechazo"
  ) {
    return value;
  }

  throw new Error("KPI de meta no soportado para Laboratorio MVP.");
}

function readTargetLifecycleStatus(
  value: unknown,
): LaboratoryTargetLifecycleStatus {
  return value === "inactive" ? "inactive" : "active";
}

function upsertDemoLaboratoryTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (!canManageTargets(actor)) {
    throw new Error("Este rol no puede configurar metas.");
  }

  const store = getStore();
  const payload = (typeof rawPayload === "object" && rawPayload !== null
    ? rawPayload
    : {}) as LaboratoryTargetPayload;
  const branchId = readString(payload.branchId);
  const branch = getBranchForPayload(actor, branchId);
  const period = readString(payload.period) || currentDemoPeriod;
  const kpiId = readTargetKpiId(payload.kpiId);
  const definition = targetableKpis[kpiId];
  const existingTargets = [...store.targets.values()].filter(
    (target) =>
      target.branchId === branch.id &&
      target.period === period &&
      target.kpiId === kpiId,
  );
  const version =
    Math.max(0, ...existingTargets.map((target) => target.version)) + 1;
  const direction = readTargetDirection(payload.direction, definition.direction);
  const targetValue = readNumber(payload.targetValue);

  if (!Number.isFinite(targetValue)) {
    throw new Error("La meta es obligatoria y debe ser numerica.");
  }

  if (targetValue < 0) {
    throw new Error("La meta debe ser cero o mayor.");
  }

  const targetMinValue = readNumber(payload.targetMinValue);
  const targetMaxValue = readNumber(payload.targetMaxValue);

  if (
    direction === "RANGE" &&
    (!Number.isFinite(targetMinValue) ||
      !Number.isFinite(targetMaxValue) ||
      targetMinValue > targetMaxValue)
  ) {
    throw new Error("El rango de meta debe tener minimo y maximo validos.");
  }

  const target: LaboratoryTarget = {
    approvedAt: nowIso(),
    approvedBy: actor.email,
    branchId: branch.id,
    companyId: branch.companyId,
    countryId: branch.countryId,
    direction,
    id: createTargetId(period, branch.id, kpiId, version),
    isDemo: true,
    kpiId,
    label: definition.label,
    period,
    status: readTargetLifecycleStatus(payload.status),
    targetMaxValue:
      direction === "RANGE" ? round(targetMaxValue, 4) : undefined,
    targetMinValue:
      direction === "RANGE" ? round(targetMinValue, 4) : undefined,
    targetValue: round(targetValue, 4),
    unit: definition.unit,
    version,
  };

  store.targets.set(target.id, target);

  return target;
}

function filterClosuresForActor(actor: AuthorizationActor) {
  const store = getStore();
  const allowedBranchIds = new Set(
    getLaboratoryBranchesForActor(actor).map((branch) => branch.id),
  );

  return [...store.closures.values()]
    .filter((closure) => allowedBranchIds.has(closure.scope.branchId ?? ""))
    .sort((left, right) =>
      `${right.period}-${right.version}`.localeCompare(
        `${left.period}-${left.version}`,
      ),
    );
}

function filterTargetsForActor(actor: AuthorizationActor) {
  const store = getStore();
  const allowedBranchIds = new Set(
    getLaboratoryBranchesForActor(actor).map((branch) => branch.id),
  );

  return [...store.targets.values()].filter((target) =>
    allowedBranchIds.has(target.branchId),
  );
}

function finiteValues(values: number[]) {
  return values.filter((value) => Number.isFinite(value));
}

function aggregateKpiValue(
  closures: LaboratoryClosure[],
  kpiId: LaboratoryTargetableKpiId,
) {
  if (closures.length === 0) {
    return null;
  }

  if (kpiId === "facturacion_neta") {
    return closures.reduce((sum, closure) => sum + closure.inputs.revenueTotal, 0);
  }

  if (kpiId === "perfiles_total" || kpiId === "throughput") {
    return closures.reduce((sum, closure) => sum + closure.inputs.profilesTotal, 0);
  }

  if (kpiId === "margen_contribucion") {
    return closures.reduce(
      (sum, closure) =>
        sum + closure.inputs.revenueTotal - closure.inputs.costOfSales,
      0,
    );
  }

  if (kpiId === "productividad_personal") {
    const totals = closures.reduce(
      (summary, closure) => {
        const closureStaff = totalStaff(closure.inputs);

        return {
          profiles: summary.profiles + closure.inputs.profilesTotal,
          staff: Number.isFinite(closureStaff)
            ? summary.staff + closureStaff
            : summary.staff,
        };
      },
      { profiles: 0, staff: 0 },
    );

    return ratio(totals.profiles, totals.staff);
  }

  if (kpiId === "tat_promedio") {
    const values = finiteValues(
      closures.map((closure) => closure.inputs.averageTurnaroundTimeHours),
    );

    return values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  }

  const qualityTotals = closures.reduce(
    (summary, closure) => ({
      processed: Number.isFinite(closure.inputs.processedTests)
        ? summary.processed + closure.inputs.processedTests
        : summary.processed,
      rejected: Number.isFinite(closure.inputs.rejectedTests)
        ? summary.rejected + closure.inputs.rejectedTests
        : summary.rejected,
    }),
    { processed: 0, rejected: 0 },
  );

  return ratio(qualityTotals.rejected, qualityTotals.processed);
}

function latestTargetsByBranchAndKpi(targets: LaboratoryTarget[]) {
  const latestTargets = new Map<string, LaboratoryTarget>();

  for (const target of targets) {
    const key = target.period + ":" + target.branchId + ":" + target.kpiId;
    const existingTarget = latestTargets.get(key);

    if (!existingTarget || target.version > existingTarget.version) {
      latestTargets.set(key, target);
    }
  }

  return latestTargets;
}

function aggregateTargetValue(
  closures: LaboratoryClosure[],
  targets: LaboratoryTarget[],
  kpiId: LaboratoryTargetableKpiId,
) {
  const latestTargets = latestTargetsByBranchAndKpi(targets);
  const closureTargets = closures
    .map((closure) =>
      latestTargets.get(closure.period + ":" + closure.scope.branchId + ":" + kpiId),
    )
    .filter(
      (target): target is LaboratoryTarget => target?.status === "active",
    );

  if (closureTargets.length === 0) {
    return null;
  }

  if (
    kpiId === "productividad_personal" ||
    kpiId === "tat_promedio" ||
    kpiId === "tasa_rechazo"
  ) {
    return (
      closureTargets.reduce((sum, target) => sum + target.targetValue, 0) /
      closureTargets.length
    );
  }

  return closureTargets.reduce((sum, target) => sum + target.targetValue, 0);
}

function buildRollupComparisons(
  closures: LaboratoryClosure[],
  targets: LaboratoryTarget[],
) {
  return Object.entries(visibleTargetableKpis).map(([rawKpiId, definition]) => {
    const kpiId = rawKpiId as LaboratoryTargetableKpiId;
    const targetValue = aggregateTargetValue(closures, targets, kpiId);
    const actualValue = aggregateKpiValue(closures, kpiId);

    if (targetValue === null) {
      return {
        actualValue,
        complianceRate: null,
        direction: definition.direction,
        kpiId,
        label: definition.label,
        status: actualValue === null ? "not_calculable" : "sin_meta",
        targetValue: null,
        unit: definition.unit,
        variation: null,
      } satisfies LaboratoryTargetComparison;
    }

    const target: LaboratoryTarget = {
      approvedAt: "",
      approvedBy: "",
      branchId: "",
      companyId: "",
      countryId: "",
      direction: definition.direction,
      id: "aggregate",
      isDemo: true,
      kpiId,
      label: definition.label,
      period: closures[0]?.period ?? currentDemoPeriod,
      status: "active",
      targetValue,
      unit: definition.unit,
      version: 1,
    };

    return {
      actualValue,
      complianceRate: getComplianceRate({ actual: actualValue, target }),
      direction: definition.direction,
      kpiId,
      label: definition.label,
      status: getTargetStatus({ actual: actualValue, target }),
      targetValue,
      unit: definition.unit,
      variation: actualValue === null ? null : actualValue - targetValue,
    } satisfies LaboratoryTargetComparison;
  });
}

function buildRollupSummary(
  closures: LaboratoryClosure[],
  branchCount: number,
): LaboratoryRollupSummary {
  const revenue = closures.reduce(
    (sum, closure) => sum + closure.inputs.revenueTotal,
    0,
  );
  const revenueTarget = closures.reduce((sum, closure) => {
    const target = closure.targetComparisons.find(
      (comparison) => comparison.kpiId === "facturacion_neta",
    )?.targetValue;

    return target === null || target === undefined ? sum : sum + target;
  }, 0);
  const orders = closures.reduce(
    (sum, closure) => sum + closure.inputs.ordersTotal,
    0,
  );
  const clients = closures.reduce(
    (sum, closure) => sum + closure.inputs.clientsTotal,
    0,
  );
  const profiles = closures.reduce(
    (sum, closure) => sum + closure.inputs.profilesTotal,
    0,
  );
  const processedValues = finiteValues(
    closures.map((closure) => closure.inputs.processedTests),
  );
  const processedTests = processedValues.length > 0
    ? processedValues.reduce((sum, value) => sum + value, 0)
    : null;
  const contributionMargin = closures.reduce(
    (sum, closure) =>
      sum + closure.inputs.revenueTotal - closure.inputs.costOfSales,
    0,
  );
  const staff = closures.reduce((sum, closure) => {
    const closureStaff = totalStaff(closure.inputs);

    return Number.isFinite(closureStaff) ? sum + closureStaff : sum;
  }, 0);
  const dataQualityScore =
    closures.length > 0
      ? closures.reduce((sum, closure) => sum + closure.dataQualityScore, 0) /
        closures.length
      : 0;

  return {
    branchCount,
    clients,
    closuresPublished: closures.length,
    contributionMargin,
    dataQualityScore: round(dataQualityScore, 1),
    marginRate: ratio(contributionMargin, revenue),
    orders,
    processedTests,
    productivity: ratio(profiles, staff),
    profiles,
    revenue,
    revenueCompliance:
      revenueTarget > 0 ? ratio(revenue, revenueTarget) : null,
    revenueTarget: revenueTarget > 0 ? revenueTarget : null,
  };
}

function targetByKpi(
  comparisons: LaboratoryTargetComparison[],
  kpiId: LaboratoryTargetableKpiId,
) {
  return comparisons.find((comparison) => comparison.kpiId === kpiId) ?? null;
}

function formatComparisonValue(
  comparison: LaboratoryTargetComparison | null,
) {
  if (!comparison || comparison.actualValue === null) {
    return "sin dato calculable";
  }

  if (comparison.unit === "currency") {
    return "$" + Math.round(comparison.actualValue).toLocaleString("en-US");
  }

  if (comparison.unit === "ratio") {
    return Math.round(comparison.actualValue * 100) + "%";
  }

  return Math.round(comparison.actualValue).toLocaleString("en-US");
}

function previousPublishedClosure(
  closure: LaboratoryClosure,
  closures: LaboratoryClosure[],
) {
  return (
    closures
      .filter(
        (candidate) =>
          candidate.status === "published" &&
          candidate.scope.branchId === closure.scope.branchId &&
          candidate.period < closure.period,
      )
      .sort((left, right) => right.period.localeCompare(left.period))[0] ?? null
  );
}

function buildInsightsForClosure(
  closure: LaboratoryClosure,
  allClosures: LaboratoryClosure[] = [],
): LaboratoryInsight[] {
  const insights: LaboratoryInsight[] = [];
  const previousClosure = previousPublishedClosure(closure, allClosures);
  const revenue = targetByKpi(closure.targetComparisons, "facturacion_neta");
  const production =
    targetByKpi(closure.targetComparisons, "perfiles_total") ??
    targetByKpi(closure.targetComparisons, "throughput");
  const margin = targetByKpi(closure.targetComparisons, "margen_contribucion");
  const rejection = targetByKpi(closure.targetComparisons, "tasa_rechazo");
  const tat = targetByKpi(closure.targetComparisons, "tat_promedio");
  const marginRate = getKpiValue(closure.kpiResults, "porcentaje_margen");
  const currentMargin = closure.inputs.revenueTotal - closure.inputs.costOfSales;
  const previousMargin =
    previousClosure === null
      ? null
      : previousClosure.inputs.revenueTotal - previousClosure.inputs.costOfSales;

  if (revenue?.status === "incumplido" || revenue?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        formatComparisonValue(revenue) +
        " vs meta " +
        (revenue.targetValue === null
          ? "sin meta"
          : "$" + Math.round(revenue.targetValue).toLocaleString("en-US")),
      evidence:
        "La facturacion proviene del cierre publicado y la meta aprobada del periodo.",
      id: closure.id + "-revenue",
      impact:
        revenue.variation === null
          ? "No se puede cuantificar brecha."
          : "$" + Math.abs(Math.round(revenue.variation)).toLocaleString("en-US") + " de brecha contra meta.",
      kpiId: "facturacion_neta",
      period: closure.period,
      priority: revenue.status === "incumplido" ? "critica" : "alta",
      recommendation:
        "Factores a revisar: origen de ordenes, clientes atendidos, perfiles procesados y mix de servicios.",
      title: "Facturacion debajo de meta",
      whatHappened: "La facturacion publicada quedo debajo de la meta.",
    });
  }

  if (production?.status === "incumplido" || production?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        formatComparisonValue(production) +
        " vs meta " +
        (production.targetValue === null
          ? "sin meta"
          : Math.round(production.targetValue).toLocaleString("en-US")),
      evidence:
        "La produccion se calcula desde perfiles publicados contra la meta aprobada.",
      id: closure.id + "-production",
      impact:
        production.variation === null
          ? "Brecha de produccion no cuantificable."
          : Math.abs(Math.round(production.variation)).toLocaleString("en-US") + " perfiles de brecha contra meta.",
      kpiId: "perfiles_total",
      period: closure.period,
      priority: production.status === "incumplido" ? "alta" : "media",
      recommendation:
        "Factores a revisar: demanda por origen, disponibilidad de personal y capacidad tecnica antes de concluir causa.",
      title: "Produccion debajo de meta",
      whatHappened: "La produccion publicada quedo debajo de la meta.",
    });
  }

  if (margin?.status === "incumplido" || margin?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        formatComparisonValue(margin) +
        " vs meta " +
        (margin.targetValue === null
          ? "sin meta"
          : "$" + Math.round(margin.targetValue).toLocaleString("en-US")),
      evidence:
        "El margen de contribucion se calcula como facturacion menos costo de ventas.",
      id: closure.id + "-margin",
      impact:
        marginRate === null
          ? "Margen porcentual no calculable."
          : "Margen porcentual " + Math.round(marginRate * 100) + "%.",
      kpiId: "margen_contribucion",
      period: closure.period,
      priority: "alta",
      recommendation:
        "Factores a revisar: costo de venta, compra de insumos y mezcla de pruebas.",
      title: "Margen debajo de meta",
      whatHappened: "La contribucion quedo por debajo del nivel esperado.",
    });
  }

  if (rejection?.status === "incumplido" || rejection?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        formatComparisonValue(rejection) +
        " vs meta " +
        (rejection.targetValue === null
          ? "sin meta"
          : Math.round(rejection.targetValue * 100) + "%"),
      evidence:
        "La tasa de rechazo usa pruebas rechazadas sobre pruebas procesadas cuando ambos datos existen.",
      id: closure.id + "-rejection",
      impact: "Riesgo de reproceso, costo adicional y deterioro en experiencia.",
      kpiId: "tasa_rechazo",
      period: closure.period,
      priority: rejection.status === "incumplido" ? "alta" : "media",
      recommendation:
        "Factores a revisar: toma de muestra, transporte y controles de calidad.",
      title: "Rechazos sobre meta",
      whatHappened: "La tasa de rechazo supero el maximo aprobado.",
    });
  }

  if (tat?.status === "incumplido" || tat?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        formatComparisonValue(tat) +
        " horas vs meta " +
        (tat.targetValue === null ? "sin meta" : Math.round(tat.targetValue) + " horas"),
      evidence:
        "TAT se muestra solo cuando existe fuente o captura aprobada para el cierre.",
      id: closure.id + "-tat",
      impact: "Riesgo de retraso operativo y seguimiento de resultados.",
      kpiId: "tat_promedio",
      period: closure.period,
      priority: tat.status === "incumplido" ? "alta" : "media",
      recommendation:
        "Factores a revisar: procesamiento interno, derivaciones, transporte y horarios de corte.",
      title: "TAT sobre meta",
      whatHappened: "El TAT promedio quedo por encima del maximo aprobado.",
    });
  }

  if (
    previousClosure !== null &&
    previousMargin !== null &&
    previousClosure.inputs.revenueTotal > 0 &&
    closure.inputs.revenueTotal > previousClosure.inputs.revenueTotal * 1.03 &&
    currentMargin < previousMargin * 0.97
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        "Facturacion actual $" +
        Math.round(closure.inputs.revenueTotal).toLocaleString("en-US") +
        " vs anterior $" +
        Math.round(previousClosure.inputs.revenueTotal).toLocaleString("en-US") +
        "; margen actual $" +
        Math.round(currentMargin).toLocaleString("en-US") +
        " vs anterior $" +
        Math.round(previousMargin).toLocaleString("en-US"),
      evidence:
        "Comparacion deterministica entre cierre publicado actual y cierre publicado anterior de la misma sucursal.",
      id: closure.id + "-revenue-up-margin-down",
      impact: "Crecimiento con deterioro de rentabilidad.",
      kpiId: "margen_contribucion",
      period: closure.period,
      priority: "alta",
      recommendation:
        "Factores a revisar: costos de venta, origen de pruebas y mezcla de servicios antes de concluir causalidad.",
      title: "Facturacion crece pero margen cae",
      whatHappened:
        "La facturacion subio frente al periodo anterior, pero el margen de contribucion bajo.",
    });
  }

  if (
    revenue?.status === "cumplido" &&
    production?.status === "cumplido" &&
    margin?.status === "cumplido" &&
    (rejection === null || rejection.status === "cumplido")
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        "Facturacion, produccion, margen y calidad disponible cumplen simultaneamente.",
      evidence:
        "Los indicadores se calculan desde el mismo cierre publicado de Laboratorio.",
      id: closure.id + "-positive",
      impact: "Sucursal candidata para documentar practica replicable.",
      kpiId: "facturacion_neta",
      period: closure.period,
      priority: "positiva",
      recommendation:
        "Revisar factores operativos para replicar en sucursales comparables.",
      title: "Cumplimiento integral positivo",
      whatHappened: "La sucursal cumplio los indicadores principales.",
    });
  }

  return insights;
}

function buildBranchSummaries(
  closures: LaboratoryClosure[],
): LaboratoryBranchSummary[] {
  return closures.map((closure) => {
    const revenueComparison = targetByKpi(
      closure.targetComparisons,
      "facturacion_neta",
    );

    return {
      areaManagerName: closure.scope.areaManagerName,
      areaName:
        demoOperationalAreas.find(
          (area) => area.id === closure.scope.operationalAreaId,
        )?.name ?? "Area pendiente",
      branchId: closure.scope.branchId ?? "",
      branchName: closure.scope.branchName,
      clients: closure.inputs.clientsTotal,
      closureId: closure.id,
      contributionMargin:
        closure.inputs.revenueTotal - closure.inputs.costOfSales,
      dataQualityScore: closure.dataQualityScore,
      managerName: closure.scope.managerName,
      marginRate: getKpiValue(closure.kpiResults, "porcentaje_margen"),
      orders: closure.inputs.ordersTotal,
      period: closure.period,
      processedTests: Number.isFinite(closure.inputs.processedTests)
        ? closure.inputs.processedTests
        : null,
      productivity: getKpiValue(closure.kpiResults, "productividad_personal"),
      profiles: closure.inputs.profilesTotal,
      revenue: closure.inputs.revenueTotal,
      revenueCompliance: revenueComparison?.complianceRate ?? null,
      revenueTarget: revenueComparison?.targetValue ?? null,
      status: closure.validation.state,
    };
  });
}

function getLatestPublishedPeriod(closures: LaboratoryClosure[]) {
  return (
    closures
      .filter((closure) => closure.status === "published")
      .sort((left, right) => right.period.localeCompare(left.period))[0]
      ?.period ?? currentDemoPeriod
  );
}

function currentPeriodStatus(
  closures: LaboratoryClosure[],
  currentPeriod: string,
) {
  if (
    closures.some(
      (closure) =>
        closure.period === currentPeriod && closure.status === "published",
    )
  ) {
    return "publicado";
  }

  if (
    closures.some(
      (closure) =>
        closure.period === currentPeriod && closure.status === "validated",
    )
  ) {
    return "validado";
  }

  if (
    closures.some(
      (closure) =>
        closure.period === currentPeriod &&
        (closure.status === "draft" ||
          closure.status === "validation_failed"),
    )
  ) {
    return "borrador";
  }

  return "sin_cierre";
}

type DbBranchRow = {
  area_manager_name: string | null;
  branch_manager_name: string | null;
  code: string;
  company_id: string;
  company_name: string;
  country_id: string;
  country_name: string;
  id: string;
  is_demo: boolean;
  name: string;
  operational_area_id: string | null;
  operational_area_name: string | null;
  organization_id: string;
};

type DbTargetRow = {
  approved_at: Date | string | null;
  approved_by_email: string | null;
  branch_id: string;
  company_id: string;
  country_id: string;
  direction: LaboratoryTargetDirection;
  id: string;
  is_demo: boolean;
  kpi_id: LaboratoryTargetableKpiId;
  label: string;
  period_month: Date | string;
  status: LaboratoryTargetLifecycleStatus;
  target_max_value: string | number | null;
  target_min_value: string | number | null;
  target_value: string | number;
  unit: LaboratoryTarget["unit"];
  version: number;
};

type DbClosureRow = {
  analiza_orders: string | number | null;
  analiza_revenue: string | number | null;
  average_turnaround_time_hours: string | number | null;
  branch_id: string;
  card_revenue: string | number | null;
  cash_revenue: string | number | null;
  clients_total: string | number | null;
  closure_observations: string | null;
  company_id: string;
  cost_of_sales: string | number | null;
  country_id: string;
  created_at: Date | string;
  credit_revenue: string | number | null;
  customer_service_count: string | number | null;
  data_quality_score: string | number;
  drsv_clients: string | number | null;
  drsv_orders: string | number | null;
  drsv_revenue: string | number | null;
  errors: unknown;
  home_service_orders: string | number | null;
  home_service_revenue: string | number | null;
  id: string;
  is_demo: boolean;
  mixed_payment_revenue: string | number | null;
  monthly_closing_id: string;
  nurse_count: string | number | null;
  orders_total: string | number | null;
  period_month: Date | string;
  phlebotomist_count: string | number | null;
  processed_tests: string | number | null;
  profiles_total: string | number | null;
  published_at: Date | string | null;
  published_by_email: string | null;
  referred_orders: string | number | null;
  referred_revenue: string | number | null;
  rejected_tests: string | number | null;
  reprocessed_tests: string | number | null;
  revenue_total: string | number | null;
  source_lineage: unknown;
  status: DbMonthlyClosingStatus;
  submitted_by_email: string;
  superseded_by_version_id: string | null;
  supersedes_version_id: string | null;
  technical_capacity_tests: string | number | null;
  technical_staff_count: string | number | null;
  updated_at: Date | string;
  validated_at: Date | string | null;
  validation_state: LaboratoryValidationState | null;
  version_number: number;
  warnings: unknown;
};

type DbAuditRow = {
  action: LaboratoryClosureAction;
  actor_email: string;
  actor_user_id: string | null;
  branch_id: string | null;
  closing_version_id: string | null;
  created_at: Date | string;
  details: string;
  period_month: Date | string | null;
};

type DbMonthlyClosingStatus =
  | "DRAFT"
  | "VALIDATED"
  | "WARNING"
  | "BLOCKED"
  | "PUBLISHED"
  | "SUPERSEDED";

type PostgresContext = {
  auditEvents: LaboratoryAuditEvent[];
  branches: LaboratoryClosureScope[];
  closures: LaboratoryClosure[];
  targets: LaboratoryTarget[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function shouldUsePostgresPersistence() {
  // Supabase V7 is the production persistence boundary. The retired direct
  // PostgreSQL adapter remains available only for installations that still
  // deliberately configure a server-side connection string during migration.
  return !isDemoRuntimeEnvironment() && getMissingDatabaseConfig().length === 0;
}

function ensurePostgresPersistenceConfigured() {
  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    throw new Error(
      `PostgreSQL no esta configurado para persistencia real: ${missingConfig.join(", ")}.`,
    );
  }
}

async function withPostgresClient<T>(
  actor: AuthorizationActor,
  work: (client: PoolClient) => Promise<T>,
) {
  ensurePostgresPersistenceConfigured();

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    return await withPostgresRlsContext(client, actor, () => work(client));
  } finally {
    client.release();
  }
}

async function withPostgresTransaction<T>(
  actor: AuthorizationActor,
  work: (client: PoolClient) => Promise<T>,
) {
  return withPostgresClient(actor, work);
}

function uuidOrNull(value: string) {
  return uuidPattern.test(value) ? value : null;
}

function periodToDate(period: string) {
  if (!isValidPeriod(period)) {
    throw new Error("El periodo debe tener formato YYYY-MM.");
  }

  return `${period}-01`;
}

function periodFromDate(value: Date | string | null) {
  if (!value) {
    return currentDemoPeriod;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 7);
  }

  return value.slice(0, 7);
}

function isoString(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dbNumber(value: string | number | null) {
  if (value === null) {
    return Number.NaN;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function numberOrNull(value: number) {
  return Number.isFinite(value) ? value : null;
}

function optionalDbNumber(value: string | number | null) {
  const parsed = dbNumber(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function dbStatusToClosureStatus(
  status: DbMonthlyClosingStatus,
): LaboratoryClosureStatus {
  if (status === "PUBLISHED") {
    return "published";
  }

  if (status === "SUPERSEDED") {
    return "replaced";
  }

  if (status === "BLOCKED") {
    return "validation_failed";
  }

  if (status === "VALIDATED" || status === "WARNING") {
    return "validated";
  }

  return "draft";
}

function validationToDbStatus(
  validation: LaboratoryClosure["validation"],
): DbMonthlyClosingStatus {
  if (validation.errors.length > 0) {
    return "BLOCKED";
  }

  return validation.warnings.length > 0 ? "WARNING" : "VALIDATED";
}

function readJsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsedValue: unknown = JSON.parse(value);
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  return [];
}

function readValidationIssues(value: unknown): LaboratoryValidationIssue[] {
  return readJsonArray(value).flatMap((issue) => {
    if (typeof issue !== "object" || issue === null || Array.isArray(issue)) {
      return [];
    }

    const record = issue as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : null;
    const message = typeof record.message === "string" ? record.message : null;
    const severity =
      record.severity === "warning" || record.severity === "error"
        ? record.severity
        : null;

    if (!code || !message || !severity) {
      return [];
    }

    return [
      {
        code,
        field:
          typeof record.field === "string"
            ? (record.field as LaboratoryValidationIssue["field"])
            : undefined,
        message,
        severity,
      },
    ];
  });
}

function dbSourceLineage(value: unknown) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as LaboratoryClosure["sourceLineage"];
  }

  return sourceLineage();
}

function branchRowToScope(row: DbBranchRow): LaboratoryClosureScope {
  return {
    areaManagerName:
      row.area_manager_name ??
      row.operational_area_name ??
      "Gerente de area pendiente",
    branchCode: row.code,
    branchId: row.id,
    branchName: row.name,
    businessLine: "LABORATORY",
    companyId: row.company_id,
    companyName: row.company_name,
    countryId: row.country_id,
    countryName: row.country_name,
    managerName: row.branch_manager_name ?? "Gerente de sucursal pendiente",
    operationalAreaId: row.operational_area_id,
    organizationId: row.organization_id,
  };
}

function targetRowToTarget(row: DbTargetRow): LaboratoryTarget {
  return {
    approvedAt: isoString(row.approved_at) ?? "",
    approvedBy: row.approved_by_email ?? (row.approved_at ? "Aprobado" : ""),
    branchId: row.branch_id,
    companyId: row.company_id,
    countryId: row.country_id,
    direction: row.direction,
    id: row.id,
    isDemo: row.is_demo,
    kpiId: row.kpi_id,
    label: row.label,
    period: periodFromDate(row.period_month),
    status: row.status,
    targetMaxValue: optionalDbNumber(row.target_max_value),
    targetMinValue: optionalDbNumber(row.target_min_value),
    targetValue: dbNumber(row.target_value),
    unit: row.unit,
    version: row.version,
  };
}

function closureRowToClosure(
  row: DbClosureRow,
  scope: LaboratoryClosureScope,
): LaboratoryClosure {
  const validationState = row.validation_state ?? "BLOQUEADO";

  return {
    auditEvents: [],
    createdAt: isoString(row.created_at) ?? nowIso(),
    createdBy: row.submitted_by_email,
    dataQualityScore: dbNumber(row.data_quality_score),
    duplicateOfClosureId: null,
    id: row.id,
    inputs: {
      analizaOrders: dbNumber(row.analiza_orders),
      analizaRevenue: dbNumber(row.analiza_revenue),
      averageTurnaroundTimeHours: dbNumber(row.average_turnaround_time_hours),
      cardRevenue: dbNumber(row.card_revenue),
      cashRevenue: dbNumber(row.cash_revenue),
      clientsTotal: dbNumber(row.clients_total),
      closureObservations: row.closure_observations ?? "",
      costOfSales: dbNumber(row.cost_of_sales),
      creditRevenue: dbNumber(row.credit_revenue),
      customerServiceCount: dbNumber(row.customer_service_count),
      drsvClients: dbNumber(row.drsv_clients),
      drsvOrders: dbNumber(row.drsv_orders),
      drsvRevenue: dbNumber(row.drsv_revenue),
      homeServiceOrders: dbNumber(row.home_service_orders),
      homeServiceRevenue: dbNumber(row.home_service_revenue),
      mixedPaymentRevenue: dbNumber(row.mixed_payment_revenue),
      nurseCount: dbNumber(row.nurse_count),
      ordersTotal: dbNumber(row.orders_total),
      phlebotomistCount: dbNumber(row.phlebotomist_count),
      processedTests: dbNumber(row.processed_tests),
      profilesTotal: dbNumber(row.profiles_total),
      referredOrders: dbNumber(row.referred_orders),
      referredRevenue: dbNumber(row.referred_revenue),
      rejectedTests: dbNumber(row.rejected_tests),
      reprocessedTests: dbNumber(row.reprocessed_tests),
      revenueTotal: dbNumber(row.revenue_total),
      technicalCapacityTests: dbNumber(row.technical_capacity_tests),
      technicalStaffCount: dbNumber(row.technical_staff_count),
    },
    isDemo: row.is_demo,
    kpiResults: [],
    period: periodFromDate(row.period_month),
    publishedAt: isoString(row.published_at),
    publishedBy: row.published_by_email,
    replacedByClosureId: row.superseded_by_version_id,
    replacesClosureId: row.supersedes_version_id,
    scope,
    sourceLineage: dbSourceLineage(row.source_lineage),
    status: dbStatusToClosureStatus(row.status),
    submittedBy: row.submitted_by_email,
    targetComparisons: [],
    updatedAt: isoString(row.updated_at) ?? nowIso(),
    validatedAt: isoString(row.validated_at),
    validation: {
      errors: readValidationIssues(row.errors),
      state: validationState,
      warnings: readValidationIssues(row.warnings),
    },
    version: row.version_number,
  };
}

async function getPostgresBranchesForActor(
  client: PoolClient,
  actor: AuthorizationActor,
) {
  const result = await client.query<DbBranchRow>(
    `
      select
        b.id,
        b.organization_id,
        b.country_id,
        c.name as country_name,
        b.company_id,
        co.name as company_name,
        b.code,
        b.name,
        b.operational_area_id,
        oa.name as operational_area_name,
        bm.display_name as branch_manager_name,
        area_profile.display_name as area_manager_name,
        b.is_demo
      from public.branches b
      join public.countries c on c.id = b.country_id
      join public.companies co on co.id = b.company_id
      left join public.operational_areas oa on oa.id = b.operational_area_id
      left join public.branch_managers bm
        on bm.branch_id = b.id
       and (bm.ends_on is null or bm.ends_on >= current_date)
      left join public.manager_assignments ma
        on ma.operational_area_id = b.operational_area_id
       and ma.status = 'active'
       and ma.branch_id is null
      left join public.profiles area_profile on area_profile.id = ma.profile_id
      where co.unit_type = 'laboratorio'
        and b.is_enabled = true
        and b.status = 'active'
      order by b.name
    `,
  );

  return result.rows
    .map(branchRowToScope)
    .filter((scope) =>
      canPerformAction(actor, "record.read", {
        scope,
      }),
    );
}

async function getPostgresTargets(
  client: PoolClient,
  branchIds: string[],
) {
  if (branchIds.length === 0) {
    return [];
  }

  const result = await client.query<DbTargetRow>(
    `
      select
        id,
        country_id,
        company_id,
        branch_id,
        period_month,
        kpi_id,
        label,
        direction,
        target_value,
        target_min_value,
        target_max_value,
        unit,
        status,
        version,
        is_demo,
        approved_at,
        approved_by_email
      from public.kpi_targets
      where business_line = 'LABORATORY'
        and branch_id = any($1::uuid[])
        and status = 'active'
        and approved_at is not null
        and is_demo = false
      order by period_month desc, branch_id, kpi_id, version desc
    `,
    [branchIds],
  );

  return result.rows.map(targetRowToTarget);
}

async function getPostgresClosures(
  client: PoolClient,
  branches: LaboratoryClosureScope[],
  targets: LaboratoryTarget[],
) {
  const branchIds = branches.flatMap((branch) =>
    branch.branchId && uuidPattern.test(branch.branchId) ? [branch.branchId] : [],
  );

  if (branchIds.length === 0) {
    return [];
  }

  const branchMap = new Map(
    branches.flatMap((branch) =>
      branch.branchId ? [[branch.branchId, branch] as const] : [],
    ),
  );
  const result = await client.query<DbClosureRow>(
    `
      select
        cv.id,
        cv.monthly_closing_id,
        cv.country_id,
        cv.company_id,
        cv.branch_id,
        cv.period_month,
        cv.version_number,
        cv.status,
        cv.supersedes_version_id,
        cv.superseded_by_version_id,
        cv.submitted_by_email,
        cv.published_by_email,
        cv.validated_at,
        cv.published_at,
        cv.data_quality_score,
        cv.is_demo,
        cv.created_at,
        cv.updated_at,
        lci.revenue_total,
        lci.cost_of_sales,
        lci.orders_total,
        lci.clients_total,
        lci.profiles_total,
        lci.processed_tests,
        lci.referred_revenue,
        lci.referred_orders,
        lci.analiza_revenue,
        lci.analiza_orders,
        lci.drsv_revenue,
        lci.drsv_orders,
        lci.drsv_clients,
        lci.home_service_revenue,
        lci.home_service_orders,
        lci.card_revenue,
        lci.cash_revenue,
        lci.credit_revenue,
        lci.mixed_payment_revenue,
        lci.phlebotomist_count,
        lci.customer_service_count,
        lci.nurse_count,
        lci.technical_staff_count,
        lci.average_turnaround_time_hours,
        lci.rejected_tests,
        lci.reprocessed_tests,
        lci.technical_capacity_tests,
        lci.closure_observations,
        lci.source_lineage,
        cvr.validation_state,
        cvr.errors,
        cvr.warnings
      from public.closing_versions cv
      join public.monthly_closings mc on mc.id = cv.monthly_closing_id
      left join public.laboratory_closing_inputs lci
        on lci.closing_version_id = cv.id
      left join public.closing_validation_results cvr
        on cvr.closing_version_id = cv.id
      where cv.business_line = 'LABORATORY'
        and cv.branch_id = any($1::uuid[])
      order by cv.period_month desc, cv.version_number desc
    `,
    [branchIds],
  );
  const baseClosures = result.rows.flatMap((row) => {
    const scope = branchMap.get(row.branch_id);

    return scope ? [closureRowToClosure(row, scope)] : [];
  });
  const store: LaboratoryStore = {
    auditEvents: [],
    closures: new Map(baseClosures.map((closure) => [closure.id, closure])),
    targets: new Map(targets.map((target) => [target.id, target])),
  };

  return baseClosures.map((closure) => withCalculatedFields(store, closure));
}

async function getPostgresAuditEvents(
  client: PoolClient,
  branchIds: string[],
) {
  if (branchIds.length === 0) {
    return [];
  }

  const result = await client.query<DbAuditRow>(
    `
      select
        actor_user_id,
        actor_email,
        action,
        details,
        closing_version_id,
        branch_id,
        period_month,
        created_at
      from public.closing_audit_events
      where business_line = 'LABORATORY'
        and branch_id = any($1::uuid[])
      order by created_at desc
      limit 50
    `,
    [branchIds],
  );

  return result.rows.map((row) => ({
    action: row.action,
    actorEmail: row.actor_email,
    actorId: row.actor_user_id ?? row.actor_email,
    at: isoString(row.created_at) ?? nowIso(),
    branchId: row.branch_id ?? "",
    closureId: row.closing_version_id ?? "",
    details: row.details,
    period: periodFromDate(row.period_month),
  }));
}

async function getPostgresContext(
  client: PoolClient,
  actor: AuthorizationActor,
): Promise<PostgresContext> {
  const branches = await getPostgresBranchesForActor(client, actor);
  const branchIds = branches.flatMap((branch) =>
    branch.branchId && uuidPattern.test(branch.branchId) ? [branch.branchId] : [],
  );
  const targets = await getPostgresTargets(client, branchIds);
  const closures = await getPostgresClosures(client, branches, targets);
  const auditEvents = await getPostgresAuditEvents(client, branchIds);

  return {
    auditEvents,
    branches,
    closures,
    targets,
  };
}

function buildWorkspaceFromContext(
  actor: AuthorizationActor,
  context: PostgresContext,
  options: { period?: string } = {},
): LaboratoryWorkspace {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const reportingPeriod =
    options.period && isValidPeriod(options.period)
      ? options.period
      : getLatestPublishedPeriod(context.closures);
  const publishedClosures = context.closures.filter(
    (closure) =>
      closure.status === "published" && closure.period === reportingPeriod,
  );
  const draftClosure =
    context.closures.find(
      (closure) =>
        closure.period === currentPeriod &&
        (closure.status === "draft" ||
          closure.status === "validation_failed" ||
          closure.status === "validated"),
    ) ?? null;
  const latestPublishedClosure =
    publishedClosures[0] ??
    context.closures.find((closure) => closure.status === "published") ??
    null;
  const targetComparisons = buildRollupComparisons(
    publishedClosures,
    context.targets,
  );
  const summary = buildRollupSummary(publishedClosures, context.branches.length);
  const pendingClosureCount = context.branches.filter(
    (branch) =>
      !context.closures.some(
        (closure) =>
          closure.scope.branchId === branch.branchId &&
          closure.period === currentPeriod &&
          closure.status === "published",
      ),
  ).length;

  return {
    actorRole: actor.roleKey,
    auditEvents: context.auditEvents,
    branches: context.branches,
    branchSummaries: buildBranchSummaries(publishedClosures),
    canCreateClosure: canWriteClosure(actor),
    canManageTargets: canManageTargets(actor),
    canPublishClosure: canWriteClosure(actor),
    closures: context.closures,
    currentPeriod,
    currentPeriodStatus: currentPeriodStatus(context.closures, currentPeriod),
    draftClosure,
    insights: publishedClosures.flatMap((closure) =>
      buildInsightsForClosure(closure, context.closures),
    ),
    latestPublishedClosure,
    pendingClosureCount,
    publishedClosures,
    reportingPeriod,
    summary,
    targetComparisons,
    targets: context.targets,
  };
}

async function insertPostgresAuditEvent(
  client: PoolClient,
  actor: AuthorizationActor,
  closure: LaboratoryClosure,
  action: LaboratoryClosureAction,
  details: string,
) {
  await client.query(
    `
      insert into public.closing_audit_events (
        monthly_closing_id,
        closing_version_id,
        organization_id,
        country_id,
        company_id,
        branch_id,
        business_line,
        period_month,
        actor_user_id,
        actor_email,
        action,
        details
      )
      select
        cv.monthly_closing_id,
        cv.id,
        cv.organization_id,
        cv.country_id,
        cv.company_id,
        cv.branch_id,
        cv.business_line,
        cv.period_month,
        $2::uuid,
        $3,
        $4,
        $5
      from public.closing_versions cv
      where cv.id = $1::uuid
    `,
    [closure.id, uuidOrNull(actor.userId), actor.email, action, details],
  );
}

async function persistPostgresCalculatedResults(
  client: PoolClient,
  actor: AuthorizationActor,
  closure: LaboratoryClosure,
  allClosures: LaboratoryClosure[],
  options: { includeInsights?: boolean } = {},
) {
  await client.query(
    `
      insert into public.closing_validation_results (
        closing_version_id,
        validation_state,
        errors,
        warnings,
        data_quality_score,
        validated_by
      )
      values ($1::uuid, $2, $3::jsonb, $4::jsonb, $5, $6::uuid)
      on conflict (closing_version_id) do update set
        validation_state = excluded.validation_state,
        errors = excluded.errors,
        warnings = excluded.warnings,
        data_quality_score = excluded.data_quality_score,
        validated_at = now(),
        validated_by = excluded.validated_by
    `,
    [
      closure.id,
      closure.validation.state,
      JSON.stringify(closure.validation.errors),
      JSON.stringify(closure.validation.warnings),
      closure.dataQualityScore,
      uuidOrNull(actor.userId),
    ],
  );
  await client.query(
    "delete from public.closing_kpi_results where closing_version_id = $1::uuid",
    [closure.id],
  );

  for (const kpi of closure.kpiResults) {
    await client.query(
      `
        insert into public.closing_kpi_results (
          closing_version_id,
          kpi_id,
          label,
          formula,
          status,
          unit,
          value,
          required_fields,
          missing_fields
        )
        values ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
      `,
      [
        closure.id,
        kpi.id,
        kpi.label,
        kpi.formula,
        kpi.status,
        kpi.unit,
        kpi.value,
        JSON.stringify(kpi.requiredFields),
        JSON.stringify(kpi.missingFields),
      ],
    );
  }

  if (!options.includeInsights) {
    return;
  }

  await client.query(
    "delete from public.generated_insights where closing_version_id = $1::uuid",
    [closure.id],
  );

  for (const insight of buildInsightsForClosure(closure, allClosures)) {
    await client.query(
      `
        insert into public.generated_insights (
          closing_version_id,
          rule_key,
          severity,
          kpi_id,
          organization_id,
          country_id,
          company_id,
          branch_id,
          business_line,
          period_month,
          context,
          title,
          message,
          comparison,
          impact,
          recommended_action,
          evidence
        )
        values (
          $1::uuid,
          $2,
          $3,
          $4,
          $5::uuid,
          $6::uuid,
          $7::uuid,
          $8::uuid,
          'LABORATORY',
          $9::date,
          $10::jsonb,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16
        )
        on conflict (closing_version_id, rule_key) do update set
          severity = excluded.severity,
          context = excluded.context,
          title = excluded.title,
          message = excluded.message,
          comparison = excluded.comparison,
          impact = excluded.impact,
          recommended_action = excluded.recommended_action,
          evidence = excluded.evidence
      `,
      [
        closure.id,
        insight.id.replace(`${closure.id}-`, ""),
        insight.priority,
        insight.kpiId,
        closure.scope.organizationId,
        closure.scope.countryId,
        closure.scope.companyId,
        closure.scope.branchId,
        periodToDate(closure.period),
        JSON.stringify({
          branchName: insight.branchName,
          whatHappened: insight.whatHappened,
        }),
        insight.title,
        insight.whatHappened,
        insight.comparison,
        insight.impact,
        insight.recommendation,
        insight.evidence,
      ],
    );
  }
}

async function getWritablePostgresBranch(
  client: PoolClient,
  actor: AuthorizationActor,
  branchId: string,
) {
  const branch = (await getPostgresBranchesForActor(client, actor)).find(
    (candidate) => candidate.branchId === branchId,
  );

  if (!branch) {
    throw new Error("Sucursal de Laboratorio no encontrada o fuera de alcance.");
  }

  await assertBranchReadyForOperationalData({
    actor,
    branchId,
    client,
    operationLabel: "cargar datos de Laboratorio",
  });

  return branch;
}

async function getPostgresClosureById(
  client: PoolClient,
  actor: AuthorizationActor,
  closureId: string,
) {
  const context = await getPostgresContext(client, actor);
  const closure = context.closures.find((candidate) => candidate.id === closureId);

  if (!closure) {
    throw new Error("Cierre no encontrado.");
  }

  return { closure, context };
}

async function savePostgresLaboratoryClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  assertWritableRole(actor);

  return withPostgresTransaction(actor, async (client) => {
    const payload = (typeof rawPayload === "object" && rawPayload !== null
      ? rawPayload
      : {}) as LaboratoryDraftPayload;
    const branchId = readString(payload.branchId);
    const branch = await getWritablePostgresBranch(client, actor, branchId);
    const period = readString(payload.period) || new Date().toISOString().slice(0, 7);
    const periodMonth = periodToDate(period);
    const inputs = parseInputs(payload);
    const existingId = readString(payload.id);
    const replacesClosureId = readString(payload.replacesClosureId) || null;
    const monthlyClosing = await client.query<{ id: string }>(
      `
        insert into public.monthly_closings (
          organization_id,
          country_id,
          company_id,
          branch_id,
          business_line,
          period_month,
          created_by,
          created_by_email
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'LABORATORY', $5::date, $6::uuid, $7)
        on conflict (organization_id, country_id, company_id, branch_id, business_line, period_month)
        do update set updated_at = now()
        returning id
      `,
      [
        branch.organizationId,
        branch.countryId,
        branch.companyId,
        branch.branchId,
        periodMonth,
        uuidOrNull(actor.userId),
        actor.email,
      ],
    );
    const monthlyClosingId = monthlyClosing.rows[0]?.id;

    if (!monthlyClosingId) {
      throw new Error("No se pudo preparar el cierre mensual.");
    }

    let versionId = existingId;
    let isExistingVersion = false;

    if (versionId) {
      const existingVersion = await client.query<{
        branch_id: string;
        period_month: Date | string;
        status: DbMonthlyClosingStatus;
      }>(
        `
          select branch_id, period_month, status
          from public.closing_versions
          where id = $1::uuid
          limit 1
        `,
        [versionId],
      );
      const version = existingVersion.rows[0];

      if (!version) {
        throw new Error("Cierre no encontrado.");
      }

      if (version.status === "PUBLISHED" || version.status === "SUPERSEDED") {
        throw new Error("Un cierre publicado no se edita de forma silenciosa.");
      }

      if (
        version.branch_id !== branch.branchId ||
        periodFromDate(version.period_month) !== period
      ) {
        throw new Error("El borrador no coincide con la sucursal y periodo.");
      }

      isExistingVersion = true;
    } else {
      if (replacesClosureId) {
        const replaced = await client.query<{
          branch_id: string;
          period_month: Date | string;
          status: DbMonthlyClosingStatus;
        }>(
          `
            select branch_id, period_month, status
            from public.closing_versions
            where id = $1::uuid
            limit 1
          `,
          [replacesClosureId],
        );
        const replacedVersion = replaced.rows[0];

        if (
          !replacedVersion ||
          replacedVersion.status !== "PUBLISHED" ||
          replacedVersion.branch_id !== branch.branchId ||
          periodFromDate(replacedVersion.period_month) !== period
        ) {
          throw new Error(
            "La correccion versionada no coincide con el cierre publicado.",
          );
        }
      }

      const existingDraft = await client.query<{ id: string }>(
        `
          select id
          from public.closing_versions
          where monthly_closing_id = $1::uuid
            and status in ('DRAFT', 'VALIDATED', 'WARNING', 'BLOCKED')
            and supersedes_version_id is not distinct from $2::uuid
          order by version_number desc
          limit 1
        `,
        [monthlyClosingId, replacesClosureId],
      );

      versionId = existingDraft.rows[0]?.id ?? "";
      isExistingVersion = Boolean(versionId);
    }

    if (!versionId) {
      const versionResult = await client.query<{ id: string; version_number: number }>(
        `
          insert into public.closing_versions (
            monthly_closing_id,
            organization_id,
            country_id,
            company_id,
            branch_id,
            business_line,
            period_month,
            version_number,
            status,
            supersedes_version_id,
            correction_reason,
            submitted_by,
            submitted_by_email
          )
          values (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4::uuid,
            $5::uuid,
            'LABORATORY',
            $6::date,
            (
              select coalesce(max(version_number), 0) + 1
              from public.closing_versions
              where monthly_closing_id = $1::uuid
            ),
            'DRAFT',
            $7::uuid,
            $8,
            $9::uuid,
            $10
          )
          returning id, version_number
        `,
        [
          monthlyClosingId,
          branch.organizationId,
          branch.countryId,
          branch.companyId,
          branch.branchId,
          periodMonth,
          replacesClosureId,
          inputs.closureObservations || null,
          uuidOrNull(actor.userId),
          actor.email,
        ],
      );

      versionId = versionResult.rows[0]?.id ?? "";
    }

    await client.query(
      `
        update public.monthly_closings
        set current_status = 'DRAFT',
            active_version_id = $2::uuid
        where id = $1::uuid
      `,
      [monthlyClosingId, versionId],
    );
    await client.query(
      `
        update public.closing_versions
        set status = 'DRAFT',
            data_quality_score = 0,
            submitted_by = $2::uuid,
            submitted_by_email = $3
        where id = $1::uuid
      `,
      [versionId, uuidOrNull(actor.userId), actor.email],
    );
    await client.query(
      `
        insert into public.laboratory_closing_inputs (
          closing_version_id,
          revenue_total,
          cost_of_sales,
          orders_total,
          clients_total,
          profiles_total,
          processed_tests,
          referred_revenue,
          referred_orders,
          analiza_revenue,
          analiza_orders,
          drsv_revenue,
          drsv_orders,
          drsv_clients,
          home_service_revenue,
          home_service_orders,
          card_revenue,
          cash_revenue,
          credit_revenue,
          mixed_payment_revenue,
          phlebotomist_count,
          customer_service_count,
          nurse_count,
          technical_staff_count,
          average_turnaround_time_hours,
          rejected_tests,
          reprocessed_tests,
          technical_capacity_tests,
          closure_observations,
          source_lineage
        )
        values (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30::jsonb
        )
        on conflict (closing_version_id) do update set
          revenue_total = excluded.revenue_total,
          cost_of_sales = excluded.cost_of_sales,
          orders_total = excluded.orders_total,
          clients_total = excluded.clients_total,
          profiles_total = excluded.profiles_total,
          processed_tests = excluded.processed_tests,
          referred_revenue = excluded.referred_revenue,
          referred_orders = excluded.referred_orders,
          analiza_revenue = excluded.analiza_revenue,
          analiza_orders = excluded.analiza_orders,
          drsv_revenue = excluded.drsv_revenue,
          drsv_orders = excluded.drsv_orders,
          drsv_clients = excluded.drsv_clients,
          home_service_revenue = excluded.home_service_revenue,
          home_service_orders = excluded.home_service_orders,
          card_revenue = excluded.card_revenue,
          cash_revenue = excluded.cash_revenue,
          credit_revenue = excluded.credit_revenue,
          mixed_payment_revenue = excluded.mixed_payment_revenue,
          phlebotomist_count = excluded.phlebotomist_count,
          customer_service_count = excluded.customer_service_count,
          nurse_count = excluded.nurse_count,
          technical_staff_count = excluded.technical_staff_count,
          average_turnaround_time_hours = excluded.average_turnaround_time_hours,
          rejected_tests = excluded.rejected_tests,
          reprocessed_tests = excluded.reprocessed_tests,
          technical_capacity_tests = excluded.technical_capacity_tests,
          closure_observations = excluded.closure_observations,
          source_lineage = excluded.source_lineage
      `,
      [
        versionId,
        numberOrNull(inputs.revenueTotal),
        numberOrNull(inputs.costOfSales),
        numberOrNull(inputs.ordersTotal),
        numberOrNull(inputs.clientsTotal),
        numberOrNull(inputs.profilesTotal),
        numberOrNull(inputs.processedTests),
        numberOrNull(inputs.referredRevenue),
        numberOrNull(inputs.referredOrders),
        numberOrNull(inputs.analizaRevenue),
        numberOrNull(inputs.analizaOrders),
        numberOrNull(inputs.drsvRevenue),
        numberOrNull(inputs.drsvOrders),
        numberOrNull(inputs.drsvClients),
        numberOrNull(inputs.homeServiceRevenue),
        numberOrNull(inputs.homeServiceOrders),
        numberOrNull(inputs.cardRevenue),
        numberOrNull(inputs.cashRevenue),
        numberOrNull(inputs.creditRevenue),
        numberOrNull(inputs.mixedPaymentRevenue),
        numberOrNull(inputs.phlebotomistCount),
        numberOrNull(inputs.customerServiceCount),
        numberOrNull(inputs.nurseCount),
        numberOrNull(inputs.technicalStaffCount),
        numberOrNull(inputs.averageTurnaroundTimeHours),
        numberOrNull(inputs.rejectedTests),
        numberOrNull(inputs.reprocessedTests),
        numberOrNull(inputs.technicalCapacityTests),
        inputs.closureObservations,
        JSON.stringify(sourceLineage()),
      ],
    );

    const { closure, context } = await getPostgresClosureById(
      client,
      actor,
      versionId,
    );

    await persistPostgresCalculatedResults(client, actor, closure, context.closures);
    await insertPostgresAuditEvent(
      client,
      actor,
      closure,
      isExistingVersion ? "autosave" : "draft_created",
      isExistingVersion
        ? "Autosave de borrador Laboratorio."
        : "Borrador creado desde formulario Laboratorio.",
    );

    return closure;
  });
}

async function validatePostgresLaboratoryClosureDraft(
  actor: AuthorizationActor,
  closureId: string,
) {
  assertWritableRole(actor);

  return withPostgresTransaction(actor, async (client) => {
    const { closure, context } = await getPostgresClosureById(
      client,
      actor,
      closureId,
    );

    if (closure.status === "published" || closure.status === "replaced") {
      throw new Error("Un cierre publicado no se edita de forma silenciosa.");
    }

    const dbStatus = validationToDbStatus(closure.validation);

    await client.query(
      `
        update public.closing_versions
        set status = $2::public.monthly_closing_status,
            data_quality_score = $3,
            validated_at = now(),
            validated_by = $4::uuid
        where id = $1::uuid
      `,
      [closure.id, dbStatus, closure.dataQualityScore, uuidOrNull(actor.userId)],
    );
    await client.query(
      `
        update public.monthly_closings mc
        set current_status = $2::public.monthly_closing_status,
            active_version_id = $1::uuid
        from public.closing_versions cv
        where cv.id = $1::uuid
          and mc.id = cv.monthly_closing_id
      `,
      [closure.id, dbStatus],
    );
    await persistPostgresCalculatedResults(client, actor, closure, context.closures);
    await insertPostgresAuditEvent(
      client,
      actor,
      closure,
      closure.validation.errors.length > 0 ? "validation_blocked" : "validated",
      closure.validation.errors.length > 0
        ? "Validacion bloqueada por reglas de calidad."
        : "Cierre validado por reglas de negocio.",
    );

    const nextContext = await getPostgresContext(client, actor);
    const validatedClosure = nextContext.closures.find(
      (candidate) => candidate.id === closure.id,
    );

    if (!validatedClosure) {
      throw new Error("Cierre no encontrado despues de validar.");
    }

    return validatedClosure;
  });
}

async function publishPostgresLaboratoryClosure(
  actor: AuthorizationActor,
  closureId: string,
) {
  assertWritableRole(actor);

  return withPostgresTransaction(actor, async (client) => {
    const { closure, context } = await getPostgresClosureById(
      client,
      actor,
      closureId,
    );

    if (closure.validation.errors.length > 0) {
      throw new Error("No se puede publicar un cierre bloqueado.");
    }

    const existingPublished = await client.query<{
      id: string;
      monthly_closing_id: string;
    }>(
      `
        select id, monthly_closing_id
        from public.closing_versions
        where monthly_closing_id = (
          select monthly_closing_id
          from public.closing_versions
          where id = $1::uuid
        )
          and status = 'PUBLISHED'
          and superseded_by_version_id is null
        limit 1
      `,
      [closure.id],
    );
    const publishedVersion = existingPublished.rows[0];

    if (
      publishedVersion &&
      publishedVersion.id !== closure.replacesClosureId &&
      publishedVersion.id !== closure.id
    ) {
      throw new Error("Ya existe un cierre publicado. Use correccion versionada.");
    }

    if (closure.replacesClosureId) {
      await client.query(
        `
          update public.closing_versions
          set status = 'SUPERSEDED',
              superseded_by_version_id = $2::uuid
          where id = $1::uuid
        `,
        [closure.replacesClosureId, closure.id],
      );
      await insertPostgresAuditEvent(
        client,
        actor,
        {
          ...closure,
          id: closure.replacesClosureId,
          status: "replaced",
        },
        "replaced",
        `Reemplazado por correccion versionada ${closure.id}.`,
      );
    }

    await client.query(
      `
        update public.closing_versions
        set status = 'PUBLISHED',
            data_quality_score = $2,
            published_at = now(),
            published_by = $3::uuid,
            published_by_email = $4
        where id = $1::uuid
      `,
      [closure.id, closure.dataQualityScore, uuidOrNull(actor.userId), actor.email],
    );
    await client.query(
      `
        update public.monthly_closings mc
        set current_status = 'PUBLISHED',
            active_version_id = $1::uuid,
            published_version_id = $1::uuid
        from public.closing_versions cv
        where cv.id = $1::uuid
          and mc.id = cv.monthly_closing_id
      `,
      [closure.id],
    );
    const nextContext = await getPostgresContext(client, actor);
    const publishedClosure = nextContext.closures.find(
      (candidate) => candidate.id === closure.id,
    );

    if (!publishedClosure) {
      throw new Error("Cierre no encontrado despues de publicar.");
    }

    await persistPostgresCalculatedResults(client, actor, publishedClosure, [
      ...context.closures.filter((candidate) => candidate.id !== closure.id),
      publishedClosure,
    ], { includeInsights: true });
    await insertPostgresAuditEvent(
      client,
      actor,
      publishedClosure,
      "published",
      "Cierre publicado y disponible para KPIs, metas e insights.",
    );

    return publishedClosure;
  });
}

async function upsertPostgresLaboratoryTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (!canManageTargets(actor)) {
    throw new Error("Este rol no puede configurar metas.");
  }

  return withPostgresTransaction(actor, async (client) => {
    const payload = (typeof rawPayload === "object" && rawPayload !== null
      ? rawPayload
      : {}) as LaboratoryTargetPayload;
    const branchId = readString(payload.branchId);
    const branch = await getWritablePostgresBranch(client, actor, branchId);
    const period = readString(payload.period) || new Date().toISOString().slice(0, 7);
    const kpiId = readTargetKpiId(payload.kpiId);
    const definition = targetableKpis[kpiId];
    const direction = readTargetDirection(payload.direction, definition.direction);
    const targetValue = readNumber(payload.targetValue);
    const targetMinValue = readNumber(payload.targetMinValue);
    const targetMaxValue = readNumber(payload.targetMaxValue);

    if (!Number.isFinite(targetValue)) {
      throw new Error("La meta es obligatoria y debe ser numerica.");
    }

    if (targetValue < 0) {
      throw new Error("La meta debe ser cero o mayor.");
    }

    if (
      direction === "RANGE" &&
      (!Number.isFinite(targetMinValue) ||
        !Number.isFinite(targetMaxValue) ||
        targetMinValue > targetMaxValue)
    ) {
      throw new Error("El rango de meta debe tener minimo y maximo validos.");
    }

    const versionResult = await client.query<{ next_version: number }>(
      `
        select coalesce(max(version), 0) + 1 as next_version
        from public.kpi_targets
        where organization_id = $1::uuid
          and branch_id = $2::uuid
          and business_line = 'LABORATORY'
          and period_month = $3::date
          and kpi_id = $4
      `,
      [branch.organizationId, branch.branchId, periodToDate(period), kpiId],
    );
    const version = versionResult.rows[0]?.next_version ?? 1;
    const insertResult = await client.query<DbTargetRow>(
      `
        insert into public.kpi_targets (
          organization_id,
          country_id,
          company_id,
          branch_id,
          business_line,
          period_month,
          kpi_id,
          label,
          target_type,
          direction,
          target_value,
          target_min_value,
          target_max_value,
          unit,
          status,
          version,
          created_by,
          created_by_email,
          approved_by,
          approved_by_email,
          approved_at
        )
        values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          'LABORATORY',
          $5::date,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::public.kpi_target_status,
          $15,
          $16::uuid,
          $17,
          $16::uuid,
          $17,
          now()
        )
        returning
          id,
          country_id,
          company_id,
          branch_id,
          period_month,
          kpi_id,
          label,
          direction,
          target_value,
          target_min_value,
          target_max_value,
          unit,
          status,
          version,
          is_demo,
          approved_at,
          approved_by_email
      `,
      [
        branch.organizationId,
        branch.countryId,
        branch.companyId,
        branch.branchId,
        periodToDate(period),
        kpiId,
        definition.label,
        direction === "RANGE" ? "RANGE" : "SINGLE_VALUE",
        direction,
        targetValue,
        direction === "RANGE" ? targetMinValue : null,
        direction === "RANGE" ? targetMaxValue : null,
        definition.unit,
        readTargetLifecycleStatus(payload.status),
        version,
        uuidOrNull(actor.userId),
        actor.email,
      ],
    );

    await client.query(
      `
        insert into public.closing_audit_events (
          organization_id,
          country_id,
          company_id,
          branch_id,
          business_line,
          period_month,
          actor_user_id,
          actor_email,
          action,
          details,
          metadata
        )
        values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          'LABORATORY',
          $5::date,
          $6::uuid,
          $7,
          'target.changed',
          'Meta Laboratorio guardada.',
          $8::jsonb
        )
      `,
      [
        branch.organizationId,
        branch.countryId,
        branch.companyId,
        branch.branchId,
        periodToDate(period),
        uuidOrNull(actor.userId),
        actor.email,
        JSON.stringify({ kpiId, version }),
      ],
    );

    return targetRowToTarget(insertResult.rows[0]);
  });
}

function getDemoLaboratoryWorkspace(
  actor: AuthorizationActor,
  options: { period?: string } = {},
): LaboratoryWorkspace {
  const branches = getLaboratoryBranchesForActor(actor);
  const closures = filterClosuresForActor(actor);
  const targets = filterTargetsForActor(actor);
  const currentPeriod = currentDemoPeriod;
  const reportingPeriod =
    options.period && isValidPeriod(options.period)
      ? options.period
      : getLatestPublishedPeriod(closures);
  const publishedClosures = closures.filter(
    (closure) =>
      closure.status === "published" && closure.period === reportingPeriod,
  );
  const draftClosure =
    closures.find(
      (closure) =>
        closure.period === currentPeriod &&
        (closure.status === "draft" ||
          closure.status === "validation_failed" ||
          closure.status === "validated"),
    ) ?? null;
  const latestPublishedClosure =
    publishedClosures[0] ??
    closures.find((closure) => closure.status === "published") ??
    null;
  const targetComparisons = buildRollupComparisons(publishedClosures, targets);
  const summary = buildRollupSummary(publishedClosures, branches.length);
  const pendingClosureCount = branches.filter(
    (branch) =>
      !closures.some(
        (closure) =>
          closure.scope.branchId === branch.id &&
          closure.period === currentPeriod &&
          closure.status === "published",
      ),
  ).length;

  return {
    actorRole: actor.roleKey,
    auditEvents: [...getStore().auditEvents]
      .filter((event) => branches.some((branch) => branch.id === event.branchId))
      .slice(0, 30),
    branches: branches.map(toClosureScope),
    branchSummaries: buildBranchSummaries(publishedClosures),
    canCreateClosure: canWriteClosure(actor),
    canManageTargets: canManageTargets(actor),
    canPublishClosure: canWriteClosure(actor),
    closures,
    currentPeriod,
    currentPeriodStatus: currentPeriodStatus(closures, currentPeriod),
    draftClosure,
    insights: publishedClosures.flatMap((closure) =>
      buildInsightsForClosure(closure, closures),
    ),
    latestPublishedClosure,
    pendingClosureCount,
    publishedClosures,
    reportingPeriod,
    summary,
    targetComparisons,
    targets,
  };
}

export async function getLaboratoryWorkspace(
  actor: AuthorizationActor,
  options: { period?: string } = {},
): Promise<LaboratoryWorkspace> {
  if (shouldUsePostgresPersistence()) {
    return withPostgresClient(actor, async (client) =>
      buildWorkspaceFromContext(
        actor,
        await getPostgresContext(client, actor),
        options,
      ),
    );
  }

  return getDemoLaboratoryWorkspace(actor, options);
}

export async function saveLaboratoryClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (shouldUsePostgresPersistence()) {
    return savePostgresLaboratoryClosureDraft(actor, rawPayload);
  }

  return saveDemoLaboratoryClosureDraft(actor, rawPayload);
}

export async function validateLaboratoryClosureDraft(
  actor: AuthorizationActor,
  closureId: string,
) {
  if (shouldUsePostgresPersistence()) {
    return validatePostgresLaboratoryClosureDraft(actor, closureId);
  }

  return validateDemoLaboratoryClosureDraft(actor, closureId);
}

export async function publishLaboratoryClosure(
  actor: AuthorizationActor,
  closureId: string,
) {
  if (shouldUsePostgresPersistence()) {
    return publishPostgresLaboratoryClosure(actor, closureId);
  }

  return publishDemoLaboratoryClosure(actor, closureId);
}

export async function upsertLaboratoryTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (shouldUsePostgresPersistence()) {
    return upsertPostgresLaboratoryTarget(actor, rawPayload);
  }

  return upsertDemoLaboratoryTarget(actor, rawPayload);
}

export function getLaboratoryTargetDefinitions() {
  return visibleTargetableKpis;
}
