import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, Check, Lock, Mail, MapPin, Phone, RotateCcw, Search, UserCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { QuoteRow } from "@/components/admin/QuoteRow";
import { Card, SectionLabel, CARD_CLASS } from "@/components/admin/ui/Card";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { Button, ButtonLink } from "@/components/admin/ui/Button";
import {
  assignNotary,
  getAppointments,
  setSmsDismissed,
  type Appointment,
  type NotaryOption,
  type ReferralContactOption,
} from "@/lib/admin.functions";
import { setAppointmentReferral } from "@/lib/crm.functions";

/**
 * Never surface raw provider/API error payloads in the UI. Log the technical
 * detail and show staff a short, actionable sentence instead.
 */
function friendlySmsError(raw: string | null): string {
  if (raw) console.warn("SMS delivery error (raw):", raw);
  const text = (raw ?? "").toLowerCase();
  if (text.includes("a2p") || text.includes("not approved") || text.includes("registration"))
    return "SMS delivery failed — check your carrier registration status.";
  if (text.includes("invalid") && text.includes("number"))
    return "SMS delivery failed — the phone number looks invalid.";
  if (text.includes("401") || text.includes("unauthorized") || text.includes("api key"))
    return "SMS delivery failed — the texting account needs to be reconnected.";
  return "SMS delivery failed — please follow up by phone.";
}

export const Route = createFileRoute("/admin/_protected/")({
  head: () => ({
    meta: [
      { title: "Appointments Admin | Enliven Notary" },
      { name: "description", content: "Private dashboard for reviewing Enliven Notary appointment requests." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Appointments Admin | Enliven Notary" },
      { property: "og:description", content: "Private appointment dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => getAppointments(),
  component: AdminPage,
  errorComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">
      Something went wrong loading appointments. Please refresh.
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">Page not found.</div>
  ),
});

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "SMS sent" },
  { value: "pending", label: "SMS pending" },
  { value: "failed", label: "SMS failed" },
  { value: "skipped", label: "SMS skipped" },
] as const;

function AdminPage() {
  const { forbidden, appointments, notaries, referralContacts } = Route.useLoaderData();
  const failedSms = appointments.filter((a) => a.sms_status === "failed");
  const [smsOpen, setSmsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const q = query.trim().toLowerCase();
  const visible = appointments
    .filter((a) => {
      if (statusFilter !== "all") {
        const status = a.sms_status || "pending";
        if (status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.phone ?? "").toLowerCase().includes(q) ||
        (a.email ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const da = new Date(a.submitted_at).getTime();
      const db = new Date(b.submitted_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });

  if (forbidden) {
    return (
      <>
        <AdminPageHeader
          eyebrow="Work"
          title={<>Access <span className="italic font-light text-gradient-gold">restricted.</span></>}
          intro="Appointment requests are available to Admin and Employee accounts."
        />
        <AdminSection>
          <Card className="max-w-md">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Your account does not have permission to view this page. Notary accounts see their assigned work on the
              dashboard.
            </p>
            <ButtonLink to="/admin/dashboard" variant="primary" className="mt-6">
              Go to dashboard
            </ButtonLink>
          </Card>
        </AdminSection>
      </>
    );
  }


  return (
    <>
      <AdminPageHeader
        eyebrow="Work"
        title={<>Appointment <span className="italic font-light text-gradient-gold">requests.</span></>}
        intro={`${appointments.length} request${appointments.length === 1 ? "" : "s"} received, newest first.`}
        actions={<SmsStatusButton failures={failedSms} open={smsOpen} onToggle={() => setSmsOpen((v) => !v)} />}
      />
      <AdminSection>
        <div>
          {smsOpen && (
            <div className="mb-8">
              <SmsDeliveryLog failures={failedSms} />
            </div>
          )}

          {appointments.length === 0 ? (
            <p className={`${CARD_CLASS} p-10 text-center text-muted-foreground`}>
              No requests yet. New submissions from the Book page will appear here.
            </p>
          ) : (
            <>
              <Card className="mb-6">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                  <div>
                    <SectionLabel className="mb-2">Search requests</SectionLabel>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Name, phone or email"
                        aria-label="Search requests by name, phone or email"
                        className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                      />
                    </div>
                  </div>
                  <div>
                    <SectionLabel className="mb-2">Status</SectionLabel>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      aria-label="Filter by status"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                    >
                      {STATUS_FILTERS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <SectionLabel className="mb-2">Sort</SectionLabel>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                      aria-label="Sort requests"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Showing {visible.length} of {appointments.length} request{appointments.length === 1 ? "" : "s"}.
                </p>
              </Card>

              {visible.length === 0 ? (
                <p className={`${CARD_CLASS} p-10 text-center text-muted-foreground`}>
                  No requests match your search or filter.
                </p>
              ) : (
                <div className="grid gap-6">
                  {visible.map((a) => (
                    <Card key={a.id}>
                      {/* Identity row: name largest at top-left, status badge top-right */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-2xl leading-tight tracking-tight">{a.name}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Requested {new Date(a.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <SmsBadge status={a.sms_status} />
                        </div>
                      </div>

                      {/* Secondary contact line */}
                      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <a
                          href={`tel:${a.phone}`}
                          aria-label={`Call ${a.name} at ${a.phone}`}
                          className="inline-flex items-center gap-1.5 hover:text-gold transition-colors"
                        >
                          <Phone className="h-4 w-4 text-gold" /> {a.phone}
                        </a>
                        <a
                          href={`mailto:${a.email}`}
                          aria-label={`Email ${a.name} at ${a.email}`}
                          className="inline-flex items-center gap-1.5 hover:text-gold transition-colors"
                        >
                          <Mail className="h-4 w-4 text-gold" /> {a.email}
                        </a>
                      </p>

                      {(a.sms_status === "sent" && a.sms_sent_at) || a.sms_error ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {a.sms_status === "sent" && a.sms_sent_at
                            ? `Text sent ${new Date(a.sms_sent_at).toLocaleString()}`
                            : friendlySmsError(a.sms_error)}
                        </p>
                      ) : null}

                      {/* Appointment details — visually separate block */}
                      <div className="mt-5 rounded-2xl border-t border-border bg-secondary/40 p-4">
                        <SectionLabel>Appointment details</SectionLabel>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <p className="font-medium text-foreground">{a.service}</p>
                          <p className="text-muted-foreground">
                            {new Date(`${a.preferred_date}T00:00:00`).toLocaleDateString(undefined, {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            · {a.preferred_time}
                          </p>
                          <p className="inline-flex items-center gap-2 text-muted-foreground sm:col-span-2">
                            {a.meeting_type === "online" ? (
                              <Video className="h-4 w-4 text-gold" />
                            ) : (
                              <MapPin className="h-4 w-4 text-gold" />
                            )}
                            {a.meeting_type === "online" ? "Online: secure video" : a.address || "Mobile: address TBC"}
                          </p>
                        </div>
                      </div>

                      {a.notes && (
                        <div className="mt-4">
                          <SectionLabel className="mb-2">Client note</SectionLabel>
                          <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground leading-relaxed">
                            {a.notes}
                          </p>
                        </div>
                      )}

                      {/* Internal workflow fields grouped together */}
                      <div className="mt-5 rounded-2xl border border-border p-4">
                        <SectionLabel>Internal workflow</SectionLabel>

                        <AssignRow appointmentId={a.id} assigned={a.assigned_notary_id} notaries={notaries} />

                        <ReferralRow
                          appointmentId={a.id}
                          referredBy={a.referred_by}
                          feeAmount={a.fee_amount}
                          contacts={referralContacts}
                        />

                        <QuoteRow appointmentId={a.id} clientEmail={a.email} />
                      </div>

                      <AppointmentAuditToggle appointmentId={a.id} />
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </AdminSection>
    </>
  );
}


function AssignRow({
  appointmentId,
  assigned,
  notaries,
}: {
  appointmentId: string;
  assigned: string | null;
  notaries: NotaryOption[];
}) {
  const save = useServerFn(assignNotary);
  const [value, setValue] = useState(assigned ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function onChange(next: string) {
    setValue(next);
    setStatus("saving");
    try {
      const res = await save({ data: { appointmentId, notaryId: next || null } });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <label htmlFor={`assign-${appointmentId}`} className="inline-flex items-center gap-2 text-muted-foreground">
        <UserCheck className="h-4 w-4 text-gold" /> Assigned notary
      </label>
      <select
        id={`assign-${appointmentId}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        <option value="">Unassigned</option>
        {notaries.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name} ({n.email})
          </option>
        ))}
      </select>
      {status === "saving" && <span className="text-xs text-muted-foreground">Saving…</span>}
      {status === "saved" && <span className="text-xs text-muted-foreground">Saved</span>}
      {status === "error" && <span className="text-xs text-destructive">Could not save</span>}
      {notaries.length === 0 && (
        <span className="text-xs text-muted-foreground">No notary accounts yet — add one from the dashboard.</span>
      )}
    </div>
  );
}

function SmsStatusButton({
  failures,
  open,
  onToggle,
}: {
  failures: Appointment[];
  open: boolean;
  onToggle: () => void;
}) {
  const active = failures.filter((a) => !a.sms_dismissed_at).length;
  return (
    <Button
      type="button"
      variant={active > 0 ? "destructive" : "secondary"}
      size="sm"
      onClick={onToggle}
      aria-expanded={open}
      title="Text message delivery log"
    >
      {active > 0 ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4 text-gold" />}
      SMS log
      {active > 0 && <Badge tone="critical">{active}</Badge>}
    </Button>
  );
}

function SmsDeliveryLog({ failures }: { failures: Appointment[] }) {

  const dismiss = useServerFn(setSmsDismissed);
  const router = useRouter();
  const [showDismissed, setShowDismissed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const active = failures.filter((a) => !a.sms_dismissed_at);
  const dismissed = failures.filter((a) => a.sms_dismissed_at);

  async function toggle(id: string, next: boolean) {
    setBusy(id);
    try {
      const res = await dismiss({ data: { appointmentId: id, dismissed: next } });
      if (res.ok) {
        toast.success(next ? "Entry dismissed." : "Entry restored.");
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Could not update the delivery log.");
    } finally {
      setBusy(null);
    }
  }

  if (active.length === 0 && dismissed.length === 0)
    return (
      <Card className="bg-card/40 text-sm text-muted-foreground">
        No text message delivery failures recorded — all clear.
      </Card>
    );


  const Entry = ({ a, isDismissed }: { a: Appointment; isDismissed: boolean }) => (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">
          {a.name} · {a.phone}
        </span>
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {new Date(a.submitted_at).toLocaleString()}
        </span>
      </div>
      <p className={`mt-2 text-xs ${isDismissed ? "text-muted-foreground" : "text-destructive"}`}>
        {friendlySmsError(a.sms_error)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => toggle(a.id, !isDismissed)}
          disabled={busy === a.id}
        >
          {isDismissed ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {isDismissed ? "Restore" : "Dismiss"}
        </Button>
        {isDismissed && a.sms_dismissed_at && (
          <span className="text-xs text-muted-foreground">
            Dismissed {new Date(a.sms_dismissed_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </li>
  );

  return (
    <Card
      className={
        active.length > 0 ? "border-destructive/40 bg-destructive/5" : "bg-card/40"
      }
    >
      <h2
        className={`inline-flex items-center gap-2 font-display text-xl tracking-tight ${
          active.length > 0 ? "text-destructive" : "text-foreground"
        }`}
      >
        <AlertTriangle className="h-5 w-5" /> SMS delivery log:{" "}
        {active.length > 0
          ? `${active.length} open failure${active.length === 1 ? "" : "s"}`
          : "all clear"}
      </h2>

      {active.length > 0 && (
        <ul className="mt-4 grid gap-3 text-sm">
          {active.map((a) => (
            <Entry key={a.id} a={a} isDismissed={false} />
          ))}
        </ul>
      )}

      {dismissed.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowDismissed((v) => !v)}
            className="text-xs uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {showDismissed ? "Hide" : "Show"} dismissed history ({dismissed.length})
          </button>
          {showDismissed && (
            <ul className="mt-4 grid gap-3 text-sm">
              {dismissed.map((a) => (
                <Entry key={a.id} a={a} isDismissed />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function SmsBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: BadgeTone }> = {
    sent: { label: "SMS sent", tone: "accent" },
    failed: { label: "SMS failed", tone: "critical" },
    skipped: { label: "SMS skipped", tone: "neutral" },
    pending: { label: "SMS pending", tone: "neutral" },
  };
  const s = map[status] ?? map["pending"]!;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function ReferralRow({
  appointmentId,
  referredBy,
  feeAmount,
  contacts,
}: {
  appointmentId: string;
  referredBy: string | null;
  feeAmount: number | null;
  contacts: ReferralContactOption[];
}) {
  const save = useServerFn(setAppointmentReferral);
  const [contactId, setContactId] = useState(referredBy ?? "");
  const [amount, setAmount] = useState(feeAmount === null ? "" : String(feeAmount));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function commit(nextContact: string, nextAmount: string) {
    setStatus("saving");
    try {
      const res = await save({
        data: { appointmentId, contactId: nextContact || null, feeAmount: nextAmount === "" ? null : nextAmount },
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm">
      <label htmlFor={`referral-${appointmentId}`} className="text-muted-foreground">
        Referred by
      </label>
      <select
        id={`referral-${appointmentId}`}
        value={contactId}
        onChange={(e) => {
          setContactId(e.target.value);
          void commit(e.target.value, amount);
        }}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        <option value="">No referral source</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.business_name}
          </option>
        ))}
      </select>
      <label htmlFor={`fee-${appointmentId}`} className="text-muted-foreground">
        Job amount ($)
      </label>
      <input
        id={`fee-${appointmentId}`}
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={() => void commit(contactId, amount)}
        className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      />
      {status === "saving" && <span className="text-xs text-muted-foreground">Saving…</span>}
      {status === "saved" && <span className="text-xs text-muted-foreground">Saved</span>}
      {status === "error" && <span className="text-xs text-destructive">Could not save</span>}
      {contacts.length === 0 && (
        <span className="text-xs text-muted-foreground">No CRM contacts yet.</span>
      )}
    </div>
  );
}

function AppointmentAuditToggle({ appointmentId }: { appointmentId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 text-sm font-medium text-accent-foreground underline underline-offset-4"
      >
        {open ? "Hide change history" : "View change history"}
      </button>
      {open && (
        <div className="mt-4">
          <AuditTrail table="appointments" recordId={appointmentId} />
        </div>
      )}
    </div>
  );
}
