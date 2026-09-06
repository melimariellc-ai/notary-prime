import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const Route = createFileRoute("/api/public/crm-followup-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const auth = request.headers.get("authorization");
        if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const resendKey = process.env["RESEND_API_KEY"];
        if (!resendKey) {
          console.error("RESEND_API_KEY is not configured");
          return new Response("Email not configured", { status: 500 });
        }

        const supabase = createClient(process.env["SUPABASE_URL"]!, serviceKey, {
          auth: { persistSession: false },
        });

        const today = new Date().toISOString().slice(0, 10);

        const { data: due, error } = await supabase
          .from("business_contacts")
          .select("business_name, contact_person, contact_type, phone, email, pipeline_stage, next_follow_up_date")
          .not("next_follow_up_date", "is", null)
          .lte("next_follow_up_date", today)
          .order("next_follow_up_date", { ascending: true });

        if (error) {
          console.error("Digest query failed", error);
          return new Response(`Query failed: ${error.message}`, { status: 500 });
        }

        if (!due || due.length === 0) {
          return new Response(JSON.stringify({ sent: false, reason: "no follow-ups due" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: recipients, error: rErr } = await supabase
          .from("profiles")
          .select("email, role")
          .in("role", ["admin", "employee"]);

        if (rErr) {
          console.error("Recipient query failed", rErr);
          return new Response(`Query failed: ${rErr.message}`, { status: 500 });
        }

        const to = Array.from(
          new Set((recipients ?? []).map((r) => (r.email ?? "").trim()).filter(Boolean)),
        );
        if (to.length === 0) {
          return new Response(JSON.stringify({ sent: false, reason: "no admin or employee recipients" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const rows = due
          .map((c) => {
            const overdue = (c.next_follow_up_date ?? today) < today;
            const cells = [
              c.business_name ?? "—",
              c.contact_person || "—",
              c.contact_type ?? "—",
              c.pipeline_stage ?? "—",
              [c.phone, c.email].filter(Boolean).join(" · ") || "—",
              `${c.next_follow_up_date ?? "—"}${overdue ? " (overdue)" : ""}`,
            ];
            return `<tr>${cells
              .map(
                (v, i) =>
                  `<td style="padding:8px;border-bottom:1px solid #eee;${i === 0 ? "font-weight:bold;" : "color:#444;"}">${escapeHtml(String(v))}</td>`,
              )
              .join("")}</tr>`;
          })
          .join("");

        const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0F1A2B">
<h2 style="font-family:Georgia,serif">Business development follow-ups due</h2>
<p>${due.length} contact${due.length === 1 ? "" : "s"} need${due.length === 1 ? "s" : ""} attention today.</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
<thead><tr>${["Business", "Contact", "Type", "Stage", "Reach out", "Due"]
          .map(
            (h) =>
              `<th align="left" style="padding:8px;border-bottom:2px solid #C9A227;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666">${h}</th>`,
          )
          .join("")}</tr></thead>
<tbody>${rows}</tbody></table>
<p style="color:#666">Enliven Notary · CRM daily digest</p>
</div>`;

        const text = due
          .map(
            (c) =>
              `${c.business_name} (${c.contact_type}) — ${c.contact_person || "no contact person"} — due ${c.next_follow_up_date}`,
          )
          .join("\n");

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Enliven Notary <bookings@send.enlivennotary.com>",
            to,
            subject: `Follow-ups due today — ${due.length} contact${due.length === 1 ? "" : "s"}`,
            html,
            text,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Resend digest failed [${response.status}]: ${errorBody}`);
          return new Response(`Resend failed [${response.status}]: ${errorBody}`, { status: 502 });
        }

        return new Response(JSON.stringify({ sent: true, contacts: due.length, recipients: to.length }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
