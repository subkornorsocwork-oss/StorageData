-- Clear test/operational records before opening the system for real users.
-- This intentionally keeps equipment, locations, borrow organizations,
-- borrow settings, profiles, announcements, events, and banners.
-- Run this script once in the Supabase SQL Editor.

begin;

-- Child rows must be removed before their borrow requests.
delete from public.borrow_items;
delete from public.borrow_requests;

-- Remove all test booking history and related user-submitted records.
delete from public.bookings;
delete from public.lost_and_found;
delete from public.complaints;

-- Remove restrictions/ban history without affecting user accounts.
delete from public.borrow_restrictions;
delete from public.user_service_restrictions;

-- The dashboard's recent activity is derived from these records.
delete from public.activity_logs;

-- The system is empty after the cleanup, so every catalog item is available.
update public.equipment
set available_qty = total_qty;

commit;
