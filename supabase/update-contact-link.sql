-- Set the public contact link for the admin contact card.
-- Run once in the Supabase SQL Editor.

update public.profiles
set instagram_url = 'https://linkbio.co/8082009ugIpAI'
where role = 'admin';
