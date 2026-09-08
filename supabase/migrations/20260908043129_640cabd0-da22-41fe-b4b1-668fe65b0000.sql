CREATE TABLE public.business_profile (
  id integer PRIMARY KEY DEFAULT 1,
  business_name text NOT NULL DEFAULT 'Enliven Notary',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  service_area text NOT NULL DEFAULT '',
  is_texas_commissioned boolean NOT NULL DEFAULT true,
  is_bonded boolean NOT NULL DEFAULT true,
  eo_insured_amount text NOT NULL DEFAULT '',
  is_nna_certified boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT business_profile_single_row CHECK (id = 1)
);

GRANT SELECT ON public.business_profile TO authenticated;
GRANT ALL ON public.business_profile TO service_role;

ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and employees read business profile"
  ON public.business_profile FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'employee'::public.app_role));

CREATE POLICY "Admins manage business profile"
  ON public.business_profile FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_business_profile_updated_at
  BEFORE UPDATE ON public.business_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.business_profile (id, business_name, phone, email, service_area, eo_insured_amount)
VALUES (1, 'Enliven Notary', '(469) 991-2777', 'info@enlivennotary.com', 'Dallas-Fort Worth Metroplex', '$100,000')
ON CONFLICT (id) DO NOTHING;