import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Reply, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/admin/ui/Button";
import {
  generateMailReplyDraft,
  getInboundEmail,
  sendMailReply,
} from "@/lib/mail-reply.functions";

/**
 * Reply to a received email without leaving the CRM. The original message is
 * shown in full, and sending reuses the same sender/reply-to pair as every other
 * outbound email so further replies keep getting tracked.
 */
export function MailReplyComposer({ inboundEmailId }: { inboundEmailId: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [drafting, setDrafting] = useState(false);

  const loadEmail = useServerFn(getInboundEmail);
  const generate = useServerFn(generateMailReplyDraft);
  const send = useServerFn(sendMailReply);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inbound-email", inboundEmailId],
    queryFn: () => loadEmail({ data: { inboundEmailId } }),
    enabled: open,
  });

  const email = data?.ok ? data.email : null;
  const defaultSubject = email
    ? /^re:/i.test(email.subject ?? "")
      ? String(email.subject)
      : `Re: ${email.subject ?? "(no subject)"}`
    : "";
  const subjectValue = subject || defaultSubject;

  async function onGenerate() {
    setDrafting(true);
    setFeedback(null);
    try {
      const result = await generate({
        data: { inboundEmailId, extraInstructions: instructions },
      });
      if (result.ok) {
        setBody(result.body);
        setFeedback({ tone: "ok", text: "Draft ready — edit it as you like, nothing has been sent." });
      } else {
        setFeedback({ tone: "error", text: result.message });
      }
    } catch (err) {
      console.error("Reply draft failed", err);
      setFeedback({ tone: "error", text: "A draft could not be generated right now. Please try again." });
    } finally {
      setDrafting(false);
    }
  }

  async function onSend() {
    setSending(true);
    setFeedback(null);
    try {
      const result = await send({ data: { inboundEmailId, subject: subjectValue, body } });
      if (result.ok) {
        setFeedback({ tone: "ok", text: `Reply sent to ${result.sentTo}.` });
        setBody("");
        await queryClient.invalidateQueries({ queryKey: ["mail-activity"] });
      } else {
        setFeedback({ tone: "error", text: result.message });
      }
    } catch (err) {
      console.error("Reply send failed", err);
      setFeedback({ tone: "error", text: "The reply could not be sent. Please try again." });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div className="pb-3 pl-11">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-accent-foreground underline-offset-4 hover:underline"
        >
          <Reply className="h-3.5 w-3.5" /> Reply
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 ml-11 rounded-2xl border border-border bg-secondary/40 p-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the original email…</p>
      ) : !email ? (
        <p className="text-sm text-muted-foreground">
          {data && !data.ok ? data.message : "Could not load that email."}
        </p>
      ) : (
        <>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Original message
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">{email.fromName ?? email.fromEmail}</span>{" "}
            <span className="text-muted-foreground">&lt;{email.fromEmail}&gt;</span>
          </p>
          <p className="text-sm text-muted-foreground">{email.subject ?? "(no subject)"}</p>
          <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-3 text-sm leading-relaxed">
            {email.body || "(no message content)"}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                To
              </span>
              <input
                value={email.fromEmail}
                readOnly
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground"
              />
            </label>
            <label className="block">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Subject
              </span>
              <input
                value={subjectValue}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>

            {/* Optional helper — writing a reply by hand needs none of this. */}
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" onClick={onGenerate} disabled={drafting}>
                  <Sparkles className="h-4 w-4" /> {drafting ? "Writing a draft…" : "Generate with AI"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowInstructions((v) => !v)}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  {showInstructions ? "Hide instructions" : "Add instructions (optional)"}
                </button>
              </div>
              {showInstructions && (
                <label className="mt-3 block">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Instructions
                  </span>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                    placeholder="e.g. Keep it to two sentences and mention the RON discount"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm"
                  />
                </label>
              )}
            </div>

            <label className="block">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Your reply
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Write your reply…"
                className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed"
              />
            </label>
          </div>

          {feedback && (
            <p className={`mt-3 text-sm ${feedback.tone === "ok" ? "text-accent-foreground" : "text-destructive"}`}>
              {feedback.text}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" onClick={onSend} disabled={sending || !body.trim()}>
              <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send reply"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setFeedback(null);
              }}
            >
              Close
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
