-- Complaint read/write policies for admin and authenticated users
-- Run this only if complaint pages still fail because of RLS.

alter table public.complaints enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "authenticated can insert complaints" on public.complaints;
create policy "authenticated can insert complaints"
on public.complaints
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can read complaints" on public.complaints;
create policy "authenticated can read complaints"
on public.complaints
for select
to authenticated
using (true);

drop policy if exists "authenticated can update complaints" on public.complaints;
create policy "authenticated can update complaints"
on public.complaints
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can read profiles for complaints" on public.profiles;
create policy "authenticated can read profiles for complaints"
on public.profiles
for select
to authenticated
using (true);
