-- Run once in Supabase SQL Editor for the borrow workflow.
-- Keep the bucket private if possible and use signed URLs in production.

alter table public.borrow_items enable row level security;
alter table public.borrow_requests enable row level security;

-- Keep the return flow compatible with databases created before return proof
-- was added to the application.
alter table public.borrow_requests
  add column if not exists return_proof_url text null;

-- The item INSERT policy checks its parent request with EXISTS. PostgreSQL
-- applies RLS inside that subquery too, so the owner must be able to read
-- their own request for the check to evaluate to true.
drop policy if exists "users can read own borrow requests" on public.borrow_requests;
create policy "users can read own borrow requests"
on public.borrow_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can read own borrow items" on public.borrow_items;
create policy "users can read own borrow items"
on public.borrow_items
for select
to authenticated
using (
  exists (
    select 1 from public.borrow_requests r
    where r.id = borrow_items.borrow_request_id
      and r.user_id = auth.uid()
  )
);

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
    where r.id = borrow_items.borrow_request_id
      and r.user_id = auth.uid()
  )
);

-- A request and its item rows are inserted by the same signed-in user.
-- Keep this policy explicit because Supabase does not infer it from the
-- foreign key relationship.
drop policy if exists "authenticated can insert own borrow request" on public.borrow_requests;
create policy "authenticated can insert own borrow request"
on public.borrow_requests
for insert
to authenticated
with check (user_id = auth.uid());

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
