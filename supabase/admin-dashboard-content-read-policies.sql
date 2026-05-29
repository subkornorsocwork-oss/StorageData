-- Admin dashboard / content read policies
-- Run this in Supabase SQL Editor if admin dashboard, lost and found,
-- or announcements still show empty data because of RLS.

alter table public.bookings enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.lost_and_found enable row level security;
alter table public.announcements enable row level security;
alter table public.banners enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "authenticated can read bookings" on public.bookings;
create policy "authenticated can read bookings"
on public.bookings
for select
to authenticated
using (true);

drop policy if exists "authenticated can read borrow_requests dashboard" on public.borrow_requests;
create policy "authenticated can read borrow_requests dashboard"
on public.borrow_requests
for select
to authenticated
using (true);

drop policy if exists "authenticated can read lost_and_found" on public.lost_and_found;
create policy "authenticated can read lost_and_found"
on public.lost_and_found
for select
to authenticated
using (true);

drop policy if exists "authenticated can read announcements" on public.announcements;
create policy "authenticated can read announcements"
on public.announcements
for select
to authenticated
using (true);

drop policy if exists "authenticated can read banners" on public.banners;
create policy "authenticated can read banners"
on public.banners
for select
to authenticated
using (true);

drop policy if exists "authenticated can read profiles for admin pages" on public.profiles;
create policy "authenticated can read profiles for admin pages"
on public.profiles
for select
to authenticated
using (true);
