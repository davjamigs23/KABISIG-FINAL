-- Persists the program allocation entered by authorized officials.
ALTER TABLE public.program
  ADD COLUMN IF NOT EXISTS budget_allocation NUMERIC(14,2) NOT NULL DEFAULT 0
  CHECK (budget_allocation >= 0);
