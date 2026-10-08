-- Store a separately encrypted Facebook Page credential for each barangay.
CREATE TABLE IF NOT EXISTS public.facebook_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.barangay(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    page_name TEXT NOT NULL,
    page_access_token TEXT NOT NULL,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    connected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.facebook_integration.page_access_token
    IS 'AES-256-GCM encrypted by the backend; never store the plaintext Page token here.';

CREATE INDEX IF NOT EXISTS idx_facebook_integration_active_tenant
    ON public.facebook_integration(tenant_id, is_active);

ALTER TABLE public.facebook_integration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Facebook integration tenant read" ON public.facebook_integration;
CREATE POLICY "Facebook integration tenant read"
    ON public.facebook_integration
    FOR SELECT
    TO authenticated
    USING (
        (
            tenant_id = public.get_auth_user_tenant_id()
            AND public.get_auth_user_role() = 'BARANGAY_ADMIN'
        )
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

DROP POLICY IF EXISTS "Facebook integration tenant insert" ON public.facebook_integration;
CREATE POLICY "Facebook integration tenant insert"
    ON public.facebook_integration
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id()
        AND public.get_auth_user_role() = 'BARANGAY_ADMIN'
    );

DROP POLICY IF EXISTS "Facebook integration tenant update" ON public.facebook_integration;
CREATE POLICY "Facebook integration tenant update"
    ON public.facebook_integration
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        AND public.get_auth_user_role() = 'BARANGAY_ADMIN'
    )
    WITH CHECK (
        tenant_id = public.get_auth_user_tenant_id()
        AND public.get_auth_user_role() = 'BARANGAY_ADMIN'
    );

DROP POLICY IF EXISTS "Facebook integration tenant delete" ON public.facebook_integration;
CREATE POLICY "Facebook integration tenant delete"
    ON public.facebook_integration
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        AND public.get_auth_user_role() = 'BARANGAY_ADMIN'
    );
