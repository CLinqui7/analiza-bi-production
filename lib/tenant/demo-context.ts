import { elSalvadorBranchResultTemplates } from "../analytics/el-salvador-result-templates.ts";
import type { BusinessLineCode } from "../analytics/kpi-registry.ts";
import {
  managedBranchRecords,
  type ManagedBranchRecord,
} from "./managed-branch-records.ts";

export type CountryOption = {
  id: string;
  iso2: string;
  name: string;
  currencyCode: string;
  timeZone: string;
  dateFormat: string;
  scope?: "country" | "regional";
  isDemo: boolean;
};

export type CompanyOption = {
  id: string;
  key: string;
  name: string;
  unitType: "consolidado" | "fisioterapia" | "laboratorio" | "imagenes";
  isConsolidated?: true;
  isDemo: boolean;
};

export type BusinessLineOption = {
  id: string;
  code: BusinessLineCode;
  name: string;
  companyId: string | null;
  unitType: CompanyOption["unitType"];
  isConsolidated?: true;
  isDemo: boolean;
};

export type BranchOption = {
  id: string;
  countryId: string;
  companyId: string;
  operationalAreaId?: string;
  code: string;
  name: string;
  city: string;
  businessLineCode?: BusinessLineCode;
  branchManagerName?: string;
  areaManagerName?: string;
  areaZone?: string;
  isActive?: boolean;
  sourceTrace?: string;
  isDemo: boolean;
};

export type OperationalAreaOption = {
  id: string;
  organizationId: string;
  countryId: string;
  companyId: string;
  code: string;
  name: string;
  managerName: string;
  areaZone: string;
  businessLineCode: Exclude<BusinessLineCode, "CONSOLIDATED">;
  sourceTrace: string;
  isDemo: boolean;
};

export type RoleKey =
  | "super_admin"
  | "webmaster_admin"
  | "ceo"
  | "gerente_operaciones"
  | "gerente_area"
  | "gerente_sucursal"
  | "usuario_operativo"
  | "viewer";

export const demoCountries: CountryOption[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    iso2: "GT",
    name: "Guatemala",
    currencyCode: "GTQ",
    timeZone: "America/Guatemala",
    dateFormat: "dd/MM/yyyy",
    isDemo: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    iso2: "BZ",
    name: "Belice",
    currencyCode: "BZD",
    timeZone: "America/Belize",
    dateFormat: "dd/MM/yyyy",
    isDemo: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    iso2: "SV",
    name: "El Salvador",
    currencyCode: "USD",
    timeZone: "America/El_Salvador",
    dateFormat: "dd/MM/yyyy",
    isDemo: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    iso2: "HN",
    name: "Honduras",
    currencyCode: "HNL",
    timeZone: "America/Tegucigalpa",
    dateFormat: "dd/MM/yyyy",
    isDemo: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    iso2: "NI",
    name: "Nicaragua",
    currencyCode: "NIO",
    timeZone: "America/Managua",
    dateFormat: "dd/MM/yyyy",
    isDemo: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    iso2: "CR",
    name: "Costa Rica",
    currencyCode: "CRC",
    timeZone: "America/Costa_Rica",
    dateFormat: "dd/MM/yyyy",
    isDemo: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000007",
    iso2: "PA",
    name: "Panama",
    currencyCode: "PAB",
    timeZone: "America/Panama",
    dateFormat: "dd/MM/yyyy",
    isDemo: true,
  },
];

export const regionalCountryId = "__regional__";

export const regionalCountry: CountryOption = {
  id: regionalCountryId,
  iso2: "REG",
  name: "Vista regional",
  currencyCode: "MULTI",
  timeZone: "America/El_Salvador",
  dateFormat: "dd/MM/yyyy",
  scope: "regional",
  isDemo: true,
};

export const demoCountryOptions: CountryOption[] = [
  regionalCountry,
  ...demoCountries,
];

export const demoCompanies: CompanyOption[] = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    key: "analiza-fisioterapia",
    name: "Analiza Fisioterapia",
    unitType: "fisioterapia",
    isDemo: true,
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    key: "analiza-laboratorio",
    name: "Analiza Laboratorio",
    unitType: "laboratorio",
    isDemo: true,
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    key: "analiza-imagenes",
    name: "Analiza Imagenes",
    unitType: "imagenes",
    isDemo: true,
  },
];

export const consolidatedCompanyId = "__consolidated__";

export const consolidatedCompany: CompanyOption = {
  id: consolidatedCompanyId,
  key: "vista-consolidada",
  name: "Vista consolidada",
  unitType: "consolidado",
  isConsolidated: true,
  isDemo: true,
};

export const demoCompanyOptions: CompanyOption[] = [
  consolidatedCompany,
  ...demoCompanies,
];

export const demoBusinessLineOptions: BusinessLineOption[] = [
  {
    id: consolidatedCompanyId,
    code: "CONSOLIDATED",
    name: "Consolidado",
    companyId: null,
    unitType: "consolidado",
    isConsolidated: true,
    isDemo: true,
  },
  {
    id: "business-line-fisioterapia",
    code: "PHYSIOTHERAPY",
    name: "Analiza Fisioterapia",
    companyId: "40000000-0000-4000-8000-000000000001",
    unitType: "fisioterapia",
    isDemo: true,
  },
  {
    id: "business-line-laboratorio",
    code: "LABORATORY",
    name: "Analiza Laboratorio",
    companyId: "40000000-0000-4000-8000-000000000002",
    unitType: "laboratorio",
    isDemo: true,
  },
  {
    id: "business-line-imagenes",
    code: "IMAGING",
    name: "Analiza Imagenes",
    companyId: "40000000-0000-4000-8000-000000000003",
    unitType: "imagenes",
    isDemo: true,
  },
];

export function getBusinessLineForCompany(companyId: string) {
  return (
    demoBusinessLineOptions.find((line) => line.companyId === companyId) ??
    demoBusinessLineOptions[0]
  );
}

export function getCompanyForBusinessLine(businessLineId: string) {
  const businessLine = demoBusinessLineOptions.find(
    (line) => line.id === businessLineId,
  );

  if (!businessLine || businessLine.isConsolidated || !businessLine.companyId) {
    return consolidatedCompany;
  }

  return (
    demoCompanies.find((company) => company.id === businessLine.companyId) ??
    consolidatedCompany
  );
}

const elSalvadorCountryId = "30000000-0000-4000-8000-000000000003";
const laboratorioCompanyId = "40000000-0000-4000-8000-000000000002";

const demoCountryCities: Record<string, string> = {
  GT: "Ciudad de Guatemala",
  BZ: "Belice",
  SV: "San Salvador",
  HN: "Tegucigalpa",
  NI: "Managua",
  CR: "San Jose",
  PA: "Panama",
};

const demoUnitCodes: Record<CompanyOption["unitType"], string> = {
  consolidado: "CON",
  fisioterapia: "FIS",
  laboratorio: "LAB",
  imagenes: "IMG",
};

function getBusinessUnitName(company: CompanyOption) {
  return company.name.replace("Analiza ", "");
}

const generatedDemoBranches: BranchOption[] = demoCountries.flatMap((country) =>
  demoCompanies.map((company) => ({
    id: `demo-branch-${country.iso2}-${company.key}`,
    countryId: country.id,
    companyId: company.id,
    code: `${country.iso2}-${demoUnitCodes[company.unitType]}-DEMO`,
    name: `Sucursal DEMO ${getBusinessUnitName(company)} ${country.name}`,
    city: demoCountryCities[country.iso2] ?? country.name,
    isDemo: true,
  })),
);

export const elSalvadorResultBranches: BranchOption[] =
  elSalvadorBranchResultTemplates.map((branch) => ({
    id: branch.id,
    countryId: elSalvadorCountryId,
    companyId: laboratorioCompanyId,
    code: branch.branchCode,
    name: branch.branchName,
    city: branch.city,
    isDemo: true,
  }));

function getCountryIdForManagedBranch(countryIso2: ManagedBranchRecord["countryIso2"]) {
  return (
    demoCountries.find((country) => country.iso2 === countryIso2)?.id ??
    regionalCountryId
  );
}

function getCompanyIdForManagedBranch(
  businessLineCode: ManagedBranchRecord["businessLineCode"],
) {
  const businessLine = demoBusinessLineOptions.find(
    (line) => line.code === businessLineCode,
  );

  return businessLine?.companyId ?? consolidatedCompanyId;
}

function cleanOptionalManagerName(managerName: string) {
  return managerName.toLowerCase() === "no hay" ? undefined : managerName;
}

function slugifyScope(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getOperationalAreaIdForManagedBranch(branch: ManagedBranchRecord) {
  return [
    "managed-area",
    branch.countryIso2.toLowerCase(),
    branch.businessLineCode.toLowerCase(),
    slugifyScope(branch.areaZone),
    slugifyScope(branch.areaManagerName),
  ].join("-");
}

export const demoOperationalAreas: OperationalAreaOption[] = Array.from(
  managedBranchRecords
    .reduce((areas, branch) => {
      const id = getOperationalAreaIdForManagedBranch(branch);

      if (!areas.has(id)) {
        areas.set(id, {
          id,
          organizationId: "10000000-0000-4000-8000-000000000001",
          countryId: getCountryIdForManagedBranch(branch.countryIso2),
          companyId: getCompanyIdForManagedBranch(branch.businessLineCode),
          code: id.replace("managed-area-", "").toUpperCase(),
          name: `${branch.areaZone} - ${branch.areaManagerName}`,
          managerName: branch.areaManagerName,
          areaZone: branch.areaZone,
          businessLineCode: branch.businessLineCode,
          sourceTrace: branch.sourceTrace,
          isDemo: true,
        });
      }

      return areas;
    }, new Map<string, OperationalAreaOption>())
    .values(),
).sort((firstArea, secondArea) =>
  firstArea.name.localeCompare(secondArea.name),
);

export const managedDemoBranches: BranchOption[] = managedBranchRecords.map(
  (branch) => ({
    id: branch.id,
    countryId: getCountryIdForManagedBranch(branch.countryIso2),
    companyId: getCompanyIdForManagedBranch(branch.businessLineCode),
    operationalAreaId: getOperationalAreaIdForManagedBranch(branch),
    code: branch.id.replace("managed-", "").toUpperCase(),
    name: branch.branchName,
    city: branch.areaZone,
    businessLineCode: branch.businessLineCode,
    branchManagerName: cleanOptionalManagerName(branch.branchManagerName),
    areaManagerName: branch.areaManagerName,
    areaZone: branch.areaZone,
    isActive: branch.isActive,
    sourceTrace: branch.sourceTrace,
    isDemo: true,
  }),
);

const managedCompanyIds = new Set(
  managedDemoBranches.map((branch) => branch.companyId),
);

export const demoBranches: BranchOption[] = [
  ...[...generatedDemoBranches, ...elSalvadorResultBranches].filter(
    (branch) => !managedCompanyIds.has(branch.companyId),
  ),
  ...managedDemoBranches,
];

export const roleKeys: RoleKey[] = [
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
  "viewer",
];

export const demoRoleProfiles: Record<
  RoleKey,
  {
    label: string;
    description: string;
    accessSummary: string;
  }
> = {
  super_admin: {
    label: "Superadministrador",
    description:
      "Administra la plataforma completa, permisos globales, conectores y gobierno del BI.",
    accessSummary: "Acceso total al sistema Analiza BI.",
  },
  webmaster_admin: {
    label: "Webmaster / Administrador legacy",
    description:
      "Alias historico del superadministrador para compatibilidad de sesiones existentes.",
    accessSummary: "Acceso total al sistema Analiza BI.",
  },
  ceo: {
    label: "CEO",
    description:
      "Consulta la salud ejecutiva de Analiza y sus lineas de negocio.",
    accessSummary: "Lectura ejecutiva regional, por negocio y por sucursal.",
  },
  gerente_operaciones: {
    label: "Gerente de operaciones",
    description:
      "Gestiona una linea de negocio y valida cierres mensuales de sucursales.",
    accessSummary: "Gestiona formularios y revisa operacion de su linea.",
  },
  gerente_area: {
    label: "Gerente de area",
    description:
      "Supervisa un grupo de sucursales asignadas y valida disciplina de carga.",
    accessSummary: "Lee y compara sucursales asignadas por gerente de area.",
  },
  gerente_sucursal: {
    label: "Gerente de sucursal",
    description:
      "Registra y consulta el cierre mensual de su sucursal asignada.",
    accessSummary: "Formulario mensual y lectura de su sucursal.",
  },
  usuario_operativo: {
    label: "Usuario operativo",
    description:
      "Carga y corrige datos operativos sin privilegios gerenciales.",
    accessSummary: "Trabajo operativo limitado a su asignacion.",
  },
  viewer: {
    label: "Viewer",
    description:
      "Consulta informacion autorizada sin permisos de modificacion.",
    accessSummary: "Solo lectura dentro de su alcance.",
  },
};

export const demoDefaultPeriod = "2026-07";

export function getDefaultPeriod() {
  return demoDefaultPeriod;
}
