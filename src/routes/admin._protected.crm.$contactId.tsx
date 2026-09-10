import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,

  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { CustomFieldsPanel } from "@/components/admin/CustomFields";
import { MailReplyComposer } from "@/components/admin/MailReplyComposer";
import { Card, CardHeader, SectionLabel } from "@/components/admin/ui/Card";
import { Badge } from "@/components/admin/ui/Badge";
import { Button, ButtonLink, buttonClass } from "@/components/admin/ui/Button";
import { stageColor, useCrmOptions } from "@/hooks/useCrmOptions";
import { useQuery } from "@tanstack/react-query";
import {
  ACTIVITY_TYPES,
  addContactActivity,
  deleteBusinessContact,
  getBusinessContact,
  patchBusinessContact,
  setPipelineStage,
  type PatchableField,
} from "@/lib/crm.functions";
import { deleteContactHistoryEntry, updateContactHistoryEntry } from "@/lib/contact-history.functions";
import { getMyRole } from "@/lib/users.functions";
import { buildFallbackOutreachEmail, generateOutreachEmail, sendOutreachEmail } from "@/lib/outreach.functions";
import { SEND_PROFILE_LIST, type SendProfileId } from "@/lib/send-profiles";
import { rateLabel, usd, type ReferralRateType } from "@/lib/business-profile";

export const Route = createFileRoute("/admin/_protected/crm/$contactId")({
  head: () => ({
    meta: [
      { title: "Contact History | Enliven Notary" },
      { name: "description", content: "Private activity history for an Enliven Notary referral contact." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Contact History | Enliven Notary" },
      { property: "og:description", content: "Private referral contact history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => getBusinessContact({ data: { id: params.contactId } }),
  component: ContactDetailPage,
  pendingComponent: () => (
    <div className="px-4 py-10 md:px-8" aria-busy="true" aria-label="Loading contact">
      <div className="h-8 w-72 animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded-3xl bg-muted" />
        ))}
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">
      Something went wrong loading this contact. Please refresh.
    </div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Contact not found.</div>,
});

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60";

function QuickAddActivity({ contactId, onLogged }: { contactId: string; onLogged?: () => void }) {
  const logActivity = useServerFn(addContactActivity);
  const router = useRouter();
  const [type, setType] = useState<string>("Call");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  function flash(next: { tone: "ok" | "error"; message: string }) {
    setStatus(next);
    if (next.tone === "ok") {
      window.setTimeout(() => setStatus(null), 2500);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await logActivity({
        data: {
          contactId,
          date: new Date().toISOString().slice(0, 10),
          type,
          description: note.trim(),
        },
      });
      if (res.ok) {
        setNote("");
        toast.success("Activity logged");
        flash({ tone: "ok", message: "Activity logged" });
        onLogged?.();
        await router.invalidate();
      } else {
        toast.error(res.message);
        flash({ tone: "error", message: res.message });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not log that activity.";
      toast.error(message);
      flash({ tone: "error", message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex flex-wrap items-center gap-2 rounded-3xl border border-border bg-card p-3 shadow-[0_1px_0_var(--color-border)]"
      >
        <label htmlFor="quick_type" className="sr-only">
          Activity type
        </label>
        <select
          id="quick_type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-10 rounded-full border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label htmlFor="quick_note" className="sr-only">
          Quick note
        </label>
        <input
          id="quick_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Log an activity — quick note"
          className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
        />
        <Button type="submit" size="sm" disabled={saving || !note.trim()}>
          {saving ? "Saving…" : "Log"}
        </Button>
      </form>
      <div aria-live="polite" className="min-h-[1.25rem]">
        {status && (
          <p
            className={`mt-2 px-3 text-xs ${
              status.tone === "ok" ? "text-accent-foreground" : "text-destructive"
            }`}
          >
            {status.tone === "ok" ? "✓ " : ""}
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}


type HistoryActivity = {
  id: string;
  activity_date: string;
  activity_type: string;
  description: string;
};

/** One entry in the interaction log. Admins additionally get edit/delete controls. */
function HistoryEntry({
  activity,
  canManage,
  highlighted,
}: {
  activity: HistoryActivity;
  canManage: boolean;
  highlighted: boolean;
}) {
  const router = useRouter();
  const saveEntry = useServerFn(updateContactHistoryEntry);
  const removeEntry = useServerFn(deleteContactHistoryEntry);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(activity.activity_type);
  const [date, setDate] = useState(activity.activity_date);
  const [description, setDescription] = useState(activity.description);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await saveEntry({ data: { id: activity.id, type, date, description } });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      await router.invalidate();
      setEditing(false);
      toast.success("History entry updated");
    } catch {
      setError("Could not save that change.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm("Delete this history entry? This is recorded in the change history.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await removeEntry({ data: { id: activity.id } });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      await router.invalidate();
      toast.success("History entry deleted");
    } catch {
      setError("Could not delete that entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={`group relative pb-8 last:pb-0 ${
        highlighted
          ? "-mx-3 rounded-2xl bg-[var(--gold)]/12 px-3 pt-3 ring-1 ring-gold/40 transition-colors"
          : "transition-colors"
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full border-2 border-card bg-[var(--gold)]"
      />
      {editing ? (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          <div className="flex gap-2 sm:justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            className={`sm:col-span-3 ${inputClass}`}
          />
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Badge tone="accent">{activity.activity_type}</Badge>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date(`${activity.activity_date}T00:00:00`).toLocaleDateString()}
              </span>
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    aria-label="Edit history entry"
                    title="Edit history entry"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    aria-label="Delete history entry"
                    title="Delete history entry"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <ActivityBody description={activity.description} />
        </>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </li>
  );
}

function ContactDetailPage() {

  const { contactTypes, pipelineStages } = useCrmOptions();
  const { contact, activities, appointments, referralCount, referralValue, commission } = Route.useLoaderData();
  const router = useRouter();
  const logActivity = useServerFn(addContactActivity);
  const removeContact = useServerFn(deleteBusinessContact);
  const fetchRole = useServerFn(getMyRole);
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole({}) });
  const isAdmin = me?.isAdmin ?? false;
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<"Overview" | "Referrals" | "Activity">("Overview");
  const [composeSignal, setComposeSignal] = useState(0);
  const composeRef = useRef<HTMLDivElement | null>(null);

  function openCompose() {
    setTab("Activity");
    setComposeSignal((n) => n + 1);
    setTimeout(() => composeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }
  // Links from Mail Activity land straight on the Activity tab.
  useEffect(() => {
    if (window.location.hash.replace("#", "").toLowerCase() === "activity") setTab("Activity");
  }, []);
  const [showAudit, setShowAudit] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const pendingHighlight = useRef(false);
  const knownActivityIds = useRef<Set<string>>(new Set());

  function flagLatestActivity() {
    knownActivityIds.current = new Set(activities.map((a) => a.id));
    pendingHighlight.current = true;
  }

  useEffect(() => {
    if (!pendingHighlight.current) return;
    const added = activities.find((a) => !knownActivityIds.current.has(a.id));
    if (!added) return;
    pendingHighlight.current = false;
    knownActivityIds.current = new Set(activities.map((a) => a.id));
    setHighlightId(added.id);
    const timer = window.setTimeout(() => setHighlightId(null), 3500);
    return () => window.clearTimeout(timer);
  }, [activities]);



  if (!contact) {
    return (
      <div className="px-8 py-24 text-center text-muted-foreground">
        That contact no longer exists.{" "}
        <Link to="/admin/crm" className="text-accent-foreground underline underline-offset-4">
          Back to pipeline
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      const res = await logActivity({
        data: {
          contactId: contact!.id,
          date: String(fd.get("activity_date") ?? ""),
          type: String(fd.get("activity_type") ?? "Note"),
          description: String(fd.get("description") ?? ""),
        },
      });
      if (res.ok) {
        form.reset();
        toast.success("Activity added to the history.");
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log that activity.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    try {
      const res = await removeContact({ data: { id: contact!.id } });
      if (res.ok) {
        toast.success(`${contact!.business_name} was deleted.`);
        await router.navigate({ to: "/admin/crm" });
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that contact.");
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow={contact.contact_type}
        title={<>{contact.business_name}</>}
        intro={
          contact.contact_person ? `Primary contact: ${contact.contact_person}` : "Referral relationship history."
        }
        actions={
          <>
            <ButtonLink to="/admin/crm" variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Pipeline
            </ButtonLink>
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <AdminSection>
        <div className="max-w-3xl">
          <QuickAddActivity contactId={contact.id} onLogged={flagLatestActivity} />

          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Contact sections">
            {(["Overview", "Referrals", "Activity"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? buttonClass("primary", "sm")
                    : buttonClass("secondary", "sm")
                }
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Overview" && (
          <Card className="mt-6">
            <CardHeader title="Details" />
            <p className="mt-2 text-sm text-muted-foreground">
              Click any value to edit it. Changes save as soon as you confirm.
            </p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <InlineField id={contact.id} field="business_name" label="Business" value={contact.business_name} />
              <InlineField id={contact.id} field="contact_person" label="Contact person" value={contact.contact_person} />
              <InlineField
                id={contact.id}
                field="contact_type"
                label="Contact type"
                value={contact.contact_type}
                options={contactTypes}
              />
              <InlineField
                id={contact.id}
                field="pipeline_stage"
                label="Pipeline stage"
                value={contact.pipeline_stage}
                options={pipelineStages}
                swatch
              />
              <InlineField id={contact.id} field="phone" label="Phone" value={contact.phone} type="tel" />
              <InlineField id={contact.id} field="email" label="Email" value={contact.email} type="email" />
              <InlineField
                id={contact.id}
                field="first_contacted_date"
                label="First contacted"
                value={contact.first_contacted_date}
                type="date"
              />
              <InlineField
                id={contact.id}
                field="next_follow_up_date"
                label="Next follow-up"
                value={contact.next_follow_up_date}
                type="date"
              />
              <div className="sm:col-span-2">
                <InlineField
                  id={contact.id}
                  field="referral_source"
                  label="Found via"
                  value={contact.referral_source}
                />
              </div>
            </dl>

            <CustomFieldsPanel contactId={contact.id} values={contact.custom_fields ?? {}} />

            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 hover:text-foreground">
                  <Phone className="h-4 w-4 text-accent-foreground" /> Call
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-4 w-4 text-accent-foreground" /> Email
                </a>
              )}
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-accent-foreground" /> {referralCount} job
                {referralCount === 1 ? "" : "s"} referred ·{" "}
                <span className="text-foreground">
                  {referralValue.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </span>
              </span>
            </div>
          </Card>
          )}

          {tab === "Referrals" && (
          <>
          <Card className="mt-6">
            <CardHeader title="Referral commission" />
            <p className="mt-2 text-sm text-muted-foreground">An estimate only — nothing is paid out from here.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-5">
                <SectionLabel>Referred value</SectionLabel>
                <p className="mt-1.5 font-display text-2xl tracking-tight">{usd(referralValue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {referralCount} job{referralCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-5">
                <SectionLabel>Estimated commission owed</SectionLabel>
                <p className="mt-1.5 font-display text-2xl tracking-tight text-accent-foreground">
                  {usd(commission.amount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rateLabel(commission.rate, commission.rateType)}
                  {commission.usesOverride ? " (custom rate)" : " (business default)"}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <div>
                <dt><SectionLabel>Custom rate format</SectionLabel></dt>
                <dd className="mt-1.5">
                  <RateTypeSelect
                    id={contact.id}
                    value={contact.referral_rate_type}
                    defaultType={commission.defaultRateType}
                  />
                </dd>
              </div>
              <InlineField
                id={contact.id}
                field="referral_rate"
                label="Custom rate (blank uses default)"
                value={contact.referral_rate === null ? null : String(contact.referral_rate)}
              />
            </dl>
          </Card>

          <Card className="mt-6">
            <CardHeader
              title="Referred appointments"
              meta={<span className="text-sm text-muted-foreground">({referralCount})</span>}
            />
            {appointments.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No appointments are linked to this contact yet. Link a booking to this contact from the appointments
                list and it will be counted here automatically.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 text-sm">
                {appointments.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0"
                  >
                    <span>
                      {a.name} — <span className="text-muted-foreground">{a.service}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(`${a.preferred_date}T00:00:00`).toLocaleDateString()} ·{" "}
                      <span className="text-foreground">
                        {a.fee_amount === null
                          ? "no amount"
                          : a.fee_amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          </>
          )}

          {tab === "Activity" && (
          <>
          <Card>
            <CardHeader title="Compose email" icon={Mail} />
            <p className="mt-2 text-sm text-muted-foreground">
              Write and send an email to {contact.business_name} yourself. AI help is optional — nothing sends until you
              press Send.
            </p>
            <div className="mt-5">
              <MailReplyComposer
                contactId={contact.id}
                contactEmail={contact.email}
                businessName={contact.business_name}
                onSent={() => router.invalidate()}
              />
            </div>
          </Card>

          <OutreachPanel
            contactId={contact.id}
            businessName={contact.business_name}
            email={contact.email}
            stage={contact.pipeline_stage}
          />

          <Card className="mt-6">
            <CardHeader title="Log an activity" icon={MessageSquare} />
            <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="activity_date" className="text-sm font-medium">
                  Date
                </label>
                <input
                  id="activity_date"
                  name="activity_date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={`mt-2 ${inputClass}`}
                />
              </div>
              <div>
                <label htmlFor="activity_type" className="text-sm font-medium">
                  Type
                </label>
                <select id="activity_type" name="activity_type" defaultValue="Call" className={`mt-2 ${inputClass}`}>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="description" className="text-sm font-medium">
                  What happened
                </label>
                <textarea id="description" name="description" required rows={4} className={`mt-2 ${inputClass}`} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Add to history"}
                </Button>
              </div>
            </form>
          </Card>

          <div className="mt-10">
            <CardHeader
              title="History"
              meta={<span className="text-sm text-muted-foreground">({activities.length})</span>}
            />
          </div>
          {activities.length === 0 ? (
            <p className="mt-4 rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              Nothing logged yet. Add the first call, email, or meeting above.
            </p>
          ) : (
            <ol className="mt-6 relative border-l border-border pl-6">
              {activities.map((a) => (
                <HistoryEntry key={a.id} activity={a} canManage={isAdmin} highlighted={highlightId === a.id} />
              ))}

            </ol>
          )}

          <div className="mt-10 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowAudit((v) => !v)}
              aria-expanded={showAudit}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              {showAudit ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {showAudit ? "Hide change history" : "View change history"}
            </button>
            {showAudit && (
              <div className="mt-4">
                <AuditTrail table="business_contacts" recordId={contact.id} emphasis="subordinate" />
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </AdminSection>


      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${contact.business_name}?`}
          body="This removes the contact and its activity history. Appointments stay, but they will no longer be linked to this referral source. This cannot be undone."
          confirmLabel="Delete contact"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            void onDelete();
          }}
        />
      )}
    </>
  );
}

function RateTypeSelect({
  id,
  value,
  defaultType,
}: {
  id: string;
  value: ReferralRateType | null;
  defaultType: ReferralRateType;
}) {
  const patch = useServerFn(patchBusinessContact);
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    setSaving(true);
    try {
      const res = await patch({ data: { id, field: "referral_rate_type", value: next || null } });
      if (res.ok) {
        toast.success("Rate format updated.");
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that change.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      aria-label="Custom rate format"
      value={value ?? ""}
      disabled={saving}
      onChange={(e) => void save(e.target.value)}
      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
    >
      <option value="">
        Use business default ({defaultType === "percent" ? "percentage" : "flat amount"})
      </option>
      <option value="percent">Percentage of referred value</option>
      <option value="flat">Flat amount per job</option>
    </select>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/60 p-4">
      <Card className="w-full max-w-md p-6 shadow-xl">
        <div role="dialog" aria-modal="true" aria-label={title}>
          <h2 className="font-display text-xl tracking-tight">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={buttonClass("destructive")}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function InlineField({
  id,
  field,
  label,
  value,
  type = "text",
  options,
  swatch,
}: {
  id: string;
  field: PatchableField;
  label: string;
  value: string | null;
  type?: "text" | "tel" | "email" | "date";
  options?: readonly string[];
  swatch?: boolean;
}) {
  const patch = useServerFn(patchBusinessContact);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  async function save(next: string) {
    setSaving(true);
    try {
      const res = await patch({ data: { id, field, value: next } });
      if (res.ok) {
        setEditing(false);
        toast.success(`${label} updated.`);
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that change.");
    } finally {
      setSaving(false);
    }
  }

  const { pipelineStages } = useCrmOptions();
  const display =
    type === "date" && value ? new Date(`${value}T00:00:00`).toLocaleDateString() : value || "Not set";

  if (options) {
    return (
      <div>
        <dt><SectionLabel>{label}</SectionLabel></dt>
        <dd className="mt-1.5 flex items-center gap-2">
          {swatch && (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: stageColor(value ?? "", pipelineStages) }}
            />
          )}
          <select
            aria-label={label}
            value={value ?? ""}
            disabled={saving}
            onChange={(e) => void save(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </dd>
      </div>
    );
  }

  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              aria-label={label}
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save(draft);
                if (e.key === "Escape") {
                  setDraft(value ?? "");
                  setEditing(false);
                }
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={`Save ${label}`}
              disabled={saving}
              onClick={() => void save(draft)}
              className="!px-0 h-9 w-9"
            >
              <Check className="h-4 w-4 text-accent-foreground" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={`Cancel editing ${label}`}
              onClick={() => {
                setDraft(value ?? "");
                setEditing(false);
              }}
              className="!px-0 h-9 w-9"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group inline-flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm hover:border-border hover:bg-secondary/60"
          >
            <span className={value ? "break-all" : "text-muted-foreground"}>{display}</span>
            <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="sr-only">Edit {label}</span>
          </button>
        )}
      </dd>
    </div>
  );
}

function OutreachPanel({
  contactId,
  businessName,
  email,
  stage,
}: {
  contactId: string;
  businessName: string;
  email: string | null;
  stage: string;
}) {
  const router = useRouter();
  const generate = useServerFn(generateOutreachEmail);
  const buildFallback = useServerFn(buildFallbackOutreachEmail);
  const send = useServerFn(sendOutreachEmail);
  const saveStage = useServerFn(setPipelineStage);

  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [askStage, setAskStage] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [sendProfile, setSendProfile] = useState<SendProfileId>("outreach");

  async function onGenerate() {
    setDrafting(true);
    setNeedsKey(false);
    try {
      const res = await generate({ data: { contactId, extraInstructions } });
      if (res.ok) {
        setSubject(res.subject);
        setBody(res.body);
        setHasDraft(true);
        toast.success("Draft ready — review before sending.");
      } else {
        if ("missingKey" in res && res.missingKey) setNeedsKey(true);
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not write a draft.");
    } finally {
      setDrafting(false);
    }
  }

  async function onFallback() {
    setDrafting(true);
    try {
      const res = await buildFallback({ data: { contactId } });
      if (res.ok) {
        setSubject(res.subject);
        setBody(res.body);
        setHasDraft(true);
        toast.success("Fallback template ready — edit anything before sending.");
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the fallback template.");
    } finally {
      setDrafting(false);
    }
  }

  async function onSend() {
    setSending(true);
    try {
      const res = await send({ data: { contactId, subject, body, sendProfile } });
      if (res.ok) {
        toast.success(`Sent to ${res.sentTo} and added to this contact's history.`);
        setHasDraft(false);
        setSubject("");
        setBody("");
        if (stage !== "Contacted") setAskStage(true);
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send that email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader title="Outreach email" icon={Sparkles} />
      <p className="mt-2 text-sm text-muted-foreground">
        Write a personalized introduction for {businessName} using what&rsquo;s on file here. Nothing sends until you
        review the draft and press Send.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void onGenerate()} disabled={drafting}>
          {drafting ? "Writing…" : hasDraft ? "Write a new draft" : "Generate Outreach Email"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void onFallback()} disabled={drafting}>
          Use Fallback Template
        </Button>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowExtra((v) => !v)}
          aria-expanded={showExtra}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          {showExtra ? "Hide extra instructions" : "Add specific instructions for this email (optional)"}
        </button>
        {showExtra && (
          <div className="mt-3">
            <label htmlFor="outreach_extra" className="text-sm font-medium">
              Specific instructions for this email
            </label>
            <textarea
              id="outreach_extra"
              rows={3}
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              placeholder="Mention that we specialize in same-day appointments."
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Used for this one draft only — nothing is saved and no other email is affected.
            </p>
          </div>
        )}
      </div>

      {needsKey && (
        <p className="mt-4 text-sm text-destructive">
          The Claude key is missing. Add a secret named ANTHROPIC_API_KEY, then try again.
        </p>
      )}

      {askStage && (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-accent/40 p-4 text-sm">
          <p>Move {businessName} to the &ldquo;Contacted&rdquo; stage?</p>
          <div className="mt-3 flex gap-3">
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                await saveStage({ data: { id: contactId, stage: "Contacted" } });
                setAskStage(false);
                toast.success("Stage updated to Contacted.");
                await router.invalidate();
              }}
            >
              Yes, update stage
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setAskStage(false)}>
              Keep as {stage}
            </Button>
          </div>
        </div>
      )}

      {hasDraft && (
        <div className="mt-6 grid gap-5">
          <div>
            <label htmlFor="outreach_subject" className="text-sm font-medium">
              Subject
            </label>
            <input
              id="outreach_subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`mt-2 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="outreach_send_profile" className="text-sm font-medium">
              Send from
            </label>
            <select
              id="outreach_send_profile"
              value={sendProfile}
              onChange={(e) => setSendProfile(e.target.value as SendProfileId)}
              className={`mt-2 ${inputClass}`}
            >
              {SEND_PROFILE_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="outreach_body" className="text-sm font-medium">
              Email draft (edit freely)
            </label>
            <textarea
              id="outreach_body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className={`mt-2 ${inputClass}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void onSend()} disabled={sending || !email}>
              {sending ? "Sending…" : "Send Email"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {email ? `Goes to ${email}` : "No email address on file for this contact."}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Splits a logged email into a labelled subject line and its body paragraph. */
function ActivityBody({ description }: { description: string }) {
  const text = description ?? "";
  const match = text.match(/^(Subject:\s*(.+)|Reply received:\s*(.+))\n+([\s\S]+)$/);
  if (match) {
    const subject = (match[2] ?? match[3] ?? "").trim();
    const body = match[4]?.trim() ?? "";
    const isReply = text.startsWith("Reply received:");
    return (
      <div className="mt-2 text-sm leading-relaxed">
        <p>
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {isReply ? "Reply · Subject" : "Subject"}
          </span>
          <br />
          <span className="font-medium">{subject}</span>
        </p>
        {isReply && body && (
          <p className="mt-3 whitespace-pre-line border-t border-border pt-3">{body}</p>
        )}
      </div>
    );
  }
  return <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{text}</p>;
}
