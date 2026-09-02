alter table if exists public.user_invitations
  add column if not exists management_level text;

alter table if exists public.user_invitations
  add column if not exists base_bonus_amount numeric(12, 2);

alter table if exists public.manager_assignments
  add column if not exists management_level text;

alter table if exists public.manager_assignments
  add column if not exists base_bonus_amount numeric(12, 2);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_invitations'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'user_invitations_management_level_check'
  ) then
    alter table public.user_invitations
      add constraint user_invitations_management_level_check
      check (management_level is null or management_level in ('senior', 'middle', 'junior'));
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_invitations'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'user_invitations_base_bonus_amount_check'
  ) then
    alter table public.user_invitations
      add constraint user_invitations_base_bonus_amount_check
      check (base_bonus_amount is null or (base_bonus_amount > 0 and base_bonus_amount <= 10000));
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'manager_assignments'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'manager_assignments_management_level_check'
  ) then
    alter table public.manager_assignments
      add constraint manager_assignments_management_level_check
      check (management_level is null or management_level in ('senior', 'middle', 'junior'));
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'manager_assignments'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'manager_assignments_base_bonus_amount_check'
  ) then
    alter table public.manager_assignments
      add constraint manager_assignments_base_bonus_amount_check
      check (base_bonus_amount is null or (base_bonus_amount > 0 and base_bonus_amount <= 10000));
  end if;
end
$$;

create index if not exists user_invitations_manager_incentive_idx
  on public.user_invitations (invited_role_id, management_level)
  where management_level is not null;

create index if not exists manager_assignments_manager_incentive_idx
  on public.manager_assignments (role_id, management_level, status)
  where management_level is not null;

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
        and (
          target_hierarchy.role_key not in ('gerente_area', 'gerente_sucursal')
          or actor_hierarchy.role_key = 'gerente_operaciones'
        )
    );
$$;

comment on column public.user_invitations.management_level is
  'Nivel gerencial definido al invitar gerente de area o sucursal: senior, middle o junior.';

comment on column public.user_invitations.base_bonus_amount is
  'Bono base mensual autorizado para calcular bono recomendado como bono base por cumplimiento de meta.';

comment on column public.manager_assignments.management_level is
  'Nivel gerencial activo para el gerente asignado: senior, middle o junior.';

comment on column public.manager_assignments.base_bonus_amount is
  'Bono base mensual activo del gerente asignado; el bono recomendado se calcula con cumplimiento de meta.';
