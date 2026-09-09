CREATE TABLE public.quote_status_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  status text NOT NULL,
  source text NOT NULL DEFAULT 'stripe',
  changed_by uuid REFERENCES auth.users(id),
  changed_by_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX quote_status_events_quote_id_idx ON public.quote_status_events (quote_id, created_at DESC);

GRANT SELECT ON public.quote_status_events TO authenticated;
GRANT ALL ON public.quote_status_events TO service_role;

ALTER TABLE public.quote_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view quote history"
  ON public.quote_status_events FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'employee'::public.app_role)
  );

CREATE POLICY "Staff can record quote history"
  ON public.quote_status_events FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'employee'::public.app_role)
  );