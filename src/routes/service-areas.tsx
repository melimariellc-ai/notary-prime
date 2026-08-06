import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ArrowRight, Phone } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/service-areas")({
  head: () => ({
    meta: [
      { title: "Service Areas — Dallas–Fort Worth Mobile Notary | Enliven Notary" },
      {
        name: "description",
        content:
          "Enliven Notary serves the entire Dallas–Fort Worth Metroplex with mobile notary, Remote Online Notary, and loan signing services. Dallas, Fort Worth, Arlington, Plano, Frisco, and more.",
      },
      { property: "og:title", content: "Service Areas | Enliven Notary — DFW Metroplex" },
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
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-border bg-card">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(600px 400px at 30% 30%, oklch(0.94 0.05 85 / 0.6), transparent 60%), radial-gradient(500px 400px at 80% 80%, oklch(0.9 0.03 250 / 0.5), transparent 60%)",
                }}
              />
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 400 300"
                role="img"
                aria-label="Illustrative Dallas–Fort Worth Metroplex service area map"
              >
                <g stroke="oklch(0.85 0.02 85)" strokeWidth="0.5" opacity="0.6">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <line key={`h${i}`} x1={0} y1={i * 15} x2={400} y2={i * 15} />
                  ))}
                  {Array.from({ length: 27 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 15} y1={0} x2={i * 15} y2={300} />
                  ))}
                </g>
                <path
                  d="M60,200 C80,150 110,120 160,110 C210,100 250,120 280,90 C310,60 350,80 360,140 C370,200 320,240 260,240 C200,240 120,260 60,200 Z"
                  fill="oklch(0.74 0.115 82 / 0.12)"
                  stroke="oklch(0.74 0.115 82)"
                  strokeWidth="1.5"
                />
                {[
                  [140, 170, "Fort Worth"],
                  [255, 155, "Dallas"],
                  [195, 180, "Arlington"],
                  [280, 105, "Plano"],
                  [300, 80, "Frisco"],
                  [175, 135, "Grapevine"],
                ].map(([x, y, label], i) => (
                  <g key={i}>
                    <circle cx={x as number} cy={y as number} r="7" fill="oklch(0.74 0.115 82)" opacity="0.25" />
                    <circle cx={x as number} cy={y as number} r="3.5" fill="oklch(0.74 0.115 82)" />
                    <text
                      x={(x as number) + 8}
                      y={(y as number) - 6}
                      fontSize="9"
                      fill="oklch(0.25 0.01 260)"
                      fontFamily="Inter, sans-serif"
                    >
                      {label}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/90 backdrop-blur border border-border p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-gold">Dallas–Fort Worth</p>
                <p className="text-sm text-foreground">
                  Serving the DFW Metroplex in person, and all of Texas online.
                </p>
              </div>
            </div>
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
                {cities.map((c) => (
                  <li
                    key={c}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground/85 hover:border-gold/50 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
                    <span className="truncate">{c}</span>
                  </li>
                ))}
              </ul>
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
                href="tel:+18176226182"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
              >
                <Phone className="h-4 w-4 text-gold" /> Call (817) 622-6182
              </a>
              <a
                href="sms:+18176226182"
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
            in Texas — legally recognized and completed in minutes.
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
