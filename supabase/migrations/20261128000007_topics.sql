-- Every lesson starts with one editable catch-all topic.
insert into public.topics (lesson_id, title_ar, title_en, position)
select l.id, 'عام', 'General', 1
from public.lessons l
where not exists (
  select 1 from public.topics t where t.lesson_id = l.id
);

create or replace function app.create_default_topic_for_lesson()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.topics (lesson_id, title_ar, title_en, position)
  values (new.id, 'عام', 'General', 1);
  return new;
end $$;

create trigger lessons_create_default_topic
after insert on public.lessons
for each row execute function app.create_default_topic_for_lesson();
