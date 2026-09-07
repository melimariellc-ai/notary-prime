CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS business_contacts_business_name_trgm
  ON public.business_contacts USING gin (lower(business_name) extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.find_similar_contacts(
  _names text[],
  _phones text[],
  _threshold real DEFAULT 0.8
)
RETURNS TABLE (
  input_index int,
  id uuid,
  business_name text,
  phone text,
  name_score real,
  phone_score real,
  reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH inputs AS (
    SELECT
      i AS input_index,
      lower(btrim(coalesce(_names[i], ''))) AS want_name,
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
        ELSE extensions.similarity(lower(btrim(c.business_name)), inp.want_name)
      END AS name_score,
      CASE
        WHEN length(inp.want_phone) >= 10
             AND length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 10
        THEN extensions.similarity(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), inp.want_phone)
        ELSE 0::real
      END AS phone_score
    FROM inputs inp
    CROSS JOIN public.business_contacts c
    WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'employee'::public.app_role)
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
$$;

REVOKE ALL ON FUNCTION public.find_similar_contacts(text[], text[], real) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_similar_contacts(text[], text[], real) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_contacts(text[], text[], real) TO service_role;