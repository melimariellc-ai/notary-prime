import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EmailTemplate } from "./email-templates";

const COLUMNS = "id, template_key, name, subject, body, type, description, placeholders, sort_order";

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("email_templates")
      .select(COLUMNS)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EmailTemplate[];
  });

export const updateEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; subject: string; body: string }) => {
    const id = String(data.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid template id.");
    const subject = String(data.subject ?? "").trim().slice(0, 300);
    const body = String(data.body ?? "").trim().slice(0, 20000);
    if (!body) throw new Error("The template cannot be empty.");
    return { id, subject, body };
  })
  .handler(async ({ data, context }) => {
    const { data: roleRows, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (roleError || !roleRows || roleRows.length === 0) {
      return { ok: false as const, message: "Only Admin accounts can edit email templates." };
    }

    const { data: existing } = await context.supabase
      .from("email_templates")
      .select("type")
      .eq("id", data.id)
      .maybeSingle();

    if (existing?.type === "fixed" && !data.subject) {
      return { ok: false as const, message: "Add a subject line." };
    }

    const { error } = await context.supabase
      .from("email_templates")
      .update({ subject: data.subject, body: data.body })
      .eq("id", data.id);
    if (error) return { ok: false as const, message: error.message };

    return { ok: true as const, message: "Template saved." };
  });
