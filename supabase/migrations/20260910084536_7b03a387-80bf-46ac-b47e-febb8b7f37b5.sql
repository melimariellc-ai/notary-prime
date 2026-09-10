CREATE TABLE public.site_chat_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('opened','conversation_started')),
  page_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX site_chat_events_created_at_idx ON public.site_chat_events (created_at DESC);
CREATE UNIQUE INDEX site_chat_events_session_type_idx ON public.site_chat_events (session_id, event_type);
GRANT SELECT ON public.site_chat_events TO authenticated;
GRANT ALL ON public.site_chat_events TO service_role;
ALTER TABLE public.site_chat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in staff can read website chat engagement"
  ON public.site_chat_events FOR SELECT TO authenticated USING (true);