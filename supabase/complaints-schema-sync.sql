-- Sync complaints table structure with the current application code
-- Run this in Supabase SQL Editor before testing the complaint pages again.

alter table public.complaints
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists contact_info text null,
  add column if not exists severity text not null default 'normal',
  add column if not exists status text not null default 'received',
  add column if not exists admin_response text null,
  add column if not exists handled_by uuid null,
  add column if not exists handled_at timestamptz null;

alter table public.complaints
  alter column title set not null,
  alter column detail set not null,
  alter column category set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'complaints_severity_check'
  ) then
    alter table public.complaints
      add constraint complaints_severity_check
      check (severity in ('urgent', 'normal', 'low'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'complaints_status_check'
  ) then
    alter table public.complaints
      add constraint complaints_status_check
      check (status in ('received', 'in_progress', 'resolved', 'closed'));
  end if;
end $$;

comment on column public.complaints.is_anonymous is 'Whether the complaint was submitted anonymously';
comment on column public.complaints.contact_info is 'Optional callback contact for non-anonymous complaints';
comment on column public.complaints.severity is 'Complaint urgency level: urgent, normal, low';
comment on column public.complaints.status is 'Complaint workflow status';
comment on column public.complaints.admin_response is 'Latest admin response or handling note';
comment on column public.complaints.handled_by is 'Admin user id who last handled the complaint';
comment on column public.complaints.handled_at is 'Timestamp of the latest admin handling action';
