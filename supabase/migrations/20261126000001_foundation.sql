-- M1 foundation: identity, curriculum, groups, onboarding, outbox, audit.
-- Every table in `public` has RLS enabled. Writes that span tables (import,
-- code issuing) go through SECURITY DEFINER functions that check the caller.
-- Plan: docs/M0-PLAN.md §2–§3.

create schema if not exists app;

-- ───────────────────────────── enums ─────────────────────────────
create type public.user_role as enum ('teacher', 'student', 'parent');
create type public.edition as enum ('ar', 'en');
create type public.venue as enum ('online', 'offline');
create type public.gender as enum ('m', 'f');
create type public.student_status as enum ('active', 'pending', 'archived');
create type public.subject_type as enum ('student', 'parent');
create type public.domain as enum ('society', 'cipher', 'protocol', 'swatch', 'data', 'signal', 'neuron', 'programming');
create type public.join_status as enum ('pending', 'approved', 'rejected');
create type public.consent_kind as enum ('guardian_data', 'ai_tutor');
create type public.consent_method as enum ('import_attested', 'signup_checkbox', 'parent_portal');
create type public.message_status as enum ('draft', 'opened', 'sent', 'failed');

-- ─────────────────────────── helpers ─────────────────────────────
create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─────────────────────────── identity ────────────────────────────
create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null,
  locale      text not null default 'ar' check (locale in ('ar', 'en')),
  theme       text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.teacher_allowlist (
  email       text primary key check (email = lower(email)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.site_settings (
  id              boolean primary key default true check (id), -- singleton row
  teacher_name    text not null default '',
  teacher_title   text not null default '',
  bio_ar          text not null default '',
  bio_en          text not null default '',
  photo_key       text,
  years_experience int check (years_experience between 0 and 60),
  whatsapp_e164   text check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  socials         jsonb not null default '{}'::jsonb,
  ai_features     jsonb not null default '{}'::jsonb,
  consent_policy_version text not null default '2026-11-26',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ────────────────────────── curriculum ───────────────────────────
create table public.grade_levels (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,            -- 'g10', 'g11'
  number      int not null unique check (number between 1 and 12),
  title_ar    text not null,
  title_en    text not null,
  editions    public.edition[] not null,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.units (
  id              uuid primary key default gen_random_uuid(),
  grade_level_id  uuid not null references public.grade_levels (id) on delete cascade,
  code            text not null,               -- '2'
  title_ar        text,                        -- null for English-only books (Grade 10)
  title_en        text not null,
  term            int check (term in (1, 2)),  -- null = whole-year book
  domain          public.domain not null,
  position        int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (grade_level_id, code)
);

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references public.units (id) on delete cascade,
  code        text not null,                   -- '2-1'
  title_ar    text,
  title_en    text not null,
  page_en     int check (page_en > 0),
  page_ar     int check (page_ar > 0),
  domain      public.domain,                   -- override the unit's domain (rare)
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (unit_id, code)
);

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  title_ar    text,
  title_en    text not null,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.question_styles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label_ar    text,
  label_en    text not null,
  source      text not null check (source in ('g11_book', 'g11_book_2026', 'g10_book', 'house')),
  grade_codes text[] not null default '{}',
  kind        text not null default 'question' check (kind in ('question', 'content_block')),
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────── teaching ────────────────────────────
create table public.groups (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  grade_level_id  uuid not null references public.grade_levels (id),
  edition         public.edition not null,
  venue           public.venue not null,
  meet_url        text check (meet_url is null or meet_url ~ '^https://meet\.google\.com/'),
  -- Weekly slots: [{"weekday":0-6 (0=Sunday), "start":"HH:MM", "minutes":90}]
  schedule        jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array'),
  timezone        text not null default 'Africa/Cairo',
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ──────────────────────────── people ─────────────────────────────
create table public.students (
  id              uuid primary key default gen_random_uuid(),
  external_id     text unique,                 -- teacher's own studentID
  display_name    text not null check (length(trim(display_name)) > 0),
  grade_level_id  uuid not null references public.grade_levels (id),
  group_id        uuid references public.groups (id) on delete set null,
  edition         public.edition not null default 'en',
  venue           public.venue not null,
  gender          public.gender,               -- only for gendered Arabic copy
  phone_e164      text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  google_email    text unique check (google_email is null or google_email = lower(google_email)),
  status          public.student_status not null default 'active',
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.parents (
  id              uuid primary key default gen_random_uuid(),
  display_name    text,
  phone_e164      text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email           text check (email is null or email = lower(email)),
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index parents_email_key on public.parents (email) where email is not null;

create table public.guardianships (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.parents (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  relation    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (parent_id, student_id)
);

-- Maps auth users to the student/parent they act as. Several auth users may
-- map to one person (code login + Google), never one auth user to two people.
create table public.account_links (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  subject_type  public.subject_type not null,
  subject_id    uuid not null,
  method        text not null check (method in ('code', 'google')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index account_links_subject_idx on public.account_links (subject_type, subject_id);

create table public.consents (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (id) on delete cascade,
  parent_id       uuid references public.parents (id) on delete set null,
  kind            public.consent_kind not null,
  policy_version  text not null,
  method          public.consent_method not null,
  given_at        timestamptz not null default now(),
  withdrawn_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.access_codes (
  id            uuid primary key default gen_random_uuid(),
  subject_type  public.subject_type not null,
  subject_id    uuid not null,
  code_hmac     text not null unique,
  issued_at     timestamptz not null default now(),
  revoked_at    timestamptz,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index access_codes_one_active
  on public.access_codes (subject_type, subject_id) where revoked_at is null;

create table public.join_requests (
  id                uuid primary key default gen_random_uuid(),
  student_name      text not null,
  grade_level_id    uuid not null references public.grade_levels (id),
  edition           public.edition not null default 'en',
  venue             public.venue not null,
  gender            public.gender,
  student_phone     text,
  student_email     text,
  parent_phone      text not null,
  parent_email      text,
  consent_given_at  timestamptz not null,
  consent_version   text not null,
  status            public.join_status not null default 'pending',
  decided_at        timestamptz,
  student_id        uuid references public.students (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ──────────────────────── outbox & audit ─────────────────────────
-- The outbox never stores access codes in plain text.
create table public.messages (
  id                  uuid primary key default gen_random_uuid(),
  channel             text not null default 'whatsapp_link' check (channel in ('whatsapp_link', 'whatsapp_api')),
  template            text not null,
  recipient_parent_id uuid references public.parents (id) on delete set null,
  recipient_phone     text not null,
  payload             jsonb not null default '{}'::jsonb,
  status              public.message_status not null default 'draft',
  provider_ref        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor       uuid,
  action      text not null,
  entity      text not null,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (key, window_start)
);

-- updated_at triggers on every table
do $$
declare t text;
begin
  foreach t in array array['profiles','teacher_allowlist','site_settings','grade_levels','units','lessons','topics',
    'question_styles','groups','students','parents','guardianships','account_links','consents','access_codes',
    'join_requests','messages','audit_log','rate_limits']
  loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function app.touch_updated_at()', t);
  end loop;
end $$;

-- ───────────────────── identity helper functions ─────────────────
-- SECURITY DEFINER so policies can call them without recursing into RLS.
create or replace function app.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'teacher');
$$;

create or replace function app.current_student_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select l.subject_id from public.account_links l
  join public.students s on s.id = l.subject_id and s.deleted_at is null and s.status = 'active'
  where l.user_id = auth.uid() and l.subject_type = 'student';
$$;

create or replace function app.current_parent_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select l.subject_id from public.account_links l
  join public.parents p on p.id = l.subject_id and p.deleted_at is null
  where l.user_id = auth.uid() and l.subject_type = 'parent';
$$;

-- Students the caller may see: themselves, or a parent's children.
create or replace function app.my_student_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select app.current_student_id() where app.current_student_id() is not null
  union
  select g.student_id from public.guardianships g
  join public.students s on s.id = g.student_id and s.deleted_at is null
  where g.parent_id = app.current_parent_id();
$$;

revoke all on function app.is_teacher(), app.current_student_id(), app.current_parent_id(), app.my_student_ids() from public;
grant usage on schema app to authenticated, anon, service_role;
grant execute on function app.is_teacher(), app.current_student_id(), app.current_parent_id(), app.my_student_ids()
  to authenticated, service_role;
grant execute on function app.is_teacher() to anon;

-- ───────────────────────────── RLS ───────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles','teacher_allowlist','site_settings','grade_levels','units','lessons','topics',
    'question_styles','groups','students','parents','guardianships','account_links','consents','access_codes',
    'join_requests','messages','audit_log','rate_limits']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- Teacher: full access, except the audit log (append-only, read-only) and rate limits (server only).
do $$
declare t text;
begin
  foreach t in array array['profiles','teacher_allowlist','site_settings','grade_levels','units','lessons','topics',
    'question_styles','groups','students','parents','guardianships','account_links','consents','access_codes',
    'join_requests','messages']
  loop
    execute format('create policy teacher_all on public.%I for all to authenticated using (app.is_teacher()) with check (app.is_teacher())', t);
  end loop;
end $$;
create policy teacher_read on public.audit_log for select to authenticated using (app.is_teacher());

-- Public, non-personal content: the landing page shows the curriculum and the teacher bio.
create policy public_read on public.site_settings for select to anon, authenticated using (true);
create policy public_read on public.grade_levels for select to anon, authenticated using (true);
create policy public_read on public.units for select to anon, authenticated using (true);
create policy public_read on public.lessons for select to anon, authenticated using (true);
create policy public_read on public.topics for select to anon, authenticated using (true);
create policy public_read on public.question_styles for select to authenticated using (true);

-- Own profile; only locale/theme are user-editable (column grants below).
create policy own_read on public.profiles for select to authenticated using (user_id = auth.uid());
create policy own_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_read on public.account_links for select to authenticated using (user_id = auth.uid());

-- Students and parents see only their own family's rows.
create policy family_read on public.students for select to authenticated
  using (id in (select app.my_student_ids()));
create policy family_read on public.groups for select to authenticated
  using (id in (select s.group_id from public.students s where s.id in (select app.my_student_ids())));
create policy self_read on public.parents for select to authenticated
  using (id = app.current_parent_id());
create policy family_read on public.guardianships for select to authenticated
  using (parent_id = app.current_parent_id() or student_id = app.current_student_id());
create policy family_read on public.consents for select to authenticated
  using (student_id in (select app.my_student_ids()));

-- access_codes, join_requests, messages, rate_limits: no non-teacher policies
-- (only the server, using the service role, reads them).

-- Column-level privileges: the API roles cannot rewrite their own role.
revoke update on public.profiles from authenticated, anon;
grant update (locale, theme) on public.profiles to authenticated;
revoke all on public.rate_limits, public.access_codes from anon;
revoke insert, update, delete on public.audit_log from authenticated, anon;

-- ─────────────────────────── audit triggers ──────────────────────
create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id::text, old.id::text),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'code_hmac' end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'code_hmac' end
  );
  return coalesce(new, old);
end $$;

create trigger audit_access_codes after insert or update on public.access_codes
  for each row execute function app.audit_row();
create trigger audit_students after update or delete on public.students
  for each row execute function app.audit_row();
create trigger audit_teacher_allowlist after insert or delete on public.teacher_allowlist
  for each row execute function app.audit_row();

-- ─────────────────────────── rate limiting ───────────────────────
-- Returns true when the call is allowed. Server only (service role).
create or replace function app.hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c int;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into c;
  return c <= p_max;
end $$;
revoke all on function app.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function app.hit_rate_limit(text, int, int) to service_role;

-- Keeps the table small; called by the daily cron.
create or replace function app.purge_rate_limits() returns void
language sql security definer set search_path = '' as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;
revoke all on function app.purge_rate_limits() from public, anon, authenticated;
grant execute on function app.purge_rate_limits() to service_role;
