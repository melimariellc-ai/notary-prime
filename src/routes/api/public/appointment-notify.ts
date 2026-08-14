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

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Enliven Notary <bookings@enlivennotary.com>",
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

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
