import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationPreferences = {
  daily_digest: boolean;
  forward_replies: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  daily_digest: true,
  forward_replies: true,
};

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notification_preferences")
      .select("daily_digest, forward_replies")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load notification preferences", error);
      throw new Error("Could not load your notification preferences.");
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      preferences: (data as NotificationPreferences | null) ?? DEFAULT_NOTIFICATION_PREFERENCES,
      role: (profile?.role as string | undefined) ?? "notary",
    };
  });

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Partial<NotificationPreferences>) => ({
    daily_digest: typeof data?.daily_digest === "boolean" ? data.daily_digest : undefined,
    forward_replies: typeof data?.forward_replies === "boolean" ? data.forward_replies : undefined,
  }))
  .handler(async ({ data, context }) => {
    const patch: Record<string, boolean> = {};
    if (data.daily_digest !== undefined) patch["daily_digest"] = data.daily_digest;
    if (data.forward_replies !== undefined) patch["forward_replies"] = data.forward_replies;

    const { data: saved, error } = await context.supabase
      .from("notification_preferences")
      .upsert(
        { user_id: context.userId, ...DEFAULT_NOTIFICATION_PREFERENCES, ...patch },
        { onConflict: "user_id" },
      )
      .select("daily_digest, forward_replies")
      .single();

    if (error) {
      console.error("Failed to save notification preferences", error);
      throw new Error("Could not save your notification preferences.");
    }

    return { preferences: saved as NotificationPreferences };
  });
