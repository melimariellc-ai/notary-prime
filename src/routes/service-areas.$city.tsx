import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, ArrowRight, Phone, MessageSquare, Check } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { ServiceAreaMap } from "@/components/site/ServiceAreaMap";
import { CredentialsBar } from "@/components/site/CredentialsBar";
import { cities, cityBySlug } from "@/data/cities";

const SITE = "https://enlivennotary.com";

export const Route = createFileRoute("/service-areas/$city")({
  loader: ({ params }) => {
    const city = cityBySlug(params.city);
    if (!city) throw notFound();
    return { city };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/service-areas/${params.city}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Service area unavailable | Enliven Notary" }, { name: "robots", content: "noindex" }],
      };
    }
    const c = loaderData.city;
    const title = `Mobile Notary in ${c.name}, TX | Enliven Notary`;
    const description = `Mobile and online notary in ${c.name}, Texas. Same-day appointments at your home, office, or hospital. Loan signings, POAs, and apostille prep. Call or text (469) 991-2777.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Enliven Notary Services",
            description,
            telephone: "+1-469-991-2777",
            email: "info@enlivennotary.com",
            url,
            areaServed: [
              { "@type": "City", name: `${c.name}, TX` },
              { "@type": "AdministrativeArea", name: c.county },
            ],
            openingHours: "Mo-Sa 07:00-21:00",
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE },
              { "@type": "ListItem", position: 2, name: "Service Areas", item: `${SITE}/service-areas` },
              { "@type": "ListItem", position: 3, name: c.name, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: CityPage,
  notFoundComponent: CityNotFound,
});

function CityNotFound() {
  return (
    <div className="container-luxe py-28 text-center max-w-xl">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Not found</p>
      <h1 className="mt-4 font-display text-3xl md:text-4xl tracking-tight">
        We don't have a page for that city yet.
      </h1>
      <p className="mt-4 text-muted-foreground">
        We may still serve it. See our full DFW service area or ask us directly.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/service-areas" className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium">
          View service areas <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/contact" className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60">
          Check availability
        </Link>
      </div>
    </div>
  );
}

function CityPage() {
  const { city } = Route.useLoaderData();
  const nearby = city.nearby
    .map((s) => cities.find((c) => c.slug === s))
    .filter((c): c is (typeof cities)[number] => Boolean(c));

  return (
    <>
      <PageHero
        eyebrow={`${city.name} · ${city.county}`}
        title={
          <>
            {city.headline.replace(`, Texas`, "")}
            <span className="italic font-light text-gradient-gold">, Texas</span>
          </>
        }
        intro={city.intro}
      />

      <section className="pb-4">
        <div className="container-luxe">
          <CredentialsBar />
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-luxe grid lg:grid-cols-[1fr_1.05fr] gap-12 items-start">
          <Reveal>
            <ServiceAreaMap
              className="aspect-[4/3]"
              label={city.name}
              caption={city.travel}
              embedSrc={city.mapSrc}
              mapTitle={`Map of our notary service area in ${city.name}, Texas`}
            />
          </Reveal>
          <Reveal delay={80}>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground">
                Notary service in {city.name}
              </h2>
              {city.body.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
              <div className="pt-2 flex flex-wrap gap-3">
                <Link to="/book" className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium">
                  Book in {city.name} <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="tel:+14699912777"
                  aria-label="Call Enliven Notary at (469) 991-2777"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
                >
                  <Phone className="h-4 w-4 text-gold" /> Call (469) 991-2777
                </a>
                <a
                  href="sms:+14699912777"
                  aria-label="Text Enliven Notary at (469) 991-2777"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
                >
                  <MessageSquare className="h-4 w-4 text-gold" /> Text Us
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-secondary/40 border-y border-border">
        <div className="container-luxe">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Common in {city.name}</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight">
              What we're usually called for here
            </h2>
          </Reveal>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {city.useCases.map((u, i) => (
              <Reveal key={u.title} delay={i * 70}>
                <div className="h-full rounded-2xl border border-border bg-card p-7">
                  <h3 className="font-display text-xl tracking-tight">{u.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{u.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-luxe grid md:grid-cols-2 gap-12">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl tracking-tight">
              Neighborhoods we cover in {city.name}
            </h2>
            <ul className="mt-6 grid sm:grid-cols-2 gap-2.5">
              {city.neighborhoods.map((n) => (
                <li
                  key={n}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground/85"
                >
                  <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
                  <span className="truncate">{n}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-2xl md:text-3xl tracking-tight">
              ZIP codes served
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {city.zips.map((z) => (
                <li key={z} className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground/85">
                  {z}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Travel time</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{city.travel}</p>
              <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                <li className="flex gap-2"><Check className="h-4 w-4 text-gold shrink-0 mt-0.5" /> Mon–Sat, 7:00 AM to 9:00 PM</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-gold shrink-0 mt-0.5" /> Remote Online Notary available statewide</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-gold shrink-0 mt-0.5" /> Commissioned, bonded, and E&amp;O insured</li>
              </ul>
              <Link to="/pricing" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold hover:underline">
                See {city.name} pricing <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-secondary/40 border-y border-border">
        <div className="container-luxe">
          <h2 className="font-display text-2xl md:text-3xl tracking-tight">Nearby cities we serve</h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-5">
            {nearby.map((n) => (
              <Link
                key={n.slug}
                to="/service-areas/$city"
                params={{ city: n.slug }}
                className="group rounded-2xl border border-border bg-card p-6 hover:border-gold/50 transition-colors"
              >
                <p className="font-display text-xl tracking-tight">{n.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{n.county}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm text-gold">
                  View {n.name} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
          <Link to="/service-areas" className="mt-8 inline-flex items-center gap-2 text-sm font-medium hover:text-gold">
            All DFW service areas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container-luxe text-center max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Ready when you are</p>
          <h2 className="mt-4 font-display text-3xl md:text-4xl tracking-tight">
            Book a {city.name} notary <span className="italic font-light text-gradient-gold">today.</span>
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Tell us the documents, the address, and the time that works. We'll confirm personally.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/book" className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium">
              Book Appointment <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="tel:+14699912777"
              aria-label="Call Enliven Notary at (469) 991-2777"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
            >
              <Phone className="h-4 w-4 text-gold" /> Call (469) 991-2777
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
