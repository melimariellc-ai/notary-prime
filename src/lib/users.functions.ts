import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_URL = "https://enlivennotary.com";
const FROM = "Enliven Notary <bookings@send.enlivennotary.com>";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function notaryEmail(name: string, link: string) {
  const safeName = escapeHtml(name);
  const subject = "Welcome to the Enliven Notary Team!";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi ${safeName},</p>
<p>Welcome to Enliven Notary! We're excited to have you on our team and look forward to working with you as we serve clients throughout the Dallas Fort Worth area.</p>
<p>Your account is ready. To get started, click the link below to create your password and access your account.</p>
<p><a href="${link}" style="color:#8a6b2f;font-weight:bold">Create your password</a></p>
<p>Once you're signed in, you'll be able to view your assigned appointments, appointment details, and everything you need to complete your assignments.</p>
<p>If you have any questions or need assistance, please contact us at <a href="mailto:info@enlivennotary.com">info@enlivennotary.com</a>. We're always happy to help.</p>
<p>We're glad to have you with us and look forward to working together!</p>
<p>Enliven Notary</p>
</div>`;
  const text = `Hi ${name},

Welcome to Enliven Notary! We're excited to have you on our team and look forward to working with you as we serve clients throughout the Dallas Fort Worth area.

Your account is ready. To get started, click the link below to create your password and access your account.

${link}

Once you're signed in, you'll be able to view your assigned appointments, appointment details, and everything you need to complete your assignments.

If you have any questions or need assistance, please contact us at info@enlivennotary.com. We're always happy to help.

We're glad to have you with us and look forward to working together!

Enliven Notary`;
  return { subject, html, text };
}

function adminEmail(name: string, link: string) {
  const safeName = escapeHtml(name);
  const subject = "Welcome to Enliven Notary!";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi ${safeName},</p>
<p>We're excited to officially welcome you to Enliven Notary!</p>
<p>As part of our team, you'll play an important role in helping us manage our day to day operations and provide a smooth experience for both our clients and notaries.</p>
<p>Your account has been created. Please use the link below to set up your password and access the Enliven admin portal.</p>
<p><a href="${link}" style="color:#8a6b2f;font-weight:bold">Set Up Your Password</a></p>
<p>Once you're signed in, you'll have access to the areas of the platform associated with your role. This may include managing appointments, coordinating with notaries, assisting clients, and supporting other daily operations.</p>
<p>If you have any questions while getting started, please reach out to us at <a href="mailto:info@enlivennotary.com">info@enlivennotary.com</a>.</p>
<p>We're excited to have you on the team and look forward to growing Enliven together!</p>
<p>Enliven Notary</p>
</div>`;
  const text = `Hi ${name},

We're excited to officially welcome you to Enliven Notary!

As part of our team, you'll play an important role in helping us manage our day to day operations and provide a smooth experience for both our clients and notaries.

Your account has been created. Please use the link below to set up your password and access the Enliven admin portal.

${link}

Once you're signed in, you'll have access to the areas of the platform associated with your role. This may include managing appointments, coordinating with notaries, assisting clients, and supporting other daily operations.

If you have any questions while getting started, please reach out to us at info@enlivennotary.com.

We're excited to have you on the team and look forward to growing Enliven together!

Enliven Notary`;
  return { subject, html, text };
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
  .handler(async ({ data }) => {
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

    const template = data.role === "notary" ? notaryEmail(data.name, link) : adminEmail(data.name, link);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: FROM,
        to: [data.email],
        reply_to: "info@enlivennotary.com",
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
