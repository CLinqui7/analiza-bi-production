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
          or (
            target_hierarchy.role_key = 'gerente_area'
            and actor_hierarchy.role_key = 'gerente_operaciones'
          )
          or (
            target_hierarchy.role_key = 'gerente_sucursal'
            and actor_hierarchy.role_key in ('gerente_operaciones', 'gerente_area')
          )
        )
    );
$$;

comment on function public.current_user_can_delegate_role(uuid) is
  'Permite a operaciones crear gerentes de area y sucursal; permite a gerente de area crear gerentes de sucursal dentro de su alcance delegado.';
