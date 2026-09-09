import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Eye, ExternalLink, Plus, Send, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { emailDraftQuotePdf, previewQuotePdf } from "@/lib/quote-pdf.functions";
import { Button } from "@/components/admin/ui/Button";

/**
 * Standalone "build a quote PDF by hand" tool.
 *
 * Completely separate from the Stripe "Send quote" flow — nothing here creates
 * an invoice, saves a quote row, or touches quote status. It only renders,
 * downloads or emails the document.
 */
type DraftLine = { description: string; quantity: string; unit_price: string };

const emptyLine: DraftLine = { description: "", quantity: "1", unit_price: "" };

const INPUT_CLASS =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function ManualQuotePdfTool({
  appointmentId,
  clientEmail,
  initialLines,
  initialNotes,
  openLabel = "Build quote PDF manually",
}: {
  appointmentId: string;
  clientEmail?: string | null;
  initialLines?: { description: string; quantity: number; unit_price: number }[];
  initialNotes?: string | null;
  openLabel?: string;
}) {
  const buildPdf = useServerFn(previewQuotePdf);
  const sendPdf = useServerFn(emailDraftQuotePdf);

  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>(
    initialLines?.length
      ? initialLines.map((l) => ({
          description: l.description ?? "",
          quantity: String(l.quantity ?? 1),
          unit_price: String(l.unit_price ?? ""),
        }))
      : [{ ...emptyLine }],
  );
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("quote.pdf");
  const [busy, setBusy] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [to, setTo] = useState(clientEmail ?? "");
  const [message, setMessage] = useState("");

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

  function validated() {
    const items = lines.map((l) => ({
      description: l.description.trim() || "Notary services",
      quantity: Number(l.quantity) || 1,
      unit_price: Number(l.unit_price),
    }));
    if (items.some((l) => !Number.isFinite(l.quantity) || l.quantity <= 0)) {
      toast.error("Quantities must be greater than 0.");
      return null;
    }
    if (items.some((l) => !Number.isFinite(l.unit_price) || l.unit_price < 0)) {
      toast.error("Enter a valid unit price for every line item.");
      return null;
    }
    return items;
  }

  async function build() {
    const lineItems = validated();
    if (!lineItems) return null;
    const res = await buildPdf({ data: { appointmentId, lineItems, notes: notes.trim() || null } });
    if (!res.ok) {
      toast.error(res.message);
      return null;
    }
    return res;
  }

  async function preview() {
    setBusy(true);
    try {
      const res = await build();
      if (!res) return;
      const bytes = Uint8Array.from(atob(res.pdfBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      clearPreview();
      setPreviewUrl(url);
      setPreviewName(res.fileName);
    } catch (err) {
      console.error("Manual quote PDF preview failed", err);
      toast.error("Could not build the document. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    try {
      const res = await build();
      if (!res) return;
      const bytes = Uint8Array.from(atob(res.pdfBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = res.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Manual quote PDF download failed", err);
      toast.error("Could not build the document. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function email() {
    const lineItems = validated();
    if (!lineItems) return;
    setEmailing(true);
    try {
      const res = await sendPdf({
        data: {
          appointmentId,
          lineItems,
          notes: notes.trim() || null,
          to: to.trim() || null,
          message: message.trim() || null,
        },
      });
      if (res.ok) {
        toast.success(res.message);
        setMessage("");
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error("Manual quote PDF email failed", err);
      toast.error("Could not send the document. Please try again.");
    } finally {
      setEmailing(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Wrench className="h-4 w-4 text-gold" />
        {open ? "Close PDF builder" : openLabel}
      </Button>

      {open && (
        <div className="mt-4 w-full rounded-2xl border border-border bg-card/40 p-4 md:p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Manual quote document</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a quote document to download or email yourself. This does not create an invoice or change the quote
            status — use “Send formal quote” for that.
          </p>

          <div className="mt-5 grid gap-3">
            {lines.map((l, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[12rem] flex-1">
                  <label htmlFor={`m-desc-${appointmentId}-${i}`} className="block text-xs text-muted-foreground">
                    Description (optional)
                  </label>
                  <input
                    id={`m-desc-${appointmentId}-${i}`}
                    value={l.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    className={`mt-1 w-full ${INPUT_CLASS}`}
                  />
                </div>
                <div className="w-24">
                  <label htmlFor={`m-qty-${appointmentId}-${i}`} className="block text-xs text-muted-foreground">
                    Qty
                  </label>
                  <input
                    id={`m-qty-${appointmentId}-${i}`}
                    type="number"
                    min="1"
                    step="1"
                    value={l.quantity}
                    onChange={(e) => update(i, { quantity: e.target.value })}
                    className={`mt-1 w-full ${INPUT_CLASS}`}
                  />
                </div>
                <div className="w-32">
                  <label htmlFor={`m-price-${appointmentId}-${i}`} className="block text-xs text-muted-foreground">
                    Unit price ($)
                  </label>
                  <input
                    id={`m-price-${appointmentId}-${i}`}
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
            <label htmlFor={`m-notes-${appointmentId}`} className="block text-xs text-muted-foreground">
              Notes (optional)
            </label>
            <textarea
              id={`m-notes-${appointmentId}`}
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
                  Preview — {previewName}
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
              {previewBytes && <PdfPreview bytes={previewBytes} fallbackUrl={previewUrl} />
              <p className="mt-2 text-xs text-muted-foreground">
                Edit anything above and press Preview PDF again to refresh this document.
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
            <div>
              <label htmlFor={`m-to-${appointmentId}`} className="block text-xs text-muted-foreground">
                Email the document to
              </label>
              <input
                id={`m-to-${appointmentId}`}
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@example.com"
                className={`mt-1 w-full ${INPUT_CLASS}`}
              />
            </div>
            <div>
              <label htmlFor={`m-msg-${appointmentId}`} className="block text-xs text-muted-foreground">
                Message (optional)
              </label>
              <input
                id={`m-msg-${appointmentId}`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Here's the quote we discussed."
                className={`mt-1 w-full ${INPUT_CLASS}`}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Total</span>{" "}
              <span className="font-display text-xl tracking-tight">{money(total)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => void preview()} disabled={busy}>
                <Eye className="h-4 w-4 text-gold" />
                {busy ? "Building…" : previewUrl ? "Refresh preview" : "Preview PDF"}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void download()} disabled={busy}>
                <Download className="h-4 w-4 text-gold" /> Download PDF
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void email()}
                disabled={emailing || !to.trim()}
              >
                <Send className="h-4 w-4" />
                {emailing ? "Sending…" : "Email PDF"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
