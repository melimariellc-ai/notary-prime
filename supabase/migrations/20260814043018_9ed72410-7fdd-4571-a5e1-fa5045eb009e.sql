REVOKE ALL ON public.booking_requests FROM anon;
REVOKE ALL ON public.booking_requests FROM authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages booking requests" ON public.booking_requests;
CREATE POLICY "Service role manages booking requests"
  ON public.booking_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');