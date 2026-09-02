create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      current_setting('app.current_user_id', true),
      ''
    ),
    ''
  )::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;

  if not exists (
    select 1
    from pg_roles
    where rolname = 'analiza_authenticated_runtime'
  ) then
    create role analiza_authenticated_runtime nologin
      nosuperuser
      nocreatedb
      nocreaterole
      nobypassrls
      inherit;
  end if;
end $$;

grant authenticated to analiza_authenticated_runtime;
grant usage on schema public to authenticated, analiza_authenticated_runtime;
grant usage on schema auth to authenticated, analiza_authenticated_runtime;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select, update on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema auth
  to authenticated, analiza_authenticated_runtime;
grant select, insert, update on table auth.users
  to analiza_authenticated_runtime;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select, update on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;

drop policy if exists "server runtime select organizations" on public.organizations;
create policy "server runtime select organizations"
on public.organizations for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select countries" on public.countries;
create policy "server runtime select countries"
on public.countries for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select companies" on public.companies;
create policy "server runtime select companies"
on public.companies for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select branches" on public.branches;
create policy "server runtime select branches"
on public.branches for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select operational areas"
on public.operational_areas;
create policy "server runtime select operational areas"
on public.operational_areas for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select roles" on public.roles;
create policy "server runtime select roles"
on public.roles for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select permissions" on public.permissions;
create policy "server runtime select permissions"
on public.permissions for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select role permissions"
on public.role_permissions;
create policy "server runtime select role permissions"
on public.role_permissions for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select role hierarchy"
on public.role_hierarchy;
create policy "server runtime select role hierarchy"
on public.role_hierarchy for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select manager assignments"
on public.manager_assignments;
create policy "server runtime select manager assignments"
on public.manager_assignments for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select area assignments"
on public.area_branch_assignments;
create policy "server runtime select area assignments"
on public.area_branch_assignments for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime select reporting lines"
on public.reporting_lines;
create policy "server runtime select reporting lines"
on public.reporting_lines for select
to analiza_authenticated_runtime
using (true);

drop policy if exists "server runtime manage profiles" on public.profiles;
create policy "server runtime manage profiles"
on public.profiles for all
to analiza_authenticated_runtime
using (true)
with check (true);

drop policy if exists "server runtime manage user roles" on public.user_roles;
create policy "server runtime manage user roles"
on public.user_roles for all
to analiza_authenticated_runtime
using (true)
with check (true);

drop policy if exists "server runtime manage country access"
on public.user_country_access;
create policy "server runtime manage country access"
on public.user_country_access for all
to analiza_authenticated_runtime
using (true)
with check (true);

drop policy if exists "server runtime manage company access"
on public.user_company_access;
create policy "server runtime manage company access"
on public.user_company_access for all
to analiza_authenticated_runtime
using (true)
with check (true);

drop policy if exists "server runtime manage branch access"
on public.user_branch_access;
create policy "server runtime manage branch access"
on public.user_branch_access for all
to analiza_authenticated_runtime
using (true)
with check (true);

drop policy if exists "server runtime manage invitations"
on public.user_invitations;
create policy "server runtime manage invitations"
on public.user_invitations for all
to analiza_authenticated_runtime
using (true)
with check (true);

drop policy if exists "server runtime manage audit logs" on public.audit_logs;
create policy "server runtime manage audit logs"
on public.audit_logs for all
to analiza_authenticated_runtime
using (true)
with check (true);
