CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_email text,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_record_idx ON public.audit_log (table_name, record_id, changed_at DESC);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and employees read audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Service role manages audit log"
  ON public.audit_log FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_email text;
  skip_cols text[] := ARRAY['id', 'created_at', 'updated_at', 'submitted_at'];
  k text;
  old_v text;
  new_v text;
BEGIN
  BEGIN
    SELECT email INTO actor_email FROM public.profiles WHERE id = actor;
  EXCEPTION WHEN OTHERS THEN
    actor_email := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, changed_by_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'created', actor, actor_email);
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, changed_by_email)
    VALUES (TG_TABLE_NAME, OLD.id, 'deleted', actor, actor_email);
    RETURN NULL;
  END IF;

  FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
    CONTINUE WHEN k = ANY(skip_cols);
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

CREATE TRIGGER business_contacts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.business_contacts
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

CREATE TRIGGER appointments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();