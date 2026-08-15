import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Phone, MessageSquare } from "lucide-react";
import logoAsset from "../../assets/enliven-logo.png.asset.json";

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
      className={`bg-charcoal text-primary-foreground sticky top-0 z-50 border-b transition-all duration-500 ${
        scrolled
          ? "border-gold/30 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]"
          : "border-white/10 shadow-[0_1px_0_0_rgba(201,162,39,0.18)]"
      }`}
    >

      <div className="mx-auto w-full max-w-[86rem] px-5 md:px-8 flex items-center justify-between h-20 py-4 gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Enliven Notary Home">
          <img src={logoAsset.url} alt="Enliven Notary logo" className="h-11 w-auto shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-tight whitespace-nowrap">Enliven Notary</span>
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.22em] text-white/60 whitespace-nowrap">
              Mobile · Online · Trusted
            </span>
          </span>
        </Link>


        <nav aria-label="Primary" className="hidden lg:flex items-center gap-0.5">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-gold" }}
              inactiveProps={{ className: "text-white/75 hover:text-white" }}
              className="px-2.5 py-2 text-sm tracking-wide whitespace-nowrap transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Link
            to="/book"
            className="btn-gold inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-transform hover:-translate-y-0.5"
          >
            Book Appointment
          </Link>
        </div>

        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border border-white/20 text-white"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-charcoal text-primary-foreground">
          <div className="container-luxe py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-3 text-base text-white border-b border-white/10 last:border-0"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              <a
                href="tel:+14699912777" aria-label="Call Enliven Notary at (469) 991-2777"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm text-white"
              >
                <Phone className="h-4 w-4 text-gold" /> Call
              </a>
              <a
                href="sms:+14699912777" aria-label="Text Enliven Notary at (469) 991-2777"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm text-white"
              >
                <MessageSquare className="h-4 w-4 text-gold" /> Text
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
