INSERT INTO public.email_templates (template_key, name, subject, body, type, description, placeholders, sort_order) VALUES
(
  'outreach_fallback',
  'Outreach Fallback',
  'Notary support for [Business Name]',
  'Hi [Contact Person],

My name is [Business Name] — we provide mobile and remote online notary services throughout [Service Area], including evenings and weekends.

I wanted to introduce ourselves in case notarizations ever come up for your clients or your team. We travel to homes, offices, hospitals, and care facilities, and we can also handle signings online when that is easier. We are a Texas commissioned, bonded, and insured notary practice, so documents are handled carefully the first time.

If it would help to have a reliable notary on call, I would be glad to be that person for you. Just reply to this email or call or text us at [Phone].

Thank you for your time, and we hope to work together soon.

[Business Name]
[Phone] · [Contact Email]',
  'fixed',
  'A ready-to-send generic outreach email you can use instead of waiting for an AI-written draft.',
  ARRAY['Contact Person', 'Business Name', 'Service Area', 'Phone', 'Contact Email'],
  5
);