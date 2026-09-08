CREATE TABLE public.crm_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('contact_type','pipeline_stage')),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (kind, label)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_options TO authenticated;
GRANT ALL ON public.crm_options TO service_role;

ALTER TABLE public.crm_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and employees read crm options"
  ON public.crm_options FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'employee'::public.app_role));

CREATE POLICY "Admins manage crm options"
  ON public.crm_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_crm_options_updated_at
  BEFORE UPDATE ON public.crm_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_options (kind, label, sort_order)
SELECT 'contact_type', e.enumlabel::text, (e.enumsortorder * 10)::int
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'bd_contact_type';

INSERT INTO public.crm_options (kind, label, sort_order)
SELECT 'pipeline_stage', e.enumlabel::text, (e.enumsortorder * 10)::int
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'bd_pipeline_stage';

ALTER TABLE public.business_contacts ALTER COLUMN contact_type DROP DEFAULT;
ALTER TABLE public.business_contacts ALTER COLUMN contact_type TYPE text USING contact_type::text;
ALTER TABLE public.business_contacts ALTER COLUMN contact_type SET DEFAULT 'Other Referral Source';

ALTER TABLE public.business_contacts ALTER COLUMN pipeline_stage DROP DEFAULT;
ALTER TABLE public.business_contacts ALTER COLUMN pipeline_stage TYPE text USING pipeline_stage::text;
ALTER TABLE public.business_contacts ALTER COLUMN pipeline_stage SET DEFAULT 'New Lead';