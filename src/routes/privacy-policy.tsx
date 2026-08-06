import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { DraftNotice } from "@/components/site/DraftNotice";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Enliven Notary" },
      {
        name: "description",
        content:
          "How Enliven Notary collects and uses the information you share through our contact and booking forms.",
      },
      { property: "og:title", content: "Privacy Policy | Enliven Notary" },
      {
        property: "og:description",
        content: "How Enliven Notary collects, uses, and protects your appointment information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/privacy-policy" },
    ],
    links: [{ rel: "canonical", href: "/privacy-policy" }],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title={
          <>
            Privacy <span className="italic font-light text-gradient-gold">Policy</span>
          </>
        }
        intro="A plain-language summary of what we collect, why we collect it, and how it is handled."
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
                  Information we collect
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  When you submit our contact form or booking form, we collect the details you
                  provide: your name, email address, phone number, and appointment details such as
                  the type of document, preferred date and time, and meeting location or online
                  session preference.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  How we use your information
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  This information is used only to schedule, confirm, and complete your notary
                  appointment, and to respond to questions you send us. We do not use it for
                  unrelated marketing.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  We do not sell your information
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Enliven Notary does not sell, rent, or trade your information to third parties.
                  Documents and personal details shared during a signing are treated as
                  confidential.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  Questions about privacy
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  For any privacy questions or requests, contact us at{" "}
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
