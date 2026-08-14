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

    // Notification email is sent by the appointments insert trigger -> /api/public/appointment-notify

    return { ok: true as const };
  });
