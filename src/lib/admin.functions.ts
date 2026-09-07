import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Appointment records are managed by Admin and Employee accounts only. */
async function canManageAppointments(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    console.error("Failed to read roles", error);
    return false;
  }
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.includes("admin") || roles.includes("employee");
}


export type Appointment = {
  id: string;
  service: string;
  meeting_type: string;
  address: string | null;
  preferred_date: string;
  preferred_time: string;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  submitted_at: string;
  sms_status: string;
  sms_error: string | null;
  sms_sent_at: string | null;
  assigned_notary_id: string | null;
  referred_by: string | null;
  fee_amount: number | null;

};


export const getAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await canManageAppointments(context.supabase, context.userId)))
      return {
        forbidden: true as const,
        appointments: [] as Appointment[],
        notaries: [] as NotaryOption[],
        referralContacts: [] as ReferralContactOption[],
      };


    // Read as the signed-in user so database row-level security decides which
    // appointments they may see (admins/employees: all, notaries: their own).
    const { data, error } = await context.supabase
      .from("appointments")
      .select("id, service, meeting_type, address, preferred_date, preferred_time, name, email, phone, notes, submitted_at, sms_status, sms_error, sms_sent_at, assigned_notary_id, referred_by, fee_amount")
      .order("submitted_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Failed to load appointments", error);
      throw new Error("Could not load appointments.");
    }

    const { data: notaries } = await context.supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("role", "notary")
      .order("name", { ascending: true });

    const { data: contacts } = await context.supabase
      .from("business_contacts")
      .select("id, business_name")
      .order("business_name", { ascending: true })
      .limit(1000);

    return {
      locked: false as const,
      appointments: (data ?? []).map((a) => ({
        ...a,
        fee_amount: a.fee_amount === null ? null : Number(a.fee_amount),
      })) as Appointment[],
      notaries: (notaries ?? []).map((n) => ({ id: n.id, name: n.name, email: n.email })) as NotaryOption[],
      referralContacts: (contacts ?? []) as ReferralContactOption[],
    };
  });

export type ReferralContactOption = { id: string; business_name: string };




export type NotaryOption = { id: string; name: string; email: string };

export const listNotaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("role", "notary")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load notaries", error);
      return [] as NotaryOption[];
    }
    return (data ?? []).map((p) => ({ id: p.id, name: p.name, email: p.email })) as NotaryOption[];
  });

export const assignNotary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; notaryId: string | null }) => {
    const appointmentId = String(data.appointmentId ?? "");
    const notaryId = data.notaryId ? String(data.notaryId) : null;
    if (!/^[0-9a-f-]{36}$/i.test(appointmentId)) throw new Error("Invalid appointment.");
    if (notaryId && !/^[0-9a-f-]{36}$/i.test(notaryId)) throw new Error("Invalid notary.");
    return { appointmentId, notaryId };
  })
  .handler(async ({ data, context }) => {
    const session = await useSession<AdminSession>(sessionConfig);
    if (!session.data.unlocked) return { ok: false as const, message: "Dashboard is locked." };

    const { error } = await context.supabase
      .from("appointments")
      .update({ assigned_notary_id: data.notaryId })
      .eq("id", data.appointmentId);

    if (error) {
      console.error("Failed to assign notary", error);
      return { ok: false as const, message: "Could not update the assignment." };
    }
    return { ok: true as const };
  });
