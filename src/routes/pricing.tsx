import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Transparent Notary Fees | Enliven Notary" },
      { name: "description", content: "Clear, transparent notary pricing for mobile, online, and loan signing services. State-regulated fees apply where required." },
      { property: "og:title", content: "Pricing | Enliven Notary" },
      { property: "og:description", content: "Transparent notary pricing for mobile, online, and loan signing services." },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Single Notarization",
    price: "$15",
    unit: "per signature",
    features: ["State-regulated notary fee", "Any document type", "In person or online"],
  },
  {
    name: "Loan Signing",
    price: "$150",
    unit: "flat fee",
    featured: true,
    features: ["Full closing package", "Printing & scan-backs", "Evenings & weekends"],
  },
  {
    name: "Remote Online",
    price: "$25",
    unit: "per signature",
    features: ["Secure RON platform", "ID verification & KBA", "Instant digital delivery"],
  },
];

const addons = [
  { label: "Travel — 0 to 5 miles", price: "Included" },
  { label: "Travel — 5 to 15 miles", price: "$25" },
  { label: "Travel — 15 to 30 miles", price: "$45" },
  { label: "Travel — 30+ miles", price: "Custom quote" },
  { label: "After hours / weekends", price: "+$25" },
  { label: "Hospital / bedside", price: "+$35" },
  { label: "Rush (within 2 hours)", price: "+$50" },
  { label: "Additional signature", price: "$5" },
];

function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={<>Transparent pricing, <span className="italic font-light text-gradient-gold">no surprises.</span></>}
        intro="State-regulated notary fees apply where applicable. Every quote is confirmed with you before your appointment begins."
      />

      <section className="py-14 md:py-20">
        <div className="container-luxe">
          <div className="grid gap-5 md:grid-cols-3">
            {tiers.map((t, i) => (
              <Reveal key={t.name} delay={i * 60}>
                <div className={`h-full rounded-2xl border p-8 flex flex-col ${t.featured ? "bg-charcoal text-primary-foreground border-transparent shadow-2xl" : "bg-card border-border"}`}>
                  {t.featured && (
                    <span className="self-start text-[10px] uppercase tracking-[0.28em] text-gold border border-gold/40 rounded-full px-2.5 py-1">
                      Most requested
                    </span>
                  )}
                  <h3 className="mt-4 font-display text-2xl tracking-tight">{t.name}</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className={`font-display text-5xl tracking-tight ${t.featured ? "text-gradient-gold" : ""}`}>{t.price}</span>
                    <span className={t.featured ? "text-white/60 text-sm" : "text-muted-foreground text-sm"}>{t.unit}</span>
                  </div>
                  <ul className={`mt-6 space-y-2.5 text-sm ${t.featured ? "text-white/80" : "text-foreground/80"}`}>
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 text-gold" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/book" className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium ${t.featured ? "btn-gold" : "border border-border hover:border-gold/60"}`}>
                    Book this
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-secondary/40 border-y border-border">
        <div className="container-luxe">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Travel & add-ons</p>
              <h2 className="mt-4 font-display text-3xl md:text-4xl tracking-tight">Flat fees. Clearly explained.</h2>
            </div>
          </Reveal>
          <div className="mt-10 rounded-2xl border border-border bg-card overflow-hidden">
            <ul className="divide-y divide-border">
              {addons.map((a) => (
                <li key={a.label} className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm md:text-base text-foreground">{a.label}</span>
                  <span className="text-sm md:text-base font-medium tabular-nums text-foreground">{a.price}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 text-xs text-muted-foreground max-w-2xl">
            Note: Maximum notary fees are set by state law. All pricing shown here is editable and finalized in writing before your appointment.
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="container-luxe flex flex-wrap gap-3 items-center justify-between">
          <h2 className="font-display text-2xl md:text-3xl tracking-tight max-w-xl">Need a custom quote for a business or bulk signings?</h2>
          <Link to="/contact" className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium">
            Request a quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
