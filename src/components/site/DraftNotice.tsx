import { AlertTriangle } from "lucide-react";

export function DraftNotice() {
  return (
    <div className="rounded-2xl border border-dashed border-gold/60 bg-gold/5 px-5 py-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-gold shrink-0 mt-0.5" aria-hidden />
      <p className="text-sm font-medium tracking-wide text-foreground">
        DRAFT: have this reviewed before publishing
      </p>
    </div>
  );
}
