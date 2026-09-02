export type RawClosingResponses = Record<string, unknown>;

export type AttachmentKpiSource = {
  attachmentId: string;
  warningCodes?: string[];
  matchedBranch?: {
    rowCount?: number | null;
    totalSales?: number | null;
    uniqueDoctors?: number | null;
    uniqueExams?: number | null;
    minDate?: string | null;
    maxDate?: string | null;
  } | null;
};

export type CalculatedKpi = {
  code: string;
  name: string;
  category: string;
  value: number;
  numerator: number | null;
  denominator: number | null;
  unit: string;
  formulaVersion: string;
  sourceNote: string;
  dataStatus: "CALCULATED" | "AVAILABLE";
  sourceAttachmentId: string | null;
  validationCodes: string[];
  transformationSteps: string[];
};

function numberValue(values: RawClosingResponses, key: string) {
  const raw = values[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstNumber(values: RawClosingResponses, ...keys: string[]) {
  for (const key of keys) {
    const value = numberValue(values, key);
    if (value !== null) return value;
  }
  return null;
}

function ratio(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return numerator / denominator;
}

function calculated(
  base: Omit<CalculatedKpi, "dataStatus" | "sourceAttachmentId" | "validationCodes" | "transformationSteps">,
  options: Partial<Pick<CalculatedKpi, "dataStatus" | "sourceAttachmentId" | "validationCodes" | "transformationSteps">> = {},
): CalculatedKpi {
  return {
    ...base,
    dataStatus: options.dataStatus ?? "CALCULATED",
    sourceAttachmentId: options.sourceAttachmentId ?? null,
    validationCodes: options.validationCodes ?? [],
    transformationSteps: options.transformationSteps ?? ["manual_submission", "approved_formula"],
  };
}

function percentKpi(
  code: string,
  name: string,
  category: string,
  numerator: number | null,
  denominator: number | null,
  formulaVersion: string,
  sourceNote: string,
): CalculatedKpi | null {
  const result = ratio(numerator, denominator);
  if (result === null) return null;
  return calculated({
    code,
    name,
    category,
    value: result * 100,
    numerator,
    denominator,
    unit: "%",
    formulaVersion,
    sourceNote,
  });
}

function reportedKpi({ code, name, category, value, unit, field }: {
  code: string;
  name: string;
  category: string;
  value: number | null;
  unit: string;
  field: string;
}) {
  if (value === null) return null;
  return calculated({
    code,
    name,
    category,
    value,
    numerator: value,
    denominator: null,
    unit,
    formulaVersion: `${field}:reported:v1`,
    sourceNote: "Valor agregado reportado en el formulario mensual y conservado con su versión.",
  }, { dataStatus: "AVAILABLE", transformationSteps: ["manual_submission", "reported_value"] });
}

/**
 * Calculates only KPIs backed by explicit form fields or an approved aggregate
 * report parser. Missing inputs omit the KPI instead of inventing zeroes.
 */
export function calculateOfficialKpis(
  values: RawClosingResponses,
  attachment?: AttachmentKpiSource | null,
): CalculatedKpi[] {
  const availableMinutes = firstNumber(values, "available_minutes")
    ?? (() => {
      const hours = firstNumber(values, "available_hours");
      return hours === null ? null : hours * 60;
    })();
  const scheduledMinutes = firstNumber(values, "scheduled_minutes");
  const attendedMinutes = firstNumber(values, "attended_minutes")
    ?? (() => {
      const hours = firstNumber(values, "used_hours");
      return hours === null ? null : hours * 60;
    })();

  const applicableScheduled = firstNumber(values, "applicable_scheduled_appointments", "appointments_scheduled");
  const completedAppointments = firstNumber(values, "completed_appointments", "appointments_completed");
  const noShows = firstNumber(values, "no_show_appointments", "appointments_no_show");
  const cancellations = firstNumber(values, "cancelled_appointments", "appointments_cancelled");
  const rescheduled = firstNumber(values, "rescheduled_appointments", "appointments_rescheduled");

  const netRevenue = firstNumber(values, "net_revenue", "lab_total_sales");
  const directCosts = firstNumber(values, "direct_costs", "lab_cost_of_sale");
  const revenueTarget = firstNumber(values, "revenue_target", "lab_financial_target");

  const output: Array<CalculatedKpi | null> = [];

  const scheduledOccupancy = percentKpi(
    "scheduled_occupancy",
    "Ocupación programada",
    "capacity",
    scheduledMinutes,
    availableMinutes,
    "scheduled_minutes/available_minutes:v1",
    "Calculado únicamente cuando existen minutos programados y capacidad disponible.",
  );
  output.push(scheduledOccupancy);

  const effectiveOccupancy = percentKpi(
    "effective_occupancy",
    "Ocupación efectiva",
    "capacity",
    attendedMinutes,
    availableMinutes,
    attendedMinutes !== null && numberValue(values, "attended_minutes") === null
      ? "used_hours/available_hours:v1"
      : "attended_minutes/available_minutes:v1",
    "Usa capacidad realmente atendida/utilizada sobre capacidad disponible.",
  );
  output.push(effectiveOccupancy);

  if (scheduledOccupancy && effectiveOccupancy) {
    output.push(calculated({
      code: "attendance_gap",
      name: "Brecha de asistencia",
      category: "capacity",
      value: scheduledOccupancy.value - effectiveOccupancy.value,
      numerator: null,
      denominator: null,
      unit: "%",
      formulaVersion: "scheduled_occupancy-effective_occupancy:v1",
      sourceNote: "Diferencia entre ocupación programada y efectiva.",
    }));
  }

  output.push(
    percentKpi("completion_rate", "Tasa de finalización", "appointments", completedAppointments, applicableScheduled, "completed/applicable_scheduled:v1", "No incluye citas futuras en cumplimiento histórico."),
    percentKpi("no_show_rate", "Tasa de no-show", "appointments", noShows, applicableScheduled, "no_show/applicable_scheduled:v1", "No incluye citas futuras en cumplimiento histórico."),
    percentKpi("cancellation_rate", "Tasa de cancelación", "appointments", cancellations, applicableScheduled, "cancelled/applicable_scheduled:v1", "No incluye citas futuras en cumplimiento histórico."),
    percentKpi("reschedule_rate", "Tasa de reprogramación", "appointments", rescheduled, applicableScheduled, "rescheduled/applicable_scheduled:v1", "No incluye citas futuras en cumplimiento histórico."),
    percentKpi("appointment_success_rate", "Éxito de citas", "appointments", completedAppointments, applicableScheduled, "completed/applicable_scheduled:v1", "Mismo contrato de finalización definido para appointment success."),
  );

  if (netRevenue !== null && directCosts !== null) {
    const contribution = netRevenue - directCosts;
    output.push(calculated({
      code: "estimated_contribution_margin",
      name: "Margen de contribución estimado",
      category: "finance",
      value: contribution,
      numerator: contribution,
      denominator: null,
      unit: "USD",
      formulaVersion: "reported_revenue-direct_costs:v1",
      sourceNote: "No equivale a utilidad neta. Se calcula únicamente porque existen ingresos y costos directos reportados.",
    }));

    const contributionRate = ratio(contribution, netRevenue);
    if (contributionRate !== null) {
      output.push(calculated({
        code: "estimated_contribution_margin_pct",
        name: "Margen de contribución estimado %",
        category: "finance",
        value: contributionRate * 100,
        numerator: contribution,
        denominator: netRevenue,
        unit: "%",
        formulaVersion: "(reported_revenue-direct_costs)/reported_revenue:v1",
        sourceNote: "No equivale a margen neto ni utilidad neta.",
      }));
    }
  }

  output.push(percentKpi(
    "revenue_target_achievement",
    "Cumplimiento de meta de ingreso",
    "finance",
    netRevenue,
    revenueTarget,
    "reported_revenue/revenue_target:v1",
    "Compara el ingreso reportado del mismo cierre con su meta aprobada.",
  ));

  output.push(
    reportedKpi({ code: "lab_total_orders", name: "Órdenes totales de laboratorio", category: "laboratory", value: firstNumber(values, "lab_total_orders"), unit: "ordenes", field: "lab_total_orders" }),
    reportedKpi({ code: "lab_total_clients", name: "Clientes totales de laboratorio", category: "laboratory", value: firstNumber(values, "lab_total_clients"), unit: "clientes", field: "lab_total_clients" }),
  );

  const matched = attachment?.matchedBranch ?? null;
  const attachmentOptions = attachment?.attachmentId
    ? {
        sourceAttachmentId: attachment.attachmentId,
        validationCodes: attachment.warningCodes ?? [],
        transformationSteps: ["medical_exam_sales_report", "aggregate_selected_branch", "approved_formula"],
      }
    : null;

  if (matched && attachmentOptions) {
    const reportSales = typeof matched.totalSales === "number" && Number.isFinite(matched.totalSales) ? matched.totalSales : null;
    const reportRows = typeof matched.rowCount === "number" && Number.isFinite(matched.rowCount) ? matched.rowCount : null;
    const uniqueDoctors = typeof matched.uniqueDoctors === "number" && Number.isFinite(matched.uniqueDoctors) ? matched.uniqueDoctors : null;
    const uniqueExams = typeof matched.uniqueExams === "number" && Number.isFinite(matched.uniqueExams) ? matched.uniqueExams : null;

    if (reportSales !== null) output.push(calculated({
      code: "lab_medical_exam_report_sales",
      name: "Venta en reporte de exámenes médicos",
      category: "laboratory",
      value: reportSales,
      numerator: reportSales,
      denominator: null,
      unit: "USD",
      formulaVersion: "sum(report.total):v1",
      sourceNote: "Suma de Total únicamente para la sucursal del cierre, extraída del reporte estructurado adjunto.",
    }, attachmentOptions));
    if (reportRows !== null) output.push(calculated({
      code: "lab_medical_exam_report_rows",
      name: "Registros de exámenes médicos",
      category: "laboratory",
      value: reportRows,
      numerator: reportRows,
      denominator: null,
      unit: "registros",
      formulaVersion: "count(report.rows):v1",
      sourceNote: "Registros válidos del reporte estructurado para la sucursal del cierre.",
    }, attachmentOptions));
    if (uniqueDoctors !== null) output.push(calculated({
      code: "lab_medical_exam_unique_doctors",
      name: "Médicos únicos en reporte",
      category: "laboratory",
      value: uniqueDoctors,
      numerator: uniqueDoctors,
      denominator: null,
      unit: "medicos",
      formulaVersion: "count(distinct report.doctor):v1",
      sourceNote: "Conteo agregado de médicos distintos para la sucursal del cierre. No se persisten nombres en el KPI.",
    }, attachmentOptions));
    if (uniqueExams !== null) output.push(calculated({
      code: "lab_medical_exam_unique_exams",
      name: "Exámenes únicos en reporte",
      category: "laboratory",
      value: uniqueExams,
      numerator: uniqueExams,
      denominator: null,
      unit: "examenes",
      formulaVersion: "count(distinct report.exam):v1",
      sourceNote: "Conteo agregado de exámenes distintos para la sucursal del cierre.",
    }, attachmentOptions));
    if (reportSales !== null && netRevenue !== null) {
      const coverage = percentKpi(
        "lab_report_sales_coverage_pct",
        "Cobertura del reporte vs venta total",
        "quality",
        reportSales,
        netRevenue,
        "report_sales/lab_total_sales:v1",
        "Control de cobertura entre reporte y venta total; no representa una meta.",
      );
      if (coverage) output.push({ ...coverage, ...attachmentOptions });
    }
  }

  return output.filter((item): item is CalculatedKpi => item !== null);
}
