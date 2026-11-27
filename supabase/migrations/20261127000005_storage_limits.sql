-- Limits on the private `materials` bucket: PDFs and common images only, 50 MB each
-- (the Supabase free plan's per-file maximum). Skipped where Storage is absent (tests).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets
    set file_size_limit = 52428800,
        allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    where id = 'materials';
  end if;
end $$;
