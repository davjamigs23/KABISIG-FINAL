-- KABISIG migration 003: tenant-scoped announcements.
-- This migration is additive and does not drop or alter existing tables.

CREATE TABLE IF NOT EXISTS public.announcement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) >= 3),
    content TEXT NOT NULL CHECK (length(trim(content)) >= 1),
    category TEXT NOT NULL CHECK (category IN ('Opportunity', 'Notice', 'Emergency', 'Event')),
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT announcement_published_at_required
        CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_announcement_tenant
    ON public.announcement(tenant_id);

CREATE INDEX IF NOT EXISTS idx_announcement_status_published
    ON public.announcement(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcement_author
    ON public.announcement(author_id);

ALTER TABLE public.announcement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Announcement tenant read" ON public.announcement;
CREATE POLICY "Announcement tenant read"
    ON public.announcement FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Announcement tenant manage" ON public.announcement;
CREATE POLICY "Announcement tenant manage"
    ON public.announcement FOR ALL
    TO authenticated
    USING (
        (
            tenant_id = public.get_auth_user_tenant_id()
            AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL')
        )
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    )
    WITH CHECK (
        (
            tenant_id = public.get_auth_user_tenant_id()
            AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL')
        )
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );
