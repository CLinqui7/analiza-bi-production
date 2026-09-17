-- Keep published evidence immutable. The only deletion exception exists so the
-- production E2E can remove its isolated qa-release-* organization after a run.
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
      and coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
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
