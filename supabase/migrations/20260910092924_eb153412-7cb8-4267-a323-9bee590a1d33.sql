DROP POLICY IF EXISTS "Signed-in staff can view readiness checks" ON public.readiness_checks;
CREATE POLICY "Staff can view readiness checks"
  ON public.readiness_checks FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'employee'));

DROP POLICY IF EXISTS "Signed-in staff can read website chat engagement" ON public.site_chat_events;
CREATE POLICY "Staff can read website chat engagement"
  ON public.site_chat_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'employee'));