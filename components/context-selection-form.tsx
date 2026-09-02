"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Globe2,
  MapPin,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type BusinessLineOption,
  type BranchOption,
  type CompanyOption,
  type CountryOption,
  getDefaultPeriod,
} from "@/lib/tenant/demo-context";
import {
  allBranchesValue,
  createGlobalFilterContextFromSearchParams,
  globalContextChangeEvent as contextChangeEvent,
  globalContextStorageKey as storageKey,
  resolveGlobalFilterContext,
  toGlobalFilterSearchParams,
  type GlobalFilterInput,
} from "@/lib/analytics/global-filters";

type ContextSelectionFormProps = {
  userEmail: string;
  countries: CountryOption[];
  companies: CompanyOption[];
  businessLines: BusinessLineOption[];
  branches: BranchOption[];
  isDemoEnvironment: boolean;
};

function readStoredContext() {
  const rawContext =
    window.localStorage.getItem(storageKey) ??
    window.sessionStorage.getItem(storageKey);

  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as GlobalFilterInput;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

export function ContextSelectionForm({
  userEmail,
  countries,
  companies,
  businessLines,
  branches,
  isDemoEnvironment,
}: ContextSelectionFormProps) {
  const router = useRouter();
  const initialCountry = countries[0];
  const [countryId, setCountryId] = useState(initialCountry?.id ?? "");
  const [companyId, setCompanyId] = useState("");
  const [businessLineId, setBusinessLineId] = useState(
    businessLines[0]?.id ?? "",
  );
  const [branchId, setBranchId] = useState(allBranchesValue);
  const [periodStart, setPeriodStart] = useState(`${getDefaultPeriod()}-01`);
  const [periodEnd, setPeriodEnd] = useState(`${getDefaultPeriod()}-31`);
  const selectedCountry = countries.find((country) => country.id === countryId);
  const selectedCompany = companies.find((company) => company.id === companyId);
  const selectedBusinessLine = businessLines.find(
    (businessLine) => businessLine.id === businessLineId,
  );

  const countryBranches = useMemo(
    () =>
      selectedCountry?.scope === "regional"
        ? branches
        : branches.filter((branch) => branch.countryId === countryId),
    [branches, countryId, selectedCountry?.scope],
  );

  const availableCompanies = useMemo(() => companies, [companies]);

  const availableBranches = useMemo(
    () =>
      selectedCompany?.isConsolidated
        ? countryBranches
        : countryBranches.filter((branch) => branch.companyId === companyId),
    [companyId, countryBranches, selectedCompany?.isConsolidated],
  );

  useEffect(() => {
    const nextCompany = availableCompanies[0]?.id ?? "";
    setCompanyId((currentCompanyId) =>
      availableCompanies.some((company) => company.id === currentCompanyId)
        ? currentCompanyId
        : nextCompany,
    );
  }, [availableCompanies]);

  useEffect(() => {
    setBranchId((currentBranchId) =>
      currentBranchId === allBranchesValue ||
      availableBranches.some((branch) => branch.id === currentBranchId)
        ? currentBranchId
        : allBranchesValue,
    );
  }, [availableBranches]);

  const selectedBranch =
    branchId === allBranchesValue
      ? null
      : branches.find((branch) => branch.id === branchId);
  const allBranchesLabel =
    selectedCountry?.scope === "regional"
      ? "Todas las sucursales de la region"
      : "Todas las sucursales permitidas";

  const canContinue =
    selectedCountry !== undefined &&
    selectedCompany !== undefined &&
    selectedBusinessLine !== undefined &&
    periodStart.length > 0 &&
    periodEnd.length > 0;

  useEffect(() => {
    if (!isDemoEnvironment) {
      return;
    }

    const nextContext = createGlobalFilterContextFromSearchParams(
      new URLSearchParams(window.location.search),
      readStoredContext(),
    );

    setCountryId(nextContext.countryId);
    setCompanyId(nextContext.companyId);
    setBusinessLineId(nextContext.businessLineId);
    setBranchId(nextContext.branchId);
    setPeriodStart(nextContext.periodStart);
    setPeriodEnd(nextContext.periodEnd);
  }, [isDemoEnvironment]);

  if (
    countries.length === 0 ||
    companies.length === 0 ||
    businessLines.length === 0
  ) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8">
        <div className="flex flex-col gap-3">
          <Badge className="w-fit bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Datos oficiales
          </Badge>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{userEmail}</p>
            <h1 className="text-3xl font-semibold tracking-normal text-foreground">
              No hay contexto oficial configurado
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Produccion esta limpia y lista para cargar organizaciones,
              empresas, sucursales y cierres reales autorizados.
            </p>
          </div>
        </div>
      </section>
    );
  }

  function businessLineForCompany(companyId: string) {
    return (
      businessLines.find((businessLine) => businessLine.companyId === companyId) ??
      businessLines[0]
    );
  }

  function companyForBusinessLine(businessLineId: string) {
    const businessLine = businessLines.find(
      (line) => line.id === businessLineId,
    );

    if (!businessLine || businessLine.isConsolidated || !businessLine.companyId) {
      return companies.find((company) => company.isConsolidated) ?? companies[0];
    }

    return (
      companies.find((company) => company.id === businessLine.companyId) ??
      companies[0]
    );
  }

  function handleCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    setBusinessLineId(businessLineForCompany(nextCompanyId)?.id ?? "");
    setBranchId(allBranchesValue);
  }

  function handleBusinessLineChange(nextBusinessLineId: string) {
    const nextCompany = companyForBusinessLine(nextBusinessLineId);

    setBusinessLineId(nextBusinessLineId);
    setCompanyId(nextCompany?.id ?? "");
    setBranchId(allBranchesValue);
  }

  function saveContext() {
    if (!selectedCountry || !selectedCompany || !selectedBusinessLine) {
      return;
    }

    const context = resolveGlobalFilterContext(
      {
        branchId,
        businessLineCode: selectedBusinessLine.code,
        businessLineId: selectedBusinessLine.id,
        businessLineName: selectedBusinessLine.name,
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        countryId: selectedCountry.id,
        countryName: selectedCountry.name,
        dateFrom: periodStart,
        dateTo: periodEnd,
        isDemo: isDemoEnvironment,
        period: `${periodStart} a ${periodEnd}`,
        periodStart,
        periodEnd,
      },
      {
        branches,
        businessLines,
        companies,
        countries,
      },
    );

    window.localStorage.setItem(storageKey, JSON.stringify(context));
    window.sessionStorage.setItem(storageKey, JSON.stringify(context));
    window.dispatchEvent(new Event(contextChangeEvent));

    const params = toGlobalFilterSearchParams(context);

    router.push(`/protected/overview?${params.toString()}`);
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8">
      <div className="flex flex-col gap-3">
        <Badge
          className={
            isDemoEnvironment
              ? "w-fit bg-amber-100 text-amber-800 hover:bg-amber-100"
              : "w-fit bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
          }
        >
          {isDemoEnvironment ? "Entorno DEMO" : "Datos oficiales"}
        </Badge>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{userEmail}</p>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">
            Elige que negocio quieres ver
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Pensado para CEO, gerente de operaciones y gerente de sucursal:
            selecciona region o pais, unidad de negocio, sucursal y periodo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="flex min-h-32 flex-col gap-3 rounded-md border bg-card p-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Globe2 className="size-4 text-primary" />
            Pais o region
          </span>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            value={countryId}
            onChange={(event) => setCountryId(event.target.value)}
          >
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {selectedCountry?.currencyCode ?? "Sin moneda"}
          </span>
        </label>

        <label className="flex min-h-32 flex-col gap-3 rounded-md border bg-card p-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 text-primary" />
            Empresa o unidad
          </span>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            value={companyId}
            onChange={(event) => handleCompanyChange(event.target.value)}
            disabled={availableCompanies.length === 0}
          >
            {availableCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Consolidado, Fisioterapia, Laboratorio e Imagenes
          </span>
        </label>

        <label className="flex min-h-32 flex-col gap-3 rounded-md border bg-card p-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <BriefcaseBusiness className="size-4 text-primary" />
            Linea de negocio
          </span>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            value={businessLineId}
            onChange={(event) => handleBusinessLineChange(event.target.value)}
            disabled={businessLines.length === 0}
          >
            {businessLines.map((businessLine) => (
              <option key={businessLine.id} value={businessLine.id}>
                {businessLine.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Cambia las metricas: citas, ordenes, muestras o estudios.
          </span>
        </label>

        <label className="flex min-h-32 flex-col gap-3 rounded-md border bg-card p-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="size-4 text-primary" />
            Sucursal o consolidado
          </span>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            disabled={availableBranches.length === 0}
          >
            <option value={allBranchesValue}>{allBranchesLabel}</option>
            {availableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {availableBranches.length} sucursales disponibles
          </span>
        </label>

        <div className="flex min-h-32 flex-col gap-3 rounded-md border bg-card p-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="size-4 text-primary" />
            Rango de fechas
          </span>
          <div className="grid gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Desde
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Hasta
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
              />
            </label>
          </div>
          <span className="text-xs text-muted-foreground">
            El dashboard se recalcula con este rango
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-1 text-sm">
          <span className="font-medium">Vista seleccionada</span>
          <span className="text-muted-foreground">
            {selectedCountry?.name ?? "Sin pais"} /{" "}
            {selectedCompany?.name ?? "Sin empresa"} /{" "}
            {selectedBusinessLine?.name ?? "Sin linea"} /{" "}
            {selectedBranch?.name ?? allBranchesLabel} /{" "}
            {periodStart} a {periodEnd}
          </span>
        </div>
        <Button
          className="gap-2"
          disabled={!canContinue}
          onClick={saveContext}
          type="button"
        >
          <CheckCircle2 className="size-4" />
          Ver dashboard ejecutivo
        </Button>
      </div>
    </section>
  );
}
