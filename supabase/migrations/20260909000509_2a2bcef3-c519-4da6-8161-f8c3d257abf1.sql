CREATE OR REPLACE FUNCTION public.record_activity_audit_log()
 RETURNS TRIGGER
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor uuid := auth.uid();
  actor_email text;
  k text;
  old_v text;
  new_v text;
BEGIN
  BEGIN
    SELECT email INTO actor_email FROM public.profiles WHERE id = actor;
    IF actor_email IS NULL THEN
      SELECT email INTO actor_email FROM auth.users WHERE id = actor;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    actor_email := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, field_name, old_value, changed_by, changed_by_email)
    VALUES (
      TG_TABLE_NAME, OLD.contact_id, 'deleted', 'activity',
      OLD.activity_type::text || ' · ' || OLD.activity_date::text || ' · ' || OLD.description,
      actor, actor_email
    );
    RETURN NULL;
  END IF;

  FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
    CONTINUE WHEN k IN ('id', 'created_at', 'updated_at', 'contact_id', 'created_by');
    old_v := to_jsonb(OLD) ->> k;
    new_v := to_jsonb(NEW) ->> k;
    IF old_v IS DISTINCT FROM new_v THEN
      INSERT INTO public.audit_log (table_name, record_id, action, field_name, old_value, new_value, changed_by, changed_by_email)
      VALUES (TG_TABLE_NAME, NEW.contact_id, 'updated', k, old_v, new_v, actor, actor_email);
    END IF;
  END LOOP;

  RETURN NULL;
END;
$function$;

UPDATE public.audit_log al
SET record_id = ca.contact_id
FROM public.contact_activities ca
WHERE al.table_name = 'contact_activities' AND al.record_id = ca.id;

UPDATE public.audit_log al
SET changed_by_email = u.email
FROM auth.users u
WHERE al.changed_by = u.id AND al.changed_by_email IS NULL;