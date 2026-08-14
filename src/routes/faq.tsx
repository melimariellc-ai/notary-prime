import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ: Notary Questions Answered | Enliven Notary" },
      { name: "description", content: "Answers to common questions about mobile and online notarization: accepted ID, documents, pricing, appointments, and more." },
      { property: "og:title", content: "FAQ | Enliven Notary" },
      { property: "og:description", content: "Answers to common notary questions." },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FAQPage,
});

const faqs = [
  { q: "What ID is accepted?", a: "Valid, unexpired government-issued photo ID: driver's license, state ID, passport, or military ID. In many states, two credible witnesses may substitute where allowed." },
  { q: "What documents can be notarized?", a: "Almost any document requiring a signature under state notarial law, including real estate, estate planning, medical, business, personal, and school documents. Some documents (like vital records) cannot be notarized." },
  { q: "Can you come to my location?", a: "Yes. We travel to homes, offices, hospitals, senior living facilities, coffee shops, and jobsites throughout the region." },
  { q: "Do you offer online notarizations?", a: "Yes. Secure Remote Online Notarization (RON) is available for signers anywhere in the United States." },
  { q: "What payment methods do you accept?", a: "Cash, all major credit and debit cards, Apple Pay, Google Pay, Zelle, and invoicing for corporate clients." },
  { q: "Do I sign before the appointment?", a: "No. You must sign in the notary's presence. Please leave all signature and date fields blank until we meet." },
  { q: "How long does an appointment take?", a: "Most single-signature notarizations take 10–15 minutes. Loan signings typically run 45–75 minutes depending on the package." },
  { q: "Are you insured and bonded?", a: "Yes, fully commissioned, insured, bonded, and background screened. Certifications are provided on request." },
  { q: "Can you notarize on evenings and weekends?", a: "Yes. Evenings, weekends, and rush appointments are available for a modest additional fee." },
  { q: "Do you offer loan signing services?", a: "Yes, as a certified loan signing agent, we handle closings, refinances, HELOCs, and reverse mortgages with printing and scan-backs available." },
];

function FAQPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title={<>Questions, <span className="italic font-light text-gradient-gold">answered.</span></>}
        intro="Everything you need to know before your appointment."
      />
      <section className="py-14 md:py-20">
        <div className="container-luxe max-w-3xl">
          <Reveal>
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {faqs.map((f, i) => (
                <details key={i} className="group p-6 md:p-7" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                    <span className="font-display text-lg md:text-xl text-foreground">{f.q}</span>
                    <span aria-hidden className="mt-1 grid place-items-center h-7 w-7 shrink-0 rounded-full border border-border text-muted-foreground group-open:bg-charcoal group-open:text-primary-foreground group-open:border-transparent transition-colors">+</span>
                  </summary>
                  <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
