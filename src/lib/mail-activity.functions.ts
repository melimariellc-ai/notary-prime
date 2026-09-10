import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only mail feed. Nothing here sends or logs email — it only gathers what
 * the existing email features already record:
 *  - contact_activities (outreach emails sent, replies logged against a contact)
 *  - inbound_emails      (replies received through the two-way email system)
 *  - profiles            (team invitation emails sent when an account is created)
 *  - email_send_log      (queued/auth emails, with the delivery status recorded)
 *  - suppressed_emails   (bounces/complaints, used to mark an address as bounced)
 */

export type MailDirection = "sent" | "received";
export type MailStatus = "sent" | "delivered" | "replied" | "bounced" | "suppressed" | "failed" | "received";

export type MailActivityRow = {
  id: string;
  direction: MailDirection;
  address: string;
  subject: string | null;
  preview: string;
  /** Full text of the message, when the system has it stored. */
  body: string;
  at: string;
  status: MailStatus;
  kind: string;
  contactId: string | null;
  contactName: string | null;
  /** Set when this email produced an appointment intake draft. */
  draftId: string | null;
  draftStatus: string | null;
  /** Set when this row is an emailed pre-appointment readiness check. */
  appointmentId: string | null;
};

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

function splitSubject(description: string): { subject: string | null; body: string } {
  const match = description.match(/^\s*subject:\s*(.+?)\s*(?:\n|$)/i);
  if (!match) return { subject: null, body: clean(description) };
  return {
    subject: clean(match[1] ?? ""),
    body: clean(description.slice(match[0].length)),
  };
}

async function canView(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    console.error("Failed to read roles", error);
    return false;
  }
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.includes("admin") || roles.includes("employee");
}

export const listMailActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await canView(context.supabase, context.userId)))
      return { forbidden: true as const, rows: [] as MailActivityRow[] };

    const supabase = context.supabase;

    const [
      contactsRes,
      activitiesRes,
      inboundRes,
      invitesRes,
      sendLogRes,
      suppressedRes,
      draftsRes,
      readinessRes,
    ] = await Promise.all([
      supabase.from("business_contacts").select("id, business_name, email"),
      supabase
        .from("contact_activities")
        .select("id, contact_id, activity_date, activity_type, description, created_at")
        .eq("activity_type", "Email")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("inbound_emails")
        .select("id, from_email, from_name, subject, text_body, html_body, received_at, contact_id")
        .order("received_at", { ascending: false })
        .limit(500),
      supabase.from("profiles").select("id, name, email, role, created_at").order("created_at", { ascending: false }),
      supabase
        .from("email_send_log")
        .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("suppressed_emails").select("email, reason"),
      supabase
        .from("appointment_drafts")
        .select("id, inbound_email_id, status, contact_id, appointment_id")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("readiness_checks")
        .select("id, appointment_id, contact_id, channel, to_address, status, sent_at, created_at, reply_text, replied_at")
        .eq("channel", "email")
        .order("created_at", { ascending: false })
        .limit(300),
      ]);

    const draftByInbound = new Map<string, { id: string; status: string }>();
    for (const d of draftsRes.data ?? []) {
      const inboundId = d.inbound_email_id ? String(d.inbound_email_id) : null;
      if (inboundId && !draftByInbound.has(inboundId)) {
        draftByInbound.set(inboundId, { id: String(d.id), status: String(d.status) });
      }
    }

    const contacts = contactsRes.data ?? [];
    const byId = new Map(contacts.map((c) => [c.id as string, c]));
    const byEmail = new Map(
      contacts
        .filter((c) => c.email)
        .map((c) => [String(c.email).toLowerCase(), c] as const),
    );

    const bounced = new Set<string>();
    for (const s of suppressedRes.data ?? []) {
      if (/bounce|complain/i.test(String(s.reason ?? ""))) bounced.add(String(s.email).toLowerCase());
    }

    const rows: MailActivityRow[] = [];

    // Replies received (two-way email system).
    const replyTimes = new Map<string, number>();
    for (const r of inboundRes.data ?? []) {
      const address = String(r.from_email).toLowerCase();
      const contact = r.contact_id ? byId.get(r.contact_id as string) : byEmail.get(address);
      const body =
        String(r.text_body ?? "") ||
        String(r.html_body ?? "").replace(/<[^>]+>/g, " ");
      const at = String(r.received_at);
      const previous = replyTimes.get(address) ?? 0;
      const stamp = new Date(at).getTime();
      if (stamp > previous) replyTimes.set(address, stamp);

      const draft = draftByInbound.get(String(r.id));

      rows.push({
        id: `inbound-${r.id}`,
        direction: "received",
        address,
        subject: r.subject ? String(r.subject) : null,
        preview: clean(body).slice(0, 200),
        body,
        at,
        status: "received",
        kind: draft ? "Appointment Intake" : "Reply received",
        contactId: (contact?.id as string | undefined) ?? null,
        contactName: (contact?.business_name as string | undefined) ?? null,
        draftId: draft?.id ?? null,
        draftStatus: draft?.status ?? null,
        appointmentId: null,
      });
    }

    // Outreach emails sent, and replies that were logged on a contact timeline.
    for (const a of activitiesRes.data ?? []) {
      const contact = a.contact_id ? byId.get(a.contact_id as string) : undefined;
      const description = String(a.description ?? "");
      const isReplyLog = /^reply received/i.test(description.trim());
      if (isReplyLog) continue; // already surfaced from inbound_emails
      const { subject, body } = splitSubject(description);
      const address = String(contact?.email ?? "").toLowerCase();
      const at = String(a.created_at ?? `${a.activity_date}T12:00:00Z`);
      const repliedAfter = address ? (replyTimes.get(address) ?? 0) > new Date(at).getTime() : false;

      rows.push({
        id: `outreach-${a.id}`,
        direction: "sent",
        address: address || "—",
        subject,
        preview: body.slice(0, 200),
        body,
        at,
        status: address && bounced.has(address) ? "bounced" : repliedAfter ? "replied" : "sent",
        kind: subject ? "Outreach email" : "Email logged",
        contactId: (contact?.id as string | undefined) ?? null,
        contactName: (contact?.business_name as string | undefined) ?? null,
        draftId: null,
        draftStatus: null,
        appointmentId: null,
      });
    }

    // Team invitation emails (one per account created).
    for (const p of invitesRes.data ?? []) {
      const address = String(p.email ?? "").toLowerCase();
      if (!address) continue;
      rows.push({
        id: `invite-${p.id}`,
        direction: "sent",
        address,
        subject: "Welcome to Enliven Notary — set up your password",
        preview: `Invitation sent to ${p.name} (${p.role}).`,
        body: `Invitation sent to ${p.name} (${p.email}) as ${p.role}.\n\nThe welcome email includes a "Set Up Your Password" button and the contact address info@enlivennotary.com.`,
        at: String(p.created_at),
        status: bounced.has(address) ? "bounced" : "sent",
        kind: "Team invitation",
        contactId: byEmail.get(address)?.id as string | undefined ?? null,
        contactName: (byEmail.get(address)?.business_name as string | undefined) ?? null,
        draftId: null,
        draftStatus: null,
        appointmentId: null,
      });
    }

    // Queued/auth emails with a recorded delivery status (latest row per email).
    type SendLogRow = NonNullable<typeof sendLogRes.data>[number];
    const latestByMessage = new Map<string, SendLogRow>();
    for (const row of sendLogRes.data ?? []) {
      const key = String(row.message_id ?? row.id);
      const existing = latestByMessage.get(key);
      if (!existing || new Date(String(row.created_at)) > new Date(String(existing.created_at))) {
        latestByMessage.set(key, row);
      }
    }
    for (const row of latestByMessage.values()) {
      const address = String(row.recipient_email ?? "").toLowerCase();
      const contact = byEmail.get(address);
      const raw = String(row.status ?? "sent");
      const status: MailStatus =
        raw === "bounced" || raw === "complained"
          ? "bounced"
          : raw === "suppressed"
            ? "suppressed"
            : raw === "dlq" || raw === "failed"
              ? "failed"
              : raw === "sent"
                ? "delivered"
                : "sent";
      rows.push({
        id: `log-${row.id}`,
        direction: "sent",
        address: address || "—",
        subject: String(row.template_name ?? "System email"),
        preview: row.error_message ? clean(String(row.error_message)).slice(0, 200) : "Sent through the email queue.",
        body: row.error_message
          ? `Template: ${String(row.template_name ?? "system")}\nStatus: ${raw}\n\n${String(row.error_message)}`
          : `Template: ${String(row.template_name ?? "system")}\nStatus: ${raw}\n\nSent through the email queue.`,
        at: String(row.created_at),
        status,
        kind: "System email",
        contactId: (contact?.id as string | undefined) ?? null,
        contactName: (contact?.business_name as string | undefined) ?? null,
        draftId: null,
        draftStatus: null,
        appointmentId: null,
      });
    }

    // Emailed readiness checks (sent when no phone number is on file).
    for (const r of readinessRes.data ?? []) {
      const address = String(r.to_address ?? "").toLowerCase();
      const contactId = r.contact_id ? String(r.contact_id) : (byEmail.get(address)?.id as string | undefined) ?? null;
      const contact = contactId ? byId.get(contactId) : byEmail.get(address);
      rows.push({
        id: `readiness-${r.id}`,
        direction: "sent",
        address: address || "—",
        subject: "Getting ready for your appointment",
        preview: r.replied_at
          ? `Client replied: ${clean(String(r.reply_text ?? "")).slice(0, 160)}`
          : "Pre-appointment checklist: photo ID, location and parking details, special instructions.",
        body: [
          "Pre-appointment checklist sent to the client:",
          "· A valid, unexpired photo ID for every signer",
          "· The exact location and any parking or access details",
          "· Any special instructions we should know in advance",
          r.replied_at ? `\nClient replied: ${String(r.reply_text ?? "")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        at: String(r.sent_at ?? r.created_at),
        status:
          String(r.status) === "failed"
            ? "failed"
            : bounced.has(address)
              ? "bounced"
              : r.replied_at
                ? "replied"
                : "sent",
        kind: "Readiness Check",
        contactId,
        contactName: (contact?.business_name as string | undefined) ?? null,
        draftId: null,
        draftStatus: null,
        appointmentId: String(r.appointment_id),
      });
    }

    rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return { forbidden: false as const, rows: rows.slice(0, 800) };
  });
