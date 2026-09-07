import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FIELD_TYPES = ["text", "number", "date", "dropdown"] as const;
export type CustomFieldType = (typeof FIELD_TYPES)[number];

export type FieldDef = {
  id: string;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  sort_order: number;
  is_active: boolean;
};

export type CustomFieldValues = Record<string, string | number | null>;

function uuid(value: unknown): string {
  const s = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Invalid id.");
  return s;
}

export function slugify(label: string): string {
  return String(label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

function parseOptions(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  const out: string[] = [];
  for (const item of raw) {
    const s = String(item ?? "").trim().slice(0, 100);
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 40);
}

function validateDef(data: { label?: string; field_type?: string; options?: unknown; sort_order?: unknown }) {
  const label = String(data.label ?? "").trim().slice(0, 80);
  if (!label) throw new Error("Field name is required.");
  const field_type = String(data.field_type ?? "text") as CustomFieldType;
  if (!FIELD_TYPES.includes(field_type)) throw new Error("Choose a valid field type.");
  const options = field_type === "dropdown" ? parseOptions(data.options) : [];
  if (field_type === "dropdown" && options.length === 0) {
    throw new Error("Add at least one dropdown choice.");
  }
  const sort_order = Number.isFinite(Number(data.sort_order)) ? Math.trunc(Number(data.sort_order)) : 0;
  return { label, field_type, options, sort_order };
}

/** Coerce a submitted value against its definition; returns null for empty. */
export function normalizeFieldValue(def: FieldDef, value: unknown): string | number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (def.field_type === "number") {
    const n = Number(s);
    if (!Number.isFinite(n)) throw new Error(`${def.label} must be a number.`);
    return n;
  }
  if (def.field_type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${def.label} must be a date.`);
    return s;
  }
  if (def.field_type === "dropdown") {
    if (!def.options.includes(s)) throw new Error(`Choose a valid option for ${def.label}.`);
    return s;
  }
  return s.slice(0, 1000);
}

async function loadDefs(supabase: {
  from: (t: string) => { select: (c: string) => { order: (c: string, o: object) => any } };
}): Promise<FieldDef[]> {
  const { data, error } = await supabase
    .from("contact_field_defs")
    .select("id, field_key, label, field_type, options, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Failed to load field definitions", error);
    return [];
  }
  return (data ?? []) as FieldDef[];
}

export const listFieldDefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ defs: await loadDefs(context.supabase as never) }));

export const createFieldDef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { label: string; field_type: string; options?: unknown; sort_order?: unknown }) =>
    validateDef(data),
  )
  .handler(async ({ data, context }) => {
    const base = slugify(data.label);
    if (!base) return { ok: false as const, message: "Give the field a name using letters or numbers." };

    const existing = await loadDefs(context.supabase as never);
    let field_key = base;
    let n = 2;
    while (existing.some((d) => d.field_key === field_key)) field_key = `${base}_${n++}`;

    const sort_order = data.sort_order || existing.length;

    const { error } = await context.supabase
      .from("contact_field_defs")
      .insert({ ...data, sort_order, field_key } as never);
    if (error) {
      console.error("Failed to create field definition", error);
      return {
        ok: false as const,
        message:
          error.code === "42501"
            ? "Only Admin accounts can manage custom fields."
            : "Could not create that field.",
      };
    }
    return { ok: true as const, message: "" };
  });

export const updateFieldDef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      label: string;
      field_type: string;
      options?: unknown;
      sort_order?: unknown;
      is_active?: unknown;
    }) => ({
      id: uuid(data.id),
      ...validateDef(data),
      is_active: data.is_active === undefined ? true : Boolean(data.is_active),
    }),
  )
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { error } = await context.supabase
      .from("contact_field_defs")
      .update(fields as never)
      .eq("id", id);
    if (error) {
      console.error("Failed to update field definition", error);
      return {
        ok: false as const,
        message:
          error.code === "42501"
            ? "Only Admin accounts can manage custom fields."
            : "Could not save that field.",
      };
    }
    return { ok: true as const, message: "" };
  });

export const deleteFieldDef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: uuid(data.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("contact_field_defs").delete().eq("id", data.id);
    if (error) {
      console.error("Failed to delete field definition", error);
      return {
        ok: false as const,
        message:
          error.code === "42501"
            ? "Only Admin accounts can manage custom fields."
            : "Could not remove that field.",
      };
    }
    return { ok: true as const, message: "" };
  });

/** Save one custom field value on a contact, merging into the JSONB store. */
export const setCustomFieldValue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contactId: string; fieldKey: string; value: string | null }) => ({
    contactId: uuid(data.contactId),
    fieldKey: String(data.fieldKey ?? "").slice(0, 60),
    value: data.value === null ? null : String(data.value),
  }))
  .handler(async ({ data, context }) => {
    const defs = await loadDefs(context.supabase as never);
    const def = defs.find((d) => d.field_key === data.fieldKey);
    if (!def) return { ok: false as const, message: "That field no longer exists." };

    let value: string | number | null;
    try {
      value = normalizeFieldValue(def, data.value);
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : "Invalid value." };
    }

    const { data: row, error: readErr } = await context.supabase
      .from("business_contacts")
      .select("custom_fields")
      .eq("id", data.contactId)
      .maybeSingle();
    if (readErr || !row) {
      console.error("Failed to read custom fields", readErr);
      return { ok: false as const, message: "Could not save that change." };
    }

    const current = { ...((row.custom_fields ?? {}) as CustomFieldValues) };
    if (value === null) delete current[def.field_key];
    else current[def.field_key] = value;

    const { error } = await context.supabase
      .from("business_contacts")
      .update({ custom_fields: current } as never)
      .eq("id", data.contactId);
    if (error) {
      console.error("Failed to save custom field", error);
      return { ok: false as const, message: "Could not save that change." };
    }
    return { ok: true as const, message: "" };
  });
