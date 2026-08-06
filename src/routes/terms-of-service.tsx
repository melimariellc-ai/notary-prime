import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { DraftNotice } from "@/components/site/DraftNotice";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Enliven Notary" },
      {
        name: "description",
        content:
          "Terms covering notary services, fee quotes, scope of service, and our cancellation policy.",
      },
      { property: "og:title", content: "Terms of Service | Enliven Notary" },
      {
        property: "og:description",
        content: "Scope of notary services, fee quotes, and cancellation policy at Enliven Notary.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/terms-of-service" },
    ],
    links: [{ rel: "canonical", href: "/terms-of-service" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Terms"
        title={
          <>
            Terms of <span className="italic font-light text-gradient-gold">Service</span>
          </>
        }
        intro="The scope of what we do, how fees are quoted, and what to expect when scheduling."
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
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  Notary services only
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Enliven Notary provides notarial services such as verifying identity,
                  administering oaths, and witnessing signatures. Enliven Notary is not an attorney
                  and is not licensed to practice law.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  No legal advice
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  We cannot give legal advice, explain the meaning or effect of a document, choose
                  which document you should sign, or prepare legal documents on your behalf. For
                  guidance of that kind, please consult a licensed attorney.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">Fees</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  All fees are quoted and agreed upon before service is performed, so there are no
                  surprises. Notarial act fees follow the maximums set by Texas law; travel,
                  after-hours, and convenience fees are separate and disclosed in advance.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  Cancellations and no-shows
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  A cancellation or no-show fee may apply for appointments cancelled with
                  insufficient notice or missed entirely; fee amounts will be communicated at the
                  time of booking.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  Right to decline
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  We may decline a notarization when identification is insufficient, a signer
                  appears unwilling or unable to understand the transaction, a document is
                  incomplete, or the request would violate applicable law or notary standards.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">Contact</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Questions about these terms can be sent to{" "}
                  <a href="mailto:info@enlivennotary.com" className="text-gold hover:underline">
                    info@enlivennotary.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
