import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Eye, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createStripeQuoteInvoice,
  listQuoteHistory,
  listQuotes,
  type Quote,
  type QuoteLineItem,
} from "@/lib/quotes.functions";
import { previewQuotePdf } from "@/lib/quote-pdf.functions";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import { QuotePdfActions } from "@/components/admin/QuotePdfActions";


type DraftLine = { description: string; quantity: string; unit_price: string };

const emptyLine: DraftLine = { description: "", quantity: "1", unit_price: "" };

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const INPUT_CLASS =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

function QuoteBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: BadgeTone }> = {
    draft: { label: "Quote draft", tone: "neutral" },
    sent: { label: "Quote sent", tone: "accent" },
    viewed: { label: "Quote viewed", tone: "accent" },
    paid: { label: "Quote paid", tone: "positive" },
  };
  const s = map[status] ?? map["draft"]!;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Drafted",
  sent: "Sent to client",
  viewed: "Opened by client",
  paid: "Paid",
};

export function QuoteRow({ appointmentId, clientEmail }: { appointmentId: string; clientEmail?: string | null }) {
  const fetchQuotes = useServerFn(listQuotes);
  const fetchHistory = useServerFn(listQuoteHistory);
  const sendQuote = useServerFn(createStripeQuoteInvoice);

  const { data, refetch } = useQuery({
    queryKey: ["quotes", appointmentId],
    queryFn: () => fetchQuotes({ data: { appointmentId } }),
  });

  const latest: Quote | undefined = data?.quotes?.[0];

  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([{ ...emptyLine }]);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const makePreview = useServerFn(previewQuotePdf);

  const { data: history } = useQuery({
    queryKey: ["quote-history", appointmentId],
    queryFn: () => fetchHistory({ data: { appointmentId } }),
    enabled: historyOpen,
  });


  const total = lines.reduce((sum, l) => {
    const q = Number(l.quantity);
    const p = Number(l.unit_price);
    return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
  }, 0);

  function clearPreview() {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function update(i: number, patch: Partial<DraftLine>) {
    clearPreview();
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  /** Validated line items, or null after showing the reason. */
  function validated(): QuoteLineItem[] | null {
    const lineItems: QuoteLineItem[] = lines.map((l) => ({
      description: l.description.trim(),
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
    }));
    if (lineItems.some((l) => !l.description)) {
      toast.error("Every line item needs a description.");
      return null;
    }
    if (lineItems.some((l) => !Number.isFinite(l.quantity) || l.quantity <= 0)) {
      toast.error("Quantities must be greater than 0.");
      return null;
    }
    if (lineItems.some((l) => !Number.isFinite(l.unit_price) || l.unit_price < 0)) {
      toast.error("Enter a valid unit price for every line item.");
      return null;
    }
    return lineItems;
  }

  async function preview() {
    const lineItems = validated();
    if (!lineItems) return;
    setPreviewing(true);
    try {
      const res = await makePreview({ data: { appointmentId, lineItems, notes: notes.trim() || null } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const bytes = Uint8Array.from(atob(res.pdfBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      clearPreview();
      setPreviewUrl(url);
    } catch (err) {
      console.error("Quote preview failed", err);
      toast.error("Could not build the preview. Please try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function submit() {
    const lineItems = validated();
    if (!lineItems) return;

    setSending(true);
    try {
      const res = await sendQuote({ data: { appointmentId, lineItems, notes: notes.trim() || null } });
      if (res.ok) {
        toast.success("Quote sent — the client has been emailed an invoice.");
        setOpen(false);
        clearPreview();
        setLines([{ ...emptyLine }]);
        setNotes("");
        await refetch();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Could not send the quote. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        {latest ? <QuoteBadge status={latest.status} /> : null}
        {latest?.total !== undefined && latest !== undefined && (
          <span className="text-muted-foreground">{money(latest.total)}</span>
        )}
        {latest?.hosted_invoice_url && (
          <a
            href={latest.hosted_invoice_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-accent-foreground underline underline-offset-4"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View invoice
          </a>
        )}
        {latest && <QuotePdfActions quoteId={latest.id} clientEmail={clientEmail} />}
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <FileText className="h-4 w-4 text-gold" />
          {latest ? "Send another quote" : "Send formal quote"}
        </Button>
        {latest && (
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <Clock className="h-3.5 w-3.5" /> {historyOpen ? "Hide quote history" : "Quote history"}
          </button>
        )}
      </div>

      {historyOpen && (
        <div className="mt-4 rounded-2xl border border-border bg-card/40 p-4">
          {history?.events?.length ? (
            <ol className="grid gap-3">
              {history.events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">{STATUS_LABEL[e.status] ?? e.status}</span>
                  <span className="text-muted-foreground">
                    {new Date(e.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {e.changed_by_email ?? (e.source === "stripe" ? "Updated automatically" : "System")}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No status changes recorded yet.</p>
          )}
        </div>
      )}


      {open && (
        <div className="mt-4 rounded-2xl border border-border bg-card/40 p-4 md:p-6">
          <div className="grid gap-3">
            {lines.map((l, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[12rem] flex-1">
                  <label htmlFor={`desc-${appointmentId}-${i}`} className="block text-xs text-muted-foreground">
                    Description
                  </label>
                  <input
                    id={`desc-${appointmentId}-${i}`}
                    value={l.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    className={`mt-1 w-full ${INPUT_CLASS}`}
                  />
                </div>
                <div className="w-24">
                  <label htmlFor={`qty-${appointmentId}-${i}`} className="block text-xs text-muted-foreground">
                    Qty
                  </label>
                  <input
                    id={`qty-${appointmentId}-${i}`}
                    type="number"
                    min="1"
                    step="1"
                    value={l.quantity}
                    onChange={(e) => update(i, { quantity: e.target.value })}
                    className={`mt-1 w-full ${INPUT_CLASS}`}
                  />
                </div>
                <div className="w-32">
                  <label htmlFor={`price-${appointmentId}-${i}`} className="block text-xs text-muted-foreground">
                    Unit price ($)
                  </label>
                  <input
                    id={`price-${appointmentId}-${i}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={l.unit_price}
                    onChange={(e) => update(i, { unit_price: e.target.value })}
                    className={`mt-1 w-full ${INPUT_CLASS}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearPreview();
                    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
                  }}
                  disabled={lines.length === 1}
                  aria-label={`Remove line item ${i + 1}`}
                  className="mb-1 inline-flex items-center rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              clearPreview();
              setLines((prev) => [...prev, { ...emptyLine }]);
            }}
            className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add line item
          </button>

          <div className="mt-5">
            <label htmlFor={`notes-${appointmentId}`} className="block text-xs text-muted-foreground">
              Notes (optional)
            </label>
            <textarea
              id={`notes-${appointmentId}`}
              rows={3}
              value={notes}
              onChange={(e) => {
                clearPreview();
                setNotes(e.target.value);
              }}
              className={`mt-1 w-full ${INPUT_CLASS}`}
            />
          </div>

          {previewUrl && (
            <div className="mt-5 rounded-2xl border border-border bg-background p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Preview — exactly what the client receives
                </p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent-foreground underline underline-offset-4"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open in a new tab
                </a>
              </div>
              <iframe
                title="Quote PDF preview"
                src={previewUrl}
                className="h-[32rem] w-full rounded-xl border border-border"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Edit anything above to update it — the preview refreshes when you press Preview PDF again. The payment
                link is added once the quote is sent.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm">
              <span className="text-muted-foreground">Total</span>{" "}
              <span className="font-display text-xl tracking-tight">{money(total)}</span>
            </p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void preview()}
                disabled={previewing || sending}
              >
                <Eye className="h-4 w-4 text-gold" />
                {previewing ? "Building…" : previewUrl ? "Refresh preview" : "Preview PDF"}
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={() => void submit()} disabled={sending}>
                {sending ? "Sending…" : "Send quote"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
