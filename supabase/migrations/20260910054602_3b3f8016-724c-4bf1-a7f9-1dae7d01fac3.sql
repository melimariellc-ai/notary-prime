CREATE TABLE public.appointment_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inbound_email_id UUID REFERENCES public.inbound_emails(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.business_contacts(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  raw_body TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  service TEXT,
  meeting_type TEXT,
  address TEXT,
  preferred_date TEXT,
  preferred_time TEXT,
  notes TEXT,
  found_fields TEXT[] NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  ai_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointment_drafts_status_check CHECK (status IN ('pending_review','approved','rejected'))
);

CREATE UNIQUE INDEX appointment_drafts_inbound_email_idx ON public.appointment_drafts (inbound_email_id) WHERE inbound_email_id IS NOT NULL;
CREATE INDEX appointment_drafts_status_idx ON public.appointment_drafts (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_drafts TO authenticated;
GRANT ALL ON public.appointment_drafts TO service_role;

ALTER TABLE public.appointment_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and employees manage appointment drafts"
  ON public.appointment_drafts FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','employee')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','employee')));

CREATE TRIGGER update_appointment_drafts_updated_at
  BEFORE UPDATE ON public.appointment_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();