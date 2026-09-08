export type BusinessProfile = {
  business_name: string;
  phone: string;
  email: string;
  service_area: string;
  is_texas_commissioned: boolean;
  is_bonded: boolean;
  eo_insured_amount: string;
  is_nna_certified: boolean;
};

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  business_name: "Enliven Notary",
  phone: "(469) 991-2777",
  email: "info@enlivennotary.com",
  service_area: "Dallas-Fort Worth Metroplex",
  is_texas_commissioned: true,
  is_bonded: true,
  eo_insured_amount: "$100,000",
  is_nna_certified: true,
};

/** Human-readable credentials sentence built from the saved profile. */
export function credentialsLine(profile: BusinessProfile): string {
  const parts: string[] = [];
  if (profile.is_texas_commissioned) parts.push("Texas Commissioned Notary Public");
  if (profile.is_bonded) parts.push("Bonded");
  if (profile.eo_insured_amount.trim())
    parts.push(`Errors & Omissions (E&O) Insured up to ${profile.eo_insured_amount.trim()}`);
  else if (profile.is_bonded) parts.push("Errors & Omissions (E&O) Insured");
  if (profile.is_nna_certified) parts.push("NNA Certified Signing Agent");
  return parts.join(", ");
}
