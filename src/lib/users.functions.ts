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
<p>Welcome aboard — we're genuinely glad to have you as part of the Enliven Notary team. Your experience and certification are exactly what makes this business able to serve the Dallas–Fort Worth area the way we do, and we're excited to have you representing that with us.</p>
<p>Click the link below to set up your password and get into your account:</p>
<p><a href="${link}" style="color:#8a6b2f;font-weight:bold">Set up your password</a></p>
<p>Once you're in, you'll be able to see your assigned appointments and everything you need to get started.</p>
<p>If anything's unclear or you run into any issues, reach out anytime at <a href="mailto:info@enlivennotary.com">info@enlivennotary.com</a> — we're here to help you succeed.</p>
<p>Glad to have you with us,<br/>Enliven Notary</p>
</div>`;
  const text = `Hi ${name},

Welcome aboard — we're genuinely glad to have you as part of the Enliven Notary team. Your experience and certification are exactly what makes this business able to serve the Dallas-Fort Worth area the way we do, and we're excited to have you representing that with us.

Click the link below to set up your password and get into your account:
${link}

Once you're in, you'll be able to see your assigned appointments and everything you need to get started.

If anything's unclear or you run into any issues, reach out anytime at info@enlivennotary.com — we're here to help you succeed.

Glad to have you with us,
Enliven Notary`;
  return { subject, html, text };
}

function adminEmail(name: string, link: string) {
  const safeName = escapeHtml(name);
  const subject = "Your Enliven Notary Admin Access";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi ${safeName},</p>
<p>You've been given access to the Enliven Notary admin system.</p>
<p>Click the link below to set your password and get logged in:</p>
<p><a href="${link}" style="color:#8a6b2f;font-weight:bold">Set your password</a></p>
<p>If you have any questions getting started, reach out at <a href="mailto:info@enlivennotary.com">info@enlivennotary.com</a>.</p>
<p>Enliven Notary</p>
</div>`;
  const text = `Hi ${name},

You've been given access to the Enliven Notary admin system.

Click the link below to set your password and get logged in:
${link}

If you have any questions getting started, reach out at info@enlivennotary.com.

Enliven Notary`;
  return { subject, html, text };
}

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; email: string; role: string }) => {
    const name = String(data.name ?? "").trim().slice(0, 100);
    const email = String(data.email ?? "").trim().toLowerCase();
    const role = String(data.role ?? "");
    if (name.length < 2) throw new Error("Please enter the person's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    if (role !== "notary" && role !== "admin") throw new Error("Please choose a role.");
    return { name, email, role: role as "notary" | "admin" };
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
      return { ok: false as const, message: error?.message ?? "Could not create that account." };
    }

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
