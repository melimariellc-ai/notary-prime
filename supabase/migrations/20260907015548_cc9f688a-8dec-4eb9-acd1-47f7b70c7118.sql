ALTER TABLE public.appointments
  ADD COLUMN sms_dismissed_at timestamp with time zone,
  ADD COLUMN sms_dismissed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX appointments_sms_failed_idx
  ON public.appointments (sms_status, sms_dismissed_at);