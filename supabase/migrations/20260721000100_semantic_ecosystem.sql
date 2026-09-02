create table public.business_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  code text not null check (code in ('PHYSIOTHERAPY', 'LABORATORY', 'IMAGING')),
  name text not null,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, company_id, code)
);

create table public.managers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  display_name text not null,
  manager_type text not null check (manager_type in ('line', 'branch', 'operations', 'finance', 'executive')),
  is_demo boolean not null default false,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.payers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  payer_type text not null default 'private',
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.date_dimension (
  date_key date primary key,
  year integer not null,
  quarter integer not null,
  month integer not null,
  month_name text not null,
  week integer not null,
  day_of_month integer not null,
  day_of_week integer not null,
  is_weekend boolean not null
);

create table public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null,
  business_line_code text not null check (business_line_code in ('CONSOLIDATED', 'PHYSIOTHERAPY', 'LABORATORY', 'IMAGING')),
  category text not null,
  unit text not null,
  format text not null,
  numerator text not null,
  denominator text,
  formula text not null,
  source text not null,
  source_type text not null,
  update_frequency text not null,
  dimensions text[] not null default '{}',
  target numeric,
  threshold_green numeric,
  threshold_yellow numeric,
  threshold_red numeric,
  higher_is_better boolean not null default true,
  data_status text not null check (data_status in ('AVAILABLE', 'PENDING_UPLOAD', 'NOT_CONNECTED', 'INCOMPLETE', 'INVALID', 'DEMO', 'CALCULATED', 'NOT_APPLICABLE')),
  last_updated_at timestamptz,
  owner text,
  drill_down_route text,
  required_fields text[] not null default '{}',
  allowed_roles text[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  data_source_id uuid references public.data_sources(id) on delete set null,
  template_code text not null,
  source_file text not null,
  source_system text,
  status text not null default 'draft' check (status in ('draft', 'validating', 'preview', 'approved', 'imported', 'failed', 'reversed')),
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz,
  row_count integer not null default 0,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0,
  mapping jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete cascade,
  source_file text,
  row_number integer,
  column_name text,
  issue_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  manager_id uuid references public.managers(id) on delete set null,
  period_start date,
  period_end date,
  title text not null,
  summary text not null,
  insight_type text not null check (insight_type in ('risk', 'opportunity', 'anomaly', 'goal', 'quality', 'projection', 'recommendation')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  confidence numeric(5, 2) not null check (confidence >= 0 and confidence <= 1),
  related_kpis text[] not null default '{}',
  detected_cause text,
  financial_impact numeric,
  recommended_action text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'dismissed')),
  owner text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  manager_id uuid references public.managers(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  kpi_code text not null,
  period_start date not null,
  period_end date not null,
  target_value numeric not null,
  suggested_value numeric,
  final_value numeric,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'suggested', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fact_financial (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  payer_id uuid references public.payers(id) on delete set null,
  channel_id uuid references public.channels(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  transaction_date date not null,
  currency_code char(3) not null,
  base_currency_code char(3) not null default 'USD',
  exchange_rate numeric(18, 6) not null default 1,
  gross_revenue numeric(14, 2),
  tax_amount numeric(14, 2),
  discounts numeric(14, 2),
  refunds numeric(14, 2),
  net_revenue numeric(14, 2),
  direct_cost numeric(14, 2),
  operating_expense numeric(14, 2),
  amount_collected numeric(14, 2),
  accounts_receivable numeric(14, 2),
  source_file text,
  row_number integer,
  created_at timestamptz not null default now()
);

create table public.fact_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  goal_id uuid references public.goals(id) on delete cascade,
  kpi_code text not null,
  actual_value numeric,
  target_value numeric,
  period_start date not null,
  period_end date not null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_data_quality (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  source_id uuid references public.data_sources(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  completeness numeric(5, 2),
  validity numeric(5, 2),
  consistency numeric(5, 2),
  uniqueness numeric(5, 2),
  freshness numeric(5, 2),
  referential_integrity numeric(5, 2),
  financial_reconciliation numeric(5, 2),
  measured_at timestamptz not null default now()
);

create table public.fact_customer_experience (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  score numeric(5, 2),
  source text,
  measured_at timestamptz not null default now()
);

create table public.fact_lab_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  payer_id uuid references public.payers(id) on delete set null,
  channel_id uuid references public.channels(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  order_number text not null,
  order_status text not null,
  ordered_at timestamptz not null,
  received_at timestamptz,
  billed_at timestamptz,
  collected_at timestamptz,
  source_file text,
  row_number integer,
  created_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table public.fact_lab_order_tests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  lab_order_id uuid references public.fact_lab_orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  test_code text not null,
  test_name text not null,
  quantity numeric(12, 2) not null default 1,
  price numeric(14, 2),
  direct_cost numeric(14, 2),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.fact_lab_samples (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  lab_order_id uuid references public.fact_lab_orders(id) on delete cascade,
  sample_code text,
  sample_status text,
  taken_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_lab_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  lab_order_test_id uuid references public.fact_lab_order_tests(id) on delete cascade,
  result_status text not null,
  validated_at timestamptz,
  delivered_at timestamptz,
  corrected_at timestamptz,
  critical_value_notified_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_lab_inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  item_code text not null,
  item_name text not null,
  item_type text not null check (item_type in ('consumable', 'supply', 'reagent')),
  quantity numeric(14, 2),
  amount numeric(14, 2),
  expires_on date,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_lab_referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  doctor_name text not null,
  specialty text,
  department text,
  municipality text,
  assigned_representative text,
  orders_count integer,
  patients_count integer,
  revenue numeric(14, 2),
  last_order_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_medical_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  representative_name text not null,
  doctor_name text not null,
  visited_at timestamptz,
  visit_result text,
  generated_orders integer,
  generated_revenue numeric(14, 2),
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_physio_appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  appointment_status text not null,
  scheduled_at timestamptz not null,
  confirmed_at timestamptz,
  attended_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_physio_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  session_status text not null,
  session_at timestamptz not null,
  attended_minutes integer,
  billed_at timestamptz,
  collected_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_physio_treatment_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  plan_status text not null,
  indicated_sessions integer,
  completed_sessions integer,
  started_on date,
  completed_on date,
  abandoned_on date,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_physio_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  outcome_type text not null,
  initial_value numeric,
  current_value numeric,
  measured_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_imaging_appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  modality text,
  appointment_status text not null,
  scheduled_at timestamptz not null,
  confirmed_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_imaging_studies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  equipment_code text,
  modality text not null,
  study_status text not null,
  performed_at timestamptz,
  repeated_at timestamptz,
  repeat_reason text,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_imaging_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  imaging_study_id uuid references public.fact_imaging_studies(id) on delete cascade,
  radiologist_id uuid references public.professionals(id) on delete set null,
  report_status text not null,
  validated_at timestamptz,
  delivered_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_equipment_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  equipment_code text not null,
  modality text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  available_minutes integer,
  scheduled_minutes integer,
  used_minutes integer,
  downtime_minutes integer,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_equipment_maintenance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  equipment_code text not null,
  maintenance_type text not null check (maintenance_type in ('scheduled', 'corrective')),
  starts_at timestamptz,
  ends_at timestamptz,
  reason text,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_can_access_semantic_context(
  target_company_id uuid,
  target_branch_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.current_user_is_super_admin()
    or (
      target_branch_id is not null
      and public.current_user_can_access_branch(target_branch_id)
    )
    or (
      target_branch_id is null
      and target_company_id is not null
      and public.current_user_can_access_company(target_company_id)
    );
$$;

create index business_lines_context_idx on public.business_lines (organization_id, company_id, code);
create index managers_context_idx on public.managers (organization_id, country_id, company_id, business_line_id, branch_id);
create index import_jobs_context_idx on public.import_jobs (organization_id, country_id, company_id, business_line_id, branch_id, created_at);
create index insights_context_idx on public.insights (organization_id, country_id, company_id, business_line_id, branch_id, created_at);
create index goals_context_idx on public.goals (organization_id, country_id, company_id, business_line_id, branch_id, period_start);
create index fact_financial_context_idx on public.fact_financial (organization_id, country_id, company_id, business_line_id, branch_id, transaction_date);

create trigger set_business_lines_updated_at before update on public.business_lines
for each row execute function public.set_updated_at();
create trigger set_managers_updated_at before update on public.managers
for each row execute function public.set_updated_at();
create trigger set_channels_updated_at before update on public.channels
for each row execute function public.set_updated_at();
create trigger set_payers_updated_at before update on public.payers
for each row execute function public.set_updated_at();
create trigger set_kpi_definitions_updated_at before update on public.kpi_definitions
for each row execute function public.set_updated_at();
create trigger set_import_jobs_updated_at before update on public.import_jobs
for each row execute function public.set_updated_at();
create trigger set_data_quality_issues_updated_at before update on public.data_quality_issues
for each row execute function public.set_updated_at();
create trigger set_insights_updated_at before update on public.insights
for each row execute function public.set_updated_at();
create trigger set_goals_updated_at before update on public.goals
for each row execute function public.set_updated_at();

alter table public.date_dimension enable row level security;
create policy "authenticated users read date dimension" on public.date_dimension
for select to authenticated using (true);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_lines',
    'managers',
    'channels',
    'payers',
    'kpi_definitions',
    'import_jobs',
    'data_quality_issues',
    'insights',
    'goals',
    'fact_financial',
    'fact_goals',
    'fact_data_quality',
    'fact_customer_experience',
    'fact_lab_orders',
    'fact_lab_order_tests',
    'fact_lab_samples',
    'fact_lab_results',
    'fact_lab_inventory',
    'fact_lab_referrals',
    'fact_medical_visits',
    'fact_physio_appointments',
    'fact_physio_sessions',
    'fact_physio_treatment_plans',
    'fact_physio_outcomes',
    'fact_imaging_appointments',
    'fact_imaging_studies',
    'fact_imaging_reports',
    'fact_equipment_usage',
    'fact_equipment_maintenance'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy "read assigned business lines" on public.business_lines
for select to authenticated
using (public.current_user_is_super_admin() or public.current_user_can_access_company(company_id));

create policy "admins manage business lines" on public.business_lines
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned import jobs" on public.import_jobs
for select to authenticated
using (public.current_user_can_access_semantic_context(company_id, branch_id));

create policy "operations manage import jobs" on public.import_jobs
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned insights" on public.insights
for select to authenticated
using (public.current_user_can_access_semantic_context(company_id, branch_id));

create policy "admins and operations manage insights" on public.insights
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned goals" on public.goals
for select to authenticated
using (public.current_user_can_access_semantic_context(company_id, branch_id));

create policy "ceo and operations manage goals" on public.goals
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['ceo', 'gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['ceo', 'gerente_operaciones'])
);

create policy "read assigned managers" on public.managers
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (
    company_id is null
    or public.current_user_can_access_semantic_context(company_id, branch_id)
  )
);

create policy "admins manage managers" on public.managers
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read organization channels" on public.channels
for select to authenticated
using (public.current_user_can_access_org(organization_id));

create policy "admins manage channels" on public.channels
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read organization payers" on public.payers
for select to authenticated
using (public.current_user_can_access_org(organization_id));

create policy "admins manage payers" on public.payers
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read kpi definitions" on public.kpi_definitions
for select to authenticated
using (organization_id is null or public.current_user_can_access_org(organization_id));

create policy "admins manage kpi definitions" on public.kpi_definitions
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned data quality issues" on public.data_quality_issues
for select to authenticated
using (public.current_user_can_access_semantic_context(company_id, branch_id));

create policy "operations manage data quality issues" on public.data_quality_issues
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

do $$
declare
  fact_table text;
begin
  foreach fact_table in array array[
    'fact_financial',
    'fact_goals',
    'fact_data_quality',
    'fact_customer_experience',
    'fact_lab_orders',
    'fact_lab_order_tests',
    'fact_lab_samples',
    'fact_lab_results',
    'fact_lab_inventory',
    'fact_lab_referrals',
    'fact_medical_visits',
    'fact_physio_appointments',
    'fact_physio_sessions',
    'fact_physio_treatment_plans',
    'fact_physio_outcomes',
    'fact_imaging_appointments',
    'fact_imaging_studies',
    'fact_imaging_reports',
    'fact_equipment_usage',
    'fact_equipment_maintenance'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.current_user_can_access_semantic_context(company_id, branch_id))',
      'read assigned ' || fact_table,
      fact_table
    );

    execute format(
      'create policy %I on public.%I for all to authenticated using (public.current_user_is_super_admin() or public.current_user_has_role(array[''gerente_operaciones''])) with check (public.current_user_is_super_admin() or public.current_user_has_role(array[''gerente_operaciones'']))',
      'operations manage ' || fact_table,
      fact_table
    );
  end loop;
end $$;
