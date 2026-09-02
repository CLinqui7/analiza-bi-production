create extension if not exists pgcrypto;

create table if not exists public.ingestion_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  connector_id text,
  source_type text not null check (source_type in ('REST API', 'GraphQL', 'database', 'webhook', 'SFTP', 'manual file', 'authorized scraping')),
  name text not null,
  status text not null default 'Pendiente' check (status in ('Conectado', 'Sin configurar', 'Error', 'Pausado', 'Pendiente')),
  frequency text not null,
  owner text not null,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  last_data_received_at timestamptz,
  processed_records integer not null default 0,
  rejected_records integer not null default 0,
  retry_count integer not null default 0,
  coverage_percent numeric(5,2) not null default 0,
  freshness text not null default 'unknown',
  required_credentials text[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingestion_raw_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_by_actor text not null,
  original_file_name text not null,
  sanitized_file_name text not null,
  content_type text not null,
  file_size_bytes integer not null check (file_size_bytes >= 0),
  checksum_sha256 text not null,
  storage_uri text not null,
  immutable boolean not null default true,
  uploaded_at timestamptz not null default now(),
  unique (organization_id, checksum_sha256, storage_uri)
);

create table if not exists public.ingestion_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  raw_file_id uuid not null references public.ingestion_raw_files(id) on delete restrict,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  country_id uuid references public.countries(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete set null,
  dataset_type text not null,
  template_id text not null,
  template_version text not null,
  period text not null,
  idempotency_key text not null,
  status text not null check (status in ('RAW_RECEIVED', 'VALIDATED', 'WARNING', 'BLOCKED', 'PUBLISHED', 'ROLLED_BACK')),
  quality_score numeric(5,2) not null default 0,
  row_count integer not null default 0,
  duplicate_of uuid references public.ingestion_imports(id) on delete set null,
  replace_decision text not null default 'none',
  created_by_actor text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, idempotency_key)
);

create table if not exists public.ingestion_staging_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.ingestion_imports(id) on delete cascade,
  row_number integer not null,
  original_payload jsonb not null,
  mapped_payload jsonb not null,
  row_hash text not null,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  validation_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (import_id, row_number)
);

create table if not exists public.ingestion_published_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.ingestion_imports(id) on delete restrict,
  dataset_type text not null,
  row_number integer not null,
  row_hash text not null,
  values_payload jsonb not null,
  active boolean not null default true,
  published_at timestamptz not null default now()
);

create table if not exists public.ingestion_lineage (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.ingestion_imports(id) on delete cascade,
  published_row_id uuid references public.ingestion_published_rows(id) on delete cascade,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  raw_file_id uuid not null references public.ingestion_raw_files(id) on delete restrict,
  original_row_number integer,
  mapping_version text not null,
  transformation_steps text[] not null default '{}',
  validation_codes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  import_id uuid references public.ingestion_imports(id) on delete set null,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_key text not null,
  action text not null check (action in ('upload', 'validation', 'publish', 'rollback', 'mapping_change', 'connector_run', 'connector_failure', 'retry', 'manual_correction')),
  status text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_connector_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.ingestion_sources(id) on delete cascade,
  import_id uuid references public.ingestion_imports(id) on delete set null,
  status text not null check (status in ('success', 'failed', 'pending_credentials')),
  processed_records integer not null default 0,
  rejected_records integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  retry_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ingestion_sources_scope_idx on public.ingestion_sources (organization_id, country_id, company_id, branch_id, status);
create index if not exists ingestion_imports_scope_idx on public.ingestion_imports (organization_id, country_id, company_id, branch_id, dataset_type, period, status);
create index if not exists ingestion_staging_import_idx on public.ingestion_staging_rows (import_id, row_number);
create index if not exists ingestion_published_active_idx on public.ingestion_published_rows (dataset_type, active, published_at);
create index if not exists ingestion_lineage_import_idx on public.ingestion_lineage (import_id, published_row_id);
create index if not exists ingestion_audit_import_idx on public.ingestion_audit_events (organization_id, import_id, created_at);
create index if not exists ingestion_connector_runs_source_idx on public.ingestion_connector_runs (source_id, started_at);

alter table public.ingestion_sources enable row level security;
alter table public.ingestion_raw_files enable row level security;
alter table public.ingestion_imports enable row level security;
alter table public.ingestion_staging_rows enable row level security;
alter table public.ingestion_published_rows enable row level security;
alter table public.ingestion_lineage enable row level security;
alter table public.ingestion_audit_events enable row level security;
alter table public.ingestion_connector_runs enable row level security;

create policy "read scoped ingestion sources" on public.ingestion_sources
  for select to authenticated
  using (
    public.current_user_can_access_org(organization_id)
    and (country_id is null or public.current_user_can_access_country(country_id))
    and (company_id is null or public.current_user_can_access_company(company_id))
    and (branch_id is null or public.current_user_can_access_branch(branch_id))
  );

create policy "manage ingestion sources" on public.ingestion_sources
  for all to authenticated
  using (
    public.current_user_is_super_admin()
    or public.current_user_has_role(array['gerente_operaciones'])
  )
  with check (
    public.current_user_can_access_org(organization_id)
    and (country_id is null or public.current_user_can_access_country(country_id))
    and (company_id is null or public.current_user_can_access_company(company_id))
    and (branch_id is null or public.current_user_can_access_branch(branch_id))
  );

create policy "read scoped ingestion raw" on public.ingestion_raw_files
  for select to authenticated
  using (public.current_user_can_access_org(organization_id));

create policy "read scoped ingestion imports" on public.ingestion_imports
  for select to authenticated
  using (
    public.current_user_can_access_org(organization_id)
    and (country_id is null or public.current_user_can_access_country(country_id))
    and (company_id is null or public.current_user_can_access_company(company_id))
    and (branch_id is null or public.current_user_can_access_branch(branch_id))
    and (
      operational_area_id is null
      or public.current_user_can_access_operational_area(operational_area_id)
    )
  );

create policy "read scoped ingestion staging" on public.ingestion_staging_rows
  for select to authenticated
  using (
    exists (
      select 1
      from public.ingestion_imports di
      where di.id = import_id
        and public.current_user_can_access_org(di.organization_id)
        and (di.country_id is null or public.current_user_can_access_country(di.country_id))
        and (di.company_id is null or public.current_user_can_access_company(di.company_id))
        and (di.branch_id is null or public.current_user_can_access_branch(di.branch_id))
    )
  );

create policy "read scoped ingestion published" on public.ingestion_published_rows
  for select to authenticated
  using (
    exists (
      select 1
      from public.ingestion_imports di
      where di.id = import_id
        and public.current_user_can_access_org(di.organization_id)
        and (di.country_id is null or public.current_user_can_access_country(di.country_id))
        and (di.company_id is null or public.current_user_can_access_company(di.company_id))
        and (di.branch_id is null or public.current_user_can_access_branch(di.branch_id))
    )
  );

create policy "read scoped ingestion lineage" on public.ingestion_lineage
  for select to authenticated
  using (
    exists (
      select 1
      from public.ingestion_imports di
      where di.id = import_id
        and public.current_user_can_access_org(di.organization_id)
        and (di.country_id is null or public.current_user_can_access_country(di.country_id))
        and (di.company_id is null or public.current_user_can_access_company(di.company_id))
        and (di.branch_id is null or public.current_user_can_access_branch(di.branch_id))
    )
  );

create policy "read scoped ingestion audit" on public.ingestion_audit_events
  for select to authenticated
  using (public.current_user_is_super_admin() or public.current_user_has_role(array['ceo', 'gerente_operaciones']));

create policy "service insert ingestion raw" on public.ingestion_raw_files
  for insert to authenticated
  with check (
    public.current_user_can_access_org(organization_id)
    and (
      public.current_user_is_super_admin()
      or public.current_user_has_role(array['gerente_operaciones', 'gerente_area', 'gerente_sucursal', 'usuario_operativo'])
    )
  );

create policy "service manage ingestion imports" on public.ingestion_imports
  for all to authenticated
  using (
    public.current_user_can_access_org(organization_id)
    and (country_id is null or public.current_user_can_access_country(country_id))
    and (company_id is null or public.current_user_can_access_company(company_id))
    and (branch_id is null or public.current_user_can_access_branch(branch_id))
  )
  with check (
    public.current_user_can_access_org(organization_id)
    and (country_id is null or public.current_user_can_access_country(country_id))
    and (company_id is null or public.current_user_can_access_company(company_id))
    and (branch_id is null or public.current_user_can_access_branch(branch_id))
    and (
      public.current_user_is_super_admin()
      or public.current_user_has_role(array['gerente_operaciones', 'gerente_area', 'gerente_sucursal', 'usuario_operativo'])
    )
  );

create policy "service manage ingestion staging" on public.ingestion_staging_rows
  for all to authenticated
  using (
    exists (
      select 1 from public.ingestion_imports di
      where di.id = import_id
        and public.current_user_can_access_org(di.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.ingestion_imports di
      where di.id = import_id
        and public.current_user_can_access_org(di.organization_id)
    )
  );

create policy "service manage ingestion published" on public.ingestion_published_rows
  for all to authenticated
  using (
    exists (
      select 1 from public.ingestion_imports di
      where di.id = import_id
        and public.current_user_can_access_org(di.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.ingestion_imports di
      where di.id = import_id
        and public.current_user_can_access_org(di.organization_id)
    )
  );

create policy "service manage ingestion audit" on public.ingestion_audit_events
  for insert to authenticated
  with check (
    public.current_user_can_access_org(organization_id)
    and (
      actor_id = auth.uid()
      or actor_id is null
      or public.current_user_is_super_admin()
    )
  );

create policy "service manage connector runs" on public.ingestion_connector_runs
  for all to authenticated
  using (
    exists (
      select 1 from public.ingestion_sources src
      where src.id = source_id
        and public.current_user_can_access_org(src.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.ingestion_sources src
      where src.id = source_id
        and public.current_user_can_access_org(src.organization_id)
    )
  );

create trigger set_ingestion_sources_updated_at
  before update on public.ingestion_sources
  for each row execute function public.set_updated_at();
