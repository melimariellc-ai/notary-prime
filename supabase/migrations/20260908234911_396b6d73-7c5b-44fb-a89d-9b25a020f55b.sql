CREATE OR REPLACE FUNCTION public.record_activity_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_email text;
  k text;
  old_v text;
  new_v text;
BEGIN
  BEGIN
    SELECT email INTO actor_email FROM public.profiles WHERE id = actor;
  EXCEPTION WHEN OTHERS THEN
    actor_email := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, field_name, old_value, changed_by, changed_by_email)
    VALUES (
      TG_TABLE_NAME, OLD.id, 'deleted', 'activity',
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
      VALUES (TG_TABLE_NAME, NEW.id, 'updated', k, old_v, new_v, actor, actor_email);
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS contact_activities_audit ON public.contact_activities;
CREATE TRIGGER contact_activities_audit
AFTER UPDATE OR DELETE ON public.contact_activities
FOR EACH ROW EXECUTE FUNCTION public.record_activity_audit_log();