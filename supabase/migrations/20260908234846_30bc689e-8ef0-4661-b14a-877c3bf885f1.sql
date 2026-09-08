DROP TRIGGER IF EXISTS contact_activities_audit ON public.contact_activities;
CREATE TRIGGER contact_activities_audit
AFTER UPDATE OR DELETE ON public.contact_activities
FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();