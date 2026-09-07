CREATE TABLE public.inbound_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resend_email_id text NOT NULL UNIQUE,
  message_id text,
  from_email text NOT NULL,
  from_name text,
  to_emails text[] NOT NULL DEFAULT '{}'::text[],
  subject text,
  text_body text,
  html_body text,
  contact_id uuid REFERENCES public.business_contacts(id) ON DELETE SET NULL,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX inbound_emails_from_idx ON public.inbound_emails (lower(from_email));
CREATE INDEX inbound_emails_contact_idx ON public.inbound_emails (contact_id, received_at DESC);

GRANT SELECT ON public.inbound_emails TO authenticated;
GRANT ALL ON public.inbound_emails TO service_role;

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and employees read inbound emails"
  ON public.inbound_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'employee'::public.app_role));

CREATE POLICY "Service role manages inbound emails"
  ON public.inbound_emails FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);