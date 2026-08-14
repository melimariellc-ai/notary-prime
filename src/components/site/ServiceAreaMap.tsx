import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Centered on the Dallas–Fort Worth Metroplex (between Dallas and Fort Worth). */
const DFW_EMBED_SRC =
  "https://www.google.com/maps?ll=32.7767,-97.0403&z=9&output=embed";

export function ServiceAreaMap({
  className,
  label = "Service area",
  caption = "Dallas–Fort Worth Metroplex",
  embedSrc = DFW_EMBED_SRC,
  mapTitle = "Map of the Dallas–Fort Worth Metroplex service area",
}: {
  className?: string;
  label?: string;
  caption?: string;
  embedSrc?: string;
  mapTitle?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-border bg-card", className)}>
      <iframe
        src={embedSrc}
        title={mapTitle}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />

      {/* Soft service-area boundary overlay (no single pin — mobile service). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="h-[62%] w-[62%] rounded-full border-2 border-gold/70 bg-gold/10 shadow-[0_0_60px_10px_oklch(0.74_0.115_82/0.25)]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 45%, oklch(0.2 0.02 260 / 0.18) 100%)",
        }}
      />

      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl border border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/15 text-gold">
          <MapPin className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold">{label}</p>
          <p className="text-sm text-foreground">{caption}</p>
        </div>
      </div>
    </div>
  );
}
