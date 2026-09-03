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

export type PhysiotherapyClosureStatus =
  | "draft"
  | "validation_failed"
  | "validated"
  | "published"
  | "replaced";

export type PhysiotherapyValidationState =
  | "VALIDADO"
  | "ADVERTENCIA"
  | "BLOQUEADO";

export type PhysiotherapyValidationSeverity = "error" | "warning";

export type PhysiotherapyKpiStatus = "CALCULABLE" | "NOT_CALCULABLE";

export type PhysiotherapyTargetDirection =
  | "HIGHER_IS_BETTER"
  | "LOWER_IS_BETTER"
  | "RANGE";

export type PhysiotherapyTargetStatus =
  | "cumplido"
  | "en_riesgo"
  | "incumplido"
  | "sin_meta"
  | "not_calculable";

export type PhysiotherapyTargetLifecycleStatus = "active" | "inactive";

export type PhysiotherapyInsightPriority =
  | "critica"
  | "alta"
  | "media"
  | "positiva";

export type PhysiotherapyClosureAction =
  | "autosave"
  | "draft_created"
  | "draft_updated"
  | "target.changed"
  | "validated"
  | "validation_blocked"
  | "published"
  | "replaced";

export type PhysiotherapyFieldSource = "manual" | "catalog" | "system";

export type PhysiotherapyClosureInputs = {
  appointmentsCancelled: number;
  appointmentsCompleted: number;
  appointmentsScheduled: number;
  attendedHours: number;
  availableHours: number;
  closureObservations: string;
  directCosts: number;
  ordersTotal: number;
  patientsAttended: number;
  physiotherapistsActive: number;
  revenueTotal: number;
  scheduledHours: number;
  sessionsTotal: number;
  noShowAppointments: number;
};

export type PhysiotherapyClosureScope = ScopeBoundary & {
  areaManagerName: string;
  branchCode: string;
  branchName: string;
  businessLine: "PHYSIOTHERAPY";
  companyName: string;
  countryName: string;
  managerName: string;
};

export type PhysiotherapyValidationIssue = {
  code: string;
  field?: keyof PhysiotherapyClosureInputs | "period" | "branchId";
  message: string;
  severity: PhysiotherapyValidationSeverity;
};

export type PhysiotherapyKpiResult = {
  id: PhysiotherapyKpiId;
  label: string;
  formula: string;
  reading: string;
  status: PhysiotherapyKpiStatus;
  unit: "currency" | "count" | "ratio";
  value: number | null;
  requiredFields: string[];
  missingFields: string[];
};

export type PhysiotherapyTarget = {
  approvedAt: string;
  approvedBy: string;
  branchId: string;
  companyId: string;
  countryId: string;
  direction: PhysiotherapyTargetDirection;
  id: string;
  isDemo: boolean;
  kpiId: PhysiotherapyTargetableKpiId;
  label: string;
  period: string;
  status: PhysiotherapyTargetLifecycleStatus;
  targetMaxValue?: number;
  targetMinValue?: number;
  targetValue: number;
  unit: "currency" | "count" | "ratio";
  version: number;
};

export type PhysiotherapyTargetComparison = {
  actualValue: number | null;
  complianceRate: number | null;
  direction: PhysiotherapyTargetDirection;
  kpiId: PhysiotherapyTargetableKpiId;
  label: string;
  status: PhysiotherapyTargetStatus;
  targetMaxValue?: number;
  targetMinValue?: number;
  targetValue: number | null;
  unit: "currency" | "count" | "ratio";
  variation: number | null;
};

export type PhysiotherapyInsight = {
  branchName: string;
  comparison: string;
  evidence: string;
  id: string;
  impact: string;
  kpiId: PhysiotherapyKpiId;
  period: string;
  priority: PhysiotherapyInsightPriority;
  recommendation: string;
  title: string;
  whatHappened: string;
};

export type PhysiotherapyAuditEvent = {
  action: PhysiotherapyClosureAction;
  actorEmail: string;
  actorId: string;
  at: string;
  closureId: string;
  details: string;
  period: string;
  branchId: string;
};

export type PhysiotherapyClosure = {
  auditEvents: PhysiotherapyAuditEvent[];
  createdAt: string;
  createdBy: string;
  dataQualityScore: number;
  duplicateOfClosureId: string | null;
  id: string;
  inputs: PhysiotherapyClosureInputs;
  isDemo: boolean;
  kpiResults: PhysiotherapyKpiResult[];
  period: string;
  publishedAt: string | null;
  publishedBy: string | null;
  replacedByClosureId: string | null;
  replacesClosureId: string | null;
  scope: PhysiotherapyClosureScope;
  sourceLineage: Record<keyof PhysiotherapyClosureInputs, PhysiotherapyFieldSource>;
  status: PhysiotherapyClosureStatus;
  submittedBy: string;
  targetComparisons: PhysiotherapyTargetComparison[];
  updatedAt: string;
  validatedAt: string | null;
  validation: {
    errors: PhysiotherapyValidationIssue[];
    state: PhysiotherapyValidationState;
    warnings: PhysiotherapyValidationIssue[];
  };
  version: number;
};

export type PhysiotherapyBranchSummary = {
  branchId: string;
  branchName: string;
  areaName: string;
  areaManagerName: string;
  managerName: string;
  period: string;
  revenue: number;
  revenueTarget: number | null;
  revenueCompliance: number | null;
  sessions: number;
  patients: number;
  effectiveOccupancy: number | null;
  noShowRate: number | null;
  contributionMargin: number;
  dataQualityScore: number;
  status: PhysiotherapyValidationState;
  closureId: string;
};

export type PhysiotherapyWorkspace = {
  actorRole: AuthorizationActor["roleKey"];
  auditEvents: PhysiotherapyAuditEvent[];
  branches: PhysiotherapyClosureScope[];
  branchSummaries: PhysiotherapyBranchSummary[];
  canCreateClosure: boolean;
  canManageTargets: boolean;
  canPublishClosure: boolean;
  closures: PhysiotherapyClosure[];
  currentPeriod: string;
  currentPeriodStatus: "sin_cierre" | "borrador" | "validado" | "publicado";
  draftClosure: PhysiotherapyClosure | null;
  insights: PhysiotherapyInsight[];
  latestPublishedClosure: PhysiotherapyClosure | null;
  pendingClosureCount: number;
  publishedClosures: PhysiotherapyClosure[];
  reportingPeriod: string;
  summary: PhysiotherapyRollupSummary;
  targetComparisons: PhysiotherapyTargetComparison[];
  targets: PhysiotherapyTarget[];
};

export type PhysiotherapyRollupSummary = {
  branchCount: number;
  closuresPublished: number;
  contributionMargin: number;
  dataQualityScore: number;
  effectiveOccupancy: number | null;
  noShowRate: number | null;
  patients: number;
  revenue: number;
  revenueCompliance: number | null;
  revenueTarget: number | null;
  sessions: number;
};

export type PhysiotherapyDraftPayload = {
  branchId?: unknown;
  closureObservations?: unknown;
  id?: unknown;
  inputs?: unknown;
  period?: unknown;
  replacesClosureId?: unknown;
};

export type PhysiotherapyTargetPayload = {
  branchId?: unknown;
  direction?: unknown;
  kpiId?: unknown;
  period?: unknown;
  status?: unknown;
  targetMaxValue?: unknown;
  targetMinValue?: unknown;
  targetValue?: unknown;
};

export type PhysiotherapyKpiId =
  | "facturacion_neta"
  | "cumplimiento_venta"
  | "ticket_promedio"
  | "sesiones_total"
  | "sesiones_por_paciente"
  | "ocupacion_agendada"
  | "ocupacion_efectiva"
  | "brecha_conversion"
  | "tasa_finalizacion"
  | "tasa_no_show"
  | "tasa_cancelacion"
  | "ingreso_por_hora"
  | "ingreso_por_fisioterapeuta"
  | "margen_contribucion"
  | "porcentaje_margen";

export type PhysiotherapyTargetableKpiId =
  | "facturacion_neta"
  | "ocupacion_efectiva"
  | "sesiones_total"
  | "tasa_no_show"
  | "margen_contribucion";

type PhysiotherapyStore = {
  auditEvents: PhysiotherapyAuditEvent[];
  closures: Map<string, PhysiotherapyClosure>;
  targets: Map<string, PhysiotherapyTarget>;
};

declare global {
  var analizaPhysiotherapyStore: PhysiotherapyStore | undefined;
}

const physiotherapyCompany =
  demoCompanies.find((company) => company.unitType === "fisioterapia") ??
  demoCompanies[0];
const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const currentDemoPeriod = "2026-08";

const kpiMeta: Record<
  PhysiotherapyKpiId,
  {
    label: string;
    formula: string;
    reading: string;
    unit: PhysiotherapyKpiResult["unit"];
    requiredFields: string[];
  }
> = {
  brecha_conversion: {
    formula: "ocupacion agendada - ocupacion efectiva",
    label: "Brecha de conversion",
    reading: "Diferencia entre capacidad agendada y capacidad realmente atendida. Si crece, hay agenda que no se convierte en atencion.",
    requiredFields: ["scheduledHours", "attendedHours", "availableHours"],
    unit: "ratio",
  },
  cumplimiento_venta: {
    formula: "facturacion neta / meta de facturacion",
    label: "Cumplimiento de venta",
    reading: "Muestra el avance de la facturacion neta contra la meta aprobada del periodo.",
    requiredFields: ["revenueTotal", "target_revenue"],
    unit: "ratio",
  },
  facturacion_neta: {
    formula: "facturacion neta",
    label: "Facturacion neta",
    reading: "Venta neta validada del cierre. Es la base para cumplimiento, margen y ticket promedio.",
    requiredFields: ["revenueTotal"],
    unit: "currency",
  },
  ingreso_por_fisioterapeuta: {
    formula: "facturacion neta / fisioterapeutas activos",
    label: "Ingreso por fisioterapeuta",
    reading: "Promedio de facturacion neta generada por fisioterapeuta activo.",
    requiredFields: ["revenueTotal", "physiotherapistsActive"],
    unit: "currency",
  },
  ingreso_por_hora: {
    formula: "facturacion neta / horas atendidas",
    label: "Ingreso por hora",
    reading: "Promedio facturado por cada hora atendida. Ayuda a leer productividad financiera de la agenda cumplida.",
    requiredFields: ["revenueTotal", "attendedHours"],
    unit: "currency",
  },
  margen_contribucion: {
    formula: "facturacion neta - costos directos",
    label: "Margen de contribucion",
    reading: "Monto que queda despues de cubrir costos directos. No descuenta gastos administrativos, financieros ni impuestos.",
    requiredFields: ["revenueTotal", "directCosts"],
    unit: "currency",
  },
  ocupacion_agendada: {
    formula: "horas agendadas / horas disponibles",
    label: "Ocupacion agendada",
    reading: "Porcentaje de la capacidad disponible que fue comprometida por agenda.",
    requiredFields: ["scheduledHours", "availableHours"],
    unit: "ratio",
  },
  ocupacion_efectiva: {
    formula: "horas atendidas / horas disponibles",
    label: "Ocupacion efectiva",
    reading: "Porcentaje de la capacidad disponible que realmente se atendio.",
    requiredFields: ["attendedHours", "availableHours"],
    unit: "ratio",
  },
  porcentaje_margen: {
    formula: "(facturacion neta - costos directos) / facturacion neta",
    label: "Margen de contribucion bruto %",
    reading: "Porcentaje de facturacion neta que queda despues de costos directos. No es margen neto porque no descuenta gastos administrativos, financieros ni impuestos.",
    requiredFields: ["revenueTotal", "directCosts"],
    unit: "ratio",
  },
  sesiones_por_paciente: {
    formula: "sesiones / pacientes atendidos",
    label: "Sesiones por paciente",
    reading: "Promedio de sesiones realizadas por paciente atendido.",
    requiredFields: ["sessionsTotal", "patientsAttended"],
    unit: "count",
  },
  sesiones_total: {
    formula: "sesiones realizadas",
    label: "Sesiones",
    reading: "Cantidad total de sesiones realizadas en el cierre.",
    requiredFields: ["sessionsTotal"],
    unit: "count",
  },
  tasa_cancelacion: {
    formula: "citas canceladas / citas agendadas",
    label: "Tasa de cancelacion",
    reading: "Porcentaje de citas canceladas sobre la agenda del periodo.",
    requiredFields: ["appointmentsCancelled", "appointmentsScheduled"],
    unit: "ratio",
  },
  tasa_finalizacion: {
    formula: "citas completadas / citas agendadas",
    label: "Tasa de finalizacion",
    reading: "Porcentaje de citas agendadas que terminaron como completadas.",
    requiredFields: ["appointmentsCompleted", "appointmentsScheduled"],
    unit: "ratio",
  },
  tasa_no_show: {
    formula: "no-show / citas agendadas",
    label: "Tasa de no-show",
    reading: "Porcentaje de citas en las que el paciente no asistio.",
    requiredFields: ["noShowAppointments", "appointmentsScheduled"],
    unit: "ratio",
  },
  ticket_promedio: {
    formula: "facturacion neta / pacientes atendidos",
    label: "Ticket promedio",
    reading: "Promedio facturado por paciente atendido en el periodo.",
    requiredFields: ["revenueTotal", "patientsAttended"],
    unit: "currency",
  },
};

const targetableKpis: Record<
  PhysiotherapyTargetableKpiId,
  {
    direction: PhysiotherapyTargetDirection;
    label: string;
    unit: PhysiotherapyTarget["unit"];
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
  ocupacion_efectiva: {
    direction: "HIGHER_IS_BETTER",
    label: "Ocupacion efectiva",
    unit: "ratio",
  },
  sesiones_total: {
    direction: "HIGHER_IS_BETTER",
    label: "Sesiones",
    unit: "count",
  },
  tasa_no_show: {
    direction: "LOWER_IS_BETTER",
    label: "No-show maximo",
    unit: "ratio",
  },
};

const inputFieldNames: Array<keyof PhysiotherapyClosureInputs> = [
  "appointmentsCancelled",
  "appointmentsCompleted",
  "appointmentsScheduled",
  "attendedHours",
  "availableHours",
  "closureObservations",
  "directCosts",
  "ordersTotal",
  "patientsAttended",
  "physiotherapistsActive",
  "revenueTotal",
  "scheduledHours",
  "sessionsTotal",
  "noShowAppointments",
];

type PhysiotherapyNumericInputKey = Exclude<
  keyof PhysiotherapyClosureInputs,
  "closureObservations"
>;

const numericInputFieldNames: PhysiotherapyNumericInputKey[] = [
  "appointmentsCancelled",
  "appointmentsCompleted",
  "appointmentsScheduled",
  "attendedHours",
  "availableHours",
  "directCosts",
  "ordersTotal",
  "patientsAttended",
  "physiotherapistsActive",
  "revenueTotal",
  "scheduledHours",
  "sessionsTotal",
  "noShowAppointments",
];

export function resetPhysiotherapyClosureStoreForTests() {
  globalThis.analizaPhysiotherapyStore = undefined;
}

export function getPhysiotherapyBranches() {
  return demoBranches
    .filter((branch) => branch.companyId === physiotherapyCompany.id)
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

function toClosureScope(branch: BranchOption): PhysiotherapyClosureScope {
  const area = getOperationalArea(branch);

  return {
    branchCode: branch.code,
    branchId: branch.id,
    branchName: branch.name,
    businessLine: "PHYSIOTHERAPY",
    companyId: branch.companyId,
    companyName: physiotherapyCompany.name,
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

export function getPhysiotherapyBranchesForActor(actor: AuthorizationActor) {
  return getPhysiotherapyBranches().filter((branch) =>
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
  id: PhysiotherapyKpiId,
  value: number | null,
  missingFields: string[] = [],
): PhysiotherapyKpiResult {
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
  kpis: PhysiotherapyKpiResult[],
  id: PhysiotherapyKpiId,
) {
  return kpis.find((kpi) => kpi.id === id)?.value ?? null;
}

function missingInputFields(
  inputs: PhysiotherapyClosureInputs,
  fields: PhysiotherapyNumericInputKey[],
) {
  return fields.filter((fieldName) => !Number.isFinite(inputs[fieldName]));
}

function missingOrInvalidDenominator(
  inputs: PhysiotherapyClosureInputs,
  fieldName: PhysiotherapyNumericInputKey,
) {
  const missingFields = missingInputFields(inputs, [fieldName]);

  if (missingFields.length > 0) {
    return missingFields;
  }

  return inputs[fieldName] <= 0 ? [fieldName] : [];
}

function sourceLineage(): PhysiotherapyClosure["sourceLineage"] {
  return inputFieldNames.reduce<PhysiotherapyClosure["sourceLineage"]>(
    (lineage, fieldName) => {
      lineage[fieldName] =
        fieldName === "closureObservations" ? "manual" : "manual";
      return lineage;
    },
    {} as PhysiotherapyClosure["sourceLineage"],
  );
}

function createAuditEvent({
  action,
  actor,
  closure,
  details,
}: {
  action: PhysiotherapyClosureAction;
  actor: AuthorizationActor;
  closure: Pick<PhysiotherapyClosure, "id" | "period" | "scope">;
  details: string;
}): PhysiotherapyAuditEvent {
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
  targets: PhysiotherapyTarget[],
  closure: PhysiotherapyClosure,
  kpiId: PhysiotherapyTargetableKpiId,
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
  inputs: PhysiotherapyClosureInputs,
  targets: PhysiotherapyTarget[],
  closureShell: Pick<PhysiotherapyClosure, "period" | "scope">,
) {
  const targetShell = {
    ...closureShell,
    id: "kpi-shell",
    inputs,
  } as PhysiotherapyClosure;
  const revenueTarget = getClosureTarget(
    targets,
    targetShell,
    "facturacion_neta",
  )?.targetValue;
  const marginContribution = inputs.revenueTotal - inputs.directCosts;
  const revenueAttainment =
    typeof revenueTarget === "number"
      ? ratio(inputs.revenueTotal, revenueTarget)
      : null;
  const revenueFields = missingInputFields(inputs, ["revenueTotal"]);
  const patientDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "patientsAttended",
  );
  const availableDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "availableHours",
  );
  const appointmentsDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "appointmentsScheduled",
  );
  const attendedDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "attendedHours",
  );
  const therapistDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "physiotherapistsActive",
  );
  const sessionPatientFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["sessionsTotal"]),
      ...patientDenominatorFields,
    ]),
  );
  const availableScheduledFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["scheduledHours"]),
      ...availableDenominatorFields,
    ]),
  );
  const availableAttendedFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["attendedHours"]),
      ...availableDenominatorFields,
    ]),
  );
  const appointmentFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["appointmentsCompleted"]),
      ...appointmentsDenominatorFields,
    ]),
  );
  const noShowFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["noShowAppointments"]),
      ...appointmentsDenominatorFields,
    ]),
  );
  const cancellationFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["appointmentsCancelled"]),
      ...appointmentsDenominatorFields,
    ]),
  );
  const hourlyFields = Array.from(
    new Set([...revenueFields, ...attendedDenominatorFields]),
  );
  const therapistFields = Array.from(
    new Set([...revenueFields, ...therapistDenominatorFields]),
  );
  const marginFields = missingInputFields(inputs, ["revenueTotal", "directCosts"]);
  const marginRateFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["directCosts"]),
      ...missingOrInvalidDenominator(inputs, "revenueTotal"),
    ]),
  );
  const conversionGapFields = Array.from(
    new Set([...availableScheduledFields, ...availableAttendedFields]),
  );

  return [
    kpiResult("facturacion_neta", inputs.revenueTotal, revenueFields),
    kpiResult(
      "cumplimiento_venta",
      revenueAttainment,
      [
        ...revenueFields,
        ...(typeof revenueTarget === "number" ? [] : ["target_revenue"]),
      ],
    ),
    kpiResult(
      "ticket_promedio",
      ratio(inputs.revenueTotal, inputs.patientsAttended),
      [...revenueFields, ...patientDenominatorFields],
    ),
    kpiResult(
      "sesiones_total",
      inputs.sessionsTotal,
      missingInputFields(inputs, ["sessionsTotal"]),
    ),
    kpiResult(
      "sesiones_por_paciente",
      ratio(inputs.sessionsTotal, inputs.patientsAttended),
      sessionPatientFields,
    ),
    kpiResult(
      "ocupacion_agendada",
      ratio(inputs.scheduledHours, inputs.availableHours),
      availableScheduledFields,
    ),
    kpiResult(
      "ocupacion_efectiva",
      ratio(inputs.attendedHours, inputs.availableHours),
      availableAttendedFields,
    ),
    kpiResult(
      "brecha_conversion",
      inputs.availableHours > 0
        ? inputs.scheduledHours / inputs.availableHours -
            inputs.attendedHours / inputs.availableHours
        : null,
      conversionGapFields,
    ),
    kpiResult(
      "tasa_finalizacion",
      ratio(inputs.appointmentsCompleted, inputs.appointmentsScheduled),
      appointmentFields,
    ),
    kpiResult(
      "tasa_no_show",
      ratio(inputs.noShowAppointments, inputs.appointmentsScheduled),
      noShowFields,
    ),
    kpiResult(
      "tasa_cancelacion",
      ratio(inputs.appointmentsCancelled, inputs.appointmentsScheduled),
      cancellationFields,
    ),
    kpiResult(
      "ingreso_por_hora",
      ratio(inputs.revenueTotal, inputs.attendedHours),
      hourlyFields,
    ),
    kpiResult(
      "ingreso_por_fisioterapeuta",
      ratio(inputs.revenueTotal, inputs.physiotherapistsActive),
      therapistFields,
    ),
    kpiResult("margen_contribucion", marginContribution, marginFields),
    kpiResult(
      "porcentaje_margen",
      ratio(marginContribution, inputs.revenueTotal),
      marginRateFields,
    ),
  ];
}

function getTargetStatus({
  actual,
  target,
}: {
  actual: number | null;
  target: PhysiotherapyTarget;
}): PhysiotherapyTargetStatus {
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
  target: PhysiotherapyTarget;
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
  kpis: PhysiotherapyKpiResult[],
  closure: PhysiotherapyClosure,
  targets: PhysiotherapyTarget[],
): PhysiotherapyTargetComparison[] {
  return Object.entries(targetableKpis).map(([rawKpiId, definition]) => {
    const kpiId = rawKpiId as PhysiotherapyTargetableKpiId;
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
  store: PhysiotherapyStore,
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
  store: PhysiotherapyStore,
  closure: PhysiotherapyClosure,
): PhysiotherapyClosure["validation"] {
  const errors: PhysiotherapyValidationIssue[] = [];
  const warnings: PhysiotherapyValidationIssue[] = [];
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

  for (const fieldName of numericInputFieldNames) {
    const fieldValue = inputs[fieldName];

    if (!Number.isFinite(fieldValue)) {
      errors.push({
        code: "number.missing_required",
        field: fieldName,
        message: "Falta un dato fuente obligatorio.",
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

  const hoursLimit =
    Number.isFinite(inputs.physiotherapistsActive) &&
    inputs.physiotherapistsActive > 0
      ? inputs.physiotherapistsActive * 744
      : null;

  if (hoursLimit !== null) {
    for (const fieldName of [
      "attendedHours",
      "availableHours",
      "scheduledHours",
    ] satisfies PhysiotherapyNumericInputKey[]) {
      if (inputs[fieldName] > hoursLimit) {
        errors.push({
          code: "hours.unreasonable",
          field: fieldName,
          message:
            "Las horas mensuales superan un maximo razonable para el personal activo.",
          severity: "error",
        });
      }
    }
  }

  const appointmentOutcomes =
    inputs.appointmentsCompleted +
    inputs.appointmentsCancelled +
    inputs.noShowAppointments;

  if (
    Number.isFinite(appointmentOutcomes) &&
    Number.isFinite(inputs.appointmentsScheduled) &&
    appointmentOutcomes > inputs.appointmentsScheduled
  ) {
    warnings.push({
      code: "appointments.outcomes_exceed_scheduled",
      field: "appointmentsScheduled",
      message:
        "Completadas + canceladas + no-show supera las citas agendadas. Validar agenda antes de publicar.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(appointmentOutcomes) &&
    Number.isFinite(inputs.appointmentsScheduled) &&
    inputs.appointmentsScheduled > 0 &&
    appointmentOutcomes < inputs.appointmentsScheduled
  ) {
    warnings.push({
      code: "appointments.unclassified",
      field: "appointmentsScheduled",
      message:
        "Hay citas agendadas sin estado final. El KPI se calcula, pero requiere revision.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.attendedHours) &&
    Number.isFinite(inputs.availableHours) &&
    inputs.attendedHours > inputs.availableHours
  ) {
    warnings.push({
      code: "hours.attended_exceed_available",
      field: "attendedHours",
      message:
        "Las horas atendidas superan las horas disponibles. Validar capacidad o captura.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.scheduledHours) &&
    Number.isFinite(inputs.availableHours) &&
    inputs.scheduledHours > inputs.availableHours
  ) {
    warnings.push({
      code: "hours.scheduled_exceed_available",
      field: "scheduledHours",
      message:
        "Las horas agendadas superan la capacidad disponible. Validar agenda o capacidad.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.attendedHours) &&
    Number.isFinite(inputs.scheduledHours) &&
    inputs.attendedHours > inputs.scheduledHours
  ) {
    warnings.push({
      code: "hours.attended_exceed_scheduled",
      field: "attendedHours",
      message:
        "Las horas atendidas superan las agendadas. Puede ser real por atenciones extra, pero debe revisarse.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.directCosts) &&
    Number.isFinite(inputs.revenueTotal) &&
    inputs.directCosts > inputs.revenueTotal &&
    inputs.revenueTotal > 0
  ) {
    warnings.push({
      code: "margin.negative",
      field: "directCosts",
      message:
        "Los costos directos superan la facturacion. El margen queda negativo.",
      severity: "warning",
    });
  }

  if (
    warnings.some((warning) =>
      [
        "appointments.outcomes_exceed_scheduled",
        "hours.attended_exceed_available",
        "hours.scheduled_exceed_available",
        "margin.negative",
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

function calculateQualityScore(validation: PhysiotherapyClosure["validation"]) {
  return Math.max(
    0,
    Math.min(100, 100 - validation.errors.length * 20 - validation.warnings.length * 7),
  );
}

function withCalculatedFields(
  store: PhysiotherapyStore,
  closure: PhysiotherapyClosure,
): PhysiotherapyClosure {
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

function defaultInputs(index = 0): PhysiotherapyClosureInputs {
  const revenueTotal = 32000 + index * 3900;
  const appointmentsScheduled = 520 + index * 28;
  const noShowAppointments = 32 + index * 3;
  const appointmentsCancelled = 28 + index * 2;
  const appointmentsCompleted =
    appointmentsScheduled - noShowAppointments - appointmentsCancelled;
  const availableHours = 250 + index * 12;
  const scheduledHours = Math.round(availableHours * (0.78 + index * 0.01));
  const attendedHours = Math.round(availableHours * (0.68 + index * 0.01));

  return {
    appointmentsCancelled,
    appointmentsCompleted,
    appointmentsScheduled,
    attendedHours,
    availableHours,
    closureObservations:
      "DEMO: cierre de entrenamiento para validar el flujo end-to-end.",
    directCosts: Math.round(revenueTotal * (0.56 + index * 0.01)),
    ordersTotal: 360 + index * 22,
    patientsAttended: 285 + index * 18,
    physiotherapistsActive: 4 + (index % 3),
    revenueTotal,
    scheduledHours,
    sessionsTotal: appointmentsCompleted,
    noShowAppointments,
  };
}

function createTargetId(
  period: string,
  branchId: string,
  kpiId: PhysiotherapyTargetableKpiId,
  version: number,
) {
  return `physio-target-${sanitizeIdPart(branchId)}-${period}-${kpiId}-v${version}`;
}

function createSeedTargets(
  branch: BranchOption,
  period: string,
  inputs: PhysiotherapyClosureInputs,
  index: number,
) {
  const baseTargets: Array<{
    kpiId: PhysiotherapyTargetableKpiId;
    targetValue: number;
  }> = [
    {
      kpiId: "facturacion_neta",
      targetValue: Math.round(inputs.revenueTotal * (index % 2 === 0 ? 1.03 : 0.97)),
    },
    {
      kpiId: "ocupacion_efectiva",
      targetValue: 0.74,
    },
    {
      kpiId: "sesiones_total",
      targetValue: Math.round(inputs.sessionsTotal * 1.04),
    },
    {
      kpiId: "tasa_no_show",
      targetValue: 0.07,
    },
    {
      kpiId: "margen_contribucion",
      targetValue: Math.round((inputs.revenueTotal - inputs.directCosts) * 1.02),
    },
  ];

  return baseTargets.map(({ kpiId, targetValue }) => {
    const definition = targetableKpis[kpiId];

    return {
      approvedAt: `${period}-01T06:00:00.000Z`,
      approvedBy: "DEMO operaciones fisioterapia",
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
    } satisfies PhysiotherapyTarget;
  });
}

function createSeedClosure(
  branch: BranchOption,
  period: string,
  inputs: PhysiotherapyClosureInputs,
  index: number,
): PhysiotherapyClosure {
  const createdAt = `${period}-28T08:0${index % 9}:00.000Z`;
  const baseClosure: PhysiotherapyClosure = {
    auditEvents: [],
    createdAt,
    createdBy: "demo-seed",
    dataQualityScore: 100,
    duplicateOfClosureId: null,
    id: `physio-closure-${sanitizeIdPart(branch.id)}-${period}-v1`,
    inputs,
    isDemo: true,
    kpiResults: [],
    period,
    publishedAt: `${period}-28T09:0${index % 9}:00.000Z`,
    publishedBy: "DEMO operaciones fisioterapia",
    replacedByClosureId: null,
    replacesClosureId: null,
    scope: toClosureScope(branch),
    sourceLineage: sourceLineage(),
    status: "published",
    submittedBy: branch.branchManagerName ?? "Gerente de sucursal DEMO",
    targetComparisons: [],
    updatedAt: createdAt,
    validatedAt: `${period}-28T08:3${index % 9}:00.000Z`,
    validation: {
      errors: [],
      state: "VALIDADO",
      warnings:
        inputs.appointmentsCompleted +
          inputs.appointmentsCancelled +
          inputs.noShowAppointments <
        inputs.appointmentsScheduled
          ? [
              {
                code: "appointments.unclassified",
                field: "appointmentsScheduled",
                message:
                  "Hay citas agendadas sin estado final. El KPI se calcula, pero requiere revision.",
                severity: "warning",
              },
            ]
          : [],
    },
    version: 1,
  };

  return baseClosure;
}

function seedStore(store: PhysiotherapyStore) {
  const branches = getPhysiotherapyBranches().filter(
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
        sessionsTotal: Math.round(inputs.sessionsTotal * 1.03),
      },
      index,
    )) {
      store.targets.set(target.id, target);
    }

    const closure = withCalculatedFields(
      store,
      createSeedClosure(branch, seedPeriod, inputs, index),
    );
    const auditEvent: PhysiotherapyAuditEvent = {
      action: "published",
      actorEmail: "demo-fisioterapia@analiza.local",
      actorId: "demo-seed",
      at: closure.publishedAt ?? closure.updatedAt,
      branchId: branch.id,
      closureId: closure.id,
      details: "Seed DEMO publicado desde el catalogo gestionado de Fisioterapia.",
      period: closure.period,
    };

    closure.auditEvents.push(auditEvent);
    store.auditEvents.push(auditEvent);
    store.closures.set(closure.id, closure);
  });
}

function getStore() {
  if (!globalThis.analizaPhysiotherapyStore) {
    const store: PhysiotherapyStore = {
      auditEvents: [],
      closures: new Map(),
      targets: new Map(),
    };

    seedStore(store);
    globalThis.analizaPhysiotherapyStore = store;
  }

  return globalThis.analizaPhysiotherapyStore;
}

function getBranchForPayload(actor: AuthorizationActor, branchId: string) {
  const branch = getPhysiotherapyBranches().find(
    (candidate) => candidate.id === branchId,
  );

  if (!branch) {
    throw new Error("Sucursal de Fisioterapia no encontrada.");
  }

  if (!canActorReadBranch(actor, branch)) {
    throw new Error("El usuario no tiene alcance sobre esta sucursal.");
  }

  return branch;
}

function parseInputs(payload: PhysiotherapyDraftPayload) {
  const inputRecord =
    typeof payload.inputs === "object" &&
    payload.inputs !== null &&
    !Array.isArray(payload.inputs)
      ? (payload.inputs as Record<string, unknown>)
      : {};

  return {
    appointmentsCancelled: readNumber(inputRecord.appointmentsCancelled),
    appointmentsCompleted: readNumber(inputRecord.appointmentsCompleted),
    appointmentsScheduled: readNumber(inputRecord.appointmentsScheduled),
    attendedHours: readNumber(inputRecord.attendedHours),
    availableHours: readNumber(inputRecord.availableHours),
    closureObservations: readString(
      inputRecord.closureObservations ?? payload.closureObservations,
    ).slice(0, 1200),
    directCosts: readNumber(inputRecord.directCosts),
    ordersTotal: readNumber(inputRecord.ordersTotal),
    patientsAttended: readNumber(inputRecord.patientsAttended),
    physiotherapistsActive: readNumber(inputRecord.physiotherapistsActive),
    revenueTotal: readNumber(inputRecord.revenueTotal),
    scheduledHours: readNumber(inputRecord.scheduledHours),
    sessionsTotal: readNumber(inputRecord.sessionsTotal),
    noShowAppointments: readNumber(inputRecord.noShowAppointments),
  } satisfies PhysiotherapyClosureInputs;
}

function getNextVersion(
  store: PhysiotherapyStore,
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
  store: PhysiotherapyStore,
  closure: PhysiotherapyClosure,
  event: PhysiotherapyAuditEvent,
) {
  closure.auditEvents = [event, ...closure.auditEvents];
  store.auditEvents = [event, ...store.auditEvents];
}

function saveDemoPhysiotherapyClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  assertWritableRole(actor);

  const store = getStore();
  const payload = (typeof rawPayload === "object" && rawPayload !== null
    ? rawPayload
    : {}) as PhysiotherapyDraftPayload;
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
    `physio-closure-${sanitizeIdPart(branch.id)}-${period}-v${version}`;
  const baseClosure: PhysiotherapyClosure = {
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
      ? "Borrador actualizado desde formulario Fisioterapia."
      : "Borrador creado desde formulario Fisioterapia.",
  });

  appendAudit(store, closure, event);
  store.closures.set(closure.id, closure);

  return closure;
}

function validateDemoPhysiotherapyClosureDraft(
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
  const validated: PhysiotherapyClosure = {
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

function publishDemoPhysiotherapyClosure(
  actor: AuthorizationActor,
  closureId: string,
) {
  assertWritableRole(actor);

  const store = getStore();
  const closure = validateDemoPhysiotherapyClosureDraft(actor, closureId);

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
  const published: PhysiotherapyClosure = withCalculatedFields(store, {
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
      const replacedClosure: PhysiotherapyClosure = {
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
  fallback: PhysiotherapyTargetDirection,
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

function readTargetKpiId(value: unknown): PhysiotherapyTargetableKpiId {
  if (
    value === "facturacion_neta" ||
    value === "ocupacion_efectiva" ||
    value === "sesiones_total" ||
    value === "tasa_no_show" ||
    value === "margen_contribucion"
  ) {
    return value;
  }

  throw new Error("KPI de meta no soportado para Fisioterapia MVP.");
}

function readTargetLifecycleStatus(
  value: unknown,
): PhysiotherapyTargetLifecycleStatus {
  return value === "inactive" ? "inactive" : "active";
}

function upsertDemoPhysiotherapyTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (!canManageTargets(actor)) {
    throw new Error("Este rol no puede configurar metas.");
  }

  const store = getStore();
  const payload = (typeof rawPayload === "object" && rawPayload !== null
    ? rawPayload
    : {}) as PhysiotherapyTargetPayload;
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

  const target: PhysiotherapyTarget = {
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
    getPhysiotherapyBranchesForActor(actor).map((branch) => branch.id),
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
    getPhysiotherapyBranchesForActor(actor).map((branch) => branch.id),
  );

  return [...store.targets.values()].filter((target) =>
    allowedBranchIds.has(target.branchId),
  );
}

function aggregateKpiValue(
  closures: PhysiotherapyClosure[],
  kpiId: PhysiotherapyTargetableKpiId,
) {
  if (closures.length === 0) {
    return null;
  }

  if (kpiId === "facturacion_neta") {
    return closures.reduce((sum, closure) => sum + closure.inputs.revenueTotal, 0);
  }

  if (kpiId === "sesiones_total") {
    return closures.reduce((sum, closure) => sum + closure.inputs.sessionsTotal, 0);
  }

  if (kpiId === "margen_contribucion") {
    return closures.reduce(
      (sum, closure) =>
        sum + closure.inputs.revenueTotal - closure.inputs.directCosts,
      0,
    );
  }

  if (kpiId === "ocupacion_efectiva") {
    const hours = closures.reduce(
      (summary, closure) => ({
        attended: summary.attended + closure.inputs.attendedHours,
        available: summary.available + closure.inputs.availableHours,
      }),
      { attended: 0, available: 0 },
    );

    return ratio(hours.attended, hours.available);
  }

  const appointments = closures.reduce(
    (summary, closure) => ({
      noShow: summary.noShow + closure.inputs.noShowAppointments,
      scheduled: summary.scheduled + closure.inputs.appointmentsScheduled,
    }),
    { noShow: 0, scheduled: 0 },
  );

  return ratio(appointments.noShow, appointments.scheduled);
}

function latestTargetsByBranchAndKpi(targets: PhysiotherapyTarget[]) {
  const latestTargets = new Map<string, PhysiotherapyTarget>();

  for (const target of targets) {
    const key = `${target.period}:${target.branchId}:${target.kpiId}`;
    const existingTarget = latestTargets.get(key);

    if (!existingTarget || target.version > existingTarget.version) {
      latestTargets.set(key, target);
    }
  }

  return latestTargets;
}

function aggregateTargetValue(
  closures: PhysiotherapyClosure[],
  targets: PhysiotherapyTarget[],
  kpiId: PhysiotherapyTargetableKpiId,
) {
  const latestTargets = latestTargetsByBranchAndKpi(targets);
  const closureTargets = closures
    .map((closure) =>
      latestTargets.get(`${closure.period}:${closure.scope.branchId}:${kpiId}`),
    )
    .filter(
      (target): target is PhysiotherapyTarget => target?.status === "active",
    );

  if (closureTargets.length === 0) {
    return null;
  }

  if (kpiId === "ocupacion_efectiva" || kpiId === "tasa_no_show") {
    return (
      closureTargets.reduce((sum, target) => sum + target.targetValue, 0) /
      closureTargets.length
    );
  }

  return closureTargets.reduce((sum, target) => sum + target.targetValue, 0);
}

function buildRollupComparisons(
  closures: PhysiotherapyClosure[],
  targets: PhysiotherapyTarget[],
) {
  return Object.entries(targetableKpis).map(([rawKpiId, definition]) => {
    const kpiId = rawKpiId as PhysiotherapyTargetableKpiId;
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
      } satisfies PhysiotherapyTargetComparison;
    }

    const target: PhysiotherapyTarget = {
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
    } satisfies PhysiotherapyTargetComparison;
  });
}

function buildRollupSummary(
  closures: PhysiotherapyClosure[],
  branchCount: number,
): PhysiotherapyRollupSummary {
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
  const sessions = closures.reduce(
    (sum, closure) => sum + closure.inputs.sessionsTotal,
    0,
  );
  const patients = closures.reduce(
    (sum, closure) => sum + closure.inputs.patientsAttended,
    0,
  );
  const contributionMargin = closures.reduce(
    (sum, closure) =>
      sum + closure.inputs.revenueTotal - closure.inputs.directCosts,
    0,
  );
  const noShow = closures.reduce(
    (sum, closure) => sum + closure.inputs.noShowAppointments,
    0,
  );
  const appointments = closures.reduce(
    (sum, closure) => sum + closure.inputs.appointmentsScheduled,
    0,
  );
  const attendedHours = closures.reduce(
    (sum, closure) => sum + closure.inputs.attendedHours,
    0,
  );
  const availableHours = closures.reduce(
    (sum, closure) => sum + closure.inputs.availableHours,
    0,
  );
  const dataQualityScore =
    closures.length > 0
      ? closures.reduce((sum, closure) => sum + closure.dataQualityScore, 0) /
        closures.length
      : 0;

  return {
    branchCount,
    closuresPublished: closures.length,
    contributionMargin,
    dataQualityScore: round(dataQualityScore, 1),
    effectiveOccupancy: ratio(attendedHours, availableHours),
    noShowRate: ratio(noShow, appointments),
    patients,
    revenue,
    revenueCompliance:
      revenueTarget > 0 ? ratio(revenue, revenueTarget) : null,
    revenueTarget: revenueTarget > 0 ? revenueTarget : null,
    sessions,
  };
}

function targetByKpi(
  comparisons: PhysiotherapyTargetComparison[],
  kpiId: PhysiotherapyTargetableKpiId,
) {
  return comparisons.find((comparison) => comparison.kpiId === kpiId) ?? null;
}

function formatComparisonValue(
  comparison: PhysiotherapyTargetComparison | null,
) {
  if (!comparison || comparison.actualValue === null) {
    return "sin dato calculable";
  }

  if (comparison.unit === "currency") {
    return `$${Math.round(comparison.actualValue).toLocaleString("en-US")}`;
  }

  if (comparison.unit === "ratio") {
    return `${Math.round(comparison.actualValue * 100)}%`;
  }

  return Math.round(comparison.actualValue).toLocaleString("en-US");
}

function previousPublishedClosure(
  closure: PhysiotherapyClosure,
  closures: PhysiotherapyClosure[],
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
  closure: PhysiotherapyClosure,
  allClosures: PhysiotherapyClosure[] = [],
): PhysiotherapyInsight[] {
  const insights: PhysiotherapyInsight[] = [];
  const previousClosure = previousPublishedClosure(closure, allClosures);
  const revenue = targetByKpi(closure.targetComparisons, "facturacion_neta");
  const noShow = targetByKpi(closure.targetComparisons, "tasa_no_show");
  const occupancy = targetByKpi(closure.targetComparisons, "ocupacion_efectiva");
  const margin = targetByKpi(closure.targetComparisons, "margen_contribucion");
  const scheduledOccupancy = getKpiValue(closure.kpiResults, "ocupacion_agendada");
  const effectiveOccupancy = getKpiValue(closure.kpiResults, "ocupacion_efectiva");
  const marginRate = getKpiValue(closure.kpiResults, "porcentaje_margen");
  const currentMargin = closure.inputs.revenueTotal - closure.inputs.directCosts;
  const previousMargin =
    previousClosure === null
      ? null
      : previousClosure.inputs.revenueTotal - previousClosure.inputs.directCosts;

  if (
    scheduledOccupancy !== null &&
    effectiveOccupancy !== null &&
    scheduledOccupancy >= 0.82 &&
    scheduledOccupancy - effectiveOccupancy >= 0.08
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${Math.round(scheduledOccupancy * 100)}% agendada vs ${Math.round(effectiveOccupancy * 100)}% efectiva`,
      evidence:
        "La agenda comprometida no se convierte completa en horas atendidas.",
      id: `${closure.id}-agenda-gap`,
      impact: "Capacidad reservada sin produccion real.",
      kpiId: "brecha_conversion",
      period: closure.period,
      priority: "alta",
      recommendation:
        "Factores a revisar: confirmacion previa, lista de espera y causa de citas sin atencion.",
      title: "Agenda alta con conversion efectiva baja",
      whatHappened: "La ocupacion agendada supera a la ocupacion efectiva.",
    });
  }

  if (noShow?.status === "incumplido" || noShow?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${formatComparisonValue(noShow)} vs meta ${noShow.targetValue === null ? "sin meta" : `${Math.round(noShow.targetValue * 100)}%`}`,
      evidence:
        "El no-show se calcula desde citas no asistidas sobre citas agendadas.",
      id: `${closure.id}-no-show`,
      impact: "Riesgo de horas perdidas e ingreso no capturado.",
      kpiId: "tasa_no_show",
      period: closure.period,
      priority: noShow.status === "incumplido" ? "critica" : "alta",
      recommendation:
        "Factores a revisar: confirmacion 24 horas antes y recuperacion con lista de espera.",
      title: "No-show sobre meta",
      whatHappened: "La tasa de no-show supero el maximo aprobado.",
    });
  }

  if (revenue?.status === "incumplido" || revenue?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${formatComparisonValue(revenue)} vs meta ${revenue.targetValue === null ? "sin meta" : `$${Math.round(revenue.targetValue).toLocaleString("en-US")}`}`,
      evidence:
        "La facturacion proviene del cierre publicado y la meta aprobada del periodo.",
      id: `${closure.id}-revenue`,
      impact:
        revenue.variation === null
          ? "No se puede cuantificar brecha."
          : `$${Math.abs(Math.round(revenue.variation)).toLocaleString("en-US")} de brecha contra meta.`,
      kpiId: "facturacion_neta",
      period: closure.period,
      priority: revenue.status === "incumplido" ? "critica" : "alta",
      recommendation:
        "Factores a revisar: origen de ordenes, sesiones completadas y ticket promedio.",
      title: "Venta debajo de meta",
      whatHappened: "La facturacion publicada quedo debajo de la meta.",
    });
  }

  if (margin?.status === "incumplido" || margin?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${formatComparisonValue(margin)} vs meta ${margin.targetValue === null ? "sin meta" : `$${Math.round(margin.targetValue).toLocaleString("en-US")}`}`,
      evidence:
        "El margen de contribucion se calcula como facturacion menos costos directos.",
      id: `${closure.id}-margin`,
      impact:
        marginRate === null
          ? "Margen porcentual no calculable."
          : `Margen porcentual ${Math.round(marginRate * 100)}%.`,
      kpiId: "margen_contribucion",
      period: closure.period,
      priority: "alta",
      recommendation:
        "Factores a revisar: costos directos, compras extraordinarias y mix de servicios.",
      title: "Margen debajo de meta",
      whatHappened: "La contribucion quedo por debajo del nivel esperado.",
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
      comparison: `Venta actual $${Math.round(closure.inputs.revenueTotal).toLocaleString("en-US")} vs anterior $${Math.round(previousClosure.inputs.revenueTotal).toLocaleString("en-US")}; margen actual $${Math.round(currentMargin).toLocaleString("en-US")} vs anterior $${Math.round(previousMargin).toLocaleString("en-US")}`,
      evidence:
        "Comparacion deterministica entre cierre publicado actual y cierre publicado anterior de la misma sucursal.",
      id: `${closure.id}-revenue-up-margin-down`,
      impact: "Crecimiento con deterioro de rentabilidad.",
      kpiId: "margen_contribucion",
      period: closure.period,
      priority: "alta",
      recommendation:
        "Factores a revisar: costos directos, mix de servicios y promociones antes de concluir causalidad.",
      title: "Venta crece pero margen cae",
      whatHappened:
        "La facturacion subio frente al periodo anterior, pero el margen de contribucion bajo.",
    });
  }

  const occupancyActual = occupancy?.actualValue ?? null;
  const occupancyTarget = occupancy?.targetValue ?? null;

  if (occupancyActual !== null && occupancyTarget !== null && occupancyActual < 0.65) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${Math.round(occupancyActual * 100)}% de ocupacion efectiva`,
      evidence:
        "La ocupacion efectiva usa horas atendidas sobre horas disponibles.",
      id: `${closure.id}-idle-capacity`,
      impact: "Capacidad ociosa con espacio para recuperar produccion.",
      kpiId: "ocupacion_efectiva",
      period: closure.period,
      priority: "media",
      recommendation:
        "Factores a revisar: demanda por franja, agenda de continuidad y disponibilidad de fisioterapeutas.",
      title: "Capacidad ociosa",
      whatHappened: "La sucursal uso menos capacidad clinica de la esperada.",
    });
  }

  if (
    revenue?.status === "cumplido" &&
    occupancy?.status === "cumplido" &&
    noShow?.status === "cumplido" &&
    margin?.status === "cumplido"
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: "Venta, ocupacion, no-show y margen cumplen simultaneamente.",
      evidence:
        "Los indicadores principales se calculan desde el mismo cierre publicado.",
      id: `${closure.id}-positive`,
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
  closures: PhysiotherapyClosure[],
): PhysiotherapyBranchSummary[] {
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
      closureId: closure.id,
      contributionMargin:
        closure.inputs.revenueTotal - closure.inputs.directCosts,
      dataQualityScore: closure.dataQualityScore,
      effectiveOccupancy: getKpiValue(closure.kpiResults, "ocupacion_efectiva"),
      managerName: closure.scope.managerName,
      noShowRate: getKpiValue(closure.kpiResults, "tasa_no_show"),
      patients: closure.inputs.patientsAttended,
      period: closure.period,
      revenue: closure.inputs.revenueTotal,
      revenueCompliance: revenueComparison?.complianceRate ?? null,
      revenueTarget: revenueComparison?.targetValue ?? null,
      sessions: closure.inputs.sessionsTotal,
      status: closure.validation.state,
    };
  });
}

function getLatestPublishedPeriod(closures: PhysiotherapyClosure[]) {
  return (
    closures
      .filter((closure) => closure.status === "published")
      .sort((left, right) => right.period.localeCompare(left.period))[0]
      ?.period ?? currentDemoPeriod
  );
}

function currentPeriodStatus(
  closures: PhysiotherapyClosure[],
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
  direction: PhysiotherapyTargetDirection;
  id: string;
  is_demo: boolean;
  kpi_id: PhysiotherapyTargetableKpiId;
  label: string;
  period_month: Date | string;
  status: PhysiotherapyTargetLifecycleStatus;
  target_max_value: string | number | null;
  target_min_value: string | number | null;
  target_value: string | number;
  unit: PhysiotherapyTarget["unit"];
  version: number;
};

type DbClosureRow = {
  appointments_cancelled: string | number | null;
  appointments_completed: string | number | null;
  appointments_scheduled: string | number | null;
  attended_hours: string | number | null;
  available_hours: string | number | null;
  branch_id: string;
  closure_observations: string | null;
  company_id: string;
  country_id: string;
  created_at: Date | string;
  data_quality_score: string | number;
  direct_costs: string | number | null;
  errors: unknown;
  id: string;
  is_demo: boolean;
  monthly_closing_id: string;
  no_show_appointments: string | number | null;
  orders_total: string | number | null;
  patients_attended: string | number | null;
  period_month: Date | string;
  physiotherapists_active: string | number | null;
  published_at: Date | string | null;
  published_by_email: string | null;
  revenue_total: string | number | null;
  scheduled_hours: string | number | null;
  sessions_total: string | number | null;
  source_lineage: unknown;
  status: DbMonthlyClosingStatus;
  submitted_by_email: string;
  superseded_by_version_id: string | null;
  supersedes_version_id: string | null;
  updated_at: Date | string;
  validated_at: Date | string | null;
  validation_state: PhysiotherapyValidationState | null;
  version_number: number;
  warnings: unknown;
};

type DbAuditRow = {
  action: PhysiotherapyClosureAction;
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
  auditEvents: PhysiotherapyAuditEvent[];
  branches: PhysiotherapyClosureScope[];
  closures: PhysiotherapyClosure[];
  targets: PhysiotherapyTarget[];
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
): PhysiotherapyClosureStatus {
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
  validation: PhysiotherapyClosure["validation"],
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

function readValidationIssues(value: unknown): PhysiotherapyValidationIssue[] {
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
            ? (record.field as PhysiotherapyValidationIssue["field"])
            : undefined,
        message,
        severity,
      },
    ];
  });
}

function dbSourceLineage(value: unknown) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as PhysiotherapyClosure["sourceLineage"];
  }

  return sourceLineage();
}

function branchRowToScope(row: DbBranchRow): PhysiotherapyClosureScope {
  return {
    areaManagerName:
      row.area_manager_name ??
      row.operational_area_name ??
      "Gerente de area pendiente",
    branchCode: row.code,
    branchId: row.id,
    branchName: row.name,
    businessLine: "PHYSIOTHERAPY",
    companyId: row.company_id,
    companyName: row.company_name,
    countryId: row.country_id,
    countryName: row.country_name,
    managerName: row.branch_manager_name ?? "Gerente de sucursal pendiente",
    operationalAreaId: row.operational_area_id,
    organizationId: row.organization_id,
  };
}

function targetRowToTarget(row: DbTargetRow): PhysiotherapyTarget {
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
  scope: PhysiotherapyClosureScope,
): PhysiotherapyClosure {
  const validationState = row.validation_state ?? "BLOQUEADO";

  return {
    auditEvents: [],
    createdAt: isoString(row.created_at) ?? nowIso(),
    createdBy: row.submitted_by_email,
    dataQualityScore: dbNumber(row.data_quality_score),
    duplicateOfClosureId: null,
    id: row.id,
    inputs: {
      appointmentsCancelled: dbNumber(row.appointments_cancelled),
      appointmentsCompleted: dbNumber(row.appointments_completed),
      appointmentsScheduled: dbNumber(row.appointments_scheduled),
      attendedHours: dbNumber(row.attended_hours),
      availableHours: dbNumber(row.available_hours),
      closureObservations: row.closure_observations ?? "",
      directCosts: dbNumber(row.direct_costs),
      ordersTotal: dbNumber(row.orders_total),
      patientsAttended: dbNumber(row.patients_attended),
      physiotherapistsActive: dbNumber(row.physiotherapists_active),
      revenueTotal: dbNumber(row.revenue_total),
      scheduledHours: dbNumber(row.scheduled_hours),
      sessionsTotal: dbNumber(row.sessions_total),
      noShowAppointments: dbNumber(row.no_show_appointments),
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
      where co.unit_type = 'fisioterapia'
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
      where business_line = 'PHYSIOTHERAPY'
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
  branches: PhysiotherapyClosureScope[],
  targets: PhysiotherapyTarget[],
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
        pci.revenue_total,
        pci.orders_total,
        pci.sessions_total,
        pci.patients_attended,
        pci.direct_costs,
        pci.physiotherapists_active,
        pci.appointments_scheduled,
        pci.appointments_completed,
        pci.appointments_cancelled,
        pci.no_show_appointments,
        pci.available_hours,
        pci.scheduled_hours,
        pci.attended_hours,
        pci.closure_observations,
        pci.source_lineage,
        cvr.validation_state,
        cvr.errors,
        cvr.warnings
      from public.closing_versions cv
      join public.monthly_closings mc on mc.id = cv.monthly_closing_id
      left join public.physiotherapy_closing_inputs pci
        on pci.closing_version_id = cv.id
      left join public.closing_validation_results cvr
        on cvr.closing_version_id = cv.id
      where cv.business_line = 'PHYSIOTHERAPY'
        and cv.branch_id = any($1::uuid[])
      order by cv.period_month desc, cv.version_number desc
    `,
    [branchIds],
  );
  const baseClosures = result.rows.flatMap((row) => {
    const scope = branchMap.get(row.branch_id);

    return scope ? [closureRowToClosure(row, scope)] : [];
  });
  const store: PhysiotherapyStore = {
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
      where business_line = 'PHYSIOTHERAPY'
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
): PhysiotherapyWorkspace {
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
  closure: PhysiotherapyClosure,
  action: PhysiotherapyClosureAction,
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
  closure: PhysiotherapyClosure,
  allClosures: PhysiotherapyClosure[],
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
          'PHYSIOTHERAPY',
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
    throw new Error("Sucursal de Fisioterapia no encontrada o fuera de alcance.");
  }

  await assertBranchReadyForOperationalData({
    actor,
    branchId,
    client,
    operationLabel: "cargar datos de Fisioterapia",
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

async function savePostgresPhysiotherapyClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  assertWritableRole(actor);

  return withPostgresTransaction(actor, async (client) => {
    const payload = (typeof rawPayload === "object" && rawPayload !== null
      ? rawPayload
      : {}) as PhysiotherapyDraftPayload;
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
        values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'PHYSIOTHERAPY', $5::date, $6::uuid, $7)
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
            'PHYSIOTHERAPY',
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
        insert into public.physiotherapy_closing_inputs (
          closing_version_id,
          revenue_total,
          orders_total,
          sessions_total,
          patients_attended,
          direct_costs,
          physiotherapists_active,
          appointments_scheduled,
          appointments_completed,
          appointments_cancelled,
          no_show_appointments,
          available_hours,
          scheduled_hours,
          attended_hours,
          closure_observations,
          source_lineage
        )
        values (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb
        )
        on conflict (closing_version_id) do update set
          revenue_total = excluded.revenue_total,
          orders_total = excluded.orders_total,
          sessions_total = excluded.sessions_total,
          patients_attended = excluded.patients_attended,
          direct_costs = excluded.direct_costs,
          physiotherapists_active = excluded.physiotherapists_active,
          appointments_scheduled = excluded.appointments_scheduled,
          appointments_completed = excluded.appointments_completed,
          appointments_cancelled = excluded.appointments_cancelled,
          no_show_appointments = excluded.no_show_appointments,
          available_hours = excluded.available_hours,
          scheduled_hours = excluded.scheduled_hours,
          attended_hours = excluded.attended_hours,
          closure_observations = excluded.closure_observations,
          source_lineage = excluded.source_lineage
      `,
      [
        versionId,
        numberOrNull(inputs.revenueTotal),
        numberOrNull(inputs.ordersTotal),
        numberOrNull(inputs.sessionsTotal),
        numberOrNull(inputs.patientsAttended),
        numberOrNull(inputs.directCosts),
        numberOrNull(inputs.physiotherapistsActive),
        numberOrNull(inputs.appointmentsScheduled),
        numberOrNull(inputs.appointmentsCompleted),
        numberOrNull(inputs.appointmentsCancelled),
        numberOrNull(inputs.noShowAppointments),
        numberOrNull(inputs.availableHours),
        numberOrNull(inputs.scheduledHours),
        numberOrNull(inputs.attendedHours),
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
        ? "Autosave de borrador Fisioterapia."
        : "Borrador creado desde formulario Fisioterapia.",
    );

    return closure;
  });
}

async function validatePostgresPhysiotherapyClosureDraft(
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

async function publishPostgresPhysiotherapyClosure(
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

async function upsertPostgresPhysiotherapyTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (!canManageTargets(actor)) {
    throw new Error("Este rol no puede configurar metas.");
  }

  return withPostgresTransaction(actor, async (client) => {
    const payload = (typeof rawPayload === "object" && rawPayload !== null
      ? rawPayload
      : {}) as PhysiotherapyTargetPayload;
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
          and business_line = 'PHYSIOTHERAPY'
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
          'PHYSIOTHERAPY',
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
          'PHYSIOTHERAPY',
          $5::date,
          $6::uuid,
          $7,
          'target.changed',
          'Meta Fisioterapia guardada.',
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

function getDemoPhysiotherapyWorkspace(
  actor: AuthorizationActor,
  options: { period?: string } = {},
): PhysiotherapyWorkspace {
  const branches = getPhysiotherapyBranchesForActor(actor);
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

export async function getPhysiotherapyWorkspace(
  actor: AuthorizationActor,
  options: { period?: string } = {},
): Promise<PhysiotherapyWorkspace> {
  if (shouldUsePostgresPersistence()) {
    return withPostgresClient(actor, async (client) =>
      buildWorkspaceFromContext(
        actor,
        await getPostgresContext(client, actor),
        options,
      ),
    );
  }

  return getDemoPhysiotherapyWorkspace(actor, options);
}

export async function savePhysiotherapyClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (shouldUsePostgresPersistence()) {
    return savePostgresPhysiotherapyClosureDraft(actor, rawPayload);
  }

  return saveDemoPhysiotherapyClosureDraft(actor, rawPayload);
}

export async function validatePhysiotherapyClosureDraft(
  actor: AuthorizationActor,
  closureId: string,
) {
  if (shouldUsePostgresPersistence()) {
    return validatePostgresPhysiotherapyClosureDraft(actor, closureId);
  }

  return validateDemoPhysiotherapyClosureDraft(actor, closureId);
}

export async function publishPhysiotherapyClosure(
  actor: AuthorizationActor,
  closureId: string,
) {
  if (shouldUsePostgresPersistence()) {
    return publishPostgresPhysiotherapyClosure(actor, closureId);
  }

  return publishDemoPhysiotherapyClosure(actor, closureId);
}

export async function upsertPhysiotherapyTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (shouldUsePostgresPersistence()) {
    return upsertPostgresPhysiotherapyTarget(actor, rawPayload);
  }

  return upsertDemoPhysiotherapyTarget(actor, rawPayload);
}

export function getPhysiotherapyTargetDefinitions() {
  return targetableKpis;
}
