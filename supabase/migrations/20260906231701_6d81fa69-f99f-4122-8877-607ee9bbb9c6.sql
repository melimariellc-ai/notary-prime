CREATE TYPE public.bd_contact_type AS ENUM ('Title Company','Real Estate Agent','Attorney','Other Referral Source');
CREATE TYPE public.bd_pipeline_stage AS ENUM ('New Lead','Contacted','Meeting Scheduled','Active Referral Source','Inactive');
CREATE TYPE public.bd_activity_type AS ENUM ('Call','Email','Meeting','Note');

CREATE TABLE public.business_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name text NOT NULL,
  contact_person text,
  contact_type public.bd_contact_type NOT NULL DEFAULT 'Other Referral Source',
  phone text,
  email text,
  pipeline_stage public.bd_pipeline_stage NOT NULL DEFAULT 'New Lead',
  first_contacted_date date,
  next_follow_up_date date,
  referral_source text,
  total_jobs_referred integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_contacts TO authenticated;
GRANT ALL ON public.business_contacts TO service_role;

ALTER TABLE public.business_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and employees manage business contacts"
ON public.business_contacts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'));

CREATE TRIGGER update_business_contacts_updated_at
BEFORE UPDATE ON public.business_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX business_contacts_follow_up_idx ON public.business_contacts (next_follow_up_date);
CREATE INDEX business_contacts_stage_idx ON public.business_contacts (pipeline_stage);

CREATE TABLE public.contact_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.business_contacts(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  activity_type public.bd_activity_type NOT NULL DEFAULT 'Note',
  description text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_activities TO authenticated;
GRANT ALL ON public.contact_activities TO service_role;

ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and employees manage contact activities"
ON public.contact_activities FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'));

CREATE TRIGGER update_contact_activities_updated_at
BEFORE UPDATE ON public.contact_activities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX contact_activities_contact_idx ON public.contact_activities (contact_id, activity_date DESC);