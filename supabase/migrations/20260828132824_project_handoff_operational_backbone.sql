create extension if not exists pgcrypto;

create table if not exists public.ingestion_template_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null,
  dataset_type text not null check (
    dataset_type in (
      'physiotherapy',
      'laboratory',
      'imaging',
      'billing',
      'payments',
      'direct_costs',
      'capacity',
      'appointments',
      'targets',
      'professionals',
      'services',
      'managers',
      'branches',
      'crm'
    )
  ),
  business_line text not null check (
    business_line in ('CONSOLIDATED', 'PHYSIOTHERAPY', 'LABORATORY', 'IMAGING')
  ),
  accepted_file_extensions text[] not null default '{}',
  period_field text not null,
  dedupe_key text[] not null default '{}',
  critical_fields text[] not null default '{}',
  pii_policy text not null default 'blocked'
    check (pii_policy in ('blocked', 'anonymized_before_ingestion')),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingestion_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_definition_id uuid not null
    references public.ingestion_template_definitions(id) on delete cascade,
  version text not null,
  schema_fields jsonb not null default '[]'::jsonb
    check (jsonb_typeof(schema_fields) = 'array'),
  mapping_rules jsonb not null default '{}'::jsonb
    check (jsonb_typeof(mapping_rules) = 'object'),
  validation_rules jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validation_rules) = 'object'),
  sample_payload jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sample_payload) = 'array'),
  change_summary text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  is_demo boolean not null default false,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_definition_id, version)
);

create table if not exists public.connector_credentials_metadata (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete set null,
  branch_id uuid references public.branches(id) on delete restrict,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  connector_id text not null,
  provider_name text not null,
  display_name text not null,
  credential_env_vars text[] not null default '{}',
  missing_env_vars text[] not null default '{}',
  secret_storage_strategy text not null default 'server_environment'
    check (secret_storage_strategy in ('server_environment', 'supabase_vault', 'external_secret_manager')),
  credential_status text not null default 'missing'
    check (credential_status in ('missing', 'configured', 'verified', 'rotation_due', 'revoked')),
  last_verified_at timestamptz,
  rotation_due_at timestamptz,
  configured_by uuid references public.profiles(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connector_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connector_credentials_metadata_id uuid not null
    references public.connector_credentials_metadata(id) on delete cascade,
  template_version_id uuid not null
    references public.ingestion_template_versions(id) on delete restrict,
  mapping_version text not null,
  source_schema jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_schema) = 'object'),
  field_mappings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(field_mappings) = 'object'),
  transformation_rules jsonb not null default '[]'::jsonb
    check (jsonb_typeof(transformation_rules) = 'array'),
  validation_overrides jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validation_overrides) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connector_credentials_metadata_id, template_version_id, mapping_version)
);

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete set null,
  branch_id uuid references public.branches(id) on delete restrict,
  connector_credentials_metadata_id uuid not null
    references public.connector_credentials_metadata(id) on delete restrict,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  template_version_id uuid references public.ingestion_template_versions(id) on delete restrict,
  job_key text not null,
  job_type text not null default 'manual' check (job_type in ('manual', 'scheduled', 'webhook')),
  schedule_expression text,
  status text not null default 'disabled'
    check (status in ('disabled', 'ready', 'running', 'paused', 'error')),
  retry_policy jsonb not null default '{"max_attempts":3}'::jsonb
    check (jsonb_typeof(retry_policy) = 'object'),
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, job_key)
);

create table if not exists public.sync_job_runs (
  id uuid primary key default gen_random_uuid(),
  sync_job_id uuid not null references public.sync_jobs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  import_id uuid references public.ingestion_imports(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'success', 'failed', 'cancelled', 'pending_credentials')),
  processed_records integer not null default 0 check (processed_records >= 0),
  rejected_records integer not null default 0 check (rejected_records >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  requested_by uuid references public.profiles(id) on delete set null,
  run_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(run_metadata) = 'object'),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_errors (
  id uuid primary key default gen_random_uuid(),
  sync_job_run_id uuid not null references public.sync_job_runs(id) on delete cascade,
  import_id uuid references public.ingestion_imports(id) on delete set null,
  severity text not null check (severity in ('warning', 'error', 'critical')),
  code text not null,
  message text not null,
  row_number integer check (row_number is null or row_number > 0),
  source_field text,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete set null,
  branch_id uuid references public.branches(id) on delete restrict,
  connector_credentials_metadata_id uuid not null
    references public.connector_credentials_metadata(id) on delete cascade,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  event_type text not null,
  endpoint_path text not null,
  status text not null default 'disabled'
    check (status in ('disabled', 'active', 'paused', 'error')),
  last_received_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0),
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, connector_credentials_metadata_id, event_type, endpoint_path)
);

create table if not exists public.raw_ingestion_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete set null,
  branch_id uuid references public.branches(id) on delete restrict,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  sync_job_run_id uuid references public.sync_job_runs(id) on delete set null,
  external_reference text,
  payload_hash text not null,
  sanitized_payload jsonb not null
    check (jsonb_typeof(sanitized_payload) = 'object'),
  contains_personal_data boolean not null default false
    check (contains_personal_data = false),
  anonymization_method text not null default 'not_required',
  schema_version text not null,
  received_at timestamptz not null default now(),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, source_id, payload_hash)
);

create table if not exists public.kpi_result_lineage (
  id uuid primary key default gen_random_uuid(),
  closing_kpi_result_id uuid not null
    references public.closing_kpi_results(id) on delete cascade,
  ingestion_import_id uuid references public.ingestion_imports(id) on delete set null,
  ingestion_published_row_id uuid references public.ingestion_published_rows(id) on delete set null,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  raw_file_id uuid references public.ingestion_raw_files(id) on delete set null,
  formula_version text not null,
  transformation_steps text[] not null default '{}',
  validation_codes text[] not null default '{}',
  data_quality_score numeric(5, 2)
    check (data_quality_score is null or (data_quality_score >= 0 and data_quality_score <= 100)),
  evidence_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence_payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (closing_kpi_result_id, ingestion_published_row_id)
);

create table if not exists public.export_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete set null,
  branch_id uuid references public.branches(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  module_key text not null,
  export_type text not null check (export_type in ('csv', 'xlsx', 'pdf')),
  filters jsonb not null default '{}'::jsonb
    check (jsonb_typeof(filters) = 'object'),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'ready', 'failed', 'expired')),
  sanitized_file_name text,
  storage_uri text,
  row_count integer check (row_count is null or row_count >= 0),
  error_message text,
  expires_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ingestion_template_definitions_scope_code_idx
  on public.ingestion_template_definitions (
    coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    code
  );

create unique index if not exists ingestion_template_versions_one_active_idx
  on public.ingestion_template_versions (template_definition_id)
  where status = 'active';

create unique index if not exists connector_credentials_scope_idx
  on public.connector_credentials_metadata (
    organization_id,
    connector_id,
    coalesce(country_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(operational_area_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists ingestion_template_versions_definition_idx
  on public.ingestion_template_versions (template_definition_id, status);

create index if not exists connector_credentials_access_idx
  on public.connector_credentials_metadata (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    credential_status
  );

create index if not exists connector_mappings_credential_idx
  on public.connector_mappings (connector_credentials_metadata_id, status);

create index if not exists sync_jobs_scope_idx
  on public.sync_jobs (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    status,
    next_run_at
  );

create index if not exists sync_job_runs_job_idx
  on public.sync_job_runs (sync_job_id, status, started_at);

create index if not exists sync_errors_run_idx
  on public.sync_errors (sync_job_run_id, severity, created_at);

create index if not exists webhook_subscriptions_scope_idx
  on public.webhook_subscriptions (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    status
  );

create index if not exists raw_ingestion_records_scope_idx
  on public.raw_ingestion_records (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    received_at
  );

create index if not exists kpi_result_lineage_result_idx
  on public.kpi_result_lineage (closing_kpi_result_id, ingestion_import_id);

create index if not exists export_requests_scope_idx
  on public.export_requests (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    status,
    created_at
  );

create trigger set_ingestion_template_definitions_updated_at
before update on public.ingestion_template_definitions
for each row execute function public.set_updated_at();

create trigger set_ingestion_template_versions_updated_at
before update on public.ingestion_template_versions
for each row execute function public.set_updated_at();

create trigger set_connector_credentials_metadata_updated_at
before update on public.connector_credentials_metadata
for each row execute function public.set_updated_at();

create trigger set_connector_mappings_updated_at
before update on public.connector_mappings
for each row execute function public.set_updated_at();

create trigger set_sync_jobs_updated_at
before update on public.sync_jobs
for each row execute function public.set_updated_at();

create trigger set_sync_job_runs_updated_at
before update on public.sync_job_runs
for each row execute function public.set_updated_at();

create trigger set_webhook_subscriptions_updated_at
before update on public.webhook_subscriptions
for each row execute function public.set_updated_at();

create trigger set_export_requests_updated_at
before update on public.export_requests
for each row execute function public.set_updated_at();

alter table public.ingestion_template_definitions enable row level security;
alter table public.ingestion_template_versions enable row level security;
alter table public.connector_credentials_metadata enable row level security;
alter table public.connector_mappings enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.sync_job_runs enable row level security;
alter table public.sync_errors enable row level security;
alter table public.webhook_subscriptions enable row level security;
alter table public.raw_ingestion_records enable row level security;
alter table public.kpi_result_lineage enable row level security;
alter table public.export_requests enable row level security;

grant select, insert, update, delete on table
  public.ingestion_template_definitions,
  public.ingestion_template_versions,
  public.connector_credentials_metadata,
  public.connector_mappings,
  public.sync_jobs,
  public.sync_job_runs,
  public.sync_errors,
  public.webhook_subscriptions,
  public.raw_ingestion_records,
  public.kpi_result_lineage,
  public.export_requests
to authenticated;

drop policy if exists "read handoff template definitions"
on public.ingestion_template_definitions;
create policy "read handoff template definitions"
on public.ingestion_template_definitions
for select to authenticated
using (
  organization_id is null
  or public.current_user_can_access_org(organization_id)
);

drop policy if exists "manage handoff template definitions"
on public.ingestion_template_definitions;
create policy "manage handoff template definitions"
on public.ingestion_template_definitions
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    organization_id is not null
    and public.current_user_can_access_org(organization_id)
    and public.current_user_has_role(array['gerente_operaciones'])
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    organization_id is not null
    and public.current_user_can_access_org(organization_id)
    and public.current_user_has_role(array['gerente_operaciones'])
  )
);

drop policy if exists "read handoff template versions"
on public.ingestion_template_versions;
create policy "read handoff template versions"
on public.ingestion_template_versions
for select to authenticated
using (
  exists (
    select 1
    from public.ingestion_template_definitions template_definition
    where template_definition.id = template_definition_id
      and (
        template_definition.organization_id is null
        or public.current_user_can_access_org(template_definition.organization_id)
      )
  )
);

drop policy if exists "manage handoff template versions"
on public.ingestion_template_versions;
create policy "manage handoff template versions"
on public.ingestion_template_versions
for all to authenticated
using (
  exists (
    select 1
    from public.ingestion_template_definitions template_definition
    where template_definition.id = template_definition_id
      and (
        public.current_user_is_super_admin()
        or (
          template_definition.organization_id is not null
          and public.current_user_can_access_org(template_definition.organization_id)
          and public.current_user_has_role(array['gerente_operaciones'])
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.ingestion_template_definitions template_definition
    where template_definition.id = template_definition_id
      and (
        public.current_user_is_super_admin()
        or (
          template_definition.organization_id is not null
          and public.current_user_can_access_org(template_definition.organization_id)
          and public.current_user_has_role(array['gerente_operaciones'])
        )
      )
  )
);

drop policy if exists "read scoped connector credentials"
on public.connector_credentials_metadata;
create policy "read scoped connector credentials"
on public.connector_credentials_metadata
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

drop policy if exists "manage scoped connector credentials"
on public.connector_credentials_metadata;
create policy "manage scoped connector credentials"
on public.connector_credentials_metadata
for all to authenticated
using (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
)
with check (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

drop policy if exists "read scoped connector mappings"
on public.connector_mappings;
create policy "read scoped connector mappings"
on public.connector_mappings
for select to authenticated
using (
  exists (
    select 1
    from public.connector_credentials_metadata credential
    where credential.id = connector_credentials_metadata_id
      and public.current_user_can_access_org(credential.organization_id)
      and (
        credential.country_id is null
        or public.current_user_can_access_country(credential.country_id)
      )
      and (
        credential.company_id is null
        or public.current_user_can_access_company(credential.company_id)
      )
      and (
        credential.operational_area_id is null
        or public.current_user_can_access_operational_area(credential.operational_area_id)
      )
      and (
        credential.branch_id is null
        or public.current_user_can_access_branch(credential.branch_id)
      )
  )
);

drop policy if exists "manage scoped connector mappings"
on public.connector_mappings;
create policy "manage scoped connector mappings"
on public.connector_mappings
for all to authenticated
using (
  public.current_user_is_super_admin()
  and exists (
    select 1
    from public.connector_credentials_metadata credential
    where credential.id = connector_credentials_metadata_id
      and public.current_user_can_access_org(credential.organization_id)
  )
)
with check (
  public.current_user_is_super_admin()
  and exists (
    select 1
    from public.connector_credentials_metadata credential
    where credential.id = connector_credentials_metadata_id
      and credential.organization_id = connector_mappings.organization_id
      and public.current_user_can_access_org(credential.organization_id)
  )
);

drop policy if exists "read scoped sync jobs" on public.sync_jobs;
create policy "read scoped sync jobs"
on public.sync_jobs
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

drop policy if exists "manage scoped sync jobs" on public.sync_jobs;
create policy "manage scoped sync jobs"
on public.sync_jobs
for all to authenticated
using (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
)
with check (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

drop policy if exists "read scoped sync runs" on public.sync_job_runs;
create policy "read scoped sync runs"
on public.sync_job_runs
for select to authenticated
using (
  exists (
    select 1
    from public.sync_jobs job
    where job.id = sync_job_id
      and public.current_user_can_access_org(job.organization_id)
      and (job.country_id is null or public.current_user_can_access_country(job.country_id))
      and (job.company_id is null or public.current_user_can_access_company(job.company_id))
      and (
        job.operational_area_id is null
        or public.current_user_can_access_operational_area(job.operational_area_id)
      )
      and (job.branch_id is null or public.current_user_can_access_branch(job.branch_id))
  )
);

drop policy if exists "manage scoped sync runs" on public.sync_job_runs;
create policy "manage scoped sync runs"
on public.sync_job_runs
for all to authenticated
using (
  public.current_user_is_super_admin()
  and exists (
    select 1
    from public.sync_jobs job
    where job.id = sync_job_id
      and public.current_user_can_access_org(job.organization_id)
  )
)
with check (
  public.current_user_is_super_admin()
  and exists (
    select 1
    from public.sync_jobs job
    where job.id = sync_job_id
      and job.organization_id = sync_job_runs.organization_id
      and public.current_user_can_access_org(job.organization_id)
  )
);

drop policy if exists "read scoped sync errors" on public.sync_errors;
create policy "read scoped sync errors"
on public.sync_errors
for select to authenticated
using (
  exists (
    select 1
    from public.sync_job_runs run
    join public.sync_jobs job on job.id = run.sync_job_id
    where run.id = sync_job_run_id
      and public.current_user_can_access_org(job.organization_id)
      and (job.country_id is null or public.current_user_can_access_country(job.country_id))
      and (job.company_id is null or public.current_user_can_access_company(job.company_id))
      and (
        job.operational_area_id is null
        or public.current_user_can_access_operational_area(job.operational_area_id)
      )
      and (job.branch_id is null or public.current_user_can_access_branch(job.branch_id))
  )
);

drop policy if exists "manage scoped sync errors" on public.sync_errors;
create policy "manage scoped sync errors"
on public.sync_errors
for all to authenticated
using (
  public.current_user_is_super_admin()
  and exists (
    select 1
    from public.sync_job_runs run
    join public.sync_jobs job on job.id = run.sync_job_id
    where run.id = sync_job_run_id
      and public.current_user_can_access_org(job.organization_id)
  )
)
with check (
  public.current_user_is_super_admin()
  and exists (
    select 1
    from public.sync_job_runs run
    join public.sync_jobs job on job.id = run.sync_job_id
    where run.id = sync_job_run_id
      and public.current_user_can_access_org(job.organization_id)
  )
);

drop policy if exists "read scoped webhook subscriptions"
on public.webhook_subscriptions;
create policy "read scoped webhook subscriptions"
on public.webhook_subscriptions
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

drop policy if exists "manage scoped webhook subscriptions"
on public.webhook_subscriptions;
create policy "manage scoped webhook subscriptions"
on public.webhook_subscriptions
for all to authenticated
using (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
)
with check (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

drop policy if exists "read scoped raw ingestion records"
on public.raw_ingestion_records;
create policy "read scoped raw ingestion records"
on public.raw_ingestion_records
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

drop policy if exists "manage scoped raw ingestion records"
on public.raw_ingestion_records;
create policy "manage scoped raw ingestion records"
on public.raw_ingestion_records
for all to authenticated
using (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
)
with check (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
  and contains_personal_data = false
);

drop policy if exists "read scoped kpi result lineage"
on public.kpi_result_lineage;
create policy "read scoped kpi result lineage"
on public.kpi_result_lineage
for select to authenticated
using (
  exists (
    select 1
    from public.closing_kpi_results result
    join public.closing_versions version
      on version.id = result.closing_version_id
    where result.id = closing_kpi_result_id
      and public.current_user_can_access_branch(version.branch_id)
  )
);

drop policy if exists "manage scoped kpi result lineage"
on public.kpi_result_lineage;
create policy "manage scoped kpi result lineage"
on public.kpi_result_lineage
for all to authenticated
using (
  exists (
    select 1
    from public.closing_kpi_results result
    join public.closing_versions version
      on version.id = result.closing_version_id
    where result.id = closing_kpi_result_id
      and public.current_user_can_access_branch(version.branch_id)
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
    from public.closing_kpi_results result
    join public.closing_versions version
      on version.id = result.closing_version_id
    where result.id = closing_kpi_result_id
      and public.current_user_can_access_branch(version.branch_id)
      and public.current_user_has_role(array[
        'super_admin',
        'webmaster_admin',
        'gerente_operaciones',
        'gerente_area',
        'gerente_sucursal'
      ])
  )
);

drop policy if exists "read scoped export requests"
on public.export_requests;
create policy "read scoped export requests"
on public.export_requests
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

drop policy if exists "create scoped export requests"
on public.export_requests;
create policy "create scoped export requests"
on public.export_requests
for insert to authenticated
with check (
  public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (
    operational_area_id is null
    or public.current_user_can_access_operational_area(operational_area_id)
  )
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'ceo',
    'gerente_operaciones',
    'gerente_area',
    'gerente_sucursal'
  ])
);

drop policy if exists "update scoped export requests"
on public.export_requests;
create policy "update scoped export requests"
on public.export_requests
for update to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'gerente_operaciones'
  ])
)
with check (
  public.current_user_can_access_org(organization_id)
  and public.current_user_has_role(array[
    'super_admin',
    'webmaster_admin',
    'gerente_operaciones'
  ])
);

drop policy if exists "delete scoped export requests"
on public.export_requests;
create policy "delete scoped export requests"
on public.export_requests
for delete to authenticated
using (
  public.current_user_is_super_admin()
  and public.current_user_can_access_org(organization_id)
);
