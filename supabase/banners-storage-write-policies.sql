-- Banner table and storage write policies
-- Run this if banner upload still fails with row-level security errors.

alter table public.banners enable row level security;

drop policy if exists "authenticated can read banners table" on public.banners;
create policy "authenticated can read banners table"
on public.banners
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert banners table" on public.banners;
create policy "authenticated can insert banners table"
on public.banners
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update banners table" on public.banners;
create policy "authenticated can update banners table"
on public.banners
for update
to authenticated
using (true)
with check (true);

-- Storage policies for bucket: banners
drop policy if exists "authenticated can read banner files" on storage.objects;
create policy "authenticated can read banner files"
on storage.objects
for select
to authenticated
using (bucket_id = 'banners');

drop policy if exists "authenticated can upload banner files" on storage.objects;
create policy "authenticated can upload banner files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'banners');

drop policy if exists "authenticated can update banner files" on storage.objects;
create policy "authenticated can update banner files"
on storage.objects
for update
to authenticated
using (bucket_id = 'banners')
with check (bucket_id = 'banners');
