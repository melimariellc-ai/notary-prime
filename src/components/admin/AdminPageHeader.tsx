import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  intro,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-secondary/40">
      <div className="px-4 py-8 md:px-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-accent-foreground">{eyebrow}</p>
            )}
            <h1 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">{title}</h1>
            {intro && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{intro}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function AdminSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`px-4 py-8 md:px-8 md:py-10 ${className}`}>{children}</section>;
}
