ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.resident_profile
  ADD COLUMN IF NOT EXISTS id_type TEXT,
  ADD COLUMN IF NOT EXISTS id_number TEXT,
  ADD COLUMN IF NOT EXISTS id_document_path TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.review_youth_bulk(
  p_user_ids UUID[],
  p_action TEXT,
  p_admin_id UUID,
  p_tenant_id UUID,
  p_review_payload JSONB,
  p_reason TEXT
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  status TEXT,
  verification_status TEXT,
  digital_youth_id TEXT,
  qr_code_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_count INTEGER;
  payload_count INTEGER;
  updated_count INTEGER;
BEGIN
  IF p_action NOT IN ('approve', 'reject') OR p_tenant_id IS NULL OR p_admin_id IS NULL
     OR p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RAISE EXCEPTION 'Invalid bulk youth review request.';
  END IF;

  SELECT count(*) INTO target_count
  FROM public.users AS u
  WHERE u.id = ANY(p_user_ids)
    AND u.tenant_id = p_tenant_id
    AND u.role_id = 4;

  IF target_count <> cardinality(p_user_ids) THEN
    RAISE EXCEPTION 'All selected users must be youth constituents in the specified Barangay.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users AS u
    WHERE u.id = ANY(p_user_ids)
      AND u.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active youth accounts cannot be included in bulk review.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.resident_profile AS rp
    WHERE rp.user_id = ANY(p_user_ids)
      AND rp.tenant_id = p_tenant_id
  ) <> target_count THEN
    RAISE EXCEPTION 'Every selected youth must have a resident profile.';
  END IF;

  IF p_action = 'approve' THEN
    IF jsonb_typeof(p_review_payload) <> 'array' THEN
      RAISE EXCEPTION 'Approval data is incomplete.';
    END IF;

    SELECT count(DISTINCT payload.user_id) INTO payload_count
    FROM jsonb_to_recordset(p_review_payload) AS payload(
      user_id UUID,
      digital_youth_id TEXT,
      qr_code_url TEXT
    )
    WHERE payload.user_id = ANY(p_user_ids)
      AND payload.digital_youth_id IS NOT NULL
      AND payload.qr_code_url IS NOT NULL;

    IF payload_count <> target_count OR EXISTS (
      SELECT 1
      FROM unnest(p_user_ids) AS selected(id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_review_payload) AS payload(
          user_id UUID,
          digital_youth_id TEXT,
          qr_code_url TEXT
        )
        WHERE payload.user_id = selected.id
      )
    ) THEN
      RAISE EXCEPTION 'Approval data does not match the selected youth accounts.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.resident_profile AS rp
      WHERE rp.user_id = ANY(p_user_ids)
        AND rp.tenant_id = p_tenant_id
        AND (rp.id_document_path IS NULL OR rp.verification_status = 'not_submitted')
    ) THEN
      RAISE EXCEPTION 'Each youth must have a submitted ID document before approval.';
    END IF;

    UPDATE public.resident_profile AS rp
    SET digital_youth_id = payload.digital_youth_id,
        qr_code_url = payload.qr_code_url,
        verification_status = 'verified',
        verification_notes = NULL,
        verification_reviewed_by = p_admin_id,
        verification_reviewed_at = now(),
        updated_at = now()
    FROM jsonb_to_recordset(p_review_payload) AS payload(
      user_id UUID,
      digital_youth_id TEXT,
      qr_code_url TEXT
    )
    WHERE rp.user_id = payload.user_id
      AND rp.tenant_id = p_tenant_id
      AND rp.user_id = ANY(p_user_ids);
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> target_count THEN
      RAISE EXCEPTION 'Failed to update every selected resident profile.';
    END IF;

    UPDATE public.users AS u
    SET status = 'active',
        approved_by = p_admin_id,
        rejection_reason = NULL,
        updated_at = now()
    WHERE u.id = ANY(p_user_ids)
      AND u.tenant_id = p_tenant_id
      AND u.role_id = 4;
  ELSE
    UPDATE public.resident_profile AS rp
    SET verification_status = 'rejected',
        verification_notes = p_reason,
        verification_reviewed_by = p_admin_id,
        verification_reviewed_at = now(),
        updated_at = now()
    WHERE rp.user_id = ANY(p_user_ids)
      AND rp.tenant_id = p_tenant_id;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> target_count THEN
      RAISE EXCEPTION 'Failed to update every selected resident profile.';
    END IF;

    UPDATE public.users AS u
    SET status = 'rejected',
        rejection_reason = p_reason,
        updated_at = now()
    WHERE u.id = ANY(p_user_ids)
      AND u.tenant_id = p_tenant_id
      AND u.role_id = 4;
  END IF;

  RETURN QUERY
  SELECT u.id, u.full_name, u.email, u.status, rp.verification_status, rp.digital_youth_id, rp.qr_code_url
  FROM public.users AS u
  JOIN public.resident_profile AS rp ON rp.user_id = u.id
  WHERE u.id = ANY(p_user_ids)
    AND u.tenant_id = p_tenant_id
    AND u.role_id = 4;
END;
$$;

REVOKE ALL ON FUNCTION public.review_youth_bulk(UUID[], TEXT, UUID, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_youth_bulk(UUID[], TEXT, UUID, UUID, JSONB, TEXT) TO service_role;
