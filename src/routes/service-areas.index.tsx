import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ArrowRight, Phone, MessageSquare } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { ServiceAreaMap } from "@/components/site/ServiceAreaMap";
import { cities as cityPages } from "@/data/cities";

export const Route = createFileRoute("/service-areas/")({
  head: () => ({
    meta: [
      { title: "Service Areas: Dallas–Fort Worth Mobile Notary | Enliven Notary" },
      {
        name: "description",
        content:
          "Enliven Notary serves the entire Dallas–Fort Worth Metroplex with mobile notary, Remote Online Notary, and loan signing services. Dallas, Fort Worth, Arlington, Plano, Frisco, and more.",
      },
      { property: "og:title", content: "Service Areas | Enliven Notary | DFW Metroplex" },
      {
        property: "og:description",
        content:
          "Mobile and online notary services across the Dallas–Fort Worth Metroplex.",
      },
      { property: "og:url", content: "/service-areas" },
    ],
    links: [{ rel: "canonical", href: "/service-areas" }],
  }),
  component: AreasPage,
});

// Editable list of served DFW cities
const cities = [
  "Dallas",
  "Fort Worth",
  "Arlington",
  "Irving",
  "Grand Prairie",
  "Mesquite",
  "Garland",
  "Richardson",
  "Plano",
  "Frisco",
  "McKinney",
  "Carrollton",
  "Addison",
  "Farmers Branch",
  "Balch Springs",
  "Duncanville",
  "DeSoto",
  "Lancaster",
  "Cedar Hill",
  "Waxahachie",
  "Rockwall",
  "Rowlett",
  "Coppell",
  "Grapevine",
  "Euless",
  "Bedford",
  "Hurst",
];

function AreasPage() {
  return (
    <>
      <PageHero
        eyebrow="Service Area"
        title={
          <>
            Mobile & Online Notary Services Across the{" "}
            <span className="italic font-light text-gradient-gold">
              Dallas–Fort Worth Metroplex
            </span>
          </>
        }
        intro="Enliven Notary proudly serves clients throughout the DFW area with professional mobile notary, remote online notary, and loan signing services."
      />

      <section className="py-14 md:py-20">
        <div className="container-luxe grid lg:grid-cols-[1.1fr_1fr] gap-12 items-start">
          <Reveal>
            <ServiceAreaMap
              className="aspect-[4/3]"
              label="Dallas–Fort Worth"
              caption="Serving the DFW Metroplex in person, and all of Texas online."
            />
          </Reveal>

          <Reveal delay={80}>
            <div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                Cities we serve
              </h2>
              <p className="mt-3 text-muted-foreground">
                Professional mobile and online notary throughout the Dallas–Fort Worth Metroplex.
              </p>
              <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {cities.map((c) => {
                  const page = cityPages.find((p) => p.name === c);
                  if (page) {
                    return (
                      <li key={c}>
                        <Link
                          to="/service-areas/$city"
                          params={{ city: page.slug }}
                          className="flex items-center gap-2 rounded-xl border border-gold/40 bg-card px-3.5 py-2.5 text-sm text-foreground hover:border-gold transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
                          <span className="truncate">{c}</span>
                        </Link>
                      </li>
                    );
                  }
                  return (
                  <li
                    key={c}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground/85 hover:border-gold/50 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
                    <span className="truncate">{c}</span>
                  </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Gold-outlined cities have a dedicated page with neighborhoods, ZIP codes, and local details.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-secondary/40 border-y border-border">
        <div className="container-luxe">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 md:p-14 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Outside the map?</p>
              <h2 className="mt-3 font-display text-2xl md:text-3xl tracking-tight">
                Don't see your city listed?
              </h2>
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                Contact Enliven Notary for availability. Mobile appointments may be available
                outside our standard service area for an additional travel fee.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
              >
                Check Availability <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="tel:+14699912777" aria-label="Call Enliven Notary at (469) 991-2777"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
              >
                <Phone className="h-4 w-4 text-gold" /> Call (469) 991-2777
              </a>
              <a
                href="sms:+14699912777" aria-label="Text Enliven Notary at (469) 991-2777"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
              >
                <MessageSquare className="h-4 w-4 text-gold" /> Text Us
              </a>

            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container-luxe text-center max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Statewide via RON</p>
          <h2 className="mt-4 font-display text-3xl md:text-4xl tracking-tight">
            Anywhere in Texas, <span className="italic font-light text-gradient-gold">online.</span>
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Can't meet in person? Our secure Remote Online Notary sessions serve signers anywhere
            in Texas, legally recognized and completed in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/book"
              className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
            >
              Schedule Online <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
