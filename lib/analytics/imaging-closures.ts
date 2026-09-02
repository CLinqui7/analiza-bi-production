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

export type ImagingClosureStatus =
  | "draft"
  | "validation_failed"
  | "validated"
  | "published"
  | "replaced";

export type ImagingValidationState =
  | "VALIDADO"
  | "ADVERTENCIA"
  | "BLOQUEADO";

export type ImagingValidationSeverity = "error" | "warning";

export type ImagingKpiStatus = "CALCULABLE" | "NOT_CALCULABLE";

export type ImagingTargetDirection =
  | "HIGHER_IS_BETTER"
  | "LOWER_IS_BETTER"
  | "RANGE";

export type ImagingTargetStatus =
  | "cumplido"
  | "en_riesgo"
  | "incumplido"
  | "sin_meta"
  | "not_calculable";

export type ImagingTargetLifecycleStatus = "active" | "inactive";

export type ImagingInsightPriority =
  | "critica"
  | "alta"
  | "media"
  | "positiva";

export type ImagingClosureAction =
  | "autosave"
  | "draft_created"
  | "draft_updated"
  | "target.changed"
  | "validated"
  | "validation_blocked"
  | "published"
  | "replaced";

export type ImagingFieldSource =
  | "manual"
  | "catalog"
  | "system"
  | "proposed";

export type ImagingClosureInputs = {
  averageOrderToStudyHours: number;
  averageReportTatHours: number;
  caafRevenue: number;
  caafStudies: number;
  cancelledStudies: number;
  clientsTotal: number;
  closureObservations: string;
  costOfSales: number;
  ctRevenue: number;
  ctStudies: number;
  customerServiceCount: number;
  deliveryStaffCount: number;
  dopplerRevenue: number;
  dopplerStudies: number;
  equipmentAvailableHours: number;
  equipmentDowntimeHours: number;
  equipmentUsedHours: number;
  extraPlatesCount: number;
  extraPlatesRevenue: number;
  licensedStaffCount: number;
  newClients: number;
  noShowStudies: number;
  ordersTotal: number;
  pendingReports: number;
  reportReadingCount: number;
  referredOrders: number;
  referredRevenue: number;
  revenueTotal: number;
  scheduledStudies: number;
  telemedicinePatients: number;
  telemedicineRevenue: number;
  ultrasoundRevenue: number;
  ultrasoundStudies: number;
  xrayRevenue: number;
  xrayStudies: number;
  doctorStaffCount: number;
  cleaningStaffCount: number;
};

export type ImagingClosureScope = ScopeBoundary & {
  areaManagerName: string;
  branchCode: string;
  branchName: string;
  businessLine: "IMAGING";
  companyName: string;
  countryName: string;
  managerName: string;
};

export type ImagingValidationIssue = {
  code: string;
  field?: keyof ImagingClosureInputs | "period" | "branchId";
  message: string;
  severity: ImagingValidationSeverity;
};

export type ImagingKpiResult = {
  id: ImagingKpiId;
  label: string;
  formula: string;
  reading: string;
  status: ImagingKpiStatus;
  unit: "currency" | "count" | "ratio";
  value: number | null;
  requiredFields: string[];
  missingFields: string[];
};

export type ImagingTarget = {
  approvedAt: string;
  approvedBy: string;
  branchId: string;
  companyId: string;
  countryId: string;
  direction: ImagingTargetDirection;
  id: string;
  isDemo: boolean;
  kpiId: ImagingTargetableKpiId;
  label: string;
  period: string;
  status: ImagingTargetLifecycleStatus;
  targetMaxValue?: number;
  targetMinValue?: number;
  targetValue: number;
  unit: "currency" | "count" | "ratio";
  version: number;
};

export type ImagingTargetComparison = {
  actualValue: number | null;
  complianceRate: number | null;
  direction: ImagingTargetDirection;
  kpiId: ImagingTargetableKpiId;
  label: string;
  status: ImagingTargetStatus;
  targetMaxValue?: number;
  targetMinValue?: number;
  targetValue: number | null;
  unit: "currency" | "count" | "ratio";
  variation: number | null;
};

export type ImagingInsight = {
  branchName: string;
  comparison: string;
  evidence: string;
  id: string;
  impact: string;
  kpiId: ImagingKpiId;
  period: string;
  priority: ImagingInsightPriority;
  recommendation: string;
  title: string;
  whatHappened: string;
};

export type ImagingAuditEvent = {
  action: ImagingClosureAction;
  actorEmail: string;
  actorId: string;
  at: string;
  closureId: string;
  details: string;
  period: string;
  branchId: string;
};

export type ImagingClosure = {
  auditEvents: ImagingAuditEvent[];
  createdAt: string;
  createdBy: string;
  dataQualityScore: number;
  duplicateOfClosureId: string | null;
  id: string;
  inputs: ImagingClosureInputs;
  isDemo: boolean;
  kpiResults: ImagingKpiResult[];
  period: string;
  publishedAt: string | null;
  publishedBy: string | null;
  replacedByClosureId: string | null;
  replacesClosureId: string | null;
  scope: ImagingClosureScope;
  sourceLineage: Record<keyof ImagingClosureInputs, ImagingFieldSource>;
  status: ImagingClosureStatus;
  submittedBy: string;
  targetComparisons: ImagingTargetComparison[];
  updatedAt: string;
  validatedAt: string | null;
  validation: {
    errors: ImagingValidationIssue[];
    state: ImagingValidationState;
    warnings: ImagingValidationIssue[];
  };
  version: number;
};

export type ImagingBranchSummary = {
  areaName: string;
  areaManagerName: string;
  branchId: string;
  branchName: string;
  clients: number;
  contributionMargin: number;
  dataQualityScore: number;
  equipmentUtilization: number | null;
  managerName: string;
  marginRate: number | null;
  orders: number;
  pendingReports: number | null;
  period: string;
  productivity: number | null;
  revenue: number;
  revenueCompliance: number | null;
  revenueTarget: number | null;
  studies: number | null;
  closureId: string;
  status: ImagingValidationState;
};

export type ImagingWorkspace = {
  actorRole: AuthorizationActor["roleKey"];
  auditEvents: ImagingAuditEvent[];
  branches: ImagingClosureScope[];
  branchSummaries: ImagingBranchSummary[];
  canCreateClosure: boolean;
  canManageTargets: boolean;
  canPublishClosure: boolean;
  closures: ImagingClosure[];
  currentPeriod: string;
  currentPeriodStatus: "sin_cierre" | "borrador" | "validado" | "publicado";
  draftClosure: ImagingClosure | null;
  insights: ImagingInsight[];
  latestPublishedClosure: ImagingClosure | null;
  pendingClosureCount: number;
  publishedClosures: ImagingClosure[];
  reportingPeriod: string;
  summary: ImagingRollupSummary;
  targetComparisons: ImagingTargetComparison[];
  targets: ImagingTarget[];
};

export type ImagingRollupSummary = {
  branchCount: number;
  clients: number;
  closuresPublished: number;
  contributionMargin: number;
  dataQualityScore: number;
  equipmentUtilization: number | null;
  marginRate: number | null;
  orders: number;
  pendingReports: number | null;
  productivity: number | null;
  revenue: number;
  revenueCompliance: number | null;
  revenueTarget: number | null;
  studies: number | null;
};

export type ImagingDraftPayload = {
  branchId?: unknown;
  closureObservations?: unknown;
  id?: unknown;
  inputs?: unknown;
  period?: unknown;
  replacesClosureId?: unknown;
};

export type ImagingTargetPayload = {
  branchId?: unknown;
  direction?: unknown;
  kpiId?: unknown;
  period?: unknown;
  status?: unknown;
  targetMaxValue?: unknown;
  targetMinValue?: unknown;
  targetValue?: unknown;
};

export type ImagingKpiId =
  | "facturacion_neta"
  | "cumplimiento_facturacion"
  | "ordenes_total"
  | "clientes_total"
  | "estudios_realizados"
  | "estudios_por_paciente"
  | "tasa_finalizacion"
  | "tasa_cancelacion"
  | "tasa_no_show"
  | "ingreso_por_estudio"
  | "costo_por_estudio"
  | "margen_contribucion"
  | "porcentaje_margen"
  | "productividad"
  | "estudios_por_modalidad"
  | "mix_modalidades"
  | "informes_pendientes"
  | "utilizacion_equipo"
  | "utilizacion_modalidad"
  | "downtime_rate"
  | "tat_realizacion"
  | "tat_informe";

export type ImagingTargetableKpiId =
  | "facturacion_neta"
  | "estudios_realizados"
  | "margen_contribucion"
  | "utilizacion_equipo"
  | "informes_pendientes"
  | "tat_informe";

type ImagingStore = {
  auditEvents: ImagingAuditEvent[];
  closures: Map<string, ImagingClosure>;
  targets: Map<string, ImagingTarget>;
};

declare global {
  var analizaImagingStore: ImagingStore | undefined;
}

const imagingCompany =
  demoCompanies.find((company) => company.unitType === "imagenes") ??
  demoCompanies[0];
const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const currentDemoPeriod = "2026-08";

const kpiMeta: Record<
  ImagingKpiId,
  {
    label: string;
    formula: string;
    reading: string;
    unit: ImagingKpiResult["unit"];
    requiredFields: string[];
  }
> = {
  clientes_total: {
    formula: "clientes atendidos",
    label: "Clientes",
    reading: "Cuenta clientes atendidos en el periodo. Sirve para leer volumen sin exponer datos personales.",
    requiredFields: ["clientsTotal"],
    unit: "count",
  },
  costo_por_estudio: {
    formula: "costo de ventas / estudios realizados",
    label: "Costo por estudio",
    reading: "Indica cuanto costo directo se consume por cada estudio realizado.",
    requiredFields: ["costOfSales", "modalidad_estudios"],
    unit: "currency",
  },
  cumplimiento_facturacion: {
    formula: "facturacion neta / meta de facturacion",
    label: "Cumplimiento de facturacion",
    reading: "Muestra el avance de la facturacion neta contra la meta aprobada del periodo.",
    requiredFields: ["revenueTotal", "target_revenue"],
    unit: "ratio",
  },
  facturacion_neta: {
    formula: "facturacion neta",
    label: "Facturacion neta",
    reading: "Venta neta validada del cierre. Es la base para cumplimiento, margen e ingreso por estudio.",
    requiredFields: ["revenueTotal"],
    unit: "currency",
  },
  ingreso_por_estudio: {
    formula: "facturacion neta / estudios realizados",
    label: "Ingreso por estudio",
    reading: "Promedio facturado por cada estudio realizado. Ayuda a leer precio y mix de modalidades.",
    requiredFields: ["revenueTotal", "modalidad_estudios"],
    unit: "currency",
  },
  informes_pendientes: {
    formula: "informes pendientes",
    label: "Informes pendientes",
    reading: "Cantidad de informes aun pendientes. Mientras menor, menor riesgo de atraso en entrega y facturacion.",
    requiredFields: ["pendingReports"],
    unit: "count",
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
    reading: "Cantidad de ordenes registradas en el cierre.",
    requiredFields: ["ordersTotal"],
    unit: "count",
  },
  estudios_por_modalidad: {
    formula: "suma de estudios por modalidad",
    label: "Estudios por modalidad",
    reading: "Volumen de estudios agrupado por modalidad. Permite identificar donde se concentra la demanda.",
    requiredFields: ["modalidad_estudios"],
    unit: "count",
  },
  estudios_por_paciente: {
    formula: "estudios realizados / clientes",
    label: "Estudios por paciente",
    reading: "Promedio de estudios por cliente atendido.",
    requiredFields: ["modalidad_estudios", "clientsTotal"],
    unit: "count",
  },
  estudios_realizados: {
    formula: "suma de estudios por modalidad",
    label: "Estudios realizados",
    reading: "Volumen total de estudios realizados en el periodo.",
    requiredFields: ["modalidad_estudios"],
    unit: "count",
  },
  mix_modalidades: {
    formula: "modalidad principal / total de estudios",
    label: "Mix de modalidad principal",
    reading: "Porcentaje que representa la modalidad de mayor volumen sobre el total de estudios.",
    requiredFields: ["modalidad_estudios"],
    unit: "ratio",
  },
  porcentaje_margen: {
    formula: "(facturacion neta - costo de ventas) / facturacion neta",
    label: "Margen de contribucion bruto %",
    reading: "Porcentaje de facturacion neta que queda despues del costo de ventas. No es margen neto porque no descuenta gastos administrativos, financieros ni impuestos.",
    requiredFields: ["revenueTotal", "costOfSales"],
    unit: "ratio",
  },
  productividad: {
    formula: "estudios realizados / personal operativo",
    label: "Productividad por personal",
    reading: "Promedio de estudios realizados por persona operativa capturada en el cierre.",
    requiredFields: ["modalidad_estudios", "staffTotal"],
    unit: "count",
  },
  tasa_cancelacion: {
    formula: "estudios cancelados / estudios agendados",
    label: "Tasa de cancelacion",
    reading: "Porcentaje de estudios cancelados sobre la agenda del periodo.",
    requiredFields: ["cancelledStudies", "scheduledStudies"],
    unit: "ratio",
  },
  tasa_finalizacion: {
    formula: "estudios realizados / estudios agendados",
    label: "Tasa de finalizacion",
    reading: "Porcentaje de estudios agendados que fueron realizados.",
    requiredFields: ["modalidad_estudios", "scheduledStudies"],
    unit: "ratio",
  },
  tasa_no_show: {
    formula: "no-show / estudios agendados",
    label: "Tasa de no-show",
    reading: "Porcentaje de estudios agendados en los que el paciente no asistio.",
    requiredFields: ["noShowStudies", "scheduledStudies"],
    unit: "ratio",
  },
  downtime_rate: {
    formula: "horas de equipo detenido / horas disponibles de equipo",
    label: "Downtime de equipos",
    reading: "Porcentaje de tiempo disponible que el equipo estuvo detenido.",
    requiredFields: ["equipmentDowntimeHours", "equipmentAvailableHours"],
    unit: "ratio",
  },
  tat_informe: {
    formula: "tiempo promedio de informe",
    label: "TAT informe",
    reading: "Tiempo promedio en horas para completar informes.",
    requiredFields: ["averageReportTatHours"],
    unit: "count",
  },
  tat_realizacion: {
    formula: "tiempo promedio de orden a realizacion",
    label: "TAT orden a realizacion",
    reading: "Tiempo promedio en horas desde la orden hasta la realizacion del estudio.",
    requiredFields: ["averageOrderToStudyHours"],
    unit: "count",
  },
  utilizacion_equipo: {
    formula: "horas utilizadas de equipo / horas disponibles de equipo",
    label: "Utilizacion de equipo",
    reading: "Porcentaje de horas disponibles de equipo que fueron utilizadas.",
    requiredFields: ["equipmentUsedHours", "equipmentAvailableHours"],
    unit: "ratio",
  },
  utilizacion_modalidad: {
    formula: "horas utilizadas por modalidad / horas disponibles por modalidad",
    label: "Utilizacion por modalidad",
    reading: "Porcentaje de capacidad utilizada por modalidad. Queda no calculable hasta capturar horas por modalidad.",
    requiredFields: ["modalityCapacityHours"],
    unit: "ratio",
  },
};

const targetableKpis: Record<
  ImagingTargetableKpiId,
  {
    direction: ImagingTargetDirection;
    label: string;
    unit: ImagingTarget["unit"];
  }
> = {
  facturacion_neta: {
    direction: "HIGHER_IS_BETTER",
    label: "Facturacion",
    unit: "currency",
  },
  estudios_realizados: {
    direction: "HIGHER_IS_BETTER",
    label: "Estudios realizados",
    unit: "count",
  },
  informes_pendientes: {
    direction: "LOWER_IS_BETTER",
    label: "Informes pendientes maximos",
    unit: "count",
  },
  margen_contribucion: {
    direction: "HIGHER_IS_BETTER",
    label: "Margen de contribucion",
    unit: "currency",
  },
  tat_informe: {
    direction: "LOWER_IS_BETTER",
    label: "TAT informe maximo",
    unit: "count",
  },
  utilizacion_equipo: {
    direction: "HIGHER_IS_BETTER",
    label: "Utilizacion de equipo",
    unit: "ratio",
  },
};

const inputFieldNames: Array<keyof ImagingClosureInputs> = [
  "averageOrderToStudyHours",
  "averageReportTatHours",
  "caafRevenue",
  "caafStudies",
  "cancelledStudies",
  "clientsTotal",
  "closureObservations",
  "cleaningStaffCount",
  "costOfSales",
  "ctRevenue",
  "ctStudies",
  "customerServiceCount",
  "deliveryStaffCount",
  "doctorStaffCount",
  "dopplerRevenue",
  "dopplerStudies",
  "equipmentAvailableHours",
  "equipmentDowntimeHours",
  "equipmentUsedHours",
  "extraPlatesCount",
  "extraPlatesRevenue",
  "licensedStaffCount",
  "newClients",
  "noShowStudies",
  "ordersTotal",
  "pendingReports",
  "reportReadingCount",
  "referredOrders",
  "referredRevenue",
  "revenueTotal",
  "scheduledStudies",
  "telemedicinePatients",
  "telemedicineRevenue",
  "ultrasoundRevenue",
  "ultrasoundStudies",
  "xrayRevenue",
  "xrayStudies",
];

type ImagingNumericInputKey = Exclude<
  keyof ImagingClosureInputs,
  "closureObservations"
>;

const numericInputFieldNames: ImagingNumericInputKey[] = [
  "averageOrderToStudyHours",
  "averageReportTatHours",
  "caafRevenue",
  "caafStudies",
  "cancelledStudies",
  "clientsTotal",
  "cleaningStaffCount",
  "costOfSales",
  "ctRevenue",
  "ctStudies",
  "customerServiceCount",
  "deliveryStaffCount",
  "doctorStaffCount",
  "dopplerRevenue",
  "dopplerStudies",
  "equipmentAvailableHours",
  "equipmentDowntimeHours",
  "equipmentUsedHours",
  "extraPlatesCount",
  "extraPlatesRevenue",
  "licensedStaffCount",
  "newClients",
  "noShowStudies",
  "ordersTotal",
  "pendingReports",
  "reportReadingCount",
  "referredOrders",
  "referredRevenue",
  "revenueTotal",
  "scheduledStudies",
  "telemedicinePatients",
  "telemedicineRevenue",
  "ultrasoundRevenue",
  "ultrasoundStudies",
  "xrayRevenue",
  "xrayStudies",
];

const requiredNumericInputFieldNames: ImagingNumericInputKey[] = [
  "clientsTotal",
  "costOfSales",
  "ordersTotal",
  "revenueTotal",
];

const proposedNumericInputFieldNames: ImagingNumericInputKey[] = [
  "averageOrderToStudyHours",
  "averageReportTatHours",
  "cancelledStudies",
  "equipmentAvailableHours",
  "equipmentDowntimeHours",
  "equipmentUsedHours",
  "noShowStudies",
  "pendingReports",
  "scheduledStudies",
];

export function resetImagingClosureStoreForTests() {
  globalThis.analizaImagingStore = undefined;
}

export function getImagingBranches() {
  return demoBranches
    .filter((branch) => branch.companyId === imagingCompany.id)
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

function toClosureScope(branch: BranchOption): ImagingClosureScope {
  const area = getOperationalArea(branch);

  return {
    branchCode: branch.code,
    branchId: branch.id,
    branchName: branch.name,
    businessLine: "IMAGING",
    companyId: branch.companyId,
    companyName: imagingCompany.name,
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

export function getImagingBranchesForActor(actor: AuthorizationActor) {
  return getImagingBranches().filter((branch) =>
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
  id: ImagingKpiId,
  value: number | null,
  missingFields: string[] = [],
): ImagingKpiResult {
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
  kpis: ImagingKpiResult[],
  id: ImagingKpiId,
) {
  return kpis.find((kpi) => kpi.id === id)?.value ?? null;
}

function missingInputFields(
  inputs: ImagingClosureInputs,
  fields: ImagingNumericInputKey[],
) {
  return fields.filter((fieldName) => !Number.isFinite(inputs[fieldName]));
}

function missingOrInvalidDenominator(
  inputs: ImagingClosureInputs,
  fieldName: ImagingNumericInputKey,
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

function totalStaff(inputs: ImagingClosureInputs) {
  const staffFields: ImagingNumericInputKey[] = [
    "cleaningStaffCount",
    "customerServiceCount",
    "deliveryStaffCount",
    "doctorStaffCount",
    "licensedStaffCount",
  ];
  const capturedFields = staffFields.filter((fieldName) =>
    Number.isFinite(inputs[fieldName]),
  );

  if (capturedFields.length === 0) {
    return Number.NaN;
  }

  return capturedFields.reduce((sum, fieldName) => sum + inputs[fieldName], 0);
}

const modalityDefinitions = [
  {
    label: "Rayos X",
    revenueField: "xrayRevenue",
    studiesField: "xrayStudies",
  },
  {
    label: "TAC",
    revenueField: "ctRevenue",
    studiesField: "ctStudies",
  },
  {
    label: "Ultrasonografia",
    revenueField: "ultrasoundRevenue",
    studiesField: "ultrasoundStudies",
  },
  {
    label: "Doppler",
    revenueField: "dopplerRevenue",
    studiesField: "dopplerStudies",
  },
  {
    label: "CAAF",
    revenueField: "caafRevenue",
    studiesField: "caafStudies",
  },
  {
    label: "Placas extras",
    revenueField: "extraPlatesRevenue",
    studiesField: "extraPlatesCount",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  revenueField: ImagingNumericInputKey;
  studiesField: ImagingNumericInputKey;
}>;

function modalityRows(inputs: ImagingClosureInputs) {
  return modalityDefinitions.map((modality) => ({
    label: modality.label,
    revenue: inputs[modality.revenueField],
    studies: inputs[modality.studiesField],
  }));
}

function modalityStudyFields(inputs: ImagingClosureInputs) {
  return modalityDefinitions
    .filter((modality) => !Number.isFinite(inputs[modality.studiesField]))
    .map((modality) => modality.studiesField);
}

function totalPerformedStudies(inputs: ImagingClosureInputs) {
  const values = modalityRows(inputs)
    .map((modality) => modality.studies)
    .filter(Number.isFinite);

  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0)
    : Number.NaN;
}

function topModalityShare(inputs: ImagingClosureInputs) {
  const rows = modalityRows(inputs).filter((modality) =>
    Number.isFinite(modality.studies),
  );
  const total = rows.reduce((sum, modality) => sum + modality.studies, 0);

  if (total <= 0) {
    return null;
  }

  return Math.max(...rows.map((modality) => modality.studies)) / total;
}

function sourceLineage(): ImagingClosure["sourceLineage"] {
  return inputFieldNames.reduce<ImagingClosure["sourceLineage"]>(
    (lineage, fieldName) => {
      lineage[fieldName] = proposedNumericInputFieldNames.includes(
        fieldName as ImagingNumericInputKey,
      )
        ? "proposed"
        : "manual";
      return lineage;
    },
    {} as ImagingClosure["sourceLineage"],
  );
}

function createAuditEvent({
  action,
  actor,
  closure,
  details,
}: {
  action: ImagingClosureAction;
  actor: AuthorizationActor;
  closure: Pick<ImagingClosure, "id" | "period" | "scope">;
  details: string;
}): ImagingAuditEvent {
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
  targets: ImagingTarget[],
  closure: ImagingClosure,
  kpiId: ImagingTargetableKpiId,
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
  inputs: ImagingClosureInputs,
  targets: ImagingTarget[],
  closureShell: Pick<ImagingClosure, "period" | "scope">,
) {
  const targetShell = {
    ...closureShell,
    id: "kpi-shell",
    inputs,
  } as ImagingClosure;
  const revenueTarget = getClosureTarget(
    targets,
    targetShell,
    "facturacion_neta",
  )?.targetValue;
  const studiesPerformed = totalPerformedStudies(inputs);
  const marginContribution = inputs.revenueTotal - inputs.costOfSales;
  const staffTotal = totalStaff(inputs);
  const topModalityMix = topModalityShare(inputs);
  const revenueAttainment =
    typeof revenueTarget === "number"
      ? ratio(inputs.revenueTotal, revenueTarget)
      : null;
  const revenueFields = missingInputFields(inputs, ["revenueTotal"]);
  const modalityFields = modalityStudyFields(inputs);
  const modalityTotalFields =
    modalityFields.length === modalityDefinitions.length
      ? ["modalidad_estudios"]
      : [];
  const clientDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "clientsTotal",
  );
  const studyDenominatorFields =
    Number.isFinite(studiesPerformed) && studiesPerformed > 0
      ? []
      : ["modalidad_estudios"];
  const scheduledDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "scheduledStudies",
  );
  const staffFields = Number.isFinite(staffTotal) && staffTotal > 0
    ? []
    : ["staffTotal"];
  const studiesPerPatientFields = uniqueFields([
    ...modalityTotalFields,
    ...clientDenominatorFields,
  ]);
  const revenuePerStudyFields = uniqueFields([
    ...revenueFields,
    ...studyDenominatorFields,
  ]);
  const costPerStudyFields = uniqueFields([
    ...missingInputFields(inputs, ["costOfSales"]),
    ...studyDenominatorFields,
  ]);
  const productivityFields = uniqueFields([
    ...modalityTotalFields,
    ...staffFields,
  ]);
  const utilizationFields = uniqueFields([
    ...missingInputFields(inputs, ["equipmentUsedHours"]),
    ...missingOrInvalidDenominator(inputs, "equipmentAvailableHours"),
  ]);
  const downtimeFields = uniqueFields([
    ...missingInputFields(inputs, ["equipmentDowntimeHours"]),
    ...missingOrInvalidDenominator(inputs, "equipmentAvailableHours"),
  ]);
  const marginFields = missingInputFields(inputs, ["revenueTotal", "costOfSales"]);
  const marginRateFields = uniqueFields([
    ...missingInputFields(inputs, ["costOfSales"]),
    ...missingOrInvalidDenominator(inputs, "revenueTotal"),
  ]);
  const finalizationFields = uniqueFields([
    ...modalityTotalFields,
    ...scheduledDenominatorFields,
  ]);
  const cancellationFields = uniqueFields([
    ...missingInputFields(inputs, ["cancelledStudies"]),
    ...scheduledDenominatorFields,
  ]);
  const noShowFields = uniqueFields([
    ...missingInputFields(inputs, ["noShowStudies"]),
    ...scheduledDenominatorFields,
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
    kpiResult(
      "estudios_realizados",
      Number.isFinite(studiesPerformed) ? studiesPerformed : null,
      modalityTotalFields,
    ),
    kpiResult(
      "estudios_por_paciente",
      ratio(studiesPerformed, inputs.clientsTotal),
      studiesPerPatientFields,
    ),
    kpiResult(
      "tasa_finalizacion",
      ratio(studiesPerformed, inputs.scheduledStudies),
      finalizationFields,
    ),
    kpiResult(
      "tasa_cancelacion",
      ratio(inputs.cancelledStudies, inputs.scheduledStudies),
      cancellationFields,
    ),
    kpiResult(
      "tasa_no_show",
      ratio(inputs.noShowStudies, inputs.scheduledStudies),
      noShowFields,
    ),
    kpiResult(
      "ingreso_por_estudio",
      ratio(inputs.revenueTotal, studiesPerformed),
      revenuePerStudyFields,
    ),
    kpiResult(
      "costo_por_estudio",
      ratio(inputs.costOfSales, studiesPerformed),
      costPerStudyFields,
    ),
    kpiResult("margen_contribucion", marginContribution, marginFields),
    kpiResult(
      "porcentaje_margen",
      ratio(marginContribution, inputs.revenueTotal),
      marginRateFields,
    ),
    kpiResult(
      "productividad",
      ratio(studiesPerformed, staffTotal),
      productivityFields,
    ),
    kpiResult(
      "estudios_por_modalidad",
      Number.isFinite(studiesPerformed) ? studiesPerformed : null,
      modalityTotalFields,
    ),
    kpiResult(
      "mix_modalidades",
      topModalityMix,
      modalityTotalFields,
    ),
    kpiResult(
      "informes_pendientes",
      inputs.pendingReports,
      missingInputFields(inputs, ["pendingReports"]),
    ),
    kpiResult(
      "utilizacion_equipo",
      ratio(inputs.equipmentUsedHours, inputs.equipmentAvailableHours),
      utilizationFields,
    ),
    kpiResult(
      "utilizacion_modalidad",
      null,
      ["modalityCapacityHours"],
    ),
    kpiResult(
      "downtime_rate",
      ratio(inputs.equipmentDowntimeHours, inputs.equipmentAvailableHours),
      downtimeFields,
    ),
    kpiResult(
      "tat_realizacion",
      inputs.averageOrderToStudyHours,
      missingInputFields(inputs, ["averageOrderToStudyHours"]),
    ),
    kpiResult(
      "tat_informe",
      inputs.averageReportTatHours,
      missingInputFields(inputs, ["averageReportTatHours"]),
    ),
  ];
}

function getTargetStatus({
  actual,
  target,
}: {
  actual: number | null;
  target: ImagingTarget;
}): ImagingTargetStatus {
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
  target: ImagingTarget;
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
  kpis: ImagingKpiResult[],
  closure: ImagingClosure,
  targets: ImagingTarget[],
): ImagingTargetComparison[] {
  return Object.entries(targetableKpis).map(([rawKpiId, definition]) => {
    const kpiId = rawKpiId as ImagingTargetableKpiId;
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
  store: ImagingStore,
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
  store: ImagingStore,
  closure: ImagingClosure,
): ImagingClosure["validation"] {
  const errors: ImagingValidationIssue[] = [];
  const warnings: ImagingValidationIssue[] = [];
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
        message: "Falta un dato fuente obligatorio de Imagenes.",
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

  const studiesPerformed = totalPerformedStudies(inputs);
  const capturedModalityStudies = modalityDefinitions.filter((modality) =>
    Number.isFinite(inputs[modality.studiesField]),
  );
  const modalityRevenue = modalityDefinitions
    .map((modality) => inputs[modality.revenueField])
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);

  if (capturedModalityStudies.length === 0) {
    errors.push({
      code: "modalities.required",
      field: "xrayStudies",
      message:
        "Debe capturarse al menos una modalidad real para calcular estudios de Imagenes.",
      severity: "error",
    });
  }

  if (
    modalityRevenue > 0 &&
    Number.isFinite(inputs.revenueTotal) &&
    Math.abs(modalityRevenue - inputs.revenueTotal) >
      Math.max(5, inputs.revenueTotal * 0.03)
  ) {
    warnings.push({
      code: "revenue.modality_breakdown_mismatch",
      field: "revenueTotal",
      message:
        "La suma de venta por modalidad no coincide con la facturacion total dentro de tolerancia.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(studiesPerformed) &&
    Number.isFinite(inputs.scheduledStudies) &&
    studiesPerformed > inputs.scheduledStudies
  ) {
    errors.push({
      code: "studies.performed_exceeds_scheduled",
      field: "scheduledStudies",
      message:
        "Los estudios realizados no pueden superar los estudios agendados capturados.",
      severity: "error",
    });
  }

  if (
    Number.isFinite(inputs.cancelledStudies) &&
    Number.isFinite(inputs.noShowStudies) &&
    Number.isFinite(inputs.scheduledStudies) &&
    inputs.cancelledStudies + inputs.noShowStudies > inputs.scheduledStudies
  ) {
    warnings.push({
      code: "studies.cancelled_no_show_exceeds_schedule",
      field: "scheduledStudies",
      message:
        "Cancelados y no-show superan los estudios agendados; revise si ambos campos tienen el mismo alcance.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.equipmentUsedHours) &&
    Number.isFinite(inputs.equipmentAvailableHours) &&
    inputs.equipmentUsedHours > inputs.equipmentAvailableHours
  ) {
    errors.push({
      code: "capacity.used_exceeds_available",
      field: "equipmentUsedHours",
      message:
        "Las horas utilizadas de equipo no pueden superar las horas disponibles.",
      severity: "error",
    });
  }

  if (
    Number.isFinite(inputs.equipmentDowntimeHours) &&
    Number.isFinite(inputs.equipmentAvailableHours) &&
    inputs.equipmentDowntimeHours > inputs.equipmentAvailableHours
  ) {
    errors.push({
      code: "capacity.downtime_exceeds_available",
      field: "equipmentDowntimeHours",
      message:
        "Las horas fuera de servicio no pueden superar las horas disponibles.",
      severity: "error",
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

  if (
    Number.isFinite(inputs.reportReadingCount) &&
    Number.isFinite(studiesPerformed) &&
    inputs.reportReadingCount > studiesPerformed * 1.05
  ) {
    warnings.push({
      code: "reports.readings_exceed_studies",
      field: "reportReadingCount",
      message:
        "Las lecturas firmadas superan los estudios realizados. Confirme si incluyen rezagos de otros periodos.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.scheduledStudies)) {
    warnings.push({
      code: "proposed.scheduled_studies_missing",
      field: "scheduledStudies",
      message:
        "Estudios agendados no tiene fuente confirmada; finalizacion, cancelacion y no-show quedan no calculables.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.equipmentAvailableHours)) {
    warnings.push({
      code: "proposed.equipment_capacity_missing",
      field: "equipmentAvailableHours",
      message:
        "Capacidad de equipo queda no calculable hasta aprobar horas disponibles y utilizadas.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.pendingReports)) {
    warnings.push({
      code: "proposed.pending_reports_missing",
      field: "pendingReports",
      message:
        "Informes pendientes queda no calculable hasta confirmar fuente PACS/RIS o captura.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.averageReportTatHours)) {
    warnings.push({
      code: "proposed.report_tat_missing",
      field: "averageReportTatHours",
      message:
        "TAT de informe queda no calculable hasta aprobar fuente de tiempos.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.cancelledStudies)) {
    warnings.push({
      code: "proposed.cancelled_studies_missing",
      field: "cancelledStudies",
      message:
        "Cancelaciones queda no calculable hasta aprobar fuente de agenda.",
      severity: "warning",
    });
  }

  if (!Number.isFinite(inputs.noShowStudies)) {
    warnings.push({
      code: "proposed.no_show_missing",
      field: "noShowStudies",
      message:
        "No-show queda no calculable hasta aprobar fuente de agenda.",
      severity: "warning",
    });
  }

  if (
    warnings.some((warning) =>
      [
        "revenue.modality_breakdown_mismatch",
        "studies.cancelled_no_show_exceeds_schedule",
        "margin.negative",
        "reports.readings_exceed_studies",
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

function calculateQualityScore(validation: ImagingClosure["validation"]) {
  return Math.max(
    0,
    Math.min(100, 100 - validation.errors.length * 20 - validation.warnings.length * 7),
  );
}

function withCalculatedFields(
  store: ImagingStore,
  closure: ImagingClosure,
): ImagingClosure {
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

function defaultInputs(index = 0): ImagingClosureInputs {
  const revenueTotal = 84000 + index * 5200;
  const ordersTotal = 2480 + index * 90;
  const clientsTotal = 2140 + index * 65;
  const xrayStudies = 1500 + index * 42;
  const ctStudies = 82 + index * 4;
  const ultrasoundStudies = 900 + index * 36;
  const dopplerStudies = 145 + index * 7;
  const caafStudies = 38 + index * 2;
  const extraPlatesCount = 190 + index * 8;
  const studies = xrayStudies + ctStudies + ultrasoundStudies + dopplerStudies + caafStudies + extraPlatesCount;
  const costOfSales = Math.round(revenueTotal * (0.46 + index * 0.01));
  const referredRevenue = Math.round(revenueTotal * 0.25);
  const xrayRevenue = Math.round(revenueTotal * 0.3);
  const ctRevenue = Math.round(revenueTotal * 0.27);
  const ultrasoundRevenue = Math.round(revenueTotal * 0.32);
  const dopplerRevenue = Math.round(revenueTotal * 0.05);
  const caafRevenue = Math.round(revenueTotal * 0.03);

  return {
    averageOrderToStudyHours: Number.NaN,
    averageReportTatHours: 28 + index,
    caafRevenue,
    caafStudies,
    cancelledStudies: Math.round(studies * 0.025),
    clientsTotal,
    closureObservations:
      "DEMO: cierre de entrenamiento Imagenes sin datos personales.",
    cleaningStaffCount: 1,
    costOfSales,
    ctRevenue,
    ctStudies,
    customerServiceCount: 4 + (index % 2),
    deliveryStaffCount: 2,
    doctorStaffCount: 6 + (index % 3),
    dopplerRevenue,
    dopplerStudies,
    equipmentAvailableHours: 520 + index * 24,
    equipmentDowntimeHours: 18 + index,
    equipmentUsedHours: 405 + index * 18,
    extraPlatesCount,
    extraPlatesRevenue:
      revenueTotal - xrayRevenue - ctRevenue - ultrasoundRevenue - dopplerRevenue - caafRevenue,
    licensedStaffCount: 5 + (index % 2),
    newClients: Math.round(clientsTotal * 0.18),
    noShowStudies: Math.round(studies * 0.018),
    ordersTotal,
    pendingReports: 34 + index * 3,
    reportReadingCount: studies - (34 + index * 3),
    referredOrders: Math.round(ordersTotal * 0.24),
    referredRevenue,
    revenueTotal,
    scheduledStudies: Math.round(studies * 1.06),
    telemedicinePatients: Math.round(clientsTotal * 0.42),
    telemedicineRevenue: Math.round(revenueTotal * 0.35),
    ultrasoundRevenue,
    ultrasoundStudies,
    xrayRevenue,
    xrayStudies,
  };
}

function createTargetId(
  period: string,
  branchId: string,
  kpiId: ImagingTargetableKpiId,
  version: number,
) {
  return "img-target-" + sanitizeIdPart(branchId) + "-" + period + "-" + kpiId + "-v" + version;
}

function createSeedTargets(
  branch: BranchOption,
  period: string,
  inputs: ImagingClosureInputs,
  index: number,
) {
  const baseTargets: Array<{
    kpiId: ImagingTargetableKpiId;
    targetValue: number;
  }> = [
    {
      kpiId: "facturacion_neta",
      targetValue: Math.round(inputs.revenueTotal * (index % 2 === 0 ? 1.03 : 0.97)),
    },
    {
      kpiId: "estudios_realizados",
      targetValue: Math.round(totalPerformedStudies(inputs) * 1.04),
    },
    {
      kpiId: "margen_contribucion",
      targetValue: Math.round((inputs.revenueTotal - inputs.costOfSales) * 1.02),
    },
    {
      kpiId: "utilizacion_equipo",
      targetValue: 0.78,
    },
    {
      kpiId: "informes_pendientes",
      targetValue: 30,
    },
    {
      kpiId: "tat_informe",
      targetValue: 24,
    },
  ];

  return baseTargets.map(({ kpiId, targetValue }) => {
    const definition = targetableKpis[kpiId];

    return {
      approvedAt: period + "-01T06:00:00.000Z",
      approvedBy: "DEMO operaciones imagenes",
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
    } satisfies ImagingTarget;
  });
}

function createSeedClosure(
  branch: BranchOption,
  period: string,
  inputs: ImagingClosureInputs,
  index: number,
): ImagingClosure {
  const createdAt = period + "-28T08:0" + (index % 9) + ":00.000Z";
  const baseClosure: ImagingClosure = {
    auditEvents: [],
    createdAt,
    createdBy: "demo-seed",
    dataQualityScore: 100,
    duplicateOfClosureId: null,
    id: "img-closure-" + sanitizeIdPart(branch.id) + "-" + period + "-v1",
    inputs,
    isDemo: true,
    kpiResults: [],
    period,
    publishedAt: period + "-28T09:0" + (index % 9) + ":00.000Z",
    publishedBy: "DEMO operaciones imagenes",
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

function seedStore(store: ImagingStore) {
  const branches = getImagingBranches().filter(
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
        revenueTotal: Math.round(inputs.revenueTotal * 1.05),
        ultrasoundStudies: Math.round(inputs.ultrasoundStudies * 1.03),
        xrayStudies: Math.round(inputs.xrayStudies * 1.02),
      },
      index,
    )) {
      store.targets.set(target.id, target);
    }

    const closure = withCalculatedFields(
      store,
      createSeedClosure(branch, seedPeriod, inputs, index),
    );
    const auditEvent: ImagingAuditEvent = {
      action: "published",
      actorEmail: "demo-imagenes@analiza.local",
      actorId: "demo-seed",
      at: closure.publishedAt ?? closure.updatedAt,
      branchId: branch.id,
      closureId: closure.id,
      details: "Seed DEMO publicado desde el catalogo gestionado de Imagenes.",
      period: closure.period,
    };

    closure.auditEvents.push(auditEvent);
    store.auditEvents.push(auditEvent);
    store.closures.set(closure.id, closure);
  });
}

function getStore() {
  if (!globalThis.analizaImagingStore) {
    const store: ImagingStore = {
      auditEvents: [],
      closures: new Map(),
      targets: new Map(),
    };

    seedStore(store);
    globalThis.analizaImagingStore = store;
  }

  return globalThis.analizaImagingStore;
}

function getBranchForPayload(actor: AuthorizationActor, branchId: string) {
  const branch = getImagingBranches().find(
    (candidate) => candidate.id === branchId,
  );

  if (!branch) {
    throw new Error("Sucursal de Imagenes no encontrada.");
  }

  if (!canActorReadBranch(actor, branch)) {
    throw new Error("El usuario no tiene alcance sobre esta sucursal.");
  }

  return branch;
}

function parseInputs(payload: ImagingDraftPayload) {
  const inputRecord =
    typeof payload.inputs === "object" &&
    payload.inputs !== null &&
    !Array.isArray(payload.inputs)
      ? (payload.inputs as Record<string, unknown>)
      : {};

  return {
    averageOrderToStudyHours: readNumber(inputRecord.averageOrderToStudyHours),
    averageReportTatHours: readNumber(inputRecord.averageReportTatHours),
    caafRevenue: readNumber(inputRecord.caafRevenue),
    caafStudies: readNumber(inputRecord.caafStudies),
    cancelledStudies: readNumber(inputRecord.cancelledStudies),
    clientsTotal: readNumber(inputRecord.clientsTotal),
    closureObservations: readString(
      inputRecord.closureObservations ?? payload.closureObservations,
    ).slice(0, 1200),
    cleaningStaffCount: readNumber(inputRecord.cleaningStaffCount),
    costOfSales: readNumber(inputRecord.costOfSales),
    ctRevenue: readNumber(inputRecord.ctRevenue),
    ctStudies: readNumber(inputRecord.ctStudies),
    customerServiceCount: readNumber(inputRecord.customerServiceCount),
    deliveryStaffCount: readNumber(inputRecord.deliveryStaffCount),
    doctorStaffCount: readNumber(inputRecord.doctorStaffCount),
    dopplerRevenue: readNumber(inputRecord.dopplerRevenue),
    dopplerStudies: readNumber(inputRecord.dopplerStudies),
    equipmentAvailableHours: readNumber(inputRecord.equipmentAvailableHours),
    equipmentDowntimeHours: readNumber(inputRecord.equipmentDowntimeHours),
    equipmentUsedHours: readNumber(inputRecord.equipmentUsedHours),
    extraPlatesCount: readNumber(inputRecord.extraPlatesCount),
    extraPlatesRevenue: readNumber(inputRecord.extraPlatesRevenue),
    licensedStaffCount: readNumber(inputRecord.licensedStaffCount),
    newClients: readNumber(inputRecord.newClients),
    noShowStudies: readNumber(inputRecord.noShowStudies),
    ordersTotal: readNumber(inputRecord.ordersTotal),
    pendingReports: readNumber(inputRecord.pendingReports),
    reportReadingCount: readNumber(inputRecord.reportReadingCount),
    referredOrders: readNumber(inputRecord.referredOrders),
    referredRevenue: readNumber(inputRecord.referredRevenue),
    revenueTotal: readNumber(inputRecord.revenueTotal),
    scheduledStudies: readNumber(inputRecord.scheduledStudies),
    telemedicinePatients: readNumber(inputRecord.telemedicinePatients),
    telemedicineRevenue: readNumber(inputRecord.telemedicineRevenue),
    ultrasoundRevenue: readNumber(inputRecord.ultrasoundRevenue),
    ultrasoundStudies: readNumber(inputRecord.ultrasoundStudies),
    xrayRevenue: readNumber(inputRecord.xrayRevenue),
    xrayStudies: readNumber(inputRecord.xrayStudies),
  } satisfies ImagingClosureInputs;
}

function getNextVersion(
  store: ImagingStore,
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
  store: ImagingStore,
  closure: ImagingClosure,
  event: ImagingAuditEvent,
) {
  closure.auditEvents = [event, ...closure.auditEvents];
  store.auditEvents = [event, ...store.auditEvents];
}

function saveDemoImagingClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  assertWritableRole(actor);

  const store = getStore();
  const payload = (typeof rawPayload === "object" && rawPayload !== null
    ? rawPayload
    : {}) as ImagingDraftPayload;
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
    `img-closure-${sanitizeIdPart(branch.id)}-${period}-v${version}`;
  const baseClosure: ImagingClosure = {
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
      ? "Borrador actualizado desde formulario Imagenes."
      : "Borrador creado desde formulario Imagenes.",
  });

  appendAudit(store, closure, event);
  store.closures.set(closure.id, closure);

  return closure;
}

function validateDemoImagingClosureDraft(
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
  const validated: ImagingClosure = {
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

function publishDemoImagingClosure(
  actor: AuthorizationActor,
  closureId: string,
) {
  assertWritableRole(actor);

  const store = getStore();
  const closure = validateDemoImagingClosureDraft(actor, closureId);

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
  const published: ImagingClosure = withCalculatedFields(store, {
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
      const replacedClosure: ImagingClosure = {
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
  fallback: ImagingTargetDirection,
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

function readTargetKpiId(value: unknown): ImagingTargetableKpiId {
  if (
    value === "facturacion_neta" ||
    value === "estudios_realizados" ||
    value === "margen_contribucion" ||
    value === "utilizacion_equipo" ||
    value === "informes_pendientes" ||
    value === "tat_informe"
  ) {
    return value;
  }

  throw new Error("KPI de meta no soportado para Imagenes MVP.");
}

function readTargetLifecycleStatus(
  value: unknown,
): ImagingTargetLifecycleStatus {
  return value === "inactive" ? "inactive" : "active";
}

function upsertDemoImagingTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (!canManageTargets(actor)) {
    throw new Error("Este rol no puede configurar metas.");
  }

  const store = getStore();
  const payload = (typeof rawPayload === "object" && rawPayload !== null
    ? rawPayload
    : {}) as ImagingTargetPayload;
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

  const target: ImagingTarget = {
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
    getImagingBranchesForActor(actor).map((branch) => branch.id),
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
    getImagingBranchesForActor(actor).map((branch) => branch.id),
  );

  return [...store.targets.values()].filter((target) =>
    allowedBranchIds.has(target.branchId),
  );
}

function finiteValues(values: number[]) {
  return values.filter((value) => Number.isFinite(value));
}

function aggregateKpiValue(
  closures: ImagingClosure[],
  kpiId: ImagingTargetableKpiId,
) {
  if (closures.length === 0) {
    return null;
  }

  if (kpiId === "facturacion_neta") {
    return closures.reduce((sum, closure) => sum + closure.inputs.revenueTotal, 0);
  }

  if (kpiId === "estudios_realizados") {
    const values = finiteValues(
      closures.map((closure) => totalPerformedStudies(closure.inputs)),
    );

    return values.length > 0
      ? values.reduce((sum, value) => sum + value, 0)
      : null;
  }

  if (kpiId === "margen_contribucion") {
    return closures.reduce(
      (sum, closure) =>
        sum + closure.inputs.revenueTotal - closure.inputs.costOfSales,
      0,
    );
  }

  if (kpiId === "utilizacion_equipo") {
    const totals = closures.reduce(
      (summary, closure) => ({
        available: Number.isFinite(closure.inputs.equipmentAvailableHours)
          ? summary.available + closure.inputs.equipmentAvailableHours
          : summary.available,
        used: Number.isFinite(closure.inputs.equipmentUsedHours)
          ? summary.used + closure.inputs.equipmentUsedHours
          : summary.used,
      }),
      { available: 0, used: 0 },
    );

    return ratio(totals.used, totals.available);
  }

  if (kpiId === "informes_pendientes") {
    const values = finiteValues(
      closures.map((closure) => closure.inputs.pendingReports),
    );

    return values.length > 0
      ? values.reduce((sum, value) => sum + value, 0)
      : null;
  }

  const values = finiteValues(
    closures.map((closure) => closure.inputs.averageReportTatHours),
  );

  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function aggregateProductivity(closures: ImagingClosure[]) {
  if (closures.length === 0) {
    return null;
  }

  const totals = closures.reduce(
    (summary, closure) => {
      const closureStaff = totalStaff(closure.inputs);
      const studies = totalPerformedStudies(closure.inputs);

      return {
        staff: Number.isFinite(closureStaff)
          ? summary.staff + closureStaff
          : summary.staff,
        studies: Number.isFinite(studies)
          ? summary.studies + studies
          : summary.studies,
      };
    },
    { staff: 0, studies: 0 },
  );

  return ratio(totals.studies, totals.staff);
}

function aggregateEquipmentUtilization(closures: ImagingClosure[]) {
  const totals = closures.reduce(
    (summary, closure) => ({
      available: Number.isFinite(closure.inputs.equipmentAvailableHours)
        ? summary.available + closure.inputs.equipmentAvailableHours
        : summary.available,
      used: Number.isFinite(closure.inputs.equipmentUsedHours)
        ? summary.used + closure.inputs.equipmentUsedHours
        : summary.used,
    }),
    { available: 0, used: 0 },
  );

  return ratio(totals.used, totals.available);
}

function aggregatePendingReports(closures: ImagingClosure[]) {
  const values = finiteValues(
    closures.map((closure) => closure.inputs.pendingReports),
  );

  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0)
    : null;
}

function aggregateStudies(closures: ImagingClosure[]) {
  const values = finiteValues(
    closures.map((closure) => totalPerformedStudies(closure.inputs)),
  );

  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0)
    : null;
}

function latestTargetsByBranchAndKpi(targets: ImagingTarget[]) {
  const latestTargets = new Map<string, ImagingTarget>();

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
  closures: ImagingClosure[],
  targets: ImagingTarget[],
  kpiId: ImagingTargetableKpiId,
) {
  const latestTargets = latestTargetsByBranchAndKpi(targets);
  const closureTargets = closures
    .map((closure) =>
      latestTargets.get(closure.period + ":" + closure.scope.branchId + ":" + kpiId),
    )
    .filter(
      (target): target is ImagingTarget => target?.status === "active",
    );

  if (closureTargets.length === 0) {
    return null;
  }

  if (kpiId === "utilizacion_equipo" || kpiId === "tat_informe") {
    return (
      closureTargets.reduce((sum, target) => sum + target.targetValue, 0) /
      closureTargets.length
    );
  }

  return closureTargets.reduce((sum, target) => sum + target.targetValue, 0);
}

function buildRollupComparisons(
  closures: ImagingClosure[],
  targets: ImagingTarget[],
) {
  return Object.entries(targetableKpis).map(([rawKpiId, definition]) => {
    const kpiId = rawKpiId as ImagingTargetableKpiId;
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
      } satisfies ImagingTargetComparison;
    }

    const target: ImagingTarget = {
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
    } satisfies ImagingTargetComparison;
  });
}

function buildRollupSummary(
  closures: ImagingClosure[],
  branchCount: number,
): ImagingRollupSummary {
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
  const contributionMargin = closures.reduce(
    (sum, closure) =>
      sum + closure.inputs.revenueTotal - closure.inputs.costOfSales,
    0,
  );
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
    equipmentUtilization: aggregateEquipmentUtilization(closures),
    marginRate: ratio(contributionMargin, revenue),
    orders,
    pendingReports: aggregatePendingReports(closures),
    productivity: aggregateProductivity(closures),
    revenue,
    revenueCompliance:
      revenueTarget > 0 ? ratio(revenue, revenueTarget) : null,
    revenueTarget: revenueTarget > 0 ? revenueTarget : null,
    studies: aggregateStudies(closures),
  };
}

function targetByKpi(
  comparisons: ImagingTargetComparison[],
  kpiId: ImagingTargetableKpiId,
) {
  return comparisons.find((comparison) => comparison.kpiId === kpiId) ?? null;
}

function formatComparisonValue(
  comparison: ImagingTargetComparison | null,
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
  closure: ImagingClosure,
  closures: ImagingClosure[],
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
  closure: ImagingClosure,
  allClosures: ImagingClosure[] = [],
): ImagingInsight[] {
  const insights: ImagingInsight[] = [];
  const previousClosure = previousPublishedClosure(closure, allClosures);
  const revenue = targetByKpi(closure.targetComparisons, "facturacion_neta");
  const production = targetByKpi(
    closure.targetComparisons,
    "estudios_realizados",
  );
  const margin = targetByKpi(closure.targetComparisons, "margen_contribucion");
  const equipment = targetByKpi(closure.targetComparisons, "utilizacion_equipo");
  const pendingReports = targetByKpi(
    closure.targetComparisons,
    "informes_pendientes",
  );
  const tat = targetByKpi(closure.targetComparisons, "tat_informe");
  const marginRate = getKpiValue(closure.kpiResults, "porcentaje_margen");
  const downtimeRate = getKpiValue(closure.kpiResults, "downtime_rate");
  const currentMargin = closure.inputs.revenueTotal - closure.inputs.costOfSales;
  const studiesPerformed = totalPerformedStudies(closure.inputs);
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
        "Factores a revisar: ordenes, estudios por modalidad, telemedicina y mezcla de servicios.",
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
        "Los estudios realizados se calculan desde las modalidades publicadas contra la meta aprobada.",
      id: closure.id + "-production",
      impact:
        production.variation === null
          ? "Brecha de produccion no cuantificable."
          : Math.abs(Math.round(production.variation)).toLocaleString("en-US") + " estudios de brecha contra meta.",
      kpiId: "estudios_realizados",
      period: closure.period,
      priority: production.status === "incumplido" ? "alta" : "media",
      recommendation:
        "Factores a revisar: agenda, derivaciones, modalidad principal y disponibilidad de equipo antes de concluir causa.",
      title: "Volumen de estudios debajo de meta",
      whatHappened: "Los estudios publicados quedaron debajo de la meta.",
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
        "Factores a revisar: costo de venta, consumibles y mezcla de modalidades.",
      title: "Margen debajo de meta",
      whatHappened: "La contribucion quedo por debajo del nivel esperado.",
    });
  }

  if (
    pendingReports?.status === "incumplido" ||
    pendingReports?.status === "en_riesgo"
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        formatComparisonValue(pendingReports) +
        " vs meta " +
        (pendingReports.targetValue === null
          ? "sin meta"
          : Math.round(pendingReports.targetValue).toLocaleString("en-US")),
      evidence:
        "Informes pendientes se muestra solo cuando existe fuente o captura aprobada para el cierre.",
      id: closure.id + "-pending-reports",
      impact: "Riesgo de retraso en entrega de resultados y seguimiento medico.",
      kpiId: "informes_pendientes",
      period: closure.period,
      priority: pendingReports.status === "incumplido" ? "alta" : "media",
      recommendation:
        "Factores a revisar: cola de lectura, firma de informes y disponibilidad de radiologos.",
      title: "Informes pendientes sobre meta",
      whatHappened: "Los informes pendientes superaron el maximo aprobado.",
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
      kpiId: "tat_informe",
      period: closure.period,
      priority: tat.status === "incumplido" ? "alta" : "media",
      recommendation:
        "Factores a revisar: lectura, firma, transcripcion y horarios de corte.",
      title: "TAT de informe sobre meta",
      whatHappened: "El TAT de informe quedo por encima del maximo aprobado.",
    });
  }

  if (
    equipment !== null &&
    (equipment.status === "incumplido" || equipment.status === "en_riesgo") &&
    production?.status === "cumplido"
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        formatComparisonValue(equipment) +
        " con " +
        (Number.isFinite(studiesPerformed)
          ? Math.round(studiesPerformed).toLocaleString("en-US") + " estudios"
          : "estudios sin total calculable"),
      evidence:
        "La utilizacion usa horas de equipo disponibles y utilizadas cuando ambos datos existen.",
      id: closure.id + "-demand-low-utilization",
      impact:
        "La sucursal cumple volumen, pero la capacidad declarada no se aprovecha segun la fuente disponible.",
      kpiId: "utilizacion_equipo",
      period: closure.period,
      priority: "media",
      recommendation:
        "Revisar agenda por modalidad y disponibilidad real antes de decidir ampliacion de equipo u horarios.",
      title: "Alta demanda con baja utilizacion declarada",
      whatHappened:
        "El volumen de estudios cumplio meta, pero la utilizacion de equipo quedo debajo del objetivo.",
    });
  }

  if (downtimeRate !== null && downtimeRate > 0.08) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: Math.round(downtimeRate * 100) + "% de downtime registrado.",
      evidence:
        "Downtime se calcula desde horas fuera de servicio sobre horas disponibles.",
      id: closure.id + "-downtime",
      impact:
        "Puede afectar disponibilidad de agenda y tiempos de atencion si se mantiene.",
      kpiId: "downtime_rate",
      period: closure.period,
      priority: downtimeRate > 0.12 ? "alta" : "media",
      recommendation:
        "Revisar mantenimiento, modalidad afectada y horarios con perdida de capacidad.",
      title: "Downtime de equipos elevado",
      whatHappened: "Las horas fuera de servicio superaron el umbral operativo.",
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
        "Factores a revisar: costos de venta, mix de modalidades y consumo de insumos antes de concluir causalidad.",
      title: "Facturacion crece pero margen cae",
      whatHappened:
        "La facturacion subio frente al periodo anterior, pero el margen de contribucion bajo.",
    });
  }

  if (
    revenue?.status === "cumplido" &&
    production?.status === "cumplido" &&
    margin?.status === "cumplido" &&
    (pendingReports === null || pendingReports.status === "cumplido") &&
    (tat === null || tat.status === "cumplido")
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison:
        "Facturacion, estudios, margen e informes disponibles cumplen simultaneamente.",
      evidence:
        "Los indicadores se calculan desde el mismo cierre publicado de Imagenes.",
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
  closures: ImagingClosure[],
): ImagingBranchSummary[] {
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
      equipmentUtilization: getKpiValue(
        closure.kpiResults,
        "utilizacion_equipo",
      ),
      managerName: closure.scope.managerName,
      marginRate: getKpiValue(closure.kpiResults, "porcentaje_margen"),
      orders: closure.inputs.ordersTotal,
      pendingReports: Number.isFinite(closure.inputs.pendingReports)
        ? closure.inputs.pendingReports
        : null,
      period: closure.period,
      productivity: getKpiValue(closure.kpiResults, "productividad"),
      revenue: closure.inputs.revenueTotal,
      revenueCompliance: revenueComparison?.complianceRate ?? null,
      revenueTarget: revenueComparison?.targetValue ?? null,
      studies: Number.isFinite(totalPerformedStudies(closure.inputs))
        ? totalPerformedStudies(closure.inputs)
        : null,
      status: closure.validation.state,
    };
  });
}

function getLatestPublishedPeriod(closures: ImagingClosure[]) {
  return (
    closures
      .filter((closure) => closure.status === "published")
      .sort((left, right) => right.period.localeCompare(left.period))[0]
      ?.period ?? currentDemoPeriod
  );
}

function currentPeriodStatus(
  closures: ImagingClosure[],
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
  direction: ImagingTargetDirection;
  id: string;
  is_demo: boolean;
  kpi_id: ImagingTargetableKpiId;
  label: string;
  period_month: Date | string;
  status: ImagingTargetLifecycleStatus;
  target_max_value: string | number | null;
  target_min_value: string | number | null;
  target_value: string | number;
  unit: ImagingTarget["unit"];
  version: number;
};

type DbClosureRow = {
  average_order_to_study_hours: string | number | null;
  average_report_tat_hours: string | number | null;
  branch_id: string;
  caaf_revenue: string | number | null;
  caaf_studies: string | number | null;
  cancelled_studies: string | number | null;
  clients_total: string | number | null;
  closure_observations: string | null;
  cleaning_staff_count: string | number | null;
  company_id: string;
  cost_of_sales: string | number | null;
  country_id: string;
  created_at: Date | string;
  ct_revenue: string | number | null;
  ct_studies: string | number | null;
  customer_service_count: string | number | null;
  data_quality_score: string | number;
  delivery_staff_count: string | number | null;
  doctor_staff_count: string | number | null;
  doppler_revenue: string | number | null;
  doppler_studies: string | number | null;
  equipment_available_hours: string | number | null;
  equipment_downtime_hours: string | number | null;
  equipment_used_hours: string | number | null;
  errors: unknown;
  extra_plates_count: string | number | null;
  extra_plates_revenue: string | number | null;
  id: string;
  is_demo: boolean;
  licensed_staff_count: string | number | null;
  monthly_closing_id: string;
  new_clients: string | number | null;
  no_show_studies: string | number | null;
  orders_total: string | number | null;
  pending_reports: string | number | null;
  period_month: Date | string;
  published_at: Date | string | null;
  published_by_email: string | null;
  report_reading_count: string | number | null;
  referred_orders: string | number | null;
  referred_revenue: string | number | null;
  revenue_total: string | number | null;
  scheduled_studies: string | number | null;
  source_lineage: unknown;
  status: DbMonthlyClosingStatus;
  submitted_by_email: string;
  superseded_by_version_id: string | null;
  supersedes_version_id: string | null;
  telemedicine_patients: string | number | null;
  telemedicine_revenue: string | number | null;
  ultrasound_revenue: string | number | null;
  ultrasound_studies: string | number | null;
  updated_at: Date | string;
  validated_at: Date | string | null;
  validation_state: ImagingValidationState | null;
  version_number: number;
  warnings: unknown;
  xray_revenue: string | number | null;
  xray_studies: string | number | null;
};

type DbAuditRow = {
  action: ImagingClosureAction;
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
  auditEvents: ImagingAuditEvent[];
  branches: ImagingClosureScope[];
  closures: ImagingClosure[];
  targets: ImagingTarget[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function shouldUsePostgresPersistence() {
  return !isDemoRuntimeEnvironment();
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
): ImagingClosureStatus {
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
  validation: ImagingClosure["validation"],
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

function readValidationIssues(value: unknown): ImagingValidationIssue[] {
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
            ? (record.field as ImagingValidationIssue["field"])
            : undefined,
        message,
        severity,
      },
    ];
  });
}

function dbSourceLineage(value: unknown) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as ImagingClosure["sourceLineage"];
  }

  return sourceLineage();
}

function branchRowToScope(row: DbBranchRow): ImagingClosureScope {
  return {
    areaManagerName:
      row.area_manager_name ??
      row.operational_area_name ??
      "Gerente de area pendiente",
    branchCode: row.code,
    branchId: row.id,
    branchName: row.name,
    businessLine: "IMAGING",
    companyId: row.company_id,
    companyName: row.company_name,
    countryId: row.country_id,
    countryName: row.country_name,
    managerName: row.branch_manager_name ?? "Gerente de sucursal pendiente",
    operationalAreaId: row.operational_area_id,
    organizationId: row.organization_id,
  };
}

function targetRowToTarget(row: DbTargetRow): ImagingTarget {
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
  scope: ImagingClosureScope,
): ImagingClosure {
  const validationState = row.validation_state ?? "BLOQUEADO";

  return {
    auditEvents: [],
    createdAt: isoString(row.created_at) ?? nowIso(),
    createdBy: row.submitted_by_email,
    dataQualityScore: dbNumber(row.data_quality_score),
    duplicateOfClosureId: null,
    id: row.id,
    inputs: {
      averageOrderToStudyHours: dbNumber(row.average_order_to_study_hours),
      averageReportTatHours: dbNumber(row.average_report_tat_hours),
      caafRevenue: dbNumber(row.caaf_revenue),
      caafStudies: dbNumber(row.caaf_studies),
      cancelledStudies: dbNumber(row.cancelled_studies),
      clientsTotal: dbNumber(row.clients_total),
      closureObservations: row.closure_observations ?? "",
      cleaningStaffCount: dbNumber(row.cleaning_staff_count),
      costOfSales: dbNumber(row.cost_of_sales),
      ctRevenue: dbNumber(row.ct_revenue),
      ctStudies: dbNumber(row.ct_studies),
      customerServiceCount: dbNumber(row.customer_service_count),
      deliveryStaffCount: dbNumber(row.delivery_staff_count),
      doctorStaffCount: dbNumber(row.doctor_staff_count),
      dopplerRevenue: dbNumber(row.doppler_revenue),
      dopplerStudies: dbNumber(row.doppler_studies),
      equipmentAvailableHours: dbNumber(row.equipment_available_hours),
      equipmentDowntimeHours: dbNumber(row.equipment_downtime_hours),
      equipmentUsedHours: dbNumber(row.equipment_used_hours),
      extraPlatesCount: dbNumber(row.extra_plates_count),
      extraPlatesRevenue: dbNumber(row.extra_plates_revenue),
      licensedStaffCount: dbNumber(row.licensed_staff_count),
      newClients: dbNumber(row.new_clients),
      noShowStudies: dbNumber(row.no_show_studies),
      ordersTotal: dbNumber(row.orders_total),
      pendingReports: dbNumber(row.pending_reports),
      reportReadingCount: dbNumber(row.report_reading_count),
      referredOrders: dbNumber(row.referred_orders),
      referredRevenue: dbNumber(row.referred_revenue),
      revenueTotal: dbNumber(row.revenue_total),
      scheduledStudies: dbNumber(row.scheduled_studies),
      telemedicinePatients: dbNumber(row.telemedicine_patients),
      telemedicineRevenue: dbNumber(row.telemedicine_revenue),
      ultrasoundRevenue: dbNumber(row.ultrasound_revenue),
      ultrasoundStudies: dbNumber(row.ultrasound_studies),
      xrayRevenue: dbNumber(row.xray_revenue),
      xrayStudies: dbNumber(row.xray_studies),
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
      where co.unit_type = 'imagenes'
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
      where business_line = 'IMAGING'
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
  branches: ImagingClosureScope[],
  targets: ImagingTarget[],
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
        lci.average_order_to_study_hours,
        lci.average_report_tat_hours,
        lci.caaf_revenue,
        lci.caaf_studies,
        lci.cancelled_studies,
        lci.cleaning_staff_count,
        lci.ct_revenue,
        lci.ct_studies,
        lci.delivery_staff_count,
        lci.doctor_staff_count,
        lci.doppler_revenue,
        lci.doppler_studies,
        lci.equipment_available_hours,
        lci.equipment_downtime_hours,
        lci.equipment_used_hours,
        lci.extra_plates_count,
        lci.extra_plates_revenue,
        lci.licensed_staff_count,
        lci.new_clients,
        lci.no_show_studies,
        lci.pending_reports,
        lci.report_reading_count,
        lci.revenue_total,
        lci.cost_of_sales,
        lci.orders_total,
        lci.clients_total,
        lci.referred_revenue,
        lci.referred_orders,
        lci.customer_service_count,
        lci.scheduled_studies,
        lci.telemedicine_patients,
        lci.telemedicine_revenue,
        lci.ultrasound_revenue,
        lci.ultrasound_studies,
        lci.xray_revenue,
        lci.xray_studies,
        lci.closure_observations,
        lci.source_lineage,
        cvr.validation_state,
        cvr.errors,
        cvr.warnings
      from public.closing_versions cv
      join public.monthly_closings mc on mc.id = cv.monthly_closing_id
      left join public.imaging_closing_inputs lci
        on lci.closing_version_id = cv.id
      left join public.closing_validation_results cvr
        on cvr.closing_version_id = cv.id
      where cv.business_line = 'IMAGING'
        and cv.branch_id = any($1::uuid[])
      order by cv.period_month desc, cv.version_number desc
    `,
    [branchIds],
  );
  const baseClosures = result.rows.flatMap((row) => {
    const scope = branchMap.get(row.branch_id);

    return scope ? [closureRowToClosure(row, scope)] : [];
  });
  const store: ImagingStore = {
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
      where business_line = 'IMAGING'
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
): ImagingWorkspace {
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
  closure: ImagingClosure,
  action: ImagingClosureAction,
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
  closure: ImagingClosure,
  allClosures: ImagingClosure[],
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
          'IMAGING',
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
    throw new Error("Sucursal de Imagenes no encontrada o fuera de alcance.");
  }

  await assertBranchReadyForOperationalData({
    actor,
    branchId,
    client,
    operationLabel: "cargar datos de Imagenes",
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

async function savePostgresImagingClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  assertWritableRole(actor);

  return withPostgresTransaction(actor, async (client) => {
    const payload = (typeof rawPayload === "object" && rawPayload !== null
      ? rawPayload
      : {}) as ImagingDraftPayload;
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
        values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'IMAGING', $5::date, $6::uuid, $7)
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
            'IMAGING',
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
        insert into public.imaging_closing_inputs (
          closing_version_id,
          revenue_total,
          cost_of_sales,
          orders_total,
          clients_total,
          referred_revenue,
          referred_orders,
          telemedicine_patients,
          telemedicine_revenue,
          xray_studies,
          xray_revenue,
          extra_plates_count,
          extra_plates_revenue,
          ct_studies,
          ct_revenue,
          ultrasound_studies,
          ultrasound_revenue,
          doppler_studies,
          doppler_revenue,
          caaf_studies,
          caaf_revenue,
          report_reading_count,
          pending_reports,
          average_report_tat_hours,
          average_order_to_study_hours,
          equipment_available_hours,
          equipment_used_hours,
          equipment_downtime_hours,
          scheduled_studies,
          cancelled_studies,
          no_show_studies,
          licensed_staff_count,
          doctor_staff_count,
          customer_service_count,
          delivery_staff_count,
          cleaning_staff_count,
          new_clients,
          closure_observations,
          source_lineage
        )
        values (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39::jsonb
        )
        on conflict (closing_version_id) do update set
          revenue_total = excluded.revenue_total,
          cost_of_sales = excluded.cost_of_sales,
          orders_total = excluded.orders_total,
          clients_total = excluded.clients_total,
          referred_revenue = excluded.referred_revenue,
          referred_orders = excluded.referred_orders,
          telemedicine_patients = excluded.telemedicine_patients,
          telemedicine_revenue = excluded.telemedicine_revenue,
          xray_studies = excluded.xray_studies,
          xray_revenue = excluded.xray_revenue,
          extra_plates_count = excluded.extra_plates_count,
          extra_plates_revenue = excluded.extra_plates_revenue,
          ct_studies = excluded.ct_studies,
          ct_revenue = excluded.ct_revenue,
          ultrasound_studies = excluded.ultrasound_studies,
          ultrasound_revenue = excluded.ultrasound_revenue,
          doppler_studies = excluded.doppler_studies,
          doppler_revenue = excluded.doppler_revenue,
          caaf_studies = excluded.caaf_studies,
          caaf_revenue = excluded.caaf_revenue,
          report_reading_count = excluded.report_reading_count,
          pending_reports = excluded.pending_reports,
          average_report_tat_hours = excluded.average_report_tat_hours,
          average_order_to_study_hours = excluded.average_order_to_study_hours,
          equipment_available_hours = excluded.equipment_available_hours,
          equipment_used_hours = excluded.equipment_used_hours,
          equipment_downtime_hours = excluded.equipment_downtime_hours,
          scheduled_studies = excluded.scheduled_studies,
          cancelled_studies = excluded.cancelled_studies,
          no_show_studies = excluded.no_show_studies,
          licensed_staff_count = excluded.licensed_staff_count,
          doctor_staff_count = excluded.doctor_staff_count,
          customer_service_count = excluded.customer_service_count,
          delivery_staff_count = excluded.delivery_staff_count,
          cleaning_staff_count = excluded.cleaning_staff_count,
          new_clients = excluded.new_clients,
          closure_observations = excluded.closure_observations,
          source_lineage = excluded.source_lineage
      `,
      [
        versionId,
        numberOrNull(inputs.revenueTotal),
        numberOrNull(inputs.costOfSales),
        numberOrNull(inputs.ordersTotal),
        numberOrNull(inputs.clientsTotal),
        numberOrNull(inputs.referredRevenue),
        numberOrNull(inputs.referredOrders),
        numberOrNull(inputs.telemedicinePatients),
        numberOrNull(inputs.telemedicineRevenue),
        numberOrNull(inputs.xrayStudies),
        numberOrNull(inputs.xrayRevenue),
        numberOrNull(inputs.extraPlatesCount),
        numberOrNull(inputs.extraPlatesRevenue),
        numberOrNull(inputs.ctStudies),
        numberOrNull(inputs.ctRevenue),
        numberOrNull(inputs.ultrasoundStudies),
        numberOrNull(inputs.ultrasoundRevenue),
        numberOrNull(inputs.dopplerStudies),
        numberOrNull(inputs.dopplerRevenue),
        numberOrNull(inputs.caafStudies),
        numberOrNull(inputs.caafRevenue),
        numberOrNull(inputs.reportReadingCount),
        numberOrNull(inputs.pendingReports),
        numberOrNull(inputs.averageReportTatHours),
        numberOrNull(inputs.averageOrderToStudyHours),
        numberOrNull(inputs.equipmentAvailableHours),
        numberOrNull(inputs.equipmentUsedHours),
        numberOrNull(inputs.equipmentDowntimeHours),
        numberOrNull(inputs.scheduledStudies),
        numberOrNull(inputs.cancelledStudies),
        numberOrNull(inputs.noShowStudies),
        numberOrNull(inputs.licensedStaffCount),
        numberOrNull(inputs.doctorStaffCount),
        numberOrNull(inputs.customerServiceCount),
        numberOrNull(inputs.deliveryStaffCount),
        numberOrNull(inputs.cleaningStaffCount),
        numberOrNull(inputs.newClients),
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
        ? "Autosave de borrador Imagenes."
        : "Borrador creado desde formulario Imagenes.",
    );

    return closure;
  });
}

async function validatePostgresImagingClosureDraft(
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

async function publishPostgresImagingClosure(
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

async function upsertPostgresImagingTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (!canManageTargets(actor)) {
    throw new Error("Este rol no puede configurar metas.");
  }

  return withPostgresTransaction(actor, async (client) => {
    const payload = (typeof rawPayload === "object" && rawPayload !== null
      ? rawPayload
      : {}) as ImagingTargetPayload;
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
          and business_line = 'IMAGING'
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
          'IMAGING',
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
          'IMAGING',
          $5::date,
          $6::uuid,
          $7,
          'target.changed',
          'Meta Imagenes guardada.',
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

function getDemoImagingWorkspace(
  actor: AuthorizationActor,
  options: { period?: string } = {},
): ImagingWorkspace {
  const branches = getImagingBranchesForActor(actor);
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

export async function getImagingWorkspace(
  actor: AuthorizationActor,
  options: { period?: string } = {},
): Promise<ImagingWorkspace> {
  if (shouldUsePostgresPersistence()) {
    return withPostgresClient(actor, async (client) =>
      buildWorkspaceFromContext(
        actor,
        await getPostgresContext(client, actor),
        options,
      ),
    );
  }

  return getDemoImagingWorkspace(actor, options);
}

export async function saveImagingClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (shouldUsePostgresPersistence()) {
    return savePostgresImagingClosureDraft(actor, rawPayload);
  }

  return saveDemoImagingClosureDraft(actor, rawPayload);
}

export async function validateImagingClosureDraft(
  actor: AuthorizationActor,
  closureId: string,
) {
  if (shouldUsePostgresPersistence()) {
    return validatePostgresImagingClosureDraft(actor, closureId);
  }

  return validateDemoImagingClosureDraft(actor, closureId);
}

export async function publishImagingClosure(
  actor: AuthorizationActor,
  closureId: string,
) {
  if (shouldUsePostgresPersistence()) {
    return publishPostgresImagingClosure(actor, closureId);
  }

  return publishDemoImagingClosure(actor, closureId);
}

export async function upsertImagingTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (shouldUsePostgresPersistence()) {
    return upsertPostgresImagingTarget(actor, rawPayload);
  }

  return upsertDemoImagingTarget(actor, rawPayload);
}

export function getImagingTargetDefinitions() {
  return targetableKpis;
}
