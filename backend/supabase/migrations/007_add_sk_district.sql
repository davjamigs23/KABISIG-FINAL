-- Add operational SK districts without changing the existing legislative district field.
ALTER TABLE public.barangay
    ADD COLUMN IF NOT EXISTS sk_district text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.barangay'::regclass
          AND conname = 'barangay_sk_district_check'
    ) THEN
        ALTER TABLE public.barangay
            ADD CONSTRAINT barangay_sk_district_check
            CHECK (sk_district IN ('North', 'South', 'West', 'East'));
    END IF;
END;
$$;

UPDATE public.barangay
SET sk_district = 'North'
WHERE name IN (
    'Bagumbayan Norte', 'Bagumbayan Sur', 'Calauag', 'Liboton',
    'Peñafrancia', 'San Felipe', 'San Francisco', 'Santa Cruz'
);

UPDATE public.barangay
SET sk_district = 'South'
WHERE name IN (
    'Balatas', 'Concepcion Grande', 'Concepcion Pequeña',
    'Dayangdang', 'Tinago', 'Triangulo'
);

UPDATE public.barangay
SET sk_district = 'West'
WHERE name IN (
    'Abella', 'Dinaga', 'Igualdad Interior', 'Lerma',
    'Mabolo', 'Sabang', 'Tabuco'
);

UPDATE public.barangay
SET sk_district = 'East'
WHERE name IN (
    'Cararayan', 'Carolina', 'Del Rosario',
    'Pacol', 'Panicuason', 'San Isidro'
);

CREATE INDEX IF NOT EXISTS idx_barangay_sk_district
    ON public.barangay (sk_district);
