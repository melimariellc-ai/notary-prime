import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly sweep: sends the pre-appointment readiness check for any confirmed
 * appointment whose start time is now inside the configured lead-time window.
 * Informational only — nothing about the appointment is changed here.
 */
export const Route = createFileRoute("/api/public/appointment-readiness-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const auth = request.headers.get("authorization");
        if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { appointmentStart, sendReadinessCheck } = await import("@/lib/readiness-check.server");

        let hours = 24;
        const { data: profile } = await supabaseAdmin
          .from("business_profile")
          .select("readiness_check_hours")
          .eq("id", 1)
          .maybeSingle();
        const configured = Number(profile?.readiness_check_hours ?? 24);
        if (Number.isFinite(configured) && configured > 0) hours = Math.min(configured, 336);

        const today = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const { data: appointments, error } = await supabaseAdmin
          .from("appointments")
          .select("id, name, email, phone, service, meeting_type, address, preferred_date, preferred_time, referred_by")
          .gte("preferred_date", today)
          .order("preferred_date", { ascending: true })
          .limit(500);

        if (error) {
          console.error("readiness-check: appointment query failed", error.message);
          return new Response("Query failed", { status: 500 });
        }

        const { data: existing } = await supabaseAdmin.from("readiness_checks").select("appointment_id");
        const alreadySent = new Set((existing ?? []).map((r) => String(r.appointment_id)));

        const now = Date.now();
        const windowMs = hours * 60 * 60 * 1000;
        const results = [];

        for (const row of appointments ?? []) {
          const id = String(row.id);
          if (alreadySent.has(id)) continue;
          const start = appointmentStart(row.preferred_date, row.preferred_time);
          if (!start) continue;
          const startMs = start.getTime();
          if (startMs <= now) continue; // already happened
          if (startMs - now > windowMs) continue; // not due yet
          results.push(await sendReadinessCheck(row as never));
        }

        return Response.json({ ok: true, leadTimeHours: hours, checked: appointments?.length ?? 0, sent: results });
      },
    },
  },
});
