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
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.branches b on b.id = target_branch_id
      where ur.user_id = auth.uid()
        and coalesce(ur.status, 'active') = 'active'
        and (ur.deactivated_at is null)
        and (
          ur.organization_id is null
          or ur.organization_id = b.organization_id
        )
        and (ur.country_id is null or ur.country_id = b.country_id)
        and (ur.company_id is null or ur.company_id = b.company_id)
        and (
          (
            r.key in ('ceo', 'gerente_operaciones')
            and (
              ur.operational_area_id is null
              or ur.operational_area_id = b.operational_area_id
            )
            and (ur.branch_id is null or ur.branch_id = b.id)
          )
          or (
            r.key = 'gerente_area'
            and ur.operational_area_id is not null
            and ur.operational_area_id = b.operational_area_id
            and (ur.branch_id is null or ur.branch_id = b.id)
          )
          or (
            r.key = 'gerente_sucursal'
            and ur.branch_id = b.id
          )
        )
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
      join public.roles r on r.id = ur.role_id
      join public.operational_areas oa
        on oa.id = target_operational_area_id
      where ur.user_id = auth.uid()
        and coalesce(ur.status, 'active') = 'active'
        and (ur.deactivated_at is null)
        and (
          ur.organization_id is null
          or ur.organization_id = oa.organization_id
        )
        and (ur.country_id is null or ur.country_id = oa.country_id)
        and (ur.company_id is null or ur.company_id = oa.company_id)
        and (
          (
            r.key in ('ceo', 'gerente_operaciones')
            and (
              ur.operational_area_id is null
              or ur.operational_area_id = target_operational_area_id
            )
          )
          or (
            r.key = 'gerente_area'
            and ur.operational_area_id = target_operational_area_id
          )
        )
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.operational_area_id = target_operational_area_id
    );
$$;

drop policy if exists "read assigned operational areas" on public.operational_areas;
create policy "read assigned operational areas" on public.operational_areas
for select to authenticated
using (public.current_user_can_access_operational_area(id));

create or replace function public.audit_security_principal_change()
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
  audit_action text;
begin
  next_record := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  previous_record := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  audit_organization_id := coalesce(
    (next_record ->> 'organization_id')::uuid,
    (previous_record ->> 'organization_id')::uuid
  );
  audit_entity_id := coalesce(
    (next_record ->> 'id')::uuid,
    (previous_record ->> 'id')::uuid
  );

  audit_action := case
    when tg_table_name = 'user_roles' and tg_op = 'INSERT'
      then 'user_role.assigned'
    when tg_table_name = 'user_roles'
      and (previous_record ->> 'role_id') is distinct from (next_record ->> 'role_id')
      then 'user_role.changed'
    when tg_table_name = 'user_roles'
      and (
        (previous_record ->> 'country_id') is distinct from (next_record ->> 'country_id')
        or (previous_record ->> 'company_id') is distinct from (next_record ->> 'company_id')
        or (previous_record ->> 'operational_area_id') is distinct from (next_record ->> 'operational_area_id')
        or (previous_record ->> 'branch_id') is distinct from (next_record ->> 'branch_id')
      )
      then 'user_scope.changed'
    when tg_table_name = 'profiles'
      and (previous_record ->> 'status') is distinct from (next_record ->> 'status')
      then 'user_status.changed'
    when tg_table_name = 'profiles'
      and (previous_record ->> 'deactivated_at') is distinct from (next_record ->> 'deactivated_at')
      then 'user_activation.changed'
    else 'security_principal.' || lower(tg_op)
  end;

  if audit_organization_id is null or audit_entity_id is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

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
    audit_action,
    previous_record,
    next_record
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_table,
    entity_id,
    country_id,
    company_id,
    branch_id,
    metadata
  )
  values (
    audit_organization_id,
    auth.uid(),
    audit_action,
    tg_table_name,
    audit_entity_id,
    coalesce(
      (next_record ->> 'country_id')::uuid,
      (previous_record ->> 'country_id')::uuid
    ),
    coalesce(
      (next_record ->> 'company_id')::uuid,
      (previous_record ->> 'company_id')::uuid
    ),
    coalesce(
      (next_record ->> 'branch_id')::uuid,
      (previous_record ->> 'branch_id')::uuid
    ),
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

drop trigger if exists audit_profiles_security_principal on public.profiles;
create trigger audit_profiles_security_principal
after insert or update on public.profiles
for each row execute function public.audit_security_principal_change();

drop trigger if exists audit_user_roles_security_principal on public.user_roles;
create trigger audit_user_roles_security_principal
after insert or update on public.user_roles
for each row execute function public.audit_security_principal_change();
