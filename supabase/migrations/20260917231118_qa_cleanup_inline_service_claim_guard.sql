create or replace function private.protect_published_manual_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'published' then
    if not (
      tg_op = 'DELETE'
      and coalesce(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
        ''
      ) = 'service_role'
      and exists (
        select 1
        from public.manual_monthly_submissions submission
        join public.organizations organization on organization.id = submission.organization_id
        where submission.id = old.submission_id
          and organization.slug like 'qa-release-%'
      )
    ) then
      raise exception 'PUBLISHED_SUBMISSION_VERSION_IMMUTABLE' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.protect_published_manual_attachment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_version_id uuid := case
    when tg_op = 'DELETE' then old.submission_version_id
    else new.submission_version_id
  end;
begin
  if exists (
    select 1
    from public.manual_monthly_submission_versions version
    where version.id = target_version_id
      and version.status = 'published'
  ) then
    if not (
      tg_op = 'DELETE'
      and coalesce(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
        ''
      ) = 'service_role'
      and exists (
        select 1
        from public.manual_monthly_submission_versions version
        join public.manual_monthly_submissions submission
          on submission.id = version.submission_id
        join public.organizations organization
          on organization.id = submission.organization_id
        where version.id = target_version_id
          and organization.slug like 'qa-release-%'
      )
    ) then
      raise exception 'PUBLISHED_SUBMISSION_EVIDENCE_IMMUTABLE'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop function if exists private.current_request_is_service_role();
