import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CONTACT_TYPES = [
  "Title Company",
  "Real Estate Agent",
  "Attorney",
  "Other Referral Source",
] as const;

export const PIPELINE_STAGES = [
  "New Lead",
  "Contacted",
  "Meeting Scheduled",
  "Active Referral Source",
  "Inactive",
] as const;

export const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Note"] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type BusinessContact = {
  id: string;
  business_name: string;
  contact_person: string | null;
  contact_type: ContactType;
  phone: string | null;
  email: string | null;
  pipeline_stage: PipelineStage;
  first_contacted_date: string | null;
  next_follow_up_date: string | null;
  referral_source: string | null;
  total_jobs_referred: number;
  created_at: string;
};

export type ContactActivity = {
  id: string;
  contact_id: string;
  activity_date: string;
  activity_type: ActivityType;
  description: string;
  created_at: string;
};

const COLUMNS =
  "id, business_name, contact_person, contact_type, phone, email, pipeline_stage, first_contacted_date, next_follow_up_date, referral_source, total_jobs_referred, created_at";

function text(value: unknown, max = 300): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return s.slice(0, max);
}

function uuid(value: unknown): string {
  const s = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Invalid id.");
  return s;
}

function dateOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Invalid date.");
  return s;
}

export const listBusinessContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("business_contacts")
      .select(COLUMNS)
      .order("next_follow_up_date", { ascending: true, nullsFirst: false })
      .order("business_name", { ascending: true })
      .limit(1000);

    if (error) {
      console.error("Failed to load business contacts", error);
      throw new Error("Could not load contacts.");
    }
    return { contacts: (data ?? []) as unknown as BusinessContact[] };
  });

export const getBusinessContact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: uuid(data.id) }))
  .handler(async ({ data, context }) => {
    const { data: contact, error } = await context.supabase
      .from("business_contacts")
      .select(COLUMNS)
      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load contact", error);
      throw new Error("Could not load that contact.");
    }

    const { data: activities, error: aErr } = await context.supabase
      .from("contact_activities")
      .select("id, contact_id, activity_date, activity_type, description, created_at")
      .eq("contact_id", data.id)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (aErr) console.error("Failed to load activities", aErr);

    return {
      contact: (contact ?? null) as unknown as BusinessContact | null,
      activities: (activities ?? []) as unknown as ContactActivity[],
    };
  });

type ContactInput = {
  business_name: string;
  contact_person?: string | null;
  contact_type?: string;
  phone?: string | null;
  email?: string | null;
  pipeline_stage?: string;
  first_contacted_date?: string | null;
  next_follow_up_date?: string | null;
  referral_source?: string | null;
  total_jobs_referred?: number | string;
};

function validateContact(data: ContactInput) {
  const business_name = text(data.business_name, 200);
  if (!business_name) throw new Error("Business name is required.");

  const contact_type = String(data.contact_type ?? "Other Referral Source");
  if (!CONTACT_TYPES.includes(contact_type as ContactType)) throw new Error("Invalid contact type.");

  const pipeline_stage = String(data.pipeline_stage ?? "New Lead");
  if (!PIPELINE_STAGES.includes(pipeline_stage as PipelineStage)) throw new Error("Invalid pipeline stage.");

  const jobs = Number(data.total_jobs_referred ?? 0);

  return {
    business_name,
    contact_person: text(data.contact_person, 200),
    contact_type: contact_type as ContactType,
    phone: text(data.phone, 40),
    email: text(data.email, 200),
    pipeline_stage: pipeline_stage as PipelineStage,
    first_contacted_date: dateOrNull(data.first_contacted_date),
    next_follow_up_date: dateOrNull(data.next_follow_up_date),
    referral_source: text(data.referral_source, 500),
    total_jobs_referred: Number.isFinite(jobs) && jobs >= 0 ? Math.floor(jobs) : 0,
  };
}

export const createBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ContactInput) => validateContact(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("business_contacts")
      .insert(data)
      .select("id")
      .maybeSingle();

    if (error || !row) {
      console.error("Failed to create contact", error);
      return { ok: false as const, message: "Could not save that contact." };
    }
    return { ok: true as const, id: row.id as string };
  });

export const updateBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ContactInput & { id: string }) => ({
    id: uuid(data.id),
    ...validateContact(data),
  }))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { error } = await context.supabase.from("business_contacts").update(fields).eq("id", id);
    if (error) {
      console.error("Failed to update contact", error);
      return { ok: false as const, message: "Could not save changes." };
    }
    return { ok: true as const };
  });

export const setPipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; stage: string }) => {
    const stage = String(data.stage ?? "");
    if (!PIPELINE_STAGES.includes(stage as PipelineStage)) throw new Error("Invalid pipeline stage.");
    return { id: uuid(data.id), stage: stage as PipelineStage };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("business_contacts")
      .update({ pipeline_stage: data.stage })
      .eq("id", data.id);
    if (error) {
      console.error("Failed to update stage", error);
      return { ok: false as const, message: "Could not update the stage." };
    }
    return { ok: true as const };
  });

export const deleteBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: uuid(data.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("business_contacts").delete().eq("id", data.id);
    if (error) {
      console.error("Failed to delete contact", error);
      return { ok: false as const, message: "Could not delete that contact." };
    }
    return { ok: true as const };
  });

export const addContactActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string; date?: string | null; type: string; description: string }) => {
    const type = String(data.type ?? "Note");
    if (!ACTIVITY_TYPES.includes(type as ActivityType)) throw new Error("Invalid activity type.");
    const description = text(data.description, 5000);
    if (!description) throw new Error("Please add a description.");
    return {
      contactId: uuid(data.contactId),
      activity_date: dateOrNull(data.date) ?? new Date().toISOString().slice(0, 10),
      activity_type: type as ActivityType,
      description,
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("contact_activities").insert({
      contact_id: data.contactId,
      activity_date: data.activity_date,
      activity_type: data.activity_type,
      description: data.description,
      created_by: context.userId,
    });
    if (error) {
      console.error("Failed to log activity", error);
      return { ok: false as const, message: "Could not log that activity." };
    }
    return { ok: true as const };
  });
