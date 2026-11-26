-- Production seed: confirmed curriculum (docs/M0-PLAN.md §0, §9), question styles,
-- and an empty site_settings row. No people, no demo data. Safe to run once.
-- Titles were read from the textbooks' contents pages and confirmed by the teacher on 2026-11-26.

insert into public.site_settings (id) values (true) on conflict do nothing;

insert into public.grade_levels (code, number, title_ar, title_en, editions, position) values
  ('g10', 10, 'أولى ثانوي',  'Grade 10', '{en}',    1),
  ('g11', 11, 'تانية ثانوي', 'Grade 11', '{ar,en}', 2);

-- ───────────────────── Grade 11: Programming and Artificial Intelligence ─────────────────────
insert into public.units (grade_level_id, code, title_ar, title_en, term, domain, position)
select g.id, u.code, u.title_ar, u.title_en, u.term, u.domain::public.domain, u.position
from public.grade_levels g,
(values
  ('1', 'تكنولوجيا المعلومات والمجتمع', 'Information Technology and Society', 1, 'society', 1),
  ('2', 'الأمن السيبراني', 'Cybersecurity', 1, 'cipher', 2),
  ('3', 'تطبيقات الويب', 'Web Applications', 1, 'protocol', 3),
  ('4', 'تصميم الويب والوسائط', 'Web and Media Design', 1, 'swatch', 4),
  ('5', 'جمع البيانات وتنقيتها', 'Data Collection and Cleaning', 2, 'data', 5),
  ('6', 'التحليل والتواصل', 'Analysis and Communication', 2, 'signal', 6),
  ('7', 'التعلم الآلي والذكاء الاصطناعي', 'Machine Learning and Artificial Intelligence', 2, 'neuron', 7)
) as u(code, title_ar, title_en, term, domain, position)
where g.code = 'g11';

insert into public.lessons (unit_id, code, title_ar, title_en, page_en, page_ar, position)
select un.id, l.code, l.title_ar, l.title_en, l.page_en, l.page_ar, l.position
from (values
  ('1', '1-1', 'تطور تكنولوجيا المعلومات والتحول الاجتماعي', 'Development of Information Technology and Social Transformation', 4, 4, 1),
  ('1', '1-2', 'كيف يعمل الذكاء الاصطناعي', 'How AI Works', 12, 12, 2),
  ('1', '1-3', 'الذكاء الاصطناعي في الحياة اليومية والصناعة', 'AI in Daily Life and Industry', 19, 18, 3),
  ('1', '1-4', 'القضايا الأخلاقية للذكاء الاصطناعي', 'Ethical Issues with AI', 26, 24, 4),
  ('2', '2-1', 'تقنيات التشفير والمصادقة', 'Cryptographic Technologies and Authentication', 33, 31, 1),
  ('2', '2-2', 'تصميم أمن الشبكات', 'Network Security Design', 41, 38, 2),
  ('2', '2-3', 'الاستجابة للحوادث وإدارة المخاطر', 'Incident Response and Risk Management', 48, 44, 3),
  ('3', '3-1', 'البنية العامة لتطبيقات الويب', 'The Overall Structure of Web Applications', 55, 50, 1),
  ('3', '3-2', 'طرق الاتصال في تطبيقات الويب', 'Web Application Communication Methods', 62, 56, 2),
  ('3', '3-3', 'أساسيات تكنولوجيا الواجهة الأمامية', 'Fundamentals of Frontend Technology', 68, 62, 3),
  ('4', '4-1', 'أنواع الوسائط وخصائصها', 'Types and Characteristics of Media', 75, 68, 1),
  ('4', '4-2', 'تصميم المعلومات وتجربة المستخدم للمواقع', 'Information Design and User Experience for Websites', 81, 74, 2),
  ('4', '4-3', 'أساليب تقييم المواقع الإلكترونية', 'Methods for Evaluating Websites', 88, 81, 3),
  ('4', '4-4', 'عملية التحسين التكراري للمواقع', 'The Iterative Improvement Process for Websites', 95, 87, 4),
  ('5', '5-1', 'طرق جمع البيانات', 'Methods of Data Collection', 4, 4, 1),
  ('5', '5-2', 'تنقية البيانات وتحويلها', 'Data Cleaning and Transformation', 12, 11, 2),
  ('5', '5-3', 'البيانات المفتوحة وواجهات برمجة التطبيقات', 'Open Data and APIs', 21, 19, 3),
  ('6', '6-1', 'الاستدلال الإحصائي', 'Statistical Inference', 29, 26, 1),
  ('6', '6-2', 'استخدام تحليل الانحدار وتقييمه', 'Use and Evaluation of Regression Analysis', 39, 34, 2),
  ('6', '6-3', 'تمثيل البيانات المرئي والتواصل', 'Data Visualization and Communication', 48, 42, 3),
  ('7', '7-1', 'أساسيات التعلم الآلي', 'The Basics of Machine Learning', 57, 50, 1),
  ('7', '7-2', 'الشبكات العصبية والتعلم العميق', 'Neural Networks and Deep Learning', 68, 59, 2),
  ('7', '7-3', 'نماذج اللغة الكبيرة والذكاء الاصطناعي التوليدي', 'Large Language Models (LLM) and Generative AI', 77, 67, 3)
) as l(unit_code, code, title_ar, title_en, page_en, page_ar, position)
join public.units un on un.code = l.unit_code
join public.grade_levels g on g.id = un.grade_level_id and g.code = 'g11';

-- ───────────────────── Grade 10: ICT, one book, English only ─────────────────────
insert into public.units (grade_level_id, code, title_ar, title_en, term, domain, position)
select g.id, u.code, null, u.title_en, null, u.domain::public.domain, u.position
from public.grade_levels g,
(values
  ('1',  'What is Information?', 'society', 1),
  ('2',  'Regulations and Rights in the Information Society', 'society', 2),
  ('3',  'Information Security', 'cipher', 3),
  ('4',  'Information Technology and Society', 'society', 4),
  ('5',  'Communication', 'society', 5),
  ('6',  'Information Design', 'swatch', 6),
  ('7',  'Computers', 'swatch', 7),
  ('8',  'Networks', 'protocol', 8),
  ('9',  'Databases', 'protocol', 9),
  ('10', 'Data Analysis', 'data', 10),
  ('11', 'Simulations', 'signal', 11),
  ('12', 'Programming (Python)', 'programming', 12),
  ('13', 'AI Programming', 'programming', 13)
) as u(code, title_en, domain, position)
where g.code = 'g10';

insert into public.lessons (unit_id, code, title_en, page_en, domain, position)
select un.id, l.code, l.title_en, l.page_en, l.domain::public.domain, l.position
from (values
  ('1', '1-1', 'Information and Media', 4, null, 1),
  ('1', '1-2', 'Information Ethics', 8, null, 2),
  ('2', '2-1', 'Personal Information', 12, null, 1),
  ('2', '2-2', 'Intellectual Property Rights', 16, null, 2),
  ('2', '2-3', 'Utilization and Disclosure of Information', 20, null, 3),
  ('3', '3-1', 'Threats and Countermeasures in Information Security [1]', 24, null, 1),
  ('3', '3-2', 'Threats and Countermeasures in Information Security [2]', 28, null, 2),
  ('3', '3-3', 'Threats and Countermeasures in Information Security [3]', 32, null, 3),
  ('3', '3-4', 'Information Technology for Safety [1]', 35, null, 4),
  ('3', '3-5', 'Information Technology for Safety [2]', 38, null, 5),
  ('4', '4-1', 'Development of Information Technology', 42, null, 1),
  ('5', '5-1', 'Development of Communication Methods', 46, null, 1),
  ('5', '5-2', 'Communication and Its Forms', 48, null, 2),
  ('5', '5-3', 'Internet and Communication', 50, null, 3),
  ('6', '6-1', 'Analog and Digital', 53, null, 1),
  ('6', '6-2', 'Binary and Amount of Information', 55, null, 2),
  ('6', '6-3', 'Hexadecimal', 59, null, 3),
  ('6', '6-4', 'Digital Representation of Characters', 61, null, 4),
  ('6', '6-5', 'Numerical Calculations [1]', 65, null, 5),
  ('6', '6-6', 'Numerical Calculations [2]', 67, null, 6),
  ('6', '6-7', 'Digitalization of Sound', 69, null, 7),
  ('6', '6-8', 'Digitization of Images', 73, null, 8),
  ('6', '6-9', 'Digital Representation and Compression Technology for Videos', 77, null, 9),
  ('6', '6-10', 'Information Design', 81, null, 10),
  ('7', '7-1', 'Computer Configuration', 85, null, 1),
  ('7', '7-2', 'Computer Software', 89, null, 2),
  ('7', '7-3', 'Logic Circuits', 91, null, 3),
  ('8', '8-1', 'Computer Networks', 95, null, 1),
  ('8', '8-2', 'IP Addresses and Domain Names', 99, null, 2),
  ('8', '8-3', 'Communication Protocol', 101, null, 3),
  ('8', '8-4', 'Mechanism of Web Pages and Emails', 105, null, 4),
  ('8', '8-5', 'Network Transfer Speed', 109, null, 5),
  ('9', '9-1', 'Database [1]', 111, null, 1),
  ('9', '9-2', 'Database [2]', 115, null, 2),
  ('9', '9-3', 'Various Information Systems', 119, null, 3),
  ('10', '10-1', 'Types of Data and Analysis', 123, null, 1),
  ('10', '10-2', 'Data Analysis [1]', 127, null, 2),
  ('10', '10-3', 'Data Analysis [2]', 131, null, 3),
  ('10', '10-4', 'Data Analysis [3]', 134, null, 4),
  ('10', '10-5', 'Data Analysis [4]', 136, null, 5),
  ('10', '10-6', 'Data Analysis [5]', 140, null, 6),
  ('11', '11-1', 'Modeling', 142, null, 1),
  ('11', '11-2', 'Simulations [1]', 145, null, 2),
  ('11', '11-3', 'Simulations [2]', 149, null, 3),
  ('11', '11-4', 'Queues', 153, null, 4),
  ('12', '12-1', 'Algorithm', 155, null, 1),
  ('12', '12-2', 'Programming Basics [1] (Python)', 159, null, 2),
  ('12', '12-3', 'Programming Basics [2] (Python)', 163, null, 3),
  ('12', '12-4', 'Application of Programming [1] (Python)', 168, null, 4),
  ('12', '12-5', 'Application of Programming [2] (Python)', 172, null, 5),
  ('13', '13-1', 'About Generative AI', 176, 'neuron', 1),
  ('13', '13-2', 'HTML, CSS', 178, null, 2),
  ('13', '13-3', 'HTML, JS', 181, null, 3),
  ('13', '13-4', 'Creating Static Web Pages', 186, null, 4),
  ('13', '13-5', 'Creating Dynamic Web Pages', 190, null, 5),
  ('13', '13-6', 'Presenting Your Website', 192, null, 6),
  ('13', '13-7', 'Developing a Quiz App', 193, null, 7),
  ('13', '13-8', 'Quiz App Review', 195, null, 8),
  ('13', '13-9', 'Developing a Block Breaker Game 1', 196, null, 9),
  ('13', '13-10', 'Developing a Block Breaker Game 2', 198, null, 10),
  ('13', '13-11', 'Block Breaker Summary', 200, null, 11),
  ('13', '13-12', 'Block Breaker Development Presentation', 202, null, 12)
) as l(unit_code, code, title_en, page_en, domain, position)
join public.units un on un.code = l.unit_code
join public.grade_levels g on g.id = un.grade_level_id and g.code = 'g10';

-- ───────────────────── Question styles (§9 Q3: both lists) ─────────────────────
insert into public.question_styles (key, label_ar, label_en, source, grade_codes, kind, position) values
  ('worked_example',   'مثال محلول',            'Worked Example (with Solution)', 'g11_book',      '{g11}',     'question',      1),
  ('try_g11',          'جرّب',                  'Try',                            'g11_book',      '{g11}',     'question',      2),
  ('think_engineer',   'فكّر كمهندس',           'Think as an Engineer',           'g11_book',      '{g11}',     'question',      3),
  ('new_context',      'في سياق جديد',          'In a New Context',               'g11_book',      '{g11}',     'question',      4),
  ('exercise_g11',     'تمرين',                 'Exercise',                       'g11_book',      '{g11}',     'question',      5),
  ('lesson_question',  'سؤال الدرس',            'Lesson Question',                'g11_book',      '{g11}',     'question',      6),
  ('explore_pairs',    'استكشف مع زميلك',       'Explore (in pairs)',             'g11_book_2026', '{g11}',     'question',      7),
  ('pause_think',      'وقفة تفكير',            'PAUSE & THINK',                  'g11_book_2026', '{g11}',     'question',      8),
  ('point',            'نقطة مهمة',             'Point!',                         'g11_book_2026', '{g11}',     'content_block', 9),
  ('key_fact',         'حقيقة أساسية',          'Key Fact',                       'g11_book_2026', '{g11}',     'content_block', 10),
  ('key_terms',        'المصطلحات',             'KEY TERMS',                      'g11_book_2026', '{g11}',     'content_block', 11),
  ('warm_up',          'تسخين',                 'Warm Up',                        'g10_book',      '{g10}',     'question',      12),
  ('explanation',      'شرح',                   'Explanation',                    'g10_book',      '{g10}',     'content_block', 13),
  ('try_g10',          'جرّب',                  'Try',                            'g10_book',      '{g10}',     'question',      14),
  ('exercise_g10',     'تمرين',                 'Exercise',                       'g10_book',      '{g10}',     'question',      15),
  ('definition',       'تعريف',                 'DEFINITION',                     'house',         '{g10,g11}', 'content_block', 16),
  ('note',             'ملحوظة',                'NOTE',                           'house',         '{g10,g11}', 'content_block', 17),
  ('exam_trap',        'حاسب تقع فيه',          'EXAM TRAP',                      'house',         '{g10,g11}', 'question',      18),
  ('memory_trick',     'تريكة للحفظ',           'MEMORY TRICK',                   'house',         '{g10,g11}', 'content_block', 19),
  ('key_terms_glossary','قاموس المصطلحات',      'Key Terms Glossary',             'house',         '{g10,g11}', 'content_block', 20),
  ('story_summary',    'ملخص الدرس كقصة واحدة', 'Lesson summary as one story',    'house',         '{g10,g11}', 'content_block', 21),
  ('homework_graded',  'واجب متدرّج',           'Graded-difficulty HOMEWORK',     'house',         '{g10,g11}', 'question',      22),
  ('critical_thinking','تفكير ناقد',            'Critical thinking',              'house',         '{g10,g11}', 'question',      23);
