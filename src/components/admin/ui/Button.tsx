import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ONE button hierarchy for the admin/CRM area.
 *
 * primary     — solid gold gradient, navy text (btn-gold)
 * secondary   — transparent, 1px border-border, foreground text
 * tertiary    — text link, accent-foreground, underline on hover
 * destructive — solid destructive, destructive-foreground text
 *
 * Sizes: md = h-10 / px-5 / 14px (default), sm = h-9 / px-4 / 13px.
 * Radius is always pill (9999px). Icons are ALWAYS 16px and lead the label.
 */
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "btn-gold hover:brightness-[1.04]",
  secondary: "border border-border bg-transparent text-foreground hover:bg-secondary",
  destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
  tertiary:
    "text-accent-foreground underline-offset-4 hover:underline hover:bg-secondary/60 px-0 hover:px-2",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[0.8125rem]",
  md: "h-10 px-5 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BASE, SIZES[size], VARIANTS[variant], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode }) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
