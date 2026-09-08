-- 1. Restrict reading role assignments to the user's own rows (admins keep full
--    access through the existing "Admins manage roles" ALL policy).
DROP POLICY IF EXISTS "Authenticated can read roles" ON public.user_roles;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Move the role-check helper out of the API-exposed schema so it can no longer
--    be called directly through the Data API, while RLS policies keep working.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. Duplicate lookup no longer runs with elevated privileges; it now reads
--    business_contacts as the caller, under row-level security.
CREATE OR REPLACE FUNCTION public.find_similar_contacts(_names text[], _phones text[], _threshold real DEFAULT 0.8)
 RETURNS TABLE(input_index integer, id uuid, business_name text, phone text, name_score real, phone_score real, reason text)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH inputs AS (
    SELECT
      i AS input_index,
      public.normalize_business_name(_names[i]) AS want_name,
      regexp_replace(coalesce(_phones[i], ''), '\D', '', 'g') AS want_phone
    FROM generate_subscripts(_names, 1) AS i
  ),
  scored AS (
    SELECT
      inp.input_index,
      c.id,
      c.business_name,
      c.phone,
      CASE
        WHEN inp.want_name = '' THEN 0::real
        ELSE greatest(
          extensions.similarity(public.normalize_business_name(c.business_name), inp.want_name),
          extensions.similarity(
            replace(public.normalize_business_name(c.business_name), ' ', ''),
            replace(inp.want_name, ' ', '')
          )
        )
      END AS name_score,
      CASE
        WHEN length(inp.want_phone) >= 10
             AND length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 10
        THEN extensions.similarity(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), inp.want_phone)
        ELSE 0::real
      END AS phone_score
    FROM inputs inp
    CROSS JOIN public.business_contacts c
    WHERE private.has_role(auth.uid(), 'admin'::public.app_role)
       OR private.has_role(auth.uid(), 'employee'::public.app_role)
  )
  SELECT
    s.input_index,
    s.id,
    s.business_name,
    s.phone,
    s.name_score,
    s.phone_score,
    CASE WHEN s.name_score >= _threshold THEN 'name' ELSE 'phone' END AS reason
  FROM scored s
  WHERE s.name_score >= _threshold OR s.phone_score >= _threshold
  ORDER BY s.input_index, greatest(s.name_score, s.phone_score) DESC
$function$;

REVOKE ALL ON FUNCTION public.find_similar_contacts(text[], text[], real) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_similar_contacts(text[], text[], real) TO authenticated, service_role;

-- 4. Internal queue/audit helpers must never be reachable from the Data API.
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated, PUBLIC;