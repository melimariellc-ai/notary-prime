// Client-safe types and rendering helpers for the editable email templates.

export type EmailTemplateType = "fixed" | "ai_instructions";

export type EmailTemplate = {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body: string;
  type: EmailTemplateType;
  description: string;
  placeholders: string[];
  sort_order: number;
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Replaces {{placeholder}} tokens. Unknown tokens are left untouched. */
export function fillPlaceholders(source: string, values: Record<string, string>): string {
  return source.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (match, key: string) => {
    const value = values[key.toLowerCase()];
    return value === undefined ? match : value;
  });
}

/** Turns the plain-text body into simple HTML paragraphs, linking bare URLs. */
export function bodyToHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split(/\n/).map((line) => {
        const escaped = escapeHtml(line);
        return escaped.replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" style="color:#8a6b2f;font-weight:bold">$1</a>',
        );
      });
      return `<p>${lines.join("<br/>")}</p>`;
    });
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
${paragraphs.join("\n")}
</div>`;
}

export function renderEmailTemplate(
  template: Pick<EmailTemplate, "subject" | "body">,
  values: Record<string, string>,
) {
  const subject = fillPlaceholders(template.subject, values).trim();
  const text = fillPlaceholders(template.body, values).trim();
  return { subject, text, html: bodyToHtml(text) };
}

/** Used for the Settings live preview, and as a safety net if the table is unreachable. */
export const SAMPLE_VALUES: Record<string, string> = {
  name: "Jordan Reyes",
  link: "https://enlivennotary.com/admin/set-password",
  business_name: "Enliven Notary",
  service_area: "the Dallas-Fort Worth Metroplex",
  contact_email: "info@enlivennotary.com",
  phone: "(469) 991-2777",
  service: "Mobile Notary — General Documents",
  preferred_date: "March 14 at 2:00 PM",
  location: "Mobile — 1200 Main St, Dallas, TX",
  contact_person: "Jordan Reyes",
  business: "Lakeside Title Company",
};

export const FALLBACK_TEMPLATES: Record<string, { name: string; subject: string; body: string }> = {
  notary_invite: {
    name: "Notary Invite",
    subject: "Welcome to the {{business_name}} Team!",
    body: `Hi {{name}},

Welcome to {{business_name}}! We're excited to have you on our team and look forward to working with you as we serve clients throughout {{service_area}}.

Your account is ready. To get started, click the link below to create your password and access your account.

{{link}}

Once you're signed in, you'll be able to view your assigned appointments, appointment details, and everything you need to complete your assignments.

If you have any questions or need assistance, please contact us at {{contact_email}}. We're always happy to help.

We're glad to have you with us and look forward to working together!

{{business_name}}`,
  },
  admin_invite: {
    name: "Employee/Admin Invite",
    subject: "Welcome to {{business_name}}!",
    body: `Hi {{name}},

We're excited to officially welcome you to {{business_name}}!

As part of our team, you'll play an important role in helping us manage our day to day operations and provide a smooth experience for both our clients and notaries.

Your account has been created. Please use the link below to set up your password and access the {{business_name}} admin portal.

{{link}}

Once you're signed in, you'll have access to the areas of the platform associated with your role. This may include managing appointments, coordinating with notaries, assisting clients, and supporting other daily operations.

If you have any questions while getting started, please reach out to us at {{contact_email}}.

We're excited to have you on the team and look forward to growing together!

{{business_name}}`,
  },
  quote_confirmation: {
    name: "Quote Request Confirmation",
    subject: "Your Appointment Request — {{business_name}}",
    body: `Thank you for choosing {{business_name}}. We've received your request with the following details:

Service: {{service}}
Preferred Date: {{preferred_date}}
Location: {{location}}

We'll review your request and reach out shortly to confirm availability, timing, and final pricing. During business hours, we typically respond within a few hours. Requests submitted after hours or on Sunday will be followed up on as soon as possible the next business day.

Need assistance in the meantime? Call or text us at {{phone}}.

We look forward to assisting you!

{{business_name}}
Mobile · Online · Trusted`,
  },
};
