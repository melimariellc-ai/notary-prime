import { maybeCreateAppointmentDraft } from "@/lib/appointment-extract.server";

const body = `---------- Forwarded message ---------
From: Dana Whitfield <dana@titlepartnersdfw.com>
Date: Wed, Sep 9, 2026 at 4:12 PM
Subject: Signing needed Friday

Hi Melissa,

We have a refinance loan signing that needs a notary this Friday, September 11th at
2:30pm. The borrowers are Luis and Marta Perez, and they'd like you to come to their
home at 1420 Oakbend Dr, Plano TX 75023. Their cell is (972) 555-0142.

Please confirm if that works. There are two sets of docs.

Thanks,
Dana Whitfield
Title Partners DFW
`;

const ok = await maybeCreateAppointmentDraft({
  inboundEmailId: null,
  contactId: null,
  fromEmail: "dana@titlepartnersdfw.com",
  fromName: "Dana Whitfield",
  subject: "Fwd: Signing needed Friday",
  body,
});
console.log("draft created:", ok);

const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
const { data } = await supabaseAdmin
  .from("appointment_drafts")
  .select("id, name, phone, service, meeting_type, address, preferred_date, preferred_time, notes, found_fields, status, ai_summary, ai_error")
  .order("created_at", { ascending: false })
  .limit(1);
console.log(JSON.stringify(data, null, 2));
