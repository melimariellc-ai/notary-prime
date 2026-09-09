import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadFieldDefs, normalizeFieldValue, type CustomFieldValues } from "@/lib/fields.functions";
import { commissionOwed } from "@/lib/business-profile";

/**
 * Fallback option lists. The live lists are admin-managed in Settings
 * (crm_options table); these are only used before that data loads.
 */
export const CONTACT_TYPES = [
  "Title Company",
  "Real Estate Agent",
  "Attorney",
  "Mortgage Lender/Loan Officer",
  "Signing Service",
  "Senior Living/Care Facility",
  "Financial Advisor",
  "Property Management Company",
  "HR/Employer",
  "Hospital",
  "Hospice/Home Health Care Agency",
  "Funeral Home",
  "Immigration Services",
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

export type ContactType = string;
export type PipelineStage = string;

/** Accept any admin-configured option label; empty falls back to a default. */
function optionLabel(value: unknown, fallback: string, what: string): string {
  const s = String(value ?? "").trim().slice(0, 80);
  if (!s) return fallback;
  if (s.length > 80) throw new Error(`Invalid ${what}.`);
  return s;
}
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
  custom_fields: CustomFieldValues;
  /** Optional per-contact override; null falls back to the business default. */
  referral_rate: number | null;
  referral_rate_type: "percent" | "flat" | null;
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
  /** 0-100 similarity of the closest matching field. */
  score: number;
};

/** Contacts at or above this similarity are treated as possible duplicates. */
export const DUPLICATE_THRESHOLD = 0.8;

type SimilarRow = {
  input_index: number;
  id: string;
  business_name: string;
  phone: string | null;
  name_score: number;
  phone_score: number;
  reason: "name" | "phone";
};

/** Fuzzy (pg_trgm) duplicate lookup for one or many candidate rows. */
async function findSimilarContacts(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => any },
  candidates: { name: string; phone: string | null }[],
): Promise<DuplicateMatch[][]> {
  const buckets: DuplicateMatch[][] = candidates.map(() => []);
  if (candidates.length === 0) return buckets;

  const { data, error } = await supabase.rpc("find_similar_contacts", {
    _names: candidates.map((c) => c.name ?? ""),
    _phones: candidates.map((c) => c.phone ?? ""),
    _threshold: DUPLICATE_THRESHOLD,
  });
  if (error) {
    console.error("Fuzzy duplicate lookup failed", error);
    return buckets;
  }

  for (const row of (data ?? []) as SimilarRow[]) {
    const bucket = buckets[row.input_index - 1];
    if (!bucket) continue;
    bucket.push({
      id: row.id,
      business_name: row.business_name,
      phone: row.phone,
      reason: row.reason,
      score: Math.round(Math.max(row.name_score, row.phone_score) * 100),
    });
  }
  return buckets;
}

const COLUMNS =
  "id, business_name, contact_person, contact_type, phone, email, pipeline_stage, first_contacted_date, next_follow_up_date, referral_source, created_at, custom_fields, referral_rate, referral_rate_type";

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

// Small clock skew between the browser session token and the database can make a
// freshly issued token look like it comes from the future (PGRST303). Retry once.
async function withClockSkewRetry<T extends { error: { code?: string } | null }>(
  run: () => PromiseLike<T>,
): Promise<T> {
  let result = await run();
  if (result.error?.code === "PGRST303") {
    await new Promise((r) => setTimeout(r, 1200));
    result = await run();
  }
  return result;
}


export const listBusinessContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await withClockSkewRetry(() =>
      context.supabase
        .from("business_contacts")
        .select(COLUMNS)
        .order("next_follow_up_date", { ascending: true, nullsFirst: false })
        .order("business_name", { ascending: true })
        .limit(1000),
    );

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

    const { data: profileRow } = await context.supabase
      .from("business_profile")
      .select("default_referral_rate, default_referral_rate_type")
      .eq("id", 1)
      .maybeSingle();

    const row = (profileRow ?? null) as { default_referral_rate: number | null; default_referral_rate_type: string | null } | null;
    const defaultRate = Number(row?.default_referral_rate ?? 0);
    const defaultRateType: "percent" | "flat" = row?.default_referral_rate_type === "flat" ? "flat" : "percent";

    const c = (contact ?? null) as unknown as BusinessContact | null;
    const usesOverride = c?.referral_rate !== null && c?.referral_rate !== undefined;
    const rate = usesOverride ? Number(c!.referral_rate) : defaultRate;
    const rateType: "percent" | "flat" =
      usesOverride && c!.referral_rate_type === "flat"
        ? "flat"
        : usesOverride && c!.referral_rate_type === "percent"
          ? "percent"
          : defaultRateType;

    const referralValue = appointments.reduce((sum, a) => sum + (a.fee_amount ?? 0), 0);

    return {
      contact: c,
      activities: (activities ?? []) as unknown as ContactActivity[],
      appointments,
      referralCount: appointments.length,
      referralValue,
      commission: {
        rate,
        rateType,
        usesOverride,
        defaultRate,
        defaultRateType,
        amount: commissionOwed(rate, rateType, referralValue, appointments.length),
      },
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

  const contact_type = optionLabel(data.contact_type, "Other Referral Source", "contact type");
  const pipeline_stage = optionLabel(data.pipeline_stage, "New Lead", "pipeline stage");

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
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => any },
  name: string,
  phone: string | null,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const [matches] = await findSimilarContacts(supabase, [{ name, phone }]);
  return (matches ?? []).filter((m) => m.id !== excludeId);
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
  .inputValidator((data: ContactInput & { force?: boolean; customFields?: Record<string, string> }) => ({
    ...validateContact(data),
    force: Boolean(data.force),
    customFields: (data.customFields ?? {}) as Record<string, string>,
  }))
  .handler(async ({ data, context }) => {
    const { force, customFields, ...fields } = data;

    const custom_fields: CustomFieldValues = {};
    const entries = Object.entries(customFields);
    if (entries.length > 0) {
      const defs = await loadFieldDefs(context.supabase as never);
      for (const [key, raw] of entries) {
        const def = defs.find((d) => d.field_key === key && d.is_active);
        if (!def) continue;
        try {
          const value = normalizeFieldValue(def, raw);
          if (value !== null) custom_fields[key] = value;
        } catch (err) {
          return {
            ok: false as const,
            duplicates: [] as DuplicateMatch[],
            message: err instanceof Error ? err.message : "Invalid custom field value.",
          };
        }
      }
    }

    if (!force) {
      const matches = await findDuplicates(context.supabase as never, fields.business_name, fields.phone);
      if (matches.length > 0) {
        return { ok: false as const, duplicates: matches, message: "Possible duplicate found." };
      }
    }

    const { data: row, error } = await context.supabase
      .from("business_contacts")
      .insert({ ...fields, custom_fields } as never)
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
    const stage = optionLabel(data.stage, "", "pipeline stage");
    if (!stage) throw new Error("Invalid pipeline stage.");
    return { id: uuid(data.id), stage };
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
    const seenNames = new Set<string>();
    const parsed = data.rows.map((raw, i) => {
      const business_name = String(raw["business_name"] ?? "").trim().slice(0, 200);
      const typeRaw = String(raw["contact_type"] ?? "").trim();
      const matchedType = CONTACT_TYPES.find((t) => t.toLowerCase() === typeRaw.toLowerCase());
      const errors: string[] = [];
      if (!business_name) errors.push("Business name is required.");
      if (typeRaw && !matchedType) errors.push(`Unknown contact type "${typeRaw}".`);

      const phone = String(raw["phone"] ?? "").trim().slice(0, 40) || null;
      const key = business_name.toLowerCase();
      if (business_name && seenNames.has(key)) errors.push("Duplicated inside this file.");
      if (business_name) seenNames.add(key);

      return {
        rowNumber: i + 1,
        business_name,
        contact_person: String(raw["contact_person"] ?? "").trim().slice(0, 200) || null,
        contact_type: (matchedType ?? "Other Referral Source") as ContactType,
        phone,
        email: String(raw["email"] ?? "").trim().slice(0, 200) || null,
        referral_source: String(raw["referral_source"] ?? "").trim().slice(0, 500) || null,
        errors,
      };
    });

    const buckets = await findSimilarContacts(
      context.supabase as never,
      parsed.map((r) => ({ name: r.business_name, phone: r.phone })),
    );

    const result: ImportRow[] = parsed.map((row, i) => ({
      ...row,
      duplicates: buckets[i] ?? [],
    }));

    return { rows: result };
  });

export const commitContactImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { rows: Omit<ImportRow, "errors" | "duplicates" | "rowNumber">[] }) => {
    const rows = (Array.isArray(data.rows) ? data.rows : []).slice(0, 500).map((r) => {
      const business_name = String(r.business_name ?? "").trim().slice(0, 200);
      if (!business_name) throw new Error("Every row needs a business name.");
      const contact_type = optionLabel(r.contact_type, "Other Referral Source", "contact type");
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
    const stage = optionLabel(data.stage, "", "pipeline stage");
    if (!stage) throw new Error("Invalid pipeline stage.");
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
  referral_rate: (v: unknown) => {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) throw new Error("Enter a referral rate of zero or more, or leave it blank.");
    return Math.round(n * 100) / 100;
  },
  referral_rate_type: (v: unknown) => {
    const s = String(v ?? "").trim();
    if (!s) return null;
    if (s !== "percent" && s !== "flat") throw new Error("Invalid rate format.");
    return s;
  },
  contact_type: (v: unknown) => {
    const s = optionLabel(v, "", "contact type");
    if (!s) throw new Error("Invalid contact type.");
    return s;
  },
  pipeline_stage: (v: unknown) => {
    const s = optionLabel(v, "", "pipeline stage");
    if (!s) throw new Error("Invalid pipeline stage.");
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
      .update({ [data.field]: data.value } as never)
      .eq("id", data.id);
    if (error) {
      console.error("Failed to patch contact", error);
      return { ok: false as const, message: "Could not save that change." };
    }
    return { ok: true as const, message: "" };
  });

/* ------------------------------ Duplicate management ------------------------------ */

export type DuplicateGroupContact = BusinessContact & { referralCount: number; activityCount: number };

export type DuplicateGroup = {
  key: string;
  /** Highest similarity across the pair, 0-100. */
  score: number;
  nameScore: number;
  phoneScore: number;
  matchedFields: string[];
  contacts: DuplicateGroupContact[];
};

export const listDuplicateGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("business_contacts")
      .select(COLUMNS)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) {
      console.error("Failed to load contacts for duplicate scan", error);
      throw new Error("Could not scan for duplicates.");
    }

    const contacts = (data ?? []) as unknown as BusinessContact[];
    if (contacts.length === 0) return { groups: [] as DuplicateGroup[] };

    const { data: similar, error: rpcErr } = await context.supabase.rpc("find_similar_contacts", {
      _names: contacts.map((c) => c.business_name ?? ""),
      _phones: contacts.map((c) => c.phone ?? ""),
      _threshold: DUPLICATE_THRESHOLD,
    });
    if (rpcErr) {
      console.error("Duplicate scan failed", rpcErr);
      throw new Error("Could not scan for duplicates.");
    }

    const byId = new Map(contacts.map((c) => [c.id, c]));

    type Pair = { a: string; b: string; nameScore: number; phoneScore: number };
    const pairs = new Map<string, Pair>();
    for (const row of (similar ?? []) as SimilarRow[]) {
      const source = contacts[row.input_index - 1];
      if (!source || source.id === row.id) continue;
      const [a, b] = source.id < row.id ? [source.id, row.id] : [row.id, source.id];
      const key = `${a}|${b}`;
      const existing = pairs.get(key);
      const nameScore = Math.max(existing?.nameScore ?? 0, row.name_score ?? 0);
      const phoneScore = Math.max(existing?.phoneScore ?? 0, row.phone_score ?? 0);
      pairs.set(key, { a, b, nameScore, phoneScore });
    }

    // Union-find so a chain of similar contacts becomes one group.
    const parent = new Map<string, string>();
    const find = (id: string): string => {
      const p = parent.get(id) ?? id;
      if (p === id) return id;
      const root = find(p);
      parent.set(id, root);
      return root;
    };
    const union = (x: string, y: string) => {
      const rx = find(x);
      const ry = find(y);
      if (rx !== ry) parent.set(rx, ry);
    };
    for (const p of pairs.values()) union(p.a, p.b);

    const clusters = new Map<string, Set<string>>();
    const clusterPairs = new Map<string, Pair[]>();
    for (const p of pairs.values()) {
      const root = find(p.a);
      const set = clusters.get(root) ?? new Set<string>();
      set.add(p.a);
      set.add(p.b);
      clusters.set(root, set);
      const list = clusterPairs.get(root) ?? [];
      list.push(p);
      clusterPairs.set(root, list);
    }
    if (clusters.size === 0) return { groups: [] as DuplicateGroup[] };

    const allIds = [...new Set([...clusters.values()].flatMap((s) => [...s]))];

    const { data: appts } = await context.supabase
      .from("appointments")
      .select("referred_by")
      .in("referred_by", allIds)
      .limit(5000);
    const referralCounts: Record<string, number> = {};
    for (const a of appts ?? []) {
      const key = a.referred_by as string | null;
      if (key) referralCounts[key] = (referralCounts[key] ?? 0) + 1;
    }

    const { data: acts } = await context.supabase
      .from("contact_activities")
      .select("contact_id")
      .in("contact_id", allIds)
      .limit(10000);
    const activityCounts: Record<string, number> = {};
    for (const a of acts ?? []) {
      const key = a.contact_id as string;
      activityCounts[key] = (activityCounts[key] ?? 0) + 1;
    }

    const groups: DuplicateGroup[] = [];
    for (const [root, ids] of clusters) {
      const members = [...ids]
        .map((id) => byId.get(id))
        .filter((c): c is BusinessContact => Boolean(c))
        .map((c) => ({
          ...c,
          referralCount: referralCounts[c.id] ?? 0,
          activityCount: activityCounts[c.id] ?? 0,
        }));
      if (members.length < 2) continue;

      const list = clusterPairs.get(root) ?? [];
      const nameScore = Math.round(Math.max(0, ...list.map((p) => p.nameScore)) * 100);
      const phoneScore = Math.round(Math.max(0, ...list.map((p) => p.phoneScore)) * 100);
      const matchedFields: string[] = [];
      if (nameScore >= DUPLICATE_THRESHOLD * 100) matchedFields.push("Business name");
      if (phoneScore >= DUPLICATE_THRESHOLD * 100) matchedFields.push("Phone");

      groups.push({
        key: root,
        score: Math.max(nameScore, phoneScore),
        nameScore,
        phoneScore,
        matchedFields,
        contacts: members.sort((x, y) => x.created_at.localeCompare(y.created_at)),
      });
    }

    groups.sort((a, b) => b.score - a.score);
    return { groups };
  });

export const mergeBusinessContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { keepId: string; mergeIds: string[] }) => {
    const keepId = uuid(data.keepId);
    const mergeIds = [...new Set((Array.isArray(data.mergeIds) ? data.mergeIds : []).map((id) => uuid(id)))].filter(
      (id) => id !== keepId,
    );
    if (mergeIds.length === 0) throw new Error("Choose at least one duplicate to merge.");
    return { keepId, mergeIds };
  })
  .handler(async ({ data, context }) => {
    const ids = [data.keepId, ...data.mergeIds];
    const { data: rows, error } = await context.supabase.from("business_contacts").select(COLUMNS).in("id", ids);
    if (error || !rows) {
      console.error("Merge lookup failed", error);
      return { ok: false as const, message: "Could not load those contacts." };
    }

    const all = rows as unknown as BusinessContact[];
    const keep = all.find((c) => c.id === data.keepId);
    if (!keep) return { ok: false as const, message: "The contact to keep no longer exists." };
    const others = all.filter((c) => c.id !== data.keepId);

    // Fill only blanks on the surviving record.
    const patch: Record<string, unknown> = {};
    const fillable = [
      "contact_person",
      "phone",
      "email",
      "first_contacted_date",
      "next_follow_up_date",
      "referral_source",
    ] as const;
    for (const field of fillable) {
      if (keep[field]) continue;
      const donor = others.find((c) => c[field]);
      if (donor) patch[field] = donor[field];
    }
    const custom_fields: CustomFieldValues = { ...(keep.custom_fields ?? {}) };
    let customChanged = false;
    for (const other of others) {
      for (const [k, v] of Object.entries(other.custom_fields ?? {})) {
        if (custom_fields[k] === undefined || custom_fields[k] === null || custom_fields[k] === "") {
          if (v !== null && v !== undefined && v !== "") {
            custom_fields[k] = v;
            customChanged = true;
          }
        }
      }
    }
    if (customChanged) patch["custom_fields"] = custom_fields;

    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await context.supabase
        .from("business_contacts")
        .update(patch as never)
        .eq("id", data.keepId);
      if (upErr) {
        console.error("Merge update failed", upErr);
        return { ok: false as const, message: "Could not update the surviving contact." };
      }
    }

    const { error: actErr } = await context.supabase
      .from("contact_activities")
      .update({ contact_id: data.keepId })
      .in("contact_id", data.mergeIds);
    if (actErr) {
      console.error("Merge activity move failed", actErr);
      return { ok: false as const, message: "Could not move the activity history." };
    }

    const { error: apptErr } = await context.supabase
      .from("appointments")
      .update({ referred_by: data.keepId })
      .in("referred_by", data.mergeIds);
    if (apptErr) console.error("Merge referral move failed", apptErr);

    const { error: inboundErr } = await context.supabase
      .from("inbound_emails")
      .update({ contact_id: data.keepId })
      .in("contact_id", data.mergeIds);
    if (inboundErr) console.error("Merge inbound move failed", inboundErr);

    const summary = others.map((c) => c.business_name).join(", ");
    await context.supabase.from("contact_activities").insert({
      contact_id: data.keepId,
      activity_date: new Date().toISOString().slice(0, 10),
      activity_type: "Note" as ActivityType,
      description: `Merged duplicate record(s): ${summary}.`,
      created_by: context.userId,
    });

    const { error: delErr } = await context.supabase.from("business_contacts").delete().in("id", data.mergeIds);
    if (delErr) {
      console.error("Merge delete failed", delErr);
      return { ok: false as const, message: "History moved, but the duplicates could not be removed." };
    }

    return { ok: true as const, merged: data.mergeIds.length, message: "" };
  });
