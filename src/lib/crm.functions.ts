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

export type ReferredAppointment = {
  id: string;
  name: string;
  service: string;
  preferred_date: string;
  fee_amount: number | null;
};

export type DuplicateMatch = {
  id: string;
  business_name: string;
  phone: string | null;
  reason: "name" | "phone";
};

const COLUMNS =
  "id, business_name, contact_person, contact_type, phone, email, pipeline_stage, first_contacted_date, next_follow_up_date, referral_source, created_at";

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

export function digits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
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

    const contacts = (data ?? []) as unknown as BusinessContact[];

    const { data: appts } = await context.supabase
      .from("appointments")
      .select("referred_by, fee_amount")
      .not("referred_by", "is", null)
      .limit(5000);

    const referrals: Record<string, { count: number; value: number }> = {};
    for (const a of appts ?? []) {
      const key = a.referred_by as string | null;
      if (!key) continue;
      const entry = referrals[key] ?? { count: 0, value: 0 };
      entry.count += 1;
      entry.value += Number(a.fee_amount ?? 0);
      referrals[key] = entry;
    }

    return { contacts, referrals };
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

    const { data: appts, error: apptErr } = await context.supabase
      .from("appointments")
      .select("id, name, service, preferred_date, fee_amount")
      .eq("referred_by", data.id)
      .order("preferred_date", { ascending: false });

    if (apptErr) console.error("Failed to load referred appointments", apptErr);

    const appointments = (appts ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      service: a.service,
      preferred_date: a.preferred_date,
      fee_amount: a.fee_amount === null ? null : Number(a.fee_amount),
    })) as ReferredAppointment[];

    return {
      contact: (contact ?? null) as unknown as BusinessContact | null,
      activities: (activities ?? []) as unknown as ContactActivity[],
      appointments,
      referralCount: appointments.length,
      referralValue: appointments.reduce((sum, a) => sum + (a.fee_amount ?? 0), 0),
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
};

function validateContact(data: ContactInput) {
  const business_name = text(data.business_name, 200);
  if (!business_name) throw new Error("Business name is required.");

  const contact_type = String(data.contact_type ?? "Other Referral Source");
  if (!CONTACT_TYPES.includes(contact_type as ContactType)) throw new Error("Invalid contact type.");

  const pipeline_stage = String(data.pipeline_stage ?? "New Lead");
  if (!PIPELINE_STAGES.includes(pipeline_stage as PipelineStage)) throw new Error("Invalid pipeline stage.");

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
  };
}

async function findDuplicates(
  supabase: { from: (t: string) => any },
  name: string,
  phone: string | null,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const { data } = await supabase
    .from("business_contacts")
    .select("id, business_name, phone")
    .limit(2000);

  const wantName = name.trim().toLowerCase();
  const wantPhone = digits(phone);

  return ((data ?? []) as { id: string; business_name: string; phone: string | null }[])
    .filter((row) => row.id !== excludeId)
    .map((row) => {
      if (row.business_name.trim().toLowerCase() === wantName)
        return { ...row, reason: "name" as const };
      if (wantPhone && wantPhone.length >= 10 && digits(row.phone) === wantPhone)
        return { ...row, reason: "phone" as const };
      return null;
    })
    .filter((m): m is DuplicateMatch => m !== null);
}

export const checkContactDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { business_name: string; phone?: string | null }) => ({
    business_name: String(data.business_name ?? ""),
    phone: data.phone ? String(data.phone) : null,
  }))
  .handler(async ({ data, context }) => ({
    matches: await findDuplicates(context.supabase as never, data.business_name, data.phone),
  }));

export const createBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ContactInput & { force?: boolean }) => ({
    ...validateContact(data),
    force: Boolean(data.force),
  }))
  .handler(async ({ data, context }) => {
    const { force, ...fields } = data;

    if (!force) {
      const matches = await findDuplicates(context.supabase as never, fields.business_name, fields.phone);
      if (matches.length > 0) {
        return { ok: false as const, duplicates: matches, message: "Possible duplicate found." };
      }
    }

    const { data: row, error } = await context.supabase
      .from("business_contacts")
      .insert(fields)
      .select("id")
      .maybeSingle();

    if (error || !row) {
      console.error("Failed to create contact", error);
      return { ok: false as const, duplicates: [] as DuplicateMatch[], message: "Could not save that contact." };
    }
    return { ok: true as const, id: row.id as string, duplicates: [] as DuplicateMatch[], message: "" };
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

/* ---------------------------------- Bulk import ---------------------------------- */

export type ImportRow = {
  rowNumber: number;
  business_name: string;
  contact_person: string | null;
  contact_type: ContactType;
  phone: string | null;
  email: string | null;
  referral_source: string | null;
  errors: string[];
  duplicates: DuplicateMatch[];
};

export const previewContactImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rows: Record<string, string>[] }) => {
    const rows = Array.isArray(data.rows) ? data.rows.slice(0, 500) : [];
    return { rows };
  })
  .handler(async ({ data, context }) => {
    const { data: all } = await context.supabase
      .from("business_contacts")
      .select("id, business_name, phone")
      .limit(2000);
    const rowsExisting = (all ?? []) as { id: string; business_name: string; phone: string | null }[];

    const seenNames = new Set<string>();
    const result: ImportRow[] = data.rows.map((raw, i) => {
      const business_name = String(raw["business_name"] ?? "").trim().slice(0, 200);
      const typeRaw = String(raw["contact_type"] ?? "").trim();
      const matchedType = CONTACT_TYPES.find((t) => t.toLowerCase() === typeRaw.toLowerCase());
      const errors: string[] = [];
      if (!business_name) errors.push("Business name is required.");
      if (typeRaw && !matchedType) errors.push(`Unknown contact type "${typeRaw}".`);

      const phone = String(raw["phone"] ?? "").trim().slice(0, 40) || null;
      const key = business_name.toLowerCase();
      const duplicates: DuplicateMatch[] = [];
      if (business_name && seenNames.has(key)) {
        errors.push("Duplicated inside this file.");
      }
      if (business_name) seenNames.add(key);

      const wantPhone = digits(phone);
      for (const row of rowsExisting) {
        if (business_name && row.business_name.trim().toLowerCase() === key) {
          duplicates.push({ ...row, reason: "name" });
        } else if (wantPhone.length >= 10 && digits(row.phone) === wantPhone) {
          duplicates.push({ ...row, reason: "phone" });
        }
      }

      return {
        rowNumber: i + 1,
        business_name,
        contact_person: String(raw["contact_person"] ?? "").trim().slice(0, 200) || null,
        contact_type: (matchedType ?? "Other Referral Source") as ContactType,
        phone,
        email: String(raw["email"] ?? "").trim().slice(0, 200) || null,
        referral_source: String(raw["referral_source"] ?? "").trim().slice(0, 500) || null,
        errors,
        duplicates,
      };
    });

    return { rows: result };
  });

export const commitContactImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rows: Omit<ImportRow, "errors" | "duplicates" | "rowNumber">[] }) => {
    const rows = (Array.isArray(data.rows) ? data.rows : []).slice(0, 500).map((r) => {
      const business_name = String(r.business_name ?? "").trim().slice(0, 200);
      if (!business_name) throw new Error("Every row needs a business name.");
      const contact_type = CONTACT_TYPES.includes(r.contact_type as ContactType)
        ? (r.contact_type as ContactType)
        : ("Other Referral Source" as ContactType);
      return {
        business_name,
        contact_person: text(r.contact_person, 200),
        contact_type,
        phone: text(r.phone, 40),
        email: text(r.email, 200),
        referral_source: text(r.referral_source, 500),
        pipeline_stage: "New Lead" as PipelineStage,
      };
    });
    if (rows.length === 0) throw new Error("Nothing to import.");
    return { rows };
  })
  .handler(async ({ data, context }) => {
    const { error, data: inserted } = await context.supabase
      .from("business_contacts")
      .insert(data.rows)
      .select("id");

    if (error) {
      console.error("Failed to import contacts", error);
      return { ok: false as const, imported: 0, message: "Could not import those contacts." };
    }
    return { ok: true as const, imported: (inserted ?? []).length, message: "" };
  });

/* ------------------------- Referral link on appointments ------------------------- */

export const setAppointmentReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; contactId: string | null; feeAmount?: string | number | null }) => {
    const feeRaw = data.feeAmount === null || data.feeAmount === undefined || data.feeAmount === "" ? null : Number(data.feeAmount);
    if (feeRaw !== null && (!Number.isFinite(feeRaw) || feeRaw < 0)) throw new Error("Invalid amount.");
    return {
      appointmentId: uuid(data.appointmentId),
      contactId: data.contactId ? uuid(data.contactId) : null,
      feeAmount: feeRaw,
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("appointments")
      .update({ referred_by: data.contactId, fee_amount: data.feeAmount })
      .eq("id", data.appointmentId);
    if (error) {
      console.error("Failed to set referral", error);
      return { ok: false as const, message: "Could not save the referral." };
    }
    return { ok: true as const };
  });

/* --------------------------- Recent activity + bulk edits --------------------------- */

export type RecentActivityItem = {
  id: string;
  contact_id: string;
  business_name: string;
  activity_type: string;
  description: string;
  created_at: string;
};

export const listRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("contact_activities")
      .select("id, contact_id, activity_type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Failed to load recent activity", error);
      return { items: [] as RecentActivityItem[] };
    }

    const rows = data ?? [];
    const ids = [...new Set(rows.map((r) => r.contact_id as string))];
    const names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: contacts } = await context.supabase
        .from("business_contacts")
        .select("id, business_name")
        .in("id", ids);
      for (const c of contacts ?? []) names[c.id as string] = c.business_name as string;
    }

    const items: RecentActivityItem[] = rows.map((r) => ({
      id: r.id as string,
      contact_id: r.contact_id as string,
      business_name: names[r.contact_id as string] ?? "Contact",
      activity_type: String(r.activity_type),
      description: String(r.description ?? ""),
      created_at: String(r.created_at),
    }));

    return { items };
  });

export const bulkSetPipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ids: string[]; stage: string }) => {
    const stage = String(data.stage ?? "");
    if (!PIPELINE_STAGES.includes(stage as PipelineStage)) throw new Error("Invalid pipeline stage.");
    const ids = (Array.isArray(data.ids) ? data.ids : []).slice(0, 500).map((id) => uuid(id));
    if (ids.length === 0) throw new Error("Select at least one contact.");
    return { ids, stage: stage as PipelineStage };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("business_contacts")
      .update({ pipeline_stage: data.stage })
      .in("id", data.ids);
    if (error) {
      console.error("Failed bulk stage update", error);
      return { ok: false as const, updated: 0, message: "Could not update those contacts." };
    }
    return { ok: true as const, updated: data.ids.length, message: "" };
  });

const PATCHABLE = {
  business_name: (v: unknown) => {
    const s = text(v, 200);
    if (!s) throw new Error("Business name is required.");
    return s;
  },
  contact_person: (v: unknown) => text(v, 200),
  phone: (v: unknown) => text(v, 40),
  email: (v: unknown) => text(v, 200),
  referral_source: (v: unknown) => text(v, 500),
  first_contacted_date: (v: unknown) => dateOrNull(v),
  next_follow_up_date: (v: unknown) => dateOrNull(v),
  contact_type: (v: unknown) => {
    const s = String(v ?? "");
    if (!CONTACT_TYPES.includes(s as ContactType)) throw new Error("Invalid contact type.");
    return s;
  },
  pipeline_stage: (v: unknown) => {
    const s = String(v ?? "");
    if (!PIPELINE_STAGES.includes(s as PipelineStage)) throw new Error("Invalid pipeline stage.");
    return s;
  },
} as const;

export type PatchableField = keyof typeof PATCHABLE;

export const patchBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; field: string; value: string | null }) => {
    const field = String(data.field ?? "") as PatchableField;
    const parse = PATCHABLE[field];
    if (!parse) throw new Error("That field cannot be edited here.");
    return { id: uuid(data.id), field, value: parse(data.value) as string | null };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("business_contacts")
      .update({ [data.field]: data.value })
      .eq("id", data.id);
    if (error) {
      console.error("Failed to patch contact", error);
      return { ok: false as const, message: "Could not save that change." };
    }
    return { ok: true as const, message: "" };
  });
