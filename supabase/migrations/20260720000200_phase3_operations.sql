create table public.appointment_status_catalog (
  key text primary key,
  label text not null,
  is_terminal boolean not null default false,
  is_attended boolean not null default false,
  counts_as_no_show boolean not null default false,
  counts_as_cancelled boolean not null default false,
  counts_as_rescheduled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.appointment_status_catalog (
  key,
  label,
  is_terminal,
  is_attended,
  counts_as_no_show,
  counts_as_cancelled,
  counts_as_rescheduled
)
values
  ('scheduled', 'Scheduled', false, false, false, false, false),
  ('confirmed', 'Confirmed', false, false, false, false, false),
  ('arrived', 'Arrived', false, true, false, false, false),
  ('in_progress', 'In progress', false, true, false, false, false),
  ('completed', 'Completed', true, true, false, false, false),
  ('cancelled_by_patient', 'Cancelled by patient', true, false, false, true, false),
  ('cancelled_by_branch', 'Cancelled by branch', true, false, false, true, false),
  ('no_show', 'No-show', true, false, true, false, false),
  ('rescheduled', 'Rescheduled', true, false, false, false, true),
  ('failed', 'Failed', true, false, false, false, false),
  ('pending', 'Pending', false, false, false, false, false),
  ('unknown', 'Unknown', false, false, false, false, false)
on conflict (key) do update set
  label = excluded.label,
  is_terminal = excluded.is_terminal,
  is_attended = excluded.is_attended,
  counts_as_no_show = excluded.counts_as_no_show,
  counts_as_cancelled = excluded.counts_as_cancelled,
  counts_as_rescheduled = excluded.counts_as_rescheduled;

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  code text not null,
  display_name text not null,
  professional_type text not null default 'clinical',
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, branch_id, code)
);

create table public.professional_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  professional_id uuid references public.professionals(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  available_minutes integer not null check (available_minutes >= 0),
  effective_from date not null,
  effective_to date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.anonymous_patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  anonymous_key text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, anonymous_key)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  source_id uuid references public.data_sources(id) on delete set null,
  import_id uuid,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  external_reference text,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  scheduled_minutes integer not null check (scheduled_minutes >= 0),
  attended_minutes integer check (attended_minutes >= 0),
  normalized_status text not null references public.appointment_status_catalog(key),
  original_status text,
  is_future boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  normalized_status text not null references public.appointment_status_catalog(key),
  original_status text,
  changed_at timestamptz not null default now(),
  source_id uuid references public.data_sources(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.capacity_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  source_id uuid references public.data_sources(id) on delete set null,
  import_id uuid,
  period_start date not null,
  period_end date not null,
  available_minutes integer not null check (available_minutes >= 0),
  scheduled_minutes integer not null default 0 check (scheduled_minutes >= 0),
  attended_minutes integer not null default 0 check (attended_minutes >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  source_id uuid references public.data_sources(id) on delete set null,
  import_id uuid,
  appointment_id uuid references public.appointments(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  performed_at timestamptz not null,
  duration_minutes integer check (duration_minutes >= 0),
  quantity numeric(12, 2) not null default 1,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index professionals_context_idx on public.professionals (organization_id, country_id, company_id, branch_id);
create index professional_schedules_context_idx on public.professional_schedules (organization_id, country_id, company_id, branch_id);
create index anonymous_patients_organization_idx on public.anonymous_patients (organization_id);
create index appointments_context_idx on public.appointments (organization_id, country_id, company_id, branch_id, scheduled_start_at);
create index appointments_status_idx on public.appointments (normalized_status);
create index capacity_records_context_idx on public.capacity_records (organization_id, country_id, company_id, branch_id, period_start, period_end);
create index service_events_context_idx on public.service_events (organization_id, country_id, company_id, branch_id, performed_at);

create trigger set_appointment_status_catalog_updated_at before update on public.appointment_status_catalog
for each row execute function public.set_updated_at();

create trigger set_professionals_updated_at before update on public.professionals
for each row execute function public.set_updated_at();

create trigger set_professional_schedules_updated_at before update on public.professional_schedules
for each row execute function public.set_updated_at();

create trigger set_anonymous_patients_updated_at before update on public.anonymous_patients
for each row execute function public.set_updated_at();

create trigger set_appointments_updated_at before update on public.appointments
for each row execute function public.set_updated_at();

create trigger set_capacity_records_updated_at before update on public.capacity_records
for each row execute function public.set_updated_at();

create trigger set_service_events_updated_at before update on public.service_events
for each row execute function public.set_updated_at();

create or replace function public.safe_ratio(numerator numeric, denominator numeric)
returns numeric
language sql
immutable
as $$
  select case
    when denominator is null or denominator = 0 then null
    else numerator / denominator
  end;
$$;

create or replace view public.v_branch_capacity_summary
with (security_invoker = true) as
select
  organization_id,
  country_id,
  company_id,
  branch_id,
  period_start,
  period_end,
  sum(available_minutes) as available_minutes,
  sum(scheduled_minutes) as scheduled_minutes,
  sum(attended_minutes) as attended_minutes,
  public.safe_ratio(sum(scheduled_minutes), sum(available_minutes)) as scheduled_occupancy,
  public.safe_ratio(sum(attended_minutes), sum(available_minutes)) as effective_occupancy,
  public.safe_ratio(sum(scheduled_minutes), sum(available_minutes))
    - public.safe_ratio(sum(attended_minutes), sum(available_minutes)) as attendance_gap
from public.capacity_records
group by organization_id, country_id, company_id, branch_id, period_start, period_end;

alter table public.appointment_status_catalog enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_schedules enable row level security;
alter table public.anonymous_patients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.capacity_records enable row level security;
alter table public.service_events enable row level security;

create policy "authenticated users read appointment statuses" on public.appointment_status_catalog
for select to authenticated
using (true);

create policy "super admins manage appointment statuses" on public.appointment_status_catalog
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned professionals" on public.professionals
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage professionals" on public.professionals
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned professional schedules" on public.professional_schedules
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage professional schedules" on public.professional_schedules
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read anonymous patients by organization" on public.anonymous_patients
for select to authenticated
using (public.current_user_can_access_org(organization_id));

create policy "data roles manage anonymous patients" on public.anonymous_patients
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned appointments" on public.appointments
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage appointments" on public.appointments
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned appointment history" on public.appointment_status_history
for select to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.id = appointment_id
      and public.current_user_can_access_branch(a.branch_id)
  )
);

create policy "data roles manage appointment history" on public.appointment_status_history
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned capacity records" on public.capacity_records
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage capacity records" on public.capacity_records
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned service events" on public.service_events
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage service events" on public.service_events
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);
