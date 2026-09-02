insert into public.role_hierarchy (role_id, role_key, hierarchy_level, can_invite)
select r.id, r.key, 90, true
from public.roles r
where r.key = 'ceo'
on conflict (role_id) do update set
  role_key = excluded.role_key,
  hierarchy_level = excluded.hierarchy_level,
  can_invite = excluded.can_invite,
  updated_at = now();
