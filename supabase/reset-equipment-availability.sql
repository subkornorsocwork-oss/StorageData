-- Use this before opening the system when there are no real active loans.
-- It keeps the total quantity and all equipment details unchanged.

update public.equipment
set available_qty = total_qty;
