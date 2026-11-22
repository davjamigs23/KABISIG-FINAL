ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_document_type_check;

UPDATE public.documents
SET document_type = CASE
  WHEN LOWER(BTRIM(document_type)) IN ('resolution', 'resolutions', 'ordinance', 'ordinances') THEN 'Resolutions'
  WHEN LOWER(BTRIM(document_type)) IN ('minute', 'minutes', 'meeting minutes') THEN 'Minutes'
  WHEN LOWER(BTRIM(document_type)) IN ('voucher', 'vouchers', 'liquidation', 'transmittal', 'transmittals') THEN 'Vouchers'
  ELSE 'Reports'
END
WHERE document_type NOT IN ('Resolutions', 'Minutes', 'Reports', 'Vouchers');

ALTER TABLE public.documents
  ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN ('Resolutions', 'Minutes', 'Reports', 'Vouchers'));
