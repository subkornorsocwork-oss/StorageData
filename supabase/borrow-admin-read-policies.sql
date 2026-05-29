-- Borrow admin read policies
-- Run this in the Supabase SQL editor if the admin page still cannot
-- read related profile / borrow item / equipment rows due to RLS.

alter table public.borrow_requests enable row level security;
alter table public.borrow_items enable row level security;
alter table public.equipment enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "authenticated can read borrow_requests" on public.borrow_requests;
create policy "authenticated can read borrow_requests"
on public.borrow_requests
for select
to authenticated
using (true);

drop policy if exists "authenticated can read borrow_items" on public.borrow_items;
create policy "authenticated can read borrow_items"
on public.borrow_items
for select
to authenticated
using (true);

drop policy if exists "authenticated can read equipment" on public.equipment;
create policy "authenticated can read equipment"
on public.equipment
for select
to authenticated
using (true);

drop policy if exists "authenticated can read profiles basic fields" on public.profiles;
create policy "authenticated can read profiles basic fields"
on public.profiles
for select
to authenticated
using (true);

-- Safer follow-up option:
-- Replace `using (true)` with an admin-only rule if your `profiles` table
-- stores a `role` column and you want to restrict these reads further.
