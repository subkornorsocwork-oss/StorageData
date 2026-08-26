-- Add the optional return evidence used by the borrow workflow.
alter table public.borrow_requests
  add column if not exists return_proof_url text null;

comment on column public.borrow_requests.return_proof_url is 'Optional image uploaded when equipment is returned';
