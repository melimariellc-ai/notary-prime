import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

export type QuoteLineItem = { description: string; quantity: number; unit_price: number };

export type Quote = {
  id: string;
  appointment_id: string;
  line_items: QuoteLineItem[];
  subtotal: number;
  total: number;
  status: string;
  stripe_invoice_id: string | null;
  stripe_customer_id: string | null;
  hosted_invoice_url: string | null;
  notes: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  created_at: string;
};

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

/** Stripe REST helper: form-encoded requests, no Node-only SDK. */
async function stripe(path: string, params?: Record<string, string>): Promise<any> {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Stripe is not configured.");
  const method = params ? "POST" : "GET";
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(body ? { body } : {}),
  });
  const json = (await res.json()) as any;
  if (!res.ok) {
    console.error("Stripe error", path, json?.error?.message);
    throw new Error(json?.error?.message ?? "Stripe request failed.");
  }
  return json;
}

function normalizeLineItems(raw: unknown): QuoteLineItem[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("Add at least one line item.");
  return raw.map((item, i) => {
    const row = item as Record<string, unknown>;
    const description = String(row["description"] ?? "").trim();
    const quantity = Number(row["quantity"]);
    const unitPrice = Number(row["unit_price"]);
    if (!description) throw new Error(`Line ${i + 1}: description is required.`);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Line ${i + 1}: quantity must be greater than 0.`);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Line ${i + 1}: unit price is invalid.`);
    return { description, quantity: Math.round(quantity), unit_price: Math.round(unitPrice * 100) / 100 };
  });
}

/**
 * Creates a Stripe invoice for an appointment request and stores it as a sent quote.
 * Stripe invoices bring wallet payments and reminders for free, so no payment links.
 */
export const createStripeQuoteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; lineItems: QuoteLineItem[]; notes?: string | null }) => {
    const appointmentId = String(data?.appointmentId ?? "");
    if (!UUID.test(appointmentId)) throw new Error("Invalid appointment id.");
    return {
      appointmentId,
      lineItems: normalizeLineItems(data?.lineItems),
      notes: data?.notes ? String(data.notes).slice(0, 1000) : null,
    };
  })
  .handler(async ({ data, context }) => {
    if (!(await canManageQuotes(context.supabase, context.userId)))
      return { ok: false as const, message: "Only Admin and Employee accounts can send quotes." };

    const { data: appointment, error: apptError } = await context.supabase
      .from("appointments")
      .select("id, name, email, phone, service")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (apptError || !appointment) return { ok: false as const, message: "Could not find that request." };

    const subtotal = data.lineItems.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
    const total = Math.round(subtotal * 100) / 100;

    try {
      // 1. Find or create the Stripe customer for this requester.
      const email = String(appointment.email).trim().toLowerCase();
      const existing = await stripe(`customers?email=${encodeURIComponent(email)}&limit=1`);
      const customerId: string =
        existing?.data?.[0]?.id ??
        (
          await stripe("customers", {
            email,
            name: String(appointment.name ?? ""),
            ...(appointment.phone ? { phone: String(appointment.phone) } : {}),
          })
        ).id;

      // 2. Draft invoice (exclude any stray pending items), then attach our lines.
      const invoice = await stripe("invoices", {
        customer: customerId,
        collection_method: "send_invoice",
        days_until_due: "7",
        pending_invoice_items_behavior: "exclude",
        description: data.notes ?? `Quote for ${appointment.service ?? "notary services"}`,
        "metadata[appointment_id]": data.appointmentId,
      });

      for (const line of data.lineItems) {
        await stripe("invoiceitems", {
          customer: customerId,
          invoice: invoice.id,
          currency: "usd",
          description: line.description,
          quantity: String(line.quantity),
          unit_amount_decimal: String(Math.round(line.unit_price * 100)),
        });
      }

      // 3. Finalize and email it.
      await stripe(`invoices/${invoice.id}/finalize`, {});
      const sent = await stripe(`invoices/${invoice.id}/send`, {});

      const { data: quote, error } = await context.supabase
        .from("quotes")
        .insert({
          appointment_id: data.appointmentId,
          line_items: data.lineItems as unknown as never,
          subtotal: total,
          total,
          status: "sent",
          stripe_invoice_id: String(sent.id),
          stripe_customer_id: customerId,
          hosted_invoice_url: sent.hosted_invoice_url ?? null,
          notes: data.notes,
          sent_at: new Date().toISOString(),
          created_by: context.userId,
        })
        .select("id, stripe_invoice_id, hosted_invoice_url, total, status")
        .single();

      if (error) {
        console.error("Failed to save quote", error);
        return { ok: false as const, message: "The invoice was sent but the quote could not be saved." };
      }

      // Record the first history entry with the staff member who sent it.
      const { data: actor } = await context.supabase
        .from("profiles")
        .select("email")
        .eq("id", context.userId)
        .maybeSingle();
      const { error: historyError } = await context.supabase.from("quote_status_events").insert({
        quote_id: quote.id,
        status: "sent",
        source: "staff",
        changed_by: context.userId,
        changed_by_email: actor?.email ?? null,
      });
      if (historyError) console.error("Failed to record quote history", historyError);

      return { ok: true as const, quote };

    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the invoice.";
      return { ok: false as const, message };
    }
  });

/** Quotes for one appointment request, newest first. */
export const listQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => {
    const appointmentId = String(data?.appointmentId ?? "");
    if (!UUID.test(appointmentId)) throw new Error("Invalid appointment id.");
    return { appointmentId };
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("quotes")
      .select(
        "id, appointment_id, line_items, subtotal, total, status, stripe_invoice_id, stripe_customer_id, hosted_invoice_url, notes, sent_at, viewed_at, paid_at, created_at",
      )
      .eq("appointment_id", data.appointmentId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load quotes", error);
      return { quotes: [] as Quote[] };
    }
    return {
      quotes: (rows ?? []).map((q) => ({
        ...q,
        subtotal: Number(q.subtotal),
        total: Number(q.total),
        line_items: (q.line_items ?? []) as unknown as QuoteLineItem[],
      })) as Quote[],
    };
  });

export type QuoteStatusEvent = {
  id: string;
  quote_id: string;
  status: string;
  source: string;
  changed_by_email: string | null;
  created_at: string;
};

/** Status history for every quote on one appointment request, oldest first. */
export const listQuoteHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => {
    const appointmentId = String(data?.appointmentId ?? "");
    if (!UUID.test(appointmentId)) throw new Error("Invalid appointment id.");
    return { appointmentId };
  })
  .handler(async ({ data, context }) => {
    const { data: quoteRows, error: quotesError } = await context.supabase
      .from("quotes")
      .select("id")
      .eq("appointment_id", data.appointmentId);
    if (quotesError || !quoteRows?.length) {
      if (quotesError) console.error("Failed to load quotes for history", quotesError);
      return { events: [] as QuoteStatusEvent[] };
    }

    const { data: rows, error } = await context.supabase
      .from("quote_status_events")
      .select("id, quote_id, status, source, changed_by_email, created_at")
      .in(
        "quote_id",
        quoteRows.map((q) => q.id),
      )
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to load quote history", error);
      return { events: [] as QuoteStatusEvent[] };
    }
    return { events: (rows ?? []) as QuoteStatusEvent[] };
  });


export type QuoteOverviewRow = {
  id: string;
  appointment_id: string;
  status: string;
  total: number;
  hosted_invoice_url: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  client_name: string;
  client_email: string;
  service: string;
  last_updated_by: string | null;
  last_updated_at: string | null;
};

/** Every quote across all appointment requests, newest first — Admin/Employee only. */
export const listAllQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await canManageQuotes(context.supabase, context.userId)))
      return { ok: false as const, quotes: [] as QuoteOverviewRow[] };

    const { data: rows, error } = await context.supabase
      .from("quotes")
      .select(
        "id, appointment_id, status, total, hosted_invoice_url, sent_at, viewed_at, paid_at, created_at, appointments(name, email, service)",
      )
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load quotes overview", error);
      return { ok: true as const, quotes: [] as QuoteOverviewRow[] };
    }

    const ids = (rows ?? []).map((r) => r.id);
    const latest = new Map<string, { email: string | null; at: string }>();
    if (ids.length) {
      const { data: events } = await context.supabase
        .from("quote_status_events")
        .select("quote_id, changed_by_email, created_at")
        .in("quote_id", ids)
        .order("created_at", { ascending: true });
      for (const e of events ?? []) {
        latest.set(e.quote_id, { email: e.changed_by_email ?? null, at: e.created_at });
      }
    }

    return {
      ok: true as const,
      quotes: (rows ?? []).map((r) => {
        const appt = (r as unknown as { appointments: { name: string; email: string; service: string } | null })
          .appointments;
        const last = latest.get(r.id);
        return {
          id: r.id,
          appointment_id: r.appointment_id,
          status: r.status,
          total: Number(r.total),
          hosted_invoice_url: r.hosted_invoice_url,
          sent_at: r.sent_at,
          viewed_at: r.viewed_at,
          paid_at: r.paid_at,
          created_at: r.created_at,
          client_name: appt?.name ?? "Unknown client",
          client_email: appt?.email ?? "",
          service: appt?.service ?? "—",
          last_updated_by: last?.email ?? null,
          last_updated_at: last?.at ?? null,
        };
      }) as QuoteOverviewRow[],
    };
  });
