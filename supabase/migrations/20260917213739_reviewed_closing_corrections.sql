-- Reviewed publication and narrowly scoped correction authorization.
-- Additive only: published closings, evidence and audit history are preserved.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.monthly_closing_correction_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  operational_area_id uuid references public.operational_areas(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line_id uuid not null references public.business_lines(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  submission_id uuid not null references public.manual_monthly_submissions(id) on delete restrict,
  base_submission_version_id uuid not null references public.manual_monthly_submission_versions(id) on delete restrict,
  base_closing_version_id uuid not null references public.closing_versions(id) on delete restrict,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  responsible_profile_id uuid not null references public.profiles(id) on delete restrict,
  approver_profile_id uuid not null references public.profiles(id) on delete restrict,
  request_reason text not null check (char_length(trim(request_reason)) between 10 and 1000),
  decision_reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'revoked', 'completed')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete restrict,
  completed_at timestamptz,
  completed_by_closing_version_id uuid references public.closing_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (requester_id = responsible_profile_id),
  check (approver_profile_id <> requester_id),
  check (
    (status = 'pending' and decided_at is null and decided_by is null)
    or (status in ('approved', 'rejected', 'revoked', 'completed') and decided_at is not null and decided_by is not null)
  )
);

create unique index if not exists monthly_correction_one_open_request_idx
  on public.monthly_closing_correction_requests (submission_id)
  where status in ('pending', 'approved');

create index if not exists monthly_correction_approver_queue_idx
  on public.monthly_closing_correction_requests (approver_profile_id, status, requested_at desc);

create table if not exists public.monthly_submission_publication_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  submission_id uuid not null references public.manual_monthly_submissions(id) on delete restrict,
  submission_version_id uuid not null references public.manual_monthly_submission_versions(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  confirmation_text text not null check (
    confirmation_text = 'He revisado la información y confirmo su publicación'
  ),
  content_digest text not null check (content_digest ~ '^[a-f0-9]{64}$'),
  summary jsonb not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'consumed', 'invalidated')),
  confirmed_at timestamptz not null default now(),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (submission_version_id, content_digest, reviewer_id)
);

alter table public.manual_monthly_submission_versions
  add column if not exists correction_request_id uuid
    references public.monthly_closing_correction_requests(id) on delete restrict,
  add column if not exists base_submission_version_id uuid
    references public.manual_monthly_submission_versions(id) on delete restrict;

create index if not exists manual_monthly_versions_correction_idx
  on public.manual_monthly_submission_versions (correction_request_id, submission_id, version_number);

alter table public.monthly_closing_correction_requests enable row level security;
alter table public.monthly_submission_publication_reviews enable row level security;

drop policy if exists "read scoped monthly correction requests" on public.monthly_closing_correction_requests;
create policy "read scoped monthly correction requests"
on public.monthly_closing_correction_requests for select to authenticated
using (
  requester_id = (select auth.uid())
  or approver_profile_id = (select auth.uid())
  or (
    public.current_user_can_access_branch(branch_id)
    and public.current_user_has_role(array['super_admin', 'webmaster_admin'])
  )
);

drop policy if exists "read own publication reviews" on public.monthly_submission_publication_reviews;
create policy "read own publication reviews"
on public.monthly_submission_publication_reviews for select to authenticated
using (reviewer_id = (select auth.uid()));

grant select on public.monthly_closing_correction_requests to authenticated;
grant select on public.monthly_submission_publication_reviews to authenticated;
revoke insert, update, delete on public.monthly_closing_correction_requests from anon, authenticated;
revoke insert, update, delete on public.monthly_submission_publication_reviews from anon, authenticated;

create or replace function private.protect_published_manual_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'published' then
    if not (
      tg_op = 'DELETE'
      and coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
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

drop trigger if exists protect_published_manual_version on public.manual_monthly_submission_versions;
create trigger protect_published_manual_version
before update or delete on public.manual_monthly_submission_versions
for each row execute function private.protect_published_manual_version();

create or replace function private.protect_published_manual_attachment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_version_id uuid := case when tg_op = 'DELETE' then old.submission_version_id else new.submission_version_id end;
begin
  if exists (
    select 1 from public.manual_monthly_submission_versions version
    where version.id = target_version_id and version.status = 'published'
  ) then
    if not (
      tg_op = 'DELETE'
      and coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      and exists (
        select 1
        from public.manual_monthly_submissions submission
        join public.organizations organization on organization.id = submission.organization_id
        where submission.id = old.submission_id
          and organization.slug like 'qa-release-%'
      )
    ) then
      raise exception 'PUBLISHED_SUBMISSION_EVIDENCE_IMMUTABLE' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_published_manual_attachment on public.manual_monthly_submission_attachments;
create trigger protect_published_manual_attachment
before insert or update or delete on public.manual_monthly_submission_attachments
for each row execute function private.protect_published_manual_attachment();

create or replace function private.monthly_evidence_object_is_editable(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select not exists (
    select 1
    from public.manual_monthly_submission_attachments attachment
    join public.manual_monthly_submission_versions version
      on version.id = attachment.submission_version_id
    where attachment.storage_bucket = 'monthly-evidence'
      and attachment.storage_path = object_name
      and version.status = 'published'
  );
$$;

revoke all on function private.monthly_evidence_object_is_editable(text) from public, anon;
grant execute on function private.monthly_evidence_object_is_editable(text) to authenticated, service_role;

drop policy if exists "published monthly evidence cannot be updated" on storage.objects;
create policy "published monthly evidence cannot be updated"
on storage.objects as restrictive for update to authenticated
using (bucket_id <> 'monthly-evidence' or private.monthly_evidence_object_is_editable(name))
with check (bucket_id <> 'monthly-evidence' or private.monthly_evidence_object_is_editable(name));

drop policy if exists "published monthly evidence cannot be deleted" on storage.objects;
create policy "published monthly evidence cannot be deleted"
on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'monthly-evidence' or private.monthly_evidence_object_is_editable(name));

create or replace function private.require_manual_correction_authorization()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  correction public.monthly_closing_correction_requests%rowtype;
  has_published_history boolean;
begin
  select exists (
    select 1
    from public.manual_monthly_submission_versions version
    where version.submission_id = new.submission_id
      and version.status = 'published'
  ) into has_published_history;

  if not has_published_history then
    if new.correction_request_id is not null or new.base_submission_version_id is not null then
      raise exception 'INITIAL_VERSION_CANNOT_USE_CORRECTION_AUTHORIZATION' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.correction_request_id is null or new.base_submission_version_id is null then
    raise exception 'APPROVED_CORRECTION_REQUIRED' using errcode = '23514';
  end if;

  select * into correction
  from public.monthly_closing_correction_requests request
  where request.id = new.correction_request_id
  for update;

  if not found
    or correction.status <> 'approved'
    or correction.submission_id <> new.submission_id
    or correction.base_submission_version_id <> new.base_submission_version_id
    or correction.responsible_profile_id <> new.submitted_by
    or correction.approver_profile_id = new.submitted_by
    or correction.organization_id <> (
      select submission.organization_id
      from public.manual_monthly_submissions submission
      where submission.id = new.submission_id
    )
    or correction.country_id <> (
      select submission.country_id
      from public.manual_monthly_submissions submission
      where submission.id = new.submission_id
    )
    or correction.company_id <> (
      select submission.company_id
      from public.manual_monthly_submissions submission
      where submission.id = new.submission_id
    )
    or correction.branch_id <> (
      select submission.branch_id
      from public.manual_monthly_submissions submission
      where submission.id = new.submission_id
    )
    or correction.business_line_id <> (
      select submission.business_line_id
      from public.manual_monthly_submissions submission
      where submission.id = new.submission_id
    )
    or correction.period_start <> (
      select submission.period_start
      from public.manual_monthly_submissions submission
      where submission.id = new.submission_id
    )
    or correction.period_end <> (
      select submission.period_end
      from public.manual_monthly_submissions submission
      where submission.id = new.submission_id
    )
    or not exists (
      select 1 from public.closing_versions closing
      where closing.id = correction.base_closing_version_id
        and lower(closing.status) = 'published'
    )
  then
    raise exception 'INVALID_OR_STALE_CORRECTION_AUTHORIZATION' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists require_manual_correction_authorization on public.manual_monthly_submission_versions;
create trigger require_manual_correction_authorization
before insert on public.manual_monthly_submission_versions
for each row execute function private.require_manual_correction_authorization();

create or replace function public.finalize_reviewed_manual_closing_publication(
  p_closing_id uuid,
  p_review_id uuid,
  p_correction_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_closing public.closing_versions%rowtype;
  target_version public.manual_monthly_submission_versions%rowtype;
  target_review public.monthly_submission_publication_reviews%rowtype;
  correction public.monthly_closing_correction_requests%rowtype;
begin
  select * into target_closing
  from public.closing_versions
  where id = p_closing_id
  for update;
  if not found or lower(target_closing.status) <> 'validated' then
    raise exception 'CLOSING_NOT_VALIDATED' using errcode = '23514';
  end if;

  select * into target_version
  from public.manual_monthly_submission_versions
  where id = target_closing.manual_submission_version_id
  for update;
  if not found or target_version.status = 'published' then
    raise exception 'SUBMISSION_VERSION_NOT_PUBLISHABLE' using errcode = '23514';
  end if;

  select * into target_review
  from public.monthly_submission_publication_reviews
  where id = p_review_id
  for update;
  if not found
    or target_review.status <> 'confirmed'
    or target_review.submission_version_id <> target_version.id
    or target_review.reviewer_id <> target_version.submitted_by
  then
    raise exception 'CURRENT_PUBLICATION_REVIEW_REQUIRED' using errcode = '23514';
  end if;

  if p_correction_request_id is null then
    if target_version.correction_request_id is not null or exists (
      select 1 from public.closing_versions existing
      where existing.organization_id = target_closing.organization_id
        and existing.branch_id = target_closing.branch_id
        and existing.business_line_id = target_closing.business_line_id
        and existing.period_start = target_closing.period_start
        and existing.period_end = target_closing.period_end
        and lower(existing.status) = 'published'
        and existing.id <> target_closing.id
    ) then
      raise exception 'CORRECTION_AUTHORIZATION_REQUIRED' using errcode = '23514';
    end if;
  else
    select * into correction
    from public.monthly_closing_correction_requests
    where id = p_correction_request_id
    for update;
    if not found
      or correction.status <> 'approved'
      or target_version.correction_request_id <> correction.id
      or correction.base_submission_version_id <> target_version.base_submission_version_id
      or correction.responsible_profile_id <> target_version.submitted_by
      or correction.organization_id <> target_closing.organization_id
      or correction.country_id <> target_closing.country_id
      or correction.company_id <> target_closing.company_id
      or correction.branch_id <> target_closing.branch_id
      or correction.business_line_id <> target_closing.business_line_id
      or correction.period_start <> target_closing.period_start
      or correction.period_end <> target_closing.period_end
      or not exists (
        select 1 from public.closing_versions base
        where base.id = correction.base_closing_version_id
          and lower(base.status) = 'published'
      )
    then
      raise exception 'INVALID_OR_STALE_CORRECTION_AUTHORIZATION' using errcode = '23514';
    end if;
  end if;

  perform public.finalize_manual_closing_publication(p_closing_id);

  update public.monthly_submission_publication_reviews
  set status = 'consumed', consumed_at = now()
  where id = target_review.id and status = 'confirmed';
  if not found then
    raise exception 'PUBLICATION_REVIEW_ALREADY_CONSUMED' using errcode = '23514';
  end if;

  if p_correction_request_id is not null then
    update public.monthly_closing_correction_requests
    set status = 'completed', completed_at = now(), completed_by_closing_version_id = p_closing_id, updated_at = now()
    where id = p_correction_request_id and status = 'approved';
    if not found then
      raise exception 'CORRECTION_AUTHORIZATION_ALREADY_CONSUMED' using errcode = '23514';
    end if;
  end if;
end;
$$;

revoke all on function public.finalize_reviewed_manual_closing_publication(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.finalize_reviewed_manual_closing_publication(uuid, uuid, uuid) to service_role;

comment on table public.monthly_closing_correction_requests is
  'One-use authorization to create and publish a correction from one exact official closing version.';
comment on table public.monthly_submission_publication_reviews is
  'Explicit reviewer confirmation bound to an immutable digest of one saved version and its registered evidence.';
