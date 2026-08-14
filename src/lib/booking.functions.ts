import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bookingSchema = z.object({
  service: z.string().trim().min(1).max(120),
  location: z.enum(["mobile", "online"]),
  date: z.string().trim().min(1).max(40),
  time: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("appointments").insert({
      service: data.service,
      meeting_type: data.location,
      address: data.address || null,
      preferred_date: data.date,
      preferred_time: data.time,
      name: data.name,
      email: data.email,
      phone: data.phone,
      notes: data.notes || null,
    });


    if (error) {
      console.error("Failed to save booking request", error);
      throw new Error("Could not save your request. Please call or text (469) 991-2777.");
    }

    // Best-effort notification — a delivery failure must not lose a saved booking.
    try {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (apiKey) {
        const { sendLovableEmail } = await import("@lovable.dev/email-js");
        const escapeHtml = (value: string) =>
          value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const rows: [string, string][] = [
          ["Service", data.service],
          ["Location", data.location === "online" ? "Online — secure video" : `Mobile${data.address ? ` — ${data.address}` : ""}`],
          ["Preferred date", data.date],
          ["Preferred time", data.time],
          ["Name", data.name],
          ["Email", data.email],
          ["Phone", data.phone],
          ["Notes", data.notes || "—"],
        ];
        const html = `<h2 style="font-family:Georgia,serif">New appointment request</h2><table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">${rows
          .map(([k, v]) => `<tr><td style="color:#666">${k}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`)
          .join("")}</table>`;
        const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

        await sendLovableEmail(
          {
            to: "info@enlivennotary.com",
            from: "Enliven Notary <bookings@notify.enlivennotary.com>",
            sender_domain: "notify.enlivennotary.com",
            subject: `New booking request — ${data.name} (${data.date} ${data.time})`,
            html,
            text,
            purpose: "transactional",
            idempotency_key: `booking-${data.email}-${data.date}-${data.time}-${Date.now()}`,
          },
          { apiKey },
        );
      }
    } catch (e) {
      console.error("Booking saved but notification email failed", e);
    }

    return { ok: true as const };
  });
