ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_status_check;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('submitted', 'under_review', 'resolved', 'dismissed', 'flagged', 'spam', 'pending_review'));

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('pending', 'active', 'rejected', 'suspended', 'banned'));
