import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronDown, Mails } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/admin/ui/Card";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { DraftReviewCard } from "@/components/admin/DraftReviewCard";
import { MailReplyComposer } from "@/components/admin/MailReplyComposer";
import { listMailActivity, type MailActivityRow } from "@/lib/mail-activity.functions";
import { getInboundEmail } from "@/lib/mail-reply.functions";
import { listAppointmentDrafts, type AppointmentDraft } from "@/lib/appointment-drafts.functions";

export const Route = createFileRoute("/admin/_protected/mail-activity")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" && search["email"] ? String(search["email"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mail Activity | Enliven Notary" },
      {
        name: "description",
        content: "One live feed of every email Enliven Notary sends and receives, with delivery status.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Mail Activity | Enliven Notary" },
      { property: "og:description", content: "Private feed of sent and received email activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MailActivityPage,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  sent: { label: "Sent", tone: "neutral" },
  delivered: { label: "Delivered", tone: "positive" },
  replied: { label: "Replied", tone: "accent" },
  received: { label: "Received", tone: "info" },
  bounced: { label: "Bounced", tone: "critical" },
  suppressed: { label: "Suppressed", tone: "warning" },
  failed: { label: "Failed", tone: "critical" },
};

const DRAFT_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  pending_review: { label: "Looks like a booking", tone: "warning" },
  approved: { label: "Booking approved", tone: "positive" },
  rejected: { label: "Not a booking", tone: "neutral" },
};

const DIRECTIONS = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "received", label: "Received" },
] as const;

type Direction = (typeof DIRECTIONS)[number]["value"];

function when(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const rowClass =
  "-mx-3 flex gap-3 rounded-2xl px-3 py-4 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

function Row({ row, draft }: { row: MailActivityRow; draft?: AppointmentDraft }) {
  const status = STATUS_META[row.status] ?? STATUS_META["sent"]!;
  const Icon = row.direction === "sent" ? ArrowUpRight : ArrowDownLeft;
  const isIntake = row.kind === "Appointment Intake";
  const isReadiness = row.kind === "Readiness Check";
  const draftBadge = draft ? (DRAFT_BADGE[draft.status] ?? DRAFT_BADGE["pending_review"]!) : null;
  const [expanded, setExpanded] = useState(false);

  const body = (
    <>
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
        {isIntake || isReadiness ? (
          <CalendarClock className="h-4 w-4 text-accent-foreground" />
        ) : (
          <Icon className="h-4 w-4 text-accent-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{row.contactName ?? row.address}</span>
          {draftBadge && <Badge tone={draftBadge.tone}>{draftBadge.label}</Badge>}
          {isIntake && <Badge tone="accent">Appointment Intake</Badge>}
          {isReadiness && <Badge tone="accent">Readiness Check</Badge>}
          <Badge tone={status.tone}>{status.label}</Badge>
          {!row.contactId && <Badge tone="neutral">Unmatched</Badge>}
          <span className="text-xs text-muted-foreground">
            {row.kind} · {when(row.at)}
          </span>
        </p>
        <p className="mt-1 truncate text-sm">{row.subject ?? "(no subject)"}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {row.contactName ? `${row.address} · ` : ""}
          {row.preview}
        </p>
      </div>
      {draft && (
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      )}
    </>
  );

  // Received emails can be answered right here, without leaving the CRM.
  const inboundId = row.id.startsWith("inbound-") ? row.id.slice("inbound-".length) : null;
  const reply = inboundId ? <MailReplyComposer inboundEmailId={inboundId} /> : null;

  // Emails that scored as a likely booking request open in place for review.
  if (draft) {
    return (
      <li id={`draft-${draft.id}`} className="scroll-mt-24">
        <button type="button" onClick={() => setExpanded((v) => !v)} className={`${rowClass} w-full`} aria-expanded={expanded}>
          {body}
        </button>
        {expanded && (
          <div className="pb-4">
            <DraftReviewCard draft={draft} bare />
            {row.contactId && (
              <p className="mt-3 text-xs">
                <Link
                  to="/admin/crm/$contactId"
                  params={{ contactId: row.contactId }}
                  hash="activity"
                  className="text-muted-foreground underline decoration-gold/50 underline-offset-2 hover:text-foreground"
                >
                  View contact record
                </Link>
              </p>
            )}
          </div>
        )}
        {reply}
      </li>
    );
  }

  return (
    <li>
      {row.appointmentId ? (
        <div>
          <Link to="/admin" hash={`appt-${row.appointmentId}`} className={rowClass}>
            {body}
          </Link>
          {row.contactId && (
            <p className="-mt-2 mb-2 pl-11 text-xs">
              <Link
                to="/admin/crm/$contactId"
                params={{ contactId: row.contactId }}
                hash="activity"
                className="text-muted-foreground underline decoration-gold/50 underline-offset-2 hover:text-foreground"
              >
                View contact record
              </Link>
            </p>
          )}
        </div>
      ) : row.contactId ? (
        <Link
          to="/admin/crm/$contactId"
          params={{ contactId: row.contactId }}
          hash="activity"
          className={rowClass}
        >
          {body}
        </Link>
      ) : (
        <div className="-mx-3 flex gap-3 px-3 py-4">{body}</div>
      )}
      {reply}
    </li>
  );
}

function MailActivityPage() {
  const fetchRows = useServerFn(listMailActivity);
  const fetchDrafts = useServerFn(listAppointmentDrafts);
  const { data, isLoading } = useQuery({ queryKey: ["mail-activity"], queryFn: () => fetchRows({}) });
  const { data: draftData } = useQuery({ queryKey: ["appointment-drafts"], queryFn: () => fetchDrafts({}) });

  const [direction, setDirection] = useState<Direction>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = data?.rows ?? [];

  const draftsById = useMemo(() => {
    const map = new Map<string, AppointmentDraft>();
    for (const d of draftData?.drafts ?? []) map.set(d.id, d);
    return map;
  }, [draftData]);

  const visible = useMemo(() => {
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return rows.filter((r) => {
      if (direction !== "all" && r.direction !== direction) return false;
      const at = new Date(r.at).getTime();
      if (fromTime !== null && at < fromTime) return false;
      if (toTime !== null && at > toTime) return false;
      return true;
    });
  }, [rows, direction, from, to]);

  const counts = useMemo(
    () => ({
      sent: visible.filter((r) => r.direction === "sent").length,
      received: visible.filter((r) => r.direction === "received").length,
    }),
    [visible],
  );

  const pendingBookings = useMemo(
    () => (draftData?.drafts ?? []).filter((d) => d.status === "pending_review").length,
    [draftData],
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Work"
        title="Mail activity"
        intro="Every email the system sends and receives, in one place. Emails that look like booking requests can be reviewed and approved right here — nothing becomes a confirmed appointment until you approve it."
      />
      <AdminSection className="grid gap-6">
        {data?.forbidden ? (
          <Card>
            <p className="text-sm text-muted-foreground">You do not have access to mail activity.</p>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex flex-wrap items-end gap-5">
                <div>
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Direction
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DIRECTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDirection(d.value)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          direction === d.value
                            ? "border-gold/45 bg-gold/12 text-accent-foreground"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    From
                  </span>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="mt-2 h-10 rounded-full border border-border bg-background px-4 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    To
                  </span>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="mt-2 h-10 rounded-full border border-border bg-background px-4 text-sm"
                  />
                </label>
                {(from || to) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFrom("");
                      setTo("");
                    }}
                    className="text-sm text-accent-foreground underline-offset-4 hover:underline"
                  >
                    Clear dates
                  </button>
                )}
                <p className="ml-auto text-sm text-muted-foreground">
                  {counts.sent} sent · {counts.received} received
                  {pendingBookings > 0 ? ` · ${pendingBookings} awaiting review` : ""}
                </p>
              </div>
            </Card>

            <Card>
              {isLoading ? (
                <p className="text-sm text-muted-foreground" aria-busy="true">
                  Loading mail activity…
                </p>
              ) : visible.length === 0 ? (
                <div className="flex items-start gap-3">
                  <Mails className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    No email activity for these filters yet.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {visible.map((row) => (
                    <Row
                      key={row.id}
                      row={row}
                      {...(row.draftId && draftsById.get(row.draftId)
                        ? { draft: draftsById.get(row.draftId)! }
                        : {})}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </AdminSection>
    </>
  );
}
