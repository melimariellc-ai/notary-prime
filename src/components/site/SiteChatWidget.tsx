import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, X, Send } from "lucide-react";

import { getSiteChatConfig, sendSiteChatMessage, captureSiteChatLead, type SiteChatTurn } from "@/lib/site-chat.functions";

const GREETING =
  "Hi! I can walk you through how mobile or online notarization works, our service area, credentials and pricing — or help you get booked. What can I help with?";

export function SiteChatWidget() {
  const config = useQuery({
    queryKey: ["site-chat-config"],
    queryFn: () => getSiteChatConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const send = useServerFn(sendSiteChatMessage);
  const capture = useServerFn(captureSiteChatLead);

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<SiteChatTurn[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", phone: "", notes: "" });
  const [leadStatus, setLeadStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy, showLead]);

  if (!config.data?.enabled) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    const history = turns;
    setTurns([...history, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const result = await send({ data: { message, history } });
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: result.ok ? result.reply : result.message },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry — that didn't go through. You can reach us at ${config.data?.phone ?? ""}.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setLeadStatus(null);
    if (!lead.email.trim() && !lead.phone.trim()) {
      setLeadStatus("Please share an email address or a phone number.");
      return;
    }
    setBusy(true);
    try {
      const result = await capture({ data: { ...lead, history: turns } });
      setLeadStatus(result.message);
      if (result.ok) {
        setShowLead(false);
        setTurns((prev) => [...prev, { role: "assistant", content: result.message }]);
      }
    } catch {
      setLeadStatus("That didn't save. Please call us instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="btn-gold fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lg"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Chat with us
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(34rem,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[24rem]">
          <div className="flex items-center justify-between border-b border-border bg-charcoal px-4 py-3">
            <div>
              <p className="text-sm font-medium text-primary-foreground">
                {config.data.businessName || "Enliven Notary"}
              </p>
              <p className="text-xs text-primary-foreground/70">Questions? We're here.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 text-primary-foreground/80 hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.map((turn, index) => (
              <div
                key={index}
                className={
                  turn.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-charcoal px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[90%] whitespace-pre-line text-sm text-foreground"
                }
              >
                {turn.content}
              </div>
            ))}
            {busy && !showLead && <p className="text-xs text-muted-foreground">Typing…</p>}

            {showLead && (
              <form onSubmit={submitLead} className="space-y-2 rounded-2xl border border-border p-3">
                <p className="text-xs font-medium text-foreground">Leave your details and we'll reach out.</p>
                {(["name", "email", "phone", "notes"] as const).map((key) => (
                  <input
                    key={key}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder={
                      key === "name"
                        ? "Your name"
                        : key === "email"
                          ? "Email"
                          : key === "phone"
                            ? "Phone"
                            : "What do you need notarized? (optional)"
                    }
                    value={lead[key]}
                    onChange={(e) => setLead((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                ))}
                {leadStatus && <p className="text-xs text-muted-foreground">{leadStatus}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className="btn-gold rounded-full px-4 py-2 text-xs font-medium">
                    {busy ? "Sending…" : "Send my details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLead(false)}
                    className="rounded-full border border-border px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <a href="/book" className="underline">
              Book an appointment
            </a>
            {" · "}
            <button type="button" onClick={() => setShowLead(true)} className="underline">
              Leave my info
            </button>
            {config.data.phone ? (
              <>
                {" · "}
                <a href={`tel:${config.data.phone.replace(/[^\d+]/g, "")}`} className="underline">
                  {config.data.phone}
                </a>
              </>
            ) : null}
          </div>

          <form onSubmit={submit} className="flex items-end gap-2 border-t border-border p-3">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(e);
                }
              }}
              placeholder="Type your message…"
              className="max-h-24 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="btn-gold inline-flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <p className="px-4 pb-3 text-[10px] leading-snug text-muted-foreground">
            General information only — not legal advice.
          </p>
        </div>
      )}
    </>
  );
}
