import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const OPTION_KINDS = ["contact_type", "pipeline_stage"] as const;
export type OptionKind = (typeof OPTION_KINDS)[number];

export type CrmOption = {
  id: string;
  kind: OptionKind;
  label: string;
  sort_order: number;
};

function uuid(value: unknown): string {
  const s = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Invalid id.");
  return s;
}

function kindOf(value: unknown): OptionKind {
  const s = String(value ?? "") as OptionKind;
  if (!OPTION_KINDS.includes(s)) throw new Error("Invalid option list.");
  return s;
}

function labelOf(value: unknown): string {
  const s = String(value ?? "").trim().slice(0, 80);
  if (!s) throw new Error("Enter a name.");
  return s;
}

const COLUMN_FOR: Record<OptionKind, "contact_type" | "pipeline_stage"> = {
  contact_type: "contact_type",
  pipeline_stage: "pipeline_stage",
};

/** Load all configured options, ordered for display. */
export async function loadCrmOptions(supabase: {
  from: (t: string) => { select: (c: string) => { order: (c: string, o: object) => any } };
}): Promise<CrmOption[]> {
  const { data, error } = await supabase
    .from("crm_options")
    .select("id, kind, label, sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (error) {
    console.error("Failed to load CRM options", error);
    return [];
  }
  return (data ?? []) as CrmOption[];
}

export const listCrmOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const options = await loadCrmOptions(context.supabase as never);
    return {
      contactTypes: options.filter((o) => o.kind === "contact_type"),
      pipelineStages: options.filter((o) => o.kind === "pipeline_stage"),
    };
  });

/** Options plus how many contacts currently use each label (admin settings view). */
export const listCrmOptionUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const options = await loadCrmOptions(context.supabase as never);
    const { data: rows, error } = await context.supabase
      .from("business_contacts")
      .select("contact_type, pipeline_stage");
    if (error) console.error("Failed to count option usage", error);

    const counts: Record<string, number> = {};
    for (const row of (rows ?? []) as { contact_type: string; pipeline_stage: string }[]) {
      const t = `contact_type:${row.contact_type}`;
      const s = `pipeline_stage:${row.pipeline_stage}`;
      counts[t] = (counts[t] ?? 0) + 1;
      counts[s] = (counts[s] ?? 0) + 1;
    }

    const withUsage = options.map((o) => ({ ...o, inUse: counts[`${o.kind}:${o.label}`] ?? 0 }));
    return {
      contactTypes: withUsage.filter((o) => o.kind === "contact_type"),
      pipelineStages: withUsage.filter((o) => o.kind === "pipeline_stage"),
    };
  });

function permissionMessage(code?: string) {
  return code === "42501" ? "Only Admin accounts can change these lists." : null;
}

export const createCrmOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { kind: string; label: string }) => ({
    kind: kindOf(data.kind),
    label: labelOf(data.label),
  }))
  .handler(async ({ data, context }) => {
    const existing = await loadCrmOptions(context.supabase as never);
    const sameKind = existing.filter((o) => o.kind === data.kind);
    if (sameKind.some((o) => o.label.toLowerCase() === data.label.toLowerCase())) {
      return { ok: false as const, message: "That option already exists." };
    }
    const sort_order = (sameKind.at(-1)?.sort_order ?? 0) + 10;

    const { error } = await context.supabase
      .from("crm_options")
      .insert({ kind: data.kind, label: data.label, sort_order } as never);
    if (error) {
      console.error("Failed to create CRM option", error);
      return {
        ok: false as const,
        message: permissionMessage(error.code) ?? "Could not add that option.",
      };
    }
    return { ok: true as const, message: "" };
  });

/** Move one option up or down within its list. */
export const moveCrmOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; direction: string }) => ({
    id: uuid(data.id),
    direction: data.direction === "up" ? ("up" as const) : ("down" as const),
  }))
  .handler(async ({ data, context }) => {
    const options = await loadCrmOptions(context.supabase as never);
    const current = options.find((o) => o.id === data.id);
    if (!current) return { ok: false as const, message: "That option no longer exists." };

    const list = options.filter((o) => o.kind === current.kind);
    const index = list.findIndex((o) => o.id === current.id);
    const target = list[data.direction === "up" ? index - 1 : index + 1];
    if (!target) return { ok: true as const, message: "" };

    const updates = [
      { id: current.id, sort_order: target.sort_order },
      { id: target.id, sort_order: current.sort_order },
    ];
    for (const u of updates) {
      const { error } = await context.supabase
        .from("crm_options")
        .update({ sort_order: u.sort_order } as never)
        .eq("id", u.id);
      if (error) {
        console.error("Failed to reorder CRM option", error);
        return {
          ok: false as const,
          message: permissionMessage(error.code) ?? "Could not change the order.",
        };
      }
    }
    return { ok: true as const, message: "" };
  });

export const deleteCrmOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: uuid(data.id) }))
  .handler(async ({ data, context }) => {
    const options = await loadCrmOptions(context.supabase as never);
    const current = options.find((o) => o.id === data.id);
    if (!current) return { ok: false as const, message: "That option no longer exists." };

    if (options.filter((o) => o.kind === current.kind).length <= 1) {
      return { ok: false as const, message: "Keep at least one option in this list." };
    }

    const { count, error: countErr } = await context.supabase
      .from("business_contacts")
      .select("id", { count: "exact", head: true })
      .eq(COLUMN_FOR[current.kind], current.label);
    if (countErr) {
      console.error("Failed to count option usage", countErr);
      return { ok: false as const, message: "Could not check whether that option is in use." };
    }
    if ((count ?? 0) > 0) {
      const noun = count === 1 ? "contact" : "contacts";
      return {
        ok: false as const,
        message: `Cannot remove: ${count} ${noun} currently use this ${current.kind === "contact_type" ? "type" : "stage"}. Reassign them first.`,
      };
    }

    const { error } = await context.supabase.from("crm_options").delete().eq("id", data.id);
    if (error) {
      console.error("Failed to delete CRM option", error);
      return {
        ok: false as const,
        message: permissionMessage(error.code) ?? "Could not remove that option.",
      };
    }
    return { ok: true as const, message: "" };
  });
