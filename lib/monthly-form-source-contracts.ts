import type {
  ImportBusinessLine,
  ManualMonthlyFormField,
  ManualMonthlyFormInputType,
  ManualMonthlyFormStep,
} from "@/lib/analytics/import-operations";

export const monthlyFormContractVersions = {
  Laboratorio: "laboratory-production-v1",
  Fisioterapia: "physiotherapy-yellow-2026-09-v2",
  Imagenes: "imaging-yellow-2026-09-v2",
} as const satisfies Record<Exclude<ImportBusinessLine, "Consolidado">, string>;

export const monthlyFormSourceContracts = {
  Fisioterapia: {
    version: monthlyFormContractVersions.Fisioterapia,
    sha256: "7B21A90417B094684690BA075F6406D2DEA93FEA5BF97A75EF534AAA385FA759",
    sheet: "Fisioterapia",
    expectedBusinessFields: 58,
  },
  Imagenes: {
    version: monthlyFormContractVersions.Imagenes,
    sha256: "B2A8FB5806E7D6998877CF3297CE56734070FBD5F16A305A30517A5D1DEADFC0",
    sheet: "EVALUACION",
    expectedBusinessFields: 44,
  },
} as const;

type SourceLine = keyof typeof monthlyFormSourceContracts;
type SourceFieldOptions = {
  displayLabel?: string;
  description?: string;
  hiddenRow?: boolean;
  min?: number;
  max?: number;
  aliases?: string[];
  decisionIds?: string[];
  hasSourceDerivation?: boolean;
};

type SourceFieldSpec = readonly [
  labelCell: string,
  id: string,
  sourceLabel: string,
  inputType: ManualMonthlyFormInputType,
  unit: string,
  options?: SourceFieldOptions,
];

function contextFields(line: SourceLine): ManualMonthlyFormField[] {
  const appliesTo: ImportBusinessLine[] = [line];
  return [
    {
      id: "period",
      label: "Mes reportado",
      description: "Periodo seleccionado para este cierre; reemplaza los dos rótulos de mes de la plantilla.",
      inputType: "month",
      unit: "mes",
      required: true,
      placeholder: "2026-09",
      appliesTo,
      source: { labelCell: "A4:A5", sourceLabel: "N.º DE MES / MES", classification: "CONTEXT_YELLOW" },
    },
    {
      id: "branch_reported",
      label: "Sucursal reportada",
      description: "Se obtiene de la asignación activa y se valida en el servidor.",
      inputType: "text",
      unit: "sucursal",
      required: true,
      placeholder: "Sucursal asignada",
      appliesTo,
      source: { labelCell: "A6", sourceLabel: "SUCURSAL", classification: "CONTEXT_YELLOW" },
    },
    {
      id: "manager_name",
      label: "Gerente de sucursal",
      description: "Se obtiene del directorio autorizado; no se escribe un nombre fijo.",
      inputType: "text",
      unit: "responsable",
      required: true,
      placeholder: "Gerente asignado",
      appliesTo,
      source: { labelCell: "A7", sourceLabel: "GERENTE DE SUCURSAL", classification: "CONTEXT_YELLOW" },
    },
    {
      id: "area_manager_name",
      label: "Gerente de área",
      description: "Se obtiene del directorio autorizado; la publicación se bloquea si falta.",
      inputType: "text",
      unit: "responsable",
      required: true,
      placeholder: "Gerente de área asignado",
      appliesTo,
      source: { labelCell: "A8", sourceLabel: "GERENTE DE AREA", classification: "CONTEXT_YELLOW" },
    },
  ];
}

function sourceField(line: SourceLine, spec: SourceFieldSpec): ManualMonthlyFormField {
  const [labelCell, id, sourceLabel, inputType, unit, options = {}] = spec;
  const rowNote = options.hiddenRow
    ? " La fila está oculta en la fuente: complétala únicamente cuando aplique; vacío no equivale a cero."
    : "";
  return {
    id,
    label: options.displayLabel ?? sourceLabel,
    description: `${options.description ?? "Captura manual trazable a la plantilla fuente."}${rowNote}`,
    inputType,
    unit,
    // El color amarillo identifica captura, pero no autoriza por sí solo a
    // convertir el dato en obligatorio. La obligatoriedad queda pendiente de
    // una regla de negocio explícita y versionada.
    required: false,
    placeholder: inputType === "text" ? "Escribe el dato si aplica" : "Dejar vacío si no existe el dato",
    appliesTo: [line],
    ...(options.min === undefined ? {} : { min: options.min }),
    ...(options.max === undefined ? {} : { max: options.max }),
    source: {
      labelCell,
      sourceLabel,
      classification: options.hasSourceDerivation ? "INPUT_YELLOW_WITH_DERIVATION" : "INPUT_YELLOW",
      ...(options.hiddenRow ? { hiddenRow: true } : {}),
      ...(options.aliases ? { aliases: options.aliases } : {}),
      ...(options.decisionIds ? { decisionIds: options.decisionIds } : {}),
    },
  };
}

function step(
  line: SourceLine,
  id: string,
  title: string,
  description: string,
  specs: readonly SourceFieldSpec[],
): ManualMonthlyFormStep {
  return {
    id,
    title,
    description,
    ownerNote: "Los valores se conservan manuales; las fórmulas no aprobadas no se ejecutan.",
    fields: specs.map((spec) => sourceField(line, spec)),
  };
}

const money = "USD";
const count = "cantidad";

const physiotherapySteps: ManualMonthlyFormStep[] = [
  {
    id: "contexto-fisioterapia",
    title: "Contexto del cierre",
    description: "Periodo, sucursal y responsables resueltos desde el contexto autorizado.",
    ownerNote: "Estos datos se validan en el servidor y no se copian de otros usuarios o sucursales.",
    fields: contextFields("Fisioterapia"),
  },
  step("Fisioterapia", "financiero-fisioterapia", "Financiero", "Meta, venta y distribución de pagos de Fisioterapia.", [
    ["A17", "physio_target", "Meta", "currency", money, { min: 0 }],
    ["A19", "physio_sale_dd", "VENTA D.D", "currency", money, { min: 0 }],
    ["A20", "physio_sale_without_vat", "Venta sin IVA", "currency", money, { min: 0, hasSourceDerivation: true, decisionIds: ["FORM-01"] }],
    ["A21", "physio_total_orders_count", "NÚMERO DE ORDENES TOTALES", "number", "órdenes", { min: 0 }],
    ["A23", "physio_card_sales", "Venta en tarjeta", "currency", money, { min: 0 }],
    ["A24", "physio_cash_sales", "Venta en efectivo", "currency", money, { min: 0 }],
    ["A25", "physio_credit_sales", "Venta al crédito", "currency", money, { min: 0 }],
    ["A26", "physio_mixed_sales", "Venta mixto", "currency", money, { min: 0 }],
  ]),
  step("Fisioterapia", "datos-generales-fisioterapia", "Datos generales", "Órdenes, terapias, sesiones, medicamentos y domicilios.", [
    ["A33", "physio_medical_order_sales", "Venta por órdenes médicas", "currency", money, { min: 0 }],
    ["A34", "physio_medical_orders_count", "Número de ordenes médicas", "number", "órdenes", { min: 0 }],
    ["A35", "physio_no_doctor_sales", "Venta por pacientes sin médico", "currency", money, { min: 0, hasSourceDerivation: true, decisionIds: ["FORM-01"] }],
    ["A36", "physio_no_doctor_orders_count", "Número de ordenes sin médico", "number", "órdenes", { min: 0, hasSourceDerivation: true, decisionIds: ["FORM-01"] }],
    ["A37", "physio_muscle_release_sales", "Venta Terapia por Descarga Muscular", "currency", money, { min: 0 }],
    ["A38", "physio_muscle_release_count", "Cantidad terapia por Descargas Musculares", "number", count, { min: 0 }],
    ["A39", "physio_pathology_sales", "Venta Terapia por patologia", "currency", money, { min: 0 }],
    ["A40", "physio_pathology_count", "Cantidad terapia por Patologias", "number", count, { min: 0 }],
    ["A41", "physio_muscle_release_percent", "Terapia por Descargas Musculares (%)", "percent", "%", { min: 0, max: 100, hasSourceDerivation: true, decisionIds: ["FORM-01"] }],
    ["A42", "physio_pathology_percent", "Terapia por Patologias (%)", "percent", "%", { min: 0, max: 100, hasSourceDerivation: true, decisionIds: ["FORM-01"] }],
    ["A43", "therapy_sessions", "Numero de sesiones totales", "number", "sesiones", { min: 0 }],
    ["A44", "physio_courtesy_orders_count", "Numero de ordenes Cortesias", "number", "órdenes", { min: 0 }],
    ["A45", "physio_outreach_orders_count", "Numero de ordenes Jornadas", "number", "órdenes", { min: 0 }],
    ["A46", "physio_paid_orders_count", "Numero de ordenes Pagadas", "number", "órdenes", { min: 0 }],
    ["A48", "physio_medicine_sales", "Venta de Medicamento", "currency", money, { min: 0 }],
    ["A49", "physio_medicine_count", "Cantidad de Medicamento", "number", count, { min: 0 }],
    ["A50", "physio_home_sales", "Venta por domicilios", "currency", money, { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A51", "physio_home_visits_count", "Número de domicilios", "number", "domicilios", { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A52", "physio_mystery_client_note", "Nota de cliente incognito", "text", "nota"],
  ]),
  step("Fisioterapia", "equipos-fisioterapia", "Uso de equipos", "Los siete equipos se capturan por separado; la unidad sigue pendiente de confirmación.", [
    ["A55", "physio_equipment_lymphastim", "Lymphastim o presoterapia", "number", "unidad por confirmar", { decisionIds: ["FORM-06"] }],
    ["A56", "physio_equipment_shockwave", "Terapia de ondas de choque", "number", "unidad por confirmar", { decisionIds: ["FORM-06"] }],
    ["A57", "physio_equipment_high_intensity_laser", "Láser de alta intensidad", "number", "unidad por confirmar", { decisionIds: ["FORM-06"] }],
    ["A58", "physio_equipment_super_inductive", "Sistema súper inductivo con campo", "number", "unidad por confirmar", { decisionIds: ["FORM-06"] }],
    ["A59", "physio_equipment_selective_radiofrequency", "Terapia de radiofrecuencia selectiva", "number", "unidad por confirmar", { decisionIds: ["FORM-06"] }],
    ["A60", "physio_equipment_focused_magnetotherapy", "Magnetoterapia con campos magnéticos focalizados", "number", "unidad por confirmar", { decisionIds: ["FORM-06"] }],
    ["A61", "physio_equipment_electrotherapy_ultrasound", "Equipo combinado de electroterapia avanzada y ultrasonido", "number", "unidad por confirmar", { decisionIds: ["FORM-06"] }],
  ]),
  step("Fisioterapia", "clientes-fisioterapia", "Clientes", "Conteos agregados por segmento, sin datos personales.", [
    ["A64", "physio_athlete_clients_count", "Cantidad de clientes deportistas", "number", "clientes", { min: 0 }],
    ["A65", "physio_senior_clients_count", "Cantidad de clientes 3era Edad", "number", "clientes", { min: 0 }],
    ["A66", "physio_pediatric_clients_count", "Cantidad de clientes Pediatricos", "number", "clientes", { min: 0 }],
    ["A67", "physio_general_public_clients_count", "Cantidad de clientes publico general", "number", "clientes", { min: 0 }],
  ]),
  step("Fisioterapia", "gastos-fisioterapia", "Gastos y utilidad", "Gastos operativos y utilidad reportada por la sucursal.", [
    ["A73", "physio_rent_expense", "Renta Local", "currency", money, { min: 0 }],
    ["A74", "physio_personnel_expense", "Personal", "currency", money, { min: 0 }],
    ["A75", "physio_social_security_expense", "ISSS/AFP", "currency", money, { min: 0 }],
    ["A76", "physio_electricity_expense", "Energia", "currency", money, { min: 0 }],
    ["A77", "physio_water_expense", "Agua", "currency", money, { min: 0 }],
    ["A78", "physio_phone_expense", "Telefono", "currency", money, { min: 0 }],
    ["A79", "physio_internet_expense", "Internet", "currency", money, { min: 0 }],
    ["A80", "physio_misc_expense", "Miscelaneos", "currency", money, { min: 0 }],
    ["A81", "physio_electronic_security_expense", "Seguridad Electrónica", "currency", money, { min: 0 }],
    ["A82", "physio_physical_security_expense", "Seguridad Física", "currency", money, { min: 0 }],
    ["A83", "physio_advertising_expense", "Publicidad", "currency", money, { min: 0 }],
    ["A84", "physio_analiza_cafe_expense", "Analiza_Café", "currency", money, { min: 0 }],
    ["A86", "physio_operating_profit", "Utilidad operativa", "currency", money, { hasSourceDerivation: true, decisionIds: ["FORM-01"] }],
  ]),
  step("Fisioterapia", "personal-fisioterapia", "Personal", "Dotación agregada de la sucursal.", [
    ["A90", "physio_physiotherapists_count", "Fisioterapeutas", "number", "personas", { min: 0 }],
    ["A91", "physio_customer_service_staff_count", "Atención al cliente", "number", "personas", { min: 0 }],
    ["A92", "physio_internship_staff_count", "Pasantia", "number", "personas", { min: 0, aliases: ["Pasantia", "Pasantias"], decisionIds: ["FORM-05"] }],
  ]),
  step("Fisioterapia", "facturacion-fisioterapia", "Facturación", "Captura del usuario visible en la fuente y totales declarados; no se reconstruyen las catorce etiquetas #REF!.", [
    ["A97", "physio_source_user_billed_amount", "erivera", "currency", money, { min: 0, displayLabel: "Facturación del usuario identificado en la fuente", decisionIds: ["FORM-03"] }],
    ["A98", "physio_source_user_invoice_count", "Cantidad de facturas erivera", "number", "facturas", { min: 0, displayLabel: "Cantidad de facturas del usuario identificado en la fuente", decisionIds: ["FORM-03", "CALC-06"] }],
    ["A113", "physio_total_billed_amount", "Total facturado", "currency", money, { min: 0, hasSourceDerivation: true, decisionIds: ["FORM-01", "FORM-03"] }],
    ["A114", "physio_total_invoice_count", "Total cantidad de facturas", "number", "facturas", { min: 0, hasSourceDerivation: true, decisionIds: ["FORM-01", "FORM-03", "CALC-06"] }],
  ]),
];

const imagingSteps: ManualMonthlyFormStep[] = [
  {
    id: "contexto-imagenes",
    title: "Contexto del cierre",
    description: "Periodo, sucursal y responsables resueltos desde el contexto autorizado.",
    ownerNote: "Estos datos se validan en el servidor y no se copian de otros usuarios o sucursales.",
    fields: contextFields("Imagenes"),
  },
  step("Imagenes", "financiero-imagenes", "Financiero", "Meta, venta, telemedicina y distribución de pagos de Imágenes.", [
    ["A19", "imaging_target", "Meta", "currency", money, { min: 0 }],
    ["A21", "imaging_sale_dd", "VENTA D.D", "currency", money, { min: 0 }],
    ["A24", "imaging_telemedicine_patients_count", "Cantidad de pacientes TELEMEDICINA", "number", "pacientes", { min: 0 }],
    ["A25", "imaging_telemedicine_sales", "Venta TELEMEDICINA", "currency", money, { min: 0 }],
    ["A26", "imaging_non_telemedicine_sales", "VENTA NO TELEMEDICINA", "currency", money, { min: 0, hasSourceDerivation: true, decisionIds: ["FORM-01"] }],
    ["A29", "imaging_cash_sales", "Efectivo", "currency", money, { min: 0 }],
    ["A30", "imaging_mixed_sales", "Mixto", "currency", money, { min: 0 }],
    ["A31", "imaging_card_sales", "Tarjeta", "currency", money, { min: 0 }],
    ["A32", "imaging_credit_sales", "Credito", "currency", money, { min: 0 }],
  ]),
  step("Imagenes", "datos-generales-imagenes", "Datos generales", "Órdenes médicas y producción por modalidad diagnóstica.", [
    ["A39", "imaging_medical_order_sales", "Venta por órdenes médicas", "currency", money, { min: 0 }],
    ["A40", "imaging_medical_orders_count", "Número de ordenes médicas", "number", "órdenes", { min: 0 }],
    ["A41", "imaging_rx_sales", "Venta por RX", "currency", money, { min: 0 }],
    ["A42", "imaging_rx_count", "Cantidad de RX", "number", "estudios", { min: 0 }],
    ["A43", "imaging_extra_plates_sales", "Venta por Placas extras", "currency", money, { min: 0 }],
    ["A44", "imaging_extra_plates_count", "Cantidad Placas extras", "number", "placas", { min: 0 }],
    ["A45", "imaging_ct_sales", "Venta total TAC", "currency", money, { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A46", "imaging_ct_count", "Cantidad de TAC", "number", "estudios", { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A47", "imaging_ultrasound_sales", "Venta de Ultrasonografias", "currency", money, { min: 0 }],
    ["A48", "imaging_ultrasound_count", "Cantidad de Ultrasonografias", "number", "estudios", { min: 0 }],
    ["A49", "imaging_doppler_sales", "Venta de Doppler", "currency", money, { min: 0 }],
    ["A50", "imaging_doppler_count", "Cantidad de Doppler", "number", "estudios", { min: 0 }],
  ]),
  step("Imagenes", "clientes-imagenes", "Clientes", "Conteo agregado de clientes; no se capturan datos personales.", [
    ["A56", "imaging_total_clients_count", "Cantidad de Clientes Totales", "number", "clientes", { min: 0 }],
  ]),
  step("Imagenes", "gastos-imagenes", "Gastos y utilidad", "Gastos operativos y utilidad reportada por la sucursal.", [
    ["A68", "imaging_rent_expense", "Renta Local", "currency", money, { min: 0 }],
    ["A69", "imaging_personnel_expense", "Personal", "currency", money, { min: 0 }],
    ["A70", "imaging_social_security_expense", "ISSS/AFP", "currency", money, { min: 0 }],
    ["A71", "imaging_electricity_expense", "Energia", "currency", money, { min: 0 }],
    ["A72", "imaging_water_expense", "Agua", "currency", money, { min: 0 }],
    ["A73", "imaging_phone_expense", "Telefono", "currency", money, { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A74", "imaging_internet_expense", "Internet", "currency", money, { min: 0 }],
    ["A75", "imaging_misc_expense", "Miscelaneos", "currency", money, { min: 0 }],
    ["A76", "imaging_otis_maintenance_expense", "Mantenimiento OTIS", "currency", money, { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A77", "imaging_physical_security_expense", "Seguridad Física", "currency", money, { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A78", "imaging_transae_expense", "TRANSAE", "currency", money, { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A79", "imaging_municipal_tax_expense", "Impuestos por actividad Económica (Municipalidad)", "currency", money, { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A80", "imaging_advertising_expense", "Publicidad", "currency", money, { min: 0, hiddenRow: true, decisionIds: ["FORM-02"] }],
    ["A81", "imaging_operating_cost_and_expense", "Costo Operativo + Gasto Operativo", "currency", money, { min: 0 }],
    ["A83", "imaging_operating_profit", "Utilidad operativa", "currency", money, { hasSourceDerivation: true, decisionIds: ["FORM-01", "CALC-01"] }],
  ]),
  step("Imagenes", "personal-imagenes", "Personal", "Dotación agregada de la sucursal.", [
    ["A87", "imaging_licensed_staff_count", "Licenciados", "number", "personas", { min: 0 }],
    ["A88", "imaging_doctor_staff_count", "Medico", "number", "personas", { min: 0 }],
    ["A89", "imaging_customer_service_staff_count", "Atención al cliente", "number", "personas", { min: 0 }],
    ["A90", "imaging_delivery_staff_count", "Deliverys", "number", "personas", { min: 0 }],
    ["A91", "imaging_cleaning_staff_count", "Limpieza", "number", "personas", { min: 0 }],
  ]),
  step("Imagenes", "facturacion-imagenes", "Facturación", "Captura del usuario visible en la fuente sin convertirlo en una etiqueta universal.", [
    ["A93", "imaging_source_user_billed_amount", "facturacion csanchez", "currency", money, { min: 0, displayLabel: "Facturación del usuario identificado en la fuente", decisionIds: ["FORM-03"] }],
    ["A94", "imaging_source_user_invoice_count", "Cantidad de facturas csanchez", "number", "facturas", { min: 0, displayLabel: "Cantidad de facturas del usuario identificado en la fuente", decisionIds: ["FORM-03"] }],
  ]),
];

const sourceStepsByLine: Record<SourceLine, ManualMonthlyFormStep[]> = {
  Fisioterapia: physiotherapySteps,
  Imagenes: imagingSteps,
};

export function getSourceMonthlyFormStepsForLine(line: ImportBusinessLine) {
  if (line !== "Fisioterapia" && line !== "Imagenes") return null;
  return sourceStepsByLine[line].map((item) => ({
    ...item,
    fields: item.fields.map((field) => ({ ...field, source: field.source ? { ...field.source } : undefined })),
  }));
}

export function getMonthlyFormContractVersion(line: ImportBusinessLine) {
  if (line === "Laboratorio") return monthlyFormContractVersions.Laboratorio;
  if (line === "Fisioterapia" || line === "Imagenes") return monthlyFormContractVersions[line];
  return "unsupported";
}

export function getSourceContractFieldCount(line: SourceLine) {
  return sourceStepsByLine[line]
    .flatMap((item) => item.fields)
    .filter((field) => field.source?.classification !== "CONTEXT_YELLOW")
    .length;
}
