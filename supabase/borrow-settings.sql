-- Shared borrowing rules shown on the student borrowing page.
create table if not exists public.borrow_settings (
  id integer primary key default 1 check (id = 1),
  regulation_url text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.borrow_settings (id) values (1) on conflict (id) do nothing;
alter table public.borrow_settings enable row level security;
drop policy if exists "authenticated can read borrow settings" on public.borrow_settings;
create policy "authenticated can read borrow settings" on public.borrow_settings for select to authenticated using (true);
drop policy if exists "admins can manage borrow settings" on public.borrow_settings;
create policy "admins can manage borrow settings" on public.borrow_settings for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user());

-- Support the new borrower categories while retaining old records.
alter table public.borrow_requests drop constraint if exists borrow_requests_borrower_type_check;
alter table public.borrow_requests add constraint borrow_requests_borrower_type_check check (borrower_type in ('student', 'organization', 'internal_person', 'internal_organization', 'external'));
