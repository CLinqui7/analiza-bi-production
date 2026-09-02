create type public.monthly_closing_status as enum (
  'DRAFT',
  'VALIDATED',
  'WARNING',
  'BLOCKED',
  'PUBLISHED',
  'SUPERSEDED'
);

create type public.kpi_target_status as enum (
  'active',
  'inactive'
);

create table public.monthly_closings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line text not null check (business_line in ('PHYSIOTHERAPY')),
  period_month date not null,
  current_status public.monthly_closing_status not null default 'DRAFT',
  active_version_id uuid,
  published_version_id uuid,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, country_id, company_id, branch_id, business_line, period_month)
);

create table public.closing_versions (
  id uuid primary key default gen_random_uuid(),
  monthly_closing_id uuid not null references public.monthly_closings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line text not null check (business_line in ('PHYSIOTHERAPY')),
  period_month date not null,
  version_number integer not null check (version_number > 0),
  status public.monthly_closing_status not null default 'DRAFT',
  supersedes_version_id uuid references public.closing_versions(id) on delete set null,
  superseded_by_version_id uuid references public.closing_versions(id) on delete set null,
  correction_reason text,
  data_quality_score numeric(5, 2) not null default 0 check (data_quality_score >= 0 and data_quality_score <= 100),
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_by_email text not null,
  validated_at timestamptz,
  validated_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  published_by_email text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (monthly_closing_id, version_number)
);

alter table public.monthly_closings
  add constraint monthly_closings_active_version_fkey
  foreign key (active_version_id) references public.closing_versions(id) on delete set null;

alter table public.monthly_closings
  add constraint monthly_closings_published_version_fkey
  foreign key (published_version_id) references public.closing_versions(id) on delete set null;

create unique index monthly_closing_one_active_published_version_idx
  on public.closing_versions (monthly_closing_id)
  where status = 'PUBLISHED' and superseded_by_version_id is null;

create table public.physiotherapy_closing_inputs (
  id uuid primary key default gen_random_uuid(),
  closing_version_id uuid not null unique references public.closing_versions(id) on delete cascade,
  revenue_total numeric(14, 2) check (revenue_total >= 0),
  orders_total numeric(14, 2) check (orders_total >= 0),
  sessions_total numeric(14, 2) check (sessions_total >= 0),
  patients_attended numeric(14, 2) check (patients_attended >= 0),
  direct_costs numeric(14, 2) check (direct_costs >= 0),
  physiotherapists_active numeric(14, 2) check (physiotherapists_active >= 0),
  appointments_scheduled numeric(14, 2) check (appointments_scheduled >= 0),
  appointments_completed numeric(14, 2) check (appointments_completed >= 0),
  appointments_cancelled numeric(14, 2) check (appointments_cancelled >= 0),
  no_show_appointments numeric(14, 2) check (no_show_appointments >= 0),
  available_hours numeric(14, 2) check (available_hours >= 0),
  scheduled_hours numeric(14, 2) check (scheduled_hours >= 0),
  attended_hours numeric(14, 2) check (attended_hours >= 0),
  closure_observations text not null default '',
  source_lineage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.closing_validation_results (
  id uuid primary key default gen_random_uuid(),
  closing_version_id uuid not null unique references public.closing_versions(id) on delete cascade,
  validation_state text not null check (validation_state in ('VALIDADO', 'ADVERTENCIA', 'BLOQUEADO')),
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  data_quality_score numeric(5, 2) not null check (data_quality_score >= 0 and data_quality_score <= 100),
  validated_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.closing_kpi_results (
  id uuid primary key default gen_random_uuid(),
  closing_version_id uuid not null references public.closing_versions(id) on delete cascade,
  kpi_id text not null,
  label text not null,
  formula text not null,
  status text not null check (status in ('CALCULABLE', 'NOT_CALCULABLE')),
  unit text not null check (unit in ('currency', 'count', 'ratio')),
  value numeric,
  required_fields jsonb not null default '[]'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (closing_version_id, kpi_id)
);

create table public.kpi_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line text not null check (business_line in ('PHYSIOTHERAPY')),
  period_month date not null,
  kpi_id text not null,
  label text not null,
  target_type text not null check (target_type in ('SINGLE_VALUE', 'RANGE')),
  direction text not null check (direction in ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'RANGE')),
  target_value numeric not null check (target_value >= 0),
  target_min_value numeric check (target_min_value >= 0),
  target_max_value numeric check (target_max_value >= 0),
  unit text not null check (unit in ('currency', 'count', 'ratio')),
  status public.kpi_target_status not null default 'active',
  version integer not null default 1 check (version > 0),
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_email text not null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_by_email text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generated_insights (
  id uuid primary key default gen_random_uuid(),
  closing_version_id uuid not null references public.closing_versions(id) on delete cascade,
  rule_key text not null,
  severity text not null check (severity in ('critica', 'alta', 'media', 'positiva')),
  kpi_id text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line text not null check (business_line in ('PHYSIOTHERAPY')),
  period_month date not null,
  context jsonb not null default '{}'::jsonb,
  title text not null,
  message text not null,
  comparison text not null,
  impact text not null,
  recommended_action text not null,
  evidence text not null,
  created_at timestamptz not null default now(),
  unique (closing_version_id, rule_key)
);

create table public.closing_audit_events (
  id uuid primary key default gen_random_uuid(),
  monthly_closing_id uuid references public.monthly_closings(id) on delete cascade,
  closing_version_id uuid references public.closing_versions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  business_line text check (business_line in ('PHYSIOTHERAPY')),
  period_month date,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_email text not null,
  action text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index monthly_closings_scope_idx
  on public.monthly_closings (organization_id, country_id, company_id, branch_id, business_line, period_month);

create index closing_versions_scope_idx
  on public.closing_versions (organization_id, country_id, company_id, branch_id, business_line, period_month, status);

create index closing_kpi_results_version_idx
  on public.closing_kpi_results (closing_version_id, kpi_id);

create index kpi_targets_scope_idx
  on public.kpi_targets (organization_id, country_id, company_id, branch_id, business_line, period_month, kpi_id, version);

create index generated_insights_scope_idx
  on public.generated_insights (organization_id, country_id, company_id, branch_id, business_line, period_month, severity);

create index closing_audit_events_scope_idx
  on public.closing_audit_events (organization_id, branch_id, business_line, period_month, created_at);

create trigger set_monthly_closings_updated_at before update on public.monthly_closings
for each row execute function public.set_updated_at();

create trigger set_closing_versions_updated_at before update on public.closing_versions
for each row execute function public.set_updated_at();

create trigger set_physiotherapy_closing_inputs_updated_at before update on public.physiotherapy_closing_inputs
for each row execute function public.set_updated_at();

create trigger set_kpi_targets_updated_at before update on public.kpi_targets
for each row execute function public.set_updated_at();

alter table public.monthly_closings enable row level security;
alter table public.closing_versions enable row level security;
alter table public.physiotherapy_closing_inputs enable row level security;
alter table public.closing_validation_results enable row level security;
alter table public.closing_kpi_results enable row level security;
alter table public.kpi_targets enable row level security;
alter table public.generated_insights enable row level security;
alter table public.closing_audit_events enable row level security;

create policy "read assigned monthly closings" on public.monthly_closings
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "manage assigned monthly closings" on public.monthly_closings
for all to authenticated
using (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'gerente_operaciones',
    'gerente_area',
    'gerente_sucursal'
  ])
)
with check (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'gerente_operaciones',
    'gerente_area',
    'gerente_sucursal'
  ])
);

create policy "read assigned closing versions" on public.closing_versions
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "manage assigned closing versions" on public.closing_versions
for all to authenticated
using (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'gerente_operaciones',
    'gerente_area',
    'gerente_sucursal'
  ])
)
with check (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'gerente_operaciones',
    'gerente_area',
    'gerente_sucursal'
  ])
);

create policy "read assigned physiotherapy inputs" on public.physiotherapy_closing_inputs
for select to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
  )
);

create policy "manage assigned physiotherapy inputs" on public.physiotherapy_closing_inputs
for all to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
)
with check (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
);

create policy "read assigned validation results" on public.closing_validation_results
for select to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
  )
);

create policy "manage assigned validation results" on public.closing_validation_results
for all to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
)
with check (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
);

create policy "read assigned kpi results" on public.closing_kpi_results
for select to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
  )
);

create policy "manage assigned kpi results" on public.closing_kpi_results
for all to authenticated
using (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
)
with check (
  exists (
    select 1
    from public.closing_versions cv
    where cv.id = closing_version_id
      and public.current_user_can_access_branch(cv.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
);

create policy "read assigned kpi targets" on public.kpi_targets
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "manage assigned kpi targets" on public.kpi_targets
for all to authenticated
using (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'ceo',
    'gerente_operaciones',
    'gerente_area'
  ])
)
with check (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'ceo',
    'gerente_operaciones',
    'gerente_area'
  ])
);

create policy "read assigned generated insights" on public.generated_insights
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "manage assigned generated insights" on public.generated_insights
for all to authenticated
using (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'gerente_operaciones',
    'gerente_area',
    'gerente_sucursal'
  ])
)
with check (
  public.current_user_can_access_branch(branch_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'gerente_operaciones',
    'gerente_area',
    'gerente_sucursal'
  ])
);

create policy "read assigned closing audit" on public.closing_audit_events
for select to authenticated
using (
  branch_id is null
  or public.current_user_can_access_branch(branch_id)
);

create policy "write assigned closing audit" on public.closing_audit_events
for insert to authenticated
with check (
  (branch_id is null or public.current_user_can_access_branch(branch_id))
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'ceo',
    'gerente_operaciones',
    'gerente_area',
    'gerente_sucursal'
  ])
);
