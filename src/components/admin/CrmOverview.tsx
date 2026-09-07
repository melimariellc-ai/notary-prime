import { Link } from "@tanstack/react-router";
import { PIPELINE_STAGES, type BusinessContact } from "@/lib/crm.functions";

export const STAGE_COLORS: Record<string, string> = {
  "New Lead": "var(--chart-1)",
  Contacted: "var(--chart-5)",
  "Meeting Scheduled": "var(--chart-2)",
  "Active Referral Source": "var(--chart-3)",
  Inactive: "var(--chart-4)",
};

function StatCard({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_1px_0_var(--color-border)]">
      <p
        className={`font-display text-4xl tracking-tight md:text-5xl ${accent && value > 0 ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}

function Donut({ counts, total }: { counts: { stage: string; count: number }[]; total: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative mx-auto h-52 w-52">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="group" aria-label="Pipeline stage mix">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--color-muted)" strokeWidth="20" />
        {total > 0 &&
          counts.map(({ stage, count }) => {
            if (count === 0) return null;
            const length = (count / total) * circumference;
            const dash = `${length} ${circumference - length}`;
            const el = (
              <Link
                key={stage}
                to="/admin/crm"
                search={{ stage }}
                aria-label={`${stage}: ${count} contacts. View filtered list.`}
                className="cursor-pointer outline-none [&>circle]:transition-[stroke-width,opacity] [&>circle]:hover:stroke-[26] focus-visible:[&>circle]:stroke-[26]"
              >
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={STAGE_COLORS[stage]}
                  strokeWidth="20"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              </Link>
            );
            offset += length;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl tracking-tight">{total}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Contacts</span>
      </div>
    </div>
  );
}

export function CrmOverviewSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading pipeline overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl border border-border bg-card p-6">
            <div className="h-10 w-16 animate-pulse rounded-lg bg-muted" />
            <div className="mt-3 h-3 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 lg:col-span-2">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-6 h-52 w-52 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function CrmOverview({ contacts, today }: { contacts: BusinessContact[]; today: string }) {
  const counts = PIPELINE_STAGES.map((stage) => ({
    stage: stage as string,
    count: contacts.filter((c) => c.pipeline_stage === stage).length,
  }));
  const total = contacts.length;
  const max = Math.max(1, ...counts.map((c) => c.count));
  const due = contacts
    .filter((c) => c.next_follow_up_date && c.next_follow_up_date <= today)
    .sort((a, b) => (a.next_follow_up_date! < b.next_follow_up_date! ? -1 : 1));
  const find = (stage: string) => counts.find((c) => c.stage === stage)?.count ?? 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={total} label="Total contacts" />
        <StatCard value={find("New Lead")} label="New leads" />
        <StatCard value={due.length} label="Overdue follow-ups" accent />
        <StatCard value={find("Active Referral Source")} label="Active referral sources" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 lg:col-span-2">
          <h2 className="font-display text-2xl tracking-tight">Pipeline breakdown</h2>
          <div className="mt-6 grid gap-5">
            {counts.map(({ stage, count }) => (
              <div key={stage}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{stage}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${Math.round((count / max) * 100)}%`,
                      backgroundColor: STAGE_COLORS[stage],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <h2 className="font-display text-2xl tracking-tight">Stage mix</h2>
          <div className="mt-6">
            <Donut counts={counts} total={total} />
          </div>
          <ul className="mt-6 grid gap-2 text-xs">
            {counts.map(({ stage, count }) => (
              <li key={stage} className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[stage] }}
                />
                <span className="flex-1 truncate text-foreground">{stage}</span>
                <span>{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div id="needs-attention" className="scroll-mt-20 rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">Needs attention</h2>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{due.length} due or overdue</p>
        </div>
        {due.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Nothing due. Contacts appear here once their next follow-up date arrives.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border">
            {due.map((c) => (
              <li key={c.id}>
                <Link
                  to="/admin/crm/$contactId"
                  params={{ contactId: c.id }}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl py-4 transition-colors hover:bg-secondary/60"
                >
                  <span>
                    <span className="font-display text-lg tracking-tight transition-colors group-hover:text-accent-foreground">
                      {c.business_name}
                    </span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {c.pipeline_stage}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {new Date(`${c.next_follow_up_date}T00:00:00`).toLocaleDateString()}
                    {c.next_follow_up_date! < today && (
                      <span className="rounded-full bg-destructive/10 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-destructive">
                        Overdue
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
