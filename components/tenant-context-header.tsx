"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  Globe2,
  LockKeyhole,
  MapPin,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";

import {
  consolidatedCompanyId,
  demoBranches,
  demoBusinessLineOptions,
  demoCompanyOptions,
  demoCountryOptions,
  demoOperationalAreas,
  getDefaultPeriod,
  type BranchOption,
  type BusinessLineOption,
  type CompanyOption,
  type CountryOption,
  type OperationalAreaOption,
} from "@/lib/tenant/demo-context";
import {
  allBranchesLabel,
  allBranchesValue,
  allChannelsLabel,
  allChannelsValue,
  allManagersLabel,
  allManagersValue,
  allOperationalAreasLabel,
  allOperationalAreasValue,
  allPayersLabel,
  allPayersValue,
  allProfessionalsLabel,
  allProfessionalsValue,
  allServicesLabel,
  allServicesValue,
  createGlobalFilterContextFromSearchParams,
  demoChannelOptions,
  demoManagerOptions,
  demoPayerOptions,
  demoProfessionalOptions,
  demoServiceOptions,
  globalContextChangeEvent as contextChangeEvent,
  globalContextStorageKey as storageKey,
  resolveGlobalFilterContext,
  toGlobalFilterSearchParams,
  type GlobalFilterInput,
} from "@/lib/analytics/global-filters";
import {
  fetchCurrentUserAccess,
  isBranchManagerScopedAccess,
  type CurrentUserAccess,
} from "@/lib/tenant/current-user-access";

const demoBusinessLineStorageKey = "analiza:demo-business-line";
const roleChangeEvent = "analiza:role-change";

type NamedFilterOption = {
  id: string;
  name: string;
};

type HeaderContextOptions = {
  branches: readonly BranchOption[];
  businessLines: readonly BusinessLineOption[];
  companies: readonly CompanyOption[];
  countries: readonly CountryOption[];
  managers: readonly NamedFilterOption[];
  operationalAreas: readonly OperationalAreaOption[];
};

type OfficialContextOptionsResponse = {
  ok?: boolean;
  options?: HeaderContextOptions;
};

const demoHeaderContextOptions: HeaderContextOptions = {
  branches: demoBranches,
  businessLines: demoBusinessLineOptions,
  companies: demoCompanyOptions,
  countries: demoCountryOptions,
  managers: demoManagerOptions,
  operationalAreas: demoOperationalAreas,
};

const emptyOfficialContextOptions: HeaderContextOptions = {
  branches: [],
  businessLines: [],
  companies: [],
  countries: [],
  managers: [],
  operationalAreas: [],
};

type StoredContext = {
  countryId: string;
  countryName: string;
  companyId: string;
  companyName: string;
  businessLineId: string;
  businessLineName: string;
  businessLineCode: string;
  branchId: string;
  branchName: string;
  operationalAreaId?: string;
  operationalAreaName?: string;
  managerId: string;
  managerName: string;
  professionalId?: string;
  professionalName?: string;
  serviceId?: string;
  serviceName?: string;
  payerId?: string;
  payerName?: string;
  channelId?: string;
  channelName?: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  year: string;
  month: string;
  isDemo: boolean;
};

function getInitialCountryId() {
  return demoCountryOptions[0]?.id ?? "";
}

function readStoredContext() {
  const rawContext =
    window.localStorage.getItem(storageKey) ??
    window.sessionStorage.getItem(storageKey);

  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as StoredContext & GlobalFilterInput;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function formatPeriodLabel(periodStart: string, periodEnd: string) {
  if (periodStart.slice(0, 7) === periodEnd.slice(0, 7)) {
    return new Intl.DateTimeFormat("es-SV", {
      month: "short",
      year: "numeric",
    })
      .format(new Date(`${periodStart}T00:00:00`))
      .replace(".", "");
  }

  return `${periodStart} a ${periodEnd}`;
}

function findBusinessLineByCompanyScope(
  businessLines: readonly BusinessLineOption[],
  companyId?: string | null,
  companyName?: string | null,
) {
  const lineOptions =
    businessLines.length > 0 ? businessLines : demoBusinessLineOptions;
  const lineByCompanyId = companyId
    ? lineOptions.find((line) => line.companyId === companyId)
    : null;

  if (lineByCompanyId && !lineByCompanyId.isConsolidated) {
    return lineByCompanyId;
  }

  const normalizedCompanyName = companyName?.toLowerCase() ?? "";

  if (normalizedCompanyName.includes("laboratorio")) {
    return (
      lineOptions.find((line) => line.code === "LABORATORY") ??
      lineOptions[0] ??
      demoBusinessLineOptions[0]
    );
  }

  if (normalizedCompanyName.includes("fisioterapia")) {
    return (
      lineOptions.find((line) => line.code === "PHYSIOTHERAPY") ??
      lineOptions[0] ??
      demoBusinessLineOptions[0]
    );
  }

  if (
    normalizedCompanyName.includes("imagen") ||
    normalizedCompanyName.includes("image")
  ) {
    return (
      lineOptions.find((line) => line.code === "IMAGING") ??
      lineOptions[0] ??
      demoBusinessLineOptions[0]
    );
  }

  return lineOptions[0] ?? demoBusinessLineOptions[0];
}

function findCompanyForBusinessLine(
  businessLines: readonly BusinessLineOption[],
  companies: readonly CompanyOption[],
  businessLineId: string,
) {
  const businessLine =
    businessLines.find((line) => line.id === businessLineId) ?? null;

  if (!businessLine || businessLine.isConsolidated || !businessLine.companyId) {
    return (
      companies.find((company) => company.isConsolidated) ??
      companies[0] ??
      demoCompanyOptions[0]
    );
  }

  return (
    companies.find((company) => company.id === businessLine.companyId) ??
    companies.find((company) => company.isConsolidated) ??
    companies[0] ??
    demoCompanyOptions[0]
  );
}

type TenantContextHeaderProps = {
  isDemoEnvironment: boolean;
};

export function TenantContextHeader({
  isDemoEnvironment,
}: TenantContextHeaderProps) {
  const router = useRouter();
  const routeSearchParams = useSearchParams();
  const [currentUserAccess, setCurrentUserAccess] =
    useState<CurrentUserAccess | null>(null);
  const [demoBusinessLineCode, setDemoBusinessLineCode] = useState<string | null>(
    null,
  );
  const [countryId, setCountryId] = useState(getInitialCountryId());
  const [companyId, setCompanyId] = useState("");
  const [businessLineId, setBusinessLineId] = useState(
    demoBusinessLineOptions[0]?.id ?? "",
  );
  const [branchId, setBranchId] = useState(allBranchesValue);
  const [operationalAreaId, setOperationalAreaId] = useState(
    allOperationalAreasValue,
  );
  const [managerId, setManagerId] = useState(allManagersValue);
  const [professionalId, setProfessionalId] = useState(allProfessionalsValue);
  const [serviceId, setServiceId] = useState(allServicesValue);
  const [payerId, setPayerId] = useState(allPayersValue);
  const [channelId, setChannelId] = useState(allChannelsValue);
  const [periodStart, setPeriodStart] = useState(`${getDefaultPeriod()}-01`);
  const [periodEnd, setPeriodEnd] = useState(`${getDefaultPeriod()}-31`);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [routeContextReady, setRouteContextReady] = useState(false);
  const [officialContextOptions, setOfficialContextOptions] =
    useState<HeaderContextOptions | null>(null);
  const contextOptions = isDemoEnvironment
    ? demoHeaderContextOptions
    : officialContextOptions ?? emptyOfficialContextOptions;
  const countryOptions = contextOptions.countries;
  const companyOptions = contextOptions.companies;
  const businessLineOptions = contextOptions.businessLines;
  const branchOptions = contextOptions.branches;
  const operationalAreaOptions = contextOptions.operationalAreas;
  const scopedBranchAccess = isBranchManagerScopedAccess(currentUserAccess)
    ? currentUserAccess
    : null;
  const scopedCompanyAccess =
    currentUserAccess?.scope.companyId &&
    currentUserAccess.scope.companyId !== consolidatedCompanyId
    ? currentUserAccess
    : null;
  const scopedAreaAccess =
    scopedCompanyAccess?.scope.operationalAreaId && !scopedBranchAccess
      ? scopedCompanyAccess
      : null;
  const scopedBusinessLine = scopedCompanyAccess
    ? findBusinessLineByCompanyScope(
        businessLineOptions,
        scopedCompanyAccess.scope.companyId,
        scopedCompanyAccess.scope.companyName,
      )
    : null;
  const demoScopedBusinessLine =
    isDemoEnvironment && demoBusinessLineCode && !scopedCompanyAccess
      ? businessLineOptions.find(
          (line) =>
            line.code === demoBusinessLineCode && !line.isConsolidated,
        ) ?? null
      : null;
  const managerFilterOptions = useMemo<NamedFilterOption[]>(() => {
    if (isDemoEnvironment) {
      return contextOptions.managers.length > 0
        ? [...contextOptions.managers]
        : [...demoManagerOptions];
    }

    const allManagersOption = {
      id: allManagersValue,
      name: scopedCompanyAccess
        ? "Todos los gerentes permitidos"
        : allManagersLabel,
    };

    return [
      allManagersOption,
      ...contextOptions.managers.filter(
        (manager) => manager.id !== allManagersValue,
      ),
    ];
  }, [contextOptions.managers, isDemoEnvironment, scopedCompanyAccess]);
  const professionalOptions = useMemo<readonly NamedFilterOption[]>(
    () =>
      isDemoEnvironment
        ? demoProfessionalOptions
        : [{ id: allProfessionalsValue, name: allProfessionalsLabel }],
    [isDemoEnvironment],
  );
  const serviceOptions = useMemo<readonly NamedFilterOption[]>(
    () =>
      isDemoEnvironment
        ? demoServiceOptions
        : [{ id: allServicesValue, name: allServicesLabel }],
    [isDemoEnvironment],
  );
  const payerOptions = useMemo<readonly NamedFilterOption[]>(
    () =>
      isDemoEnvironment
        ? demoPayerOptions
        : [{ id: allPayersValue, name: allPayersLabel }],
    [isDemoEnvironment],
  );
  const channelOptions = useMemo<readonly NamedFilterOption[]>(
    () =>
      isDemoEnvironment
        ? demoChannelOptions
        : [{ id: allChannelsValue, name: allChannelsLabel }],
    [isDemoEnvironment],
  );
  const effectiveCountryId =
    scopedCompanyAccess?.scope.countryId ?? countryId;
  const effectiveCompanyId =
    scopedCompanyAccess?.scope.companyId ?? companyId;
  const selectedCountry = countryOptions.find(
    (country) => country.id === effectiveCountryId,
  );
  const selectedCompany = companyOptions.find(
    (company) => company.id === effectiveCompanyId,
  );
  const selectedManager =
    managerFilterOptions.find((manager) => manager.id === managerId) ??
    managerFilterOptions[0] ??
    { id: allManagersValue, name: allManagersLabel };
  const selectedProfessional =
    professionalOptions.find((professional) => professional.id === professionalId) ??
    professionalOptions[0] ??
    { id: allProfessionalsValue, name: allProfessionalsLabel };
  const selectedService =
    serviceOptions.find((service) => service.id === serviceId) ??
    serviceOptions[0] ??
    { id: allServicesValue, name: allServicesLabel };
  const selectedPayer =
    payerOptions.find((payer) => payer.id === payerId) ??
    payerOptions[0] ??
    { id: allPayersValue, name: allPayersLabel };
  const selectedChannel =
    channelOptions.find((channel) => channel.id === channelId) ??
    channelOptions[0] ??
    { id: allChannelsValue, name: allChannelsLabel };
  const replaceRouteSearchParams = useCallback(
    (searchParams: URLSearchParams) => {
      const serializedParams = searchParams.toString();
      const currentPathname = window.location.pathname;
      const nextHref = serializedParams
        ? `${currentPathname}?${serializedParams}`
        : currentPathname;
      const currentHref = `${window.location.pathname}${window.location.search}`;

      if (currentHref !== nextHref) {
        router.replace(nextHref, { scroll: false });
      }
    },
    [router],
  );

  const countryBranches = useMemo(
    () =>
      selectedCountry?.scope === "regional"
        ? branchOptions
        : branchOptions.filter(
            (branch) => branch.countryId === effectiveCountryId,
          ),
    [branchOptions, effectiveCountryId, selectedCountry?.scope],
  );

  const companies = useMemo(() => companyOptions, [companyOptions]);

  const branches = useMemo(
    () =>
      selectedCompany?.isConsolidated
        ? countryBranches
        : countryBranches.filter(
            (branch) => branch.companyId === effectiveCompanyId,
          ),
    [countryBranches, effectiveCompanyId, selectedCompany?.isConsolidated],
  );

  const operationalAreas = useMemo(
    () =>
      operationalAreaOptions.filter(
        (area) =>
          (selectedCountry?.scope === "regional" ||
            area.countryId === effectiveCountryId) &&
          (selectedCompany?.isConsolidated ||
            area.companyId === effectiveCompanyId),
      ),
    [
      effectiveCompanyId,
      effectiveCountryId,
      operationalAreaOptions,
      selectedCompany?.isConsolidated,
      selectedCountry?.scope,
    ],
  );

  useEffect(() => {
    let isMounted = true;

    fetchCurrentUserAccess().then((access) => {
      if (isMounted) {
        setCurrentUserAccess(access);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isDemoEnvironment) {
      setOfficialContextOptions(null);
      return;
    }

    let isMounted = true;

    fetch("/api/context/options", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json().catch(() => null)) as
          | OfficialContextOptionsResponse
          | null;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setOfficialContextOptions(
          payload?.ok === true && payload.options
            ? payload.options
            : emptyOfficialContextOptions,
        );
      })
      .catch(() => {
        if (isMounted) {
          setOfficialContextOptions(emptyOfficialContextOptions);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isDemoEnvironment]);

  useEffect(() => {
    function syncDemoBusinessLine() {
      if (!isDemoEnvironment) {
        setDemoBusinessLineCode(null);
        return;
      }

      setDemoBusinessLineCode(
        window.localStorage.getItem(demoBusinessLineStorageKey) ??
          window.sessionStorage.getItem(demoBusinessLineStorageKey),
      );
    }

    syncDemoBusinessLine();
    window.addEventListener("storage", syncDemoBusinessLine);
    window.addEventListener(roleChangeEvent, syncDemoBusinessLine);

    return () => {
      window.removeEventListener("storage", syncDemoBusinessLine);
      window.removeEventListener(roleChangeEvent, syncDemoBusinessLine);
    };
  }, [isDemoEnvironment]);

  useEffect(() => {
    if (!isDemoEnvironment && officialContextOptions === null) {
      return;
    }

    const searchParams = new URLSearchParams(routeSearchParams.toString());
    const storedContext = isDemoEnvironment ? readStoredContext() : null;
    const nextContext = createGlobalFilterContextFromSearchParams(
      searchParams,
      storedContext,
      {
        branches: branchOptions,
        businessLines: businessLineOptions,
        channels: channelOptions,
        companies: companyOptions,
        countries: countryOptions,
        managers: managerFilterOptions,
        operationalAreas: operationalAreaOptions,
        payers: payerOptions,
        professionals: professionalOptions,
        services: serviceOptions,
      },
    );

    setCountryId(nextContext.countryId);
    setCompanyId(nextContext.companyId);
    setBusinessLineId(nextContext.businessLineId);
    setBranchId(nextContext.branchId);
    setOperationalAreaId(nextContext.operationalAreaId);
    setManagerId(nextContext.managerId);
    setProfessionalId(nextContext.professionalId);
    setServiceId(nextContext.serviceId);
    setPayerId(nextContext.payerId);
    setChannelId(nextContext.channelId);
    setPeriodStart(nextContext.periodStart);
    setPeriodEnd(nextContext.periodEnd);
    setRouteContextReady(true);
  }, [
    branchOptions,
    businessLineOptions,
    channelOptions,
    companyOptions,
    countryOptions,
    isDemoEnvironment,
    managerFilterOptions,
    operationalAreaOptions,
    officialContextOptions,
    payerOptions,
    professionalOptions,
    routeSearchParams,
    serviceOptions,
  ]);

  useEffect(() => {
    if (scopedCompanyAccess || countryOptions.length === 0) {
      return;
    }

    const nextCountryId = countryOptions[0]?.id ?? "";
    setCountryId((currentCountryId) =>
      countryOptions.some((country) => country.id === currentCountryId)
        ? currentCountryId
        : nextCountryId,
    );
  }, [countryOptions, scopedCompanyAccess]);

  useEffect(() => {
    if (scopedCompanyAccess || businessLineOptions.length === 0) {
      return;
    }

    const nextBusinessLineId = businessLineOptions[0]?.id ?? "";
    setBusinessLineId((currentBusinessLineId) =>
      businessLineOptions.some((line) => line.id === currentBusinessLineId)
        ? currentBusinessLineId
        : nextBusinessLineId,
    );
  }, [businessLineOptions, scopedCompanyAccess]);

  useEffect(() => {
    if (scopedCompanyAccess || companies.length === 0) {
      return;
    }

    const nextCompanyId = companies[0]?.id ?? "";
    setCompanyId((currentCompanyId) =>
      companies.some((company) => company.id === currentCompanyId)
        ? currentCompanyId
        : nextCompanyId,
    );
  }, [companies, scopedCompanyAccess]);

  useEffect(() => {
    if (scopedBranchAccess) {
      return;
    }

    setBranchId((currentBranchId) =>
      currentBranchId === allBranchesValue ||
      branches.some((branch) => branch.id === currentBranchId)
        ? currentBranchId
      : allBranchesValue,
    );
  }, [branches, scopedBranchAccess]);

  useEffect(() => {
    if (scopedBranchAccess) {
      return;
    }

    setOperationalAreaId((currentOperationalAreaId) =>
      currentOperationalAreaId === allOperationalAreasValue ||
      operationalAreas.some((area) => area.id === currentOperationalAreaId)
        ? currentOperationalAreaId
        : allOperationalAreasValue,
    );
  }, [operationalAreas, scopedBranchAccess]);

  useEffect(() => {
    setManagerId((currentManagerId) =>
      managerFilterOptions.some((manager) => manager.id === currentManagerId)
        ? currentManagerId
        : allManagersValue,
    );
  }, [managerFilterOptions]);

  useEffect(() => {
    setProfessionalId((currentProfessionalId) =>
      professionalOptions.some(
        (professional) => professional.id === currentProfessionalId,
      )
        ? currentProfessionalId
        : allProfessionalsValue,
    );
  }, [professionalOptions]);

  useEffect(() => {
    setServiceId((currentServiceId) =>
      serviceOptions.some((service) => service.id === currentServiceId)
        ? currentServiceId
        : allServicesValue,
    );
  }, [serviceOptions]);

  useEffect(() => {
    setPayerId((currentPayerId) =>
      payerOptions.some((payer) => payer.id === currentPayerId)
        ? currentPayerId
        : allPayersValue,
    );
  }, [payerOptions]);

  useEffect(() => {
    setChannelId((currentChannelId) =>
      channelOptions.some((channel) => channel.id === currentChannelId)
        ? currentChannelId
        : allChannelsValue,
    );
  }, [channelOptions]);

  useEffect(() => {
    if (!scopedBranchAccess) {
      return;
    }

    setAdvancedFiltersOpen(false);
    setBusinessLineId(scopedBusinessLine?.id ?? businessLineOptions[0]?.id ?? "");
    setCompanyId(scopedBranchAccess.scope.companyId ?? scopedBusinessLine?.companyId ?? "");
    setCountryId(scopedBranchAccess.scope.countryId ?? getInitialCountryId());
    setBranchId(scopedBranchAccess.scope.branchId ?? scopedBranchAccess.scope.branchName);
    setOperationalAreaId(allOperationalAreasValue);
    setManagerId(allManagersValue);
    setProfessionalId(allProfessionalsValue);
    setServiceId(allServicesValue);
    setPayerId(allPayersValue);
    setChannelId(allChannelsValue);
  }, [
    scopedBranchAccess,
    businessLineOptions,
    scopedBusinessLine?.companyId,
    scopedBusinessLine?.id,
  ]);

  useEffect(() => {
    if (!scopedCompanyAccess || scopedBranchAccess) {
      return;
    }

    setBusinessLineId(scopedBusinessLine?.id ?? businessLineOptions[0]?.id ?? "");
    setCompanyId(scopedCompanyAccess.scope.companyId ?? scopedBusinessLine?.companyId ?? "");
    setCountryId(scopedCompanyAccess.scope.countryId ?? getInitialCountryId());
    setOperationalAreaId(
      scopedAreaAccess?.scope.operationalAreaId ?? allOperationalAreasValue,
    );
    setBranchId(allBranchesValue);
  }, [
    scopedAreaAccess?.scope.operationalAreaId,
    scopedBranchAccess,
    businessLineOptions,
    scopedBusinessLine?.companyId,
    scopedBusinessLine?.id,
    scopedCompanyAccess,
  ]);

  useEffect(() => {
    if (scopedBranchAccess || !demoScopedBusinessLine) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has("line")) {
      return;
    }

    setBusinessLineId((currentBusinessLineId) => {
      const currentBusinessLine = businessLineOptions.find(
        (line) => line.id === currentBusinessLineId,
      );

      return !currentBusinessLine || currentBusinessLine.isConsolidated
        ? demoScopedBusinessLine.id
        : currentBusinessLineId;
    });
    setCompanyId((currentCompanyId) => {
      const currentCompany = companyOptions.find(
        (company) => company.id === currentCompanyId,
      );
      const demoCompany = findCompanyForBusinessLine(
        businessLineOptions,
        companyOptions,
        demoScopedBusinessLine.id,
      );

      return !currentCompany || currentCompany.isConsolidated
        ? demoCompany.id
        : currentCompanyId;
    });
  }, [
    businessLineOptions,
    companyOptions,
    demoScopedBusinessLine,
    scopedBranchAccess,
  ]);

  useEffect(() => {
    if (!routeContextReady) {
      return;
    }

    if (
      !isDemoEnvironment &&
      (officialContextOptions === null ||
        countryOptions.length === 0 ||
        companyOptions.length === 0 ||
        businessLineOptions.length === 0)
    ) {
      return;
    }

    const country = countryOptions.find((item) => item.id === effectiveCountryId);
    const company = companyOptions.find((item) => item.id === effectiveCompanyId);
    const businessLine =
      scopedBusinessLine ??
      businessLineOptions.find((item) => item.id === businessLineId);
    const businessLineCompany =
      businessLine?.companyId
        ? companyOptions.find((item) => item.id === businessLine.companyId)
        : company;
    const branch = branchOptions.find((item) => item.id === branchId);
    const operationalArea = operationalAreaOptions.find(
      (item) => item.id === operationalAreaId,
    );

    if (!businessLine) {
      return;
    }

    const contextBranchFallbackName = scopedAreaAccess
      ? "Todas mis sucursales"
      : country?.scope === "regional"
        ? "Todas las sucursales de la region"
        : "Todas las sucursales permitidas";
    const branchName =
      scopedBranchAccess?.scope.branchName ??
      branch?.name ??
      contextBranchFallbackName;
    const contextBranchId =
      scopedBranchAccess?.scope.branchId ??
      scopedBranchAccess?.scope.branchName ??
      branchId;
    const contextCountryId =
      scopedCompanyAccess?.scope.countryId ??
      country?.id ??
      effectiveCountryId ??
      getInitialCountryId();
    const contextCompanyId =
      scopedCompanyAccess?.scope.companyId ??
      businessLineCompany?.id ??
      company?.id ??
      companyOptions.find((item) => item.isConsolidated)?.id ??
      consolidatedCompanyId;
    const context = resolveGlobalFilterContext({
      branchId: contextBranchId,
      branchName,
      businessLineCode: businessLine.code,
      businessLineId: businessLine.id,
      businessLineName: businessLine.name,
      companyId: contextCompanyId,
      companyName:
        scopedCompanyAccess?.scope.companyName ??
        businessLineCompany?.name ??
        company?.name ??
        businessLine.name,
      countryId: contextCountryId,
      countryName:
        scopedCompanyAccess?.scope.countryName ?? country?.name ?? "Pais asignado",
      dateFrom: periodStart,
      dateTo: periodEnd,
      isDemo: isDemoEnvironment,
      managerId: scopedBranchAccess ? allManagersValue : managerId,
      managerName: scopedBranchAccess
        ? scopedBranchAccess.scope.branchName
        : selectedManager.name,
      operationalAreaId: scopedBranchAccess
        ? allOperationalAreasValue
        : scopedAreaAccess?.scope.operationalAreaId ?? operationalAreaId,
      operationalAreaName: scopedBranchAccess
        ? undefined
        : scopedAreaAccess?.scope.operationalAreaName ?? operationalArea?.name,
      payerId,
      periodStart,
      periodEnd,
      professionalId,
      serviceId,
      channelId,
    }, {
      branches: branchOptions,
      businessLines: businessLineOptions,
      channels: channelOptions,
      companies: companyOptions,
      countries: countryOptions,
      managers: managerFilterOptions,
      operationalAreas: operationalAreaOptions,
      payers: payerOptions,
      professionals: professionalOptions,
      services: serviceOptions,
    });

    window.localStorage.setItem(storageKey, JSON.stringify(context));
    window.sessionStorage.setItem(storageKey, JSON.stringify(context));

    const searchParams = toGlobalFilterSearchParams(context);
    replaceRouteSearchParams(searchParams);
    window.dispatchEvent(new Event(contextChangeEvent));
  }, [
    branchId,
    businessLineId,
    businessLineOptions,
    branchOptions,
    channelId,
    channelOptions,
    companyId,
    companyOptions,
    countryId,
    countryOptions,
    effectiveCompanyId,
    effectiveCountryId,
    managerId,
    managerFilterOptions,
    operationalAreaId,
    operationalAreaOptions,
    payerId,
    payerOptions,
    periodEnd,
    periodStart,
    professionalId,
    professionalOptions,
    routeContextReady,
    currentUserAccess,
    scopedBranchAccess,
    scopedBusinessLine,
    scopedAreaAccess,
    scopedCompanyAccess,
    isDemoEnvironment,
    officialContextOptions,
    replaceRouteSearchParams,
    selectedManager.name,
    serviceId,
    serviceOptions,
  ]);

  function handleBusinessLineChange(nextBusinessLineId: string) {
    const nextCompanyId =
      scopedCompanyAccess?.scope.companyId ??
      findCompanyForBusinessLine(
        businessLineOptions,
        companyOptions,
        nextBusinessLineId,
      ).id;

    setBusinessLineId(nextBusinessLineId);
    setCompanyId(nextCompanyId);
    setBranchId(allBranchesValue);
    setOperationalAreaId(allOperationalAreasValue);
    setManagerId(allManagersValue);
  }

  const selectedBranch = branchOptions.find((item) => item.id === branchId);
  const selectedOperationalArea = operationalAreaOptions.find(
    (item) => item.id === operationalAreaId,
  );
  const branchAllLabel = scopedAreaAccess
    ? "Todas mis sucursales"
    : selectedCountry?.scope === "regional"
      ? "Todas las sucursales de la region"
      : allBranchesLabel;
  const areaAllLabel = scopedAreaAccess
    ? "Mis areas asignadas"
    : allOperationalAreasLabel;
  const branchName =
    scopedBranchAccess?.scope.branchName ??
    selectedBranch?.name ??
    branchAllLabel;
  const periodLabel = formatPeriodLabel(periodStart, periodEnd);
  const lineLabel =
    scopedBusinessLine?.name ??
    businessLineOptions.find((line) => line.id === businessLineId)?.name ??
    "Linea asignada";
  const companyLabel =
    scopedCompanyAccess?.scope.companyName ??
    selectedCompany?.name ??
    lineLabel;
  const countryLabel =
    scopedCompanyAccess?.scope.countryName ??
    selectedCountry?.name ??
    "Pais asignado";
  const areaLabel =
    scopedAreaAccess?.scope.operationalAreaName ??
    selectedOperationalArea?.name ??
    areaAllLabel;
  const isLineLocked = Boolean(scopedCompanyAccess);
  const isAreaLocked = Boolean(scopedAreaAccess && operationalAreas.length <= 1);
  const isSecondaryFilterDisabled = !isDemoEnvironment;

  if (scopedBranchAccess) {
    return (
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex min-w-0 flex-col gap-2 2xl:flex-row 2xl:items-center">
          <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-lg border-2 border-primary/50 bg-accent/90 px-3 py-2 text-xs shadow-sm 2xl:min-w-[310px]">
            <BriefcaseBusiness className="size-4 shrink-0 text-primary" />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="font-semibold uppercase text-primary">
                Linea asignada
              </span>
              <span className="truncate text-base font-semibold text-accent-foreground">
                {lineLabel}
              </span>
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-background/90 p-2 shadow-sm">
            <div className="flex h-9 min-w-44 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
              <LockKeyhole className="size-3.5 shrink-0 text-primary" />
              <span className="font-medium">Acceso de sucursal</span>
            </div>
            <div className="min-w-0 flex-1 truncate px-1 text-sm">
              <span className="font-medium">{branchName}</span>
              <span className="text-muted-foreground"> · {companyLabel}</span>
              <span className="text-muted-foreground"> · {countryLabel}</span>
              <span className="text-muted-foreground"> · {periodLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 flex-1 gap-2">
      <div className="flex min-w-0 flex-col gap-2 2xl:flex-row 2xl:items-center">
        <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-lg border-2 border-primary/50 bg-accent/90 px-3 py-2 text-xs shadow-sm 2xl:min-w-[310px]">
          <BriefcaseBusiness className="size-4 shrink-0 text-primary" />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="font-semibold uppercase text-primary">
              {isLineLocked ? "Linea asignada" : "Linea activa"}
            </span>
            {isLineLocked ? (
              <span className="truncate text-base font-semibold text-accent-foreground">
                {lineLabel}
              </span>
            ) : (
              <select
                aria-label="Linea de negocio activa"
                className="min-w-0 bg-transparent text-base font-semibold text-accent-foreground outline-none"
                value={businessLineId}
                onChange={(event) => handleBusinessLineChange(event.target.value)}
              >
                {businessLineOptions.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
            )}
          </span>
        </label>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-background/90 p-2 shadow-sm">
          <label className="flex h-9 min-w-44 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <Globe2 className="size-3.5 shrink-0 text-muted-foreground" />
            <select
              aria-label="Pais o region"
              className="min-w-0 flex-1 bg-transparent outline-none"
              disabled={Boolean(scopedCompanyAccess?.scope.countryId)}
              value={effectiveCountryId}
              onChange={(event) => setCountryId(event.target.value)}
            >
              {countryOptions.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <div className="min-w-0 flex-1 truncate px-1 text-sm">
            <span className="font-medium">
              {selectedCompany?.name ?? "Vista consolidada"}
            </span>
            <span className="text-muted-foreground"> · {branchName}</span>
            <span className="text-muted-foreground"> · {areaLabel}</span>
            <span className="text-muted-foreground"> · {periodLabel}</span>
          </div>

          <button
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-background px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
            onClick={() => setAdvancedFiltersOpen((isOpen) => !isOpen)}
            type="button"
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
          </button>

          <span
            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            title={`${selectedProfessional.name} · ${selectedPayer.name} · ${selectedChannel.name}`}
          >
            {selectedManager.name} · {selectedService.name} ·{" "}
            {isDemoEnvironment ? "DEMO" : "Oficial"}
          </span>
        </div>
      </div>

      {advancedFiltersOpen ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-background/95 p-2 shadow-sm">
          <div className="px-2 text-xs font-semibold text-muted-foreground">
            Filtros avanzados
          </div>
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Area operativa"
              className="min-w-48 bg-transparent outline-none"
              disabled={isAreaLocked}
              value={operationalAreaId}
              onChange={(event) => setOperationalAreaId(event.target.value)}
            >
              <option value={allOperationalAreasValue}>{areaAllLabel}</option>
              {operationalAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <MapPin className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Sucursal"
              className="min-w-44 bg-transparent outline-none"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value={allBranchesValue}>{branchAllLabel}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <UsersRound className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Gerente"
              className="min-w-40 bg-transparent outline-none"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
            >
              {managerFilterOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <UsersRound className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Profesional"
              className="min-w-44 bg-transparent outline-none"
              disabled={isSecondaryFilterDisabled}
              value={professionalId}
              onChange={(event) => setProfessionalId(event.target.value)}
            >
              {professionalOptions.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Servicio"
              className="min-w-44 bg-transparent outline-none"
              disabled={isSecondaryFilterDisabled}
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
            >
              {serviceOptions.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Pagador"
              className="min-w-40 bg-transparent outline-none"
              disabled={isSecondaryFilterDisabled}
              value={payerId}
              onChange={(event) => setPayerId(event.target.value)}
            >
              {payerOptions.map((payer) => (
                <option key={payer.id} value={payer.id}>
                  {payer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-2 text-xs">
            <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
            <select
              aria-label="Canal"
              className="min-w-40 bg-transparent outline-none"
              disabled={isSecondaryFilterDisabled}
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
            >
              {channelOptions.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-2 text-xs">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <input
              aria-label="Fecha desde"
              className="w-28 bg-transparent outline-none"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
          </label>

          <label className="flex h-10 items-center gap-2 rounded-md border bg-muted/40 px-2 text-xs">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <input
              aria-label="Fecha hasta"
              className="w-28 bg-transparent outline-none"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
