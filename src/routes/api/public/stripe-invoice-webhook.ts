import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook for quote invoices.
 * Add the signing secret from the Stripe dashboard as STRIPE_WEBHOOK_SECRET.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyStripeSignature(body: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const timestamp = parts.find((p) => p[0] === "t")?.[1];
  const signatures = parts.filter((p) => p[0] === "v1").map((p) => p[1] ?? "");
  if (!timestamp || signatures.length === 0) return false;
  // Reject replays older than five minutes.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = await hmacHex(secret, `${timestamp}.${body}`);
  return signatures.some((s) => timingSafeEqual(s, expected));
}

export const Route = createFileRoute("/api/public/stripe-invoice-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook secret not configured", { status: 500 });

        const body = await request.text();
        const ok = await verifyStripeSignature(body, request.headers.get("stripe-signature"), secret);
        if (!ok) return new Response("Invalid signature", { status: 401 });

        let event: any;
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const invoice = event?.data?.object ?? {};
        const invoiceId: string | undefined = invoice?.id;
        if (!invoiceId || typeof invoiceId !== "string" || !invoiceId.startsWith("in_"))
          return new Response("ignored", { status: 200 });

        const now = new Date().toISOString();
        const update: Record<string, string> = {};

        switch (event.type) {
          case "invoice.finalized":
          case "invoice.sent":
            update["status"] = "sent";
            update["sent_at"] = invoice.status_transitions?.finalized_at
              ? new Date(invoice.status_transitions.finalized_at * 1000).toISOString()
              : now;
            if (invoice.hosted_invoice_url) update["hosted_invoice_url"] = invoice.hosted_invoice_url;
            break;
          // Stripe has no dedicated "invoice viewed" event; an upcoming/updated
          // event carrying a payment intent or a payment attempt is the closest signal.
          case "invoice.updated":
          case "invoice.payment_action_required":
          case "invoice.payment_failed":
            update["viewed_at"] = now;
            break;
          case "invoice.paid":
          case "invoice.payment_succeeded":
            update["status"] = "paid";
            update["paid_at"] = invoice.status_transitions?.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
              : now;
            break;
          default:
            return new Response("ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: quote } = await supabaseAdmin
          .from("quotes")
          .select("id, status, viewed_at, paid_at")
          .eq("stripe_invoice_id", invoiceId)
          .maybeSingle();
        if (!quote) return new Response("no matching quote", { status: 200 });

        // Never move a paid quote backwards, and keep the first viewed timestamp.
        if (quote.status === "paid" && update["status"] !== "paid") return new Response("ok", { status: 200 });
        if (update["viewed_at"] && quote.viewed_at) delete update["viewed_at"];
        if (update["viewed_at"] && quote.status === "sent") update["status"] = "viewed";

        if (Object.keys(update).length === 0) return new Response("ok", { status: 200 });

        const { error } = await supabaseAdmin.from("quotes").update(update as never).eq("id", quote.id);
        if (error) {
          console.error("Failed to update quote from Stripe webhook", error);
          return new Response("update failed", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
