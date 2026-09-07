import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Merge } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import {
  listDuplicateGroups,
  mergeBusinessContacts,
  type DuplicateGroup,
  type DuplicateGroupContact,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/admin/_protected/duplicates")({
  loader: () => listDuplicateGroups(),
  head: () => ({
    meta: [
      { title: "Duplicate Contacts | Enliven Notary" },
      {
        name: "description",
        content: "Review and merge likely duplicate business contacts in the Enliven Notary CRM.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Duplicate Contacts | Enliven Notary" },
      { property: "og:description", content: "Private admin tool for merging duplicate CRM contacts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DuplicatesPage,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DuplicatesPage() {
  const { groups } = Route.useLoaderData();

  return (
    <>
      <AdminPageHeader
        eyebrow="Data quality"
        title="Duplicate contacts"
        intro="Contacts that look like the same business, matched on name and phone similarity. Choose the record to keep and merge the rest — activity history, referrals and replies move across, and nothing is lost."
      />
      <AdminSection>
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-accent-foreground" aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl">No duplicates found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Every contact looks distinct right now. New contacts are checked as they are added, and this page
              re-scans each time you open it.
            </p>
            <Link
              to="/admin/crm"
              className="mt-6 inline-flex rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary/60"
            >
              Back to contacts
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            <p className="text-sm text-muted-foreground">
              {groups.length} possible duplicate {groups.length === 1 ? "group" : "groups"} found.
            </p>
            {groups.map((group) => (
              <GroupCard key={group.key} group={group} />
            ))}
          </div>
        )}
      </AdminSection>
    </>
  );
}

function GroupCard({ group }: { group: DuplicateGroup }) {
  const router = useRouter();
  const merge = useServerFn(mergeBusinessContacts);
  const [keepId, setKeepId] = useState(group.contacts[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const mergeIds = group.contacts.filter((c) => c.id !== keepId).map((c) => c.id);
  const keep = group.contacts.find((c) => c.id === keepId);

  async function onMerge() {
    setBusy(true);
    try {
      const res = await merge({ data: { keepId, mergeIds } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Merged ${res.merged} duplicate ${res.merged === 1 ? "record" : "records"}.`);
      setConfirming(false);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not merge those contacts.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Copy className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
          <h2 className="font-display text-xl">
            {group.contacts.length} similar records
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-3 py-1 font-semibold uppercase tracking-[0.14em] text-accent-foreground">
            {group.score}% match
          </span>
          {group.matchedFields.map((field) => (
            <span key={field} className="rounded-full border border-border px-3 py-1 text-muted-foreground">
              {field} matches
            </span>
          ))}
        </div>
      </header>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
        <div className="flex gap-2">
          <dt>Name similarity</dt>
          <dd className="font-semibold text-foreground">{group.nameScore}%</dd>
        </div>
        <div className="flex gap-2">
          <dt>Phone similarity</dt>
          <dd className="font-semibold text-foreground">{group.phoneScore > 0 ? `${group.phoneScore}%` : "—"}</dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {group.contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            groupKey={group.key}
            contact={contact}
            selected={contact.id === keepId}
            onSelect={() => {
              setKeepId(contact.id);
              setConfirming(false);
            }}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Keeping <span className="font-semibold text-foreground">{keep?.business_name ?? "—"}</span>. Blank fields on
          it are filled from the others, then the duplicates are removed.
        </p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-destructive">
              Merge {mergeIds.length} record{mergeIds.length === 1 ? "" : "s"} into {keep?.business_name}?
            </span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onMerge}
              disabled={busy}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Merging…" : "Yes, merge"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={mergeIds.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Merge className="h-4 w-4" aria-hidden="true" />
            Merge into selected
          </button>
        )}
      </div>
    </article>
  );
}

function ContactCard({
  groupKey,
  contact,
  selected,
  onSelect,
}: {
  groupKey: string;
  contact: DuplicateGroupContact;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        selected ? "border-gold/60 bg-secondary/50 ring-1 ring-gold/40" : "border-border bg-background"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="radio"
          name={`keep-${groupKey}`}
          checked={selected}
          onChange={onSelect}
          className="mt-1 h-4 w-4 accent-current"
          aria-label={`Keep ${contact.business_name}`}
        />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{contact.business_name}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {contact.contact_type} · {contact.pipeline_stage}
          </span>
        </span>
      </label>

      <dl className="mt-3 grid gap-1.5 text-xs">
        <Row label="Contact" value={contact.contact_person ?? "—"} />
        <Row label="Phone" value={contact.phone ?? "—"} />
        <Row label="Email" value={contact.email ?? "—"} />
        <Row label="Added" value={fmtDate(contact.created_at.slice(0, 10))} />
        <Row label="Next follow-up" value={fmtDate(contact.next_follow_up_date)} />
        <Row label="Activity entries" value={String(contact.activityCount)} />
        <Row label="Referrals" value={String(contact.referralCount)} />
      </dl>

      <Link
        to="/admin/crm/$contactId"
        params={{ contactId: contact.id }}
        className="mt-3 inline-flex text-xs font-medium text-accent-foreground underline-offset-4 hover:underline"
      >
        Open full record
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right">{value}</dd>
    </div>
  );
}
