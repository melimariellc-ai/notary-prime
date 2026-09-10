import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Replying to a received email straight from Mail Activity. Sending goes through
 * the same Resend sender/reply-to pair every other outbound email uses, so any
 * further reply keeps landing in the monitored replies inbox.
 */

function uuid(value: unknown): string {
  const s = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Invalid id.");
  return s;
}

async function canReply(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    console.error("Failed to read roles", error);
    return false;
  }
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.includes("admin") || roles.includes("employee");
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type InboundEmailDetail = {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  body: string;
  receivedAt: string;
  contactId: string | null;
};

export const getInboundEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { inboundEmailId: string }) => ({ inboundEmailId: uuid(data.inboundEmailId) }))
  .handler(async ({ data, context }) => {
    if (!(await canReply(context.supabase, context.userId)))
      return { ok: false as const, message: "You do not have access to reply to email." };

    const { data: row, error } = await context.supabase
      .from("inbound_emails")
      .select("id, from_email, from_name, subject, text_body, html_body, received_at, contact_id")
      .eq("id", data.inboundEmailId)
      .maybeSingle();

    if (error || !row) return { ok: false as const, message: "Could not load that email." };

    const body =
      String(row.text_body ?? "").trim() ||
      String(row.html_body ?? "")
        .replace(/<\s*(br|\/p|\/div|\/tr)\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const email: InboundEmailDetail = {
      id: String(row.id),
      fromEmail: String(row.from_email),
      fromName: row.from_name ? String(row.from_name) : null,
      subject: row.subject ? String(row.subject) : null,
      body,
      receivedAt: String(row.received_at),
      contactId: row.contact_id ? String(row.contact_id) : null,
    };

    return { ok: true as const, email };
  });

/**
 * Optional helper: drafts a suggested reply with Claude, using the same business
 * voice guidance as outreach drafting. Never sends anything — the text lands in
 * the reply box as an ordinary editable draft.
 */
export const generateMailReplyDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { inboundEmailId: string; extraInstructions?: string }) => ({
    inboundEmailId: uuid(data.inboundEmailId),
    extraInstructions: String(data.extraInstructions ?? "").trim().slice(0, 1500),
  }))
  .handler(async ({ data, context }) => {
    if (!(await canReply(context.supabase, context.userId)))
      return { ok: false as const, message: "You do not have access to reply to email." };

    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) return { ok: false as const, message: "AI drafting isn't set up yet." };

    const { data: row, error } = await context.supabase
      .from("inbound_emails")
      .select("id, from_email, from_name, subject, text_body, html_body, contact_id")
      .eq("id", data.inboundEmailId)
      .maybeSingle();
    if (error || !row) return { ok: false as const, message: "Could not load that email." };

    const original =
      String(row.text_body ?? "").trim() ||
      String(row.html_body ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    let contact: {
      business_name?: string;
      contact_person?: string | null;
      contact_type?: string;
      pipeline_stage?: string;
    } | null = null;
    if (row.contact_id) {
      const { data: c } = await context.supabase
        .from("business_contacts")
        .select("business_name, contact_person, contact_type, pipeline_stage")
        .eq("id", row.contact_id)
        .maybeSingle();
      contact = c ?? null;
    }

    const { loadBusinessProfile } = await import("./business-profile.server");
    const { credentialsLine } = await import("./business-profile");
    const { loadEmailTemplate } = await import("./email-templates.server");
    const { fillPlaceholders } = await import("./email-templates");
    const profile = await loadBusinessProfile();

    // Same editable voice/tone guidance used for outreach drafts.
    const guidance = fillPlaceholders((await loadEmailTemplate("outreach_instructions")).body, {
      business_name: profile.business_name,
      service_area: profile.service_area,
      phone: profile.phone,
      contact_email: profile.email,
    }).trim();

    const prompt = [
      `Write a reply on behalf of ${profile.business_name} to the email below.`,
      "",
      `About ${profile.business_name}:`,
      `- Mobile notary and remote online notary (RON) services across ${profile.service_area}`,
      `- Credentials: ${credentialsLine(profile)}`,
      `- Phone: ${profile.phone} · Email: ${profile.email}`,
      "",
      "Who wrote to us:",
      `- Name on the email: ${row.from_name ?? row.from_email}`,
      `- Email: ${row.from_email}`,
      contact
        ? `- CRM record: ${contact.business_name} · contact person ${contact.contact_person ?? "unknown"} · type ${contact.contact_type} · relationship stage ${contact.pipeline_stage}`
        : "- No CRM record on file for this sender.",
      "",
      `Their email (subject: ${row.subject ?? "(no subject)"}):`,
      original || "(no message content)",
      "",
      "Voice and tone requirements:",
      guidance,
      "",
      "Reply requirements:",
      "- Answer what they actually asked; do not invent appointments or commitments that were not offered.",
      "STRICT FACTUAL GROUNDING — no invented numbers:",
      "- You have NOT been given any pricing, rates, discounts, or promotions. None exist in the information above unless written there verbatim.",
      "- Never state a price, fee, rate, dollar amount, discount, percentage off, promotional offer, package deal, or turnaround guarantee unless that exact figure appears verbatim in their email above, in the CRM record above, or in the additional instructions below.",
      "- If they ask about cost, or if mentioning pricing would help, keep it general: offer to share current pricing, or invite a call or email to go over rates. Never estimate, guess, or illustrate with an example number.",
      "- The same applies to any claim of a current special, seasonable offer, or new-client discount: do not mention one unless it is stated verbatim above.",
      "- Do not include a subject line. Return only the body of the reply.",
      ...(data.extraInstructions
        ? [
            "",
            "Additional instructions for this specific reply (follow these too, they take priority):",
            data.extraInstructions,
          ]
        : []),
    ].join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-5-20250929",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Claude reply draft failed", res.status, detail.slice(0, 500));
      return { ok: false as const, message: "A draft could not be generated right now. Please try again." };
    }

    const payload = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const draft = (payload.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("")
      .replace(/^\s*subject:\s*.+\r?\n+/i, "")
      .trim();

    if (!draft) return { ok: false as const, message: "The draft came back empty. Please try again." };

    return { ok: true as const, body: draft };
  });

export const sendMailReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { inboundEmailId: string; subject: string; body: string; sendProfile?: string }) => {
    const subject = String(data.subject ?? "").trim().slice(0, 200);
    const body = String(data.body ?? "").trim();
    if (!subject) throw new Error("Add a subject line.");
    if (!body) throw new Error("Write a message before sending.");
    return { inboundEmailId: uuid(data.inboundEmailId), subject, body, sendProfile: data.sendProfile };
  })
  .handler(async ({ data, context }) => {
    if (!(await canReply(context.supabase, context.userId)))
      return { ok: false as const, message: "You do not have access to reply to email." };

    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) return { ok: false as const, message: "Email sending isn't configured yet." };

    const { data: original, error } = await context.supabase
      .from("inbound_emails")
      .select("id, from_email, contact_id, message_id")
      .eq("id", data.inboundEmailId)
      .maybeSingle();

    if (error || !original) return { ok: false as const, message: "Could not load that email." };

    const toAddress = String(original.from_email);
    let contactId = original.contact_id ? String(original.contact_id) : null;
    if (!contactId) {
      const { data: match } = await context.supabase
        .from("business_contacts")
        .select("id")
        .ilike("email", toAddress)
        .maybeSingle();
      if (match) contactId = String(match.id);
    }

    const { loadBusinessProfile } = await import("./business-profile.server");
    const senderName = (await loadBusinessProfile()).business_name;

    const html = `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1c1c1c;white-space:pre-wrap">${escapeHtml(
      data.body,
    )}</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${senderName} <outreach@send.enlivennotary.com>`,
        reply_to: "replies@replies.enlivennotary.com",
        to: [toAddress],
        subject: data.subject,
        text: data.body,
        html,
        ...(original.message_id
          ? { headers: { "In-Reply-To": String(original.message_id), References: String(original.message_id) } }
          : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend mail reply failed", res.status, detail.slice(0, 500));
      return { ok: false as const, message: "The reply could not be sent. Please try again." };
    }

    const sent = (await res.json().catch(() => ({}))) as { id?: string };

    // Logged the same way outbound email already is, so it shows up as a linked
    // Sent row in Mail Activity.
    let logged = false;
    if (contactId) {
      const { error: logError } = await context.supabase.from("contact_activities").insert({
        contact_id: contactId,
        activity_date: new Date().toISOString().slice(0, 10),
        activity_type: "Email",
        description: `Subject: ${data.subject}\n\n${data.body}`,
      });
      if (logError) console.error("Failed to log reply activity", logError);
      else logged = true;
    } else {
      const { error: logError } = await context.supabase.from("email_send_log").insert({
        message_id: sent.id ?? null,
        template_name: data.subject,
        recipient_email: toAddress,
        status: "sent",
        metadata: { source: "mail_activity_reply", inbound_email_id: data.inboundEmailId },
      });
      if (logError) console.error("Failed to log reply send", logError);
      else logged = true;
    }

    return { ok: true as const, sentTo: toAddress, contactId, logged };
  });
