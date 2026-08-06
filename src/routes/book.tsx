import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ArrowLeft, CheckCircle2, Calendar as CalendarIcon, Clock, MapPin, Video, User, FileText, Phone } from "lucide-react";
import { z } from "zod";
import { PageHero } from "@/components/site/PageHero";
import { submitBooking } from "@/lib/booking.functions";


export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book Appointment — Mobile & Online Notary | Enliven Notary" },
      { name: "description", content: "Schedule a mobile or online notary appointment in minutes. Same-day and after-hours availability." },
      { property: "og:title", content: "Book Appointment | Enliven Notary" },
      { property: "og:description", content: "Schedule mobile or online notary in minutes." },
      { property: "og:url", content: "/book" },
    ],
    links: [{ rel: "canonical", href: "/book" }],
  }),
  component: BookPage,
});

const services = [
  "Single Notarization",
  "Loan Signing",
  "Remote Online Notary",
  "Estate Planning Documents",
  "Real Estate / Closing",
  "Business Documents",
  "Other",
];

const timeSlots = ["8:00 AM", "9:30 AM", "11:00 AM", "1:00 PM", "2:30 PM", "4:00 PM", "5:30 PM", "7:00 PM"];

const schema = z.object({
  service: z.string().min(1),
  location: z.enum(["mobile", "online"]),
  date: z.string().min(1),
  time: z.string().min(1),
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


  const dates = useMemo(() => {
    const arr: { iso: string; day: string; date: string; weekday: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      arr.push({
        iso: d.toISOString().slice(0, 10),
        day: d.toLocaleDateString(undefined, { month: "short" }),
        date: String(d.getDate()),
        weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      });
    }
    return arr;
  }, []);

  const canNext = (() => {
    if (step === 0) return !!data.service;
    if (step === 1) return !!data.location;
    if (step === 2) return !!data.date && !!data.time;
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
    setError(null);
    setSubmitting(true);
    try {
      await send({ data: parsed.data });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Something went wrong. Please call or text (817) 622-6182.",
      );
    } finally {
      setSubmitting(false);
    }
  }


  const steps = ["Service", "Location", "Date & Time", "Your Info"];

  return (
    <>
      <PageHero
        eyebrow="Book Appointment"
        title={<>Reserve in <span className="italic font-light text-gradient-gold">under a minute.</span></>}
        intro="Choose your service, pick a time, and we'll follow up personally to confirm."
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
                Thanks — we'll follow up personally to confirm your appointment. During business hours
                (Mon–Sat, 7am–9pm) we typically respond within a few hours; after hours or on Sunday, by
                the next business day.
              </p>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Questions in the meantime?{" "}
                <a href="tel:+18176226182" className="inline-flex items-center gap-1.5 text-foreground font-medium hover:text-gold transition-colors">
                  <Phone className="h-4 w-4 text-gold" /> Call or text (817) 622-6182
                </a>
                .
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 max-w-md mx-auto text-left">
                <Summary icon={FileText} label="Service" value={data.service} />
                <Summary icon={data.location === "mobile" ? MapPin : Video} label="Location" value={data.location === "mobile" ? "Mobile — we come to you" : "Online — secure video"} />
                <Summary icon={CalendarIcon} label="Date" value={new Date(data.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} />
                <Summary icon={Clock} label="Time" value={data.time} />
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
              <ol className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em]">
                {steps.map((s, i) => (
                  <li key={s} className={`flex items-center gap-2 ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className={`grid place-items-center h-6 w-6 rounded-full text-[11px] ${i <= step ? "bg-charcoal text-primary-foreground" : "border border-border"}`}>{i + 1}</span>
                    {s}
                    {i < steps.length - 1 && <span className="mx-1 text-muted-foreground/60">·</span>}
                  </li>
                ))}
              </ol>

              <div className="mt-8">
                {step === 0 && (
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl tracking-tight">What do you need notarized?</h3>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {services.map((s) => (
                        <button key={s} type="button" onClick={() => setData({ ...data, service: s })}
                          className={`text-left rounded-2xl border p-5 transition-all ${data.service === s ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"}`}
                        >
                          <span className="font-medium">{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl tracking-tight">Where should we meet?</h3>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        { key: "mobile", icon: MapPin, title: "Mobile — we come to you", desc: "Home, office, hospital, or wherever you are." },
                        { key: "online", icon: Video, title: "Online — secure video", desc: "Notarize from anywhere in the U.S." },
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
                    <h3 className="font-display text-2xl md:text-3xl tracking-tight">Pick a date & time.</h3>
                    <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {dates.map((d) => (
                        <button key={d.iso} type="button" onClick={() => setData({ ...data, date: d.iso })}
                          className={`rounded-xl border p-3 text-center transition-all ${data.date === d.iso ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"}`}
                        >
                          <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{d.weekday}</span>
                          <span className="block font-display text-2xl leading-none mt-1">{d.date}</span>
                          <span className="block text-xs text-muted-foreground mt-1">{d.day}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-8 text-sm font-medium">Available times</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {timeSlots.map((t) => (
                        <button key={t} type="button" onClick={() => setData({ ...data, time: t })}
                          className={`rounded-full px-4 py-2 text-sm border transition-all ${data.time === t ? "border-gold bg-gold/10 text-foreground" : "border-border hover:border-gold/40 text-foreground/80"}`}
                        >
                          {t}
                        </button>
                      ))}
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
                        <Input label="Phone" type="tel" value={data.phone} onChange={(v) => setData({ ...data, phone: v })} />
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

              <div className="mt-10 flex items-center justify-between">
                <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button type="button" onClick={next} disabled={!canNext || submitting}
                  className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
                >
                  {step === 3 ? (submitting ? "Sending…" : "Request appointment") : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </button>

              </div>
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
