ALTER TABLE public.business_profile
  ADD COLUMN default_referral_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN default_referral_rate_type text NOT NULL DEFAULT 'percent';

ALTER TABLE public.business_profile
  ADD CONSTRAINT business_profile_rate_type_check CHECK (default_referral_rate_type IN ('percent', 'flat'));

ALTER TABLE public.business_contacts
  ADD COLUMN referral_rate numeric,
  ADD COLUMN referral_rate_type text;

ALTER TABLE public.business_contacts
  ADD CONSTRAINT business_contacts_rate_type_check CHECK (referral_rate_type IS NULL OR referral_rate_type IN ('percent', 'flat'));