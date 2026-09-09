import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Referral sent", "Note", "Follow-up"] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];

function uuid(value: unknown): string {
  const parsed = String(value ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed)) {
    throw new Error("Invalid record ID.");
  }
  return parsed;
}

function activityDate(value: unknown): string {
  const parsed = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) throw new Error("Invalid activity date.");
  return parsed;
}

function description(value: unknown): string {
  const parsed = String(value ?? "").trim().slice(0, 5000);
  if (!parsed) throw new Error("Please add a description.");
  return parsed;
}

async function callerIsAdmin(
  supabase: { from: (table: "user_roles") => any },
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (error) {
    console.error("Failed to verify admin role", error);
    return false;
  }
  return (data ?? []).length > 0;
}

export const updateContactHistoryEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; date: string; type: string; description: string }) => {
    const type = String(data.type ?? "Note");
    if (!ACTIVITY_TYPES.includes(type as ActivityType)) throw new Error("Invalid activity type.");
    return {
      id: uuid(data.id),
      activity_date: activityDate(data.date),
      activity_type: type as ActivityType,
      description: description(data.description),
    };
  })
  .handler(async ({ data, context }) => {
    if (!(await callerIsAdmin(context.supabase, context.userId))) {
      return { ok: false as const, message: "Only Admin accounts can edit history entries." };
    }

    const { error } = await context.supabase
      .from("contact_activities")
      .update({
        activity_date: data.activity_date,
        activity_type: data.activity_type,
        description: data.description,
      })
      .eq("id", data.id);

    if (error) {
      console.error("Failed to update activity", error);
      return { ok: false as const, message: "Could not save that change." };
    }
    return { ok: true as const, message: "" };
  });

export const deleteContactHistoryEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: uuid(data.id) }))
  .handler(async ({ data, context }) => {
    if (!(await callerIsAdmin(context.supabase, context.userId))) {
      return { ok: false as const, message: "Only Admin accounts can delete history entries." };
    }

    const { error } = await context.supabase.from("contact_activities").delete().eq("id", data.id);
    if (error) {
      console.error("Failed to delete activity", error);
      return { ok: false as const, message: "Could not delete that entry." };
    }
    return { ok: true as const, message: "" };
  });