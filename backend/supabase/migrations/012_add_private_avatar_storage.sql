ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

UPDATE public.users
SET avatar_url = regexp_replace(avatar_url, '^.*?/storage/v1/object/public/avatars/', '')
WHERE avatar_url ~* '/storage/v1/object/public/avatars/';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    FALSE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
    public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

NOTIFY pgrst, 'reload schema';
