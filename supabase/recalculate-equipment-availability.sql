-- Recalculate the available quantity after removing test borrow records.
-- This keeps equipment details and total quantities unchanged.
-- Run once in the Supabase SQL Editor.

with borrowed as (
  select
    e.id as equipment_id,
    coalesce(sum(bi.quantity) filter (where br.status in ('approved', 'borrowing', 'overdue')), 0) as borrowed_qty
  from public.equipment e
  left join public.borrow_items bi on bi.equipment_id = e.id
  left join public.borrow_requests br on br.id = bi.borrow_request_id
  group by e.id
)
update public.equipment e
set available_qty = greatest(0, e.total_qty - borrowed.borrowed_qty)
from borrowed
where borrowed.equipment_id = e.id;
