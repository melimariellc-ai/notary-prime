CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'fixed',
  description text NOT NULL DEFAULT '',
  placeholders text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_type_check CHECK (type IN ('fixed', 'ai_instructions'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view email templates"
  ON public.email_templates FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'employee'::public.app_role));

CREATE POLICY "Admins can change email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_templates (template_key, name, subject, body, type, description, placeholders, sort_order) VALUES
(
  'notary_invite',
  'Notary Invite',
  'Welcome to the {{business_name}} Team!',
  'Hi {{name}},

Welcome to {{business_name}}! We''re excited to have you on our team and look forward to working with you as we serve clients throughout {{service_area}}.

Your account is ready. To get started, click the link below to create your password and access your account.

{{link}}

Once you''re signed in, you''ll be able to view your assigned appointments, appointment details, and everything you need to complete your assignments.

If you have any questions or need assistance, please contact us at {{contact_email}}. We''re always happy to help.

We''re glad to have you with us and look forward to working together!

{{business_name}}',
  'fixed',
  'Sent automatically when a new Notary account is created.',
  ARRAY['name', 'link', 'business_name', 'service_area', 'contact_email'],
  1
),
(
  'admin_invite',
  'Employee/Admin Invite',
  'Welcome to {{business_name}}!',
  'Hi {{name}},

We''re excited to officially welcome you to {{business_name}}!

As part of our team, you''ll play an important role in helping us manage our day to day operations and provide a smooth experience for both our clients and notaries.

Your account has been created. Please use the link below to set up your password and access the {{business_name}} admin portal.

{{link}}

Once you''re signed in, you''ll have access to the areas of the platform associated with your role. This may include managing appointments, coordinating with notaries, assisting clients, and supporting other daily operations.

If you have any questions while getting started, please reach out to us at {{contact_email}}.

We''re excited to have you on the team and look forward to growing together!

{{business_name}}',
  'fixed',
  'Sent automatically when a new Employee or Admin account is created.',
  ARRAY['name', 'link', 'business_name', 'contact_email'],
  2
),
(
  'quote_confirmation',
  'Quote Request Confirmation',
  'Your Appointment Request — {{business_name}}',
  'Thank you for choosing {{business_name}}. We''ve received your request with the following details:

Service: {{service}}
Preferred Date: {{preferred_date}}
Location: {{location}}

We''ll review your request and reach out shortly to confirm availability, timing, and final pricing. During business hours, we typically respond within a few hours. Requests submitted after hours or on Sunday will be followed up on as soon as possible the next business day.

Need assistance in the meantime? Call or text us at {{phone}}.

We look forward to assisting you!

{{business_name}}
Mobile · Online · Trusted',
  'fixed',
  'Sent to the customer right after they submit a booking or quote request.',
  ARRAY['business_name', 'service', 'preferred_date', 'location', 'phone'],
  3
);