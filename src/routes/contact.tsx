import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Reach a Notary Today | Enliven Notary" },
      { name: "description", content: "Contact Enliven Notary by phone, email, or online form. Serving the metro area with same-day mobile and online notarizations." },
      { property: "og:title", content: "Contact | Enliven Notary" },
      { property: "og:description", content: "Reach a notary today by phone, email, or form." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please share your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Tell us a little about what you need").max(1000),
});

function ContactPage() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const result = schema.safeParse(data);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errs[issue.path.join(".")] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setState("sending");
    setTimeout(() => setState("sent"), 900);
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Let's <span className="italic font-light text-gradient-gold">connect.</span></>}
        intro="Send a message, call, or email — most inquiries are answered within an hour during business hours."
        cta={false}
      />

      <section className="py-14 md:py-20">
        <div className="container-luxe grid lg:grid-cols-[1.1fr_1fr] gap-12">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
              {state === "sent" ? (
                <div className="min-h-[24rem] flex flex-col items-center justify-center text-center">
                  <div className="grid place-items-center h-14 w-14 rounded-full bg-gold/15 text-gold">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h2 className="mt-6 font-display text-3xl tracking-tight">Message received.</h2>
                  <p className="mt-3 text-muted-foreground max-w-md">
                    Thank you — we'll be in touch within one business hour. For urgent requests, please call directly.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="grid gap-5">
                  <div>
                    <label htmlFor="name" className="text-sm font-medium">Full name</label>
                    <input id="name" name="name" required maxLength={100}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                    />
                    {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <input id="email" name="email" type="email" required maxLength={255}
                        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                      />
                      {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div>
                      <label htmlFor="phone" className="text-sm font-medium">Phone <span className="text-muted-foreground">(optional)</span></label>
                      <input id="phone" name="phone" type="tel" maxLength={30}
                        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="message" className="text-sm font-medium">How can we help?</label>
                    <textarea id="message" name="message" rows={5} required maxLength={1000}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                    />
                    {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
                  </div>
                  <button type="submit" disabled={state === "sending"}
                    className="btn-gold inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    {state === "sending" ? "Sending…" : "Send message"}
                  </button>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="space-y-6">
              <a href="tel:+18176226182" className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 hover:border-gold/60 transition-colors">
                <span className="grid place-items-center h-11 w-11 rounded-xl bg-gold/10 text-gold"><Phone className="h-5 w-5" /></span>
                <span>
                  <span className="block text-xs uppercase tracking-[0.22em] text-muted-foreground">Phone</span>
                  <span className="block mt-1 font-display text-xl tracking-tight text-foreground">(817) 622-6182</span>
                </span>
              </a>
              <a href="mailto:hello@enlivennotary.com" className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 hover:border-gold/60 transition-colors">
                <span className="grid place-items-center h-11 w-11 rounded-xl bg-gold/10 text-gold"><Mail className="h-5 w-5" /></span>
                <span>
                  <span className="block text-xs uppercase tracking-[0.22em] text-muted-foreground">Email</span>
                  <span className="block mt-1 font-display text-xl tracking-tight text-foreground">hello@enlivennotary.com</span>
                </span>
              </a>
              <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
                <span className="grid place-items-center h-11 w-11 rounded-xl bg-gold/10 text-gold"><Clock className="h-5 w-5" /></span>
                <div>
                  <span className="block text-xs uppercase tracking-[0.22em] text-muted-foreground">Business Hours</span>
                  <p className="mt-1 text-sm text-foreground">Monday – Saturday · 7:00a — 9:00p</p>
                  <p className="text-sm text-muted-foreground">Sunday by appointment</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
                <span className="grid place-items-center h-11 w-11 rounded-xl bg-gold/10 text-gold"><MapPin className="h-5 w-5" /></span>
                <div>
                  <span className="block text-xs uppercase tracking-[0.22em] text-muted-foreground">Service Area</span>
                  <p className="mt-1 text-sm text-foreground">Greater metro & nationwide online</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="aspect-[16/10] relative">
                  <div aria-hidden className="absolute inset-0" style={{
                    background: "radial-gradient(600px 400px at 30% 30%, oklch(0.94 0.05 85 / 0.6), transparent 60%), radial-gradient(500px 400px at 80% 80%, oklch(0.9 0.03 250 / 0.5), transparent 60%)",
                  }} />
                  <div className="absolute inset-0 grid place-items-center">
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Google Maps placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
