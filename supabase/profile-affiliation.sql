-- Registration category and optional organization name.
alter table public.profiles
  add column if not exists affiliation_type text not null default 'student',
  add column if not exists organization_name text;

alter table public.profiles drop constraint if exists profiles_affiliation_type_check;
alter table public.profiles add constraint profiles_affiliation_type_check check (affiliation_type in ('student', 'organization', 'external', 'staff'));
