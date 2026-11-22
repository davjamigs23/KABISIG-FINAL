ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS resolution_number TEXT;
