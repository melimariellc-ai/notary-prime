import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPin, Video, FileSignature, ScrollText, Landmark, Home, ShieldCheck,
  Stethoscope, Briefcase, GraduationCap, Plane, Building2, ArrowRight, Check,
} from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Notary Services — Mobile, Online & Loan Signing | Enliven Notary" },
      { name: "description", content: "Full-service notary: mobile appointments, remote online notary, loan signing agent, real estate, estate planning, medical, business, and personal documents." },
      { property: "og:title", content: "Notary Services | Enliven Notary" },
      { property: "og:description", content: "Mobile, online, and loan signing notary services with same-day availability." },
      { property: "og:url", content: "/services" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

const groups = [
  {
    title: "How we meet",
    items: [
      { icon: MapPin, title: "Mobile Notary", desc: "We travel to homes, offices, hospitals, coffee shops, and jobsites." },
      { icon: Video, title: "Remote Online Notary", desc: "Secure audio-video sessions for signers anywhere in the U.S." },
      { icon: FileSignature, title: "Loan Signing Agent", desc: "NNA-certified for closings, refinances, HELOCs, and reverse mortgages." },
    ],
  },
  {
    title: "General notarial acts",
    items: [
      { icon: ScrollText, title: "Acknowledgments", desc: "Confirming that a signer voluntarily signed a document." },
      { icon: ScrollText, title: "Jurats", desc: "Sworn statements executed under oath or affirmation." },
      { icon: ScrollText, title: "Oaths & Affirmations", desc: "Administered for depositions, affidavits, and testimony." },
      { icon: ScrollText, title: "Copy Certifications", desc: "Certified true copies where permitted by state law." },
    ],
  },
  {
    title: "Documents we handle",
    items: [
      { icon: Landmark, title: "Power of Attorney", desc: "Durable, medical, and specific POA documents." },
      { icon: Home, title: "Real Estate", desc: "Deeds, closings, refinances, and title packages." },
      { icon: ShieldCheck, title: "Estate Planning", desc: "Wills, trusts, and healthcare directives." },
      { icon: Stethoscope, title: "Medical", desc: "Advance directives and bedside signings." },
      { icon: Briefcase, title: "Business", desc: "Contracts, resolutions, and corporate affidavits." },
      { icon: GraduationCap, title: "School Forms", desc: "Permission and enrollment forms." },
      { icon: Plane, title: "Travel Consent", desc: "Minor and international consent forms." },
      { icon: Building2, title: "I-9 Verification", desc: "Authorized representative I-9 signings." },
    ],
  },
];

function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title={<>A complete notary practice, <span className="italic font-light text-gradient-gold">tailored to you.</span></>}
        intro="From loan closings to hospital bedside signings, every appointment is handled with the same precision and discretion."
      />
      {groups.map((g) => (
        <section key={g.title} className="py-14 md:py-20 border-t border-border">
          <div className="container-luxe">
            <Reveal>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight max-w-2xl">{g.title}</h2>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((s, i) => (
                <Reveal key={s.title} delay={i * 40}>
                  <article className="group h-full rounded-2xl border border-border bg-card p-7 transition-all hover:border-gold/60 hover:-translate-y-1">
                    <div className="grid place-items-center h-11 w-11 rounded-xl bg-secondary border border-border text-foreground group-hover:bg-gold/10 group-hover:text-gold group-hover:border-gold/40 transition-colors">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 font-display text-xl tracking-tight">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="py-24">
        <div className="container-luxe">
          <div className="rounded-3xl border border-border bg-charcoal text-primary-foreground p-10 md:p-14 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Not sure what you need?</p>
              <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight max-w-xl">
                We'll help you identify the right notarial act.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/book" className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium">
                Book now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 text-sm font-medium hover:bg-white/5">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// keep tree-shaker happy
export const _c = Check;
