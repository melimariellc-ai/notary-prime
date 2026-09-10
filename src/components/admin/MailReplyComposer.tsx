import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Reply, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/admin/ui/Button";
import {
  generateMailReplyDraft,
  getInboundEmail,
  sendMailReply,
} from "@/lib/mail-reply.functions";
import { generateOutreachEmail, sendOutreachEmail } from "@/lib/outreach.functions";
import { SEND_PROFILE_LIST, type SendProfileId } from "@/lib/send-profiles";

/**
 * One compose box used in two places:
 *  - replying to a received email in Mail Activity (the original is shown in full)
 *  - writing a fresh email to a CRM contact from their detail page
 * Sending always goes through the same Resend sender/reply-to pairs, so any
 * further reply keeps getting tracked.
 */
type Props =
  | { inboundEmailId: string; contactId?: never; contactEmail?: never; onSent?: () => void | Promise<void> }
  | {
      inboundEmailId?: never;
      contactId: string;
      contactEmail: string | null;
      businessName?: string | null;
      onSent?: () => void | Promise<void>;
    };

export function MailReplyComposer(props: Props) {
  const mode = props.inboundEmailId ? ("reply" as const) : ("compose" as const);
  const inboundEmailId = props.inboundEmailId ?? "";
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sendProfile, setSendProfile] = useState<SendProfileId>(
    mode === "reply" ? "reply_in_thread" : "outreach",
  );

  const loadEmail = useServerFn(getInboundEmail);
  const generateReply = useServerFn(generateMailReplyDraft);
  const sendReply = useServerFn(sendMailReply);
  const generateFresh = useServerFn(generateOutreachEmail);
  const sendFresh = useServerFn(sendOutreachEmail);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inbound-email", inboundEmailId],
    queryFn: () => loadEmail({ data: { inboundEmailId } }),
    enabled: open && mode === "reply",
  });

  const email = data?.ok ? data.email : null;
  const defaultSubject =
    mode === "reply" && email
      ? /^re:/i.test(email.subject ?? "")
        ? String(email.subject)
        : `Re: ${email.subject ?? "(no subject)"}`
      : "";
  const subjectValue = subject || defaultSubject;
  const toAddress = mode === "reply" ? (email?.fromEmail ?? "") : (props.contactEmail ?? "");

  async function onGenerate() {
    setDrafting(true);
    setFeedback(null);
    try {
      const result =
        mode === "reply"
          ? await generateReply({ data: { inboundEmailId, extraInstructions: instructions } })
          : await generateFresh({ data: { contactId: props.contactId!, extraInstructions: instructions } });
      if (result.ok) {
        setBody(result.body);
        if (mode === "compose" && "subject" in result && result.subject && !subject) setSubject(result.subject);
        setFeedback({ tone: "ok", text: "Draft ready — edit it as you like, nothing has been sent." });
      } else {
        setFeedback({ tone: "error", text: result.message });
      }
    } catch (err) {
      console.error("Draft failed", err);
      setFeedback({ tone: "error", text: "A draft could not be generated right now. Please try again." });
    } finally {
      setDrafting(false);
    }
  }

  async function onSend() {
    setSending(true);
    setFeedback(null);
    try {
      const result =
        mode === "reply"
          ? await sendReply({ data: { inboundEmailId, subject: subjectValue, body, sendProfile } })
          : await sendFresh({
              data: { contactId: props.contactId!, subject: subjectValue, body, sendProfile },
            });
      if (result.ok) {
        setFeedback({ tone: "ok", text: `Email sent to ${result.sentTo}.` });
        setBody("");
        if (mode === "compose") setSubject("");
        await queryClient.invalidateQueries({ queryKey: ["mail-activity"] });
        await props.onSent?.();
      } else {
        setFeedback({ tone: "error", text: result.message });
      }
    } catch (err) {
      console.error("Send failed", err);
      setFeedback({ tone: "error", text: "The email could not be sent. Please try again." });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return mode === "reply" ? (
      <div className="pb-3 pl-11">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-accent-foreground underline-offset-4 hover:underline"
        >
          <Reply className="h-3.5 w-3.5" /> Reply
        </button>
      </div>
    ) : (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Mail className="h-4 w-4" /> Compose Email
      </Button>
    );
  }

  const shell =
    mode === "reply"
      ? "mb-4 ml-11 rounded-2xl border border-border bg-secondary/40 p-4"
      : "rounded-2xl border border-border bg-secondary/40 p-4";

  return (
    <div className={shell}>
      {mode === "reply" && isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the original email…</p>
      ) : mode === "reply" && !email ? (
        <p className="text-sm text-muted-foreground">
          {data && !data.ok ? data.message : "Could not load that email."}
        </p>
      ) : (
        <>
          {mode === "reply" && email && (
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
            </>
          )}

          <div className="mt-4 grid gap-3">
            <label className="block">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                To
              </span>
              <input
                value={toAddress || "No email address on file"}
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
                placeholder={mode === "compose" ? "Subject line" : undefined}
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Send from
              </span>
              <select
                value={sendProfile}
                onChange={(e) => setSendProfile(e.target.value as SendProfileId)}
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {SEND_PROFILE_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>


            {/* Optional helper — writing the email by hand needs none of this. */}
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
                    placeholder="e.g. Keep it to two sentences and offer a quick call this week"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm"
                  />
                </label>
              )}
            </div>

            <label className="block">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {mode === "reply" ? "Your reply" : "Your message"}
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder={mode === "reply" ? "Write your reply…" : "Write your email…"}
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
            <Button
              type="button"
              onClick={onSend}
              disabled={sending || !body.trim() || !subjectValue.trim() || !toAddress}
            >
              <Send className="h-4 w-4" /> {sending ? "Sending…" : mode === "reply" ? "Send reply" : "Send email"}
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
