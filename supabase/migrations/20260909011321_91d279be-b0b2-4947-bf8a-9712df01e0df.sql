UPDATE public.email_templates SET subject = 'Welcome to the {{business_name}} Team!', body = 'Hi {{name}},

Welcome aboard — we''re genuinely glad to have you as part of the {{business_name}} team.

Your experience and certification are exactly what makes this business able to serve the Dallas-Fort Worth area the way we do, and we''re excited to have you representing that with us.

Your account has been created. Click the button below to set up your password and access your account.

{{link}}

Once you''re in, you''ll be able to see your assigned appointments and everything you need to get started.

If anything is unclear or you run into any issues, reach out anytime at {{contact_email}} — we''re here to help you succeed.

Glad to have you with us,
{{business_name}}' WHERE template_key = 'notary_invite';

UPDATE public.email_templates SET subject = 'Welcome to {{business_name}}!', body = 'Hi {{name}},

We''re excited to officially welcome you to {{business_name}}!

As part of our team, you''ll play an important role in helping us manage our day-to-day operations and provide a smooth experience for both our clients and notaries.

Your account has been created. Please use the button below to set up your password and access the {{business_name}} admin portal.

{{link}}

Once you''re signed in, you''ll have access to the areas of the platform associated with your role. This may include managing appointments, coordinating with notaries, assisting clients, and supporting other daily operations.

If you have any questions while getting started, please reach out to us at {{contact_email}}.

We''re excited to have you on the team and look forward to growing together!

{{business_name}}' WHERE template_key = 'admin_invite';