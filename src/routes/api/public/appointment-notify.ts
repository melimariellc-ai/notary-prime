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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatDateFriendly = (raw: string): string => {
  const iso = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const month = MONTHS[Number(iso[2]) - 1];
    if (month) return `${month} ${Number(iso[3])}`;
  }
  return raw.trim();
};

const formatTimeFriendly = (raw: string): string => {
  const value = raw.trim();
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM|a\.m\.|p\.m\.)?$/);
  if (!match) return value;
  let hour = Number(match[1]);
  const minutes = match[2] ?? "00";
  const suffix = (match[3] ?? "").toLowerCase();
  let meridiem: string;
  if (suffix.startsWith("a")) {
    meridiem = "AM";
    if (hour === 12) hour = 12;
  } else if (suffix.startsWith("p")) {
    meridiem = "PM";
  } else {
    // 24-hour input
    meridiem = hour >= 12 ? "PM" : "AM";
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
  }
  return `${hour}:${minutes} ${meridiem}`;
};

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
            ["Preferred Date", dateTime],
            ["Location", location],
          ];

          const customerHtml = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0F1A2B">
<p>Thank you for choosing Enliven Notary. We&rsquo;ve received your request with the following details:</p>
<table cellpadding="6" style="border-collapse:collapse;font-size:14px">${detailRows
            .map(
              ([k, v]) =>
                `<tr><td style="color:#666">${escapeHtml(k)}</td><td><strong>${escapeHtml(String(v))}</strong></td></tr>`,
            )
            .join("")}</table>
<p>We&rsquo;ll review your request and reach out shortly to confirm availability, timing, and final pricing. During business hours, we typically respond within a few hours. Requests submitted after hours or on Sunday will be followed up on as soon as possible the next business day.</p>
<p>Need assistance in the meantime? Call or text us at (469) 991-2777.</p>
<p>We look forward to assisting you!</p>
<p style="color:#666;margin-bottom:0"><strong>Enliven Notary</strong><br/>Mobile &middot; Online &middot; Trusted</p>
</div>`;
          const customerText = `Thank you for choosing Enliven Notary. We've received your request with the following details:

${detailRows.map(([k, v]) => `${k}: ${v}`).join("\n")}

We'll review your request and reach out shortly to confirm availability, timing, and final pricing. During business hours, we typically respond within a few hours. Requests submitted after hours or on Sunday will be followed up on as soon as possible the next business day.

Need assistance in the meantime? Call or text us at (469) 991-2777.

We look forward to assisting you!

Enliven Notary
Mobile · Online · Trusted`;


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
          const firstName = name.split(/\s+/)[0] || name;
          const friendlyDate = formatDateFriendly(row.preferred_date ?? "");
          const friendlyTime = formatTimeFriendly(row.preferred_time ?? "");
          const whenSms =
            [friendlyDate, friendlyTime].filter(Boolean).join(" at ") || "your requested date and time";

          const rawService = (row.service ?? "").trim();
          const notesText = (row.notes ?? "").trim();
          const serviceSms =
            /^other/i.test(rawService) && notesText
              ? notesText.length > 120
                ? `${notesText.slice(0, 117)}...`
                : notesText
              : rawService || "notary services";

          const smsText = `Hi ${firstName}! Thank you for choosing Enliven Notary Services.

We've received your request for ${serviceSms} on ${whenSms}.

We'll reach out shortly to review the details and confirm your appointment.

Questions? Call or text us at (469) 991-2777.

We look forward to assisting you!`;

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
