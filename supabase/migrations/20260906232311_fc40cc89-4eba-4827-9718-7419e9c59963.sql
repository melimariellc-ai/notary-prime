ALTER TABLE public.appointments
  ADD COLUMN referred_by uuid REFERENCES public.business_contacts(id) ON DELETE SET NULL,
  ADD COLUMN fee_amount numeric(10,2);

CREATE INDEX appointments_referred_by_idx ON public.appointments (referred_by);

ALTER TABLE public.business_contacts DROP COLUMN total_jobs_referred;

SELECT cron.schedule(
  'crm-followup-digest',
  '0 13 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--596f7b36-75b5-4578-bce2-d99d4df579c9.lovable.app/api/public/crm-followup-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);