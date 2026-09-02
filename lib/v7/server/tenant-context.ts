import "server-only";

import { cache } from "react";

import type { Actor, ScopeBoundary } from "@/lib/v7/security/types";
import {
  demoBranches,
  demoBusinessLineOptions,
  demoCompanies,
  demoCountries,
} from "@/lib/tenant/demo-context";
import { createAdminClient } from "@/lib/v7/server/admin-client";
import { hasSupabaseAdminConfiguration } from "@/lib/v7/server/env";
import { createClient } from "@/lib/supabase/server";

export type ContextOption = {
  id: string;
  name: string;
  code?: string;
  parentId?: string | null;
  countryId?: string | null;
  operationalAreaId?: string | null;
  city?: string | null;
  status?: string | null;
};

export type ManagerOption = {
  id: string;
  name: string;
  email?: string | null;
  branchId?: string | null;
  operationalAreaId?: string | null;
};

export type TenantContextOptions = {
  countries: ContextOption[];
  companies: ContextOption[];
  businessLines: ContextOption[];
  operationalAreas: ContextOption[];
  branches: ContextOption[];
  areaManagers: ManagerOption[];
  branchManagers: ManagerOption[];
  reportingMonths: ContextOption[];
  isDemo: boolean;
};

type CountryRow = { id: string; name: string; iso2: string };
type CompanyRow = { id: string; name: string; key: string };
type BranchRow = {
  id: string;
  name: string;
  code: string;
  company_id: string;
  country_id: string;
  operational_area_id: string | null;
  city: string | null;
  status: string | null;
};
type AreaRow = {
  id: string;
  name: string;
  code: string;
  company_id: string;
  country_id: string;
  manager_profile_id: string | null;
};
type LineRow = { id: string; name: string; code: string; company_id: string | null };
type BranchManagerRow = {
  id: string;
  branch_id: string;
  profile_id: string | null;
  display_name: string;
  email: string | null;
  starts_on: string | null;
  ends_on: string | null;
};
type ProfileRow = { id: string; display_name: string | null; email: string | null; status: string };

const globalRoles = new Set(["super_admin", "webmaster_admin", "ceo"]);

function grantsFor(actor: Actor) {
  return actor.scopeGrants && actor.scopeGrants.length > 0
    ? actor.scopeGrants
    : [actor.scope];
}

function matchesGrant(grant: ScopeBoundary, target: ScopeBoundary) {
  return (
    grant.organizationId === target.organizationId
    && (!grant.countryId || grant.countryId === target.countryId)
    && (!grant.companyId || grant.companyId === target.companyId)
    && (!grant.operationalAreaId || grant.operationalAreaId === target.operationalAreaId)
    && (!grant.branchId || grant.branchId === target.branchId)
  );
}

function actorCanSee(actor: Actor, target: ScopeBoundary) {
  if (globalRoles.has(actor.roleKey)) return true;
  return grantsFor(actor).some((grant) => matchesGrant(grant, target));
}

function uniqueManagerOptions(items: ManagerOption[]) {
  return Array.from(
    new Map(
      items.map((item) => [
        `${item.branchId ?? ""}|${item.operationalAreaId ?? ""}|${item.id}`,
        item,
      ]),
    ).values(),
  );
}

function reportingMonths(reference = new Date()) {
  const formatter = new Intl.DateTimeFormat("es-SV", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return Array.from({ length: 36 }, (_, offset) => {
    const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - offset, 1));
    const id = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const formatted = formatter.format(date);
    return {
      id,
      code: id,
      name: formatted.charAt(0).toUpperCase() + formatted.slice(1),
    } satisfies ContextOption;
  });
}

async function getTenantContextOptionsUncached(actor: Actor): Promise<TenantContextOptions> {
  if (actor.isDemo) {
    return {
      countries: demoCountries.map((item) => ({ id: item.id, name: item.name, code: item.iso2 })),
      companies: demoCompanies.map((item) => ({ id: item.id, name: item.name, code: item.key })),
      businessLines: demoBusinessLineOptions
        .filter((item) => item.code !== "CONSOLIDATED")
        .map((item) => ({ id: item.id, name: item.name, code: item.code, parentId: item.companyId })),
      operationalAreas: [],
      branches: demoBranches.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        parentId: item.companyId,
        countryId: item.countryId,
      })),
      areaManagers: [],
      branchManagers: [],
      reportingMonths: reportingMonths(),
      isDemo: true,
    };
  }

  // The service-role client is used only on the server and every returned row
  // is constrained again with the trusted actor grants below. This allows the
  // form to resolve manager names without broad profile SELECT policies.
  const supabase = hasSupabaseAdminConfiguration()
    ? createAdminClient()
    : await createClient();
  const organizationId = actor.scope.organizationId;

  const [
    countriesResult,
    companiesResult,
    linesResult,
    areasResult,
    branchesResult,
    branchManagersResult,
  ] = await Promise.all([
    supabase.from("countries").select("id,name,iso2").eq("organization_id", organizationId).order("name"),
    supabase.from("companies").select("id,name,key").eq("organization_id", organizationId).order("name"),
    supabase.from("business_lines").select("id,name,code,company_id").eq("organization_id", organizationId).eq("is_enabled", true).order("name"),
    supabase.from("operational_areas").select("id,name,code,company_id,country_id,manager_profile_id").eq("organization_id", organizationId).eq("status", "active").order("name"),
    supabase.from("branches").select("id,name,code,company_id,country_id,operational_area_id,city,status").eq("organization_id", organizationId).in("status", ["active", "pending_manager"]).order("name"),
    supabase.from("branch_managers").select("id,branch_id,profile_id,display_name,email,starts_on,ends_on").eq("organization_id", organizationId).eq("is_demo", false).order("display_name"),
  ]);

  const countries = (countriesResult.data ?? []) as CountryRow[];
  const companies = (companiesResult.data ?? []) as CompanyRow[];
  const lines = (linesResult.data ?? []) as LineRow[];
  const areas = (areasResult.data ?? []) as AreaRow[];
  const branches = (branchesResult.data ?? []) as BranchRow[];
  const branchManagerRows = (branchManagersResult.data ?? []) as BranchManagerRow[];

  const visibleBranches = branches.filter((item) => actorCanSee(actor, {
    organizationId,
    countryId: item.country_id,
    companyId: item.company_id,
    operationalAreaId: item.operational_area_id,
    branchId: item.id,
  }));
  const visibleBranchAreaIds = new Set(
    visibleBranches
      .map((item) => item.operational_area_id)
      .filter((value): value is string => Boolean(value)),
  );
  const visibleAreas = areas.filter((item) =>
    visibleBranchAreaIds.has(item.id)
    || actorCanSee(actor, {
      organizationId,
      countryId: item.country_id,
      companyId: item.company_id,
      operationalAreaId: item.id,
    }),
  );

  const visibleBranchIds = new Set(visibleBranches.map((item) => item.id));
  const visibleCompanyIds = new Set<string>([
    ...visibleBranches.map((item) => item.company_id),
    ...visibleAreas.map((item) => item.company_id),
    ...grantsFor(actor).map((grant) => grant.companyId).filter((value): value is string => Boolean(value)),
  ]);
  const visibleCountryIds = new Set<string>([
    ...visibleBranches.map((item) => item.country_id),
    ...visibleAreas.map((item) => item.country_id),
    ...grantsFor(actor).map((grant) => grant.countryId).filter((value): value is string => Boolean(value)),
  ]);

  const isGlobal = globalRoles.has(actor.roleKey);
  const visibleCompanies = isGlobal
    ? companies
    : companies.filter((item) => visibleCompanyIds.has(item.id));
  const allowedCompanyIds = new Set(visibleCompanies.map((item) => item.id));
  const visibleCountries = isGlobal
    ? countries
    : countries.filter((item) => visibleCountryIds.has(item.id));
  const visibleLines = lines.filter((item) => !item.company_id || isGlobal || allowedCompanyIds.has(item.company_id));

  const areaManagerIds = Array.from(new Set(
    visibleAreas.map((item) => item.manager_profile_id).filter((value): value is string => Boolean(value)),
  ));
  const branchManagerProfileIds = Array.from(new Set(
    branchManagerRows
      .filter((item) => visibleBranchIds.has(item.branch_id))
      .map((item) => item.profile_id)
      .filter((value): value is string => Boolean(value)),
  ));
  const profileIds = Array.from(new Set([...areaManagerIds, ...branchManagerProfileIds]));
  const profilesResult = profileIds.length > 0
    ? await supabase.from("profiles").select("id,display_name,email,status").in("id", profileIds)
    : { data: [] };
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((item) => [item.id, item]));

  const today = new Date().toISOString().slice(0, 10);
  const branchManagers: ManagerOption[] = branchManagerRows
    .filter((item) => visibleBranchIds.has(item.branch_id))
    .filter((item) => !item.ends_on || item.ends_on >= today)
    .map((item) => {
      const profile = item.profile_id ? profileById.get(item.profile_id) : null;
      return {
        id: item.profile_id ?? item.id,
        name: profile?.display_name ?? item.display_name,
        email: profile?.email ?? item.email,
        branchId: item.branch_id,
      };
    });

  const areaManagers: ManagerOption[] = visibleAreas
    .filter((item) => item.manager_profile_id)
    .map((item) => {
      const profile = profileById.get(item.manager_profile_id!);
      return {
        id: item.manager_profile_id!,
        name: profile?.display_name ?? "Gerente de área pendiente",
        email: profile?.email ?? null,
        operationalAreaId: item.id,
      };
    });

  return {
    countries: visibleCountries.map((item) => ({ id: item.id, name: item.name, code: item.iso2 })),
    companies: visibleCompanies.map((item) => ({ id: item.id, name: item.name, code: item.key })),
    businessLines: visibleLines.map((item) => ({ id: item.id, name: item.name, code: item.code, parentId: item.company_id })),
    operationalAreas: visibleAreas.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      parentId: item.company_id,
      countryId: item.country_id,
    })),
    branches: visibleBranches.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      parentId: item.company_id,
      countryId: item.country_id,
      operationalAreaId: item.operational_area_id,
      city: item.city,
      status: item.status,
    })),
    areaManagers: uniqueManagerOptions(areaManagers),
    branchManagers: uniqueManagerOptions(branchManagers),
    reportingMonths: reportingMonths(),
    isDemo: false,
  };
}

export const getTenantContextOptions = cache(getTenantContextOptionsUncached);
