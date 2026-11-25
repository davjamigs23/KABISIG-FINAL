ALTER TABLE public.announcement
    ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.announcement
SET image_urls = ARRAY[image_path]
WHERE image_path IS NOT NULL
  AND cardinality(image_urls) = 0;

DO $$
DECLARE
    target_table text;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['program', 'budget', 'expense']
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = target_table
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target_table);
        END IF;
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
