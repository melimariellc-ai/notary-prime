import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ONE badge/status indicator for pipeline stages, SMS status, quote status,
 * and every other status label.
 *
 * Spec: inline-flex, radius 9999px, padding 0.25rem 0.625rem, 12px text,
 * medium weight, normal letter-spacing (no small-caps chips), optional 6px dot.
 * Dot colour may be arbitrary (chart colours); TEXT colour is always a token
 * that meets AA on the badge background.
 */
export type BadgeTone = "neutral" | "accent" | "positive" | "warning" | "critical" | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-border bg-secondary text-foreground",
  accent: "border-gold/45 bg-gold/12 text-accent-foreground",
  positive: "border-[var(--status-positive)]/35 bg-[var(--status-positive)]/12 text-[var(--status-positive)]",
  warning: "border-[var(--status-warning)]/35 bg-[var(--status-warning)]/12 text-[var(--status-warning)]",
  critical: "border-destructive/35 bg-destructive/10 text-destructive",
  info: "border-[var(--status-info)]/35 bg-[var(--status-info)]/12 text-[var(--status-info)]",
};

export function Badge({
  children,
  tone = "neutral",
  dotColor,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  /** Any CSS colour for the leading dot; omit for no dot. */
  dotColor?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        TONES[tone],
        className,
      )}
    >
      {dotColor && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {children}
    </span>
  );
}
