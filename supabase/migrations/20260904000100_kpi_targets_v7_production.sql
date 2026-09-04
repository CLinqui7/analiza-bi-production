-- V7 targets are deliberately stored at the same branch + business-line grain
-- as official closings. This is additive because older production schemas did
-- not yet contain a target source consumable by the official BI read model.
create table if not exists public.kpi_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line_id uuid references public.business_lines(id) on delete restrict,
  business_line text,
  period_start date not null,
  period_end date,
  kpi_code text not null,
  kpi_name text not null,
  target_value numeric not null check (target_value >= 0),
  unit text not null check (unit in ('currency', 'count', 'ratio')),
  direction text not null default 'HIGHER_IS_BETTER' check (direction in ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER')),
  status text not null default 'active' check (status in ('active', 'approved', 'archived')),
  approved_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kpi_targets_v7_scope_idx
  on public.kpi_targets (organization_id, country_id, company_id, operational_area_id, branch_id, business_line_id, period_start, status);

alter table public.kpi_targets enable row level security;

drop policy if exists "read scoped V7 KPI targets" on public.kpi_targets;
create policy "read scoped V7 KPI targets"
on public.kpi_targets for select to authenticated
using (public.current_user_can_access_branch(branch_id));

drop policy if exists "manage scoped V7 KPI targets" on public.kpi_targets;
create policy "manage scoped V7 KPI targets"
on public.kpi_targets for all to authenticated
using (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array['super_admin', 'webmaster_admin', 'gerente_operaciones', 'gerente_area'])
)
with check (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array['super_admin', 'webmaster_admin', 'gerente_operaciones', 'gerente_area'])
);

comment on table public.kpi_targets is
  'Approved official KPI targets at branch + business-line + period grain.';
