import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Send } from "lucide-react";
import { toast } from "sonner";
import { emailQuotePdf, getQuotePdf } from "@/lib/quote-pdf.functions";
import { Button } from "@/components/admin/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FIELD =
  "mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

/** Download or email the printable PDF version of a quote. */
export function QuotePdfActions({
  quoteId,
  clientEmail,
  size = "sm",
}: {
  quoteId: string;
  clientEmail?: string | null;
  size?: "sm" | "md";
}) {
  const buildPdf = useServerFn(getQuotePdf);
  const sendPdf = useServerFn(emailQuotePdf);

  const [downloading, setDownloading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [to, setTo] = useState(clientEmail ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const res = await buildPdf({ data: { quoteId } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
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
      console.error("Quote PDF download failed", err);
      toast.error("Could not build the quote document. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function email() {
    setSending(true);
    try {
      const res = await sendPdf({ data: { quoteId, to: to.trim() || null, message: message.trim() || null } });
      if (res.ok) {
        toast.success(res.message);
        setEmailOpen(false);
        setMessage("");
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error("Quote PDF email failed", err);
      toast.error("Could not send the quote document. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" size={size} onClick={() => void download()} disabled={downloading}>
        <Download className="h-4 w-4 text-gold" />
        {downloading ? "Preparing…" : "Download PDF"}
      </Button>
      <Button type="button" variant="secondary" size={size} onClick={() => setEmailOpen(true)}>
        <Send className="h-4 w-4 text-gold" /> Email PDF
      </Button>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email the quote as a PDF</DialogTitle>
            <DialogDescription>
              The quote is attached as a printable document, so the client has it on file as well as the payment link.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label htmlFor={`quote-pdf-to-${quoteId}`} className="text-sm font-medium">
              Send to
            </label>
            <input
              id={`quote-pdf-to-${quoteId}`}
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="client@example.com"
              className={FIELD}
            />
          </div>

          <div className="mt-4">
            <label htmlFor={`quote-pdf-note-${quoteId}`} className="text-sm font-medium">
              Message (optional)
            </label>
            <textarea
              id={`quote-pdf-note-${quoteId}`}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Thanks for your time today — here's the quote we discussed."
              className={FIELD}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="secondary" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={() => void email()} disabled={sending || !to.trim()}>
              {sending ? "Sending…" : "Send PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
