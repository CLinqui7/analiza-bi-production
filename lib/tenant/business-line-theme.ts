export type BusinessLineThemeSlug =
  | "consolidado"
  | "fisioterapia"
  | "laboratorio"
  | "imagenes";

export type BusinessLineTheme = {
  slug: BusinessLineThemeSlug;
  label: string;
  shortLabel: string;
  description: string;
  primaryHex: string;
};

export type BusinessLineThemeInput = {
  businessLineCode?: string | null;
  businessLineId?: string | null;
  businessLineName?: string | null;
  companyName?: string | null;
  lineParam?: string | null;
};

export const businessLineThemes: Record<
  BusinessLineThemeSlug,
  BusinessLineTheme
> = {
  consolidado: {
    slug: "consolidado",
    label: "Consolidado",
    shortLabel: "CON",
    description: "Vista corporativa regional sin mezclar unidades operativas.",
    primaryHex: "#10244d",
  },
  fisioterapia: {
    slug: "fisioterapia",
    label: "Fisioterapia",
    shortLabel: "FIS",
    description: "Agenda, sesiones, continuidad terapeutica y capacidad clinica.",
    primaryHex: "#047857",
  },
  laboratorio: {
    slug: "laboratorio",
    label: "Laboratorio",
    shortLabel: "LAB",
    description: "Ordenes, muestras, pruebas, resultados y salud financiera.",
    primaryHex: "#3730a3",
  },
  imagenes: {
    slug: "imagenes",
    label: "Imagenes",
    shortLabel: "IMG",
    description: "Estudios, equipos, modalidades, informes y ocupacion tecnica.",
    primaryHex: "#0369a1",
  },
};

const businessLineSlugById: Record<string, BusinessLineThemeSlug> = {
  "__consolidated__": "consolidado",
  "business-line-fisioterapia": "fisioterapia",
  "business-line-laboratorio": "laboratorio",
  "business-line-imagenes": "imagenes",
};

const businessLineSlugByCode: Record<string, BusinessLineThemeSlug> = {
  CONSOLIDATED: "consolidado",
  IMAGING: "imagenes",
  LABORATORY: "laboratorio",
  PHYSIOTHERAPY: "fisioterapia",
};

function normalizeThemeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveSlugFromText(
  value?: string | null,
): BusinessLineThemeSlug | null {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeThemeText(value);

  if (normalizedValue.includes("fisioterapia")) {
    return "fisioterapia";
  }

  if (normalizedValue.includes("laboratorio")) {
    return "laboratorio";
  }

  if (
    normalizedValue.includes("imagen") ||
    normalizedValue.includes("radiologia") ||
    normalizedValue.includes("rayos")
  ) {
    return "imagenes";
  }

  if (
    normalizedValue.includes("consolidado") ||
    normalizedValue.includes("regional")
  ) {
    return "consolidado";
  }

  return null;
}

export function resolveBusinessLineThemeSlug({
  businessLineCode,
  businessLineId,
  businessLineName,
  companyName,
  lineParam,
}: BusinessLineThemeInput): BusinessLineThemeSlug {
  const idSlug =
    (businessLineId && businessLineSlugById[businessLineId]) ||
    (lineParam && businessLineSlugById[lineParam]);

  if (idSlug) {
    return idSlug;
  }

  const codeSlug =
    businessLineCode && businessLineSlugByCode[businessLineCode];

  if (codeSlug) {
    return codeSlug;
  }

  return (
    resolveSlugFromText(businessLineName) ??
    resolveSlugFromText(companyName) ??
    resolveSlugFromText(lineParam) ??
    "consolidado"
  );
}

export function resolveBusinessLineTheme(input: BusinessLineThemeInput) {
  return businessLineThemes[resolveBusinessLineThemeSlug(input)];
}
