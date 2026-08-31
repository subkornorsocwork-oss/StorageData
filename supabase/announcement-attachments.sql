-- Add an optional PDF attachment URL to announcements and activities.
alter table public.announcements
  add column if not exists attachment_url text,
  add column if not exists link_url text;

comment on column public.announcements.attachment_url is 'Public URL of an optional announcement PDF stored in Supabase Storage';
