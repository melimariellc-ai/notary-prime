import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { MailQuestion } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { Card, SectionLabel } from "@/components/admin/ui/Card";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import {
  listAppointmentDrafts,
  updateAppointmentDraft,
  approveAppointmentDraft,
  rejectAppointmentDraft,
  type AppointmentDraft,
} from "@/lib/appointment-drafts.functions";

export const Route = createFileRoute("/admin/_protected/email-requests")({
  head: () => ({
    meta: [
      { title: "Email Requests | Enliven Notary" },
      {
        name: "description",
        content: "Review appointment requests that arrived by email before they become confirmed bookings.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Email Requests | Enliven Notary" },
      { property: "og:description", content: "Private review queue for appointment requests received by email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmailRequestsPage,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  pending_review: { label: "Pending review", tone: "warning" },
  approved: { label: "Approved", tone: "positive" },
  rejected: { label: "Not a booking", tone: "neutral" },
};

const FIELD_LABELS: Record<string, string> = {
  name: "Client name",
  email: "Email",
  phone: "Phone",
  service: "Service",
  meeting_type: "Mobile or online",
  address: "Address",
  preferred_date: "Date",
  preferred_time: "Time",
  notes: "Notes",
};

const FILTERS = ["pending_review", "approved", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

type FormState = {
  name: string;
  email: string;
  phone: string;
  service: string;
  meeting_type: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  notes: string;
};

function toForm(d: AppointmentDraft): FormState {
  return {
    name: d.name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    service: d.service ?? "",
    meeting_type: d.meeting_type ?? "",
    address: d.address ?? "",
    preferred_date: d.preferred_date ?? "",
    preferred_time: d.preferred_time ?? "",
    notes: d.notes ?? "",
  };
}

function when(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function Field({
  label,
  value,
  found,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  found: boolean;
  onChange: (v: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2">
        <SectionLabel>{label}</SectionLabel>
        {found ? (
          <Badge tone="accent">Found by AI</Badge>
        ) : value ? (
          <Badge tone="neutral">Taken from sender</Badge>
        ) : (
          <Badge tone="neutral">Left blank</Badge>
        )}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-10 w-full rounded-full border border-border bg-background px-4 text-sm disabled:opacity-60"
      />
    </label>
  );
}

function DraftCard({ draft }: { draft: AppointmentDraft }) {
  const queryClient = useQueryClient();
  const save = useServerFn(updateAppointmentDraft);
  const approve = useServerFn(approveAppointmentDraft);
  const reject = useServerFn(rejectAppointmentDraft);

  const [form, setForm] = useState<FormState>(() => toForm(draft));
  const [busy, setBusy] = useState<null | "save" | "approve" | "reject">(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => setForm(toForm(draft)), [draft]);

  const locked = draft.status !== "pending_review";
  const found = new Set(draft.found_fields ?? []);
  const status = STATUS_META[draft.status] ?? STATUS_META["pending_review"]!;

  const set = (key: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["appointment-drafts"] });

  async function run(kind: "save" | "approve" | "reject") {
    setBusy(kind);
    setMessage(null);
    try {
      const result =
        kind === "reject"
          ? await reject({ data: { id: draft.id } })
          : kind === "save"
            ? await save({ data: { id: draft.id, ...form } })
            : await approve({ data: { id: draft.id, ...form } });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
      } else {
        setMessage({
          tone: "ok",
          text:
            kind === "approve"
              ? "Approved — this is now a confirmed appointment request."
              : kind === "reject"
                ? "Marked as not a booking request."
                : "Changes saved.",
        });
        await refresh();
        if (kind === "approve") await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      }
    } catch (error) {
      console.error("Draft action failed", error);
      setMessage({ tone: "error", text: "Something went wrong. Please try again." });
    } finally {
      setBusy(null);
      setConfirmReject(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight tracking-tight">
            {draft.from_name ?? draft.from_email}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {draft.subject ?? "(no subject)"} · {when(draft.created_at)}
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {draft.ai_summary && <p className="mt-4 text-sm leading-relaxed">{draft.ai_summary}</p>}
      {draft.ai_error && (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          The details could not be read automatically — please fill them in from the email below.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label={FIELD_LABELS.name!} value={form.name} found={found.has("name")} onChange={set("name")} disabled={locked} />
        <Field label={FIELD_LABELS.email!} value={form.email} found={found.has("email")} onChange={set("email")} disabled={locked} type="email" />
        <Field label={FIELD_LABELS.phone!} value={form.phone} found={found.has("phone")} onChange={set("phone")} disabled={locked} />
        <Field label={FIELD_LABELS.service!} value={form.service} found={found.has("service")} onChange={set("service")} disabled={locked} />
        <label className="block">
          <span className="flex items-center gap-2">
            <SectionLabel>{FIELD_LABELS.meeting_type}</SectionLabel>
            {found.has("meeting_type") ? <Badge tone="accent">Found by AI</Badge> : <Badge tone="neutral">Left blank</Badge>}
          </span>
          <select
            value={form.meeting_type}
            disabled={locked}
            onChange={(e) => set("meeting_type")(e.target.value)}
            className="mt-2 h-10 w-full rounded-full border border-border bg-background px-4 text-sm disabled:opacity-60"
          >
            <option value="">Not set</option>
            <option value="mobile">Mobile (we travel)</option>
            <option value="online">Online</option>
          </select>
        </label>
        <Field label={FIELD_LABELS.address!} value={form.address} found={found.has("address")} onChange={set("address")} disabled={locked} />
        <Field label={FIELD_LABELS.preferred_date!} value={form.preferred_date} found={found.has("preferred_date")} onChange={set("preferred_date")} disabled={locked} />
        <Field label={FIELD_LABELS.preferred_time!} value={form.preferred_time} found={found.has("preferred_time")} onChange={set("preferred_time")} disabled={locked} />
      </div>

      <div className="mt-4">
        <span className="flex items-center gap-2">
          <SectionLabel>{FIELD_LABELS.notes}</SectionLabel>
          {found.has("notes") ? <Badge tone="accent">Found by AI</Badge> : <Badge tone="neutral">Left blank</Badge>}
        </span>
        <textarea
          value={form.notes}
          disabled={locked}
          rows={3}
          onChange={(e) => set("notes")(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm disabled:opacity-60"
        />
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowEmail((v) => !v)}
          className="text-sm text-accent-foreground underline-offset-4 hover:underline"
        >
          {showEmail ? "Hide original email" : "Show original email"}
        </button>
        {showEmail && (
          <div className="mt-3 max-h-64 overflow-auto rounded-2xl border border-border bg-secondary/40 p-4 text-sm whitespace-pre-wrap">
            {draft.raw_body || "(empty email)"}
          </div>
        )}
      </div>

      {message && (
        <p className={`mt-5 text-sm ${message.tone === "error" ? "text-destructive" : "text-accent-foreground"}`}>
          {message.text}
        </p>
      )}

      {!locked && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm" disabled={busy !== null} onClick={() => run("approve")}>
            {busy === "approve" ? "Approving…" : "Approve as appointment"}
          </Button>
          <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => run("save")}>
            {busy === "save" ? "Saving…" : "Save changes"}
          </Button>
          {confirmReject ? (
            <>
              <span className="text-sm text-muted-foreground">Not a booking request?</span>
              <Button variant="destructive" size="sm" disabled={busy !== null} onClick={() => run("reject")}>
                {busy === "reject" ? "Rejecting…" : "Yes, reject"}
              </Button>
              <Button variant="tertiary" size="sm" onClick={() => setConfirmReject(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="tertiary" size="sm" onClick={() => setConfirmReject(true)}>
              Reject
            </Button>
          )}
        </div>
      )}

      {draft.status === "approved" && (
        <p className="mt-6 text-sm text-muted-foreground">
          Approved {draft.reviewed_at ? when(draft.reviewed_at) : ""} — it now appears on Appointment Requests.
        </p>
      )}
    </Card>
  );
}

function EmailRequestsPage() {
  const fetchDrafts = useServerFn(listAppointmentDrafts);
  const { data, isLoading } = useQuery({
    queryKey: ["appointment-drafts"],
    queryFn: () => fetchDrafts({}),
  });
  const [filter, setFilter] = useState<Filter>("pending_review");

  const drafts = data?.drafts ?? [];
  const counts = useMemo(() => {
    const base: Record<string, number> = { pending_review: 0, approved: 0, rejected: 0 };
    for (const d of drafts) if (d.status in base) base[d.status] = (base[d.status] ?? 0) + 1;
    return base;
  }, [drafts]);

  const visible = filter === "all" ? drafts : drafts.filter((d) => d.status === filter);

  return (
    <>
      <AdminPageHeader
        eyebrow="Work"
        title="Email requests"
        intro="Appointment requests that arrived by email. Nothing becomes a confirmed appointment until you approve it here."
      />
      <AdminSection className="grid gap-6">
        {data?.forbidden ? (
          <Card>
            <p className="text-sm text-muted-foreground">You do not have access to email requests.</p>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    filter === f ? "border-gold/45 bg-gold/12 text-accent-foreground" : "border-border hover:bg-secondary"
                  }`}
                >
                  {f === "all" ? `All (${drafts.length})` : `${STATUS_META[f]!.label} (${counts[f] ?? 0})`}
                </button>
              ))}
            </div>

            {isLoading ? (
              <Card>
                <p className="text-sm text-muted-foreground" aria-busy="true">
                  Loading email requests…
                </p>
              </Card>
            ) : visible.length === 0 ? (
              <Card>
                <div className="flex items-start gap-3">
                  <MailQuestion className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Nothing here right now. When an email looks like a booking request, a draft appears here for you to
                    review.
                  </p>
                </div>
              </Card>
            ) : (
              visible.map((d) => <DraftCard key={d.id} draft={d} />)
            )}
          </>
        )}
      </AdminSection>
    </>
  );
}
