import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ONE card style for the whole admin/CRM area.
 * Spec: bg-card, 1px border-border, radius 1.5rem (rounded-3xl), padding 1.5rem
 * (2rem at md+). Never override padding/border/radius — change content only.
 */
export const CARD_CLASS =
  "rounded-3xl border border-border bg-card p-6 md:p-8 shadow-[0_1px_0_var(--color-border)]";

export function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={cn(CARD_CLASS, className)}>
      {children}
    </div>
  );
}

/** Card header: serif title (24px), optional leading icon and right-side meta. */
export function CardHeader({
  title,
  icon: Icon,
  meta,
}: {
  title: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="inline-flex items-baseline gap-2 font-display text-2xl leading-tight tracking-tight">
        {Icon && <Icon className="h-5 w-5 shrink-0 translate-y-0.5 text-accent-foreground" />}
        {title}
      </h2>
      {meta && <div className="flex items-center gap-3">{meta}</div>}
    </div>
  );
}

/** Section label: 11px, uppercase, 0.18em tracking, muted. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
