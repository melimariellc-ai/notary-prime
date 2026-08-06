import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { DraftNotice } from "@/components/site/DraftNotice";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility | Enliven Notary" },
      {
        name: "description",
        content:
          "Our commitment to WCAG 2.1 Level AA accessibility and how to report an accessibility barrier.",
      },
      { property: "og:title", content: "Accessibility | Enliven Notary" },
      {
        property: "og:description",
        content: "Enliven Notary's commitment to WCAG 2.1 Level AA accessibility.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/accessibility" },
    ],
    links: [{ rel: "canonical", href: "/accessibility" }],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <>
      <PageHero
        eyebrow="Accessibility"
        title={
          <>
            Accessible to <span className="italic font-light text-gradient-gold">everyone.</span>
          </>
        }
        intro="We want every client to be able to read, navigate, and book with ease."
        cta={false}
      />

      <section className="pb-20">
        <div className="container-luxe max-w-3xl">
          <Reveal>
            <DraftNotice />
          </Reveal>

          <Reveal delay={60}>
            <div className="mt-10 space-y-10">
              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">Our commitment</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Enliven Notary is committed to making this website usable by as many people as
                  possible, including people with disabilities. We work toward conformance with the
                  Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, and we review the site
                  periodically as content and features change.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  Tell us about a barrier
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  If you encounter any difficulty using this site, or need information provided in
                  another format, email{" "}
                  <a href="mailto:info@enlivennotary.com" className="text-gold hover:underline">
                    info@enlivennotary.com
                  </a>{" "}
                  and we will respond promptly and work to resolve it.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
