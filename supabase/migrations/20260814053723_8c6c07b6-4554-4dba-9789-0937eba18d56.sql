CREATE OR REPLACE FUNCTION public.notify_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://project--596f7b36-75b5-4578-bce2-d99d4df579c9.lovable.app/api/public/appointment-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := jsonb_build_object('record', to_jsonb(NEW))
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_appointment failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_new_appointment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_new_appointment() TO service_role;

DROP TRIGGER IF EXISTS appointments_notify_insert ON public.appointments;
CREATE TRIGGER appointments_notify_insert
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_new_appointment();