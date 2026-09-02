insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'branches.manage'
where r.key = 'ceo'
on conflict do nothing;

drop policy if exists "delegated managers manage branches" on public.branches;

create policy "delegated managers manage branches" on public.branches
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['ceo', 'gerente_operaciones'])
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
    public.current_user_has_role(array['ceo', 'gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      id
    )
  )
);
