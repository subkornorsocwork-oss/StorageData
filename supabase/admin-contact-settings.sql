-- Contact information shown to students is managed from the admin profile.
alter table public.profiles
  add column if not exists contact_location text,
  add column if not exists contact_phone text,
  add column if not exists contact_hours text,
  add column if not exists contact_email text,
  add column if not exists instagram_url text;

update public.profiles
set
  contact_location = coalesce(contact_location, 'ชั้น 1 อาคาร กน.สค.'),
  contact_phone = coalesce(contact_phone, phone, '02-xxx-xxxx'),
  contact_hours = coalesce(contact_hours, 'จ-ศ 08:30 - 16:30 น.'),
  contact_email = coalesce(contact_email, 'soc@dome.tu.ac.th'),
  instagram_url = coalesce(instagram_url, 'https://www.instagram.com/swtu_studentcommittee/')
where role = 'admin';
