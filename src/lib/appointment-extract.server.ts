/**
 * Turns an inbound email that looks like a booking request into a draft
 * appointment awaiting human review. Never creates a live appointment.
 */

export type ExtractInput = {
  inboundEmailId: string | null;
  contactId: string | null;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  body: string;
};

const SCHEDULING_PATTERNS: RegExp[] = [
  /\bnotar(y|ize|ization)\b/i,
  /\b(schedule|scheduling|reschedule|book|booking|appointment|appt)\b/i,
  /\b(signing|closing|loan docs?|refinance|poa|power of attorney|apostille|will|affidavit)\b/i,
  /\b(available|availability|can you (come|meet)|what time|time slot)\b/i,
  /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*\b(\d{1,2}(:\d{2})?\s*(am|pm))\b/i,
];

export function looksLikeSchedulingRequest(subject: string | null, body: string): boolean {
  const text = `${subject ?? ""}\n${body}`;
  let hits = 0;
  for (const re of SCHEDULING_PATTERNS) if (re.test(text)) hits += 1;
  return hits >= 2;
}

const FIELDS = [
  "name",
  "email",
  "phone",
  "service",
  "meeting_type",
  "address",
  "preferred_date",
  "preferred_time",
  "notes",
] as const;

type Field = (typeof FIELDS)[number];
type Extracted = Partial<Record<Field, string>>;

function clean(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(unknown|none|n\/a|null|not specified|not mentioned)$/i.test(trimmed)) return null;
  return trimmed.slice(0, max);
}

async function askClaude(input: ExtractInput): Promise<{ data: Extracted; summary: string | null } | { error: string }> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return { error: "The Claude API key hasn't been added yet." };

  const today = new Date().toISOString().slice(0, 10);
  const prompt = [
    "You read emails sent to a mobile notary business and pull out appointment details.",
    `Today's date is ${today}. Resolve relative dates (\"tomorrow\", \"next Tuesday\") against it.`,
    "",
    "Email:",
    `From: ${input.fromName ? `${input.fromName} <${input.fromEmail}>` : input.fromEmail}`,
    `Subject: ${input.subject ?? "(none)"}`,
    "Body:",
    input.body.slice(0, 8000),
    "",
    "Return ONLY a JSON object with these keys, using null when the email does not say:",
    '{"is_booking_request": true|false, "name": string|null, "email": string|null, "phone": string|null,',
    ' "service": string|null, "meeting_type": "mobile"|"online"|null, "address": string|null,',
    ' "preferred_date": "YYYY-MM-DD"|null, "preferred_time": string|null, "notes": string|null,',
    ' "summary": string}',
    "Never invent details. Put anything useful that has no field of its own into notes.",
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-5-20250929",
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("appointment-extract: Claude failed", res.status, detail.slice(0, 400));
    return { error: `Claude could not read this email (${res.status}).` };
  }

  const payload = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (payload.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { error: "Claude returned no readable details." };

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return { error: "Claude returned details we could not read." };
  }

  if (parsed["is_booking_request"] === false) return { error: "not_a_booking_request" };

  const data: Extracted = {};
  for (const field of FIELDS) {
    const value = clean(parsed[field], field === "notes" ? 4000 : 500);
    if (value) data[field] = value;
  }
  if (data.meeting_type && !/^(mobile|online)$/i.test(data.meeting_type)) delete data.meeting_type;
  if (data.meeting_type) data.meeting_type = data.meeting_type.toLowerCase();
  if (data.preferred_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.preferred_date)) {
    // Keep whatever was written; a reviewer can correct it before approving.
    data.preferred_date = data.preferred_date.slice(0, 40);
  }

  return { data, summary: clean(parsed["summary"], 500) };
}

/**
 * Creates a "Pending review" draft when the email is from a known CRM contact or
 * reads like a scheduling request. Returns false when the email is ignored.
 */
export async function maybeCreateAppointmentDraft(input: ExtractInput): Promise<boolean> {
  const isKnownContact = Boolean(input.contactId);
  if (!isKnownContact && !looksLikeSchedulingRequest(input.subject, input.body)) return false;

  const result = await askClaude(input);
  if ("error" in result && result.error === "not_a_booking_request") return false;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const data = "error" in result ? {} : result.data;
  const found = FIELDS.filter((f) => Boolean(data[f]));

  const { error } = await supabaseAdmin.from("appointment_drafts").upsert(
    {
      inbound_email_id: input.inboundEmailId,
      contact_id: input.contactId,
      from_email: input.fromEmail,
      from_name: input.fromName,
      subject: input.subject,
      raw_body: input.body.slice(0, 20000),
      name: data.name ?? input.fromName ?? null,
      email: data.email ?? input.fromEmail,
      phone: data.phone ?? null,
      service: data.service ?? null,
      meeting_type: data.meeting_type ?? null,
      address: data.address ?? null,
      preferred_date: data.preferred_date ?? null,
      preferred_time: data.preferred_time ?? null,
      notes: data.notes ?? null,
      found_fields: found,
      ai_summary: "error" in result ? null : result.summary,
      ai_error: "error" in result ? result.error : null,
      status: "pending_review",
    },
    { onConflict: "inbound_email_id" },
  );

  if (error) {
    console.error("appointment-extract: draft insert failed", error.message);
    return false;
  }
  return true;
}
