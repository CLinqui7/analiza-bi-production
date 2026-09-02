import type { BusinessLineCode } from "@/lib/analytics/kpi-registry";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import {
  getMissingDatabaseConfig,
  getPostgresPool,
  withPostgresRlsContext,
} from "@/lib/server/database";
import {
  consolidatedCompanyId,
  regionalCountryId,
  type BranchOption,
  type BusinessLineOption,
  type CompanyOption,
  type CountryOption,
  type OperationalAreaOption,
} from "@/lib/tenant/demo-context";

type OfficialCountryRow = {
  currency_code: string | null;
  date_format: string;
  id: string;
  iso2: string;
  name: string;
  time_zone: string;
};

type OfficialCompanyRow = {
  id: string;
  key: string;
  name: string;
  unit_type: CompanyOption["unitType"];
};

type OfficialOperationalAreaRow = {
  code: string;
  company_id: string;
  country_id: string;
  id: string;
  manager_name: string;
  name: string;
  organization_id: string;
  unit_type: CompanyOption["unitType"];
};

type OfficialBranchRow = {
  area_manager_name: string | null;
  area_zone: string | null;
  branch_manager_name: string | null;
  city: string;
  code: string;
  company_id: string;
  country_id: string;
  id: string;
  name: string;
  operational_area_id: string | null;
  unit_type: CompanyOption["unitType"];
};

type OfficialManagerRow = {
  id: string;
  name: string;
};

export type OfficialManagerOption = {
  id: string;
  name: string;
};

export type OfficialContextOptions = {
  branches: BranchOption[];
  businessLines: BusinessLineOption[];
  companies: CompanyOption[];
  countries: CountryOption[];
  managers: OfficialManagerOption[];
  operationalAreas: OperationalAreaOption[];
};

const unrestrictedOfficialContextRoles = new Set([
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
]);

const officialLineByUnitType: Record<
  Exclude<CompanyOption["unitType"], "consolidado">,
  BusinessLineCode
> = {
  fisioterapia: "PHYSIOTHERAPY",
  imagenes: "IMAGING",
  laboratorio: "LABORATORY",
};

function lineCodeForUnitType(unitType: CompanyOption["unitType"]) {
  return unitType === "consolidado"
    ? "CONSOLIDATED"
    : officialLineByUnitType[unitType];
}

export function canReadAllOfficialContext(actor: AuthorizationActor) {
  return unrestrictedOfficialContextRoles.has(actor.roleKey);
}

export function buildOfficialBranchAccessPredicate(actor: AuthorizationActor) {
  if (canReadAllOfficialContext(actor)) {
    return {
      parameters: [],
      predicate: "true",
    };
  }

  return {
    parameters: [actor.userId],
    predicate: `
      (
        exists (
          select 1
          from public.user_branch_access uba
          where uba.user_id = $1::uuid
            and uba.branch_id = b.id
        )
        or exists (
          select 1
          from public.manager_assignments ma
          join public.roles r on r.id = ma.role_id
          where ma.profile_id = $1::uuid
            and ma.status = 'active'
            and ma.deactivated_at is null
            and ma.organization_id = b.organization_id
            and ma.country_id = b.country_id
            and ma.company_id = b.company_id
            and (
              (
                r.key = 'gerente_area'
                and ma.branch_id is null
                and ma.operational_area_id = b.operational_area_id
              )
              or (
                r.key = 'gerente_sucursal'
                and ma.branch_id = b.id
              )
            )
        )
        or exists (
          select 1
          from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where ur.user_id = $1::uuid
            and coalesce(ur.status, 'active') = 'active'
            and ur.deactivated_at is null
            and ur.organization_id = b.organization_id
            and (ur.country_id is null or ur.country_id = b.country_id)
            and (ur.company_id is null or ur.company_id = b.company_id)
            and (
              (
                r.key = 'gerente_area'
                and ur.operational_area_id = b.operational_area_id
                and (ur.branch_id is null or ur.branch_id = b.id)
              )
              or (
                r.key = 'gerente_sucursal'
                and ur.branch_id = b.id
              )
            )
        )
      )
    `,
  };
}

function getEmptyOfficialContextOptions(): OfficialContextOptions {
  return {
    branches: [],
    businessLines: [],
    companies: [],
    countries: [],
    managers: [],
    operationalAreas: [],
  };
}

function buildOfficialOptions({
  branches,
  companies,
  countries,
  managers,
  operationalAreas,
}: {
  branches: OfficialBranchRow[];
  companies: OfficialCompanyRow[];
  countries: OfficialCountryRow[];
  managers: OfficialManagerRow[];
  operationalAreas: OfficialOperationalAreaRow[];
}): OfficialContextOptions {
  const countryOptions: CountryOption[] = countries.map((country) => ({
    currencyCode: country.currency_code ?? "USD",
    dateFormat: country.date_format,
    id: country.id,
    iso2: country.iso2,
    isDemo: false,
    name: country.name,
    timeZone: country.time_zone,
  }));
  const companyOptions: CompanyOption[] = companies.map((company) => ({
    id: company.id,
    isDemo: false,
    key: company.key,
    name: company.name,
    unitType: company.unit_type,
  }));
  const businessLines: BusinessLineOption[] = companies.map((company) => ({
    code: lineCodeForUnitType(company.unit_type),
    companyId: company.id,
    id: `business-line-${company.key}`,
    isDemo: false,
    name: company.name,
    unitType: company.unit_type,
  }));
  const branchOptions: BranchOption[] = branches.map((branch) => ({
    areaManagerName: branch.area_manager_name ?? undefined,
    areaZone: branch.area_zone ?? undefined,
    branchManagerName: branch.branch_manager_name ?? undefined,
    businessLineCode: lineCodeForUnitType(branch.unit_type),
    city: branch.city,
    code: branch.code,
    companyId: branch.company_id,
    countryId: branch.country_id,
    id: branch.id,
    isActive: true,
    isDemo: false,
    name: branch.name,
    operationalAreaId: branch.operational_area_id ?? undefined,
    sourceTrace: "official-context",
  }));
  const operationalAreaOptions: OperationalAreaOption[] = operationalAreas.map(
    (area) => ({
      areaZone: area.name,
      businessLineCode: lineCodeForUnitType(
        area.unit_type,
      ) as Exclude<BusinessLineCode, "CONSOLIDATED">,
      code: area.code,
      companyId: area.company_id,
      countryId: area.country_id,
      id: area.id,
      isDemo: false,
      managerName: area.manager_name,
      name: area.name,
      organizationId: area.organization_id,
      sourceTrace: "official-context",
    }),
  );

  return {
    branches: branchOptions,
    businessLines:
      businessLines.length > 1
        ? [
            {
              code: "CONSOLIDATED",
              companyId: null,
              id: consolidatedCompanyId,
              isConsolidated: true,
              isDemo: false,
              name: "Consolidado",
              unitType: "consolidado",
            },
            ...businessLines,
          ]
        : businessLines,
    companies:
      companyOptions.length > 1
        ? [
            {
              id: consolidatedCompanyId,
              isConsolidated: true,
              isDemo: false,
              key: "vista-consolidada",
              name: "Vista consolidada",
              unitType: "consolidado",
            },
            ...companyOptions,
          ]
        : companyOptions,
    countries:
      countryOptions.length > 1
        ? [
            {
              currencyCode: "MULTI",
              dateFormat: "dd/MM/yyyy",
              id: regionalCountryId,
              iso2: "REG",
              isDemo: false,
              name: "Vista regional",
              scope: "regional",
              timeZone: "America/El_Salvador",
            },
            ...countryOptions,
          ]
        : countryOptions,
    managers,
    operationalAreas: operationalAreaOptions,
  };
}

async function getOfficialContextOptionsFromSupabase(
  actor: AuthorizationActor,
): Promise<OfficialContextOptions> {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return getEmptyOfficialContextOptions();
  }

  const extendedBranches = await admin
    .from("branches")
    .select(
      "id, country_id, company_id, operational_area_id, code, name, city, is_enabled, is_demo",
    );
  const coreBranches = extendedBranches.error
    ? await admin
        .from("branches")
        .select("id, country_id, company_id, code, name, city, is_enabled, is_demo")
    : extendedBranches;

  if (coreBranches.error) {
    return getEmptyOfficialContextOptions();
  }

  type SupabaseBranch = {
    city: string | null;
    code: string;
    company_id: string;
    country_id: string;
    id: string;
    is_demo?: boolean | null;
    is_enabled?: boolean | null;
    name: string;
    operational_area_id?: string | null;
  };

  let branchRows = ((coreBranches.data ?? []) as SupabaseBranch[]).filter(
    (branch) => branch.is_enabled !== false && branch.is_demo !== true,
  );

  if (!canReadAllOfficialContext(actor)) {
    const branchAccess = await admin
      .from("user_branch_access")
      .select("branch_id")
      .eq("user_id", actor.userId);
    const companyAccess = await admin
      .from("user_company_access")
      .select("company_id")
      .eq("user_id", actor.userId);
    const explicitBranchIds = new Set(
      ((branchAccess.data ?? []) as Array<{ branch_id: string }>).map(
        (item) => item.branch_id,
      ),
    );
    const explicitCompanyIds = new Set(
      ((companyAccess.data ?? []) as Array<{ company_id: string }>).map(
        (item) => item.company_id,
      ),
    );

    branchRows = branchRows.filter((branch) => {
      if (actor.scope.branchId) {
        return branch.id === actor.scope.branchId;
      }

      const countryMatches =
        !actor.scope.countryId || branch.country_id === actor.scope.countryId;
      const companyMatches =
        !actor.scope.companyId || branch.company_id === actor.scope.companyId;
      const areaMatches =
        !actor.scope.operationalAreaId ||
        branch.operational_area_id === actor.scope.operationalAreaId;
      const explicitMatches =
        explicitBranchIds.size === 0 && explicitCompanyIds.size === 0
          ? true
          : explicitBranchIds.has(branch.id) ||
            explicitCompanyIds.has(branch.company_id);

      return countryMatches && companyMatches && areaMatches && explicitMatches;
    });
  }

  if (branchRows.length === 0) {
    return getEmptyOfficialContextOptions();
  }

  const countryIds = Array.from(new Set(branchRows.map((branch) => branch.country_id)));
  const companyIds = Array.from(new Set(branchRows.map((branch) => branch.company_id)));
  const areaIds = Array.from(
    new Set(
      branchRows.flatMap((branch) =>
        branch.operational_area_id ? [branch.operational_area_id] : [],
      ),
    ),
  );

  const [countriesResult, companiesResult, areasResult] = await Promise.all([
    admin
      .from("countries")
      .select("id, iso2, name, time_zone, date_format")
      .in("id", countryIds),
    admin
      .from("companies")
      .select("id, key, name, unit_type")
      .in("id", companyIds),
    areaIds.length > 0
      ? admin
          .from("operational_areas")
          .select("id, organization_id, country_id, company_id, code, name")
          .in("id", areaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (countriesResult.error || companiesResult.error) {
    return getEmptyOfficialContextOptions();
  }

  const companyRows = (companiesResult.data ?? []) as Array<{
    id: string;
    key: string;
    name: string;
    unit_type: CompanyOption["unitType"];
  }>;
  const companyById = new Map(companyRows.map((company) => [company.id, company]));

  type SupabaseCountry = {
    date_format: string | null;
    id: string;
    iso2: string;
    name: string;
    time_zone: string | null;
  };
  type SupabaseArea = {
    code: string;
    company_id: string;
    country_id: string;
    id: string;
    name: string;
    organization_id: string;
  };

  const countries: OfficialCountryRow[] = (
    (countriesResult.data ?? []) as SupabaseCountry[]
  ).map((country) => ({
    currency_code: null,
    date_format: country.date_format ?? "dd/MM/yyyy",
    id: country.id,
    iso2: country.iso2,
    name: country.name,
    time_zone: country.time_zone ?? "America/El_Salvador",
  }));
  const companies: OfficialCompanyRow[] = companyRows.map((company) => ({
    id: company.id,
    key: company.key,
    name: company.name,
    unit_type: company.unit_type,
  }));
  const branches: OfficialBranchRow[] = branchRows.flatMap((branch) => {
    const company = companyById.get(branch.company_id);

    if (!company) return [];

    return [
      {
        area_manager_name: null,
        area_zone: null,
        branch_manager_name: null,
        city: branch.city ?? "",
        code: branch.code,
        company_id: branch.company_id,
        country_id: branch.country_id,
        id: branch.id,
        name: branch.name,
        operational_area_id: branch.operational_area_id ?? null,
        unit_type: company.unit_type,
      },
    ];
  });
  const operationalAreas: OfficialOperationalAreaRow[] = (
    (areasResult.data ?? []) as SupabaseArea[]
  ).flatMap((area) => {
    const company = companyById.get(area.company_id);

    if (!company) return [];

    return [
      {
        code: area.code,
        company_id: area.company_id,
        country_id: area.country_id,
        id: area.id,
        manager_name: area.name,
        name: area.name,
        organization_id: area.organization_id,
        unit_type: company.unit_type,
      },
    ];
  });

  return buildOfficialOptions({
    branches,
    companies,
    countries,
    managers: [],
    operationalAreas,
  });
}

export async function getOfficialContextOptions(
  actor: AuthorizationActor,
): Promise<OfficialContextOptions> {
  if (getMissingDatabaseConfig().length > 0) {
    return getOfficialContextOptionsFromSupabase(actor);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    return await withPostgresRlsContext(client, actor, async () => {
      const branchAccess = buildOfficialBranchAccessPredicate(actor);
      const branches = await client.query<OfficialBranchRow>(
        `
          select
            b.id,
            b.country_id,
            b.company_id,
            b.operational_area_id,
            b.code,
            b.name,
            coalesce(b.city, '') as city,
            co.unit_type,
            oa.name as area_zone,
            area_manager.display_name as area_manager_name,
            branch_manager.display_name as branch_manager_name
          from public.branches b
          join public.companies co on co.id = b.company_id
          left join public.operational_areas oa on oa.id = b.operational_area_id
          left join public.profiles area_manager on area_manager.id = oa.manager_profile_id
          left join lateral (
            select p.display_name
            from public.manager_assignments ma
            join public.roles r on r.id = ma.role_id
            join public.profiles p on p.id = ma.profile_id
            where ma.branch_id = b.id
              and ma.status = 'active'
              and ma.deactivated_at is null
              and r.key = 'gerente_sucursal'
              and p.status = 'active'
              and p.deactivated_at is null
              and p.deleted_at is null
            order by ma.updated_at desc nulls last, ma.created_at desc
            limit 1
          ) branch_manager on true
          where b.is_demo = false
            and b.status = 'active'
            and b.deleted_at is null
            and co.is_demo = false
            and ${branchAccess.predicate}
          order by b.name
        `,
        branchAccess.parameters,
      );
      const branchIds = branches.rows.map((branch) => branch.id);
      const countryIds = Array.from(
        new Set(branches.rows.map((branch) => branch.country_id)),
      );
      const companyIds = Array.from(
        new Set(branches.rows.map((branch) => branch.company_id)),
      );
      const operationalAreaIds = Array.from(
        new Set(
          branches.rows.flatMap((branch) =>
            branch.operational_area_id ? [branch.operational_area_id] : [],
          ),
        ),
      );

      if (countryIds.length === 0 || companyIds.length === 0) {
        return getEmptyOfficialContextOptions();
      }

      const countries = await client.query<OfficialCountryRow>(
        `
          select distinct
            c.id,
            c.iso2,
            c.name,
            c.time_zone,
            c.date_format,
            cu.code as currency_code
          from public.countries c
          left join public.currencies cu on cu.id = c.currency_id
          where c.is_demo = false
            and c.id = any($1::uuid[])
          order by c.name
        `,
        [countryIds],
      );
      const companies = await client.query<OfficialCompanyRow>(
        `
          select distinct
            co.id,
            co.key,
            co.name,
            co.unit_type
          from public.companies co
          where co.is_demo = false
            and co.id = any($1::uuid[])
          order by co.name
        `,
        [companyIds],
      );
      const operationalAreas = await client.query<OfficialOperationalAreaRow>(
        `
          select distinct
            oa.id,
            oa.organization_id,
            oa.country_id,
            oa.company_id,
            oa.code,
            oa.name,
            coalesce(manager.display_name, oa.name) as manager_name,
            co.unit_type
          from public.operational_areas oa
          join public.companies co on co.id = oa.company_id
          left join public.profiles manager on manager.id = oa.manager_profile_id
          where oa.status = 'active'
            and oa.deleted_at is null
            and oa.id = any($1::uuid[])
          order by oa.name
        `,
        [operationalAreaIds],
      );
      const managers = await client.query<OfficialManagerRow>(
        `
          with allowed_manager_ids as (
            select oa.manager_profile_id as profile_id
            from public.operational_areas oa
            where oa.manager_profile_id is not null
              and oa.id = any($2::uuid[])
            union
            select ma.profile_id
            from public.manager_assignments ma
            join public.roles r on r.id = ma.role_id
            where ma.status = 'active'
              and ma.deactivated_at is null
              and r.key in ('gerente_area', 'gerente_sucursal')
              and (
                ma.branch_id = any($1::uuid[])
                or (
                  ma.branch_id is null
                  and ma.operational_area_id = any($2::uuid[])
                )
              )
          )
          select distinct
            p.id,
            coalesce(nullif(p.display_name, ''), p.email, p.id::text) as name
          from allowed_manager_ids ami
          join public.profiles p on p.id = ami.profile_id
          where p.status = 'active'
            and p.deactivated_at is null
            and p.deleted_at is null
          order by name
        `,
        [branchIds, operationalAreaIds],
      );

      return buildOfficialOptions({
        branches: branches.rows,
        companies: companies.rows,
        countries: countries.rows,
        managers: managers.rows,
        operationalAreas: operationalAreas.rows,
      });
    });
  } finally {
    client.release();
  }
}
