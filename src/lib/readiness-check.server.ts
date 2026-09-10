/**
 * Pre-appointment readiness check.
 *
 * A configurable number of hours before a confirmed appointment (Business
 * Profile → readiness check lead time, default 24) the client gets a short
 * checklist by text (Quo) or, when no phone number is on file, by email
 * (Resend). It is informational only: nothing about the appointment changes
 * based on the reply.
 */

const TIME_ZONE = "America/Chicago";

type AppointmentRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  service: string | null;
  meeting_type: string | null;
  address: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  referred_by: string | null;
};

export const toE164 = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`;
  return null;
};

/** Digits-only tail used to match an inbound number back to a sent check. */
export const phoneKey = (raw: string): string => raw.replace(/\D/g, "").slice(-10);

/** "3:30 PM" / "15:30" / "3pm" → minutes past midnight, local to the business. */
function parseTimeToMinutes(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const suffix = match[3] ?? "";
  if (suffix.startsWith("a")) {
    if (hour === 12) hour = 0;
  } else if (suffix.startsWith("p")) {
    if (hour !== 12) hour += 12;
  }
  if (hour > 23 || minutes > 59) return null;
  return hour * 60 + minutes;
}

/** Offset in minutes between the business time zone and UTC on a given date. */
function zoneOffsetMinutes(utcDate: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return (asUtc - utcDate.getTime()) / 60000;
}

/** The appointment's start time as a real instant, or null when unparseable. */
export function appointmentStart(date: string | null, time: string | null): Date | null {
  const day = (date ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!day) return null;
  const minutes = parseTimeToMinutes(time ?? "") ?? 9 * 60;
  const naive = Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 0, minutes);
  // Resolve the zone offset twice so DST boundaries land on the right instant.
  const first = new Date(naive - zoneOffsetMinutes(new Date(naive)) * 60000);
  return new Date(naive - zoneOffsetMinutes(first) * 60000);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function friendlyWhen(date: string | null, time: string | null): string {
  const day = (date ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  const datePart = day ? `${MONTHS[Number(day[2]) - 1]} ${Number(day[3])}` : (date ?? "").trim();
  const minutes = parseTimeToMinutes(time ?? "");
  let timePart = (time ?? "").trim();
  if (minutes !== null) {
    const h24 = Math.floor(minutes / 60);
    const mm = String(minutes % 60).padStart(2, "0");
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    timePart = `${h12}:${mm} ${h24 < 12 ? "AM" : "PM"}`;
  }
  return [datePart, timePart].filter(Boolean).join(" at ") || "your scheduled time";
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function locationLine(row: AppointmentRow): string {
  if (row.meeting_type === "online") return "Online — secure video session";
  return row.address?.trim() ? row.address.trim() : "the address we have on file";
}

export function readinessSmsText(row: AppointmentRow, businessPhone: string): string {
  const first = (row.name ?? "").trim().split(/\s+/)[0] || "there";
  const when = friendlyWhen(row.preferred_date, row.preferred_time);
  return `Hi ${first}, this is Enliven Notary. Quick check before your ${when} appointment:

1) Will every signer have a valid, unexpired government-issued photo ID?
2) Is the location still correct — ${locationLine(row)}? Any parking or entry details we should know?
3) Any special instructions for us?

Just reply to this text with anything we should know. Nothing changes about your appointment — this is only so we arrive prepared. Questions? ${businessPhone}`;
}

export function readinessEmail(row: AppointmentRow, businessPhone: string, businessEmail: string) {
  const first = (row.name ?? "").trim().split(/\s+/)[0] || "there";
  const when = friendlyWhen(row.preferred_date, row.preferred_time);
  const where = locationLine(row);
  const items = [
    "Will every signer have a valid, unexpired government-issued photo ID?",
    `Is the location still correct — ${where}? Please share any parking, gate, or entry details.`,
    "Any special instructions for us?",
  ];

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1B1B1B;line-height:1.6">
  <p style="font-family:Georgia,serif;font-size:22px;color:#0F1A2B;margin:0 0 16px">Getting ready for your appointment</p>
  <p>Hi ${escapeHtml(first)},</p>
  <p>Your ${escapeHtml(row.service?.trim() || "notary")} appointment is coming up on <strong>${escapeHtml(when)}</strong>. A few quick things so we arrive fully prepared:</p>
  <ol style="padding-left:20px">${items.map((i) => `<li style="margin-bottom:8px">${escapeHtml(i)}</li>`).join("")}</ol>
  <p>Simply reply to this email with anything we should know — including any special instructions.</p>
  <p style="color:#666">This is a reminder only. Your appointment stays exactly as scheduled no matter how you reply.</p>
  <p style="color:#666">Enliven Notary · ${escapeHtml(businessPhone)} · <a href="mailto:${escapeHtml(businessEmail)}" style="color:#8A6A12">${escapeHtml(businessEmail)}</a></p>
</div>`;

  const text = [
    `Hi ${first},`,
    "",
    `Your ${row.service?.trim() || "notary"} appointment is coming up on ${when}. A few quick things so we arrive fully prepared:`,
    ...items.map((i, n) => `${n + 1}) ${i}`),
    "",
    "Simply reply to this email with anything we should know — including any special instructions.",
    "This is a reminder only. Your appointment stays exactly as scheduled no matter how you reply.",
    "",
    `Enliven Notary · ${businessPhone} · ${businessEmail}`,
  ].join("\n");

  return { subject: `Getting ready for your ${when} appointment`, html, text };
}

export type ReadinessSendResult = {
  appointmentId: string;
  channel: "sms" | "email" | "none";
  status: "sent" | "failed" | "skipped";
  detail?: string;
};

/** Resolves the CRM contact this client's reply should be logged against. */
async function resolveContactId(row: AppointmentRow): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = (row.email ?? "").trim().toLowerCase();
  if (email) {
    const { data } = await supabaseAdmin
      .from("business_contacts")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }
  return row.referred_by ? String(row.referred_by) : null;
}

/** Sends one readiness check and records it. Safe to call twice — one row per appointment. */
export async function sendReadinessCheck(row: AppointmentRow): Promise<ReadinessSendResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { loadBusinessProfile } = await import("@/lib/business-profile.server");
  const profile = await loadBusinessProfile();

  const phone = toE164((row.phone ?? "").trim());
  const email = (row.email ?? "").trim();
  const contactId = await resolveContactId(row);

  if (!phone && !email) {
    return { appointmentId: row.id, channel: "none", status: "skipped", detail: "no phone or email on file" };
  }

  const channel: "sms" | "email" = phone ? "sms" : "email";
  const toAddress = phone ?? email.toLowerCase();
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  if (channel === "sms") {
    const key = process.env["OPENPHONE_API_KEY"];
    const from = process.env["OPENPHONE_FROM_NUMBER"] ?? "+14699912777";
    if (!key) {
      status = "failed";
      errorMessage = "Text messaging is not configured.";
      console.error("readiness-check: OPENPHONE_API_KEY missing");
    } else {
      try {
        const res = await fetch("https://api.openphone.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: key },
          body: JSON.stringify({ from, to: [phone], content: readinessSmsText(row, profile.phone) }),
        });
        if (!res.ok) {
          status = "failed";
          errorMessage = `Text delivery failed (${res.status}).`;
          console.error(`readiness-check: Quo send failed [${res.status}]: ${await res.text()}`);
        }
      } catch (error) {
        status = "failed";
        errorMessage = "Text delivery failed.";
        console.error("readiness-check: Quo send threw", error);
      }
    }
  } else {
    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) {
      status = "failed";
      errorMessage = "Email sending is not configured.";
      console.error("readiness-check: RESEND_API_KEY missing");
    } else {
      const message = readinessEmail(row, profile.phone, profile.email);
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "Enliven Notary <bookings@send.enlivennotary.com>",
            reply_to: "replies@replies.enlivennotary.com",
            to: [toAddress],
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
        });
        if (!res.ok) {
          status = "failed";
          errorMessage = `Email delivery failed (${res.status}).`;
          console.error(`readiness-check: Resend failed [${res.status}]: ${await res.text()}`);
        }
      } catch (error) {
        status = "failed";
        errorMessage = "Email delivery failed.";
        console.error("readiness-check: Resend threw", error);
      }
    }
  }

  const { error: insertError } = await supabaseAdmin.from("readiness_checks").upsert(
    {
      appointment_id: row.id,
      contact_id: contactId,
      channel,
      to_address: toAddress,
      status,
      error_message: errorMessage,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    },
    { onConflict: "appointment_id" },
  );
  if (insertError) console.error("readiness-check: could not record check", insertError.message);

  return { appointmentId: row.id, channel, status, detail: errorMessage ?? undefined };
}

/**
 * Logs a client's readiness reply on their CRM record and stores it on the
 * check itself. Returns true when the reply belonged to a readiness check.
 */
export async function logReadinessReply(args: {
  address: string;
  body: string;
  matchBy: "email" | "phone";
}): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: checks } = await supabaseAdmin
    .from("readiness_checks")
    .select("id, appointment_id, contact_id, to_address, channel, sent_at")
    .eq("channel", args.matchBy === "phone" ? "sms" : "email")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  const wanted = args.matchBy === "phone" ? phoneKey(args.address) : args.address.trim().toLowerCase();
  const match = (checks ?? []).find((c) => {
    const stored = String(c.to_address ?? "");
    return args.matchBy === "phone" ? phoneKey(stored) === wanted : stored.toLowerCase() === wanted;
  });
  if (!match) return false;

  await supabaseAdmin
    .from("readiness_checks")
    .update({ reply_text: args.body.slice(0, 4000), replied_at: new Date().toISOString() })
    .eq("id", match.id);

  if (match.contact_id) {
    const { error } = await supabaseAdmin.from("contact_activities").insert({
      contact_id: match.contact_id,
      activity_type: "Email",
      description: `Readiness check reply (${match.channel === "sms" ? "text" : "email"})\n\n${args.body.slice(0, 4000)}`,
    });
    if (error) console.error("readiness-check: reply activity failed", error.message);
  }

  return true;
}
