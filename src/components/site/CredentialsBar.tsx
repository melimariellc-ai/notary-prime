import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const credentials = [
  "Texas Commissioned Notary Public",
  "Bonded",
  "E&O Insured — $100,000 Coverage",
  "NNA Certified Signing Agent",
];

export function CredentialsBar({
  className,
  showHeading = true,
  align = "start",
}: {
  className?: string;
  showHeading?: boolean;
  align?: "start" | "center";
}) {
  return (
    <div
      aria-label="Credentials and verification"
      className={cn("flex flex-col gap-4", align === "center" && "items-center", className)}
    >
      {showHeading && (
        <p className="text-xs uppercase tracking-[0.28em] text-gold">Credentials &amp; Verification</p>
      )}
      <ul className={cn("flex flex-wrap gap-2.5", align === "center" && "justify-center")}>
        {credentials.map((c) => (
          <li key={c}>
            <Badge
              variant="outline"
              className="gap-2 rounded-full border-border bg-card px-4 py-2 text-xs font-medium text-card-foreground/90 [--gold:oklch(0.56_0.105_82)]"

            >
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              {c}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
