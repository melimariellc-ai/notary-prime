export type ReferralRateType = "percent" | "flat";

export type BusinessProfile = {
  business_name: string;
  phone: string;
  email: string;
  service_area: string;
  is_texas_commissioned: boolean;
  is_bonded: boolean;
  eo_insured_amount: string;
  is_nna_certified: boolean;
  default_referral_rate: number;
  default_referral_rate_type: ReferralRateType;
  readiness_check_hours: number;
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
  default_referral_rate: 0,
  default_referral_rate_type: "percent",
  readiness_check_hours: 24,
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

export const usd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/** "10% of referred value" / "$25 per referred job" */
export function rateLabel(rate: number, type: ReferralRateType): string {
  if (!rate) return "No rate set";
  return type === "percent" ? `${rate}% of referred value` : `${usd(rate)} per referred job`;
}

/** Estimated commission owed for a contact's referrals. Display only — no payments. */
export function commissionOwed(
  rate: number,
  type: ReferralRateType,
  referralValue: number,
  referralCount: number,
): number {
  if (!rate) return 0;
  return type === "percent" ? (referralValue * rate) / 100 : rate * referralCount;
}
