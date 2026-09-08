import { FALLBACK_TEMPLATES } from "./email-templates";

export type LoadedTemplate = { subject: string; body: string };

/** Reads one template. Falls back to the built-in copy if the table is unreachable. */
export async function loadEmailTemplate(key: string): Promise<LoadedTemplate> {
  const fallback = FALLBACK_TEMPLATES[key];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("email_templates")
      .select("subject, body")
      .eq("template_key", key)
      .maybeSingle();
    if (error || !data) throw error ?? new Error(`Template ${key} not found`);
    return { subject: data.subject, body: data.body };
  } catch (e) {
    console.error(`Falling back to built-in copy for email template "${key}"`, e);
    if (!fallback) throw e;
    return { subject: fallback.subject, body: fallback.body };
  }
}
