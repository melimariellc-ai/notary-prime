import { createFileRoute } from "@tanstack/react-router";

type AppointmentRow = {
  id?: string;
  service?: string | null;
  meeting_type?: string | null;
  address?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const toE164 = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`;
  return null;
};

export const Route = createFileRoute("/api/public/appointment-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const auth = request.headers.get("authorization");
        if (!expected || auth !== `Bearer ${expected}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const resendKey = process.env["RESEND_API_KEY"];
        if (!resendKey) {
          console.error("RESEND_API_KEY is not configured");
          return new Response("Email not configured", { status: 500 });
        }

        let row: AppointmentRow;
        try {
          const body = (await request.json()) as { record?: AppointmentRow } & AppointmentRow;
          row = body.record ?? body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const name = (row.name ?? "").toString().slice(0, 100) || "Unknown";
        const location =
          row.meeting_type === "online"
            ? "Online — secure video"
            : `Mobile${row.address ? ` — ${row.address}` : ""}`;

        const rows: [string, string][] = [
          ["Service type", row.service ?? "—"],
          ["Location / address", location],
          ["Preferred date", row.preferred_date ?? "—"],
          ["Preferred time", row.preferred_time ?? "—"],
          ["Customer name", name],
          ["Customer email", row.email ?? "—"],
          ["Customer phone", row.phone ?? "—"],
          ["Notes", row.notes || "—"],
        ];

        const html = `<h2 style="font-family:Georgia,serif;color:#0F1A2B">New Booking Request</h2>
<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${rows
          .map(
            ([k, v]) =>
              `<tr><td style="color:#666">${escapeHtml(k)}</td><td><strong>${escapeHtml(String(v))}</strong></td></tr>`,
          )
          .join("")}</table>`;
        const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

        const FROM = "Enliven Notary <bookings@send.enlivennotary.com>";

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: FROM,
            to: ["info@enlivennotary.com"],
            reply_to: row.email ?? undefined,
            subject: `New Booking Request — ${name}`,
            html,
            text,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Resend request failed [${response.status}]: ${errorBody}`);
          return new Response(`Resend failed [${response.status}]: ${errorBody}`, { status: 502 });
        }

        // Customer confirmation email
        const customerEmail = (row.email ?? "").toString().trim();
        if (customerEmail) {
          const dateTime = [row.preferred_date, row.preferred_time].filter(Boolean).join(" at ") || "—";
          const detailRows: [string, string][] = [
            ["Service", row.service ?? "—"],
            ["Date & Time", dateTime],
            ["Location", location],
          ];

          const customerHtml = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0F1A2B">
<p>Thank you for choosing Enliven Notary Services. We&rsquo;ve received your appointment request and will personally review the details before confirming your appointment.</p>
<h3 style="font-family:Georgia,serif;color:#0F1A2B;margin-bottom:4px">Appointment Details</h3>
<table cellpadding="6" style="border-collapse:collapse;font-size:14px">${detailRows
            .map(
              ([k, v]) =>
                `<tr><td style="color:#666">${escapeHtml(k)}</td><td><strong>${escapeHtml(String(v))}</strong></td></tr>`,
            )
            .join("")}</table>
<h3 style="font-family:Georgia,serif;color:#0F1A2B;margin-bottom:4px">What happens next?</h3>
<p>We&rsquo;ll follow up personally to confirm your appointment and make sure we have everything needed for a smooth signing.</p>
<p>During business hours (Monday&ndash;Saturday, 7:00 AM&ndash;9:00 PM), we typically respond within a few hours. Requests submitted after hours or on Sunday will receive a response by the next business day.</p>
<p>If you have any questions or need to update your request, please call or text us at (469) 991-2777.</p>
<p>Thank you for trusting Enliven Notary Services. We look forward to assisting you.</p>
<p style="color:#666;margin-bottom:0"><strong>Enliven Notary Services</strong><br/>Professional &bull; Convenient &bull; Reliable</p>
</div>`;
          const customerText = `Thank you for choosing Enliven Notary Services. We've received your appointment request and will personally review the details before confirming your appointment.

Appointment Details

${detailRows.map(([k, v]) => `${k}: ${v}`).join("\n")}

What happens next?
We'll follow up personally to confirm your appointment and make sure we have everything needed for a smooth signing.

During business hours (Monday–Saturday, 7:00 AM–9:00 PM), we typically respond within a few hours. Requests submitted after hours or on Sunday will receive a response by the next business day.

If you have any questions or need to update your request, please call or text us at (469) 991-2777.

Thank you for trusting Enliven Notary Services. We look forward to assisting you.

Enliven Notary Services
Professional • Convenient • Reliable`;


          const customerResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: FROM,
              to: [customerEmail],
              reply_to: "info@enlivennotary.com",
              subject: "Your Appointment Request — Enliven Notary",
              html: customerHtml,
              text: customerText,
            }),
          });

          if (!customerResponse.ok) {
            const errorBody = await customerResponse.text();
            console.error(`Resend customer email failed [${customerResponse.status}]: ${errorBody}`);
          }
        }

        // Customer SMS confirmation via OpenPhone
        const openPhoneKey = process.env["OPENPHONE_API_KEY"];
        const openPhoneFrom = process.env["OPENPHONE_FROM_NUMBER"] ?? "+14699912777";
        const toNumber = toE164(row.phone ?? "");

        let smsStatus: "sent" | "failed" | "skipped" = "skipped";
        let smsError: string | null = null;

        if (!openPhoneKey) {
          smsError = "OPENPHONE_API_KEY is not configured";
          console.error(`${smsError} — skipping SMS`);
        } else if (!toNumber) {
          smsError = "Customer phone number could not be normalized";
          console.error(`${smsError} — skipping SMS`);
        } else {
          const dateTimeSms =
            [row.preferred_date, row.preferred_time].filter(Boolean).join(" at ") || "your requested time";
          const smsText = `Enliven Notary: Thanks ${name}! We received your request for ${row.service ?? "notary services"} on ${dateTimeSms}. We'll follow up personally to confirm. Questions? Call or text (469) 991-2777.`;

          try {
            const smsResponse = await fetch("https://api.openphone.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: openPhoneKey,
              },
              body: JSON.stringify({
                from: openPhoneFrom,
                to: [toNumber],
                content: smsText,
              }),
            });

            if (smsResponse.ok) {
              smsStatus = "sent";
            } else {
              const errorBody = await smsResponse.text();
              smsStatus = "failed";
              smsError = `[${smsResponse.status}] ${errorBody}`.slice(0, 500);
              console.error(`OpenPhone SMS failed ${smsError}`);
            }
          } catch (e) {
            smsStatus = "failed";
            smsError = (e instanceof Error ? e.message : String(e)).slice(0, 500);
            console.error(`OpenPhone SMS threw: ${smsError}`);
          }
        }

        if (row.id) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { error: updateError } = await supabaseAdmin
              .from("appointments")
              .update({
                sms_status: smsStatus,
                sms_error: smsError,
                sms_sent_at: smsStatus === "sent" ? new Date().toISOString() : null,
              })
              .eq("id", row.id);
            if (updateError) console.error("Failed to record SMS status", updateError);
          } catch (e) {
            console.error("Failed to record SMS status", e);
          }
        }




        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      },
    },
  },
});
