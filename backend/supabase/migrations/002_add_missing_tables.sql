-- KABISIG migration 002: additive governance and workflow tables.
-- This migration does not drop or alter existing tables.

CREATE TABLE IF NOT EXISTS public.document_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_approvals_tenant ON public.document_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON public.document_approvals(document_id);

CREATE TABLE IF NOT EXISTS public.resolution_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vote_choice TEXT NOT NULL CHECK (vote_choice IN ('Support', 'Oppose', 'Abstain')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_resolution_vote_poll_user UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_resolution_votes_tenant ON public.resolution_votes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resolution_votes_poll ON public.resolution_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_resolution_votes_user ON public.resolution_votes(user_id);

CREATE TABLE IF NOT EXISTS public.compliance_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL,
    fiscal_year INT NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'overdue')),
    due_date DATE,
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_compliance_tenant_report_year UNIQUE (tenant_id, report_type, fiscal_year)
);

CREATE INDEX IF NOT EXISTS idx_compliance_tenant ON public.compliance_monitoring(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON public.compliance_monitoring(status);

CREATE TABLE IF NOT EXISTS public.sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    feedback_id UUID NOT NULL UNIQUE REFERENCES public.feedback(id) ON DELETE CASCADE,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    score INT NOT NULL,
    positive_keywords JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(positive_keywords) = 'array'),
    negative_keywords JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(negative_keywords) = 'array'),
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_tenant ON public.sentiment_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_sentiment ON public.sentiment_analysis(sentiment);

CREATE TABLE IF NOT EXISTS public.committee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    chairperson_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_committee_tenant_name UNIQUE (tenant_id, name),
    CONSTRAINT uq_committee_id_tenant UNIQUE (id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_committee_tenant ON public.committee(tenant_id);

CREATE TABLE IF NOT EXISTS public.committee_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    committee_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    position TEXT NOT NULL DEFAULT 'member',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_committee_assignment_committee_tenant
        FOREIGN KEY (committee_id, tenant_id)
        REFERENCES public.committee(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT uq_committee_assignment_user UNIQUE (committee_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_committee_assignment_tenant ON public.committee_assignment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_committee_assignment_user ON public.committee_assignment(user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;

ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Document approvals tenant read" ON public.document_approvals;
CREATE POLICY "Document approvals tenant read"
    ON public.document_approvals FOR SELECT TO authenticated
    USING (tenant_id = public.get_auth_user_tenant_id() OR public.get_auth_user_role() = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "Document approvals admin insert" ON public.document_approvals;
CREATE POLICY "Document approvals admin insert"
    ON public.document_approvals FOR INSERT TO authenticated
    WITH CHECK (
        reviewer_id = auth.uid()
        AND (
            (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() = 'BARANGAY_ADMIN')
            OR public.get_auth_user_role() = 'SUPER_ADMIN'
        )
    );

DROP POLICY IF EXISTS "Resolution votes tenant read" ON public.resolution_votes;
CREATE POLICY "Resolution votes tenant read"
    ON public.resolution_votes FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

DROP POLICY IF EXISTS "Resolution votes own insert" ON public.resolution_votes;
CREATE POLICY "Resolution votes own insert"
    ON public.resolution_votes FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Compliance tenant read" ON public.compliance_monitoring;
CREATE POLICY "Compliance tenant read"
    ON public.compliance_monitoring FOR SELECT TO authenticated
    USING (tenant_id = public.get_auth_user_tenant_id() OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR'));

DROP POLICY IF EXISTS "Compliance admin manage" ON public.compliance_monitoring;
CREATE POLICY "Compliance admin manage"
    ON public.compliance_monitoring FOR ALL TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() = 'BARANGAY_ADMIN')
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    )
    WITH CHECK (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() = 'BARANGAY_ADMIN')
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

DROP POLICY IF EXISTS "Sentiment analysis tenant read" ON public.sentiment_analysis;
CREATE POLICY "Sentiment analysis tenant read"
    ON public.sentiment_analysis FOR SELECT TO authenticated
    USING (tenant_id = public.get_auth_user_tenant_id() OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR'));

DROP POLICY IF EXISTS "Committee tenant read" ON public.committee;
CREATE POLICY "Committee tenant read"
    ON public.committee FOR SELECT TO authenticated
    USING (tenant_id = public.get_auth_user_tenant_id() OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER'));

DROP POLICY IF EXISTS "Committee tenant manage" ON public.committee;
CREATE POLICY "Committee tenant manage"
    ON public.committee FOR ALL TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    )
    WITH CHECK (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

DROP POLICY IF EXISTS "Committee assignments tenant read" ON public.committee_assignment;
CREATE POLICY "Committee assignments tenant read"
    ON public.committee_assignment FOR SELECT TO authenticated
    USING (tenant_id = public.get_auth_user_tenant_id() OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER'));

DROP POLICY IF EXISTS "Committee assignments tenant manage" ON public.committee_assignment;
CREATE POLICY "Committee assignments tenant manage"
    ON public.committee_assignment FOR ALL TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    )
    WITH CHECK (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

DROP POLICY IF EXISTS "Notifications recipient read" ON public.notifications;
CREATE POLICY "Notifications recipient read"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Notifications recipient update" ON public.notifications;
CREATE POLICY "Notifications recipient update"
    ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());