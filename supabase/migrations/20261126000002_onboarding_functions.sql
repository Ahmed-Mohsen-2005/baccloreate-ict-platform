-- Onboarding functions (M1 slices 6–9). Each one runs in a single transaction and
-- checks the caller itself, so the app can call them with the teacher's own session.

-- Bulk import: rows already validated and normalised by lib/import (the server
-- re-validates before calling). Upserts students by external_id, parents by phone,
-- links guardianships (siblings share a parent), and records attested consent.
create or replace function app.import_students(p_rows jsonb, p_attested boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  v_grade uuid;
  v_student uuid;
  v_parent uuid;
  v_existing boolean;
  v_version text;
  created int := 0;
  updated int := 0;
  parents_created int := 0;
begin
  if not app.is_teacher() then
    raise exception 'only the teacher can import students' using errcode = '42501';
  end if;
  if not p_attested then
    raise exception 'guardian consent must be attested before import' using errcode = '22023';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'no rows to import' using errcode = '22023';
  end if;

  select consent_policy_version into v_version from public.site_settings where id;

  for r in select * from jsonb_array_elements(p_rows) loop
    select id into v_grade from public.grade_levels where code = r->>'grade_code';
    if v_grade is null then
      raise exception 'unknown grade % for student %', r->>'grade_code', r->>'external_id' using errcode = '22023';
    end if;

    select exists (select 1 from public.students where external_id = r->>'external_id') into v_existing;

    insert into public.students as s (external_id, display_name, grade_level_id, group_id, edition, venue, gender, phone_e164, google_email)
    values (
      r->>'external_id', r->>'display_name', v_grade, nullif(r->>'group_id', '')::uuid,
      (r->>'edition')::public.edition, (r->>'venue')::public.venue, nullif(r->>'gender', '')::public.gender,
      nullif(r->>'phone_e164', ''), nullif(r->>'google_email', '')
    )
    on conflict (external_id) do update set
      display_name   = excluded.display_name,
      grade_level_id = excluded.grade_level_id,
      group_id       = coalesce(excluded.group_id, s.group_id),
      edition        = excluded.edition,
      venue          = excluded.venue,
      gender         = excluded.gender,
      phone_e164     = excluded.phone_e164,
      google_email   = excluded.google_email,
      deleted_at     = null
    returning id into v_student;

    if v_existing then updated := updated + 1; else created := created + 1; end if;

    insert into public.parents as p (phone_e164, email)
    values (r->>'parent_phone_e164', nullif(r->>'parent_email', ''))
    on conflict (phone_e164) do update set email = coalesce(p.email, excluded.email), deleted_at = null
    returning id, (xmax = 0) into v_parent, v_existing;
    if v_existing then parents_created := parents_created + 1; end if;

    insert into public.guardianships (parent_id, student_id) values (v_parent, v_student)
    on conflict (parent_id, student_id) do nothing;

    if not exists (
      select 1 from public.consents
      where student_id = v_student and kind = 'guardian_data' and withdrawn_at is null
    ) then
      insert into public.consents (student_id, parent_id, kind, policy_version, method)
      values (v_student, v_parent, 'guardian_data', v_version, 'import_attested');
    end if;
  end loop;

  return jsonb_build_object('created', created, 'updated', updated, 'parents_created', parents_created);
end $$;

revoke all on function app.import_students(jsonb, boolean) from public, anon;
grant execute on function app.import_students(jsonb, boolean) to authenticated;

-- Issues a new access code (HMAC computed by the server) and revokes the old one.
create or replace function app.issue_access_code(p_subject_type public.subject_type, p_subject_id uuid, p_code_hmac text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_teacher() then
    raise exception 'only the teacher can issue codes' using errcode = '42501';
  end if;
  if p_subject_type = 'student' and not exists (select 1 from public.students where id = p_subject_id and deleted_at is null) then
    raise exception 'student not found' using errcode = '22023';
  end if;
  if p_subject_type = 'parent' and not exists (select 1 from public.parents where id = p_subject_id and deleted_at is null) then
    raise exception 'parent not found' using errcode = '22023';
  end if;

  update public.access_codes set revoked_at = now()
  where subject_type = p_subject_type and subject_id = p_subject_id and revoked_at is null;

  insert into public.access_codes (subject_type, subject_id, code_hmac) values (p_subject_type, p_subject_id, p_code_hmac);
end $$;

revoke all on function app.issue_access_code(public.subject_type, uuid, text) from public, anon;
grant execute on function app.issue_access_code(public.subject_type, uuid, text) to authenticated;

-- Approves a join request: creates the student, parent, guardianship and the
-- consent captured by the sign-up checkbox (with its original timestamp).
create or replace function app.approve_join_request(p_request_id uuid, p_group_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  j public.join_requests;
  v_student uuid;
  v_parent uuid;
begin
  if not app.is_teacher() then
    raise exception 'only the teacher can approve requests' using errcode = '42501';
  end if;

  select * into j from public.join_requests where id = p_request_id and status = 'pending' for update;
  if not found then
    raise exception 'request not found or already decided' using errcode = '22023';
  end if;

  insert into public.students (display_name, grade_level_id, group_id, edition, venue, gender, phone_e164, google_email)
  values (j.student_name, j.grade_level_id, p_group_id, j.edition, j.venue, j.gender, j.student_phone, j.student_email)
  returning id into v_student;

  insert into public.parents as p (phone_e164, email) values (j.parent_phone, j.parent_email)
  on conflict (phone_e164) do update set email = coalesce(p.email, excluded.email), deleted_at = null
  returning id into v_parent;

  insert into public.guardianships (parent_id, student_id) values (v_parent, v_student)
  on conflict do nothing;

  insert into public.consents (student_id, parent_id, kind, policy_version, method, given_at)
  values (v_student, v_parent, 'guardian_data', j.consent_version, 'signup_checkbox', j.consent_given_at);

  update public.join_requests set status = 'approved', decided_at = now(), student_id = v_student where id = j.id;
  return v_student;
end $$;

revoke all on function app.approve_join_request(uuid, uuid) from public, anon;
grant execute on function app.approve_join_request(uuid, uuid) to authenticated;

-- A parent confirms consent in the portal (§9 Q5). Only for their own children.
create or replace function app.confirm_consent(p_student_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_parent uuid := app.current_parent_id();
begin
  if v_parent is null or not exists (
    select 1 from public.guardianships where parent_id = v_parent and student_id = p_student_id
  ) then
    raise exception 'not your child' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.consents
    where student_id = p_student_id and parent_id = v_parent and method = 'parent_portal' and withdrawn_at is null
  ) then
    insert into public.consents (student_id, parent_id, kind, policy_version, method)
    select p_student_id, v_parent, 'guardian_data', consent_policy_version, 'parent_portal' from public.site_settings where id;
  end if;
end $$;

revoke all on function app.confirm_consent(uuid) from public, anon;
grant execute on function app.confirm_consent(uuid) to authenticated;

-- Reorders siblings in one statement (curriculum editor move buttons).
create or replace function app.reorder(p_table text, p_ids uuid[])
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_teacher() then
    raise exception 'only the teacher can reorder' using errcode = '42501';
  end if;
  if p_table not in ('units', 'lessons', 'topics') then
    raise exception 'cannot reorder %', p_table using errcode = '22023';
  end if;
  execute format(
    'update public.%I t set position = o.ord from unnest($1) with ordinality as o(id, ord) where t.id = o.id',
    p_table
  ) using p_ids;
end $$;

revoke all on function app.reorder(text, uuid[]) from public, anon;
grant execute on function app.reorder(text, uuid[]) to authenticated;

-- PostgREST only exposes the public schema, so thin wrappers make the RPCs callable.
create or replace function public.import_students(p_rows jsonb, p_attested boolean) returns jsonb
language sql security invoker set search_path = '' as $$ select app.import_students(p_rows, p_attested) $$;
create or replace function public.issue_access_code(p_subject_type public.subject_type, p_subject_id uuid, p_code_hmac text) returns void
language sql security invoker set search_path = '' as $$ select app.issue_access_code(p_subject_type, p_subject_id, p_code_hmac) $$;
create or replace function public.approve_join_request(p_request_id uuid, p_group_id uuid) returns uuid
language sql security invoker set search_path = '' as $$ select app.approve_join_request(p_request_id, p_group_id) $$;
create or replace function public.confirm_consent(p_student_id uuid) returns void
language sql security invoker set search_path = '' as $$ select app.confirm_consent(p_student_id) $$;
create or replace function public.reorder(p_table text, p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$ select app.reorder(p_table, p_ids) $$;

revoke all on function public.import_students(jsonb, boolean), public.issue_access_code(public.subject_type, uuid, text),
  public.approve_join_request(uuid, uuid), public.confirm_consent(uuid), public.reorder(text, uuid[]) from public, anon;
grant execute on function public.import_students(jsonb, boolean), public.issue_access_code(public.subject_type, uuid, text),
  public.approve_join_request(uuid, uuid), public.confirm_consent(uuid), public.reorder(text, uuid[]) to authenticated;
