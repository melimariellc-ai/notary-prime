import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Mail, MapPin, MessageSquare, Phone, Stamp } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-charcoal text-primary-foreground">
      <div className="container-luxe py-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12 mb-14 flex flex-col md:flex-row md:items-center gap-6 md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Ready when you are</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight">
              Schedule your notarization today.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/book"
              className="btn-gold inline-flex items-center rounded-full px-6 py-3 text-sm font-medium"
            >
              Book Appointment
            </Link>
            <a
              href="tel:+14699912777" aria-label="Call Enliven Notary at (469) 991-2777"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm text-white hover:bg-white/5"
            >
              <Phone className="h-4 w-4" /> Call Now
            </a>
            <a
              href="sms:+14699912777" aria-label="Text Enliven Notary at (469) 991-2777"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm text-white hover:bg-white/5"
            >
              <MessageSquare className="h-4 w-4" /> Text Us
            </a>

          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Stamp aria-hidden className="h-6 w-6 text-gold shrink-0" strokeWidth={1.5} />
              <span className="font-display text-lg tracking-tight">Enliven Notary</span>
            </div>

            <p className="mt-4 text-sm text-white/70 leading-relaxed">
              Making notarization simple by bringing professional notary services directly to
              you — or meeting securely online.
            </p>
            <div className="flex gap-3 mt-6">
              {[
                { Icon: Instagram, label: "Instagram" },
                { Icon: Linkedin, label: "LinkedIn" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid place-items-center h-9 w-9 rounded-full border border-white/15 hover:border-gold/60 hover:text-gold transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.22em] text-gold">Quick Links</h3>
            <ul className="mt-5 space-y-2.5 text-sm text-white/75">
              {[
                { to: "/services" as const, label: "Services" },
                { to: "/pricing" as const, label: "Pricing" },
                { to: "/service-areas" as const, label: "Service Areas" },
                { to: "/about" as const, label: "About" },
                { to: "/reviews" as const, label: "Reviews" },
                { to: "/faq" as const, label: "FAQ" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-gold transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.22em] text-gold">Services</h3>
            <ul className="mt-5 space-y-2.5 text-sm text-white/75">
              <li>Mobile Notary</li>
              <li>Remote Online Notary</li>
              <li>Loan Signing Agent</li>
              <li>Real Estate Documents</li>
              <li>Estate Planning</li>
              <li>Power of Attorney</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-[0.22em] text-gold">Contact</h3>
            <ul className="mt-5 space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                <a href="tel:+14699912777" aria-label="Call Enliven Notary at (469) 991-2777" className="select-text">(469) 991-2777</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                <a href="mailto:info@enlivennotary.com">info@enlivennotary.com</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                <span>Serving the Dallas–Fort Worth Metroplex</span>
              </li>
            </ul>
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Hours</p>
              <p className="mt-2 text-sm text-white/80">Mon–Sat · 7:00a — 9:00p</p>
              <p className="text-sm text-white/60">Sunday by appointment</p>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-white/50">
          <p>© {new Date().getFullYear()} Enliven Notary Services. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link>
            <Link to="/accessibility" className="hover:text-white">Accessibility</Link>

          </div>
        </div>
      </div>
    </footer>
  );
}
