import {
  elSalvadorBranchResultTemplates,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
import {
  calculateAppointmentRates,
  calculateOccupancy,
  formatPercent,
  formatPercentagePoints,
} from "@/lib/analytics/operations";

export type AppointmentStatusRow = {
  status: string;
  count: number;
  qualityNote: string;
};

export type CapacityRow = {
  branch: string;
  company: string;
  availableMinutes: number;
  scheduledMinutes: number;
  attendedMinutes: number;
};

export type BranchPerformanceRow = {
  branch: string;
  country: string;
  company: string;
  manager: string;
  capacitySize: string;
  dataQuality: number;
  revenueTarget: number;
  operatingTarget: number;
};

export type ManagerPerformanceRow = {
  manager: string;
  country: string;
  company: string;
  branch: string;
  capacityAdjustedIndex: number | null;
  strengths: string[];
  alerts: string[];
  dataQuality: number;
};

export const appointmentStatusRows: AppointmentStatusRow[] = [
  {
    status: "completed",
    count: 4876,
    qualityNote: "Mapeado desde estados completados DEMO",
  },
  {
    status: "cancelled_by_patient",
    count: 224,
    qualityNote: "Cancelaciones por paciente DEMO",
  },
  {
    status: "cancelled_by_branch",
    count: 94,
    qualityNote: "Cancelaciones por sucursal DEMO",
  },
  {
    status: "no_show",
    count: 224,
    qualityNote: "Inasistencias DEMO",
  },
  {
    status: "rescheduled",
    count: 412,
    qualityNote: "Reprogramaciones DEMO",
  },
  {
    status: "unknown",
    count: 18,
    qualityNote: "Revisar mapeo de origen",
  },
];

export const capacityRows: CapacityRow[] = [
  {
    branch: "Sucursal DEMO Fisioterapia Norte",
    company: "Analiza Fisioterapia",
    availableMinutes: 9600,
    scheduledMinutes: 7680,
    attendedMinutes: 6720,
  },
  {
    branch: "Sucursal DEMO Laboratorio Central",
    company: "Analiza Laboratorio",
    availableMinutes: 8400,
    scheduledMinutes: 6300,
    attendedMinutes: 5880,
  },
  {
    branch: "Sucursal DEMO Imagenes Este",
    company: "Analiza Imagenes",
    availableMinutes: 7200,
    scheduledMinutes: 5040,
    attendedMinutes: 4380,
  },
];

export const branchPerformanceRows: BranchPerformanceRow[] =
  elSalvadorBranchResultTemplates.map((row) => ({
    branch: row.branchName,
    country: "El Salvador",
    company: "Analiza Laboratorio",
    manager: row.manager,
    capacitySize: `${row.rowCounts.salesRows.toLocaleString("en-US")} ventas cargadas`,
    dataQuality: row.dataQualityScore,
    revenueTarget: Math.round(row.revenueCompletionRate * 100),
    operatingTarget: Math.round(row.marginRate * 100),
  }));

export const managerPerformanceRows: ManagerPerformanceRow[] =
  elSalvadorBranchResultTemplates.map((row) => ({
    manager: row.manager,
    country: "El Salvador",
    company: "Analiza Laboratorio",
    branch: row.branchName,
    capacityAdjustedIndex:
      row.dataQualityScore < 78
        ? null
        : Math.round(
            row.revenueCompletionRate * 50 +
              row.marginRate * 30 +
              (row.dataQualityScore / 100) * 20,
          ),
    strengths: [
      row.revenueCompletionRate >= 1 ? "Meta de venta" : "Seguimiento de meta",
      `Margen ${formatRate(row.marginRate)}`,
    ],
    alerts: row.validationFlags.slice(0, 2),
    dataQuality: row.dataQualityScore,
  }));

export const appointmentRateSummary = calculateAppointmentRates({
  scheduledApplicable: 5830,
  completed: 4876,
  cancelled: 318,
  noShow: 224,
  rescheduled: 412,
});

export function getCapacityViewRows() {
  return capacityRows.map((row) => {
    const occupancy = calculateOccupancy(row);

    return {
      ...row,
      availableHours: `${Math.round(row.availableMinutes / 60)} h`,
      scheduledOccupancy: formatPercent(occupancy.scheduledOccupancy),
      effectiveOccupancy: formatPercent(occupancy.effectiveOccupancy),
      attendanceGap: formatPercentagePoints(occupancy.attendanceGap),
    };
  });
}
