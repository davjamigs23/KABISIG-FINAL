-- Allow Barangay Admins to upload and create signed previews for pubmats in their own tenant folder.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Barangay admins upload announcement pubmats'
    ) THEN
        CREATE POLICY "Barangay admins upload announcement pubmats"
            ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'announcement-pubmats'
                AND (storage.foldername(name))[1] = public.get_auth_user_tenant_id()::text
                AND public.get_auth_user_role() = 'BARANGAY_ADMIN'
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Barangay admins read announcement pubmats'
    ) THEN
        CREATE POLICY "Barangay admins read announcement pubmats"
            ON storage.objects
            FOR SELECT
            TO authenticated
            USING (
                bucket_id = 'announcement-pubmats'
                AND (storage.foldername(name))[1] = public.get_auth_user_tenant_id()::text
                AND public.get_auth_user_role() = 'BARANGAY_ADMIN'
            );
    END IF;
END
$$;
