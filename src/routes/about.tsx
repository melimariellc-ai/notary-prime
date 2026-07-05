import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Clock, Sparkles, Lock, Award, Heart } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import aboutImg from "@/assets/about-notary.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Trusted Mobile & Online Notary | Prestige Notary" },
      { name: "description", content: "A commissioned, insured, background-screened notary bringing precision, discretion, and warmth to every signing." },
      { property: "og:title", content: "About | Prestige Notary" },
      { property: "og:description", content: "A commissioned, insured notary bringing precision and warmth to every signing." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const values = [
  { icon: ShieldCheck, title: "Integrity", text: "Every notarization performed strictly by state law." },
  { icon: Clock, title: "Punctuality", text: "Early is on time. Your schedule is respected." },
  { icon: Sparkles, title: "Attention to detail", text: "Every signature, initial, and seal verified twice." },
  { icon: Lock, title: "Confidentiality", text: "Documents handled with complete discretion." },
  { icon: Award, title: "Expertise", text: "Trained, tested, and continuously educated." },
  { icon: Heart, title: "Warmth", text: "Kind, calm, and reassuring at every step." },
];

function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title={<>Notarization, <span className="italic font-light text-gradient-gold">the way it should be.</span></>}
        intro="I make notarization simple by bringing professional notary services directly to you — or meeting securely online."
      />

      <section className="py-14 md:py-20">
        <div className="container-luxe grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-gold-soft/40 via-transparent to-transparent blur-2xl" aria-hidden />
              <div className="relative rounded-[1.75rem] overflow-hidden border border-border">
                <img
                  src={aboutImg}
                  alt="A wax notary seal and fountain pen resting on cream paper."
                  width={1200}
                  height={1400}
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">A calm, careful hand for your most important documents.</h2>
              <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  I built Prestige Notary on a simple idea: notarization should feel considered, not
                  rushed. Whether we meet at your kitchen table, in a hospital room, or over a secure
                  video session, every appointment is treated with the same precision and warmth.
                </p>
                <p>
                  As a commissioned, insured, and background-screened notary — and a certified loan
                  signing agent — I've been trusted by attorneys, title companies, and families
                  across the region for years. My commitment is straightforward: arrive on time,
                  double-check every page, protect your privacy, and make the whole experience feel
                  effortless.
                </p>
                <p className="italic text-foreground/90">
                  This bio is fully editable — swap in your name, story, credentials, and photo whenever you're ready.
                </p>
              </div>
              <Link to="/book" className="mt-8 btn-gold inline-flex items-center rounded-full px-6 py-3 text-sm font-medium">
                Book an appointment
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-secondary/40 border-y border-border">
        <div className="container-luxe">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.28em] text-gold">What I stand for</p>
              <h2 className="mt-4 font-display text-3xl md:text-4xl tracking-tight">Six commitments to every client.</h2>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 60}>
                <div className="rounded-2xl border border-border bg-card p-7 h-full">
                  <div className="grid place-items-center h-11 w-11 rounded-xl bg-gold/10 text-gold">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-display text-xl tracking-tight">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
