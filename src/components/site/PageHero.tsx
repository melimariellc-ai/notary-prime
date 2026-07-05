import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  intro,
  cta = true,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: string;
  cta?: boolean;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 80% -10%, oklch(0.94 0.05 85 / 0.5), transparent 60%)",
        }}
      />
      <div className="container-luxe pt-20 md:pt-28 pb-14 md:pb-20 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
        <h1 className="mt-5 font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] tracking-tight text-foreground">
          {title}
        </h1>
        {intro && <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{intro}</p>}
        {cta && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/book"
              className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
            >
              Book Appointment <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-gold/60"
            >
              Ask a question
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// dummy export to keep this a valid TSX module (not a route file)
export const _routeMarker = createFileRoute;
