// Branded, email-safe HTML wrapper for the welcome (invite) emails.
// The secure password-setup URL is never printed as text — it is only ever
// used as the href of the "Set Up Your Password" button.

import logoAsset from "@/assets/enliven-logo-gold.png.asset.json";
import { escapeHtml, fillPlaceholders } from "./email-templates";

const SITE_URL = "https://enlivennotary.com";
export const LOGO_URL = `${SITE_URL}${logoAsset.url}`;


const CHARCOAL = "#2b3244";
const GOLD = "#b08a3c";
const CREAM = "#f7f3ea";
const TEXT = "#22262f";
const MUTED = "#6b7280";

const LINK_TOKEN_RE = /^(?:\{\{\s*link\s*\}\}|\[link\]|https?:\/\/\S+)$/i;

function inlineText(line: string) {
  return escapeHtml(line).replace(
    /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi,
    `<a href="mailto:$1" style="color:${GOLD};text-decoration:underline">$1</a>`,
  );
}

function button(link: string) {
  const href = escapeHtml(link);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto">
<tr><td align="center" bgcolor="${GOLD}" style="border-radius:8px">
<a href="${href}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:20px;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${GOLD};mso-padding-alt:0">Set Up Your Password</a>
</td></tr></table>
<p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};text-align:center">This secure link is personal to you. For your security, please don't forward this email.</p>`;
}

/**
 * Renders an invite template into branded HTML plus a plain-text version.
 * `values.link` is the Supabase recovery link, used only as the button href.
 */
export function renderInviteEmail(
  template: { subject: string; body: string },
  values: Record<string, string>,
) {
  const link = values.link ?? "";
  const subject = fillPlaceholders(template.subject, values).trim();
  const filled = fillPlaceholders(template.body, { ...values, link: "{{link}}" }).trim();

  const blocks = filled
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const bodyHtml = blocks
    .map((block) => {
      if (LINK_TOKEN_RE.test(block)) return button(link);
      const lines = block.split(/\n/).map(inlineText).join("<br/>");
      return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:${TEXT}">${lines}</p>`;
    })
    .join("\n");

  const businessName = values.business_name || "Enliven Notary";
  const contactEmail = values.contact_email || "info@enlivennotary.com";

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Set up your ${escapeHtml(businessName)} password to access your account.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e7e0d1">
  <tr><td align="center" bgcolor="${CHARCOAL}" style="background-color:${CHARCOAL};padding:32px 24px">
    <img src="${LOGO_URL}" width="150" alt="${escapeHtml(businessName)}" style="display:block;width:150px;max-width:70%;height:auto;border:0;margin:0 auto"/>
    <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d8c9a3">Mobile &middot; Online &middot; Trusted</p>
  </td></tr>
  <tr><td height="4" style="height:4px;background-color:${GOLD};font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:32px 32px 24px">
${bodyHtml}
  </td></tr>
  <tr><td style="padding:0 32px 32px">
    <p style="margin:0;padding-top:20px;border-top:1px solid #ece5d6;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:22px;color:${MUTED};text-align:center">
      ${escapeHtml(businessName)} &middot; Serving the Dallas&ndash;Fort Worth Metroplex<br/>
      <a href="mailto:${escapeHtml(contactEmail)}" style="color:${GOLD};text-decoration:underline">${escapeHtml(contactEmail)}</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = blocks
    .map((block) =>
      LINK_TOKEN_RE.test(block)
        ? 'Use the "Set Up Your Password" button in this email to create your password.'
        : block,
    )
    .join("\n\n");

  return { subject, html, text };
}
