import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, Check, Lock, Mail, MapPin, Phone, RotateCcw, UserCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { QuoteRow } from "@/components/admin/QuoteRow";
import { Card, CardHeader, CARD_CLASS } from "@/components/admin/ui/Card";
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

function AdminPage() {
  const { forbidden, appointments, notaries, referralContacts } = Route.useLoaderData();
  const failedSms = appointments.filter((a) => a.sms_status === "failed");
  const [smsOpen, setSmsOpen] = useState(false);


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

            <div className="grid gap-6">

              {appointments.map((a) => (
                <Card key={a.id}>
                  <CardHeader
                    title={a.name}
                    meta={
                      <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {new Date(a.submitted_at).toLocaleString()}
                      </span>
                    }
                  />

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-medium">{a.service}</span>
                    </p>
                    <p className="inline-flex items-center gap-2 text-muted-foreground">
                      {a.meeting_type === "online" ? <Video className="h-4 w-4 text-gold" /> : <MapPin className="h-4 w-4 text-gold" />}
                      {a.meeting_type === "online" ? "Online: secure video" : a.address || "Mobile: address TBC"}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(`${a.preferred_date}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      · {a.preferred_time}
                    </p>
                    <p className="flex flex-wrap items-center gap-4">
                      <a href={`tel:${a.phone}`} aria-label={`Call ${a.name} at ${a.phone}`} className="inline-flex items-center gap-1.5 hover:text-gold transition-colors">
                        <Phone className="h-4 w-4 text-gold" /> {a.phone}
                      </a>
                      <a href={`mailto:${a.email}`} aria-label={`Email ${a.name} at ${a.email}`} className="inline-flex items-center gap-1.5 hover:text-gold transition-colors">
                        <Mail className="h-4 w-4 text-gold" /> {a.email}
                      </a>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <SmsBadge status={a.sms_status} />
                    {a.sms_status === "sent" && a.sms_sent_at && (
                      <span className="text-muted-foreground">
                        Sent {new Date(a.sms_sent_at).toLocaleString()}
                      </span>
                    )}
                    {a.sms_error && (
                      <span className="text-muted-foreground">{friendlySmsError(a.sms_error)}</span>
                    )}
                  </div>

                  <AssignRow appointmentId={a.id} assigned={a.assigned_notary_id} notaries={notaries} />

                  <ReferralRow
                    appointmentId={a.id}
                    referredBy={a.referred_by}
                    feeAmount={a.fee_amount}
                    contacts={referralContacts}
                  />

                  <QuoteRow appointmentId={a.id} />


                  {a.notes && (
                    <p className="mt-4 rounded-xl border border-border p-4 text-sm text-muted-foreground leading-relaxed">
                      {a.notes}
                    </p>
                  )}

                  <AppointmentAuditToggle appointmentId={a.id} />
                </Card>

              ))}
            </div>
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
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm">
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
