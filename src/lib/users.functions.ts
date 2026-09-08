import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BusinessProfile } from "./business-profile";
import { renderEmailTemplate } from "./email-templates";

const SITE_URL = "https://enlivennotary.com";
const FROM_ADDRESS = "team@send.enlivennotary.com";

async function inviteEmail(
  key: "notary_invite" | "admin_invite",
  name: string,
  link: string,
  profile: BusinessProfile,
) {
  const { loadEmailTemplate } = await import("./email-templates.server");
  const template = await loadEmailTemplate(key);
  return renderEmailTemplate(template, {
    name,
    link,
    business_name: profile.business_name,
    service_area: profile.service_area || "our service area",
    contact_email: profile.email,
    phone: profile.phone,
  });
}



const ALLOWED_ROLES = ["notary", "employee", "admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; email: string; role: string }) => {
    const name = String(data.name ?? "").trim().slice(0, 100);
    const email = String(data.email ?? "").trim().toLowerCase();
    const role = String(data.role ?? "").toLowerCase();
    if (name.length < 2) throw new Error("Please enter the person's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    if (!(ALLOWED_ROLES as readonly string[]).includes(role)) throw new Error("Please choose a valid role.");
    return { name, email, role: role as AllowedRole };
  })
  .handler(async ({ data, context }) => {
    // Only Admins may create accounts or set roles. Checked server-side against
    // the database role table, so a direct API call cannot bypass it.
    const { data: roleRows, error: roleCheckError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (roleCheckError || !roleRows || roleRows.length === 0) {
      return { ok: false as const, message: "Only Admin accounts can add users or change roles." };
    }


    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) return { ok: false as const, message: "Email sending is not configured." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: { full_name: data.name, role: data.role },
    });
    if (error || !created?.user) {
      const raw = (error?.message ?? "").toLowerCase();
      if (
        error?.status === 422 ||
        raw.includes("already been registered") ||
        raw.includes("already registered") ||
        raw.includes("already exists")
      ) {
        return {
          ok: false as const,
          message: `${data.email} already has an account. Ask them to sign in, or use a different email address.`,
        };
      }
      return { ok: false as const, message: error?.message ?? "Could not create that account." };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, name: data.name, email: data.email, role: data.role });
    if (profileError) console.error("Failed to store profile", profileError);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (roleError) console.error("Failed to store role", roleError);


    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: `${SITE_URL}/admin/set-password` },
    });
    const link = linkData?.properties?.action_link;
    if (linkError || !link) {
      return {
        ok: false as const,
        message: `Account created, but the password link could not be generated: ${linkError?.message ?? "unknown error"}`,
      };
    }

    const { loadBusinessProfile } = await import("./business-profile.server");
    const profile = await loadBusinessProfile();
    const template =
      data.role === "notary" ? notaryEmail(data.name, link, profile) : adminEmail(data.name, link, profile);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `${profile.business_name} <${FROM_ADDRESS}>`,
        to: [data.email],
        reply_to: profile.email || undefined,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend request failed [${response.status}]: ${errorBody}`);
      return {
        ok: false as const,
        message: `Account created, but the welcome email failed to send [${response.status}].`,
      };
    }

    return {
      ok: true as const,
      message: `Account created for ${data.email} — a password setup email is on its way.`,
    };
  });


export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) {
      console.error("Failed to read role", error);
      return { role: null as string | null, isAdmin: false };
    }
    const roles = (data ?? []).map((r) => r.role as string);
    return { role: roles[0] ?? null, isAdmin: roles.includes("admin") };
  });
