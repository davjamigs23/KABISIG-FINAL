-- Add the AIP reference code captured by the program creation forms.
-- Additive and safe to apply to existing program records.
ALTER TABLE public.program
    ADD COLUMN IF NOT EXISTS aip_reference TEXT;

NOTIFY pgrst, 'reload schema';
