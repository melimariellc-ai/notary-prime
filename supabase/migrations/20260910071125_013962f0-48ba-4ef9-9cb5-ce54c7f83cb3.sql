ALTER TABLE public.business_profile ADD COLUMN IF NOT EXISTS service_pricing jsonb NOT NULL DEFAULT '[{"label":"Mobile Standard","price":"$100"},{"label":"Same-Day/Urgent","price":"$135"},{"label":"RON (Remote Online Notarization)","price":"$75"},{"label":"Loan Signing","price":"$250+"}]'::jsonb;

UPDATE public.business_profile
SET service_pricing = '[{"label":"Mobile Standard","price":"$100"},{"label":"Same-Day/Urgent","price":"$135"},{"label":"RON (Remote Online Notarization)","price":"$75"},{"label":"Loan Signing","price":"$250+"}]'::jsonb
WHERE id = 1 AND (service_pricing IS NULL OR jsonb_array_length(service_pricing) = 0);