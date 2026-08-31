-- Let a signed-in user delete only their own lost-and-found posts.
alter table public.lost_and_found enable row level security;
drop policy if exists "users can delete own lost and found" on public.lost_and_found;
create policy "users can delete own lost and found"
on public.lost_and_found for delete to authenticated
using (auth.uid() = user_id);
