import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const COLUMN_KEYS = ["type", "stage", "follow_up", "referrals", "phone", "email"] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  type: "Type",
  stage: "Stage",
  follow_up: "Follow-up",
  referrals: "Referred value",
  phone: "Phone",
  email: "Email",
};

export type ViewConfig = {
  query: string;
  typeFilter: string;
  stageFilter: string;
  dueOnly: boolean;
  sortKey: string;
  sortDir: "asc" | "desc";
  columns: ColumnKey[];
  view: "list" | "kanban";
};

export type SavedView = { id: string; name: string; config: ViewConfig };

const SORT_KEYS = ["business_name", "contact_type", "pipeline_stage", "next_follow_up_date", "referrals"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(v: unknown, max = 120) {
  return String(v ?? "").slice(0, max);
}

export function normalizeConfig(raw: unknown): ViewConfig {
  const c = (raw ?? {}) as Record<string, unknown>;
  const cols = Array.isArray(c["columns"])
    ? (c["columns"] as unknown[]).map(String).filter((k): k is ColumnKey => COLUMN_KEYS.includes(k as ColumnKey))
    : [...COLUMN_KEYS].filter((k) => k !== "phone" && k !== "email");
  const sortKey = SORT_KEYS.includes(String(c["sortKey"])) ? String(c["sortKey"]) : "business_name";
  return {
    query: str(c["query"], 120),
    typeFilter: str(c["typeFilter"], 80),
    stageFilter: str(c["stageFilter"], 80),
    dueOnly: c["dueOnly"] === true,
    sortKey,
    sortDir: c["sortDir"] === "desc" ? "desc" : "asc",
    columns: cols.length > 0 ? cols : [...COLUMN_KEYS],
    view: c["view"] === "kanban" ? "kanban" : "list",
  };
}

export const listSavedViews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_views")
      .select("id, name, config")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to load saved views", error);
      return { views: [] as SavedView[] };
    }
    return {
      views: (data ?? []).map((v) => ({
        id: v.id as string,
        name: v.name as string,
        config: normalizeConfig(v.config),
      })),
    };
  });

export const saveView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; config: unknown }) => {
    const name = String(data?.name ?? "").trim().slice(0, 60);
    if (!name) throw new Error("Give the view a name.");
    return { name, config: normalizeConfig(data?.config) };
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("saved_views")
      .upsert(
        { user_id: context.userId, name: data.name, config: data.config } as never,
        { onConflict: "user_id,name" },
      )
      .select("id, name, config")
      .single();
    if (error || !row) {
      console.error("Failed to save view", error);
      return { ok: false as const, message: "Could not save that view." };
    }
    return {
      ok: true as const,
      view: { id: row.id as string, name: row.name as string, config: normalizeConfig(row.config) },
    };
  });

export const deleteSavedView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    const id = String(data?.id ?? "");
    if (!UUID.test(id)) throw new Error("Invalid view.");
    return { id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_views").delete().eq("id", data.id);
    if (error) {
      console.error("Failed to delete view", error);
      return { ok: false as const, message: "Could not delete that view." };
    }
    return { ok: true as const };
  });
