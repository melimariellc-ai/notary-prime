import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Check,
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
import { STAGE_COLORS } from "@/components/admin/CrmOverview";
import {
  ACTIVITY_TYPES,
  CONTACT_TYPES,
  PIPELINE_STAGES,
  addContactActivity,
  deleteBusinessContact,
  getBusinessContact,
  patchBusinessContact,
  setPipelineStage,
  type PatchableField,
} from "@/lib/crm.functions";
import { generateOutreachEmail, sendOutreachEmail } from "@/lib/outreach.functions";

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

function ContactDetailPage() {
  const { contact, activities, appointments, referralCount, referralValue } = Route.useLoaderData();
  const router = useRouter();
  const logActivity = useServerFn(addContactActivity);
  const removeContact = useServerFn(deleteBusinessContact);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
            <Link
              to="/admin/crm"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4" /> Pipeline
            </Link>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/50 px-5 py-2.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </>
        }
      />

      <AdminSection>
        <div className="max-w-3xl">
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl tracking-tight">Details</h2>
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
                options={CONTACT_TYPES as readonly string[]}
              />
              <InlineField
                id={contact.id}
                field="pipeline_stage"
                label="Pipeline stage"
                value={contact.pipeline_stage}
                options={PIPELINE_STAGES as readonly string[]}
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
          </div>

          <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl tracking-tight">
              Referred appointments <span className="text-sm text-muted-foreground">({referralCount})</span>
            </h2>
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
          </div>

          <OutreachPanel
            contactId={contact.id}
            businessName={contact.business_name}
            email={contact.email}
            stage={contact.pipeline_stage}
          />

          <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
              <MessageSquare className="h-5 w-5 text-accent-foreground" /> Log an activity
            </h2>
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
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-gold rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Add to history"}
                </button>
              </div>
            </form>
          </div>

          <h2 className="mt-10 font-display text-2xl tracking-tight">
            History <span className="text-sm text-muted-foreground">({activities.length})</span>
          </h2>
          {activities.length === 0 ? (
            <p className="mt-4 rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              Nothing logged yet. Add the first call, email, or meeting above.
            </p>
          ) : (
            <ol className="mt-6 relative border-l border-border pl-6">
              {activities.map((a) => (
                <li key={a.id} className="relative pb-8 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full border-2 border-card bg-[var(--gold)]"
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-accent-foreground">
                      {a.activity_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(`${a.activity_date}T00:00:00`).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{a.description}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-12">
            <AuditTrail table="business_contacts" recordId={contact.id} />
          </div>
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
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl"
      >
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-full border border-border px-5 py-2.5 text-sm">
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
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

  const display =
    type === "date" && value ? new Date(`${value}T00:00:00`).toLocaleDateString() : value || "Not set";

  if (options) {
    return (
      <div>
        <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
        <dd className="mt-1.5 flex items-center gap-2">
          {swatch && (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STAGE_COLORS[value ?? ""] }}
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
            <button
              type="button"
              aria-label={`Save ${label}`}
              disabled={saving}
              onClick={() => void save(draft)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border hover:bg-secondary"
            >
              <Check className="h-4 w-4 text-accent-foreground" />
            </button>
            <button
              type="button"
              aria-label={`Cancel editing ${label}`}
              onClick={() => {
                setDraft(value ?? "");
                setEditing(false);
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
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
  const send = useServerFn(sendOutreachEmail);
  const saveStage = useServerFn(setPipelineStage);

  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [askStage, setAskStage] = useState(false);

  async function onGenerate() {
    setDrafting(true);
    setNeedsKey(false);
    try {
      const res = await generate({ data: { contactId } });
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

  async function onSend() {
    setSending(true);
    try {
      const res = await send({ data: { contactId, subject, body } });
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
    <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8">
      <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
        <Sparkles className="h-5 w-5 text-accent-foreground" /> Outreach email
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Write a personalized introduction for {businessName} using what&rsquo;s on file here. Nothing sends until you
        review the draft and press Send.
      </p>

      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={drafting}
        className="btn-gold mt-5 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
      >
        {drafting ? "Writing…" : hasDraft ? "Write a new draft" : "Generate Outreach Email"}
      </button>

      {needsKey && (
        <p className="mt-4 text-sm text-destructive">
          The Claude key is missing. Add a secret named ANTHROPIC_API_KEY, then try again.
        </p>
      )}

      {askStage && (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-accent/40 p-4 text-sm">
          <p>Move {businessName} to the &ldquo;Contacted&rdquo; stage?</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={async () => {
                await saveStage({ data: { id: contactId, stage: "Contacted" } });
                setAskStage(false);
                toast.success("Stage updated to Contacted.");
                await router.invalidate();
              }}
              className="btn-gold rounded-full px-5 py-2 text-xs font-medium"
            >
              Yes, update stage
            </button>
            <button
              type="button"
              onClick={() => setAskStage(false)}
              className="rounded-full border border-border px-5 py-2 text-xs"
            >
              Keep as {stage}
            </button>
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
            <button
              type="button"
              onClick={() => void onSend()}
              disabled={sending || !email}
              className="btn-gold rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send Email"}
            </button>
            <span className="text-xs text-muted-foreground">
              {email ? `Goes to ${email}` : "No email address on file for this contact."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
