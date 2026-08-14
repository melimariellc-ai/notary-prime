CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service text NOT NULL,
  meeting_type text NOT NULL,
  address text,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  notes text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages appointments"
ON public.appointments FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');