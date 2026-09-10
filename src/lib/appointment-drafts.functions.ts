import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AppointmentDraft = {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  raw_body: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  service: string | null;
  meeting_type: string | null;
  address: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  found_fields: string[];
  ai_summary: string | null;
  ai_error: string | null;
  status: string;
  contact_id: string | null;
  appointment_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const SELECT =
  "id, from_email, from_name, subject, raw_body, name, email, phone, service, meeting_type, address, preferred_date, preferred_time, notes, found_fields, ai_summary, ai_error, status, contact_id, appointment_id, reviewed_at, created_at";

async function canReview(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    console.error("Failed to read roles", error);
    return false;
  }
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.includes("admin") || roles.includes("employee");
}

const uuid = (value: unknown): string => {
  const s = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Invalid request.");
  return s;
};

const text = (value: unknown, max = 500): string | null => {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
};

export const listAppointmentDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await canReview(context.supabase, context.userId)))
      return { forbidden: true as const, drafts: [] as AppointmentDraft[] };

    const { data, error } = await context.supabase
      .from("appointment_drafts")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Failed to load appointment drafts", error);
      return { forbidden: false as const, drafts: [] as AppointmentDraft[] };
    }
    return { forbidden: false as const, drafts: (data ?? []) as AppointmentDraft[] };
  });

type DraftFields = {
  name?: string;
  email?: string;
  phone?: string;
  service?: string;
  meeting_type?: string;
  address?: string;
  preferred_date?: string;
  preferred_time?: string;
  notes?: string;
};

function normalizeFields(data: DraftFields) {
  const meeting = text(data.meeting_type, 20);
  return {
    name: text(data.name, 100),
    email: text(data.email, 255),
    phone: text(data.phone, 30),
    service: text(data.service, 120),
    meeting_type: meeting && /^(mobile|online)$/i.test(meeting) ? meeting.toLowerCase() : null,
    address: text(data.address, 200),
    preferred_date: text(data.preferred_date, 40),
    preferred_time: text(data.preferred_time, 40),
    notes: text(data.notes, 4000),
  };
}

export const updateAppointmentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DraftFields & { id: string }) => ({
    id: uuid(data.id),
    ...normalizeFields(data),
  }))
  .handler(async ({ data, context }) => {
    if (!(await canReview(context.supabase, context.userId)))
      return { ok: false as const, message: "You do not have permission to review email requests." };

    const { id, ...fields } = data;
    const { error } = await context.supabase
      .from("appointment_drafts")
      .update(fields)
      .eq("id", id)
      .eq("status", "pending_review");

    if (error) {
      console.error("Failed to update appointment draft", error);
      return { ok: false as const, message: "Could not save your changes." };
    }
    return { ok: true as const };
  });

export const approveAppointmentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DraftFields & { id: string }) => ({
    id: uuid(data.id),
    ...normalizeFields(data),
  }))
  .handler(async ({ data, context }) => {
    if (!(await canReview(context.supabase, context.userId)))
      return { ok: false as const, message: "You do not have permission to approve email requests." };

    const { id, ...fields } = data;

    const missing: string[] = [];
    if (!fields.name) missing.push("name");
    if (!fields.email) missing.push("email");
    if (!fields.phone) missing.push("phone number");
    if (!fields.service) missing.push("service");
    if (!fields.meeting_type) missing.push("mobile or online");
    if (!fields.preferred_date) missing.push("date");
    if (!fields.preferred_time) missing.push("time");
    if (missing.length > 0) {
      return {
        ok: false as const,
        message: `Please fill in the ${missing.join(", ")} before approving.`,
      };
    }

    const { data: draft, error: readError } = await context.supabase
      .from("appointment_drafts")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (readError || !draft) return { ok: false as const, message: "That request could not be found." };
    if (draft.status !== "pending_review")
      return { ok: false as const, message: "This request has already been reviewed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: insertError } = await supabaseAdmin
      .from("appointments")
      .insert({
        name: fields.name!,
        email: fields.email!,
        phone: fields.phone!,
        service: fields.service!,
        meeting_type: fields.meeting_type!,
        address: fields.address,
        preferred_date: fields.preferred_date!,
        preferred_time: fields.preferred_time!,
        notes: fields.notes,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !created) {
      console.error("Failed to create appointment from draft", insertError);
      return { ok: false as const, message: "Could not create the appointment. Please try again." };
    }

    const { error: updateError } = await supabaseAdmin
      .from("appointment_drafts")
      .update({
        ...fields,
        status: "approved",
        appointment_id: created.id,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) console.error("Failed to mark draft approved", updateError);

    return { ok: true as const, appointmentId: created.id as string };
  });

export const rejectAppointmentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: uuid(data.id) }))
  .handler(async ({ data, context }) => {
    if (!(await canReview(context.supabase, context.userId)))
      return { ok: false as const, message: "You do not have permission to review email requests." };

    const { error } = await context.supabase
      .from("appointment_drafts")
      .update({
        status: "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "pending_review");

    if (error) {
      console.error("Failed to reject appointment draft", error);
      return { ok: false as const, message: "Could not update this request." };
    }
    return { ok: true as const };
  });
