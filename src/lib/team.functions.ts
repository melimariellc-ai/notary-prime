import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminUser, loadPermissions } from "./permissions.functions";
import { OWNER_EMAIL, OWNER_USER_ID, isOwnerAccount } from "./owner";

const ALLOWED_ROLES = ["notary", "employee", "admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

/** Never expires in practice — Supabase rejects a login while a ban is active. */
const BAN_FOREVER = "876000h";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  deactivated_at: string | null;
  archived_at: string | null;
  is_owner?: boolean;
};

/** Same server-side admin check used when creating accounts. */
async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return isAdminUser(supabase, userId);
}

/**
 * Hard block, checked before anything else and not overridable by any
 * permission. Resolves the target's email so the rule holds even if the row is
 * reached by id alone.
 */
async function isProtectedOwner(userId: string): Promise<boolean> {
  if (userId === OWNER_USER_ID) return true;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return isOwnerAccount(userId, data?.user?.email ?? null);
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { includeArchived?: boolean }) => ({
    includeArchived: Boolean(data?.includeArchived),
  }))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId)))
      return {
        forbidden: true as const,
        members: [] as TeamMember[],
        meId: context.userId,
        canArchiveUsers: false,
        canDeactivateUsers: false,
      };

    const permissions = await loadPermissions(context.userId);

    let query = context.supabase
      .from("profiles")
      .select("id, name, email, role, is_active, deactivated_at, archived_at")
      .order("name", { ascending: true });
    if (!data.includeArchived) query = query.is("archived_at", null);

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to load team members", error);
      throw new Error("Could not load the team list.");
    }

    const members = (rows ?? []).map((m) => ({
      ...m,
      is_owner: isOwnerAccount(m.id, m.email),
    })) as TeamMember[];

    // The Owner is always shown, even if they have no profile row yet.
    if (!members.some((m) => m.is_owner)) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(OWNER_USER_ID);
      if (ownerUser?.user) {
        members.unshift({
          id: ownerUser.user.id,
          name: (ownerUser.user.user_metadata?.["full_name"] as string) || "Owner",
          email: ownerUser.user.email ?? OWNER_EMAIL,
          role: "admin",
          is_active: true,
          deactivated_at: null,
          archived_at: null,
          is_owner: true,
        });
      }
    }

    return {
      forbidden: false as const,
      members,
      meId: context.userId,
      canArchiveUsers: permissions.includes("can_archive_users"),
      canDeactivateUsers: permissions.includes("can_deactivate_users"),
    };
  });



export const setTeamMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: string }) => {
    const userId = String(data.userId ?? "");
    const role = String(data.role ?? "").toLowerCase();
    if (!UUID.test(userId)) throw new Error("Invalid user.");
    if (!(ALLOWED_ROLES as readonly string[]).includes(role)) throw new Error("Please choose a valid role.");
    return { userId, role: role as AllowedRole };
  })
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId)))
      return { ok: false as const, message: "Only Admin accounts can change roles." };
    if (data.userId === context.userId)
      return { ok: false as const, message: "You cannot change your own role." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: delError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (delError) {
      console.error("Failed to clear roles", delError);
      return { ok: false as const, message: "Could not update that role." };
    }

    const { error: insError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (insError) {
      console.error("Failed to set role", insError);
      return { ok: false as const, message: "Could not update that role." };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: data.role })
      .eq("id", data.userId);
    if (profileError) console.error("Failed to sync profile role", profileError);

    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: { role: data.role },
    });

    return { ok: true as const, message: "Role updated." };
  });

export const setTeamMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; active: boolean }) => {
    const userId = String(data.userId ?? "");
    if (!UUID.test(userId)) throw new Error("Invalid user.");
    return { userId, active: Boolean(data.active) };
  })
  .handler(async ({ data, context }) => {
    // Hard, unconditional rule: checked before permissions, and no permission
    // can override it.
    if (await isProtectedOwner(data.userId))
      return {
        ok: false as const,
        message: "The Owner account is protected and can never be deactivated.",
      };
    const admin = await isAdmin(context.supabase, context.userId);
    const permissions = admin ? await loadPermissions(context.userId) : [];
    if (!permissions.includes("can_deactivate_users"))
      return { ok: false as const, message: "You do not have permission to deactivate users." };
    if (data.userId === context.userId)
      return { ok: false as const, message: "You cannot deactivate your own account." };



    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Enforced by the authentication service itself: a banned account cannot
    // sign in or refresh a session, no matter how the request is made. The
    // account and all of its history stay in place.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? "none" : BAN_FOREVER,
    });
    if (authError) {
      console.error("Failed to update sign-in access", authError);
      return { ok: false as const, message: "Could not update sign-in access." };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_active: data.active,
        deactivated_at: data.active ? null : new Date().toISOString(),
        deactivated_by: data.active ? null : context.userId,
      })
      .eq("id", data.userId);
    if (profileError) {
      console.error("Failed to update status", profileError);
      return { ok: false as const, message: "Sign-in access changed, but the status could not be saved." };
    }

    return {
      ok: true as const,
      message: data.active ? "Account reactivated." : "Account deactivated — they can no longer sign in.",
    };
  });

export const setTeamMemberArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; archived: boolean }) => {
    const userId = String(data.userId ?? "");
    if (!UUID.test(userId)) throw new Error("Invalid user.");
    return { userId, archived: Boolean(data.archived) };
  })
  .handler(async ({ data, context }) => {
    // Archiving also revokes sign-in, so the same hard rule applies.
    if (await isProtectedOwner(data.userId))
      return {
        ok: false as const,
        message: "The Owner account is protected and can never be archived.",
      };
    const admin = await isAdmin(context.supabase, context.userId);
    const permissions = admin ? await loadPermissions(context.userId) : [];
    if (!permissions.includes("can_archive_users"))
      return { ok: false as const, message: "You do not have permission to archive users." };
    if (data.userId === context.userId)
      return { ok: false as const, message: "You cannot archive your own account." };


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Archiving only hides the person from the default team list and blocks
    // sign-in. Nothing is deleted: history, audit records, assigned
    // appointments and contacts all keep pointing at this same account.
    const { data: existing, error: readError } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", data.userId)
      .maybeSingle();
    if (readError) {
      console.error("Failed to read profile", readError);
      return { ok: false as const, message: "Could not update that account." };
    }

    // Un-archiving restores sign-in only when the account is not also deactivated.
    const shouldBan = data.archived || existing?.is_active === false;
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: shouldBan ? BAN_FOREVER : "none",
    });
    if (authError) {
      console.error("Failed to update sign-in access", authError);
      return { ok: false as const, message: "Could not update sign-in access." };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        archived_at: data.archived ? new Date().toISOString() : null,
        archived_by: data.archived ? context.userId : null,
      })
      .eq("id", data.userId);
    if (profileError) {
      console.error("Failed to update archive status", profileError);
      return { ok: false as const, message: "Sign-in access changed, but the status could not be saved." };
    }

    return {
      ok: true as const,
      message: data.archived
        ? "Account archived — they can no longer sign in, and all of their records stay in place."
        : "Account restored.",
    };
  });
