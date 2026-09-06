import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, CalendarClock, Mail, MessageSquare, Phone } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import {
  ACTIVITY_TYPES,
  PIPELINE_STAGES,
  addContactActivity,
  getBusinessContact,
  setPipelineStage,
} from "@/lib/crm.functions";

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
  errorComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">
      Something went wrong loading this contact. Please refresh.
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">Contact not found.</div>
  ),
});

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60";

function ContactDetailPage() {
  const { contact, activities } = Route.useLoaderData();
  const router = useRouter();
  const logActivity = useServerFn(addContactActivity);
  const saveStage = useServerFn(setPipelineStage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!contact) {
    return (
      <div className="container-luxe py-32 text-center text-muted-foreground">
        That contact no longer exists. <Link to="/admin/crm" className="text-gold">Back to pipeline</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError(null);
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
        await router.invalidate();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log that activity.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow={contact.contact_type}
        title={<>{contact.business_name}</>}
        intro={contact.contact_person ? `Primary contact: ${contact.contact_person}` : "Referral relationship history."}
        cta={false}
      />
      <section className="pb-24">
        <div className="container-luxe max-w-3xl">
          <Link to="/admin/crm" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to pipeline
          </Link>

          <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 hover:text-gold">
                  <Phone className="h-4 w-4 text-gold" /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-gold break-all">
                  <Mail className="h-4 w-4 text-gold" /> {contact.email}
                </a>
              )}
              <p>
                First contacted:{" "}
                <span className="text-foreground">
                  {contact.first_contacted_date
                    ? new Date(`${contact.first_contacted_date}T00:00:00`).toLocaleDateString()
                    : "—"}
                </span>
              </p>
              <p className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-gold" /> Next follow-up:{" "}
                <span className="text-foreground">
                  {contact.next_follow_up_date
                    ? new Date(`${contact.next_follow_up_date}T00:00:00`).toLocaleDateString()
                    : "—"}
                </span>
              </p>
              <p>
                Jobs referred: <span className="text-foreground">{contact.total_jobs_referred}</span>
              </p>
              <p>
                Found via: <span className="text-foreground">{contact.referral_source || "—"}</span>
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6 text-sm">
              <label htmlFor="stage" className="text-muted-foreground">Pipeline stage</label>
              <select
                id="stage"
                defaultValue={contact.pipeline_stage}
                onChange={async (e) => {
                  await saveStage({ data: { id: contact!.id, stage: e.target.value } });
                  await router.invalidate();
                }}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
              <MessageSquare className="h-5 w-5 text-gold" /> Log an activity
            </h2>
            <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="activity_date" className="text-sm font-medium">Date</label>
                <input
                  id="activity_date"
                  name="activity_date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={`mt-2 ${inputClass}`}
                />
              </div>
              <div>
                <label htmlFor="activity_type" className="text-sm font-medium">Type</label>
                <select id="activity_type" name="activity_type" defaultValue="Call" className={`mt-2 ${inputClass}`}>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="description" className="text-sm font-medium">What happened</label>
                <textarea id="description" name="description" required rows={4} className={`mt-2 ${inputClass}`} />
              </div>
              {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}
              <div className="sm:col-span-2">
                <button type="submit" disabled={busy} className="btn-gold rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60">
                  {busy ? "Saving…" : "Add to history"}
                </button>
              </div>
            </form>
          </div>

          <h2 className="mt-10 font-display text-2xl tracking-tight">
            History <span className="text-sm text-muted-foreground">({activities.length})</span>
          </h2>
          {activities.length === 0 ? (
            <p className="mt-4 rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
              Nothing logged yet.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {activities.map((a) => (
                <li key={a.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-gold">{a.activity_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(`${a.activity_date}T00:00:00`).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
