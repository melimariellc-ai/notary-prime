ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS sms_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sms_error text,
  ADD COLUMN IF NOT EXISTS sms_sent_at timestamp with time zone;