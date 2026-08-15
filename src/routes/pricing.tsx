import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing: Mobile, Online & Loan Signing | Enliven Notary" },
      {
        name: "description",
        content:
          "Transparent Enliven Notary pricing for the Dallas–Fort Worth Metroplex. Mobile notary from $100, Remote Online Notary from $65, Loan Signings from $200, and specialty appointments by custom quote.",
      },
      { property: "og:title", content: "Pricing | Enliven Notary" },
      {
        property: "og:description",
        content:
          "Concierge-level notary pricing for DFW. Mobile, Remote Online Notary, Loan Signings, and specialty appointments.",
      },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

const ACUITY = {
  mobileStandard:
    "https://app.acuityscheduling.com/schedule.php?owner=40144886&appointmentType=97116974",
  mobileUrgent:
    "https://app.acuityscheduling.com/schedule.php?owner=40144886&appointmentType=97123688",
  ron: "https://app.acuityscheduling.com/schedule.php?owner=40144886&appointmentType=97123816",
};

type Tier = {
  name: string;
  price: string;
  unit?: string;
  blurb: string;
  features: string[];
  cta: string;
  to?: "/book" | "/contact";
  href?: string;
  secondary?: { label: string; href: string };
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Mobile Notary Services",
    price: "$100",
    unit: "starting at",
    blurb:
      "Professional mobile notary services at your home, office, hospital, nursing home, or preferred meeting location.",
    features: [
      "Travel to your location (within standard service area)",
      "Professional mobile service",
      "Flexible scheduling",
      "Confidential service",
      "Prompt communication",
    ],
    cta: "Book Now",
    href: ACUITY.mobileStandard,
    secondary: { label: "Need same-day or urgent? Book that here", href: ACUITY.mobileUrgent },
  },
  {
    name: "Remote Online Notary",
    price: "$65",
    unit: "starting at",
    blurb:
      "Secure online notarization from anywhere in Texas using a state-approved Remote Online Notary platform.",
    features: [
      "Secure online meeting",
      "Legally recognized notarization",
      "Convenient from home or office",
      "Fast turnaround",
    ],
    cta: "Book Now",
    href: ACUITY.ron,
    featured: true,
  },
  {
    name: "Loan Signing Services",
    price: "$200",
    unit: "starting at",
    blurb:
      "Professional loan signing services completed with exceptional attention to detail.",
    features: [
      "Purchase Closings",
      "Seller Packages",
      "Refinance Packages",
      "HELOC Packages",
      "Reverse Mortgages",
      "Commercial Loan Documents",
    ],
    cta: "Request Quote",
    to: "/book",
  },
  {
    name: "Specialty Appointments",
    price: "Custom Quote",
    blurb:
      "Tailored notarizations for sensitive, time-critical, or off-hours needs across the DFW Metroplex.",
    features: [
      "Hospital Visits",
      "Nursing Homes",
      "Assisted Living Facilities",
      "Correctional Facilities",
      "After-Hours Appointments",
      "Weekend & Holiday Appointments",
    ],
    cta: "Request a Quote",
    to: "/contact",
  },
];

function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Concierge notary service,{" "}
            <span className="italic font-light text-gradient-gold">transparently priced.</span>
          </>
        }
        intro="Every appointment is quoted in writing before we begin. No surprises, just clear, professional service across the Dallas–Fort Worth Metroplex."
      />

      <section className="py-14 md:py-20">
        <div className="container-luxe">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {tiers.map((t, i) => {
              const isCustom = t.price === "Custom Quote";
              return (
                <Reveal key={t.name} delay={i * 60}>
                  <div
                    className={`group relative h-full rounded-3xl border p-8 flex flex-col transition-all duration-500 hover:-translate-y-1 ${
                      t.featured
                        ? "bg-charcoal text-primary-foreground border-transparent shadow-[0_40px_80px_-30px_oklch(0.2_0.02_260/0.45)]"
                        : "bg-card border-border hover:border-gold/60 hover:shadow-[0_30px_60px_-30px_oklch(0.74_0.115_82/0.35)]"
                    }`}
                  >
                    {t.featured && (
                      <span className="self-start text-[10px] uppercase tracking-[0.28em] text-gold border border-gold/40 rounded-full px-2.5 py-1">
                        Most requested
                      </span>
                    )}
                    <h3 className={`${t.featured ? "mt-4" : ""} font-display text-2xl tracking-tight`}>
                      {t.name}
                    </h3>
                    <div className="mt-5 flex items-baseline gap-2">
                      {isCustom ? (
                        <span className="font-display text-3xl tracking-tight text-gradient-gold">
                          {t.price}
                        </span>
                      ) : (
                        <>
                          <span
                            className={
                              t.featured
                                ? "text-white/60 text-xs uppercase tracking-[0.22em]"
                                : "text-muted-foreground text-xs uppercase tracking-[0.22em]"
                            }
                          >
                            {t.unit}
                          </span>
                          <span
                            className={`font-display text-5xl tracking-tight ${
                              t.featured ? "text-gradient-gold" : ""
                            }`}
                          >
                            {t.price}
                          </span>
                        </>
                      )}
                    </div>
                    <p
                      className={`mt-4 text-sm leading-relaxed ${
                        t.featured ? "text-white/70" : "text-muted-foreground"
                      }`}
                    >
                      {t.blurb}
                    </p>
                    <div
                      className={`mt-6 h-px w-full ${t.featured ? "bg-white/10" : "bg-border"}`}
                    />
                    <ul
                      className={`mt-6 space-y-2.5 text-sm ${
                        t.featured ? "text-white/85" : "text-foreground/85"
                      }`}
                    >
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-8">
                      <Link
                        to={t.to}
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-transform group-hover:-translate-y-0.5 ${
                          t.featured
                            ? "btn-gold"
                            : "border border-border hover:border-gold/60 text-foreground"
                        }`}
                      >
                        {t.cta} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120}>
            <p className="mt-12 max-w-3xl mx-auto text-center text-sm text-muted-foreground leading-relaxed">
              Every appointment is unique. Final pricing may vary depending on travel distance,
              document type, number of notarizations, appointment time, and specialty requests.
              You'll always receive a transparent quote before your appointment.
              State-regulated notarial fees apply where required under Texas law.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 md:p-14 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(600px 400px at 20% 0%, oklch(0.94 0.05 85 / 0.5), transparent 70%)",
              }}
            />
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Business & Bulk</p>
              <h2 className="mt-3 font-display text-2xl md:text-3xl tracking-tight">
                Need a custom quote for a business, title company, or bulk signings?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                We work with law firms, title companies, lenders, and property managers across DFW.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
              >
                Request a Quote <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/book"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
