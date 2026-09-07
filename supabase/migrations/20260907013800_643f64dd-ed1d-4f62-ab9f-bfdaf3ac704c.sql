REVOKE ALL ON FUNCTION public.record_audit_log() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_audit_log() FROM anon;
REVOKE ALL ON FUNCTION public.record_audit_log() FROM authenticated;