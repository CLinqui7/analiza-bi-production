import {
  consolidatedCompany,
  consolidatedCompanyId,
  demoBranches,
  demoBusinessLineOptions,
  demoCompanies,
  demoCompanyOptions,
  demoCountries,
  demoCountryOptions,
  demoDefaultPeriod,
  demoOperationalAreas,
  regionalCountry,
  regionalCountryId,
  type BranchOption,
  type BusinessLineOption,
  type CompanyOption,
  type CountryOption,
  type OperationalAreaOption,
} from "../tenant/demo-context.ts";

export const globalContextStorageKey = "analiza:selected-context";
export const globalContextChangeEvent = "analiza:context-change";

export const allBranchesValue = "__all__";
export const allOperationalAreasValue = "__all_areas__";
export const allManagersValue = "__all_managers__";
export const allProfessionalsValue = "__all_professionals__";
export const allServicesValue = "__all_services__";
export const allPayersValue = "__all_payers__";
export const allChannelsValue = "__all_channels__";

export const allBranchesLabel = "Todas las sucursales";
export const allOperationalAreasLabel = "Todas las areas";
export const allManagersLabel = "Todos los gerentes";
export const allProfessionalsLabel = "Todos los profesionales";
export const allServicesLabel = "Todos los servicios";
export const allPayersLabel = "Todos los pagadores";
export const allChannelsLabel = "Todos los canales";

const defaultPeriodStart = `${demoDefaultPeriod}-01`;
const defaultPeriodEnd = `${demoDefaultPeriod}-31`;

export type GlobalFilterSearchKey =
  | "country"
  | "company"
  | "line"
  | "branch"
  | "area"
  | "manager"
  | "professional"
  | "service"
  | "payer"
  | "channel"
  | "from"
  | "to";

export type GlobalFilterSearchRecord = Partial<Record<GlobalFilterSearchKey, string>>;

export type GlobalFilterInput = {
  countryId?: string | null;
  countryName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  businessLineId?: string | null;
  businessLineName?: string | null;
  businessLineCode?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  operationalAreaId?: string | null;
  operationalAreaName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  professionalId?: string | null;
  professionalName?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  payerId?: string | null;
  payerName?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  period?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  year?: string | null;
  month?: string | null;
  isDemo?: boolean | null;
};

export type GlobalFilterContext = {
  countryId: string;
  countryName: string;
  companyId: string;
  companyName: string;
  businessLineId: string;
  businessLineName: string;
  businessLineCode: BusinessLineOption["code"];
  branchId: string;
  branchName: string;
  operationalAreaId: string;
  operationalAreaName: string;
  managerId: string;
  managerName: string;
  professionalId: string;
  professionalName: string;
  serviceId: string;
  serviceName: string;
  payerId: string;
  payerName: string;
  channelId: string;
  channelName: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  dateFrom: string;
  dateTo: string;
  year: string;
  month: string;
  isDemo: boolean;
};

type NamedFilterOption = {
  id: string;
  name: string;
};

export type GlobalFilterOptions = {
  branches?: readonly BranchOption[];
  businessLines?: readonly BusinessLineOption[];
  channels?: readonly NamedFilterOption[];
  companies?: readonly CompanyOption[];
  countries?: readonly CountryOption[];
  managers?: readonly NamedFilterOption[];
  operationalAreas?: readonly OperationalAreaOption[];
  payers?: readonly NamedFilterOption[];
  professionals?: readonly NamedFilterOption[];
  services?: readonly NamedFilterOption[];
};

export const demoProfessionalOptions = [
  { id: allProfessionalsValue, name: allProfessionalsLabel },
  { id: "prof-physio-red-sv", name: "Fisioterapeutas red SV" },
  { id: "prof-lab-flebotomia-sv", name: "Flebotomia laboratorio SV" },
  { id: "prof-img-tecnicos-sv", name: "Tecnicos imagenes SV" },
] as const;

export const demoServiceOptions = [
  { id: allServicesValue, name: allServicesLabel },
  { id: "service-physio-session", name: "Sesion de fisioterapia" },
  { id: "service-lab-profile", name: "Perfil laboratorio" },
  { id: "service-img-study", name: "Estudio de imagenes" },
] as const;

export const demoPayerOptions = [
  { id: allPayersValue, name: allPayersLabel },
  { id: "payer-particular", name: "Particular" },
  { id: "payer-convenio", name: "Convenio" },
  { id: "payer-credit", name: "Credito" },
  { id: "payer-drsv", name: "DRSV" },
] as const;

export const demoChannelOptions = [
  { id: allChannelsValue, name: allChannelsLabel },
  { id: "channel-direct", name: "Venta directa" },
  { id: "channel-medical-order", name: "Orden medica" },
  { id: "channel-home-service", name: "Domicilio" },
  { id: "channel-agreement", name: "Convenio" },
] as const;

export const demoManagerOptions = [
  { id: allManagersValue, name: allManagersLabel },
  { id: "manager-operations-lab", name: "Gerencia operaciones Laboratorio" },
  { id: "manager-operations-physio", name: "Gerencia operaciones Fisioterapia" },
  { id: "manager-operations-img", name: "Gerencia operaciones Imagenes" },
  { id: "manager-branch-sv", name: "Gerentes sucursales SV" },
] as const;

export function normalizeFilterText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isAllFilterValue(value?: string | null) {
  if (!value) {
    return true;
  }

  const normalizedValue = normalizeFilterText(value);

  return (
    value === allBranchesValue ||
    value === allOperationalAreasValue ||
    value === allManagersValue ||
    value === allProfessionalsValue ||
    value === allServicesValue ||
    value === allPayersValue ||
    value === allChannelsValue ||
    normalizedValue === "todos" ||
    normalizedValue.startsWith("todas ")
  );
}

export function readGlobalFilterSearchParams(
  searchParams: URLSearchParams,
): GlobalFilterSearchRecord {
  return {
    area: searchParams.get("area") ?? undefined,
    branch: searchParams.get("branch") ?? undefined,
    channel: searchParams.get("channel") ?? undefined,
    company: searchParams.get("company") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    line: searchParams.get("line") ?? undefined,
    manager: searchParams.get("manager") ?? undefined,
    payer: searchParams.get("payer") ?? undefined,
    professional: searchParams.get("professional") ?? undefined,
    service: searchParams.get("service") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };
}

export function globalFilterInputFromSearch(
  record: GlobalFilterSearchRecord,
): GlobalFilterInput {
  return {
    branchId: record.branch,
    channelId: record.channel,
    companyId: record.company,
    countryId: record.country,
    dateFrom: record.from,
    dateTo: record.to,
    managerId: record.manager,
    operationalAreaId: record.area,
    payerId: record.payer,
    professionalId: record.professional,
    serviceId: record.service,
    businessLineId: record.line,
  };
}

function findByIdOrName<T extends { id: string; name: string }>(
  options: readonly T[],
  id?: string | null,
  name?: string | null,
) {
  const idValue = id?.trim();
  const nameValue = name?.trim();

  if (idValue) {
    const exactId = options.find((option) => option.id === idValue);

    if (exactId) {
      return exactId;
    }
  }

  if (nameValue) {
    const normalizedName = normalizeFilterText(nameValue);

    return options.find(
      (option) =>
        normalizeFilterText(option.name) === normalizedName ||
        normalizeFilterText(option.name).includes(normalizedName) ||
        normalizedName.includes(normalizeFilterText(option.name)),
    );
  }

  return undefined;
}

function findCountry(
  input: GlobalFilterInput,
  options: readonly CountryOption[],
): CountryOption {
  return (
    findByIdOrName(options, input.countryId, input.countryName) ??
    options.find((country) => country.scope === "regional") ??
    options[0] ??
    regionalCountry
  );
}

function findCompany(
  input: GlobalFilterInput,
  options: readonly CompanyOption[],
): CompanyOption {
  return (
    findByIdOrName(options, input.companyId, input.companyName) ??
    options.find((company) => company.isConsolidated) ??
    options[0] ??
    consolidatedCompany
  );
}

function findBusinessLine(
  input: GlobalFilterInput,
  company: CompanyOption,
  options: readonly BusinessLineOption[],
) {
  const lineByIdOrName = findByIdOrName(
    options,
    input.businessLineId,
    input.businessLineName,
  );

  if (lineByIdOrName) {
    return lineByIdOrName;
  }

  if (!company.isConsolidated) {
    return (
      options.find((line) => line.companyId === company.id) ??
      options.find((line) => !line.isConsolidated) ??
      options[0] ??
      demoBusinessLineOptions[0]
    );
  }

  if (input.businessLineCode) {
    return (
      options.find((line) => line.code === input.businessLineCode) ??
      options[0] ??
      demoBusinessLineOptions[0]
    );
  }

  return options[0] ?? demoBusinessLineOptions[0];
}

function getBranchOptions(
  country: CountryOption,
  company: CompanyOption,
  options: readonly BranchOption[],
) {
  const countryBranches =
    country.scope === "regional"
      ? options
      : options.filter((branch) => branch.countryId === country.id);

  if (company.isConsolidated) {
    return countryBranches;
  }

  return countryBranches.filter((branch) => branch.companyId === company.id);
}

function findBranch(
  branches: readonly BranchOption[],
  input: GlobalFilterInput,
): BranchOption | undefined {
  if (isAllFilterValue(input.branchId) && isAllFilterValue(input.branchName)) {
    return undefined;
  }

  return findByIdOrName(branches, input.branchId, input.branchName);
}

function findOperationalArea(
  input: GlobalFilterInput,
  branch: BranchOption | undefined,
  country: CountryOption,
  company: CompanyOption,
  options: readonly OperationalAreaOption[],
): OperationalAreaOption | undefined {
  if (
    isAllFilterValue(input.operationalAreaId) &&
    isAllFilterValue(input.operationalAreaName) &&
    !branch?.operationalAreaId
  ) {
    return undefined;
  }

  const areaOptions = options.filter(
    (area) =>
      (country.scope === "regional" || area.countryId === country.id) &&
      (company.isConsolidated || area.companyId === company.id),
  );

  return (
    findByIdOrName(
      areaOptions,
      input.operationalAreaId ?? branch?.operationalAreaId,
      input.operationalAreaName,
    ) ?? undefined
  );
}

function resolveNamedOption(
  value: string | null | undefined,
  fallbackLabel: string,
  options: readonly { id: string; name: string }[],
  strict = false,
) {
  if (isAllFilterValue(value)) {
    return {
      id: options[0]?.id ?? value ?? "",
      name: options[0]?.name ?? fallbackLabel,
    };
  }

  const found = findByIdOrName(options, value, value);

  if (!found && strict) {
    return {
      id: options[0]?.id ?? "",
      name: options[0]?.name ?? fallbackLabel,
    };
  }

  return {
    id: found?.id ?? value ?? options[0]?.id ?? "",
    name: found?.name ?? value ?? fallbackLabel,
  };
}

function coalesceFilterValue(...values: (string | null | undefined)[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

export function resolveGlobalFilterContext(
  input: GlobalFilterInput = {},
  options: GlobalFilterOptions = {},
): GlobalFilterContext {
  const countryOptions = options.countries ?? demoCountryOptions;
  const companyOptions = options.companies ?? demoCompanyOptions;
  const businessLineOptions = options.businessLines ?? demoBusinessLineOptions;
  const branchOptions = options.branches ?? demoBranches;
  const operationalAreaOptions = options.operationalAreas ?? demoOperationalAreas;
  const managerOptions = options.managers ?? demoManagerOptions;
  const professionalOptions = options.professionals ?? demoProfessionalOptions;
  const serviceOptions = options.services ?? demoServiceOptions;
  const payerOptions = options.payers ?? demoPayerOptions;
  const channelOptions = options.channels ?? demoChannelOptions;
  const hasStrictBranchOptions = options.branches !== undefined;
  const country = findCountry(input, countryOptions);
  const company = findCompany(input, companyOptions);
  const businessLine = findBusinessLine(input, company, businessLineOptions);
  const branches = getBranchOptions(country, company, branchOptions);
  const branch = findBranch(branches, input);
  const operationalArea = findOperationalArea(
    input,
    branch,
    country,
    company,
    operationalAreaOptions,
  );
  const manager = resolveNamedOption(
    coalesceFilterValue(input.managerId, input.managerName),
    allManagersLabel,
    managerOptions,
    options.managers !== undefined,
  );
  const professional = resolveNamedOption(
    coalesceFilterValue(input.professionalId, input.professionalName),
    allProfessionalsLabel,
    professionalOptions,
    options.professionals !== undefined,
  );
  const service = resolveNamedOption(
    coalesceFilterValue(input.serviceId, input.serviceName),
    allServicesLabel,
    serviceOptions,
    options.services !== undefined,
  );
  const payer = resolveNamedOption(
    coalesceFilterValue(input.payerId, input.payerName),
    allPayersLabel,
    payerOptions,
    options.payers !== undefined,
  );
  const channel = resolveNamedOption(
    coalesceFilterValue(input.channelId, input.channelName),
    allChannelsLabel,
    channelOptions,
    options.channels !== undefined,
  );
  const periodStart = input.dateFrom ?? input.periodStart ?? defaultPeriodStart;
  const periodEnd = input.dateTo ?? input.periodEnd ?? defaultPeriodEnd;

  return {
    branchId:
      branch?.id ??
      (isAllFilterValue(input.branchId) || hasStrictBranchOptions
        ? allBranchesValue
        : input.branchId ?? allBranchesValue),
    branchName:
      branch?.name ??
      (isAllFilterValue(input.branchName ?? input.branchId) ||
      hasStrictBranchOptions
        ? allBranchesLabel
        : input.branchName ?? input.branchId ?? allBranchesLabel),
    businessLineCode: businessLine.code,
    businessLineId: businessLine.id,
    businessLineName: businessLine.name,
    channelId: channel.id,
    channelName: channel.name,
    companyId: company.id,
    companyName: company.name,
    countryId: country.id,
    countryName: country.name,
    dateFrom: periodStart,
    dateTo: periodEnd,
    isDemo: input.isDemo ?? true,
    managerId:
      manager.id === allManagersValue && !isAllFilterValue(input.managerId)
        ? input.managerId ?? manager.id
        : manager.id,
    managerName: manager.name,
    month: input.month ?? periodStart.slice(5, 7),
    operationalAreaId: operationalArea?.id ?? allOperationalAreasValue,
    operationalAreaName: operationalArea?.name ?? allOperationalAreasLabel,
    payerId: payer.id,
    payerName: payer.name,
    period: input.period ?? `${periodStart} a ${periodEnd}`,
    periodEnd,
    periodStart,
    professionalId: professional.id,
    professionalName: professional.name,
    serviceId: service.id,
    serviceName: service.name,
    year: input.year ?? periodStart.slice(0, 4),
  };
}

export function createGlobalFilterContextFromSearchParams(
  searchParams: URLSearchParams,
  storedContext?: GlobalFilterInput | null,
  options: GlobalFilterOptions = {},
) {
  return resolveGlobalFilterContext({
    ...storedContext,
    ...globalFilterInputFromSearch(readGlobalFilterSearchParams(searchParams)),
  }, options);
}

export function toGlobalFilterSearchParams(context: GlobalFilterContext) {
  const params = new URLSearchParams();

  params.set("country", context.countryId);
  params.set("company", context.companyId);
  params.set("line", context.businessLineId);
  params.set("branch", context.branchId);
  params.set("area", context.operationalAreaId);
  params.set("manager", context.managerId);
  params.set("professional", context.professionalId);
  params.set("service", context.serviceId);
  params.set("payer", context.payerId);
  params.set("channel", context.channelId);
  params.set("from", context.periodStart);
  params.set("to", context.periodEnd);

  return params;
}

export function describeGlobalFilterContext(context: GlobalFilterContext) {
  return [
    `Pais: ${context.countryName}`,
    `Empresa: ${context.companyName}`,
    `Linea: ${context.businessLineName}`,
    `Area: ${context.operationalAreaName}`,
    `Sucursal: ${context.branchName}`,
    `Gerente: ${context.managerName}`,
    `Profesional: ${context.professionalName}`,
    `Servicio: ${context.serviceName}`,
    `Pagador: ${context.payerName}`,
    `Canal: ${context.channelName}`,
    `Periodo: ${context.periodStart} a ${context.periodEnd}`,
  ];
}

export function getBranchOptionsForContext(context: GlobalFilterContext) {
  const country =
    demoCountries.find((item) => item.id === context.countryId) ??
    (context.countryId === regionalCountryId ? regionalCountry : regionalCountry);
  const company =
    demoCompanies.find((item) => item.id === context.companyId) ??
    (context.companyId === consolidatedCompanyId
      ? consolidatedCompany
      : consolidatedCompany);

  return getBranchOptions(country, company, demoBranches);
}
