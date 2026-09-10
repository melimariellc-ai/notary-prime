import { DEFAULT_BUSINESS_PROFILE, type BusinessProfile } from "./business-profile";

const FIELDS =
  "business_name, phone, email, service_area, is_texas_commissioned, is_bonded, eo_insured_amount, is_nna_certified, readiness_check_hours, service_pricing";

/** Reads the single business profile row server-side, falling back to defaults. */
export async function loadBusinessProfile(): Promise<BusinessProfile> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("business_profile").select(FIELDS).eq("id", 1).maybeSingle();
    if (!data) return DEFAULT_BUSINESS_PROFILE;
    return { ...DEFAULT_BUSINESS_PROFILE, ...(data as Partial<BusinessProfile>) };
  } catch (error) {
    console.error("Failed to load business profile", error);
    return DEFAULT_BUSINESS_PROFILE;
  }
}
