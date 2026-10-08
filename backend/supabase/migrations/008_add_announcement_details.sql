-- Add structured announcement content and private pubmat storage.
ALTER TABLE public.announcement
    ADD COLUMN IF NOT EXISTS what text,
    ADD COLUMN IF NOT EXISTS where_text text,
    ADD COLUMN IF NOT EXISTS event_when text,
    ADD COLUMN IF NOT EXISTS hashtags text,
    ADD COLUMN IF NOT EXISTS image_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'announcement-pubmats',
    'announcement-pubmats',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

NOTIFY pgrst, 'reload schema';
