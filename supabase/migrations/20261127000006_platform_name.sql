-- The platform is run by two partner teachers, so its name is no longer one teacher's title.
-- Empty = fall back to the old teacher_title, then to the default site title.
alter table public.site_settings
  add column if not exists platform_name_ar text not null default '',
  add column if not exists platform_name_en text not null default '';
