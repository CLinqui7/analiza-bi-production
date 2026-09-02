alter table public.profiles
  add column if not exists preferred_name text,
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists photo_url text;

create index if not exists profiles_preferred_name_idx
  on public.profiles (preferred_name)
  where preferred_name is not null;
