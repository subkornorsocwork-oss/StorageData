-- Run once in Supabase SQL Editor for the borrow workflow.
-- Keep the bucket private if possible and use signed URLs in production.

alter table public.borrow_items enable row level security;
alter table public.borrow_requests enable row level security;

drop policy if exists "users can submit borrow return proof" on public.borrow_requests;
create policy "users can submit borrow return proof"
on public.borrow_requests
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "authenticated can insert own borrow items" on public.borrow_items;
create policy "authenticated can insert own borrow items"
on public.borrow_items
for insert
to authenticated
with check (
  exists (
    select 1 from public.borrow_requests r
    where r.id = borrow_request_id and r.user_id = auth.uid()
  )
);

drop policy if exists "authenticated can read borrow documents" on storage.objects;
create policy "authenticated can read borrow documents"
on storage.objects
for select
to authenticated
using (bucket_id = 'documents');

drop policy if exists "authenticated can upload borrow documents" on storage.objects;
create policy "authenticated can upload borrow documents"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'documents');
