DO $$
DECLARE
    target_table text;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        FOREACH target_table IN ARRAY ARRAY['documents', 'announcement', 'feedback']
        LOOP
            IF to_regclass(format('public.%I', target_table)) IS NOT NULL
               AND NOT EXISTS (
                    SELECT 1
                    FROM pg_publication_tables
                    WHERE pubname = 'supabase_realtime'
                      AND schemaname = 'public'
                      AND tablename = target_table
               ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target_table);
            END IF;
        END LOOP;
    END IF;
END;
$$;
