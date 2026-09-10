ALTER TABLE public.business_profile
  ADD COLUMN IF NOT EXISTS readiness_check_hours integer NOT NULL DEFAULT 24;

CREATE TABLE public.readiness_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.business_contacts(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  to_address text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
  error_message text,
  sent_at timestamp with time zone,
  reply_text text,
  replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX readiness_checks_appointment_key ON public.readiness_checks (appointment_id);
CREATE INDEX readiness_checks_to_address_idx ON public.readiness_checks (to_address);

GRANT SELECT ON public.readiness_checks TO authenticated;
GRANT ALL ON public.readiness_checks TO service_role;

ALTER TABLE public.readiness_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in staff can view readiness checks"
  ON public.readiness_checks FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_readiness_checks_updated_at
  BEFORE UPDATE ON public.readiness_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

SELECT cron.schedule(
  'appointment-readiness-check',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--596f7b36-75b5-4578-bce2-d99d4df579c9.lovable.app/api/public/appointment-readiness-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);