export type CalculatedKpi =
  | { status: "CALCULABLE"; value: number }
  | { status: "NOT_CALCULABLE"; value: null; reason: string };

export function safeDivide(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  reason = "Faltan datos esenciales para calcular este indicador.",
): CalculatedKpi {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return { status: "NOT_CALCULABLE", value: null, reason };
  }

  const value = numerator / denominator;
  return Number.isFinite(value)
    ? { status: "CALCULABLE", value }
    : { status: "NOT_CALCULABLE", value: null, reason };
}

export function calculateAbsoluteMargin(
  netRevenue: number | null | undefined,
  costOfSales: number | null | undefined,
): CalculatedKpi {
  if (
    netRevenue === null ||
    netRevenue === undefined ||
    costOfSales === null ||
    costOfSales === undefined ||
    !Number.isFinite(netRevenue) ||
    !Number.isFinite(costOfSales)
  ) {
    return {
      status: "NOT_CALCULABLE",
      value: null,
      reason: "Requiere venta sin IVA y costo de venta válidos.",
    };
  }

  return { status: "CALCULABLE", value: netRevenue - costOfSales };
}

export function calculateMarginRate(
  netRevenue: number | null | undefined,
  costOfSales: number | null | undefined,
): CalculatedKpi {
  const margin = calculateAbsoluteMargin(netRevenue, costOfSales);
  return margin.status === "CALCULABLE"
    ? safeDivide(
        margin.value,
        netRevenue,
        "Requiere venta sin IVA mayor que cero y costo de venta válido.",
      )
    : margin;
}

export function displayKpi(
  kpi: CalculatedKpi,
  formatter: (value: number) => string,
) {
  return kpi.status === "CALCULABLE" ? formatter(kpi.value) : "No calculable";
}
