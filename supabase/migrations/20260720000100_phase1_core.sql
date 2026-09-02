create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.currencies (
  id uuid primary key default gen_random_uuid(),
  code char(3) not null unique,
  name text not null,
  symbol text not null,
  decimal_places integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  currency_id uuid not null references public.currencies(id),
  iso2 char(2) not null,
  name text not null,
  time_zone text not null,
  date_format text not null,
  tax_config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, iso2)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  unit_type text not null check (unit_type in ('fisioterapia', 'laboratorio', 'imagenes')),
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  city text,
  time_zone text,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, country_id, company_id, code)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  email text,
  display_name text,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  default_country_id uuid references public.countries(id) on delete set null,
  default_company_id uuid references public.companies(id) on delete set null,
  default_branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.user_country_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, country_id)
);

create table public.user_company_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table public.user_branch_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

create table public.branch_managers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  email text,
  is_demo boolean not null default false,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, company_id, name)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  code text not null,
  name text not null,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, company_id, code)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  source_type text not null check (
    source_type in (
      'api_rest',
      'api_graphql',
      'database',
      'webhook',
      'sftp_file',
      'manual_upload',
      'authorized_scraping',
      'billing_system',
      'crm'
    )
  ),
  status text not null default 'disabled' check (status in ('disabled', 'demo', 'active', 'error')),
  is_demo boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_table text,
  entity_id uuid,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index countries_organization_id_idx on public.countries (organization_id);
create index companies_organization_id_idx on public.companies (organization_id);
create index branches_context_idx on public.branches (organization_id, country_id, company_id);
create index profiles_organization_id_idx on public.profiles (organization_id);
create index user_roles_user_id_idx on public.user_roles (user_id);
create index user_country_access_user_id_idx on public.user_country_access (user_id);
create index user_company_access_user_id_idx on public.user_company_access (user_id);
create index user_branch_access_user_id_idx on public.user_branch_access (user_id);
create index data_sources_context_idx on public.data_sources (organization_id, country_id, company_id, branch_id);
create index audit_logs_context_idx on public.audit_logs (organization_id, country_id, company_id, branch_id, created_at);

create trigger set_organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

create trigger set_currencies_updated_at before update on public.currencies
for each row execute function public.set_updated_at();

create trigger set_countries_updated_at before update on public.countries
for each row execute function public.set_updated_at();

create trigger set_companies_updated_at before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_branches_updated_at before update on public.branches
for each row execute function public.set_updated_at();

create trigger set_roles_updated_at before update on public.roles
for each row execute function public.set_updated_at();

create trigger set_permissions_updated_at before update on public.permissions
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_branch_managers_updated_at before update on public.branch_managers
for each row execute function public.set_updated_at();

create trigger set_service_categories_updated_at before update on public.service_categories
for each row execute function public.set_updated_at();

create trigger set_services_updated_at before update on public.services
for each row execute function public.set_updated_at();

create trigger set_data_sources_updated_at before update on public.data_sources
for each row execute function public.set_updated_at();

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = 'webmaster_admin'
  );
$$;

create or replace function public.current_user_has_role(role_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = any(role_keys)
  );
$$;

create or replace function public.current_user_can_access_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.organization_id = target_organization_id
        and p.status = 'active'
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.organization_id = target_organization_id
    )
    or exists (
      select 1
      from public.user_country_access uca
      join public.countries c on c.id = uca.country_id
      where uca.user_id = auth.uid()
        and c.organization_id = target_organization_id
    )
    or exists (
      select 1
      from public.user_company_access uca
      join public.companies c on c.id = uca.company_id
      where uca.user_id = auth.uid()
        and c.organization_id = target_organization_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.organization_id = target_organization_id
    );
$$;

create or replace function public.current_user_can_access_country(target_country_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_country_access uca
      where uca.user_id = auth.uid()
        and uca.country_id = target_country_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.country_id = target_country_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.countries c on c.organization_id = ur.organization_id
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and c.id = target_country_id
        and r.key in ('ceo', 'gerente_operaciones')
        and (ur.country_id is null or ur.country_id = target_country_id)
    );
$$;

create or replace function public.current_user_can_access_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_company_access uca
      where uca.user_id = auth.uid()
        and uca.company_id = target_company_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.company_id = target_company_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.key in ('ceo', 'gerente_operaciones')
        and (ur.company_id is null or ur.company_id = target_company_id)
    );
$$;

create or replace function public.current_user_can_access_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_branch_access uba
      where uba.user_id = auth.uid()
        and uba.branch_id = target_branch_id
    )
    or exists (
      select 1
      from public.branches b
      where b.id = target_branch_id
        and (
          public.current_user_can_access_country(b.country_id)
          or public.current_user_can_access_company(b.company_id)
        )
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.key in ('ceo', 'gerente_operaciones', 'gerente_sucursal')
        and (ur.branch_id is null or ur.branch_id = target_branch_id)
    );
$$;

alter table public.organizations enable row level security;
alter table public.currencies enable row level security;
alter table public.countries enable row level security;
alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_country_access enable row level security;
alter table public.user_company_access enable row level security;
alter table public.user_branch_access enable row level security;
alter table public.branch_managers enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.data_sources enable row level security;
alter table public.audit_logs enable row level security;

create policy "read assigned organizations" on public.organizations
for select to authenticated
using (public.current_user_can_access_org(id));

create policy "super admins manage organizations" on public.organizations
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read currencies" on public.currencies
for select to authenticated
using (true);

create policy "super admins manage currencies" on public.currencies
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned countries" on public.countries
for select to authenticated
using (public.current_user_can_access_country(id));

create policy "super admins manage countries" on public.countries
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned companies" on public.companies
for select to authenticated
using (public.current_user_can_access_company(id));

create policy "super admins manage companies" on public.companies
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned branches" on public.branches
for select to authenticated
using (public.current_user_can_access_branch(id));

create policy "super admins manage branches" on public.branches
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "authenticated users read role catalog" on public.roles
for select to authenticated
using (true);

create policy "super admins manage role catalog" on public.roles
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "authenticated users read permission catalog" on public.permissions
for select to authenticated
using (true);

create policy "super admins manage permission catalog" on public.permissions
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "authenticated users read role permissions" on public.role_permissions
for select to authenticated
using (true);

create policy "super admins manage role permissions" on public.role_permissions
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "users read own profile" on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_user_is_super_admin());

create policy "users update own profile basics" on public.profiles
for update to authenticated
using (id = auth.uid() or public.current_user_is_super_admin())
with check (id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins insert profiles" on public.profiles
for insert to authenticated
with check (public.current_user_is_super_admin());

create policy "users read own roles" on public.user_roles
for select to authenticated
using (user_id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins manage user roles" on public.user_roles
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "users read own country access" on public.user_country_access
for select to authenticated
using (user_id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins manage country access" on public.user_country_access
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "users read own company access" on public.user_company_access
for select to authenticated
using (user_id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins manage company access" on public.user_company_access
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "users read own branch access" on public.user_branch_access
for select to authenticated
using (user_id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins manage branch access" on public.user_branch_access
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned branch managers" on public.branch_managers
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "super admins manage branch managers" on public.branch_managers
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned service categories" on public.service_categories
for select to authenticated
using (public.current_user_can_access_company(company_id));

create policy "super admins manage service categories" on public.service_categories
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned services" on public.services
for select to authenticated
using (public.current_user_can_access_company(company_id));

create policy "super admins manage services" on public.services
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned data sources" on public.data_sources
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

create policy "super admins manage data sources" on public.data_sources
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "auditors and admins read audit logs" on public.audit_logs
for select to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['ceo'])
);

create policy "authenticated users insert audit logs" on public.audit_logs
for insert to authenticated
with check (actor_user_id = auth.uid() or public.current_user_is_super_admin());
