-- Final Supabase V7 scope hardening.  This migration is additive and safe to
-- apply to an existing organization: it neither deletes records nor changes
-- a user identity.  A business line is part of every assignment boundary.

alter table if exists public.manager_assignments
  add column if not exists business_line_id uuid references public.business_lines(id) on delete restrict,
  add column if not exists business_line_code text;

alter table if exists public.user_roles
  add column if not exists business_line_id uuid references public.business_lines(id) on delete restrict,
  add column if not exists business_line_code text;

create index if not exists manager_assignments_v7_scope_idx
  on public.manager_assignments (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    business_line_id,
    status
  );

create index if not exists user_roles_v7_scope_idx
  on public.user_roles (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    business_line_id,
    status
  );

alter table if exists public.reporting_lines
  add column if not exists country_id uuid references public.countries(id) on delete restrict,
  add column if not exists company_id uuid references public.companies(id) on delete restrict,
  add column if not exists operational_area_id uuid references public.operational_areas(id) on delete restrict,
  add column if not exists branch_id uuid references public.branches(id) on delete restrict,
  add column if not exists business_line_id uuid references public.business_lines(id) on delete restrict;

create index if not exists reporting_lines_v7_scope_idx
  on public.reporting_lines (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    business_line_id,
    status
  );

create table if not exists public.directory_assignment_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line_id uuid references public.business_lines(id) on delete restrict,
  role_key text not null check (role_key in ('gerente_area', 'gerente_sucursal')),
  status text not null default 'vacant' check (status in ('vacant', 'filled')),
  source_file text not null,
  source_row integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, country_id, company_id, branch_id, business_line_id, role_key)
);

alter table public.directory_assignment_slots enable row level security;

drop policy if exists "read scoped directory assignment slots" on public.directory_assignment_slots;
create policy "read scoped directory assignment slots"
on public.directory_assignment_slots for select to authenticated
using (public.current_user_can_access_branch(branch_id));

drop policy if exists "manage scoped directory assignment slots" on public.directory_assignment_slots;
create policy "manage scoped directory assignment slots"
on public.directory_assignment_slots for all to authenticated
using (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array['super_admin', 'webmaster_admin', 'gerente_operaciones', 'gerente_area'])
)
with check (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array['super_admin', 'webmaster_admin', 'gerente_operaciones', 'gerente_area'])
);

grant select, insert, update on public.directory_assignment_slots to authenticated;

comment on table public.directory_assignment_slots is
  'Directory import slots preserve an explicit vacancy without creating an invented user or email.';
