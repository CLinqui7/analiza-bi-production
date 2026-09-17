-- Targeted directory repair from Observacion.docx. This migration never
-- infers identity by display name and leaves every other profile untouched.

create table if not exists public.directory_assignment_denials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line_id uuid not null references public.business_lines(id) on delete restrict,
  reason text not null,
  source_reference text not null,
  before_snapshot jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, branch_id, business_line_id)
);

alter table public.directory_assignment_denials enable row level security;
revoke all on public.directory_assignment_denials from anon, authenticated;

create or replace function private.reject_denied_user_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' and exists (
    select 1
    from public.directory_assignment_denials denial
    where denial.active
      and denial.profile_id = new.user_id
      and denial.organization_id = new.organization_id
      and denial.branch_id = new.branch_id
      and (
        new.business_line_id is null
        or denial.business_line_id = new.business_line_id
        or upper(coalesce(new.business_line_code, '')) = 'PHYSIOTHERAPY'
      )
  ) then
    raise exception 'DIRECTORY_ASSIGNMENT_DENIED_BY_CORRECTION' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.reject_denied_manager_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' and exists (
    select 1
    from public.directory_assignment_denials denial
    where denial.active
      and denial.profile_id = new.profile_id
      and denial.organization_id = new.organization_id
      and denial.branch_id = new.branch_id
      and (
        new.business_line_id is null
        or denial.business_line_id = new.business_line_id
        or upper(coalesce(new.business_line_code, '')) = 'PHYSIOTHERAPY'
      )
  ) then
    raise exception 'DIRECTORY_ASSIGNMENT_DENIED_BY_CORRECTION' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_denied_user_role_assignment on public.user_roles;
create trigger reject_denied_user_role_assignment
before insert or update on public.user_roles
for each row execute function private.reject_denied_user_role_assignment();

drop trigger if exists reject_denied_manager_assignment on public.manager_assignments;
create trigger reject_denied_manager_assignment
before insert or update on public.manager_assignments
for each row execute function private.reject_denied_manager_assignment();

do $$
declare
  target_profile public.profiles%rowtype;
  casco_branch public.branches%rowtype;
  centro_branch public.branches%rowtype;
  laboratory_line public.business_lines%rowtype;
  physiotherapy_line public.business_lines%rowtype;
  matching_profiles integer;
  correct_assignment_count integer;
  obsolete_user_role_count integer;
  obsolete_manager_assignment_count integer;
  obsolete_branch_access_count integer;
begin
  select count(*) into matching_profiles
  from public.profiles
  where lower(email) = 'krissia.dominguez@labanaliza.com';

  if matching_profiles = 0 then
    raise notice 'Krissia correction skipped: target email is absent in this environment.';
    return;
  end if;
  if matching_profiles <> 1 then
    raise exception 'KRISSIA_IDENTITY_AMBIGUOUS' using errcode = '23514';
  end if;

  select * into strict target_profile
  from public.profiles
  where lower(email) = 'krissia.dominguez@labanaliza.com';

  select * into strict casco_branch
  from public.branches
  where organization_id = target_profile.organization_id
    and upper(code) = 'L010'
    and lower(name) like '%casco%';
  select * into strict centro_branch
  from public.branches
  where organization_id = target_profile.organization_id
    and upper(code) = 'L024'
    and lower(name) like '%centro%';
  select * into strict laboratory_line
  from public.business_lines
  where organization_id = target_profile.organization_id
    and upper(code) = 'LABORATORY'
    and (company_id = casco_branch.company_id or company_id is null)
  order by (company_id = casco_branch.company_id) desc
  limit 1;
  select * into strict physiotherapy_line
  from public.business_lines
  where organization_id = target_profile.organization_id
    and upper(code) = 'PHYSIOTHERAPY'
    and (company_id = centro_branch.company_id or company_id is null)
  order by (company_id = centro_branch.company_id) desc
  limit 1;

  select
    (select count(*) from public.user_roles role_grant
      where role_grant.user_id = target_profile.id
        and role_grant.status = 'active'
        and role_grant.branch_id = casco_branch.id
        and role_grant.business_line_id = laboratory_line.id)
    +
    (select count(*) from public.manager_assignments assignment
      where assignment.profile_id = target_profile.id
        and assignment.status = 'active'
        and assignment.branch_id = casco_branch.id
        and assignment.business_line_id = laboratory_line.id)
  into correct_assignment_count;
  if correct_assignment_count < 1 then
    raise exception 'KRISSIA_REQUIRED_LABORATORY_CASCO_ASSIGNMENT_NOT_FOUND' using errcode = '23514';
  end if;

  select count(*) into obsolete_user_role_count
  from public.user_roles role_grant
  where role_grant.user_id = target_profile.id
    and role_grant.status = 'active'
    and role_grant.branch_id = centro_branch.id
    and (
      role_grant.business_line_id = physiotherapy_line.id
      or upper(coalesce(role_grant.business_line_code, '')) = 'PHYSIOTHERAPY'
      or role_grant.business_line_id is null
    );
  select count(*) into obsolete_manager_assignment_count
  from public.manager_assignments assignment
  where assignment.profile_id = target_profile.id
    and assignment.status = 'active'
    and assignment.branch_id = centro_branch.id
    and (
      assignment.business_line_id = physiotherapy_line.id
      or upper(coalesce(assignment.business_line_code, '')) = 'PHYSIOTHERAPY'
      or assignment.business_line_id is null
    );
  select count(*) into obsolete_branch_access_count
  from public.user_branch_access access
  where access.user_id = target_profile.id and access.branch_id = centro_branch.id;

  insert into public.directory_assignment_denials (
    organization_id, profile_id, branch_id, business_line_id,
    reason, source_reference, before_snapshot
  ) values (
    target_profile.organization_id,
    target_profile.id,
    centro_branch.id,
    physiotherapy_line.id,
    'Asignación obsoleta: la identidad conserva únicamente Laboratorio en SS-Casco-L010.',
    'Observacion.docx / solicitud 2026-09-17',
    jsonb_build_object(
      'email', lower(target_profile.email),
      'obsolete_user_roles', obsolete_user_role_count,
      'obsolete_manager_assignments', obsolete_manager_assignment_count,
      'obsolete_branch_access_rows', obsolete_branch_access_count,
      'previous_default_branch_id', target_profile.default_branch_id,
      'preserved_branch_id', casco_branch.id,
      'preserved_business_line_id', laboratory_line.id
    )
  )
  on conflict (profile_id, branch_id, business_line_id) do update
  set active = true,
      reason = excluded.reason,
      source_reference = excluded.source_reference,
      before_snapshot = excluded.before_snapshot;

  update public.user_roles
  set status = 'inactive', deactivated_at = coalesce(deactivated_at, now())
  where user_id = target_profile.id
    and status = 'active'
    and branch_id = centro_branch.id
    and (
      business_line_id = physiotherapy_line.id
      or upper(coalesce(business_line_code, '')) = 'PHYSIOTHERAPY'
      or business_line_id is null
    );

  update public.manager_assignments
  set status = 'inactive', deactivated_at = coalesce(deactivated_at, now()), updated_at = now()
  where profile_id = target_profile.id
    and status = 'active'
    and branch_id = centro_branch.id
    and (
      business_line_id = physiotherapy_line.id
      or upper(coalesce(business_line_code, '')) = 'PHYSIOTHERAPY'
      or business_line_id is null
    );

  delete from public.user_branch_access
  where user_id = target_profile.id and branch_id = centro_branch.id;

  update public.profiles
  set default_branch_id = casco_branch.id, updated_at = now()
  where id = target_profile.id and default_branch_id = centro_branch.id;

  if exists (
    select 1 from public.user_roles role_grant
    where role_grant.user_id = target_profile.id and role_grant.status = 'active'
      and role_grant.branch_id = centro_branch.id
      and (role_grant.business_line_id = physiotherapy_line.id or role_grant.business_line_id is null)
  ) or exists (
    select 1 from public.manager_assignments assignment
    where assignment.profile_id = target_profile.id and assignment.status = 'active'
      and assignment.branch_id = centro_branch.id
      and (assignment.business_line_id = physiotherapy_line.id or assignment.business_line_id is null)
  ) then
    raise exception 'KRISSIA_OBSOLETE_ASSIGNMENT_REMAINS_ACTIVE' using errcode = '23514';
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_table, entity_id,
    country_id, company_id, branch_id, metadata
  ) values (
    target_profile.organization_id, null, 'directory.assignment_corrected',
    'profiles', target_profile.id, casco_branch.country_id, casco_branch.company_id,
    centro_branch.id,
    jsonb_build_object(
      'source', 'Observacion.docx',
      'email', lower(target_profile.email),
      'deactivated_scope', jsonb_build_object('branch_id', centro_branch.id, 'business_line_id', physiotherapy_line.id),
      'preserved_scope', jsonb_build_object('branch_id', casco_branch.id, 'business_line_id', laboratory_line.id),
      'user_roles_changed', obsolete_user_role_count,
      'manager_assignments_changed', obsolete_manager_assignment_count,
      'branch_access_rows_removed', obsolete_branch_access_count
    )
  );
end;
$$;

comment on table public.directory_assignment_denials is
  'Explicit identity and scope denials that prevent stale directory synchronization from restoring a corrected assignment.';
