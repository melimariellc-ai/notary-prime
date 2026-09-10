import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function uuid(value: unknown): string {
  const s = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Invalid id.");
  return s;
}


export const generateOutreachEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string; extraInstructions?: string }) => ({
    contactId: uuid(data.contactId),
    extraInstructions: String(data.extraInstructions ?? "").trim().slice(0, 1500),
  }))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) {
      return { ok: false as const, missingKey: true as const, message: "The Claude API key hasn't been added yet." };
    }

    const { data: contact, error } = await context.supabase
      .from("business_contacts")
      .select("id, business_name, contact_person, contact_type, email, referral_source, pipeline_stage")
      .eq("id", data.contactId)
      .maybeSingle();

    if (error || !contact) {
      return { ok: false as const, message: "Could not load that contact." };
    }

    const { data: activities } = await context.supabase
      .from("contact_activities")
      .select("activity_date, activity_type, description")
      .eq("contact_id", data.contactId)
      .order("activity_date", { ascending: false })
      .limit(15);

    const history = (activities ?? [])
      .map((a) => `- ${a.activity_date} (${a.activity_type}): ${a.description}`)
      .join("\n");

    const { loadBusinessProfile } = await import("./business-profile.server");
    const { credentialsLine } = await import("./business-profile");
    const { loadEmailTemplate } = await import("./email-templates.server");
    const { fillPlaceholders } = await import("./email-templates");
    const profile = await loadBusinessProfile();
    const business = profile.business_name;

    // Editable default guidance from Settings > Email Templates. The contact's own
    // details above still drive the email, so every draft is unique to them.
    const guidance = fillPlaceholders((await loadEmailTemplate("outreach_instructions")).body, {
      business_name: business,
      service_area: profile.service_area,
      phone: profile.phone,
      contact_email: profile.email,
    }).trim();

    const prompt = [
      `Write a warm, professional outreach email introducing ${business} to this business contact.`,
      "",
      `About ${business}:`,
      `- Mobile notary and remote online notary (RON) services across ${profile.service_area}`,
      `- Credentials: ${credentialsLine(profile)}`,
      `- Phone: ${profile.phone} · Email: ${profile.email}`,
      "",
      "Contact details:",
      `- Business: ${contact.business_name}`,
      `- Contact person: ${contact.contact_person ?? "unknown (no name on file)"}`,
      `- Type of business: ${contact.contact_type}`,
      `- How we found them: ${contact.referral_source ?? "not recorded"}`,
      `- Relationship stage: ${contact.pipeline_stage}`,
      "",
      "Logged activity notes (most recent first):",
      history || "- No activity logged yet; this is a first introduction.",
      "",
      "Requirements:",
      guidance,
      ...(data.extraInstructions
        ? [
            "",
            "Additional instructions for this specific email (follow these too, they take priority):",
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
      console.error("Claude request failed", res.status, detail.slice(0, 500));
      return {
        ok: false as const,
        message:
          res.status === 401
            ? "Claude rejected the API key. Please re-add it."
            : "Claude could not generate a draft right now. Please try again.",
      };
    }

    const payload = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const draft = (payload.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("")
      .trim();

    if (!draft) return { ok: false as const, message: "Claude returned an empty draft. Please try again." };

    const match = draft.match(/^\s*subject:\s*(.+)$/im);
    const subject = match?.[1]?.trim() || `Notary support for ${contact.business_name}`;
    const body = draft.replace(/^\s*subject:\s*.+\r?\n+/i, "").trim();

    return { ok: true as const, subject, body, email: contact.email ?? null };
  });

export const sendOutreachEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string; subject: string; body: string; sendProfile?: string }) => {
    const subject = String(data.subject ?? "").trim().slice(0, 200);
    const body = String(data.body ?? "").trim();
    if (!subject) throw new Error("Add a subject line.");
    if (!body) throw new Error("The email is empty.");
    return { contactId: uuid(data.contactId), subject, body, sendProfile: data.sendProfile };
  })
  .handler(async ({ data, context }) => {
    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) return { ok: false as const, message: "Email sending isn't configured yet." };

    const { data: contact } = await context.supabase
      .from("business_contacts")
      .select("id, business_name, email")
      .eq("id", data.contactId)
      .maybeSingle();

    if (!contact) return { ok: false as const, message: "Could not load that contact." };
    if (!contact.email) return { ok: false as const, message: "This contact has no email address on file." };

    const { loadBusinessProfile } = await import("./business-profile.server");
    const senderName = (await loadBusinessProfile()).business_name;

    const html = `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1c1c1c;white-space:pre-wrap">${data.body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${senderName} <${profile.from}>`,
        reply_to: profile.replyTo,
        to: [contact.email],
        subject: data.subject,
        text: data.body,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend outreach send failed", res.status, detail.slice(0, 500));
      return {
        ok: false as const,
        message: `The email could not be sent (${res.status}). ${detail.slice(0, 200)}`,
      };
    }

    const { error: logError } = await context.supabase.from("contact_activities").insert({
      contact_id: data.contactId,
      activity_date: new Date().toISOString().slice(0, 10),
      activity_type: "Email",
      description: `Subject: ${data.subject}\n\n${data.body}`,
    });

    if (logError) console.error("Failed to log outreach activity", logError);

    return { ok: true as const, sentTo: contact.email, logged: !logError };
  });

/**
 * Fills in the editable "Outreach Fallback" template for one contact — no AI,
 * instant, and never saved against the contact until it is sent.
 */
export const buildFallbackOutreachEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string }) => ({ contactId: uuid(data.contactId) }))
  .handler(async ({ data, context }) => {
    const { data: contact, error } = await context.supabase
      .from("business_contacts")
      .select("id, business_name, contact_person, email")
      .eq("id", data.contactId)
      .maybeSingle();
    if (error || !contact) return { ok: false as const, message: "Could not load that contact." };

    const { loadBusinessProfile } = await import("./business-profile.server");
    const { loadEmailTemplate } = await import("./email-templates.server");
    const { renderEmailTemplate } = await import("./email-templates");
    const profile = await loadBusinessProfile();
    const template = await loadEmailTemplate("outreach_fallback");

    const rendered = renderEmailTemplate(template, {
      contact_person: contact.contact_person || "there",
      business_name: contact.business_name,
      our_business: profile.business_name,
      service_area: profile.service_area,
      phone: profile.phone,
      contact_email: profile.email,
    });

    return { ok: true as const, subject: rendered.subject, body: rendered.text, email: contact.email ?? null };
  });
