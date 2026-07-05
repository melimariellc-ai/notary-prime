import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Phone } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/pricing", label: "Pricing" },
  { to: "/service-areas", label: "Service Areas" },
  { to: "/about", label: "About" },
  { to: "/reviews", label: "Reviews" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-xl bg-background/80 border-b border-border/70"
          : "bg-transparent"
      }`}
    >
      <div className="container-luxe flex items-center justify-between h-18 py-4">
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="Prestige Notary — Home">
          <span
            aria-hidden
            className="grid place-items-center h-9 w-9 rounded-full border border-gold/60 text-gold font-display text-lg tracking-tight"
          >
            N
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-tight text-foreground">Prestige Notary</span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Mobile · Online · Trusted
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="px-3 py-2 text-sm tracking-wide transition-colors relative"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <a
            href="tel:+15551234567"
            className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground px-3 py-2"
          >
            <Phone className="h-4 w-4 text-gold" aria-hidden />
            <span className="tabular-nums">(555) 123-4567</span>
          </a>
          <Link
            to="/book"
            className="btn-gold inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
          >
            Book Appointment
          </Link>
        </div>

        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border border-border"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="container-luxe py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-3 text-base text-foreground border-b border-border/50 last:border-0"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              <a
                href="tel:+15551234567"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm"
              >
                <Phone className="h-4 w-4 text-gold" /> Call Now
              </a>
              <Link
                to="/book"
                onClick={() => setOpen(false)}
                className="btn-gold flex-1 inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium"
              >
                Book
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
