import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PERMISSIONS = [
  "can_archive_users",
  "can_deactivate_users",
  "can_grant_permissions",
] as const;
export type AdminPermission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  can_archive_users: "Archive users",
  can_deactivate_users: "Deactivate users",
  can_grant_permissions: "Grant permissions",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminWithPermissions = {
  id: string;
  name: string;
  email: string;
  permissions: AdminPermission[];
};

/** Roles are stored in their own table so they can never be self-assigned. */
export async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
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

/** Read the caller's granted permissions. Always resolved server-side. */
export async function loadPermissions(userId: string): Promise<AdminPermission[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_permissions")
    .select("permission")
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to load permissions", error);
    return [];
  }
  return (data ?? []).map((r) => r.permission as AdminPermission);
}

export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await isAdminUser(context.supabase, context.userId);
    const permissions = admin ? await loadPermissions(context.userId) : [];
    return {
      isAdmin: admin,
      permissions,
      canArchiveUsers: permissions.includes("can_archive_users"),
      canDeactivateUsers: permissions.includes("can_deactivate_users"),
      canGrantPermissions: permissions.includes("can_grant_permissions"),
    };
  });

export const listAdminPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await isAdminUser(context.supabase, context.userId);
    const mine = admin ? await loadPermissions(context.userId) : [];
    if (!mine.includes("can_grant_permissions"))
      return { forbidden: true as const, admins: [] as AdminWithPermissions[], meId: context.userId };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (roleError) {
      console.error("Failed to load admin accounts", roleError);
      throw new Error("Could not load the admin list.");
    }
    const ids = (roleRows ?? []).map((r) => r.user_id as string);
    if (ids.length === 0)
      return { forbidden: false as const, admins: [] as AdminWithPermissions[], meId: context.userId };

    const [{ data: profileRows }, { data: permRows }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email").in("id", ids),
      supabaseAdmin.from("user_permissions").select("user_id, permission").in("user_id", ids),
    ]);

    const byId = new Map((profileRows ?? []).map((p) => [p.id as string, p]));

    const admins: AdminWithPermissions[] = [];
    for (const id of ids) {
      const profile = byId.get(id);
      let name = (profile?.name as string) ?? "";
      let email = (profile?.email as string) ?? "";
      if (!email) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
        email = authUser?.user?.email ?? "Unknown";
        name = name || (authUser?.user?.user_metadata?.["full_name"] as string) || email;
      }
      admins.push({
        id,
        name: name || email,
        email,
        permissions: (permRows ?? [])
          .filter((p) => p.user_id === id)
          .map((p) => p.permission as AdminPermission),
      });
    }
    admins.sort((a, b) => a.name.localeCompare(b.name));

    return { forbidden: false as const, admins, meId: context.userId };
  });

export const setAdminPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; permission: string; enabled: boolean }) => {
    const userId = String(data.userId ?? "");
    const permission = String(data.permission ?? "");
    if (!UUID.test(userId)) throw new Error("Invalid user.");
    if (!(PERMISSIONS as readonly string[]).includes(permission))
      throw new Error("Unknown permission.");
    return { userId, permission: permission as AdminPermission, enabled: Boolean(data.enabled) };
  })
  .handler(async ({ data, context }) => {
    const admin = await isAdminUser(context.supabase, context.userId);
    const mine = admin ? await loadPermissions(context.userId) : [];
    if (!mine.includes("can_grant_permissions"))
      return { ok: false as const, message: "You do not have permission to change permissions." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (!targetRoles || targetRoles.length === 0)
      return { ok: false as const, message: "Permissions can only be given to Admin accounts." };

    if (
      data.userId === context.userId &&
      data.permission === "can_grant_permissions" &&
      !data.enabled
    )
      return {
        ok: false as const,
        message: "You cannot remove your own ability to grant permissions.",
      };

    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_permissions")
        .upsert(
          { user_id: data.userId, permission: data.permission, granted_by: context.userId },
          { onConflict: "user_id,permission" },
        );
      if (error) {
        console.error("Failed to grant permission", error);
        return { ok: false as const, message: "Could not save that change." };
      }
    } else {
      const { error } = await supabaseAdmin
        .from("user_permissions")
        .delete()
        .eq("user_id", data.userId)
        .eq("permission", data.permission);
      if (error) {
        console.error("Failed to revoke permission", error);
        return { ok: false as const, message: "Could not save that change." };
      }
    }

    return {
      ok: true as const,
      message: `${PERMISSION_LABELS[data.permission]} ${data.enabled ? "granted" : "removed"}.`,
    };
  });
