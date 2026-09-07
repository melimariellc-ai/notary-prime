import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InboundReply = {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  snippet: string;
  received_at: string;
  contact_id: string | null;
  business_name: string | null;
};

const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const listInboundReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("inbound_emails")
      .select("id, from_email, from_name, subject, text_body, html_body, received_at, contact_id")
      .order("received_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Failed to load inbound replies", error);
      return { items: [] as InboundReply[] };
    }

    const rows = data ?? [];
    const ids = [...new Set(rows.map((r) => r.contact_id).filter(Boolean))] as string[];
    const names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: contacts } = await context.supabase
        .from("business_contacts")
        .select("id, business_name")
        .in("id", ids);
      for (const c of contacts ?? []) names[c.id as string] = c.business_name as string;
    }

    const items: InboundReply[] = rows.map((r) => {
      const body = String(r.text_body ?? "") || strip(String(r.html_body ?? ""));
      return {
        id: r.id as string,
        from_email: String(r.from_email),
        from_name: r.from_name ? String(r.from_name) : null,
        subject: r.subject ? String(r.subject) : null,
        snippet: body.slice(0, 220),
        received_at: String(r.received_at),
        contact_id: (r.contact_id as string | null) ?? null,
        business_name: r.contact_id ? (names[r.contact_id as string] ?? null) : null,
      };
    });

    return { items };
  });
