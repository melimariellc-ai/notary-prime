import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditEntry = {
  id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by_email: string | null;
  changed_at: string;
};

const TABLES = ["business_contacts", "appointments"] as const;
export type AuditTable = (typeof TABLES)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { table: string; recordId: string }) => {
    const table = String(data?.table ?? "");
    if (!TABLES.includes(table as AuditTable)) throw new Error("Unknown record type.");
    const recordId = String(data?.recordId ?? "");
    if (!UUID.test(recordId)) throw new Error("Invalid record id.");
    return { table: table as AuditTable, recordId };
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("audit_log")
      .select("id, action, field_name, old_value, new_value, changed_by_email, changed_at")
      .eq("table_name", data.table)
      .eq("record_id", data.recordId)
      .order("changed_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Failed to load audit log", error);
      return { entries: [] as AuditEntry[], forbidden: true as const };
    }
    return { entries: (rows ?? []) as AuditEntry[], forbidden: false as const };
  });
