CREATE OR REPLACE FUNCTION public.transfer_chairperson(
    p_barangay_id UUID,
    p_outgoing_user_id UUID,
    p_successor_user_id UUID,
    p_successor_email TEXT,
    p_successor_full_name TEXT,
    p_create_successor_record BOOLEAN,
    p_admin_id UUID,
    p_admin_email TEXT,
    p_reason TEXT,
    p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    outgoing_user public.users%ROWTYPE;
    successor_user public.users%ROWTYPE;
    transfer_id UUID;
BEGIN
    PERFORM 1
    FROM public.barangay
    WHERE id = p_barangay_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barangay not found.';
    END IF;

    SELECT *
    INTO outgoing_user
    FROM public.users
    WHERE id = p_outgoing_user_id
      AND tenant_id = p_barangay_id
      AND role_id = 2
      AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active outgoing Chairperson was found.';
    END IF;

    IF p_successor_user_id = p_outgoing_user_id THEN
        RAISE EXCEPTION 'Successor cannot be the outgoing Chairperson.';
    END IF;

    IF p_successor_user_id IS NULL AND p_create_successor_record THEN
        RAISE EXCEPTION 'A successor user ID is required to create a successor record.';
    END IF;

    IF p_create_successor_record
       AND NULLIF(btrim(p_successor_email), '') IS NULL THEN
        RAISE EXCEPTION 'A successor email is required to create a successor record.';
    END IF;

    IF p_successor_user_id IS NOT NULL AND p_create_successor_record THEN
        INSERT INTO public.users (
            id,
            tenant_id,
            role_id,
            full_name,
            email,
            status,
            approved_by,
            official_role,
            setup_completed,
            created_at,
            updated_at
        )
        VALUES (
            p_successor_user_id,
            p_barangay_id,
            4,
            COALESCE(NULLIF(p_successor_full_name, ''), 'Pending Invitation'),
            p_successor_email,
            'pending',
            p_admin_id,
            NULL,
            false,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id,
            role_id = 4,
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            status = 'pending',
            approved_by = EXCLUDED.approved_by,
            setup_completed = false,
            updated_at = now();
    END IF;

    IF p_successor_user_id IS NOT NULL THEN
        SELECT *
        INTO successor_user
        FROM public.users
        WHERE id = p_successor_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Successor public user record was not found.';
        END IF;

        IF successor_user.role_id = 2
           AND successor_user.status = 'active'
           AND successor_user.tenant_id IS DISTINCT FROM p_barangay_id THEN
            RAISE EXCEPTION 'Successor is already an active Chairperson in another Barangay.';
        END IF;
    END IF;

    UPDATE public.users
    SET role_id = 4,
        status = 'pending',
        full_name = regexp_replace(full_name, '^Hon\.[[:space:]]+', '', 'i'),
        is_demoted = true,
        has_edited_profile = false,
        updated_at = now()
    WHERE id = p_outgoing_user_id;

    UPDATE public.resident_profile
    SET verification_status = 'pending',
        updated_at = now()
    WHERE user_id = p_outgoing_user_id;

    IF p_successor_user_id IS NOT NULL THEN
        UPDATE public.users
        SET tenant_id = p_barangay_id,
            role_id = 2,
            status = 'pending',
            official_role = 'SK Chairperson',
            setup_completed = false,
            approved_by = p_admin_id,
            updated_at = now()
        WHERE id = p_successor_user_id;
    END IF;

    INSERT INTO public.chairperson_transfers (
        barangay_id,
        outgoing_user_id,
        outgoing_email,
        outgoing_full_name,
        incoming_user_id,
        incoming_email,
        incoming_full_name,
        reason,
        notes,
        previous_role_action,
        performed_by,
        performed_by_email
    )
    VALUES (
        p_barangay_id,
        outgoing_user.id,
        outgoing_user.email,
        outgoing_user.full_name,
        p_successor_user_id,
        p_successor_email,
        COALESCE(successor_user.full_name, p_successor_full_name),
        p_reason,
        'Succession Notes: ' || COALESCE(NULLIF(p_notes, ''), 'None') || '. Reason: ' || p_reason,
        'DEMOTED_TO_YOUTH_CONSTITUENT',
        p_admin_id,
        p_admin_email
    )
    RETURNING id INTO transfer_id;

    RETURN transfer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_chairperson(
    UUID, UUID, UUID, TEXT, TEXT, BOOLEAN, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.transfer_chairperson(
    UUID, UUID, UUID, TEXT, TEXT, BOOLEAN, UUID, TEXT, TEXT, TEXT
) TO service_role;

NOTIFY pgrst, 'reload schema';
