CREATE OR REPLACE FUNCTION public.check_resident_age()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    resident_role_id INT;
    calculated_age INT;
BEGIN
    SELECT role_id
    INTO resident_role_id
    FROM public.users
    WHERE id = NEW.user_id;

    IF resident_role_id = 4 THEN
        calculated_age := DATE_PART('year', AGE(NEW.birthdate));
        IF calculated_age < 15 OR calculated_age > 30 THEN
            RAISE EXCEPTION 'Youth Constituent age must be between 15 and 30 years old. Submitted age: %', calculated_age;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_resident_age ON public.resident_profile;
CREATE TRIGGER trg_check_resident_age
    BEFORE INSERT OR UPDATE ON public.resident_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.check_resident_age();
