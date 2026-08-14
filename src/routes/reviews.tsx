import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews: 5-Star Notary Service | Enliven Notary" },
      { name: "description", content: "Read reviews from attorneys, real estate professionals, and families who trust Enliven Notary for mobile and online notarizations." },
      { property: "og:title", content: "Reviews | Enliven Notary" },
      { property: "og:description", content: "5-star reviews from attorneys, lenders, and families." },
      { property: "og:url", content: "/reviews" },
    ],
    links: [{ rel: "canonical", href: "/reviews" }],
  }),
  component: ReviewsPage,
});

const reviews = [
  { name: "Elena R.", role: "Real Estate Attorney", quote: "Handled our closing package after hours without a single missed signature. Absolutely first class." },
  { name: "Marcus D.", role: "Estate Client", quote: "Came to my mother's bedside on short notice. Gentle, professional, and thorough. A gift." },
  { name: "Priya S.", role: "Business Owner", quote: "Our vendor contracts were notarized online in under 15 minutes. This is how it should work." },
  { name: "James O.", role: "Home Buyer", quote: "Explained every page of the loan docs. We felt taken care of the entire time." },
  { name: "Rachel M.", role: "Title Company Manager", quote: "Reliable, punctual, and always error-free. Our first call for every rush signing." },
  { name: "Daniel K.", role: "Family Client", quote: "Traveled 40 minutes to meet us at the hospital. Compassionate and completely professional." },
];

function ReviewsPage() {
  return (
    <>
      <PageHero
        eyebrow="Reviews"
        title={<>Trusted by professionals. <span className="italic font-light text-gradient-gold">Loved by clients.</span></>}
        intro="A selection of reviews from attorneys, lenders, and families across the region."
      />

      <section className="py-14 md:py-20">
        <div className="container-luxe">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal key={r.name} delay={i * 50}>
                <figure className="h-full rounded-2xl border border-border bg-card p-8">
                  <div className="flex gap-1 text-gold" aria-label="5 out of 5 stars">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <Star key={n} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-5 font-display text-lg md:text-xl leading-snug tracking-tight text-foreground">
                    “{r.quote}”
                  </blockquote>
                  <figcaption className="mt-6 text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">{r.name}</span> · {r.role}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
