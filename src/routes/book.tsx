import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ArrowLeft, CheckCircle2, MapPin, Video, User, FileText, Phone, ExternalLink, Zap, Clock } from "lucide-react";
import { z } from "zod";
import { PageHero } from "@/components/site/PageHero";
import { submitBooking } from "@/lib/booking.functions";


export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>) => ({
    service: typeof search.service === "string" ? search.service : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Get Started: Book or Request a Quote | Enliven Notary" },
      { name: "description", content: "Book a mobile or online notary appointment instantly, or request a quote for loan signings and specialty documents in DFW." },
      { property: "og:title", content: "Get Started | Enliven Notary" },
      { property: "og:description", content: "Instant booking for standard services, or a quote request for anything more complex." },
      { property: "og:url", content: "/book" },
    ],
    links: [{ rel: "canonical", href: "/book" }],
  }),
  component: BookPage,
});

const instantServices = [
  {
    title: "Mobile Notary (Standard)",
    desc: "We come to you at a scheduled time.",
    url: "https://app.acuityscheduling.com/schedule.php?owner=40144886&appointmentType=97116974",
  },
  {
    title: "Mobile Notary (Same-Day/Urgent)",
    desc: "Today's availability for time-sensitive signings.",
    url: "https://app.acuityscheduling.com/schedule.php?owner=40144886&appointmentType=97123688",
  },
  {
    title: "Remote Online Notarization",
    desc: "Notarize from anywhere by secure video.",
    url: "https://app.acuityscheduling.com/schedule.php?owner=40144886&appointmentType=97123816",
  },
];

const quoteServices = [
  "Loan Signing",
  "Real Estate / Closing",
  "Business Documents",
  "Estate Planning Documents",
  "Other",
];

const TYPO_DOMAINS: Record<string, string> = {
  "gmail.coom": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.co": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "yahoo.coom": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmail.con": "hotmail.com",
  "hotmail.coom": "hotmail.com",
  "outlook.con": "outlook.com",
  "icloud.con": "icloud.com",
};

function emailTypoSuggestion(email: string): string | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return null;
  const fixed = TYPO_DOMAINS[domain] ?? (domain.endsWith(".coom") || domain.endsWith(".con")
    ? domain.replace(/\.(coom|con)$/, ".com")
    : null);
  return fixed && fixed !== domain ? fixed : null;
}

const schema = z.object({
  service: z.string().min(1),
  location: z.enum(["mobile", "online"]),
  date: z.string().trim().min(1),
  time: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});


function BookPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    service: "",
    location: "mobile" as "mobile" | "online",
    date: "",
    time: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const send = useServerFn(submitBooking);

  const canNext = (() => {
    if (step === 0) return !!data.service;
    if (step === 1) return !!data.location;
    if (step === 2) return !!data.date.trim() && !!data.time.trim();
    if (step === 3) return !!data.name && !!data.email && !!data.phone;
    return true;
  })();

  function next() {
    if (step < 3) setStep(step + 1);
    else submit();
  }

  async function submit() {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      setError("Please complete required fields.");
      return;
    }
    const suggestion = emailTypoSuggestion(parsed.data.email);
    if (suggestion) {
      setError(`That email looks like a typo. Did you mean @${suggestion}? Confirmation emails can't reach an invalid address.`);
      return;
    }
    setError(null);

    setSubmitting(true);
    try {
      await send({ data: parsed.data });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Something went wrong. Please call or text (469) 991-2777.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const steps = ["Service", "Location", "Details", "Your Info"];

  return (
    <>
      <PageHero
        eyebrow="Get Started"
        title={<>Two ways to <span className="italic font-light text-gradient-gold">get started.</span></>}
        intro="Book standard mobile or online notary services instantly, or request a quote for loan signings and specialty documents and we'll follow up with pricing and timing."
        cta={false}
      />

      <section className="pb-24">
        <div className="container-luxe max-w-3xl">
          {done ? (
            <div className="rounded-3xl border border-border bg-card p-10 md:p-14 text-center">
              <div className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-gold/15 text-gold">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-6 font-display text-3xl md:text-4xl tracking-tight">Request received.</h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Thanks, we'll review the details and follow up personally to confirm timing and pricing. During
                business hours we typically respond within a few hours; after hours or on Sunday, by the next
                business day.
              </p>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Questions in the meantime?{" "}
                <a href="tel:+14699912777" aria-label="Call Enliven Notary at (469) 991-2777" className="inline-flex items-center gap-1.5 text-foreground font-medium hover:text-gold transition-colors">
                  <Phone className="h-4 w-4 text-gold" /> Call or text (469) 991-2777
                </a>
                .
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 max-w-md mx-auto text-left">
                <Summary icon={FileText} label="Service" value={data.service} />
                <Summary icon={data.location === "mobile" ? MapPin : Video} label="Location" value={data.location === "mobile" ? "Mobile: we come to you" : "Online: secure video"} />
                <Summary icon={Clock} label="Preferred timing" value={`${data.date} · ${data.time}`} />
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
              {step > 0 && (
                <ol className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em]">
                  {steps.map((s, i) => (
                    <li key={s} className={`flex items-center gap-2 ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                      <span className={`grid place-items-center h-6 w-6 rounded-full text-[11px] ${i <= step ? "bg-charcoal text-primary-foreground" : "border border-border"}`}>{i + 1}</span>
                      {s}
                      {i < steps.length - 1 && <span className="mx-1 text-muted-foreground/60">·</span>}
                    </li>
                  ))}
                </ol>
              )}

              <div className={step > 0 ? "mt-8" : ""}>
                {step === 0 && (
                  <div className="space-y-10">
                    <div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-gold" />
                        <h3 className="font-display text-2xl md:text-3xl tracking-tight">Book Instantly</h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Pick a time and pay your deposit instantly.</p>
                      <div className="mt-5 grid gap-3">
                        {instantServices.map((s) => (
                          <a
                            key={s.title}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center justify-between gap-4 rounded-2xl border border-border p-5 transition-all hover:border-gold/60 hover:bg-gold/5"
                          >
                            <span>
                              <span className="block font-medium">{s.title}</span>
                              <span className="mt-1 block text-sm text-muted-foreground">{s.desc}</span>
                            </span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-gold" />
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-border pt-10">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gold" />
                        <h3 className="font-display text-2xl md:text-3xl tracking-tight">Request a Quote</h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Tell us the details and we'll follow up with pricing and timing.</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {quoteServices.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setData({ ...data, service: s });
                              setStep(1);
                            }}
                            className="text-left rounded-2xl border border-border p-5 transition-all hover:border-gold/40"
                          >
                            <span className="font-medium">{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl tracking-tight">Where should we meet?</h3>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        { key: "mobile", icon: MapPin, title: "Mobile: we come to you", desc: "Home, office, hospital, or wherever you are." },
                        { key: "online", icon: Video, title: "Online: secure video", desc: "Notarize from anywhere in the U.S." },
                      ].map((o) => (
                        <button key={o.key} type="button" onClick={() => setData({ ...data, location: o.key as "mobile" | "online" })}
                          className={`text-left rounded-2xl border p-6 transition-all ${data.location === o.key ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"}`}
                        >
                          <o.icon className="h-5 w-5 text-gold" />
                          <p className="mt-3 font-medium">{o.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
                        </button>
                      ))}
                    </div>
                    {data.location === "mobile" && (
                      <div className="mt-6">
                        <label className="text-sm font-medium">Meeting address <span className="text-muted-foreground">(optional now)</span></label>
                        <input type="text" value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} maxLength={200}
                          placeholder="Street, City, ZIP"
                          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                        />
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl tracking-tight">When would you like this done?</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This is a request, not a confirmed slot. We'll confirm exact timing with you.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Preferred date</label>
                        <input
                          type="date"
                          value={data.date}
                          onChange={(e) => setData({ ...data, date: e.target.value })}
                          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Preferred time</label>
                        <input
                          type="text"
                          value={data.time}
                          onChange={(e) => setData({ ...data, time: e.target.value })}
                          maxLength={40}
                          placeholder="e.g. Morning, or around 2pm"
                          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl tracking-tight">Your details.</h3>
                    <div className="mt-6 grid gap-4">
                      <Input label="Full name" value={data.name} onChange={(v) => setData({ ...data, name: v })} icon={User} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Email" type="email" value={data.email} onChange={(v) => setData({ ...data, email: v })} />
                        <div>
                          <Input label="Phone" type="tel" value={data.phone} onChange={(v) => setData({ ...data, phone: v })} />
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                            By submitting, you agree to receive appointment texts at this number. Message and data rates may
                            apply. Reply STOP to opt out.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
                        <textarea rows={4} value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} maxLength={1000}
                          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                          placeholder="Number of signers, document type, any special instructions…"
                        />
                      </div>
                    </div>
                    {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
                  </div>
                )}
              </div>

              {step > 0 && (
                <div className="mt-10 flex items-center justify-between">
                  <button type="button" onClick={() => setStep(Math.max(0, step - 1))}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button type="button" onClick={next} disabled={!canNext || submitting}
                    className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
                  >
                    {step === 3 ? (submitting ? "Sending…" : "Request a quote") : "Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Input({ label, value, onChange, type = "text", icon: Icon }: { label: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-2 relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={255}
          className={`w-full rounded-xl border border-border bg-background py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60 ${Icon ? "pl-11 pr-4" : "px-4"}`}
        />
      </div>
    </div>
  );
}

function Summary({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-gold" /> {label}
      </div>
      <p className="mt-1.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
