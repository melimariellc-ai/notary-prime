import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_BUSINESS_PROFILE, type BusinessProfile } from "./business-profile";

const FIELDS =
  "business_name, phone, email, service_area, is_texas_commissioned, is_bonded, eo_insured_amount, is_nna_certified";

const text = (value: unknown, max = 200) => String(value ?? "").trim().slice(0, max);

export const getBusinessProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("business_profile").select(FIELDS).eq("id", 1).maybeSingle();
    return { ...DEFAULT_BUSINESS_PROFILE, ...((data ?? {}) as Partial<BusinessProfile>) } as BusinessProfile;
  });

export const updateBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BusinessProfile) => {
    const business_name = text(data.business_name, 120);
    if (business_name.length < 2) throw new Error("Please enter the business name.");
    const email = text(data.email, 160).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    return {
      business_name,
      phone: text(data.phone, 40),
      email,
      service_area: text(data.service_area, 300),
      is_texas_commissioned: Boolean(data.is_texas_commissioned),
      is_bonded: Boolean(data.is_bonded),
      eo_insured_amount: text(data.eo_insured_amount, 40),
      is_nna_certified: Boolean(data.is_nna_certified),
    } satisfies BusinessProfile;
  })
  .handler(async ({ data, context }) => {
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (!roleRows || roleRows.length === 0) {
      return { ok: false as const, message: "Only Admin accounts can change the business profile." };
    }

    const { error } = await context.supabase.from("business_profile").upsert({ id: 1, ...data });
    if (error) {
      console.error("Failed to save business profile", error);
      return { ok: false as const, message: "Could not save those details. Please try again." };
    }
    return { ok: true as const, message: "Business profile saved." };
  });
