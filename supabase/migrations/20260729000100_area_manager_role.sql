insert into public.roles (id, key, name, description)
values
  (
    '60000000-0000-4000-8000-000000000005',
    'gerente_area',
    'Gerente de area',
    'Supervisa un grupo de sucursales asignadas y valida disciplina de carga.'
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('context.read', 'dashboards.read', 'imports.manage')
where r.key = 'gerente_area'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'imports.manage'
where r.key = 'gerente_sucursal'
on conflict do nothing;

create or replace function public.current_user_can_access_country(target_country_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_country_access uca
      where uca.user_id = auth.uid()
        and uca.country_id = target_country_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.country_id = target_country_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.countries c on c.organization_id = ur.organization_id
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and c.id = target_country_id
        and r.key in ('ceo', 'gerente_operaciones', 'gerente_area')
        and (ur.country_id is null or ur.country_id = target_country_id)
    );
$$;

create or replace function public.current_user_can_access_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_company_access uca
      where uca.user_id = auth.uid()
        and uca.company_id = target_company_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.company_id = target_company_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.key in ('ceo', 'gerente_operaciones', 'gerente_area')
        and (ur.company_id is null or ur.company_id = target_company_id)
    );
$$;

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
      from public.branches b
      where b.id = target_branch_id
        and (
          public.current_user_can_access_country(b.country_id)
          or public.current_user_can_access_company(b.company_id)
        )
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.key in ('ceo', 'gerente_operaciones', 'gerente_area', 'gerente_sucursal')
        and (ur.branch_id is null or ur.branch_id = target_branch_id)
    );
$$;
