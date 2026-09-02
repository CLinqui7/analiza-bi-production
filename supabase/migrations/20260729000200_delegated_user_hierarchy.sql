alter table public.profiles
  add column if not exists deactivated_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deactivation_reason text,
  add column if not exists invited_by uuid references public.profiles(id) on delete set null;

alter table public.user_roles
  add column if not exists operational_area_id uuid,
  add column if not exists status text not null default 'active'
    check (status in ('pending_invitation', 'active', 'inactive')),
  add column if not exists deactivated_at timestamptz;

alter table public.branches
  add column if not exists operational_area_id uuid,
  add column if not exists status text not null default 'active'
    check (status in ('draft', 'pending_manager', 'active', 'temporarily_closed', 'inactive')),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.branches
  alter column status set default 'pending_manager';

create table if not exists public.operational_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  manager_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, country_id, company_id, code)
);

alter table public.user_roles
  add constraint user_roles_operational_area_id_fkey
  foreign key (operational_area_id) references public.operational_areas(id) on delete cascade;

alter table public.branches
  add constraint branches_operational_area_id_fkey
  foreign key (operational_area_id) references public.operational_areas(id) on delete set null;

create table if not exists public.area_branch_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operational_area_id uuid not null references public.operational_areas(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.manager_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  operational_area_id uuid references public.operational_areas(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending_invitation'
    check (status in ('pending_invitation', 'active', 'inactive')),
  starts_at timestamptz,
  ends_at timestamptz,
  deactivated_at timestamptz,
  reassigned_to_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reporting_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  manager_profile_id uuid not null references public.profiles(id) on delete cascade,
  subordinate_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (manager_profile_id, subordinate_profile_id, starts_at)
);

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  invited_role_id uuid not null references public.roles(id) on delete restrict,
  invited_by uuid references public.profiles(id) on delete set null,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  operational_area_id uuid references public.operational_areas(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invitation_token_hash text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_hierarchy (
  role_id uuid primary key references public.roles(id) on delete cascade,
  role_key text not null unique,
  hierarchy_level integer not null check (hierarchy_level between 0 and 100),
  can_invite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permission_delegations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  delegator_role_id uuid not null references public.roles(id) on delete cascade,
  target_role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  operational_area_id uuid references public.operational_areas(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (
    organization_id,
    delegator_role_id,
    target_role_id,
    permission_key,
    country_id,
    company_id,
    operational_area_id,
    branch_id
  )
);

create table if not exists public.assignment_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_table text not null,
  entity_id uuid not null,
  action text not null,
  previous_scope jsonb not null default '{}'::jsonb,
  next_scope jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists area_branch_one_active_assignment_idx
  on public.area_branch_assignments (branch_id)
  where ends_at is null;

create index if not exists operational_areas_context_idx
  on public.operational_areas (organization_id, country_id, company_id);

create index if not exists manager_assignments_scope_idx
  on public.manager_assignments (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    status
  );

create index if not exists user_invitations_scope_idx
  on public.user_invitations (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    status
  );

insert into public.roles (id, key, name, description)
values
  (
    '60000000-0000-4000-8000-000000000000',
    'super_admin',
    'Superadministrador',
    'Administra la plataforma completa, permisos globales y gobierno del BI.'
  ),
  (
    '60000000-0000-4000-8000-000000000006',
    'usuario_operativo',
    'Usuario operativo',
    'Carga y corrige datos operativos sin privilegios gerenciales.'
  ),
  (
    '60000000-0000-4000-8000-000000000007',
    'viewer',
    'Viewer',
    'Consulta informacion autorizada sin permisos de modificacion.'
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.role_hierarchy (role_id, role_key, hierarchy_level, can_invite)
select id, key, hierarchy_level, can_invite
from (
  values
    ('super_admin', 100, true),
    ('webmaster_admin', 100, true),
    ('gerente_operaciones', 80, true),
    ('gerente_area', 60, true),
    ('gerente_sucursal', 40, true),
    ('usuario_operativo', 20, false),
    ('viewer', 10, false)
) as hierarchy(role_key, hierarchy_level, can_invite)
join public.roles r on r.key = hierarchy.role_key
on conflict (role_id) do update set
  role_key = excluded.role_key,
  hierarchy_level = excluded.hierarchy_level,
  can_invite = excluded.can_invite,
  updated_at = now();

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
      and ur.status = 'active'
      and r.key in ('super_admin', 'webmaster_admin')
  );
$$;

create or replace function public.current_user_max_role_level()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(rh.hierarchy_level), 0)
  from public.user_roles ur
  join public.role_hierarchy rh on rh.role_id = ur.role_id
  where ur.user_id = auth.uid()
    and ur.status = 'active';
$$;

create or replace function public.current_user_can_delegate_role(target_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.role_hierarchy actor_hierarchy
        on actor_hierarchy.role_id = ur.role_id
      join public.role_hierarchy target_hierarchy
        on target_hierarchy.role_id = target_role_id
      where ur.user_id = auth.uid()
        and ur.status = 'active'
        and actor_hierarchy.can_invite
        and actor_hierarchy.hierarchy_level > target_hierarchy.hierarchy_level
    );
$$;

create or replace function public.current_user_can_access_operational_area(
  target_operational_area_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.manager_assignments ma
      where ma.profile_id = auth.uid()
        and ma.status = 'active'
        and ma.operational_area_id = target_operational_area_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.operational_areas oa
        on oa.organization_id = ur.organization_id
      where ur.user_id = auth.uid()
        and ur.status = 'active'
        and oa.id = target_operational_area_id
        and (ur.country_id is null or ur.country_id = oa.country_id)
        and (ur.company_id is null or ur.company_id = oa.company_id)
        and (
          ur.operational_area_id is null
          or ur.operational_area_id = target_operational_area_id
        )
    );
$$;

create or replace function public.current_user_can_manage_delegated_scope(
  target_country_id uuid,
  target_company_id uuid,
  target_operational_area_id uuid,
  target_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.status = 'active'
        and (ur.country_id is null or ur.country_id = target_country_id)
        and (ur.company_id is null or ur.company_id = target_company_id)
        and (
          target_operational_area_id is null
          or ur.operational_area_id is null
          or ur.operational_area_id = target_operational_area_id
        )
        and (
          target_branch_id is null
          or ur.branch_id is null
          or ur.branch_id = target_branch_id
        )
    );
$$;

create or replace function public.audit_delegation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_record jsonb;
  previous_record jsonb;
  audit_organization_id uuid;
  audit_entity_id uuid;
begin
  next_record := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  previous_record := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  next_record := next_record - 'invitation_token_hash';
  previous_record := previous_record - 'invitation_token_hash';
  audit_organization_id := coalesce(
    (next_record ->> 'organization_id')::uuid,
    (previous_record ->> 'organization_id')::uuid
  );
  audit_entity_id := coalesce(
    (next_record ->> 'id')::uuid,
    (previous_record ->> 'id')::uuid
  );

  insert into public.assignment_history (
    organization_id,
    actor_user_id,
    entity_table,
    entity_id,
    action,
    previous_scope,
    next_scope
  )
  values (
    audit_organization_id,
    auth.uid(),
    tg_table_name,
    audit_entity_id,
    lower(tg_op),
    previous_record,
    next_record
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_table,
    entity_id,
    metadata
  )
  values (
    audit_organization_id,
    auth.uid(),
    'delegation.' || lower(tg_op),
    tg_table_name,
    audit_entity_id,
    jsonb_build_object(
      'previous_scope',
      previous_record,
      'next_scope',
      next_record
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists audit_operational_areas_delegation on public.operational_areas;
create trigger audit_operational_areas_delegation
after insert or update on public.operational_areas
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_area_branch_assignments_delegation
  on public.area_branch_assignments;
create trigger audit_area_branch_assignments_delegation
after insert or update on public.area_branch_assignments
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_manager_assignments_delegation
  on public.manager_assignments;
create trigger audit_manager_assignments_delegation
after insert or update on public.manager_assignments
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_reporting_lines_delegation on public.reporting_lines;
create trigger audit_reporting_lines_delegation
after insert or update on public.reporting_lines
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_user_invitations_delegation on public.user_invitations;
create trigger audit_user_invitations_delegation
after insert or update on public.user_invitations
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_permission_delegations_delegation
  on public.permission_delegations;
create trigger audit_permission_delegations_delegation
after insert or update on public.permission_delegations
for each row execute function public.audit_delegation_change();

drop trigger if exists set_operational_areas_updated_at on public.operational_areas;
create trigger set_operational_areas_updated_at before update on public.operational_areas
for each row execute function public.set_updated_at();

drop trigger if exists set_manager_assignments_updated_at on public.manager_assignments;
create trigger set_manager_assignments_updated_at before update on public.manager_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_user_invitations_updated_at on public.user_invitations;
create trigger set_user_invitations_updated_at before update on public.user_invitations
for each row execute function public.set_updated_at();

drop trigger if exists set_role_hierarchy_updated_at on public.role_hierarchy;
create trigger set_role_hierarchy_updated_at before update on public.role_hierarchy
for each row execute function public.set_updated_at();

alter table public.operational_areas enable row level security;
alter table public.area_branch_assignments enable row level security;
alter table public.manager_assignments enable row level security;
alter table public.reporting_lines enable row level security;
alter table public.user_invitations enable row level security;
alter table public.role_hierarchy enable row level security;
alter table public.permission_delegations enable row level security;
alter table public.assignment_history enable row level security;

drop policy if exists "super admins manage branches" on public.branches;
create policy "delegated managers manage branches" on public.branches
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      id
    )
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      id
    )
  )
);

create policy "read assigned operational areas" on public.operational_areas
for select to authenticated
using (
  public.current_user_can_access_operational_area(id)
  or public.current_user_can_access_company(company_id)
);

create policy "operations manage operational areas" on public.operational_areas
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(country_id, company_id, id, null)
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(country_id, company_id, id, null)
  )
);

create policy "read assigned area branch assignments" on public.area_branch_assignments
for select to authenticated
using (
  public.current_user_can_access_operational_area(operational_area_id)
  or public.current_user_can_access_branch(branch_id)
);

create policy "operations assign branches to areas" on public.area_branch_assignments
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_access_operational_area(operational_area_id)
    and public.current_user_can_access_branch(branch_id)
  )
);

create policy "read assigned manager assignments" on public.manager_assignments
for select to authenticated
using (
  profile_id = auth.uid()
  or public.current_user_can_manage_delegated_scope(
    country_id,
    company_id,
    operational_area_id,
    branch_id
  )
);

create policy "delegated managers create lower manager assignments"
on public.manager_assignments
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_can_delegate_role(role_id)
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      branch_id
    )
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_can_delegate_role(role_id)
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      branch_id
    )
  )
);

create policy "read assigned reporting lines" on public.reporting_lines
for select to authenticated
using (
  manager_profile_id = auth.uid()
  or subordinate_profile_id = auth.uid()
  or public.current_user_can_access_org(organization_id)
);

create policy "delegated managers manage reporting lines" on public.reporting_lines
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_can_access_org(organization_id)
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_can_access_org(organization_id)
);

create policy "read assigned user invitations" on public.user_invitations
for select to authenticated
using (
  invited_by = auth.uid()
  or public.current_user_can_manage_delegated_scope(
    country_id,
    company_id,
    operational_area_id,
    branch_id
  )
);

create policy "delegated managers invite lower roles" on public.user_invitations
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_can_delegate_role(invited_role_id)
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      branch_id
    )
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_can_delegate_role(invited_role_id)
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      branch_id
    )
  )
);

create policy "authenticated users read role hierarchy" on public.role_hierarchy
for select to authenticated
using (true);

create policy "super admins manage role hierarchy" on public.role_hierarchy
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read permission delegations in scope" on public.permission_delegations
for select to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_can_manage_delegated_scope(
    country_id,
    company_id,
    operational_area_id,
    branch_id
  )
);

create policy "super admins manage permission delegations"
on public.permission_delegations
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assignment history in scope" on public.assignment_history
for select to authenticated
using (public.current_user_can_access_org(organization_id));

create policy "authenticated users record assignment history"
on public.assignment_history
for insert to authenticated
with check (
  actor_user_id = auth.uid()
  or public.current_user_is_super_admin()
);
