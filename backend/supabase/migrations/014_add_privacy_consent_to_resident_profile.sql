ALTER TABLE public.resident_profile
    ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN NOT NULL DEFAULT false;
