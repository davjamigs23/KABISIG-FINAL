ALTER TABLE public.resident_profile
  ADD COLUMN IF NOT EXISTS scholarship_type TEXT;
