import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/service-areas")({
  head: () => ({
    meta: [
      { title: "Service Areas — Mobile Notary Near You | Enliven Notary" },
      { name: "description", content: "Mobile notary service throughout the greater metro area. Remote online notarizations available nationwide across the United States." },
      { property: "og:title", content: "Service Areas | Enliven Notary" },
      { property: "og:description", content: "Mobile notary throughout the metro. Online notary nationwide." },
      { property: "og:url", content: "/service-areas" },
    ],
    links: [{ rel: "canonical", href: "/service-areas" }],
  }),
  component: AreasPage,
});

const cities = [
  { name: "Downtown", zips: ["77002", "77003", "77004"] },
  { name: "North Hills", zips: ["77018", "77022", "77037"] },
  { name: "West End", zips: ["77024", "77055", "77080"] },
  { name: "Riverside", zips: ["77007", "77008", "77009"] },
  { name: "Southgate", zips: ["77025", "77030", "77054"] },
  { name: "Uptown", zips: ["77027", "77056", "77057"] },
  { name: "Lakeview", zips: ["77042", "77063", "77077"] },
  { name: "Old Town", zips: ["77006", "77019", "77098"] },
];

function AreasPage() {
  return (
    <>
      <PageHero
        eyebrow="Service Areas"
        title={<>Serving the <span className="italic font-light text-gradient-gold">greater metro</span> — and beyond.</>}
        intro="In person throughout the region. Online notarizations available for anyone in the United States."
      />

      <section className="py-14 md:py-20">
        <div className="container-luxe grid lg:grid-cols-[1.2fr_1fr] gap-12 items-start">
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
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" role="img" aria-label="Illustrative service area map">
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
                  fill="oklch(0.74 0.115 82 / 0.12)" stroke="oklch(0.74 0.115 82)" strokeWidth="1.5"
                />
              </svg>
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-background/90 backdrop-blur border border-border p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-gold">Google Maps</p>
                <p className="text-sm text-foreground">Interactive map placeholder</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">Cities & ZIP codes</h2>
              <p className="mt-3 text-muted-foreground">Don't see yours? Ask — we frequently serve nearby areas.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {cities.map((c) => (
                  <div key={c.name} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gold" />
                      <h3 className="font-display text-lg tracking-tight">{c.name}</h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground tabular-nums">{c.zips.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
