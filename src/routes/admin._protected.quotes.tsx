import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/admin/ui/Card";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { listAllQuotes, type QuoteOverviewRow } from "@/lib/quotes.functions";

export const Route = createFileRoute("/admin/_protected/quotes")({
  head: () => ({
    meta: [
      { title: "Quotes | Enliven Notary" },
      { name: "description", content: "Track every Enliven Notary quote and whether it is pending, sent, viewed or paid." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Quotes | Enliven Notary" },
      { property: "og:description", content: "Private admin overview of quote status and payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotesPage,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Pending", tone: "neutral" },
  sent: { label: "Sent", tone: "accent" },
  viewed: { label: "Viewed", tone: "accent" },
  paid: { label: "Paid", tone: "positive" },
};

const FILTERS = ["all", "draft", "sent", "viewed", "paid"] as const;
type Filter = (typeof FILTERS)[number];

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function when(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function QuotesPage() {
  const fetchAll = useServerFn(listAllQuotes);
  const { data, isLoading } = useQuery({ queryKey: ["all-quotes"], queryFn: () => fetchAll({}) });

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const quotes: QuoteOverviewRow[] = data?.quotes ?? [];

  const counts = useMemo(() => {
    const base: Record<string, number> = { draft: 0, sent: 0, viewed: 0, paid: 0 };
    for (const q of quotes) if (q.status in base) base[q.status] = (base[q.status] ?? 0) + 1;
    return base;
  }, [quotes]);

  const paidTotal = useMemo(
    () => quotes.filter((q) => q.status === "paid").reduce((sum, q) => sum + q.total, 0),
    [quotes],
  );
  const outstandingTotal = useMemo(
    () => quotes.filter((q) => q.status !== "paid").reduce((sum, q) => sum + q.total, 0),
    [quotes],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotes.filter((q) => {
      if (filter !== "all" && q.status !== filter) return false;
      if (!term) return true;
      return (
        q.client_name.toLowerCase().includes(term) ||
        q.client_email.toLowerCase().includes(term) ||
        q.service.toLowerCase().includes(term)
      );
    });
  }, [quotes, filter, search]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Billing"
        title="Quotes"
        intro="Every formal quote sent from an appointment request, with its live status. Statuses update on their own as clients open and pay their invoices."
      />
      <AdminSection>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Awaiting payment</p>
            <p className="mt-2 font-display text-3xl tracking-tight">{quotes.length - (counts["paid"] ?? 0)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{money(outstandingTotal)} outstanding</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Paid</p>
            <p className="mt-2 font-display text-3xl tracking-tight">{counts["paid"] ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">{money(paidTotal)} collected</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sent, not opened</p>
            <p className="mt-2 font-display text-3xl tracking-tight">{counts["sent"] ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">Waiting on the client</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Viewed</p>
            <p className="mt-2 font-display text-3xl tracking-tight">{counts["viewed"] ?? 0}</p>
            <p className="mt-1 text-sm text-muted-foreground">Opened but unpaid</p>
          </Card>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label htmlFor="quote-search" className="sr-only">
            Search quotes
          </label>
          <input
            id="quote-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, email or service"
            className="min-w-[16rem] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.14em] transition-colors ${
                  filter === f
                    ? "border-gold bg-secondary text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : (STATUS_META[f]?.label ?? f)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <Card className="p-6 text-sm text-muted-foreground">Loading quotes…</Card>
          ) : visible.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              {quotes.length === 0
                ? "No quotes yet. Send one from an appointment request to see it here."
                : "No quotes match this filter."}
            </Card>
          ) : (
            visible.map((q) => {
              const meta = STATUS_META[q.status] ?? STATUS_META["draft"]!;
              return (
                <Card key={q.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg tracking-tight">{q.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {q.service}
                        {q.client_email ? ` · ${q.client_email}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-display text-xl tracking-tight">{money(q.total)}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-3">
                    <p className="text-muted-foreground">
                      Sent <span className="text-foreground">{when(q.sent_at)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Opened <span className="text-foreground">{when(q.viewed_at)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Paid <span className="text-foreground">{when(q.paid_at)}</span>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    <Link
                      to="/admin"
                      className="text-accent-foreground underline underline-offset-4"
                    >
                      Open appointment requests
                    </Link>
                    {q.hosted_invoice_url && (
                      <a
                        href={q.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-accent-foreground underline underline-offset-4"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View invoice
                      </a>
                    )}
                    <span className="text-muted-foreground">
                      Last update {when(q.last_updated_at)}
                      {q.last_updated_by ? ` by ${q.last_updated_by}` : " (automatic)"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <QuotePdfActions quoteId={q.id} clientEmail={q.client_email} />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </AdminSection>
    </>
  );
}
