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
          const detailRows: [string, string][] = [
            ["Service", row.service ?? "—"],
            ["Date", row.preferred_date ?? "—"],
            ["Time", row.preferred_time ?? "—"],
            ["Location", location],
          ];
          const followUp =
            "We'll follow up personally to confirm your appointment. During business hours (Mon–Sat, 7am–9pm) we typically respond within a few hours; after hours or on Sunday, by the next business day. Questions in the meantime? Call or text (469) 991-2777.";

          const customerHtml = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0F1A2B">
<h2 style="font-family:Georgia,serif;color:#0F1A2B">Thank you for your request${name !== "Unknown" ? `, ${escapeHtml(name)}` : ""}!</h2>
<p>We've received your appointment request. Here are the details you submitted:</p>
<table cellpadding="6" style="border-collapse:collapse;font-size:14px">${detailRows
            .map(
              ([k, v]) =>
                `<tr><td style="color:#666">${escapeHtml(k)}</td><td><strong>${escapeHtml(String(v))}</strong></td></tr>`,
            )
            .join("")}</table>
<p>${escapeHtml(followUp)}</p>
<p style="color:#666">— Enliven Notary</p>
</div>`;
          const customerText = `Thank you for your request${name !== "Unknown" ? `, ${name}` : ""}!

We've received your appointment request. Details:
${detailRows.map(([k, v]) => `${k}: ${v}`).join("\n")}

${followUp}

— Enliven Notary`;

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

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      },
    },
  },
});
