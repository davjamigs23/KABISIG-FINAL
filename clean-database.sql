-- KABISIG File Pointer Cleanup
-- Sets all file URLs to NULL so the UI doesn't look for missing files.

UPDATE public.users SET avatar_url = NULL;
UPDATE public.resident_profile SET id_document_path = NULL;
UPDATE public.program SET image_url = NULL;
UPDATE public.inventory SET photo_url = NULL;
UPDATE public.announcement SET image_path = NULL;
UPDATE public.documents SET file_path = NULL;
-- Add any other document columns you might have here:

UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'profilePic' - 'valid_id_url'
WHERE raw_user_meta_data ? 'profilePic' OR raw_user_meta_data ? 'valid_id_url';
