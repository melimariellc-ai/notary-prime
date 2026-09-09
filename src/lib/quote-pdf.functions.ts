import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuoteLineItem } from "./quotes.functions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function canManageQuotes(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    console.error("Failed to read roles", error);
    return false;
  }
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.includes("admin") || roles.includes("employee");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function safeFileName(clientName: string, quoteId: string): string {
  const slug = clientName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
  return `enliven-notary-quote-${slug}-${quoteId.slice(0, 8)}.pdf`;
}

/** Loads a quote with its request, then renders the branded PDF. */
async function renderQuote(supabase: SupabaseClient, quoteId: string) {
  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, appointment_id, line_items, subtotal, total, status, notes, hosted_invoice_url, sent_at, created_at, appointments(name, email, phone, service, meeting_type, preferred_date, preferred_time, address)",
    )
    .eq("id", quoteId)
    .maybeSingle();
  if (error || !quote) {
    if (error) console.error("Failed to load quote for PDF", error);
    return null;
  }

  const appointment = (
    quote as unknown as {
      appointments: {
        name: string;
        email: string;
        phone: string | null;
        service: string;
        meeting_type: string | null;
        preferred_date: string | null;
        preferred_time: string | null;
        address: string | null;
      } | null;
    }
  ).appointments;

  const [{ buildQuotePdf }, { loadBusinessProfile }] = await Promise.all([
    import("./quote-pdf.server"),
    import("./business-profile.server"),
  ]);

  const profile = await loadBusinessProfile();
  const client = appointment ?? {
    name: "Client",
    email: "",
    phone: null,
    service: "Notary services",
    meeting_type: null,
    preferred_date: null,
    preferred_time: null,
    address: null,
  };

  const bytes = await buildQuotePdf({
    profile,
    quote: {
      id: quote.id,
      line_items: (quote.line_items ?? []) as unknown as QuoteLineItem[],
      subtotal: Number(quote.subtotal),
      total: Number(quote.total),
      status: String(quote.status),
      notes: quote.notes,
      hosted_invoice_url: quote.hosted_invoice_url,
      sent_at: quote.sent_at,
      created_at: quote.created_at,
    },
    appointment: client,
  });

  return {
    bytes,
    profile,
    client,
    total: Number(quote.total),
    fileName: safeFileName(client.name, quote.id),
  };
}

/** Renders a not-yet-sent draft quote so staff can review the real document first. */
export const previewQuotePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      appointmentId: string;
      lineItems: { description: string; quantity: number; unit_price: number }[];
      notes?: string | null;
    }) => {
      const appointmentId = String(data?.appointmentId ?? "");
      if (!UUID.test(appointmentId)) throw new Error("Invalid appointment id.");
      const raw = Array.isArray(data?.lineItems) ? data.lineItems : [];
      if (!raw.length) throw new Error("Add at least one line item.");
      const lineItems = raw.map((l, i) => {
        const description = String(l?.description ?? "").trim() || "Notary services";
        const quantity = Number(l?.quantity) || 1;
        const unit_price = Number(l?.unit_price);
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Line ${i + 1}: quantity must be above 0.`);
        if (!Number.isFinite(unit_price) || unit_price < 0) throw new Error(`Line ${i + 1}: unit price is invalid.`);
        return { description, quantity: Math.round(quantity), unit_price: Math.round(unit_price * 100) / 100 };
      });
      return {
        appointmentId,
        lineItems,
        notes: data?.notes ? String(data.notes).slice(0, 1000) : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    if (!(await canManageQuotes(context.supabase, context.userId)))
      return { ok: false as const, message: "Only Admin and Employee accounts can preview quotes." };

    try {
      const { data: appointment, error } = await context.supabase
        .from("appointments")
        .select("name, email, phone, service, meeting_type, preferred_date, preferred_time, address")
        .eq("id", data.appointmentId)
        .maybeSingle();
      if (error || !appointment) return { ok: false as const, message: "Could not find that request." };

      const [{ buildQuotePdf }, { loadBusinessProfile }] = await Promise.all([
        import("./quote-pdf.server"),
        import("./business-profile.server"),
      ]);
      const profile = await loadBusinessProfile();
      const subtotal = Math.round(data.lineItems.reduce((s, l) => s + l.quantity * l.unit_price, 0) * 100) / 100;

      const bytes = await buildQuotePdf({
        profile,
        quote: {
          id: "00000000-preview",
          line_items: data.lineItems as unknown as QuoteLineItem[],
          subtotal,
          total: subtotal,
          status: "draft",
          notes: data.notes,
          hosted_invoice_url: null,
          sent_at: null,
          created_at: new Date().toISOString(),
        },
        appointment: {
          name: appointment.name,
          email: appointment.email,
          phone: appointment.phone,
          service: appointment.service,
          meeting_type: appointment.meeting_type,
          preferred_date: appointment.preferred_date,
          preferred_time: appointment.preferred_time,
          address: appointment.address,
        },
      });

      return {
        ok: true as const,
        pdfBase64: toBase64(bytes),
        fileName: safeFileName(appointment.name, "draft0000"),
      };
    } catch (err) {
      console.error("Failed to build quote preview", err);
      return { ok: false as const, message: "Could not build the preview. Please try again." };
    }
  });

/** Returns the quote PDF as base64 so the browser can download it. */
export const getQuotePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { quoteId: string }) => {
    const quoteId = String(data?.quoteId ?? "");
    if (!UUID.test(quoteId)) throw new Error("Invalid quote id.");
    return { quoteId };
  })
  .handler(async ({ data, context }) => {
    if (!(await canManageQuotes(context.supabase, context.userId)))
      return { ok: false as const, message: "Only Admin and Employee accounts can download quotes." };
    try {
      const result = await renderQuote(context.supabase, data.quoteId);
      if (!result) return { ok: false as const, message: "Could not find that quote." };
      return { ok: true as const, fileName: result.fileName, pdfBase64: toBase64(result.bytes) };
    } catch (err) {
      console.error("Failed to build quote PDF", err);
      return { ok: false as const, message: "Could not build the quote document. Please try again." };
    }
  });

/** Emails the quote PDF to the client (or another address) as an attachment. */
export const emailQuotePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { quoteId: string; to?: string | null; message?: string | null }) => {
    const quoteId = String(data?.quoteId ?? "");
    if (!UUID.test(quoteId)) throw new Error("Invalid quote id.");
    const to = data?.to ? String(data.to).trim() : "";
    if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("That email address doesn't look right.");
    return { quoteId, to: to || null, message: data?.message ? String(data.message).slice(0, 1000) : null };
  })
  .handler(async ({ data, context }) => {
    if (!(await canManageQuotes(context.supabase, context.userId)))
      return { ok: false as const, message: "Only Admin and Employee accounts can email quotes." };

    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) return { ok: false as const, message: "Email sending isn't configured yet." };

    try {
      const result = await renderQuote(context.supabase, data.quoteId);
      if (!result) return { ok: false as const, message: "Could not find that quote." };

      const recipient = data.to ?? result.client.email;
      if (!recipient) return { ok: false as const, message: "There's no email address on this request." };

      const { profile } = result;
      const intro = data.message?.trim();
      const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#1b1d21;font-size:15px;line-height:1.6">
<p>Hi ${result.client.name.split(" ")[0] || "there"},</p>
<p>${intro ? intro.replace(/</g, "&lt;") : `Please find your quote from ${profile.business_name} attached as a PDF.`}</p>
<p>Questions? Just reply to this email or call ${profile.phone}.</p>
<p style="color:#6b6f76;font-size:13px">${profile.business_name} · ${profile.service_area}</p>
</div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: `${profile.business_name} <outreach@send.enlivennotary.com>`,
          reply_to: profile.email,
          to: [recipient],
          subject: `Your quote from ${profile.business_name}`,
          html,
          attachments: [{ filename: result.fileName, content: toBase64(result.bytes) }],
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        console.error("Resend quote PDF send failed", res.status, detail.slice(0, 500));
        return { ok: false as const, message: "The quote document couldn't be emailed. Please try again." };
      }

      return { ok: true as const, message: `Quote emailed to ${recipient}.` };
    } catch (err) {
      console.error("Failed to email quote PDF", err);
      return { ok: false as const, message: "Could not send the quote document. Please try again." };
    }
  });

/**
 * Emails a manually built (unsaved) quote document as a PDF attachment.
 * Standalone backup path: it does NOT create a Stripe invoice or a quote row.
 */
export const emailDraftQuotePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      appointmentId: string;
      lineItems: { description: string; quantity: number; unit_price: number }[];
      notes?: string | null;
      to?: string | null;
      message?: string | null;
    }) => {
      const appointmentId = String(data?.appointmentId ?? "");
      if (!UUID.test(appointmentId)) throw new Error("Invalid appointment id.");
      const raw = Array.isArray(data?.lineItems) ? data.lineItems : [];
      if (!raw.length) throw new Error("Add at least one line item.");
      const lineItems = raw.map((l, i) => {
        const description = String(l?.description ?? "").trim() || "Notary services";
        const quantity = Number(l?.quantity) || 1;
        const unit_price = Number(l?.unit_price);
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Line ${i + 1}: quantity must be above 0.`);
        if (!Number.isFinite(unit_price) || unit_price < 0) throw new Error(`Line ${i + 1}: unit price is invalid.`);
        return { description, quantity: Math.round(quantity), unit_price: Math.round(unit_price * 100) / 100 };
      });
      const to = data?.to ? String(data.to).trim() : "";
      if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("That email address doesn't look right.");
      return {
        appointmentId,
        lineItems,
        notes: data?.notes ? String(data.notes).slice(0, 1000) : null,
        to: to || null,
        message: data?.message ? String(data.message).slice(0, 1000) : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    if (!(await canManageQuotes(context.supabase, context.userId)))
      return { ok: false as const, message: "Only Admin and Employee accounts can email quotes." };

    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) return { ok: false as const, message: "Email sending isn't configured yet." };

    try {
      const { data: appointment, error } = await context.supabase
        .from("appointments")
        .select("name, email, phone, service, meeting_type, preferred_date, preferred_time, address")
        .eq("id", data.appointmentId)
        .maybeSingle();
      if (error || !appointment) return { ok: false as const, message: "Could not find that request." };

      const recipient = data.to ?? appointment.email;
      if (!recipient) return { ok: false as const, message: "There's no email address on this request." };

      const [{ buildQuotePdf }, { loadBusinessProfile }] = await Promise.all([
        import("./quote-pdf.server"),
        import("./business-profile.server"),
      ]);
      const profile = await loadBusinessProfile();
      const subtotal = Math.round(data.lineItems.reduce((s, l) => s + l.quantity * l.unit_price, 0) * 100) / 100;

      const bytes = await buildQuotePdf({
        profile,
        quote: {
          id: "00000000-manual",
          line_items: data.lineItems as unknown as QuoteLineItem[],
          subtotal,
          total: subtotal,
          status: "draft",
          notes: data.notes,
          hosted_invoice_url: null,
          sent_at: null,
          created_at: new Date().toISOString(),
        },
        appointment: {
          name: appointment.name,
          email: appointment.email,
          phone: appointment.phone,
          service: appointment.service,
          meeting_type: appointment.meeting_type,
          preferred_date: appointment.preferred_date,
          preferred_time: appointment.preferred_time,
          address: appointment.address,
        },
      });

      const intro = data.message?.trim();
      const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#1b1d21;font-size:15px;line-height:1.6">
<p>Hi ${appointment.name.split(" ")[0] || "there"},</p>
<p>${intro ? intro.replace(/</g, "&lt;") : `Please find your quote from ${profile.business_name} attached as a PDF.`}</p>
<p>Questions? Just reply to this email or call ${profile.phone}.</p>
<p style="color:#6b6f76;font-size:13px">${profile.business_name} · ${profile.service_area}</p>
</div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: `${profile.business_name} <outreach@send.enlivennotary.com>`,
          reply_to: profile.email,
          to: [recipient],
          subject: `Your quote from ${profile.business_name}`,
          html,
          attachments: [{ filename: safeFileName(appointment.name, "manual00"), content: toBase64(bytes) }],
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        console.error("Resend manual quote PDF send failed", res.status, detail.slice(0, 500));
        return { ok: false as const, message: "The quote document couldn't be emailed. Please try again." };
      }

      return { ok: true as const, message: `Quote document emailed to ${recipient}.` };
    } catch (err) {
      console.error("Failed to email manual quote PDF", err);
      return { ok: false as const, message: "Could not send the quote document. Please try again." };
    }
  });
