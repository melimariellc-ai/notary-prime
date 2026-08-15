import { createFileRoute, Link } from "@tanstack/react-router";
import { ServiceAreaMap } from "@/components/site/ServiceAreaMap";
import { CredentialsBar } from "@/components/site/CredentialsBar";


import {
  ShieldCheck,
  MapPin,
  Video,
  FileSignature,
  Building2,
  Stethoscope,
  Plane,
  GraduationCap,
  Landmark,
  ScrollText,
  Home,
  Briefcase,
  Star,
  Clock,
  Sparkles,
  Lock,
  Phone,
  ArrowRight,
  Check,
  CalendarClock,
  UserCheck,
  Handshake,
  ClipboardCheck,
  MessageSquare,
} from "lucide-react";
import heroImg from "@/assets/hero-notary.jpg";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Enliven Notary | Mobile & Online Notary | Dallas–Fort Worth, TX" },
      {
        name: "description",
        content:
          "Enliven Notary delivers NNA Certified mobile and remote online notary services across the Dallas–Fort Worth Metroplex. Loan signings, same-day appointments, evenings & weekends.",
      },
      { property: "og:title", content: "Enliven Notary | Mobile & Online Notary | Dallas–Fort Worth, TX" },
      {
        property: "og:description",
        content:
          "Enliven Notary delivers NNA Certified mobile and remote online notary services across the Dallas–Fort Worth Metroplex. Loan signings, same-day appointments, evenings & weekends.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const services = [
  { icon: MapPin, title: "Mobile Notary", description: "We travel to your home, office, hospital, or preferred location across DFW." },
  { icon: Video, title: "Remote Online Notary", description: "Secure, Texas-approved online notarizations for signers anywhere in the United States." },
  { icon: FileSignature, title: "Loan Signing Services", description: "NNA Certified loan signing agent for closings, refinances, and HELOCs." },
  { icon: ScrollText, title: "Acknowledgments & Jurats", description: "General notary work including acknowledgments, jurats, oaths, and affirmations." },
  { icon: ClipboardCheck, title: "Affidavits", description: "Sworn statements and personal affidavits, carefully notarized." },
  { icon: Landmark, title: "Power of Attorney", description: "Durable, medical, and specific POA documents handled with discretion." },
  { icon: ShieldCheck, title: "Estate Planning", description: "Wills, healthcare directives, and living wills executed with care." },
  { icon: ScrollText, title: "Trust Documents", description: "Trust agreements, amendments, and certifications notarized properly." },
  { icon: Home, title: "Purchase Closings", description: "Full purchase packages completed with attention to every page." },
  { icon: Home, title: "Seller Packages", description: "Seller-side signings coordinated for a smooth close." },
  { icon: Home, title: "Refinance Packages", description: "Refinance signings scheduled around your life, evenings and weekends." },
  { icon: Home, title: "HELOC Documents", description: "Home equity line signings handled quickly and professionally." },
  { icon: Stethoscope, title: "Medical Documents", description: "Bedside notarizations at hospitals, rehab centers, and assisted living." },
  { icon: GraduationCap, title: "School Documents", description: "Enrollment forms, permission slips, and student affidavits." },
  { icon: Plane, title: "Travel Consent Forms", description: "Minor travel consent and international parental authorization forms." },
  { icon: Briefcase, title: "Business Documents", description: "Contracts, corporate resolutions, vendor agreements, and affidavits." },
  { icon: Building2, title: "I-9 Employment Verification", description: "Authorized representative I-9 verifications available on request." },
];

const badges = [
  "Texas Commissioned Notary Public",
  "Bonded",
  "E&O Insured: $100,000 Coverage",
  "NNA Certified Signing Agent",
  "Loan Signing Services",
];

const steps = [
  { icon: CalendarClock, title: "Schedule", description: "Choose a time that works, often same day. Pick mobile or online." },
  { icon: UserCheck, title: "Verify Identification", description: "Present valid, government-issued photo ID. We handle KBA online." },
  { icon: Handshake, title: "Meet In Person or Online", description: "We arrive at your location or send a secure video session link." },
  { icon: ClipboardCheck, title: "Complete Notarization", description: "Sign, seal, and receive your documents, start to finish in minutes." },
];

const whyChoose = [
  { icon: ShieldCheck, title: "NNA Certified Professional", text: "Nationally certified and continuously trained." },
  { icon: MapPin, title: "Mobile Service: We Come To You", text: "Home, office, hospital, or anywhere across DFW." },
  { icon: Video, title: "Remote Online Notary", text: "Secure online sessions for signers anywhere in the United States." },
  { icon: FileSignature, title: "Professional Loan Signings", text: "Purchase, refinance, HELOC, and reverse mortgage packages." },
  { icon: CalendarClock, title: "Flexible Scheduling", text: "Same-day appointments when available." },
  { icon: Clock, title: "Evenings & Weekends", text: "Around your calendar, not the other way around." },
  { icon: Phone, title: "Prompt Communication", text: "Quick replies, clear confirmations, no guesswork." },
  { icon: Lock, title: "Secure & Confidential", text: "Your documents are protected end to end." },
  { icon: Sparkles, title: "Attention To Detail", text: "Every signature, every seal, precise." },
  { icon: Star, title: "Exceptional Experience", text: "Concierge-level service from first call to final page." },
  { icon: UserCheck, title: "Reliable & Professional", text: "On time, prepared, and courteous, every appointment." },
  { icon: Handshake, title: "Client-First Approach", text: "You'll always feel taken care of and informed." },
];

const testimonials = [
  {
    name: "Elena R.",
    role: "Real Estate Attorney",
    quote:
      "Handled our closing package after hours without a single missed signature. Absolutely first class.",
  },
  {
    name: "Marcus D.",
    role: "Estate Client",
    quote:
      "Came to my mother's bedside on short notice. Gentle, professional, and thorough. A gift.",
  },
  {
    name: "Priya S.",
    role: "Business Owner",
    quote:
      "Our vendor contracts were notarized online in under 15 minutes. This is how it should work.",
  },
  {
    name: "James O.",
    role: "Home Buyer",
    quote:
      "Guided us smoothly through the entire signing package. We felt taken care of from start to finish.",
  },
];

function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Services />
      <WhyChoose />
      <HowItWorks />
      <PricingTeaser />
      <Testimonials />
      <ServiceArea />
      <FAQTeaser />
      <OurPromise />
      <FinalCTA />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 80% -10%, oklch(0.94 0.05 85 / 0.55), transparent 60%), radial-gradient(900px 500px at 0% 10%, oklch(0.98 0.02 85), transparent 70%)",
        }}
      />
      <div className="container-luxe pt-16 md:pt-24 pb-20 md:pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
        <div>
          <Reveal>
            <h1 className="font-display text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.04] tracking-tight text-foreground">
              Professional Mobile &amp;{" "}
              <span className="italic font-light text-gradient-gold">Online Notary</span>{" "}
              Services Throughout the Dallas–Fort Worth Metroplex
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Convenient mobile and remote online notarization for individuals, families,
              businesses, and real estate professionals. Same-day appointments available.
              We come to you, or meet securely online.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {badges.map((b) => (
                <li
                  key={b}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-card-foreground/90"
                >
                  <Check className="h-3.5 w-3.5 text-gold" />
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={280}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/book"
                className="btn-gold group inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-medium tracking-wide transition-transform hover:-translate-y-0.5"
              >
                Book Appointment
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="tel:+14699912777" aria-label="Call Enliven Notary at (469) 991-2777"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-4 text-sm font-medium text-foreground hover:border-gold/60 transition-colors"
              >
                <Phone className="h-4 w-4 text-gold" />
                Call Now · (469) 991-2777
              </a>
              <a
                href="sms:+14699912777" aria-label="Text Enliven Notary at (469) 991-2777"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-4 text-sm font-medium text-foreground hover:border-gold/60 transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-gold" />
                Text Us
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-gold-soft/40 via-transparent to-transparent blur-2xl" aria-hidden />
            <div className="relative rounded-[1.75rem] overflow-hidden border border-border shadow-[0_40px_80px_-30px_oklch(0.2_0.02_260/0.35)]">
              <img
                src={heroImg}
                alt="Leather portfolio with a notarized document, gold fountain pen, and embossed seal on a polished desk."
                width={1600}
                height={1200}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden md:flex items-center gap-3 rounded-2xl border border-border bg-background/90 backdrop-blur px-4 py-3 shadow-lg">
              <div className="grid place-items-center h-10 w-10 rounded-full bg-gold/15 text-gold">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">5.0 · 200+ signings</p>
                <p className="text-xs text-muted-foreground">Trusted locally & online</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    "Same-Day Appointments",
    "NNA Certified",
    "Texas Commissioned Notary",
    "Remote Online Notary",
    "Loan Signing Services",
    "Hospital & Bedside Signings",
    "Evenings & Weekends",
    "Confidential & Secure",
  ];
  const doubled = [...items, ...items];
  return (
    <section aria-label="Trust indicators" className="border-y border-border bg-secondary/40 py-6 overflow-hidden">
      <div className="marquee-track flex gap-12 whitespace-nowrap">
        {doubled.map((t, i) => (
          <span key={i} className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  intro,
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      <p className="text-xs uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl md:text-5xl tracking-tight text-foreground">
        {title}
      </h2>
      {intro && <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">{intro}</p>}
    </div>
  );
}

function Services() {
  return (
    <section id="services" className="py-24 md:py-32">
      <div className="container-luxe">
        <Reveal>
          <SectionHeader
            eyebrow="Services"
            title={<>Every notarization, <span className="italic font-light text-gradient-gold">handled with care.</span></>}
            intro="From loan closings to hospital bedside signings, we bring precision, discretion, and speed to every appointment."
          />
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 40}>
              <article className="group h-full rounded-2xl border border-border bg-card p-7 transition-all duration-500 hover:border-gold/60 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_oklch(0.74_0.115_82/0.35)]">
                <div className="grid place-items-center h-11 w-11 rounded-xl bg-secondary text-foreground border border-border group-hover:bg-gold/10 group-hover:text-gold group-hover:border-gold/40 transition-colors">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 font-display text-xl tracking-tight">{s.title}</h3>
                <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyChoose() {
  return (
    <section className="py-24 md:py-32 bg-charcoal text-primary-foreground relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px 300px at 20% 0%, oklch(0.35 0.06 80 / 0.5), transparent), radial-gradient(500px 400px at 90% 100%, oklch(0.35 0.04 260 / 0.6), transparent)",
        }}
      />
      <div className="container-luxe relative">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Why Choose Us</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl tracking-tight max-w-2xl">
            The standard your documents deserve.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {whyChoose.map((w, i) => (
            <Reveal key={w.title} delay={i * 60}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 h-full">
                <div className="grid place-items-center h-11 w-11 rounded-xl bg-gold/15 text-gold">
                  <w.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 font-display text-xl tracking-tight">{w.title}</h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{w.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-luxe">
        <Reveal>
          <SectionHeader
            eyebrow="How It Works"
            title={<>Four steps. <span className="italic font-light text-gradient-gold">Zero friction.</span></>}
            intro="A calm, professional process designed to save you time and give you certainty."
          />
        </Reveal>
        <ol className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <li className="relative rounded-2xl border border-border bg-card p-7 h-full">
                <span className="absolute -top-4 left-6 rounded-full bg-charcoal text-primary-foreground text-xs tracking-[0.22em] uppercase px-3 py-1">
                  Step {String(i + 1).padStart(2, "0")}
                </span>
                <div className="mt-3 grid place-items-center h-11 w-11 rounded-xl bg-gold/10 text-gold">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const tiers = [
    {
      name: "Mobile Notary Services",
      price: "$100",
      unit: "starting at",
      blurb:
        "Professional mobile notary at your home, office, hospital, nursing home, or preferred meeting location.",
      features: [
        "Travel within standard service area",
        "Professional mobile service",
        "Flexible scheduling",
        "Confidential handling",
        "Prompt communication",
      ],
      cta: "Book Appointment",
      to: "/book" as const,
    },
    {
      name: "Remote Online Notary",
      price: "$65",
      unit: "starting at",
      blurb:
        "Secure online notarization for signers anywhere in the United States, using a state-approved Remote Online Notary platform.",
      features: [
        "Secure online meeting",
        "Legally recognized notarization",
        "Convenient from home or office",
        "Fast turnaround",
      ],
      cta: "Schedule Online",
      to: "/book" as const,
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
      to: "/contact" as const,
    },
    {
      name: "Specialty Appointments",
      price: "Custom Quote",
      unit: "",
      blurb: "Tailored notarizations for sensitive, time-critical, or off-hours needs.",
      features: [
        "Hospital Visits",
        "Nursing Homes",
        "Assisted Living Facilities",
        "Correctional Facilities",
        "After-Hours Appointments",
        "Weekend & Holiday Appointments",
      ],
      cta: "Request a Quote",
      to: "/contact" as const,
    },
  ];
  return (
    <section id="pricing" className="py-24 md:py-32 bg-secondary/40">
      <div className="container-luxe">
        <Reveal>
          <SectionHeader
            eyebrow="Pricing"
            title={<>Concierge notary service, <span className="italic font-light text-gradient-gold">transparently priced.</span></>}
            intro="Every appointment is quoted in writing before we begin. No surprises, just clear, professional service."
          />
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
                      <span className={`font-display text-3xl tracking-tight ${t.featured ? "text-gradient-gold" : "text-gradient-gold"}`}>
                        {t.price}
                      </span>
                    ) : (
                      <>
                        <span className={t.featured ? "text-white/60 text-xs uppercase tracking-[0.22em]" : "text-muted-foreground text-xs uppercase tracking-[0.22em]"}>
                          {t.unit}
                        </span>
                        <span className={`font-display text-5xl tracking-tight ${t.featured ? "text-gradient-gold" : ""}`}>
                          {t.price}
                        </span>
                      </>
                    )}
                  </div>
                  <p className={`mt-4 text-sm leading-relaxed ${t.featured ? "text-white/70" : "text-muted-foreground"}`}>
                    {t.blurb}
                  </p>
                  <div className={`mt-6 h-px w-full ${t.featured ? "bg-white/10" : "bg-border"}`} />
                  <ul className={`mt-6 space-y-2.5 text-sm ${t.featured ? "text-white/85" : "text-foreground/85"}`}>
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
          <p className="mt-10 max-w-3xl mx-auto text-center text-sm text-muted-foreground leading-relaxed">
            Every appointment is unique. Final pricing may vary depending on travel distance,
            document type, number of notarizations, appointment time, and specialty requests.
            You'll always receive a transparent quote before your appointment.
            State-regulated notarial fees apply where required under Texas law.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="reviews" className="py-24 md:py-32">
      <div className="container-luxe">
        <Reveal>
          <SectionHeader
            eyebrow="Reviews"
            title={<>Loved by clients, <span className="italic font-light text-gradient-gold">trusted by professionals.</span></>}
          />
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 60}>
              <figure className="h-full rounded-2xl border border-border bg-card p-8">
                <div className="flex gap-1 text-gold" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <Star key={n} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-5 font-display text-xl md:text-2xl leading-snug tracking-tight text-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{t.name}</span> · {t.role}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceArea() {
  const cities = [
    "Dallas",
    "Fort Worth",
    "Arlington",
    "Plano",
    "Irving",
    "Frisco",
    "McKinney",
    "Grapevine",
    "Southlake",
    "Grand Prairie",
    "Mansfield",
    "Colleyville",
  ];
  return (
    <section id="service-areas" className="py-24 md:py-32 bg-secondary/40">
      <div className="container-luxe grid lg:grid-cols-[1fr_1.1fr] gap-14 items-center">
        <Reveal>
          <SectionHeader
            eyebrow="Service Area"
            title={<>Proudly serving the <span className="italic font-light text-gradient-gold">Dallas–Fort Worth Metroplex</span>.</>}
            intro="Professional mobile and online notary services throughout DFW, plus secure Remote Online Notarization for signers anywhere in the United States."
          />
          <ul className="mt-8 grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-foreground/80">
                <MapPin className="h-4 w-4 text-gold" />
                {c}
              </li>
            ))}
          </ul>
          <Link
            to="/service-areas"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-gold"
          >
            View all ZIP codes <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
        <Reveal delay={100}>
          <div className="relative">
            <ServiceAreaMap className="aspect-[4/3]" caption="Dallas–Fort Worth Metroplex" />
            <Link
              to="/service-areas"
              className="absolute bottom-4 right-4 rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium text-foreground backdrop-blur hover:text-gold"
            >
              Explore →
            </Link>
          </div>
        </Reveal>

      </div>
    </section>
  );
}

function FAQTeaser() {
  const faqs = [
    {
      q: "What ID is accepted?",
      a: "Valid, unexpired government-issued photo ID: driver's license, state ID, passport, or military ID. Two credible witnesses may substitute where allowed.",
    },
    {
      q: "Can you come to my location?",
      a: "Yes, homes, offices, hospitals, coffee shops, senior living facilities, and jobsites throughout the region.",
    },
    {
      q: "Do you offer online notarizations?",
      a: "Yes. Secure Remote Online Notarization (RON) is available for signers anywhere in the United States.",
    },
    {
      q: "How long does an appointment take?",
      a: "Most single-signature notarizations take 10–15 minutes. Loan signings typically run 45–75 minutes.",
    },
    {
      q: "What payment methods do you accept?",
      a: "Cash, card, Apple Pay, Google Pay, Zelle, and invoicing for corporate clients.",
    },
    {
      q: "Do I sign before the appointment?",
      a: "No. You must sign in the notary's presence. Please leave all signature and date fields blank until we meet.",
    },
  ];
  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="container-luxe grid lg:grid-cols-[1fr_1.4fr] gap-14">
        <Reveal>
          <SectionHeader
            eyebrow="FAQ"
            title={<>Questions, <span className="italic font-light text-gradient-gold">answered.</span></>}
            intro="Everything you need to know before your appointment. Don't see your question? Reach out anytime."
          />
          <Link
            to="/contact"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-gold"
          >
            Ask a question <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
        <Reveal delay={80}>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {faqs.map((f, i) => (
              <details key={i} className="group p-6 md:p-7">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                  <span className="font-display text-lg md:text-xl text-foreground">{f.q}</span>
                  <span
                    aria-hidden
                    className="mt-1 grid place-items-center h-7 w-7 shrink-0 rounded-full border border-border text-muted-foreground group-open:bg-charcoal group-open:text-primary-foreground group-open:border-transparent transition-colors"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function OurPromise() {
  return (
    <section className="py-24 md:py-32 bg-charcoal text-primary-foreground relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(700px 400px at 50% 0%, oklch(0.4 0.07 80 / 0.55), transparent 70%)",
        }}
      />
      <div className="container-luxe relative max-w-3xl text-center">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Our Promise</p>
          <h2 className="mt-5 font-display text-4xl md:text-5xl tracking-tight">
            A seamless experience, <span className="italic font-light text-gradient-gold">from start to finish.</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/75">
            At Enliven Notary, every appointment is handled with professionalism, accuracy,
            confidentiality, and respect. Whether you're completing a simple notarization or a
            complex real estate closing, our goal is to provide a seamless experience that
            gives you complete confidence from start to finish.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-luxe">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 md:p-16 text-center">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(600px 400px at 50% 0%, oklch(0.94 0.05 85 / 0.55), transparent 70%)",
            }}
          />
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Book Today</p>
          <h2 className="mt-4 font-display text-4xl md:text-6xl tracking-tight max-w-3xl mx-auto">
            Notarization made <span className="italic font-light text-gradient-gold">simple.</span>
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-muted-foreground">
            Get started in under a minute. Book instantly online, or request a quote if your situation
            needs a closer look. Either way, you'll hear from us fast.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/book"
              hash="instant-booking"
              className="btn-gold inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-medium"
            >
              Book Instantly <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/book"
              search={{ service: "Other" }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-4 text-sm font-medium hover:border-gold/60"
            >
              Request a Quote
            </Link>
            <a
              href="tel:+14699912777" aria-label="Call Enliven Notary at (469) 991-2777"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-4 text-sm font-medium hover:border-gold/60"
            >
              <Phone className="h-4 w-4 text-gold" /> Call Now
            </a>
            <a
              href="sms:+14699912777" aria-label="Text Enliven Notary at (469) 991-2777"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-4 text-sm font-medium hover:border-gold/60"
            >
              <MessageSquare className="h-4 w-4 text-gold" /> Text Us
            </a>

          </div>
          <CredentialsBar className="mt-10" align="center" showHeading={false} />

        </div>
      </div>
    </section>
  );
}
