-- ==============================================================================
-- KABISIG: A Web-Based Kabataan Information System for Inclusive Governance
-- Database Migration Script 001: Schema, Enums, Constraints, RLS, & Seed Data
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS preserves existing application data on reruns.
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 1. BARANGAY TABLE (Multi-Tenant Root)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barangay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL DEFAULT 'Naga City',
    district TEXT NOT NULL CHECK (district IN ('District 1', 'District 2')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. ROLES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Canonical Roles
INSERT INTO public.roles (id, role_name, description) VALUES
    (1, 'SUPER_ADMIN', 'System Administrator with complete citywide platform access'),
    (2, 'BARANGAY_ADMIN', 'Barangay SK Chairman or Chief Administrator'),
    (3, 'SK_OFFICIAL', 'Elected or appointed Sangguniang Kabataan Kagawad/Secretary/Treasurer'),
    (4, 'YOUTH_CONSTITUENT', 'Registered youth resident of the barangay (15-30 years old)'),
    (5, 'VIEWER', 'Public or restricted viewer access'),
    (6, 'FEDERATION_OBSERVER', 'City-level Panlungsod na Pederasyon ng mga SK observer'),
    (7, 'LGU_AUDITOR', 'City Government / DILG youth program and fiscal auditor')
ON CONFLICT (id) DO UPDATE 
SET role_name = EXCLUDED.role_name, description = EXCLUDED.description;

-- Reset sequence for roles
SELECT setval('public.roles_id_seq', (SELECT MAX(id) FROM public.roles));

-- Seed Naga City 27 Barangays with Explicit UUIDs
INSERT INTO public.barangay (id, name, city, district) VALUES
    -- District 1
    ('a0111111-1111-4000-8000-000000000001', 'Bagumbayan Norte', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000002', 'Bagumbayan Sur', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000003', 'Calauag', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000004', 'Carolina', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000005', 'Dayangdang', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000006', 'Liboton', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000007', 'Pacol', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000008', 'Panicuason', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000009', 'Peñafrancia', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000010', 'San Felipe', 'Naga City', 'District 1'),
    ('a0111111-1111-4000-8000-000000000011', 'Santa Cruz', 'Naga City', 'District 1'),
    -- District 2
    ('b0222222-2222-4000-8000-000000000012', 'Abella', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000013', 'Balatas', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000014', 'Cararayan', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000015', 'Concepcion Grande', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000016', 'Concepcion Pequeña', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000017', 'Del Rosario', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000018', 'Dinaga', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000019', 'Igualdad Interior', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000020', 'Lerma', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000021', 'Mabolo', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000022', 'Sabang', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000023', 'San Francisco', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000024', 'San Isidro', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000025', 'Tabuco', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000026', 'Tinago', 'Naga City', 'District 2'),
    ('b0222222-2222-4000-8000-000000000027', 'Triangulo', 'Naga City', 'District 2')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, city = EXCLUDED.city, district = EXCLUDED.district;

-- ------------------------------------------------------------------------------
-- 3. USERS TABLE (Linked to Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.barangay(id) ON DELETE SET NULL,
    role_id INT NOT NULL REFERENCES public.roles(id) DEFAULT 4,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'rejected')) DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- ------------------------------------------------------------------------------
-- 4. RESIDENT_PROFILE TABLE (15-30 Youth Age Verification)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resident_profile (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    birthdate DATE NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    address TEXT NOT NULL,
    educational_status TEXT CHECK (educational_status IN ('Elementary', 'High School', 'Vocational', 'College', 'Post-Graduate', 'Out of School Youth')),
    employment_status TEXT CHECK (employment_status IN ('Employed', 'Unemployed', 'Self-Employed', 'Student')),
    is_registered_voter BOOLEAN NOT NULL DEFAULT false,
    digital_youth_id TEXT UNIQUE,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resident_profile_tenant_id ON public.resident_profile(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resident_profile_digital_id ON public.resident_profile(digital_youth_id);

-- Enforce 15-30 age requirement per Republic Act No. 10742 (SK Reform Act)
CREATE OR REPLACE FUNCTION public.check_resident_age()
RETURNS TRIGGER AS $$
DECLARE
    calculated_age INT;
BEGIN
    calculated_age := DATE_PART('year', AGE(NEW.birthdate));
    IF calculated_age < 15 OR calculated_age > 30 THEN
        RAISE EXCEPTION 'Age must be between 15 and 30 years old per SK Reform Act (RA 10742). Submitted age: %', calculated_age;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_resident_age ON public.resident_profile;
CREATE TRIGGER trg_check_resident_age
    BEFORE INSERT OR UPDATE ON public.resident_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.check_resident_age();

-- ------------------------------------------------------------------------------
-- 5. PROGRAM TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    total_slots INT NOT NULL DEFAULT 50 CHECK (total_slots > 0),
    status TEXT NOT NULL CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')) DEFAULT 'upcoming',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_program_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_program_tenant_id ON public.program(tenant_id);
CREATE INDEX IF NOT EXISTS idx_program_status ON public.program(status);

-- ------------------------------------------------------------------------------
-- 6. PROGRAM_REGISTRATIONS & ATTENDANCE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.program_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.program(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('registered', 'waitlisted', 'cancelled', 'attended')) DEFAULT 'registered',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_program_user_reg UNIQUE (program_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_program_reg_program ON public.program_registrations(program_id);
CREATE INDEX IF NOT EXISTS idx_program_reg_user ON public.program_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_program_reg_tenant ON public.program_registrations(tenant_id);

CREATE TABLE IF NOT EXISTS public.program_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.program(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_in_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    qr_payload TEXT,
    CONSTRAINT uq_attendance_program_user UNIQUE (program_id, user_id) -- Duplicate check-in prevention
);

CREATE INDEX IF NOT EXISTS idx_attendance_program ON public.program_attendance(program_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON public.program_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON public.program_attendance(tenant_id);

-- ------------------------------------------------------------------------------
-- 7. BUDGET & EXPENSE TABLES (With Fiscal & Tax Calculations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL,
    category TEXT NOT NULL,
    allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount >= 0),
    remaining_amount NUMERIC(14,2) NOT NULL CHECK (remaining_amount >= 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_fiscal_cat UNIQUE (tenant_id, fiscal_year, category)
);

CREATE INDEX IF NOT EXISTS idx_budget_tenant_year ON public.budget(tenant_id, fiscal_year);

CREATE TABLE IF NOT EXISTS public.expense (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budget(id) ON DELETE RESTRICT,
    program_id UUID REFERENCES public.program(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    gross_amount NUMERIC(14,2) NOT NULL CHECK (gross_amount > 0),
    tax_type TEXT NOT NULL CHECK (tax_type IN ('VAT', 'NON_VAT', 'EXEMPT')),
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(14,2) NOT NULL,
    receipt_url TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_tenant_id ON public.expense(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_budget_id ON public.expense(budget_id);

-- ------------------------------------------------------------------------------
-- 8. INVENTORY TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'pcs',
    condition TEXT NOT NULL CHECK (condition IN ('New', 'Good', 'Fair', 'Damaged', 'Disposed')) DEFAULT 'Good',
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id ON public.inventory(tenant_id);

-- ------------------------------------------------------------------------------
-- 9. DOCUMENTS TABLE (Approval Workflow)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('Resolution', 'Ordinance', 'Financial Report', 'Minutes', 'Project Proposal', 'Other')),
    file_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'archived')) DEFAULT 'draft',
    submitted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- ------------------------------------------------------------------------------
-- 10. FEEDBACK TABLE (Boses ng Kabataan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')) DEFAULT 'neutral',
    status TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'resolved', 'dismissed')) DEFAULT 'submitted',
    response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON public.feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON public.feedback(sentiment);

-- ------------------------------------------------------------------------------
-- 11. POLLS & POLL RESPONSES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    selected_option TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_poll_user UNIQUE (poll_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 12. SOCIAL MEDIA POSTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_media_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.barangay(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    post_url TEXT NOT NULL,
    content TEXT,
    metrics JSONB NOT NULL DEFAULT '{"reach": 0, "likes": 0, "comments": 0, "shares": 0}'::jsonb,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 13. AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.barangay(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Security Helper Functions
CREATE OR REPLACE FUNCTION public.get_auth_user_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
    SELECT r.role_name
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.barangay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 14.1 BARANGAY & ROLES POLICIES (Readable by all authenticated users)
DROP POLICY IF EXISTS "Barangay read access for authenticated users" ON public.barangay;
CREATE POLICY "Barangay read access for authenticated users" 
    ON public.barangay FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Roles read access for authenticated users" ON public.roles;
CREATE POLICY "Roles read access for authenticated users" 
    ON public.roles FOR SELECT 
    TO authenticated 
    USING (true);

-- 14.2 USERS POLICIES
DROP POLICY IF EXISTS "Users read own or tenant profile" ON public.users;
CREATE POLICY "Users read own or tenant profile" 
    ON public.users FOR SELECT 
    TO authenticated 
    USING (
        id = auth.uid() 
        OR tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Users can update their own non-sensitive profile" ON public.users;
CREATE POLICY "Users can update their own non-sensitive profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update user status and role within tenant" ON public.users;
CREATE POLICY "Admins can update user status and role within tenant"
    ON public.users FOR UPDATE
    TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

-- 14.3 RESIDENT_PROFILE POLICIES
DROP POLICY IF EXISTS "Resident profile tenant isolation" ON public.resident_profile;
CREATE POLICY "Resident profile tenant isolation"
    ON public.resident_profile FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Resident profile insert" ON public.resident_profile;
CREATE POLICY "Resident profile insert"
    ON public.resident_profile FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL', 'SUPER_ADMIN')
    );

DROP POLICY IF EXISTS "Resident profile update" ON public.resident_profile;
CREATE POLICY "Resident profile update"
    ON public.resident_profile FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

-- 14.4 PROGRAM POLICIES
DROP POLICY IF EXISTS "Program select policy" ON public.program;
CREATE POLICY "Program select policy"
    ON public.program FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Program write policy" ON public.program;
CREATE POLICY "Program write policy"
    ON public.program FOR ALL
    TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

-- 14.5 PROGRAM REGISTRATIONS & ATTENDANCE POLICIES
DROP POLICY IF EXISTS "Program registration select" ON public.program_registrations;
CREATE POLICY "Program registration select"
    ON public.program_registrations FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER')
    );

DROP POLICY IF EXISTS "Program registration insert" ON public.program_registrations;
CREATE POLICY "Program registration insert"
    ON public.program_registrations FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
    );

DROP POLICY IF EXISTS "Program attendance select" ON public.program_attendance;
CREATE POLICY "Program attendance select"
    ON public.program_attendance FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Program attendance write" ON public.program_attendance;
CREATE POLICY "Program attendance write"
    ON public.program_attendance FOR INSERT
    TO authenticated
    WITH CHECK (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

-- 14.6 BUDGET & EXPENSE POLICIES
DROP POLICY IF EXISTS "Budget select policy" ON public.budget;
CREATE POLICY "Budget select policy"
    ON public.budget FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Budget write policy" ON public.budget;
CREATE POLICY "Budget write policy"
    ON public.budget FOR ALL
    TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

DROP POLICY IF EXISTS "Expense select policy" ON public.expense;
CREATE POLICY "Expense select policy"
    ON public.expense FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Expense write policy" ON public.expense;
CREATE POLICY "Expense write policy"
    ON public.expense FOR ALL
    TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

-- 14.7 INVENTORY POLICIES
DROP POLICY IF EXISTS "Inventory select policy" ON public.inventory;
CREATE POLICY "Inventory select policy"
    ON public.inventory FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Inventory write policy" ON public.inventory;
CREATE POLICY "Inventory write policy"
    ON public.inventory FOR ALL
    TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

-- 14.8 DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Documents select policy" ON public.documents;
CREATE POLICY "Documents select policy"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );

DROP POLICY IF EXISTS "Documents write policy" ON public.documents;
CREATE POLICY "Documents write policy"
    ON public.documents FOR ALL
    TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

-- 14.9 FEEDBACK POLICIES (Boses ng Kabataan)
DROP POLICY IF EXISTS "Feedback select policy" ON public.feedback;
CREATE POLICY "Feedback select policy"
    ON public.feedback FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER')
    );

DROP POLICY IF EXISTS "Feedback insert policy" ON public.feedback;
CREATE POLICY "Feedback insert policy"
    ON public.feedback FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Feedback update policy" ON public.feedback;
CREATE POLICY "Feedback update policy"
    ON public.feedback FOR UPDATE
    TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() = 'SUPER_ADMIN'
    );

-- 14.10 POLLS & RESPONSES POLICIES
DROP POLICY IF EXISTS "Polls select policy" ON public.polls;
CREATE POLICY "Polls select policy"
    ON public.polls FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER')
    );

DROP POLICY IF EXISTS "Poll responses insert policy" ON public.poll_responses;
CREATE POLICY "Poll responses insert policy"
    ON public.poll_responses FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Poll responses select policy" ON public.poll_responses;
CREATE POLICY "Poll responses select policy"
    ON public.poll_responses FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER')
    );

-- 14.11 SOCIAL MEDIA POSTS & AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Social media select policy" ON public.social_media_posts;
CREATE POLICY "Social media select policy"
    ON public.social_media_posts FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_auth_user_tenant_id()
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER')
    );

DROP POLICY IF EXISTS "Audit logs select policy" ON public.audit_logs;
CREATE POLICY "Audit logs select policy"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        (tenant_id = public.get_auth_user_tenant_id() AND public.get_auth_user_role() IN ('BARANGAY_ADMIN', 'SK_OFFICIAL'))
        OR public.get_auth_user_role() IN ('SUPER_ADMIN', 'FEDERATION_OBSERVER', 'LGU_AUDITOR')
    );
