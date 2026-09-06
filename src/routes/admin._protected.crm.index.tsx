import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CalendarClock, Mail, Phone, Plus, Users } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import {
  CONTACT_TYPES,
  PIPELINE_STAGES,
  createBusinessContact,
  listBusinessContacts,
  setPipelineStage,
  type BusinessContact,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/admin/_protected/crm/")({
  head: () => ({
    meta: [
      { title: "Business Development CRM | Enliven Notary" },
      { name: "description", content: "Private pipeline for tracking Enliven Notary referral relationships." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Business Development CRM | Enliven Notary" },
      { property: "og:description", content: "Private referral pipeline dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => listBusinessContacts(),
  component: CrmPage,
  errorComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">
      Something went wrong loading contacts. Please refresh.
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">Page not found.</div>
  ),
});

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function CrmPage() {
  const { contacts } = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<"pipeline" | "followups">("pipeline");
  const [typeFilter, setTypeFilter] = useState("");

  const today = todayISO();
  const dueContacts = useMemo(
    () =>
      contacts
        .filter((c) => c.next_follow_up_date && c.next_follow_up_date <= today)
        .sort((a, b) => (a.next_follow_up_date! < b.next_follow_up_date! ? -1 : 1)),
    [contacts, today],
  );

  const visible = typeFilter ? contacts.filter((c) => c.contact_type === typeFilter) : contacts;

  return (
    <>
      <PageHero
        eyebrow="Private"
        title={<>Business <span className="italic font-light text-gradient-gold">development.</span></>}
        intro={`${contacts.length} referral relationship${contacts.length === 1 ? "" : "s"} tracked · ${dueContacts.length} follow-up${dueContacts.length === 1 ? "" : "s"} due.`}
        cta={false}
      />
      <section className="pb-24">
        <div className="container-luxe">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex rounded-full border border-border p-1">
              <button
                type="button"
                onClick={() => setTab("pipeline")}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm ${tab === "pipeline" ? "bg-gold/15 text-foreground" : "text-muted-foreground"}`}
              >
                <Users className="h-4 w-4 text-gold" /> Pipeline
              </button>
              <button
                type="button"
                onClick={() => setTab("followups")}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm ${tab === "followups" ? "bg-gold/15 text-foreground" : "text-muted-foreground"}`}
              >
                <CalendarClock className="h-4 w-4 text-gold" /> Follow-ups due ({dueContacts.length})
              </button>
            </div>
            <Link to="/admin/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Back to dashboard
            </Link>
          </div>

          {tab === "pipeline" ? (
            <>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
                <label htmlFor="type-filter" className="text-muted-foreground">Contact type</label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                >
                  <option value="">All types</option>
                  {CONTACT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-5">
                {PIPELINE_STAGES.map((stage) => {
                  const column = visible.filter((c) => c.pipeline_stage === stage);
                  return (
                    <div key={stage} className="rounded-3xl border border-border bg-card p-4">
                      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {stage} · {column.length}
                      </h2>
                      <div className="mt-4 grid gap-3">
                        {column.length === 0 && (
                          <p className="text-xs text-muted-foreground">No contacts.</p>
                        )}
                        {column.map((c) => (
                          <ContactCard key={c.id} contact={c} today={today} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-8 grid gap-4">
              {dueContacts.length === 0 ? (
                <p className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
                  Nothing due today. Contacts appear here once their next follow-up date arrives.
                </p>
              ) : (
                dueContacts.map((c) => <ContactCard key={c.id} contact={c} today={today} wide />)
              )}
            </div>
          )}

          <AddContactForm onSaved={() => router.invalidate()} />
        </div>
      </section>
    </>
  );
}

function ContactCard({ contact, today, wide }: { contact: BusinessContact; today: string; wide?: boolean }) {
  const save = useServerFn(setPipelineStage);
  const router = useRouter();
  const overdue = !!contact.next_follow_up_date && contact.next_follow_up_date <= today;

  return (
    <article className={`rounded-2xl border border-border p-4 ${wide ? "bg-card md:p-6" : ""}`}>
      <Link
        to="/admin/crm/$contactId"
        params={{ contactId: contact.id }}
        className="font-display text-lg tracking-tight hover:text-gold transition-colors"
      >
        {contact.business_name}
      </Link>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{contact.contact_type}</p>
      {contact.contact_person && <p className="mt-2 text-sm">{contact.contact_person}</p>}
      <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 hover:text-gold">
            <Phone className="h-3.5 w-3.5 text-gold" /> {contact.phone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:text-gold break-all">
            <Mail className="h-3.5 w-3.5 text-gold" /> {contact.email}
          </a>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Jobs referred: <span className="text-foreground">{contact.total_jobs_referred}</span>
      </p>
      {contact.next_follow_up_date && (
        <p className={`mt-1 text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
          Follow up {new Date(`${contact.next_follow_up_date}T00:00:00`).toLocaleDateString()}
        </p>
      )}
      <label htmlFor={`stage-${contact.id}`} className="mt-3 block text-xs text-muted-foreground">
        Pipeline stage
      </label>
      <select
        id={`stage-${contact.id}`}
        defaultValue={contact.pipeline_stage}
        onChange={async (e) => {
          await save({ data: { id: contact.id, stage: e.target.value } });
          await router.invalidate();
        }}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gold/60"
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </article>
  );
}

function AddContactForm({ onSaved }: { onSaved: () => void }) {
  const create = useServerFn(createBusinessContact);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const res = await create({
        data: {
          business_name: String(fd.get("business_name") ?? ""),
          contact_person: String(fd.get("contact_person") ?? ""),
          contact_type: String(fd.get("contact_type") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? ""),
          pipeline_stage: String(fd.get("pipeline_stage") ?? ""),
          first_contacted_date: String(fd.get("first_contacted_date") ?? ""),
          next_follow_up_date: String(fd.get("next_follow_up_date") ?? ""),
          referral_source: String(fd.get("referral_source") ?? ""),
          total_jobs_referred: String(fd.get("total_jobs_referred") ?? "0"),
        },
      });
      if (res.ok) {
        form.reset();
        setOpen(false);
        onSaved();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that contact.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 font-display text-2xl tracking-tight"
      >
        <Plus className="h-5 w-5 text-gold" /> Add contact
      </button>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="business_name" className="text-sm font-medium">Business / organization *</label>
            <input id="business_name" name="business_name" required className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="contact_person" className="text-sm font-medium">Contact person</label>
            <input id="contact_person" name="contact_person" className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="contact_type" className="text-sm font-medium">Contact type</label>
            <select id="contact_type" name="contact_type" defaultValue="Title Company" className={`mt-2 ${inputClass}`}>
              {CONTACT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pipeline_stage" className="text-sm font-medium">Pipeline stage</label>
            <select id="pipeline_stage" name="pipeline_stage" defaultValue="New Lead" className={`mt-2 ${inputClass}`}>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium">Phone</label>
            <input id="phone" name="phone" type="tel" className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="first_contacted_date" className="text-sm font-medium">Date first contacted</label>
            <input id="first_contacted_date" name="first_contacted_date" type="date" className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="next_follow_up_date" className="text-sm font-medium">Next follow-up date</label>
            <input id="next_follow_up_date" name="next_follow_up_date" type="date" className={`mt-2 ${inputClass}`} />
          </div>
          <div>
            <label htmlFor="total_jobs_referred" className="text-sm font-medium">Total jobs referred</label>
            <input id="total_jobs_referred" name="total_jobs_referred" type="number" min="0" defaultValue="0" className={`mt-2 ${inputClass}`} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="referral_source" className="text-sm font-medium">Referral source</label>
            <input
              id="referral_source"
              name="referral_source"
              placeholder="How this contact was found or introduced"
              className={`mt-2 ${inputClass}`}
            />
          </div>

          {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}

          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-gold rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60">
              {busy ? "Saving…" : "Save contact"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
