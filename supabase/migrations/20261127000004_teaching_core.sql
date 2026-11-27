-- M2 teaching core: class sessions, attendance, announcements, materials.
-- Every table has RLS enabled and forced. Visibility rules that need to look at other
-- rows (material group visibility) live in SECURITY DEFINER functions so a student's own
-- RLS can never make "no rows" look like "visible to everyone".

create type public.attendance_status as enum ('present', 'late', 'absent');
create type public.attendance_method as enum ('tap', 'qr', 'code', 'override');
create type public.announcement_audience as enum ('group', 'grade', 'all_students', 'all_parents');
create type public.material_kind as enum ('pdf', 'image', 'video_link', 'link', 'note');

-- ─────────────── helpers: the groups and grades the caller belongs to ───────────────
create or replace function app.my_group_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select s.group_id from public.students s
  where s.id in (select app.my_student_ids()) and s.group_id is not null;
$$;

create or replace function app.my_grade_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select s.grade_level_id from public.students s where s.id in (select app.my_student_ids());
$$;

revoke all on function app.my_group_ids(), app.my_grade_ids() from public;
grant execute on function app.my_group_ids(), app.my_grade_ids() to authenticated, service_role;

-- ───────────────────────────── tables ─────────────────────────────
create table public.class_sessions (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references public.groups (id) on delete cascade,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null check (ends_at > starts_at),
  lesson_id           uuid references public.lessons (id) on delete set null,
  checkin_code        text check (checkin_code ~ '^[0-9]{4}$'),
  checkin_expires_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (group_id, starts_at)
);

create table public.attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.class_sessions (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  status      public.attendance_status not null,
  method      public.attendance_method not null,
  marked_by   uuid references auth.users (id) on delete set null,
  marked_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (session_id, student_id)
);
create index attendance_student_idx on public.attendance (student_id);

create table public.announcements (
  id              uuid primary key default gen_random_uuid(),
  audience        public.announcement_audience not null,
  group_id        uuid references public.groups (id) on delete cascade,
  grade_level_id  uuid references public.grade_levels (id) on delete cascade,
  title           text not null check (length(trim(title)) > 0),
  body            text not null check (length(trim(body)) > 0),
  publish_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((audience = 'group') = (group_id is not null)),
  check ((audience = 'grade') = (grade_level_id is not null))
);

create table public.materials (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (length(trim(title)) > 0),
  kind            public.material_kind not null,
  storage_key     text,
  url             text check (url is null or url ~ '^https://'),
  body            text,
  grade_level_id  uuid not null references public.grade_levels (id) on delete cascade,
  lesson_id       uuid references public.lessons (id) on delete set null,
  edition         public.edition,                 -- null = both editions
  release_at      timestamptz,                    -- null = visible now
  watermark       boolean not null default false,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (
    (kind in ('pdf', 'image') and storage_key is not null) or
    (kind in ('video_link', 'link') and url is not null) or
    (kind = 'note' and body is not null)
  )
);

-- Empty = visible to every group of the grade; rows = only those groups.
create table public.material_groups (
  material_id uuid not null references public.materials (id) on delete cascade,
  group_id    uuid not null references public.groups (id) on delete cascade,
  primary key (material_id, group_id)
);

do $$
declare t text;
begin
  foreach t in array array['class_sessions', 'attendance', 'announcements', 'materials'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function app.touch_updated_at()', t);
  end loop;
  foreach t in array array['class_sessions', 'attendance', 'announcements', 'materials', 'material_groups'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy teacher_all on public.%I for all to authenticated using (app.is_teacher()) with check (app.is_teacher())', t);
  end loop;
end $$;

-- ──────────────────────── who may see a material ────────────────────────
create or replace function app.material_visible(p_material uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.materials m
    join public.students s on s.id = app.current_student_id()
    where m.id = p_material
      and (m.release_at is null or m.release_at <= now())
      and m.grade_level_id = s.grade_level_id
      and (m.edition is null or m.edition = s.edition)
      and (
        not exists (select 1 from public.material_groups g where g.material_id = m.id)
        or exists (select 1 from public.material_groups g where g.material_id = m.id and g.group_id = s.group_id)
      )
  );
$$;
revoke all on function app.material_visible(uuid) from public, anon;
grant execute on function app.material_visible(uuid) to authenticated, service_role;

-- ───────────────────────────── policies ─────────────────────────────
create policy member_read on public.class_sessions for select to authenticated
  using (group_id in (select app.my_group_ids()));

create policy family_read on public.attendance for select to authenticated
  using (student_id in (select app.my_student_ids()));

create policy member_read on public.announcements for select to authenticated
  using (
    publish_at <= now() and (
      (audience = 'all_students' and app.current_student_id() is not null) or
      (audience = 'all_parents' and app.current_parent_id() is not null) or
      (audience = 'group' and group_id in (select app.my_group_ids())) or
      (audience = 'grade' and grade_level_id in (select app.my_grade_ids()))
    )
  );

create policy student_read on public.materials for select to authenticated
  using (app.material_visible(id));
-- material_groups: teacher only (students never need to read it; visibility is decided by the function).

-- ───────────────────────── student check-in ─────────────────────────
-- A student enters the 4-digit code the teacher is showing (or scans the QR that carries it).
-- Valid only for a session of the student's own group, while the code is unexpired and the
-- session is about to start / running. A mark the teacher already made is never overwritten.
create or replace function app.check_in(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := app.current_student_id();
  s public.class_sessions;
  v_status public.attendance_status;
begin
  if v_student is null then
    raise exception 'only students can check in' using errcode = '42501';
  end if;

  select cs.* into s
  from public.class_sessions cs
  join public.students st on st.id = v_student and st.group_id = cs.group_id
  where cs.checkin_code = p_code
    and cs.checkin_expires_at > now()
    and now() between cs.starts_at - interval '30 minutes' and cs.ends_at + interval '30 minutes'
  order by cs.starts_at
  limit 1;

  if not found then
    raise exception 'invalid or expired code' using errcode = '22023';
  end if;

  v_status := case when now() > s.starts_at + interval '15 minutes' then 'late' else 'present' end;
  insert into public.attendance (session_id, student_id, status, method, marked_by)
  values (s.id, v_student, v_status, 'code', auth.uid())
  on conflict (session_id, student_id) do nothing;
  return s.id;
end $$;
revoke all on function app.check_in(text) from public, anon;
grant execute on function app.check_in(text) to authenticated;

create or replace function public.check_in(p_code text) returns uuid
language sql security invoker set search_path = '' as $$ select app.check_in(p_code) $$;
revoke all on function public.check_in(text) from public, anon;
grant execute on function public.check_in(text) to authenticated;

-- Private bucket for uploaded files. The server (service role) issues short-lived signed URLs
-- after checking access through the RLS-protected `materials` table. Skipped where Storage is absent (tests).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('materials', 'materials', false) on conflict (id) do nothing;
  end if;
end $$;
