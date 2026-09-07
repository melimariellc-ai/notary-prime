CREATE TYPE public.custom_field_type AS ENUM ('text', 'number', 'date', 'dropdown');

CREATE TABLE public.contact_field_defs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key text NOT NULL UNIQUE,
  label text NOT NULL,
  field_type public.custom_field_type NOT NULL DEFAULT 'text',
  options text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_field_defs TO authenticated;
GRANT ALL ON public.contact_field_defs TO service_role;

ALTER TABLE public.contact_field_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and employees read custom field defs"
  ON public.contact_field_defs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'employee'::public.app_role));

CREATE POLICY "Admins manage custom field defs"
  ON public.contact_field_defs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_contact_field_defs_updated_at
  BEFORE UPDATE ON public.contact_field_defs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.business_contacts
  ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;