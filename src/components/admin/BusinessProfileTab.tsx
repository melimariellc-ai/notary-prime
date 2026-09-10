import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getBusinessProfile, updateBusinessProfile } from "@/lib/business-profile.functions";
import {
  credentialsLine,
  DEFAULT_BUSINESS_PROFILE,
  rateLabel,
  type BusinessProfile,
  type ServicePrice,
} from "@/lib/business-profile";
import { Card, CardHeader } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

export function BusinessProfileTab() {
  const fetchProfile = useServerFn(getBusinessProfile);
  const saveProfile = useServerFn(updateBusinessProfile);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BusinessProfile>(DEFAULT_BUSINESS_PROFILE);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["business-profile"],
    queryFn: () => fetchProfile({}),
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (values: BusinessProfile) => saveProfile({ data: values }),
    onSuccess: (res) => {
      setNotice(res.ok ? res.message : null);
      setError(res.ok ? null : res.message);
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["business-profile"] });
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Could not save those details."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading business details…</p>;

  const setPrice = (index: number, patch: Partial<ServicePrice>) =>
    setForm((prev) => ({
      ...prev,
      service_pricing: (prev.service_pricing ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));

  const addPrice = () =>
    setForm((prev) => ({ ...prev, service_pricing: [...(prev.service_pricing ?? []), { label: "", price: "" }] }));

  const removePrice = (index: number) =>
    setForm((prev) => ({
      ...prev,
      service_pricing: (prev.service_pricing ?? []).filter((_, i) => i !== index),
    }));

  const set = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Card>
      <CardHeader title="Business profile" />
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Keep your business information up to date here. These details are used across outreach emails, team
        invitations, and other areas of the platform.
      </p>

      {notice && <p className="mt-6 rounded-xl bg-secondary px-4 py-3 text-sm text-foreground">{notice}</p>}
      {error && <p className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <form
        className="mt-8 space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          setNotice(null);
          setError(null);
          mutation.mutate(form);
        }}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-foreground">Business name</span>
            <input
              className={field}
              value={form.business_name}
              onChange={(e) => set("business_name", e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-foreground">Phone number</span>
            <input className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-foreground">Email address</span>
            <input
              type="email"
              className={field}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-foreground">Service area</span>
            <input
              className={field}
              value={form.service_area}
              onChange={(e) => set("service_area", e.target.value)}
            />
          </label>
        </div>

        <fieldset className="rounded-2xl border border-border p-6">
          <legend className="px-2 text-sm font-medium text-foreground">Services &amp; pricing</legend>
          <div className="space-y-4">
            {(form.service_pricing ?? []).map((item, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium text-foreground">Service</span>
                  <input
                    className={field}
                    value={item.label}
                    onChange={(e) => setPrice(index, { label: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium text-foreground">Price</span>
                  <input
                    className={field}
                    placeholder="$100"
                    value={item.price}
                    onChange={(e) => setPrice(index, { price: e.target.value })}
                  />
                </label>
                <Button type="button" variant="tertiary" onClick={() => removePrice(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Button type="button" variant="tertiary" onClick={addPrice}>
              Add a service
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            These are the only prices the assistant is allowed to quote when it drafts a reply for you. Write the
            price exactly how you want it to appear, for example $100 or $250+.
          </p>
        </fieldset>

        <fieldset className="rounded-2xl border border-border p-6">
          <legend className="px-2 text-sm font-medium text-foreground">Referral commission</legend>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-foreground">Rate format</span>
              <select
                className={field}
                value={form.default_referral_rate_type}
                onChange={(e) => set("default_referral_rate_type", e.target.value === "flat" ? "flat" : "percent")}
              >
                <option value="percent">Percentage of referred value</option>
                <option value="flat">Flat dollar amount per job</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-foreground">
                Default referral rate {form.default_referral_rate_type === "percent" ? "(%)" : "($)"}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className={field}
                value={String(form.default_referral_rate)}
                onChange={(e) => set("default_referral_rate", Number(e.target.value))}
              />
            </label>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Applies to every referral contact unless that contact has its own rate.{" "}
            {rateLabel(form.default_referral_rate, form.default_referral_rate_type)}.
          </p>
        </fieldset>

        <fieldset className="rounded-2xl border border-border p-6">
          <legend className="px-2 text-sm font-medium text-foreground">Appointment readiness check</legend>
          <label className="block max-w-xs text-sm">
            <span className="mb-2 block font-medium text-foreground">Hours before the appointment</span>
            <input
              type="number"
              min={1}
              max={336}
              step={1}
              className={field}
              value={String(form.readiness_check_hours)}
              onChange={(e) => set("readiness_check_hours", Number(e.target.value))}
            />
          </label>
          <p className="mt-5 text-xs text-muted-foreground">
            This many hours before a confirmed appointment, the client automatically gets a short checklist by text —
            or by email when no phone number is on file. It is a reminder only and never changes the appointment.
          </p>
        </fieldset>

        <fieldset className="rounded-2xl border border-border p-6">
          <legend className="px-2 text-sm font-medium text-foreground">Public website chat</legend>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--gold))]"
              checked={form.ai_chat_widget_enabled}
              onChange={(e) => set("ai_chat_widget_enabled", e.target.checked)}
            />
            AI chat widget enabled on public site
          </label>
          <p className="mt-5 text-xs text-muted-foreground">
            Off by default. When on, visitors to the public website see a chat bubble that answers questions about the
            notarization process, service area, credentials and the pricing saved above, and can leave their contact
            details — which arrive as a new lead. It never appears in this admin area.
          </p>
        </fieldset>

        <fieldset className="rounded-2xl border border-border p-6">
          <legend className="px-2 text-sm font-medium text-foreground">Credentials</legend>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--gold))]"
                checked={form.is_texas_commissioned}
                onChange={(e) => set("is_texas_commissioned", e.target.checked)}
              />
              Texas Commissioned Notary Public
            </label>
            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--gold))]"
                checked={form.is_bonded}
                onChange={(e) => set("is_bonded", e.target.checked)}
              />
              Bonded
            </label>
            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--gold))]"
                checked={form.is_nna_certified}
                onChange={(e) => set("is_nna_certified", e.target.checked)}
              />
              NNA Certified Signing Agent
            </label>
            <label className="block max-w-xs text-sm">
              <span className="mb-2 block font-medium text-foreground">E&amp;O insured amount</span>
              <input
                className={field}
                placeholder="$100,000"
                value={form.eo_insured_amount}
                onChange={(e) => set("eo_insured_amount", e.target.value)}
              />
            </label>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Written out as: {credentialsLine(form) || "no credentials selected yet"}
          </p>
        </fieldset>

        <Button type="submit" variant="secondary" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save business profile"}
        </Button>
      </form>
    </Card>
  );
}
