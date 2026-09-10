import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type InboundEvent = {
  type?: string;
  data?: {
    email_id?: string;
    message_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    created_at?: string;
    /** Resend delivers the reply body inline on email.received. */
    text?: string;
    html?: string;
  };
};

type ReceivedEmail = {
  id?: string;
  from?: string;
  to?: string[];
  subject?: string;
  text?: string;
  html?: string;
  created_at?: string;
  headers?: Record<string, string> | { from?: string };
};

const TOLERANCE_SECONDS = 5 * 60;

/** Svix-style signature check over the raw request body. */
function verifySignature(
  secret: string,
  body: string,
  id: string,
  timestamp: string,
  signatureHeader: string,
): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  return signatureHeader
    .split(" ")
    .filter((part) => part.startsWith("v1,"))
    .some((part) => {
      const candidate = Buffer.from(part.slice(3));
      return candidate.length === expectedBuf.length && timingSafeEqual(candidate, expectedBuf);
    });
}

const bareEmail = (value: string): string => {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
};

const displayName = (value: string): string | null => {
  const match = value.match(/^\s*"?([^"<]+?)"?\s*</);
  const name = match?.[1]?.trim();
  return name ? name : null;
};

const strip = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const trim = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}…` : value;


export const Route = createFileRoute("/api/public/resend-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RESEND_WEBHOOK_SECRET"];
        const apiKey = process.env["RESEND_API_KEY"];
        if (!secret || !apiKey) {
          console.error("resend-inbound: missing RESEND_WEBHOOK_SECRET or RESEND_API_KEY");
          return new Response("Not configured", { status: 500 });
        }

        const raw = await request.text();
        const svixId = request.headers.get("svix-id");
        const svixTimestamp = request.headers.get("svix-timestamp");
        const svixSignature = request.headers.get("svix-signature");
        if (!svixId || !svixTimestamp || !svixSignature) {
          return new Response("Missing signature", { status: 401 });
        }
        if (!verifySignature(secret, raw, svixId, svixTimestamp, svixSignature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: InboundEvent;
        try {
          event = JSON.parse(raw) as InboundEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (event.type !== "email.received") {
          return Response.json({ ignored: true });
        }

        const emailId = event.data?.email_id;
        if (!emailId || !/^[a-zA-Z0-9-]{10,64}$/.test(emailId)) {
          return new Response("Invalid email id", { status: 400 });
        }

        // Resend usually includes the body inline on email.received; only call the
        // API when it doesn't (send-only API keys can't read receiving anyway).
        // Resend's email.received webhook carries metadata only — the body must
        // be retrieved. That retrieval needs a full-access key; the send-only
        // key returns 401, so prefer a dedicated read key when configured.
        let received: ReceivedEmail = {};
        const inlineText = event.data?.text ?? "";
        const inlineHtml = event.data?.html ?? "";
        const readKey = process.env["RESEND_INBOUND_API_KEY"] || apiKey;
        if (!inlineText && !inlineHtml) {
          try {
            const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
              headers: { Authorization: `Bearer ${readKey}` },
            });
            if (!res.ok) {
              const detail = await res.text();
              console.error(`resend-inbound: fetch failed [${res.status}]: ${detail}`);
            } else {
              received = (await res.json()) as ReceivedEmail;
            }
          } catch (error) {
            console.error("resend-inbound: fetch threw", error);
          }
        }


        const fromRaw = received.from ?? event.data?.from ?? "";
        if (!fromRaw) return new Response("Missing sender", { status: 400 });
        const fromEmail = bareEmail(fromRaw);
        const subject = (received.subject ?? event.data?.subject ?? "").slice(0, 500);
        const text = (inlineText || received.text || "").slice(0, 20000);
        const html = (inlineHtml || received.html || "").slice(0, 100000);
        const to = (received.to ?? event.data?.to ?? []).map(bareEmail);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Match the sender to a CRM contact so the reply lands on their timeline.
        const { data: contact } = await supabaseAdmin
          .from("business_contacts")
          .select("id, business_name")
          .ilike("email", fromEmail)
          .limit(1)
          .maybeSingle();

        const { error: insertError } = await supabaseAdmin.from("inbound_emails").upsert(
          {
            resend_email_id: emailId,
            message_id: event.data?.message_id ?? null,
            from_email: fromEmail,
            from_name: displayName(fromRaw),
            to_emails: to,
            subject: subject || null,
            text_body: text || null,
            html_body: html || null,
            contact_id: contact?.id ?? null,
            received_at: received.created_at ?? event.data?.created_at ?? new Date().toISOString(),
          },
          { onConflict: "resend_email_id" },
        );

        if (insertError) {
          console.error("resend-inbound: insert failed", insertError.message);
          return new Response("Storage error", { status: 500 });
        }

        // A reply from a known CRM contact, or any email that reads like a
        // scheduling request, becomes a draft appointment awaiting review.
        try {
          const { data: stored } = await supabaseAdmin
            .from("inbound_emails")
            .select("id")
            .eq("resend_email_id", emailId)
            .maybeSingle();
          const { maybeCreateAppointmentDraft } = await import("@/lib/appointment-extract.server");
          await maybeCreateAppointmentDraft({
            inboundEmailId: (stored?.id as string | undefined) ?? null,
            contactId: contact?.id ?? null,
            fromEmail: fromEmail,
            fromName: displayName(fromRaw),
            subject: subject || null,
            body: text || strip(html),
          });
        } catch (error) {
          console.error("resend-inbound: appointment draft failed", error);
        }

        // A reply to a readiness check lands on the client's record and on the check.
        try {
          const { logReadinessReply } = await import("@/lib/readiness-check.server");
          await logReadinessReply({
            address: fromEmail,
            body: text || strip(html),
            matchBy: "email",
          });
        } catch (error) {
          console.error("resend-inbound: readiness reply logging failed", error);
        }

        if (contact?.id) {
          const body = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const description = [
            `Reply received${subject ? `: ${subject}` : ""}`,
            trim(body, 4000),
          ]
            .filter(Boolean)
            .join("\n\n");
          const { error: activityError } = await supabaseAdmin.from("contact_activities").insert({
            contact_id: contact.id,
            activity_type: "Email",
            description,
          });
          if (activityError) {
            console.error("resend-inbound: activity log failed", activityError.message);
          }
        }

        // Notify the owner that a reply landed.
        const bodyText = text || strip(html);
        // Forward only to admin/employee accounts that want reply copies
        // (missing preference row = opted in). Fall back to the owner inbox.
        let notifyList: string[] = [];
        const { data: staff } = await supabaseAdmin
          .from("profiles")
          .select("id, email, role, is_active")
          .in("role", ["admin", "employee"]);
        const { data: prefRows } = await supabaseAdmin
          .from("notification_preferences")
          .select("user_id, forward_replies");
        const forwardOptedOut = new Set(
          (prefRows ?? []).filter((r) => r.forward_replies === false).map((r) => r.user_id),
        );
        notifyList = Array.from(
          new Set(
            (staff ?? [])
              .filter((r) => r.is_active !== false && !forwardOptedOut.has(r.id))
              .map((r) => (r.email ?? "").trim())
              .filter(Boolean),
          ),
        );
        if (notifyList.length === 0 && !staff?.length) {
          const fallback = process.env["INBOUND_NOTIFY_EMAIL"] ?? "info@enlivennotary.com";
          notifyList = [fallback];
        }
        if (notifyList.length === 0) {
          return Response.json({ ok: true, matched: Boolean(contact?.id), notified: false });
        }
        const esc = (v: string) =>
          v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        try {
          const notifyRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              from: "Enliven Notary <replies@send.enlivennotary.com>",
              reply_to: fromEmail,
              to: notifyList,
              subject: `New reply from ${displayName(fromRaw) ?? fromEmail}${subject ? `: ${subject}` : ""}`,
              text: [
                `From: ${fromRaw}`,
                `Subject: ${subject || "(none)"}`,
                contact?.business_name
                  ? `CRM contact: ${contact.business_name}`
                  : "No matching CRM contact — this reply is saved under Replies received.",
                "",
                trim(bodyText, 4000),
              ].join("\n"),
              html: `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1c1c1c">
<p><strong>From:</strong> ${esc(fromRaw)}<br/><strong>Subject:</strong> ${esc(subject || "(none)")}<br/>
${contact?.business_name ? `<strong>CRM contact:</strong> ${esc(contact.business_name)}` : "<em>No matching CRM contact — saved under Replies received.</em>"}</p>
<hr/><div style="white-space:pre-wrap">${esc(trim(bodyText, 4000))}</div></div>`,
            }),
          });
          if (!notifyRes.ok) {
            console.error("resend-inbound: notification failed", notifyRes.status, await notifyRes.text());
          }
        } catch (error) {
          console.error("resend-inbound: notification threw", error);
        }

        return Response.json({ ok: true, matched: Boolean(contact?.id) });

      },
    },
  },
});
