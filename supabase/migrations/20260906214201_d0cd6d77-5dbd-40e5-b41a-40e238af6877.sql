-- Assignment columns
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS assigned_notary_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS assigned_notary_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS appointments_assigned_notary_id_idx ON public.appointments(assigned_notary_id);
CREATE INDEX IF NOT EXISTS booking_requests_assigned_notary_id_idx ON public.booking_requests(assigned_notary_id);

-- Data API access for signed-in staff (RLS below decides which rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_requests TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.booking_requests TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Staff with full access: admin + employee
DROP POLICY IF EXISTS "Admins and employees manage appointments" ON public.appointments;
CREATE POLICY "Admins and employees manage appointments"
ON public.appointments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'));

DROP POLICY IF EXISTS "Admins and employees manage booking requests" ON public.booking_requests;
CREATE POLICY "Admins and employees manage booking requests"
ON public.booking_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'));

-- Notaries: only rows assigned to them, and they cannot reassign away from themselves
DROP POLICY IF EXISTS "Notaries read assigned appointments" ON public.appointments;
CREATE POLICY "Notaries read assigned appointments"
ON public.appointments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'notary') AND assigned_notary_id = auth.uid());

DROP POLICY IF EXISTS "Notaries update assigned appointments" ON public.appointments;
CREATE POLICY "Notaries update assigned appointments"
ON public.appointments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'notary') AND assigned_notary_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'notary') AND assigned_notary_id = auth.uid());

DROP POLICY IF EXISTS "Notaries read assigned booking requests" ON public.booking_requests;
CREATE POLICY "Notaries read assigned booking requests"
ON public.booking_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'notary') AND assigned_notary_id = auth.uid());

DROP POLICY IF EXISTS "Notaries update assigned booking requests" ON public.booking_requests;
CREATE POLICY "Notaries update assigned booking requests"
ON public.booking_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'notary') AND assigned_notary_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'notary') AND assigned_notary_id = auth.uid());

-- Admins may manage roles and profiles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;