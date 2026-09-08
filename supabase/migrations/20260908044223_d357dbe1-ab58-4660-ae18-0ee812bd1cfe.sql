INSERT INTO public.email_templates (template_key, name, subject, body, type, description, placeholders, sort_order) VALUES
(
  'outreach_instructions',
  'AI Outreach Instructions',
  '',
  '- Genuine and specific to what is known above; never generic filler.
- Reference the credentials only where they read naturally, not as a list.
- Speak to how mobile and online notary work matters to this kind of business.
- Invite them to reach out or keep {{business_name}} in mind for future notary needs.
- 120-200 words, plain text, no markdown.
- Start with a ''Subject: ...'' line, then a blank line, then the email body.
- Sign off as the {{business_name}} team with the phone and email above.
- Output only the email. No commentary.',
  'ai_instructions',
  'Default guidance the AI follows for every outreach email. Each email is still written fresh from that contact''s own stored details.',
  ARRAY['business_name'],
  4
);