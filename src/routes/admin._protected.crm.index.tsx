import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CalendarClock, Mail, Phone, Plus, Search, Upload, Users } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import {
  CONTACT_TYPES,
  PIPELINE_STAGES,
  checkContactDuplicates,
  commitContactImport,
  createBusinessContact,
  listBusinessContacts,
  previewContactImport,
  setPipelineStage,
  type BusinessContact,
  type DuplicateMatch,
  type ImportRow,
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

const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type Referrals = Record<string, { count: number; value: number }>;

function CrmPage() {
  const { contacts, referrals } = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<"pipeline" | "followups">("pipeline");
  const [typeFilter, setTypeFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [query, setQuery] = useState("");

  const today = todayISO();
  const dueContacts = useMemo(
    () =>
      contacts
        .filter((c) => c.next_follow_up_date && c.next_follow_up_date <= today)
        .sort((a, b) => (a.next_follow_up_date! < b.next_follow_up_date! ? -1 : 1)),
    [contacts, today],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (typeFilter && c.contact_type !== typeFilter) return false;
      if (stageFilter && c.pipeline_stage !== stageFilter) return false;
      if (!q) return true;
      return (
        c.business_name.toLowerCase().includes(q) ||
        (c.contact_person ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, typeFilter, stageFilter, query]);

  const stages = stageFilter ? PIPELINE_STAGES.filter((s) => s === stageFilter) : PIPELINE_STAGES;

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
          <Overview contacts={contacts} today={today} />
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4">

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
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="contact-search" className="text-sm text-muted-foreground">Search</label>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                    <input
                      id="contact-search"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Business or contact person"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="type-filter" className="text-sm text-muted-foreground">Contact type</label>
                  <select
                    id="type-filter"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  >
                    <option value="">All types</option>
                    {CONTACT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stage-filter" className="text-sm text-muted-foreground">Pipeline stage</label>
                  <select
                    id="stage-filter"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className={`mt-2 ${inputClass}`}
                  >
                    <option value="">All stages</option>
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Showing {visible.length} of {contacts.length} contacts.
              </p>

              <div className={`mt-6 grid gap-4 ${stageFilter ? "" : "lg:grid-cols-5"}`}>
                {stages.map((stage) => {
                  const column = visible.filter((c) => c.pipeline_stage === stage);
                  return (
                    <div key={stage} className="rounded-3xl border border-border bg-card p-4">
                      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {stage} · {column.length}
                      </h2>
                      <div className={`mt-4 grid gap-3 ${stageFilter ? "md:grid-cols-3" : ""}`}>
                        {column.length === 0 && (
                          <p className="text-xs text-muted-foreground">No contacts.</p>
                        )}
                        {column.map((c) => (
                          <ContactCard key={c.id} contact={c} today={today} referrals={referrals} />
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
                dueContacts.map((c) => (
                  <ContactCard key={c.id} contact={c} today={today} referrals={referrals} wide />
                ))
              )}
            </div>
          )}

          <AddContactForm onSaved={() => router.invalidate()} />
          <BulkImport onImported={() => router.invalidate()} />
        </div>
      </section>
    </>
  );
}

function ContactCard({
  contact,
  today,
  referrals,
  wide,
}: {
  contact: BusinessContact;
  today: string;
  referrals: Referrals;
  wide?: boolean;
}) {
  const save = useServerFn(setPipelineStage);
  const router = useRouter();
  const overdue = !!contact.next_follow_up_date && contact.next_follow_up_date <= today;
  const stats = referrals[contact.id] ?? { count: 0, value: 0 };

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
        Jobs referred: <span className="text-foreground">{stats.count}</span> · {money(stats.value)}
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

function DuplicateWarning({ matches }: { matches: DuplicateMatch[] }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium">Possible duplicate{matches.length === 1 ? "" : "s"} already in the CRM:</p>
      <ul className="mt-2 grid gap-1">
        {matches.map((m) => (
          <li key={`${m.id}-${m.reason}`}>
            <Link
              to="/admin/crm/$contactId"
              params={{ contactId: m.id }}
              className="text-gold underline underline-offset-4"
            >
              {m.business_name}
            </Link>{" "}
            <span className="text-muted-foreground">
              — matching {m.reason === "name" ? "business name" : "phone number"}
              {m.phone ? ` (${m.phone})` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddContactForm({ onSaved }: { onSaved: () => void }) {
  const create = useServerFn(createBusinessContact);
  const check = useServerFn(checkContactDuplicates);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  function fields(fd: FormData) {
    return {
      business_name: String(fd.get("business_name") ?? ""),
      contact_person: String(fd.get("contact_person") ?? ""),
      contact_type: String(fd.get("contact_type") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      pipeline_stage: String(fd.get("pipeline_stage") ?? ""),
      first_contacted_date: String(fd.get("first_contacted_date") ?? ""),
      next_follow_up_date: String(fd.get("next_follow_up_date") ?? ""),
      referral_source: String(fd.get("referral_source") ?? ""),
    };
  }

  async function submit(form: HTMLFormElement, force: boolean) {
    const fd = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const res = await create({ data: { ...fields(fd), force } });
      if (res.ok) {
        form.reset();
        setDuplicates([]);
        setOpen(false);
        onSaved();
      } else if (res.duplicates.length > 0) {
        setDuplicates(res.duplicates);
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(e.currentTarget, false);
          }}
          className="mt-6 grid gap-5 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="business_name" className="text-sm font-medium">Business / organization *</label>
            <input
              id="business_name"
              name="business_name"
              required
              className={`mt-2 ${inputClass}`}
              onBlur={async (e) => {
                const name = e.target.value.trim();
                const phone = (e.currentTarget.form?.elements.namedItem("phone") as HTMLInputElement | null)?.value ?? "";
                if (!name) return;
                try {
                  const res = await check({ data: { business_name: name, phone } });
                  setDuplicates(res.matches);
                } catch {
                  /* non-blocking */
                }
              }}
            />
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
          <div className="sm:col-span-2">
            <label htmlFor="referral_source" className="text-sm font-medium">Referral source</label>
            <input
              id="referral_source"
              name="referral_source"
              placeholder="How this contact was found or introduced"
              className={`mt-2 ${inputClass}`}
            />
          </div>

          {duplicates.length > 0 && (
            <div className="sm:col-span-2 grid gap-3">
              <DuplicateWarning matches={duplicates} />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    const form = e.currentTarget.closest("form");
                    if (form) void submit(form as HTMLFormElement, true);
                  }}
                  className="rounded-full border border-border px-6 py-3 text-sm font-medium disabled:opacity-60"
                >
                  Save anyway
                </button>
              </div>
            </div>
          )}

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

/* --------------------------------- CSV import --------------------------------- */

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const text = input.replace(/\r\n?/g, "\n");

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const HEADER_MAP: Record<string, string> = {
  "business name": "business_name",
  business: "business_name",
  business_name: "business_name",
  organization: "business_name",
  "contact person": "contact_person",
  contact_person: "contact_person",
  contact: "contact_person",
  "contact type": "contact_type",
  contact_type: "contact_type",
  type: "contact_type",
  phone: "phone",
  "phone number": "phone",
  email: "email",
  "referral source": "referral_source",
  referral_source: "referral_source",
};

function BulkImport({ onImported }: { onImported: () => void }) {
  const preview = useServerFn(previewContactImport);
  const commit = useServerFn(commitContactImport);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [skipDupes, setSkipDupes] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setDone(null);
    setRows(null);
    const grid = parseCsv(await file.text());
    if (grid.length < 2) {
      setError("That file has no data rows.");
      return;
    }
    const header = grid[0]!.map((h) => HEADER_MAP[h.trim().toLowerCase()] ?? "");
    if (!header.includes("business_name")) {
      setError('The file needs a "business name" column.');
      return;
    }
    const parsed = grid.slice(1).map((cells) => {
      const obj: Record<string, string> = {};
      header.forEach((key, i) => {
        if (key) obj[key] = cells[i] ?? "";
      });
      return obj;
    });
    setBusy(true);
    try {
      const res = await preview({ data: { rows: parsed } });
      setRows(res.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  const importable = (rows ?? []).filter(
    (r) => r.errors.length === 0 && (!skipDupes || r.duplicates.length === 0),
  );

  async function onCommit() {
    setBusy(true);
    setError(null);
    try {
      const res = await commit({
        data: {
          rows: importable.map((r) => ({
            business_name: r.business_name,
            contact_person: r.contact_person,
            contact_type: r.contact_type,
            phone: r.phone,
            email: r.email,
            referral_source: r.referral_source,
          })),
        },
      });
      if (res.ok) {
        setRows(null);
        setDone(`Imported ${res.imported} contact${res.imported === 1 ? "" : "s"}.`);
        onImported();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import those contacts.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 font-display text-2xl tracking-tight"
      >
        <Upload className="h-5 w-5 text-gold" /> Bulk import
      </button>

      {open && (
        <div className="mt-6 grid gap-5">
          <p className="text-sm text-muted-foreground">
            Upload a CSV with these column headings: business name, contact person, contact type, phone, email,
            referral source. You&rsquo;ll see a preview before anything is saved.
          </p>
          <div>
            <label htmlFor="csv-file" className="text-sm font-medium">CSV file</label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className={`mt-2 ${inputClass}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {done && <p className="text-sm text-gold">{done}</p>}

          {rows && (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Business</th>
                      <th className="px-3 py-2">Contact</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.rowNumber} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{r.rowNumber}</td>
                        <td className="px-3 py-2">{r.business_name || "—"}</td>
                        <td className="px-3 py-2">{r.contact_person ?? "—"}</td>
                        <td className="px-3 py-2">{r.contact_type}</td>
                        <td className="px-3 py-2">{r.phone ?? "—"}</td>
                        <td className="px-3 py-2 break-all">{r.email ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.errors.length > 0 ? (
                            <span className="text-destructive">{r.errors.join(" ")}</span>
                          ) : r.duplicates.length > 0 ? (
                            <span className="text-gold">
                              Possible duplicate of {r.duplicates.map((d) => d.business_name).join(", ")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipDupes}
                  onChange={(e) => setSkipDupes(e.target.checked)}
                  className="h-4 w-4"
                />
                Skip rows flagged as possible duplicates
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy || importable.length === 0}
                  onClick={() => void onCommit()}
                  className="btn-gold rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
                >
                  {busy ? "Importing…" : `Import ${importable.length} contact${importable.length === 1 ? "" : "s"}`}
                </button>
                <button
                  type="button"
                  onClick={() => setRows(null)}
                  className="rounded-full border border-border px-6 py-3 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
