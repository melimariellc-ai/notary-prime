import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Columns3,
  Mail,
  Phone,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { CustomFieldInputs, customFieldsFromForm } from "@/components/admin/CustomFields";
import { stageColor, useCrmOptions } from "@/hooks/useCrmOptions";
import {
  CONTACT_TYPES,
  PIPELINE_STAGES,
  bulkSetPipelineStage,
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
import {
  COLUMN_KEYS,
  COLUMN_LABELS,
  deleteSavedView,
  listSavedViews,
  saveView,
  type ColumnKey,
  type SavedView,
  type ViewConfig,
} from "@/lib/views.functions";

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
  validateSearch: (search: Record<string, unknown>): { stage?: string } => {
    const stage = typeof search.stage === "string" ? search.stage : undefined;
    return stage && (PIPELINE_STAGES as readonly string[]).includes(stage) ? { stage } : {};
  },
  loader: async () => {
    const [data, views] = await Promise.all([listBusinessContacts(), listSavedViews()]);
    return { ...data, savedViews: views.views };
  },
  component: CrmPage,
  pendingComponent: CrmSkeleton,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">
      Something went wrong loading contacts. Please refresh.
    </div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60";

const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type Referrals = Record<string, { count: number; value: number }>;
type SortKey = "business_name" | "contact_type" | "pipeline_stage" | "next_follow_up_date" | "referrals";

function CrmSkeleton() {
  return (
    <div className="px-4 py-10 md:px-8" aria-busy="true" aria-label="Loading contacts">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 w-full animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

function CrmPage() {
  const { contacts, referrals, savedViews } = Route.useLoaderData();
  const router = useRouter();
  const bulkStage = useServerFn(bulkSetPipelineStage);
  const persistView = useServerFn(saveView);
  const removeView = useServerFn(deleteSavedView);

  const [view, setView] = useState<"list" | "kanban">("list");
  const [typeFilter, setTypeFilter] = useState("");
  const [stageFilter, setStageFilter] = useState(Route.useSearch().stage ?? "");
  const [query, setQuery] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("business_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [columns, setColumns] = useState<ColumnKey[]>(["type", "stage", "follow_up", "referrals"]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showColumns, setShowColumns] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkTarget, setBulkTarget] = useState<string>(PIPELINE_STAGES[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const currentConfig: ViewConfig = {
    query,
    typeFilter,
    stageFilter,
    dueOnly,
    sortKey,
    sortDir,
    columns,
    view,
  };

  function applyView(v: SavedView) {
    setActiveViewId(v.id);
    setQuery(v.config.query);
    setTypeFilter(v.config.typeFilter);
    setStageFilter(v.config.stageFilter);
    setDueOnly(v.config.dueOnly);
    setSortKey(v.config.sortKey as SortKey);
    setSortDir(v.config.sortDir);
    setColumns(v.config.columns);
    setView(v.config.view);
    setSelected([]);
  }

  function resetView() {
    setActiveViewId(null);
    setQuery("");
    setTypeFilter("");
    setStageFilter("");
    setDueOnly(false);
    setSortKey("business_name");
    setSortDir("asc");
    setColumns(["type", "stage", "follow_up", "referrals"]);
    setView("list");
    setSelected([]);
  }

  async function onSaveView(name: string) {
    try {
      const res = await persistView({ data: { name, config: currentConfig } });
      if (res.ok) {
        setActiveViewId(res.view.id);
        toast.success(`Saved “${res.view.name}”.`);
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that view.");
    }
  }

  async function onDeleteView(v: SavedView) {
    try {
      const res = await removeView({ data: { id: v.id } });
      if (res.ok) {
        if (activeViewId === v.id) resetView();
        toast.success(`Deleted “${v.name}”.`);
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that view.");
    }
  }


  const today = todayISO();
  const dueCount = contacts.filter((c) => c.next_follow_up_date && c.next_follow_up_date <= today).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (typeFilter && c.contact_type !== typeFilter) return false;
      if (stageFilter && c.pipeline_stage !== stageFilter) return false;
      if (dueOnly && !(c.next_follow_up_date && c.next_follow_up_date <= today)) return false;
      if (!q) return true;
      return (
        c.business_name.toLowerCase().includes(q) || (c.contact_person ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, typeFilter, stageFilter, dueOnly, today, query]);

  const visible = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const value = (c: BusinessContact) => {
      if (sortKey === "referrals") return referrals[c.id]?.value ?? 0;
      if (sortKey === "next_follow_up_date") return c.next_follow_up_date ?? "9999-12-31";
      return String(c[sortKey] ?? "").toLowerCase();
    };
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === bv) return a.business_name.localeCompare(b.business_name);
      return av > bv ? dir : -dir;
    });
  }, [filtered, sortKey, sortDir, referrals]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function applyBulkStage() {
    try {
      const res = await bulkStage({ data: { ids: selected, stage: bulkTarget } });
      if (res.ok) {
        toast.success(`${res.updated} contact${res.updated === 1 ? "" : "s"} moved to ${bulkTarget}.`);
        setSelected([]);
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update those contacts.");
    }
  }

  const noContacts = contacts.length === 0;

  return (
    <>
      <AdminPageHeader
        eyebrow="Work"
        title={
          <>
            Business <span className="italic font-light text-gradient-gold">development.</span>
          </>
        }
        intro={`${contacts.length} referral relationship${contacts.length === 1 ? "" : "s"} tracked · ${dueCount} follow-up${dueCount === 1 ? "" : "s"} due.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setShowAdd((v) => !v);
                setShowImport(false);
              }}
              aria-expanded={showAdd}
              className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Add contact
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImport((v) => !v);
                setShowAdd(false);
              }}
              aria-expanded={showImport}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              <Upload className="h-4 w-4 text-accent-foreground" /> Bulk import
            </button>
          </>
        }
      />

      <AdminSection>
        {showAdd && (
          <AddContactForm
            onSaved={async () => {
              setShowAdd(false);
              toast.success("Contact added.");
              await router.invalidate();
            }}
          />
        )}
        {showImport && <BulkImport onImported={() => router.invalidate()} />}

        {noContacts ? (
          <EmptyState onAdd={() => setShowAdd(true)} />
        ) : (
          <>
            <SavedViewsBar
              views={savedViews}
              activeId={activeViewId}
              onApply={applyView}
              onReset={resetView}
              onSave={onSaveView}
              onDelete={onDeleteView}
            />

            <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="contact-search" className="text-sm text-muted-foreground">
                  Search contacts
                </label>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                <label htmlFor="type-filter" className="text-sm text-muted-foreground">
                  Contact type
                </label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={`mt-2 ${inputClass}`}
                >
                  <option value="">All types</option>
                  {CONTACT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="stage-filter" className="text-sm text-muted-foreground">
                  Pipeline stage
                </label>
                <select
                  id="stage-filter"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className={`mt-2 ${inputClass}`}
                >
                  <option value="">All stages</option>
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={dueOnly}
                    onChange={(e) => setDueOnly(e.target.checked)}
                    className="h-4 w-4 accent-[var(--gold)]"
                  />
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                    <CalendarClock className="h-4 w-4 text-accent-foreground" /> Due only ({dueCount})
                  </span>
                </label>

                 <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColumns((v) => !v)}
                    aria-expanded={showColumns}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs hover:bg-secondary"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-accent-foreground" /> Columns
                  </button>
                  {showColumns && (
                    <div className="absolute right-0 z-40 mt-2 w-52 rounded-2xl border border-border bg-card p-3 shadow-lg">
                      {COLUMN_KEYS.map((key) => (
                        <label key={key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary">
                          <input
                            type="checkbox"
                            checked={columns.includes(key)}
                            onChange={(e) =>
                              setColumns((prev) =>
                                e.target.checked
                                  ? COLUMN_KEYS.filter((k) => k === key || prev.includes(k))
                                  : prev.filter((k) => k !== key),
                              )
                            }
                            className="h-4 w-4 accent-[var(--gold)]"
                          />
                          {COLUMN_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  role="group"
                  aria-label="View mode"
                  className="inline-flex rounded-full border border-border bg-card p-1"
                >
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    aria-pressed={view === "list"}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs ${view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Rows3 className="h-3.5 w-3.5" /> List
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("kanban")}
                    aria-pressed={view === "kanban"}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs ${view === "kanban" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Columns3 className="h-3.5 w-3.5" /> Kanban
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
              Showing {visible.length} of {contacts.length} contacts.
            </p>

            {selected.length > 0 && (
              <div className="sticky bottom-4 z-30 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/50 bg-card p-4 shadow-lg">
                <span className="text-sm font-medium">
                  {selected.length} selected
                </span>
                <label htmlFor="bulk-stage" className="text-sm text-muted-foreground">
                  Move to stage
                </label>
                <select
                  id="bulk-stage"
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value)}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void applyBulkStage()}
                  className="btn-gold rounded-full px-5 py-2 text-sm font-medium"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="rounded-full border border-border px-5 py-2 text-sm"
                >
                  Clear
                </button>
              </div>
            )}

            {visible.length === 0 ? (
              <p className="mt-6 rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
                No contacts match those filters. Try clearing the search or stage filter.
              </p>
            ) : view === "list" ? (
              <ListView
                rows={visible}
                referrals={referrals}
                today={today}
                selected={selected}
                onToggle={toggleSelect}
                onToggleAll={(checked) => setSelected(checked ? visible.map((c) => c.id) : [])}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                columns={columns}
              />
            ) : (
              <KanbanView rows={visible} referrals={referrals} today={today} />
            )}
          </>
        )}
      </AdminSection>
    </>
  );
}

function SavedViewsBar({
  views,
  activeId,
  onApply,
  onReset,
  onSave,
  onDelete,
}: {
  views: SavedView[];
  activeId: string | null;
  onApply: (v: SavedView) => void;
  onReset: () => void;
  onSave: (name: string) => Promise<void>;
  onDelete: (v: SavedView) => Promise<void>;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const active = views.find((v) => v.id === activeId) ?? null;

  return (
    <div className="mb-6 rounded-3xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-accent-foreground" /> Saved views
        </span>
        <button
          type="button"
          onClick={onReset}
          aria-pressed={activeId === null}
          className={`rounded-full px-4 py-2 text-xs transition-colors ${activeId === null ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
        >
          All contacts
        </button>
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onApply(v)}
            aria-pressed={activeId === v.id}
            className={`rounded-full px-4 py-2 text-xs transition-colors ${activeId === v.id ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
          >
            {v.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {active && (
            <button
              type="button"
              onClick={() => void onDelete(active)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete view
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setName(active?.name ?? "");
              setNaming((v) => !v);
            }}
            aria-expanded={naming}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 px-4 py-2 text-xs font-medium hover:bg-secondary"
          >
            <Plus className="h-3.5 w-3.5 text-accent-foreground" /> Save current view
          </button>
        </div>
      </div>

      {naming && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
              toast.error("Give the view a name.");
              return;
            }
            void onSave(trimmed).then(() => {
              setNaming(false);
              setName("");
            });
          }}
        >
          <div className="min-w-56 flex-1">
            <label htmlFor="view-name" className="text-sm text-muted-foreground">
              View name
            </label>
            <input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Hot Leads This Week"
              className={`mt-2 ${inputClass}`}
            />
          </div>
          <button type="submit" className="btn-gold rounded-full px-5 py-2.5 text-sm font-medium">
            Save view
          </button>
          <button
            type="button"
            onClick={() => setNaming(false)}
            className="rounded-full border border-border px-5 py-2.5 text-sm"
          >
            Cancel
          </button>
        </form>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Views save your search, filters, sort order, columns, and list or kanban mode. They are private to your account.
      </p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-gold/50 bg-card p-12 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary">
        <Users className="h-6 w-6 text-accent-foreground" />
      </span>
      <h2 className="mt-6 font-display text-2xl tracking-tight">Start building your referral network</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Title companies, real estate agents, and attorneys you add here move through your pipeline, keep their own
        activity history, and show the real dollar value of the work they send you.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="btn-gold mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
      >
        <Plus className="h-4 w-4" /> Add your first contact
      </button>
    </div>
  );
}

function StageChip({ stage }: { stage: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-medium">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
      {stage}
    </span>
  );
}

function ListView({
  rows,
  referrals,
  today,
  selected,
  onToggle,
  onToggleAll,
  sortKey,
  sortDir,
  onSort,
  columns,
}: {
  rows: BusinessContact[];
  referrals: Referrals;
  today: string;
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  columns: ColumnKey[];
}) {
  const show = (key: ColumnKey) => columns.includes(key);
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const Header = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <th scope="col" className="px-4 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(keyName)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        aria-label={`Sort by ${label}`}
      >
        {label}
        {sortKey === keyName &&
          (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-card">
      <table className="w-full min-w-[52rem] text-sm">
        <thead className="border-b border-border bg-secondary/60">
          <tr>
            <th scope="col" className="w-12 px-4 py-3">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => onToggleAll(e.target.checked)}
                aria-label="Select all visible contacts"
                className="h-4 w-4 accent-[var(--gold)]"
              />
            </th>
            <Header label="Business" keyName="business_name" />
            {show("type") && <Header label="Type" keyName="contact_type" />}
            {show("stage") && <Header label="Stage" keyName="pipeline_stage" />}
            {show("follow_up") && <Header label="Follow-up" keyName="next_follow_up_date" />}
            {show("referrals") && <Header label="Referred value" keyName="referrals" />}
            {show("phone") && (
              <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Phone
              </th>
            )}
            {show("email") && (
              <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Email
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const stats = referrals[c.id] ?? { count: 0, value: 0 };
            const overdue = !!c.next_follow_up_date && c.next_follow_up_date <= today;
            return (
              <tr key={c.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => onToggle(c.id)}
                    aria-label={`Select ${c.business_name}`}
                    className="h-4 w-4 accent-[var(--gold)]"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    to="/admin/crm/$contactId"
                    params={{ contactId: c.id }}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {c.business_name}
                  </Link>
                  {c.contact_person && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{c.contact_person}</span>
                  )}
                </td>
                {show("type") && <td className="px-4 py-3 text-muted-foreground">{c.contact_type}</td>}
                {show("stage") && (
                  <td className="px-4 py-3">
                    <StageChip stage={c.pipeline_stage} />
                  </td>
                )}
                {show("follow_up") && (
                  <td className="px-4 py-3">
                    {c.next_follow_up_date ? (
                      <span className={overdue ? "text-destructive" : "text-muted-foreground"}>
                        {new Date(`${c.next_follow_up_date}T00:00:00`).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                {show("referrals") && (
                  <td className="px-4 py-3 text-muted-foreground">
                    {stats.count} job{stats.count === 1 ? "" : "s"} · {money(stats.value)}
                  </td>
                )}
                {show("phone") && (
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                )}
                {show("email") && (
                  <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KanbanView({
  rows,
  referrals,
  today,
}: {
  rows: BusinessContact[];
  referrals: Referrals;
  today: string;
}) {
  const save = useServerFn(setPipelineStage);
  const router = useRouter();
  const [dragOver, setDragOver] = useState<string | null>(null);

  async function move(id: string, stage: string, from: string) {
    if (stage === from) return;
    try {
      const res = await save({ data: { id, stage } });
      if (res.ok) {
        toast.success(`Moved to ${stage}.`);
        await router.invalidate();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the stage.");
    }
  }

  return (
    <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const column = rows.filter((c) => c.pipeline_stage === stage);
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage);
            }}
            onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const payload = e.dataTransfer.getData("text/plain");
              const [id, from] = payload.split("|");
              if (id) void move(id, stage, from ?? "");
            }}
            className={`w-72 shrink-0 self-start rounded-3xl border bg-card p-4 transition-colors ${dragOver === stage ? "border-gold bg-accent/40" : "border-border"}`}
          >
            <h2 className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[stage] }}
                />
                {stage}
              </span>
              <span>{column.length}</span>
            </h2>
            <div className="mt-4 grid gap-3">
              {column.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                  Drop a contact here.
                </p>
              )}
              {column.map((c) => (
                <KanbanCard
                  key={c.id}
                  contact={c}
                  today={today}
                  referrals={referrals}
                  onMove={(stageNext) => void move(c.id, stageNext, c.pipeline_stage)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  contact,
  today,
  referrals,
  onMove,
}: {
  contact: BusinessContact;
  today: string;
  referrals: Referrals;
  onMove: (stage: string) => void;
}) {
  const overdue = !!contact.next_follow_up_date && contact.next_follow_up_date <= today;
  const stats = referrals[contact.id] ?? { count: 0, value: 0 };

  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", `${contact.id}|${contact.pipeline_stage}`)}
      className="cursor-grab rounded-2xl border border-border bg-background p-4 transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <Link
        to="/admin/crm/$contactId"
        params={{ contactId: contact.id }}
        className="font-display text-base tracking-tight underline-offset-4 hover:underline"
      >
        {contact.business_name}
      </Link>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{contact.contact_type}</p>
      {contact.contact_person && <p className="mt-2 text-sm">{contact.contact_person}</p>}
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Phone className="h-3.5 w-3.5 text-accent-foreground" /> {contact.phone}
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 break-all hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5 text-accent-foreground" /> {contact.email}
          </a>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {stats.count} job{stats.count === 1 ? "" : "s"} · {money(stats.value)}
      </p>
      {contact.next_follow_up_date && (
        <p className={`mt-1 text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
          Follow up {new Date(`${contact.next_follow_up_date}T00:00:00`).toLocaleDateString()}
        </p>
      )}
      <label htmlFor={`stage-${contact.id}`} className="mt-3 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Move to stage
      </label>
      <select
        id={`stage-${contact.id}`}
        value={contact.pipeline_stage}
        onChange={(e) => onMove(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gold/60"
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </article>
  );
}

function DuplicateWarning({ matches }: { matches: DuplicateMatch[] }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium">
        Close match{matches.length === 1 ? "" : "es"} already in the CRM — compare before adding:
      </p>
      <ul className="mt-2 grid gap-1">
        {matches.map((m) => (
          <li key={`${m.id}-${m.reason}`} className="flex flex-wrap items-baseline gap-x-2">
            <Link
              to="/admin/crm/$contactId"
              params={{ contactId: m.id }}
              className="text-accent-foreground underline underline-offset-4"
            >
              {m.business_name}
            </Link>
            <span className="text-muted-foreground">
              — {m.score}% match on {m.reason === "name" ? "business name" : "phone number"}
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
  const [busy, setBusy] = useState(false);
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
      customFields: customFieldsFromForm(fd),
    };
  }

  async function submit(form: HTMLFormElement, force: boolean) {
    const fd = new FormData(form);
    setBusy(true);
    try {
      const res = await create({ data: { ...fields(fd), force } });
      if (res.ok) {
        form.reset();
        setDuplicates([]);
        onSaved();
      } else if (res.duplicates.length > 0) {
        setDuplicates(res.duplicates);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that contact.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-8 rounded-3xl border border-border bg-card p-6 md:p-8">
      <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
        <Plus className="h-5 w-5 text-accent-foreground" /> Add contact
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget, false);
        }}
        className="mt-6 grid gap-5 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="business_name" className="text-sm font-medium">
            Business / organization *
          </label>
          <input
            id="business_name"
            name="business_name"
            required
            className={`mt-2 ${inputClass}`}
            onBlur={async (e) => {
              const name = e.target.value.trim();
              const phone =
                (e.currentTarget.form?.elements.namedItem("phone") as HTMLInputElement | null)?.value ?? "";
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
          <label htmlFor="contact_person" className="text-sm font-medium">
            Contact person
          </label>
          <input id="contact_person" name="contact_person" className={`mt-2 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="contact_type" className="text-sm font-medium">
            Contact type
          </label>
          <select id="contact_type" name="contact_type" defaultValue="Title Company" className={`mt-2 ${inputClass}`}>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pipeline_stage" className="text-sm font-medium">
            Pipeline stage
          </label>
          <select id="pipeline_stage" name="pipeline_stage" defaultValue="New Lead" className={`mt-2 ${inputClass}`}>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="phone" className="text-sm font-medium">
            Phone
          </label>
          <input id="phone" name="phone" type="tel" className={`mt-2 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" className={`mt-2 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="first_contacted_date" className="text-sm font-medium">
            Date first contacted
          </label>
          <input id="first_contacted_date" name="first_contacted_date" type="date" className={`mt-2 ${inputClass}`} />
        </div>
        <div>
          <label htmlFor="next_follow_up_date" className="text-sm font-medium">
            Next follow-up date
          </label>
          <input id="next_follow_up_date" name="next_follow_up_date" type="date" className={`mt-2 ${inputClass}`} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="referral_source" className="text-sm font-medium">
            Referral source
          </label>
          <input
            id="referral_source"
            name="referral_source"
            placeholder="How this contact was found or introduced"
            className={`mt-2 ${inputClass}`}
          />
        </div>

        <CustomFieldInputs />

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

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="btn-gold rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save contact"}
          </button>
        </div>
      </form>
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
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [skipDupes, setSkipDupes] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setRows(null);
    const grid = parseCsv(await file.text());
    if (grid.length < 2) {
      toast.error("That file has no data rows.");
      return;
    }
    const header = grid[0]!.map((h) => HEADER_MAP[h.trim().toLowerCase()] ?? "");
    if (!header.includes("business_name")) {
      toast.error('The file needs a "business name" column.');
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
      toast.error(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  const importable = (rows ?? []).filter(
    (r) => r.errors.length === 0 && (!skipDupes || r.duplicates.length === 0),
  );

  async function onCommit() {
    setBusy(true);
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
        toast.success(`Imported ${res.imported} contact${res.imported === 1 ? "" : "s"}.`);
        onImported();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import those contacts.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-8 rounded-3xl border border-border bg-card p-6 md:p-8">
      <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
        <Upload className="h-5 w-5 text-accent-foreground" /> Bulk import
      </h2>

      <div className="mt-6 grid gap-5">
        <p className="text-sm text-muted-foreground">
          Upload a CSV with these column headings: business name, contact person, contact type, phone, email, referral
          source. You&rsquo;ll see a preview before anything is saved.
        </p>
        <div>
          <label htmlFor="csv-file" className="text-sm font-medium">
            CSV file
          </label>
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

        {rows && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      #
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Business
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Contact
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Phone
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Status
                    </th>
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
                          <span className="text-accent-foreground">
                            Possible duplicate of{" "}
                            {r.duplicates.map((d) => `${d.business_name} (${d.score}%)`).join(", ")}
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
                className="h-4 w-4 accent-[var(--gold)]"
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
    </div>
  );
}
